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
