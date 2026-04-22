// ──────────────────────────────────────────────────────────────────────
// health — Netlify Function that confirms the env-var plumbing works.
//
// Purpose: prove the deployment chain can read ANTHROPIC_API_KEY server-
// side, without ever exposing the key itself. Returns diagnostic info
// only (presence + length), never the key value.
//
// This function is the foundation pattern for every future server-side
// endpoint that needs a secret. AC-01's real chat-completion function
// starts from this same shape — same env-var read, same CORS headers,
// same "secrets stay in the function's runtime, never in the response."
//
// Called from:
//   - Local dev:  http://localhost:8888/.netlify/functions/health
//   - Production: https://trialand-error.netlify.app/.netlify/functions/health
// ──────────────────────────────────────────────────────────────────────

import type { Context } from '@netlify/functions'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default async (req: Request, _context: Context) => {
  // Handle CORS preflight — browsers send this before any non-simple request.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'GET') {
    return json(
      { error: 'Method not allowed' },
      { status: 405 },
    )
  }

  // Read the secret from server-side env. Browser code literally cannot
  // reach this process.env — that's the whole point of the server/browser
  // split this chapter teaches.
  const apiKey = process.env.ANTHROPIC_API_KEY ?? ''

  // CRITICAL: only return metadata about the key, NEVER the key itself.
  // Anthropic keys are ~108 chars; any "normal" value here signals the
  // env var is wired correctly. A length of 0 means the var isn't set
  // or isn't readable from the function's runtime.
  return json({
    status: 'ok',
    hasApiKey: apiKey.length > 0,
    keyLength: apiKey.length,
    timestamp: new Date().toISOString(),
  })
}

// Small JSON response helper — applies CORS + content-type without
// the consumer having to repeat them per response.
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
