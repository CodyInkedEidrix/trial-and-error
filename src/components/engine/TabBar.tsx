// ──────────────────────────────────────────────────────────────────────
// TabBar — the primary tab navigation strip + the transient record tab.
//
// Renders ONLY the primary tier. Secondary and tertiary tabs render in
// SubTabBar components below this one, at the engine level (not nested
// inside content). Three tab bars stacked at the top of the workspace.
// ──────────────────────────────────────────────────────────────────────

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { activeConfig } from '../../config/active'
import { useTabStore, RECORD_TAB_ID } from '../../lib/tabStore'
import type { RecordsConfig } from '../../config/businessConfig'

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-5 py-2 font-mono text-xs uppercase tracking-widest transition-all rounded-t-md ${
        active
          ? 'text-text-primary bg-obsidian-800'
          : 'text-text-secondary hover:text-text-primary hover:bg-obsidian-900/50'
      }`}
      style={
        active
          ? {
              boxShadow:
                'inset 0 1px 0 var(--ember-500), 0 -3px 8px rgba(0, 0, 0, 0.35), 0 -4px 24px rgba(255, 107, 26, 0.25)',
            }
          : undefined
      }
    >
      {label}
    </button>
  )
}

function getParentRecordsConfig(parentTabId: string): RecordsConfig | null {
  const parent = activeConfig.primaryTabs.find((t) => t.id === parentTabId)
  if (!parent || parent.kind !== 'records') return null
  return parent.records
}

function RecordTabButton({
  parentTabId,
  record,
  active,
  reducedMotion,
}: {
  parentTabId: string
  record: unknown
  active: boolean
  reducedMotion: boolean
}) {
  const focusRecordTab = useTabStore((s) => s.focusRecordTab)
  const closeRecordTab = useTabStore((s) => s.closeRecordTab)

  const records = getParentRecordsConfig(parentTabId)
  const label = records ? records.getDisplayName(record) : 'Record'

  const enterMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 12, scale: 0.95 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: 12, scale: 0.95 },
      }

  return (
    <motion.div
      {...enterMotion}
      transition={{
        duration: reducedMotion ? 0.1 : 0.28,
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className="relative"
    >
      {/* Separator so the record tab reads as transient, not as
          another primary nav entry. */}
      <div
        aria-hidden
        className="absolute left-0 top-3 bottom-1 w-px bg-obsidian-800"
      />

      <div className="flex items-center">
        <button
          onClick={focusRecordTab}
          className={`relative pl-5 pr-2 py-2 font-mono text-xs uppercase tracking-widest transition-all rounded-t-md ${
            active
              ? 'text-text-primary bg-obsidian-800'
              : 'text-text-secondary hover:text-text-primary hover:bg-obsidian-900/50'
          }`}
          style={
            active
              ? {
                  boxShadow:
                    'inset 0 1px 0 var(--ember-500), 0 -3px 8px rgba(0, 0, 0, 0.35), 0 -4px 24px rgba(255, 107, 26, 0.25)',
                }
              : undefined
          }
        >
          <span className="normal-case tracking-normal font-body">{label}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            closeRecordTab()
          }}
          aria-label={`Close ${label}`}
          className={`-ml-1 mr-2 self-center p-1 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ember-500/60 ${
            active
              ? 'text-text-tertiary hover:text-text-primary'
              : 'text-text-tertiary/50 hover:text-text-primary'
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

export default function TabBar() {
  const activePath = useTabStore((s) => s.activePath)
  const navigatePrimary = useTabStore((s) => s.navigatePrimary)
  const openRecord = useTabStore((s) => s.openRecord)
  const reducedMotion = useReducedMotion() ?? false

  // Resolve empty path to the first primary tab for highlighting.
  const activePrimaryId =
    activePath[0] || activeConfig.primaryTabs[0]?.id || ''

  return (
    <nav className="flex-shrink-0 flex items-end pt-3 border-b border-obsidian-800">
      {activeConfig.primaryTabs.map((tab) => (
        <TabButton
          key={tab.id}
          label={tab.label}
          active={activePrimaryId === tab.id}
          onClick={() => navigatePrimary(tab.id)}
        />
      ))}

      <AnimatePresence>
        {openRecord && (
          <RecordTabButton
            key="record-tab"
            parentTabId={openRecord.parentTabId}
            record={openRecord.record}
            active={activePrimaryId === RECORD_TAB_ID}
            reducedMotion={reducedMotion}
          />
        )}
      </AnimatePresence>
    </nav>
  )
}
