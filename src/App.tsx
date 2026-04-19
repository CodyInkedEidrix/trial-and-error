import ChatColumn from './components/ChatColumn'
import TabsPanel from './components/TabsPanel'

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <ChatColumn />
      <TabsPanel />
    </div>
  )
}
