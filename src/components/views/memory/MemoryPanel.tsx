// ──────────────────────────────────────────────────────────────────────
// MemoryPanel — the "Memory" section of Settings.
//
// Renders the full view of what Eidrix has learned about the signed-in
// user: search + filter by type + list of cards + export button.
// Empty state for fresh users. Each card surfaces edit/delete.
//
// Transparency is the point. Users see everything Eidrix has stored,
// can correct anything, can forget anything, can export everything.
// Memory becomes collaboration instead of surveillance.
// ──────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'

import type { FactType, MemoryFact } from '../../../types/memoryFact'
import { useMemoryStore } from '../../../lib/memoryStore'
import { useToast } from '../../../hooks/useToast'
import MemoryFactCard from './MemoryFactCard'
import DeleteMemoryDialog from './DeleteMemoryDialog'
import Button from '../../ui/Button'

const TYPE_OPTIONS: Array<{ value: FactType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'preference', label: 'Preferences' },
  { value: 'rule', label: 'Rules' },
  { value: 'commitment', label: 'Commitments' },
  { value: 'context', label: 'Context' },
  { value: 'observation', label: 'Observations' },
]

function downloadJsonBlob(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke on next tick so Chrome has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export default function MemoryPanel() {
  const facts = useMemoryStore((s) => s.facts)
  const isLoading = useMemoryStore((s) => s.isLoading)
  const loadError = useMemoryStore((s) => s.loadError)
  const softDelete = useMemoryStore((s) => s.softDelete)
  const exportToJson = useMemoryStore((s) => s.exportToJson)
  const toast = useToast()

  const [typeFilter, setTypeFilter] = useState<FactType | 'all'>('all')
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<MemoryFact | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return facts
      .filter((f) => typeFilter === 'all' || f.factType === typeFilter)
      .filter((f) => q === '' || f.content.toLowerCase().includes(q))
  }, [facts, typeFilter, query])

  const counts = useMemo(() => {
    const base: Record<FactType | 'all', number> = {
      all: facts.length,
      preference: 0,
      rule: 0,
      context: 0,
      commitment: 0,
      observation: 0,
    }
    for (const f of facts) base[f.factType]++
    return base
  }, [facts])

  function handleExport() {
    const json = exportToJson()
    const date = new Date().toISOString().slice(0, 10)
    downloadJsonBlob(json, `eidrix-memories-${date}.json`)
    toast.push({
      title: `Exported ${facts.length} ${facts.length === 1 ? 'memory' : 'memories'}`,
      variant: 'success',
      duration: 2000,
    })
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    const fact = pendingDelete
    setPendingDelete(null)
    await softDelete(fact.id)
    toast.push({
      title: 'Memory forgotten',
      variant: 'info',
      duration: 2000,
    })
  }

  return (
    <section className="bg-obsidian-900 border border-obsidian-800 rounded-lg p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-wider text-text-secondary">
            Memory
          </h2>
          <p className="font-body text-xs text-text-tertiary mt-1">
            What Eidrix has learned about you. Edit anything that's
            wrong; forget anything you'd rather it didn't keep.
          </p>
        </div>
        <Button
          label="Export"
          variant="secondary"
          size="sm"
          onClick={handleExport}
          disabled={facts.length === 0}
        />
      </div>

      {loadError && (
        <p className="font-mono text-xs text-danger-500 mb-4">
          Failed to load: {loadError}
        </p>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memories…"
          className="flex-1 min-w-[200px] rounded-sm border border-obsidian-700 bg-obsidian-800 px-3 py-1.5 font-body text-sm text-text-primary placeholder:text-text-tertiary focus:border-ember-500 focus:outline-none"
        />
      </div>

      {/* Type pills */}
      <div className="mb-5 flex flex-wrap items-center gap-1">
        {TYPE_OPTIONS.map((opt) => {
          const active = typeFilter === opt.value
          const count = counts[opt.value]
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTypeFilter(opt.value)}
              className={`rounded-sm px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                active
                  ? 'bg-ember-500 text-obsidian-950'
                  : 'bg-obsidian-800 text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {opt.label} <span className="opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {/* List / empty state */}
      {isLoading && facts.length === 0 ? (
        <p className="font-mono text-xs text-text-tertiary uppercase tracking-wider py-8 text-center">
          Loading memories…
        </p>
      ) : facts.length === 0 ? (
        <div className="border border-dashed border-obsidian-800 rounded-md p-10 text-center">
          <p className="font-body text-sm text-text-secondary">
            Eidrix hasn't learned anything about you yet.
          </p>
          <p className="font-body text-xs text-text-tertiary mt-1">
            Keep chatting — patterns will start showing up here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="font-body text-sm text-text-tertiary py-8 text-center">
          No memories match that filter.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => (
            <MemoryFactCard
              key={f.id}
              fact={f}
              onRequestDelete={() => setPendingDelete(f)}
            />
          ))}
        </div>
      )}

      <DeleteMemoryDialog
        fact={pendingDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  )
}
