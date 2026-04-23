// ──────────────────────────────────────────────────────────────────────
// CustomerJobsSection — lists all jobs belonging to the active customer.
//
// Added to the Customer detail tab as a new section in AC-02. Click a
// job row to open it as a record tab. "Add job" button opens the job
// form with this customer pre-selected.
// ──────────────────────────────────────────────────────────────────────

import type { Customer } from '../../../types/customer'
import { useJobStore } from '../../../lib/jobStore'
import { useJobFormStore } from '../../../lib/jobFormStore'
import { useTabStore } from '../../../lib/tabStore'
import JobStatusBadge from '../JobStatusBadge'
import Button from '../../ui/Button'

interface CustomerJobsSectionProps {
  record: Customer
}

function formatAmount(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '—'
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export default function CustomerJobsSection({ record }: CustomerJobsSectionProps) {
  const jobs = useJobStore((s) =>
    s.jobs.filter((j) => j.customerId === record.id),
  )

  function openJob(jobId: string) {
    const job = useJobStore.getState().jobs.find((j) => j.id === jobId)
    if (job) useTabStore.getState().openRecordTab('jobs', job)
  }

  function addJobForCustomer() {
    useJobFormStore.getState().openAdd(record.id)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-xl text-text-primary">Jobs</h2>
          <p className="font-body text-xs text-text-tertiary mt-0.5">
            {jobs.length === 0
              ? 'No jobs yet for this customer.'
              : `${jobs.length} job${jobs.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Button
          label="Add job"
          variant="secondary"
          size="sm"
          onClick={addJobForCustomer}
        />
      </div>

      {jobs.length === 0 ? (
        <div className="border border-dashed border-obsidian-800 rounded-md p-8 text-center">
          <p className="font-body text-sm text-text-secondary">
            Track a quote, schedule work, or log a completed job.
          </p>
        </div>
      ) : (
        <div className="border border-obsidian-800 rounded-md overflow-hidden">
          {jobs.map((j, i) => (
            <button
              key={j.id}
              type="button"
              onClick={() => openJob(j.id)}
              className={`group w-full text-left grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3 hover:bg-obsidian-800/40 transition-colors ${
                i > 0 ? 'border-t border-obsidian-800' : ''
              }`}
            >
              <div className="font-body text-sm text-text-primary group-hover:text-ember-300">
                {j.title}
              </div>
              <JobStatusBadge status={j.status} />
              <div className="font-mono text-xs text-text-secondary tabular-nums">
                {formatDate(j.scheduledDate)}
              </div>
              <div className="font-mono text-xs text-ember-300 tabular-nums min-w-[60px] text-right">
                {formatAmount(j.amount)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
