import { animate, AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Card from './ui/Card'
import Button from './ui/Button'

// ──────────────────────────────────────────────────────────────────────
// Eidrix motion signature
//
// A single custom cubic-bezier curve used as the default ease for all
// first-party entrance animations. Fast departure, gentle landing.
// ──────────────────────────────────────────────────────────────────────

// Framer Motion v12 wants cubic-bezier as a strict 4-tuple, not number[]
type CubicBezier = [number, number, number, number]

const emberEase: CubicBezier = [0.22, 1, 0.36, 1]

// ──────────────────────────────────────────────────────────────────────
// Easing library — named curves the user can pick between
// ──────────────────────────────────────────────────────────────────────

type NamedEase = 'easeOut' | 'easeIn' | 'easeInOut' | 'linear'
type Ease = NamedEase | CubicBezier

const easings: Record<string, Ease> = {
  emberEase: [0.22, 1, 0.36, 1],
  easeOut: 'easeOut',
  easeIn: 'easeIn',
  easeInOut: 'easeInOut',
  linear: 'linear',
  sharp: [0.4, 0, 0.2, 1],
  bouncy: [0.68, -0.55, 0.27, 1.55],
}

type EasingKey =
  | 'emberEase'
  | 'easeOut'
  | 'easeIn'
  | 'easeInOut'
  | 'linear'
  | 'sharp'
  | 'bouncy'

const easingLabels: Record<EasingKey, string> = {
  emberEase: 'Ember',
  easeOut: 'Ease out',
  easeIn: 'Ease in',
  easeInOut: 'Ease in-out',
  linear: 'Linear',
  sharp: 'Sharp',
  bouncy: 'Bouncy',
}

type StaggerDirection = 'below' | 'left' | 'right' | 'alternating'

// ──────────────────────────────────────────────────────────────────────
// Preset library — motion personalities
// ──────────────────────────────────────────────────────────────────────

type Preset = {
  id: string
  name: string
  description: string
  // Entrance
  fadeDuration: number
  fadeDistance: number
  fadeEasing: EasingKey
  scaleDuration: number
  scaleStart: number
  scaleEasing: EasingKey
  // Spring
  springStiffness: number
  springDamping: number
  // Loading
  loadingSpeed: number
  // Stagger
  staggerDelay: number
  staggerDirection: StaggerDirection
  // Exit
  exitDuration: number
  exitEasing: EasingKey
  // Streaming text
  streamingSpeed: number // chars/sec
  // Ticker
  tickerDuration: number
  tickerEasing: EasingKey
  // Chain
  chainStageDelay: number // ms between stages
}

const presets: Preset[] = [
  {
    id: 'eidrix',
    name: 'Eidrix',
    description: 'Warm, confident, never frantic',
    fadeDuration: 0.55,
    fadeDistance: 32,
    fadeEasing: 'emberEase',
    scaleDuration: 0.45,
    scaleStart: 0.75,
    scaleEasing: 'emberEase',
    springStiffness: 200,
    springDamping: 16,
    loadingSpeed: 1.0,
    staggerDelay: 80,
    staggerDirection: 'below',
    exitDuration: 0.3,
    exitEasing: 'emberEase',
    streamingSpeed: 35,
    tickerDuration: 1.2,
    tickerEasing: 'emberEase',
    chainStageDelay: 150,
  },
  {
    id: 'linear',
    name: 'Linear-crisp',
    description: 'Tight, subtle, 150–250ms',
    fadeDuration: 0.2,
    fadeDistance: 16,
    fadeEasing: 'easeOut',
    scaleDuration: 0.2,
    scaleStart: 0.95,
    scaleEasing: 'easeOut',
    springStiffness: 380,
    springDamping: 28,
    loadingSpeed: 1.2,
    staggerDelay: 50,
    staggerDirection: 'below',
    exitDuration: 0.15,
    exitEasing: 'easeOut',
    streamingSpeed: 55,
    tickerDuration: 0.8,
    tickerEasing: 'easeOut',
    chainStageDelay: 80,
  },
  {
    id: 'stripe',
    name: 'Stripe-restrained',
    description: 'Functional, almost invisible',
    fadeDuration: 0.25,
    fadeDistance: 8,
    fadeEasing: 'linear',
    scaleDuration: 0.2,
    scaleStart: 0.98,
    scaleEasing: 'linear',
    springStiffness: 500,
    springDamping: 40,
    loadingSpeed: 0.8,
    staggerDelay: 30,
    staggerDirection: 'below',
    exitDuration: 0.2,
    exitEasing: 'linear',
    streamingSpeed: 45,
    tickerDuration: 1.0,
    tickerEasing: 'linear',
    chainStageDelay: 60,
  },
  {
    id: 'notion',
    name: 'Notion-playful',
    description: 'Bouncy, expressive, generous',
    fadeDuration: 0.5,
    fadeDistance: 48,
    fadeEasing: 'bouncy',
    scaleDuration: 0.55,
    scaleStart: 0.5,
    scaleEasing: 'bouncy',
    springStiffness: 120,
    springDamping: 10,
    loadingSpeed: 0.9,
    staggerDelay: 120,
    staggerDirection: 'alternating',
    exitDuration: 0.4,
    exitEasing: 'bouncy',
    streamingSpeed: 25,
    tickerDuration: 1.8,
    tickerEasing: 'bouncy',
    chainStageDelay: 220,
  },
  {
    id: 'vercel',
    name: 'Vercel-sharp',
    description: 'Fast, geometric, techy',
    fadeDuration: 0.15,
    fadeDistance: 12,
    fadeEasing: 'sharp',
    scaleDuration: 0.15,
    scaleStart: 0.9,
    scaleEasing: 'sharp',
    springStiffness: 600,
    springDamping: 35,
    loadingSpeed: 1.5,
    staggerDelay: 40,
    staggerDirection: 'below',
    exitDuration: 0.12,
    exitEasing: 'sharp',
    streamingSpeed: 70,
    tickerDuration: 0.6,
    tickerEasing: 'sharp',
    chainStageDelay: 50,
  },
]

// ──────────────────────────────────────────────────────────────────────
// Control primitives — Slider, EasingPicker, Toggle, CodeExport
// ──────────────────────────────────────────────────────────────────────

function ControlLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
      {children}
    </span>
  )
}

function ControlValue({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] text-ember-300">{children}</span>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (value: number) => void
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <ControlLabel>{label}</ControlLabel>
        <ControlValue>{format ? format(value) : value}</ControlValue>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-obsidian-700 rounded-full appearance-none cursor-pointer accent-ember-500"
      />
    </div>
  )
}

interface EasingPickerProps {
  label: string
  value: EasingKey
  options?: EasingKey[]
  onChange: (value: EasingKey) => void
}

function EasingPicker({ label, value, options, onChange }: EasingPickerProps) {
  const keys = options ?? (Object.keys(easings) as EasingKey[])
  return (
    <div className="flex flex-col gap-1.5">
      <ControlLabel>{label}</ControlLabel>
      <div className="flex flex-wrap gap-1">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider border transition-colors ${
              value === key
                ? 'bg-ember-700/30 text-ember-300 border-ember-700'
                : 'bg-obsidian-800 text-text-secondary border-obsidian-700 hover:text-text-primary hover:border-obsidian-700'
            }`}
          >
            {easingLabels[key]}
          </button>
        ))}
      </div>
    </div>
  )
}

interface DirectionPickerProps {
  value: StaggerDirection
  onChange: (value: StaggerDirection) => void
}

function DirectionPicker({ value, onChange }: DirectionPickerProps) {
  const options: StaggerDirection[] = [
    'below',
    'left',
    'right',
    'alternating',
  ]
  return (
    <div className="flex flex-col gap-1.5">
      <ControlLabel>Direction</ControlLabel>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider border transition-colors ${
              value === opt
                ? 'bg-ember-700/30 text-ember-300 border-ember-700'
                : 'bg-obsidian-800 text-text-secondary border-obsidian-700 hover:text-text-primary hover:border-obsidian-700'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ToggleProps {
  label: string
  value: boolean
  onLabel?: string
  offLabel?: string
  onChange: (value: boolean) => void
}

function Toggle({
  label,
  value,
  onLabel = 'On',
  offLabel = 'Off',
  onChange,
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <ControlLabel>{label}</ControlLabel>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`px-3 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider border transition-colors ${
          value
            ? 'bg-ember-700/30 text-ember-300 border-ember-700'
            : 'bg-obsidian-800 text-text-secondary border-obsidian-700 hover:text-text-primary'
        }`}
      >
        {value ? onLabel : offLabel}
      </button>
    </div>
  )
}

interface CodeExportProps {
  code: string
}

function CodeExport({ code }: CodeExportProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API may fail on non-HTTPS contexts; fail silently.
    }
  }

  return (
    <div className="bg-obsidian-950 border border-obsidian-700 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 bg-obsidian-900 border-b border-obsidian-700">
        <ControlLabel>Config</ControlLabel>
        <button
          type="button"
          onClick={copy}
          className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded transition-colors ${
            copied
              ? 'text-ember-300'
              : 'text-text-secondary hover:text-ember-300'
          }`}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-3 py-2 text-[11px] leading-relaxed font-mono text-text-primary overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Section helpers
// ──────────────────────────────────────────────────────────────────────

function BreathingDot({ reduced }: { reduced: boolean }) {
  if (reduced) {
    return (
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-ember-500"
        aria-hidden
      />
    )
  }
  return (
    <motion.span
      className="inline-block w-1.5 h-1.5 rounded-full bg-ember-500"
      aria-hidden
      animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
    />
  )
}

function SectionHeader({ reduced }: { reduced: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-text-tertiary">
        §03 →
      </span>
      <h2 className="font-display text-3xl text-text-primary">Motion Lab</h2>
      <BreathingDot reduced={reduced} />
    </div>
  )
}

function GroupHeader({ title }: { title: string }) {
  return (
    <h3 className="font-display text-xl text-text-secondary mb-4">{title}</h3>
  )
}

function RowLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary mb-4">
      {children}
    </p>
  )
}

function Caption({ text }: { text: string }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary text-center mt-3">
      {text}
    </p>
  )
}

function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center h-24 w-full rounded-md bg-obsidian-800 mb-4">
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Preset bar — apply a motion personality globally
// ──────────────────────────────────────────────────────────────────────

interface PresetBarProps {
  activePreset: string | null
  onApply: (preset: Preset) => void
}

function PresetBar({ activePreset, onApply }: PresetBarProps) {
  return (
    <div className="mb-12">
      <div className="flex items-baseline justify-between mb-3">
        <RowLabel>Motion personality — apply presets globally</RowLabel>
        <span className="font-mono text-[10px] text-text-tertiary">
          {activePreset ? `Current: ${activePreset}` : 'Custom tuning'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApply(preset)}
            className={`flex flex-col items-start px-3 py-2 rounded-md border transition-colors text-left ${
              activePreset === preset.name
                ? 'bg-ember-700/20 border-ember-700'
                : 'bg-obsidian-800 border-obsidian-700 hover:border-obsidian-700 hover:bg-obsidian-900/60'
            }`}
          >
            <span
              className={`font-display text-sm ${
                activePreset === preset.name
                  ? 'text-ember-300'
                  : 'text-text-primary'
              }`}
            >
              {preset.name}
            </span>
            <span className="font-body text-xs text-text-tertiary">
              {preset.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Entrance Group
// ──────────────────────────────────────────────────────────────────────

interface EntranceGroupProps {
  reduced: boolean
  // Fade + rise
  fadeDuration: number
  setFadeDuration: (v: number) => void
  fadeDistance: number
  setFadeDistance: (v: number) => void
  fadeEasing: EasingKey
  setFadeEasing: (v: EasingKey) => void
  // Scale in
  scaleDuration: number
  setScaleDuration: (v: number) => void
  scaleStart: number
  setScaleStart: (v: number) => void
  scaleEasing: EasingKey
  setScaleEasing: (v: EasingKey) => void
  // Spring bounce
  springStiffness: number
  setSpringStiffness: (v: number) => void
  springDamping: number
  setSpringDamping: (v: number) => void
  // Mark dirty
  markDirty: () => void
}

function EntranceGroup({
  reduced,
  fadeDuration,
  setFadeDuration,
  fadeDistance,
  setFadeDistance,
  fadeEasing,
  setFadeEasing,
  scaleDuration,
  setScaleDuration,
  scaleStart,
  setScaleStart,
  scaleEasing,
  setScaleEasing,
  springStiffness,
  setSpringStiffness,
  springDamping,
  setSpringDamping,
  markDirty,
}: EntranceGroupProps) {
  const [fadeKey, setFadeKey] = useState(0)
  const [springKey, setSpringKey] = useState(0)
  const [scaleKey, setScaleKey] = useState(0)

  const wrap =
    (setter: (fn: (n: number) => number) => void) => () => {
      setter((n) => n + 1)
    }

  const fadeCode = `transition: {
  duration: ${fadeDuration},
  ease: ${JSON.stringify(easings[fadeEasing])},
}`

  const scaleCode = `transition: {
  duration: ${scaleDuration},
  ease: ${JSON.stringify(easings[scaleEasing])},
}`

  const springCode = `transition: {
  type: 'spring',
  stiffness: ${springStiffness},
  damping: ${springDamping},
}`

  return (
    <div>
      <RowLabel>
        Entrance animations — tune values, click Replay to re-trigger
      </RowLabel>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fade + rise */}
        <div>
          <Card variant="bordered">
            <Stage>
              {/* Key on outer div — Framer Motion v12 doesn't always
                  remount motion.div reliably when key changes directly. */}
              <div key={fadeKey}>
                <motion.div
                  className="w-12 h-12 rounded-md bg-ember-500"
                  initial={{ opacity: 0, y: fadeDistance }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : {
                          duration: fadeDuration,
                          ease: easings[fadeEasing],
                        }
                  }
                />
              </div>
            </Stage>
            <div className="flex flex-col gap-3 mb-4">
              <Slider
                label="Duration"
                value={fadeDuration}
                min={0.05}
                max={1.2}
                step={0.05}
                format={(v) => `${Math.round(v * 1000)}ms`}
                onChange={(v) => {
                  setFadeDuration(v)
                  markDirty()
                }}
              />
              <Slider
                label="Rise distance"
                value={fadeDistance}
                min={0}
                max={80}
                step={4}
                format={(v) => `${v}px`}
                onChange={(v) => {
                  setFadeDistance(v)
                  markDirty()
                }}
              />
              <EasingPicker
                label="Easing"
                value={fadeEasing}
                onChange={(v) => {
                  setFadeEasing(v)
                  markDirty()
                }}
              />
            </div>
            <Button
              label="Replay"
              variant="secondary"
              size="sm"
              onClick={wrap(setFadeKey)}
            />
          </Card>
          <Caption text="fade + rise" />
          <div className="mt-3">
            <CodeExport code={fadeCode} />
          </div>
        </div>

        {/* Spring bounce */}
        <div>
          <Card variant="bordered">
            <Stage>
              <div key={springKey}>
                <motion.div
                  className="w-12 h-12 rounded-md bg-ember-500"
                  initial={{ scale: 0.3 }}
                  animate={{ scale: 1 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : {
                          type: 'spring',
                          stiffness: springStiffness,
                          damping: springDamping,
                        }
                  }
                />
              </div>
            </Stage>
            <div className="flex flex-col gap-3 mb-4">
              <Slider
                label="Stiffness"
                value={springStiffness}
                min={50}
                max={600}
                step={10}
                onChange={(v) => {
                  setSpringStiffness(v)
                  markDirty()
                }}
              />
              <Slider
                label="Damping"
                value={springDamping}
                min={5}
                max={40}
                step={1}
                onChange={(v) => {
                  setSpringDamping(v)
                  markDirty()
                }}
              />
            </div>
            <Button
              label="Replay"
              variant="secondary"
              size="sm"
              onClick={wrap(setSpringKey)}
            />
          </Card>
          <Caption text="spring bounce" />
          <div className="mt-3">
            <CodeExport code={springCode} />
          </div>
        </div>

        {/* Scale in */}
        <div>
          <Card variant="bordered">
            <Stage>
              <div key={scaleKey}>
                <motion.div
                  className="w-12 h-12 rounded-md bg-ember-500"
                  initial={{ opacity: 0, scale: scaleStart }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : {
                          duration: scaleDuration,
                          ease: easings[scaleEasing],
                        }
                  }
                />
              </div>
            </Stage>
            <div className="flex flex-col gap-3 mb-4">
              <Slider
                label="Duration"
                value={scaleDuration}
                min={0.05}
                max={1.2}
                step={0.05}
                format={(v) => `${Math.round(v * 1000)}ms`}
                onChange={(v) => {
                  setScaleDuration(v)
                  markDirty()
                }}
              />
              <Slider
                label="Start scale"
                value={scaleStart}
                min={0.2}
                max={1}
                step={0.05}
                format={(v) => `${v.toFixed(2)}×`}
                onChange={(v) => {
                  setScaleStart(v)
                  markDirty()
                }}
              />
              <EasingPicker
                label="Easing"
                value={scaleEasing}
                onChange={(v) => {
                  setScaleEasing(v)
                  markDirty()
                }}
              />
            </div>
            <Button
              label="Replay"
              variant="secondary"
              size="sm"
              onClick={wrap(setScaleKey)}
            />
          </Card>
          <Caption text="scale in" />
          <div className="mt-3">
            <CodeExport code={scaleCode} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Hover Group — now with a side-by-side "compare curves" card
// ──────────────────────────────────────────────────────────────────────

function HoverTile({
  label,
  whileHover,
  transition,
}: {
  label: string
  whileHover: Record<string, number | string>
  transition: Record<string, unknown>
}) {
  return (
    <motion.div
      className="flex items-center justify-center h-32 rounded-lg border border-obsidian-700 bg-obsidian-800 text-text-secondary font-mono text-xs uppercase tracking-wider cursor-pointer"
      whileHover={whileHover}
      transition={transition}
    >
      {label}
    </motion.div>
  )
}

function HoverGroup() {
  return (
    <div className="space-y-10">
      {/* Main hover demos */}
      <div>
        <RowLabel>
          Hover micro-interactions — move your cursor over each tile
        </RowLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <HoverTile
              label="Hover me"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.2, ease: emberEase }}
            />
            <Caption text="subtle scale · 1.03× ember" />
          </div>
          <div>
            <HoverTile
              label="Hover me"
              whileHover={{
                backgroundColor: 'var(--ember-500)',
                color: 'var(--obsidian-950)',
              }}
              transition={{ duration: 0.25, ease: emberEase }}
            />
            <Caption text="color shift · ember" />
          </div>
          <div>
            <HoverTile
              label="Hover me"
              whileHover={{
                scale: 1.015,
                y: -4,
                boxShadow: '0 12px 32px rgba(255,107,26,0.35)',
              }}
              transition={{ duration: 0.3, ease: emberEase }}
            />
            <Caption text="glow halo · layered" />
          </div>
        </div>
      </div>

      {/* Compare curves — same effect, different easings */}
      <div>
        <RowLabel>
          Compare easing curves — same effect, three different curves
        </RowLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <HoverTile
              label="Hover me"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.25, ease: 'linear' }}
            />
            <Caption text="linear — robotic, uniform" />
          </div>
          <div>
            <HoverTile
              label="Hover me"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.25, ease: emberEase }}
            />
            <Caption text="ember-ease — settles warmly" />
          </div>
          <div>
            <HoverTile
              label="Hover me"
              whileHover={{ scale: 1.05 }}
              transition={{
                duration: 0.25,
                ease: [0.68, -0.55, 0.27, 1.55],
              }}
            />
            <Caption text="bouncy — overshoots" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Loading Group — now with speed slider + pause toggle
// ──────────────────────────────────────────────────────────────────────

function BreathingDots({
  reduced,
  speed,
  paused,
}: {
  reduced: boolean
  speed: number
  paused: boolean
}) {
  const dotClass = 'w-2.5 h-2.5 rounded-full bg-ember-500'
  if (reduced || paused) {
    return (
      <div className="flex gap-2">
        <span className={dotClass} />
        <span className={dotClass} />
        <span className={dotClass} />
      </div>
    )
  }
  return (
    <div className="flex gap-2">
      {[0, 0.15, 0.3].map((delay) => (
        <motion.span
          key={delay}
          className={dotClass}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{
            duration: 1.2 / speed,
            ease: 'easeInOut',
            repeat: Infinity,
            delay: delay / speed,
          }}
        />
      ))}
    </div>
  )
}

function SkeletonShimmer({
  reduced,
  speed,
  paused,
}: {
  reduced: boolean
  speed: number
  paused: boolean
}) {
  const stopped = reduced || paused
  return (
    <div className="relative w-full h-4 rounded-full bg-obsidian-800 overflow-hidden">
      {!stopped && (
        <motion.div
          className="absolute inset-y-0 w-1/3"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(245,239,230,0.08), transparent)',
          }}
          animate={{ x: ['-100%', '300%'] }}
          transition={{
            duration: 1.5 / speed,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />
      )}
    </div>
  )
}

function PulseRing({
  reduced,
  speed,
  paused,
}: {
  reduced: boolean
  speed: number
  paused: boolean
}) {
  const stopped = reduced || paused
  if (stopped) {
    return (
      <div className="relative w-10 h-10 flex items-center justify-center">
        <span className="w-2.5 h-2.5 rounded-full bg-ember-500" />
      </div>
    )
  }
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <span className="w-2.5 h-2.5 rounded-full bg-ember-500" />
      <motion.span
        className="absolute inset-0 rounded-full border border-ember-500"
        animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
        transition={{
          duration: 1.5 / speed,
          ease: 'easeOut',
          repeat: Infinity,
        }}
      />
    </div>
  )
}

function LoadingGroup({
  reduced,
  speed,
  setSpeed,
  paused,
  setPaused,
  markDirty,
}: {
  reduced: boolean
  speed: number
  setSpeed: (v: number) => void
  paused: boolean
  setPaused: (v: boolean) => void
  markDirty: () => void
}) {
  return (
    <div>
      <RowLabel>Loading states — continuous loops</RowLabel>

      {/* Shared controls */}
      <div className="mb-6 p-4 rounded-md bg-obsidian-900 border border-obsidian-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Slider
            label="Speed"
            value={speed}
            min={0.3}
            max={2.5}
            step={0.1}
            format={(v) => `${v.toFixed(1)}×`}
            onChange={(v) => {
              setSpeed(v)
              markDirty()
            }}
          />
          <Toggle
            label="Playback"
            value={!paused}
            onLabel="Playing"
            offLabel="Paused"
            onChange={(v) => {
              setPaused(!v)
              markDirty()
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Card variant="bordered">
            <div className="h-24 flex items-center justify-center">
              <BreathingDots
                reduced={reduced}
                speed={speed}
                paused={paused}
              />
            </div>
          </Card>
          <Caption
            text={`breathing dots · ${Math.round(1200 / speed)}ms loop`}
          />
        </div>
        <div>
          <Card variant="bordered">
            <div className="h-24 flex items-center justify-center px-4">
              <SkeletonShimmer
                reduced={reduced}
                speed={speed}
                paused={paused}
              />
            </div>
          </Card>
          <Caption
            text={`skeleton shimmer · ${Math.round(1500 / speed)}ms sweep`}
          />
        </div>
        <div>
          <Card variant="bordered">
            <div className="h-24 flex items-center justify-center">
              <PulseRing reduced={reduced} speed={speed} paused={paused} />
            </div>
          </Card>
          <Caption
            text={`pulse ring · ${Math.round(1500 / speed)}ms expand`}
          />
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Stagger Group — with delay slider + direction picker
// ──────────────────────────────────────────────────────────────────────

const staggeredItems = [
  'Welcome to the Lab',
  'Typography renders first',
  'Colors breathe below',
  'Motion lives in details',
  'Your app has a voice now',
]

function staggerInitial(
  direction: StaggerDirection,
  index: number
): Record<string, number> {
  switch (direction) {
    case 'below':
      return { opacity: 0, y: 12 }
    case 'left':
      return { opacity: 0, x: -24 }
    case 'right':
      return { opacity: 0, x: 24 }
    case 'alternating':
      return index % 2 === 0
        ? { opacity: 0, x: -24 }
        : { opacity: 0, x: 24 }
  }
}

function staggerAnimate(direction: StaggerDirection): Record<string, number> {
  switch (direction) {
    case 'below':
      return { opacity: 1, y: 0 }
    case 'left':
    case 'right':
    case 'alternating':
      return { opacity: 1, x: 0 }
  }
}

function StaggerGroup({
  reduced,
  delay,
  setDelay,
  direction,
  setDirection,
  markDirty,
}: {
  reduced: boolean
  delay: number
  setDelay: (v: number) => void
  direction: StaggerDirection
  setDirection: (v: StaggerDirection) => void
  markDirty: () => void
}) {
  const [replayKey, setReplayKey] = useState(0)

  const code = `// For each item at index i:
transition: {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1],
  delay: i * ${(delay / 1000).toFixed(3)},
}`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <RowLabel>Staggered list reveal</RowLabel>
        <Button
          label="Replay"
          variant="secondary"
          size="sm"
          onClick={() => setReplayKey((n) => n + 1)}
        />
      </div>

      {/* Controls */}
      <div className="mb-6 p-4 rounded-md bg-obsidian-900 border border-obsidian-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Slider
            label="Stagger delay"
            value={delay}
            min={20}
            max={200}
            step={10}
            format={(v) => `${v}ms`}
            onChange={(v) => {
              setDelay(v)
              markDirty()
            }}
          />
          <DirectionPicker
            value={direction}
            onChange={(v) => {
              setDirection(v)
              markDirty()
            }}
          />
        </div>
      </div>

      <Card variant="bordered">
        <div key={replayKey} className="flex flex-col gap-3">
          {staggeredItems.map((text, index) => (
            <motion.div
              key={index}
              initial={staggerInitial(direction, index)}
              animate={staggerAnimate(direction)}
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      duration: 0.35,
                      ease: emberEase,
                      delay: (index * delay) / 1000,
                    }
              }
              className="flex items-center gap-3 px-3 py-2 rounded-md bg-obsidian-800 text-text-primary font-body text-sm"
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-ember-500 flex-shrink-0"
                aria-hidden
              />
              {text}
            </motion.div>
          ))}
        </div>
      </Card>

      <div className="mt-3">
        <CodeExport code={code} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Exit Group — dismissal animations (mirror of entrance)
//
// Three common ways elements leave: fade, scale+fade, slide. Each uses
// AnimatePresence with the `exit` prop — the canonical Framer Motion
// pattern for dismissals.
// ──────────────────────────────────────────────────────────────────────

function ExitGroup({
  reduced,
  duration,
  setDuration,
  easing,
  setEasing,
  markDirty,
}: {
  reduced: boolean
  duration: number
  setDuration: (v: number) => void
  easing: EasingKey
  setEasing: (v: EasingKey) => void
  markDirty: () => void
}) {
  const [fadeShown, setFadeShown] = useState(true)
  const [scaleShown, setScaleShown] = useState(true)
  const [slideShown, setSlideShown] = useState(true)

  const transition = reduced
    ? { duration: 0 }
    : { duration, ease: easings[easing] }

  const code = `exit: {
  opacity: 0,
  scale: 0.85,  // or x: 24 for slide, nothing for fade
  transition: {
    duration: ${duration},
    ease: ${JSON.stringify(easings[easing])},
  },
}`

  return (
    <div>
      <RowLabel>Exit animations — dismiss, then bring back</RowLabel>

      {/* Shared controls */}
      <div className="mb-6 p-4 rounded-md bg-obsidian-900 border border-obsidian-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Slider
            label="Duration"
            value={duration}
            min={0.05}
            max={1.2}
            step={0.05}
            format={(v) => `${Math.round(v * 1000)}ms`}
            onChange={(v) => {
              setDuration(v)
              markDirty()
            }}
          />
          <EasingPicker
            label="Easing"
            value={easing}
            onChange={(v) => {
              setEasing(v)
              markDirty()
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fade out */}
        <div>
          <Card variant="bordered">
            <Stage>
              <AnimatePresence>
                {fadeShown && (
                  <motion.div
                    className="w-12 h-12 rounded-md bg-ember-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                  />
                )}
              </AnimatePresence>
            </Stage>
            <Button
              label={fadeShown ? 'Dismiss' : 'Bring back'}
              variant="secondary"
              size="sm"
              onClick={() => setFadeShown((s) => !s)}
            />
          </Card>
          <Caption text="fade out" />
        </div>

        {/* Scale + fade out */}
        <div>
          <Card variant="bordered">
            <Stage>
              <AnimatePresence>
                {scaleShown && (
                  <motion.div
                    className="w-12 h-12 rounded-md bg-ember-500"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={transition}
                  />
                )}
              </AnimatePresence>
            </Stage>
            <Button
              label={scaleShown ? 'Dismiss' : 'Bring back'}
              variant="secondary"
              size="sm"
              onClick={() => setScaleShown((s) => !s)}
            />
          </Card>
          <Caption text="scale + fade" />
        </div>

        {/* Slide out */}
        <div>
          <Card variant="bordered">
            <Stage>
              <AnimatePresence>
                {slideShown && (
                  <motion.div
                    className="w-12 h-12 rounded-md bg-ember-500"
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={transition}
                  />
                )}
              </AnimatePresence>
            </Stage>
            <Button
              label={slideShown ? 'Dismiss' : 'Bring back'}
              variant="secondary"
              size="sm"
              onClick={() => setSlideShown((s) => !s)}
            />
          </Card>
          <Caption text="slide right" />
        </div>
      </div>

      <div className="mt-3">
        <CodeExport code={code} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Streaming Text — character-by-character reveal (ChatGPT style)
//
// Uses a setInterval loop in a useEffect to incrementally reveal the
// text. Speed is expressed as characters per second. When chat
// chapters land, this is the vocabulary word you'll reach for.
// ──────────────────────────────────────────────────────────────────────

const streamingSample =
  'Motion is the closest thing your app has to a signature. Every tween duration, every spring stiffness, every stagger delay tells users how the product feels.'

function StreamingGroup({
  reduced,
  speed,
  setSpeed,
  markDirty,
}: {
  reduced: boolean
  speed: number
  setSpeed: (v: number) => void
  markDirty: () => void
}) {
  const [text, setText] = useState(reduced ? streamingSample : '')
  const [replayKey, setReplayKey] = useState(0)
  const isStreaming = !reduced && text.length < streamingSample.length

  useEffect(() => {
    if (reduced) {
      setText(streamingSample)
      return
    }
    setText('')
    let i = 0
    const interval = setInterval(() => {
      i++
      setText(streamingSample.slice(0, i))
      if (i >= streamingSample.length) {
        clearInterval(interval)
      }
    }, 1000 / speed)
    return () => clearInterval(interval)
  }, [replayKey, speed, reduced])

  const code = `const [text, setText] = useState('')
useEffect(() => {
  let i = 0
  const interval = setInterval(() => {
    i++
    setText(fullText.slice(0, i))
    if (i >= fullText.length) clearInterval(interval)
  }, ${Math.round(1000 / speed)}) // ms per character
  return () => clearInterval(interval)
}, [])`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <RowLabel>Streaming text — like ChatGPT</RowLabel>
        <Button
          label="Replay"
          variant="secondary"
          size="sm"
          onClick={() => setReplayKey((k) => k + 1)}
        />
      </div>

      <div className="mb-6 p-4 rounded-md bg-obsidian-900 border border-obsidian-700">
        <Slider
          label="Reveal speed"
          value={speed}
          min={10}
          max={120}
          step={5}
          format={(v) => `${v} chars/sec`}
          onChange={(v) => {
            setSpeed(v)
            markDirty()
          }}
        />
      </div>

      <Card variant="bordered">
        <p className="font-body text-sm text-text-primary leading-relaxed min-h-[6rem]">
          {text}
          {isStreaming && (
            <span
              className="inline-block w-0.5 h-4 bg-ember-500 align-middle ml-0.5 animate-pulse"
              aria-hidden
            />
          )}
        </p>
      </Card>

      <div className="mt-3">
        <CodeExport code={code} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Number Ticker — count up with easing
//
// Uses Framer Motion's imperative `animate()` function driving a React
// state setter. `tabular-nums` keeps digit widths uniform so the number
// doesn't jitter as digits change.
// ──────────────────────────────────────────────────────────────────────

const tickerTarget = 1247

function TickerGroup({
  reduced,
  duration,
  setDuration,
  easing,
  setEasing,
  markDirty,
}: {
  reduced: boolean
  duration: number
  setDuration: (v: number) => void
  easing: EasingKey
  setEasing: (v: EasingKey) => void
  markDirty: () => void
}) {
  const [display, setDisplay] = useState(reduced ? tickerTarget : 0)
  const [replayKey, setReplayKey] = useState(0)

  useEffect(() => {
    if (reduced) {
      setDisplay(tickerTarget)
      return
    }
    const controls = animate(0, tickerTarget, {
      duration,
      ease: easings[easing],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [replayKey, duration, easing, reduced])

  const code = `import { animate } from 'framer-motion'
const [display, setDisplay] = useState(0)
useEffect(() => {
  const controls = animate(0, ${tickerTarget}, {
    duration: ${duration},
    ease: ${JSON.stringify(easings[easing])},
    onUpdate: (v) => setDisplay(Math.round(v)),
  })
  return () => controls.stop()
}, [])`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <RowLabel>Number ticker — count up with easing</RowLabel>
        <Button
          label="Replay"
          variant="secondary"
          size="sm"
          onClick={() => setReplayKey((k) => k + 1)}
        />
      </div>

      <div className="mb-6 p-4 rounded-md bg-obsidian-900 border border-obsidian-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Slider
            label="Duration"
            value={duration}
            min={0.3}
            max={3}
            step={0.1}
            format={(v) => `${v.toFixed(1)}s`}
            onChange={(v) => {
              setDuration(v)
              markDirty()
            }}
          />
          <EasingPicker
            label="Easing"
            value={easing}
            onChange={(v) => {
              setEasing(v)
              markDirty()
            }}
          />
        </div>
      </div>

      <Card variant="bordered">
        <div className="h-28 flex flex-col items-center justify-center">
          <div className="font-display text-6xl text-ember-300 tabular-nums">
            {display.toLocaleString()}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary mt-2">
            active users this week
          </p>
        </div>
      </Card>

      <div className="mt-3">
        <CodeExport code={code} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Chained Sequence — motion A → B → C
//
// Three elements, each with a different motion type, firing in sequence
// with tunable delay between stages. The hardest motion skill to
// communicate is *composition* — this demo makes it concrete.
// ──────────────────────────────────────────────────────────────────────

function ChainGroup({
  reduced,
  stageDelay,
  setStageDelay,
  markDirty,
}: {
  reduced: boolean
  stageDelay: number
  setStageDelay: (v: number) => void
  markDirty: () => void
}) {
  const [replayKey, setReplayKey] = useState(0)

  const d = stageDelay / 1000 // slider is ms, Framer Motion wants s

  const code = `// Each stage waits on the previous by ${stageDelay}ms
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: emberEase, delay: 0 }}
/>
<motion.div
  initial={{ opacity: 0, scale: 0.6 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ type: 'spring', stiffness: 200, damping: 16, delay: ${d.toFixed(2)} }}
/>
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: emberEase, delay: ${(d * 2).toFixed(2)} }}
/>`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <RowLabel>Chained sequence — motion A → B → C</RowLabel>
        <Button
          label="Replay"
          variant="secondary"
          size="sm"
          onClick={() => setReplayKey((k) => k + 1)}
        />
      </div>

      <div className="mb-6 p-4 rounded-md bg-obsidian-900 border border-obsidian-700">
        <Slider
          label="Stage delay"
          value={stageDelay}
          min={0}
          max={500}
          step={20}
          format={(v) => `${v}ms between stages`}
          onChange={(v) => {
            setStageDelay(v)
            markDirty()
          }}
        />
      </div>

      <Card variant="bordered">
        <div key={replayKey} className="flex flex-col items-center gap-4 py-4">
          <div className="flex items-center justify-center gap-8">
            <motion.div
              className="w-16 h-16 rounded-md bg-ember-500"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 0.4, ease: emberEase, delay: 0 }
              }
            />
            <motion.div
              className="w-16 h-16 rounded-md bg-cobalt-500"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      type: 'spring',
                      stiffness: 200,
                      damping: 16,
                      delay: d,
                    }
              }
            />
            <motion.div
              className="w-16 h-16 rounded-md bg-ember-300"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 0.4, ease: emberEase, delay: d * 2 }
              }
            />
          </div>
          <div className="flex items-center justify-center gap-8 w-full">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary w-16 text-center">
              stage 1
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary w-16 text-center">
              stage 2
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary w-16 text-center">
              stage 3
            </span>
          </div>
        </div>
      </Card>

      <div className="mt-3">
        <CodeExport code={code} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Main MotionLab
// ──────────────────────────────────────────────────────────────────────

export default function MotionLab() {
  const reduced = useReducedMotion() ?? false
  const defaultPreset = presets[0] // Eidrix

  // Entrance state
  const [fadeDuration, setFadeDuration] = useState(defaultPreset.fadeDuration)
  const [fadeDistance, setFadeDistance] = useState(defaultPreset.fadeDistance)
  const [fadeEasing, setFadeEasing] = useState<EasingKey>(
    defaultPreset.fadeEasing
  )
  const [scaleDuration, setScaleDuration] = useState(
    defaultPreset.scaleDuration
  )
  const [scaleStart, setScaleStart] = useState(defaultPreset.scaleStart)
  const [scaleEasing, setScaleEasing] = useState<EasingKey>(
    defaultPreset.scaleEasing
  )

  // Spring state
  const [springStiffness, setSpringStiffness] = useState(
    defaultPreset.springStiffness
  )
  const [springDamping, setSpringDamping] = useState(
    defaultPreset.springDamping
  )

  // Loading state
  const [loadingSpeed, setLoadingSpeed] = useState(defaultPreset.loadingSpeed)
  const [loadingPaused, setLoadingPaused] = useState(false)

  // Stagger state
  const [staggerDelay, setStaggerDelay] = useState(defaultPreset.staggerDelay)
  const [staggerDirection, setStaggerDirection] = useState<StaggerDirection>(
    defaultPreset.staggerDirection
  )

  // Exit state
  const [exitDuration, setExitDuration] = useState(defaultPreset.exitDuration)
  const [exitEasing, setExitEasing] = useState<EasingKey>(
    defaultPreset.exitEasing
  )

  // Streaming state
  const [streamingSpeed, setStreamingSpeed] = useState(
    defaultPreset.streamingSpeed
  )

  // Ticker state
  const [tickerDuration, setTickerDuration] = useState(
    defaultPreset.tickerDuration
  )
  const [tickerEasing, setTickerEasing] = useState<EasingKey>(
    defaultPreset.tickerEasing
  )

  // Chain state
  const [chainStageDelay, setChainStageDelay] = useState(
    defaultPreset.chainStageDelay
  )

  // Active preset tracking — if any value is tweaked, presetName becomes null
  const [activePreset, setActivePreset] = useState<string | null>(
    defaultPreset.name
  )

  const markDirty = () => setActivePreset(null)

  const applyPreset = (preset: Preset) => {
    setFadeDuration(preset.fadeDuration)
    setFadeDistance(preset.fadeDistance)
    setFadeEasing(preset.fadeEasing)
    setScaleDuration(preset.scaleDuration)
    setScaleStart(preset.scaleStart)
    setScaleEasing(preset.scaleEasing)
    setSpringStiffness(preset.springStiffness)
    setSpringDamping(preset.springDamping)
    setLoadingSpeed(preset.loadingSpeed)
    setStaggerDelay(preset.staggerDelay)
    setStaggerDirection(preset.staggerDirection)
    setExitDuration(preset.exitDuration)
    setExitEasing(preset.exitEasing)
    setStreamingSpeed(preset.streamingSpeed)
    setTickerDuration(preset.tickerDuration)
    setTickerEasing(preset.tickerEasing)
    setChainStageDelay(preset.chainStageDelay)
    setActivePreset(preset.name)
  }

  return (
    <section className="px-8 py-10 max-w-5xl">
      <SectionHeader reduced={reduced} />
      <p className="font-body text-sm text-text-secondary max-w-2xl mb-10">
        A live lab for tuning motion. Pick a personality preset, or drag the
        sliders and press Replay until it feels unmistakably{' '}
        <span className="text-ember-300">Eidrix</span>. Copy the config out
        to use in real components.
      </p>

      <PresetBar activePreset={activePreset} onApply={applyPreset} />

      <div className="space-y-16">
        <div>
          <GroupHeader title="Entrance Animations" />
          <EntranceGroup
            reduced={reduced}
            fadeDuration={fadeDuration}
            setFadeDuration={setFadeDuration}
            fadeDistance={fadeDistance}
            setFadeDistance={setFadeDistance}
            fadeEasing={fadeEasing}
            setFadeEasing={setFadeEasing}
            scaleDuration={scaleDuration}
            setScaleDuration={setScaleDuration}
            scaleStart={scaleStart}
            setScaleStart={setScaleStart}
            scaleEasing={scaleEasing}
            setScaleEasing={setScaleEasing}
            springStiffness={springStiffness}
            setSpringStiffness={setSpringStiffness}
            springDamping={springDamping}
            setSpringDamping={setSpringDamping}
            markDirty={markDirty}
          />
        </div>

        <div>
          <GroupHeader title="Hover Micro-Interactions" />
          <HoverGroup />
        </div>

        <div>
          <GroupHeader title="Loading States" />
          <LoadingGroup
            reduced={reduced}
            speed={loadingSpeed}
            setSpeed={setLoadingSpeed}
            paused={loadingPaused}
            setPaused={setLoadingPaused}
            markDirty={markDirty}
          />
        </div>

        <div>
          <GroupHeader title="Staggered List Reveals" />
          <StaggerGroup
            reduced={reduced}
            delay={staggerDelay}
            setDelay={setStaggerDelay}
            direction={staggerDirection}
            setDirection={setStaggerDirection}
            markDirty={markDirty}
          />
        </div>

        <div>
          <GroupHeader title="Exit Animations" />
          <ExitGroup
            reduced={reduced}
            duration={exitDuration}
            setDuration={setExitDuration}
            easing={exitEasing}
            setEasing={setExitEasing}
            markDirty={markDirty}
          />
        </div>

        <div>
          <GroupHeader title="Streaming Text" />
          <StreamingGroup
            reduced={reduced}
            speed={streamingSpeed}
            setSpeed={setStreamingSpeed}
            markDirty={markDirty}
          />
        </div>

        <div>
          <GroupHeader title="Number Ticker" />
          <TickerGroup
            reduced={reduced}
            duration={tickerDuration}
            setDuration={setTickerDuration}
            easing={tickerEasing}
            setEasing={setTickerEasing}
            markDirty={markDirty}
          />
        </div>

        <div>
          <GroupHeader title="Chained Sequence" />
          <ChainGroup
            reduced={reduced}
            stageDelay={chainStageDelay}
            setStageDelay={setChainStageDelay}
            markDirty={markDirty}
          />
        </div>
      </div>
    </section>
  )
}
