// ──────────────────────────────────────────────────────────────────────
// chat — context-aware streaming AI completion (AC-02).
//
// Flow per request:
//   1. Validate JWT from Authorization header (no JWT = 401)
//   2. Create per-request Supabase client with that JWT — RLS applies
//   3. Find the user's active organization (single-membership for now)
//   4. Load agent_settings for that org (lazy-upsert defaults if missing)
//   5. Branch on context_mode:
//        'off'    → no data injection
//        'subset' → recent customers + open jobs
//        'full'   → all customers + all jobs
//   6. Format business data as STRUCTURED text (not prose) for Claude
//   7. Build final system prompt = settings.system_prompt + context
//   8. Stream from Anthropic with the configured model
//   9. Forward all SSE events + emit a final 'usage' event with stats
//
// ─── Why JWT-pass-through (not service role) ──────────────────────────
// We could use SUPABASE_SERVICE_ROLE_KEY to bypass RLS and fetch any
// row freely — faster, simpler. Rejected: a single bug in our query
// (forgetting an organization_id filter) would leak cross-tenant data.
// Forwarding the user's JWT means RLS enforces tenant isolation at the
// database layer, and any code bug becomes a "zero rows returned"
// error rather than a data leak. Defense in depth.
//
// ─── Why lazy-upsert defaults from BOTH client and server ──────────
// The Settings UI lazy-upserts on first load (browser); this function
// also lazy-upserts on first request (server). Either path can be
// hit first depending on user behavior. Both paths converge on the
// same defaults, defined as constants below. If real Eidrix later
// moves defaults to a config table or per-tenant template, both
// paths read from there instead — but the convergence guarantee stays.
// ──────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '../../src/types/database.types'

// ─── CORS ────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ─── Constants ───────────────────────────────────────────────────────

const MAX_TOKENS = 2048

// Subset selection: customer is "in subset" if updated within this
// many days OR has any job in an open status. Tunable per real-Eidrix
// tenant later; one knob for now.
const SUBSET_RECENT_DAYS = 30

// Job statuses considered "open" for the subset and counts.
const OPEN_JOB_STATUSES = ['draft', 'scheduled', 'in_progress'] as const

// ─── Defaults — duplicated from src/types/agentSettings.ts ──────────
// Lives here as well because Netlify Functions get their own bundle
// and can't import from src/. If you change these, change there too.
// Real Eidrix may move both to a shared `defaults/` package.

const DEFAULT_SYSTEM_PROMPT = `You are Eidrix — an operational assistant embedded in a small business owner's workspace.

You see their customers and jobs (when they've enabled context). Your job is to help them think through real operational decisions: who needs follow-up, what's blocking a job, where their attention is best spent today.

Be direct. Be specific. When the data shows a thing, name it. When you don't know, say so plainly — never invent.

Skip performative enthusiasm. Skip "Great question!" Skip exclamation points. They're a contractor or shop owner, not an audience.

When asked about their data, look at what's actually there. When asked something general, give a useful operator's answer.`

const DEFAULT_CONTEXT_MODE = 'subset'
const DEFAULT_MODEL = 'claude-sonnet-4-6'

// ─── Types ───────────────────────────────────────────────────────────

interface IncomingMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: IncomingMessage[]
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

/** Find the user's active org via memberships. RLS scopes this to the
 *  caller. For Trial and Error each user has exactly one membership;
 *  we take the first. Real Eidrix's multi-org future stores a
 *  preferred org in user_metadata and reads that here. */
async function findActiveOrgId(
  supabase: ReturnType<typeof createUserClient>,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('memberships')
    .select('organization_id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[chat] findActiveOrgId error:', error)
    return null
  }
  return data?.organization_id ?? null
}

/** Load agent_settings for the org. If no row exists, lazy-upsert
 *  defaults so the next call (and the Settings UI) sees a row. */
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
    // Fall through to defaults rather than blocking the chat.
  }

  if (data) {
    return {
      organization_id: data.organization_id,
      system_prompt: data.system_prompt,
      context_mode: data.context_mode as ContextMode,
      model: data.model,
    }
  }

  // Lazy upsert.
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
    // Return constant defaults so the chat still works even if the
    // insert was blocked (e.g., transient DB issue). User won't see
    // their settings persisted but their message will go through.
    return {
      organization_id: orgId,
      system_prompt: DEFAULT_SYSTEM_PROMPT,
      context_mode: DEFAULT_CONTEXT_MODE,
      model: DEFAULT_MODEL,
    }
  }

  return {
    organization_id: inserted.organization_id,
    system_prompt: inserted.system_prompt,
    context_mode: inserted.context_mode as ContextMode,
    model: inserted.model,
  }
}

// ─── Context formatters ─────────────────────────────────────────────
// Output is STRUCTURED — pipes for fields, dashes for absent values,
// caps for headers, totals at the bottom. Claude reasons dramatically
// better on this format than prose. See AC-02's "Structured context
// beats prose" tour moment for the why.

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

  // Always fetch totals + status breakdown (cheap; one tiny query each).
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
    // 'subset': recent customers OR customers with open jobs, plus jobs
    // belonging to those customers AND in open statuses.
    blockLabel = `recent ${SUBSET_RECENT_DAYS}d + open`
    const cutoffIso = new Date(
      Date.now() - SUBSET_RECENT_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString()

    const [{ data: openJobsRaw, error: openErr }, { data: recentCustomers, error: recentErr }] =
      await Promise.all([
        supabase
          .from('jobs')
          .select('id, customer_id, title, status, scheduled_date, amount')
          .in('status', OPEN_JOB_STATUSES as unknown as string[])
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

    // Union: recent customers ∪ customers referenced by open jobs.
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

// ─── Main handler ────────────────────────────────────────────────────

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  // Auth header
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

  // Per-request Supabase client (RLS context = this user's JWT)
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

  // Active org
  const orgId = await findActiveOrgId(supabaseForUser)
  if (!orgId) {
    return json(
      { error: 'No active workspace found for this user' },
      { status: 403 },
    )
  }

  // Settings + context (in parallel — both depend only on orgId)
  const settings = await loadAgentSettings(supabaseForUser, orgId)
  const context = await buildContextPayload(supabaseForUser, settings.context_mode)

  const finalSystemPrompt = context.injectedText
    ? `${settings.system_prompt}\n\n${context.injectedText}`
    : settings.system_prompt

  const requestStartedAt = Date.now()
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: settings.model,
          max_tokens: MAX_TOKENS,
          system: finalSystemPrompt,
          messages: body.messages,
        })

        let inputTokens = 0
        let outputTokens = 0
        let cacheReadInputTokens = 0
        let cacheCreationInputTokens = 0

        for await (const event of anthropicStream) {
          // Capture usage as it streams in (message_start carries
          // input_tokens; message_delta updates output_tokens).
          if (event.type === 'message_start') {
            const usage = event.message?.usage
            if (usage) {
              inputTokens = usage.input_tokens ?? 0
              outputTokens = usage.output_tokens ?? 0
              cacheReadInputTokens = usage.cache_read_input_tokens ?? 0
              cacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0
            }
          } else if (event.type === 'message_delta') {
            const usage = event.usage
            if (usage) {
              outputTokens = usage.output_tokens ?? outputTokens
            }
          }

          const frame = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(frame))
        }

        // Final eidrix-specific event with all the bookkeeping the
        // Debug tab needs. Type 'eidrix_usage' so the client can
        // distinguish it from native Anthropic events.
        const usageEvent = {
          type: 'eidrix_usage',
          model: settings.model,
          contextMode: settings.context_mode,
          inputTokens,
          outputTokens,
          cacheReadInputTokens,
          cacheCreationInputTokens,
          systemPromptBytes: finalSystemPrompt.length,
          customerCount: context.customerCount,
          jobCount: context.jobCount,
          totalCustomers: context.totalCustomers,
          totalJobs: context.totalJobs,
          contextWarning: context.warning,
          responseTimeMs: Date.now() - requestStartedAt,
          // Full prompt the model saw — Debug tab renders this. Not
          // logged anywhere on the server; only this caller sees it.
          systemPromptSent: finalSystemPrompt,
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(usageEvent)}\n\n`),
        )

        controller.close()
      } catch (err) {
        const status =
          err instanceof Anthropic.APIError ? err.status : undefined
        const message = err instanceof Error ? err.message : 'Unknown error'

        const errorFrame = `data: ${JSON.stringify({
          type: 'error',
          error: { status, message },
        })}\n\n`
        try {
          controller.enqueue(encoder.encode(errorFrame))
        } catch {
          // Controller may already be closed.
        }
        controller.close()
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
