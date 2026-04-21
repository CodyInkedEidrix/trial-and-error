// ──────────────────────────────────────────────────────────────────────
// Config panels — one per EyeConfig section.
//
// Each panel takes its slice of config and an onChange updater. The
// parent (EyePlayground) composes them over the full liveConfig.
// ──────────────────────────────────────────────────────────────────────

import type {
  BlinkConfig,
  BlinkStateMult,
  BreathConfig,
  BreathStateMult,
  CursorTrackingConfig,
  EyeColors,
  EyeConfig,
  EyeState,
  LookAroundConfig,
  MutedConfig,
  ReactionConfig,
  ReactionName,
  SizeDegradationConfig,
  SpeakingPulseConfig,
  ThinkingConfig,
} from '../eye-config'
import {
  CollapsibleGroup,
  ColorInput,
  Slider,
  Subsection,
  Toggle,
} from './controls'

const STATES: EyeState[] = ['idle', 'thinking', 'speaking', 'muted']
const REACTION_NAMES: ReactionName[] = [
  'greeting',
  'acknowledge',
  'noticed',
  'processing',
  'completion',
  'handoff',
  'uncertainty',
]

const ms = (v: number) => `${Math.round(v)}ms`
const sec = (v: number) => `${v.toFixed(2)}s`
const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const mult = (v: number) => `${v.toFixed(2)}×`
const px = (v: number) => `${Math.round(v)}px`
const units = (v: number) => `${v.toFixed(1)}u`

// ──────────────────────────────────────────────────────────────────────
// Breath
// ──────────────────────────────────────────────────────────────────────

export function BreathPanel({
  config,
  onChange,
}: {
  config: BreathConfig
  onChange: (v: BreathConfig) => void
}) {
  const setMod = (state: EyeState, next: BreathStateMult) =>
    onChange({
      ...config,
      stateModifiers: { ...config.stateModifiers, [state]: next },
    })

  return (
    <CollapsibleGroup title="Breath" subtitle="Layer 1 — ambient iris pulse">
      <Slider
        label="Base rate"
        value={config.baseRate}
        min={1}
        max={10}
        step={0.1}
        format={sec}
        onChange={(v) => onChange({ ...config, baseRate: v })}
      />
      <Slider
        label="Base depth"
        value={config.baseDepth}
        min={0}
        max={0.08}
        step={0.002}
        format={pct}
        onChange={(v) => onChange({ ...config, baseDepth: v })}
      />
      {STATES.map((s) => (
        <Subsection key={s} title={s}>
          <Slider
            label="Rate mult"
            value={config.stateModifiers[s].rateMult}
            min={0.3}
            max={3}
            step={0.05}
            format={mult}
            onChange={(v) =>
              setMod(s, { ...config.stateModifiers[s], rateMult: v })
            }
          />
          <Slider
            label="Depth mult"
            value={config.stateModifiers[s].depthMult}
            min={0}
            max={2}
            step={0.05}
            format={mult}
            onChange={(v) =>
              setMod(s, { ...config.stateModifiers[s], depthMult: v })
            }
          />
        </Subsection>
      ))}
    </CollapsibleGroup>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Blinks
// ──────────────────────────────────────────────────────────────────────

export function BlinksPanel({
  config,
  onChange,
}: {
  config: BlinkConfig
  onChange: (v: BlinkConfig) => void
}) {
  const setMod = (state: EyeState, next: BlinkStateMult) =>
    onChange({
      ...config,
      stateModifiers: { ...config.stateModifiers, [state]: next },
    })

  return (
    <CollapsibleGroup
      title="Blinks"
      subtitle="Layer 2 — irregular eyelid cycles"
    >
      <Slider
        label="Min interval"
        value={config.minInterval}
        min={1}
        max={15}
        step={0.5}
        format={sec}
        onChange={(v) => onChange({ ...config, minInterval: v })}
      />
      <Slider
        label="Max interval"
        value={config.maxInterval}
        min={2}
        max={30}
        step={0.5}
        format={sec}
        onChange={(v) => onChange({ ...config, maxInterval: v })}
      />
      <Slider
        label="Close duration"
        value={config.closeDuration}
        min={40}
        max={400}
        step={10}
        format={ms}
        onChange={(v) => onChange({ ...config, closeDuration: v })}
      />
      <Slider
        label="Open duration"
        value={config.openDuration}
        min={40}
        max={500}
        step={10}
        format={ms}
        onChange={(v) => onChange({ ...config, openDuration: v })}
      />
      <Slider
        label="Double chance"
        value={config.doubleChance}
        min={0}
        max={0.5}
        step={0.01}
        format={pct}
        onChange={(v) => onChange({ ...config, doubleChance: v })}
      />
      <Slider
        label="Long chance"
        value={config.longChance}
        min={0}
        max={0.3}
        step={0.01}
        format={pct}
        onChange={(v) => onChange({ ...config, longChance: v })}
      />
      <Slider
        label="Long duration"
        value={config.longDuration}
        min={150}
        max={1000}
        step={25}
        format={ms}
        onChange={(v) => onChange({ ...config, longDuration: v })}
      />
      {STATES.map((s) => (
        <Subsection key={s} title={s}>
          <Slider
            label="Frequency mult"
            value={config.stateModifiers[s].frequencyMult}
            min={0}
            max={3}
            step={0.05}
            format={mult}
            onChange={(v) =>
              setMod(s, {
                ...config.stateModifiers[s],
                frequencyMult: v,
              })
            }
          />
          <Slider
            label="Close mult"
            value={config.stateModifiers[s].closeMult}
            min={0.3}
            max={3}
            step={0.05}
            format={mult}
            onChange={(v) =>
              setMod(s, { ...config.stateModifiers[s], closeMult: v })
            }
          />
        </Subsection>
      ))}
    </CollapsibleGroup>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Look-Around
// ──────────────────────────────────────────────────────────────────────

export function LookAroundPanel({
  config,
  onChange,
}: {
  config: LookAroundConfig
  onChange: (v: LookAroundConfig) => void
}) {
  return (
    <CollapsibleGroup
      title="Look-around"
      subtitle="Layer 3 — idle drift when cursor is still"
    >
      <Slider
        label="Min interval"
        value={config.minInterval}
        min={2}
        max={60}
        step={1}
        format={sec}
        onChange={(v) => onChange({ ...config, minInterval: v })}
      />
      <Slider
        label="Max interval"
        value={config.maxInterval}
        min={5}
        max={90}
        step={1}
        format={sec}
        onChange={(v) => onChange({ ...config, maxInterval: v })}
      />
      <Slider
        label="Max distance"
        value={config.maxDistance}
        min={1}
        max={14}
        step={0.5}
        format={units}
        onChange={(v) => onChange({ ...config, maxDistance: v })}
      />
      <Slider
        label="Spring stiffness"
        value={config.springStiffness}
        min={20}
        max={400}
        step={5}
        format={(v) => v.toFixed(0)}
        onChange={(v) => onChange({ ...config, springStiffness: v })}
      />
      <Slider
        label="Spring damping"
        value={config.springDamping}
        min={4}
        max={40}
        step={1}
        format={(v) => v.toFixed(0)}
        onChange={(v) => onChange({ ...config, springDamping: v })}
      />
      <Slider
        label="Hold duration"
        value={config.holdDuration}
        min={100}
        max={2000}
        step={50}
        format={ms}
        onChange={(v) => onChange({ ...config, holdDuration: v })}
      />
      <Slider
        label="Return delay"
        value={config.returnDelay}
        min={0}
        max={1500}
        step={50}
        format={ms}
        onChange={(v) => onChange({ ...config, returnDelay: v })}
      />
    </CollapsibleGroup>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Cursor Tracking
// ──────────────────────────────────────────────────────────────────────

export function CursorTrackingPanel({
  config,
  onChange,
}: {
  config: CursorTrackingConfig
  onChange: (v: CursorTrackingConfig) => void
}) {
  return (
    <CollapsibleGroup
      title="Cursor tracking"
      subtitle="Layer 3 extension — gaze follows cursor"
    >
      <Toggle
        label="Enabled"
        value={config.enabled}
        onChange={(v) => onChange({ ...config, enabled: v })}
      />
      <Slider
        label="Cursor range"
        value={config.cursorRange}
        min={150}
        max={800}
        step={10}
        format={px}
        onChange={(v) => onChange({ ...config, cursorRange: v })}
      />
      <Slider
        label="Idle threshold"
        value={config.idleThreshold}
        min={500}
        max={6000}
        step={100}
        format={ms}
        onChange={(v) => onChange({ ...config, idleThreshold: v })}
      />
      <Slider
        label="Small size amp ceiling"
        value={config.smallSizeAmpCeiling}
        min={1}
        max={5}
        step={0.1}
        format={mult}
        onChange={(v) => onChange({ ...config, smallSizeAmpCeiling: v })}
      />
      <Slider
        label="Small size stiffness ceiling"
        value={config.smallSizeStiffnessCeiling}
        min={1}
        max={3.5}
        step={0.05}
        format={mult}
        onChange={(v) =>
          onChange({ ...config, smallSizeStiffnessCeiling: v })
        }
      />
    </CollapsibleGroup>
  )
}

// ──────────────────────────────────────────────────────────────────────
// States (Speaking / Thinking / Muted)
// ──────────────────────────────────────────────────────────────────────

export function StatesPanel({
  config,
  onChange,
}: {
  config: EyeConfig['states']
  onChange: (v: EyeConfig['states']) => void
}) {
  const setSpeaking = (next: SpeakingPulseConfig) =>
    onChange({ ...config, speaking: next })
  const setThinking = (next: ThinkingConfig) =>
    onChange({ ...config, thinking: next })
  const setMuted = (next: MutedConfig) =>
    onChange({ ...config, muted: next })

  return (
    <CollapsibleGroup
      title="States"
      subtitle="Layer 4 — per-state iris motion modulation"
    >
      <Subsection title="Speaking">
        <Slider
          label="Pulse rate"
          value={config.speaking.rate}
          min={0.2}
          max={2}
          step={0.05}
          format={sec}
          onChange={(v) => setSpeaking({ ...config.speaking, rate: v })}
        />
        <Slider
          label="Pulse depth"
          value={config.speaking.depth}
          min={0}
          max={0.1}
          step={0.005}
          format={pct}
          onChange={(v) => setSpeaking({ ...config.speaking, depth: v })}
        />
      </Subsection>
      <Subsection title="Thinking">
        <Slider
          label="Iris contraction"
          value={config.thinking.irisContraction}
          min={0.7}
          max={1}
          step={0.01}
          format={mult}
          onChange={(v) =>
            setThinking({ ...config.thinking, irisContraction: v })
          }
        />
        <Slider
          label="Circuit intensity"
          value={config.thinking.circuitIntensity}
          min={0}
          max={3}
          step={0.05}
          format={mult}
          onChange={(v) =>
            setThinking({ ...config.thinking, circuitIntensity: v })
          }
        />
        <Slider
          label="Circuit speed mult"
          value={config.thinking.circuitSpeedMult}
          min={0.5}
          max={3}
          step={0.05}
          format={mult}
          onChange={(v) =>
            setThinking({ ...config.thinking, circuitSpeedMult: v })
          }
        />
      </Subsection>
      <Subsection title="Muted">
        <Slider
          label="Opacity"
          value={config.muted.opacity}
          min={0}
          max={1}
          step={0.02}
          format={pct}
          onChange={(v) => setMuted({ ...config.muted, opacity: v })}
        />
      </Subsection>
    </CollapsibleGroup>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Reactions (duration only — keyframe internals are hardcoded in hook)
// ──────────────────────────────────────────────────────────────────────

export function ReactionsPanel({
  config,
  onChange,
}: {
  config: Record<ReactionName, ReactionConfig>
  onChange: (v: Record<ReactionName, ReactionConfig>) => void
}) {
  const setReaction = (name: ReactionName, next: ReactionConfig) =>
    onChange({ ...config, [name]: next })

  return (
    <CollapsibleGroup
      title="Reactions"
      subtitle="Layer 5 — one-shot interrupt durations"
    >
      <p className="font-body text-[10px] text-text-tertiary py-1">
        Processing runs indefinitely (duration = null). Only duration is
        tunable per reaction — keyframe internals are hardcoded in the
        hook and would need extraction in a follow-up chapter.
      </p>
      {REACTION_NAMES.map((r) => {
        const reactionConfig = config[r]
        if (reactionConfig.duration === null) {
          return (
            <div key={r} className="flex items-center justify-between py-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
                {r}
              </span>
              <span className="font-mono text-[10px] text-text-tertiary">
                indefinite
              </span>
            </div>
          )
        }
        return (
          <Slider
            key={r}
            label={r}
            value={reactionConfig.duration}
            min={150}
            max={3000}
            step={50}
            format={ms}
            onChange={(v) => setReaction(r, { duration: v })}
          />
        )
      })}
    </CollapsibleGroup>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Colors
// ──────────────────────────────────────────────────────────────────────

export function ColorsPanel({
  config,
  onChange,
}: {
  config: EyeColors
  onChange: (v: EyeColors) => void
}) {
  const set = (key: keyof EyeColors, value: string) =>
    onChange({ ...config, [key]: value })

  return (
    <CollapsibleGroup
      title="Colors"
      subtitle="Layer 6 — palette for iris, glow, frame, background"
    >
      <p className="font-body text-[10px] text-text-tertiary py-1">
        Accepts any CSS color —{' '}
        <code className="text-text-secondary">#hex</code>,{' '}
        <code className="text-text-secondary">rgba(…)</code>, or{' '}
        <code className="text-text-secondary">var(--token)</code>.
      </p>
      {(Object.keys(config) as (keyof EyeColors)[]).map((key) => (
        <ColorInput
          key={key}
          label={key}
          value={config[key]}
          onChange={(v) => set(key, v)}
        />
      ))}
    </CollapsibleGroup>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Size Degradation
// ──────────────────────────────────────────────────────────────────────

export function SizeDegradationPanel({
  config,
  onChange,
}: {
  config: SizeDegradationConfig
  onChange: (v: SizeDegradationConfig) => void
}) {
  return (
    <CollapsibleGroup
      title="Size degradation"
      subtitle="What hides at small sizes"
    >
      <Slider
        label="Small threshold"
        value={config.smallThreshold}
        min={16}
        max={128}
        step={4}
        format={px}
        onChange={(v) => onChange({ ...config, smallThreshold: v })}
      />
      <Toggle
        label="Circuits visible below"
        value={config.circuitsVisibleBelow}
        onChange={(v) => onChange({ ...config, circuitsVisibleBelow: v })}
      />
      <Toggle
        label="Glow blur below"
        value={config.glowBlurBelow}
        onChange={(v) => onChange({ ...config, glowBlurBelow: v })}
      />
    </CollapsibleGroup>
  )
}
