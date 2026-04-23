// ──────────────────────────────────────────────────────────────────────
// embed — Voyage AI client for generating text embeddings (AC-04
// Session 2).
//
// Why Voyage:
//   - Anthropic's recommended partner; designed to pair with Claude
//     semantically (embeddings optimized for the same conceptual
//     surface Claude reasons over)
//   - Competitive quality + pricing vs OpenAI / Cohere
//   - Simple API, one endpoint, one model
//
// Why the "document" vs "query" distinction matters:
//   - `document` — optimized for things that will be STORED and matched
//     against (facts, in our case)
//   - `query` — optimized for incoming search queries
//   Voyage trains its models to produce slightly different embeddings
//   for each role, so retrieval quality improves ~5-10% vs treating
//   both sides symmetrically. Costs nothing to pass the hint.
//
// ─── Locked principle ────────────────────────────────────────────────
// `memory_facts.content` is the source of truth. This module is a
// cache generator. If Voyage disappears or gets expensive, we swap
// the implementation here + run a backfill job — the data model
// doesn't change.
// ──────────────────────────────────────────────────────────────────────

const VOYAGE_ENDPOINT = 'https://api.voyageai.com/v1/embeddings'
export const VOYAGE_MODEL = 'voyage-3'
/** Voyage-3 output dimension. Must match the `vector(1024)` column
 *  in memory_fact_embeddings. If this ever changes, that's a schema
 *  migration. */
export const VOYAGE_DIM = 1024

const VOYAGE_TIMEOUT_MS = 8000

type InputKind = 'document' | 'query'

interface VoyageResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage?: {
    total_tokens: number
  }
}

export interface EmbedSuccess {
  embedding: number[]
  model: typeof VOYAGE_MODEL
  tokens: number
}

export interface EmbedFailure {
  error: string
}

export type EmbedResult = EmbedSuccess | EmbedFailure

export function isEmbedSuccess(r: EmbedResult): r is EmbedSuccess {
  return 'embedding' in r && Array.isArray(r.embedding)
}

/** Serialize an embedding array for use as a Supabase RPC param or
 *  jsonb column. pgvector accepts the JSON-array literal form via
 *  implicit cast; supabase-js's generated types declare the param as
 *  `string`, so centralizing the conversion here eliminates repeated
 *  `as unknown as string` casts at call sites. */
export function embeddingToVectorParam(embedding: number[]): string {
  return JSON.stringify(embedding)
}

/** Generate a single embedding for a text string. `kind` defaults to
 *  'document' — pass 'query' when embedding a user's incoming message
 *  for retrieval. */
export async function generateEmbedding(
  text: string,
  kind: InputKind = 'document',
): Promise<EmbedResult> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) {
    return { error: 'VOYAGE_API_KEY not set' }
  }

  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return { error: 'empty text' }
  }

  const abortController = new AbortController()
  const timeoutId = setTimeout(
    () => abortController.abort(),
    VOYAGE_TIMEOUT_MS,
  )

  try {
    const res = await fetch(VOYAGE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: [trimmed],
        model: VOYAGE_MODEL,
        input_type: kind,
      }),
      signal: abortController.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { error: `Voyage ${res.status}: ${body.slice(0, 200)}` }
    }

    const data = (await res.json()) as VoyageResponse
    const first = data.data?.[0]
    if (!first || !Array.isArray(first.embedding)) {
      return { error: 'Voyage returned no embedding' }
    }
    if (first.embedding.length !== VOYAGE_DIM) {
      return {
        error: `Voyage returned ${first.embedding.length} dim, expected ${VOYAGE_DIM}`,
      }
    }
    return {
      embedding: first.embedding,
      model: VOYAGE_MODEL,
      tokens: data.usage?.total_tokens ?? 0,
    }
  } catch (err) {
    const aborted = abortController.signal.aborted
    const message = aborted
      ? `Voyage call timed out (${VOYAGE_TIMEOUT_MS}ms)`
      : err instanceof Error
        ? err.message
        : 'Voyage call failed'
    return { error: message }
  } finally {
    clearTimeout(timeoutId)
  }
}
