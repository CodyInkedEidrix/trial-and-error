// ──────────────────────────────────────────────────────────────────────
// CustomerNotesSection — the 'Notes' secondary tab.
//
// Single large textarea, auto-save-on-blur. Saves only when notes
// actually changed (noop on blur-without-edit). Uses the shared
// SavedIndicator for consistent feedback with Overview.
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

import type { Customer } from '../../../types/customer'
import { Field, inputClasses } from '../CustomerForm'
import { useCustomerStore } from '../../../lib/customerStore'
import { useSavedIndicator } from '../../../hooks/useSavedIndicator'
import SavedIndicator from '../SavedIndicator'

interface CustomerNotesSectionProps {
  record: Customer
}

export default function CustomerNotesSection({
  record,
}: CustomerNotesSectionProps) {
  const updateCustomer = useCustomerStore((s) => s.updateCustomer)
  const { saved, pingSaved } = useSavedIndicator()

  const [notes, setNotes] = useState(record.notes ?? '')

  // Sync when a different customer is opened.
  useEffect(() => {
    setNotes(record.notes ?? '')
  }, [record.id])

  function handleBlur() {
    const trimmed = notes.trim()
    const nextValue = trimmed === '' ? undefined : trimmed

    // Only save + ping indicator if the notes actually changed.
    if (nextValue !== record.notes) {
      updateCustomer(record.id, { notes: nextValue })
      pingSaved()
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex justify-end h-4 mb-2">
        <SavedIndicator visible={saved} />
      </div>

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleBlur}
          rows={14}
          placeholder="Gate codes, dog names, pricing quirks, access notes…"
          className={`${inputClasses(false)} resize-none font-body`}
        />
      </Field>
    </div>
  )
}
