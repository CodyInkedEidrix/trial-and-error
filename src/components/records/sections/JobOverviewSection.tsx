// ──────────────────────────────────────────────────────────────────────
// JobOverviewSection — the 'Overview' section inside a job detail tab.
//
// Auto-save-on-blur pattern, mirroring CustomerOverviewSection. Status
// changes (and customer reassignment) save immediately; text fields
// save on blur. Validation: title is required, won't save if empty.
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

import type { Job, JobInput, JobStatus } from '../../../types/job'
import { useJobStore } from '../../../lib/jobStore'
import { useCustomerStore } from '../../../lib/customerStore'
import { useSavedIndicator } from '../../../hooks/useSavedIndicator'
import { Field, inputClasses } from '../CustomerForm'
import SavedIndicator from '../SavedIndicator'

interface JobOverviewSectionProps {
  record: Job
}

interface FormValues {
  customerId: string
  title: string
  status: JobStatus
  scheduledDate: string
  amount: string
  notes: string
}

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

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

function valuesToInput(v: FormValues): Partial<JobInput> {
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

export default function JobOverviewSection({ record }: JobOverviewSectionProps) {
  const updateJob = useJobStore((s) => s.updateJob)
  const customers = useCustomerStore((s) => s.customers)
  const { saved, pingSaved } = useSavedIndicator()

  const [values, setValues] = useState<FormValues>(() => jobToValues(record))
  const [titleError, setTitleError] = useState<string | null>(null)

  useEffect(() => {
    setValues(jobToValues(record))
    setTitleError(null)
  }, [record.id])

  function handleChange<K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function trySave(nextValues: FormValues) {
    if (nextValues.title.trim() === '') {
      setTitleError('Title is required')
      return
    }
    setTitleError(null)
    void updateJob(record.id, valuesToInput(nextValues))
    pingSaved()
  }

  function handleFieldBlur() {
    trySave(values)
  }

  // Status / customer changes save immediately (radio-like).
  function handleStatusChange(status: JobStatus) {
    const next = { ...values, status }
    setValues(next)
    trySave(next)
  }

  function handleCustomerChange(customerId: string) {
    const next = { ...values, customerId }
    setValues(next)
    if (customerId !== '') trySave(next)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex justify-end h-4 mb-2">
        <SavedIndicator visible={saved} />
      </div>

      <div className="space-y-4">
        <Field label="Customer">
          <select
            value={values.customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className={inputClasses(false)}
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

        <Field label="Title" required error={titleError ?? undefined}>
          <input
            type="text"
            value={values.title}
            onChange={(e) => handleChange('title', e.target.value)}
            onBlur={handleFieldBlur}
            className={inputClasses(Boolean(titleError))}
          />
        </Field>

        <Field label="Status">
          <select
            value={values.status}
            onChange={(e) => handleStatusChange(e.target.value as JobStatus)}
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
            onChange={(e) => handleChange('scheduledDate', e.target.value)}
            onBlur={handleFieldBlur}
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
            onBlur={handleFieldBlur}
            placeholder="0.00"
            className={`${inputClasses(false)} font-mono tabular-nums`}
          />
        </Field>

        <Field label="Notes">
          <textarea
            value={values.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            onBlur={handleFieldBlur}
            rows={4}
            placeholder="Scope, materials, access notes…"
            className={`${inputClasses(false)} resize-none font-body`}
          />
        </Field>
      </div>
    </div>
  )
}
