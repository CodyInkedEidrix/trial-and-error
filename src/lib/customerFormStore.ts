// ──────────────────────────────────────────────────────────────────────
// Customer form-panel store — UI state for the slide-in add/edit panel.
//
// Separate from customerStore so the data layer stays pure and the
// panel can be opened from anywhere: the Records tab, the command
// palette, a future agent tool call.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import type { Customer } from '../types/customer'

export type FormMode = 'add' | 'edit'

interface CustomerFormStore {
  open: boolean
  mode: FormMode
  customer: Customer | null

  openAdd: () => void
  openEdit: (customer: Customer) => void
  close: () => void
}

export const useCustomerFormStore = create<CustomerFormStore>((set) => ({
  open: false,
  mode: 'add',
  customer: null,

  openAdd: () => set({ open: true, mode: 'add', customer: null }),
  openEdit: (customer) => set({ open: true, mode: 'edit', customer }),
  close: () => set({ open: false }),
}))
