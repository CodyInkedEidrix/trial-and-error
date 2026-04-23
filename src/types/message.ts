// ──────────────────────────────────────────────────────────────────────
// Message — shape of a single chat message.
//
// AC-01-ready by design. `role` matches the Anthropic Messages API
// exactly (no transform needed when AC-01 sends history to the model).
// `status` is the flag that gets flipped during streaming — AC-01 will
// set 'streaming' while a response is being chunked in, then 'complete'.
//
// ─── Porting to real Eidrix ───────────────────────────────────────────
// When AC-04 adds persistent memory, this shape serializes cleanly
// (all primitives, ISO strings). A `conversationId: string` field will
// be added at that point to support multi-conversation storage.
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

export interface Message {
  id: string
  role: MessageRole
  content: string
  /** ISO 8601 timestamp. String not Date for JSON serialization friendliness. */
  createdAt: string
  /** Omitted = 'complete'. Set explicitly for streaming / error states. */
  status?: MessageStatus
  /** Present when the server sent an `eidrix_pending_action` event for
   *  this assistant turn. Rendered inline by the chat UI as a
   *  Confirm / Cancel card. */
  pendingAction?: PendingAction
  /** Tool calls that failed during this assistant turn. Rendered as a
   *  small warning badge on the message — gives the user visibility
   *  into tool-layer errors that Claude's text might paraphrase over. */
  toolErrors?: ToolErrorSummary[]
}
