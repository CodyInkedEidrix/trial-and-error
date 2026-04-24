// ──────────────────────────────────────────────────────────────────────
// sigilStore — queued dispatch for the Eye's visible gestures.
//
// Any component can call `useSigilStore.getState().fire('thinking')`
// to request a sigil. The SigilOverlay renders the HEAD of the queue
// and calls `dismiss(id)` when that sigil finishes its draw + hold +
// fade. The next queued sigil plays next. Serializing like this keeps
// back-to-back events (plan starts, then completes 2s later) reading
// as a sequence rather than a pile-up.
//
// Module-level subscription at the bottom of this file wires planStore
// lifecycle transitions to sigil fires:
//
//   null → running    → fire('thinking')
//   running → complete → fire('complete')
//   running → stopped  → fire('stopped')
//   running → failed   → fire('failed')
//
// This is the whole integration. If you want a sigil on a button
// click later, just call fire('your-kind') in the click handler —
// no new wiring needed.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import type { SigilKind } from '../components/chat/sigils/sigils'
import { usePlanStore } from './planStore'

export interface SigilEvent {
  /** Unique per fire. SigilOverlay uses this as its React key so
   *  rapid-fire identical sigils each get their own entrance/exit. */
  id: string
  kind: SigilKind
  firedAt: number
}

export interface SigilStore {
  /** Oldest pending / in-flight sigil is at index 0. The renderer
   *  subscribes to queue[0] and calls dismiss() when it finishes. */
  queue: SigilEvent[]

  /** Enqueue a new sigil. Returns its id (mostly for tests). */
  fire: (kind: SigilKind) => string

  /** Remove a sigil by id (called by the renderer when draw + hold +
   *  fade completes). No-op if id isn't in the queue. */
  dismiss: (id: string) => void

  clear: () => void
}

function generateId(): string {
  return `sigil-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useSigilStore = create<SigilStore>((set) => ({
  queue: [],

  fire: (kind) => {
    const id = generateId()
    set((state) => ({
      queue: [...state.queue, { id, kind, firedAt: Date.now() }],
    }))
    return id
  },

  dismiss: (id) => {
    set((state) => ({
      queue: state.queue.filter((s) => s.id !== id),
    }))
  },

  clear: () => {
    set({ queue: [] })
  },
}))

// ─── Plan lifecycle → sigil dispatch ─────────────────────────────────
// One subscription, four branches. Reads planStore transitions and
// translates into sigil fires. Runs at module load; unsubscribe not
// needed — zustand subscriptions live for the app session.

usePlanStore.subscribe((state, prev) => {
  const prevPlan = prev.activePlan
  const nextPlan = state.activePlan

  // Plan started: null (or non-running) → running
  const wasRunning = prevPlan?.status === 'running'
  const isRunning = nextPlan?.status === 'running'
  if (!wasRunning && isRunning) {
    useSigilStore.getState().fire('thinking')
    return
  }

  // Plan ended: running → null. Read the terminal status from the
  // newly-prepended historical plan (completePlan moves the terminal
  // plan onto historicalPlans[0]).
  if (wasRunning && !nextPlan) {
    const terminal = state.historicalPlans[0]
    // Guard: make sure the head of historicalPlans is actually the
    // plan that just ended. If not (e.g., rehydrate ran concurrently),
    // skip the sigil — better quiet than wrong.
    if (terminal?.id !== prevPlan?.id) return
    if (terminal.status === 'complete') {
      useSigilStore.getState().fire('complete')
    } else if (terminal.status === 'stopped') {
      useSigilStore.getState().fire('stopped')
    } else if (terminal.status === 'failed') {
      useSigilStore.getState().fire('failed')
    }
  }
})
