// ──────────────────────────────────────────────────────────────────────
// ChatInput — the compose row at the bottom of the chat column.
//
// Layout (compact, Claude-school):
//   ┌────────────────────────────────────────────────┐
//   │ Type a message...            [📎] [🎤] [→]     │
//   └────────────────────────────────────────────────┘
//
// Auto-grows to a max height (160px), then scrolls internally.
// Auto-focuses on mount and after send.
//
// Keyboard:
//   - Enter → send (if not empty, not thinking)
//   - Shift+Enter → newline (textarea default)
//   - Escape → clear input
//
// Stub buttons (attach, voice) are visually present but disabled with
// a native title tooltip pointing at the capability chapter that will
// wire them up.
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

import { useChatStore } from '../../lib/chatStore'

const MAX_HEIGHT_PX = 160

// ─── Icon button primitive (scoped to this file) ─────────────────────

interface IconButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  ariaLabel: string
  title?: string
  variant?: 'default' | 'primary'
}

function IconButton({
  children,
  onClick,
  disabled,
  ariaLabel,
  title,
  variant = 'default',
}: IconButtonProps) {
  const isPrimary = variant === 'primary' && !disabled

  // Send: flat ember, subtle glow on hover. Same visual grammar as the
  // Button primitive elsewhere in the app. Confidence through restraint
  // — the Eye carries Eidrix's identity; action buttons stay quiet.
  const classes = isPrimary
    ? 'rounded-md bg-ember-500 text-obsidian-950 hover:shadow-[0_0_14px_rgba(255,107,26,0.35)]'
    : disabled
      ? 'rounded text-text-tertiary/40 cursor-not-allowed'
      : 'rounded text-text-tertiary hover:text-text-primary'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={`flex items-center justify-center w-7 h-7 transition-all duration-150 outline-none focus-visible:shadow-[0_0_0_2px_rgba(255,107,26,0.55)] ${classes}`}
    >
      {children}
    </button>
  )
}

// ─── Icons (inline SVG — no icon library) ─────────────────────────────

function AttachIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function VoiceIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  )
}

// ─── Main component ──────────────────────────────────────────────────

export default function ChatInput() {
  const isThinking = useChatStore((s) => s.isThinking)
  const sendUserMessage = useChatStore((s) => s.sendUserMessage)

  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = value.trim().length > 0 && !isThinking

  // Auto-grow — height = min(scrollHeight, MAX). Measure on every change.
  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }

  // Initial focus — the chat is supposed to feel like it's waiting for
  // you, so focus lands inside on mount.
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // After Eidrix finishes thinking, pull focus back to the input so
  // rapid-fire chatting doesn't require a mouse hop.
  useEffect(() => {
    if (!isThinking) {
      textareaRef.current?.focus()
    }
  }, [isThinking])

  // Re-measure if value was cleared externally (e.g., after send).
  useEffect(() => {
    autoResize()
  }, [value])

  const handleSend = () => {
    if (!canSend) return
    sendUserMessage(value)
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setValue('')
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
      return
    }
    // Shift+Enter falls through → textarea inserts newline natively
  }

  return (
    <div className="flex-shrink-0 border-t border-obsidian-800 px-3 py-2.5">
      <div className="bg-obsidian-800 rounded-lg px-2.5 py-2 border border-transparent focus-within:border-ember-700/60 focus-within:shadow-[0_0_0_3px_rgba(255,107,26,0.12)] transition-all">
        {/* Row 1 — textarea fills the width; mic sits inline, bottom-
            aligned so it stays anchored to the last typed line as the
            textarea grows. */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              autoResize()
            }}
            onKeyDown={handleKeyDown}
            placeholder={isThinking ? 'Eidrix is thinking…' : 'Type a message…'}
            disabled={isThinking}
            rows={1}
            className="flex-1 bg-transparent resize-none focus:outline-none font-body text-[13px] leading-relaxed text-text-primary placeholder:text-text-tertiary py-1 disabled:cursor-not-allowed"
            style={{ maxHeight: `${MAX_HEIGHT_PX}px` }}
          />
          <div className="flex-shrink-0 pb-0.5">
            <IconButton
              ariaLabel="Voice input"
              title="Coming in AC-10"
              disabled
            >
              <VoiceIcon />
            </IconButton>
          </div>
        </div>

        {/* Row 2 — attach anchors bottom-left, send anchors bottom-right. */}
        <div className="flex items-center justify-between mt-1.5">
          <IconButton
            ariaLabel="Attach file"
            title="Coming in AC-09"
            disabled
          >
            <AttachIcon />
          </IconButton>
          <IconButton
            ariaLabel="Send message"
            onClick={handleSend}
            disabled={!canSend}
            variant="primary"
          >
            <SendIcon />
          </IconButton>
        </div>
      </div>
    </div>
  )
}
