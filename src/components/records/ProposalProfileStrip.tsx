// ──────────────────────────────────────────────────────────────────────
// ProposalProfileStrip — slim header above a proposal's active section.
//
// Information-only, mirrors CustomerProfileStrip / JobProfileStrip.
// Shows title, status, related customer, optional linked job, amount.
// ──────────────────────────────────────────────────────────────────────

import type { Proposal } from '../../types/proposal'
import { useCustomerStore } from '../../lib/customerStore'
import { useJobStore } from '../../lib/jobStore'
import ProposalStatusBadge from './ProposalStatusBadge'

interface ProposalProfileStripProps {
  record: Proposal
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export default function ProposalProfileStrip({
  record,
}: ProposalProfileStripProps) {
  const customer = useCustomerStore((s) =>
    s.customers.find((c) => c.id === record.customerId),
  )
  const job = useJobStore((s) =>
    record.jobId ? s.jobs.find((j) => j.id === record.jobId) : undefined,
  )

  const customerName = customer?.name ?? 'Unknown customer'

  return (
    <div className="px-6 py-4 border-b border-obsidian-800 bg-obsidian-900/30">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-xl text-text-primary">
          {record.title}
        </h1>
        <ProposalStatusBadge status={record.status} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-body text-xs text-text-tertiary">
        <span className="text-text-secondary">{customerName}</span>
        {job && <span className="font-mono">Job: {job.title}</span>}
        <span className="font-mono tabular-nums text-ember-300">
          {formatAmount(record.amount)}
        </span>
      </div>
    </div>
  )
}
