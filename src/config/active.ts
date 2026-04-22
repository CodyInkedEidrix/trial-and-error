// ──────────────────────────────────────────────────────────────────────
// active.ts — the single line that chooses which business type the app
// is currently running as.
//
// This is the entire "same codebase, multiple products" mechanism. The
// engine reads `activeConfig`; everything else is configured from there.
//
// To swap business types for demo / testing / per-tenant deployment:
//   1. Change which config is imported as `activeConfig` below
//   2. No other code changes required
//
// In Real Eidrix this eventually becomes a tenant-scoped runtime
// selection (different logged-in users see different configs), but the
// shape of this file — one value, statically resolved at boot — is the
// clean starting point every alternative builds on.
// ──────────────────────────────────────────────────────────────────────

import { contractorConfig } from './contractor'
// import { merchConfig } from './merch'

export const activeConfig = contractorConfig
