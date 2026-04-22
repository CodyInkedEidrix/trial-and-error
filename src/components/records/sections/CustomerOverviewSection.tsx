// ──────────────────────────────────────────────────────────────────────
// CustomerOverviewSection — the 'Overview' secondary tab inside the
// customer record detail view.
//
// Auto-save-on-blur pattern (Eidrix direction: everything auto-saves).
// Each text field commits its current values to the store when blurred.
// Status changes are immediate (radio-like). Name validation rejects
// empty values — blurring with an empty name shows an error and does
// NOT save (preserving the existing record's name).
//
// ─── Design note for Real Eidrix ──────────────────────────────────────
// Unblurred in-progress edits are volatile — if the user switches
// sections or closes the record without blurring, the typed value is
// lost. A future polish pass (probably paired with network saves) can
// add "save on unmount" via a values ref. Not in scope for Ch 10.5 —
// the blur-save pattern is the foundation; save-on-unmount is polish.
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

import type { Customer, CustomerStatus } from '../../../types/customer'
import {
  Field,
  StatusSegmented,
  customerToValues,
  emptyValues,
  inputClasses,
  valuesToInput,
  type FormValues,
} from '../CustomerForm'
import { useCustomerStore } from '../../../lib/customerStore'
import { useSavedIndicator } from '../../../hooks/useSavedIndicator'
import { formatPhoneUS } from '../../../lib/formatPhone'
import SavedIndicator from '../SavedIndicator'

interface CustomerOverviewSectionProps {
  record: Customer
}

export default function CustomerOverviewSection({
  record,
}: CustomerOverviewSectionProps) {
  const updateCustomer = useCustomerStore((s) => s.updateCustomer)
  const { saved, pingSaved } = useSavedIndicator()

  const [values, setValues] = useState<FormValues>(
    () => customerToValues(record) ?? emptyValues,
  )
  const [nameError, setNameError] = useState<string | null>(null)

  // Sync local state when the user opens a different customer.
  // Keyed on record.id so swapping to a new customer refreshes state
  // without thrashing on every prop update of the same record.
  useEffect(() => {
    setValues(customerToValues(record))
    setNameError(null)
  }, [record.id])

  // Phone cursor preservation — same pattern as CustomerForm.
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const pendingPhoneCursorRef = useRef<number | null>(null)
  useEffect(() => {
    if (pendingPhoneCursorRef.current !== null && phoneInputRef.current) {
      const pos = pendingPhoneCursorRef.current
      phoneInputRef.current.setSelectionRange(pos, pos)
      pendingPhoneCursorRef.current = null
    }
  }, [values.phone])

  function handleChange<K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handlePhoneChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const rawValue = input.value
    const cursorPos = input.selectionStart ?? rawValue.length

    let digitsBeforeCursor = 0
    for (let i = 0; i < cursorPos; i++) {
      if (/\d/.test(rawValue[i])) digitsBeforeCursor++
    }
    const formatted = formatPhoneUS(rawValue)
    let newCursor = formatted.length
    if (digitsBeforeCursor === 0) {
      newCursor = 0
    } else {
      let count = 0
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          count++
          if (count === digitsBeforeCursor) {
            newCursor = i + 1
            break
          }
        }
      }
    }
    pendingPhoneCursorRef.current = newCursor
    handleChange('phone', formatted)
  }

  /**
   * Validates + commits to the store. Does NOT save if the name is
   * empty — instead shows an inline error and waits for the user to
   * fix it. Once a valid name is in place, subsequent blurs commit
   * the accumulated changes (including any from other fields).
   */
  function trySave(nextValues: FormValues) {
    if (nextValues.name.trim() === '') {
      setNameError('Name is required')
      return
    }
    setNameError(null)
    updateCustomer(record.id, valuesToInput(nextValues))
    pingSaved()
  }

  function handleFieldBlur() {
    trySave(values)
  }

  // Status is a radio-like change — save immediately, not on blur.
  function handleStatusChange(status: CustomerStatus) {
    const next = { ...values, status }
    setValues(next)
    trySave(next)
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Saved indicator — sits in the top-right of the section, out
          of the way until a save fires. */}
      <div className="flex justify-end h-4 mb-2">
        <SavedIndicator visible={saved} />
      </div>

      <div className="space-y-4">
        <Field label="Name" required error={nameError ?? undefined}>
          <input
            type="text"
            value={values.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={handleFieldBlur}
            className={inputClasses(Boolean(nameError))}
          />
        </Field>

        <Field label="Company">
          <input
            type="text"
            value={values.company}
            onChange={(e) => handleChange('company', e.target.value)}
            onBlur={handleFieldBlur}
            placeholder="Optional — for B2B customers"
            className={inputClasses(false)}
          />
        </Field>

        <Field label="Status">
          <StatusSegmented value={values.status} onChange={handleStatusChange} />
        </Field>

        <Field label="Phone">
          <input
            ref={phoneInputRef}
            type="tel"
            value={values.phone}
            onChange={handlePhoneChange}
            onBlur={handleFieldBlur}
            placeholder="(555) 123-4567"
            className={inputClasses(false)}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={values.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={handleFieldBlur}
            placeholder="name@example.com"
            className={inputClasses(false)}
          />
        </Field>

        <Field label="Address">
          <textarea
            value={values.address}
            onChange={(e) => handleChange('address', e.target.value)}
            onBlur={handleFieldBlur}
            rows={2}
            placeholder="Service or shipping address"
            className={`${inputClasses(false)} resize-none font-body`}
          />
        </Field>
      </div>
    </div>
  )
}
