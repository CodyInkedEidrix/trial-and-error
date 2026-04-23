// ──────────────────────────────────────────────────────────────────────
// Conversation — chat thread grouping.
//
// For AC-04 Session 1, one conversation per user-org, auto-upserted on
// first chat load. Multi-conversation UI (create, name, switch) is
// Session 2+ work — the schema supports it today, the UI layer doesn't
// expose it yet.
//
// DB shape is snake_case; we map at the store boundary per repo
// convention (same as customerStore/jobStore/proposalStore).
// ──────────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string
  organizationId: string
  userId: string
  /** Nullable today — set by future multi-conversation UI. */
  title: string | null
  /** Updated whenever a message is inserted into this conversation.
   *  Used to order conversation lists by recency in the future. Null
   *  until the first message. */
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
}
