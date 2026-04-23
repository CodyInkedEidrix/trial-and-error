// ──────────────────────────────────────────────────────────────────────
// ProposalStatusBadge — pill for one of four proposal lifecycle states.
//
// Color logic:
//   - draft      → cobalt (cool, "still working on it")
//   - sent       → ember (active, awaiting response)
//   - approved   → success (the design token for positive/won outcomes;
//                 proposal-approved is a meaningful positive event)
//   - rejected   → muted + italic (closed-lost, deprioritized visually)
// ──────────────────────────────────────────────────────────────────────

import type { ProposalStatus } from '../../types/proposal'

const statusClasses: Record<ProposalStatus, string> = {
  draft: 'bg-cobalt-500/15 text-cobalt-500',
  sent: 'bg-ember-500/25 text-ember-300 ring-1 ring-ember-500/30',
  approved: 'bg-success-500/20 text-success-500',
  rejected: 'bg-obsidian-800 text-text-tertiary italic',
}

const statusLabels: Record<ProposalStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  approved: 'Approved',
  rejected: 'Rejected',
}

export default function ProposalStatusBadge({
  status,
}: {
  status: ProposalStatus
}) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider rounded-full whitespace-nowrap ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  )
}
