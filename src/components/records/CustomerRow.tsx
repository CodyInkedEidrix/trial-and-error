// ──────────────────────────────────────────────────────────────────────
// CustomerRow — a single row in the customer table.
//
// Whole row is clickable (opens edit). The delete icon stops propagation
// so clicking it doesn't also open the edit panel. Keyboard parity:
// Enter/Space on the row fires the edit handler; Tab moves through
// row → delete → row → delete in order.
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import type { Customer } from '../../types/customer'
import { formatRelative } from '../../lib/relativeTime'
import { useCustomerStore } from '../../lib/customerStore'
import StatusBadge from './StatusBadge'

interface CustomerRowProps {
  customer: Customer
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export default function CustomerRow({
  customer,
  onEdit,
  onDelete,
}: CustomerRowProps) {
  // Per-row subscription — each row only re-renders when the flash
  // signal matches (or stops matching) its own id.
  const isFlashing = useCustomerStore(
    (s) => s.recentlyAddedId === customer.id,
  )
  const rowRef = useRef<HTMLTableRowElement>(null)

  // When this row becomes the newly-added one, scroll it into view.
  // `block: 'center'` keeps it away from header/footer edges.
  useEffect(() => {
    if (isFlashing) {
      rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isFlashing])

  const handleRowKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onEdit(customer)
    }
  }

  return (
    <tr
      ref={rowRef}
      onClick={() => onEdit(customer)}
      onKeyDown={handleRowKey}
      tabIndex={0}
      role="button"
      aria-label={`Edit ${customer.name}`}
      className={`group cursor-pointer border-b border-obsidian-800 transition-all duration-150 outline-none hover:bg-ember-500/[0.05] focus-visible:bg-ember-500/[0.08] hover:shadow-[inset_2px_0_0_var(--ember-500)] focus-visible:shadow-[inset_2px_0_0_var(--ember-500)] ${isFlashing ? 'eidrix-row-flash' : ''}`}
    >
      {/* Name + company subtitle */}
      <td className="px-4 py-3">
        <div className="font-body text-sm text-text-primary transition-colors group-hover:text-ember-300 group-focus-visible:text-ember-300">
          {customer.name}
        </div>
        {customer.company && (
          <div className="font-body text-xs text-text-tertiary mt-0.5">
            {customer.company}
          </div>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={customer.status} />
      </td>

      {/* Contact — phone on top, email below if both present */}
      <td className="px-4 py-3">
        {customer.phone && (
          <div className="font-mono text-xs text-text-secondary tabular-nums">
            {customer.phone}
          </div>
        )}
        {customer.email && (
          <div className="font-mono text-[11px] text-text-tertiary mt-0.5 truncate max-w-[220px]">
            {customer.email}
          </div>
        )}
        {!customer.phone && !customer.email && (
          <span className="font-mono text-xs text-text-tertiary">—</span>
        )}
      </td>

      {/* Last activity */}
      <td className="px-4 py-3">
        <span className="font-body text-xs text-text-tertiary">
          {formatRelative(customer.lastActivityAt)}
        </span>
      </td>

      {/* Delete icon — revealed on row hover/focus, reddens on its own hover */}
      <td className="px-4 py-3 w-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(customer)
          }}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`Delete ${customer.name}`}
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
    </tr>
  )
}
