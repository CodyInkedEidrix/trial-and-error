// ──────────────────────────────────────────────────────────────────────
// chatStore — session chat state + real streaming orchestration (AC-01).
//
// Post-AC-01 shape. Owns three responsibilities:
//
//   1. Conversation data (messages array)
//   2. Stream lifecycle (fetch → read → append → finalize / error)
//   3. Eye state/reaction — so the Eye reacts to real AI events
//
// All three live here on purpose. Splitting them into parallel stores
// creates subtle desync bugs (conversation state changes but Eye misses
// the transition, etc.). One authoritative source; ChatEyeAnchor and
// MessageList subscribe to slices they care about.
//
// ─── AC-04 porting note ───────────────────────────────────────────────
// When persistence lands, wrap `create` in `persist()` and persist only
// `messages` — `isStreaming`, `currentEyeState`, and `currentReaction`
// are transient and should reset to idle on reload.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import type {
  EyeState,
  ReactionName,
} from '../components/brand/eye-config'
import type { Message, MessageStatus } from '../types/message'
import type { AgentModel } from '../types/agentSettings'
import { supabase } from './supabase'
import { useDebugStore } from './debugStore'

// ─── Utilities ───────────────────────────────────────────────────────

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

// ─── Store shape ─────────────────────────────────────────────────────

interface ChatStore {
  messages: Message[]

  /** True from Send to stream-end (or error). Guards double-sends + disables input. */
  isStreaming: boolean

  /** Current Eye state. Drives ChatEyeAnchor's `state` prop. */
  currentEyeState: EyeState

  /** Current one-shot Eye reaction. Auto-cleared via `clearReaction`. */
  currentReaction: ReactionName | null

  /** Entry point — sends user message, streams the assistant reply. */
  sendUserMessage: (content: string) => Promise<void>

  /** Called by the Eye when a reaction animation completes. */
  clearReaction: () => void

  /** Dev / session-reset helper. */
  clearConversation: () => void
}

// ─── Store ────────────────────────────────────────────────────────────

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentEyeState: 'idle',
  currentReaction: null,

  sendUserMessage: async (content) => {
    const trimmed = content.trim()
    if (!trimmed) return
    if (get().isStreaming) return // one stream at a time

    // ─── Set up the two new messages ──────────────────────────────
    const userMessage: Message = {
      id: uuid(),
      role: 'user',
      content: trimmed,
      createdAt: nowIso(),
    }

    const assistantId = uuid()
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: nowIso(),
      status: 'streaming',
    }

    // Build the API payload BEFORE mutating state — excludes the empty
    // streaming placeholder (no value in sending "" to the model) and
    // any prior errored assistant messages (they'd confuse it).
    const messagesForApi = [...get().messages, userMessage]
      .filter((m) => m.status !== 'error')
      .map(({ role, content }) => ({ role, content }))

    set((state) => ({
      messages: [...state.messages, userMessage, assistantMessage],
      isStreaming: true,
      currentEyeState: 'thinking',
      currentReaction: 'acknowledge',
    }))

    // ─── RAF-batched text flusher ─────────────────────────────────
    // Tokens can arrive at 30–80/sec. Flushing each one triggers a
    // React render. At 60fps we cap renders at ~60/sec regardless of
    // token rate — smooth without throttling the stream itself.
    let pendingText = ''
    let rafId: number | null = null
    // Tracked across the whole submit() so both success and error
    // paths can push a complete DebugEntry. Declared here (not inside
    // try) so the catch block has access to them.
    let accumulatedResponse = ''
    let usageEvent: StreamEvent | null = null

    // Append a text chunk to the in-progress assistant message. Used by
    // both the RAF flusher (streaming happy path) and the final sync
    // flush at stream-end.
    const appendChunk = (chunk: string) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantId ? { ...m, content: m.content + chunk } : m,
        ),
      }))
    }

    const flushPending = () => {
      rafId = null
      if (pendingText.length === 0) return
      const chunk = pendingText
      pendingText = ''
      appendChunk(chunk)
    }

    const scheduleFlush = () => {
      if (rafId != null) return
      rafId = requestAnimationFrame(flushPending)
    }

    // ─── Fire the fetch ───────────────────────────────────────────
    // AC-02: forward the user's Supabase JWT so the function can
    // create an RLS-scoped client and read agent_settings + business
    // data on the user's behalf. Without this, the function returns
    // 401 Unauthenticated.
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token ?? ''

    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: messagesForApi }),
      })

      // Pre-stream error — HTTP status is meaningful here. 429 drives
      // auto-retry in Phase E; for now we just surface the state.
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new StreamError(
          response.status,
          errBody.error ?? `HTTP ${response.status}`,
        )
      }

      if (!response.body) {
        throw new StreamError(500, 'Empty response body')
      }

      // ─── Read the SSE stream ────────────────────────────────────
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let firstTokenSeen = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by blank lines (\n\n).
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? '' // last element may be a partial frame

        for (const frame of frames) {
          const line = frame.trim()
          if (!line.startsWith('data: ')) continue
          const dataStr = line.slice(6)

          let event: StreamEvent
          try {
            event = JSON.parse(dataStr)
          } catch {
            continue // malformed frame — skip, stream continues
          }

          if (
            event.type === 'content_block_delta' &&
            event.delta?.type === 'text_delta' &&
            typeof event.delta.text === 'string'
          ) {
            if (!firstTokenSeen) {
              firstTokenSeen = true
              // First token — shift Eye from thinking to speaking.
              // Acknowledge reaction may still be mid-animation; the
              // Eye handles the transition smoothly.
              set({ currentEyeState: 'speaking' })
            }
            pendingText += event.delta.text
            accumulatedResponse += event.delta.text
            scheduleFlush()
          } else if (event.type === 'eidrix_usage') {
            // Final summary event from the function. Captured for the
            // Debug tab; doesn't affect the streamed message UI.
            usageEvent = event
          } else if (event.type === 'error') {
            throw new StreamError(
              event.error?.status ?? 500,
              event.error?.message ?? 'Stream error',
            )
          }
          // Other event types (message_start, content_block_start,
          // content_block_stop, message_delta, message_stop) are
          // ignored here — reader.read() done=true handles completion.
        }
      }

      // ─── Clean completion ───────────────────────────────────────
      // Flush any residual buffered tokens synchronously (otherwise
      // the final text could arrive AFTER we mark the message complete).
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      if (pendingText.length > 0) {
        const chunk = pendingText
        pendingText = ''
        appendChunk(chunk)
      }

      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                // Empty response edge case — the stream ended but no
                // content_block_delta ever fired. Show a minimal
                // explanation rather than a ghost-empty bubble.
                content:
                  m.content.length > 0
                    ? m.content
                    : "I didn't have anything to say there. Try rephrasing?",
                status: 'complete' as MessageStatus,
              }
            : m,
        ),
        isStreaming: false,
        currentEyeState: 'idle',
        currentReaction: 'completion',
      }))

      // Push debug entry for the Agent Debug tab. usageEvent should
      // always be present after a successful stream (the function
      // always emits it before close), but guard anyway.
      if (usageEvent) {
        useDebugStore.getState().pushEntry(
          buildDebugEntry(trimmed, messagesForApi, accumulatedResponse, usageEvent, null),
        )
      }
    } catch (err) {
      // Cancel any pending RAF flush — no more content coming.
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }

      // Preserve whatever partial content streamed before failure;
      // flip the message to 'error' status for UI to key off.
      const fallbackMessage =
        err instanceof StreamError
          ? err.userMessage()
          : 'Connection lost. Try again.'

      set((state) => ({
        messages: state.messages.map((m) => {
          if (m.id !== assistantId) return m
          const preservedPartial = m.content.length > 0
          return {
            ...m,
            content: preservedPartial ? m.content : fallbackMessage,
            status: 'error' as MessageStatus,
          }
        }),
        isStreaming: false,
        currentEyeState: 'idle',
        currentReaction: 'uncertainty',
      }))

      // Push a debug entry for the error too — the Debug tab is most
      // useful when something went wrong, so don't drop these.
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error'
      useDebugStore.getState().pushEntry(
        buildDebugEntry(trimmed, messagesForApi, accumulatedResponse, usageEvent, errorMessage),
      )
    }
  },

  clearReaction: () => set({ currentReaction: null }),

  clearConversation: () =>
    set({
      messages: [],
      isStreaming: false,
      currentEyeState: 'idle',
      currentReaction: null,
    }),
}))

// ─── Support types ───────────────────────────────────────────────────

/**
 * Minimal typing over the forwarded Anthropic SSE events + Eidrix's
 * own `eidrix_usage` final event (added by chat.ts in AC-02). Unknown
 * event types still parse — the reader simply ignores them.
 */
interface StreamEvent {
  type: string
  delta?: {
    type?: string
    text?: string
  }
  error?: {
    status?: number
    message?: string
  }
  // ─── eidrix_usage fields (only present when type === 'eidrix_usage') ──
  model?: AgentModel
  contextMode?: 'off' | 'subset' | 'full'
  inputTokens?: number
  outputTokens?: number
  cacheReadInputTokens?: number
  cacheCreationInputTokens?: number
  systemPromptBytes?: number
  customerCount?: number
  jobCount?: number
  totalCustomers?: number
  totalJobs?: number
  contextWarning?: string | null
  responseTimeMs?: number
  systemPromptSent?: string
}

/**
 * Build a DebugEntry payload from the captured per-request data. Used
 * by both the success path (errorMessage = null) and the error path
 * (errorMessage = the failure reason). Centralizes the `?? defaults`
 * fallbacks so they stay consistent and easy to update.
 */
function buildDebugEntry(
  userMessage: string,
  messagesSent: { role: 'user' | 'assistant'; content: string }[],
  responseText: string,
  usageEvent: StreamEvent | null,
  errorMessage: string | null,
) {
  return {
    userMessagePreview: userMessage,
    systemPromptSent: usageEvent?.systemPromptSent ?? '',
    messagesSent,
    responseText,
    model: usageEvent?.model ?? ('claude-sonnet-4-6' as AgentModel),
    contextMode: usageEvent?.contextMode ?? 'subset',
    inputTokens: usageEvent?.inputTokens ?? 0,
    outputTokens: usageEvent?.outputTokens ?? 0,
    cacheReadInputTokens: usageEvent?.cacheReadInputTokens ?? 0,
    cacheCreationInputTokens: usageEvent?.cacheCreationInputTokens ?? 0,
    systemPromptBytes: usageEvent?.systemPromptBytes ?? 0,
    customerCount: usageEvent?.customerCount ?? 0,
    jobCount: usageEvent?.jobCount ?? 0,
    totalCustomers: usageEvent?.totalCustomers ?? 0,
    totalJobs: usageEvent?.totalJobs ?? 0,
    contextWarning: usageEvent?.contextWarning ?? null,
    responseTimeMs: usageEvent?.responseTimeMs ?? 0,
    errorMessage,
  }
}

/**
 * Typed error that carries an HTTP-like status so the (eventual) retry
 * UI can distinguish 429 from other failures. Phase E wires the UI.
 */
class StreamError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'StreamError'
  }

  userMessage(): string {
    if (this.status === 429) return 'Too many requests. Try again in a moment.'
    if (this.status >= 500) return "Something's off with the AI connection. Try again."
    if (this.status === 400) return "I couldn't understand that request. Try again."
    return this.message || 'Connection lost. Try again.'
  }
}
