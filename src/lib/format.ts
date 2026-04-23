// ──────────────────────────────────────────────────────────────────────
// format — shared display formatters for money, dates, and similar
// "render this value as a string" operations used across record views.
//
// Consolidated in one place so the "$1,234" vs "$1,234.00" vs "—"
// choices stay consistent app-wide. If a view wants to diverge (e.g.,
// show cents), do it locally — but the default is one rule here.
// ──────────────────────────────────────────────────────────────────────

/** Render a dollar amount as "$1,234" (no decimals). Null/undefined
 *  renders as "—" for tables; pass a number (including 0) to render
 *  "$0" explicitly. */
export function formatAmountUsd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/** Render an ISO date-only string (YYYY-MM-DD) as "Jan 3". Null or
 *  unparseable returns "—". The date is parsed in local time
 *  (appended T00:00:00) so "2026-04-29" doesn't shift to the previous
 *  day in negative UTC offsets. */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
