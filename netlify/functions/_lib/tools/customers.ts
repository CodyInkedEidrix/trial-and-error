// ──────────────────────────────────────────────────────────────────────
// Customer tool executors — server-side implementations for the five
// customer-related tools Claude can call.
//
// Every executor:
//   1. Validates params (explicit checks; structured error on bad input)
//   2. Runs the Supabase op with the user's JWT-authed client (RLS)
//   3. Returns ToolResult — never throws
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
  optionalString,
  requireIdParam,
  requireString,
  validateEmail,
  validatePhone,
  validateText,
  validateUuid,
} from './types'
import { requireIdForDelete, runConfirmed } from './confirm'

const ALLOWED_STATUSES = ['lead', 'active', 'past', 'inactive'] as const
type CustomerStatus = (typeof ALLOWED_STATUSES)[number]
const isAllowedStatus = makeStatusGuard(ALLOWED_STATUSES)

// ─── addCustomer ─────────────────────────────────────────────────────

export const addCustomer: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params

  const rawName = requireString(params, 'name')
  if (!rawName) return invalidParams('name is required')

  const name = validateText(rawName, FIELD_LIMITS.NAME_MAX, 'name')
  if (isToolResult(name)) return name
  if (name === undefined) return invalidParams('name cannot be blank')

  const status = optionalString(params, 'status')
  if (status !== undefined && !isAllowedStatus(status)) {
    return invalidParams(
      `status must be one of ${ALLOWED_STATUSES.join(', ')}`,
    )
  }

  const email = validateEmail(optionalString(params, 'email'))
  if (isToolResult(email)) return email
  const phone = validatePhone(optionalString(params, 'phone'))
  if (isToolResult(phone)) return phone
  const company = validateText(
    optionalString(params, 'company'),
    FIELD_LIMITS.COMPANY_MAX,
    'company',
  )
  if (isToolResult(company)) return company
  const notes = validateText(
    optionalString(params, 'notes'),
    FIELD_LIMITS.NOTES_MAX,
    'notes',
  )
  if (isToolResult(notes)) return notes

  const insertRow = {
    organization_id: ctx.organizationId,
    name,
    email: email ?? null,
    phone: phone ?? null,
    company: company ?? null,
    notes: notes ?? null,
    status: (status ?? 'lead') as CustomerStatus,
  }

  const { data, error } = await ctx.supabase
    .from('customers')
    .insert(insertRow)
    .select()
    .single()

  if (error || !data) {
    return dbError(error?.message ?? 'Insert failed')
  }
  return { success: true, data }
}

// ─── updateCustomer ──────────────────────────────────────────────────

export const updateCustomer: ToolExecutor = async (rawParams, ctx) => {
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

  // Name: validate + apply.
  if (params.name !== undefined) {
    const nameV = validateText(optionalString(params, 'name'), FIELD_LIMITS.NAME_MAX, 'name')
    if (isToolResult(nameV)) return nameV
    if (nameV === undefined) return invalidParams('name cannot be blank on update')
    update.name = nameV
  }
  // Email.
  if (params.email !== undefined) {
    const emailV = validateEmail(optionalString(params, 'email'))
    if (isToolResult(emailV)) return emailV
    update.email = emailV ?? null
  }
  // Phone.
  if (params.phone !== undefined) {
    const phoneV = validatePhone(optionalString(params, 'phone'))
    if (isToolResult(phoneV)) return phoneV
    update.phone = phoneV ?? null
  }
  // Company.
  if (params.company !== undefined) {
    const companyV = validateText(
      optionalString(params, 'company'),
      FIELD_LIMITS.COMPANY_MAX,
      'company',
    )
    if (isToolResult(companyV)) return companyV
    update.company = companyV ?? null
  }
  // Notes.
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
    .from('customers')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return dbError(error.message)
  if (!data) return notFound(`Customer ${id} not found`)
  return { success: true, data }
}

// ─── deleteCustomer ──────────────────────────────────────────────────
// Two-phase: phase 1 mints an HMAC token + summary; phase 2 validates
// the token and actually deletes. See confirmationToken.ts for the
// threat model and why we don't trust `confirmed: boolean`.

export const deleteCustomer: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const idOrErr = requireIdForDelete(params)
  if (isToolResult(idOrErr)) return idOrErr
  const id = idOrErr

  return runConfirmed({
    action: 'deleteCustomer',
    params,
    ctx,
    buildSummary: async () => {
      // Load customer + count related jobs/proposals for a meaningful
      // "here's what you're about to destroy" preview. RLS-scoped.
      const [customerResult, jobsResult, proposalsResult] = await Promise.all([
        ctx.supabase
          .from('customers')
          .select('id, name, company')
          .eq('id', id)
          .maybeSingle(),
        ctx.supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', id),
        ctx.supabase
          .from('proposals')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', id),
      ])

      if (!customerResult.data) return null
      const { name, company } = customerResult.data
      const jobCount = jobsResult.count ?? 0
      const proposalCount = proposalsResult.count ?? 0

      const parts: string[] = [`Delete customer ${name}`]
      if (company) parts[0] += ` (${company})`
      const tail: string[] = []
      if (jobCount > 0)
        tail.push(`${jobCount} job${jobCount === 1 ? '' : 's'}`)
      if (proposalCount > 0)
        tail.push(
          `${proposalCount} proposal${proposalCount === 1 ? '' : 's'}`,
        )
      if (tail.length > 0) parts.push(`— this also deletes ${tail.join(' and ')}`)
      parts.push('. This cannot be undone.')
      return parts.join(' ')
    },
    commit: async () => {
      const { error } = await ctx.supabase
        .from('customers')
        .delete()
        .eq('id', id)
      if (error) return dbError(error.message)
      return { success: true, data: { id, deleted: true } }
    },
  })
}

// ─── searchCustomers ─────────────────────────────────────────────────

export const searchCustomers: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const query = requireString(params, 'query')
  if (!query) return invalidParams('query is required')

  // ILIKE-wildcard on each field, OR'd together. Case-insensitive.
  const pattern = `%${query.replace(/[%_]/g, '\\$&')}%`

  const SEARCH_CAP = 20 // narrower cap for fuzzy search
  const { data, error, count } = await ctx.supabase
    .from('customers')
    .select('id, name, status, email, phone, company', { count: 'exact' })
    .or(
      [
        `name.ilike.${pattern}`,
        `email.ilike.${pattern}`,
        `phone.ilike.${pattern}`,
        `company.ilike.${pattern}`,
      ].join(','),
    )
    .limit(SEARCH_CAP)

  if (error) return dbError(error.message)
  const matches = data ?? []
  return {
    success: true,
    data: {
      matches,
      query,
      meta: buildCapMeta(count ?? matches.length, matches.length),
    },
  }
}

// ─── findCustomersByStatus ───────────────────────────────────────────

export const findCustomersByStatus: ToolExecutor = async (rawParams, ctx) => {
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
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order('name', { ascending: true })
    .limit(DEFAULT_RESULT_CAP)

  if (error) return dbError(error.message)
  const customers = data ?? []
  return {
    success: true,
    data: {
      customers,
      status,
      meta: buildCapMeta(count ?? customers.length, customers.length),
    },
  }
}
