import TypographyLab from './TypographyLab'
import ColorLab from './ColorLab'
import ComponentsTab from './ComponentsTab'

export type TabId = 'lab' | 'components' | 'records' | 'chat' | 'settings'

export const tabs: { id: TabId; label: string }[] = [
  { id: 'lab', label: 'Lab' },
  { id: 'components', label: 'Components' },
  { id: 'records', label: 'Records' },
  { id: 'chat', label: 'Chat' },
  { id: 'settings', label: 'Settings' },
]

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
              // Three stacked shadows: 1px ember top accent, dark depth shadow
              // for elevation, soft warm ember glow filling the breathing room
              // above the tab.
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

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-secondary">
        Coming soon
      </p>
      <div
        className="mt-3 h-px w-32"
        style={{
          background:
            'linear-gradient(to right, transparent, var(--ember-500), transparent)',
          opacity: 0.5,
        }}
      />
      <p className="font-body text-sm text-text-tertiary mt-3 text-center max-w-sm">
        The {label} tab will be built in a later chapter.
      </p>
    </div>
  )
}

interface TabsPanelProps {
  activeTab: TabId
  setActiveTab: (id: TabId) => void
}

export default function TabsPanel({ activeTab, setActiveTab }: TabsPanelProps) {
  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? ''

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Tab bar — pt-3 gives breathing room above tabs so the active tab's
          ember glow has space to bloom upward. */}
      <nav className="flex-shrink-0 flex pt-3 border-b border-obsidian-800">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.label}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </nav>

      {/* Tab content area — only this scrolls */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'lab' && (
          <>
            <TypographyLab />
            <ColorLab />
          </>
        )}
        {activeTab === 'components' && <ComponentsTab />}
        {activeTab !== 'lab' && activeTab !== 'components' && (
          <ComingSoon label={activeLabel} />
        )}
      </div>
    </main>
  )
}
