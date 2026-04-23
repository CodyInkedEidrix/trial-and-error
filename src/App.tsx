import { useEffect, useState } from 'react'
import ChatColumn from './components/ChatColumn'
import TabsPanel from './components/TabsPanel'
import CommandPalette from './components/CommandPalette'
import CustomerForm from './components/records/CustomerForm'
import JobForm from './components/records/JobForm'
import ToastStack from './components/toast/ToastStack'
import SignInPage from './components/auth/SignInPage'
import { useAuth } from './lib/useAuth'

export default function App() {
  // Auth gate — every render passes through here. The hook subscribes
  // once to onAuthStateChange and exposes session + memberships state
  // through the underlying Zustand store.
  const { session, isLoading } = useAuth()

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

  // Initial session check — keep the screen calm with the same warm
  // obsidian background so there's no flash of unstyled content.
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-obsidian-950">
        <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          Loading…
        </p>
      </div>
    )
  }

  if (!session) {
    return (
      <>
        <SignInPage />
        <ToastStack />
      </>
    )
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <ChatColumn />
        <TabsPanel />
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <CustomerForm />
      <JobForm />
      <ToastStack />
    </>
  )
}
