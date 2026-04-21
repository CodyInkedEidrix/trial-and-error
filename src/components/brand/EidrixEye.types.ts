import type { EyeConfig, EyeState, ReactionName } from './eye-config'

export interface EidrixEyeProps {
  /** Current state machine state. */
  state: EyeState
  /** One-shot reaction to fire. Auto-clears after reaction duration. */
  reaction?: ReactionName | null
  /** Pixel size (both width and height). Default 64. */
  size?: number
  /** Optional config overrides. Merged with defaults. */
  config?: Partial<EyeConfig>
  /** Fires when a reaction finishes (or is interrupted by a new one). */
  onReactionComplete?: () => void
}

// Re-export the fundamental types so consumers can import everything
// from this file if they prefer a single entry point.
export type { EyeConfig, EyeState, ReactionName } from './eye-config'
