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
import PendingActionCard from './PendingActionCard'

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

  // Eye-as-locus rule: no empty assistant shell. When a streaming
  // message hasn't received its first token yet, don't render anything —
  // the "she's working" signal lives entirely at the Eye (aura pulse +
  // thinking state). The bubble mounts fresh the moment real content
  // arrives and animates in via AnimatePresence.
  if (message.status === 'streaming' && !message.content.trim()) {
    return null
  }

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
        {!isUser && message.pendingAction && (
          <PendingActionCard
            assistantMessageId={message.id}
            pendingAction={message.pendingAction}
          />
        )}
        {!isUser && message.toolErrors && message.toolErrors.length > 0 && (
          <div className="mt-2 rounded-sm border border-danger-500/40 bg-danger-500/5 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-danger-500">
              {message.toolErrors.length === 1
                ? '1 tool error'
                : `${message.toolErrors.length} tool errors`}
            </p>
            <ul className="mt-1 space-y-0.5">
              {message.toolErrors.map((err, i) => (
                <li
                  key={i}
                  className="font-mono text-[11px] text-danger-500/90"
                >
                  <span className="text-text-tertiary">{err.tool}:</span>{' '}
                  {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  )
}
