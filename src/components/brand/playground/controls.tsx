import { useState } from 'react'
import type { ReactNode } from 'react'

// ──────────────────────────────────────────────────────────────────────
// Control primitives for the Eye Tuning Playground.
//
// Kept visually quiet — the Eye is the star; controls are the instrument.
// ──────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────
// Slider
// ──────────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: SliderProps) {
  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className="font-mono text-[10px] text-ember-300 tabular-nums">
          {format ? format(value) : value}
        </span>
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

// ──────────────────────────────────────────────────────────────────────
// Toggle (on/off switch)
// ──────────────────────────────────────────────────────────────────────

interface ToggleProps {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}

export function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`px-2.5 py-0.5 rounded-md font-mono text-[10px] uppercase tracking-wider border transition-colors ${
          value
            ? 'bg-ember-700/30 text-ember-300 border-ember-700'
            : 'bg-obsidian-800 text-text-secondary border-obsidian-700 hover:text-text-primary'
        }`}
      >
        {value ? 'On' : 'Off'}
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// ColorInput (swatch + text input)
//
// Accepts any CSS color string — hex, rgb/rgba, hsl, or var() references.
// Swatch uses the raw value as background so CSS resolves it natively.
// ──────────────────────────────────────────────────────────────────────

interface ColorInputProps {
  label: string
  value: string
  onChange: (v: string) => void
}

export function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span
        className="w-5 h-5 rounded border border-obsidian-700 flex-shrink-0"
        style={{ background: value }}
        aria-hidden
      />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-obsidian-800 border border-obsidian-700 rounded px-1.5 py-0.5 font-mono text-[10px] text-text-primary focus:outline-none focus:border-ember-700"
          spellCheck={false}
        />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// CollapsibleGroup
// ──────────────────────────────────────────────────────────────────────

interface CollapsibleGroupProps {
  title: string
  subtitle?: string
  defaultExpanded?: boolean
  children: ReactNode
}

export function CollapsibleGroup({
  title,
  subtitle,
  defaultExpanded = true,
  children,
}: CollapsibleGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <div className="rounded-md bg-obsidian-900 border border-obsidian-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-obsidian-900/60 transition-colors"
      >
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-sm text-text-primary">{title}</h3>
          {subtitle && (
            <span className="font-mono text-[10px] text-text-tertiary">
              {subtitle}
            </span>
          )}
        </div>
        <span
          className={`font-mono text-xs text-text-tertiary transition-transform ${
            expanded ? 'rotate-90' : ''
          }`}
        >
          ›
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-1 space-y-1 border-t border-obsidian-800">
          {children}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Subsection — for state modifiers inside a CollapsibleGroup
// ──────────────────────────────────────────────────────────────────────

interface SubsectionProps {
  title: string
  children: ReactNode
}

export function Subsection({ title, children }: SubsectionProps) {
  return (
    <div className="mt-2 pt-2 border-t border-obsidian-800">
      <p className="font-mono text-[10px] uppercase tracking-wider text-ember-300 mb-1">
        {title}
      </p>
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// CodeExport — live TypeScript with Copy button
// ──────────────────────────────────────────────────────────────────────

interface CodeExportProps {
  code: string
  title?: string
}

export function CodeExport({ code, title = 'Config' }: CodeExportProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* no-op — clipboard may be blocked on non-HTTPS contexts */
    }
  }

  return (
    <div className="rounded-md bg-obsidian-950 border border-obsidian-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-obsidian-900 border-b border-obsidian-700">
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
          {title}
        </span>
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
      <pre className="px-3 py-2 text-[10px] leading-relaxed font-mono text-text-primary overflow-auto max-h-[320px]">
        <code>{code}</code>
      </pre>
    </div>
  )
}
