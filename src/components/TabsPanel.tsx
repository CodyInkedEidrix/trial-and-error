// ──────────────────────────────────────────────────────────────────────
// TabsPanel — the right-side workspace container.
//
// Stacks the three tab tiers at the top, content below:
//   ┌─ TabBar (primary)
//   ├─ SubTabBar level 2 (secondary, conditional)
//   ├─ SubTabBar level 3 (tertiary, conditional)
//   └─ TabContent (active leaf)
//
// All three tab tiers render in a fixed, consistent position — never
// nested inside content. This gives users a persistent spatial
// hierarchy ("I am here: Records → Overview → All") and makes every
// navigation move feel like it happens at the same layer.
// ──────────────────────────────────────────────────────────────────────

import { activeConfig } from './../config/active'
import { useTabStore, RECORD_TAB_ID } from './../lib/tabStore'
import SubTabBar from './engine/SubTabBar'
import TabBar from './engine/TabBar'
import TabContent from './engine/TabContent'

/**
 * Resolve what the secondary and tertiary bars should show based on
 * the current activePath. Returns the items for each bar and the
 * currently-active id at each level. Empty items array means no bar.
 */
function useSubTabContext() {
  const activePath = useTabStore((s) => s.activePath)
  const openRecord = useTabStore((s) => s.openRecord)
  const navigateSecondary = useTabStore((s) => s.navigateSecondary)
  const navigateTertiary = useTabStore((s) => s.navigateTertiary)

  // Resolve effective primary.
  const activePrimaryId =
    activePath[0] || activeConfig.primaryTabs[0]?.id || ''

  // ── Level 2 items ────────────────────────────────────────────────
  let level2Items: { id: string; label: string }[] = []
  let level2ActiveId = activePath[1] ?? ''

  if (activePrimaryId === RECORD_TAB_ID && openRecord) {
    // Active primary is a record — secondary = its detailSections.
    const parent = activeConfig.primaryTabs.find(
      (t) => t.id === openRecord.parentTabId,
    )
    if (parent && parent.kind === 'records') {
      level2Items = parent.records.detailSections.map((s) => ({
        id: s.id,
        label: s.label,
      }))
      if (!level2ActiveId && level2Items[0]) {
        level2ActiveId = level2Items[0].id
      }
    }
  }
  // Future: non-record primary tabs with their own secondaryTabs would
  // populate level2Items here too. Not wired in current configs.

  // ── Level 3 items ────────────────────────────────────────────────
  let level3Items: { id: string; label: string }[] = []
  let level3ActiveId = activePath[2] ?? ''

  if (activePrimaryId === RECORD_TAB_ID && openRecord && level2ActiveId) {
    const parent = activeConfig.primaryTabs.find(
      (t) => t.id === openRecord.parentTabId,
    )
    if (parent && parent.kind === 'records') {
      const activeSection = parent.records.detailSections.find(
        (s) => s.id === level2ActiveId,
      )
      if (activeSection?.tertiaryTabs?.length) {
        level3Items = activeSection.tertiaryTabs.map((t) => ({
          id: t.id,
          label: t.label,
        }))
        if (!level3ActiveId && level3Items[0]) {
          level3ActiveId = level3Items[0].id
        }
      }
    }
  }

  return {
    level2Items,
    level2ActiveId,
    level3Items,
    level3ActiveId,
    navigateSecondary,
    navigateTertiary,
  }
}

export default function TabsPanel() {
  const sub = useSubTabContext()

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden">
      <TabBar />

      {sub.level2Items.length > 0 && (
        <SubTabBar
          items={sub.level2Items}
          activeId={sub.level2ActiveId}
          onSelect={sub.navigateSecondary}
          level={2}
        />
      )}

      {sub.level3Items.length > 0 && (
        <SubTabBar
          items={sub.level3Items}
          activeId={sub.level3ActiveId}
          onSelect={sub.navigateTertiary}
          level={3}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        <TabContent />
      </div>
    </main>
  )
}
