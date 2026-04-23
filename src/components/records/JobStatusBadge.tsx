// ──────────────────────────────────────────────────────────────────────
// JobStatusBadge — pill for one of five job lifecycle states.
//
// Color logic mirrors CustomerStatusBadge's intent (active = ember,
// muted states = gray, attention-getting = cobalt) but tuned for the
// job lifecycle:
//   - draft        → cobalt (cool, "in progress on paper")
//   - scheduled    → ember (committed, on the calendar)
//   - in_progress  → ember-bright (active work, full color)
//   - completed    → muted gray (done, out of focus)
//   - cancelled    → deep-muted + italic + strikethrough on hover
// ──────────────────────────────────────────────────────────────────────

import type { JobStatus } from '../../types/job'

const statusClasses: Record<JobStatus, string> = {
  draft: 'bg-cobalt-500/15 text-cobalt-500',
  scheduled: 'bg-ember-700/30 text-ember-300',
  in_progress: 'bg-ember-500/30 text-ember-300 ring-1 ring-ember-500/40',
  completed: 'bg-obsidian-700 text-text-secondary',
  cancelled: 'bg-obsidian-800 text-text-tertiary italic',
}

const statusLabels: Record<JobStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider rounded-full whitespace-nowrap ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  )
}
