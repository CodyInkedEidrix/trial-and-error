// ──────────────────────────────────────────────────────────────────────
// ProposalRelatedJobSection — shows the job this proposal is tied to,
// if any.
//
// Proposals MAY be tied to a job (optional FK). This section renders:
//   - Nothing-yet state when jobId is null/undefined
//   - A card preview + click-through to the job when a job is linked
//   - A fallback state when jobId points at a job that was deleted
//
// Canonical job-reassignment lives in the Overview section.
// ──────────────────────────────────────────────────────────────────────

import type { Proposal } from '../../../types/proposal'
import { useJobStore } from '../../../lib/jobStore'
import { useCustomerStore } from '../../../lib/customerStore'
import { useTabStore } from '../../../lib/tabStore'
import { formatAmountUsd, formatShortDate } from '../../../lib/format'
import JobStatusBadge from '../JobStatusBadge'

interface ProposalRelatedJobSectionProps {
  record: Proposal
}

export default function ProposalRelatedJobSection({
  record,
}: ProposalRelatedJobSectionProps) {
  const job = useJobStore((s) =>
    record.jobId ? s.jobs.find((j) => j.id === record.jobId) : undefined,
  )
  const customerName = useCustomerStore((s) => {
    if (!job) return null
    return s.customers.find((c) => c.id === job.customerId)?.name ?? null
  })

  // No job linked — explicit empty state. Proposals often predate jobs.
  if (!record.jobId) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="border border-dashed border-obsidian-800 rounded-md p-8 text-center">
          <p className="font-mono text-xs text-text-tertiary uppercase tracking-wider">
            No linked job
          </p>
          <p className="font-body text-sm text-text-secondary mt-2">
            This proposal isn't tied to a job yet. Link one from the
            Overview tab once the customer approves and you schedule the
            work.
          </p>
        </div>
      </div>
    )
  }

  // Linked job id is set but the job isn't in the store — could be a
  // stale reference (job deleted via DB or the SET NULL hasn't propagated
  // locally yet). Render a helpful fallback.
  if (!job) {
    return (
      <div className="p-6 max-w-2xl">
        <p className="font-mono text-xs text-text-tertiary uppercase tracking-wider">
          Job reference not found
        </p>
        <p className="font-body text-sm text-text-secondary mt-2">
          This proposal references a job that no longer exists. Reassign
          in the Overview tab.
        </p>
      </div>
    )
  }

  function openJob() {
    if (!job) return
    useTabStore.getState().openRecordTab('jobs', job)
  }

  return (
    <div className="p-6 max-w-2xl">
      <button
        type="button"
        onClick={openJob}
        className="w-full text-left bg-obsidian-900 border border-obsidian-800 hover:border-ember-700/40 rounded-lg p-5 transition-colors"
      >
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-display text-lg text-text-primary">
            {job.title}
          </h3>
          <JobStatusBadge status={job.status} />
        </div>

        {customerName && (
          <p className="font-body text-sm text-text-secondary mb-2">
            {customerName}
          </p>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-1 font-body text-xs text-text-tertiary">
          <span className="font-mono tabular-nums">
            {formatShortDate(job.scheduledDate)}
          </span>
          <span className="font-mono tabular-nums text-ember-300">
            {formatAmountUsd(job.amount)}
          </span>
        </div>

        <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ember-300/80">
          Open job →
        </p>
      </button>
    </div>
  )
}
