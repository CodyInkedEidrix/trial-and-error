// ──────────────────────────────────────────────────────────────────────
// PendingActionCard — inline Confirm / Cancel UI rendered alongside an
// assistant message when a destructive tool has been previewed.
//
// Lives inside the chat column's message list, scoped by the column's
// width. The column itself stays fully interactive per the "chat
// column is sovereign" architectural principle — no overlays, no
// backdrops, no pointer-events hijack.
//
// Three visual states:
//   - Pending: both buttons active, warm border
//   - Confirmed: muted card, "Confirmed" label, both buttons disabled
//   - Cancelled: muted card, "Cancelled" label, both buttons disabled
//
// The resolved states preserve the card in history so the user (and
// future support staff) can see what was approved when. Audit trail
// as trust UX.
// ──────────────────────────────────────────────────────────────────────

import type { PendingAction } from '../../types/message'
import { useChatStore } from '../../lib/chatStore'

interface PendingActionCardProps {
  assistantMessageId: string
  pendingAction: PendingAction
}

export default function PendingActionCard({
  assistantMessageId,
  pendingAction,
}: PendingActionCardProps) {
  const confirmPendingAction = useChatStore((s) => s.confirmPendingAction)
  const cancelPendingAction = useChatStore((s) => s.cancelPendingAction)
  const isStreaming = useChatStore((s) => s.isStreaming)

  const resolved = pendingAction.resolution !== undefined

  // Resolved-state rendering.
  if (pendingAction.resolution === 'confirmed') {
    return (
      <div className="mt-3 rounded-md border border-obsidian-800 bg-obsidian-900/50 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-success-500">
          Confirmed
        </p>
        <p className="mt-1 font-body text-xs text-text-secondary">
          {pendingAction.summary}
        </p>
      </div>
    )
  }

  if (pendingAction.resolution === 'cancelled') {
    return (
      <div className="mt-3 rounded-md border border-obsidian-800 bg-obsidian-900/50 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
          Cancelled
        </p>
        <p className="mt-1 font-body text-xs text-text-tertiary line-through decoration-text-tertiary/50">
          {pendingAction.summary}
        </p>
      </div>
    )
  }

  // Active-pending rendering — warm border, ember-focused buttons.
  return (
    <div className="mt-3 rounded-md border border-ember-700/50 bg-ember-900/10 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ember-300">
        Confirm destructive action
      </p>
      <p className="mt-1 font-body text-sm text-text-primary">
        {pendingAction.summary}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void confirmPendingAction(assistantMessageId)}
          disabled={resolved || isStreaming}
          className="rounded-sm bg-danger-500/80 hover:bg-danger-500 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white transition-colors"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => void cancelPendingAction(assistantMessageId)}
          disabled={resolved || isStreaming}
          className="rounded-sm border border-obsidian-700 hover:border-obsidian-700/80 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-text-secondary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
