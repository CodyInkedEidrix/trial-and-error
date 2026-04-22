// ──────────────────────────────────────────────────────────────────────
// SavedIndicator — small pill that flashes "• Saved" after a successful
// auto-save. Pairs with the useSavedIndicator hook.
//
// Subtle by design: success-500 (green) dot + text, lowercase-uppercase
// mono label, fades in/out. Not alarming, not demanding attention.
// ──────────────────────────────────────────────────────────────────────

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

interface SavedIndicatorProps {
  visible: boolean
}

export default function SavedIndicator({ visible }: SavedIndicatorProps) {
  const reducedMotion = useReducedMotion() ?? false

  const enter = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: -4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
      }

  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          {...enter}
          transition={{ duration: 0.2 }}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-success-500"
        >
          <span
            aria-hidden
            className="w-1.5 h-1.5 rounded-full bg-success-500"
          />
          Saved
        </motion.span>
      )}
    </AnimatePresence>
  )
}
