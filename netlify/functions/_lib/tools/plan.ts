// ──────────────────────────────────────────────────────────────────────
// plan tools — AC-05 Session 1.
//
// Plan management tools live in their own file (not tacked onto
// customers.ts / jobs.ts / proposals.ts) because planning is a
// cross-cutting concern: it doesn't belong to any single entity, and
// Session 2+ may add sibling tools (e.g., updatePlanTitle,
// abandonPlan) that the entity files wouldn't naturally host.
//
// ─── emitPlanStep is a SIGNALING tool, not a mutation tool ───────────
// It never writes to business-data tables. Its return value is a
// simple acknowledgement — chat.ts intercepts the tool_use block
// BEFORE the result ships back to Claude, uses the input to update
// the active_plans row + emit the SSE event, then returns this
// minimal ack to Claude so the loop proceeds.
//
// That indirection keeps the tool definition clean (it's just a
// typed event emitter from Claude's perspective) while the real
// plumbing lives in chat.ts where plan lifecycle already has context.
// ──────────────────────────────────────────────────────────────────────

import type { ToolExecutor } from './types'
import {
  ensureParamsObject,
  invalidParams,
  isToolResult,
  requireString,
} from './types'

const VALID_STEP_STATUSES = new Set<string>([
  'pending',
  'active',
  'complete',
  'failed',
])

export const emitPlanStep: ToolExecutor = async (rawParams, _ctx) => {
  const params = ensureParamsObject(rawParams)
  if (isToolResult(params)) return params

  const id = requireString(params, 'id')
  if (!id) return invalidParams('id is required')

  const title = requireString(params, 'title')
  if (!title) return invalidParams('title is required')

  const status = requireString(params, 'status')
  if (!status) return invalidParams('status is required')
  if (!VALID_STEP_STATUSES.has(status)) {
    return invalidParams(
      `status must be one of ${[...VALID_STEP_STATUSES].join(', ')}`,
    )
  }

  // No DB write here. chat.ts reads the tool_use block directly,
  // updates active_plans, and emits the SSE event. We return a
  // minimal ack so Claude sees "ok, recorded" and keeps going.
  return {
    success: true,
    data: {
      id,
      title,
      status,
      emitted: true,
    },
  }
}
