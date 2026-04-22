// ──────────────────────────────────────────────────────────────────────
// Customer store — Zustand + localStorage persist.
//
// Holds the visible customer list AND a separate in-memory map of
// "pending deletes" that power the undo window. Only `customers` is
// persisted; pending deletes live in memory because:
//   1. Their timer IDs are meaningless across reloads.
//   2. Closing the tab = committing the delete (Gmail behaviour).
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Customer, CustomerInput } from '../types/customer'
import { buildSeedCustomers } from './seedCustomers'

const PERSIST_KEY = 'eidrix-customers-v1'
const UNDO_WINDOW_MS = 5000
const FLASH_WINDOW_MS = 900

interface PendingDelete {
  customer: Customer
  originalIndex: number
  timerId: ReturnType<typeof setTimeout>
}

export interface CustomerStore {
  customers: Customer[]
  pendingDeletes: Record<string, PendingDelete>

  /**
   * UI signal — the last customer added, so the row can auto-scroll
   * into view and briefly glow. Auto-clears ~900ms after the set.
   * Lives alongside data because `addCustomer` is the natural trigger
   * point; a separate UI store would double the surface for one field.
   */
  recentlyAddedId: string | null

  /** Appends a new customer to the end of the list. */
  addCustomer: (input: CustomerInput) => Customer

  /** Patches the customer in place — id, timestamps, and counts are preserved. */
  updateCustomer: (id: string, patch: Partial<CustomerInput>) => void

  /** Removes from the visible list; starts the 5s true-delete timer. */
  deleteCustomer: (id: string) => void

  /** Stops the timer and splices the customer back into its original slot. */
  undoDelete: (id: string) => void

  /**
   * Internal — called when the undo timer expires. Exposed on the store
   * so setTimeout can call it via `useCustomerStore.getState()`.
   */
  finalizeDelete: (id: string) => void
}

/**
 * UUID shim. crypto.randomUUID is available in all modern browsers
 * served over HTTPS or localhost; the fallback only exists so early
 * dev envs (http, old iframes) don't explode.
 */
function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      customers: buildSeedCustomers(),
      pendingDeletes: {},
      recentlyAddedId: null,

      addCustomer: (input) => {
        const now = new Date().toISOString()
        const customer: Customer = {
          ...input,
          id: uuid(),
          bidsCount: 0,
          jobsCount: 0,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          customers: [...state.customers, customer],
          recentlyAddedId: customer.id,
        }))
        // Clear the UI signal after the flash window so the row
        // stops glowing and future adds can re-trigger it.
        setTimeout(() => {
          if (get().recentlyAddedId === customer.id) {
            set({ recentlyAddedId: null })
          }
        }, FLASH_WINDOW_MS)
        return customer
      },

      updateCustomer: (id, patch) => {
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id
              ? { ...c, ...patch, updatedAt: new Date().toISOString() }
              : c,
          ),
        }))
      },

      deleteCustomer: (id) => {
        const state = get()
        const originalIndex = state.customers.findIndex((c) => c.id === id)
        if (originalIndex === -1) return

        const customer = state.customers[originalIndex]

        // If somehow already pending, clear the prior timer first.
        const existing = state.pendingDeletes[id]
        if (existing) clearTimeout(existing.timerId)

        const timerId = setTimeout(() => {
          get().finalizeDelete(id)
        }, UNDO_WINDOW_MS)

        set((prev) => ({
          customers: prev.customers.filter((c) => c.id !== id),
          pendingDeletes: {
            ...prev.pendingDeletes,
            [id]: { customer, originalIndex, timerId },
          },
        }))
      },

      undoDelete: (id) => {
        const pending = get().pendingDeletes[id]
        if (!pending) return
        clearTimeout(pending.timerId)

        set((prev) => {
          // Splice back into the original slot, clamped to current length.
          const next = [...prev.customers]
          const insertAt = Math.min(pending.originalIndex, next.length)
          next.splice(insertAt, 0, pending.customer)

          const { [id]: _removed, ...rest } = prev.pendingDeletes
          return { customers: next, pendingDeletes: rest }
        })
      },

      finalizeDelete: (id) => {
        set((prev) => {
          if (!prev.pendingDeletes[id]) return prev
          const { [id]: _removed, ...rest } = prev.pendingDeletes
          return { pendingDeletes: rest }
        })
      },
    }),
    {
      name: PERSIST_KEY,
      // Only persist customers — pending deletes and their timers are in-memory only.
      partialize: (state) => ({ customers: state.customers }),
    },
  ),
)
