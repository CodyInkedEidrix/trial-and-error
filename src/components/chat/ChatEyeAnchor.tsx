// ──────────────────────────────────────────────────────────────────────
// ChatEyeAnchor — the single persistent Eye at the end of the chat.
//
// Not an avatar. Not per-message. One Eye, living at the conversation's
// tail, behaving as the "character" that's about to speak next.
// Subscribes to chatStore and reflects state:
//
//   not thinking  → state='idle'
//   thinking      → state='thinking' + reaction='processing' (sustained)
//
// Future layered behaviors (per Cody's framing — "rough draft for now"):
//   - Typing dots render INSIDE the Eye during processing (replace the
//     current sibling-dots pattern entirely)
//   - Click anywhere in the chat fires a reaction (noticed / acknowledge)
//   - Agentic calls later drive richer reactions (handoff, uncertainty,
//     etc.)
//
// For now: bare minimum. State mapping from isThinking, full default
// Eye config, cursor tracking live.
// ──────────────────────────────────────────────────────────────────────

import { useChatStore } from '../../lib/chatStore'
import EidrixEye from '../brand/EidrixEye'

const EYE_SIZE_PX = 32

export default function ChatEyeAnchor() {
  const isThinking = useChatStore((s) => s.isThinking)

  return (
    <div
      className="mt-1"
      style={{ width: EYE_SIZE_PX, height: EYE_SIZE_PX }}
      aria-label={isThinking ? 'Eidrix is thinking' : 'Eidrix is ready'}
      role="status"
    >
      <EidrixEye
        size={EYE_SIZE_PX}
        state={isThinking ? 'thinking' : 'idle'}
        reaction={isThinking ? 'processing' : null}
      />
    </div>
  )
}
