import EidrixEye from './brand/EidrixEye'

type Sender = 'eidrix' | 'user'

type Message = {
  sender: Sender
  text: string
}

const placeholderMessages: Message[] = [
  {
    sender: 'eidrix',
    text: "Hey! This is the Eidrix chat. It's not wired up yet — that comes later in the curriculum.",
  },
  {
    sender: 'user',
    text: 'Got it. Just getting the shape right.',
  },
  {
    sender: 'eidrix',
    text: 'Exactly. See you in Chapter 11.',
  },
]

function ChatMessage({ sender, text }: Message) {
  const senderLabel = sender === 'eidrix' ? 'Eidrix' : 'You'
  const labelColor =
    sender === 'eidrix'
      ? 'var(--ember-500)'
      : 'var(--cobalt-500)'

  return (
    <div className="space-y-2">
      <p
        className="font-mono text-xs uppercase tracking-widest"
        style={{ color: labelColor }}
      >
        {senderLabel}
      </p>
      <p className="font-body text-sm text-text-primary leading-relaxed">
        {text}
      </p>
    </div>
  )
}

export default function ChatColumn() {
  return (
    <aside className="w-[380px] flex-shrink-0 flex flex-col h-screen border-r border-obsidian-800">
      {/* Header — the Eidrix Eye IS the chat identifier now.
          aria-label preserves the semantic meaning since the Eye
          itself is aria-hidden. */}
      <header
        aria-label="Chat"
        className="flex-shrink-0 px-6 py-4 bg-obsidian-900 border-b border-obsidian-800"
      >
        <div className="flex items-center gap-3">
          <EidrixEye size={40} state="idle" />
          <span className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
            online
          </span>
        </div>
      </header>

      {/* Message list — only this scrolls */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {placeholderMessages.map((m, i) => (
          <ChatMessage key={i} {...m} />
        ))}
      </div>

      {/* Input — visual only, not wired */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-obsidian-800 bg-obsidian-900">
        <input
          type="text"
          placeholder="Send a message…"
          className="w-full px-4 py-3 rounded-md bg-obsidian-800 text-text-primary font-body text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 transition-shadow"
          style={{
            // ember focus ring via inline so we can pin it to the variable
            // (Tailwind's ring-color is set via class above-default; this overrides)
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 2px var(--ember-500)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = ''
          }}
        />
      </div>
    </aside>
  )
}
