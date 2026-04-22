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

export interface Message {
  id: string
  role: MessageRole
  content: string
  /** ISO 8601 timestamp. String not Date for JSON serialization friendliness. */
  createdAt: string
  /** Omitted = 'complete'. Set explicitly for streaming / error states. */
  status?: MessageStatus
}
