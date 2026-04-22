// ──────────────────────────────────────────────────────────────────────
// RecordsTab — the Records tab content.
//
// Three render branches:
//   - Customers exist     → header + table
//   - Zero customers AND no undo pending → designed empty state
//   - Zero customers BUT an undo is pending → header + empty body, so
//     the user can hit Undo on the toast without seeing the empty state
//     flash for 5 seconds.
// ──────────────────────────────────────────────────────────────────────

import { useCustomerStore } from '../../lib/customerStore'
import { useCustomerFormStore } from '../../lib/customerFormStore'
import { useToast } from '../../hooks/useToast'
import type { Customer } from '../../types/customer'
import Button from '../ui/Button'
import CustomerTable from './CustomerTable'
import EmptyState from './EmptyState'

const UNDO_WINDOW_MS = 5000

export default function RecordsTab() {
  const customers = useCustomerStore((s) => s.customers)
  const pendingDeletes = useCustomerStore((s) => s.pendingDeletes)
  const deleteCustomer = useCustomerStore((s) => s.deleteCustomer)
  const undoDelete = useCustomerStore((s) => s.undoDelete)
  const finalizeDelete = useCustomerStore((s) => s.finalizeDelete)
  const openAdd = useCustomerFormStore((s) => s.openAdd)
  const openEdit = useCustomerFormStore((s) => s.openEdit)
  const toast = useToast()

  const handleDelete = (customer: Customer) => {
    deleteCustomer(customer.id)
    toast.push({
      title: `${customer.name} deleted`,
      variant: 'info',
      duration: UNDO_WINDOW_MS,
      action: {
        label: 'Undo',
        onClick: () => undoDelete(customer.id),
      },
      // Clicking × on the toast = "I'm done with this notification,
      // commit the delete now." Idempotent: if the 5s timer already
      // finalized, this is a no-op.
      onDismiss: () => finalizeDelete(customer.id),
    })
  }

  const isEmpty = customers.length === 0
  const hasPendingDelete = Object.keys(pendingDeletes).length > 0
  const showEmptyState = isEmpty && !hasPendingDelete

  if (showEmptyState) {
    return <EmptyState onAdd={openAdd} />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header — title + count + Add button */}
      <header className="flex-shrink-0 flex items-baseline justify-between px-6 pt-6 pb-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl text-text-primary">Records</h1>
          <span className="font-mono text-xs text-text-tertiary tabular-nums">
            {customers.length}{' '}
            {customers.length === 1 ? 'customer' : 'customers'}
          </span>
        </div>
        <Button label="Add customer" onClick={openAdd} size="sm" />
      </header>

      {/* Table fills the rest */}
      <div className="flex-1 overflow-y-auto px-2">
        <CustomerTable
          customers={customers}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
