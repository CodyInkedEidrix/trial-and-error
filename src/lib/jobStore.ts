// ──────────────────────────────────────────────────────────────────────
// jobStore — tenant-scoped Job CRUD backed by Supabase.
//
// Mirrors customerStore.ts exactly — same async/optimistic patterns,
// same snake↔camel mapping at the boundary, same module-level
// subscription to authStore for auto-load on sign-in / clear on sign-out.
// One pattern, two entities — the rehearsal for real Eidrix's larger
// entity tree (Customer → Job → Invoice → LineItem → ...).
//
// Surface preserved across the localStorage→Supabase swap is irrelevant
// here (Jobs is brand new), but the SAME shape as customerStore lets
// the BusinessConfig engine consume it without per-entity adapters.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import type { Job, JobInput, JobStatus } from '../types/job'
import type { Database } from '../types/database.types'
import { supabase } from './supabase'
import { useAuthStore } from './useAuth'
import { useToastStore } from './toastStore'

const UNDO_WINDOW_MS = 5000
const FLASH_WINDOW_MS = 900

type DbJobRow = Database['public']['Tables']['jobs']['Row']
type DbJobInsert = Database['public']['Tables']['jobs']['Insert']
type DbJobUpdate = Database['public']['Tables']['jobs']['Update']

interface PendingDelete {
  job: Job
  originalIndex: number
  timerId: ReturnType<typeof setTimeout>
}

export interface JobStore {
  jobs: Job[]
  pendingDeletes: Record<string, PendingDelete>
  recentlyAddedId: string | null
  isLoading: boolean
  loadError: string | null

  loadJobs: () => Promise<void>
  addJob: (input: JobInput) => Promise<Job | null>
  updateJob: (id: string, patch: Partial<JobInput>) => Promise<void>
  deleteJob: (id: string) => void
  undoDelete: (id: string) => void
  finalizeDelete: (id: string) => Promise<void>
  clearLocalState: () => void
}

// ─── DB ↔ App mapping ────────────────────────────────────────────────

function dbRowToJob(row: DbJobRow): Job {
  return {
    id: row.id,
    customerId: row.customer_id,
    title: row.title,
    status: row.status as JobStatus,
    scheduledDate: row.scheduled_date ?? undefined,
    // Postgres `numeric` comes back as either number or string from PG;
    // supabase-js currently returns number for our column shape, but
    // coerce defensively so future driver changes don't bite.
    amount:
      row.amount === null || row.amount === undefined
        ? undefined
        : typeof row.amount === 'string'
          ? Number(row.amount)
          : row.amount,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function jobInputToDbInsert(
  input: JobInput,
  organizationId: string,
): DbJobInsert {
  return {
    organization_id: organizationId,
    customer_id: input.customerId,
    title: input.title,
    status: input.status,
    scheduled_date: input.scheduledDate || null,
    amount: input.amount ?? null,
    notes: input.notes || null,
  }
}

function patchToDbUpdate(patch: Partial<JobInput>): DbJobUpdate {
  const update: DbJobUpdate = {}
  if (patch.customerId !== undefined) update.customer_id = patch.customerId
  if (patch.title !== undefined) update.title = patch.title
  if (patch.status !== undefined) update.status = patch.status
  if (patch.scheduledDate !== undefined) {
    update.scheduled_date = patch.scheduledDate || null
  }
  if (patch.amount !== undefined) {
    update.amount = patch.amount ?? null
  }
  if (patch.notes !== undefined) update.notes = patch.notes || null
  return update
}

// ─── Toast helper ────────────────────────────────────────────────────

function toastError(title: string) {
  useToastStore.getState().push({ title, variant: 'danger', duration: 4000 })
}

// ─── Store ────────────────────────────────────────────────────────────

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: [],
  pendingDeletes: {},
  recentlyAddedId: null,
  isLoading: false,
  loadError: null,

  loadJobs: async () => {
    const activeOrg = useAuthStore.getState().activeOrg
    if (!activeOrg) {
      set({ jobs: [], isLoading: false, loadError: null })
      return
    }

    set({ isLoading: true, loadError: null })

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[jobStore] loadJobs failed:', error)
      set({
        loadError: error.message || 'Failed to load jobs',
        isLoading: false,
      })
      return
    }

    set({ jobs: (data ?? []).map(dbRowToJob), isLoading: false, loadError: null })
  },

  addJob: async (input) => {
    const activeOrg = useAuthStore.getState().activeOrg
    if (!activeOrg) {
      console.error('[jobStore] addJob with no active org')
      toastError("Can't add job: no active workspace.")
      return null
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert(jobInputToDbInsert(input, activeOrg.id))
      .select()
      .single()

    if (error || !data) {
      console.error('[jobStore] addJob failed:', error)
      toastError(`Couldn't add ${input.title}. ${error?.message ?? ''}`.trim())
      return null
    }

    const job = dbRowToJob(data)

    set((state) => ({
      jobs: [...state.jobs, job],
      recentlyAddedId: job.id,
    }))

    setTimeout(() => {
      if (get().recentlyAddedId === job.id) {
        set({ recentlyAddedId: null })
      }
    }, FLASH_WINDOW_MS)

    return job
  },

  updateJob: async (id, patch) => {
    const previousJob = get().jobs.find((j) => j.id === id)
    if (!previousJob) return

    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id
          ? { ...j, ...patch, updatedAt: new Date().toISOString() }
          : j,
      ),
    }))

    const { data, error } = await supabase
      .from('jobs')
      .update(patchToDbUpdate(patch))
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('[jobStore] updateJob failed:', error)
      toastError(`Couldn't save ${previousJob.title}. Reverted.`)
      set((state) => ({
        jobs: state.jobs.map((j) => (j.id === id ? previousJob : j)),
      }))
      return
    }

    const reconciled = dbRowToJob(data)
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? reconciled : j)),
    }))
  },

  deleteJob: (id) => {
    const state = get()
    const originalIndex = state.jobs.findIndex((j) => j.id === id)
    if (originalIndex === -1) return

    const job = state.jobs[originalIndex]

    const existing = state.pendingDeletes[id]
    if (existing) clearTimeout(existing.timerId)

    const timerId = setTimeout(() => {
      void get().finalizeDelete(id)
    }, UNDO_WINDOW_MS)

    set((prev) => ({
      jobs: prev.jobs.filter((j) => j.id !== id),
      pendingDeletes: {
        ...prev.pendingDeletes,
        [id]: { job, originalIndex, timerId },
      },
    }))
  },

  undoDelete: (id) => {
    const pending = get().pendingDeletes[id]
    if (!pending) return
    clearTimeout(pending.timerId)

    set((prev) => {
      const next = [...prev.jobs]
      const insertAt = Math.min(pending.originalIndex, next.length)
      next.splice(insertAt, 0, pending.job)
      const { [id]: _removed, ...rest } = prev.pendingDeletes
      return { jobs: next, pendingDeletes: rest }
    })
  },

  finalizeDelete: async (id) => {
    const pending = get().pendingDeletes[id]
    if (!pending) return

    set((prev) => {
      const { [id]: _removed, ...rest } = prev.pendingDeletes
      return { pendingDeletes: rest }
    })

    const { error } = await supabase.from('jobs').delete().eq('id', id)

    if (error) {
      console.error('[jobStore] finalizeDelete failed:', error)
      toastError(`${pending.job.title} couldn't be deleted on the server.`)
    }
  },

  clearLocalState: () => {
    const { pendingDeletes } = get()
    Object.values(pendingDeletes).forEach((p) => clearTimeout(p.timerId))

    set({
      jobs: [],
      pendingDeletes: {},
      recentlyAddedId: null,
      isLoading: false,
      loadError: null,
    })
  },
}))

// ─── Auth subscription ───────────────────────────────────────────────
// Auto-load on activeOrg change, clear on sign-out — same pattern as
// customerStore. Module-level for the same reasons (StrictMode-safe,
// fires before any consuming component mounts).

useAuthStore.subscribe((state, prevState) => {
  const prevId = prevState.activeOrg?.id ?? null
  const nextId = state.activeOrg?.id ?? null

  if (prevId === nextId) return

  if (nextId === null) {
    useJobStore.getState().clearLocalState()
  } else {
    void useJobStore.getState().loadJobs()
  }
})

// If activeOrg is already set when this module loads, kick off an
// initial load. Same defensive pattern as customerStore.
if (useAuthStore.getState().activeOrg) {
  void useJobStore.getState().loadJobs()
}
