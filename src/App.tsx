import { useEffect, useState } from 'react'
import ChatColumn from './components/ChatColumn'
import TabsPanel from './components/TabsPanel'
import CommandPalette from './components/CommandPalette'
import type { TabId } from './components/TabsPanel'

export default function App() {
  // Tab state is lifted here (previously lived in TabsPanel) so the
  // command palette can switch tabs too — both consumers now read from
  // and write to the same source of truth.
  const [activeTab, setActiveTab] = useState<TabId>('lab')

  // Command palette open state. Local useState is enough since only App
  // and CommandPalette touch it.
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Global cmd+K / ctrl+K listener. preventDefault is critical — without
  // it Chrome hijacks cmd+K to focus the URL bar.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <ChatColumn />
        <TabsPanel activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        setActiveTab={setActiveTab}
      />
    </>
  )
}
