// ──────────────────────────────────────────────────────────────────────
// reembed-fact-background — regenerates a fact's embedding after its
// content changes (AC-04 Session 2).
//
// Triggered by the Memory UI's inline-edit flow: user saves an edited
// fact → store updates memory_facts.content → fires this function to
// refresh the embedding. Background + async so the UI feels instant.
//
// Same `-background.ts` naming convention as extract-facts-background —
// Netlify queues it independently, 15-min budget, 202 Accepted
// immediately to the caller.
// ──────────────────────────────────────────────────────────────────────

import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '../../src/types/database.types'
import {
  embeddingToVectorParam,
  generateEmbedding,
  isEmbedSuccess,
} from './_lib/memory/embed'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface RequestBody {
  factId?: string
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
  if (!body.factId || typeof body.factId !== 'string') {
    return new Response('Missing factId', {
      status: 400,
      headers: CORS_HEADERS,
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnon = process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnon) {
    return new Response('Server misconfigured', {
      status: 500,
      headers: CORS_HEADERS,
    })
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    // Load the fact — RLS enforces ownership so a user can only
    // reembed their own facts.
    const { data: fact, error: factErr } = await supabase
      .from('memory_facts')
      .select('id, content, is_active')
      .eq('id', body.factId)
      .maybeSingle()

    if (factErr) {
      console.error('[reembed] fact load failed:', factErr)
      return new Response(JSON.stringify({ status: 'error', reason: factErr.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    if (!fact) {
      return new Response(JSON.stringify({ status: 'error', reason: 'fact not found' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    if (!fact.is_active) {
      // Soft-deleted. Skip — retrieval filters active-only anyway, and
      // Voyage calls cost tokens.
      return new Response(JSON.stringify({ status: 'skipped', reason: 'fact inactive' }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const embed = await generateEmbedding(fact.content, 'document')
    if (!isEmbedSuccess(embed)) {
      console.error('[reembed] generation failed:', embed.error)
      return new Response(JSON.stringify({ status: 'error', reason: embed.error }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Upsert on fact_id — row exists from initial insert; we overwrite
    // with the new embedding + model_version.
    const { error: upsertErr } = await supabase
      .from('memory_fact_embeddings')
      .upsert(
        {
          fact_id: fact.id,
          embedding: embeddingToVectorParam(embed.embedding),
          model_version: embed.model,
        },
        { onConflict: 'fact_id' },
      )

    if (upsertErr) {
      console.error('[reembed] upsert failed:', upsertErr)
      return new Response(JSON.stringify({ status: 'error', reason: upsertErr.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ status: 'reembedded' }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[reembed] unexpected error:', err)
    return new Response(JSON.stringify({ status: 'error', reason: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
}
