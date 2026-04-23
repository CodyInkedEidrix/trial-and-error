// ──────────────────────────────────────────────────────────────────────
// debugStore — observability for AI requests (AC-02 Phase D + E).
//
// In-memory only — request history clears on page refresh. AC-04 may
// add persistence if it's worth it; for now this is a development +
// debugging tool, not a long-term log.
//
// Each chat request pushes one entry capturing exactly what Claude
// saw and what came back. The Agent Debug tab renders this with the
// system prompt + messages + response visible — answering "why did
// Eidrix say X?" by showing the input that produced X.
//
// Cumulative session cost (Phase E) is computed live from each
// entry's token counts × the per-model rate from MODEL_META. Reset
// button clears history AND cost together.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import { MODEL_META, type AgentModel } from '../types/agentSettings'

const MAX_ENTRIES = 10

interface SentMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface DebugEntry {
  id: string
  timestamp: string

  /** The last user message in the conversation (collapsed-view preview). */
  userMessagePreview: string

  /** The full system prompt the function sent to Anthropic — base
   *  prompt + injected business-data context block. */
  systemPromptSent: string

  /** The full messages array sent to Anthropic. */
  messagesSent: SentMessage[]

  /** Final assistant response text (what the user saw). */
  responseText: string

  /** Anthropic model ID used for this request. */
  model: AgentModel

  /** Context mode in effect. */
  contextMode: 'off' | 'subset' | 'full'

  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number

  /** Length of the final system prompt (bytes ~= chars in ASCII). */
  systemPromptBytes: number

  /** How many customers/jobs were included in the injected context. */
  customerCount: number
  jobCount: number

  /** Org-wide totals (for context — "12 of 47 shown"). */
  totalCustomers: number
  totalJobs: number

  /** Non-fatal warning surfaced by the function (e.g., "context fetch
   *  failed — sent prompt without business data"). */
  contextWarning: string | null

  responseTimeMs: number

  /** USD cost of THIS request, computed from token counts × model rate. */
  costUsd: number

  /** Set if the request errored. Body of the response is empty in this case. */
  errorMessage: string | null
}

interface DebugStore {
  entries: DebugEntry[]
  cumulativeCostUsd: number

  /** Push a completed request entry to the front of the list. Caps
   *  the list at MAX_ENTRIES so memory stays bounded. */
  pushEntry: (entry: Omit<DebugEntry, 'id' | 'timestamp' | 'costUsd'>) => void

  /** Wipe all entries and reset cumulative cost. */
  clear: () => void
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `dbg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Compute USD cost from input/output token counts using the per-
 *  model rate. Cache-related token classes are billed differently
 *  (cache writes cost more, cache reads cost less). For the simple
 *  display in the Debug tab, we approximate: regular input rate for
 *  input + cache_creation tokens, half-rate for cache_read tokens. */
function computeCostUsd(
  model: AgentModel,
  inputTokens: number,
  outputTokens: number,
  cacheReadInputTokens: number,
  cacheCreationInputTokens: number,
): number {
  const meta = MODEL_META[model]
  if (!meta) return 0
  const standardInput = inputTokens + cacheCreationInputTokens
  const cachedInput = cacheReadInputTokens
  const inputCost =
    (standardInput * meta.inputRate) / 1_000_000 +
    (cachedInput * meta.inputRate * 0.1) / 1_000_000 // cache reads ~10% rate
  const outputCost = (outputTokens * meta.outputRate) / 1_000_000
  return inputCost + outputCost
}

export const useDebugStore = create<DebugStore>((set) => ({
  entries: [],
  cumulativeCostUsd: 0,

  pushEntry: (raw) => {
    const cost = computeCostUsd(
      raw.model,
      raw.inputTokens,
      raw.outputTokens,
      raw.cacheReadInputTokens,
      raw.cacheCreationInputTokens,
    )
    const entry: DebugEntry = {
      ...raw,
      id: uuid(),
      timestamp: new Date().toISOString(),
      costUsd: cost,
    }
    set((state) => ({
      entries: [entry, ...state.entries].slice(0, MAX_ENTRIES),
      cumulativeCostUsd: state.cumulativeCostUsd + cost,
    }))
  },

  clear: () =>
    set({
      entries: [],
      cumulativeCostUsd: 0,
    }),
}))
