// ──────────────────────────────────────────────────────────────────────
// CustomerJobsSection — lists all jobs belonging to the active customer.
//
// Thin wrapper around RelatedRecordsSection — only supplies the
// Customer-scoped filter, the per-row cells, and the "Add job" action
// that pre-selects this customer.
// ──────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'

import type { Customer } from '../../../types/customer'
import type { Job } from '../../../types/job'
import { useJobStore } from '../../../lib/jobStore'
import { useJobFormStore } from '../../../lib/jobFormStore'
import { useTabStore } from '../../../lib/tabStore'
import { formatAmountUsd, formatShortDate } from '../../../lib/format'
import JobStatusBadge from '../JobStatusBadge'
import RelatedRecordsSection from './RelatedRecordsSection'

interface CustomerJobsSectionProps {
  record: Customer
}

export default function CustomerJobsSection({ record }: CustomerJobsSectionProps) {
  // See RelatedRecordsSection / CustomerProposalsSection for the reason
  // we select the stable full array and filter in useMemo.
  const allJobs = useJobStore((s) => s.jobs)
  const jobs = useMemo(
    () => allJobs.filter((j) => j.customerId === record.id),
    [allJobs, record.id],
  )

  return (
    <RelatedRecordsSection<Job>
      title="Jobs"
      itemNounSingular="job"
      items={jobs}
      getId={(j) => j.id}
      gridClasses="grid-cols-[1fr_auto_auto_auto]"
      onAdd={() => useJobFormStore.getState().openAdd(record.id)}
      onItemClick={(j) => useTabStore.getState().openRecordTab('jobs', j)}
      emptyCopy="Track a quote, schedule work, or log a completed job."
      renderRow={(j) => (
        <>
          <div className="font-body text-sm text-text-primary group-hover:text-ember-300">
            {j.title}
          </div>
          <JobStatusBadge status={j.status} />
          <div className="font-mono text-xs text-text-secondary tabular-nums">
            {formatShortDate(j.scheduledDate)}
          </div>
          <div className="font-mono text-xs text-ember-300 tabular-nums min-w-[60px] text-right">
            {formatAmountUsd(j.amount)}
          </div>
        </>
      )}
    />
  )
}
