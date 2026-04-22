// ──────────────────────────────────────────────────────────────────────
// Toast — a single notification pill.
//
// Visual style: small, quiet, readable. Not alarming. Variant determines
// the subtle accent stripe on the left edge — not the whole background,
// because loud colors on a toast make users anxious.
// ──────────────────────────────────────────────────────────────────────

import { motion } from 'framer-motion'
import type { Toast as ToastModel, ToastVariant } from '../../lib/toastStore'

interface ToastProps {
  toast: ToastModel
  onDismiss: (id: string) => void
}

// Accent stripe colors per variant — the only place variant is visually
// loud. Background stays obsidian-900 across all variants so the stack
// reads as a unified system.
const accentByVariant: Record<ToastVariant, string> = {
  info: 'bg-cobalt-500',
  success: 'bg-success-500',
  warning: 'bg-ember-500',
  danger: 'bg-danger-500',
}

const toastMotion = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.96 },
  transition: { duration: 0.24, ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number] },
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  const handleAction = () => {
    if (!toast.action) return
    toast.action.onClick()
    onDismiss(toast.id)
  }

  return (
    <motion.div
      layout
      {...toastMotion}
      role="status"
      aria-live="polite"
      className="relative flex items-center gap-3 min-w-[280px] max-w-[420px] bg-obsidian-900/65 backdrop-blur-md border border-obsidian-700/60 rounded-md pl-4 pr-3 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      {/* Left accent stripe */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[2px] ${accentByVariant[toast.variant]}`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm text-text-primary truncate">
          {toast.title}
        </p>
        {toast.description && (
          <p className="font-body text-xs text-text-tertiary mt-0.5 truncate">
            {toast.description}
          </p>
        )}
      </div>

      {/* Action button — ember so it reads as the primary affordance */}
      {toast.action && (
        <button
          type="button"
          onClick={handleAction}
          className="flex-shrink-0 font-mono text-[11px] uppercase tracking-wider text-ember-300 hover:text-ember-500 px-2 py-1 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/60"
        >
          {toast.action.label}
        </button>
      )}

      {/* Dismiss X — fires `onDismiss` hook so callers can commit
          deferred intent (e.g., finalize a pending delete). */}
      <button
        type="button"
        onClick={() => {
          toast.onDismiss?.()
          onDismiss(toast.id)
        }}
        aria-label="Dismiss"
        className="flex-shrink-0 text-text-tertiary hover:text-text-primary p-1 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/60"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </motion.div>
  )
}
