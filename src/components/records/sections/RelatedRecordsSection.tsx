// ──────────────────────────────────────────────────────────────────────
// RelatedRecordsSection — shared shell for inverse-relation lists
// rendered inside a record detail tab.
//
// Examples where this renders:
//   - A Customer's Jobs sub-section  (items: jobs belonging to them)
//   - A Customer's Proposals sub-section
//   - A Job's Proposals sub-section
//   - (future) An Invoice's LineItems sub-section
//   - (future) A Customer's Invoices sub-section
//
// The three things that differ per use-site:
//   1. The column layout (Jobs has 4 columns, Proposals has 3)
//   2. The per-row cell content
//   3. Copy (title, empty-state message, "Add X" label)
//
// Everything else — the "N items" subtitle, the add-button affordance,
// the empty-state card, the hover/border styling of the row list — is
// shared so real Eidrix's 10+ inverse sections stay in lockstep.
// ──────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'

import Button from '../../ui/Button'

interface RelatedRecordsSectionProps<T> {
  /** Heading text — "Jobs", "Proposals", "Invoices", etc. */
  title: string

  /** Singular noun for the subtitle count ("3 jobs", "1 proposal"). */
  itemNounSingular: string

  /** Pre-filtered items. The caller selects + filters upstream so the
   *  section stays generic. */
  items: T[]

  /** Stable identity accessor, used for React keys. */
  getId: (item: T) => string

  /** Row content renderer. Caller returns cells; this component wraps
   *  them in the button/grid/hover chrome. Whatever grid the caller
   *  passes via `gridClasses` must match the number of cells rendered. */
  renderRow: (item: T) => ReactNode

  /** Tailwind class for the grid columns — e.g.,
   *  `'grid-cols-[1fr_auto_auto]'`. Defaults to the three-column
   *  layout that most sections use. */
  gridClasses?: string

  /** Called when the "Add X" button is clicked. */
  onAdd: () => void

  /** Called when a row is clicked. */
  onItemClick: (item: T) => void

  /** Copy shown in the dashed-border empty state card. */
  emptyCopy: string

  /** Label on the Add button. Defaults to `Add ${title.slice(0, -1)}`
   *  which works for "Jobs"→"Add Job", "Proposals"→"Add Proposal". */
  addButtonLabel?: string
}

const DEFAULT_GRID = 'grid-cols-[1fr_auto_auto]'

export default function RelatedRecordsSection<T>({
  title,
  itemNounSingular,
  items,
  getId,
  renderRow,
  gridClasses = DEFAULT_GRID,
  onAdd,
  onItemClick,
  emptyCopy,
  addButtonLabel,
}: RelatedRecordsSectionProps<T>) {
  const count = items.length
  const subtitle =
    count === 0
      ? `No ${itemNounSingular}s yet.`
      : `${count} ${itemNounSingular}${count === 1 ? '' : 's'}`

  const resolvedAddLabel = addButtonLabel ?? `Add ${itemNounSingular}`

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-xl text-text-primary">{title}</h2>
          <p className="font-body text-xs text-text-tertiary mt-0.5">
            {subtitle}
          </p>
        </div>
        <Button
          label={resolvedAddLabel}
          variant="secondary"
          size="sm"
          onClick={onAdd}
        />
      </div>

      {count === 0 ? (
        <div className="border border-dashed border-obsidian-800 rounded-md p-8 text-center">
          <p className="font-body text-sm text-text-secondary">{emptyCopy}</p>
        </div>
      ) : (
        <div className="border border-obsidian-800 rounded-md overflow-hidden">
          {items.map((item, i) => (
            <button
              key={getId(item)}
              type="button"
              onClick={() => onItemClick(item)}
              className={`group w-full text-left grid ${gridClasses} items-center gap-4 px-4 py-3 hover:bg-obsidian-800/40 transition-colors ${
                i > 0 ? 'border-t border-obsidian-800' : ''
              }`}
            >
              {renderRow(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
