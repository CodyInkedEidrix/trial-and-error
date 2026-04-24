// ──────────────────────────────────────────────────────────────────────
// chat-stop — terminate a running agentic plan.
//
// Always force-terminates: one Supabase UPDATE that sets both
// requested_stop=true AND status='stopped' on the active_plans row.
// Two reasons for "always force":
//
//   1. A LIVE chat.ts function polls requested_stop at each iteration
//      boundary. It'll see the flag, inject a [SYSTEM] STOP message,
//      Claude produces a summary, and the loop exits via finalizePlan
//      with status='stopped' — overwriting our force-set status with
//      the same value. No-op, and the completion_summary gets filled
//      in properly along the way.
//
//   2. A DEAD chat.ts function (timeout, crash, dropped stream) isn't
//      around to poll anything. Force-setting status='stopped' directly
//      is the only way to clean up the row. The client's /chat-stop
//      call will succeed, the user's UI unblocks, rehydrate on next
//      load sees a clean terminal row.
//
// Previous two-mode design (signal if < 30s old, force if older)
// couldn't reliably detect which case was active — the function may
// have been alive 100ms ago and crashed between now and the next poll.
// Always-force collapses both cases into one correct behavior.
//
// Safety constraints:
//   - User's JWT required; RLS ensures own-plans-only
//   - Only plans with status='running' are touched (no-op on terminal)
// ──────────────────────────────────────────────────────────────────────

import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '../../src/types/database.types'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface RequestBody {
  planId?: string
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) {
    return jsonResponse({ error: 'Unauthenticated' }, 401)
  }

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }
  if (!body.planId || typeof body.planId !== 'string') {
    return jsonResponse({ error: 'Missing planId' }, 400)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnon = process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnon) {
    return jsonResponse({ error: 'Server misconfigured' }, 500)
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Single UPDATE, scoped to status='running' so a stale client click
  // can't overwrite a terminal row. If the row is already terminal
  // (rare race), the UPDATE returns zero rows and we report no-op.
  const completedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('active_plans')
    .update({
      requested_stop: true,
      status: 'stopped',
      completion_summary:
        'Stopped at user request.',
      completed_at: completedAt,
    })
    .eq('id', body.planId)
    .eq('status', 'running')
    .select('id')

  if (error) {
    console.error('[chat-stop] update failed:', error.message)
    return jsonResponse({ error: error.message }, 500)
  }

  const terminated = (data ?? []).length > 0
  return jsonResponse(
    {
      ok: true,
      stopSignalSent: terminated,
      planId: body.planId,
      // 'force' kept in the response for client back-compat; the
      // client's requestStop rehydrates when it sees 'force'.
      mode: 'force',
      reason: terminated ? 'terminated' : 'already-terminal',
    },
    200,
  )
}
