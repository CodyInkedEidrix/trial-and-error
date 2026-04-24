// ──────────────────────────────────────────────────────────────────────
// MessageList — scrollable chat body.
//
// Renders the empty state when no messages exist, OR an interleaved
// timeline of messages + historical plan chips, followed by the
// PlanCardLayer (live plan only) and the single ChatEyeAnchor.
//
// ─── Why interleave instead of pinning chips to the tail ──────────────
// Pinning historical chips at the tail (above the Eye) made them feel
// stuck — as the user kept chatting, the chip floated downward with the
// new content rather than freezing at the position of the conversation
// where the plan actually completed. Sorting messages + chips by
// timestamp pins each chip to its origin point; new messages appear
// below, the chip stays anchored to the assistant summary it describes.
//
// Chip-vs-message tiebreaker: when timestamps are within 2s of each
// other, the message wins — assistant summaries should always appear
// BEFORE the "plan complete" chip even though the chip's completedAt
// can land a few hundred ms before the persisted message's createdAt.
// ──────────────────────────────────────────────────────────────────────

import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useChatStore } from '../../lib/chatStore'
import { usePlanStore } from '../../lib/planStore'
import type { ToolLogEntry } from '../../lib/planStore'
import type { Message } from '../../types/message'
import type { ActivePlan } from '../../types/activePlan'
import ChatEmptyState from './ChatEmptyState'
import ChatEyeAnchor from './ChatEyeAnchor'
import HistoricalPlanChip from './HistoricalPlanChip'
import MessageBubble from './MessageBubble'
import PlanCardLayer from './PlanCardLayer'

const NEAR_BOTTOM_PX = 80
const CHIP_VS_MESSAGE_TIE_WINDOW_MS = 2000

type TailItem =
  | { kind: 'message'; ts: number; key: string; message: Message }
  | {
      kind: 'historical-plan'
      ts: number
      key: string
      plan: ActivePlan
      toolLog?: ToolLogEntry[]
    }

export default function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  // Step count is the cheapest primitive that changes on every plan
  // step event — subscribing to it keeps auto-scroll firing as steps
  // populate without pulling in the whole plan object.
  const planStepCount = usePlanStore(
    (s) => s.activePlan?.steps.length ?? 0,
  )
  const planActive = usePlanStore(
    (s) => s.activePlan?.status === 'running',
  )
  const historicalPlans = usePlanStore((s) => s.historicalPlans)
  const historicalToolLogs = usePlanStore((s) => s.historicalToolLogs)
  // Send-gate signal: the user tried to send while a plan was running.
  // Force-scroll regardless of stickToBottom so the active plan + Stop
  // button come into view (replaces the old free-floating toast).
  const stopHintNonce = usePlanStore((s) => s.stopHintNonce)

  const listRef = useRef<HTMLDivElement>(null)
  const [stickToBottom, setStickToBottom] = useState(true)

  // Build the interleaved timeline. Each chip pins to its own
  // completedAt timestamp so it doesn't float with new content.
  const tailItems = useMemo<TailItem[]>(() => {
    const items: TailItem[] = []
    for (const m of messages) {
      items.push({
        kind: 'message',
        ts: new Date(m.createdAt).getTime(),
        key: m.id,
        message: m,
      })
    }
    for (const p of historicalPlans) {
      if (!p.completedAt) continue
      items.push({
        kind: 'historical-plan',
        ts: new Date(p.completedAt).getTime(),
        key: `chip-${p.id}`,
        plan: p,
        toolLog: historicalToolLogs[p.id],
      })
    }
    items.sort((a, b) => {
      const delta = a.ts - b.ts
      // Tiebreaker — within the window, the message comes first so
      // the "On it. All done…" summary text reads BEFORE the chip
      // that describes it being done.
      if (Math.abs(delta) < CHIP_VS_MESSAGE_TIE_WINDOW_MS) {
        if (a.kind === 'message' && b.kind === 'historical-plan') return -1
        if (a.kind === 'historical-plan' && b.kind === 'message') return 1
      }
      return delta
    })
    return items
  }, [messages, historicalPlans, historicalToolLogs])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight
      setStickToBottom(dist < NEAR_BOTTOM_PX)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!stickToBottom || !listRef.current) return
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [
    messages.length,
    isStreaming,
    planStepCount,
    planActive,
    historicalPlans.length,
    stickToBottom,
  ])

  // Force-scroll override: when the send-gate fires we always pull
  // the user back to the tail, even if they were reading scrollback.
  // Skip the initial mount (nonce starts at 0).
  useEffect(() => {
    if (stopHintNonce === 0 || !listRef.current) return
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [stopHintNonce])

  const hasConversation = messages.length > 0

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto eidrix-scrollbar px-4 py-4"
      aria-live="polite"
    >
      {!hasConversation ? (
        <ChatEmptyState />
      ) : (
        <>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {tailItems.map((item) =>
                item.kind === 'message' ? (
                  <MessageBubble key={item.key} message={item.message} />
                ) : (
                  <HistoricalPlanChip
                    key={item.key}
                    plan={item.plan}
                    toolLog={item.toolLog}
                  />
                ),
              )}
            </AnimatePresence>
          </div>
          {/* Tail cluster — live plan card (if running) + Eye, in a
              tight vertical column so the tether and Eye read as one
              composed unit at the bottom of the conversation. */}
          <div className="mt-3 flex flex-col">
            <PlanCardLayer />
            <ChatEyeAnchor />
          </div>
        </>
      )}
    </div>
  )
}
