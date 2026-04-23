# Real Eidrix — Architectural Notes

This document is the persistent memory of real-Eidrix architectural decisions surfaced during Trial and Error. Every decision here was either explicitly made or implicitly locked in during a curriculum chapter. When building real Eidrix, this document is the first thing to read.

Structure:
- **Locked decisions** are ones we've committed to and should not re-litigate
- **Open questions** are ones surfaced but deferred
- **Patterns to port** are specific code/architecture pieces from Trial and Error that should move to real Eidrix largely unchanged
- **What NOT to port** is things built in Trial and Error that real Eidrix should approach differently

---

## Core Product Thesis

**Eidrix is a universal operational OS for small business** — customer signs up, tells the app their business shape, app configures itself.

**Not:** a CRM for contractors. Not a vertical SaaS for a specific trade.

**Is:** an adaptable substrate where the app shape adapts to the business shape (contractor, merch seller, plumber, trailer rental, photographer, accountant, whoever comes next).

**End goal:** $100M SaaS. The pattern is that each new customer shape isn't a rewrite; it's a configuration.

---

## Model Strategy

**Locked decisions:**
- Production Eidrix runs **Claude Opus 4.7** by default for user-facing work
- Development/testing uses **Haiku 4.5** for cost, **Sonnet 4.6** for tool-calling iteration
- Model selection is per-task where it matters (quick responses → Sonnet; heavy reasoning → Opus)
- API key management uses the server-side pattern from Chapter 13 (never in the browser)

**Open questions:**
- BYOK (bring your own key) for customers vs. Eidrix-managed keys with markup pricing? Affects unit economics.
- Model fallback strategy when Opus is rate-limited or down
- How much of the chat UI should make model choice visible to the user vs. invisible

---

## Data Architecture

**Locked decisions:**
- **Durable business data** (customers, jobs, invoices, etc.) lives in **Postgres via Supabase**
- **Multi-tenancy from day one** — every table scoped by `organization_id`, enforced by Row Level Security
- **Local dev uses Supabase CLI** (Docker-based local stack) for fast iteration; cloud Supabase for staging and production
- **Schema is typed end-to-end** — Supabase generates TypeScript types, app uses them everywhere
- **Generated types are committed to the repo** at `src/types/database.types.ts`. Regenerate via `npx supabase gen types typescript --local > src/types/database.types.ts` after every schema change. Build is self-contained — no dependency on collaborators running the CLI to compile.
- **Helper function pattern for RLS membership checks:** one `public.is_member_of(target_org uuid)` function with `SECURITY DEFINER` and `SET search_path = public`. Every tenant-data table's RLS policies reference it. One function, many tables — DRY for both SQL maintenance and security review.
- **DB uses snake_case; TS uses camelCase.** Mapping layer lives inside each Zustand store (e.g., `customerStore.ts` has `dbRowToCustomer` and `customerInputToDbInsert`). Keep SQL idiomatic, keep TS idiomatic, no dual-naming compromises.
- **Seed data belongs in migration seed files**, not application code. Trial and Error's Chapter-10 `seedCustomers.ts` pattern was an anti-pattern — fresh users get an empty state, then real data flows in.
- **All Postgres functions lock their `search_path`** even if not `SECURITY DEFINER`. Defense-in-depth against schema-shadowing attacks. Empty (`set search_path = ''`) is fine for functions that only use built-ins; otherwise `set search_path = public`.
- **All RLS policies wrap `auth.uid()` calls in `(SELECT auth.uid())` subqueries.** Postgres hoists these as InitPlans (one evaluation per query) instead of evaluating per row. Critical at scale.
- **Hardening migrations are append-only.** Never edit a migration that's been applied. Add a new "harden_*" migration that fixes the issue. Keeps schema history reproducible.

**Open questions:**
- Separate Supabase project per environment (dev/staging/prod) — **provisional answer: yes**, one cloud project per environment. Trial and Error currently uses one cloud project; real Eidrix gets cleanly separated. Cheap at the current tier, clean isolation, no schema-cross-contamination risk. Confirm at the pre-build audit.
- When tenant count is high, shared-database vs per-tenant-schema vs per-tenant-database? Probably shared-database until 1000+ tenants, but mark the decision point.

---

## Memory Architecture (Agent Memory)

**Locked decisions:**
- **Chat messages are durable** — every conversation is saved, nothing ephemeral
- **Hybrid memory pattern** — chat messages persist in Postgres (audit, replay, compliance), semantic recall lives in a vector store (retrieval, "what did we talk about Tuesday")
- **Never put chat messages through a volatile memory system alone** — durability wins over elegance

**Open questions:**
- Which vector store: Supabase pgvector (same database), Pinecone, Turbopuffer, something else?
- Memory scope: per-user? per-organization? cross-organization (the user running multiple workspaces)?
- Memory decay — does old context fade or stay sharp indefinitely?
- Memory injection: always include recent context, or retrieve on-demand by semantic similarity?

---

## Auth & Multi-Tenancy

**Locked decisions:**
- **Email + password auth** as primary (revised from magic link). Magic link required Mailpit-style local mail capture in dev which broke too easily; password auth is reliable across local + cloud, and password managers cover the UX. Magic link can be added back as a SECONDARY option later if customers ask.
- **Organizations table** — every tenant is an organization
- **Users table + memberships table** — users can belong to multiple organizations (your brother's company and the merch guy's company both visible in one account)
- **Row Level Security (RLS)** on every table that holds tenant data — Postgres enforces isolation, not application code
- **Org auto-creation via Postgres trigger on `auth.users` insert.** Atomic — impossible to have a user-without-org state. Runs as `SECURITY DEFINER` with locked `search_path`. Real Eidrix replaces this trigger with the Sunday Interview flow (AC-03 territory) which generates a richer org with `BusinessConfig`. Same insertion point, richer payload.
- **Active org is implicit for single-membership users** (Trial and Error). For multi-org (real Eidrix), persist the preferred org in `auth.users.raw_user_meta_data` so it survives across devices. The store's `activeOrg` field becomes user-driven via an org picker.
- **`onAuthStateChange` callbacks must be SYNCHRONOUS** (no `async`, no `await` on supabase queries inside them). The callback runs inside supabase-js's auth lock; awaiting a query deadlocks. Trigger post-auth data loads as fire-and-forget via `void store.method()`. See Hard-Won Lessons.
- **Auth subscription is registered at module load**, not inside `useEffect`. React.StrictMode's double-mount cleanup kills useEffect-based subscriptions in dev. Module-level init avoids the React lifecycle entirely.
- **Sign-out is fire-and-forget locally + remote.** Local store state resets immediately; `supabase.auth.signOut()` is a void call with a `.catch` for logging. User never gets stuck on a signed-in view if the server call hangs.
- **Auth calls have explicit timeouts** (12s for sign-in/up, 6s for initial session check). No infinite spinners — failures surface as readable errors the user can act on.
- **Session refresh is silent** via Supabase JS's built-in autoRefreshToken. On refresh failure, `onAuthStateChange` fires SIGNED_OUT and the user lands on the sign-in page (with a future toast for "session expired").
- **Role enum: `owner | admin | member`.** Postgres enum, expandable via `alter type add value` without a migration rewrite. Trial and Error only uses `owner`; real Eidrix expands when staff invites land.

**Open questions:**
- Roles within an organization beyond the three-value enum (owner, admin, staff, viewer, custom)? Implement now or defer until real customers ask?
- SSO for enterprise tenants — defer until real demand
- Session management (how long before re-auth required?) — currently uses Supabase defaults; revisit when customer security requirements surface
- Multi-org switching UI — defer until a real customer has multiple orgs (likely once invites/staff are real)

---

## UI Architecture

**Locked decisions:**
- **Three-tier tab engine** (primary → secondary → record-detail as peer primary tabs) — the signature Eidrix pattern, proven in Chapter 10.5
- **BusinessConfig drives the tab structure** — different business types = different configs = different product, same engine
- **Records open as third-tier primary tabs**, not slide-ins or modals, in production
- **Slide-in panels** exist as a secondary pattern for quick adds or lightweight record views
- **Persistent tab state** — power users have many records open simultaneously, like Chrome tabs, with Chrome-style squishing when many are open
- **Cross-session persistent memory** — closing a tab doesn't lose unsaved state; reopening the same record shows where you left off

**Patterns to port:**
- `BusinessConfig` type and the engine from Chapter 10.5
- The three-tier rendering engine
- All UI primitives from Chapter 8 (Button, Card, Input, Badge)
- The Eidrix Eye component (AC-08a) with all six animation layers and seven reactions
- The Eye tuning config that emerged from AC-08b
- The streaming chat pattern from AC-01
- The motion language from Chapter 9 (Eidrix tempo: slow to move, fast to respond)
- Design tokens: warm obsidian + ember palette, typography scale, spacing scale

**Deferred to real Eidrix (not in Trial and Error):**
- Multi-tab stacking and Chrome-style squishing
- Rich multi-section record detail (stats + contact + documents + notes + activity log)
- Cross-session tab persistence
- Chat awareness of open record tabs (belongs in AC-02 eventually)

---

## Chat & Agent Behavior

**Locked decisions:**
- **Streaming responses always** — never wait-then-dump
- **System prompt establishes Eidrix voice** — dry, direct, trustworthy, never cheerful-AI
- **Server-side API calls only** — key never in browser, Netlify/Vercel Functions mediate
- **Per-tenant customizable system prompts** — merch seller's Eidrix, plumber's Eidrix, contractor's Eidrix all speak appropriately for their context
- **Chat is aware of user's current context** — open record tab, active filter, current view (AC-02 territory)

**Open questions:**
- Chat scope: one global conversation, one per record, or one per "session" where user can name them?
- How does Eidrix know when NOT to answer — when is "I'll route this to a human" or "I don't know, here's what I'd look at"?
- Voice and tone customization per tenant — how much to expose to the business owner?

---

## Tool Calling & Agentic Behavior

**Locked decisions (pending AC-03):**
- Tool calling will be built in AC-03; decisions there become locked here
- Agent must be able to CREATE/UPDATE/DELETE records via natural language
- Every destructive action gets the same undo pattern as Chapter 10
- Multi-turn agent loops (AC-05) — agent can take multiple steps for one request

**Open questions:**
- Tool permission model — does the user approve each tool call, or trust the agent based on config?
- Tool scoping — can a tool operate across tenants, across users, or only within the active context?

---

## Deployment & Infrastructure

**Locked decisions:**
- **Vercel for real Eidrix production** (Netlify was a temporary routing for Trial and Error due to Vercel account friction)
- **GitHub integration** with auto-deploy on push to main
- **Deploy Previews for every PR** — reviewers (you, brother, eventually customers) can click a URL to test before merging
- **Spending limits on all paid APIs** — Anthropic, Supabase, etc. — set before first use, raised only when needed
- **Rollback discipline** — production issues get rolled back via platform UI first, fixed in code second

**Open questions:**
- Custom domain for Eidrix — `eidrix.ai` or a new domain? Per-tenant subdomains vs. shared domain with routing?
- Monitoring/observability — Sentry for errors, or minimal until problems surface?
- Cost monitoring dashboard — Anthropic API spend, Supabase usage, Vercel bandwidth, all in one view

---

## Things That Worked in Trial and Error That Shouldn't Port Directly

- **localStorage for customer data** — port the UI, swap the backend to Supabase
- **Canned chat responses** — already deleted in AC-01; real Eidrix is real AI always
- **Session-only chat state** — real Eidrix has persistent memory
- **Single Eye preset** — real Eidrix may want per-tenant Eye personalities (calmer for a law office, more animated for a merch seller)

---

## Things Trial and Error Never Tackled That Real Eidrix Will Need

- Payment processing (Stripe)
- Email sending (transactional and marketing)
- File uploads and attachments (customer documents, proposals, photos)
- Mobile experience — at minimum a responsive UI, possibly a real native app later
- Notifications (in-app, email, eventually push and SMS)
- Onboarding flow ("Sunday Interview" — the conversation that generates the BusinessConfig for a new tenant)
- Customer portal — the tokenized view customers of business owners get (pay invoice, see job status, etc.)
- Reporting and analytics (revenue, customer growth, job completion metrics)
- Search across all records (AC-12 territory but not yet)
- Backup and disaster recovery

---

## The Sunday Interview

The signature onboarding flow for real Eidrix. Deserves its own section because it's the load-bearing product experience.

**Concept:** A business owner signs up, Eidrix asks them a series of questions about their business, Eidrix generates a `BusinessConfig` from their answers, the app configures itself around that config.

**Implications:**
- The interview itself is an agent conversation using tool calling (AC-03 pattern)
- The `BusinessConfig` type must be generatable from natural-language answers
- Mistakes in generation need graceful recovery (edit the config, rerun a question)
- Interview state persists so users can resume partway through

**Not tackled in Trial and Error; pure real-Eidrix work.**

---

## Hard-Won Lessons

*Footguns and gotchas surfaced during Trial and Error work. Each one cost real debugging time. Read before building real Eidrix's auth/data layer to avoid re-discovering them.*

### Supabase JS v2 — `onAuthStateChange` callbacks must NOT await DB queries

**Symptom:** auth events fire (SIGNED_IN logged), the membership/user-data fetch starts (`loadMemberships called` logged), but the query result never arrives. UI shows the user as signed in but downstream state (active org, etc.) stays null. App half-works in confusing ways.

**Cause:** supabase-js v2 holds an internal auth lock while the `onAuthStateChange` callback runs. Any `supabase.from(...)` query waits for that lock to release. If the callback `await`s a query, the callback can't return until the query resolves, the query can't resolve until the lock releases, the lock can't release until the callback returns. Deadlock.

**Fix:** the callback must be SYNCHRONOUS (no `async`). Trigger any post-auth data fetches as fire-and-forget (`void store.loadMemberships()`), so the lock releases immediately and the queries proceed.

**For real Eidrix:** every `onAuthStateChange` handler stays sync. Any data loading triggered by an auth state change uses `void` or fires through a separate event/effect outside the callback.

### React.StrictMode + useEffect-based Supabase subscriptions = dead subscription

**Symptom:** sign-in succeeds, JWT lands in localStorage, but the React store never updates and the UI doesn't transition out of the sign-in view.

**Cause:** Strict Mode mounts every component twice in dev. If you set up the auth subscription inside a `useEffect`, the cleanup runs between the two mounts. With a "subscribe once" guard, the second mount skips re-subscribing — leaving the subscription cleaned up and dead.

**Fix:** Subscribe to `onAuthStateChange` at module load time (a top-level call inside an `initialize()` function called once), NOT inside `useEffect`. The subscription lives for the page's lifetime. Strict Mode's lifecycle dance can't touch it.

**For real Eidrix:** `useAuth.ts` (or equivalent) has its subscription wired at module load. Components consuming auth state just read from the store; they never set up their own subscription.

### Windows: Hyper-V port reservations collide with Supabase defaults

**Symptom:** `supabase start` fails with "ports are not available: ... bind: An attempt was made to access a socket in a way forbidden by its access permissions." Auth/Studio/etc. can't bind their default ports.

**Cause:** Windows reserves a band of ports (often 53543-54342, includes Supabase's defaults at 54320-54329) for Hyper-V / WSL dynamic allocation. Containers can't bind into that range without admin override.

**Fix:** Edit `supabase/config.toml` and shift every port to a band Windows hasn't reserved (e.g., 55320-55329). Check excluded ranges with `netsh interface ipv4 show excludedportrange protocol=tcp`. Document the port shift inline in `config.toml`.

**For real Eidrix:** local-dev tooling on Windows boxes may need port-shifting. Capture the chosen ports in repo config so collaborators don't re-discover the issue. Mac/Linux dev machines are unaffected.

### Kong (Supabase API gateway) caches upstream container IPs

**Symptom:** `/auth/v1/*` returns 502 Bad Gateway even though `docker ps` shows auth as healthy. Auth process logs show it bound to its port and is ready. Direct curl to the auth container works; through Kong it doesn't.

**Cause:** `supabase db reset` (and other operations that recreate containers) gives containers new IPs on the Docker bridge network. Kong's upstream config holds onto the OLD IP. Requests get routed to a non-existent container.

**Fix:** `supabase stop && supabase start` re-orchestrates the network and Kong picks up the new IPs. Targeted `docker restart kong` may also work.

**For real Eidrix:** the production Supabase managed service handles this automatically. Local-dev pain only.

### Vite dev server doesn't serve Netlify Functions

**Symptom:** chat (or any function-backed feature) returns 404 in local dev (`npm run dev`) at `localhost:5173`, even though it works in production.

**Cause:** `npm run dev` only runs Vite, which serves the React app. Netlify Functions are served by Netlify's edge in production, not by Vite. The relative path `/.netlify/functions/...` resolves to `localhost:5173/.netlify/functions/...` which 404s.

**Fix (two options):**
- Add a Vite `server.proxy` entry that forwards `/.netlify/functions/*` to the deployed production URL. Trade-off: local dev hits real APIs (real costs), can't develop functions locally.
- Use `netlify dev` instead of `npm run dev`. Spins up Vite + functions runtime together at port 8888. Required when actively modifying functions.

**For real Eidrix:** same applies on Vercel — `vercel dev` vs `npm run dev`. The proxy pattern is platform-agnostic.

---

## Changelog

*Updated whenever a chapter locks a new decision or resolves an open question.*

- **April 22, 2026** — Document created after AC-01 as the persistent architectural memory for real Eidrix.
- **April 22, 2026** — Added Hard-Won Lessons section after Chapter 14 build session surfaced five footguns: supabase-js auth callback deadlock, StrictMode-killed subscriptions, Windows Hyper-V port reservations, Kong stale upstream IPs, Vite-doesn't-serve-functions. Each cost real time to diagnose.
- **April 22, 2026** — Chapter 14 (Supabase Foundation) shipped. Multi-tenant schema, RLS, email+password auth all rehearsed in Trial and Error. Major Data Architecture and Auth section updates: locked the `is_member_of` helper-function pattern, snake/camel mapping at the store boundary, generated-types-committed-to-repo, append-only hardening migrations, sync onAuthStateChange callbacks, module-level auth subscription, defensive timeouts, fire-and-forget sign-out. Switched from magic link to email+password as primary auth. Resolved (provisionally): one Supabase project per environment.
