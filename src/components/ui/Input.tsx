import { useState, useId } from 'react'

interface InputProps {
  label: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  disabled?: boolean
}

export default function Input({
  label,
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
}: InputProps) {
  const [focused, setFocused] = useState(false)
  const id = useId()

  const hasError = Boolean(error)

  // Border + ring colors swap based on error state. Focus glow is
  // ember by default, red when the field is in an error state.
  const borderColor = hasError
    ? 'border-danger-500'
    : focused
      ? 'border-ember-500'
      : 'border-obsidian-700'

  const focusGlow = focused
    ? hasError
      ? 'shadow-[0_0_0_3px_rgba(229,72,77,0.18)]'
      : 'shadow-[0_0_0_3px_rgba(255,107,26,0.18)]'
    : 'shadow-none'

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-mono text-xs uppercase tracking-wider text-text-secondary"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`bg-obsidian-800 text-text-primary placeholder-text-tertiary px-3 py-2 rounded-md border transition-all duration-150 ease-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${borderColor} ${focusGlow}`}
      />
      {hasError && (
        <p className="font-mono text-xs text-danger-500 flex items-center gap-1.5">
          <span aria-hidden="true">•</span>
          {error}
        </p>
      )}
    </div>
  )
}
