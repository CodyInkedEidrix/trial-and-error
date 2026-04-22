// ──────────────────────────────────────────────────────────────────────
// ChatColumn — the always-visible chat surface on the left side.
//
// Sovereign per the chat-sovereignty principle: never blurred, never
// covered, always interactive. Post-Chapter-11: fully composed from
// chat/ sub-components rather than rendering its own message shells.
//
// No header. The Eye lives inside each Eidrix message as its avatar;
// the identity strip is deliberately absent for a compact, Claude-
// school layout. AC-04 will add a conversation dropdown here (pin /
// new chat / history) when persistent memory lands.
// ──────────────────────────────────────────────────────────────────────

import ChatInput from './chat/ChatInput'
import MessageList from './chat/MessageList'

export default function ChatColumn() {
  return (
    <aside className="w-[380px] flex-shrink-0 flex flex-col h-screen border-r border-obsidian-800">
      <MessageList />
      <ChatInput />
    </aside>
  )
}
