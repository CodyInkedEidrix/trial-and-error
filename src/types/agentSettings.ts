// ──────────────────────────────────────────────────────────────────────
// AgentSettings — per-org configuration for Eidrix's behavior.
//
// Mirrors the agent_settings table shape, with TS naming conventions.
// The chat function reads this on every request to know:
//   - what voice/instructions to use (system_prompt)
//   - what business data to inject (context_mode)
//   - which Claude model to call (model)
// ──────────────────────────────────────────────────────────────────────

export type ContextMode = 'off' | 'subset' | 'full'

/** Anthropic model IDs the agent can use. Must match the Postgres
 *  `agent_model` enum values exactly.
 *
 *  Naming convention shift (April 2026): Anthropic's Opus 4.7 and
 *  Sonnet 4.6 use the alias-style ID directly (no date suffix); Haiku
 *  4.5 keeps the older date-pinned form. Both are equally stable
 *  per Anthropic's docs. */
export type AgentModel =
  | 'claude-haiku-4-5-20251001'
  | 'claude-sonnet-4-6'
  | 'claude-opus-4-7'

export interface AgentSettings {
  organizationId: string
  systemPrompt: string
  contextMode: ContextMode
  model: AgentModel
  updatedAt: string
  updatedBy: string | null
}

/** Shape of an update — only the fields a user can change. */
export type AgentSettingsInput = Pick<
  AgentSettings,
  'systemPrompt' | 'contextMode' | 'model'
>

// ─── Defaults ────────────────────────────────────────────────────────
// Used both as the lazy-upsert seed (when an org has no row yet) and
// as the "Reset to defaults" target. Single source of truth.

export const DEFAULT_SYSTEM_PROMPT = `You are Eidrix — an operational assistant embedded in a small business owner's workspace.

You see their customers and jobs (when they've enabled context). Your job is to help them think through real operational decisions: who needs follow-up, what's blocking a job, where their attention is best spent today.

Be direct. Be specific. When the data shows a thing, name it. When you don't know, say so plainly — never invent.

Skip performative enthusiasm. Skip "Great question!" Skip exclamation points. They're a contractor or shop owner, not an audience.

When asked about their data, look at what's actually there. When asked something general, give a useful operator's answer.`

export const DEFAULT_CONTEXT_MODE: ContextMode = 'subset'
export const DEFAULT_MODEL: AgentModel = 'claude-sonnet-4-6'

// ─── Model display metadata ──────────────────────────────────────────
// Friendly names + per-million-token cost references for the UI. The
// rates are used both for the Settings selector display AND the
// cumulative cost calc in the Agent Debug tab (Phase D).

export interface ModelMeta {
  id: AgentModel
  label: string
  inputRate: number // USD per 1M input tokens
  outputRate: number // USD per 1M output tokens
}

// Pricing verified against Anthropic's models overview docs (Apr 2026).
// Update both rates and IDs together if Anthropic shifts pricing or
// releases newer model versions.
export const MODEL_META: Record<AgentModel, ModelMeta> = {
  'claude-haiku-4-5-20251001': {
    id: 'claude-haiku-4-5-20251001',
    label: 'Haiku 4.5',
    inputRate: 1,
    outputRate: 5,
  },
  'claude-sonnet-4-6': {
    id: 'claude-sonnet-4-6',
    label: 'Sonnet 4.6',
    inputRate: 3,
    outputRate: 15,
  },
  'claude-opus-4-7': {
    id: 'claude-opus-4-7',
    label: 'Opus 4.7',
    inputRate: 5,
    outputRate: 25,
  },
}

export const MODEL_ORDER: AgentModel[] = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-7',
]
