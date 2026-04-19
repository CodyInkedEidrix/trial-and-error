import { useState } from 'react'

/**
 * Reads a CSS variable's computed value from the live DOM at mount.
 * Lets the swatches display the actual hex from tokens.css instead
 * of a duplicated string in this component. Change tokens.css, the
 * displayed hex updates — single source of truth.
 */
function useTokenValue(name: string): string {
  const [value] = useState(() =>
    typeof window === 'undefined'
      ? ''
      : getComputedStyle(document.documentElement)
          .getPropertyValue(name)
          .trim()
  )
  return value
}

type SwatchProps = {
  token: string
  /** Which contrast color to use for the inner "Aa" indicator. */
  textColor: 'light' | 'dark'
}

function Swatch({ token, textColor }: SwatchProps) {
  const hex = useTokenValue(`--${token}`)
  const aaColor =
    textColor === 'light' ? 'var(--text-primary)' : 'var(--obsidian-950)'

  return (
    <div className="space-y-3">
      <div
        className="h-24 w-full rounded-md flex items-center justify-center"
        style={{ backgroundColor: `var(--${token})` }}
      >
        <span
          className="font-display text-2xl font-medium"
          style={{ color: aaColor }}
        >
          Aa
        </span>
      </div>
      <div>
        <p className="font-mono text-xs text-text-primary">{token}</p>
        <p className="font-mono text-xs text-text-tertiary">{hex || '…'}</p>
      </div>
    </div>
  )
}

type TextSampleProps = {
  token: string
  sample: string
}

function TextSample({ token, sample }: TextSampleProps) {
  const hex = useTokenValue(`--${token}`)

  return (
    <div className="grid grid-cols-[160px_1fr_auto] gap-4 items-baseline">
      <p className="font-mono text-xs text-text-tertiary">{token}</p>
      <p
        className="font-body text-base"
        style={{ color: `var(--${token})` }}
      >
        {sample}
      </p>
      <p className="font-mono text-xs text-text-tertiary">{hex || '…'}</p>
    </div>
  )
}

function PaletteLabel({ children }: { children: string }) {
  return (
    <p className="font-mono text-xs text-text-secondary uppercase tracking-[0.2em]">
      {children}
    </p>
  )
}

export default function ColorLab() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-24">
      {/* Section heading — matches TypographyLab's §N → pattern */}
      <header className="mb-16">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm text-[var(--cobalt-500)]">§02 →</span>
          <h2 className="font-display text-4xl font-medium text-text-primary">
            Color Lab
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
          4 palettes · 12 swatches · system://color online
        </p>
      </header>

      <div className="space-y-20">
        {/* ============================================================
            Obsidian palette — 4 stops, all dark, all light Aa
           ============================================================ */}
        <div className="space-y-6">
          <PaletteLabel>Obsidian · 4 stops</PaletteLabel>
          <div className="grid grid-cols-4 gap-4">
            <Swatch token="obsidian-950" textColor="light" />
            <Swatch token="obsidian-900" textColor="light" />
            <Swatch token="obsidian-800" textColor="light" />
            <Swatch token="obsidian-700" textColor="light" />
          </div>
        </div>

        {/* ============================================================
            Ember palette — 4 stops, contrast flips at 500
           ============================================================ */}
        <div className="space-y-6">
          <PaletteLabel>Ember · 4 stops</PaletteLabel>
          <div className="grid grid-cols-4 gap-4">
            <Swatch token="ember-900" textColor="light" />
            <Swatch token="ember-700" textColor="light" />
            <Swatch token="ember-500" textColor="dark" />
            <Swatch token="ember-300" textColor="dark" />
          </div>
        </div>

        {/* ============================================================
            Cobalt accent — single swatch, occupies first grid cell
           ============================================================ */}
        <div className="space-y-6">
          <PaletteLabel>Cobalt · accent</PaletteLabel>
          <div className="grid grid-cols-4 gap-4">
            <Swatch token="cobalt-500" textColor="dark" />
          </div>
        </div>

        {/* ============================================================
            Text roles — different layout, real prose in each color
           ============================================================ */}
        <div className="space-y-6">
          <PaletteLabel>Text · 3 roles</PaletteLabel>
          <div className="space-y-3">
            <TextSample
              token="text-primary"
              sample="Show up to the wrong moments."
            />
            <TextSample
              token="text-secondary"
              sample="Push the work forward by inches."
            />
            <TextSample
              token="text-tertiary"
              sample="The thing exists because you refused to wait."
            />
          </div>
        </div>
      </div>
    </section>
  )
}
