// ──────────────────────────────────────────────────────────────────────
// CustomerProfileStrip — slim header above a customer's active section.
//
// Information only: name, status pill, and inline phone/email/address.
// Per Eidrix direction: no quick-action buttons, no "Ask Eidrix"
// shortcuts. Agent interactions live in the chat column, not here.
// ──────────────────────────────────────────────────────────────────────

import type { Customer } from '../../types/customer'
import StatusBadge from './StatusBadge'

interface CustomerProfileStripProps {
  record: Customer
}

export default function CustomerProfileStrip({
  record,
}: CustomerProfileStripProps) {
  return (
    <div className="px-6 py-4 border-b border-obsidian-800 bg-obsidian-900/30">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-xl text-text-primary">
          {record.name}
        </h1>
        <StatusBadge status={record.status} />
      </div>

      {(record.company || record.phone || record.email || record.address) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-body text-xs text-text-tertiary">
          {record.company && (
            <span className="text-text-secondary">{record.company}</span>
          )}
          {record.phone && (
            <span className="font-mono tabular-nums">{record.phone}</span>
          )}
          {record.email && (
            <span className="font-mono truncate max-w-[280px]">
              {record.email}
            </span>
          )}
          {record.address && (
            <span className="truncate max-w-[320px]">{record.address}</span>
          )}
        </div>
      )}
    </div>
  )
}
