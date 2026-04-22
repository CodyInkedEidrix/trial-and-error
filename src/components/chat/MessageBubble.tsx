// ──────────────────────────────────────────────────────────────────────
// MessageBubble — one chat message, text only.
//
// No Eye here. The Eye is a single persistent character anchored at
// the end of the conversation (see ChatEyeAnchor). Role identity comes
// from alignment + color:
//   - assistant: left-aligned, default text color
//   - user: right-aligned, cobalt-tinted text
//
// Entrance: fade + rise with Eidrix tempo. Reduced-motion respected.
// Timestamp reveals subtly on hover.
// ──────────────────────────────────────────────────────────────────────

import { motion, useReducedMotion } from 'framer-motion'

import type { Message } from '../../types/message'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const reducedMotion = useReducedMotion() ?? false
  const isUser = message.role === 'user'

  const enterMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
      }

  return (
    <motion.div
      {...enterMotion}
      transition={{
        duration: reducedMotion ? 0.1 : 0.32,
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className={`group ${isUser ? 'flex justify-end' : ''}`}
    >
      <div className={`min-w-0 max-w-[90%] ${isUser ? 'text-right' : ''}`}>
        <p
          className={`font-body text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
            isUser ? 'text-ember-500' : 'text-text-primary'
          }`}
        >
          {message.content}
        </p>
        <p
          className="font-mono text-[10px] text-text-tertiary mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Sent at"
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </motion.div>
  )
}
