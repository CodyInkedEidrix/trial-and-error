// ──────────────────────────────────────────────────────────────────────
// RecordDetailView — the third-tier record tab's body.
//
// Post-Phase-C.5: no longer renders its own secondary tab bar (that
// moved up to TabsPanel so all three tiers stack at the top).
// Renders:
//   - optional slim ProfileStrip from records config
//   - active section's Component (resolved via activePath[1])
//   - if that section has tertiary tabs and one is active, render the
//     tertiary's Component instead of the section's
//
// The profile strip is intentionally information-only — no quick-action
// buttons. Eidrix agent interactions live in the chat column per the
// chat-sovereignty principle; there's no "Ask Eidrix" affordance here.
// ──────────────────────────────────────────────────────────────────────

import type { ComponentType } from 'react'

import { activeConfig } from '../../config/active'
import { useTabStore } from '../../lib/tabStore'
import type { RecordsConfig } from '../../config/businessConfig'

interface RecordDetailViewProps {
  parentTabId: string
  record: unknown
}

export default function RecordDetailView({
  parentTabId,
  record,
}: RecordDetailViewProps) {
  const activePath = useTabStore((s) => s.activePath)

  const parentTab = activeConfig.primaryTabs.find((t) => t.id === parentTabId)
  if (!parentTab || parentTab.kind !== 'records') {
    return (
      <div className="p-6 font-mono text-xs text-text-tertiary">
        Record detail: parent tab not found or not a records tab.
      </div>
    )
  }

  const records: RecordsConfig = parentTab.records
  const sections = records.detailSections
  const activeSectionId = activePath[1] ?? sections[0]?.id ?? ''
  const activeSection = sections.find((s) => s.id === activeSectionId) ?? sections[0]

  if (!activeSection) {
    return (
      <div className="p-6 font-mono text-xs text-text-tertiary">
        No sections configured for {records.singular}.
      </div>
    )
  }

  // Tertiary resolution — if the active section has tertiaryTabs and
  // one is active, render it instead of the section's own Component.
  const activeTertiaryId = activePath[2] ?? ''
  const activeTertiary = activeSection.tertiaryTabs?.find(
    (t) => t.id === activeTertiaryId,
  )

  // Pick the component to render: tertiary wins over section.
  const ComponentToRender = (activeTertiary?.Component ??
    activeSection.Component) as ComponentType<{ record: unknown }>

  const ProfileStrip = records.ProfileStrip as
    | ComponentType<{ record: unknown }>
    | undefined

  return (
    <div className="flex flex-col">
      {ProfileStrip && (
        <div className="flex-shrink-0">
          <ProfileStrip record={record} />
        </div>
      )}
      <ComponentToRender record={record} />
    </div>
  )
}
