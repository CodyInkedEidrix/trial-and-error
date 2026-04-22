// ──────────────────────────────────────────────────────────────────────
// ToastStack — the app-level toast container.
//
// Mounts once at App level. Reads active toasts from the store and
// renders them in a bottom-center column, newest on top. AnimatePresence
// handles enter/exit so dismissed toasts fade + slide down gracefully.
//
// `pointer-events-none` on the wrapper + `pointer-events-auto` on each
// toast means the container doesn't block clicks on the rest of the
// app; only the pills themselves are interactive.
// ──────────────────────────────────────────────────────────────────────

import { AnimatePresence } from 'framer-motion'
import { useToastStore } from '../../lib/toastStore'
import Toast from './Toast'

export default function ToastStack() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
