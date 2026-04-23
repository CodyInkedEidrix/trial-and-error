// ──────────────────────────────────────────────────────────────────────
// uiContext — snapshot of "where the user is looking right now" for
// injection into the agent's system prompt.
//
// Without this, Eidrix can't resolve references like "this customer",
// "his jobs", or "schedule it for next Tuesday" — every such reference
// forces a clarifying question or a search-tool round trip. With it,
// the agent feels like a colleague looking at the same screen.
//
// ─── Why snapshot, not live subscription ─────────────────────────────
// The UI context is captured at send-time and travels with the request.
// If the user navigates away while Claude is thinking, the context
// reflects what they saw WHEN THEY ASKED — not where the cursor
// currently is. That's the correct semantic: the user's intent was
// shaped by what was on screen at the moment they hit send.
//
// ─── Privacy boundary ────────────────────────────────────────────────
// Only IDs and display names cross the wire. Full record objects never
// leave the client via this channel — if the agent needs more, it uses
// a tool, which goes through the RLS-gated Supabase client. Keeps the
// injection payload small and keeps the data-access discipline intact.
//
// Shared type + formatter live in src/types/uiContext.ts so the
// Netlify function can import them without pulling browser-only store
// code.
// ──────────────────────────────────────────────────────────────────────

import { activeConfig } from '../config/active'
import type { RecordsTab } from '../config/businessConfig'
import type { UiContext } from '../types/uiContext'
import { useTabStore, RECORD_TAB_ID } from './tabStore'
import { useJobStore } from './jobStore'
import { useProposalStore } from './proposalStore'

/** Captures the current UI state. Safe to call outside React render —
 *  reads directly from Zustand store getState() and activeConfig. */
export function snapshotUiContext(): UiContext {
  const tabState = useTabStore.getState()
  const { activePath, openRecord } = tabState

  // ─── Case 1: no tab selected (engine falls back to first primary) ──
  if (activePath.length === 0) {
    const first = activeConfig.primaryTabs[0]
    return {
      primaryTab: first
        ? { id: first.id, label: first.label }
        : { id: 'unknown', label: 'Unknown' },
    }
  }

  const topId = activePath[0]

  // ─── Case 2: a record tab is active ────────────────────────────────
  if (topId === RECORD_TAB_ID && openRecord) {
    const parentTab = activeConfig.primaryTabs.find(
      (t) => t.id === openRecord.parentTabId,
    )
    const primaryTab = parentTab
      ? { id: parentTab.id, label: parentTab.label }
      : { id: openRecord.parentTabId, label: openRecord.parentTabId }

    const activeRecord = describeRecord(openRecord.parentTabId, openRecord.record)

    const sectionId = activePath[1]
    const activeSection = sectionId
      ? resolveSection(openRecord.parentTabId, sectionId)
      : undefined

    return { primaryTab, activeRecord, activeSection }
  }

  // ─── Case 3: a regular primary tab ─────────────────────────────────
  const tab = activeConfig.primaryTabs.find((t) => t.id === topId)
  const primaryTab = tab
    ? { id: tab.id, label: tab.label }
    : { id: topId, label: topId }

  const secondaryId = activePath[1]
  const activeSection =
    tab && tab.kind === 'records' && secondaryId
      ? resolveSection(tab.id, secondaryId)
      : undefined

  return { primaryTab, activeSection }
}

// ─── Record describers ───────────────────────────────────────────────
// The engine treats records as opaque (`unknown`). Each known record
// type has a describer that produces the { kind, id, displayName }
// shape the agent sees. Future entity types register here.

function describeRecord(
  parentTabId: string,
  record: unknown,
): UiContext['activeRecord'] {
  const rec = record as { id?: string; name?: string; title?: string } | null
  if (!rec || typeof rec.id !== 'string') {
    return { kind: parentTabId, id: 'unknown', displayName: 'unknown' }
  }

  // Use parentTabId as a strong hint — a record opened under the 'jobs'
  // tab IS a job, even if some edge-case id collision happened to hit
  // another store. Check the corresponding store first for the display
  // name; fall back to shape or a placeholder if the lookup misses
  // (e.g., the record was just deleted locally but the tab is still
  // open).
  if (parentTabId === 'jobs') {
    const job = useJobStore.getState().jobs.find((j) => j.id === rec.id)
    const displayName = job?.title ?? rec.title ?? 'unknown'
    return { kind: 'job', id: rec.id, displayName }
  }
  if (parentTabId === 'proposals') {
    const proposal = useProposalStore
      .getState()
      .proposals.find((p) => p.id === rec.id)
    const displayName = proposal?.title ?? rec.title ?? 'unknown'
    return { kind: 'proposal', id: rec.id, displayName }
  }
  if (parentTabId === 'records') {
    // Customers live in this tab. We don't import customerStore to
    // avoid a cycle with chatStore; rely on the record object's shape.
    const displayName = rec.name ?? 'unknown'
    return { kind: 'customer', id: rec.id, displayName }
  }

  // Future entity types land here — future tab ids should add explicit
  // branches above.
  return {
    kind: parentTabId,
    id: rec.id,
    displayName: rec.name ?? rec.title ?? 'unknown',
  }
}

// ─── Section resolver ────────────────────────────────────────────────

function resolveSection(
  parentTabId: string,
  sectionId: string,
): UiContext['activeSection'] {
  const tab = activeConfig.primaryTabs.find((t) => t.id === parentTabId)
  if (!tab || tab.kind !== 'records') {
    return { id: sectionId, label: sectionId }
  }
  const section = (tab as RecordsTab).records.detailSections.find(
    (s) => s.id === sectionId,
  )
  return section
    ? { id: section.id, label: section.label }
    : { id: sectionId, label: sectionId }
}
