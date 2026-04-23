// ──────────────────────────────────────────────────────────────────────
// proposalStore — tenant-scoped Proposal CRUD backed by Supabase.
//
// Third rep of the exact pattern established by customerStore and
// jobStore. Same async/optimistic flow, same snake↔camel mapping at the
// boundary, same 5-second undo-delete window, same module-level
// authStore subscription for auto-load on sign-in / clear on sign-out.
//
// If this file looks like a slightly-renamed copy of jobStore, that's
// the point: the entity template repeats cleanly, so real Eidrix's
// Invoice, LineItem, Timesheet, etc. are N more copies of the same
// shape — not N hand-written integrations.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import type { Proposal, ProposalInput, ProposalStatus } from '../types/proposal'
import type { Database } from '../types/database.types'
import { supabase } from './supabase'
import { useAuthStore } from './useAuth'
import { useToastStore } from './toastStore'

const UNDO_WINDOW_MS = 5000
const FLASH_WINDOW_MS = 900

type DbProposalRow = Database['public']['Tables']['proposals']['Row']
type DbProposalInsert = Database['public']['Tables']['proposals']['Insert']
type DbProposalUpdate = Database['public']['Tables']['proposals']['Update']

interface PendingDelete {
  proposal: Proposal
  originalIndex: number
  timerId: ReturnType<typeof setTimeout>
}

export interface ProposalStore {
  proposals: Proposal[]
  pendingDeletes: Record<string, PendingDelete>
  recentlyAddedId: string | null
  isLoading: boolean
  loadError: string | null

  loadProposals: () => Promise<void>
  addProposal: (input: ProposalInput) => Promise<Proposal | null>
  updateProposal: (id: string, patch: Partial<ProposalInput>) => Promise<void>
  deleteProposal: (id: string) => void
  undoDelete: (id: string) => void
  finalizeDelete: (id: string) => Promise<void>
  clearLocalState: () => void
}

// ─── DB ↔ App mapping ────────────────────────────────────────────────

/** Postgres `numeric` comes back as number or string from PG depending
 *  on the column shape; coerce defensively so future driver changes
 *  don't bite. amount is NOT NULL in the schema, but PG may still send
 *  it as a string for large values. */
function coerceAmount(raw: unknown): number {
  if (raw === null || raw === undefined) return 0
  if (typeof raw === 'string') return Number(raw)
  if (typeof raw === 'number') return raw
  return 0
}

function dbRowToProposal(row: DbProposalRow): Proposal {
  return {
    id: row.id,
    customerId: row.customer_id,
    jobId: row.job_id ?? undefined,
    title: row.title,
    amount: coerceAmount(row.amount),
    status: row.status as ProposalStatus,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function proposalInputToDbInsert(
  input: ProposalInput,
  organizationId: string,
): DbProposalInsert {
  return {
    organization_id: organizationId,
    customer_id: input.customerId,
    job_id: input.jobId || null,
    title: input.title,
    amount: input.amount,
    status: input.status,
    notes: input.notes || null,
  }
}

function patchToDbUpdate(patch: Partial<ProposalInput>): DbProposalUpdate {
  const update: DbProposalUpdate = {}
  if (patch.customerId !== undefined) update.customer_id = patch.customerId
  if (patch.jobId !== undefined) update.job_id = patch.jobId || null
  if (patch.title !== undefined) update.title = patch.title
  if (patch.amount !== undefined) update.amount = patch.amount
  if (patch.status !== undefined) update.status = patch.status
  if (patch.notes !== undefined) update.notes = patch.notes || null
  return update
}

// ─── Toast helper ────────────────────────────────────────────────────

function toastError(title: string) {
  useToastStore.getState().push({ title, variant: 'danger', duration: 4000 })
}

// ─── Store ────────────────────────────────────────────────────────────

export const useProposalStore = create<ProposalStore>((set, get) => ({
  proposals: [],
  pendingDeletes: {},
  recentlyAddedId: null,
  isLoading: false,
  loadError: null,

  loadProposals: async () => {
    const activeOrg = useAuthStore.getState().activeOrg
    if (!activeOrg) {
      set({ proposals: [], isLoading: false, loadError: null })
      return
    }

    set({ isLoading: true, loadError: null })

    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[proposalStore] loadProposals failed:', error)
      set({
        loadError: error.message || 'Failed to load proposals',
        isLoading: false,
      })
      return
    }

    set({ proposals: (data ?? []).map(dbRowToProposal), isLoading: false, loadError: null })
  },

  addProposal: async (input) => {
    const activeOrg = useAuthStore.getState().activeOrg
    if (!activeOrg) {
      console.error('[proposalStore] addProposal with no active org')
      toastError("Can't add proposal: no active workspace.")
      return null
    }

    const { data, error } = await supabase
      .from('proposals')
      .insert(proposalInputToDbInsert(input, activeOrg.id))
      .select()
      .single()

    if (error || !data) {
      console.error('[proposalStore] addProposal failed:', error)
      toastError(
        `Couldn't add ${input.title}. ${error?.message ?? ''}`.trim(),
      )
      return null
    }

    const proposal = dbRowToProposal(data)

    set((state) => ({
      proposals: [...state.proposals, proposal],
      recentlyAddedId: proposal.id,
    }))

    setTimeout(() => {
      if (get().recentlyAddedId === proposal.id) {
        set({ recentlyAddedId: null })
      }
    }, FLASH_WINDOW_MS)

    return proposal
  },

  updateProposal: async (id, patch) => {
    const previousProposal = get().proposals.find((p) => p.id === id)
    if (!previousProposal) return

    set((state) => ({
      proposals: state.proposals.map((p) =>
        p.id === id
          ? { ...p, ...patch, updatedAt: new Date().toISOString() }
          : p,
      ),
    }))

    const { data, error } = await supabase
      .from('proposals')
      .update(patchToDbUpdate(patch))
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('[proposalStore] updateProposal failed:', error)
      toastError(`Couldn't save ${previousProposal.title}. Reverted.`)
      set((state) => ({
        proposals: state.proposals.map((p) =>
          p.id === id ? previousProposal : p,
        ),
      }))
      return
    }

    const reconciled = dbRowToProposal(data)
    set((state) => ({
      proposals: state.proposals.map((p) => (p.id === id ? reconciled : p)),
    }))
  },

  deleteProposal: (id) => {
    const state = get()
    const originalIndex = state.proposals.findIndex((p) => p.id === id)
    if (originalIndex === -1) return

    const proposal = state.proposals[originalIndex]

    const existing = state.pendingDeletes[id]
    if (existing) clearTimeout(existing.timerId)

    const timerId = setTimeout(() => {
      void get().finalizeDelete(id)
    }, UNDO_WINDOW_MS)

    set((prev) => ({
      proposals: prev.proposals.filter((p) => p.id !== id),
      pendingDeletes: {
        ...prev.pendingDeletes,
        [id]: { proposal, originalIndex, timerId },
      },
    }))
  },

  undoDelete: (id) => {
    const pending = get().pendingDeletes[id]
    if (!pending) return
    clearTimeout(pending.timerId)

    set((prev) => {
      const next = [...prev.proposals]
      const insertAt = Math.min(pending.originalIndex, next.length)
      next.splice(insertAt, 0, pending.proposal)
      const { [id]: _removed, ...rest } = prev.pendingDeletes
      return { proposals: next, pendingDeletes: rest }
    })
  },

  finalizeDelete: async (id) => {
    const pending = get().pendingDeletes[id]
    if (!pending) return

    set((prev) => {
      const { [id]: _removed, ...rest } = prev.pendingDeletes
      return { pendingDeletes: rest }
    })

    const { error } = await supabase.from('proposals').delete().eq('id', id)

    if (error) {
      console.error('[proposalStore] finalizeDelete failed:', error)
      toastError(
        `${pending.proposal.title} couldn't be deleted on the server.`,
      )
    }
  },

  clearLocalState: () => {
    const { pendingDeletes } = get()
    Object.values(pendingDeletes).forEach((p) => clearTimeout(p.timerId))

    set({
      proposals: [],
      pendingDeletes: {},
      recentlyAddedId: null,
      isLoading: false,
      loadError: null,
    })
  },
}))

// ─── Auth subscription ───────────────────────────────────────────────
// Module-level, same pattern as customerStore / jobStore: auto-load
// on activeOrg change, clear on sign-out. StrictMode-safe because
// the subscription lives outside React lifecycle.

useAuthStore.subscribe((state, prevState) => {
  const prevId = prevState.activeOrg?.id ?? null
  const nextId = state.activeOrg?.id ?? null

  if (prevId === nextId) return

  if (nextId === null) {
    useProposalStore.getState().clearLocalState()
  } else {
    void useProposalStore.getState().loadProposals()
  }
})

// Defensive initial load if activeOrg was already set at module load.
if (useAuthStore.getState().activeOrg) {
  void useProposalStore.getState().loadProposals()
}
