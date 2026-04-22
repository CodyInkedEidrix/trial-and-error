// ──────────────────────────────────────────────────────────────────────
// CustomerForm — slide-in panel for adding and editing customers.
//
// One component, two modes. Add mode starts blank and auto-focuses the
// name field; edit mode pre-fills from the customer and skips auto-focus
// (the user just clicked a row — stealing their cursor would be rude).
//
// Validation is submit-first, live-after-first-attempt (the Gmail /
// Linear pattern). Only `name` is required.
//
// Mounted at App level so the palette, an agent tool call, or any other
// future surface can open it via the customerFormStore.
// ──────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import type {
  Customer,
  CustomerInput,
  CustomerStatus,
} from '../../types/customer'
import { useCustomerFormStore } from '../../lib/customerFormStore'
import { useCustomerStore } from '../../lib/customerStore'
import { formatPhoneUS } from '../../lib/formatPhone'
import { useToast } from '../../hooks/useToast'
import Button from '../ui/Button'

// ──────────────────────────────────────────────────────────────────────
// Types & defaults
// ──────────────────────────────────────────────────────────────────────

export interface FormValues {
  name: string
  company: string
  status: CustomerStatus
  email: string
  phone: string
  address: string
  notes: string
}

export const emptyValues: FormValues = {
  name: '',
  company: '',
  status: 'lead',
  email: '',
  phone: '',
  address: '',
  notes: '',
}

export function customerToValues(c: Customer): FormValues {
  return {
    name: c.name,
    company: c.company ?? '',
    status: c.status,
    email: c.email ?? '',
    // Run pre-seeded phone values through the masker so edit mode starts
    // in canonical form even if the stored value came from before the
    // masker existed (e.g., seed data or a future backend).
    phone: c.phone ? formatPhoneUS(c.phone) : '',
    address: c.address ?? '',
    notes: c.notes ?? '',
  }
}

/**
 * Strips empty strings so optional fields serialize as undefined rather
 * than empty strings. Keeps the stored shape tidy and future-proofs
 * Supabase ports (empty-string-in-text-column is a classic footgun).
 */
export function valuesToInput(v: FormValues): CustomerInput {
  const trim = (s: string) => (s.trim() === '' ? undefined : s.trim())
  return {
    name: v.name.trim(),
    company: trim(v.company),
    status: v.status,
    email: trim(v.email),
    phone: trim(v.phone),
    address: trim(v.address),
    notes: trim(v.notes),
  }
}

// ──────────────────────────────────────────────────────────────────────
// Motion
// ──────────────────────────────────────────────────────────────────────

// Eidrix-tempo ease — a touch slower and softer than default.
const panelEase: [number, number, number, number] = [0.22, 0.61, 0.36, 1]
const panelDuration = 0.42

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25 },
}

const panelMotion = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { duration: panelDuration, ease: panelEase },
}

// ──────────────────────────────────────────────────────────────────────
// Internal form-field primitives (scoped to this file — if they prove
// reusable we extract them into `src/components/ui/` in a later PR)
// ──────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}

export function Field({ label, required, error, children }: FieldProps) {
  const hasError = Boolean(error)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">
        {label}
        {required && <span className="text-ember-500 ml-1">*</span>}
      </span>
      {children}
      {hasError && (
        <p className="font-mono text-xs text-danger-500 flex items-center gap-1.5">
          <span aria-hidden="true">•</span>
          {error}
        </p>
      )}
    </div>
  )
}

export function inputClasses(hasError: boolean) {
  return (
    'bg-obsidian-800 text-text-primary placeholder-text-tertiary px-3 py-2 rounded-md border transition-all duration-150 ease-out focus:outline-none ' +
    (hasError
      ? 'border-danger-500 focus:shadow-[0_0_0_3px_rgba(229,72,77,0.18)]'
      : 'border-obsidian-700 focus:border-ember-500 focus:shadow-[0_0_0_3px_rgba(255,107,26,0.18)]')
  )
}

// ──────────────────────────────────────────────────────────────────────
// Status segmented control
// ──────────────────────────────────────────────────────────────────────

const statusOptions: CustomerStatus[] = ['lead', 'active', 'paused', 'archived']
const statusDisplay: Record<CustomerStatus, string> = {
  lead: 'Lead',
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
}

// When selected, each button takes on the same color palette as its
// StatusBadge counterpart in the list. This gives the user a live
// preview of what the badge will look like after save — click "Lead"
// and you see the cobalt you'd see in the table.
//
// Note: avoiding `ring-*/opacity` utilities because Tailwind's ring
// system can't apply opacity to CSS-variable color tokens — it falls
// back to `--tw-ring-color`'s default (Tailwind blue). Backgrounds use
// `color-mix()` and handle this fine; rings don't. Pattern matches the
// Input primitive's shadow-based focus glow.
const statusSelectedClasses: Record<CustomerStatus, string> = {
  lead: 'bg-cobalt-500/20 text-cobalt-500',
  active: 'bg-ember-700/40 text-ember-300',
  paused: 'bg-obsidian-700 text-text-primary',
  archived: 'bg-obsidian-800 text-text-secondary italic',
}

export function StatusSegmented({
  value,
  onChange,
}: {
  value: CustomerStatus
  onChange: (s: CustomerStatus) => void
}) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  // ARIA radiogroup pattern: Left/Up → previous, Right/Down → next,
  // Home → first, End → last. Selection follows focus (WAI-ARIA APG).
  const handleKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = statusOptions.length
    let nextIndex = index

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % count
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + count) % count
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = count - 1
    } else {
      return
    }

    e.preventDefault()
    onChange(statusOptions[nextIndex])
    buttonRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Status"
      className="flex gap-1 p-1 bg-obsidian-900 border border-obsidian-700 rounded-md"
    >
      {statusOptions.map((option, index) => {
        const selected = option === value
        return (
          <button
            key={option}
            ref={(el) => {
              buttonRefs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            // Roving tabindex — only the selected option is in the Tab
            // sequence. Arrow keys move between options within the group.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option)}
            onKeyDown={(e) => handleKey(e, index)}
            className={`flex-1 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider rounded transition-colors outline-none focus-visible:shadow-[0_0_0_2px_rgba(255,107,26,0.55)] ${
              selected
                ? statusSelectedClasses[option]
                : 'text-text-secondary hover:text-text-primary hover:bg-obsidian-800'
            }`}
          >
            {statusDisplay[option]}
          </button>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────

export default function CustomerForm() {
  const open = useCustomerFormStore((s) => s.open)
  const mode = useCustomerFormStore((s) => s.mode)
  const customer = useCustomerFormStore((s) => s.customer)
  const close = useCustomerFormStore((s) => s.close)

  const addCustomer = useCustomerStore((s) => s.addCustomer)
  const updateCustomer = useCustomerStore((s) => s.updateCustomer)
  const toast = useToast()

  const [values, setValues] = useState<FormValues>(emptyValues)
  const [nameError, setNameError] = useState<string | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)

  // Phone masking preserves the user's cursor position across the
  // reformatting. We count digits-before-cursor in the raw input,
  // reformat, then restore the cursor to the position in the formatted
  // string that has the same digit count to its left. Restoring after
  // React commits the new value (hence the effect keyed on phone).
  const pendingPhoneCursorRef = useRef<number | null>(null)
  useEffect(() => {
    if (pendingPhoneCursorRef.current !== null && phoneInputRef.current) {
      const pos = pendingPhoneCursorRef.current
      phoneInputRef.current.setSelectionRange(pos, pos)
      pendingPhoneCursorRef.current = null
    }
  }, [values.phone])

  function handlePhoneChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const rawValue = input.value
    const cursorPos = input.selectionStart ?? rawValue.length

    // Count digits in the raw value before the current cursor position.
    let digitsBeforeCursor = 0
    for (let i = 0; i < cursorPos; i++) {
      if (/\d/.test(rawValue[i])) digitsBeforeCursor++
    }

    const formatted = formatPhoneUS(rawValue)

    // Find the position in the formatted string that has the same
    // number of digits to its left. That's where the cursor belongs.
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

  // Reset form state whenever the panel opens. Seed values from the
  // customer when in edit mode; clear otherwise.
  useEffect(() => {
    if (!open) return
    setValues(mode === 'edit' && customer ? customerToValues(customer) : emptyValues)
    setNameError(null)
    setHasSubmitted(false)

    // Auto-focus the Name input on Add, but not on Edit — the user just
    // clicked a row and yanking focus would be surprising.
    if (mode === 'add') {
      // Wait a tick so the panel is mounted and the input is reachable.
      const timer = setTimeout(() => nameInputRef.current?.focus(), panelDuration * 1000 * 0.6)
      return () => clearTimeout(timer)
    }
  }, [open, mode, customer])

  // Re-validate live after the first submit attempt.
  useEffect(() => {
    if (!hasSubmitted) return
    setNameError(values.name.trim() === '' ? 'Name is required' : null)
  }, [values.name, hasSubmitted])

  // Escape closes the panel. Global listener because Escape should work
  // regardless of which field has focus.
  useEffect(() => {
    if (!open) return
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, close])

  // ──── Handlers ────

  function handleChange<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function submitForm() {
    setHasSubmitted(true)

    if (values.name.trim() === '') {
      setNameError('Name is required')
      nameInputRef.current?.focus()
      return
    }

    const input = valuesToInput(values)
    if (mode === 'add') {
      addCustomer(input)
      toast.push({
        title: `${input.name} added`,
        variant: 'success',
        duration: 2500,
      })
    } else if (customer) {
      updateCustomer(customer.id, input)
      toast.push({
        title: `${input.name} saved`,
        variant: 'success',
        duration: 2500,
      })
    }
    close()
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    submitForm()
  }

  // Enter submits from single-line inputs; textareas pass through so
  // users can add a newline without accidentally submitting.
  function handleInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const form = e.currentTarget.closest('form')
      form?.requestSubmit()
    }
  }

  // ──── Render ────

  return (
    <AnimatePresence>
      {open && (
        // ── Eidrix principle: the chat column is sovereign. ────────────
        // Overlays (form, palette, anything modal-like) NEVER cover the
        // chat. The left edge of this container is offset to match the
        // chat column's width (see ChatColumn.tsx — 380px). Chat stays
        // fully visible, fully interactive, fully keyboard-reachable
        // while the form is open — the user can ask Eidrix a question
        // mid-fill, and Eidrix can drive the form while the user watches.
        //
        // This is why we use role="dialog" WITHOUT aria-modal="true":
        // aria-modal="true" tells screen readers "everything else is
        // inert" — but chat is NOT inert, so the label would be a lie.
        // Tab from form into chat is expected; no focus trap either.
        // ──────────────────────────────────────────────────────────────
        <div
          className="fixed inset-y-0 right-0 left-[380px] z-50 flex justify-end"
          role="dialog"
          aria-labelledby="customer-form-title"
        >
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close panel"
            onClick={close}
            {...backdropMotion}
            className="absolute inset-0 bg-obsidian-950/40 backdrop-blur-sm cursor-default"
          />

          {/* Panel */}
          <motion.form
            {...panelMotion}
            onSubmit={handleSubmit}
            className="relative h-full w-full max-w-[480px] bg-background border-l border-obsidian-800 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] flex flex-col"
          >
            {/* Header */}
            <header className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-obsidian-800">
              <h2
                id="customer-form-title"
                className="font-display text-lg text-text-primary"
              >
                {mode === 'add' ? 'Add customer' : 'Edit customer'}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-text-tertiary hover:text-text-primary transition-colors p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/60"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>

            {/* Body — scrollable if fields overflow */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <Field label="Name" required error={nameError ?? undefined}>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={values.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleChange('name', e.target.value)
                  }
                  onKeyDown={handleInputKey}
                  placeholder="Sarah Okonkwo"
                  className={inputClasses(Boolean(nameError))}
                />
              </Field>

              <Field label="Company">
                <input
                  type="text"
                  value={values.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  onKeyDown={handleInputKey}
                  placeholder="Optional — for B2B customers"
                  className={inputClasses(false)}
                />
              </Field>

              <Field label="Status">
                <StatusSegmented
                  value={values.status}
                  onChange={(s) => handleChange('status', s)}
                />
              </Field>

              <Field label="Phone">
                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={values.phone}
                  onChange={handlePhoneChange}
                  onKeyDown={handleInputKey}
                  placeholder="(555) 123-4567"
                  className={inputClasses(false)}
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={values.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onKeyDown={handleInputKey}
                  placeholder="name@example.com"
                  className={inputClasses(false)}
                />
              </Field>

              <Field label="Address">
                <textarea
                  value={values.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={2}
                  placeholder="Service or shipping address"
                  className={`${inputClasses(false)} resize-none font-body`}
                />
              </Field>

              <Field label="Notes">
                <textarea
                  value={values.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Gate codes, dog names, quirks, pricing notes…"
                  className={`${inputClasses(false)} resize-none font-body`}
                />
              </Field>
            </div>

            {/* Footer */}
            <footer className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-obsidian-800">
              <Button
                label="Cancel"
                variant="tertiary"
                size="sm"
                onClick={close}
              />
              <Button
                label={mode === 'add' ? 'Add customer' : 'Save changes'}
                variant="primary"
                size="sm"
                onClick={submitForm}
              />
            </footer>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  )
}
