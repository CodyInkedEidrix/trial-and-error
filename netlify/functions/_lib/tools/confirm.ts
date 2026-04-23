// ──────────────────────────────────────────────────────────────────────
// confirm — shared two-phase-commit helper for destructive tool
// executors. Each delete* executor wraps its actual mutation in
// `runConfirmed(...)` which handles:
//
//   - Phase 1: no token → mint one, return preview payload
//   - Phase 2: token present → validate, then invoke the mutator
//   - Invalid token: structured error back to Claude
//
// Keeps every destructive executor down to "here's my summary, here's
// my mutation" and puts the token policy in ONE place.
// ──────────────────────────────────────────────────────────────────────

import type { ToolContext, ToolResult } from './types'
import { dbError, invalidParams, optionalString } from './types'
import {
  issueConfirmationToken,
  validateConfirmationToken,
} from '../confirmationToken'

interface RunConfirmedArgs {
  action: string
  params: Record<string, unknown>
  ctx: ToolContext
  /** Build the human-readable summary the user sees. Called during
   *  phase 1 so it can hit the DB (e.g., "Alice Smith (3 jobs, 2
   *  proposals)"). Return null if the target doesn't exist — the
   *  executor surfaces a clean "not found" error instead of a preview. */
  buildSummary: () => Promise<string | null>
  /** Perform the destructive operation. Called on phase 2 after the
   *  token is validated. Returns the normal ToolResult shape. */
  commit: () => Promise<ToolResult>
}

export async function runConfirmed(
  args: RunConfirmedArgs,
): Promise<ToolResult> {
  const token = optionalString(args.params, 'confirmation_token')

  // ─── Phase 1: no token → build preview ─────────────────────────────
  if (!token) {
    const summary = await args.buildSummary()
    if (summary === null) {
      return {
        success: false,
        error: `Target for ${args.action} not found.`,
        code: 'not_found',
      }
    }

    // Strip confirmation_token from the bound params so phase 2 hashes
    // the same shape. (If Claude ever sent an empty string token, we'd
    // still want the hash to match the phase-2 call which also omits
    // it; stripping here makes that always consistent.)
    const { confirmation_token: _strip, ...paramsForBinding } = args.params

    const confirmation_token = issueConfirmationToken({
      action: args.action,
      params: paramsForBinding,
      orgId: args.ctx.organizationId,
      userId: args.ctx.userId,
    })

    return {
      success: true,
      data: {
        requires_confirmation: true,
        action: args.action,
        params: paramsForBinding,
        summary,
        confirmation_token,
      },
    }
  }

  // ─── Phase 2: validate token ───────────────────────────────────────
  const { confirmation_token: _strip, ...paramsForBinding } = args.params

  const validation = validateConfirmationToken({
    token,
    action: args.action,
    params: paramsForBinding,
    orgId: args.ctx.organizationId,
    userId: args.ctx.userId,
  })

  if (!validation.ok) {
    return {
      success: false,
      error: validation.error ?? 'Confirmation token invalid.',
      code: 'forbidden',
    }
  }

  // Token valid — run the mutation.
  try {
    return await args.commit()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Commit threw'
    return dbError(message)
  }
}

/** Used by the three delete executors to coerce params into the shape
 *  runConfirmed expects. Returns the id on success, a ToolResult on
 *  failure so caller can early-return. */
export function requireIdForDelete(
  params: Record<string, unknown>,
): string | ToolResult {
  const id = params.id
  if (typeof id !== 'string' || id.trim() === '') {
    return invalidParams('id is required')
  }
  return id
}
