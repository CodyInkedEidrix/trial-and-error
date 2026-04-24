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
import * as plan from './plan'

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

  // Planning (AC-05) — signaling tool, handled specially by chat.ts.
  emitPlanStep: plan.emitPlanStep,
}

// ─── Affected-entity map ─────────────────────────────────────────────
// Which client-side store each tool mutates. Read-only tools (search*,
// find*, summarize*) are `null` — they don't need the client to
// refetch anything. Used by chat.ts to compile an `affectedEntities`
// list in the eidrix_usage event; the client refetches only those
// stores instead of blindly reloading all three.
//
// If you add a tool: update this map. Lint would catch it if we had a
// stricter TS config; today it's a manual discipline checked by eye.

export type EntityType = 'customers' | 'jobs' | 'proposals'

export const TOOL_AFFECTS: Record<string, EntityType | null> = {
  // Customers — writes
  addCustomer: 'customers',
  updateCustomer: 'customers',
  deleteCustomer: 'customers',
  // Customers — reads
  searchCustomers: null,
  findCustomersByStatus: null,

  // Jobs — writes
  addJob: 'jobs',
  updateJob: 'jobs',
  deleteJob: 'jobs',
  markJobStatus: 'jobs',
  // Jobs — reads
  findJobsForCustomer: null,
  findJobsByStatus: null,

  // Proposals — writes
  addProposal: 'proposals',
  updateProposal: 'proposals',
  deleteProposal: 'proposals',
  markProposalStatus: 'proposals',
  // Proposals — reads
  findProposalsForCustomer: null,
  findProposalsForJob: null,

  // General — read-only
  summarizeForCustomer: null,

  // Planning (AC-05) — signaling, does not mutate entity stores.
  emitPlanStep: null,
}
