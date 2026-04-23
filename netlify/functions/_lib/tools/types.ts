// ──────────────────────────────────────────────────────────────────────
// Shared types for the tool-calling system (AC-03).
//
// Every tool executor receives:
//   - params  : the unknown blob Claude sent. The executor validates it
//               and returns a structured error if invalid.
//   - ctx     : the authenticated Supabase client + org/user ids. The
//               client carries the user's JWT so RLS enforces tenant
//               isolation at the database layer.
//
// Every executor returns ToolResult — never throws. Claude reasons about
// structured errors naturally; exceptions would bubble up and kill the
// loop. "Always return a shape" is the single most important invariant
// in this file.
// ──────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/types/database.types'

export interface ToolContext {
  /** Per-request Supabase client, authenticated with the user's JWT.
   *  RLS applies: any cross-tenant access returns zero rows/errors. */
  supabase: SupabaseClient<Database>

  /** The user's active organization. Already resolved before any tool
   *  executes — executors don't need to look it up again. */
  organizationId: string

  /** The user invoking the tool (from JWT). Useful for audit/logging;
   *  also feeds updated_by-style columns when we write rows. */
  userId: string
}

/** Structured result shape. Executors always return this; they never
 *  throw. Claude sees `success: false` results as tool_result blocks
 *  with is_error: true and can reason about how to recover. */
export type ToolResult =
  | { success: true; data: unknown }
  | { success: false; error: string; code?: ToolErrorCode }

export type ToolErrorCode =
  | 'invalid_params'
  | 'not_found'
  | 'db_error'
  | 'unknown_tool'
  | 'forbidden'

export type ToolExecutor = (
  params: unknown,
  ctx: ToolContext,
) => Promise<ToolResult>

// ─── Validation helpers ──────────────────────────────────────────────
// Kept deliberately small — we're not pulling in a schema library for
// Session 1. Each executor validates the shape it needs directly.

export function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

export function requireString(
  obj: Record<string, unknown>,
  key: string,
): string | null {
  const v = obj[key]
  if (typeof v !== 'string' || v.trim() === '') return null
  return v
}

export function optionalString(
  obj: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = obj[key]
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'string') return undefined
  return v
}

export function optionalNumber(
  obj: Record<string, unknown>,
  key: string,
): number | undefined {
  const v = obj[key]
  if (v === undefined || v === null) return undefined
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const parsed = Number(v)
    if (!Number.isNaN(parsed)) return parsed
  }
  return undefined
}

export function invalidParams(error: string): ToolResult {
  return { success: false, error, code: 'invalid_params' }
}

export function dbError(error: string): ToolResult {
  return { success: false, error, code: 'db_error' }
}

export function notFound(error: string): ToolResult {
  return { success: false, error, code: 'not_found' }
}

/** Validate that params is an object and return it typed. Returns a
 *  ToolResult on failure so the caller can early-return. Used as the
 *  first line of every executor. */
export function ensureParamsObject(
  params: unknown,
): Record<string, unknown> | ToolResult {
  if (!isObject(params)) return invalidParams('params must be an object')
  return params
}

/** Validate that an already-ensured params object has a string `id`
 *  field. Convenience for the 7+ executors whose only required param
 *  is `id` (delete*, mark*Status, find*For*). Returns the id string
 *  on success, a ToolResult on failure. */
export function requireIdParam(
  params: Record<string, unknown>,
  fieldName: string = 'id',
): string | ToolResult {
  const id = requireString(params, fieldName)
  if (!id) return invalidParams(`${fieldName} is required`)
  return id
}

/** Type-guard factory for status enums. Produces a narrowing predicate
 *  for a given allowed-status list. Shared by the three entity tool
 *  files since the shape is identical — only the list differs. */
export function makeStatusGuard<T extends string>(statuses: readonly T[]) {
  return (s: string | undefined): s is T =>
    s !== undefined && (statuses as readonly string[]).includes(s)
}

/** Narrow a value returned by the helpers above. True when the value
 *  is a ToolResult failure (caller should early-return it). */
export function isToolResult(value: unknown): value is ToolResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as ToolResult).success === 'boolean'
  )
}

// ─── Value validators (real-Eidrix hardening) ────────────────────────
// Executors use these to reject garbage before it hits Postgres. Each
// returns the cleaned value on success or a ToolResult on failure so
// the executor can early-return with a clear error Claude can reason
// about.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Constraints that match what the UI forms also enforce. Keep in
 *  sync; the server is the authoritative check. */
export const FIELD_LIMITS = {
  NAME_MAX: 120,
  COMPANY_MAX: 120,
  EMAIL_MAX: 254,
  PHONE_MAX: 40,
  TITLE_MAX: 200,
  NOTES_MAX: 5000,
  STATUS_MAX: 40,
  AMOUNT_MAX: 10_000_000,
} as const

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Normalized email — lowercased, trimmed, format-checked. Returns
 *  the cleaned string or a ToolResult error. */
export function validateEmail(raw: string | undefined): string | ToolResult | undefined {
  if (raw === undefined) return undefined
  const trimmed = raw.trim().toLowerCase()
  if (trimmed.length === 0) return undefined
  if (trimmed.length > FIELD_LIMITS.EMAIL_MAX) {
    return invalidParams(`email exceeds ${FIELD_LIMITS.EMAIL_MAX} chars`)
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return invalidParams('email is not a valid email address')
  }
  return trimmed
}

/** Phone: trimmed, length-capped. We deliberately do NOT reformat
 *  (no E.164 assumption) because small businesses enter phones in
 *  local formats; we just guard against absurd input. */
export function validatePhone(raw: string | undefined): string | ToolResult | undefined {
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  if (trimmed.length === 0) return undefined
  if (trimmed.length > FIELD_LIMITS.PHONE_MAX) {
    return invalidParams(`phone exceeds ${FIELD_LIMITS.PHONE_MAX} chars`)
  }
  return trimmed
}

/** Amount: finite, non-negative, below the sanity cap. Protects
 *  against typos like "15000000" for a proposal and against
 *  Number(undefined)→NaN sneaking through. */
export function validateAmount(raw: number | undefined): number | ToolResult | undefined {
  if (raw === undefined) return undefined
  if (!Number.isFinite(raw)) {
    return invalidParams('amount must be a finite number')
  }
  if (raw < 0) return invalidParams('amount cannot be negative')
  if (raw > FIELD_LIMITS.AMOUNT_MAX) {
    return invalidParams(
      `amount cannot exceed $${FIELD_LIMITS.AMOUNT_MAX.toLocaleString()}`,
    )
  }
  return raw
}

/** Text field: trimmed length check. Blank strings normalize to
 *  undefined so the caller can treat them as "not set". */
export function validateText(
  raw: string | undefined,
  max: number,
  fieldName: string,
): string | ToolResult | undefined {
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  if (trimmed.length === 0) return undefined
  if (trimmed.length > max) {
    return invalidParams(`${fieldName} exceeds ${max} chars`)
  }
  return trimmed
}

/** UUID sanity check — fail fast on malformed ids before a query
 *  with a cast error. */
export function validateUuid(raw: string | undefined, fieldName: string): string | ToolResult | undefined {
  if (raw === undefined) return undefined
  if (!UUID_PATTERN.test(raw)) {
    return invalidParams(`${fieldName} is not a valid UUID`)
  }
  return raw
}

// ─── Result size caps ────────────────────────────────────────────────

/** Default cap for `find…` and `search…` tool results. Past this,
 *  results are truncated with a `{truncated: true, total, shown}`
 *  indicator so Claude can tell the user "100 of 247 matched" instead
 *  of silently omitting data. Tune per-tool if a different cap is
 *  appropriate. */
export const DEFAULT_RESULT_CAP = 100

/** Build the metadata block for a capped list. Embed in tool result
 *  data alongside the array. */
export function buildCapMeta(total: number, shown: number) {
  return {
    truncated: total > shown,
    total,
    shown,
  }
}
