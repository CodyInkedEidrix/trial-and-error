// ──────────────────────────────────────────────────────────────────────
// Toast store — generic notification system (AC-14 scope, absorbed into
// Chapter 10).
//
// Anything in the app can `push()` a toast with a variant, title, and
// optional action button. The store holds the list and exposes
// dismiss/clear; auto-dismiss timing is handled inside each Toast
// component (so the timer can pause on hover/focus). This separation
// keeps the store pure UI-state and lets the visual layer own the
// "when to dismiss" decision based on user interaction.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  action?: ToastAction
  /** ms until auto-dismiss. 0 means sticky until manually dismissed. */
  duration: number
  /**
   * Fires when the user manually dismisses the toast via the × button.
   * Does NOT fire when the action button is clicked (the action handles
   * its own intent) or when the auto-dismiss timer fires. Use this to
   * commit deferred state — e.g., "dismissing the undo window means I'm
   * done with the safety, finalize the delete now."
   */
  onDismiss?: () => void
}

export type ToastInput = Omit<Toast, 'id' | 'variant' | 'duration'> &
  Partial<Pick<Toast, 'variant' | 'duration'>>

interface ToastStore {
  toasts: Toast[]
  push: (input: ToastInput) => string
  dismiss: (id: string) => void
  clear: () => void
}

const DEFAULT_DURATION = 4000

function toastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  push: (input) => {
    const id = toastId()
    const toast: Toast = {
      id,
      variant: input.variant ?? 'info',
      title: input.title,
      description: input.description,
      action: input.action,
      onDismiss: input.onDismiss,
      duration: input.duration ?? DEFAULT_DURATION,
    }
    set((prev) => ({ toasts: [...prev.toasts, toast] }))
    return id
  },

  dismiss: (id) => {
    set((prev) => ({ toasts: prev.toasts.filter((t) => t.id !== id) }))
  },

  clear: () => set({ toasts: [] }),
}))
