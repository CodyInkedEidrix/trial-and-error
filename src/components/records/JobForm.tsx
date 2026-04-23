// ──────────────────────────────────────────────────────────────────────
// JobForm — slide-in panel for adding and editing jobs.
//
// Mirrors CustomerForm's shape and behavior — same panel chrome, same
// submit-first / live-after-first-attempt validation pattern. Only
// differences: the customer dropdown (jobs require a customer FK), and
// the dollar-amount + date inputs which use specialized formatting.
//
// Reuses CustomerForm's exported Field + inputClasses helpers to stay
// visually consistent without duplicating layout code.
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import type { Job, JobInput, JobStatus } from '../../types/job'
import { useJobFormStore } from '../../lib/jobFormStore'
import { useJobStore } from '../../lib/jobStore'
import { useCustomerStore } from '../../lib/customerStore'
import { useToast } from '../../hooks/useToast'
import { Field, inputClasses } from './CustomerForm'
import Button from '../ui/Button'

// ──────────────────────────────────────────────────────────────────────
// Types & defaults
// ──────────────────────────────────────────────────────────────────────

interface FormValues {
  customerId: string
  title: string
  status: JobStatus
  scheduledDate: string
  amount: string // string in form, parsed to number on submit
  notes: string
}

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const emptyValues: FormValues = {
  customerId: '',
  title: '',
  status: 'draft',
  scheduledDate: '',
  amount: '',
  notes: '',
}

function jobToValues(j: Job): FormValues {
  return {
    customerId: j.customerId,
    title: j.title,
    status: j.status,
    scheduledDate: j.scheduledDate ?? '',
    amount: j.amount === undefined ? '' : String(j.amount),
    notes: j.notes ?? '',
  }
}

function valuesToInput(v: FormValues): JobInput {
  const trim = (s: string) => (s.trim() === '' ? undefined : s.trim())
  const parsedAmount = v.amount.trim() === '' ? undefined : Number(v.amount)
  return {
    customerId: v.customerId,
    title: v.title.trim(),
    status: v.status,
    scheduledDate: trim(v.scheduledDate),
    amount:
      parsedAmount === undefined || Number.isNaN(parsedAmount)
        ? undefined
        : parsedAmount,
    notes: trim(v.notes),
  }
}

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────

export default function JobForm() {
  const { open, mode, job, defaultCustomerId, close } = useJobFormStore()
  const addJob = useJobStore((s) => s.addJob)
  const updateJob = useJobStore((s) => s.updateJob)
  const customers = useCustomerStore((s) => s.customers)
  const toast = useToast()

  const [values, setValues] = useState<FormValues>(emptyValues)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [customerError, setCustomerError] = useState<string | null>(null)

  const titleInputRef = useRef<HTMLInputElement>(null)

  // ──── Reset form whenever the panel opens ────
  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && job) {
      setValues(jobToValues(job))
    } else {
      setValues({
        ...emptyValues,
        customerId: defaultCustomerId ?? '',
      })
    }
    setHasSubmitted(false)
    setTitleError(null)
    setCustomerError(null)

    // Focus title in add mode (edit mode skips — user just clicked a row).
    if (mode === 'add') {
      requestAnimationFrame(() => titleInputRef.current?.focus())
    }
  }, [open, mode, job, defaultCustomerId])

  // Escape closes; Cmd/Ctrl+Enter submits.
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
    setValues((prev) => ({ ...prev, [key]: value }))
    if (hasSubmitted) {
      // Live validation after first submit attempt.
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
      void addJob(input)
      toast.push({
        title: `${input.title} added`,
        variant: 'success',
        duration: 2500,
      })
    } else if (job) {
      void updateJob(job.id, input)
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

          {/* Panel — slides in from the right. */}
          <motion.div
            key="panel"
            role="dialog"
            aria-label={mode === 'add' ? 'Add job' : `Edit ${job?.title}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 36 }}
            className="fixed top-0 right-0 bottom-0 w-[460px] bg-obsidian-900 border-l border-obsidian-800 shadow-2xl z-40 flex flex-col"
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-obsidian-800">
              <h2 className="font-display text-lg text-text-primary">
                {mode === 'add' ? 'Add Job' : 'Edit Job'}
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

              <Field
                label="Title"
                required
                error={titleError ?? undefined}
              >
                <input
                  ref={titleInputRef}
                  type="text"
                  value={values.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Roof replacement quote"
                  className={inputClasses(Boolean(titleError))}
                />
              </Field>

              <Field label="Status">
                <select
                  value={values.status}
                  onChange={(e) =>
                    handleChange('status', e.target.value as JobStatus)
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

              <Field label="Scheduled date">
                <input
                  type="date"
                  value={values.scheduledDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleChange('scheduledDate', e.target.value)
                  }
                  className={inputClasses(false)}
                />
              </Field>

              <Field label="Amount (USD)">
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

              <Field label="Notes">
                <textarea
                  value={values.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Scope, materials, access notes…"
                  className={`${inputClasses(false)} resize-none font-body`}
                />
              </Field>
            </form>

            <footer className="px-5 py-4 border-t border-obsidian-800 flex items-center justify-end gap-3">
              <Button label="Cancel" variant="secondary" onClick={close} />
              <Button
                label={mode === 'add' ? 'Add job' : 'Save'}
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
