// ──────────────────────────────────────────────────────────────────────
// Job — the second tenant-scoped business entity, relational to Customer.
//
// Mirrors the Customer type's conventions (camelCase TS, snake_case DB,
// mapped at the store boundary). Foreign key to Customer enforces that
// every job belongs to exactly one customer; cascade delete via the
// migration cleans up jobs when a customer is removed.
//
// AC-02 introduces this for relational context — the AI agent now has
// two related entities to reason across, the foundation real Eidrix
// extends into Job → Invoice → LineItem and beyond.
// ──────────────────────────────────────────────────────────────────────

/**
 * Job status — five-stage lifecycle for service-based work.
 *
 * - `draft`        — proposal/quote stage, not yet committed
 * - `scheduled`    — confirmed, on the calendar
 * - `in_progress`  — work has started
 * - `completed`    — done (and presumably invoiced)
 * - `cancelled`    — abandoned
 *
 * The Smart Subset context mode treats the first three as "open" and
 * uses that as a signal for which jobs to surface to the agent.
 */
export type JobStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface Job {
  /** UUID. Stable across renames and updates. */
  id: string

  /** FK to Customer.id. Required — orphan jobs aren't allowed. */
  customerId: string

  /** Short, human-readable summary. Required. */
  title: string

  status: JobStatus

  /** ISO 8601 date (no time component) — e.g., "2026-04-29". */
  scheduledDate?: string

  /** Dollar amount. Numeric in DB, plain number in TS. */
  amount?: number

  /** Freeform — scope, materials, access notes. */
  notes?: string

  /** ISO timestamps — managed by the store, not user-editable. */
  createdAt: string
  updatedAt: string
}

/**
 * Shape the form submits — everything the store doesn't manage itself.
 * The store fills in id, organization_id, and timestamps.
 */
export type JobInput = Omit<Job, 'id' | 'createdAt' | 'updatedAt'>
