// ──────────────────────────────────────────────────────────────────────
// jobFormStore — UI state for the slide-in add/edit job panel.
//
// Mirrors customerFormStore's shape exactly. Separate from jobStore so
// the data layer stays pure and the panel can open from anywhere: the
// Jobs primary tab, the command palette, a future agent tool call.
//
// `defaultCustomerId` lets opening the panel pre-select a customer —
// useful when adding a job from inside a customer's detail view.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import type { Job } from '../types/job'

export type JobFormMode = 'add' | 'edit'

interface JobFormStore {
  open: boolean
  mode: JobFormMode
  job: Job | null
  /** When set, the add form pre-selects this customer in the dropdown. */
  defaultCustomerId: string | null

  openAdd: (defaultCustomerId?: string) => void
  openEdit: (job: Job) => void
  close: () => void
}

export const useJobFormStore = create<JobFormStore>((set) => ({
  open: false,
  mode: 'add',
  job: null,
  defaultCustomerId: null,

  openAdd: (defaultCustomerId) =>
    set({
      open: true,
      mode: 'add',
      job: null,
      defaultCustomerId: defaultCustomerId ?? null,
    }),
  openEdit: (job) =>
    set({ open: true, mode: 'edit', job, defaultCustomerId: null }),
  close: () => set({ open: false }),
}))
