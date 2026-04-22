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
// ──────────────────────────────────────────────────────────────────────

import { useChatStore } from '../../lib/chatStore'
import EidrixEye from '../brand/EidrixEye'

const EYE_SIZE_PX = 32

export default function ChatEyeAnchor() {
  const currentEyeState = useChatStore((s) => s.currentEyeState)
  const currentReaction = useChatStore((s) => s.currentReaction)
  const clearReaction = useChatStore((s) => s.clearReaction)

  const ariaLabel =
    currentEyeState === 'thinking'
      ? 'Eidrix is thinking'
      : currentEyeState === 'speaking'
        ? 'Eidrix is responding'
        : 'Eidrix is ready'

  return (
    <div
      className="mt-1"
      style={{ width: EYE_SIZE_PX, height: EYE_SIZE_PX }}
      aria-label={ariaLabel}
      role="status"
    >
      <EidrixEye
        size={EYE_SIZE_PX}
        state={currentEyeState}
        reaction={currentReaction}
        onReactionComplete={clearReaction}
      />
    </div>
  )
}
