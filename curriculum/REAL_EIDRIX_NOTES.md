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

**Open questions:**
- Separate Supabase project per environment (dev/staging/prod), or single project with environment separation?
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
- **Magic link auth** (email-based passwordless) as primary
- **Organizations table** — every tenant is an organization
- **Users table + memberships table** — users can belong to multiple organizations (your brother's company and the merch guy's company both visible in one account)
- **Row Level Security (RLS)** on every table that holds tenant data — Postgres enforces isolation, not application code

**Open questions:**
- Roles within an organization (owner, admin, staff, read-only)? Implement now or defer?
- SSO for enterprise tenants — defer until real demand
- Session management (how long before re-auth required?)

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

## Changelog

*Updated whenever a chapter locks a new decision or resolves an open question.*

- **April 22, 2026** — Document created after AC-01 as the persistent architectural memory for real Eidrix.
