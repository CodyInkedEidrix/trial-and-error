// ──────────────────────────────────────────────────────────────────────
// Proposal — the third tenant-scoped business entity, third rep of the
// same template (Customer → Job → Proposal).
//
// A proposal always belongs to a customer (required FK). It MAY also be
// tied to a job (nullable FK) — proposals often predate the job that
// gets created once the customer approves.
//
// Amount is a required numeric field (defaults to 0) rather than
// optional — a proposal without an amount isn't really a proposal.
// Status has four values (draft/sent/approved/rejected) tracking the
// lifecycle from "drafting the quote" through "customer responded."
// ──────────────────────────────────────────────────────────────────────

/**
 * Proposal status — four-stage lifecycle.
 *
 * - `draft`     — being written, not yet shared with customer
 * - `sent`      — delivered to customer, awaiting response
 * - `approved`  — customer accepted; typically converts into a job
 * - `rejected`  — customer declined
 */
export type ProposalStatus = 'draft' | 'sent' | 'approved' | 'rejected'

export interface Proposal {
  /** UUID. Stable across edits. */
  id: string

  /** FK to Customer.id. Required — every proposal has a customer. */
  customerId: string

  /** FK to Job.id. Optional — proposals often predate jobs. */
  jobId?: string

  /** Short, human-readable summary. Required. */
  title: string

  /** Dollar amount. Required in DB (defaults to 0); required in TS too. */
  amount: number

  status: ProposalStatus

  /** Freeform — scope, caveats, terms, attachments-to-follow. */
  notes?: string

  /** ISO timestamps — managed by the store, not user-editable. */
  createdAt: string
  updatedAt: string
}

/**
 * Shape the form submits — everything the store doesn't manage itself.
 * The store fills in id, organization_id, and timestamps.
 */
export type ProposalInput = Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'>
