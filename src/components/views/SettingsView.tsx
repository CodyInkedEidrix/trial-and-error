// ──────────────────────────────────────────────────────────────────────
// SettingsView — Settings primary tab.
//
// Chapter 14 minimum: shows the signed-in user's email, their workspace,
// and a sign-out button. The rest (notification prefs, theme, billing,
// invites) lives behind future capability chapters.
// ──────────────────────────────────────────────────────────────────────

import { useAuth } from '../../lib/useAuth'
import Button from '../ui/Button'

export default function SettingsView() {
  const { user, activeOrg, signOut } = useAuth()

  return (
    <div className="h-full overflow-auto eidrix-scrollbar p-8">
      <div className="max-w-[640px] flex flex-col gap-8">
        <header>
          <h1 className="font-display text-2xl text-text-primary tracking-tight">
            Settings
          </h1>
          <p className="font-body text-sm text-text-secondary mt-1">
            Your account and workspace.
          </p>
        </header>

        {/* ─── Account ────────────────────────────────────────────── */}
        <section className="bg-obsidian-900 border border-obsidian-800 rounded-lg p-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-text-secondary mb-4">
            Account
          </h2>
          <dl className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-6 text-sm">
            <dt className="text-text-tertiary">Email</dt>
            <dd className="text-text-primary font-mono text-[13px]">
              {user?.email ?? '—'}
            </dd>
            <dt className="text-text-tertiary">User ID</dt>
            <dd className="text-text-tertiary font-mono text-[11px] truncate">
              {user?.id ?? '—'}
            </dd>
          </dl>
        </section>

        {/* ─── Workspace ──────────────────────────────────────────── */}
        <section className="bg-obsidian-900 border border-obsidian-800 rounded-lg p-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-text-secondary mb-4">
            Workspace
          </h2>
          <dl className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-6 text-sm">
            <dt className="text-text-tertiary">Name</dt>
            <dd className="text-text-primary">{activeOrg?.name ?? '—'}</dd>
            <dt className="text-text-tertiary">Role</dt>
            <dd className="text-text-primary capitalize">
              {activeOrg?.role ?? '—'}
            </dd>
          </dl>
        </section>

        {/* ─── Sign out ───────────────────────────────────────────── */}
        <section className="flex items-center justify-between bg-obsidian-900 border border-obsidian-800 rounded-lg p-6">
          <div>
            <h2 className="font-body text-sm text-text-primary">Sign out</h2>
            <p className="font-body text-xs text-text-secondary mt-0.5">
              Ends your session and returns to the sign-in screen.
            </p>
          </div>
          <Button
            label="Sign out"
            variant="secondary"
            size="sm"
            onClick={signOut}
          />
        </section>
      </div>
    </div>
  )
}
