// ──────────────────────────────────────────────────────────────────────
// Proposal tool executors — six server-side implementations for the
// proposal tools Claude can call.
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

const ALLOWED_STATUSES = ['draft', 'sent', 'approved', 'rejected'] as const
type ProposalStatus = (typeof ALLOWED_STATUSES)[number]
const isAllowedStatus = makeStatusGuard(ALLOWED_STATUSES)

// ─── addProposal ─────────────────────────────────────────────────────

export const addProposal: ToolExecutor = async (rawParams, ctx) => {
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

  const rawAmount = optionalNumber(params, 'amount')
  if (rawAmount === undefined) return invalidParams('amount is required')
  const amountV = validateAmount(rawAmount)
  if (isToolResult(amountV)) return amountV
  if (amountV === undefined) return invalidParams('amount is required')

  const status = optionalString(params, 'status')
  if (status !== undefined && !isAllowedStatus(status)) {
    return invalidParams(
      `status must be one of ${ALLOWED_STATUSES.join(', ')}`,
    )
  }

  const jobIdRaw = optionalString(params, 'jobId')
  const jobIdV = jobIdRaw ? validateUuid(jobIdRaw, 'jobId') : undefined
  if (isToolResult(jobIdV)) return jobIdV

  const notesV = validateText(
    optionalString(params, 'notes'),
    FIELD_LIMITS.NOTES_MAX,
    'notes',
  )
  if (isToolResult(notesV)) return notesV

  const insertRow = {
    organization_id: ctx.organizationId,
    customer_id: customerId,
    job_id: jobIdV ?? null,
    title: titleV,
    amount: amountV,
    status: (status ?? 'draft') as ProposalStatus,
    notes: notesV ?? null,
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
  if (params.jobId !== undefined) {
    const jobIdRaw = optionalString(params, 'jobId')
    // Empty string means "unlink from job"; any non-empty value must
    // be a valid UUID.
    if (!jobIdRaw) {
      update.job_id = null
    } else {
      const jobIdV = validateUuid(jobIdRaw, 'jobId')
      if (isToolResult(jobIdV)) return jobIdV
      update.job_id = jobIdV ?? null
    }
  }
  if (params.title !== undefined) {
    const titleV = validateText(optionalString(params, 'title'), FIELD_LIMITS.TITLE_MAX, 'title')
    if (isToolResult(titleV)) return titleV
    if (titleV === undefined) return invalidParams('title cannot be blank on update')
    update.title = titleV
  }
  if (params.amount !== undefined) {
    const amountV = validateAmount(optionalNumber(params, 'amount'))
    if (isToolResult(amountV)) return amountV
    update.amount = amountV ?? 0
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
// Two-phase confirmation; see customers.ts deleteCustomer + confirm.ts.

export const deleteProposal: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const idOrErr = requireIdForDelete(params)
  if (isToolResult(idOrErr)) return idOrErr
  const id = idOrErr

  return runConfirmed({
    action: 'deleteProposal',
    params,
    ctx,
    buildSummary: async () => {
      const { data } = await ctx.supabase
        .from('proposals')
        .select('id, title, amount, status')
        .eq('id', id)
        .maybeSingle()
      if (!data) return null
      const amount = Number(data.amount).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      })
      return `Delete proposal "${data.title}" (${amount}, status: ${data.status}). This cannot be undone.`
    },
    commit: async () => {
      const { error } = await ctx.supabase
        .from('proposals')
        .delete()
        .eq('id', id)
      if (error) return dbError(error.message)
      return { success: true, data: { id, deleted: true } }
    },
  })
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

  const { data, error, count } = await ctx.supabase
    .from('proposals')
    .select('*', { count: 'exact' })
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(DEFAULT_RESULT_CAP)

  if (error) return dbError(error.message)
  const proposals = data ?? []
  return {
    success: true,
    data: {
      proposals,
      customerId,
      meta: buildCapMeta(count ?? proposals.length, proposals.length),
    },
  }
}

// ─── findProposalsForJob ─────────────────────────────────────────────

export const findProposalsForJob: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const jobId = requireString(params, 'jobId')
  if (!jobId) return invalidParams('jobId is required')

  const { data, error, count } = await ctx.supabase
    .from('proposals')
    .select('*', { count: 'exact' })
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(DEFAULT_RESULT_CAP)

  if (error) return dbError(error.message)
  const proposals = data ?? []
  return {
    success: true,
    data: {
      proposals,
      jobId,
      meta: buildCapMeta(count ?? proposals.length, proposals.length),
    },
  }
}
