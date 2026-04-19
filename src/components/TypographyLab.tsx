export default function TypographyLab() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-24">
      {/* Section heading — system-status flavored */}
      <header className="mb-16">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm text-[var(--cobalt-500)]">§01 →</span>
          <h2 className="font-display text-4xl font-medium text-text-primary">
            Typography Lab
          </h2>
        </div>
        <div
          className="mt-3 h-px w-full opacity-50"
          style={{
            background:
              'linear-gradient(to right, var(--ember-500), transparent)',
          }}
        />
        <p className="font-mono text-xs text-text-tertiary mt-3">
          3 fonts · 8 samples · system://typography online
        </p>
      </header>

      <div className="space-y-20">
        {/* ============================================================
            Display showcase — Space Grotesk
           ============================================================ */}
        <div className="space-y-10">
          <p className="font-mono text-xs text-text-secondary uppercase tracking-[0.2em]">
            Display · Space Grotesk
          </p>

          <div>
            <p className="font-mono text-xs text-text-tertiary mb-4">
              Display L — text-7xl · 500
            </p>
            <p className="font-display text-7xl font-medium text-text-primary leading-tight">
              Show up to the wrong moments.
            </p>
          </div>

          <div>
            <p className="font-mono text-xs text-text-tertiary mb-4">
              Display M — text-5xl · 500
            </p>
            <p className="font-display text-5xl font-medium text-text-primary leading-tight">
              Push the work forward by inches.
            </p>
          </div>

          <div>
            <p className="font-mono text-xs text-text-tertiary mb-4">
              Display S — text-3xl · 500
            </p>
            <p className="font-display text-3xl font-medium text-text-primary leading-tight">
              The thing exists because you refused to wait.
            </p>
          </div>
        </div>

        {/* ============================================================
            Body showcase — IBM Plex Sans
           ============================================================ */}
        <div className="space-y-10">
          <p className="font-mono text-xs text-text-secondary uppercase tracking-[0.2em]">
            Body · IBM Plex Sans
          </p>

          <div>
            <p className="font-mono text-xs text-text-tertiary mb-4">
              Body — text-base · 400 Regular
            </p>
            <p className="font-body text-base font-normal text-text-primary leading-relaxed">
              Every session you don't quit, you compound. Every session you ship
              something small, you compound. Six months of small ships beats one
              mythical big launch — and the muscle you build by shipping is what
              eventually lets you build the launch.
            </p>
          </div>

          <div>
            <p className="font-mono text-xs text-text-tertiary mb-4">
              Body — text-base · 500 Medium
            </p>
            <p className="font-body text-base font-medium text-text-primary leading-relaxed">
              The reason it's ambitious is because nothing easy would make you
              feel this alive. The doubt isn't a sign you're doing it wrong —
              it's the sound of the work being big enough to matter.
            </p>
          </div>

          <div>
            <p className="font-mono text-xs text-text-tertiary mb-4">
              Body — text-base · 600 SemiBold
            </p>
            <p className="font-body text-base font-semibold text-text-primary leading-relaxed">
              Build today. Refine tomorrow. Ship the week after. Then do it
              again. The compounding is the only superpower you have, and most
              people quit before it starts paying out.
            </p>
          </div>
        </div>

        {/* ============================================================
            Mono showcase — JetBrains Mono
           ============================================================ */}
        <div className="space-y-10">
          <p className="font-mono text-xs text-text-secondary uppercase tracking-[0.2em]">
            Mono · JetBrains Mono
          </p>

          <div>
            <p className="font-mono text-xs text-text-tertiary mb-4">
              Code — text-sm · 400 Regular
            </p>
            <pre className="font-mono text-sm text-text-primary leading-relaxed bg-obsidian-900 rounded-md p-5 overflow-x-auto">
{`function buildTheThing() {
  while (notQuit) {
    today.show()
    today.refine()
    today.ship()
  }
  return momentum
}`}
            </pre>
          </div>

          <div>
            <p className="font-mono text-xs text-text-tertiary mb-4">
              Status line — text-sm · 500 Medium
            </p>
            <p className="font-mono text-sm font-medium text-text-secondary">
              status: building · momentum: high · doubt: managed · next-ship: today
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
