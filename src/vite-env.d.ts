/// <reference types="vite/client" />

// Optional: type the specific env vars we read so import.meta.env.X is
// strongly typed everywhere. New env vars get added here when introduced.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
