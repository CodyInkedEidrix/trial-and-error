// ──────────────────────────────────────────────────────────────────────
// MemoryFact — typed durable facts extracted from user messages.
//
// Five fact types chosen to match how operators actually think about
// what they remember:
//
//   preference  — "likes / prefers X" over Y. Subjective, changeable.
//   rule        — firm constraints ("never", "always", business hours).
//   context     — background facts about the user's situation.
//   commitment  — time-bound promises ("by Friday", "before the 15th").
//   observation — soft/inferred patterns the agent picked up. Low-
//                 confidence by default; useful for coloring suggestions
//                 without being treated as rules.
// ──────────────────────────────────────────────────────────────────────

export type FactType =
  | 'preference'
  | 'rule'
  | 'context'
  | 'commitment'
  | 'observation'

/** The entity types a fact can link to. Nullable when the fact is
 *  general (applies to the user's whole workspace). */
export type FactEntityType = 'customer' | 'job' | 'proposal'

export interface MemoryFact {
  id: string
  organizationId: string
  /** Whose fact is this. One user's facts are never visible to
   *  another user — RLS enforces this. */
  userId: string

  /** The fact as a concise statement. Third-person-imperative style,
   *  produced by the extraction prompt. Max 500 chars (DB-enforced). */
  content: string

  factType: FactType

  /** Linked entity, if the fact is specifically about a customer /
   *  job / proposal. Null for general facts ("business open Tue-Sat"). */
  entityType?: FactEntityType
  entityId?: string

  /** Audit trail: which user message produced this fact. Nullable so
   *  the fact survives if the source message is ever hard-deleted. */
  sourceMessageId?: string

  /** Extractor's confidence. App-layer rejects <0.6 before insert.
   *  Used in Session 2's retrieval to weight ranking. */
  confidence: number

  /** Soft-delete flag. False = excluded from retrieval + Memory UI. */
  isActive: boolean

  createdAt: string
  updatedAt: string
}

/** Shape the extraction function or Memory UI submits when creating
 *  a fact. Store fills in id, timestamps, org, user. */
export type MemoryFactInput = Omit<
  MemoryFact,
  'id' | 'organizationId' | 'userId' | 'isActive' | 'createdAt' | 'updatedAt'
>
