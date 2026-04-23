// ──────────────────────────────────────────────────────────────────────
// customerStore — tenant-scoped customer CRUD backed by Supabase.
//
// Post-Chapter-14: localStorage is gone. Source of truth is the
// `customers` Postgres table, scoped by RLS to the user's active org.
//
// External API preserved from Chapter 10's localStorage version so
// consumers (CustomerForm, CustomerOverviewSection, contractor.tsx,
// RecordListView) require no changes:
//
//   addCustomer / updateCustomer / finalizeDelete  → now async (still
//     fire-and-forget at call sites; errors surface via toast)
//   deleteCustomer / undoDelete                    → still synchronous;
//     they only manipulate optimistic UI state, the DB delete happens
//     inside finalizeDelete after the 5s undo window expires
//
// Optimistic-UI choices:
//   - addCustomer waits for the DB insert before showing the row,
//     because we need the server-generated id + timestamps. Form
//     toasts the success optimistically; if insert fails we toast
//     an error.
//   - updateCustomer applies optimistically, rolls back on DB error.
//   - deleteCustomer is purely local until the timer fires; the row
//     never disappears from the DB unless finalizeDelete succeeds.
//
// Auth integration is module-level (see bottom of file): when the
// user's activeOrg becomes available we auto-load that org's
// customers; on sign-out we wipe local state.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import type { Customer, CustomerInput, CustomerStatus } from '../types/customer'
import type { Database } from '../types/database.types'
import { supabase } from './supabase'
import { useAuthStore } from './useAuth'
import { useToastStore } from './toastStore'

const UNDO_WINDOW_MS = 5000
const FLASH_WINDOW_MS = 900

type DbCustomerRow = Database['public']['Tables']['customers']['Row']
type DbCustomerInsert = Database['public']['Tables']['customers']['Insert']
type DbCustomerUpdate = Database['public']['Tables']['customers']['Update']

interface PendingDelete {
  customer: Customer
  originalIndex: number
  timerId: ReturnType<typeof setTimeout>
}

export interface CustomerStore {
  customers: Customer[]
  pendingDeletes: Record<string, PendingDelete>

  /** UI signal — last customer added; auto-clears after FLASH_WINDOW_MS. */
  recentlyAddedId: string | null

  /** True during the initial fetch after sign-in. */
  isLoading: boolean

  /** First-fetch error message; drives the "can't reach database" UI. */
  loadError: string | null

  /** Fetch all customers for the current org. Called automatically on sign-in. */
  loadCustomers: () => Promise<void>

  /** Inserts a new customer. Returns the row on success, null on failure. */
  addCustomer: (input: CustomerInput) => Promise<Customer | null>

  /** Patch in place; optimistic with rollback on DB error. */
  updateCustomer: (id: string, patch: Partial<CustomerInput>) => Promise<void>

  /** Optimistic local removal + start 5s undo timer. */
  deleteCustomer: (id: string) => void

  /** Cancel timer + splice back into the original slot. */
  undoDelete: (id: string) => void

  /** Timer-fired DB delete. Also exposed so onDismiss can call it. */
  finalizeDelete: (id: string) => Promise<void>

  /** Wipe everything — called on sign-out. */
  clearLocalState: () => void
}

// ─── Snake_case (DB) ↔ camelCase (app) mapping ───────────────────────
// One place to change if the DB schema or Customer type evolves.

function dbRowToCustomer(row: DbCustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    company: row.company ?? undefined,
    status: row.status as CustomerStatus,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    notes: row.notes ?? undefined,
    bidsCount: row.bids_count,
    jobsCount: row.jobs_count,
    lastActivityAt: row.last_activity_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function customerInputToDbInsert(
  input: CustomerInput,
  organizationId: string,
): DbCustomerInsert {
  return {
    organization_id: organizationId,
    name: input.name,
    company: input.company || null,
    status: input.status,
    email: input.email || null,
    phone: input.phone || null,
    address: input.address || null,
    notes: input.notes || null,
    last_activity_at: input.lastActivityAt || null,
  }
}

function patchToDbUpdate(patch: Partial<CustomerInput>): DbCustomerUpdate {
  const update: DbCustomerUpdate = {}
  if (patch.name !== undefined) update.name = patch.name
  if (patch.company !== undefined) update.company = patch.company || null
  if (patch.status !== undefined) update.status = patch.status
  if (patch.email !== undefined) update.email = patch.email || null
  if (patch.phone !== undefined) update.phone = patch.phone || null
  if (patch.address !== undefined) update.address = patch.address || null
  if (patch.notes !== undefined) update.notes = patch.notes || null
  if (patch.lastActivityAt !== undefined) {
    update.last_activity_at = patch.lastActivityAt || null
  }
  return update
}

// ─── Toast helpers ───────────────────────────────────────────────────
// Calling toast from non-React code (Zustand actions). We import the
// underlying store directly rather than the useToast hook.

function toastError(title: string) {
  useToastStore.getState().push({ title, variant: 'danger', duration: 4000 })
}

// ─── Store ────────────────────────────────────────────────────────────

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customers: [],
  pendingDeletes: {},
  recentlyAddedId: null,
  isLoading: false,
  loadError: null,

  loadCustomers: async () => {
    const activeOrg = useAuthStore.getState().activeOrg
    if (!activeOrg) {
      set({ customers: [], isLoading: false, loadError: null })
      return
    }

    set({ isLoading: true, loadError: null })

    // RLS enforces organization_id = activeOrg server-side — no need
    // for an explicit .eq('organization_id', activeOrg.id) here.
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[customerStore] loadCustomers failed:', error)
      set({
        loadError: error.message || 'Failed to load customers',
        isLoading: false,
      })
      return
    }

    const customers = (data ?? []).map(dbRowToCustomer)
    set({ customers, isLoading: false, loadError: null })
  },

  addCustomer: async (input) => {
    const activeOrg = useAuthStore.getState().activeOrg
    if (!activeOrg) {
      console.error('[customerStore] addCustomer with no active org')
      toastError("Can't add customer: no active workspace.")
      return null
    }

    const { data, error } = await supabase
      .from('customers')
      .insert(customerInputToDbInsert(input, activeOrg.id))
      .select()
      .single()

    if (error || !data) {
      console.error('[customerStore] addCustomer failed:', error)
      toastError(`Couldn't add ${input.name}. ${error?.message ?? ''}`.trim())
      return null
    }

    const customer = dbRowToCustomer(data)

    set((state) => ({
      customers: [...state.customers, customer],
      recentlyAddedId: customer.id,
    }))

    setTimeout(() => {
      if (get().recentlyAddedId === customer.id) {
        set({ recentlyAddedId: null })
      }
    }, FLASH_WINDOW_MS)

    return customer
  },

  updateCustomer: async (id, patch) => {
    // Optimistic update so edits feel instant. We snapshot the prior
    // row in case we need to roll back on DB error.
    const previousCustomer = get().customers.find((c) => c.id === id)
    if (!previousCustomer) return

    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === id
          ? { ...c, ...patch, updatedAt: new Date().toISOString() }
          : c,
      ),
    }))

    const { data, error } = await supabase
      .from('customers')
      .update(patchToDbUpdate(patch))
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('[customerStore] updateCustomer failed:', error)
      toastError(`Couldn't save ${previousCustomer.name}. Reverted.`)
      // Roll back to the snapshot.
      set((state) => ({
        customers: state.customers.map((c) =>
          c.id === id ? previousCustomer : c,
        ),
      }))
      return
    }

    // Reconcile with the canonical DB row (gets server-set updated_at,
    // any column normalization, etc.).
    const reconciled = dbRowToCustomer(data)
    set((state) => ({
      customers: state.customers.map((c) => (c.id === id ? reconciled : c)),
    }))
  },

  deleteCustomer: (id) => {
    // Pure local-state move. The DB delete fires in finalizeDelete
    // after the 5s undo window expires.
    const state = get()
    const originalIndex = state.customers.findIndex((c) => c.id === id)
    if (originalIndex === -1) return

    const customer = state.customers[originalIndex]

    const existing = state.pendingDeletes[id]
    if (existing) clearTimeout(existing.timerId)

    const timerId = setTimeout(() => {
      void get().finalizeDelete(id)
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
      const next = [...prev.customers]
      const insertAt = Math.min(pending.originalIndex, next.length)
      next.splice(insertAt, 0, pending.customer)
      const { [id]: _removed, ...rest } = prev.pendingDeletes
      return { customers: next, pendingDeletes: rest }
    })
  },

  finalizeDelete: async (id) => {
    const pending = get().pendingDeletes[id]
    if (!pending) return

    // Remove the bookkeeping entry regardless of DB outcome — the row
    // already left the visible list when deleteCustomer ran.
    set((prev) => {
      const { [id]: _removed, ...rest } = prev.pendingDeletes
      return { pendingDeletes: rest }
    })

    const { error } = await supabase.from('customers').delete().eq('id', id)

    if (error) {
      console.error('[customerStore] finalizeDelete failed:', error)
      toastError(`${pending.customer.name} couldn't be deleted on the server.`)
      // The row is gone from view, but it still exists in the DB. The
      // next loadCustomers() will reveal that mismatch — could heal
      // here by re-inserting locally, but better to let the user see
      // a clean state and reload deliberately. Real Eidrix may want
      // to re-add the row optimistically and prompt for retry.
    }
  },

  clearLocalState: () => {
    // Cancel any in-flight delete timers so they don't fire after the
    // user has signed out and trigger DB calls without a session.
    const { pendingDeletes } = get()
    Object.values(pendingDeletes).forEach((p) => clearTimeout(p.timerId))

    set({
      customers: [],
      pendingDeletes: {},
      recentlyAddedId: null,
      isLoading: false,
      loadError: null,
    })
  },
}))

// ─── Auth subscription ───────────────────────────────────────────────
// Module-level: react to changes in the user's active org.
//   activeOrg null → real org    : sign-in or org switch — load customers
//   activeOrg real → null        : sign-out — clear local state
//   activeOrg stays the same      : no-op
//
// Subscribed at module load so the wiring exists before any component
// using customerStore mounts.

useAuthStore.subscribe((state, prevState) => {
  const prevId = prevState.activeOrg?.id ?? null
  const nextId = state.activeOrg?.id ?? null

  if (prevId === nextId) return

  if (nextId === null) {
    useCustomerStore.getState().clearLocalState()
  } else {
    void useCustomerStore.getState().loadCustomers()
  }
})

// If activeOrg is ALREADY set when this module loads (e.g., user was
// signed in when Records tab first opened), the subscribe above won't
// fire because it only triggers on changes. Kick off an initial load
// so the Records list isn't blank-but-pretending-to-be-loaded.
if (useAuthStore.getState().activeOrg) {
  void useCustomerStore.getState().loadCustomers()
}
