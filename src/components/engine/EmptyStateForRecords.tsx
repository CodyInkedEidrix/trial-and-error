// ──────────────────────────────────────────────────────────────────────
// EmptyStateForRecords — generic empty state for any record type.
//
// Replaces the customer-specific EmptyState. The card-stack glyph and
// ember plus are preserved — they read as "record slot waiting to be
// filled" regardless of what the records are. Copy uses the config's
// singular/plural labels so messaging stays accurate per business type.
// ──────────────────────────────────────────────────────────────────────

import Button from '../ui/Button'

interface EmptyStateForRecordsProps {
  singular: string
  plural: string
  onAdd?: () => void
}

export default function EmptyStateForRecords({
  singular,
  plural,
  onAdd,
}: EmptyStateForRecordsProps) {
  const lowerSingular = singular.toLowerCase()
  const lowerPlural = plural.toLowerCase()

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 -mt-12">
      {/* Three stacked cards + ember plus — the same glyph as the
          customer-specific version. Reads as "record stack waiting to
          be filled" for any record type. */}
      <div className="relative w-24 h-24 mb-6 opacity-40">
        <div className="absolute inset-x-3 top-2 bottom-12 rounded-md border border-obsidian-700" />
        <div className="absolute inset-x-2 top-5 bottom-8 rounded-md border border-obsidian-700/80 bg-obsidian-900/40" />
        <div className="absolute inset-x-1 top-9 bottom-2 rounded-md border border-obsidian-700 bg-obsidian-900/60 flex items-center justify-center">
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
        No {lowerPlural} yet
      </h2>

      <p className="font-body text-sm text-text-tertiary mt-2 mb-6 text-center max-w-sm">
        Add your first {lowerSingular} to start tracking. Everything stays
        here on your device.
      </p>

      {onAdd && (
        <Button label={`Add your first ${lowerSingular}`} onClick={onAdd} size="md" />
      )}

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
