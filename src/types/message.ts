// ──────────────────────────────────────────────────────────────────────
// Message — shape of a single chat message.
//
// Post AC-04 Session 1, messages are DB-backed. Every row in the
// `messages` Postgres table maps to a Message; the store's in-memory
// array mirrors the current conversation. `role` matches the Anthropic
// Messages API exactly; `status` drives streaming-vs-complete UI
// distinctions.
//
// ─── Tool interactions ───────────────────────────────────────────────
// Tool calls and tool results live inside `metadata.toolCalls` on
// assistant messages, not as separate rows. Keeps row counts predictable
// and keeps fact-extraction targets clean (only user + assistant text
// is ever extracted from).
// ──────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant'

/**
 * UI status of the message:
 * - `complete` — fully sent / received (default)
 * - `streaming` — AC-01 uses this while a response is being built up
 *   from stream chunks; content grows over time until flipped to complete
 * - `error` — surface for future error states (network failure, etc.)
 */
export type MessageStatus = 'complete' | 'streaming' | 'error'

/** A destructive action that's been previewed by the server and is
 *  awaiting user confirmation. Attached to the assistant message that
 *  previewed it; the message renders a Confirm / Cancel card inline.
 *
 *  When resolved, `resolution` flips — the card shows a muted
 *  "Confirmed" / "Cancelled" state so the chat history remains readable
 *  as audit trail. */
export interface PendingAction {
  action: string // 'deleteCustomer' / 'deleteJob' / 'deleteProposal'
  params: Record<string, unknown>
  summary: string
  confirmationToken: string
  /** Resolved state — set when user clicks a button or the confirm
   *  round-trip otherwise completes. */
  resolution?: 'confirmed' | 'cancelled'
}

/** One tool call that failed during an assistant turn. Attached to the
 *  Message so the UI can show a "⚠ N tool errors" badge even when
 *  Claude's text response paraphrases over or omits them. */
export interface ToolErrorSummary {
  tool: string
  code?: string
  message: string
}

/** Free-form metadata attached to a persisted message. Schema is not
 *  enforced at the DB level (stored as jsonb); we keep it loose so
 *  future additions don't require migrations. The Debug tab reads
 *  selected fields; fact extraction ignores it entirely. */
export interface MessageMetadata {
  // Assistant-message fields (from the chat function's eidrix_usage event).
  model?: string
  contextMode?: 'off' | 'subset' | 'full'
  inputTokens?: number
  outputTokens?: number
  cacheReadInputTokens?: number
  cacheCreationInputTokens?: number
  systemPromptBytes?: number
  responseTimeMs?: number
  toolCalls?: Array<{
    name: string
    input: unknown
    result: unknown
    durationMs: number
    iteration: number
  }>
  iterations?: number
  hitIterationCap?: boolean
  affectedEntities?: string[]
  errorMessage?: string | null

  // ─── UX overlays (AC-04 Session 1) ─────────────────────────────────
  // Persisted in metadata (rather than separate columns) so they survive
  // messagesStore resync without a schema migration. The chat UI reads
  // top-level Message.pendingAction/toolErrors; messagesStore.dbRowToMessage
  // promotes these metadata fields up to those top-level shapes at load.
  pendingAction?: PendingAction
  toolErrors?: ToolErrorSummary[]
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  /** ISO 8601 timestamp. String not Date for JSON serialization friendliness. */
  createdAt: string
  /** Omitted = 'complete'. Set explicitly for streaming / error states. */
  status?: MessageStatus
  /** FK to the conversation this message belongs to. Optional on the
   *  client-side shape so transient in-flight messages (before persist)
   *  compile; always set on persisted messages. */
  conversationId?: string
  /** Tokens, tool calls, response time, etc. See MessageMetadata. */
  metadata?: MessageMetadata
  /** Soft-delete flag. Present on persisted messages; omitted on
   *  in-flight streaming placeholders. */
  isActive?: boolean
  /** Present when the server sent an `eidrix_pending_action` event for
   *  this assistant turn. Rendered inline by the chat UI as a
   *  Confirm / Cancel card. */
  pendingAction?: PendingAction
  /** Tool calls that failed during this assistant turn. Rendered as a
   *  small warning badge on the message — gives the user visibility
   *  into tool-layer errors that Claude's text might paraphrase over. */
  toolErrors?: ToolErrorSummary[]
}
