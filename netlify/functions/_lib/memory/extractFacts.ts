// ──────────────────────────────────────────────────────────────────────
// extractFacts — reads one user message, asks Haiku to identify
// durable facts, persists them to memory_facts.
//
// This is the SIGNAL-extraction layer of Eidrix's memory architecture.
// Session 1 ships this as a Netlify background function; the main
// chat function fires at it and moves on. User never waits.
//
// ─── Why tool-use over JSON mode ─────────────────────────────────────
// Two tools are defined: `record_fact` (emit a fact) and
// `no_facts_found` (explicit "nothing durable here"). tool_choice is
// any, so Claude MUST call one. This eliminates JSON-parse fragility
// AND forces a decisive output — no ambiguous text responses sneaking
// through. Every run returns EITHER one-or-more record_fact calls OR
// exactly one no_facts_found call. No other paths.
//
// ─── Why Haiku ──────────────────────────────────────────────────────
// Extraction is structured-output pattern-matching, not reasoning.
// Haiku 4.5 is ~3× cheaper than Sonnet and fast enough for background
// work. If the stress-test battery shows Haiku missing subtle
// preferences, flip to Sonnet per the chapter's Session 1 verification
// step.
// ──────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '../../../src/types/database.types'
import {
  compileEntityRegistry,
  formatEntityRegistry,
  validateEntityInRegistry,
  type RegistryEntry,
} from './entityRegistry'
import {
  embeddingToVectorParam,
  generateEmbedding,
  isEmbedSuccess,
} from './embed'

// ─── Constants ───────────────────────────────────────────────────────

const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001'
const EXTRACTION_TIMEOUT_MS = 8000
const MIN_CONFIDENCE = 0.6
const MAX_FACTS_PER_MESSAGE = 3
const MIN_MESSAGE_LENGTH = 3 // skip single-word or emoji-only messages
const RECENT_CONTEXT_COUNT = 3 // messages before the target for disambiguation

// ─── Tool schemas (force structured output) ──────────────────────────

const recordFactTool: Anthropic.Tool = {
  name: 'record_fact',
  description: [
    'Record a single durable fact extracted from the user message.',
    'Call once per fact — call multiple times in one turn to record multiple facts (max 3).',
    'Only emit facts that are DURABLE (likely still true in a week).',
    'Return content as a concise third-person-imperative statement under 200 chars.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description:
          'The fact as a concise statement, 1-200 chars. Third-person-imperative style: "Prefers X", "Always does Y", "Committed to Z by date".',
      },
      fact_type: {
        type: 'string',
        enum: ['preference', 'rule', 'context', 'commitment', 'observation'],
      },
      entity_type: {
        type: 'string',
        enum: ['customer', 'job', 'proposal'],
        description:
          'Set only when the fact is specifically about an entity named in the message that matches the entity registry. Omit for general facts.',
      },
      entity_id: {
        type: 'string',
        description:
          'UUID of the entity from the registry. Only include if entity_type is set AND the name clearly matches a registry entry.',
      },
      confidence: {
        type: 'number',
        description:
          'Calibration: 0.95+ for explicit "always/never". 0.8 default. 0.6-0.7 for inferred or ambiguous.',
      },
    },
    required: ['content', 'fact_type', 'confidence'],
  },
}

const noFactsFoundTool: Anthropic.Tool = {
  name: 'no_facts_found',
  description: [
    'Call this exactly ONCE when the user message contains no durable facts worth remembering.',
    'Use for: questions, small talk, transient states, emotional vents with no durable info.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description:
          'Brief reason — one of: ephemeral, question, small_talk, vent, unclear.',
      },
    },
    required: ['reason'],
  },
}

// ─── Extraction prompt ───────────────────────────────────────────────

function buildSystemPrompt(
  registry: RegistryEntry[],
  recentContext: Array<{ role: string; content: string }>,
): string {
  const registryText = formatEntityRegistry(registry)
  const contextText =
    recentContext.length === 0
      ? '(no prior messages in this conversation)'
      : recentContext
          .map((m) => `[${m.role}]: ${m.content}`)
          .join('\n')

  return `You are a fact-extraction specialist for Eidrix's agent memory system.

Your job: read the user's most recent message and identify durable facts worth remembering across future conversations.

## What is a durable fact?

A fact likely still true in a week. Something Eidrix should remember to personalize future responses.

### DURABLE — extract these

- "I always prefer morning callbacks before 10am"
  → record_fact({content: "Prefers morning callbacks before 10am", fact_type: "preference", confidence: 0.95})
- "Alice hates invoicing on Fridays"
  → record_fact({content: "Alice prefers invoicing Monday-Thursday", fact_type: "preference", entity_type: "customer", entity_id: "<Alice's id from registry>", confidence: 0.85})
- "My business is open Tuesday through Saturday, closed Sundays and Mondays"
  → record_fact({content: "Business open Tue-Sat, closed Sun-Mon", fact_type: "rule", confidence: 0.95})
- "I promised the Johnson job by Friday"
  → record_fact({content: "Committed to finish Johnson job by Friday", fact_type: "commitment", confidence: 0.9})
- "For Bob's kitchen job, no work before 9am because of his wife's schedule"
  → record_fact({content: "Bob's kitchen job: no work before 9am (wife's schedule)", fact_type: "rule", entity_type: "customer", entity_id: "<Bob's id>", confidence: 0.9})

### EPHEMERAL — do NOT extract, call no_facts_found

- "Let me think about that for a minute"
- "I'm eating lunch now"
- "This customer is driving me nuts today"
- Questions: "What's scheduled for Tuesday?"
- Small talk: "Hey", "Good morning", "Thanks"
- Transient states: "I'm running late today"

## Rules

1. Extract ONLY from what the user explicitly said or clearly implied. Never from previous assistant responses; never from tool results.
2. Never invent facts. If the message has no durable content, call no_facts_found — NOT record_fact with low confidence.
3. Emit AT MOST 3 facts per message. If you see more, pick the 3 with highest confidence.
4. Entity linking: when the user names a specific person/job/proposal, resolve against the entity registry below. Case-insensitive match on the displayName or its first word. If NO clear match, omit entity_id entirely (don't guess).
5. Confidence calibration: 0.95+ for explicit "always/never". 0.8 default. 0.6-0.7 for inferred or ambiguous. If you'd emit <0.6, prefer no_facts_found instead.
6. Content style: third-person-imperative. "Prefers X", "Always does Y", "Committed to Z". Keep under 200 chars.

## Entity registry (for linking)

${registryText}

## Recent conversation context (for disambiguation only — do NOT extract from these)

${contextText}

## Instructions

Call record_fact one or more times, OR call no_facts_found exactly once. Do not emit any text response — only tool calls.`
}

// ─── Types ───────────────────────────────────────────────────────────

export interface ExtractFactsInput {
  jwt: string
  userMessageId: string
}

export interface ExtractFactsResult {
  status: 'facts_extracted' | 'no_facts' | 'skipped' | 'error'
  factsCreated: number
  reason?: string
}

// ─── Core ────────────────────────────────────────────────────────────

export async function extractFactsForMessage(
  args: ExtractFactsInput,
): Promise<ExtractFactsResult> {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnon = process.env.SUPABASE_ANON_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!supabaseUrl || !supabaseAnon) {
    return { status: 'error', factsCreated: 0, reason: 'Missing Supabase env vars' }
  }
  if (!anthropicKey) {
    return { status: 'error', factsCreated: 0, reason: 'Missing ANTHROPIC_API_KEY' }
  }

  // Authed client: RLS applies, so loaded data is scoped to the user.
  const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${args.jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ─── Load target message + recent context ──────────────────────────
  const { data: targetMsg, error: targetErr } = await supabase
    .from('messages')
    .select('*')
    .eq('id', args.userMessageId)
    .eq('is_active', true)
    .maybeSingle()

  if (targetErr) {
    console.error('[extractFacts] target load failed:', targetErr)
    return { status: 'error', factsCreated: 0, reason: targetErr.message }
  }
  if (!targetMsg) {
    return { status: 'skipped', factsCreated: 0, reason: 'target message not found or inactive' }
  }
  if (targetMsg.role !== 'user') {
    return { status: 'skipped', factsCreated: 0, reason: 'target is not a user message' }
  }
  if (targetMsg.content.trim().length < MIN_MESSAGE_LENGTH) {
    return { status: 'skipped', factsCreated: 0, reason: 'message too short' }
  }

  // Recent context: last N messages BEFORE the target, same conversation.
  // Non-fatal if it fails — extraction still runs with an empty context
  // but we log so a silent RLS regression doesn't hide the problem.
  const { data: contextRows, error: contextErr } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', targetMsg.conversation_id)
    .eq('is_active', true)
    .lt('created_at', targetMsg.created_at)
    .order('created_at', { ascending: false })
    .limit(RECENT_CONTEXT_COUNT)

  if (contextErr) {
    console.warn('[extractFacts] context fetch failed:', contextErr)
  }

  // Reverse so the context reads oldest-first (natural flow for Claude).
  const recentContext = (contextRows ?? [])
    .map((m) => ({ role: m.role, content: m.content }))
    .reverse()

  // ─── Compile registry ──────────────────────────────────────────────
  const registry = await compileEntityRegistry(supabase)

  // ─── Call Haiku with tool-use ──────────────────────────────────────
  // AbortController cancels the in-flight fetch when the timeout fires
  // so we don't leak an orphan call burning tokens + keeping the
  // function warm. Promise.race alone wouldn't cancel — it just stops
  // awaiting, but the underlying HTTP request would keep running.
  const anthropic = new Anthropic({ apiKey: anthropicKey })
  const systemPrompt = buildSystemPrompt(registry, recentContext)
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => {
    abortController.abort()
  }, EXTRACTION_TIMEOUT_MS)

  let response: Anthropic.Message
  try {
    response = await anthropic.messages.create(
      {
        model: EXTRACTION_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: targetMsg.content }],
        tools: [recordFactTool, noFactsFoundTool],
        tool_choice: { type: 'any' },
      },
      { signal: abortController.signal },
    )
  } catch (err) {
    const aborted = abortController.signal.aborted
    const message = aborted
      ? `extraction timeout exceeded (${EXTRACTION_TIMEOUT_MS}ms)`
      : err instanceof Error
        ? err.message
        : 'Anthropic call failed'
    console.error('[extractFacts] anthropic call failed:', err)
    return { status: 'error', factsCreated: 0, reason: message }
  } finally {
    clearTimeout(timeoutId)
  }

  // ─── Parse tool calls ──────────────────────────────────────────────
  const toolUseBlocks = response.content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  )

  if (toolUseBlocks.length === 0) {
    console.warn(
      '[extractFacts] Claude returned no tool_use blocks despite tool_choice:any',
    )
    return { status: 'error', factsCreated: 0, reason: 'no tool calls emitted' }
  }

  // Partition: process record_fact blocks if any exist. Only fall
  // back to no_facts_found when ZERO record_fact blocks are present.
  // This handles the rare case where Claude calls both tools in the
  // same turn — we prioritize the positive signal.
  const recordFactBlocks = toolUseBlocks.filter((b) => b.name === 'record_fact')
  if (recordFactBlocks.length === 0) {
    const noFactsBlock = toolUseBlocks.find((b) => b.name === 'no_facts_found')
    const reason =
      (noFactsBlock?.input as { reason?: string } | undefined)?.reason ??
      'unspecified'
    return { status: 'no_facts', factsCreated: 0, reason }
  }

  // ─── Parse raw facts from tool-use blocks ─────────────────────────
  interface RawFact {
    content: string
    fact_type: string
    entity_type?: string
    entity_id?: string
    confidence: number
  }

  const rawFacts: RawFact[] = []
  for (const block of recordFactBlocks) {
    const input = block.input as Record<string, unknown>
    const content = typeof input.content === 'string' ? input.content.trim() : ''
    const factType = typeof input.fact_type === 'string' ? input.fact_type : ''
    const rawConfidence = typeof input.confidence === 'number' ? input.confidence : NaN
    if (!content || !factType || !Number.isFinite(rawConfidence)) continue
    rawFacts.push({
      content,
      fact_type: factType,
      entity_type:
        typeof input.entity_type === 'string' ? input.entity_type : undefined,
      entity_id:
        typeof input.entity_id === 'string' ? input.entity_id : undefined,
      confidence: Math.min(1, Math.max(0, rawConfidence)),
    })
  }

  // ─── Validate guardrails (confidence, length, type, entity link) ──
  const validated = rawFacts
    .filter((f) => f.confidence >= MIN_CONFIDENCE)
    .filter((f) => f.content.length > 0 && f.content.length <= 500)
    .filter((f) =>
      ['preference', 'rule', 'context', 'commitment', 'observation'].includes(
        f.fact_type,
      ),
    )
    .map((f) => {
      // If the entity pair is invalid, null them out rather than reject
      // the fact — we still want the general-scoped version.
      const matched = validateEntityInRegistry(
        registry,
        f.entity_type,
        f.entity_id,
      )
      return {
        ...f,
        entity_type: matched?.type,
        entity_id: matched?.id,
      }
    })

  if (validated.length === 0) {
    return { status: 'no_facts', factsCreated: 0, reason: 'all facts filtered out by guardrails' }
  }

  // ─── Dedupe BEFORE cap ─────────────────────────────────────────────
  // Order matters: if we capped to 3 first and all 3 happened to be
  // duplicates of existing facts, we'd return zero when a 4th unique
  // fact existed. Dedupe first, then cap by confidence.
  const { data: existing } = await supabase
    .from('memory_facts')
    .select('content')
    .eq('user_id', targetMsg.user_id)
    .eq('is_active', true)

  const existingContents = new Set(
    (existing ?? []).map((r) => r.content.toLowerCase()),
  )
  const deduped = validated.filter(
    (f) => !existingContents.has(f.content.toLowerCase()),
  )

  if (deduped.length === 0) {
    return { status: 'no_facts', factsCreated: 0, reason: 'all facts duplicate existing' }
  }

  // Sort by confidence, take top N.
  const toInsert = deduped
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_FACTS_PER_MESSAGE)

  // ─── Insert ────────────────────────────────────────────────────────
  const rows = toInsert.map((f) => ({
    organization_id: targetMsg.organization_id,
    user_id: targetMsg.user_id,
    content: f.content,
    fact_type: f.fact_type as
      | 'preference'
      | 'rule'
      | 'context'
      | 'commitment'
      | 'observation',
    entity_type: f.entity_type ?? null,
    entity_id: f.entity_id ?? null,
    source_message_id: args.userMessageId,
    confidence: f.confidence,
  }))

  // Return the inserted rows so we can embed them immediately.
  const { data: inserted, error: insertErr } = await supabase
    .from('memory_facts')
    .insert(rows)
    .select('id, content')

  if (insertErr || !inserted) {
    console.error('[extractFacts] insert failed:', insertErr)
    return {
      status: 'error',
      factsCreated: 0,
      reason: insertErr?.message ?? 'insert returned no rows',
    }
  }

  // ─── Generate embeddings for each new fact ─────────────────────────
  // Session 2 addition. Runs in parallel per fact; failures are logged
  // but don't abort — the fact still exists in memory_facts and can
  // be re-embedded later (e.g., by an edit + save, or a future
  // backfill job).
  //
  // "content is source of truth, embeddings are cache" — if this
  // step fails, we still want the fact persisted.
  const embedResults = await Promise.all(
    inserted.map(async (row) => {
      const embed = await generateEmbedding(row.content, 'document')
      if (!isEmbedSuccess(embed)) {
        console.warn(
          `[extractFacts] embedding failed for fact ${row.id}:`,
          embed.error,
        )
        return { fact_id: row.id, ok: false }
      }
      // Upsert (not insert) for symmetry with reembed-fact-background:
      // if an edit fires a reembed while extraction is still running
      // for the same fact, the winner is whichever call lands last.
      // Both produce correct vectors for the current content — upsert
      // makes either order idempotent without a unique-violation race.
      const { error: embedInsertErr } = await supabase
        .from('memory_fact_embeddings')
        .upsert(
          {
            fact_id: row.id,
            embedding: embeddingToVectorParam(embed.embedding),
            model_version: embed.model,
          },
          { onConflict: 'fact_id' },
        )
      if (embedInsertErr) {
        console.warn(
          `[extractFacts] embedding insert failed for fact ${row.id}:`,
          embedInsertErr.message,
        )
        return { fact_id: row.id, ok: false }
      }
      return { fact_id: row.id, ok: true }
    }),
  )

  const embeddedCount = embedResults.filter((r) => r.ok).length
  return {
    status: 'facts_extracted',
    factsCreated: rows.length,
    reason: `embedded ${embeddedCount}/${rows.length}`,
  }
}
