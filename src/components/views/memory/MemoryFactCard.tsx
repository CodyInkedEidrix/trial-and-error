// ──────────────────────────────────────────────────────────────────────
// MemoryFactCard — one row in the Memory list.
//
// Default state: content + type badge + confidence + source date +
// Edit / Delete actions.
//
// Edit mode: content becomes an inline textarea with Save / Cancel.
// On save: store.updateFact + fires re-embed in background.
//
// Entity-linked facts show "About: {name}" as a click-through to the
// related record tab. If the entity was deleted (entity_id no longer
// in its store), falls back to "(deleted)".
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'

import type { FactType, MemoryFact } from '../../../types/memoryFact'
import { useMemoryStore } from '../../../lib/memoryStore'
import { useCustomerStore } from '../../../lib/customerStore'
import { useJobStore } from '../../../lib/jobStore'
import { useProposalStore } from '../../../lib/proposalStore'
import { useTabStore } from '../../../lib/tabStore'

interface MemoryFactCardProps {
  fact: MemoryFact
  onRequestDelete: () => void
}

const TYPE_COLORS: Record<FactType, string> = {
  preference: 'bg-ember-500/20 text-ember-300',
  rule: 'bg-cobalt-500/20 text-cobalt-500',
  context: 'bg-obsidian-700 text-text-secondary',
  commitment: 'bg-success-500/20 text-success-500',
  observation: 'bg-obsidian-800 text-text-tertiary italic',
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}

export default function MemoryFactCard({
  fact,
  onRequestDelete,
}: MemoryFactCardProps) {
  const updateFact = useMemoryStore((s) => s.updateFact)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(fact.content)

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
        textareaRef.current?.select()
      })
    }
  }, [isEditing])

  function startEdit() {
    setDraft(fact.content)
    setIsEditing(true)
  }
  function cancelEdit() {
    setDraft(fact.content)
    setIsEditing(false)
  }
  function saveEdit() {
    const trimmed = draft.trim()
    if (trimmed === '' || trimmed === fact.content) {
      cancelEdit()
      return
    }
    // updateFact kicks off re-embed automatically when content changes.
    void updateFact(fact.id, { content: trimmed })
    setIsEditing(false)
  }

  return (
    <div className="rounded-md border border-obsidian-800 bg-obsidian-900 p-4 transition-colors hover:border-obsidian-700/80">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`inline-block rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TYPE_COLORS[fact.factType]}`}
        >
          {fact.factType}
        </span>
        <span className="font-mono text-[10px] text-text-tertiary tabular-nums">
          {fact.confidence.toFixed(2)}
        </span>
        <EntityPill
          entityType={fact.entityType}
          entityId={fact.entityId}
        />
        <span className="ml-auto font-mono text-[10px] text-text-tertiary">
          {formatRelativeDate(fact.createdAt)}
        </span>
      </div>

      {isEditing ? (
        <>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelEdit()
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveEdit()
            }}
            rows={3}
            className="w-full rounded-sm border border-ember-500/40 bg-obsidian-950 px-3 py-2 font-body text-sm text-text-primary focus:border-ember-500 focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              className="rounded-sm bg-ember-500 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-obsidian-950 hover:bg-ember-300"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary hover:text-text-secondary"
            >
              Cancel
            </button>
            <span className="ml-auto font-mono text-[10px] text-text-tertiary">
              Saving re-embeds in the background
            </span>
          </div>
        </>
      ) : (
        <>
          <p className="font-body text-sm text-text-primary">{fact.content}</p>
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={startEdit}
              className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary hover:text-text-secondary"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onRequestDelete}
              className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary hover:text-danger-500"
            >
              Forget
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function EntityPill({
  entityType,
  entityId,
}: {
  entityType: MemoryFact['entityType']
  entityId: MemoryFact['entityId']
}) {
  const customer = useCustomerStore((s) =>
    entityType === 'customer' && entityId
      ? s.customers.find((c) => c.id === entityId)
      : undefined,
  )
  const job = useJobStore((s) =>
    entityType === 'job' && entityId
      ? s.jobs.find((j) => j.id === entityId)
      : undefined,
  )
  const proposal = useProposalStore((s) =>
    entityType === 'proposal' && entityId
      ? s.proposals.find((p) => p.id === entityId)
      : undefined,
  )
  const navigatePrimary = useTabStore((s) => s.navigatePrimary)
  const openRecordTab = useTabStore((s) => s.openRecordTab)

  if (!entityType || !entityId) return null

  const label =
    customer?.name ??
    job?.title ??
    proposal?.title ??
    '(deleted)'
  const clickable =
    customer !== undefined || job !== undefined || proposal !== undefined

  function handleClick() {
    if (customer) {
      openRecordTab('records', customer)
      navigatePrimary('records')
      return
    }
    if (job) {
      openRecordTab('jobs', job)
      navigatePrimary('jobs')
      return
    }
    if (proposal) {
      openRecordTab('proposals', proposal)
      navigatePrimary('proposals')
    }
  }

  const base =
    'inline-flex items-center gap-1 rounded-sm border border-obsidian-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider'
  if (!clickable) {
    return (
      <span className={`${base} text-text-tertiary italic`}>
        {entityType}: {label}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${base} text-text-secondary hover:border-ember-700/50 hover:text-ember-300`}
    >
      {entityType}: {label}
    </button>
  )
}
