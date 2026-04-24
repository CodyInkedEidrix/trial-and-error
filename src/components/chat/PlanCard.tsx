// ──────────────────────────────────────────────────────────────────────
// PlanCard — the live, ambient expression of an agentic plan in flight.
//
// Renders inline at the tail of the message list, directly above
// ChatEyeAnchor. No card chrome — no background, no rounded border,
// no shadow. Just a 1px ember-gradient rule down the left edge that
// visually anchors the rows to the Eye, status glyphs in a small
// gutter, and step titles in body text.
//
// ─── Tool activity display ────────────────────────────────────────────
// One sticky slot: planStore.currentTool. Every tool_started event
// overwrites it; tool_finished doesn't clear it. The most recently-
// started tool shimmers under every active step in the plan. When
// tools fire in rapid succession, you see a shimmering feed of
// summaries rotating. Between iterations, the last tool stays visible
// because nothing cleared it — this is what makes the activity
// watchable when tool calls complete in <30ms.
//
// Known compromise: when the agent simultaneously activates multiple
// steps (e.g., three "Add X" steps at once), the same summary
// replicates under each. Visibility wins over per-step precision —
// matcher-based routing produced invisible or stale activity in
// practice.
//
// The Stop button halo-pulses when planStore.stopHintNonce increments
// (the user tried to send during the plan — in-context feedback that
// replaces a free-floating toast).
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import type {
  ActivePlan,
  PlanStep,
  PlanStepStatus,
} from '../../types/activePlan'
import { usePlanStore } from '../../lib/planStore'
import type { CurrentTool } from '../../lib/planStore'

interface PlanCardProps {
  plan: ActivePlan
  isStopping: boolean
  onStop: () => void
}

export default function PlanCard({ plan, isStopping, onStop }: PlanCardProps) {
  const reducedMotion = useReducedMotion() ?? false
  const currentTool = usePlanStore((s) => s.currentTool)
  const stopHintNonce = usePlanStore((s) => s.stopHintNonce)

  const stepCountLabel =
    plan.steps.length === 1 ? '1 step' : `${plan.steps.length} steps`

  const canStop = plan.status === 'running'

  return (
    <div
      className="relative pl-4"
      role="status"
      aria-live="polite"
      aria-label={`Plan in progress, ${stepCountLabel}`}
    >
      {/* ─── Left ember rule ──────────────────────────────────────
          Anchors all the plan rows visually and reads as the
          continuation of the tether down to the Eye below. */}
      <div
        aria-hidden
        className="absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-ember-500/45 via-ember-500/25 to-ember-500/8"
      />

      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <motion.span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full bg-ember-500"
            animate={
              reducedMotion ? undefined : { opacity: [0.5, 1, 0.5] }
            }
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-secondary">
            Plan
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-tertiary/70">
            · {stepCountLabel}
          </span>
        </div>

        {canStop && (
          <StopButton
            isStopping={isStopping}
            onStop={onStop}
            stopHintNonce={stopHintNonce}
            reducedMotion={reducedMotion}
          />
        )}
      </div>

      {/* ─── Steps ───────────────────────────────────────────────── */}
      <ul className="space-y-1">
        {plan.steps.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            index={i}
            reducedMotion={reducedMotion}
            currentTool={
              step.status === 'active' ? currentTool : null
            }
          />
        ))}
      </ul>
    </div>
  )
}

// ─── Stop button ─────────────────────────────────────────────────────

interface StopButtonProps {
  isStopping: boolean
  onStop: () => void
  stopHintNonce: number
  reducedMotion: boolean
}

function StopButton({
  isStopping,
  onStop,
  stopHintNonce,
  reducedMotion,
}: StopButtonProps) {
  const [pulseKey, setPulseKey] = useState(0)
  useEffect(() => {
    if (stopHintNonce === 0) return
    setPulseKey((k) => k + 1)
  }, [stopHintNonce])

  return (
    <motion.button
      type="button"
      onClick={onStop}
      disabled={isStopping}
      aria-busy={isStopping || undefined}
      key={pulseKey}
      animate={
        pulseKey === 0 || reducedMotion
          ? undefined
          : {
              boxShadow: [
                '0 0 0 0 rgba(229,72,77,0)',
                '0 0 0 6px rgba(229,72,77,0.35)',
                '0 0 0 0 rgba(229,72,77,0)',
              ],
              scale: [1, 1.08, 1],
            }
      }
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-tertiary hover:text-danger-500 transition-colors duration-150 px-1.5 py-0.5 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-danger-500/60 disabled:opacity-60 disabled:cursor-wait"
    >
      {isStopping ? 'Stopping…' : 'Stop'}
    </motion.button>
  )
}

// ─── Step row ────────────────────────────────────────────────────────
// Each row gets its step glyph + title, plus (when active AND a
// currentTool exists in the store) a shimmering sub-line showing what
// the agent most recently started doing. When multiple steps are
// simultaneously active, each renders the same sub-line.

interface StepRowProps {
  step: PlanStep
  index: number
  reducedMotion: boolean
  /** The store's currentTool, passed through only when this step is
   *  active. Null for non-active steps so they don't render a
   *  sub-line. */
  currentTool: CurrentTool | null
}

function stepTitleClass(status: PlanStepStatus): string {
  switch (status) {
    case 'complete':
      return 'text-text-tertiary'
    case 'active':
      return 'text-text-primary'
    case 'failed':
      return 'text-danger-500/90'
    case 'pending':
      return 'text-text-secondary'
  }
}

function StepRow({
  step,
  index,
  reducedMotion,
  currentTool,
}: StepRowProps) {
  const enterMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, x: -4 },
        animate: { opacity: 1, x: 0 },
      }

  const titleClass = stepTitleClass(step.status)

  return (
    <motion.li
      {...enterMotion}
      transition={{
        duration: reducedMotion ? 0.15 : 0.3,
        delay: reducedMotion ? 0 : Math.min(index * 0.04, 0.24),
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className="flex flex-col gap-0.5"
    >
      <div className="flex items-start gap-2.5">
        <StepGlyph status={step.status} reducedMotion={reducedMotion} />
        <span
          className={`flex-1 font-body text-[13px] leading-snug ${titleClass}`}
        >
          {step.title}
        </span>
      </div>
      {currentTool && (
        <ToolSubline tool={currentTool} />
      )}
    </motion.li>
  )
}

// ─── Tool sub-line ───────────────────────────────────────────────────
// The shimmering "→ {summary}" line. Keyed on callKey so when the
// currentTool slot is replaced by a new start, React cross-fades the
// new summary in cleanly instead of mutating characters in place.
function ToolSubline({ tool }: { tool: CurrentTool }) {
  return (
    <div
      key={tool.callKey}
      className="ml-7 mt-0.5 flex items-center gap-1.5 font-mono text-[11px] leading-snug"
    >
      <span aria-hidden className="text-ember-500/70">
        →
      </span>
      {/* eidrix-shimmer handles its own reduced-motion fallback */}
      <span className="eidrix-shimmer">{tool.summary}</span>
    </div>
  )
}

// ─── Step glyph ──────────────────────────────────────────────────────

function StepGlyph({
  status,
  reducedMotion,
}: {
  status: PlanStepStatus
  reducedMotion: boolean
}) {
  if (status === 'complete') {
    return (
      <span
        aria-label="complete"
        className="flex-shrink-0 w-4 text-center font-mono text-[12px] leading-none text-ember-500 mt-[3px]"
      >
        ✓
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span
        aria-label="failed"
        className="flex-shrink-0 w-4 text-center font-mono text-[12px] leading-none text-danger-500 mt-[3px]"
      >
        ✗
      </span>
    )
  }

  if (status === 'active') {
    return (
      <span
        aria-label="active"
        className="flex-shrink-0 w-4 flex items-center justify-center mt-[5px]"
      >
        <motion.span
          className="inline-block w-2 h-2 rounded-full bg-ember-500"
          animate={
            reducedMotion
              ? undefined
              : { scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }
          }
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </span>
    )
  }

  // pending
  return (
    <span
      aria-label="pending"
      className="flex-shrink-0 w-4 flex items-center justify-center mt-[5px]"
    >
      <span className="inline-block w-2 h-2 rounded-full border border-text-tertiary/50" />
    </span>
  )
}
