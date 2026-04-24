// ──────────────────────────────────────────────────────────────────────
// ChatEyeAnchor — the single persistent Eye at the end of the chat.
//
// Not an avatar. Not per-message. One Eye, living at the conversation's
// tail, behaving as the "character" that's about to speak next.
//
// Reads Eye state + reaction directly from chatStore (AC-01 wiring).
// The store drives:
//
//   Send            → state='thinking',  reaction='acknowledge' (one-shot)
//   First token     → state='speaking',  reaction=null
//   Stream end      → state='idle',      reaction='completion'  (one-shot)
//   Stream error    → state='idle',      reaction='uncertainty' (one-shot)
//
// Reactions auto-clear via onReactionComplete → store.clearReaction.
//
// ─── Eye-as-locus (AC-05 Session 1) ──────────────────────────────────
// An EyeAura layer sits behind the Eye and opacity-pulses whenever work
// is in flight — either chatStore.isStreaming OR planStore has a
// running plan. The aura is what replaces the old streaming cursor:
// the "she's working" signal now lives at the Eye, not above it in an
// empty bubble. Suppressed under prefers-reduced-motion.
// ──────────────────────────────────────────────────────────────────────

import { motion, useReducedMotion } from 'framer-motion'

import { useChatStore } from '../../lib/chatStore'
import { usePlanStore } from '../../lib/planStore'
import EidrixEye from '../brand/EidrixEye'

const EYE_SIZE_PX = 32

export default function ChatEyeAnchor() {
  const currentEyeState = useChatStore((s) => s.currentEyeState)
  const currentReaction = useChatStore((s) => s.currentReaction)
  const clearReaction = useChatStore((s) => s.clearReaction)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const planIsRunning = usePlanStore(
    (s) => s.activePlan?.status === 'running',
  )

  const isWorking = isStreaming || planIsRunning

  const ariaLabel =
    currentEyeState === 'thinking'
      ? 'Eidrix is thinking'
      : currentEyeState === 'speaking'
        ? 'Eidrix is responding'
        : 'Eidrix is ready'

  return (
    <div
      className="relative"
      style={{ width: EYE_SIZE_PX, height: EYE_SIZE_PX }}
      aria-label={ariaLabel}
      role="status"
    >
      <EyeAura active={isWorking} />
      <div className="relative z-10" style={{ width: EYE_SIZE_PX, height: EYE_SIZE_PX }}>
        <EidrixEye
          size={EYE_SIZE_PX}
          state={currentEyeState}
          reaction={currentReaction}
          onReactionComplete={clearReaction}
        />
      </div>
    </div>
  )
}

// ─── EyeAura ─────────────────────────────────────────────────────────
// Radial ember gradient behind the Eye. Opacity + scale breathe on a
// 2.6s cycle while work is active. Extends ~36px past the Eye on all
// sides — generous enough to read as an aura, tight enough not to
// visually dominate adjacent messages.
function EyeAura({ active }: { active: boolean }) {
  const reducedMotion = useReducedMotion() ?? false

  if (!active) return null

  // Reduced-motion: show a faint static glow so "she's working" is
  // still signalled, just without the pulse.
  if (reducedMotion) {
    return (
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          inset: '-36px',
          background:
            'radial-gradient(circle, rgba(255,107,26,0.22) 0%, rgba(255,107,26,0.08) 42%, transparent 72%)',
          opacity: 0.6,
        }}
      />
    )
  }

  return (
    <motion.div
      aria-hidden
      className="absolute pointer-events-none"
      style={{
        inset: '-36px',
        background:
          'radial-gradient(circle, rgba(255,107,26,0.28) 0%, rgba(255,107,26,0.10) 42%, transparent 72%)',
      }}
      animate={{
        opacity: [0.35, 0.85, 0.35],
        scale: [0.92, 1.06, 0.92],
      }}
      transition={{
        duration: 2.6,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}
