// ──────────────────────────────────────────────────────────────────────
// ProposalForm — slide-in panel for adding and editing proposals.
//
// Mirrors JobForm's shape and behavior — same panel chrome, same
// submit-first / live-after-first-attempt validation, same Field +
// inputClasses reuse from CustomerForm for visual consistency.
//
// Differences from JobForm:
//   - Customer select (required, mirrors JobForm)
//   - Job select (OPTIONAL — a proposal may or may not be tied to a job)
//   - Amount is required, not optional (defaulting to 0 if empty)
//   - Four statuses instead of five
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import type {
  Proposal,
  ProposalInput,
  ProposalStatus,
} from '../../types/proposal'
import { useProposalFormStore } from '../../lib/proposalFormStore'
import { useProposalStore } from '../../lib/proposalStore'
import { useCustomerStore } from '../../lib/customerStore'
import { useJobStore } from '../../lib/jobStore'
import { useToast } from '../../hooks/useToast'
import { Field, inputClasses } from './CustomerForm'
import Button from '../ui/Button'

// ──────────────────────────────────────────────────────────────────────
// Types & defaults
// ──────────────────────────────────────────────────────────────────────

interface FormValues {
  customerId: string
  jobId: string
  title: string
  amount: string // string in form, parsed to number on submit
  status: ProposalStatus
  notes: string
}

const STATUS_OPTIONS: { value: ProposalStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const emptyValues: FormValues = {
  customerId: '',
  jobId: '',
  title: '',
  amount: '',
  status: 'draft',
  notes: '',
}

function proposalToValues(p: Proposal): FormValues {
  return {
    customerId: p.customerId,
    jobId: p.jobId ?? '',
    title: p.title,
    amount: String(p.amount),
    status: p.status,
    notes: p.notes ?? '',
  }
}

function valuesToInput(v: FormValues): ProposalInput {
  const trim = (s: string) => (s.trim() === '' ? undefined : s.trim())
  const parsedAmount =
    v.amount.trim() === '' ? 0 : Number(v.amount)
  return {
    customerId: v.customerId,
    jobId: v.jobId || undefined,
    title: v.title.trim(),
    amount: Number.isNaN(parsedAmount) ? 0 : parsedAmount,
    status: v.status,
    notes: trim(v.notes),
  }
}

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────

export default function ProposalForm() {
  const {
    open,
    mode,
    proposal,
    defaultCustomerId,
    defaultJobId,
    close,
  } = useProposalFormStore()
  const addProposal = useProposalStore((s) => s.addProposal)
  const updateProposal = useProposalStore((s) => s.updateProposal)
  const customers = useCustomerStore((s) => s.customers)
  const jobs = useJobStore((s) => s.jobs)
  const toast = useToast()

  const [values, setValues] = useState<FormValues>(emptyValues)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [customerError, setCustomerError] = useState<string | null>(null)

  const titleInputRef = useRef<HTMLInputElement>(null)

  // Jobs dropdown: only show jobs belonging to the selected customer.
  // If no customer selected yet, show all jobs (edge case; usually the
  // user picks a customer first).
  const jobsForCustomer = useMemo(() => {
    if (!values.customerId) return jobs
    return jobs.filter((j) => j.customerId === values.customerId)
  }, [jobs, values.customerId])

  // ──── Reset form whenever the panel opens ────
  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && proposal) {
      setValues(proposalToValues(proposal))
    } else {
      setValues({
        ...emptyValues,
        customerId: defaultCustomerId ?? '',
        jobId: defaultJobId ?? '',
      })
    }
    setHasSubmitted(false)
    setTitleError(null)
    setCustomerError(null)

    if (mode === 'add') {
      requestAnimationFrame(() => titleInputRef.current?.focus())
    }
  }, [open, mode, proposal, defaultCustomerId, defaultJobId])

  // Escape closes.
  useEffect(() => {
    if (!open) return
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        close()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, close])

  function handleChange<K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) {
    setValues((prev) => {
      const next = { ...prev, [key]: value }
      // Customer change clears an incompatible job selection.
      if (key === 'customerId') {
        const stillValid = jobs.some(
          (j) => j.id === prev.jobId && j.customerId === (value as string),
        )
        if (!stillValid) next.jobId = ''
      }
      return next
    })
    if (hasSubmitted) {
      if (key === 'title' && (value as string).trim() !== '') {
        setTitleError(null)
      }
      if (key === 'customerId' && (value as string) !== '') {
        setCustomerError(null)
      }
    }
  }

  function submitForm() {
    setHasSubmitted(true)

    let invalid = false
    if (values.title.trim() === '') {
      setTitleError('Title is required')
      invalid = true
    }
    if (values.customerId === '') {
      setCustomerError('Pick a customer')
      invalid = true
    }
    if (invalid) {
      titleInputRef.current?.focus()
      return
    }

    const input = valuesToInput(values)
    if (mode === 'add') {
      void addProposal(input)
      toast.push({
        title: `${input.title} added`,
        variant: 'success',
        duration: 2500,
      })
    } else if (proposal) {
      void updateProposal(proposal.id, input)
      toast.push({
        title: `${input.title} saved`,
        variant: 'success',
        duration: 2000,
      })
    }
    close()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      submitForm()
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submitForm()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop scoped to tabs region — chat column stays sovereign. */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
            className="fixed inset-y-0 right-0 left-[380px] bg-obsidian-950/40 backdrop-blur-[2px] z-30"
          />

          <motion.div
            key="panel"
            role="dialog"
            aria-label={
              mode === 'add' ? 'Add proposal' : `Edit ${proposal?.title}`
            }
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 36 }}
            className="fixed top-0 right-0 bottom-0 w-[460px] bg-obsidian-900 border-l border-obsidian-800 shadow-2xl z-40 flex flex-col"
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-obsidian-800">
              <h2 className="font-display text-lg text-text-primary">
                {mode === 'add' ? 'Add Proposal' : 'Edit Proposal'}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-text-tertiary hover:text-text-primary text-2xl leading-none px-2"
              >
                ×
              </button>
            </header>

            <form
              onSubmit={handleSubmit}
              onKeyDown={handleKeyDown}
              className="flex-1 overflow-y-auto eidrix-scrollbar px-5 py-5 space-y-4"
            >
              <Field
                label="Customer"
                required
                error={customerError ?? undefined}
              >
                <select
                  value={values.customerId}
                  onChange={(e) => handleChange('customerId', e.target.value)}
                  className={inputClasses(Boolean(customerError))}
                >
                  <option value="">— Select a customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` · ${c.company}` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Related job (optional)">
                <select
                  value={values.jobId}
                  onChange={(e) => handleChange('jobId', e.target.value)}
                  className={inputClasses(false)}
                  disabled={!values.customerId}
                >
                  <option value="">— No linked job —</option>
                  {jobsForCustomer.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Title" required error={titleError ?? undefined}>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={values.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Kitchen remodel — scope + pricing"
                  className={inputClasses(Boolean(titleError))}
                />
              </Field>

              <Field label="Amount (USD)" required>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={values.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  placeholder="0.00"
                  className={`${inputClasses(false)} font-mono tabular-nums`}
                />
              </Field>

              <Field label="Status">
                <select
                  value={values.status}
                  onChange={(e) =>
                    handleChange('status', e.target.value as ProposalStatus)
                  }
                  className={inputClasses(false)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Notes">
                <textarea
                  value={values.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Scope, caveats, terms, follow-ups…"
                  className={`${inputClasses(false)} resize-none font-body`}
                />
              </Field>
            </form>

            <footer className="px-5 py-4 border-t border-obsidian-800 flex items-center justify-end gap-3">
              <Button label="Cancel" variant="secondary" onClick={close} />
              <Button
                label={mode === 'add' ? 'Add proposal' : 'Save'}
                variant="primary"
                onClick={submitForm}
              />
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
