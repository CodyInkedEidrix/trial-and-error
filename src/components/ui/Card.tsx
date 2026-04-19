import type { ReactNode } from 'react'

type CardVariant = 'default' | 'bordered' | 'elevated'

interface CardProps {
  variant?: CardVariant
  children: ReactNode
  interactive?: boolean
  onClick?: () => void
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-obsidian-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
  bordered: 'bg-obsidian-900 border border-obsidian-700',
  elevated:
    'bg-obsidian-800 shadow-[0_8px_24px_rgba(255,107,26,0.08),_0_2px_8px_rgba(0,0,0,0.4)]',
}

const baseClasses = 'rounded-lg p-6'

const interactiveClasses =
  'cursor-pointer transition-all duration-200 ease-out hover:scale-[1.01] hover:shadow-[0_12px_28px_rgba(255,107,26,0.18),_0_2px_8px_rgba(0,0,0,0.5)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-900'

export default function Card({
  variant = 'default',
  children,
  interactive = false,
  onClick,
}: CardProps) {
  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} ${variantClasses[variant]} ${interactiveClasses} text-left w-full`}
      >
        {children}
      </button>
    )
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </div>
  )
}
