// ──────────────────────────────────────────────────────────────────────
// CustomerProposalsSection — lists all proposals belonging to the
// active customer.
//
// Thin wrapper around RelatedRecordsSection — only supplies the
// Customer-scoped filter, the per-row cells, and the "Add proposal"
// action that pre-selects this customer.
// ──────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'

import type { Customer } from '../../../types/customer'
import type { Proposal } from '../../../types/proposal'
import { useProposalStore } from '../../../lib/proposalStore'
import { useProposalFormStore } from '../../../lib/proposalFormStore'
import { useTabStore } from '../../../lib/tabStore'
import { formatAmountUsd } from '../../../lib/format'
import ProposalStatusBadge from '../ProposalStatusBadge'
import RelatedRecordsSection from './RelatedRecordsSection'

interface CustomerProposalsSectionProps {
  record: Customer
}

export default function CustomerProposalsSection({
  record,
}: CustomerProposalsSectionProps) {
  const allProposals = useProposalStore((s) => s.proposals)
  const proposals = useMemo(
    () => allProposals.filter((p) => p.customerId === record.id),
    [allProposals, record.id],
  )

  return (
    <RelatedRecordsSection<Proposal>
      title="Proposals"
      itemNounSingular="proposal"
      items={proposals}
      getId={(p) => p.id}
      onAdd={() =>
        useProposalFormStore.getState().openAdd({ defaultCustomerId: record.id })
      }
      onItemClick={(p) =>
        useTabStore.getState().openRecordTab('proposals', p)
      }
      emptyCopy="Draft a proposal to track a quote before work begins."
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
