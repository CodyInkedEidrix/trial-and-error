// ──────────────────────────────────────────────────────────────────────
// Job tool executors — six server-side implementations for the job
// tools Claude can call.
// ──────────────────────────────────────────────────────────────────────

import type { ToolExecutor } from './types'
import {
  buildCapMeta,
  dbError,
  DEFAULT_RESULT_CAP,
  ensureParamsObject,
  FIELD_LIMITS,
  invalidParams,
  isToolResult,
  makeStatusGuard,
  notFound,
  optionalNumber,
  optionalString,
  requireIdParam,
  requireString,
  validateAmount,
  validateText,
  validateUuid,
} from './types'
import { requireIdForDelete, runConfirmed } from './confirm'

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
  const customerIdCheck = validateUuid(customerId, 'customerId')
  if (isToolResult(customerIdCheck)) return customerIdCheck

  const rawTitle = requireString(params, 'title')
  if (!rawTitle) return invalidParams('title is required')
  const titleV = validateText(rawTitle, FIELD_LIMITS.TITLE_MAX, 'title')
  if (isToolResult(titleV)) return titleV
  if (titleV === undefined) return invalidParams('title cannot be blank')

  const status = optionalString(params, 'status')
  if (status !== undefined && !isAllowedStatus(status)) {
    return invalidParams(
      `status must be one of ${ALLOWED_STATUSES.join(', ')}`,
    )
  }

  const amountV = validateAmount(optionalNumber(params, 'amount'))
  if (isToolResult(amountV)) return amountV
  const notesV = validateText(
    optionalString(params, 'notes'),
    FIELD_LIMITS.NOTES_MAX,
    'notes',
  )
  if (isToolResult(notesV)) return notesV

  const insertRow = {
    organization_id: ctx.organizationId,
    customer_id: customerId,
    title: titleV,
    status: (status ?? 'draft') as JobStatus,
    scheduled_date: optionalString(params, 'scheduledDate') ?? null,
    amount: amountV ?? null,
    notes: notesV ?? null,
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
  const idCheck = validateUuid(id, 'id')
  if (isToolResult(idCheck)) return idCheck

  const status = optionalString(params, 'status')
  if (status !== undefined && !isAllowedStatus(status)) {
    return invalidParams(
      `status must be one of ${ALLOWED_STATUSES.join(', ')}`,
    )
  }

  const update: Record<string, unknown> = {}
  if (params.customerId !== undefined) {
    const customerIdV = validateUuid(optionalString(params, 'customerId'), 'customerId')
    if (isToolResult(customerIdV)) return customerIdV
    if (customerIdV) update.customer_id = customerIdV
  }
  if (params.title !== undefined) {
    const titleV = validateText(optionalString(params, 'title'), FIELD_LIMITS.TITLE_MAX, 'title')
    if (isToolResult(titleV)) return titleV
    if (titleV === undefined) return invalidParams('title cannot be blank on update')
    update.title = titleV
  }
  if (params.scheduledDate !== undefined) {
    const scheduled = optionalString(params, 'scheduledDate')
    update.scheduled_date = scheduled || null
  }
  if (params.amount !== undefined) {
    const amountV = validateAmount(optionalNumber(params, 'amount'))
    if (isToolResult(amountV)) return amountV
    update.amount = amountV ?? null
  }
  if (params.notes !== undefined) {
    const notesV = validateText(
      optionalString(params, 'notes'),
      FIELD_LIMITS.NOTES_MAX,
      'notes',
    )
    if (isToolResult(notesV)) return notesV
    update.notes = notesV ?? null
  }
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
// Two-phase confirmation; see customers.ts deleteCustomer + confirm.ts.

export const deleteJob: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const idOrErr = requireIdForDelete(params)
  if (isToolResult(idOrErr)) return idOrErr
  const id = idOrErr

  return runConfirmed({
    action: 'deleteJob',
    params,
    ctx,
    buildSummary: async () => {
      const [jobResult, proposalsResult] = await Promise.all([
        ctx.supabase
          .from('jobs')
          .select('id, title, status, customer_id, amount')
          .eq('id', id)
          .maybeSingle(),
        ctx.supabase
          .from('proposals')
          .select('id', { count: 'exact', head: true })
          .eq('job_id', id),
      ])

      if (!jobResult.data) return null
      const { title, status } = jobResult.data
      const proposalCount = proposalsResult.count ?? 0

      let summary = `Delete job "${title}" (status: ${status})`
      if (proposalCount > 0) {
        summary += `. ${proposalCount} linked proposal${proposalCount === 1 ? '' : 's'} will be kept (job_id cleared).`
      } else {
        summary += '.'
      }
      summary += ' This cannot be undone.'
      return summary
    },
    commit: async () => {
      const { error } = await ctx.supabase.from('jobs').delete().eq('id', id)
      if (error) return dbError(error.message)
      return { success: true, data: { id, deleted: true } }
    },
  })
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

  const { data, error, count } = await ctx.supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(DEFAULT_RESULT_CAP)

  if (error) return dbError(error.message)
  const jobs = data ?? []
  return {
    success: true,
    data: {
      jobs,
      customerId,
      meta: buildCapMeta(count ?? jobs.length, jobs.length),
    },
  }
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

  const { data, error, count } = await ctx.supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .limit(DEFAULT_RESULT_CAP)

  if (error) return dbError(error.message)
  const jobs = data ?? []
  return {
    success: true,
    data: {
      jobs,
      status,
      meta: buildCapMeta(count ?? jobs.length, jobs.length),
    },
  }
}
