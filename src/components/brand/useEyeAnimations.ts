import {
  animate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import type { AnimationPlaybackControls, MotionValue } from 'framer-motion'
import type { RefObject } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type {
  BlinkConfig,
  BreathConfig,
  EyeConfig,
  EyeState,
  LookAroundConfig,
  ReactionName,
} from './eye-config'
import { defaultConfig, mergeConfig } from './eye-config'

// ──────────────────────────────────────────────────────────────────────
// Layer 1 — Ambient Breath
//
// A slow scale pulse on the iris. Loops forever (even in Muted, just
// slower and shallower). Returns a MotionValue for the iris scale.
// Reduced motion = static 1.0.
// ──────────────────────────────────────────────────────────────────────

function useBreath(
  state: EyeState,
  config: BreathConfig,
  reduced: boolean
): MotionValue<number> {
  const scale = useMotionValue(1)

  useEffect(() => {
    if (reduced) {
      scale.set(1)
      return
    }
    const modifier = config.stateModifiers[state]
    const rate = config.baseRate * modifier.rateMult
    const depth = config.baseDepth * modifier.depthMult
    const controls = animate(scale, [1, 1 + depth, 1], {
      duration: rate,
      repeat: Infinity,
      ease: 'easeInOut',
    })
    return () => controls.stop()
  }, [state, config, reduced, scale])

  return scale
}

// ──────────────────────────────────────────────────────────────────────
// Layer 2 — Blinks
//
// Irregular intervals (3–8s by default), occasional double-blinks
// (~15%) and long-blinks (~8%). Returns a MotionValue for the eyelid
// scaleY (0 = open, 1 = closed). Cleans up all scheduled timers on
// unmount or state change.
// ──────────────────────────────────────────────────────────────────────

function useBlinks(
  state: EyeState,
  config: BlinkConfig,
  reduced: boolean
): MotionValue<number> {
  const eyelidScale = useMotionValue(0)

  useEffect(() => {
    if (reduced) {
      eyelidScale.set(0)
      return
    }
    const modifier = config.stateModifiers[state]
    if (modifier.frequencyMult === 0) {
      // Muted: no blinks, eyes stay open
      eyelidScale.set(0)
      return
    }

    let cancelled = false
    const timers: number[] = []

    // Sleep helper that registers its timer for cleanup
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, ms)
        timers.push(t)
      })

    const performBlink = async (
      closeMs: number,
      holdMs: number,
      openMs: number
    ): Promise<void> => {
      if (cancelled) return
      await animate(eyelidScale, 1, {
        duration: closeMs / 1000,
        ease: 'easeIn',
      })
      if (cancelled) return
      if (holdMs > 0) await sleep(holdMs)
      if (cancelled) return
      await animate(eyelidScale, 0, {
        duration: openMs / 1000,
        ease: 'easeOut',
      })
    }

    const scheduleNext = async () => {
      if (cancelled) return
      const baseInterval =
        config.minInterval +
        Math.random() * (config.maxInterval - config.minInterval)
      const interval = baseInterval / modifier.frequencyMult

      await sleep(interval * 1000)
      if (cancelled) return

      const closeMs = config.closeDuration * modifier.closeMult
      const r = Math.random()

      if (r < config.longChance) {
        // long blink — eye stays closed longer
        await performBlink(closeMs, config.longDuration, config.openDuration)
      } else if (r < config.longChance + config.doubleChance) {
        // double blink — two blinks ~180ms apart
        await performBlink(closeMs, 0, config.openDuration)
        if (cancelled) return
        await sleep(180)
        if (cancelled) return
        await performBlink(closeMs, 0, config.openDuration)
      } else {
        // single blink
        await performBlink(closeMs, 0, config.openDuration)
      }

      if (!cancelled) scheduleNext()
    }

    scheduleNext()

    return () => {
      cancelled = true
      timers.forEach((t) => clearTimeout(t))
    }
  }, [state, config, reduced, eyelidScale])

  return eyelidScale
}

// ──────────────────────────────────────────────────────────────────────
// Layer 3 — Gaze (cursor-aware + idle drift fallback)
//
// The Eye's iris is driven by a spring that follows a `target` motion
// value. Two behaviors set the target:
//
//   1. Cursor tracking — mousemove updates the target toward the
//      cursor's direction relative to the Eye's bounding rect, clamped
//      to config.maxDistance. Active in `idle` and `speaking` states
//      (the Eye "watches" the user in both conversational states).
//
//   2. Idle drift — if the cursor has been still for 2.5s and we're in
//      Idle state, a random off-center drift fires at config intervals.
//      When the cursor moves again, tracking resumes automatically;
//      the spring smoothly transitions from whatever position the drift
//      left it at.
//
// `thinking` and `muted` states suppress both behaviors (iris centered).
// ──────────────────────────────────────────────────────────────────────

interface LookAroundResult {
  irisX: MotionValue<number>
  irisY: MotionValue<number>
}

function useLookAround(
  state: EyeState,
  config: LookAroundConfig,
  reduced: boolean,
  size: number,
  svgRef: RefObject<SVGSVGElement | null>
): LookAroundResult {
  const targetX = useMotionValue(0)
  const targetY = useMotionValue(0)
  // Size-proportional spring tuning — smaller Eyes get stiffer springs
  // so the iris catches up fast enough to read at tiny scale, but the
  // tuning scales smoothly rather than a binary switch so intermediate
  // sizes (40px, 48px) don't overshoot.
  const stiffnessMult = Math.max(1, Math.min(1.8, 48 / size))
  const dampingReduction = size < 64 ? 2 : 4
  const springStiff = config.springStiffness * stiffnessMult
  const springDamp = Math.max(8, config.springDamping - dampingReduction)
  const irisX = useSpring(targetX, {
    stiffness: springStiff,
    damping: springDamp,
    mass: 0.75,
  })
  const irisY = useSpring(targetY, {
    stiffness: springStiff,
    damping: springDamp,
    mass: 0.75,
  })

  useEffect(() => {
    // Thinking and Muted suppress gaze entirely — iris centered
    if (reduced || state === 'thinking' || state === 'muted') {
      targetX.set(0)
      targetY.set(0)
      return
    }

    let cancelled = false
    const timers: number[] = []
    // Size-proportional amplification. At 24px the iris is ~4 rendered
    // pixels so we need 2.5× to make tracking visible; at 40px we only
    // need 1.6×; at 64px+ we need none. Smooth scaling prevents the
    // over-tracking that happens with a binary small/large switch.
    const sizeAmp = Math.max(1, Math.min(2.5, 64 / size))
    const maxOffset = config.maxDistance * sizeAmp
    // Cursor pixel range scales with Eye size — smaller Eyes in corners
    // need full tilt from nearby cursor positions.
    const cursorRange = Math.max(200, Math.min(400, size * 6))
    // Idle timeout — cursor still for this long = fall back to idle drift
    const idleThreshold = 2500

    // Start lastMoveTime "fresh" so we don't trigger idle drift
    // immediately on mount
    let lastMoveTime = Date.now()

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, ms)
        timers.push(t)
      })

    const handleMouseMove = (e: MouseEvent) => {
      if (cancelled || !svgRef.current) return
      lastMoveTime = Date.now()
      const rect = svgRef.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const strength = Math.min(dist, cursorRange) / cursorRange
      const angle = Math.atan2(dy, dx)
      targetX.set(Math.cos(angle) * strength * maxOffset)
      targetY.set(Math.sin(angle) * strength * maxOffset)
    }

    const handleMouseLeave = () => {
      if (cancelled) return
      // Cursor left the window — drift to center and let idle take over
      targetX.set(0)
      targetY.set(0)
      lastMoveTime = 0 // force idle drift to kick in quickly
    }

    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)

    // Idle drift loop — only runs in 'idle' state. In 'speaking', the
    // iris simply rests at wherever the cursor last directed it.
    const idleLoop = async () => {
      if (state !== 'idle') return

      while (!cancelled) {
        // Wait for cursor to be still for idleThreshold
        while (!cancelled && Date.now() - lastMoveTime < idleThreshold) {
          await sleep(400)
        }
        if (cancelled) return

        // Cursor is idle — perform one random drift
        const angle = Math.random() * Math.PI * 2
        const distance = maxOffset * (0.4 + Math.random() * 0.6)
        // Only apply if cursor is still idle (avoid racing a mousemove)
        if (Date.now() - lastMoveTime >= idleThreshold) {
          targetX.set(Math.cos(angle) * distance)
          targetY.set(Math.sin(angle) * distance)
        }

        await sleep(config.holdDuration)
        if (cancelled) return

        // Return to center if still idle
        if (Date.now() - lastMoveTime >= idleThreshold) {
          targetX.set(0)
          targetY.set(0)
        }

        // Wait random interval before next potential drift
        const interval =
          (config.minInterval +
            Math.random() * (config.maxInterval - config.minInterval)) *
          1000
        await sleep(interval)
      }
    }

    idleLoop()

    return () => {
      cancelled = true
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      timers.forEach((t) => clearTimeout(t))
    }
  }, [state, config, reduced, size, svgRef, targetX, targetY])

  return { irisX, irisY }
}

// ──────────────────────────────────────────────────────────────────────
// Layer 4 — State Expression (iris scale modulation)
//
// Drives the iris scale modulator:
//   - idle:     rests at 1.0 (no modulation beyond breath)
//   - thinking: smoothly contracts to config.thinking.irisContraction
//               and holds (iris reads "focused inward")
//   - speaking: pulses rhythmically at config.speaking.rate with
//               config.speaking.depth amplitude (iris reads "alive,
//               talking")
//   - muted:    rests at 1.0 (dimming is handled via opacity)
//
// This value composes multiplicatively with the breath scale in the
// main hook, so breathing and state-pulsing stack naturally.
// ──────────────────────────────────────────────────────────────────────

function useStateMotion(
  state: EyeState,
  statesConfig: EyeConfig['states'],
  reduced: boolean
): MotionValue<number> {
  const stateScale = useMotionValue(1)

  useEffect(() => {
    if (reduced) {
      // Reduced motion: snap to the static representation of the state
      stateScale.set(
        state === 'thinking' ? statesConfig.thinking.irisContraction : 1
      )
      return
    }

    if (state === 'thinking') {
      // Contract iris and hold
      const controls = animate(
        stateScale,
        statesConfig.thinking.irisContraction,
        { duration: 0.4, ease: 'easeOut' }
      )
      return () => controls.stop()
    }

    if (state === 'speaking') {
      // Rhythmic pulse between 1.0 and 1.0 + depth
      const controls = animate(
        stateScale,
        [1, 1 + statesConfig.speaking.depth, 1],
        {
          duration: statesConfig.speaking.rate,
          repeat: Infinity,
          ease: 'easeInOut',
        }
      )
      return () => controls.stop()
    }

    // idle and muted: smoothly return to 1
    const controls = animate(stateScale, 1, {
      duration: 0.3,
      ease: 'easeOut',
    })
    return () => controls.stop()
  }, [state, statesConfig, reduced, stateScale])

  return stateScale
}

// ──────────────────────────────────────────────────────────────────────
// Layer 5 — Reactions (one-shot interrupts)
//
// Each reaction is a mini animation program that modulates the iris
// scale, iris offset, glow opacity, and/or glow color for a bounded
// duration, then the modifiers return to neutral and onComplete fires.
//
// Values returned are ADDITIVE/MULTIPLICATIVE modifiers composed in
// the main hook:
//   - irisScaleMult   → multiplies the composed iris scale (default 1)
//   - irisXOffset     → added to look-around offset (default 0)
//   - irisYOffset     → added to look-around offset (default 0)
//   - glowOpacityMult → multiplies particle-field opacity (default 1)
//   - glowColorOverride → replaces state glow color when non-null
//
// New reactions interrupt any currently-running one (most responsive;
// queueing would feel laggy, ignoring would drop user signal).
// ──────────────────────────────────────────────────────────────────────

interface ReactionResult {
  irisScaleMult: MotionValue<number>
  irisXOffset: MotionValue<number>
  irisYOffset: MotionValue<number>
  glowOpacityMult: MotionValue<number>
  /** Multiplier for the scan line opacity (baseline 0.85 × this). */
  scanLineOpacityMult: MotionValue<number>
  /** Scale for the almond frame path (1 = normal, reactions can pulse). */
  frameScale: MotionValue<number>
  glowColorOverride: string | null
}

function useReactions(
  reaction: ReactionName | null | undefined,
  colors: EyeConfig['colors'],
  reduced: boolean,
  onComplete?: () => void
): ReactionResult {
  const irisScaleMult = useMotionValue(1)
  const irisXOffset = useMotionValue(0)
  const irisYOffset = useMotionValue(0)
  const glowOpacityMult = useMotionValue(1)
  const scanLineOpacityMult = useMotionValue(1)
  const frameScale = useMotionValue(1)
  const [glowColorOverride, setGlowColorOverride] = useState<string | null>(
    null
  )

  // Stable ref for onComplete so we don't re-fire the reaction effect
  // every time the parent happens to re-render a new callback.
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (!reaction) return

    // Reduced motion: jump to a visual approximation of the reaction's
    // end state, hold briefly, then fire complete. No animation.
    if (reduced) {
      if (reaction === 'uncertainty') {
        setGlowColorOverride(colors.glowUncertainty)
      }
      const t = window.setTimeout(() => {
        setGlowColorOverride(null)
        onCompleteRef.current?.()
      }, 200)
      return () => window.clearTimeout(t)
    }

    let cancelled = false
    const timers: number[] = []
    const active: AnimationPlaybackControls[] = []

    // Helper: track every animation so cleanup can stop them (critical
    // for Processing's repeat:Infinity loops, which would otherwise
    // leak and fight the reset when interrupted).
    const track = <T extends AnimationPlaybackControls>(a: T): T => {
      active.push(a)
      return a
    }

    const reset = (duration = 0.3) => {
      // Stop any in-flight animations before starting the return-to-neutral
      active.forEach((a) => a.stop())
      active.length = 0
      animate(irisScaleMult, 1, { duration, ease: 'easeOut' })
      animate(irisXOffset, 0, { duration, ease: 'easeOut' })
      animate(irisYOffset, 0, { duration, ease: 'easeOut' })
      animate(glowOpacityMult, 1, { duration, ease: 'easeOut' })
      animate(scanLineOpacityMult, 1, { duration, ease: 'easeOut' })
      animate(frameScale, 1, { duration, ease: 'easeOut' })
      setGlowColorOverride(null)
    }

    const run = async () => {
      switch (reaction) {
        case 'greeting': {
          await Promise.all([
            track(
              animate(irisScaleMult, [1, 1.12, 1.0], {
                duration: 0.9,
                ease: 'easeOut',
              })
            ),
            track(
              animate(frameScale, [1, 1.025, 1], {
                duration: 0.9,
                ease: 'easeOut',
              })
            ),
            track(
              animate(glowOpacityMult, [1, 1.7, 1.2], {
                duration: 0.7,
                ease: 'easeOut',
              })
            ),
          ])
          break
        }
        case 'acknowledge': {
          // "Got it" — a NOD. Iris dips down AND the glow brightens
          // meaningfully (0.85 → 1.0 clamp) so the reaction reads at
          // 24px where the Y dip is sub-pixel.
          await Promise.all([
            track(
              animate(irisYOffset, [0, 3.5, 0], {
                duration: 0.45,
                ease: 'easeInOut',
              })
            ),
            track(
              animate(glowOpacityMult, [1, 1.4, 1], {
                duration: 0.45,
                ease: 'easeInOut',
              })
            ),
            // Brief scan dim — gives the nod a "settling" feel distinct
            // from the bright Noticed flash
            track(
              animate(scanLineOpacityMult, [1, 0.75, 1], {
                duration: 0.45,
                ease: 'easeInOut',
              })
            ),
          ])
          break
        }
        case 'noticed': {
          const direction = Math.random() < 0.5 ? -6 : 6
          await Promise.all([
            track(
              animate(irisXOffset, [0, direction, 0], {
                duration: 0.22,
                ease: 'easeOut',
              })
            ),
            track(
              animate(scanLineOpacityMult, [1, 1.6, 1], {
                duration: 0.3,
                ease: 'easeOut',
              })
            ),
          ])
          break
        }
        case 'processing': {
          // "Working on it" — sustained rhythmic activity. Pulses go
          // BELOW baseline as well as above so the visible oscillation
          // is meaningful (not clamped). Three overlapping loops at
          // different rhythms create a clearly busy "thinking" feel.
          track(
            animate(scanLineOpacityMult, [0.7, 1.5, 0.7], {
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
            })
          )
          track(
            animate(glowOpacityMult, [0.9, 1.35, 0.9], {
              duration: 2.0,
              repeat: Infinity,
              ease: 'easeInOut',
            })
          )
          // Subtle iris throb on its own rhythm for large-size variety
          track(
            animate(irisScaleMult, [1, 1.03, 1], {
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeInOut',
            })
          )
          return // skip onComplete and auto-reset
        }
        case 'completion': {
          await Promise.all([
            track(
              animate(irisScaleMult, [1, 1.1, 1.0], {
                duration: 1.0,
                ease: 'easeOut',
              })
            ),
            track(
              animate(frameScale, [1, 1.02, 1], {
                duration: 1.0,
                ease: 'easeOut',
              })
            ),
            track(
              animate(scanLineOpacityMult, [1, 1.7, 1], {
                duration: 0.6,
                ease: 'easeOut',
              })
            ),
            track(
              animate(glowOpacityMult, [1, 1.5, 0.95, 1], {
                duration: 1.2,
                ease: 'easeInOut',
              })
            ),
          ])
          break
        }
        case 'handoff': {
          await Promise.all([
            track(
              animate(irisScaleMult, [1, 0.94, 0.97], {
                duration: 0.7,
                ease: 'easeOut',
              })
            ),
            track(
              animate(glowOpacityMult, [1, 0.7, 0.85], {
                duration: 0.7,
                ease: 'easeOut',
              })
            ),
            track(
              animate(scanLineOpacityMult, [1, 0.6, 0.85], {
                duration: 0.7,
                ease: 'easeOut',
              })
            ),
            track(
              animate(irisXOffset, 0, { duration: 0.2, ease: 'easeOut' })
            ),
            track(
              animate(irisYOffset, 0, { duration: 0.2, ease: 'easeOut' })
            ),
          ])
          break
        }
        case 'uncertainty': {
          setGlowColorOverride(colors.glowUncertainty)
          await Promise.all([
            track(
              animate(irisScaleMult, [1, 0.92, 0.92, 1], {
                duration: 1.0,
                times: [0, 0.2, 0.8, 1],
                ease: 'easeInOut',
              })
            ),
            track(
              animate(
                irisXOffset,
                [0, -0.6, 0.6, -0.5, 0.5, -0.3, 0.3, 0],
                { duration: 0.8, ease: 'easeInOut' }
              )
            ),
          ])
          setGlowColorOverride(null)
          break
        }
      }
      if (!cancelled) {
        reset()
        onCompleteRef.current?.()
      }
    }

    run()

    return () => {
      cancelled = true
      timers.forEach((t) => clearTimeout(t))
      // Snap modifiers back to neutral so the state layer takes over cleanly
      reset(0.2)
    }
  }, [
    reaction,
    reduced,
    colors,
    irisScaleMult,
    irisXOffset,
    irisYOffset,
    glowOpacityMult,
    scanLineOpacityMult,
    frameScale,
  ])

  return {
    irisScaleMult,
    irisXOffset,
    irisYOffset,
    glowOpacityMult,
    scanLineOpacityMult,
    frameScale,
    glowColorOverride,
  }
}

// ──────────────────────────────────────────────────────────────────────
// Composition hook — returns everything the component needs to render
//
// Currently wires Layer 1 (breath) and Layer 2 (blinks). Later layers
// (look-around, state expression, reactions, tinting) plug in here
// without changing the component's consumption pattern.
// ──────────────────────────────────────────────────────────────────────

export interface EyeAnimationsState {
  config: EyeConfig
  reduced: boolean
  svgUid: string
  effectiveSmall: boolean
  /** Iris scale — breath × state × reaction, composed multiplicatively. */
  irisScale: MotionValue<number>
  /** Iris X — look-around + reaction offset (additive). */
  irisX: MotionValue<number>
  /** Iris Y — look-around + reaction offset (additive). */
  irisY: MotionValue<number>
  eyelidScale: MotionValue<number>
  /** Target opacity for the whole Eye (muted drops to ~0.4). */
  eyeOpacity: number
  /** Multiplier for the particle glow opacity (reactions modulate). */
  glowOpacityMult: MotionValue<number>
  /** Multiplier for the scan line opacity (reactions flash/dim it). */
  scanLineOpacityMult: MotionValue<number>
  /** Scale for the almond frame path (reactions pulse it outward). */
  frameScale: MotionValue<number>
  /** Smoothly-animated glow color. Framer Motion interpolates between
   *  state colors and reaction overrides (Layer 6 — expression tinting). */
  glowColor: MotionValue<string>
}

export interface UseEyeAnimationsOptions {
  state: EyeState
  size: number
  reaction?: ReactionName | null
  onReactionComplete?: () => void
  configOverride?: Partial<EyeConfig>
  /** Ref to the rendered SVG — enables cursor-aware gaze tracking. */
  svgRef: RefObject<SVGSVGElement | null>
}

export function useEyeAnimations(
  options: UseEyeAnimationsOptions
): EyeAnimationsState {
  const {
    state,
    size,
    reaction,
    onReactionComplete,
    configOverride,
    svgRef,
  } = options
  // Memoize so effect deps stay stable across renders — prevents the
  // gaze useEffect from tearing down and re-adding its mousemove
  // listener on every render, which was breaking cursor tracking on
  // tightly-scoped mounts like the chat header.
  const config = useMemo(
    () => mergeConfig(defaultConfig, configOverride),
    [configOverride]
  )
  const reduced = useReducedMotion() ?? false
  const svgUid = useId()
  const effectiveSmall = size < config.sizeDegradation.smallThreshold

  const breathScale = useBreath(state, config.breath, reduced)
  const stateScale = useStateMotion(state, config.states, reduced)
  const reactions = useReactions(
    reaction,
    config.colors,
    reduced,
    onReactionComplete
  )

  // Iris scale = breath × state × reaction (multiplicative). All three
  // layers can overlap (e.g., speaking pulse + greeting heartbeat
  // + breath) without fighting because they compose multiplicatively.
  const irisScale = useTransform(
    [breathScale, stateScale, reactions.irisScaleMult],
    ([b, s, r]: number[]) => b * s * r
  )

  const { irisX: lookX, irisY: lookY } = useLookAround(
    state,
    config.lookAround,
    reduced,
    size,
    svgRef
  )

  // Iris position = look-around + reaction offsets (additive)
  const irisX = useTransform(
    [lookX, reactions.irisXOffset],
    ([l, r]: number[]) => l + r
  )
  const irisY = useTransform(
    [lookY, reactions.irisYOffset],
    ([l, r]: number[]) => l + r
  )

  const eyelidScale = useBlinks(state, config.blinks, reduced)

  const eyeOpacity = state === 'muted' ? config.states.muted.opacity : 1

  // Layer 6 — Expression Tinting
  //
  // Smoothly animate the glow color between state colors (and reaction
  // overrides). Framer Motion's animate() interpolates rgba/hex colors
  // natively — we don't have to parse anything.
  const stateGlowColor =
    state === 'thinking'
      ? config.colors.glowThinking
      : state === 'speaking'
        ? config.colors.glowSpeaking
        : state === 'muted'
          ? config.colors.glowMuted
          : config.colors.glowIdle

  const targetGlowColor = reactions.glowColorOverride ?? stateGlowColor
  const glowColor = useMotionValue(stateGlowColor)

  useEffect(() => {
    const controls = animate(glowColor, targetGlowColor, {
      duration: reduced ? 0 : 0.25,
      ease: 'easeInOut',
    })
    return () => controls.stop()
  }, [targetGlowColor, glowColor, reduced])

  return {
    config,
    reduced,
    svgUid,
    effectiveSmall,
    irisScale,
    irisX,
    irisY,
    eyelidScale,
    eyeOpacity,
    glowOpacityMult: reactions.glowOpacityMult,
    scanLineOpacityMult: reactions.scanLineOpacityMult,
    frameScale: reactions.frameScale,
    glowColor,
  }
}
