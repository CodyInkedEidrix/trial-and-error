// ──────────────────────────────────────────────────────────────────────
// Proposal tool executors — six server-side implementations for the
// proposal tools Claude can call.
// ──────────────────────────────────────────────────────────────────────

import type { ToolExecutor } from './types'
import {
  dbError,
  ensureParamsObject,
  invalidParams,
  isToolResult,
  makeStatusGuard,
  notFound,
  optionalNumber,
  optionalString,
  requireIdParam,
  requireString,
} from './types'

const ALLOWED_STATUSES = ['draft', 'sent', 'approved', 'rejected'] as const
type ProposalStatus = (typeof ALLOWED_STATUSES)[number]
const isAllowedStatus = makeStatusGuard(ALLOWED_STATUSES)

// ─── addProposal ─────────────────────────────────────────────────────

export const addProposal: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params

  const customerId = requireString(params, 'customerId')
  if (!customerId) return invalidParams('customerId is required')
  const title = requireString(params, 'title')
  if (!title) return invalidParams('title is required')
  const amount = optionalNumber(params, 'amount')
  if (amount === undefined) return invalidParams('amount is required')

  const status = optionalString(params, 'status')
  if (status !== undefined && !isAllowedStatus(status)) {
    return invalidParams(
      `status must be one of ${ALLOWED_STATUSES.join(', ')}`,
    )
  }

  const insertRow = {
    organization_id: ctx.organizationId,
    customer_id: customerId,
    job_id: optionalString(params, 'jobId') ?? null,
    title,
    amount,
    status: (status ?? 'draft') as ProposalStatus,
    notes: optionalString(params, 'notes') ?? null,
  }

  const { data, error } = await ctx.supabase
    .from('proposals')
    .insert(insertRow)
    .select()
    .single()

  if (error || !data) return dbError(error?.message ?? 'Insert failed')
  return { success: true, data }
}

// ─── updateProposal ──────────────────────────────────────────────────

export const updateProposal: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const idOrErr = requireIdParam(params)
  if (isToolResult(idOrErr)) return idOrErr
  const id = idOrErr

  const status = optionalString(params, 'status')
  if (status !== undefined && !isAllowedStatus(status)) {
    return invalidParams(
      `status must be one of ${ALLOWED_STATUSES.join(', ')}`,
    )
  }

  const update: Record<string, unknown> = {}
  const customerId = optionalString(params, 'customerId')
  if (customerId !== undefined) update.customer_id = customerId
  const jobId = optionalString(params, 'jobId')
  // Explicit empty string means "unlink from job".
  if (jobId !== undefined) update.job_id = jobId || null
  const title = optionalString(params, 'title')
  if (title !== undefined) update.title = title
  const amount = optionalNumber(params, 'amount')
  if (amount !== undefined) update.amount = amount
  const notes = optionalString(params, 'notes')
  if (notes !== undefined) update.notes = notes || null
  if (status !== undefined) update.status = status

  if (Object.keys(update).length === 0) {
    return invalidParams('No fields to update')
  }

  const { data, error } = await ctx.supabase
    .from('proposals')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return dbError(error.message)
  if (!data) return notFound(`Proposal ${id} not found`)
  return { success: true, data }
}

// ─── deleteProposal ──────────────────────────────────────────────────

export const deleteProposal: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const idOrErr = requireIdParam(params)
  if (isToolResult(idOrErr)) return idOrErr
  const id = idOrErr

  const { error } = await ctx.supabase
    .from('proposals')
    .delete()
    .eq('id', id)
  if (error) return dbError(error.message)
  return { success: true, data: { id, deleted: true } }
}

// ─── markProposalStatus ──────────────────────────────────────────────

export const markProposalStatus: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const idOrErr = requireIdParam(params)
  if (isToolResult(idOrErr)) return idOrErr
  const id = idOrErr
  const status = requireString(params, 'status')
  if (!status) return invalidParams('status is required')
  if (!isAllowedStatus(status)) {
    return invalidParams(
      `status must be one of ${ALLOWED_STATUSES.join(', ')}`,
    )
  }

  const { data, error } = await ctx.supabase
    .from('proposals')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return dbError(error.message)
  if (!data) return notFound(`Proposal ${id} not found`)
  return { success: true, data }
}

// ─── findProposalsForCustomer ────────────────────────────────────────

export const findProposalsForCustomer: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const customerId = requireString(params, 'customerId')
  if (!customerId) return invalidParams('customerId is required')

  const { data, error } = await ctx.supabase
    .from('proposals')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) return dbError(error.message)
  return { success: true, data: { proposals: data ?? [], customerId } }
}

// ─── findProposalsForJob ─────────────────────────────────────────────

export const findProposalsForJob: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const jobId = requireString(params, 'jobId')
  if (!jobId) return invalidParams('jobId is required')

  const { data, error } = await ctx.supabase
    .from('proposals')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  if (error) return dbError(error.message)
  return { success: true, data: { proposals: data ?? [], jobId } }
}
