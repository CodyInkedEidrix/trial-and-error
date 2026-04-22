// ──────────────────────────────────────────────────────────────────────
// SubTabBar — renders a single tier of sub-tabs (secondary OR tertiary).
//
// Pure presentation. Caller provides:
//   - items to render
//   - which is active
//   - click handler
//   - tier level (visual weight differs slightly between secondary and
//     tertiary so users can parse hierarchy at a glance)
// ──────────────────────────────────────────────────────────────────────

interface SubTabItem {
  id: string
  label: string
}

interface SubTabBarProps {
  items: SubTabItem[]
  activeId: string
  onSelect: (id: string) => void
  /** 2 for secondary (right below primary), 3 for tertiary (below
   *  secondary). Affects weight/contrast — tertiary is quieter. */
  level: 2 | 3
}

export default function SubTabBar({
  items,
  activeId,
  onSelect,
  level,
}: SubTabBarProps) {
  if (items.length === 0) return null

  // Secondary sits directly under the primary bar with more weight;
  // tertiary sits under secondary with quieter presence.
  const containerClass =
    level === 2
      ? 'flex-shrink-0 flex gap-1 px-6 py-1.5 border-b border-obsidian-800 bg-obsidian-900/50'
      : 'flex-shrink-0 flex gap-1 px-6 py-1 border-b border-obsidian-800/60 bg-obsidian-900/30'

  const buttonBase =
    level === 2
      ? 'relative px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors outline-none focus-visible:shadow-[0_0_0_2px_rgba(255,107,26,0.55)] rounded'
      : 'relative px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors outline-none focus-visible:shadow-[0_0_0_2px_rgba(255,107,26,0.55)] rounded'

  return (
    <nav className={containerClass} aria-label={`Level ${level} navigation`}>
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`${buttonBase} ${
              active
                ? 'text-ember-300'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            {item.label}
            {active && (
              <span
                aria-hidden
                className="absolute left-0 right-0 -bottom-[5px] h-[2px] bg-ember-500"
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
