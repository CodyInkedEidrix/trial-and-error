// ──────────────────────────────────────────────────────────────────────
// proposalFormStore — UI state for the slide-in add/edit proposal panel.
//
// Mirrors jobFormStore. Separate from proposalStore so the data layer
// stays pure and the panel opens from anywhere: the Proposals primary
// tab, a customer detail view's "Add proposal" action, a future agent
// tool call, the command palette.
//
// `defaultCustomerId` / `defaultJobId` let callers pre-select relations
// in the add form — used when opening the form from inside a customer
// or job detail view.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import type { Proposal } from '../types/proposal'

export type ProposalFormMode = 'add' | 'edit'

interface OpenAddOptions {
  defaultCustomerId?: string
  defaultJobId?: string
}

interface ProposalFormStore {
  open: boolean
  mode: ProposalFormMode
  proposal: Proposal | null
  defaultCustomerId: string | null
  defaultJobId: string | null

  openAdd: (options?: OpenAddOptions) => void
  openEdit: (proposal: Proposal) => void
  close: () => void
}

export const useProposalFormStore = create<ProposalFormStore>((set) => ({
  open: false,
  mode: 'add',
  proposal: null,
  defaultCustomerId: null,
  defaultJobId: null,

  openAdd: (options) =>
    set({
      open: true,
      mode: 'add',
      proposal: null,
      defaultCustomerId: options?.defaultCustomerId ?? null,
      defaultJobId: options?.defaultJobId ?? null,
    }),
  openEdit: (proposal) =>
    set({
      open: true,
      mode: 'edit',
      proposal,
      defaultCustomerId: null,
      defaultJobId: null,
    }),
  close: () => set({ open: false }),
}))
