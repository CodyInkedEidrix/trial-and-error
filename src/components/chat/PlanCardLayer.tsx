// ──────────────────────────────────────────────────────────────────────
// PlanCardLayer — renders the live PlanCard at the chat tail.
//
// Subscribes to usePlanStore. Renders the active plan as a PlanCard
// wrapped in AnimatePresence so it can emerge on eidrix_plan_started
// and collapse on eidrix_plan_complete. A thin ember tether below the
// card points down to the Eye, reinforcing "this came from her."
//
// Historical chips (collapsed receipts for completed plans) are
// interleaved into the message stream by completedAt — see
// MessageList. That keeps each chip anchored to the moment its plan
// finished rather than floating at the tail as the chat continues.
// ──────────────────────────────────────────────────────────────────────

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { usePlanStore } from '../../lib/planStore'
import PlanCard from './PlanCard'

const EASE = [0.22, 0.61, 0.36, 1] as const

export default function PlanCardLayer() {
  const activePlan = usePlanStore((s) => s.activePlan)
  const isStopping = usePlanStore((s) => s.isStopping)
  const requestStop = usePlanStore((s) => s.requestStop)
  const reducedMotion = useReducedMotion() ?? false

  const isLive = !!activePlan && activePlan.status === 'running'

  return (
    <AnimatePresence>
      {isLive && activePlan && (
        <motion.div
          key={activePlan.id}
          initial={
            reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.4, y: 14 }
          }
          animate={
            reducedMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: 1, y: 0 }
          }
          exit={
            reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.55, y: 6 }
          }
          transition={{
            duration: reducedMotion ? 0.18 : 0.45,
            ease: EASE,
          }}
          style={{ transformOrigin: 'bottom left' }}
          className="mb-1"
        >
          <PlanCard
            plan={activePlan}
            isStopping={isStopping}
            onStop={() => void requestStop()}
          />
          <Tether reducedMotion={reducedMotion} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Tether ─────────────────────────────────────────────────────────
// 1px ember-gradient line below the live plan, aligned to the Eye's
// x-center. Pulses in sync with the Eye's aura so the two read as one
// breathing organism.
function Tether({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) {
    return (
      <div
        aria-hidden
        className="ml-4 mt-1 w-px h-3 bg-gradient-to-b from-ember-500/55 to-ember-500/5"
      />
    )
  }
  return (
    <motion.div
      aria-hidden
      className="ml-4 mt-1 w-px h-3 bg-gradient-to-b from-ember-500/70 to-ember-500/5"
      animate={{ opacity: [0.55, 1, 0.55] }}
      transition={{
        duration: 2.6,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}
