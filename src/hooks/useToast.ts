// ──────────────────────────────────────────────────────────────────────
// useToast — thin wrapper over the toast store.
//
// Consumers do:
//
//   const toast = useToast()
//   toast.push({ title: 'Saved', variant: 'success' })
//   toast.push({
//     title: 'Customer deleted',
//     action: { label: 'Undo', onClick: () => undoDelete(id) },
//     duration: 5000,
//   })
//
// Selector form — returns only the two actions so components don't
// re-render when other components push unrelated toasts.
// ──────────────────────────────────────────────────────────────────────

import { useToastStore } from '../lib/toastStore'

export function useToast() {
  const push = useToastStore((s) => s.push)
  const dismiss = useToastStore((s) => s.dismiss)
  return { push, dismiss }
}
