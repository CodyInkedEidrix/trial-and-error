// ──────────────────────────────────────────────────────────────────────
// MessageList — scrollable chat body.
//
// Renders the empty state when no messages exist, OR the list of
// messages followed by the single ChatEyeAnchor at the tail. The Eye
// is always present once a conversation starts — it's the "character"
// at the end of the chat, reflecting thinking / idle state.
//
// Auto-scrolls to bottom on new content via the Slack rule — only when
// the user is already near bottom, never hijacks a user reading history.
// ──────────────────────────────────────────────────────────────────────

import { AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import { useChatStore } from '../../lib/chatStore'
import ChatEmptyState from './ChatEmptyState'
import ChatEyeAnchor from './ChatEyeAnchor'
import MessageBubble from './MessageBubble'

const NEAR_BOTTOM_PX = 80

export default function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const isThinking = useChatStore((s) => s.isThinking)

  const listRef = useRef<HTMLDivElement>(null)
  const [stickToBottom, setStickToBottom] = useState(true)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight
      setStickToBottom(dist < NEAR_BOTTOM_PX)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!stickToBottom || !listRef.current) return
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages.length, isThinking, stickToBottom])

  const hasConversation = messages.length > 0

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto eidrix-scrollbar px-4 py-4"
      aria-live="polite"
    >
      {!hasConversation ? (
        <ChatEmptyState />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </AnimatePresence>
          <ChatEyeAnchor />
        </div>
      )}
    </div>
  )
}
