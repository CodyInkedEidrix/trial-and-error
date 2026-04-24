// ──────────────────────────────────────────────────────────────────────
// planStore — client-side mirror of active_plans for the current user.
//
// chatStore consumes five custom SSE events during a streaming chat:
//
//   eidrix_plan_started    → setActivePlan(...)
//   eidrix_plan_step       → updateSteps(...)
//   eidrix_plan_complete   → completePlan(...)
//   eidrix_tool_started    → startTool(...)
//   eidrix_tool_finished   → finishTool(...)
//
// Tool events power the live "→ Drafting Garage Cleanout · $800" sub-
// line under the active plan step. They're the reliable live signal
// (real tool calls), versus the unreliable signal (the agent self-
// reporting step transitions via emitPlanStep, which Sonnet 4.6 is
// inconsistent about).
//
// On sign-in / conversation change, rehydrateOnLoad pulls any
// status='running' plan from Supabase. If the row is older than
// STALE_PLAN_THRESHOLD_MS we treat it as a zombie (the chat.ts
// function that started it died without finalizing), auto-expire it
// to status='failed', and surface it as a historical chip rather
// than a live card. Without this, an interrupted chat function
// leaves a zombie row that blocks every future send via the
// client-side send-gate.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import type {
  ActivePlan,
  PlanStatus,
  PlanStep,
} from '../types/activePlan'
import type { Database } from '../types/database.types'
import { supabase } from './supabase'
import { useAuthStore } from './useAuth'
import { useConversationStore } from './conversationStore'

type DbActivePlanRow = Database['public']['Tables']['active_plans']['Row']

const STALE_PLAN_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

/** A tool call displayed as a live shimmer sub-line under active plan
 *  steps. Multiple may coexist in currentBatch when the agent batches
 *  parallel calls in one iteration (via Promise.all in chat.ts).
 *
 *  The batch is sticky WITHIN an iteration (entries accumulate as
 *  tool_started events arrive) and CLEARS when the iteration number
 *  changes (new batch begins). Between iterations — when the loop is
 *  streaming text back to the client before the next tool_use turn —
 *  the last batch stays visible so activity doesn't vanish in the gap.
 *
 *  Why not pin-each-tool-to-a-specific-step: earlier routing attempts
 *  via textual matching kept producing invisible or wrong-step
 *  artifacts. Iteration-scoped batches trade per-step precision for
 *  reliable parallel visibility — when multiple steps are active
 *  simultaneously, the same batch shows under each, but nothing gets
 *  routed to the wrong step.
 *
 *  callKey is assigned client-side at startTool time so the PlanCard
 *  sub-line can use it as the React key, keeping AnimatePresence
 *  entries stable across rapid-fire starts. */
export interface CurrentTool {
  callKey: string
  name: string
  summary: string
  iteration: number
  startedAt: string
}

/** A tool call's full lifecycle row, captured in toolLog as the plan
 *  runs and snapshotted into historicalToolLogs on plan completion.
 *  HistoricalPlanChip renders these in its expanded view so the user
 *  can scroll back through "what actually happened" without hogging
 *  chat real estate. */
export interface ToolLogEntry {
  name: string
  summary: string
  iteration: number
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  success: boolean | null
}

export interface PlanStore {
  /** The currently-running plan for this user, if any. */
  activePlan: ActivePlan | null

  /** Recently-terminated plans for the current conversation. The
   *  PlanCardLayer renders the most recent one as a clickable chip
   *  (collapsible final-state summary). */
  historicalPlans: ActivePlan[]

  /** Tool log keyed by planId. Survives across plan transitions so
   *  the historical chip can show what tools ran for any completed
   *  plan we still have in memory. Rehydrated plans don't have an
   *  entry here (we never persisted tool events), and the chip
   *  handles that gracefully. */
  historicalToolLogs: Record<string, ToolLogEntry[]>

  /** Tools firing in the currently-running iteration. Entries append
   *  on startTool; the whole array clears the moment a new tool starts
   *  in a different iteration (see startTool for the reset logic).
   *  Between iterations, the last iteration's batch stays visible so
   *  activity doesn't flicker off while Claude streams text before
   *  the next tool_use turn. Empty when no tool has fired yet in the
   *  current plan, or when the plan has ended. */
  currentBatch: CurrentTool[]

  /** Tool log for the IN-FLIGHT plan. Snapshotted to
   *  historicalToolLogs[planId] when the plan completes. Reset to []
   *  when a new plan starts. Unlike currentBatch, this accumulates
   *  ALL tools with timings + success/failure so the HistoricalPlanChip
   *  can render the full execution receipt on expansion. */
  toolLog: ToolLogEntry[]

  isStopping: boolean

  /** Increments every time the chat send-gate fires (user tried to
   *  send while a plan is running). PlanCard subscribes for a one-
   *  shot Stop-button halo pulse; MessageList subscribes to force-
   *  scroll the active plan card into view. Replaces the old toast
   *  notification — now the user sees what's blocking them in
   *  context, not as a floating banner. */
  stopHintNonce: number

  // ─── Setters called from chatStore's stream loop ───────────────────

  setActivePlan: (plan: ActivePlan) => void

  updateSteps: (planId: string, steps: PlanStep[]) => void

  completePlan: (
    planId: string,
    status: PlanStatus,
    completionSummary: string | null,
  ) => void

  startTool: (event: {
    name: string
    summary: string
    iteration: number
  }) => void

  finishTool: (event: {
    name: string
    summary: string
    success: boolean
    durationMs: number
    iteration: number
  }) => void

  // ─── User actions ──────────────────────────────────────────────────

  /** POST /chat-stop. The endpoint either signals a live function
   *  (sets requested_stop=true; chat.ts picks up next iteration) or,
   *  if the row is stale, force-terminates it directly. Either way
   *  the SSE eidrix_plan_complete event eventually fires and
   *  completePlan() flips activePlan to null. */
  requestStop: () => Promise<void>

  /** Bumped by chatStore when the send-gate fires. */
  pulseStopHint: () => void

  // ─── Lifecycle ────────────────────────────────────────────────────

  /** Pull any still-running plan + recent terminated plans for the
   *  active conversation. Auto-expires stale runners (>10 min old,
   *  almost certainly a dead chat.ts function). */
  rehydrateOnLoad: () => Promise<void>

  clearLocalState: () => void
}

// ─── DB ↔ App mapping ────────────────────────────────────────────────

function dbRowToPlan(row: DbActivePlanRow): ActivePlan {
  // steps is jsonb — cast to canonical shape. The server-side writer
  // (chat.ts) is the source of truth for shape; a mismatch here means
  // an upstream bug, not data we need to defend against.
  const steps = (row.steps ?? []) as unknown as PlanStep[]
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    triggeringMessageId: row.triggering_message_id,
    status: row.status as PlanStatus,
    steps,
    requestedStop: row.requested_stop,
    completionSummary: row.completion_summary,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  }
}

// ─── Store ────────────────────────────────────────────────────────────

export const usePlanStore = create<PlanStore>((set, get) => ({
  activePlan: null,
  historicalPlans: [],
  historicalToolLogs: {},
  currentBatch: [],
  toolLog: [],
  isStopping: false,
  stopHintNonce: 0,

  setActivePlan: (plan) => {
    // New plan starting — fresh tool log, no current tool yet.
    set({
      activePlan: plan,
      currentBatch: [],
      toolLog: [],
      isStopping: false,
    })
  },

  updateSteps: (planId, steps) => {
    const current = get().activePlan
    if (!current || current.id !== planId) return
    // If any step just transitioned to 'complete', clear the current
    // tool batch. Those tools belonged to the step that just finished
    // — keeping them visible under whatever step becomes active next
    // is a known visibility bug (user sees "Adding Luke Skywalker"
    // under a "Create all proposals" step, which is wrong and
    // confusing). The "preparing…" placeholder in PlanCard takes
    // over until the new active step's real tools start firing.
    const prevCompleteCount = current.steps.filter(
      (s) => s.status === 'complete',
    ).length
    const nextCompleteCount = steps.filter(
      (s) => s.status === 'complete',
    ).length
    const stepJustCompleted = nextCompleteCount > prevCompleteCount

    set((state) => ({
      activePlan: {
        ...current,
        steps,
        updatedAt: new Date().toISOString(),
      },
      currentBatch: stepJustCompleted ? [] : state.currentBatch,
    }))
  },

  completePlan: (planId, status, completionSummary) => {
    const current = get().activePlan
    if (!current || current.id !== planId) return
    const completedAt = new Date().toISOString()
    const terminated: ActivePlan = {
      ...current,
      status,
      completionSummary,
      completedAt,
      updatedAt: completedAt,
    }
    const finalizedToolLog = get().toolLog
    set((state) => ({
      activePlan: null,
      currentBatch: [],
      toolLog: [],
      isStopping: false,
      // Snapshot the in-flight tool log into the historical map so
      // the chip can render "tools used" when the user expands it.
      historicalToolLogs: {
        ...state.historicalToolLogs,
        [planId]: finalizedToolLog,
      },
      // Newest historical first — chip rendering picks index 0 as
      // "the just-completed plan" for inline display.
      historicalPlans: [terminated, ...state.historicalPlans],
    }))
  },

  startTool: ({ name, summary, iteration }) => {
    const startedAt = new Date().toISOString()
    // callKey is unique per invocation so the PlanCard sub-line can
    // use it as a React key — makes back-to-back tool transitions
    // cross-fade cleanly instead of flickering text.
    const callKey = `${name}-${iteration}-${startedAt}-${Math.random()
      .toString(36)
      .slice(2, 6)}`
    const entry: CurrentTool = {
      callKey,
      name,
      summary,
      iteration,
      startedAt,
    }
    set((state) => {
      // If this tool belongs to a new iteration, start a fresh batch.
      // The previous iteration's entries fall away — they were
      // sticky while the loop was between turns, but the agent has
      // moved on to new work now.
      const prev = state.currentBatch
      const sameIteration =
        prev.length > 0 && prev[0].iteration === iteration
      const nextBatch = sameIteration ? [...prev, entry] : [entry]
      return {
        currentBatch: nextBatch,
        // toolLog accumulates every call — used by the
        // HistoricalPlanChip's expanded tools-used list.
        toolLog: [
          ...state.toolLog,
          {
            name,
            summary,
            iteration,
            startedAt,
            finishedAt: null,
            durationMs: null,
            success: null,
          },
        ],
      }
    })
  },

  finishTool: ({ name, success, durationMs, iteration }) => {
    const finishedAt = new Date().toISOString()
    set((state) => {
      // Intentionally does NOT remove the entry from currentBatch.
      // The batch stays sticky until the NEXT iteration's startTool
      // replaces it — that's what keeps tool activity visible
      // between iterations when tool calls complete in <30ms.
      //
      // Still update the toolLog so the HistoricalPlanChip gets
      // accurate timings + success/failure for its receipt view. Walk
      // the log backwards so the most recent unfinished match wins
      // when the same tool+iteration pair fires more than once.
      // Silently drops if no matching unfinished entry exists (e.g.,
      // tool_started event was lost) — the next tool's finish proceeds
      // normally.
      const log = [...state.toolLog]
      for (let i = log.length - 1; i >= 0; i--) {
        const entry = log[i]
        if (
          entry.name === name &&
          entry.iteration === iteration &&
          entry.finishedAt === null
        ) {
          log[i] = {
            ...entry,
            finishedAt,
            durationMs,
            success,
          }
          break
        }
      }
      return { toolLog: log }
    })
  },

  requestStop: async () => {
    const current = get().activePlan
    if (!current || current.status !== 'running') return
    if (get().isStopping) return

    set({ isStopping: true })

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    if (!accessToken) {
      console.warn('[planStore] stop: no access token')
      set({ isStopping: false })
      return
    }

    try {
      const res = await fetch('/.netlify/functions/chat-stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ planId: current.id }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.warn('[planStore] stop request failed:', res.status, body)
        set({ isStopping: false })
        return
      }
      // Force-stop mode: chat-stop set status=stopped directly. The
      // SSE event won't arrive (no live stream). Rehydrate so the
      // local activePlan gets reconciled with the now-terminal row.
      const result = await res.json().catch(() => ({}))
      if (result?.mode === 'force') {
        await get().rehydrateOnLoad()
        return
      }
      // Signal mode: live chat.ts will produce eidrix_plan_complete
      // within a few seconds. completePlan() will flip isStopping
      // back to false.
    } catch (err) {
      console.warn('[planStore] stop request error:', err)
      set({ isStopping: false })
    }
  },

  pulseStopHint: () => {
    set((state) => ({ stopHintNonce: state.stopHintNonce + 1 }))
  },

  rehydrateOnLoad: async () => {
    const activeOrg = useAuthStore.getState().activeOrg
    const user = useAuthStore.getState().user
    const conversation = useConversationStore.getState().activeConversation
    if (!activeOrg || !user || !conversation) {
      set({
        activePlan: null,
        historicalPlans: [],
        historicalToolLogs: {},
        currentBatch: [],
        toolLog: [],
      })
      return
    }

    const [runningRes, historicalRes] = await Promise.all([
      supabase
        .from('active_plans')
        .select('*')
        .eq('conversation_id', conversation.id)
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('active_plans')
        .select('*')
        .eq('conversation_id', conversation.id)
        .neq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(20),
    ])

    if (runningRes.error) {
      console.warn(
        '[planStore] rehydrate running failed:',
        runningRes.error.message,
      )
    }
    if (historicalRes.error) {
      console.warn(
        '[planStore] rehydrate historical failed:',
        historicalRes.error.message,
      )
    }

    let activePlan: ActivePlan | null = null
    let extraHistorical: ActivePlan[] = []

    if (runningRes.data) {
      const startedAtMs = new Date(runningRes.data.started_at).getTime()
      const ageMs = Date.now() - startedAtMs
      const isStale = ageMs > STALE_PLAN_THRESHOLD_MS

      if (isStale) {
        // Zombie plan — chat.ts that started it is long dead. Mark
        // failed in the DB so the row reflects reality, then expose
        // it as a historical chip so the user has visual closure on
        // what happened. Best-effort: if the UPDATE fails (RLS, net
        // blip), we still skip activation so the UI isn't blocked.
        const completedAt = new Date().toISOString()
        const completionSummary =
          'Plan timed out — auto-expired after 10 minutes with no progress.'
        const { error: expireErr } = await supabase
          .from('active_plans')
          .update({
            status: 'failed',
            completion_summary: completionSummary,
            completed_at: completedAt,
          })
          .eq('id', runningRes.data.id)
        if (expireErr) {
          console.warn(
            '[planStore] auto-expire failed:',
            expireErr.message,
          )
        }
        const expiredRow: DbActivePlanRow = {
          ...runningRes.data,
          status: 'failed',
          completion_summary: completionSummary,
          completed_at: completedAt,
        }
        extraHistorical = [dbRowToPlan(expiredRow)]
      } else {
        activePlan = dbRowToPlan(runningRes.data)
      }
    }

    const historical = [
      ...extraHistorical,
      ...(historicalRes.data ?? []).map(dbRowToPlan),
    ]

    set((state) => {
      // Trim historicalToolLogs to only entries whose plan is still in
      // the rehydrated historicalPlans list. Two goals at once:
      //   1. Conversation switches drop the prior conversation's logs
      //      (their plan ids aren't in the new set, so they prune away).
      //   2. Error-path rehydrates (chatStore's catch triggers
      //      /chat-stop force mode → rehydrate) preserve the just-
      //      captured log for the plan that's now sitting in
      //      historicalPlans — so the chip's "tools used" expansion
      //      still has content right after a stream crash.
      const keepPlanIds = new Set(historical.map((p) => p.id))
      const nextToolLogs: Record<string, ToolLogEntry[]> = {}
      for (const [planId, log] of Object.entries(state.historicalToolLogs)) {
        if (keepPlanIds.has(planId)) nextToolLogs[planId] = log
      }
      return {
        activePlan,
        historicalPlans: historical,
        historicalToolLogs: nextToolLogs,
        currentBatch: [],
        toolLog: [],
        isStopping: false,
      }
    })
  },

  clearLocalState: () => {
    set({
      activePlan: null,
      historicalPlans: [],
      historicalToolLogs: {},
      currentBatch: [],
      toolLog: [],
      isStopping: false,
    })
  },
}))

// ─── Auth + conversation subscriptions ───────────────────────────────

useConversationStore.subscribe((state, prevState) => {
  const prevId = prevState.activeConversation?.id ?? null
  const nextId = state.activeConversation?.id ?? null
  if (prevId === nextId) return
  if (nextId === null) {
    usePlanStore.getState().clearLocalState()
  } else {
    void usePlanStore.getState().rehydrateOnLoad()
  }
})

useAuthStore.subscribe((state, prevState) => {
  const prevId = prevState.activeOrg?.id ?? null
  const nextId = state.activeOrg?.id ?? null
  if (prevId === nextId) return
  if (nextId === null) {
    usePlanStore.getState().clearLocalState()
  }
})

if (useConversationStore.getState().activeConversation) {
  void usePlanStore.getState().rehydrateOnLoad()
}
