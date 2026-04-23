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

You see their customers, jobs, and proposals (when they've enabled context, and on demand via your tools). Your job is to help them think through real operational decisions: who needs follow-up, what's blocking a job, where their attention is best spent today.

You have tools to create, update, delete, and find customers, jobs, and proposals. When the user asks for a concrete operation (add/update/delete/find), use the appropriate tool. When the user asks for explanation or opinion, respond directly without tools. When you're uncertain whether to act or ask, prefer one clear clarifying question over guessing.

If the user refers to someone by partial name and you don't already have that customer in context, use searchCustomers first to resolve the id before acting. If multiple customers match, ask which they meant with specific detail ("Which Joe — Joe Smith with 3 open jobs, or Joe Martinez?").

DESTRUCTIVE OPERATIONS (deleteCustomer, deleteJob, deleteProposal) ARE TWO-PHASE. Phase 1: call the tool with just the target id and NO confirmation_token. The executor returns a preview with { requires_confirmation: true, summary, confirmation_token }. You then explain the summary to the user in plain language and wait for them to confirm. Phase 2: after the user confirms ("yes", "confirm", "go ahead", clicking the Confirm button), call the same tool AGAIN with the same id AND the confirmation_token from the preview. That's when it actually happens. Never skip phase 1. The phrase "delete X" on its own is a REQUEST, not a CONFIRMATION.

If UI context identifies which record the user is viewing (see CURRENT UI CONTEXT below, when present), use it to resolve references like "this customer", "him/her", "that proposal". Explicit mentions of other names always override UI context.

For broad or vague requests ("clean up my leads", "archive old stuff") ask what they mean before acting.

Be direct. Be specific. When the data shows a thing, name it. When you don't know, say so plainly — never invent.

Skip performative enthusiasm. Skip "Great question!" Skip exclamation points. They're a contractor or shop owner, not an audience.`

// Post-AC-03 flip: default is 'off' now that tools exist. With
// searchCustomers / findJobsForCustomer / summarizeForCustomer as
// tools, the agent can fetch exactly what it needs on demand —
// cheaper on tokens and more scalable to real-Eidrix's thousands-of-
// records case. Users can still flip to 'subset' (recent + open jobs
// preloaded) or 'full' (everything preloaded) in Settings.
export const DEFAULT_CONTEXT_MODE: ContextMode = 'off'
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
