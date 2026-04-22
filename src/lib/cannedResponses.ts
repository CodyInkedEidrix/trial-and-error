// ──────────────────────────────────────────────────────────────────────
// Canned responses — placeholder Eidrix messages for Chapter 11.
//
// AC-01 replaces this with real model calls. Until then, these stand in
// as the voice of Eidrix at first contact. Tone notes:
//   - Dry, not chirpy. No "I'd be happy to help!"
//   - Acknowledges the scaffolding honestly instead of faking competence
//   - References operator-context (records, data, threads) that later
//     chapters will wire up — the responses TEACH the user what Eidrix
//     is designed to do without pretending it does it yet
//
// When AC-01 wires real AI, these patterns become part of the system
// prompt — the tone-of-voice spec carries forward.
// ──────────────────────────────────────────────────────────────────────

export const CANNED_RESPONSES: string[] = [
  "I'm running on scaffolding right now — real answers land when AC-01 wires in the model. Ask me something specific and I'll give you the framing you'd get from the real me.",
  "Once your customer data is synced, I'd pull the last three touches and flag anything overdue. For now, assume that pattern lives here.",
  "Good question. The real Eidrix would check your records first, then propose a next step. This version just nods and smiles — trust the framing, not the content yet.",
  "If this were live, I'd summarize what changed since your last session. For now: nothing's changed. You're working in a fresh session.",
  "I hear you. Give me real data and I'd tell you what's working, what's stale, and what I'd do next. Scaffolding doesn't let me be that useful yet.",
  "Noted. When the model's wired in, I'll track these threads across sessions so you don't repeat yourself. AC-04 handles that; this session is one-shot.",
  "Fair ask. The answer involves your records, and those aren't in my context yet. Come back for this one after AC-02 ships.",
  "I'm not going to pretend to know. When I do, I'll be specific. For now, here's a placeholder so you can feel the shape of the interaction.",
]

/**
 * Pick a random canned response. Won't repeat the last-picked response
 * back-to-back — small detail that makes rapid-fire chatting feel less
 * broken ("why did it say the same thing twice?" is a legitimate
 * complaint even for scaffolding).
 */
let lastPickedIndex = -1
export function pickCannedResponse(): string {
  if (CANNED_RESPONSES.length === 1) return CANNED_RESPONSES[0]

  let next = Math.floor(Math.random() * CANNED_RESPONSES.length)
  if (next === lastPickedIndex) {
    next = (next + 1) % CANNED_RESPONSES.length
  }
  lastPickedIndex = next
  return CANNED_RESPONSES[next]
}
