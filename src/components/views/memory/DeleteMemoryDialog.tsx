// ──────────────────────────────────────────────────────────────────────
// DeleteMemoryDialog — confirmation modal for soft-deleting a memory.
//
// Soft-delete in the store; the row stays in the DB with is_active=
// false, which means retrieval filters it out but the data isn't
// truly lost. If a user wants permanent deletion, they'd need a
// "permanently delete" action (real-Eidrix work — not in Session 2).
//
// Scoped to the right of the chat column per the "chat column is
// sovereign" principle (see CLAUDE.md).
// ──────────────────────────────────────────────────────────────────────

import { AnimatePresence, motion } from 'framer-motion'

import type { MemoryFact } from '../../../types/memoryFact'
import Button from '../../ui/Button'

interface DeleteMemoryDialogProps {
  fact: MemoryFact | null
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteMemoryDialog({
  fact,
  onConfirm,
  onCancel,
}: DeleteMemoryDialogProps) {
  return (
    <AnimatePresence>
      {fact && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCancel}
            className="fixed inset-y-0 right-0 left-[380px] bg-obsidian-950/50 backdrop-blur-[2px] z-40"
          />

          <motion.div
            key="dialog"
            role="dialog"
            aria-label="Delete memory"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-[calc(380px+((100vw-380px)/2))] -translate-x-1/2 -translate-y-1/2 w-[420px] bg-obsidian-900 border border-obsidian-800 rounded-lg shadow-2xl z-50 p-6"
          >
            <h2 className="font-display text-lg text-text-primary mb-2">
              Forget this memory?
            </h2>
            <p className="font-body text-sm text-text-secondary mb-4">
              Eidrix will no longer use this in responses.
            </p>

            <div className="bg-obsidian-950 border border-obsidian-800 rounded-md p-3 mb-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-tertiary mb-1">
                {fact.factType}
              </p>
              <p className="font-body text-sm text-text-primary">
                {fact.content}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button label="Cancel" variant="secondary" onClick={onCancel} />
              <Button
                label="Forget it"
                variant="destructive"
                onClick={onConfirm}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
