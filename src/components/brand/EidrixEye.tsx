import { motion } from 'framer-motion'
import { useRef } from 'react'
import { useEyeAnimations } from './useEyeAnimations'
import type { EidrixEyeProps } from './EidrixEye.types'

// ──────────────────────────────────────────────────────────────────────
// The Eidrix Eye
//
// A living animated SVG component. Six animation layers in total —
// this file renders the full visual structure and consumes whatever
// layers are currently wired via useEyeAnimations.
//
// Current layer status:
//   Layer 1 (Breath)            — wired
//   Layer 2 (Blinks)            — wired
//   Layer 3 (Look-around)       — not yet wired
//   Layer 4 (State Expression)  — glow color tinted per state; no motion yet
//   Layer 5 (Reactions)         — not yet wired
//   Layer 6 (Expression Tinting)— static per state only
// ──────────────────────────────────────────────────────────────────────

// Pointed almond — sleeker 2:1 aspect ratio with sharp corners at x=3
// and x=97, vertical plateaus at y=26 / y=74. Gives a predator-adjacent
// silhouette that reads "precision instrument" rather than "watching
// eye." This is the Eidrix signature.
const ALMOND_PATH =
  'M 3 50 C 22 30, 40 26, 50 26 C 60 26, 78 30, 97 50 C 78 70, 60 74, 50 74 C 40 74, 22 70, 3 50 Z'

// Ember particle field — deterministic golden-angle spiral. Same scatter
// every render, natural-looking without hand-placement. Replaces the
// solid glow halo with discrete points of light. Density and opacity
// fall off outward from the iris edge.
function generateEmberParticles() {
  const count = 44
  const minR = 16.5 // just outside the iris (r=16)
  const maxR = 38 // reaches most of the almond interior
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const result: { x: number; y: number; r: number; opacity: number }[] = []
  for (let i = 0; i < count; i++) {
    const t = i / count
    const radius = minR + (maxR - minR) * Math.sqrt(t)
    const angle = i * goldenAngle
    result.push({
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      r: 0.4 + (1 - t) * 0.9,
      opacity: 0.35 + (1 - t) * 0.55,
    })
  }
  return result
}

const EMBER_PARTICLES = generateEmberParticles()

export default function EidrixEye({
  state,
  size = 64,
  reaction,
  onReactionComplete,
  config: configOverride,
}: EidrixEyeProps) {
  // Ref to the SVG so the gaze hook can compute cursor-relative offset
  const svgRef = useRef<SVGSVGElement>(null)

  const {
    config,
    svgUid,
    effectiveSmall,
    irisScale,
    irisX,
    irisY,
    eyelidScale,
    eyeOpacity,
    glowOpacityMult,
    scanLineOpacityMult,
    frameScale,
    glowColor,
  } = useEyeAnimations({
    state,
    size,
    reaction,
    onReactionComplete,
    configOverride,
    svgRef,
  })

  const { colors } = config

  // useId returns something like ':r1:' — strip colons for valid DOM IDs
  const safeUid = svgUid.replace(/[:]/g, '')
  const clipId = `eye-clip-${safeUid}`
  const blurId = `eye-blur-${safeUid}`
  const irisGradId = `iris-grad-${safeUid}`

  // Layer 6 — glow color is now a MotionValue driven by the hook, which
  // smoothly interpolates between state colors and reaction overrides.
  // Particles and the small-size fallback inherit via CSS `color` +
  // `currentColor` — one motion value, all elements update together.

  return (
    <motion.svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      animate={{ opacity: eyeOpacity }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={ALMOND_PATH} />
        </clipPath>
        {/* Forge radial gradient — dark obsidian at the edge building to
            molten ember at the core. This is the "looking into a forge"
            interior. */}
        <radialGradient id={irisGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ember-300)" />
          <stop offset="28%" stopColor="var(--ember-500)" />
          <stop offset="65%" stopColor="var(--ember-700)" />
          <stop offset="100%" stopColor="var(--obsidian-900)" />
        </radialGradient>
        {!effectiveSmall && (
          <filter id={blurId}>
            <feGaussianBlur stdDeviation="3" />
          </filter>
        )}
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {/* Ember glow — particle field at large sizes (more alive,
            distinctly Eidrix), falls back to a solid halo at small
            sizes where 44 tiny dots would just read as noise. Wrapped
            in a motion.g so reactions can modulate overall brightness
            (greeting ignites, acknowledge briefly brightens, etc.). */}
        {effectiveSmall ? (
          // Wrap in motion.g with both `color` (drives currentColor in
          // children) and `opacity` (reaction-driven brightness). The
          // 0.6 attribute on the circle composes with group opacity.
          <motion.g style={{ color: glowColor, opacity: glowOpacityMult }}>
            <circle
              cx="50"
              cy="50"
              r="30"
              fill="currentColor"
              opacity="0.6"
            />
          </motion.g>
        ) : (
          // One motion value cascades to 44 particles via currentColor
          // inheritance — no need for 44 motion.circles.
          <motion.g style={{ color: glowColor, opacity: glowOpacityMult }}>
            {EMBER_PARTICLES.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill="currentColor"
                opacity={p.opacity}
              />
            ))}
          </motion.g>
        )}

        {/* Iris + pupil move as one group. Breath (Layer 1) drives the
            scale; look-around drift (Layer 3) drives x/y translation.
            They share the same transformOrigin so both animations
            compose correctly. */}
        <motion.g
          style={{
            scale: irisScale,
            x: irisX,
            y: irisY,
            transformOrigin: '50px 50px',
          }}
        >
          {/* Forge iris — radial gradient from dark edge to molten core. */}
          <circle cx="50" cy="50" r="16" fill={`url(#${irisGradId})`} />

          {/* Pupil — vertical lens shape with gentle points at top and
              bottom. A mini-almond rotated 90° from the outer frame,
              creating a self-similar formal echo at two scales. Reads
              as "animalistic + mystic" rather than "round circle." */}
          <path
            d="M 50 42 C 54 43.5, 55 46.5, 55 50 C 55 53.5, 54 56.5, 50 58 C 46 56.5, 45 53.5, 45 50 C 45 46.5, 46 43.5, 50 42 Z"
            fill={colors.pupil}
          />
        </motion.g>

        {/* Top eyelid — Layer 2 blinks drive scaleY (anchored at top) */}
        <motion.rect
          x="0"
          y="0"
          width="100"
          height="50"
          fill={colors.background}
          style={{ scaleY: eyelidScale, transformOrigin: '50px 0px' }}
        />

        {/* Bottom eyelid — anchored at bottom, mirrors the top */}
        <motion.rect
          x="0"
          y="50"
          width="100"
          height="50"
          fill={colors.background}
          style={{ scaleY: eyelidScale, transformOrigin: '50px 100px' }}
        />

        {/* Horizontal scan line — persists through blinks. The single
            element that's ALWAYS visible, open or closed. Cuts across
            the pointed pupil at its widest point. Reactions modulate
            its opacity (flash brighter, sustained pulse, or dim) via
            the wrapping group's opacity — effective = 0.85 × mult. */}
        <motion.g style={{ opacity: scanLineOpacityMult }}>
          <rect
            x="0"
            y="49.3"
            width="100"
            height="1.4"
            fill="var(--ember-300)"
            opacity="0.85"
          />
        </motion.g>
      </g>

      {/* Almond frame outline — drawn last so it sits above the eyelids.
          Reactions can pulse the frame outward (greeting, completion) to
          signal "reaching out" or "settling." Stroke width stays constant
          via vector-effect regardless of scale. */}
      <motion.path
        d={ALMOND_PATH}
        fill="none"
        stroke={colors.almondFrame}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        style={{ scale: frameScale, transformOrigin: '50px 50px' }}
      />
    </motion.svg>
  )
}
