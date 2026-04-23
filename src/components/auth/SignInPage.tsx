// ──────────────────────────────────────────────────────────────────────
// SignInPage — the first surface every Eidrix user touches.
//
// Two-column atmospheric layout: Eye monument left, credentials column
// right. Stacks on mobile. Editorial typography, ember radial wash,
// SVG grain texture, staggered entrance choreography. Toggles between
// sign-in and sign-up; both modes go through email + password.
// ──────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { supabase } from '../../lib/supabase'
import EidrixEye from '../brand/EidrixEye'

type Mode = 'signin' | 'signup'

const EASE = [0.22, 0.61, 0.36, 1] as const

// Cap auth calls at 12s. Without this, a hung SDK call leaves the
// spinner spinning forever — worst possible UX.
const AUTH_TIMEOUT_MS = 12_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s.`)),
        ms,
      ),
    ),
  ])
}

export default function SignInPage() {
  const reducedMotion = useReducedMotion() ?? false

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const validEmail = email.includes('@') && email.trim().length > 3
  const validPassword = password.length >= 6
  const canSubmit = validEmail && validPassword && !submitting

  const submit = async () => {
    if (!canSubmit) return

    setSubmitting(true)
    setErrorMessage(null)

    const isSignIn = mode === 'signin'
    const actionLabel = isSignIn ? 'Sign-in' : 'Sign-up'
    const fallbackError = isSignIn
      ? "Couldn't sign in. Check your credentials and try again."
      : "Couldn't create your workspace. Try again."

    // Defensive try/catch + timeout: network failures (server down,
    // CORS, DNS) throw rather than returning {error}, AND the SDK can
    // hang if local session state is stale. Both end the same way —
    // user sees a clear error instead of an infinite spinner.
    try {
      const authCall = isSignIn
        ? supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })
        : supabase.auth.signUp({
            email: email.trim(),
            password,
          })
      const result = await withTimeout(authCall, AUTH_TIMEOUT_MS, actionLabel)

      if (result.error) {
        // Some upstream errors (e.g., 502 from a stale Kong route) come
        // back without a usable .message string — fall back to a
        // mode-specific generic so the user always sees readable text.
        const raw = result.error.message
        setErrorMessage(
          typeof raw === 'string' && raw.length > 0 ? raw : fallbackError,
        )
        setSubmitting(false)
        return
      }

      // Success path: useAuth's onAuthStateChange picks up SIGNED_IN
      // and App.tsx unmounts this page. No in-component nav needed.
    } catch (err) {
      const reason =
        err instanceof Error && err.message ? err.message : 'Unknown error'
      setErrorMessage(`Connection failed: ${reason}`)
      setSubmitting(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  const switchMode = (next: Mode) => {
    if (submitting || mode === next) return
    setMode(next)
    setErrorMessage(null)
  }

  // Reveal helper — opacity-only fallback for reduced-motion users.
  const reveal = (delay: number, y = 12) =>
    reducedMotion
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.4, delay, ease: EASE },
        }
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: EASE },
        }

  return (
    <div className="min-h-screen w-full bg-obsidian-950 text-text-primary relative overflow-hidden">
      {/* ─── Grain overlay ─────────────────────────────────────────
          Tactile noise texture sits over the whole canvas. Mix-blend
          overlay so it modulates the underlying ember tones rather than
          flatly veiling them. */}
      <svg
        aria-hidden
        className="pointer-events-none fixed inset-0 w-full h-full opacity-[0.07] mix-blend-overlay"
      >
        <filter id="signin-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#signin-grain)" />
      </svg>

      <div className="relative grid grid-cols-1 md:grid-cols-2 min-h-screen">
        {/* ═══════ Left: brand monument ═══════════════════════════ */}
        <section className="relative flex items-center justify-center px-8 py-16 md:py-0 overflow-hidden border-b md:border-b-0 md:border-r border-ember-700/15">
          {/* Atmospheric ember radial wash, anchored slightly below
              the Eye so the glow looks emitted from the monument. */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 56%, rgba(255,107,26,0.20) 0%, rgba(255,107,26,0.07) 28%, transparent 68%)',
            }}
          />

          {/* Quiet editorial index — top-left of column */}
          <motion.div
            {...reveal(0.05, 0)}
            className="absolute top-6 left-6 font-mono text-[10px] uppercase tracking-[0.22em] text-text-tertiary flex items-center gap-2"
          >
            <span className="text-ember-500 text-[14px] leading-none">●</span>
            Edition · I
          </motion.div>

          {/* Eye + brand stack — vertically centered, slightly above middle */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <motion.div
              initial={
                reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }
              }
              animate={
                reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
              }
              transition={{ duration: 0.75, delay: 0.1, ease: EASE }}
              className="mb-8 md:mb-10"
              style={{
                filter:
                  'drop-shadow(0 0 32px rgba(255,107,26,0.25)) drop-shadow(0 0 64px rgba(255,107,26,0.12))',
              }}
            >
              <EidrixEye size={200} state="idle" />
            </motion.div>

            <motion.h1
              {...reveal(0.25)}
              className="font-display text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[0.92] text-text-primary"
              style={{ fontWeight: 500 }}
            >
              Eidrix
            </motion.h1>

            <motion.p
              {...reveal(0.35)}
              className="mt-5 font-body text-base md:text-[17px] text-text-secondary max-w-[28ch] leading-relaxed"
            >
              The operational substrate for small business.
            </motion.p>
          </div>

          {/* Bottom meridian — editorial accent, only visible on md+ */}
          <motion.div
            {...reveal(0.6, 0)}
            className="hidden md:flex absolute bottom-7 left-7 right-7 items-center gap-4 font-mono text-[10px] uppercase tracking-[0.22em] text-text-tertiary"
          >
            <span>Workspace</span>
            <span className="flex-1 h-px bg-gradient-to-r from-ember-700/40 via-ember-700/20 to-transparent" />
            <span>Local · 127.0.0.1</span>
          </motion.div>
        </section>

        {/* ═══════ Right: credentials column ══════════════════════ */}
        <section className="relative flex items-center justify-center px-8 py-16 md:py-0">
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.45, ease: EASE }}
            className="w-full max-w-[380px]"
          >
            {/* Mode toggle — pill shape, ember on active */}
            <div className="inline-flex items-center gap-1 bg-obsidian-900/80 backdrop-blur-sm border border-obsidian-800 rounded-full p-1 mb-9">
              <ToggleButton
                active={mode === 'signin'}
                onClick={() => switchMode('signin')}
                label="Sign in"
              />
              <ToggleButton
                active={mode === 'signup'}
                onClick={() => switchMode('signup')}
                label="Sign up"
              />
            </div>

            {/* Mode-aware headline + subhead — animates on switch */}
            <motion.h2
              key={`h-${mode}`}
              initial={
                reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="font-display text-[34px] md:text-[38px] tracking-tight leading-[1.05] text-text-primary"
              style={{ fontWeight: 500 }}
            >
              {mode === 'signin'
                ? 'Welcome back.'
                : 'Create your workspace.'}
            </motion.h2>

            <motion.p
              key={`s-${mode}`}
              initial={
                reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05, ease: EASE }}
              className="mt-2 font-body text-[15px] text-text-secondary mb-8"
            >
              {mode === 'signin'
                ? 'Sign in to your workspace.'
                : "We'll spin one up for you. Takes a second."}
            </motion.p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-7">
              <FieldRow
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                disabled={submitting}
                autoComplete="email"
                placeholder="you@workshop.com"
                autoFocus
              />

              <FieldRow
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                disabled={submitting}
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                placeholder="••••••••"
                hint={
                  mode === 'signup'
                    ? 'Six characters, minimum.'
                    : undefined
                }
              />

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2 font-mono text-xs text-danger-500 leading-relaxed"
                >
                  <span aria-hidden className="mt-0.5">●</span>
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                aria-busy={submitting || undefined}
                className={`relative mt-1 font-mono uppercase tracking-[0.18em] px-6 py-4 text-sm rounded-md bg-ember-500 text-obsidian-950 transition-all duration-200 hover:shadow-[0_0_28px_rgba(255,107,26,0.5)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-950 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:shadow-none ${
                  submitting ? 'pointer-events-none cursor-wait' : ''
                }`}
              >
                <span className={submitting ? 'invisible' : ''}>
                  {mode === 'signin' ? 'Sign in →' : 'Create workspace →'}
                </span>
                {submitting && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span
                      aria-label="Working"
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                    />
                  </span>
                )}
              </button>
            </form>

            {/* Footer micro — voice + technical reassurance */}
            <motion.p
              {...reveal(0.85)}
              className="mt-10 font-mono text-[10px] uppercase tracking-[0.22em] text-text-tertiary leading-[1.7]"
            >
              No magic links. Just credentials.
              <br />
              <span className="text-text-tertiary/60">
                Multi-tenant · RLS-secured · Local-first
              </span>
            </motion.p>
          </motion.div>
        </section>
      </div>
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────

interface ToggleButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

function ToggleButton({ label, active, onClick }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/60 ${
        active
          ? 'bg-ember-500 text-obsidian-950 shadow-[0_0_16px_rgba(255,107,26,0.35)]'
          : 'text-text-tertiary hover:text-text-secondary'
      }`}
    >
      {label}
    </button>
  )
}

interface FieldRowProps {
  label: string
  type: 'email' | 'password' | 'text'
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  autoComplete?: string
  placeholder?: string
  hint?: string
  autoFocus?: boolean
}

function FieldRow({
  label,
  type,
  value,
  onChange,
  disabled,
  autoComplete,
  placeholder,
  hint,
  autoFocus,
}: FieldRowProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-tertiary">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder={placeholder}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        className="bg-transparent text-text-primary placeholder-text-tertiary/55 font-body text-[15px] px-0 py-2 border-0 border-b border-obsidian-700 focus:border-ember-500 focus:outline-none transition-colors duration-200 disabled:opacity-50"
      />
      {hint && (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-tertiary/70">
          {hint}
        </p>
      )}
    </div>
  )
}
