// ──────────────────────────────────────────────────────────────────────
// chatStore — session chat state (Chapter 11 scaffolding).
//
// Session-only for now. AC-04 extends this with persistence middleware
// (same pattern as customerStore's `persist()` wrap) and a
// `conversations` field for multi-conversation history. AC-01 swaps
// the canned-response path inside `sendUserMessage` for real streaming
// — message shape already supports it via `status: 'streaming'`.
//
// One source of truth for "is Eidrix working": `isThinking`. The Eye
// subscribes to this directly to drive state + reactions.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import type { Message } from '../types/message'
import { pickCannedResponse } from './cannedResponses'

// Thinking-duration randomization so responses feel less robotic.
// 800ms minimum gives the typing indicator enough time to register;
// 1800ms maximum keeps the flow snappy. Real AC-01 streams will be
// variable anyway — this just approximates that feel.
const MIN_THINKING_MS = 800
const MAX_THINKING_MS = 1800

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

interface ChatStore {
  messages: Message[]
  /**
   * True from the moment the user sends a message until the canned
   * response lands. Drives UI disables and the Eye's state/reaction.
   */
  isThinking: boolean

  /**
   * Append a user message + trigger the thinking flow. Guards against
   * empty content and double-sends during thinking.
   */
  sendUserMessage: (content: string) => void

  /** Dev / session-reset helper. Drops all messages and clears thinking. */
  clearConversation: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isThinking: false,

  sendUserMessage: (content) => {
    const trimmed = content.trim()
    if (!trimmed) return
    if (get().isThinking) return // don't queue during thinking

    const userMessage: Message = {
      id: uuid(),
      role: 'user',
      content: trimmed,
      createdAt: nowIso(),
    }

    set((state) => ({
      messages: [...state.messages, userMessage],
      isThinking: true,
    }))

    // Schedule the canned response. Randomized duration within the
    // band — each response feels slightly different instead of robotic.
    const thinkDuration =
      MIN_THINKING_MS + Math.random() * (MAX_THINKING_MS - MIN_THINKING_MS)

    setTimeout(() => {
      const assistantMessage: Message = {
        id: uuid(),
        role: 'assistant',
        content: pickCannedResponse(),
        createdAt: nowIso(),
      }
      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isThinking: false,
      }))
    }, thinkDuration)
  },

  clearConversation: () => set({ messages: [], isThinking: false }),
}))
