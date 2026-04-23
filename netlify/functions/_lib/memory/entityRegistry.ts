// ──────────────────────────────────────────────────────────────────────
// entityRegistry — compiles a list of {id, type, displayName} the
// extraction prompt uses to resolve named entity mentions into UUIDs.
//
// Without this registry, the extraction prompt doesn't know that
// "Alice" maps to customer abc-123. With it, the fact comes back with
// entity_type='customer' and entity_id='abc-123' — retrievable later
// via entity-scoped queries.
//
// ─── Trial and Error vs real Eidrix ──────────────────────────────────
// For Trial and Error, we include ALL customers / jobs / proposals
// visible to the user's org (via RLS) — tens to low hundreds at most.
// Real Eidrix with thousands of records per tenant scopes this to
// recently-active + UI-context + conversation-referenced entities to
// keep the prompt size bounded. Registry-size cap is a real-Eidrix
// knob; we don't enforce one here.
// ──────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/types/database.types'

export interface RegistryEntry {
  id: string
  type: 'customer' | 'job' | 'proposal'
  displayName: string
}

/** Compile the registry for the current user's org. Uses RLS —
 *  results are already filtered to what the caller can see. */
export async function compileEntityRegistry(
  supabase: SupabaseClient<Database>,
): Promise<RegistryEntry[]> {
  const [customersRes, jobsRes, proposalsRes] = await Promise.all([
    supabase.from('customers').select('id, name'),
    supabase.from('jobs').select('id, title'),
    supabase.from('proposals').select('id, title'),
  ])

  if (customersRes.error || jobsRes.error || proposalsRes.error) {
    console.error('[entityRegistry] fetch failed:', {
      customers: customersRes.error?.message,
      jobs: jobsRes.error?.message,
      proposals: proposalsRes.error?.message,
    })
    // Partial is fine — extraction still runs, just can't resolve some
    // names. Facts end up with entity_id=null.
  }

  const entries: RegistryEntry[] = []
  for (const c of customersRes.data ?? []) {
    entries.push({ id: c.id, type: 'customer', displayName: c.name })
  }
  for (const j of jobsRes.data ?? []) {
    entries.push({ id: j.id, type: 'job', displayName: j.title })
  }
  for (const p of proposalsRes.data ?? []) {
    entries.push({ id: p.id, type: 'proposal', displayName: p.title })
  }
  return entries
}

/** Format the registry as a compact block for injection into the
 *  extraction prompt. Empty registry produces a clear "(no known
 *  entities)" placeholder so Claude doesn't try to fabricate IDs. */
export function formatEntityRegistry(entries: RegistryEntry[]): string {
  if (entries.length === 0) {
    return '(no known entities in this workspace)'
  }
  const byType: Record<string, RegistryEntry[]> = {
    customer: [],
    job: [],
    proposal: [],
  }
  for (const e of entries) {
    byType[e.type].push(e)
  }
  const lines: string[] = []
  for (const [type, group] of Object.entries(byType)) {
    if (group.length === 0) continue
    lines.push(`${type}s:`)
    for (const e of group) {
      lines.push(`  - "${e.displayName}" (id: ${e.id})`)
    }
  }
  return lines.join('\n')
}

/** Validate that an entity_id Claude emitted actually exists in the
 *  registry. Returns the matching entry if valid, null otherwise.
 *  The app-layer check that turns Claude's guesses into nulls. */
export function validateEntityInRegistry(
  entries: RegistryEntry[],
  entityType: string | undefined,
  entityId: string | undefined,
): RegistryEntry | null {
  if (!entityType || !entityId) return null
  return (
    entries.find((e) => e.type === entityType && e.id === entityId) ?? null
  )
}
