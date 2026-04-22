import { useEffect, useState } from 'react'
import ChatColumn from './components/ChatColumn'
import TabsPanel from './components/TabsPanel'
import CommandPalette from './components/CommandPalette'
import CustomerForm from './components/records/CustomerForm'
import ToastStack from './components/toast/ToastStack'

// Chapter 12 rollback drill — intentional production break at module load.
// This will be reverted immediately after the drill completes.
throw new Error('Chapter 12 rollback drill — intentional')

export default function App() {
  // Tab state used to live here as useState; it's now in `tabStore`
  // so the palette, future agent tool calls, and any other surface
  // can drive tab navigation without prop drilling.

  // Command palette open state — still local useState since only App
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
        <TabsPanel />
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <CustomerForm />
      <ToastStack />
    </>
  )
}
