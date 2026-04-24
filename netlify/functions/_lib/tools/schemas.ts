// ──────────────────────────────────────────────────────────────────────
// Tool schemas — the 18 operations Eidrix can perform via natural
// language, expressed in Anthropic's tool-use format.
//
// Why descriptions matter more than names (AC-03 Tour Moment 1):
// Claude picks tools by matching user intent against descriptions, not
// by parsing names. A tool named `addCustomer` with a thin description
// ("Creates a customer") gets chosen LESS often than the same tool with
// a rich description that lists example phrases and when-NOT-to-use
// guidance.
//
// Every description here tries to answer:
//   1. What does this do? (one line)
//   2. When should the agent use it? (example phrases + context)
//   3. When should the agent NOT use it? (disambiguation hints)
//   4. What does it return? (so Claude knows what to do with the result)
//
// Destructive tool descriptions note that user confirmation UI is
// coming in AC-03 Session 2 — don't tell Claude "avoid calling these";
// the system layer gates them in due course.
// ──────────────────────────────────────────────────────────────────────

import type Anthropic from '@anthropic-ai/sdk'

// Shared enum lists — keep in sync with Postgres enums.
const CUSTOMER_STATUSES = ['lead', 'active', 'past', 'inactive'] as const
const JOB_STATUSES = [
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const
const PROPOSAL_STATUSES = ['draft', 'sent', 'approved', 'rejected'] as const

// ─── Customer tools ──────────────────────────────────────────────────

const addCustomer: Anthropic.Tool = {
  name: 'addCustomer',
  description: [
    'Add a new customer to the organization. Use when the user describes someone who is not yet in the system, or explicitly asks to add, create, register, or enter a new customer.',
    'Required: name. Optional: email, phone, status, company, notes.',
    'If the user is referring to an existing customer (e.g., "update John"), do NOT use this — use searchCustomers first to confirm whether the customer already exists.',
    'Returns the newly-created customer row including its UUID, which you should use for any follow-up operations (e.g., creating a job or proposal for this customer).',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Full display name of the customer. Required.',
      },
      email: { type: 'string', description: 'Email address. Optional.' },
      phone: { type: 'string', description: 'Phone number. Optional.' },
      status: {
        type: 'string',
        enum: [...CUSTOMER_STATUSES],
        description:
          "Initial status. Defaults to 'lead'. Use 'active' if the user indicates they're already doing work with this customer.",
      },
      company: {
        type: 'string',
        description: 'Company or business name, if applicable. Optional.',
      },
      notes: {
        type: 'string',
        description: 'Freeform notes about the customer. Optional.',
      },
    },
    required: ['name'],
  },
}

const updateCustomer: Anthropic.Tool = {
  name: 'updateCustomer',
  description: [
    "Update one or more fields on an existing customer. Use when the user says things like 'change Alice's phone to X', 'update Bob's email', 'mark John as active'.",
    'Required: id (UUID of the customer). All other fields are optional — pass only the fields being changed.',
    'If you do not yet know the customer id, call searchCustomers first to resolve by name.',
    'Returns the updated customer row.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'UUID of the customer to update. Required.',
      },
      name: { type: 'string', description: 'New name, if changing.' },
      email: { type: 'string', description: 'New email, if changing.' },
      phone: { type: 'string', description: 'New phone, if changing.' },
      status: {
        type: 'string',
        enum: [...CUSTOMER_STATUSES],
        description: 'New status, if changing.',
      },
      company: {
        type: 'string',
        description: 'New company name, if changing.',
      },
      notes: { type: 'string', description: 'New notes, if changing.' },
    },
    required: ['id'],
  },
}

const deleteCustomer: Anthropic.Tool = {
  name: 'deleteCustomer',
  description: [
    'Delete a customer. This is a DESTRUCTIVE two-phase operation.',
    'PHASE 1 (preview): Call with just the id, NO confirmation_token. The executor returns a preview payload with { requires_confirmation: true, summary, confirmation_token }. You then explain the summary to the user and wait for their approval.',
    'PHASE 2 (commit): After the user confirms, call this tool AGAIN with the SAME id and the confirmation_token from the preview response. This is when the deletion actually happens.',
    'NEVER skip phase 1. "Delete Alice" from the user is a REQUEST, not a confirmation. Always preview first.',
    'Cascades: deleting the customer also deletes all their jobs and proposals.',
    'Returns { id, deleted: true } on commit success.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'UUID of the customer to delete. Required.',
      },
      confirmation_token: {
        type: 'string',
        description:
          'The token from the preview response. Required for phase 2. Do NOT set on phase 1 — the executor will mint the token for you.',
      },
    },
    required: ['id'],
  },
}

const searchCustomers: Anthropic.Tool = {
  name: 'searchCustomers',
  description: [
    'Find existing customers by fuzzy-matching a query against name, email, phone, and company. Use when the user mentions a customer by partial name, nickname, or identifier ("that Smith guy", "the contractor downtown"), and when you need to confirm a customer exists before acting.',
    'Especially important when context_mode is "off" (the agent has no preloaded data) or "subset" (the customer may be outside the recency window).',
    'Returns an array of matches with id, name, status, email, phone, company. If exactly one match, use its id for subsequent operations. If multiple match, ask the user to clarify which they meant.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Search string. Matches against name, email, phone, and company case-insensitively.',
      },
    },
    required: ['query'],
  },
}

const findCustomersByStatus: Anthropic.Tool = {
  name: 'findCustomersByStatus',
  description: [
    'Return all customers with a specific status. Use for questions like "show me my active customers", "who are my leads", "list inactive customers".',
    'Returns an array of customer rows. For a single customer by name, prefer searchCustomers.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: [...CUSTOMER_STATUSES],
        description: 'Customer status to filter by.',
      },
    },
    required: ['status'],
  },
}

// ─── Job tools ────────────────────────────────────────────────────────

const addJob: Anthropic.Tool = {
  name: 'addJob',
  description: [
    "Create a new job tied to a customer. Use when the user asks to add, create, or schedule a job (e.g., 'create a kitchen remodel job for Alice', 'add a job for the Smith project').",
    "Required: customer_id (UUID), title. Optional: status (defaults to 'draft'), scheduledDate (YYYY-MM-DD), amount (USD), notes.",
    'If you do not yet have the customer_id, resolve it via searchCustomers first.',
    'Returns the newly-created job row including its UUID.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'UUID of the customer this job belongs to. Required.',
      },
      title: {
        type: 'string',
        description: 'Short, human-readable job title. Required.',
      },
      status: {
        type: 'string',
        enum: [...JOB_STATUSES],
        description: "Initial status. Defaults to 'draft'.",
      },
      scheduledDate: {
        type: 'string',
        description: 'Scheduled date in YYYY-MM-DD format. Optional.',
      },
      amount: {
        type: 'number',
        description: 'Dollar amount. Optional.',
      },
      notes: {
        type: 'string',
        description: 'Scope, materials, access notes. Optional.',
      },
    },
    required: ['customerId', 'title'],
  },
}

const updateJob: Anthropic.Tool = {
  name: 'updateJob',
  description: [
    "Update fields on an existing job. Use for requests like 'reschedule the kitchen job to Tuesday', 'change the amount on the Smith job'.",
    'Required: id. Other fields are optional; pass only what is changing.',
    'For status-only changes, prefer markJobStatus — it is narrower and signals intent more clearly.',
    'Returns the updated job row.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'UUID of the job. Required.' },
      customerId: {
        type: 'string',
        description: 'Reassign to a different customer. Rare — optional.',
      },
      title: { type: 'string', description: 'New title, if changing.' },
      status: {
        type: 'string',
        enum: [...JOB_STATUSES],
        description: 'New status, if changing.',
      },
      scheduledDate: {
        type: 'string',
        description: 'New scheduled date (YYYY-MM-DD), if changing.',
      },
      amount: { type: 'number', description: 'New amount, if changing.' },
      notes: { type: 'string', description: 'New notes, if changing.' },
    },
    required: ['id'],
  },
}

const deleteJob: Anthropic.Tool = {
  name: 'deleteJob',
  description: [
    'Delete a job. DESTRUCTIVE two-phase operation.',
    'PHASE 1 (preview): call with just the id; executor returns a preview with a confirmation_token. Explain the summary, get user approval.',
    'PHASE 2 (commit): call again with the same id AND the confirmation_token. The actual deletion happens here.',
    'Never skip phase 1. Deleting a job sets linked proposals\' job_id to null (proposals are preserved as historical records).',
    'Returns { id, deleted: true } on commit.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'UUID of the job to delete.' },
      confirmation_token: {
        type: 'string',
        description:
          'Token from the preview response. Required for phase 2.',
      },
    },
    required: ['id'],
  },
}

const markJobStatus: Anthropic.Tool = {
  name: 'markJobStatus',
  description: [
    "Change a job's status. Use for status-focused requests: 'mark the Smith job completed', 'schedule the roof job', 'the bathroom job is in progress'.",
    'Narrower and clearer than updateJob for status-only changes.',
    'Returns the updated job row.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'UUID of the job.' },
      status: {
        type: 'string',
        enum: [...JOB_STATUSES],
        description: 'New status.',
      },
    },
    required: ['id', 'status'],
  },
}

const findJobsForCustomer: Anthropic.Tool = {
  name: 'findJobsForCustomer',
  description: [
    "Return all jobs belonging to a specific customer. Use when answering 'what jobs does Alice have', 'show me Smith's jobs', 'how many open jobs does this customer have'.",
    'Required: customerId. Use searchCustomers first if you only have a name.',
    'Returns an array of job rows.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'UUID of the customer.',
      },
    },
    required: ['customerId'],
  },
}

const findJobsByStatus: Anthropic.Tool = {
  name: 'findJobsByStatus',
  description: [
    "Return all jobs across the organization with a given status. Use for broad operational questions: 'what's scheduled this week', 'show me all in-progress jobs', 'how many completed jobs do I have'.",
    'Returns an array of job rows with customer_id; use findCustomersByStatus or searchCustomers if you need customer details.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: [...JOB_STATUSES],
        description: 'Job status to filter by.',
      },
    },
    required: ['status'],
  },
}

// ─── Proposal tools ──────────────────────────────────────────────────

const addProposal: Anthropic.Tool = {
  name: 'addProposal',
  description: [
    "Create a new proposal for a customer. Use when the user asks to draft, write, or create a proposal, quote, or bid.",
    "Required: customerId, title, amount. Optional: jobId (if the proposal is tied to a specific job), status (defaults to 'draft'), notes.",
    'Proposals can pre-date jobs — often the proposal is drafted first, and a job is created when the customer approves.',
    'Returns the newly-created proposal row including its UUID.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'UUID of the customer. Required.',
      },
      title: {
        type: 'string',
        description: 'Short title describing the proposal.',
      },
      amount: {
        type: 'number',
        description: 'Dollar amount of the proposal.',
      },
      jobId: {
        type: 'string',
        description:
          'UUID of a related job, if this proposal is for work already tracked as a job. Optional.',
      },
      status: {
        type: 'string',
        enum: [...PROPOSAL_STATUSES],
        description: "Initial status. Defaults to 'draft'.",
      },
      notes: {
        type: 'string',
        description: 'Scope, caveats, terms. Optional.',
      },
    },
    required: ['customerId', 'title', 'amount'],
  },
}

const updateProposal: Anthropic.Tool = {
  name: 'updateProposal',
  description: [
    "Update fields on an existing proposal. Use for requests like 'change the amount on the kitchen proposal', 'update the Smith proposal notes'.",
    'Required: id. Other fields optional.',
    'For status-only changes, prefer markProposalStatus.',
    'Returns the updated proposal row.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'UUID of the proposal.' },
      customerId: {
        type: 'string',
        description: 'Reassign to a different customer. Rare — optional.',
      },
      jobId: {
        type: 'string',
        description:
          'Link or re-link to a job. Pass empty string to unlink. Optional.',
      },
      title: { type: 'string', description: 'New title, if changing.' },
      amount: { type: 'number', description: 'New amount, if changing.' },
      status: {
        type: 'string',
        enum: [...PROPOSAL_STATUSES],
        description: 'New status, if changing.',
      },
      notes: { type: 'string', description: 'New notes, if changing.' },
    },
    required: ['id'],
  },
}

const deleteProposal: Anthropic.Tool = {
  name: 'deleteProposal',
  description: [
    'Delete a proposal. DESTRUCTIVE two-phase operation.',
    'PHASE 1 (preview): call with just the id; executor returns a preview with a confirmation_token. Explain the summary, get user approval.',
    'PHASE 2 (commit): call again with the same id AND the confirmation_token. The actual deletion happens here.',
    'Never skip phase 1.',
    'Returns { id, deleted: true } on commit.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'UUID of the proposal.' },
      confirmation_token: {
        type: 'string',
        description:
          'Token from the preview response. Required for phase 2.',
      },
    },
    required: ['id'],
  },
}

const markProposalStatus: Anthropic.Tool = {
  name: 'markProposalStatus',
  description: [
    "Change a proposal's status. Use for 'mark the Smith proposal approved', 'that proposal is now sent', 'customer rejected the kitchen bid'.",
    'Narrower and clearer than updateProposal for status-only changes. Approving a proposal is a common and positive operational moment — expect this call often.',
    'Returns the updated proposal row.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'UUID of the proposal.' },
      status: {
        type: 'string',
        enum: [...PROPOSAL_STATUSES],
        description: 'New status.',
      },
    },
    required: ['id', 'status'],
  },
}

const findProposalsForCustomer: Anthropic.Tool = {
  name: 'findProposalsForCustomer',
  description: [
    "Return all proposals belonging to a specific customer. Use for 'what proposals does Alice have', 'show Smith's outstanding proposals'.",
    'Returns an array of proposal rows. Use searchCustomers first if you only have a name.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      customerId: { type: 'string', description: 'UUID of the customer.' },
    },
    required: ['customerId'],
  },
}

const findProposalsForJob: Anthropic.Tool = {
  name: 'findProposalsForJob',
  description: [
    "Return all proposals tied to a specific job. Use for 'show me the proposals for the kitchen job', 'what was the original quote on this project'.",
    'A job may have multiple proposals historically (revised scope, reissued quotes).',
    'Returns an array of proposal rows.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      jobId: { type: 'string', description: 'UUID of the job.' },
    },
    required: ['jobId'],
  },
}

// ─── General tool ────────────────────────────────────────────────────

const summarizeForCustomer: Anthropic.Tool = {
  name: 'summarizeForCustomer',
  description: [
    "Return a combined snapshot of one customer: their profile, all their jobs, all their proposals. Use when the user asks for a picture of a specific customer ('tell me about Al', 'where do things stand with John Smith', 'what's unpaid for Alice').",
    'Cheaper and cleaner than calling findJobsForCustomer + findProposalsForCustomer separately. Do NOT use for list-wide questions ("how many customers do I have") — use findCustomersByStatus or similar.',
    'Returns { customer, jobs[], proposals[] } on success.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'UUID of the customer to summarize.',
      },
    },
    required: ['customerId'],
  },
}

// ─── Planning tool (AC-05) ───────────────────────────────────────────
// Signaling tool — does NOT mutate business data. chat.ts intercepts
// the tool_use block to update active_plans + emit SSE events to the
// client (so the plan card UI populates live). See netlify/functions/
// _lib/tools/plan.ts for the executor stub and chat.ts for the
// lifecycle plumbing.

const emitPlanStep: Anthropic.Tool = {
  name: 'emitPlanStep',
  description: [
    'Emit a single planned step in a complex multi-step operation. Call once per step.',
    'USE IT when a request is COMPLEX: multiple entities, multiple dependent tool calls, multi-step reasoning, or operations spanning 30+ seconds. Examples: "plan my Thursday", "add 5 customers and create proposals for each", "review all open jobs and flag which need attention".',
    'DO NOT USE IT for simple requests: single queries ("how many customers?"), single mutations ("add customer X"), direct reads ("what are Alice\'s jobs?"). Plan ceremony for trivial work is noise.',
    'Convention: EMIT ALL STEPS UPFRONT as status="pending" so the user sees the full plan immediately. Then update each step to "active" when you start it and to "complete" (or "failed") when done. Reuse the same id across status updates for the same step.',
    'This tool does not mutate business data. It signals plan structure to the client UI — users see a visible plan card emerging from the Eye. The tool always returns a simple ack; trust that the client is seeing your plan.',
    'Do not emit emitPlanStep more than ~20 times in one request. If the plan naturally has more than 20 steps, either combine steps or re-scope with the user before proceeding.',
  ].join(' '),
  input_schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description:
          'Short stable identifier for this step, e.g. "step-1", "schedule-alice", "draft-proposal". Reuse the same id when updating the step\'s status.',
      },
      title: {
        type: 'string',
        description:
          'Human-readable title, 3-8 words, present tense. "Pull Thursday schedule", "Draft time blocks", "Create proposal for Alice".',
      },
      status: {
        type: 'string',
        enum: ['pending', 'active', 'complete', 'failed'],
        description:
          '"pending" when first emitting the plan, "active" when you start the step, "complete" when done, "failed" if the step errored unrecoverably.',
      },
    },
    required: ['id', 'title', 'status'],
  },
}

// ─── Aggregate ───────────────────────────────────────────────────────

export const TOOL_SCHEMAS: Anthropic.Tool[] = [
  // Customers
  addCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  findCustomersByStatus,
  // Jobs
  addJob,
  updateJob,
  deleteJob,
  markJobStatus,
  findJobsForCustomer,
  findJobsByStatus,
  // Proposals
  addProposal,
  updateProposal,
  deleteProposal,
  markProposalStatus,
  findProposalsForCustomer,
  findProposalsForJob,
  // General
  summarizeForCustomer,
  // Planning (AC-05) — signaling tool, not a mutation.
  emitPlanStep,
]
