// ──────────────────────────────────────────────────────────────────────
// UiContext — pure type + formatter, shared between the browser (which
// snapshots it) and the Netlify function (which injects it into the
// system prompt).
//
// Kept in src/types/ because:
//   - no store imports here
//   - no browser APIs
//   - safe to import from netlify/functions/*.ts under esbuild bundling
//
// The snapshot function that reads live state lives in src/lib/uiContext.ts
// and stays browser-only.
// ──────────────────────────────────────────────────────────────────────

export interface UiContext {
  /** Primary tab the user is viewing. If they're inside a record tab,
   *  this is the RECORD's parent tab (e.g., viewing a Customer detail
   *  means primaryTab = 'records'). */
  primaryTab: { id: string; label: string }

  /** The record the user has open, if any. `kind` is the record type
   *  ('customer' | 'job' | 'proposal' | future types). */
  activeRecord?: {
    kind: string
    id: string
    displayName: string
  }

  /** Secondary tab (section) active within the current primary OR the
   *  open record's detail view. */
  activeSection?: { id: string; label: string }
}

/** Format a UiContext object as a system-prompt block. Pure function;
 *  identical output regardless of which side of the wire calls it.
 *  The `=== CURRENT UI CONTEXT ===` header is stable so prompt-inspection
 *  tooling can reliably locate the block. */
export function formatUiContextPrompt(ctx: UiContext): string {
  const lines: string[] = ['=== CURRENT UI CONTEXT ===']
  lines.push(`Primary tab: ${ctx.primaryTab.label}`)

  if (ctx.activeRecord) {
    lines.push(
      `Active record: ${ctx.activeRecord.displayName} (${ctx.activeRecord.kind} · id: ${ctx.activeRecord.id})`,
    )
  }
  if (ctx.activeSection) {
    lines.push(`Active section: ${ctx.activeSection.label}`)
  }

  lines.push('')
  if (ctx.activeRecord) {
    lines.push(
      `The user is viewing ${ctx.activeRecord.displayName}'s ${ctx.activeRecord.kind} record${
        ctx.activeSection ? `, ${ctx.activeSection.label} section` : ''
      }. References like "this", "him/her", "that ${ctx.activeRecord.kind}" mean ${ctx.activeRecord.displayName} unless the message makes that impossible. Explicit mentions of other names take precedence.`,
    )
  } else {
    lines.push(
      `The user is viewing the ${ctx.primaryTab.label} tab${
        ctx.activeSection ? ` (${ctx.activeSection.label} section)` : ''
      }. For references like "this customer" / "that job", ask which specific record they mean if it's not obvious from the conversation.`,
    )
  }

  return lines.join('\n')
}

/** Runtime validator — accepts data from the wire and returns a
 *  UiContext or null. Server side uses this to reject malformed
 *  client-sent payloads without throwing. */
export function parseUiContext(raw: unknown): UiContext | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const primary = r.primaryTab as Record<string, unknown> | undefined
  if (
    !primary ||
    typeof primary.id !== 'string' ||
    typeof primary.label !== 'string'
  ) {
    return null
  }

  const ctx: UiContext = {
    primaryTab: { id: primary.id, label: primary.label },
  }

  const record = r.activeRecord as Record<string, unknown> | undefined
  if (record) {
    if (
      typeof record.kind === 'string' &&
      typeof record.id === 'string' &&
      typeof record.displayName === 'string'
    ) {
      ctx.activeRecord = {
        kind: record.kind,
        id: record.id,
        displayName: record.displayName,
      }
    }
  }

  const section = r.activeSection as Record<string, unknown> | undefined
  if (section) {
    if (typeof section.id === 'string' && typeof section.label === 'string') {
      ctx.activeSection = { id: section.id, label: section.label }
    }
  }

  return ctx
}
