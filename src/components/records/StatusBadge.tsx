// ──────────────────────────────────────────────────────────────────────
// StatusBadge — record-specific wrapper around the status pill.
//
// The four statuses get four distinct looks:
//   - active   → ember (brand color, "in motion")
//   - lead     → cobalt (cool, attention-seeking)
//   - paused   → muted gray (dormant but live)
//   - archived → deep-muted + italic (historical, out of the way)
// ──────────────────────────────────────────────────────────────────────

import type { CustomerStatus } from '../../types/customer'

const statusClasses: Record<CustomerStatus, string> = {
  active: 'bg-ember-700/30 text-ember-300',
  lead: 'bg-cobalt-500/15 text-cobalt-500',
  paused: 'bg-obsidian-700 text-text-secondary',
  archived: 'bg-obsidian-800 text-text-tertiary italic',
}

const statusLabels: Record<CustomerStatus, string> = {
  active: 'Active',
  lead: 'Lead',
  paused: 'Paused',
  archived: 'Archived',
}

export default function StatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider rounded-full whitespace-nowrap ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  )
}
