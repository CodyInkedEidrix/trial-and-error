// ──────────────────────────────────────────────────────────────────────
// RecordListRow — generic table row, driven by a RecordsConfig.
//
// Replaces CustomerRow. Same visual contract (hover ember stripe,
// focus parity, delete icon reveal, keyboard activation, flash on
// newly-added rows) but generic over record type — reads columns and
// handlers from the config.
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'

import type { RecordsConfig } from '../../config/businessConfig'

interface RecordListRowProps {
  record: unknown
  records: RecordsConfig
}

export default function RecordListRow({ record, records }: RecordListRowProps) {
  // Row flash for newly-added records — the config optionally provides
  // a hook that returns the id of a recently-added record. We call it
  // unconditionally (always the same reference within a render cycle)
  // with a null-returning fallback when the config doesn't wire it.
  const useFlashSignal = records.useRecentlyAddedId ?? (() => null)
  const flashingId = useFlashSignal()
  const isFlashing = flashingId === records.getId(record)

  const rowRef = useRef<HTMLTableRowElement>(null)

  // Scroll into view when a row becomes the newly-added one.
  useEffect(() => {
    if (isFlashing) {
      rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isFlashing])

  const handleKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      records.onRowClick(record)
    }
  }

  const displayName = records.getDisplayName(record)

  return (
    <tr
      ref={rowRef}
      onClick={() => records.onRowClick(record)}
      onKeyDown={handleKey}
      tabIndex={0}
      role="button"
      aria-label={`Open ${displayName}`}
      className={`group cursor-pointer border-b border-obsidian-800 transition-all duration-150 outline-none hover:bg-ember-500/[0.05] focus-visible:bg-ember-500/[0.08] hover:shadow-[inset_2px_0_0_var(--ember-500)] focus-visible:shadow-[inset_2px_0_0_var(--ember-500)] ${isFlashing ? 'eidrix-row-flash' : ''}`}
    >
      {records.columns.map((col) => (
        <td key={col.id} className="px-4 py-3">
          {col.render(record)}
        </td>
      ))}

      {records.onDeleteRecord && (
        <td className="px-4 py-3 w-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              records.onDeleteRecord?.(record)
            }}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={`Delete ${displayName}`}
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 text-text-tertiary hover:text-danger-500 focus-visible:text-danger-500 transition-opacity transition-colors p-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-ember-500/60"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        </td>
      )}
    </tr>
  )
}
