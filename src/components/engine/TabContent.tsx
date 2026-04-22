// ──────────────────────────────────────────────────────────────────────
// TabContent — renders the body of whichever tab path is currently
// active. Walks activePath to resolve the leaf to render.
//
// Four cases:
//   - primary is record → RecordDetailView (handles slim profile strip
//     + active section content)
//   - primary is 'records' kind → RecordListView
//   - primary is 'custom' kind → the config's Component
//   - empty/unknown path → fallback to first primary tab
// ──────────────────────────────────────────────────────────────────────

import { activeConfig } from '../../config/active'
import { useTabStore, RECORD_TAB_ID } from '../../lib/tabStore'
import RecordDetailView from './RecordDetailView'
import RecordListView from './RecordListView'

export default function TabContent() {
  const activePath = useTabStore((s) => s.activePath)
  const openRecord = useTabStore((s) => s.openRecord)

  const primaryId = activePath[0] || activeConfig.primaryTabs[0]?.id || ''

  // Record tab: render the record detail view.
  if (primaryId === RECORD_TAB_ID) {
    if (!openRecord) return null
    return (
      <RecordDetailView
        parentTabId={openRecord.parentTabId}
        record={openRecord.record}
      />
    )
  }

  // Defensive fallback — if the path points to a tab that doesn't exist
  // in the active config (e.g., after swapping configs with stale state),
  // render the first primary tab instead of an error text.
  const activeTab =
    activeConfig.primaryTabs.find((t) => t.id === primaryId) ??
    activeConfig.primaryTabs[0]

  if (!activeTab) return null

  if (activeTab.kind === 'custom') {
    const Component = activeTab.Component
    return <Component />
  }

  // kind: 'records'
  return <RecordListView records={activeTab.records} />
}
