// ──────────────────────────────────────────────────────────────────────
// supabase — the shared Supabase client.
//
// One instance, used everywhere. Reads URL + anon (publishable) key from
// Vite env vars at build time. Anon key is browser-safe because every
// query goes through RLS at the Postgres layer.
//
// Local dev hits the Docker stack at 127.0.0.1:55321 (see .env).
// Production hits cloud Supabase via env vars set in the Netlify
// dashboard. Same code, different env, no in-app branching needed.
//
// ─── NEVER do this ───────────────────────────────────────────────────
// import { SUPABASE_SERVICE_ROLE_KEY } from '...' // ❌
// The service role key bypasses RLS. Browser code with that key can
// read every tenant's data. It lives ONLY in Netlify env (no VITE_)
// and ONLY in server-side Edge Functions if we ever add them.
// ──────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

import type { Database } from '../types/database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check .env (local) or Netlify env vars (production).',
  )
}

export const supabase = createClient<Database>(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // required for magic link callback handling
  },
})
