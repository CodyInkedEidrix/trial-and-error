// ──────────────────────────────────────────────────────────────────────
// ProposalOverviewSection — the 'Overview' section inside a proposal
// detail tab.
//
// Auto-save-on-blur pattern, mirroring JobOverviewSection. Status and
// customer/job reassignments save immediately (radio-like); text and
// amount fields save on blur. Title is required.
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'

import type {
  Proposal,
  ProposalInput,
  ProposalStatus,
} from '../../../types/proposal'
import { useProposalStore } from '../../../lib/proposalStore'
import { useCustomerStore } from '../../../lib/customerStore'
import { useJobStore } from '../../../lib/jobStore'
import { useSavedIndicator } from '../../../hooks/useSavedIndicator'
import { Field, inputClasses } from '../CustomerForm'
import SavedIndicator from '../SavedIndicator'

interface ProposalOverviewSectionProps {
  record: Proposal
}

interface FormValues {
  customerId: string
  jobId: string
  title: string
  amount: string
  status: ProposalStatus
  notes: string
}

const STATUS_OPTIONS: { value: ProposalStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

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

function valuesToInput(v: FormValues): Partial<ProposalInput> {
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

export default function ProposalOverviewSection({
  record,
}: ProposalOverviewSectionProps) {
  const updateProposal = useProposalStore((s) => s.updateProposal)
  const customers = useCustomerStore((s) => s.customers)
  const jobs = useJobStore((s) => s.jobs)
  const { saved, pingSaved } = useSavedIndicator()

  const [values, setValues] = useState<FormValues>(() => proposalToValues(record))
  const [titleError, setTitleError] = useState<string | null>(null)

  useEffect(() => {
    setValues(proposalToValues(record))
    setTitleError(null)
  }, [record.id])

  // Only show jobs for the currently-selected customer.
  const jobsForCustomer = useMemo(() => {
    if (!values.customerId) return jobs
    return jobs.filter((j) => j.customerId === values.customerId)
  }, [jobs, values.customerId])

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
    void updateProposal(record.id, valuesToInput(nextValues))
    pingSaved()
  }

  function handleFieldBlur() {
    trySave(values)
  }

  function handleStatusChange(status: ProposalStatus) {
    const next = { ...values, status }
    setValues(next)
    trySave(next)
  }

  function handleCustomerChange(customerId: string) {
    // Customer change: reset job if the current job belongs to a
    // different customer. Save only if a valid customer is selected.
    const stillValidJob = jobs.some(
      (j) => j.id === values.jobId && j.customerId === customerId,
    )
    const next: FormValues = {
      ...values,
      customerId,
      jobId: stillValidJob ? values.jobId : '',
    }
    setValues(next)
    if (customerId !== '') trySave(next)
  }

  function handleJobChange(jobId: string) {
    const next = { ...values, jobId }
    setValues(next)
    trySave(next)
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

        <Field label="Related job (optional)">
          <select
            value={values.jobId}
            onChange={(e) => handleJobChange(e.target.value)}
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
            type="text"
            value={values.title}
            onChange={(e) => handleChange('title', e.target.value)}
            onBlur={handleFieldBlur}
            className={inputClasses(Boolean(titleError))}
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

        <Field label="Status">
          <select
            value={values.status}
            onChange={(e) =>
              handleStatusChange(e.target.value as ProposalStatus)
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
            onBlur={handleFieldBlur}
            rows={4}
            placeholder="Scope, caveats, terms, follow-ups…"
            className={`${inputClasses(false)} resize-none font-body`}
          />
        </Field>
      </div>
    </div>
  )
}
