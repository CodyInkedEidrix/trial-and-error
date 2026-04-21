import { useEffect, useMemo, useState } from 'react'
import EidrixEye from '../EidrixEye'
import { defaultConfig } from '../eye-config'
import type { EyeConfig, EyeState, ReactionName } from '../eye-config'
import { CodeExport } from './controls'
import {
  BreathPanel,
  BlinksPanel,
  ColorsPanel,
  CursorTrackingPanel,
  LookAroundPanel,
  ReactionsPanel,
  SizeDegradationPanel,
  StatesPanel,
} from './panels'
import {
  BUILTIN_PRESETS,
  formatConfigAsTypeScript,
  loadCurrentConfig,
  loadCurrentPresetName,
  loadCustomPresets,
  saveCurrentConfig,
  saveCurrentPresetName,
  saveCustomPresets,
  type Preset,
} from './presets'

// ──────────────────────────────────────────────────────────────────────
// The Eye Tuning Playground
//
// Transforms the Brand tab into a real design instrument:
//   - Preset bar (built-in + custom)
//   - Live sliders for every tunable value in eye-config.ts
//   - State switcher + reaction triggers
//   - Three-size side-by-side preview (24 / 64 / 240) driven by the
//     same live config
//   - Live TypeScript export with Copy button
//   - localStorage-persisted custom preset saves + session restore
// ──────────────────────────────────────────────────────────────────────

const STATE_OPTIONS: { id: EyeState; label: string }[] = [
  { id: 'idle', label: 'Idle' },
  { id: 'thinking', label: 'Thinking' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'muted', label: 'Muted' },
]

const REACTION_OPTIONS: { id: ReactionName; label: string }[] = [
  { id: 'greeting', label: 'Greeting' },
  { id: 'acknowledge', label: 'Acknowledge' },
  { id: 'noticed', label: 'Noticed' },
  { id: 'processing', label: 'Processing' },
  { id: 'completion', label: 'Completion' },
  { id: 'handoff', label: 'Handoff' },
  { id: 'uncertainty', label: 'Uncertainty' },
]

const PREVIEW_SIZES = [24, 64, 240] as const

export default function EyePlayground() {
  // ── Core state — config + active preset name
  const [liveConfig, setLiveConfig] = useState<EyeConfig>(
    () => loadCurrentConfig() ?? defaultConfig
  )
  const [activePresetName, setActivePresetName] = useState<string | null>(
    () => loadCurrentPresetName() ?? 'Eidrix'
  )
  const [customPresets, setCustomPresets] = useState<Preset[]>(() =>
    loadCustomPresets()
  )

  // ── Preview state — separate from persisted config
  const [activeState, setActiveState] = useState<EyeState>('idle')
  const [activeReaction, setActiveReaction] =
    useState<ReactionName | null>(null)

  // ── Save prompt state
  const [savePromptOpen, setSavePromptOpen] = useState(false)
  const [presetNameInput, setPresetNameInput] = useState('')

  const allPresets = useMemo(
    () => [...BUILTIN_PRESETS, ...customPresets],
    [customPresets]
  )

  // ── Auto-save liveConfig to localStorage (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => saveCurrentConfig(liveConfig), 500)
    return () => window.clearTimeout(t)
  }, [liveConfig])

  // ── Save active preset name
  useEffect(() => {
    saveCurrentPresetName(activePresetName)
  }, [activePresetName])

  // ── Config mutation — marks the playground as "Custom"
  const updateConfig = (updater: (prev: EyeConfig) => EyeConfig) => {
    setLiveConfig(updater)
    setActivePresetName(null)
  }

  // ── Preset application
  const applyPreset = (preset: Preset) => {
    setLiveConfig(preset.config)
    setActivePresetName(preset.name)
  }

  // ── Custom preset save
  const beginSave = () => {
    setPresetNameInput('')
    setSavePromptOpen(true)
  }

  const confirmSave = () => {
    const name = presetNameInput.trim()
    if (!name) {
      setSavePromptOpen(false)
      return
    }
    const newPreset: Preset = {
      id: `custom-${Date.now()}`,
      name,
      description: 'Custom',
      config: liveConfig,
      builtin: false,
    }
    const next = [...customPresets, newPreset]
    setCustomPresets(next)
    saveCustomPresets(next)
    setActivePresetName(name)
    setSavePromptOpen(false)
  }

  const cancelSave = () => {
    setSavePromptOpen(false)
    setPresetNameInput('')
  }

  const deletePreset = (id: string) => {
    const next = customPresets.filter((p) => p.id !== id)
    setCustomPresets(next)
    saveCustomPresets(next)
  }

  // ── Reaction trigger — clear+re-set pattern lets user re-fire same
  //    reaction in succession (useEffect keyed on reaction needs a
  //    change, not the same value).
  const triggerReaction = (id: ReactionName) => {
    setActiveReaction(null)
    requestAnimationFrame(() => setActiveReaction(id))
  }

  const clearReaction = () => setActiveReaction(null)

  const codeExport = useMemo(
    () => formatConfigAsTypeScript(liveConfig),
    [liveConfig]
  )

  return (
    <section className="px-8 py-10 max-w-[1400px]">
      {/* ── Header */}
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-text-tertiary">
          §05 →
        </span>
        <h2 className="font-display text-3xl text-text-primary">Brand</h2>
        <span className="font-mono text-xs text-text-tertiary ml-2">
          Eye Tuning Playground
        </span>
      </div>
      <p className="font-body text-sm text-text-secondary max-w-2xl mb-8">
        The design instrument for the Eidrix Eye. Tune every parameter
        live, preview at three sizes simultaneously, export valid
        TypeScript straight to real Eidrix. Your tuning auto-saves across
        refreshes.
      </p>

      {/* ── Preset bar */}
      <div className="mb-8 p-4 rounded-md bg-obsidian-900 border border-obsidian-700">
        <div className="flex items-baseline justify-between mb-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
            Presets
          </p>
          <span className="font-mono text-[10px] text-text-tertiary">
            {activePresetName
              ? `Current: ${activePresetName}`
              : 'Custom tuning'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {allPresets.map((preset) => (
            <PresetChip
              key={preset.id}
              preset={preset}
              active={activePresetName === preset.name}
              onApply={() => applyPreset(preset)}
              onDelete={
                preset.builtin ? undefined : () => deletePreset(preset.id)
              }
            />
          ))}
          {/* Save-as button */}
          {!savePromptOpen ? (
            <button
              type="button"
              onClick={beginSave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-obsidian-700 bg-obsidian-800 hover:border-ember-700 hover:bg-obsidian-900/60 transition-colors"
              title="Save current tuning as a named preset"
            >
              <span className="font-mono text-sm text-text-secondary">+</span>
              <span className="font-display text-sm text-text-secondary">
                Save as preset
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-ember-700 bg-ember-700/10">
              <input
                type="text"
                autoFocus
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmSave()
                  if (e.key === 'Escape') cancelSave()
                }}
                placeholder="preset name…"
                className="bg-transparent font-display text-sm text-text-primary placeholder-text-tertiary focus:outline-none"
              />
              <button
                type="button"
                onClick={confirmSave}
                className="font-mono text-[10px] uppercase tracking-wider text-ember-300 hover:text-ember-300"
              >
                Save
              </button>
              <button
                type="button"
                onClick={cancelSave}
                className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column layout */}
      <div className="flex gap-8">
        {/* Left column — sticky preview + state + reactions + code */}
        <div className="w-[440px] flex-shrink-0 space-y-4 self-start sticky top-4">
          {/* Three-size preview */}
          <div className="p-6 rounded-md bg-obsidian-900 border border-obsidian-700">
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary mb-4">
              Preview — 24 / 64 / 240
            </p>
            <div className="flex items-end justify-around gap-4">
              {PREVIEW_SIZES.map((size) => (
                <div
                  key={size}
                  className="flex flex-col items-center gap-2"
                >
                  <EidrixEye
                    size={size}
                    state={activeState}
                    reaction={activeReaction}
                    onReactionComplete={clearReaction}
                    config={liveConfig}
                  />
                  <span className="font-mono text-[10px] text-text-tertiary">
                    {size}px
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* State switcher */}
          <div className="p-4 rounded-md bg-obsidian-900 border border-obsidian-700">
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
              State
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STATE_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveState(s.id)}
                  className={`px-2.5 py-1 rounded font-display text-xs border transition-colors ${
                    activeState === s.id
                      ? 'bg-ember-700/30 text-ember-300 border-ember-700'
                      : 'bg-obsidian-800 text-text-primary border-obsidian-700 hover:bg-obsidian-900/60'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reaction triggers */}
          <div className="p-4 rounded-md bg-obsidian-900 border border-obsidian-700">
            <div className="flex items-baseline justify-between mb-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
                Reactions
              </p>
              {activeReaction && (
                <button
                  type="button"
                  onClick={clearReaction}
                  className="font-mono text-[10px] uppercase tracking-wider text-text-secondary hover:text-ember-300 transition-colors"
                >
                  Clear · {activeReaction}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REACTION_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => triggerReaction(r.id)}
                  className={`px-2.5 py-1 rounded font-display text-xs border transition-colors ${
                    activeReaction === r.id
                      ? 'bg-ember-700/30 text-ember-300 border-ember-700'
                      : 'bg-obsidian-800 text-text-primary border-obsidian-700 hover:bg-obsidian-900/60'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live code export */}
          <CodeExport code={codeExport} title="eye-config.ts" />
        </div>

        {/* Right column — scrollable panels */}
        <div className="flex-1 space-y-3 min-w-0">
          <BreathPanel
            config={liveConfig.breath}
            onChange={(v) => updateConfig((c) => ({ ...c, breath: v }))}
          />
          <BlinksPanel
            config={liveConfig.blinks}
            onChange={(v) => updateConfig((c) => ({ ...c, blinks: v }))}
          />
          <LookAroundPanel
            config={liveConfig.lookAround}
            onChange={(v) =>
              updateConfig((c) => ({ ...c, lookAround: v }))
            }
          />
          <CursorTrackingPanel
            config={liveConfig.cursorTracking}
            onChange={(v) =>
              updateConfig((c) => ({ ...c, cursorTracking: v }))
            }
          />
          <StatesPanel
            config={liveConfig.states}
            onChange={(v) => updateConfig((c) => ({ ...c, states: v }))}
          />
          <ReactionsPanel
            config={liveConfig.reactions}
            onChange={(v) =>
              updateConfig((c) => ({ ...c, reactions: v }))
            }
          />
          <ColorsPanel
            config={liveConfig.colors}
            onChange={(v) => updateConfig((c) => ({ ...c, colors: v }))}
          />
          <SizeDegradationPanel
            config={liveConfig.sizeDegradation}
            onChange={(v) =>
              updateConfig((c) => ({ ...c, sizeDegradation: v }))
            }
          />
        </div>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────────
// PresetChip — one button in the preset bar
// ──────────────────────────────────────────────────────────────────────

function PresetChip({
  preset,
  active,
  onApply,
  onDelete,
}: {
  preset: Preset
  active: boolean
  onApply: () => void
  onDelete?: () => void
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onApply}
        className={`flex flex-col items-start px-3 py-2 rounded-md border transition-colors text-left ${
          active
            ? 'bg-ember-700/20 border-ember-700'
            : 'bg-obsidian-800 border-obsidian-700 hover:border-obsidian-700 hover:bg-obsidian-900/60'
        }`}
      >
        <span
          className={`font-display text-sm ${
            active ? 'text-ember-300' : 'text-text-primary'
          }`}
        >
          {preset.name}
        </span>
        <span className="font-body text-xs text-text-tertiary">
          {preset.description}
        </span>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Delete custom preset"
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 font-mono text-[10px] text-text-tertiary hover:text-danger-500 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  )
}
