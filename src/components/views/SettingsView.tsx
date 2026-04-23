// ──────────────────────────────────────────────────────────────────────
// SettingsView — Settings primary tab.
//
// Sections (top to bottom):
//   - Account     (Ch 14) — email + user ID, read-only
//   - Workspace   (Ch 14) — org name + your role
//   - Agent       (AC-02) — system prompt, context mode, model — editable
//   - Sign out    (Ch 14) — single button
//
// The Agent section uses local "draft" state so editing the prompt
// doesn't fire DB writes per keystroke. Save persists, Reset wipes back
// to defaults.
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

import { useAuth } from '../../lib/useAuth'
import { useAgentSettingsStore } from '../../lib/agentSettingsStore'
import { useToast } from '../../hooks/useToast'
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_CONTEXT_MODE,
  DEFAULT_MODEL,
  MODEL_META,
  MODEL_ORDER,
  type ContextMode,
  type AgentModel,
} from '../../types/agentSettings'
import Button from '../ui/Button'

const CONTEXT_OPTIONS: { value: ContextMode; label: string }[] = [
  { value: 'off', label: 'Off (tool-driven)' },
  { value: 'subset', label: 'Smart Subset' },
  { value: 'full', label: 'Full' },
]

// Post-AC-03 copy: Eidrix now has tools (searchCustomers, findJobsFor*,
// summarizeForCustomer, etc.) — so "Off" no longer means blindness. It
// means the agent reads row-level data on demand by calling tools.
// Workspace totals (customer/job/proposal counts by status) are
// ALWAYS preloaded on every request regardless of mode — they're
// tiny aggregates that give the agent free orientation. See
// REAL_EIDRIX_NOTES "Layered context model" for the design.
const CONTEXT_HINTS: Record<ContextMode, string> = {
  off: 'Workspace totals preloaded; row-level data fetched on demand via tools (search, find, summarize). Cheapest on tokens, scales best. Recommended.',
  subset: 'Totals + recent customers + open jobs preloaded. Useful when "right now" questions dominate. Tools still available for older data.',
  full: 'Totals + every customer + every job preloaded. Fine on small datasets; redundant with tools at scale.',
}

export default function SettingsView() {
  const { user, activeOrg, signOut } = useAuth()
  const settings = useAgentSettingsStore((s) => s.settings)
  const isLoading = useAgentSettingsStore((s) => s.isLoading)
  const isSaving = useAgentSettingsStore((s) => s.isSaving)
  const loadError = useAgentSettingsStore((s) => s.loadError)
  const updateSettings = useAgentSettingsStore((s) => s.updateSettings)
  const resetToDefaults = useAgentSettingsStore((s) => s.resetToDefaults)
  const toast = useToast()

  // Local draft state — editing the prompt doesn't fire writes per keystroke.
  const [draftPrompt, setDraftPrompt] = useState('')
  const [draftMode, setDraftMode] = useState<ContextMode>(DEFAULT_CONTEXT_MODE)
  const [draftModel, setDraftModel] = useState<AgentModel>(DEFAULT_MODEL)

  // Sync draft from store whenever settings load or change externally.
  useEffect(() => {
    if (settings) {
      setDraftPrompt(settings.systemPrompt)
      setDraftMode(settings.contextMode)
      setDraftModel(settings.model)
    }
  }, [settings])

  const hasChanges =
    !!settings &&
    (draftPrompt !== settings.systemPrompt ||
      draftMode !== settings.contextMode ||
      draftModel !== settings.model)

  const isAtDefaults =
    draftPrompt === DEFAULT_SYSTEM_PROMPT &&
    draftMode === DEFAULT_CONTEXT_MODE &&
    draftModel === DEFAULT_MODEL

  async function handleSave() {
    if (!hasChanges || isSaving) return
    await updateSettings({
      systemPrompt: draftPrompt,
      contextMode: draftMode,
      model: draftModel,
    })
    toast.push({
      title: 'Agent settings saved',
      variant: 'success',
      duration: 2000,
    })
  }

  async function handleReset() {
    if (isSaving) return
    setDraftPrompt(DEFAULT_SYSTEM_PROMPT)
    setDraftMode(DEFAULT_CONTEXT_MODE)
    setDraftModel(DEFAULT_MODEL)
    await resetToDefaults()
    toast.push({
      title: 'Restored defaults',
      variant: 'info',
      duration: 2000,
    })
  }

  return (
    <div className="h-full overflow-auto eidrix-scrollbar p-8">
      <div className="max-w-[640px] flex flex-col gap-8">
        <header>
          <h1 className="font-display text-2xl text-text-primary tracking-tight">
            Settings
          </h1>
          <p className="font-body text-sm text-text-secondary mt-1">
            Your account, workspace, and agent.
          </p>
        </header>

        {/* ─── Account ────────────────────────────────────────────── */}
        <section className="bg-obsidian-900 border border-obsidian-800 rounded-lg p-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-text-secondary mb-4">
            Account
          </h2>
          <dl className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-6 text-sm">
            <dt className="text-text-tertiary">Email</dt>
            <dd className="text-text-primary font-mono text-[13px]">
              {user?.email ?? '—'}
            </dd>
            <dt className="text-text-tertiary">User ID</dt>
            <dd className="text-text-tertiary font-mono text-[11px] truncate">
              {user?.id ?? '—'}
            </dd>
          </dl>
        </section>

        {/* ─── Workspace ──────────────────────────────────────────── */}
        <section className="bg-obsidian-900 border border-obsidian-800 rounded-lg p-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-text-secondary mb-4">
            Workspace
          </h2>
          <dl className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-6 text-sm">
            <dt className="text-text-tertiary">Name</dt>
            <dd className="text-text-primary">{activeOrg?.name ?? '—'}</dd>
            <dt className="text-text-tertiary">Role</dt>
            <dd className="text-text-primary capitalize">
              {activeOrg?.role ?? '—'}
            </dd>
          </dl>
        </section>

        {/* ─── Agent (AC-02) ──────────────────────────────────────── */}
        <section className="bg-obsidian-900 border border-obsidian-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-mono text-xs uppercase tracking-wider text-text-secondary">
                Agent
              </h2>
              <p className="font-body text-xs text-text-tertiary mt-1">
                Customize how Eidrix talks and what it sees.
              </p>
            </div>
            {isAtDefaults && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary/70">
                At defaults
              </span>
            )}
          </div>

          {(() => {
            if (isLoading && !settings) {
              return (
                <p className="font-mono text-xs text-text-tertiary uppercase tracking-wider py-8 text-center">
                  Loading settings…
                </p>
              )
            }
            if (loadError) {
              return (
                <p className="font-mono text-xs text-danger-500 py-4">
                  Failed to load: {loadError}
                </p>
              )
            }
            return (
              <div className="space-y-6">
              {/* System prompt */}
              <div>
                <label
                  htmlFor="agent-system-prompt"
                  className="block font-mono text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-2"
                >
                  System prompt
                </label>
                <textarea
                  id="agent-system-prompt"
                  value={draftPrompt}
                  onChange={(e) => setDraftPrompt(e.target.value)}
                  className="w-full min-h-[260px] font-mono text-[13px] bg-obsidian-800 text-text-primary border border-obsidian-700 rounded-md px-3 py-2 focus:border-ember-500 focus:outline-none resize-y leading-relaxed"
                />
                <p className="font-body text-[11px] text-text-tertiary mt-2">
                  The instructions Eidrix uses every conversation. Edit the
                  voice, the rules, the framing.
                </p>
              </div>

              {/* Context mode */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-2">
                  Context mode
                </label>
                <div className="inline-flex items-center gap-1 bg-obsidian-800 border border-obsidian-700 rounded-md p-1">
                  {CONTEXT_OPTIONS.map((opt) => {
                    const active = draftMode === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDraftMode(opt.value)}
                        className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider rounded-sm transition-all ${
                          active
                            ? 'bg-ember-500 text-obsidian-950'
                            : 'text-text-tertiary hover:text-text-secondary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                <p className="font-body text-[11px] text-text-tertiary mt-2">
                  {CONTEXT_HINTS[draftMode]}
                </p>
              </div>

              {/* Model */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-2">
                  Model
                </label>
                <div className="space-y-1.5">
                  {MODEL_ORDER.map((id) => {
                    const meta = MODEL_META[id]
                    const active = draftModel === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDraftModel(id)}
                        className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-md border transition-all ${
                          active
                            ? 'bg-ember-500/10 border-ember-500/60 text-text-primary'
                            : 'bg-obsidian-800 border-obsidian-700 text-text-secondary hover:border-obsidian-700/80'
                        }`}
                      >
                        <span className="font-body text-sm">{meta.label}</span>
                        <span
                          className={`font-mono text-[11px] tabular-nums ${
                            active ? 'text-ember-300' : 'text-text-tertiary'
                          }`}
                        >
                          ${meta.inputRate} / ${meta.outputRate} per 1M
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="font-body text-[11px] text-text-tertiary mt-2">
                  Cost shown as input / output rates per million tokens.
                  Sonnet is the workhorse default.
                </p>
              </div>

              {/* Save / Reset */}
              <div className="flex items-center justify-between pt-4 border-t border-obsidian-800">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving || isAtDefaults}
                  className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary hover:text-text-secondary disabled:opacity-40 disabled:hover:text-text-tertiary transition-colors"
                >
                  Reset to defaults
                </button>
                <Button
                  label="Save"
                  variant="primary"
                  size="md"
                  disabled={!hasChanges}
                  loading={isSaving}
                  onClick={handleSave}
                />
              </div>
            </div>
            )
          })()}
        </section>

        {/* ─── Sign out ───────────────────────────────────────────── */}
        <section className="flex items-center justify-between bg-obsidian-900 border border-obsidian-800 rounded-lg p-6">
          <div>
            <h2 className="font-body text-sm text-text-primary">Sign out</h2>
            <p className="font-body text-xs text-text-secondary mt-0.5">
              Ends your session and returns to the sign-in screen.
            </p>
          </div>
          <Button
            label="Sign out"
            variant="secondary"
            size="sm"
            onClick={signOut}
          />
        </section>
      </div>
    </div>
  )
}
