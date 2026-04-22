// ──────────────────────────────────────────────────────────────────────
// EmptyState — shown in the Records tab when there are zero customers.
//
// Designed moment, not a blank screen. A muted records-stack glyph,
// confident header, one sentence of context, and a primary CTA that
// opens the form panel in add mode.
//
// Triggered when `customers.length === 0` AND no pending deletes exist
// (we don't want to flash empty during the 5s undo window if the user
// just deleted their last customer).
// ──────────────────────────────────────────────────────────────────────

import Button from '../ui/Button'

interface EmptyStateProps {
  onAdd: () => void
}

export default function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 -mt-12">
      {/* Stacked-cards glyph — three concentric rounded rectangles fading
          inward, suggesting a record stack waiting to be filled. */}
      <div className="relative w-24 h-24 mb-6 opacity-40">
        <div className="absolute inset-x-3 top-2 bottom-12 rounded-md border border-obsidian-700" />
        <div className="absolute inset-x-2 top-5 bottom-8 rounded-md border border-obsidian-700/80 bg-obsidian-900/40" />
        <div className="absolute inset-x-1 top-9 bottom-2 rounded-md border border-obsidian-700 bg-obsidian-900/60 flex items-center justify-center">
          {/* Subtle ember plus — hints at "add" without being a button */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-ember-500/60"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
      </div>

      <h2 className="font-display text-xl text-text-primary">
        No customers yet
      </h2>

      <p className="font-body text-sm text-text-tertiary mt-2 mb-6 text-center max-w-sm">
        Add your first customer to start tracking leads, active jobs, and
        history. Everything stays here on your device.
      </p>

      <Button label="Add your first customer" onClick={onAdd} size="md" />

      {/* Faint accent line — same gradient flourish used elsewhere in the
          app for "designed empty" moments (mirrors the Coming Soon bar). */}
      <div
        className="mt-10 h-px w-32"
        aria-hidden
        style={{
          background:
            'linear-gradient(to right, transparent, var(--ember-500), transparent)',
          opacity: 0.35,
        }}
      />
    </div>
  )
}
