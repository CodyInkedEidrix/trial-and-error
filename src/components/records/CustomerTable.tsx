// ──────────────────────────────────────────────────────────────────────
// CustomerTable — header + body for the Records tab.
//
// Uses a semantic <table> so screen readers announce column headers.
// The tbody is the scrollable region; the thead stays pinned via
// `sticky top-0` on the header cells.
// ──────────────────────────────────────────────────────────────────────

import type { Customer } from '../../types/customer'
import CustomerRow from './CustomerRow'

interface CustomerTableProps {
  customers: Customer[]
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

const columns = [
  { key: 'name', label: 'Customer', className: 'w-[30%]' },
  { key: 'status', label: 'Status', className: 'w-[14%]' },
  { key: 'contact', label: 'Contact', className: 'w-[26%]' },
  { key: 'activity', label: 'Last activity', className: 'w-[20%]' },
  { key: 'delete', label: '', className: 'w-10' },
] as const

export default function CustomerTable({
  customers,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  return (
    <div className="w-full">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-obsidian-700">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`${col.className} px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-text-tertiary font-normal sticky top-0 bg-background z-10`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
