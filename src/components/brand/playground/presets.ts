// ──────────────────────────────────────────────────────────────────────
// Eidrix Eye — Playground Presets
//
// Four built-in motion personalities for the Eye, plus localStorage
// utilities for custom presets. Each preset is a complete EyeConfig.
// ──────────────────────────────────────────────────────────────────────

import type { EyeConfig } from '../eye-config'
import { defaultConfig, mergeConfig } from '../eye-config'

export interface Preset {
  id: string
  name: string
  description: string
  config: EyeConfig
  builtin: boolean
}

// ──────────────────────────────────────────────────────────────────────
// Built-in presets
// ──────────────────────────────────────────────────────────────────────

/** Eidrix — the AC-08a defaults */
const eidrixPreset: Preset = {
  id: 'eidrix',
  name: 'Eidrix',
  description: 'Warm, confident, default AC-08a feel',
  config: defaultConfig,
  builtin: true,
}

/** Calm — slow, soft, zen mode */
const calmPreset: Preset = {
  id: 'calm',
  name: 'Calm',
  description: 'Slow, soft, minimal energy. Night reading.',
  config: {
    ...defaultConfig,
    breath: {
      ...defaultConfig.breath,
      baseRate: 5.8,
      baseDepth: 0.015,
    },
    blinks: {
      ...defaultConfig.blinks,
      minInterval: 5,
      maxInterval: 14,
      closeDuration: 180,
      openDuration: 260,
    },
    lookAround: {
      ...defaultConfig.lookAround,
      minInterval: 18,
      maxInterval: 40,
      maxDistance: 4,
    },
    cursorTracking: {
      ...defaultConfig.cursorTracking,
      smallSizeAmpCeiling: 1.8,
      idleThreshold: 3500,
    },
    states: {
      ...defaultConfig.states,
      speaking: { rate: 0.85, depth: 0.022 },
      thinking: {
        ...defaultConfig.states.thinking,
        irisContraction: 0.88,
      },
      muted: { opacity: 0.28 },
    },
    reactions: {
      ...defaultConfig.reactions,
      greeting: { duration: 1400 },
      acknowledge: { duration: 700 },
      completion: { duration: 1700 },
      handoff: { duration: 1100 },
      uncertainty: { duration: 1400 },
    },
    colors: {
      ...defaultConfig.colors,
      glowIdle: 'rgba(255, 107, 26, 0.45)',
    },
  },
  builtin: true,
}

/** Alert — fast, snappy, attentive */
const alertPreset: Preset = {
  id: 'alert',
  name: 'Alert',
  description: 'Fast, snappy, always attentive. Agent mode.',
  config: {
    ...defaultConfig,
    breath: {
      ...defaultConfig.breath,
      baseRate: 3.0,
      baseDepth: 0.025,
    },
    blinks: {
      ...defaultConfig.blinks,
      minInterval: 2,
      maxInterval: 5,
      closeDuration: 90,
      openDuration: 130,
    },
    lookAround: {
      ...defaultConfig.lookAround,
      minInterval: 4,
      maxInterval: 10,
      maxDistance: 8,
    },
    cursorTracking: {
      ...defaultConfig.cursorTracking,
      smallSizeAmpCeiling: 3.2,
      idleThreshold: 1500,
    },
    states: {
      ...defaultConfig.states,
      speaking: { rate: 0.45, depth: 0.04 },
      thinking: {
        ...defaultConfig.states.thinking,
        irisContraction: 0.95,
      },
      muted: { opacity: 0.5 },
    },
    reactions: {
      ...defaultConfig.reactions,
      greeting: { duration: 700 },
      acknowledge: { duration: 350 },
      noticed: { duration: 200 },
      completion: { duration: 800 },
      handoff: { duration: 500 },
      uncertainty: { duration: 700 },
    },
    colors: {
      ...defaultConfig.colors,
      glowIdle: 'rgba(255, 120, 40, 0.75)',
    },
  },
  builtin: true,
}

/** Focused — concentrated, internal, heads-down */
const focusedPreset: Preset = {
  id: 'focused',
  name: 'Focused',
  description: 'Concentrated, internal. Heads-down working.',
  config: {
    ...defaultConfig,
    breath: {
      ...defaultConfig.breath,
      baseRate: 4.5,
      baseDepth: 0.012,
    },
    blinks: {
      ...defaultConfig.blinks,
      minInterval: 5,
      maxInterval: 12,
      closeDuration: 140,
    },
    lookAround: {
      ...defaultConfig.lookAround,
      minInterval: 22,
      maxInterval: 45,
      maxDistance: 3,
    },
    cursorTracking: {
      ...defaultConfig.cursorTracking,
      smallSizeAmpCeiling: 1.5,
      idleThreshold: 3000,
    },
    states: {
      ...defaultConfig.states,
      speaking: { rate: 0.6, depth: 0.02 },
      thinking: {
        ...defaultConfig.states.thinking,
        irisContraction: 0.86,
      },
      muted: { opacity: 0.22 },
    },
    reactions: {
      ...defaultConfig.reactions,
      acknowledge: { duration: 600 },
      completion: { duration: 1000 },
    },
    colors: {
      ...defaultConfig.colors,
      glowIdle: 'rgba(255, 107, 26, 0.5)',
    },
  },
  builtin: true,
}

export const BUILTIN_PRESETS: Preset[] = [
  eidrixPreset,
  calmPreset,
  alertPreset,
  focusedPreset,
]

// ──────────────────────────────────────────────────────────────────────
// localStorage utilities
//
// Three keys:
//   - eidrix-eye-custom-presets      array of Preset (custom only)
//   - eidrix-eye-playground-current  latest liveConfig (auto-saved)
//   - eidrix-eye-playground-preset   active preset name, or null
//
// Every access wraps in try/catch — storage can be full, disabled, or
// SSR-absent. Silent failure is correct behavior.
// ──────────────────────────────────────────────────────────────────────

const CUSTOM_PRESETS_KEY = 'eidrix-eye-custom-presets'
const CURRENT_CONFIG_KEY = 'eidrix-eye-playground-current'
const CURRENT_PRESET_KEY = 'eidrix-eye-playground-preset'

export function loadCustomPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Preset[]
  } catch {
    return []
  }
}

export function saveCustomPresets(presets: Preset[]): void {
  try {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets))
  } catch {
    /* no-op */
  }
}

export function loadCurrentConfig(): EyeConfig | null {
  try {
    const raw = localStorage.getItem(CURRENT_CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Merge onto defaults so partial/legacy saves don't crash the hook.
    return mergeConfig(defaultConfig, parsed as Partial<EyeConfig>)
  } catch {
    return null
  }
}

export function saveCurrentConfig(config: EyeConfig): void {
  try {
    localStorage.setItem(CURRENT_CONFIG_KEY, JSON.stringify(config))
  } catch {
    /* no-op */
  }
}

export function loadCurrentPresetName(): string | null {
  try {
    return localStorage.getItem(CURRENT_PRESET_KEY)
  } catch {
    return null
  }
}

export function saveCurrentPresetName(name: string | null): void {
  try {
    if (name === null) localStorage.removeItem(CURRENT_PRESET_KEY)
    else localStorage.setItem(CURRENT_PRESET_KEY, name)
  } catch {
    /* no-op */
  }
}

// ──────────────────────────────────────────────────────────────────────
// TypeScript export formatter
// ──────────────────────────────────────────────────────────────────────

export function formatConfigAsTypeScript(config: EyeConfig): string {
  const json = JSON.stringify(config, null, 2)
  // Unquote object keys that are valid identifiers — turns "foo": into foo:
  const tsBody = json.replace(/"([a-zA-Z_$][\w$]*)":/g, '$1:')
  return `import type { EyeConfig } from './eye-config'\n\nexport const eyeConfig: EyeConfig = ${tsBody}\n`
}
