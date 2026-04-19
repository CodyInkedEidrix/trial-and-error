type BadgeVariant = 'default' | 'success' | 'warning' | 'info'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-obsidian-700 text-text-secondary',
  success: 'bg-success-500/15 text-success-500',
  warning: 'bg-ember-700/30 text-ember-300',
  info: 'bg-cobalt-500/15 text-cobalt-500',
}

export default function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-xs font-mono font-medium uppercase tracking-wider rounded-full whitespace-nowrap ${variantClasses[variant]}`}
    >
      {label}
    </span>
  )
}
