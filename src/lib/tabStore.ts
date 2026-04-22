// ──────────────────────────────────────────────────────────────────────
// tabStore — global state for the three-tier tab engine.
//
// State shape:
//   - activePath: the current drill path through the tab tree
//     [primaryId] — just on a primary tab with no sub-navigation
//     [primaryId, secondaryId] — two tiers deep
//     [primaryId, secondaryId, tertiaryId] — three tiers deep
//     [] — no tab selected (engine resolves to first primary)
//
//   - openRecord: the currently-open record, if any. The record tab
//     is a virtual primary tab — when openRecord is set, the engine
//     injects a record tab at primary level with the record's detail
//     sections as its children.
//
//   - lastRecordSection: preserves which section was active within the
//     open record when the user navigates away and back. Without this,
//     clicking back to the record tab would reset to the first section.
//
// ─── Why tabStore doesn't import activeConfig ─────────────────────────
// Circular import: tabStore → active → contractor → tabStore. The
// config's onRowClick handlers reference useTabStore, which is fine as
// long as we don't READ activeConfig synchronously at module init.
// All config resolution happens in the engine (at render time) instead.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

/** Sentinel id used as path[0] when the record-detail tab is active. */
export const RECORD_TAB_ID = '__record__'

interface OpenRecord {
  /** The primary tab this record belongs to. Used as the fallback
   *  target when the record tab is closed while it's the active view. */
  parentTabId: string
  /** The record itself — opaque at this layer; sections know the shape. */
  record: unknown
}

interface TabStore {
  activePath: string[]
  openRecord: OpenRecord | null
  /** Last section the user was viewing inside the currently-open
   *  record. Restored when the user clicks back to the record tab
   *  after navigating away. */
  lastRecordSection: string | null

  /** Replace the entire active path. Most callers should prefer the
   *  level-specific navigation helpers below. */
  setActivePath: (path: string[]) => void

  /** Navigate to a primary tab. Clears deeper path segments. */
  navigatePrimary: (primaryId: string) => void

  /** Navigate within the current primary to a secondary tab. Preserves
   *  primary, replaces secondary, drops tertiary. */
  navigateSecondary: (secondaryId: string) => void

  /** Navigate within the current primary+secondary to a tertiary tab. */
  navigateTertiary: (tertiaryId: string) => void

  /** Open a record as the third-tier primary tab AND focus it. */
  openRecordTab: (parentTabId: string, record: unknown) => void

  /** Close the record tab. Returns focus to the parent primary tab if
   *  the record tab was the active view. */
  closeRecordTab: () => void

  /** Focus the currently-open record tab (no-op if none open). Restores
   *  the last-viewed section via lastRecordSection. */
  focusRecordTab: () => void
}

export const useTabStore = create<TabStore>((set, get) => ({
  activePath: [],
  openRecord: null,
  lastRecordSection: null,

  setActivePath: (path) => {
    set((state) => {
      // If we're navigating inside an open record, remember the section.
      const next: Partial<TabStore> = { activePath: path }
      if (path[0] === RECORD_TAB_ID && path[1]) {
        next.lastRecordSection = path[1]
      }
      return { ...state, ...next }
    })
  },

  navigatePrimary: (primaryId) => {
    set({ activePath: [primaryId] })
  },

  navigateSecondary: (secondaryId) => {
    const { activePath } = get()
    const primary = activePath[0] ?? ''
    const nextPath = primary ? [primary, secondaryId] : [secondaryId]
    set((state) => ({
      ...state,
      activePath: nextPath,
      lastRecordSection:
        primary === RECORD_TAB_ID ? secondaryId : state.lastRecordSection,
    }))
  },

  navigateTertiary: (tertiaryId) => {
    const { activePath } = get()
    if (activePath.length < 2) return // can't set tertiary without secondary
    set({
      activePath: [activePath[0], activePath[1], tertiaryId],
    })
  },

  openRecordTab: (parentTabId, record) => {
    const current = get().openRecord
    // Same record — just focus.
    if (current && current.record === record) {
      get().focusRecordTab()
      return
    }
    // New record — clear section memory; first section becomes active.
    set({
      openRecord: { parentTabId, record },
      activePath: [RECORD_TAB_ID],
      lastRecordSection: null,
    })
  },

  closeRecordTab: () => {
    const { activePath, openRecord } = get()
    const wasActive = activePath[0] === RECORD_TAB_ID
    set({
      openRecord: null,
      lastRecordSection: null,
      activePath:
        wasActive && openRecord ? [openRecord.parentTabId] : activePath,
    })
  },

  focusRecordTab: () => {
    const { openRecord, lastRecordSection } = get()
    if (!openRecord) return
    set({
      activePath: lastRecordSection
        ? [RECORD_TAB_ID, lastRecordSection]
        : [RECORD_TAB_ID],
    })
  },
}))
