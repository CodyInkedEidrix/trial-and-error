// ──────────────────────────────────────────────────────────────────────
// ComingSoon — placeholder view for primary tabs that are scheduled
// for a future chapter. Extracted from TabsPanel so configs can reuse
// it for any not-yet-built primary tab.
// ──────────────────────────────────────────────────────────────────────

interface ComingSoonProps {
  label: string
}

export default function ComingSoon({ label }: ComingSoonProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-secondary">
        Coming soon
      </p>
      <div
        className="mt-3 h-px w-32"
        style={{
          background:
            'linear-gradient(to right, transparent, var(--ember-500), transparent)',
          opacity: 0.5,
        }}
      />
      <p className="font-body text-sm text-text-tertiary mt-3 text-center max-w-sm">
        The {label} tab will be built in a later chapter.
      </p>
    </div>
  )
}
