/// <reference types="vite/client" />

// Optional: type the specific env vars we read so import.meta.env.X is
// strongly typed everywhere. New env vars get added here when introduced.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** When 'true', dev-only surfaces (Agent Debug tab, etc.) render.
   *  Anything else (including unset) keeps them hidden. Set per
   *  Netlify deploy context — local + deploy previews on, production
   *  off. AC-02. */
  readonly VITE_DEV_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
