// ──────────────────────────────────────────────────────────────────────
// ActivePlan — shape of a multi-turn agentic loop's lifecycle.
//
// Populated server-side as chat.ts intercepts each emitPlanStep tool
// call during an agent loop. Mirrored to the client via three custom
// SSE events (eidrix_plan_started, eidrix_plan_step, eidrix_plan_complete).
//
// Stored in the `active_plans` Postgres table with steps as jsonb —
// the array shape here is the canonical contract for that jsonb
// column. If you evolve this shape, either evolve it additively (new
// optional fields) or backfill the existing rows.
// ──────────────────────────────────────────────────────────────────────

/** Lifecycle of a single plan step.
 *  - pending   — emitted as part of the initial plan, work hasn't started
 *  - active    — agent has started working on this step
 *  - complete  — done successfully
 *  - failed    — attempted, errored out; plan may still continue */
export type PlanStepStatus = 'pending' | 'active' | 'complete' | 'failed'

/** Lifecycle of the whole plan.
 *  - running   — chat.ts loop is active, steps mutating
 *  - complete  — loop exited naturally with end_turn
 *  - stopped   — user (or iteration-cap) halted it
 *  - failed    — unrecoverable error mid-plan */
export type PlanStatus = 'running' | 'complete' | 'stopped' | 'failed'

export interface PlanStep {
  /** Stable identifier — the agent reuses this across status updates
   *  for the same step (e.g., "pending" → "active" → "complete"). */
  id: string
  /** Human-readable title, 3-8 words, present tense. */
  title: string
  status: PlanStepStatus
  /** ISO timestamp when this step was first emitted. */
  emittedAt: string
  /** Set when status transitions to 'active'. */
  startedAt?: string
  /** Set when status transitions to 'complete' or 'failed'. */
  completedAt?: string
}

export interface ActivePlan {
  id: string
  organizationId: string
  userId: string
  conversationId: string
  /** The user message that triggered this plan. */
  triggeringMessageId: string | null
  status: PlanStatus
  steps: PlanStep[]
  /** Set by /chat-stop (user Stop button). chat.ts polls this at each
   *  iteration boundary. True means "halt at next boundary with a
   *  graceful summary." */
  requestedStop: boolean
  /** Plain-text explanation of how the plan ended. Rendered in the
   *  Session 2 scrollback plan-summary pill. */
  completionSummary: string | null
  startedAt: string
  completedAt: string | null
  updatedAt: string
}
