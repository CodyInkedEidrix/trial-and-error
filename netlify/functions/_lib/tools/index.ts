// ──────────────────────────────────────────────────────────────────────
// Tool registry — maps Claude's tool name to the server-side executor.
// The chat.ts loop looks up executors here by name.
//
// If a tool appears in TOOL_SCHEMAS but not in TOOL_REGISTRY (or vice
// versa), the system misbehaves. Keep them in sync at commit time.
// ──────────────────────────────────────────────────────────────────────

import type { ToolExecutor } from './types'
import * as customers from './customers'
import * as jobs from './jobs'
import * as proposals from './proposals'
import * as general from './general'

export { TOOL_SCHEMAS } from './schemas'
export type { ToolContext, ToolExecutor, ToolResult } from './types'

export const TOOL_REGISTRY: Record<string, ToolExecutor> = {
  // Customers
  addCustomer: customers.addCustomer,
  updateCustomer: customers.updateCustomer,
  deleteCustomer: customers.deleteCustomer,
  searchCustomers: customers.searchCustomers,
  findCustomersByStatus: customers.findCustomersByStatus,

  // Jobs
  addJob: jobs.addJob,
  updateJob: jobs.updateJob,
  deleteJob: jobs.deleteJob,
  markJobStatus: jobs.markJobStatus,
  findJobsForCustomer: jobs.findJobsForCustomer,
  findJobsByStatus: jobs.findJobsByStatus,

  // Proposals
  addProposal: proposals.addProposal,
  updateProposal: proposals.updateProposal,
  deleteProposal: proposals.deleteProposal,
  markProposalStatus: proposals.markProposalStatus,
  findProposalsForCustomer: proposals.findProposalsForCustomer,
  findProposalsForJob: proposals.findProposalsForJob,

  // General
  summarizeForCustomer: general.summarizeForCustomer,
}
