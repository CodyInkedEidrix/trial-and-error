// ──────────────────────────────────────────────────────────────────────
// chatStore — session chat state + real streaming orchestration (AC-01).
//
// Post-AC-01 shape. Owns three responsibilities:
//
//   1. Conversation data (messages array)
//   2. Stream lifecycle (fetch → read → append → finalize / error)
//   3. Eye state/reaction — so the Eye reacts to real AI events
//
// All three live here on purpose. Splitting them into parallel stores
// creates subtle desync bugs (conversation state changes but Eye misses
// the transition, etc.). One authoritative source; ChatEyeAnchor and
// MessageList subscribe to slices they care about.
//
// ─── AC-04 porting note ───────────────────────────────────────────────
// When persistence lands, wrap `create` in `persist()` and persist only
// `messages` — `isStreaming`, `currentEyeState`, and `currentReaction`
// are transient and should reset to idle on reload.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import type {
  EyeState,
  ReactionName,
} from '../components/brand/eye-config'
import type {
  Message,
  MessageMetadata,
  PendingAction,
  ToolErrorSummary,
} from '../types/message'
import type { AgentModel } from '../types/agentSettings'
import { supabase } from './supabase'
import { useDebugStore } from './debugStore'
import { useCustomerStore } from './customerStore'
import { useJobStore } from './jobStore'
import { useProposalStore } from './proposalStore'
import { useMessagesStore } from './messagesStore'
import { usePlanStore } from './planStore'
import { snapshotUiContext } from './uiContext'
import type { UiContext } from '../types/uiContext'
import type { ActivePlan, PlanStatus, PlanStep } from '../types/activePlan'

/** Called after the agent turn completes (success OR error) with the
 *  set of entity stores the function reports as affected. Targeted
 *  refetch means a read-only turn ("how many open jobs?") costs zero
 *  refetches; a surgical update ("mark proposal X approved") refetches
 *  only proposals.
 *
 *  The function (chat.ts) compiles `affectedEntities` from TOOL_AFFECTS
 *  at execution time — only SUCCESSFUL writes mark their store. Failed
 *  writes leave DB state unchanged so the client's cached data is
 *  already in sync. */
function refreshAffected(affected: string[] | undefined) {
  if (!affected || affected.length === 0) return
  const set = new Set(affected)
  if (set.has('customers')) void useCustomerStore.getState().loadCustomers()
  if (set.has('jobs')) void useJobStore.getState().loadJobs()
  if (set.has('proposals')) void useProposalStore.getState().loadProposals()
}

// ─── Utilities ───────────────────────────────────────────────────────

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

// ─── Store shape ─────────────────────────────────────────────────────

interface ChatStore {
  messages: Message[]

  /** True from Send to stream-end (or error). Guards double-sends + disables input. */
  isStreaming: boolean

  /** Current Eye state. Drives ChatEyeAnchor's `state` prop. */
  currentEyeState: EyeState

  /** Current one-shot Eye reaction. Auto-cleared via `clearReaction`. */
  currentReaction: ReactionName | null

  /** Entry point — sends user message, streams the assistant reply. */
  sendUserMessage: (content: string) => Promise<void>

  /** Click handler for the Confirm button on a pending-action card.
   *  Marks the card resolved and sends a programmatic follow-up user
   *  message so Claude sees the approval in conversation history. */
  confirmPendingAction: (assistantMessageId: string) => Promise<void>

  /** Click handler for the Cancel button. Marks resolved and sends
   *  a programmatic "cancelled" follow-up so the audit trail is
   *  complete. */
  cancelPendingAction: (assistantMessageId: string) => Promise<void>

  /** Called by the Eye when a reaction animation completes. */
  clearReaction: () => void

  /** Dev / session-reset helper. */
  clearConversation: () => void
}

// ─── Store ────────────────────────────────────────────────────────────

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentEyeState: 'idle',
  currentReaction: null,

  sendUserMessage: async (content) => {
    const trimmed = content.trim()
    if (!trimmed) return
    if (get().isStreaming) return // one stream at a time

    // ─── Plan send-gate ─────────────────────────────────────────────
    // If an agentic plan is running, block this send and bump
    // stopHintNonce so the UI brings the plan into view: PlanCard
    // halo-pulses its Stop button, MessageList force-scrolls to the
    // tail, ChatInput surfaces its "Eidrix is working" hint. The
    // user is shown why they're blocked, in context.
    const activePlan = usePlanStore.getState().activePlan
    if (activePlan && activePlan.status === 'running') {
      usePlanStore.getState().pulseStopHint()
      return
    }

    // ─── Set streaming gate FIRST ──────────────────────────────────
    // The mirror subscription (bottom of file) only clobbers
    // chatStore.messages when isStreaming is false. Flipping it true
    // BEFORE appendUser means the subscriber that fires when the
    // persisted user message lands doesn't overwrite the state we're
    // about to set up.
    set({
      isStreaming: true,
      currentEyeState: 'thinking',
      currentReaction: 'acknowledge',
    })

    // ─── Persist user message ──────────────────────────────────────
    // Need the DB id before we fire the extraction trigger post-response.
    // If persistence fails (no conversation, RLS block, etc.) the store
    // toasts an error; we reset the gate and bail without starting the
    // stream.
    const persistedUserMessage =
      await useMessagesStore.getState().appendUser(trimmed)
    if (!persistedUserMessage) {
      set({ isStreaming: false, currentEyeState: 'idle', currentReaction: null })
      return
    }

    // messagesStore just appended; the subscription's isStreaming gate
    // paused the mirror, so chatStore.messages still reflects whatever
    // we had before sending. Rebuild explicitly from the fresh
    // persisted snapshot plus our streaming placeholder.
    const persistedSoFar = useMessagesStore.getState().messages

    // ─── Streaming assistant placeholder ───────────────────────────
    // Transient — lives only in chatStore until stream completes, then
    // gets persisted via messagesStore.appendAssistant and replaced
    // with the DB-backed row.
    const assistantId = uuid()
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: nowIso(),
      status: 'streaming',
    }

    // Build the API payload from persisted messages — excludes the
    // empty streaming placeholder (no value sending "" to the model)
    // and any prior errored assistant messages (they'd confuse it).
    const messagesForApi = persistedSoFar
      .filter((m) => m.status !== 'error')
      .map(({ role, content }) => ({ role, content }))

    set({
      messages: [...persistedSoFar, assistantMessage],
    })

    // ─── RAF-batched text flusher ─────────────────────────────────
    // Tokens can arrive at 30–80/sec. Flushing each one triggers a
    // React render. At 60fps we cap renders at ~60/sec regardless of
    // token rate — smooth without throttling the stream itself.
    let pendingText = ''
    let rafId: number | null = null
    // Tracked across the whole submit() so both success and error
    // paths can push a complete DebugEntry. Declared here (not inside
    // try) so the catch block has access to them.
    let accumulatedResponse = ''
    let usageEvent: StreamEvent | null = null

    // Append a text chunk to the in-progress assistant message. Used by
    // both the RAF flusher (streaming happy path) and the final sync
    // flush at stream-end.
    const appendChunk = (chunk: string) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantId ? { ...m, content: m.content + chunk } : m,
        ),
      }))
    }

    const flushPending = () => {
      rafId = null
      if (pendingText.length === 0) return
      const chunk = pendingText
      pendingText = ''
      appendChunk(chunk)
    }

    const scheduleFlush = () => {
      if (rafId != null) return
      rafId = requestAnimationFrame(flushPending)
    }

    // ─── Fire the fetch ───────────────────────────────────────────
    // AC-02: forward the user's Supabase JWT so the function can
    // create an RLS-scoped client and read agent_settings + business
    // data on the user's behalf. Without this, the function returns
    // 401 Unauthenticated.
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token ?? ''

    try {
      // Capture UI context AT SEND TIME — represents what the user was
      // looking at when they hit send, not whatever they navigate to
      // while Claude thinks. See src/lib/uiContext.ts for the full
      // rationale on snapshot-vs-subscribe.
      const uiContext = snapshotUiContext()

      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: messagesForApi,
          uiContext,
          // AC-05: chat.ts uses these to link plans to the triggering
          // user message (audit trail) and to the conversation
          // (scrollback + rehydration).
          conversationId: persistedUserMessage.conversationId,
          userMessageId: persistedUserMessage.id,
        }),
      })

      // Pre-stream error — HTTP status is meaningful here. 429 drives
      // auto-retry in Phase E; for now we just surface the state.
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new StreamError(
          response.status,
          errBody.error ?? `HTTP ${response.status}`,
        )
      }

      if (!response.body) {
        throw new StreamError(500, 'Empty response body')
      }

      // ─── Read the SSE stream ────────────────────────────────────
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let firstTokenSeen = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by blank lines (\n\n).
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? '' // last element may be a partial frame

        for (const frame of frames) {
          const line = frame.trim()
          if (!line.startsWith('data: ')) continue
          const dataStr = line.slice(6)

          let event: StreamEvent
          try {
            event = JSON.parse(dataStr)
          } catch {
            continue // malformed frame — skip, stream continues
          }

          if (
            event.type === 'content_block_delta' &&
            event.delta?.type === 'text_delta' &&
            typeof event.delta.text === 'string'
          ) {
            if (!firstTokenSeen) {
              firstTokenSeen = true
              // First token — shift Eye from thinking to speaking.
              // Acknowledge reaction may still be mid-animation; the
              // Eye handles the transition smoothly.
              set({ currentEyeState: 'speaking' })
            }
            pendingText += event.delta.text
            accumulatedResponse += event.delta.text
            scheduleFlush()
          } else if (event.type === 'eidrix_usage') {
            // Final summary event from the function. Captured for the
            // Debug tab; doesn't affect the streamed message UI.
            usageEvent = event
          } else if (event.type === 'eidrix_plan_started') {
            // AC-05: server generated a plan UUID + inserted the
            // active_plans row. Mirror into planStore so the (Session
            // 2) plan card UI picks up immediately. The first step
            // arrives in the companion eidrix_plan_step event right
            // after this one.
            const now = new Date().toISOString()
            const plan: ActivePlan = {
              id: typeof event.planId === 'string' ? event.planId : '',
              organizationId: '', // server-scoped; client doesn't need for UI
              userId: '', // same
              conversationId: useMessagesStore.getState().messages[0]?.conversationId ?? '',
              triggeringMessageId:
                typeof event.triggeringMessageId === 'string'
                  ? event.triggeringMessageId
                  : null,
              status: 'running',
              steps: event.firstStep ? [event.firstStep as PlanStep] : [],
              requestedStop: false,
              completionSummary: null,
              startedAt:
                typeof event.startedAt === 'string'
                  ? event.startedAt
                  : now,
              completedAt: null,
              updatedAt: now,
            }
            usePlanStore.getState().setActivePlan(plan)
          } else if (event.type === 'eidrix_plan_step') {
            // Full steps array replaces — simpler than merge logic;
            // server is the source of truth.
            if (typeof event.planId === 'string' && Array.isArray(event.steps)) {
              usePlanStore
                .getState()
                .updateSteps(event.planId, event.steps as PlanStep[])
            }
          } else if (event.type === 'eidrix_plan_complete') {
            if (typeof event.planId === 'string') {
              const status =
                typeof event.status === 'string'
                  ? (event.status as PlanStatus)
                  : 'complete'
              const summary =
                typeof event.completionSummary === 'string'
                  ? event.completionSummary
                  : null
              usePlanStore.getState().completePlan(event.planId, status, summary)
            }
          } else if (event.type === 'eidrix_tool_started') {
            // Live activity: server says a tool just started executing.
            // Drives the shimmering "→ Drafting Garage Cleanout" sub-
            // line under the active plan step. The reliable signal —
            // real tool calls, not the agent's self-reported step
            // status (which is inconsistent on Sonnet 4.6).
            if (typeof event.name === 'string') {
              usePlanStore.getState().startTool({
                name: event.name,
                summary:
                  typeof event.summary === 'string' && event.summary.length > 0
                    ? event.summary
                    : event.name,
                iteration:
                  typeof event.iteration === 'number' ? event.iteration : 0,
              })
            }
          } else if (event.type === 'eidrix_tool_finished') {
            if (typeof event.name === 'string') {
              usePlanStore.getState().finishTool({
                name: event.name,
                summary:
                  typeof event.summary === 'string' && event.summary.length > 0
                    ? event.summary
                    : event.name,
                success: event.success === true,
                durationMs:
                  typeof event.durationMs === 'number' ? event.durationMs : 0,
                iteration:
                  typeof event.iteration === 'number' ? event.iteration : 0,
              })
            }
          } else if (event.type === 'eidrix_pending_action') {
            // A destructive tool was previewed on the server. Attach
            // the card to the current assistant message so it renders
            // inline with Claude's summary text.
            const pendingAction: PendingAction = {
              action: typeof event.action === 'string' ? event.action : 'unknown',
              params:
                event.params && typeof event.params === 'object'
                  ? (event.params as Record<string, unknown>)
                  : {},
              summary: typeof event.summary === 'string' ? event.summary : '',
              confirmationToken:
                typeof event.confirmationToken === 'string'
                  ? event.confirmationToken
                  : '',
            }
            set((state) => ({
              messages: state.messages.map((m) =>
                m.id === assistantId ? { ...m, pendingAction } : m,
              ),
            }))
          } else if (event.type === 'error') {
            throw new StreamError(
              event.error?.status ?? 500,
              event.error?.message ?? 'Stream error',
            )
          }
          // Other event types (message_start, content_block_start,
          // content_block_stop, message_delta, message_stop) are
          // ignored here — reader.read() done=true handles completion.
        }
      }

      // ─── Clean completion ───────────────────────────────────────
      // Flush any residual buffered tokens synchronously (otherwise
      // the final text could arrive AFTER we mark the message complete).
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      if (pendingText.length > 0) {
        const chunk = pendingText
        pendingText = ''
        appendChunk(chunk)
      }

      // Empty-response fallback — stream ended with no text deltas.
      const finalContent =
        accumulatedResponse.length > 0
          ? accumulatedResponse
          : "I didn't have anything to say there. Try rephrasing?"

      // Surface tool errors for the UI badge (rendered before persist
      // so the streaming bubble gets them immediately).
      const toolErrors: ToolErrorSummary[] = (usageEvent?.toolCalls ?? [])
        .filter((t) => {
          const r = t.result as { success?: boolean } | null
          return !!r && r.success === false
        })
        .map((t) => {
          const r = t.result as { error?: string; code?: string } | null
          return {
            tool: t.name,
            code: r?.code,
            message: r?.error ?? 'Tool failed',
          }
        })

      // Capture pendingAction from the in-flight message before we
      // rebuild the list from persisted state (it lives on the
      // streaming placeholder, not yet in the DB).
      const inFlightPendingAction = get().messages.find(
        (m) => m.id === assistantId,
      )?.pendingAction

      // ─── Persist the assistant turn ─────────────────────────────
      // Metadata includes both the usage-event fields (for Debug tab)
      // AND the UX overlays (pendingAction, toolErrors) so they
      // survive future messagesStore resyncs. messagesStore's
      // dbRowToMessage promotes the overlay fields back to the
      // top-level Message shape on load.
      const assistantMetadata: MessageMetadata = {
        ...buildAssistantMetadata(usageEvent, null),
        ...(inFlightPendingAction ? { pendingAction: inFlightPendingAction } : {}),
        ...(toolErrors.length > 0 ? { toolErrors } : {}),
      }

      await useMessagesStore.getState().appendAssistant(
        finalContent,
        assistantMetadata,
        'complete',
      )

      // Mirror from messagesStore — the overlays come back via
      // dbRowToMessage's metadata promotion, no separate decorate
      // step needed.
      set({
        messages: useMessagesStore.getState().messages,
        isStreaming: false,
        currentEyeState: 'idle',
        currentReaction: 'completion',
      })

      // Push debug entry for the Agent Debug tab. usageEvent should
      // always be present after a successful stream (the function
      // always emits it before close), but guard anyway.
      if (usageEvent) {
        useDebugStore.getState().pushEntry(
          buildDebugEntry(trimmed, messagesForApi, accumulatedResponse, usageEvent, null),
        )
      }

      // Refetch only the stores the function reports as affected.
      // Read-only turns (search/find/summarize) get zero refetches;
      // writes get exactly the stores they touched.
      refreshAffected(usageEvent?.affectedEntities)

      // ─── Fire fact extraction (fire-and-forget) ─────────────────
      // Netlify `-background` functions are queued independently from
      // the triggering request, so this fetch's body reaches the
      // function even if the page navigates away. User never waits.
      fireExtractFacts(persistedUserMessage.id, accessToken)
    } catch (err) {
      // Cancel any pending RAF flush — no more content coming.
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }

      // Preserve whatever partial content streamed before failure;
      // persist it with status=error so the UI can style it + the
      // user can scroll back to see what went wrong.
      const fallbackMessage =
        err instanceof StreamError
          ? err.userMessage()
          : 'Connection lost. Try again.'
      const preservedPartial = accumulatedResponse.length > 0
      const errorContent = preservedPartial
        ? accumulatedResponse
        : fallbackMessage

      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      const assistantMetadata: MessageMetadata = buildAssistantMetadata(
        usageEvent,
        errorMessage,
      )

      // Persist the errored assistant turn too — audit-grade conversation
      // history includes failures.
      await useMessagesStore.getState().appendAssistant(
        errorContent,
        assistantMetadata,
        'error',
      )

      // Resync + reset streaming state.
      set({
        messages: useMessagesStore.getState().messages,
        isStreaming: false,
        currentEyeState: 'idle',
        currentReaction: 'uncertainty',
      })

      // Clean up any active plan. The server's catch block normally
      // fires eidrix_plan_complete{status:'failed'} before closing the
      // controller, but a hard stream drop (Netlify timeout, network
      // blip) can kill the connection before that event lands. Without
      // this local cleanup, the UI would show a plan as "running"
      // forever until the 10-min rehydrate auto-expire. We also fire
      // /chat-stop so the DB row reflects reality — call it FIRST
      // (captures the plan id synchronously, runs fetch in the
      // background), then mark locally complete.
      const stalePlan = usePlanStore.getState().activePlan
      if (stalePlan && stalePlan.status === 'running') {
        void usePlanStore.getState().requestStop()
        usePlanStore
          .getState()
          .completePlan(
            stalePlan.id,
            'failed',
            'Connection lost mid-plan.',
          )
      }

      // Push a debug entry for the error too — the Debug tab is most
      // useful when something went wrong, so don't drop these.
      useDebugStore.getState().pushEntry(
        buildDebugEntry(trimmed, messagesForApi, accumulatedResponse, usageEvent, errorMessage),
      )

      // Even on error, any tool calls that completed before the error
      // committed to the DB. Refresh affected stores so the user sees
      // the partial work rather than a misleading "nothing changed" UI.
      refreshAffected(usageEvent?.affectedEntities)

      // Fire extraction even on error — the user message was still
      // persisted and may still contain durable content, regardless
      // of whether the assistant response succeeded.
      fireExtractFacts(persistedUserMessage.id, accessToken)
    }
  },

  confirmPendingAction: async (assistantMessageId) => {
    const state = get()
    const message = state.messages.find((m) => m.id === assistantMessageId)
    if (!message?.pendingAction) return
    if (message.pendingAction.resolution) return // already resolved
    if (state.isStreaming) return // another stream in flight

    const { summary, action } = message.pendingAction

    // Flip the card to its resolved state so the history reads as
    // "Confirmed ✓" rather than a still-live button pair.
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === assistantMessageId && m.pendingAction
          ? { ...m, pendingAction: { ...m.pendingAction, resolution: 'confirmed' } }
          : m,
      ),
    }))

    // Programmatic follow-up user message. Contains the summary
    // verbatim so the conversation history preserves the audit trail
    // (who confirmed what, at what time).
    await get().sendUserMessage(
      `Confirmed: ${summary.replace(/\.$/, '')}. Go ahead with ${action}.`,
    )
  },

  cancelPendingAction: async (assistantMessageId) => {
    const state = get()
    const message = state.messages.find((m) => m.id === assistantMessageId)
    if (!message?.pendingAction) return
    if (message.pendingAction.resolution) return
    if (state.isStreaming) return

    const { summary } = message.pendingAction

    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === assistantMessageId && m.pendingAction
          ? { ...m, pendingAction: { ...m.pendingAction, resolution: 'cancelled' } }
          : m,
      ),
    }))

    await get().sendUserMessage(
      `Cancelled: don't ${summary
        .replace(/^Delete /i, 'delete ')
        .replace(/\.$/, '')}. Leave things as they are.`,
    )
  },

  clearReaction: () => set({ currentReaction: null }),

  clearConversation: () =>
    set({
      messages: [],
      isStreaming: false,
      currentEyeState: 'idle',
      currentReaction: null,
    }),
}))

// ─── Support types ───────────────────────────────────────────────────

/**
 * Minimal typing over the forwarded Anthropic SSE events + Eidrix's
 * own `eidrix_usage` final event (added by chat.ts in AC-02). Unknown
 * event types still parse — the reader simply ignores them.
 */
interface StreamEvent {
  type: string
  delta?: {
    type?: string
    text?: string
  }
  error?: {
    status?: number
    message?: string
  }
  // ─── eidrix_pending_action fields ──────────────────────────────────
  action?: string
  params?: unknown
  summary?: string
  confirmationToken?: string
  // ─── AC-05 plan event fields ───────────────────────────────────────
  planId?: string
  triggeringMessageId?: string | null
  firstStep?: unknown
  startedAt?: string
  step?: unknown
  steps?: unknown
  status?: string
  completionSummary?: string | null
  completedAt?: string
  // ─── AC-05 live tool activity fields ───────────────────────────────
  // Carried by eidrix_tool_started / eidrix_tool_finished events.
  // `name` is shared with eidrix_usage's per-tool log, but here it's
  // a single tool — distinguished by event.type.
  name?: string
  iteration?: number
  durationMs?: number
  success?: boolean
  // ─── eidrix_usage fields (only present when type === 'eidrix_usage') ──
  model?: AgentModel
  contextMode?: 'off' | 'subset' | 'full'
  inputTokens?: number
  outputTokens?: number
  cacheReadInputTokens?: number
  cacheCreationInputTokens?: number
  systemPromptBytes?: number
  customerCount?: number
  jobCount?: number
  totalCustomers?: number
  totalJobs?: number
  contextWarning?: string | null
  responseTimeMs?: number
  systemPromptSent?: string
  // AC-03 additions
  toolCalls?: {
    name: string
    input: unknown
    result: unknown
    durationMs: number
    iteration: number
  }[]
  iterations?: number
  hitIterationCap?: boolean
  uiContext?: UiContext | null
  affectedEntities?: string[]
  // AC-04 Session 2
  retrievedMemories?: Array<{
    fact_id: string
    content: string
    fact_type: string
    entity_type: string | null
    entity_id: string | null
    confidence: number
    similarity: number
  }>
  // AC-05 — plan-summary fields in the usage event. null / empty when
  // the turn didn't involve an agentic plan. Debug tab uses these to
  // render the nested plan trace.
  activePlanId?: string | null
  activePlanSteps?: PlanStep[]
}

/**
 * Build a DebugEntry payload from the captured per-request data. Used
 * by both the success path (errorMessage = null) and the error path
 * (errorMessage = the failure reason). Centralizes the `?? defaults`
 * fallbacks so they stay consistent and easy to update.
 */
function buildDebugEntry(
  userMessage: string,
  messagesSent: { role: 'user' | 'assistant'; content: string }[],
  responseText: string,
  usageEvent: StreamEvent | null,
  errorMessage: string | null,
) {
  return {
    userMessagePreview: userMessage,
    systemPromptSent: usageEvent?.systemPromptSent ?? '',
    messagesSent,
    responseText,
    model: usageEvent?.model ?? ('claude-sonnet-4-6' as AgentModel),
    contextMode: usageEvent?.contextMode ?? 'subset',
    inputTokens: usageEvent?.inputTokens ?? 0,
    outputTokens: usageEvent?.outputTokens ?? 0,
    cacheReadInputTokens: usageEvent?.cacheReadInputTokens ?? 0,
    cacheCreationInputTokens: usageEvent?.cacheCreationInputTokens ?? 0,
    systemPromptBytes: usageEvent?.systemPromptBytes ?? 0,
    customerCount: usageEvent?.customerCount ?? 0,
    jobCount: usageEvent?.jobCount ?? 0,
    totalCustomers: usageEvent?.totalCustomers ?? 0,
    totalJobs: usageEvent?.totalJobs ?? 0,
    contextWarning: usageEvent?.contextWarning ?? null,
    responseTimeMs: usageEvent?.responseTimeMs ?? 0,
    errorMessage,
    toolCalls: usageEvent?.toolCalls ?? [],
    iterations: usageEvent?.iterations ?? 1,
    hitIterationCap: usageEvent?.hitIterationCap ?? false,
    uiContext: usageEvent?.uiContext ?? null,
    affectedEntities: usageEvent?.affectedEntities ?? [],
    // Map snake_case from the server RPC to camelCase for client use.
    retrievedMemories: (usageEvent?.retrievedMemories ?? []).map((m) => ({
      factId: m.fact_id,
      content: m.content,
      factType: m.fact_type,
      entityType: m.entity_type,
      entityId: m.entity_id,
      confidence: m.confidence,
      similarity: m.similarity,
    })),
    activePlanId: usageEvent?.activePlanId ?? null,
    activePlanSteps: usageEvent?.activePlanSteps ?? [],
  }
}

/**
 * Typed error that carries an HTTP-like status so the (eventual) retry
 * UI can distinguish 429 from other failures. Phase E wires the UI.
 */
class StreamError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'StreamError'
  }

  userMessage(): string {
    if (this.status === 429) return 'Too many requests. Try again in a moment.'
    if (this.status >= 500) return "Something's off with the AI connection. Try again."
    if (this.status === 400) return "I couldn't understand that request. Try again."
    return this.message || 'Connection lost. Try again.'
  }
}

// ─── AC-04 helpers ──────────────────────────────────────────────────

/** Extract the fields the Debug tab + Memory debug view care about
 *  from the in-flight usage event and pack them into the message's
 *  persisted metadata column. */
function buildAssistantMetadata(
  usageEvent: StreamEvent | null,
  errorMessage: string | null,
): MessageMetadata {
  return {
    model: usageEvent?.model,
    contextMode: usageEvent?.contextMode,
    inputTokens: usageEvent?.inputTokens,
    outputTokens: usageEvent?.outputTokens,
    cacheReadInputTokens: usageEvent?.cacheReadInputTokens,
    cacheCreationInputTokens: usageEvent?.cacheCreationInputTokens,
    systemPromptBytes: usageEvent?.systemPromptBytes,
    responseTimeMs: usageEvent?.responseTimeMs,
    toolCalls: usageEvent?.toolCalls,
    iterations: usageEvent?.iterations,
    hitIterationCap: usageEvent?.hitIterationCap,
    affectedEntities: usageEvent?.affectedEntities,
    errorMessage,
  }
}

/** Kick off fact extraction in the background. Fire-and-forget: we
 *  never await this — the Netlify `-background` function is queued
 *  independently and will run regardless of whether the client waits
 *  for a response. See curriculum/app-capabilities/ac-04-agent-memory.md. */
function fireExtractFacts(userMessageId: string, accessToken: string) {
  // Short-circuit on empty token — the session expired or getSession
  // returned nothing. The background function would reject with 401
  // but fetch().catch only catches network failures, so we'd silently
  // drop extraction without any signal that it wasn't running.
  if (!accessToken) {
    console.warn(
      '[chat] skipping extract-facts dispatch: no access token (session may be expired)',
    )
    return
  }

  void fetch('/.netlify/functions/extract-facts-background', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ userMessageId }),
  })
    .then((res) => {
      // -background functions always respond with 202 to the triggering
      // HTTP call regardless of the handler's outcome — but if we ever
      // see a 401/403 here, something is wrong with auth plumbing.
      if (res.status === 401 || res.status === 403) {
        console.warn(
          '[chat] extract-facts auth rejected:',
          res.status,
          res.statusText,
        )
      }
    })
    .catch((err) => {
      // Non-fatal — log only. A failed extraction trigger doesn't
      // affect the user's current turn; the next chat message's
      // extraction still fires independently.
      console.warn('[chat] extract-facts dispatch failed:', err)
    })
}

// ─── messagesStore → chatStore mirror ────────────────────────────────
// When the persisted message list changes and chatStore isn't actively
// streaming, sync chatStore.messages to match. This handles:
//   - initial load (messagesStore.loadForActiveConversation completes)
//   - conversation switch (future multi-conversation UI)
//   - external insert (unlikely today, but the pattern is correct)
//
// During streaming, chatStore.messages holds [...persisted, streamingPlaceholder]
// and we skip the mirror so the placeholder isn't clobbered.

useMessagesStore.subscribe((state, prevState) => {
  if (state.messages === prevState.messages) return
  if (useChatStore.getState().isStreaming) return
  useChatStore.setState({ messages: state.messages })
})

// Initial seed in case messagesStore already has data by the time
// chatStore's module evaluates (order of imports shouldn't matter,
// but defensive).
if (useMessagesStore.getState().messages.length > 0) {
  useChatStore.setState({ messages: useMessagesStore.getState().messages })
}
