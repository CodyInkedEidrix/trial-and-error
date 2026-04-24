// ──────────────────────────────────────────────────────────────────────
// toolSummary — turn a (toolName, input) pair into a short human-readable
// activity label for the live plan UI.
//
// Used by chat.ts when emitting eidrix_tool_started / eidrix_tool_finished
// SSE events. The client renders these strings under the active plan
// step (or under the plan label if no step is currently marked active),
// giving the user visibility into what the agent is actually doing in
// real time — even when the agent forgets to update emitPlanStep status.
//
// Format guidelines:
//   • Sentence case, present-progressive verb when possible
//     ("Adding Joe Rogan", "Drafting Garage Cleanout")
//   • Surface the most identifying input field per tool
//     (name for customers, title for jobs/proposals, query for searches)
//   • Keep under ~50 chars — these display in a single ember sub-line
//   • Never echo raw IDs (UUIDs are noise to the user)
//   • Fall back to a humanized tool name for unknowns / weird inputs
// ──────────────────────────────────────────────────────────────────────

type SummaryFn = (input: Record<string, unknown>) => string

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function money(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

const FORMATTERS: Record<string, SummaryFn> = {
  // ─── Customers ─────────────────────────────────────────────────────
  addCustomer: (i) => {
    const name = str(i.name)
    return name ? `Adding ${name}` : 'Adding customer'
  },
  updateCustomer: (i) => {
    const name = str(i.name)
    return name ? `Updating ${name}` : 'Updating customer'
  },
  deleteCustomer: (i) => {
    const token = str(i.confirmation_token)
    return token ? 'Removing customer' : 'Previewing customer removal'
  },
  searchCustomers: (i) => {
    const q = str(i.query)
    return q ? `Searching customers · "${q}"` : 'Searching customers'
  },
  findCustomersByStatus: (i) => {
    const s = str(i.status)
    return s ? `Pulling ${s} customers` : 'Pulling customers'
  },

  // ─── Jobs ──────────────────────────────────────────────────────────
  addJob: (i) => {
    const title = str(i.title)
    return title ? `Adding job · ${title}` : 'Adding job'
  },
  updateJob: (i) => {
    const title = str(i.title)
    return title ? `Updating job · ${title}` : 'Updating job'
  },
  deleteJob: (i) => {
    const token = str(i.confirmation_token)
    return token ? 'Removing job' : 'Previewing job removal'
  },
  markJobStatus: (i) => {
    const status = str(i.status)
    return status ? `Marking job ${status}` : 'Updating job status'
  },
  findJobsForCustomer: () => "Pulling customer's jobs",
  findJobsByStatus: (i) => {
    const s = str(i.status)
    return s ? `Pulling ${s} jobs` : 'Pulling jobs'
  },

  // ─── Proposals ─────────────────────────────────────────────────────
  addProposal: (i) => {
    const title = str(i.title) ?? 'proposal'
    const amt = num(i.amount)
    return amt !== null
      ? `Drafting ${title} · ${money(amt)}`
      : `Drafting ${title}`
  },
  updateProposal: (i) => {
    const title = str(i.title)
    return title ? `Updating ${title}` : 'Updating proposal'
  },
  deleteProposal: (i) => {
    const token = str(i.confirmation_token)
    return token ? 'Removing proposal' : 'Previewing proposal removal'
  },
  markProposalStatus: (i) => {
    const status = str(i.status)
    return status ? `Marking proposal ${status}` : 'Updating proposal status'
  },
  findProposalsForCustomer: () => "Pulling customer's proposals",
  findProposalsForJob: () => "Pulling job's proposals",

  // ─── General ───────────────────────────────────────────────────────
  summarizeForCustomer: () => 'Summarizing customer',
}

/** Convert a camelCase tool name into a sentence-case fallback label.
 *  "findJobsForCustomer" → "Find jobs for customer". Used when no
 *  specific formatter is registered for a tool. */
function humanize(name: string): string {
  const spaced = name.replace(/([A-Z])/g, ' $1').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

export function formatToolSummary(name: string, input: unknown): string {
  const fn = FORMATTERS[name]
  if (fn && input && typeof input === 'object') {
    try {
      const summary = fn(input as Record<string, unknown>)
      if (summary && summary.length > 0) return summary
    } catch {
      // Fall through to humanize.
    }
  }
  return humanize(name)
}
