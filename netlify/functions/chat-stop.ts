// ──────────────────────────────────────────────────────────────────────
// chat-stop — terminate a running agentic plan (AC-05 Session 1).
//
// Two outcomes per call, both atomic in one Supabase UPDATE:
//
//   1. requested_stop = true   — signal for any LIVE chat.ts function
//      polling this row. It picks up the flag at its next iteration
//      boundary, injects a "wrap up" synthetic user message, Claude
//      produces a summary, and the loop exits via the existing
//      finalizePlan helper with status='stopped'.
//
//   2. status = 'stopped' (only when the row is older than the live
//      window — see STALE_THRESHOLD_MS below). Covers the dead-stream
//      case where chat.ts crashed without finalizing: the user pressing
//      Stop directly cleans up the zombie row, no waiting on a function
//      that will never poll again.
//
// Why the threshold: if we always set status=stopped immediately, a
// race becomes possible where the live chat.ts function is mid-flight,
// sees status changed under it, and finalizePlan re-overwrites with
// status. Better to let the running loop self-terminate (clean exit
// with completion summary + eidrix_plan_complete event) when it can,
// and only force-stop when no loop appears to be running.
//
// Safety constraints:
//   - User's JWT required; RLS ensures own-plans-only
//   - Only running plans are touched (terminal rows are no-ops)
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

  // Read the row first to see how stale it is. If the row is older than
  // STALE_THRESHOLD_MS the chat.ts function that started it is almost
  // certainly dead (Netlify max function lifetime is well under this
  // threshold). In that case we force status=stopped directly — no
  // waiting for a polling loop that no longer exists.
  const { data: planRow, error: fetchErr } = await supabase
    .from('active_plans')
    .select('id, status, started_at')
    .eq('id', body.planId)
    .maybeSingle()
  if (fetchErr) {
    console.error('[chat-stop] fetch failed:', fetchErr.message)
    return jsonResponse({ error: fetchErr.message }, 500)
  }
  if (!planRow) {
    return jsonResponse(
      { ok: true, stopSignalSent: false, planId: body.planId, reason: 'not-found' },
      200,
    )
  }
  if (planRow.status !== 'running') {
    // Already terminal — nothing to do.
    return jsonResponse(
      { ok: true, stopSignalSent: false, planId: body.planId, reason: 'already-terminal' },
      200,
    )
  }

  const STALE_THRESHOLD_MS = 30_000
  const ageMs =
    Date.now() - new Date(planRow.started_at as string).getTime()
  const isLikelyDead = ageMs > STALE_THRESHOLD_MS

  // ─── Live path: set requested_stop, let chat.ts finalize cleanly ──
  // chat.ts polls between iterations. Within a few seconds it picks up
  // the flag, asks Claude for a wrap-up summary, then runs finalizePlan
  // which emits the SSE event the client uses to clear activePlan.
  if (!isLikelyDead) {
    const { error } = await supabase
      .from('active_plans')
      .update({ requested_stop: true })
      .eq('id', body.planId)
      .eq('status', 'running')
    if (error) {
      console.error('[chat-stop] flag update failed:', error.message)
      return jsonResponse({ error: error.message }, 500)
    }
    return jsonResponse(
      {
        ok: true,
        stopSignalSent: true,
        planId: body.planId,
        mode: 'signal',
      },
      200,
    )
  }

  // ─── Dead-stream path: force-stop directly ───────────────────────
  // No live function to poll the flag. Mark the row terminal so the
  // client can rehydrate cleanly and the user is unblocked.
  const completedAt = new Date().toISOString()
  const { error: forceErr } = await supabase
    .from('active_plans')
    .update({
      requested_stop: true,
      status: 'stopped',
      completion_summary:
        'Stop pressed on a stale plan — the originating request is no longer running.',
      completed_at: completedAt,
    })
    .eq('id', body.planId)
    .eq('status', 'running')
  if (forceErr) {
    console.error('[chat-stop] force-stop failed:', forceErr.message)
    return jsonResponse({ error: forceErr.message }, 500)
  }
  return jsonResponse(
    {
      ok: true,
      stopSignalSent: true,
      planId: body.planId,
      mode: 'force',
    },
    200,
  )
}
