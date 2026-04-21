import { useState } from 'react'
import EidrixEye from './brand/EidrixEye'
import type { EyeState, ReactionName } from './brand/eye-config'

const STATES: { id: EyeState; label: string; hint: string }[] = [
  { id: 'idle', label: 'Idle', hint: 'base — breath, blinks, look-around' },
  { id: 'thinking', label: 'Thinking', hint: 'iris contracts, breath slows' },
  { id: 'speaking', label: 'Speaking', hint: 'iris pulses rhythmically' },
  { id: 'muted', label: 'Muted', hint: 'dims, breath slows, blinks stop' },
]

const REACTIONS: { id: ReactionName; label: string; hint: string }[] = [
  { id: 'greeting', label: 'Greeting', hint: 'heartbeat + glow ignites' },
  { id: 'acknowledge', label: 'Acknowledge', hint: 'glance + glow brighten' },
  { id: 'noticed', label: 'Noticed', hint: 'fast flick, no glow change' },
  { id: 'processing', label: 'Processing', hint: 'glow inhale/exhale (loops)' },
  { id: 'completion', label: 'Completion', hint: 'deep breath + warmth' },
  { id: 'handoff', label: 'Handoff', hint: 'centers + soft dim' },
  { id: 'uncertainty', label: 'Uncertainty', hint: 'cobalt glow + tremor' },
]

export default function BrandTab() {
  const [eyeState, setEyeState] = useState<EyeState>('idle')
  const [activeReaction, setActiveReaction] = useState<ReactionName | null>(
    null
  )

  const triggerReaction = (id: ReactionName) => {
    // Re-trigger by clearing first then re-setting on next tick.
    // Required because clicking the SAME reaction twice wouldn't fire
    // the useEffect otherwise (same value).
    setActiveReaction(null)
    requestAnimationFrame(() => setActiveReaction(id))
  }

  const clearReaction = () => setActiveReaction(null)

  return (
    <section className="px-8 py-10 max-w-5xl">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-text-tertiary">
          §05 →
        </span>
        <h2 className="font-display text-3xl text-text-primary">Brand</h2>
      </div>
      <p className="font-body text-sm text-text-secondary max-w-2xl mb-12">
        The signature of Eidrix. A living companion that breathes, blinks,
        and reacts alongside you. The real tuning playground with live
        sliders and preset save/load arrives in AC-08b — for now, this is
        the demo surface where the Eye lives at full scale.
      </p>

      <div className="flex items-center justify-center py-12">
        <EidrixEye
          state={eyeState}
          reaction={activeReaction}
          onReactionComplete={clearReaction}
          size={240}
        />
      </div>

      {/* State switcher */}
      <div className="mt-4 p-4 rounded-md bg-obsidian-900 border border-obsidian-700">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary mb-3">
          State — click to switch
        </p>
        <div className="flex flex-wrap gap-2">
          {STATES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setEyeState(s.id)}
              className={`flex flex-col items-start px-3 py-2 rounded-md border transition-colors text-left ${
                eyeState === s.id
                  ? 'bg-ember-700/20 border-ember-700'
                  : 'bg-obsidian-800 border-obsidian-700 hover:bg-obsidian-900/60'
              }`}
            >
              <span
                className={`font-display text-sm ${
                  eyeState === s.id ? 'text-ember-300' : 'text-text-primary'
                }`}
              >
                {s.label}
              </span>
              <span className="font-body text-xs text-text-tertiary">
                {s.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reaction triggers */}
      <div className="mt-4 p-4 rounded-md bg-obsidian-900 border border-obsidian-700">
        <div className="flex items-baseline justify-between mb-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
            Reactions — click to fire (interrupts state briefly)
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
        <div className="flex flex-wrap gap-2">
          {REACTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => triggerReaction(r.id)}
              className={`flex flex-col items-start px-3 py-2 rounded-md border transition-colors text-left ${
                activeReaction === r.id
                  ? 'bg-ember-700/20 border-ember-700'
                  : 'bg-obsidian-800 border-obsidian-700 hover:bg-obsidian-900/60'
              }`}
            >
              <span
                className={`font-display text-sm ${
                  activeReaction === r.id
                    ? 'text-ember-300'
                    : 'text-text-primary'
                }`}
              >
                {r.label}
              </span>
              <span className="font-body text-xs text-text-tertiary">
                {r.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary text-center mt-8">
        Foundation — all five layers wired
      </p>
      <p className="font-body text-sm text-text-tertiary text-center mt-2 max-w-xl mx-auto">
        Layers 1–5 are live. Layer 6 (expression tinting — subtle color
        shifts per state) lights up next.
      </p>
    </section>
  )
}
