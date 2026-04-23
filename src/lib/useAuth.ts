// ──────────────────────────────────────────────────────────────────────
// useAuth — React hook exposing the current Supabase session + the
// user's organization context.
//
// One subscription per app instance via onAuthStateChange. Every
// component that needs auth state (App shell, SettingsView, etc.) calls
// this hook and gets the same singleton state through Zustand.
//
// State shape:
//   - session       — Supabase Session | null
//   - user          — convenience accessor for session.user
//   - memberships   — rows from `memberships` joined with `organizations`
//   - activeOrg     — for now, the first (only) membership's org. When
//                     real Eidrix adds multi-org, this becomes a stored
//                     preference in user_metadata.
//   - isLoading     — true during initial session check + memberships fetch
//
// On SIGNED_OUT, the store wipes itself. Other tenant-data stores
// (customerStore) listen and clear their own state.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'

import { supabase } from './supabase'

interface MembershipRow {
  id: string
  organization_id: string
  role: 'owner' | 'admin' | 'member'
  organizations: {
    id: string
    name: string
  } | null
}

interface ActiveOrg {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
}

interface AuthStore {
  session: Session | null
  user: User | null
  memberships: MembershipRow[]
  activeOrg: ActiveOrg | null
  isLoading: boolean

  setSession: (session: Session | null) => void
  loadMemberships: () => Promise<void>
  signOut: () => Promise<void>
  reset: () => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  memberships: [],
  activeOrg: null,
  isLoading: true,

  setSession: (session) => {
    set({ session, user: session?.user ?? null })
  },

  loadMemberships: async () => {
    const { user } = get()
    if (!user) {
      set({ memberships: [], activeOrg: null })
      return
    }

    // Note: even with the helpful inner join hint, RLS still applies —
    // we'll only see memberships where user_id = auth.uid().
    const { data, error } = await supabase
      .from('memberships')
      .select('id, organization_id, role, organizations ( id, name )')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[useAuth] loadMemberships failed:', error)
      set({ memberships: [], activeOrg: null })
      return
    }

    const rows = (data ?? []) as unknown as MembershipRow[]
    const first = rows[0]
    const activeOrg: ActiveOrg | null =
      first && first.organizations
        ? {
            id: first.organizations.id,
            name: first.organizations.name,
            role: first.role,
          }
        : null

    set({ memberships: rows, activeOrg })
  },

  signOut: async () => {
    // Reset local state IMMEDIATELY so the UI flips to SignInPage
    // without waiting for the SIGNED_OUT callback. If the SDK call
    // hangs or fails, the user is at least back on the sign-in
    // screen rather than stuck on a "Settings" view that's
    // pretending the session is still active.
    set({
      session: null,
      user: null,
      memberships: [],
      activeOrg: null,
      isLoading: false,
    })

    // Fire and forget — even if this errors, local session is cleared
    // and the next page load will re-establish via getSession().
    void supabase.auth.signOut().catch((err) => {
      console.warn('[useAuth] supabase signOut failed:', err)
    })
  },

  reset: () =>
    set({
      session: null,
      user: null,
      memberships: [],
      activeOrg: null,
      isLoading: false,
    }),
}))

// ─── Module-level initialization ─────────────────────────────────────
// Runs ONCE when this module is first imported. The subscription lives
// for the lifetime of the page — it is never unsubscribed.
//
// Why not via useEffect: React.StrictMode (enabled in main.tsx) double-
// mounts every component in development, which calls useEffect cleanup
// between the two mounts. If we set up the auth subscription inside a
// useEffect, that cleanup tears it down — and the second mount, guarded
// against re-init, doesn't re-subscribe. Net result: SIGNED_IN events
// fire into nothing, the JWT lands in localStorage, but the React store
// never updates. The bug looks like "sign-in succeeds but UI freezes."
//
// Subscribing at module load sidesteps the React lifecycle entirely.
// The subscription is created exactly once, when useAuth is first
// imported anywhere in the app.

let initialized = false

function initializeAuth() {
  if (initialized) return
  initialized = true

  // Subscribe to ALL future auth changes — sign in, sign out, refresh.
  // No cleanup; this lives for the page's lifetime.
  //
  // CRITICAL: this callback is NOT async, and it does NOT await the
  // memberships fetch. Supabase-js v2 holds an internal auth lock
  // while this callback runs — and any `supabase.from(...)` query
  // waits for that lock. If we await loadMemberships in here, we
  // deadlock: the query waits for the lock, the lock waits for us
  // to return, we don't return until the query resolves. The
  // observable symptom: `loadMemberships called` logs but the query
  // result never logs, activeOrg stays null, and downstream code
  // ("no active workspace") fires. Stay sync; fire-and-forget the
  // membership fetch so the lock releases immediately.
  supabase.auth.onAuthStateChange((event, session) => {
    const store = useAuthStore.getState()
    if (event === 'SIGNED_OUT' || !session) {
      store.reset()
      return
    }
    store.setSession(session)
    void store.loadMemberships()
  })

  // Initial session check — wrapped in a 6s timeout so a hung SDK
  // call doesn't leave the app stuck on "Loading…" forever. If the
  // check hangs we fall through to "no session" and show SignInPage,
  // which is the correct user-facing default.
  const sessionTimeout = new Promise<{ data: { session: null } }>((resolve) =>
    setTimeout(() => resolve({ data: { session: null } }), 6_000),
  )

  Promise.race([supabase.auth.getSession(), sessionTimeout])
    .then(async ({ data }) => {
      useAuthStore.getState().setSession(data.session)
      if (data.session) {
        await useAuthStore.getState().loadMemberships()
      }
    })
    .catch((err) => {
      console.warn('[useAuth] getSession failed:', err)
    })
    .finally(() => {
      useAuthStore.setState({ isLoading: false })
    })
}

// Kick off initialization at module import time.
initializeAuth()

// ─── Hook entry point ────────────────────────────────────────────────
// Just returns the current store state. All wiring is module-level.

export function useAuth() {
  return useAuthStore()
}
