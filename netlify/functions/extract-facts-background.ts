// ──────────────────────────────────────────────────────────────────────
// extract-facts-background — Netlify background function that runs
// fact extraction after each user message.
//
// ─── Why the `-background` suffix matters ─────────────────────────────
// Netlify treats files with `-background.ts` (or `-background.js`)
// suffix as BACKGROUND functions. Key differences from regular
// functions:
//   - Response to the triggering HTTP request is 202 Accepted,
//     returned IMMEDIATELY — the actual handler runs asynchronously.
//   - Execution budget is up to 15 minutes (vs 10 seconds for regular
//     Hobby-plan functions).
//   - The triggering client can close the connection without killing
//     the background work — Netlify holds the worker alive.
//
// This is the blessed pattern for "run this after I respond to the
// user." Naive fire-and-forget to a regular function would often die
// when the caller's request ends.
//
// ─── Security ─────────────────────────────────────────────────────────
// The caller (chatStore in the browser) passes their Supabase JWT in
// the Authorization header. We forward it into the authed Supabase
// client so RLS applies. No service-role keys here — consistent with
// the rest of the app's defense-in-depth posture.
// ──────────────────────────────────────────────────────────────────────

import type { Context } from '@netlify/functions'

import { extractFactsForMessage } from './_lib/memory/extractFacts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface RequestBody {
  userMessageId?: string
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) {
    return new Response('Unauthenticated', { status: 401, headers: CORS_HEADERS })
  }

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: CORS_HEADERS })
  }
  if (!body.userMessageId || typeof body.userMessageId !== 'string') {
    return new Response('Missing userMessageId', {
      status: 400,
      headers: CORS_HEADERS,
    })
  }

  try {
    const result = await extractFactsForMessage({
      jwt,
      userMessageId: body.userMessageId,
    })
    // Netlify auto-responds 202 for background functions to the
    // triggering client. The return here is consumed by Netlify's
    // runtime and logged in the function-invocation dashboard — map
    // the status to an HTTP code so error filters work cleanly:
    //   error → 500 (surfaces in Netlify's error metrics)
    //   everything else (facts_extracted, no_facts, skipped) → 200
    const statusCode = result.status === 'error' ? 500 : 200
    return new Response(JSON.stringify(result), {
      status: statusCode,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[extract-facts-background] unexpected error:', err)
    return new Response(JSON.stringify({ status: 'error', reason: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
}
