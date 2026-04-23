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
  dbError,
  ensureParamsObject,
  invalidParams,
  isToolResult,
  makeStatusGuard,
  notFound,
  optionalString,
  requireIdParam,
  requireString,
} from './types'

const ALLOWED_STATUSES = ['lead', 'active', 'past', 'inactive'] as const
type CustomerStatus = (typeof ALLOWED_STATUSES)[number]
const isAllowedStatus = makeStatusGuard(ALLOWED_STATUSES)

// ─── addCustomer ─────────────────────────────────────────────────────

export const addCustomer: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params

  const name = requireString(params, 'name')
  if (!name) return invalidParams('name is required')

  const status = optionalString(params, 'status')
  if (status !== undefined && !isAllowedStatus(status)) {
    return invalidParams(
      `status must be one of ${ALLOWED_STATUSES.join(', ')}`,
    )
  }

  const insertRow = {
    organization_id: ctx.organizationId,
    name,
    email: optionalString(params, 'email') ?? null,
    phone: optionalString(params, 'phone') ?? null,
    company: optionalString(params, 'company') ?? null,
    notes: optionalString(params, 'notes') ?? null,
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

  const status = optionalString(params, 'status')
  if (status !== undefined && !isAllowedStatus(status)) {
    return invalidParams(
      `status must be one of ${ALLOWED_STATUSES.join(', ')}`,
    )
  }

  const update: Record<string, unknown> = {}
  const name = optionalString(params, 'name')
  if (name !== undefined) update.name = name
  const email = optionalString(params, 'email')
  if (email !== undefined) update.email = email || null
  const phone = optionalString(params, 'phone')
  if (phone !== undefined) update.phone = phone || null
  const company = optionalString(params, 'company')
  if (company !== undefined) update.company = company || null
  const notes = optionalString(params, 'notes')
  if (notes !== undefined) update.notes = notes || null
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

export const deleteCustomer: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const idOrErr = requireIdParam(params)
  if (isToolResult(idOrErr)) return idOrErr
  const id = idOrErr

  const { error } = await ctx.supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) return dbError(error.message)
  return { success: true, data: { id, deleted: true } }
}

// ─── searchCustomers ─────────────────────────────────────────────────

export const searchCustomers: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const query = requireString(params, 'query')
  if (!query) return invalidParams('query is required')

  // ILIKE-wildcard on each field, OR'd together. Case-insensitive.
  const pattern = `%${query.replace(/[%_]/g, '\\$&')}%`

  const { data, error } = await ctx.supabase
    .from('customers')
    .select('id, name, status, email, phone, company')
    .or(
      [
        `name.ilike.${pattern}`,
        `email.ilike.${pattern}`,
        `phone.ilike.${pattern}`,
        `company.ilike.${pattern}`,
      ].join(','),
    )
    .limit(20)

  if (error) return dbError(error.message)
  return { success: true, data: { matches: data ?? [], query } }
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

  const { data, error } = await ctx.supabase
    .from('customers')
    .select('*')
    .eq('status', status)
    .order('name', { ascending: true })

  if (error) return dbError(error.message)
  return { success: true, data: { customers: data ?? [], status } }
}
