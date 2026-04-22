// ──────────────────────────────────────────────────────────────────────
// ChatEmptyState — what the chat column shows before any messages exist.
//
// Eye is the centerpiece. Larger than avatar size (44px) to anchor the
// moment. Idle state, cursor tracking enabled here — at this size the
// iris drift reads as presence, not noise. A single short invitation
// line below the Eye; no example prompts or feature tour.
// ──────────────────────────────────────────────────────────────────────

import EidrixEye from '../brand/EidrixEye'

export default function ChatEmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 -mt-8">
      <div className="mb-5" aria-hidden>
        <EidrixEye size={44} state="idle" />
      </div>
      <p className="font-body text-sm text-text-secondary text-center max-w-[260px]">
        Ask something, or just start typing.
      </p>
    </div>
  )
}
