// ──────────────────────────────────────────────────────────────────────
// HistoricalPlanChip — collapsed receipt of a completed plan.
//
// After a plan finishes (or is auto-expired during rehydrate), its live
// PlanCard rows fade out and this compact chip takes their place in the
// scroll. Click the chip to expand a static final-state view of the
// plan — same step rows as the live card, plus the captured tool log
// (when present), without the Stop button or live shimmer.
//
// Visual: a single quiet line in the chat flow that doesn't hog
// vertical space, ember-tinted to reads as Eidrix's voice rather than
// a system message.
// ──────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import type { ActivePlan } from '../../types/activePlan'
import type { ToolLogEntry } from '../../lib/planStore'

interface HistoricalPlanChipProps {
  plan: ActivePlan
  toolLog?: ToolLogEntry[]
}

export default function HistoricalPlanChip({
  plan,
  toolLog,
}: HistoricalPlanChipProps) {
  const reducedMotion = useReducedMotion() ?? false
  const [expanded, setExpanded] = useState(false)

  const completedCount = plan.steps.filter((s) => s.status === 'complete').length
  const totalSteps = plan.steps.length

  // Per-status summary line + glyph + color tint. Picked once; reused
  // in collapsed and expanded headers so the chip's identity stays
  // consistent when toggled.
  const { glyph, glyphColor, summary } = (() => {
    if (plan.status === 'failed') {
      return {
        glyph: '✗',
        glyphColor: 'text-danger-500',
        summary: `Plan failed · ${completedCount}/${totalSteps}`,
      }
    }
    if (plan.status === 'stopped') {
      return {
        glyph: '◌',
        glyphColor: 'text-text-tertiary',
        summary: `Plan stopped · ${completedCount}/${totalSteps}`,
      }
    }
    return {
      glyph: '✓',
      glyphColor: 'text-ember-500',
      summary: `Plan complete · ${totalSteps}/${totalSteps}`,
    }
  })()

  const enterMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
      }

  return (
    <motion.div
      {...enterMotion}
      transition={{
        duration: reducedMotion ? 0.15 : 0.32,
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className="my-1.5"
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="group flex items-center gap-2 w-full text-left font-mono text-[10px] uppercase tracking-[0.22em] text-text-tertiary hover:text-text-secondary transition-colors duration-150 focus-visible:outline-none focus-visible:text-text-secondary"
      >
        <span aria-hidden className={`text-[11px] leading-none ${glyphColor}`}>
          {glyph}
        </span>
        <span>{summary}</span>
        <span
          aria-hidden
          className={`ml-auto text-[9px] leading-none transition-transform duration-200 ${
            expanded ? 'rotate-90' : ''
          }`}
        >
          ▸
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={
              reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
            }
            animate={
              reducedMotion
                ? { opacity: 1 }
                : { opacity: 1, height: 'auto' }
            }
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, height: 0 }
            }
            transition={{
              duration: reducedMotion ? 0.15 : 0.28,
              ease: [0.22, 0.61, 0.36, 1],
            }}
            className="overflow-hidden"
          >
            <div className="relative pl-4 pt-2 pb-1">
              {/* Same left ember rule as the live PlanCard so the
                  expanded view reads as the same kind of thing,
                  just historical. Slightly dimmer to signal "frozen". */}
              <div
                aria-hidden
                className="absolute left-0 top-2 bottom-1 w-px bg-gradient-to-b from-ember-500/30 via-ember-500/15 to-ember-500/5"
              />

              {plan.completionSummary && (
                <p className="font-body text-[12px] text-text-secondary leading-snug mb-2">
                  {plan.completionSummary}
                </p>
              )}

              <ul className="space-y-1">
                {plan.steps.map((step) => (
                  <li
                    key={step.id}
                    className="flex items-start gap-2.5"
                  >
                    <HistoricalGlyph status={step.status} />
                    <span
                      className={`flex-1 font-body text-[12px] leading-snug ${historicalStepTitleClass(step.status)}`}
                    >
                      {step.title}
                    </span>
                  </li>
                ))}
              </ul>

              {toolLog && toolLog.length > 0 && (
                <div className="mt-3 space-y-0.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-text-tertiary/70 mb-1">
                    Tools used
                  </p>
                  {toolLog.map((entry, i) => (
                    <ToolLogRow key={i} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Historical step glyph ───────────────────────────────────────────
// Static (no pulse) — historical view is a frozen receipt.

/** Text color for a frozen step title in the expanded historical
 *  chip. Dimmer than the live PlanCard so the receipt reads as "past
 *  work" rather than "in-flight work." */
function historicalStepTitleClass(
  status: ActivePlan['steps'][number]['status'],
): string {
  switch (status) {
    case 'complete':
      return 'text-text-tertiary'
    case 'failed':
      return 'text-danger-500/85'
    case 'active':
    case 'pending':
      return 'text-text-secondary'
  }
}

function HistoricalGlyph({ status }: { status: ActivePlan['steps'][number]['status'] }) {
  if (status === 'complete') {
    return (
      <span
        aria-label="complete"
        className="flex-shrink-0 w-4 text-center font-mono text-[12px] leading-none text-ember-500/85 mt-[3px]"
      >
        ✓
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span
        aria-label="failed"
        className="flex-shrink-0 w-4 text-center font-mono text-[12px] leading-none text-danger-500/85 mt-[3px]"
      >
        ✗
      </span>
    )
  }
  if (status === 'active') {
    // Frozen "still active when the plan ended" — render as a hollow
    // dot to distinguish from genuine pending steps that the plan
    // never reached.
    return (
      <span
        aria-label="incomplete"
        className="flex-shrink-0 w-4 flex items-center justify-center mt-[5px]"
      >
        <span className="inline-block w-2 h-2 rounded-full border border-ember-500/50" />
      </span>
    )
  }
  return (
    <span
      aria-label="pending"
      className="flex-shrink-0 w-4 flex items-center justify-center mt-[5px]"
    >
      <span className="inline-block w-2 h-2 rounded-full border border-text-tertiary/40" />
    </span>
  )
}

// ─── Tool log row ────────────────────────────────────────────────────

/** Glyph + color pair for a tool-log entry's success state. success =
 *  null is the unlikely "we never received tool_finished" case — shown
 *  as a neutral midline dot so the row still reads. */
function toolLogRowDecor(
  success: boolean | null,
): { glyph: string; glyphColor: string } {
  if (success === true) return { glyph: '✓', glyphColor: 'text-ember-500/70' }
  if (success === false) return { glyph: '✗', glyphColor: 'text-danger-500/70' }
  return { glyph: '·', glyphColor: 'text-text-tertiary/70' }
}

function ToolLogRow({ entry }: { entry: ToolLogEntry }) {
  const { glyph, glyphColor } = toolLogRowDecor(entry.success)
  const duration =
    typeof entry.durationMs === 'number'
      ? `${entry.durationMs}ms`
      : '—'

  return (
    <div className="flex items-center gap-2 font-mono text-[11px] text-text-tertiary leading-snug">
      <span aria-hidden className={`w-3 text-center ${glyphColor}`}>
        {glyph}
      </span>
      <span className="flex-1 truncate">{entry.summary}</span>
      <span className="text-text-tertiary/50">{duration}</span>
    </div>
  )
}
