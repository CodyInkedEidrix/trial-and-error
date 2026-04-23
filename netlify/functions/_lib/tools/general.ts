// ──────────────────────────────────────────────────────────────────────
// General tools — cross-entity operations. Currently one:
// summarizeForCustomer — one customer + all their jobs + all their
// proposals in a single round trip. Saves Claude from chaining three
// find* calls for common "tell me about X" questions.
// ──────────────────────────────────────────────────────────────────────

import type { ToolExecutor } from './types'
import {
  buildCapMeta,
  dbError,
  ensureParamsObject,
  invalidParams,
  isToolResult,
  notFound,
  requireString,
} from './types'

/** Cap nested arrays so a customer with 500 jobs doesn't blow the
 *  agent's context budget. 50 per array is generous for operator
 *  queries; if the user needs more, Claude can call the targeted
 *  find*ForCustomer tool with paging (future work). */
const NESTED_CAP = 50

export const summarizeForCustomer: ToolExecutor = async (rawParams, ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params
  const customerId = requireString(params, 'customerId')
  if (!customerId) return invalidParams('customerId is required')

  // Fetch customer + capped nested arrays in parallel. We request an
  // exact count alongside each nested query so the preview shows
  // "5 of 237 jobs" when truncation applies.
  const [customerResult, jobsResult, proposalsResult] = await Promise.all([
    ctx.supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
    ctx.supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(NESTED_CAP),
    ctx.supabase
      .from('proposals')
      .select('*', { count: 'exact' })
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(NESTED_CAP),
  ])

  if (customerResult.error) return dbError(customerResult.error.message)
  if (!customerResult.data) return notFound(`Customer ${customerId} not found`)
  if (jobsResult.error) return dbError(jobsResult.error.message)
  if (proposalsResult.error) return dbError(proposalsResult.error.message)

  const jobs = jobsResult.data ?? []
  const proposals = proposalsResult.data ?? []

  return {
    success: true,
    data: {
      customer: customerResult.data,
      jobs,
      proposals,
      meta: {
        jobs: buildCapMeta(jobsResult.count ?? jobs.length, jobs.length),
        proposals: buildCapMeta(
          proposalsResult.count ?? proposals.length,
          proposals.length,
        ),
      },
    },
  }
}
