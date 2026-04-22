// ──────────────────────────────────────────────────────────────────────
// Relative time formatting — "2 days ago", "3 weeks ago", "just now".
//
// Uses the browser-native Intl.RelativeTimeFormat so we don't pull in
// a dep. Good enough for the Records tab; if we ever need locale-aware
// calendar-relative ("yesterday at 3pm") we'll reach for date-fns.
// ──────────────────────────────────────────────────────────────────────

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/**
 * Format an ISO timestamp as a relative phrase.
 *
 * Returns "—" when the input is missing — that's what the Records table
 * shows for leads who haven't been contacted yet.
 */
export function formatRelative(iso: string | undefined | null): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'

  const secondsAgo = Math.round((Date.now() - then) / 1000)

  // Future timestamps shouldn't happen, but fall back to "just now".
  if (secondsAgo < 0) return 'just now'

  if (secondsAgo < MINUTE) return 'just now'
  if (secondsAgo < HOUR) return rtf.format(-Math.floor(secondsAgo / MINUTE), 'minute')
  if (secondsAgo < DAY) return rtf.format(-Math.floor(secondsAgo / HOUR), 'hour')
  if (secondsAgo < WEEK) return rtf.format(-Math.floor(secondsAgo / DAY), 'day')
  if (secondsAgo < MONTH) return rtf.format(-Math.floor(secondsAgo / WEEK), 'week')
  if (secondsAgo < YEAR) return rtf.format(-Math.floor(secondsAgo / MONTH), 'month')
  return rtf.format(-Math.floor(secondsAgo / YEAR), 'year')
}
