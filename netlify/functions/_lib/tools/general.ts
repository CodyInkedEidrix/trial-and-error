// ──────────────────────────────────────────────────────────────────────
// General tools — cross-entity operations. Currently one:
// summarizeForCustomer — one customer + all their jobs + all their
// proposals in a single round trip. Saves Claude from chaining three
// find* calls for common "tell me about X" questions.
// ──────────────────────────────────────────────────────────────────────

import type { ToolExecutor } from './types'
import {
  dbError,
  ensureParamsObject,
  invalidParams,
  isToolResult,
  notFound,
  requireString,
} from './types'

export const summarizeForCustomer: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const customerId = requireString(params, 'customerId')
  if (!customerId) return invalidParams('customerId is required')

  // Fetch all three in parallel. Customer fetch is the canonical
  // existence check — if the customer isn't there, we return not_found
  // even if the parallel fetches succeed with empty arrays.
  const [customerResult, jobsResult, proposalsResult] = await Promise.all([
    ctx.supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
    ctx.supabase
      .from('jobs')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    ctx.supabase
      .from('proposals')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ])

  if (customerResult.error) return dbError(customerResult.error.message)
  if (!customerResult.data) return notFound(`Customer ${customerId} not found`)
  if (jobsResult.error) return dbError(jobsResult.error.message)
  if (proposalsResult.error) return dbError(proposalsResult.error.message)

  return {
    success: true,
    data: {
      customer: customerResult.data,
      jobs: jobsResult.data ?? [],
      proposals: proposalsResult.data ?? [],
    },
  }
}
