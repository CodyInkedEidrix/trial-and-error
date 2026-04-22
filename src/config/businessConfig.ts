// ──────────────────────────────────────────────────────────────────────
// BusinessConfig — the type that describes a business's operational
// shape. The engine reads it; configs provide it. Different configs
// produce different products from the same codebase.
//
// Generic design: records are strongly typed at config-definition time,
// opaque (unknown) at the engine level. This is the standard TypeScript
// "existential type" pattern — the engine doesn't need to know a
// record's shape because it only performs opaque operations (list,
// find by id, delegate to configured renderers). Concrete record types
// are preserved inside each config via the `recordsTab` helper.
//
// Three-tier navigation support:
//   - Primary tabs (Lab, Records, Brand, ...) — top bar
//   - Secondary tabs — rendered directly below primary when applicable.
//     For records: detail sections (Overview, Notes). For future
//     filter/workspace variants on primary tabs: each secondary is its
//     own workspace component.
//   - Tertiary tabs — rendered directly below secondary when applicable.
//     Extension point present in types; not used by configs yet.
//
// ─── Porting to real Eidrix ───────────────────────────────────────────
// This file IS the contract Sunday Interview generates, per-tenant
// theming modifies, and agentic tool calling reads. Changes here ripple
// across every future capability that touches record structure. Be
// deliberate; changes to these types are architectural moves.
// ──────────────────────────────────────────────────────────────────────

import type { ComponentType, ReactNode } from 'react'

// ─── Records ──────────────────────────────────────────────────────────

export interface RecordColumn<TRecord> {
  id: string
  header: string
  render: (record: TRecord) => ReactNode
  widthClass?: string
}

/**
 * Tertiary tab inside a record detail section. Type exists so configs
 * CAN declare per-section filter/view sub-tabs (e.g., Job Walks →
 * All / Scheduled / Completed / Cancelled), but no configs use this
 * yet. Engine renders the third-tier bar when any active section has
 * tertiaryTabs populated.
 */
export interface TertiaryTab<TRecord> {
  id: string
  label: string
  Component: ComponentType<{ record: TRecord }>
}

export interface RecordDetailSection<TRecord> {
  /** Secondary tab id, e.g. 'overview', 'notes', 'variants'. */
  id: string
  /** Secondary tab label, e.g. 'Overview', 'Notes'. */
  label: string
  /** Component rendered inside this section. Receives the active record. */
  Component: ComponentType<{ record: TRecord }>
  /** Optional tertiary tabs that render directly below the secondary
   *  bar when this section is active. Each has its own Component
   *  (also record-contextual). If present, the engine renders the
   *  active tertiary's Component INSTEAD of this section's Component.
   *  Unused by current configs — extension point for per-section
   *  filter/view sub-tabs. */
  tertiaryTabs?: TertiaryTab<TRecord>[]
}

export interface RecordsConfig<TRecord = unknown> {
  /** Stable identifier for this record type — 'customer', 'product', etc. */
  recordType: string

  singular: string
  plural: string

  /**
   * Hook-style getter. The engine calls this inside a component's render
   * tree, so React's rules of hooks apply.
   */
  useRecords: () => TRecord[]

  getId: (record: TRecord) => string
  getDisplayName: (record: TRecord) => string

  columns: RecordColumn<TRecord>[]

  /** Secondary tabs when a record of this type is opened as a record tab. */
  detailSections: RecordDetailSection<TRecord>[]

  /**
   * Optional slim profile strip rendered above the active section's
   * content. Config owns the presentation (which fields, how laid out)
   * because different record types want different strips — a customer
   * surfaces phone/email/address; a product surfaces SKU/price/stock.
   *
   * Information-only per Eidrix direction: no quick-action buttons.
   * Agent interactions live in the chat column, not here.
   */
  ProfileStrip?: ComponentType<{ record: TRecord }>

  onAddRecord?: () => void
  onDeleteRecord?: (record: TRecord) => void
  onRowClick: (record: TRecord) => void
  useRecentlyAddedId?: () => string | null
}

// ─── Primary tabs ─────────────────────────────────────────────────────

export interface CustomTab {
  id: string
  label: string
  kind: 'custom'
  Component: ComponentType
}

export interface RecordsTab<TRecord = unknown> {
  id: string
  label: string
  kind: 'records'
  records: RecordsConfig<TRecord>
}

export type PrimaryTab = CustomTab | RecordsTab

/**
 * Helper for defining a `RecordsTab` with specific record typing and
 * placing it into the engine-wide `PrimaryTab[]` array.
 *
 * TypeScript limitation: `RecordsConfig<Customer>` is not assignable
 * to `RecordsConfig<unknown>` (function parameters are contravariant).
 * This is called "existential types" and TypeScript doesn't natively
 * model them, so we erase the generic with one justified cast.
 *
 * The cast is sound at runtime because records never cross config
 * boundaries.
 */
export function recordsTab<TRecord>(tab: RecordsTab<TRecord>): RecordsTab {
  return tab as unknown as RecordsTab
}

// ─── The top-level config ─────────────────────────────────────────────

export interface BusinessConfig {
  id: string
  name: string
  primaryTabs: PrimaryTab[]
}
