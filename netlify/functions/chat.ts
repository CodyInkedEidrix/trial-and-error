// ──────────────────────────────────────────────────────────────────────
// chat — agentic streaming AI completion (AC-03 Session 1).
//
// Extends AC-02 with tool calling. The function now orchestrates a
// back-and-forth with Claude: Claude emits tool_use blocks, we execute
// those tools server-side against Supabase (with the user's JWT so RLS
// applies), we append tool_result blocks to the messages array, and
// we loop until Claude stops calling tools.
//
// ─── Event forwarding strategy ────────────────────────────────────────
// The browser sees ONE continuous assistant message even though
// server-side there may be multiple Anthropic round trips. We achieve
// this by filtering events:
//   - Text events (content_block_start/delta/stop for text blocks) flow
//     through to the client across every iteration.
//   - Tool-use events stay server-side (the client doesn't need to see
//     them for Session 1 — they're captured in the final eidrix_usage
//     event so the Debug tab can display the full trace).
//   - message_start is emitted ONCE (iteration 1 only).
//   - message_stop is emitted ONCE at the very end.
//   - message_delta's stop_reason is handled server-side; we don't
//     forward it mid-loop.
//
// ─── Why streaming (not messages.create) ──────────────────────────────
// "More rigorous / more to learn" call from the student. Streaming
// within tool loops is the pattern the SDK is actually designed for;
// builds the right mental model for real Eidrix. Slightly more code,
// same end behavior on happy path, richer UX (user sees text appear
// live across iterations instead of stalling during tool execution).
//
// ─── What's deferred to Session 2 ────────────────────────────────────
// - UI context injection (activeTab, activeRecord, activeSection)
// - Confirmation UI for destructive tools (they execute directly now)
// - Live UI refresh after mutations (returns affected-entities list)
// - Ambiguity-resolution prompt tuning
// ──────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '../../src/types/database.types'
import type { PlanStep, PlanStatus } from '../../src/types/activePlan'
import {
  DEFAULT_CONTEXT_MODE,
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
} from '../../src/types/agentSettings'
import {
  formatUiContextPrompt,
  parseUiContext,
  type UiContext,
} from '../../src/types/uiContext'
import { TOOL_AFFECTS, TOOL_REGISTRY, TOOL_SCHEMAS } from './_lib/tools'
import type { EntityType } from './_lib/tools'
import type { ToolContext, ToolResult } from './_lib/tools'
import { formatToolSummary } from './_lib/tools/toolSummary'
import {
  embeddingToVectorParam,
  generateEmbedding,
  isEmbedSuccess,
} from './_lib/memory/embed'

// ─── CORS ────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ─── Constants ───────────────────────────────────────────────────────

const MAX_TOKENS = 2048
/** Hard cap on loop iterations. Sonnet 4.6 tends to serialize tool
 *  calls one-per-iteration unless explicitly pushed to batch, so a
 *  real multi-entity request (e.g., "add 4 customers, create 2-3
 *  bids for each") can exceed 25 easily. 40 gives headroom without
 *  runaway-loop risk.
 *
 *  Graceful-degradation nudge fires at MAX_ITERATIONS - 3 so Claude
 *  can batch remaining work or produce a summary before the hard
 *  stop. The warning is phrased as a nudge, not a command to quit. */
const MAX_ITERATIONS = 40
const ITERATION_CAP_WARNING = MAX_ITERATIONS - 3

/** Ceiling on how many destructive tool COMMITS can happen in a single
 *  chat request. Session 2 hardening — belt-and-suspenders on top of
 *  the iteration cap and the per-call confirmation token. If a confused
 *  agent somehow gets past both, this stops it at 3. Phase-1 previews
 *  don't count (they don't mutate). */
const MAX_DESTRUCTIVE_COMMITS = 3
const DESTRUCTIVE_TOOLS = new Set<string>([
  'deleteCustomer',
  'deleteJob',
  'deleteProposal',
])

// Subset selection: customer is "in subset" if updated within this
// many days OR has any job in an open status.
const SUBSET_RECENT_DAYS = 30
const OPEN_JOB_STATUSES = ['draft', 'scheduled', 'in_progress'] as const

// ─── Defaults ────────────────────────────────────────────────────────
// DEFAULT_SYSTEM_PROMPT / DEFAULT_CONTEXT_MODE / DEFAULT_MODEL are
// imported from src/types/agentSettings.ts — single source of truth
// shared with the client-side lazy-upsert path. If you edit any of
// them, the change applies to both seed paths automatically. Keeping
// them in one place is the only way to prevent silent drift between
// "new org gets seeded by the server" and "existing org gets seeded
// by the client's Settings UI."

// ─── Types ───────────────────────────────────────────────────────────

interface IncomingMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: IncomingMessage[]
  /** Snapshot of where the user was looking when they hit send. Used
   *  to resolve references like "this customer" without a tool call. */
  uiContext?: unknown
  /** AC-04+: the conversation this request belongs to. chatStore
   *  passes this after persisting the user message. Used for AC-05's
   *  active_plans linkage. */
  conversationId?: string
  /** AC-04+: id of the user message that triggered this request.
   *  Used for AC-05's active_plans.triggering_message_id audit link. */
  userMessageId?: string
}

type ContextMode = 'off' | 'subset' | 'full'

interface AgentSettings {
  organization_id: string
  system_prompt: string
  context_mode: ContextMode
  model: string
}

interface ContextPayload {
  injectedText: string
  customerCount: number
  jobCount: number
  totalCustomers: number
  totalJobs: number
  warning: string | null
}

interface ToolCallLogEntry {
  name: string
  input: unknown
  result: ToolResult
  durationMs: number
  iteration: number
}

// ─── Helpers ─────────────────────────────────────────────────────────

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

function createUserClient(jwt: string) {
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars')
  }
  return createClient<Database>(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Find the user's active org via memberships. RLS scopes this query
 *  to the caller. Trial and Error users have exactly one membership;
 *  we take the first. */
type ActiveOrgResult =
  | { kind: 'ok'; orgId: string }
  | { kind: 'none' }
  | { kind: 'error'; message: string }

async function findActiveOrgId(
  supabase: ReturnType<typeof createUserClient>,
): Promise<ActiveOrgResult> {
  const { data, error } = await supabase
    .from('memberships')
    .select('organization_id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[chat] findActiveOrgId error:', error)
    return { kind: 'error', message: error.message ?? 'Membership lookup failed' }
  }
  if (!data?.organization_id) return { kind: 'none' }
  return { kind: 'ok', orgId: data.organization_id }
}

function mapToAgentSettings(
  row: {
    organization_id: string
    system_prompt: string
    context_mode: string
    model: string
  } | null,
  orgId: string,
): AgentSettings {
  if (!row) {
    return {
      organization_id: orgId,
      system_prompt: DEFAULT_SYSTEM_PROMPT,
      context_mode: DEFAULT_CONTEXT_MODE,
      model: DEFAULT_MODEL,
    }
  }
  return {
    organization_id: row.organization_id,
    system_prompt: row.system_prompt,
    context_mode: row.context_mode as ContextMode,
    model: row.model,
  }
}

async function loadAgentSettings(
  supabase: ReturnType<typeof createUserClient>,
  orgId: string,
): Promise<AgentSettings> {
  const { data, error } = await supabase
    .from('agent_settings')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error) {
    console.error('[chat] loadAgentSettings select error:', error)
  }

  if (data) return mapToAgentSettings(data, orgId)

  const { data: inserted, error: insertError } = await supabase
    .from('agent_settings')
    .insert({
      organization_id: orgId,
      system_prompt: DEFAULT_SYSTEM_PROMPT,
      context_mode: DEFAULT_CONTEXT_MODE,
      model: DEFAULT_MODEL,
    })
    .select()
    .single()

  if (insertError || !inserted) {
    console.error('[chat] lazy-upsert agent_settings failed:', insertError)
    return mapToAgentSettings(null, orgId)
  }

  return mapToAgentSettings(inserted, orgId)
}

// ─── Context formatters ─────────────────────────────────────────────
// Same as AC-02 — pipes/dashes/caps-headers format, not prose. Reason:
// Claude reasons dramatically better on this format for relational data.

function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '$0'
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function relativeDays(iso: string | null): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

interface CustomerForContext {
  id: string
  name: string
  status: string
  email: string | null
  phone: string | null
  bids_count: number
  jobs_count: number
  last_activity_at: string | null
}

interface JobForContext {
  id: string
  customer_id: string
  title: string
  status: string
  scheduled_date: string | null
  amount: number | null
}

function formatCustomersBlock(
  customers: CustomerForContext[],
  totalCustomers: number,
  label: string,
): string {
  const header = `CUSTOMERS — ${customers.length} of ${totalCustomers} shown (${label})`
  const divider = '─'.repeat(header.length)
  if (customers.length === 0) {
    return `${header}\n${divider}\n(no customers in this view)\n`
  }
  const rows = customers.map((c) => {
    const contact = c.phone ?? c.email ?? '—'
    const activity = relativeDays(c.last_activity_at)
    return `- ${c.name} [${c.status}] | ${contact} | ${c.jobs_count} jobs | last activity: ${activity}`
  })
  return `${header}\n${divider}\n${rows.join('\n')}\n`
}

function formatJobsBlock(
  jobs: JobForContext[],
  customers: CustomerForContext[],
  totalJobs: number,
  label: string,
): string {
  const header = `JOBS — ${jobs.length} of ${totalJobs} shown (${label})`
  const divider = '─'.repeat(header.length)
  if (jobs.length === 0) {
    return `${header}\n${divider}\n(no jobs in this view)\n`
  }
  const customerNameById = new Map(customers.map((c) => [c.id, c.name]))
  const rows = jobs.map((j) => {
    const customerName = customerNameById.get(j.customer_id) ?? 'unknown'
    const scheduled = j.scheduled_date ?? '—'
    const amount = formatAmount(j.amount)
    return `- "${j.title}" (${customerName}) | ${j.status} | ${amount} | scheduled: ${scheduled}`
  })
  return `${header}\n${divider}\n${rows.join('\n')}\n`
}

function formatTotals(
  totalCustomers: number,
  totalJobs: number,
  jobStatusCounts: Record<string, number>,
): string {
  const open = OPEN_JOB_STATUSES.reduce(
    (sum, s) => sum + (jobStatusCounts[s] ?? 0),
    0,
  )
  const completed = jobStatusCounts['completed'] ?? 0
  const cancelled = jobStatusCounts['cancelled'] ?? 0
  return `Totals: ${totalCustomers} customers | ${totalJobs} jobs (${open} open, ${completed} completed, ${cancelled} cancelled)`
}

// ─── Plan lifecycle (AC-05 Session 1) ─────────────────────────────────
// Helpers that manage the active_plans row + emit the three custom
// SSE events to the client:
//
//   eidrix_plan_started   — fired on first emitPlanStep of a request
//   eidrix_plan_step      — fired on every emitPlanStep (including first)
//   eidrix_plan_complete  — fired when the plan ends (complete/stopped/failed)
//
// Plan state is intentionally scoped to one chat request — one plan
// per request, one request per active plan. Concurrent plans aren't
// supported and aren't needed for Trial and Error.

interface PlanInput {
  id: string
  title: string
  status: PlanStep['status']
}

/** Merge a single PlanStep into an existing steps array. If the step
 *  id is already present, update it in place (and stamp startedAt /
 *  completedAt as status transitions through active / complete / failed).
 *  If new, append with emittedAt stamped. Pure function — the caller
 *  is responsible for persisting the result. */
function mergePlanStep(
  existing: PlanStep[],
  input: PlanInput,
  now: string,
): PlanStep[] {
  const idx = existing.findIndex((s) => s.id === input.id)
  if (idx === -1) {
    // New step — first emission. Stamp emittedAt; startedAt/completedAt
    // set based on status if it's not just 'pending'.
    const next: PlanStep = {
      id: input.id,
      title: input.title,
      status: input.status,
      emittedAt: now,
    }
    if (input.status === 'active') next.startedAt = now
    if (input.status === 'complete' || input.status === 'failed') {
      next.completedAt = now
    }
    return [...existing, next]
  }

  // Existing step — update. Keep the original emittedAt + any prior
  // startedAt; fill in startedAt / completedAt as status transitions.
  const prev = existing[idx]
  const updated: PlanStep = {
    ...prev,
    title: input.title,  // allow title refinement on update
    status: input.status,
  }
  if (input.status === 'active' && !prev.startedAt) {
    updated.startedAt = now
  }
  if (
    (input.status === 'complete' || input.status === 'failed') &&
    !prev.completedAt
  ) {
    updated.completedAt = now
  }
  const next = [...existing]
  next[idx] = updated
  return next
}

/** Poll the active_plans row for requested_stop. Returns true if the
 *  user has requested stop. Swallows errors (returns false) — a
 *  transient DB blip shouldn't kill an in-flight plan; worst case
 *  the user waits one more iteration for their stop to land. */
async function pollForStop(
  supabase: ReturnType<typeof createUserClient>,
  planId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('active_plans')
    .select('requested_stop')
    .eq('id', planId)
    .maybeSingle()
  if (error) {
    console.warn('[chat] stop poll failed:', error.message)
    return false
  }
  return data?.requested_stop === true
}

/** Compose the human-readable completion summary for a finalized plan.
 *  Centralized so the catch path and the happy path produce consistent
 *  language for the historical chip rendering on the client. */
function buildCompletionSummary(
  status: PlanStatus,
  steps: PlanStep[],
  reason: string | null,
): string {
  const completedCount = steps.filter((s) => s.status === 'complete').length
  const total = steps.length
  if (status === 'stopped') {
    return `Stopped at user request. Completed ${completedCount} of ${total} steps.`
  }
  if (status === 'failed') {
    return reason
      ? `Plan failed: ${reason}. Completed ${completedCount} of ${total} steps.`
      : `Plan ended unexpectedly. Completed ${completedCount} of ${total} steps.`
  }
  return `Completed all ${total} step${total === 1 ? '' : 's'}.`
}

/** Persist + emit the terminal SSE event for a plan. Called from both
 *  the happy path AND the catch block. The catch-path call is load-
 *  bearing: without it, exceptions in the loop leave active_plans rows
 *  stuck at status='running' forever, and rehydration on the next page
 *  load surfaces them as zombies that block every subsequent send via
 *  the client-side plan send-gate.
 *
 *  Best-effort: errors during the DB update are logged but never
 *  thrown. The SSE event always fires so the client clears its
 *  activePlan even if the DB write failed. */
async function finalizePlan(
  supabase: ReturnType<typeof createUserClient>,
  planId: string,
  steps: PlanStep[],
  status: PlanStatus,
  reason: string | null,
  enqueue: (event: unknown) => void,
): Promise<void> {
  const completionSummary = buildCompletionSummary(status, steps, reason)
  const completedAt = new Date().toISOString()
  try {
    const { error } = await supabase
      .from('active_plans')
      .update({
        status,
        steps,
        completion_summary: completionSummary,
        completed_at: completedAt,
      })
      .eq('id', planId)
    if (error) {
      console.warn('[chat] active_plans finalize failed:', error.message)
    }
  } catch (err) {
    console.warn('[chat] active_plans finalize threw:', err)
  }
  enqueue({
    type: 'eidrix_plan_complete',
    planId,
    status,
    steps,
    completionSummary,
    completedAt,
  })
}

// ─── Memory retrieval (AC-04 Session 2) ───────────────────────────────
// Embed the user's latest message via Voyage, then run the
// match_memory_facts RPC to pull top-K semantically similar facts
// owned by this user. RPC runs with security_invoker + user_id_filter
// so RLS is double-enforced.

const MEMORY_TOP_K = 8
const MEMORY_MIN_MESSAGE_LEN = 5
const MEMORY_MIN_WORD_COUNT = 2

interface RetrievedMemory {
  fact_id: string
  content: string
  fact_type: 'preference' | 'rule' | 'context' | 'commitment' | 'observation'
  entity_type: string | null
  entity_id: string | null
  confidence: number
  similarity: number
}

/** True when the message is a programmatic confirmation/cancellation
 *  follow-up generated by the AC-03 pending-action flow, not a genuine
 *  user intent worth retrieving memories for. We detect by prefix —
 *  chatStore always builds these with "Confirmed:" or "Cancelled:"
 *  as the first word. */
function isConfirmationAcknowledgement(text: string): boolean {
  const start = text.trimStart().slice(0, 12).toLowerCase()
  return start.startsWith('confirmed:') || start.startsWith('cancelled:')
}

async function retrieveRelevantMemories(
  supabase: ReturnType<typeof createUserClient>,
  userId: string,
  userMessage: string,
): Promise<RetrievedMemory[]> {
  const trimmed = userMessage.trim()
  // Skip short, empty, or confirmation-acknowledgement turns. These
  // waste Voyage calls and retrieve noise. The >= 5-char + >= 2-word
  // check filters out "hi", "hey", "thanks" while still letting real
  // questions like "What jobs?" through (4-char one-worders are rare
  // enough to be noise themselves).
  if (!userId) return []
  if (trimmed.length < MEMORY_MIN_MESSAGE_LEN) return []
  if (trimmed.split(/\s+/).length < MEMORY_MIN_WORD_COUNT) return []
  if (isConfirmationAcknowledgement(trimmed)) return []

  const embed = await generateEmbedding(trimmed, 'query')
  if (!isEmbedSuccess(embed)) {
    console.warn('[chat] memory retrieval embed failed:', embed.error)
    return []
  }

  const { data, error } = await supabase.rpc('match_memory_facts', {
    query_embedding: embeddingToVectorParam(embed.embedding),
    match_count: MEMORY_TOP_K,
    user_id_filter: userId,
  })
  if (error) {
    console.warn('[chat] match_memory_facts RPC failed:', error.message)
    return []
  }
  return (data ?? []) as RetrievedMemory[]
}

/** Render retrieved memories as a system-prompt block. Returns an
 *  empty string when there are no memories — the empty string gets
 *  filtered out in the prompt assembly, so the block disappears
 *  entirely from Claude's view for fresh users. */
function formatMemoriesBlock(memories: RetrievedMemory[]): string {
  if (memories.length === 0) return ''

  // Group by fact_type. Order the types by typical relevance for
  // operator decisions: preferences + rules first (most actionable),
  // commitments next (time-bound), context, observations (softer).
  const typeOrder: RetrievedMemory['fact_type'][] = [
    'preference',
    'rule',
    'commitment',
    'context',
    'observation',
  ]
  const byType = new Map<RetrievedMemory['fact_type'], RetrievedMemory[]>()
  for (const m of memories) {
    const bucket = byType.get(m.fact_type) ?? []
    bucket.push(m)
    byType.set(m.fact_type, bucket)
  }

  const sections: string[] = ['=== RELEVANT MEMORIES ===']
  for (const type of typeOrder) {
    const items = byType.get(type)
    if (!items || items.length === 0) continue
    const label = type.charAt(0).toUpperCase() + type.slice(1) + 's'
    sections.push(`${label}:`)
    for (const m of items) {
      // Compact one-liner per memory. Entity info parenthesized so
      // Claude has both the fact and its scope in one read.
      const entityNote = m.entity_type && m.entity_id
        ? ` (about ${m.entity_type} ${m.entity_id})`
        : ''
      const conf = m.confidence.toFixed(2)
      sections.push(`  - ${m.content}${entityNote} [confidence ${conf}]`)
    }
  }

  sections.push('')
  sections.push(
    `(${memories.length} ${memories.length === 1 ? 'memory' : 'memories'} retrieved by semantic relevance)`,
  )
  return sections.join('\n')
}

// ─── Ambient workspace overview ──────────────────────────────────────
// Always-on aggregate block injected regardless of context_mode. Gives
// the agent orientation — "how many customers exist, what's their
// status split, same for jobs and proposals" — without shipping any
// row-level data. Six lines, O(1) in tenant size (grouped counts).
//
// Why this exists: with `context_mode = off`, the agent has ZERO sense
// of the workspace shape. Asking "how many leads do I have?" forces a
// tool round trip even though the answer is a single aggregate. The
// overview fixes that without compromising the "tools for row data"
// discipline. See REAL_EIDRIX_NOTES "Layered context model".
//
// Fails soft: if the overview query errors, the chat still proceeds
// with an empty block. The agent gets fewer free answers; no crash.

type StatusAgg = { total: number; byStatus: Record<string, number> }

function aggregateByStatus(
  rows: { status: string }[] | null | undefined,
): StatusAgg {
  const byStatus: Record<string, number> = {}
  if (!rows) return { total: 0, byStatus }
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
  }
  return { total: rows.length, byStatus }
}

function formatStatusLine(label: string, agg: StatusAgg): string {
  if (agg.total === 0) return `0 ${label}`
  const pieces = Object.entries(agg.byStatus)
    .sort((a, b) => b[1] - a[1]) // most common first
    .map(([s, n]) => `${n} ${s}`)
  return `${agg.total} ${label} (${pieces.join(', ')})`
}

async function buildWorkspaceOverview(
  supabase: ReturnType<typeof createUserClient>,
): Promise<string> {
  // Three parallel aggregate fetches — id + status only, cheap columns.
  // RLS scopes to the caller's org automatically.
  const [customersRes, jobsRes, proposalsRes] = await Promise.all([
    supabase.from('customers').select('id, status'),
    supabase.from('jobs').select('id, status'),
    supabase.from('proposals').select('id, status'),
  ])

  if (customersRes.error || jobsRes.error || proposalsRes.error) {
    console.error('[chat] workspace overview fetch failed:', {
      customers: customersRes.error?.message,
      jobs: jobsRes.error?.message,
      proposals: proposalsRes.error?.message,
    })
    return ''
  }

  const customers = aggregateByStatus(customersRes.data)
  const jobs = aggregateByStatus(jobsRes.data)
  const proposals = aggregateByStatus(proposalsRes.data)

  // Skip the block entirely if the workspace is totally empty — saves
  // a few tokens and avoids telling the agent "0 everything" which it
  // might parrot back instead of taking action.
  if (customers.total === 0 && jobs.total === 0 && proposals.total === 0) {
    return ''
  }

  return [
    '=== WORKSPACE OVERVIEW ===',
    formatStatusLine('customers', customers),
    formatStatusLine('jobs', jobs),
    formatStatusLine('proposals', proposals),
  ].join('\n')
}

async function buildContextPayload(
  supabase: ReturnType<typeof createUserClient>,
  mode: ContextMode,
): Promise<ContextPayload> {
  if (mode === 'off') {
    return {
      injectedText: '',
      customerCount: 0,
      jobCount: 0,
      totalCustomers: 0,
      totalJobs: 0,
      warning: null,
    }
  }

  const [
    { count: totalCustomers, error: cErr },
    { data: allJobs, error: jErr },
  ] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('jobs').select('id, status'),
  ])

  if (cErr || jErr) {
    console.error('[chat] context totals fetch failed:', cErr || jErr)
    return {
      injectedText: '',
      customerCount: 0,
      jobCount: 0,
      totalCustomers: 0,
      totalJobs: 0,
      warning: 'Context fetch failed — sent prompt without business data.',
    }
  }

  const totalJobs = allJobs?.length ?? 0
  const jobStatusCounts: Record<string, number> = {}
  ;(allJobs ?? []).forEach((j) => {
    jobStatusCounts[j.status] = (jobStatusCounts[j.status] ?? 0) + 1
  })

  let customers: CustomerForContext[] = []
  let jobs: JobForContext[] = []
  let blockLabel: string

  if (mode === 'full') {
    blockLabel = 'all'
    const [{ data: cData, error: cFullErr }, { data: jData, error: jFullErr }] =
      await Promise.all([
        supabase
          .from('customers')
          .select(
            'id, name, status, email, phone, bids_count, jobs_count, last_activity_at',
          )
          .order('name', { ascending: true }),
        supabase
          .from('jobs')
          .select('id, customer_id, title, status, scheduled_date, amount')
          .order('scheduled_date', { ascending: true, nullsFirst: false }),
      ])
    if (cFullErr || jFullErr) {
      return {
        injectedText: '',
        customerCount: 0,
        jobCount: 0,
        totalCustomers: totalCustomers ?? 0,
        totalJobs,
        warning: 'Full context fetch failed — sent prompt without business data.',
      }
    }
    customers = cData ?? []
    jobs = jData ?? []
  } else {
    blockLabel = `recent ${SUBSET_RECENT_DAYS}d + open`
    const cutoffIso = new Date(
      Date.now() - SUBSET_RECENT_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString()

    const [{ data: openJobsRaw, error: openErr }, { data: recentCustomers, error: recentErr }] =
      await Promise.all([
        supabase
          .from('jobs')
          .select('id, customer_id, title, status, scheduled_date, amount')
          .in('status', [...OPEN_JOB_STATUSES])
          .order('scheduled_date', { ascending: true, nullsFirst: false }),
        supabase
          .from('customers')
          .select(
            'id, name, status, email, phone, bids_count, jobs_count, last_activity_at, updated_at',
          )
          .gte('updated_at', cutoffIso)
          .order('updated_at', { ascending: false }),
      ])

    if (openErr || recentErr) {
      return {
        injectedText: '',
        customerCount: 0,
        jobCount: 0,
        totalCustomers: totalCustomers ?? 0,
        totalJobs,
        warning: 'Subset fetch failed — sent prompt without business data.',
      }
    }

    jobs = openJobsRaw ?? []

    const customerIdsFromJobs = new Set(jobs.map((j) => j.customer_id))
    const recentIds = new Set((recentCustomers ?? []).map((c) => c.id))
    const missingCustomerIds = [...customerIdsFromJobs].filter(
      (id) => !recentIds.has(id),
    )

    let extraCustomers: CustomerForContext[] = []
    if (missingCustomerIds.length > 0) {
      const { data: extras, error: extraErr } = await supabase
        .from('customers')
        .select(
          'id, name, status, email, phone, bids_count, jobs_count, last_activity_at',
        )
        .in('id', missingCustomerIds)
      if (!extraErr && extras) extraCustomers = extras
    }

    customers = [...(recentCustomers ?? []), ...extraCustomers].map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      email: c.email,
      phone: c.phone,
      bids_count: c.bids_count,
      jobs_count: c.jobs_count,
      last_activity_at: c.last_activity_at,
    }))
  }

  const customersBlock = formatCustomersBlock(
    customers,
    totalCustomers ?? customers.length,
    blockLabel,
  )
  const jobsBlock = formatJobsBlock(
    jobs,
    customers,
    totalJobs,
    mode === 'full' ? 'all' : 'open status',
  )
  const totalsLine = formatTotals(
    totalCustomers ?? customers.length,
    totalJobs,
    jobStatusCounts,
  )

  const stamp = new Date().toISOString()
  const injectedText = `=== CURRENT BUSINESS DATA (${mode} · last fetched ${stamp}) ===\n\n${customersBlock}\n${jobsBlock}\n${totalsLine}`

  return {
    injectedText,
    customerCount: customers.length,
    jobCount: jobs.length,
    totalCustomers: totalCustomers ?? customers.length,
    totalJobs,
    warning: null,
  }
}

// ─── Tool execution ──────────────────────────────────────────────────

/** Execute a single tool_use block against the registry. Always
 *  returns a ToolResult; unknown tool names return a structured error
 *  rather than throwing. */
async function executeToolCall(
  name: string,
  input: unknown,
  ctx: ToolContext,
): Promise<ToolResult> {
  const executor = TOOL_REGISTRY[name]
  if (!executor) {
    return {
      success: false,
      error: `Unknown tool: ${name}`,
      code: 'unknown_tool',
    }
  }
  try {
    return await executor(input, ctx)
  } catch (err) {
    // Executors are supposed to never throw, but this is a last-line
    // defense. Any uncaught throw becomes a structured error.
    const message = err instanceof Error ? err.message : 'Executor threw'
    console.error(`[chat] Tool ${name} threw unexpectedly:`, err)
    return { success: false, error: message, code: 'db_error' }
  }
}

/** True when a tool call carries a non-empty `confirmation_token` — the
 *  signal that it's a phase-2 commit rather than a phase-1 preview. */
function hasConfirmationToken(input: unknown): boolean {
  if (!input || typeof input !== 'object') return false
  const t = (input as { confirmation_token?: unknown }).confirmation_token
  return typeof t === 'string' && t.length > 0
}

/** True when a tool_use block is a phase-2 destructive commit (i.e.,
 *  a delete with a confirmation_token, which actually mutates). Phase-1
 *  previews — same tool, no token — are read-only and don't count.
 *  Centralizes the predicate shared by the rate-cap check, the serial/
 *  parallel partition, and the counter rollback logic in runBlock. */
function isDestructiveCommit(block: {
  name: string
  input: unknown
}): boolean {
  return (
    DESTRUCTIVE_TOOLS.has(block.name) && hasConfirmationToken(block.input)
  )
}

/** True when a tool's success result indicates it previewed rather
 *  than committed — the sentinel is `data.requires_confirmation`. See
 *  netlify/functions/_lib/confirmationToken.ts for the why. */
function isPendingConfirmation(result: ToolResult): boolean {
  if (!result.success) return false
  const data = result.data as { requires_confirmation?: unknown } | null
  return Boolean(data && data.requires_confirmation === true)
}

/** Extract the confirmation preview payload from a tool result and
 *  shape it as an SSE event for the client. The client uses this to
 *  render inline Confirm / Cancel buttons on the streaming message. */
function pendingActionEvent(result: ToolResult): Record<string, unknown> {
  const data = result.success
    ? (result.data as Record<string, unknown>)
    : {}
  return {
    type: 'eidrix_pending_action',
    action: data.action ?? 'unknown',
    params: data.params ?? {},
    summary: data.summary ?? '',
    confirmationToken: data.confirmation_token ?? '',
  }
}

// ─── Main handler ────────────────────────────────────────────────────

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  // Auth
  const authHeader = req.headers.get('authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) {
    return json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // Body
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return json(
      { error: 'Body must include a non-empty messages array' },
      { status: 400 },
    )
  }
  for (const m of body.messages) {
    const validRole = m && (m.role === 'user' || m.role === 'assistant')
    const validContent = m && typeof m.content === 'string'
    if (!validRole || !validContent) {
      return json(
        {
          error: 'Each message must have role (user|assistant) and string content',
        },
        { status: 400 },
      )
    }
  }

  // Anthropic key
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return json(
      { error: 'Server misconfigured: ANTHROPIC_API_KEY missing' },
      { status: 500 },
    )
  }

  // Per-request Supabase client
  let supabaseForUser
  try {
    supabaseForUser = createUserClient(jwt)
  } catch (err) {
    console.error('[chat] createUserClient failed:', err)
    return json(
      { error: 'Server misconfigured: SUPABASE_URL or SUPABASE_ANON_KEY missing' },
      { status: 500 },
    )
  }

  const orgResult = await findActiveOrgId(supabaseForUser)
  if (orgResult.kind === 'error') {
    return json(
      { error: `Workspace lookup failed: ${orgResult.message}` },
      { status: 500 },
    )
  }
  if (orgResult.kind === 'none') {
    return json(
      { error: 'No active workspace found for this user' },
      { status: 403 },
    )
  }
  const orgId = orgResult.orgId

  // Resolve userId from the JWT for ToolContext. Non-fatal if missing;
  // we fall back to the orgId as a placeholder. (Supabase JWT carries
  // `sub` as the user id.)
  const { data: userResponse } = await supabaseForUser.auth.getUser()
  const userId = userResponse?.user?.id ?? ''

  const settings = await loadAgentSettings(supabaseForUser, orgId)

  // Fetch context payload, workspace overview, and retrieved memories
  // in parallel — no dependencies between them. Memory retrieval
  // needs the user's latest message, which is the last entry in
  // body.messages.
  const latestUserMessage = [...body.messages]
    .reverse()
    .find((m) => m.role === 'user')
  const [context, workspaceOverviewBlock, retrievedMemories] =
    await Promise.all([
      buildContextPayload(supabaseForUser, settings.context_mode),
      buildWorkspaceOverview(supabaseForUser),
      retrieveRelevantMemories(
        supabaseForUser,
        userId,
        latestUserMessage?.content ?? '',
      ),
    ])
  const memoriesBlock = formatMemoriesBlock(retrievedMemories)

  // UI context is tiny and always useful for "this" / "him" resolution.
  // Not gated by context_mode — even when data injection is 'off', the
  // UI context still helps the agent interpret references.
  const uiContextParsed: UiContext | null = parseUiContext(body.uiContext)
  const uiContextBlock = uiContextParsed
    ? formatUiContextPrompt(uiContextParsed)
    : ''

  // Assemble: voice → UI context → workspace overview → relevant
  // memories → business data. Reasoning on the order:
  //   - Voice sets the tone (how to respond)
  //   - UI context says where the user IS
  //   - Workspace overview says what EXISTS (the shape of the world)
  //   - Relevant memories are what Eidrix has LEARNED about the user
  //     (accumulated preferences, rules, commitments from past turns)
  //   - Business data is the row-level detail (only in subset/full)
  //
  // Memories sit between the "shape" and "detail" layers — they're
  // about the USER, not the data. Claude reads them as "here's the
  // operator's accumulated context" before reasoning about today's
  // specific question.
  //
  // Empty memory block is omitted (not rendered as an empty section)
  // so fresh users don't see a meaningless placeholder. See
  // REAL_EIDRIX_NOTES "Layered context model" for the why.
  const promptParts = [
    settings.system_prompt,
    uiContextBlock,
    workspaceOverviewBlock,
    memoriesBlock,
    context.injectedText,
  ].filter((s) => s && s.length > 0)
  const finalSystemPrompt = promptParts.join('\n\n')

  const requestStartedAt = Date.now()
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  // Build the message array we'll mutate across the loop. Start with
  // the caller's messages; tool_use + tool_result blocks get appended
  // as we iterate.
  const workingMessages: Anthropic.MessageParam[] = body.messages.map(
    (m) => ({ role: m.role, content: m.content }),
  )

  const toolCtx: ToolContext = {
    supabase: supabaseForUser,
    organizationId: orgId,
    userId,
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const toolCallLog: ToolCallLogEntry[] = []
      /** Set of client-side stores that need to refetch after this turn.
       *  Built from TOOL_AFFECTS as tools execute; only successful
       *  write tools count (failed writes leave DB state unchanged, so
       *  no refetch needed). */
      const affectedEntities = new Set<EntityType>()
      /** Running count of destructive commits (phase-2 delete calls)
       *  this request. Phase-1 previews don't count since they don't
       *  mutate. */
      let destructiveCommitCount = 0
      // ─── Plan lifecycle state (AC-05) ────────────────────────────
      /** Server-generated once the FIRST emitPlanStep fires. Null
       *  means no plan is active — this chat turn is a simple request. */
      let activePlanId: string | null = null
      /** Mirror of active_plans.steps — kept in memory so we can
       *  update step status without re-reading the row from Supabase.
       *  The authoritative copy still lives in Postgres (for stop
       *  polling, rehydration, etc.); this is the working copy. */
      let activePlanSteps: PlanStep[] = []
      /** Set true when /chat-stop's poll returns requested_stop=true.
       *  The loop uses this flag to short-circuit into a wrap-up
       *  iteration (no tools, just a final summary) and then exit. */
      let stopRequested = false
      let totalInputTokens = 0
      let totalOutputTokens = 0
      let totalCacheReadInputTokens = 0
      let totalCacheCreationInputTokens = 0
      let hitIterationCap = false
      let messageStartEmitted = false

      const enqueue = (eventObj: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(eventObj)}\n\n`),
          )
        } catch {
          // Controller may be closed (client disconnected).
        }
      }

      let iterationsRun = 0

      try {
        for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
          iterationsRun = iteration

          const anthropicStream = anthropic.messages.stream({
            model: settings.model,
            max_tokens: MAX_TOKENS,
            system: finalSystemPrompt,
            messages: workingMessages,
            tools: TOOL_SCHEMAS,
          })

          // Track which block indices are text (forward) vs tool_use
          // (server-side only). Keyed by the index field on the event.
          const textBlockIndices = new Set<number>()

          // Per-iteration usage capture. Input + cache tokens arrive on
          // message_start (snapshot); output_tokens' final value lands
          // on message_delta. We accumulate into the running totals at
          // the END of each iteration to avoid double-counting.
          let iterInputTokens = 0
          let iterOutputTokens = 0
          let iterCacheReadInputTokens = 0
          let iterCacheCreationInputTokens = 0

          for await (const event of anthropicStream) {
            if (event.type === 'message_start') {
              const usage = event.message?.usage
              if (usage) {
                iterInputTokens = usage.input_tokens ?? 0
                iterOutputTokens = usage.output_tokens ?? 0
                iterCacheReadInputTokens = usage.cache_read_input_tokens ?? 0
                iterCacheCreationInputTokens =
                  usage.cache_creation_input_tokens ?? 0
              }
              // Forward ONCE — client needs this to start the assistant
              // message in its UI.
              if (!messageStartEmitted) {
                messageStartEmitted = true
                enqueue(event)
              }
              continue
            }

            if (event.type === 'message_delta') {
              const usage = event.usage
              if (usage) {
                // message_delta carries the final output_tokens for
                // this iteration — overwrite (not add) the snapshot.
                iterOutputTokens = usage.output_tokens ?? iterOutputTokens
              }
              // Don't forward — we'd send a stop_reason mid-loop and
              // confuse the client. We emit a terminal message_delta
              // once at the very end.
              continue
            }

            if (event.type === 'message_stop') {
              // Don't forward — we emit one at the end. If this is the
              // FINAL iteration (stop_reason end_turn), the code below
              // handles emitting message_stop after the for-await.
              continue
            }

            if (event.type === 'content_block_start') {
              const block = event.content_block
              if (block && block.type === 'text') {
                textBlockIndices.add(event.index)
                enqueue(event)
              }
              // tool_use block_start: suppress (server-side only).
              continue
            }

            if (event.type === 'content_block_delta') {
              // Forward text_delta only; drop input_json_delta.
              if (textBlockIndices.has(event.index)) {
                enqueue(event)
              }
              continue
            }

            if (event.type === 'content_block_stop') {
              if (textBlockIndices.has(event.index)) {
                enqueue(event)
              }
              continue
            }

            // Any other event type we haven't seen — safe to skip.
          }

          // Accumulate this iteration's final token counts into the
          // request-wide totals. Done once per iteration, not per event,
          // so we can't double-count.
          totalInputTokens += iterInputTokens
          totalOutputTokens += iterOutputTokens
          totalCacheReadInputTokens += iterCacheReadInputTokens
          totalCacheCreationInputTokens += iterCacheCreationInputTokens

          // Stream ended. Get the fully-assembled message.
          const finalMessage = await anthropicStream.finalMessage()

          if (finalMessage.stop_reason === 'end_turn') {
            // Normal completion. Client already has all the text via
            // forwarded deltas. Emit message_stop + usage + close.
            enqueue({ type: 'message_stop' })
            break
          }

          if (finalMessage.stop_reason === 'max_tokens') {
            // Emit an error SSE so the client can display it. The
            // partial text (if any) is already on screen via deltas.
            enqueue({
              type: 'error',
              error: {
                status: 500,
                message: 'Response exceeded max tokens. Try a more focused question.',
              },
            })
            break
          }

          if (finalMessage.stop_reason === 'tool_use') {
            // Extract tool_use blocks, execute in parallel, append to
            // messages, loop.
            const toolUseBlocks = finalMessage.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
            )

            // Partition blocks into destructive commits vs everything
            // else. Destructive commits MUST run sequentially so the
            // MAX_DESTRUCTIVE_COMMITS counter is check-and-increment
            // under a single thread of execution — Promise.all would
            // race multiple commits past a counter of zero.
            //
            // Reads + writes + destructive previews go parallel
            // (independent, no race concerns). Destructive commits
            // (phase-2 delete with token) go serial after the parallel
            // batch resolves.

            const runBlock = async (
              block: Anthropic.ToolUseBlock,
            ): Promise<{ block: Anthropic.ToolUseBlock; result: ToolResult }> => {
              const started = Date.now()

              // emitPlanStep is a SIGNALING tool, not real work — the
              // user already sees plan rows updating from the dedicated
              // plan SSE events. Don't double-narrate it as tool
              // activity.
              const isSignalingTool = block.name === 'emitPlanStep'

              // Live tool activity: tells the client UI to render
              // "Drafting Garage Cleanout · $800" under the active
              // plan step. The reliable signal — comes from real
              // tool calls, not the agent's self-reported step
              // status (which Sonnet 4.6 is inconsistent about).
              const toolSummary = isSignalingTool
                ? ''
                : formatToolSummary(block.name, block.input)
              if (!isSignalingTool) {
                enqueue({
                  type: 'eidrix_tool_started',
                  name: block.name,
                  summary: toolSummary,
                  iteration,
                })
              }

              const destructive = isDestructiveCommit(block)

              // Check-and-increment BEFORE executing so a concurrent
              // sibling on a parallel path can't also pass the check.
              // (For this serial loop this is belt-and-suspenders, but
              // it keeps the invariant tight.)
              if (destructive) {
                if (destructiveCommitCount >= MAX_DESTRUCTIVE_COMMITS) {
                  const result: ToolResult = {
                    success: false,
                    error: `Destructive-action rate cap reached (${MAX_DESTRUCTIVE_COMMITS} per request). If the user really needs more, they can issue a new chat turn.`,
                    code: 'forbidden',
                  }
                  toolCallLog.push({
                    name: block.name,
                    input: block.input,
                    result,
                    durationMs: Date.now() - started,
                    iteration,
                  })
                  return { block, result }
                }
                destructiveCommitCount++
              }

              const result = await executeToolCall(
                block.name,
                block.input,
                toolCtx,
              )
              const durationMs = Date.now() - started

              // Roll back the pre-increment if the commit didn't
              // actually mutate (failed / rejected token / unexpected
              // preview). Keeps the counter aligned with DB reality.
              if (
                destructive &&
                (!result.success || isPendingConfirmation(result))
              ) {
                destructiveCommitCount--
              }

              toolCallLog.push({
                name: block.name,
                input: block.input,
                result,
                durationMs,
                iteration,
              })

              // Mark the affected store IF the tool succeeded AND
              // maps to a write AND wasn't just a preview (phase 1
              // of a destructive two-phase). Failed writes and
              // previews don't mutate the DB — no refetch needed.
              if (result.success && !isPendingConfirmation(result)) {
                const affected = TOOL_AFFECTS[block.name]
                if (affected) affectedEntities.add(affected)
              }

              // Pending confirmation: notify the client so the UI
              // can render the inline Confirm / Cancel card alongside
              // Claude's explanation.
              if (result.success && isPendingConfirmation(result)) {
                enqueue(pendingActionEvent(result))
              }

              // ─── emitPlanStep interception (AC-05) ────────────────
              // The tool executor returned a minimal ack. Now update
              // the active_plans row + emit the SSE events so the
              // client's plan card renders live.
              if (block.name === 'emitPlanStep' && result.success) {
                const input = block.input as {
                  id: string
                  title: string
                  status: PlanStep['status']
                }
                const now = new Date().toISOString()
                activePlanSteps = mergePlanStep(activePlanSteps, input, now)
                const step = activePlanSteps.find((s) => s.id === input.id)!

                if (activePlanId === null) {
                  // First step in this request — create the plan row.
                  const { data: inserted, error: insertErr } =
                    await supabaseForUser
                      .from('active_plans')
                      .insert({
                        organization_id: orgId,
                        user_id: userId,
                        conversation_id: body.conversationId ?? '',
                        triggering_message_id: body.userMessageId ?? null,
                        status: 'running',
                        steps: activePlanSteps,
                      })
                      .select('id, started_at')
                      .single()
                  if (insertErr || !inserted) {
                    console.warn(
                      '[chat] active_plans insert failed:',
                      insertErr?.message,
                    )
                    // Proceed without persisted plan — the SSE event
                    // still fires so the UI renders, but rehydration
                    // won't work. Better than aborting.
                  } else {
                    activePlanId = inserted.id
                    enqueue({
                      type: 'eidrix_plan_started',
                      planId: inserted.id,
                      triggeringMessageId: body.userMessageId ?? null,
                      firstStep: step,
                      startedAt: inserted.started_at,
                    })
                  }
                } else {
                  // Subsequent step — update the row.
                  const { error: updateErr } = await supabaseForUser
                    .from('active_plans')
                    .update({ steps: activePlanSteps })
                    .eq('id', activePlanId)
                  if (updateErr) {
                    console.warn(
                      '[chat] active_plans update failed:',
                      updateErr.message,
                    )
                  }
                }

                // Fire the per-step event regardless of persistence
                // outcome — the UI's live updates are the primary UX.
                if (activePlanId) {
                  enqueue({
                    type: 'eidrix_plan_step',
                    planId: activePlanId,
                    step,
                    steps: activePlanSteps,
                  })
                }
              }

              // Mirror tool_started with a tool_finished event so the
              // client can flip the active sub-line off (or replace it
              // with the next call's summary). Carries success so the
              // client can show ✓ vs ✗ briefly before the next tool
              // takes over.
              if (!isSignalingTool) {
                enqueue({
                  type: 'eidrix_tool_finished',
                  name: block.name,
                  summary: toolSummary,
                  success: result.success,
                  durationMs,
                  iteration,
                })
              }

              return { block, result }
            }

            // Partition: destructive commits go serial (rate-cap is
            // check-and-increment — parallel would race past it).
            // Everything else (reads, writes, destructive PREVIEWS)
            // runs in parallel for latency.
            const destructiveCommits = toolUseBlocks.filter(isDestructiveCommit)
            const parallelBlocks = toolUseBlocks.filter(
              (b) => !isDestructiveCommit(b),
            )

            const parallelResults = await Promise.all(
              parallelBlocks.map(runBlock),
            )
            const serialResults: typeof parallelResults = []
            for (const b of destructiveCommits) {
              serialResults.push(await runBlock(b))
            }

            // Reassemble in original order so tool_result blocks line
            // up neatly with Claude's original tool_use sequence.
            const resultsById = new Map<
              string,
              { block: Anthropic.ToolUseBlock; result: ToolResult }
            >()
            for (const r of parallelResults) resultsById.set(r.block.id, r)
            for (const r of serialResults) resultsById.set(r.block.id, r)
            const results = toolUseBlocks.map(
              (b) => resultsById.get(b.id)!,
            )

            // Append the assistant turn (full content including text
            // + tool_use blocks) to the messages array so Claude sees
            // the context on the next iteration.
            workingMessages.push({
              role: 'assistant',
              content: finalMessage.content,
            })

            // Append tool_result blocks as a single user message.
            const toolResultContent: Anthropic.ToolResultBlockParam[] =
              results.map(({ block, result }) => ({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
                is_error: !result.success,
              }))
            workingMessages.push({ role: 'user', content: toolResultContent })

            if (iteration === MAX_ITERATIONS) {
              hitIterationCap = true
            }

            // ─── Stop poll at iteration boundary (AC-05) ─────────
            // Only check if a plan is active — no plan means no stop
            // signaling is possible (/chat-stop needs a planId).
            if (activePlanId) {
              const shouldStop = await pollForStop(supabaseForUser, activePlanId)
              if (shouldStop) {
                stopRequested = true
                // Inject a synthetic user message telling Claude to
                // wrap up. No more tool calls — we want a summary
                // paragraph and end_turn. We continue the loop ONE
                // more iteration; Claude produces the summary; we
                // exit via the end_turn branch naturally.
                workingMessages.push({
                  role: 'user',
                  content:
                    '[SYSTEM] The user has requested STOP. Do not call any more tools. In your next response, produce a short summary of what has been completed so far and what remains undone. Then end the turn.',
                })
              }
            }

            // ─── Graceful-degradation nudge at MAX - 3 ────────────
            // Phrased as a batching nudge, not a hard "stop now". A
            // "wrap up and summarize" instruction fires too eagerly —
            // the agent reports partial progress and stops with work
            // still to do. Nudging toward batching lets it choose
            // finish-vs-stop based on actual plan state.
            if (iteration === ITERATION_CAP_WARNING) {
              workingMessages.push({
                role: 'user',
                content:
                  `[SYSTEM] Approaching the iteration limit (${MAX_ITERATIONS}, currently ${iteration}). If critical work remains, BATCH multiple tool_use blocks into your next turn to cover more ground per iteration. Only produce a summary + end the turn if you're at a natural stopping point or truly blocked.`,
              })
            }

            continue
          }

          // Any other stop_reason (pause_turn, refusal, etc.) — treat
          // as completion for now; Session 2 may handle these richer.
          enqueue({ type: 'message_stop' })
          break
        }

        if (hitIterationCap) {
          // Synthetic graceful-stop text. We can't emit a full new
          // content_block here cleanly because we may be mid-loop;
          // use the error channel so the client surfaces it.
          enqueue({
            type: 'error',
            error: {
              status: 500,
              message:
                `Stopped after ${MAX_ITERATIONS} steps to check in. ` +
                'The completed actions are visible in the affected tabs. ' +
                'Ask me to continue if you\'d like me to keep going.',
            },
          })
        }

        // ─── Finalize active plan (AC-05) ─────────────────────────
        // Happy path: derive status from loop outcome and delegate to
        // the shared finalizePlan helper (which now also handles the
        // catch path — that's the fix for stuck "running" rows).
        if (activePlanId) {
          const finalStatus: PlanStatus = stopRequested
            ? 'stopped'
            : hitIterationCap
              ? 'failed'
              : 'complete'
          const reason = hitIterationCap
            ? `Hit iteration cap (${MAX_ITERATIONS})`
            : null
          await finalizePlan(
            supabaseForUser,
            activePlanId,
            activePlanSteps,
            finalStatus,
            reason,
            enqueue,
          )
        }

        // Final usage event — carries everything the Debug tab needs.
        const usageEvent = {
          type: 'eidrix_usage',
          model: settings.model,
          contextMode: settings.context_mode,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          cacheReadInputTokens: totalCacheReadInputTokens,
          cacheCreationInputTokens: totalCacheCreationInputTokens,
          systemPromptBytes: finalSystemPrompt.length,
          customerCount: context.customerCount,
          jobCount: context.jobCount,
          totalCustomers: context.totalCustomers,
          totalJobs: context.totalJobs,
          contextWarning: context.warning,
          responseTimeMs: Date.now() - requestStartedAt,
          systemPromptSent: finalSystemPrompt,
          // AC-03 additions:
          toolCalls: toolCallLog,
          iterations: iterationsRun,
          hitIterationCap,
          uiContext: uiContextParsed,
          affectedEntities: [...affectedEntities],
          // AC-04 Session 2: facts retrieved from memory this turn.
          // Debug tab renders these with similarity scores.
          retrievedMemories,
          // AC-05 Session 1: plan id + final status, for Debug cross-
          // reference. null when the turn didn't involve a plan.
          activePlanId,
          activePlanSteps: activePlanId ? activePlanSteps : [],
        }
        enqueue(usageEvent)
        controller.close()
      } catch (err) {
        const status =
          err instanceof Anthropic.APIError ? err.status : undefined
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[chat] Stream failed:', err)
        enqueue({ type: 'error', error: { status, message } })

        // ─── Critical: finalize any in-flight plan ────────────────
        // Without this, exceptions leave active_plans rows stuck at
        // status='running' forever. See finalizePlan's doc comment.
        if (activePlanId) {
          await finalizePlan(
            supabaseForUser,
            activePlanId,
            activePlanSteps,
            'failed',
            message,
            enqueue,
          )
        }

        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
