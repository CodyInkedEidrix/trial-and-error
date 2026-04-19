type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-ember-500 text-obsidian-950 hover:shadow-[0_0_20px_rgba(255,107,26,0.45)] disabled:hover:shadow-none',
  secondary:
    'bg-transparent text-text-primary border border-obsidian-700 hover:border-ember-700 hover:text-ember-300 disabled:hover:border-obsidian-700 disabled:hover:text-text-primary',
  tertiary:
    'bg-transparent text-text-secondary hover:text-text-primary disabled:hover:text-text-secondary',
  destructive:
    'bg-danger-500 text-text-primary hover:shadow-[0_0_20px_rgba(229,72,77,0.45)] disabled:hover:shadow-none',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

const spinnerSize: Record<ButtonSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export default function Button({
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={loading || undefined}
      onClick={onClick}
      className={`relative font-mono uppercase tracking-wider rounded-md transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${loading ? 'pointer-events-none cursor-wait' : ''} ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      <span className={loading ? 'invisible' : undefined}>{label}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            aria-label="Loading"
            className={`inline-block ${spinnerSize[size]} border-2 border-current border-t-transparent rounded-full animate-spin`}
          />
        </span>
      )}
    </button>
  )
}
