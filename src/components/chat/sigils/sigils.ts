// ──────────────────────────────────────────────────────────────────────
// Sigils — the Eye's visible gestures.
//
// A sigil is a small SVG path that the Eye "draws" in the space beside
// itself to mark a moment. Plan start traces a spiral (thinking); plan
// complete draws a checkmark; plan stopped draws a circle (halt); plan
// failed starts to draw an X but fizzles before completing.
//
// Why sigils instead of Eye growth / an arm / shape morph: sigils are
// ephemeral gestures, not structural changes to the character. They
// fire, they're visible for a beat, they're gone. No layout shifts,
// no new body parts that imply a personality we haven't designed,
// no AC-08a state-machine edits. The Eye remains a precision
// instrument; sigils are what it conjures.
//
// Extensibility: this file is the entire sigil registry. To add a new
// sigil:
//   1. Add a new kind to SigilKind
//   2. Add a corresponding entry in SIGILS with path + color + timing
//   3. Call useSigilStore.getState().fire('your-new-kind') from
//      wherever — click handlers, plan events, toast dismissals, etc.
// Nothing else changes. SigilOverlay renders whatever's in the queue.
//
// SVG coordinate system: every path is drawn inside a 24×24 viewBox.
// Keep new sigils centered on (12, 12) and clear of the edges so
// stroke-width doesn't clip.
// ──────────────────────────────────────────────────────────────────────

/** All sigil identifiers the store + renderer know about. Narrowed on
 *  fire() so typos fail at compile time. Add new kinds here first. */
export type SigilKind = 'thinking' | 'complete' | 'stopped' | 'failed'

/** Palette choice per sigil. The CSS variables resolve at render time
 *  so theme changes propagate for free. */
export type SigilColor = 'ember' | 'danger' | 'muted'

export interface SigilMeta {
  kind: SigilKind
  /** Single SVG path string, drawn inside a 24×24 viewBox. */
  path: string
  color: SigilColor
  /** ms to trace the stroke from invisible to fully drawn. */
  drawMs: number
  /** ms to hold the drawn sigil at full opacity before fading. */
  holdMs: number
  /** ms to fade the drawn sigil out to opacity 0. */
  fadeMs: number
  /** If true, the stroke only draws partially — used by "failed" to
   *  convey a gesture that dissolved mid-attempt. Value is the
   *  fraction of the path length that actually gets drawn (0..1). */
  partial?: number
  /** If true, a small dot or tail follows the draw — used by
   *  thinking's spiral for "settling into center" feel. Cosmetic. */
  tail?: boolean
}

// ─── Path constants ──────────────────────────────────────────────────

// Thinking: a small 1.5-turn inward spiral. Starts at (20, 12),
// winds counter-clockwise toward (12, 12). Drawn as three
// cubic bézier arcs for a smooth hand-drawn feel.
const PATH_THINKING =
  'M 20 12 C 20 4, 4 4, 4 12 C 4 18, 18 18, 18 12 C 18 8, 8 8, 8 12 C 8 14, 14 14, 14 12'

// Complete: checkmark, drawn in one stroke from lower-left to upper-right.
const PATH_COMPLETE = 'M 5 13 L 10 18 L 19 7'

// Stopped: circle, drawn from top center clockwise. Not a ✗ — a
// deliberate "halt" mark, like a period or full-stop sign.
const PATH_STOPPED =
  'M 12 4 A 8 8 0 1 1 11.99 4'

// Failed: X stroke, starting upper-left → lower-right, then
// lower-left → upper-right. Rendered as a single path with a
// moveTo between the two strokes. Only partially drawn via
// SIGILS.failed.partial (fizzle effect).
const PATH_FAILED =
  'M 6 6 L 18 18 M 18 6 L 6 18'

// ─── Registry ────────────────────────────────────────────────────────

export const SIGILS: Record<SigilKind, SigilMeta> = {
  thinking: {
    kind: 'thinking',
    path: PATH_THINKING,
    color: 'ember',
    drawMs: 900,
    holdMs: 400,
    fadeMs: 350,
    tail: true,
  },
  complete: {
    kind: 'complete',
    path: PATH_COMPLETE,
    color: 'ember',
    drawMs: 400,
    holdMs: 700,
    fadeMs: 450,
  },
  stopped: {
    kind: 'stopped',
    path: PATH_STOPPED,
    color: 'muted',
    drawMs: 550,
    holdMs: 600,
    fadeMs: 400,
  },
  failed: {
    kind: 'failed',
    path: PATH_FAILED,
    color: 'danger',
    drawMs: 500,
    holdMs: 200,
    fadeMs: 550,
    // Start the X, abandon before it meets itself — reads as a
    // gesture that couldn't be completed.
    partial: 0.55,
  },
}

/** CSS variable per color tier — resolves at render time so light /
 *  dark themes (if ever added) propagate for free. */
export const SIGIL_COLOR_VARS: Record<SigilColor, string> = {
  ember: 'var(--ember-500)',
  danger: 'var(--danger-500)',
  muted: 'var(--text-tertiary)',
}

/** Total screen-time for a sigil in ms. Used by the store to decide
 *  when to auto-advance the queue. */
export function totalSigilDurationMs(meta: SigilMeta): number {
  return meta.drawMs + meta.holdMs + meta.fadeMs
}
