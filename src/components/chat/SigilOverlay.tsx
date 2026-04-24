// ──────────────────────────────────────────────────────────────────────
// SigilOverlay — renders the Eye's active sigil gesture.
//
// Subscribes to sigilStore.queue[0]. If a sigil is present, traces
// its SVG path via stroke-dashoffset (drawing effect), holds at full
// opacity, fades out, then calls dismiss so the next queued sigil
// plays. If the queue is empty, renders nothing.
//
// Positioned absolutely to the right of its parent (the Eye's
// container). Zero layout footprint when idle — the overlay's
// bounding box is fixed 24×24.
//
// Animation approach:
//   • stroke-dasharray = pathLength, stroke-dashoffset transitions
//     from pathLength to 0 (or pathLength * (1 - partial) for
//     fizzle) over drawMs
//   • Then hold for holdMs at opacity 1
//   • Then opacity → 0 over fadeMs
//   • Then call dismiss(id)
//
// Reduced-motion: skip the trace animation, render the full sigil at
// opacity 0.9 for (drawMs + holdMs), fade over fadeMs. User still
// sees the mark fire + vanish; just no theatrical draw-in.
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { useSigilStore } from '../../lib/sigilStore'
import {
  SIGILS,
  SIGIL_COLOR_VARS,
  totalSigilDurationMs,
  type SigilMeta,
} from './sigils/sigils'

const VIEW_SIZE = 24 // px — matches the viewBox in sigils.ts

// offset-path (motion-along-path) shipped in Safari 16 / Chrome 55 / FF 72.
// The thinking-spiral's trailing dot uses it; older browsers silently no-op
// the animation and park the dot at the start of the path. Feature-detect
// once and suppress the tail element on unsupported engines — the spiral
// still traces cleanly without it.
const SUPPORTS_OFFSET_PATH =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('offset-path', 'path("M0 0")')

export default function SigilOverlay() {
  const head = useSigilStore((s) => s.queue[0])

  return (
    <div
      aria-hidden
      className="absolute top-1/2 left-full ml-2 -translate-y-1/2 pointer-events-none"
      style={{ width: VIEW_SIZE, height: VIEW_SIZE }}
    >
      <AnimatePresence>
        {head && <SigilRenderer key={head.id} id={head.id} kind={head.kind} />}
      </AnimatePresence>
    </div>
  )
}

// ─── Single-sigil renderer ───────────────────────────────────────────
// Handles its own lifecycle (draw → hold → fade → dismiss). Isolated
// from the overlay so that exit animations don't fight with new
// sigils entering when the store advances the queue.

interface SigilRendererProps {
  id: string
  kind: SigilMeta['kind']
}

function SigilRenderer({ id, kind }: SigilRendererProps) {
  const meta = SIGILS[kind]
  const reducedMotion = useReducedMotion() ?? false
  const dismiss = useSigilStore((s) => s.dismiss)

  // Compute the path's total length once it's in the DOM so we can
  // set stroke-dasharray + initial stroke-dashoffset to the full
  // length (sigil starts invisible). On mount, transition the
  // dashoffset to 0 (or the partial target) to trace the stroke.
  const pathRef = useRef<SVGPathElement | null>(null)
  const [pathLength, setPathLength] = useState<number | null>(null)

  useEffect(() => {
    const el = pathRef.current
    if (!el) return
    const length = el.getTotalLength()
    setPathLength(length)
  }, [])

  // Schedule dismissal exactly once per mount, after the full
  // draw + hold + fade cycle completes.
  useEffect(() => {
    const t = window.setTimeout(() => {
      dismiss(id)
    }, totalSigilDurationMs(meta))
    return () => window.clearTimeout(t)
  }, [id, meta, dismiss])

  // Final dashoffset: 0 for most sigils (fully drawn). For "failed",
  // partial < 1 leaves the stroke incomplete so the gesture reads
  // as abandoned.
  const finalOffset =
    pathLength !== null && meta.partial !== undefined
      ? pathLength * (1 - meta.partial)
      : 0

  const stroke = SIGIL_COLOR_VARS[meta.color]

  return (
    <motion.svg
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      width={VIEW_SIZE}
      height={VIEW_SIZE}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
      }}
      // No exit prop — the keyframe animation already fades to 0
      // before the setTimeout dismisses the sigil, so exit would be
      // a 0→0 no-op.
      transition={{
        duration: totalSigilDurationMs(meta) / 1000,
        // Keyframe times map to: [immediate fade-in, full opacity
        // through draw + hold, fade-out at the end].
        times: [
          0,
          Math.min(0.1, meta.drawMs / totalSigilDurationMs(meta)),
          (meta.drawMs + meta.holdMs) / totalSigilDurationMs(meta),
          1,
        ],
        ease: 'linear',
      }}
      style={{
        // Soft ember glow around the drawn stroke so the gesture has
        // presence against the dark chat bg without thickening the
        // stroke itself. Danger uses a red-tinted glow.
        filter:
          meta.color === 'danger'
            ? 'drop-shadow(0 0 3px rgba(229,72,77,0.55))'
            : 'drop-shadow(0 0 3px rgba(255,107,26,0.55))',
      }}
    >
      <motion.path
        ref={pathRef}
        d={meta.path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        // Once we know the path length, set dasharray / initial
        // dashoffset to trace the stroke. While length is null
        // (first render before useEffect runs), fall back to a
        // large value so the stroke isn't visible yet.
        style={{
          strokeDasharray: pathLength ?? 1000,
          strokeDashoffset: pathLength ?? 1000,
        }}
        animate={
          pathLength === null
            ? undefined
            : reducedMotion
              ? { strokeDashoffset: finalOffset }
              : { strokeDashoffset: finalOffset }
        }
        transition={{
          duration: reducedMotion ? 0 : meta.drawMs / 1000,
          ease: [0.22, 0.61, 0.36, 1],
        }}
      />
      {/* Thinking spiral trails a tiny ember dot at the tip of the
          stroke — a "settling" flourish. Only for sigils that opt
          in via meta.tail AND only on browsers that support
          offset-path (older Safari silently no-ops it, which looks
          worse than the spiral alone). */}
      {meta.tail &&
        pathLength !== null &&
        !reducedMotion &&
        SUPPORTS_OFFSET_PATH && (
        <motion.circle
          r={1.1}
          fill={stroke}
          initial={{ opacity: 0 }}
          animate={{
            offsetDistance: ['0%', '100%'],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: meta.drawMs / 1000,
            ease: [0.22, 0.61, 0.36, 1],
            times: [0, 0.1, 0.9, 1],
          }}
          style={{
            offsetPath: `path('${meta.path}')`,
            offsetRotate: '0deg',
          }}
        />
      )}
    </motion.svg>
  )
}
