// ──────────────────────────────────────────────────────────────────────
// Toast store — generic notification system (AC-14 scope, absorbed into
// Chapter 10 because the undo-delete pattern needs it).
//
// Anything in the app can `push()` a toast with a variant, title, and
// optional action button. The store handles auto-dismiss timing and
// cleanup; <ToastStack /> renders whatever's currently in the store.
//
// Zero coupling to customers — this lives alongside future features
// (save confirmations, error reports, agent action updates).
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
  /** Dismiss timers — kept outside `toasts` so they aren't part of render state. */
  _timers: Record<string, ReturnType<typeof setTimeout>>

  push: (input: ToastInput) => string
  dismiss: (id: string) => void
  clear: () => void
}

const DEFAULT_DURATION = 4000

function toastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  _timers: {},

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

    if (toast.duration > 0) {
      const timerId = setTimeout(() => get().dismiss(id), toast.duration)
      set((prev) => ({ _timers: { ...prev._timers, [id]: timerId } }))
    }

    return id
  },

  dismiss: (id) => {
    const timers = get()._timers
    if (timers[id]) {
      clearTimeout(timers[id])
    }
    set((prev) => {
      const { [id]: _removed, ...restTimers } = prev._timers
      return {
        toasts: prev.toasts.filter((t) => t.id !== id),
        _timers: restTimers,
      }
    })
  },

  clear: () => {
    const timers = get()._timers
    Object.values(timers).forEach(clearTimeout)
    set({ toasts: [], _timers: {} })
  },
}))
