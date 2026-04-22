// ──────────────────────────────────────────────────────────────────────
// useSavedIndicator — small state machine for "• Saved" feedback.
//
// Call pingSaved() after any successful save; `saved` flips true for
// SAVED_DISPLAY_MS then false. Subsequent pings reset the timer so
// rapid-fire saves keep the indicator visible continuously.
//
// Extensible: when real Eidrix adds network saves, this can grow to
// 'idle' | 'saving' | 'saved' | 'error'. For now — single flag is
// enough because Zustand writes are synchronous.
// ──────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react'

const SAVED_DISPLAY_MS = 2000

export function useSavedIndicator() {
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pingSaved = useCallback(() => {
    setSaved(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSaved(false), SAVED_DISPLAY_MS)
  }, [])

  // Clean up dangling timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { saved, pingSaved }
}
