// ──────────────────────────────────────────────────────────────────────
// Phone number formatting — live input masking for US numbers.
//
// Strip everything non-digit and slot the result into `(XXX) XXX-XXXX`
// progressively as the user types. Partial inputs render partially:
//   "2"          → "(2"
//   "208"        → "(208"
//   "2083207"    → "(208) 320-7"
//   "2083207515" → "(208) 320-7515"
//
// The formatter is idempotent — running it on an already-formatted
// string yields the same output, which means you can safely call it
// on paste events and on pre-seeded form values.
//
// ─── Porting to real Eidrix ───────────────────────────────────────────
// Real Eidrix serves multiple countries. The clean extension point is
// a `formatPhone(input, locale)` dispatcher that picks the right masker
// (libphonenumber-js is the industry standard). For now, US-only —
// matches the curriculum's current seed customers.
// ──────────────────────────────────────────────────────────────────────

export function formatPhoneUS(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 10)

  if (digits.length === 0) return ''
  if (digits.length < 4) return `(${digits}`
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}
