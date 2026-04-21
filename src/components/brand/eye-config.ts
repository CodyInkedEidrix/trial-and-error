// ──────────────────────────────────────────────────────────────────────
// Eidrix Eye — config types and defaults
//
// Every tunable value lives here. The component reads from defaults
// (merged with any partial overrides from props). AC-08b's tuning
// playground will build live sliders that drive this same config.
//
// If you're tweaking feel, you're tweaking values in this file.
// ──────────────────────────────────────────────────────────────────────

export type EyeState = 'idle' | 'thinking' | 'speaking' | 'muted'

export type ReactionName =
  | 'greeting'
  | 'acknowledge'
  | 'noticed'
  | 'processing'
  | 'completion'
  | 'handoff'
  | 'uncertainty'

// ──────────────────────────────────────────────────────────────────────
// Layer configs
// ──────────────────────────────────────────────────────────────────────

export interface BreathStateMult {
  rateMult: number
  depthMult: number
}

export interface BreathConfig {
  /** seconds per full cycle */
  baseRate: number
  /** scale amplitude (0.02 = 2%) */
  baseDepth: number
  stateModifiers: Record<EyeState, BreathStateMult>
}

export interface BlinkStateMult {
  /** 0 disables blinks (used for muted) */
  frequencyMult: number
  closeMult: number
}

export interface BlinkConfig {
  /** min seconds between blinks */
  minInterval: number
  /** max seconds between blinks */
  maxInterval: number
  /** ms for eyelid to close */
  closeDuration: number
  /** ms for eyelid to open */
  openDuration: number
  /** 0-1 probability of a double blink */
  doubleChance: number
  /** 0-1 probability of a long blink */
  longChance: number
  /** ms eye stays closed for a long blink */
  longDuration: number
  stateModifiers: Record<EyeState, BlinkStateMult>
}

export interface LookAroundConfig {
  minInterval: number
  maxInterval: number
  /** max iris offset in SVG units (viewBox is 100×100) */
  maxDistance: number
  springStiffness: number
  springDamping: number
  /** ms iris holds off-center */
  holdDuration: number
  /** ms before returning to center */
  returnDelay: number
}

export interface SpeakingPulseConfig {
  rate: number
  depth: number
}

export interface ThinkingConfig {
  /** scale multiplier (0.92 = 8% smaller) */
  irisContraction: number
  circuitIntensity: number
  circuitSpeedMult: number
}

export interface MutedConfig {
  opacity: number
}

export interface ReactionConfig {
  /** ms. null = indefinite, runs until state change or new reaction */
  duration: number | null
}

export interface EyeColors {
  iris: string
  pupil: string
  hotCore: string
  glowIdle: string
  glowThinking: string
  glowSpeaking: string
  glowMuted: string
  glowUncertainty: string
  circuitStroke: string
  almondFrame: string
  /** Background color used for eyelids — should match the surround for
   *  a clean "eye closed" visual. */
  background: string
}

export interface SizeDegradationConfig {
  smallThreshold: number
  circuitsVisibleBelow: boolean
  glowBlurBelow: boolean
}

export interface EyeConfig {
  breath: BreathConfig
  blinks: BlinkConfig
  lookAround: LookAroundConfig
  states: {
    speaking: SpeakingPulseConfig
    thinking: ThinkingConfig
    muted: MutedConfig
  }
  reactions: Record<ReactionName, ReactionConfig>
  colors: EyeColors
  sizeDegradation: SizeDegradationConfig
}

// ──────────────────────────────────────────────────────────────────────
// defaultConfig — the initial Eidrix feel before AC-08b tuning
// ──────────────────────────────────────────────────────────────────────

export const defaultConfig: EyeConfig = {
  breath: {
    baseRate: 4.0,
    baseDepth: 0.02,
    stateModifiers: {
      idle: { rateMult: 1.0, depthMult: 1.0 },
      thinking: { rateMult: 1.2, depthMult: 0.8 },
      speaking: { rateMult: 0.9, depthMult: 0.5 },
      muted: { rateMult: 1.75, depthMult: 0.3 },
    },
  },
  blinks: {
    minInterval: 3,
    maxInterval: 8,
    closeDuration: 120,
    openDuration: 180,
    doubleChance: 0.15,
    longChance: 0.08,
    longDuration: 400,
    stateModifiers: {
      idle: { frequencyMult: 1.0, closeMult: 1.0 },
      thinking: { frequencyMult: 0.8, closeMult: 1.5 },
      speaking: { frequencyMult: 1.2, closeMult: 0.9 },
      muted: { frequencyMult: 0, closeMult: 1.0 },
    },
  },
  lookAround: {
    minInterval: 8,
    maxInterval: 20,
    maxDistance: 6,
    springStiffness: 80,
    springDamping: 14,
    holdDuration: 600,
    returnDelay: 200,
  },
  states: {
    speaking: {
      rate: 0.6,
      depth: 0.03,
    },
    thinking: {
      irisContraction: 0.92,
      circuitIntensity: 1.5,
      circuitSpeedMult: 1.3,
    },
    muted: {
      opacity: 0.4,
    },
  },
  reactions: {
    greeting: { duration: 1000 },
    acknowledge: { duration: 500 },
    noticed: { duration: 300 },
    processing: { duration: null },
    completion: { duration: 1200 },
    handoff: { duration: 800 },
    uncertainty: { duration: 1000 },
  },
  colors: {
    iris: 'var(--ember-500)',
    pupil: 'var(--obsidian-950)',
    hotCore: 'var(--ember-300)',
    glowIdle: 'rgba(255, 107, 26, 0.6)',
    glowThinking: 'rgba(132, 140, 200, 0.5)',
    glowSpeaking: 'rgba(255, 140, 60, 0.7)',
    glowMuted: 'rgba(180, 150, 120, 0.3)',
    glowUncertainty: 'rgba(59, 130, 246, 0.6)',
    circuitStroke: 'rgba(255, 107, 26, 0.4)',
    almondFrame: 'var(--ember-700)',
    background: 'var(--obsidian-900)',
  },
  sizeDegradation: {
    smallThreshold: 64,
    circuitsVisibleBelow: false,
    glowBlurBelow: false,
  },
}

// ──────────────────────────────────────────────────────────────────────
// mergeConfig — shallow-ish deep merge for Partial<EyeConfig> overrides
// ──────────────────────────────────────────────────────────────────────

export function mergeConfig(
  base: EyeConfig,
  override?: Partial<EyeConfig>
): EyeConfig {
  if (!override) return base
  return {
    breath: {
      ...base.breath,
      ...override.breath,
      stateModifiers: {
        ...base.breath.stateModifiers,
        ...(override.breath?.stateModifiers ?? {}),
      },
    },
    blinks: {
      ...base.blinks,
      ...override.blinks,
      stateModifiers: {
        ...base.blinks.stateModifiers,
        ...(override.blinks?.stateModifiers ?? {}),
      },
    },
    lookAround: { ...base.lookAround, ...override.lookAround },
    states: {
      speaking: { ...base.states.speaking, ...override.states?.speaking },
      thinking: { ...base.states.thinking, ...override.states?.thinking },
      muted: { ...base.states.muted, ...override.states?.muted },
    },
    reactions: { ...base.reactions, ...override.reactions },
    colors: { ...base.colors, ...override.colors },
    sizeDegradation: {
      ...base.sizeDegradation,
      ...override.sizeDegradation,
    },
  }
}
