// ──────────────────────────────────────────────────────────────────────
// JobProfileStrip — slim header above a job's active section.
//
// Information-only, mirroring CustomerProfileStrip. Surfaces title,
// status, related customer name, scheduled date, amount.
// ──────────────────────────────────────────────────────────────────────

import type { Job } from '../../types/job'
import { useCustomerStore } from '../../lib/customerStore'
import JobStatusBadge from './JobStatusBadge'

interface JobProfileStripProps {
  record: Job
}

function formatAmount(amount: number | undefined): string | null {
  if (amount === undefined || amount === null) return null
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function formatScheduledDate(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function JobProfileStrip({ record }: JobProfileStripProps) {
  // Look up the related customer's name from the store. If they've
  // been deleted (cascade unlikely since FK cascades, but defensive),
  // fall back to a placeholder.
  const customer = useCustomerStore((s) =>
    s.customers.find((c) => c.id === record.customerId),
  )
  const customerName = customer?.name ?? 'Unknown customer'

  const amount = formatAmount(record.amount)
  const scheduled = formatScheduledDate(record.scheduledDate)

  return (
    <div className="px-6 py-4 border-b border-obsidian-800 bg-obsidian-900/30">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-xl text-text-primary">
          {record.title}
        </h1>
        <JobStatusBadge status={record.status} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-body text-xs text-text-tertiary">
        <span className="text-text-secondary">{customerName}</span>
        {scheduled && (
          <span className="font-mono tabular-nums">{scheduled}</span>
        )}
        {amount && (
          <span className="font-mono tabular-nums text-ember-300">
            {amount}
          </span>
        )}
      </div>
    </div>
  )
}
