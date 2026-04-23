// ──────────────────────────────────────────────────────────────────────
// JobRelatedCustomerSection — shows the customer this job belongs to.
//
// Read-only summary card with click-through to open the customer as
// a record tab. The actual customer-reassignment lives in the Overview
// section (the customer select dropdown there is the canonical control).
// ──────────────────────────────────────────────────────────────────────

import type { Job } from '../../../types/job'
import { useCustomerStore } from '../../../lib/customerStore'
import { useTabStore } from '../../../lib/tabStore'
import StatusBadge from '../StatusBadge'

interface JobRelatedCustomerSectionProps {
  record: Job
}

export default function JobRelatedCustomerSection({
  record,
}: JobRelatedCustomerSectionProps) {
  const customer = useCustomerStore((s) =>
    s.customers.find((c) => c.id === record.customerId),
  )

  if (!customer) {
    return (
      <div className="p-6 max-w-2xl">
        <p className="font-mono text-xs text-text-tertiary uppercase tracking-wider">
          Customer not found
        </p>
        <p className="font-body text-sm text-text-secondary mt-2">
          The customer associated with this job is missing or unavailable.
          Reassign in the Overview tab.
        </p>
      </div>
    )
  }

  function openCustomer() {
    if (!customer) return
    useTabStore.getState().openRecordTab('records', customer)
  }

  return (
    <div className="p-6 max-w-2xl">
      <button
        type="button"
        onClick={openCustomer}
        className="w-full text-left bg-obsidian-900 border border-obsidian-800 hover:border-ember-700/40 rounded-lg p-5 transition-colors"
      >
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-display text-lg text-text-primary">
            {customer.name}
          </h3>
          <StatusBadge status={customer.status} />
        </div>

        {customer.company && (
          <p className="font-body text-sm text-text-secondary mb-2">
            {customer.company}
          </p>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-1 font-body text-xs text-text-tertiary">
          {customer.phone && (
            <span className="font-mono tabular-nums">{customer.phone}</span>
          )}
          {customer.email && (
            <span className="font-mono truncate max-w-[280px]">
              {customer.email}
            </span>
          )}
        </div>

        <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ember-300/80">
          Open customer →
        </p>
      </button>
    </div>
  )
}
