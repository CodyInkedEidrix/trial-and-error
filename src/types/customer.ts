// ──────────────────────────────────────────────────────────────────────
// Customer — the shape of a single record in the Records tab.
//
// Generic enough to serve any service-based business: construction,
// cleaning, landscaping, consulting, SaaS, e-commerce. Chapter 10 seeds
// a mix of service-trade examples; Chapter 13 ports this shape to a
// Supabase schema (snake_case columns, same fields).
// ──────────────────────────────────────────────────────────────────────

/**
 * Customer status — tracks where this person is in the relationship.
 *
 * - `lead`     — prospect, haven't worked together yet
 * - `active`   — currently serving / buying / working with
 * - `paused`   — on hold, seasonal, temporary (not archived)
 * - `archived` — relationship ended, retained for history
 */
export type CustomerStatus = 'lead' | 'active' | 'paused' | 'archived'

export interface Customer {
  /** UUID. Stable across renames and updates. */
  id: string

  /** The human (or the primary contact at the company). Required. */
  name: string

  /** Optional — for B2B: property mgmt, facilities, small-business owners. */
  company?: string

  status: CustomerStatus

  email?: string
  phone?: string

  /** Service address / shipping address / meeting location. Single-line for V1. */
  address?: string

  /** Freeform: gate codes, dog names, pricing quirks, access notes. */
  notes?: string

  /** Denormalized counts. 0 for V1 — real numbers land in Chapter 13+. */
  bidsCount: number
  jobsCount: number

  /** ISO timestamp of last interaction. Null for leads never contacted. */
  lastActivityAt?: string

  /** ISO timestamps — managed by the store, not user-editable. */
  createdAt: string
  updatedAt: string
}

/**
 * Shape the form submits — everything the store doesn't manage itself.
 * The store fills in id, timestamps, and the denormalized counts.
 */
export type CustomerInput = Omit<
  Customer,
  'id' | 'createdAt' | 'updatedAt' | 'bidsCount' | 'jobsCount'
>
