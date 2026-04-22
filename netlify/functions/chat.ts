// ──────────────────────────────────────────────────────────────────────
// chat — streaming AI completion from Anthropic's Messages API.
//
// The real-AI endpoint. Accepts a POST with { messages: [...] } from
// the browser, calls Anthropic with stream: true, and pipes the SSE
// stream back to the caller so the browser can render tokens as they
// arrive.
//
// ─── Secret handling ──────────────────────────────────────────────────
// ANTHROPIC_API_KEY never leaves this process. Browser code cannot read
// it, nor can any response body expose it — the only things we send
// back are the model's generated tokens and (on failure) generic error
// shapes.
//
// ─── Error surfacing (two channels) ───────────────────────────────────
//   1. Pre-stream errors (bad body, missing key) — returned as HTTP
//      error statuses with JSON bodies. These happen before any SSE
//      bytes flow, so the status code is still changeable.
//   2. Mid-stream errors (rate limit, auth failure on first connect,
//      Anthropic outage mid-response) — embedded as `type: 'error'`
//      SSE frames. Once we've returned the streaming Response, the
//      200 OK status is committed and we can't change it.
//
// The client handles both channels with equivalent UX. Error frames
// include a numeric `status` so the client can distinguish 429 (auto-
// retry after 10s) from other failures (manual retry).
// ──────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import type { Context } from '@netlify/functions'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Cheapest, fastest Claude. Right for streaming-chat learning, plenty
// smart for operational Q&A. Upgrade to Sonnet when a chapter needs
// more reasoning (AC-03 onward) — this model constant is the lever.
const MODEL = 'claude-haiku-4-5-20251001'

// 2048 is generous for chat replies (avg reply lands well under 500)
// while capping runaway-generation cost during testing. Bump in a
// follow-up PR if users hit the ceiling organically.
const MAX_TOKENS = 2048

// ─── System prompt ───────────────────────────────────────────────────
// The voice of Eidrix. Iterate on this as you use the product — the
// right tone isn't obvious on day one. Lives here as a string so it's
// easy to edit; AC-02 may move it when per-tenant prompts land.
const SYSTEM_PROMPT = `You are Eidrix, a business operations assistant embedded in a small business owner's workspace. The user is a working operator — contractor, tradesperson, shop owner, freelancer — not a technical professional. Be dry, direct, and grounded. Give practical answers they can act on today. Skip performative enthusiasm ("Great question!", "I'd love to help!") — it reads as hollow. When you don't know something, say so plainly. When the user's data or context isn't available yet, acknowledge the gap honestly rather than inventing specifics.`

// ─── Types ───────────────────────────────────────────────────────────

interface IncomingMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: IncomingMessage[]
}

// ─── Main handler ────────────────────────────────────────────────────

export default async (req: Request, _context: Context) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  // Parse + validate body. Bad shape is a 400 — the caller fix is to
  // send a valid messages array, not retry.
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
          error:
            'Each message must have role (user|assistant) and string content',
        },
        { status: 400 },
      )
    }
  }

  // Missing key is a config bug, not a user error. 500 is the right
  // signal — callers shouldn't retry, ops should fix.
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return json(
      { error: 'Server misconfigured: ANTHROPIC_API_KEY missing' },
      { status: 500 },
    )
  }

  const anthropic = new Anthropic({ apiKey })

  // ─── Build the SSE response stream ────────────────────────────────
  // Returning a Response with a ReadableStream body commits us to 200
  // OK + streaming. Any error after this point surfaces as an SSE
  // error frame, not an HTTP status change.
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          messages: body.messages,
        })

        // Forward every event from Anthropic verbatim. The client cares
        // primarily about `content_block_delta` (tokens) and
        // `message_stop` (completion), but forwarding all of them keeps
        // future chapters free to use `message_delta.usage`, etc.,
        // without changing the server.
        for await (const event of anthropicStream) {
          const frame = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(frame))
        }

        controller.close()
      } catch (err) {
        // Propagate HTTP status where possible — 429 drives client
        // auto-retry, other statuses drive manual retry UI.
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
          // Controller may already be closed if the client disconnected
          // mid-error — swallow silently.
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      // Prevents intermediaries from buffering the stream. Netlify's
      // edge respects both; included for belt-and-suspenders when
      // running locally through unknown proxies.
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
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
