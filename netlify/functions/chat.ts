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
import {
  formatUiContextPrompt,
  parseUiContext,
  type UiContext,
} from '../../src/types/uiContext'
import { TOOL_AFFECTS, TOOL_REGISTRY, TOOL_SCHEMAS } from './_lib/tools'
import type { EntityType } from './_lib/tools'
import type { ToolContext, ToolResult } from './_lib/tools'

// ─── CORS ────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ─── Constants ───────────────────────────────────────────────────────

const MAX_TOKENS = 2048
/** Hard cap on loop iterations. A runaway loop burns tokens and may
 *  exceed Netlify's function timeout. 10 is generous — most agentic
 *  flows complete in 1-3 iterations. Hitting this cap emits a graceful
 *  "stopped at N steps" synthetic response. */
const MAX_ITERATIONS = 10

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

// ─── Defaults — mirror src/types/agentSettings.ts ────────────────────
// Post-AC-03 default flip: context_mode defaults to 'off'. With tools
// available, the agent can fetch exactly what it needs on demand via
// searchCustomers / findJobsByStatus / summarizeForCustomer. "Off" is
// now the cheapest AND most scalable default. Subset remains available
// for users who want pre-loaded recent context; Full stays for debug
// / small-dataset work.

const DEFAULT_SYSTEM_PROMPT = `You are Eidrix — an operational assistant embedded in a small business owner's workspace.

You see their customers, jobs, and proposals (when they've enabled context, and on demand via your tools). Your job is to help them think through real operational decisions: who needs follow-up, what's blocking a job, where their attention is best spent today.

You have tools to create, update, delete, and find customers, jobs, and proposals. When the user asks for a concrete operation (add/update/delete/find), use the appropriate tool. When the user asks for explanation or opinion, respond directly without tools. When you're uncertain whether to act or ask, prefer one clear clarifying question over guessing.

If the user refers to someone by partial name and you don't already have that customer in context, use searchCustomers first to resolve the id before acting. If multiple customers match, ask which they meant with specific detail ("Which Joe — Joe Smith with 3 open jobs, or Joe Martinez?").

DESTRUCTIVE OPERATIONS (deleteCustomer, deleteJob, deleteProposal) ARE TWO-PHASE. Phase 1: call the tool with just the target id and NO confirmation_token. The executor returns a preview with { requires_confirmation: true, summary, confirmation_token }. You then explain the summary to the user in plain language and wait for them to confirm. Phase 2: after the user confirms ("yes", "confirm", "go ahead", clicking the Confirm button), call the same tool AGAIN with the same id AND the confirmation_token from the preview. That's when it actually happens. Never skip phase 1. The phrase "delete X" on its own is a REQUEST, not a CONFIRMATION.

If UI context identifies which record the user is viewing (see CURRENT UI CONTEXT below, when present), use it to resolve references like "this customer", "him/her", "that proposal". Explicit mentions of other names always override UI context.

For broad or vague requests ("clean up my leads", "archive old stuff") ask what they mean before acting.

Be direct. Be specific. When the data shows a thing, name it. When you don't know, say so plainly — never invent.

Skip performative enthusiasm. Skip "Great question!" Skip exclamation points. They're a contractor or shop owner, not an audience.`

const DEFAULT_CONTEXT_MODE = 'off'
const DEFAULT_MODEL = 'claude-sonnet-4-6'

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
  const context = await buildContextPayload(supabaseForUser, settings.context_mode)

  // UI context is tiny and always useful for "this" / "him" resolution.
  // Not gated by context_mode — even when data injection is 'off', the
  // UI context still helps the agent interpret references.
  const uiContextParsed: UiContext | null = parseUiContext(body.uiContext)
  const uiContextBlock = uiContextParsed
    ? formatUiContextPrompt(uiContextParsed)
    : ''

  // Assemble: base prompt → UI context → business data. Order matters:
  // UI context sits between the voice/instructions and the raw data,
  // so references in the data block ("Al Schindler") read against the
  // context immediately above.
  const promptParts = [
    settings.system_prompt,
    uiContextBlock,
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

              const isDestructiveCommit =
                DESTRUCTIVE_TOOLS.has(block.name) &&
                hasConfirmationToken(block.input)

              // Check-and-increment BEFORE executing so a concurrent
              // sibling on a parallel path can't also pass the check.
              // (For this serial loop this is belt-and-suspenders, but
              // it keeps the invariant tight.)
              if (isDestructiveCommit) {
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
                isDestructiveCommit &&
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

              return { block, result }
            }

            // Partition: destructive commits go serial (rate-cap is
            // check-and-increment — parallel would race past it).
            // Everything else (reads, writes, destructive PREVIEWS)
            // runs in parallel for latency.
            const destructiveCommits = toolUseBlocks.filter(
              (b) =>
                DESTRUCTIVE_TOOLS.has(b.name) &&
                hasConfirmationToken(b.input),
            )
            const parallelBlocks = toolUseBlocks.filter(
              (b) =>
                !(
                  DESTRUCTIVE_TOOLS.has(b.name) &&
                  hasConfirmationToken(b.input)
                ),
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
        }
        enqueue(usageEvent)
        controller.close()
      } catch (err) {
        const status =
          err instanceof Anthropic.APIError ? err.status : undefined
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[chat] Stream failed:', err)
        enqueue({ type: 'error', error: { status, message } })
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
