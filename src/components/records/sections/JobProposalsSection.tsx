// ──────────────────────────────────────────────────────────────────────
// JobProposalsSection — lists proposals tied to the active job.
//
// Thin wrapper around RelatedRecordsSection. The "Add proposal" action
// pre-selects both the linked customer AND this job so the form opens
// ready to save with a single click.
// ──────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'

import type { Job } from '../../../types/job'
import type { Proposal } from '../../../types/proposal'
import { useProposalStore } from '../../../lib/proposalStore'
import { useProposalFormStore } from '../../../lib/proposalFormStore'
import { useTabStore } from '../../../lib/tabStore'
import { formatAmountUsd } from '../../../lib/format'
import ProposalStatusBadge from '../ProposalStatusBadge'
import RelatedRecordsSection from './RelatedRecordsSection'

interface JobProposalsSectionProps {
  record: Job
}

export default function JobProposalsSection({ record }: JobProposalsSectionProps) {
  const allProposals = useProposalStore((s) => s.proposals)
  const proposals = useMemo(
    () => allProposals.filter((p) => p.jobId === record.id),
    [allProposals, record.id],
  )

  return (
    <RelatedRecordsSection<Proposal>
      title="Proposals"
      itemNounSingular="proposal"
      items={proposals}
      getId={(p) => p.id}
      onAdd={() =>
        useProposalFormStore.getState().openAdd({
          defaultCustomerId: record.customerId,
          defaultJobId: record.id,
        })
      }
      onItemClick={(p) =>
        useTabStore.getState().openRecordTab('proposals', p)
      }
      emptyCopy="Link a proposal to this job to keep pricing history alongside the work itself."
      renderRow={(p) => (
        <>
          <div className="font-body text-sm text-text-primary group-hover:text-ember-300">
            {p.title}
          </div>
          <ProposalStatusBadge status={p.status} />
          <div className="font-mono text-xs text-ember-300 tabular-nums min-w-[60px] text-right">
            {formatAmountUsd(p.amount)}
          </div>
        </>
      )}
    />
  )
}
