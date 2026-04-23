// ──────────────────────────────────────────────────────────────────────
// Job tool executors — six server-side implementations for the job
// tools Claude can call.
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

const ALLOWED_STATUSES = [
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const
type JobStatus = (typeof ALLOWED_STATUSES)[number]
const isAllowedStatus = makeStatusGuard(ALLOWED_STATUSES)

// ─── addJob ──────────────────────────────────────────────────────────

export const addJob: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params

  const customerId = requireString(params, 'customerId')
  if (!customerId) return invalidParams('customerId is required')
  const title = requireString(params, 'title')
  if (!title) return invalidParams('title is required')

  const status = optionalString(params, 'status')
  if (status !== undefined && !isAllowedStatus(status)) {
    return invalidParams(
      `status must be one of ${ALLOWED_STATUSES.join(', ')}`,
    )
  }

  const insertRow = {
    organization_id: ctx.organizationId,
    customer_id: customerId,
    title,
    status: (status ?? 'draft') as JobStatus,
    scheduled_date: optionalString(params, 'scheduledDate') ?? null,
    amount: optionalNumber(params, 'amount') ?? null,
    notes: optionalString(params, 'notes') ?? null,
  }

  const { data, error } = await ctx.supabase
    .from('jobs')
    .insert(insertRow)
    .select()
    .single()

  if (error || !data) return dbError(error?.message ?? 'Insert failed')
  return { success: true, data }
}

// ─── updateJob ───────────────────────────────────────────────────────

export const updateJob: ToolExecutor = async (rawParams, ctx) => {
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
  const title = optionalString(params, 'title')
  if (title !== undefined) update.title = title
  const scheduledDate = optionalString(params, 'scheduledDate')
  if (scheduledDate !== undefined) update.scheduled_date = scheduledDate || null
  const amount = optionalNumber(params, 'amount')
  if (amount !== undefined) update.amount = amount
  const notes = optionalString(params, 'notes')
  if (notes !== undefined) update.notes = notes || null
  if (status !== undefined) update.status = status

  if (Object.keys(update).length === 0) {
    return invalidParams('No fields to update')
  }

  const { data, error } = await ctx.supabase
    .from('jobs')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return dbError(error.message)
  if (!data) return notFound(`Job ${id} not found`)
  return { success: true, data }
}

// ─── deleteJob ───────────────────────────────────────────────────────

export const deleteJob: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const idOrErr = requireIdParam(params)
  if (isToolResult(idOrErr)) return idOrErr
  const id = idOrErr

  const { error } = await ctx.supabase.from('jobs').delete().eq('id', id)
  if (error) return dbError(error.message)
  return { success: true, data: { id, deleted: true } }
}

// ─── markJobStatus ───────────────────────────────────────────────────

export const markJobStatus: ToolExecutor = async (rawParams, ctx) => {
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
    .from('jobs')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return dbError(error.message)
  if (!data) return notFound(`Job ${id} not found`)
  return { success: true, data }
}

// ─── findJobsForCustomer ─────────────────────────────────────────────

export const findJobsForCustomer: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const customerId = requireString(params, 'customerId')
  if (!customerId) return invalidParams('customerId is required')

  const { data, error } = await ctx.supabase
    .from('jobs')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) return dbError(error.message)
  return { success: true, data: { jobs: data ?? [], customerId } }
}

// ─── findJobsByStatus ────────────────────────────────────────────────

export const findJobsByStatus: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const status = requireString(params, 'status')
  if (!status) return invalidParams('status is required')
  if (!isAllowedStatus(status)) {
    return invalidParams(
      `status must be one of ${ALLOWED_STATUSES.join(', ')}`,
    )
  }

  const { data, error } = await ctx.supabase
    .from('jobs')
    .select('*')
    .eq('status', status)
    .order('scheduled_date', { ascending: true, nullsFirst: false })

  if (error) return dbError(error.message)
  return { success: true, data: { jobs: data ?? [], status } }
}
