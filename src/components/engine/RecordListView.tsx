// ──────────────────────────────────────────────────────────────────────
// RecordListView — generic record list, driven by a RecordsConfig.
//
// Replaces the old CustomerTable + RecordsTab orchestrator. Knows
// nothing about customers, products, or any specific record type —
// reads columns and labels from the config, delegates row interactions
// to the config's handlers.
//
// Three render branches (same rules as the old RecordsTab):
//   - customers.length > 0         → header + table
//   - 0 records, no undo pending   → empty state
//   - 0 records, undo pending      → header + empty table body
// ──────────────────────────────────────────────────────────────────────

import type { RecordsConfig } from '../../config/businessConfig'
import { useCustomerStore } from '../../lib/customerStore'
import Button from '../ui/Button'
import EmptyStateForRecords from './EmptyStateForRecords'
import RecordListRow from './RecordListRow'

interface RecordListViewProps {
  records: RecordsConfig
}

export default function RecordListView({ records }: RecordListViewProps) {
  // Subscribe via the config's hook so we re-render when records change.
  const list = records.useRecords()

  // Pending-delete awareness — contractor's customers have the undo
  // pattern. We read it directly from customerStore because it's the
  // only record type with pending deletes in this chapter. A more
  // abstract design would route this through the config, but that's
  // scope creep until a second record type actually needs it.
  const pendingDeletes = useCustomerStore((s) => s.pendingDeletes)
  const hasPendingDelete =
    records.recordType === 'customer' && Object.keys(pendingDeletes).length > 0

  const isEmpty = list.length === 0
  const showEmptyState = isEmpty && !hasPendingDelete

  if (showEmptyState) {
    return (
      <EmptyStateForRecords
        singular={records.singular}
        plural={records.plural}
        onAdd={records.onAddRecord}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header — title + count + Add button (if config supports add) */}
      <header className="flex-shrink-0 flex items-baseline justify-between px-6 pt-6 pb-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl text-text-primary">
            {records.plural}
          </h1>
          <span className="font-mono text-xs text-text-tertiary tabular-nums">
            {list.length}{' '}
            {list.length === 1
              ? records.singular.toLowerCase()
              : records.plural.toLowerCase()}
          </span>
        </div>
        {records.onAddRecord && (
          <Button
            label={`Add ${records.singular.toLowerCase()}`}
            onClick={records.onAddRecord}
            size="sm"
          />
        )}
      </header>

      {/* Table — pinned header, scrollable body */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-obsidian-700">
                {records.columns.map((col) => (
                  <th
                    key={col.id}
                    scope="col"
                    className={`${col.widthClass ?? ''} px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-text-tertiary font-normal sticky top-0 bg-background z-10`}
                  >
                    {col.header}
                  </th>
                ))}
                {records.onDeleteRecord && (
                  <th
                    scope="col"
                    aria-label="Actions"
                    className="w-10 px-4 py-2 sticky top-0 bg-background z-10"
                  />
                )}
              </tr>
            </thead>
            <tbody>
              {list.map((record) => (
                <RecordListRow
                  key={records.getId(record)}
                  record={record}
                  records={records}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
