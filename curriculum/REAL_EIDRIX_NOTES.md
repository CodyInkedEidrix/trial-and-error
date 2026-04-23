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
- **Sonnet 4.6 is the production default** for context-aware chat (AC-02 onward). Pricing/quality balance hits the right spot for operator-style queries against relational data. Opus 4.7 is the upgrade path when complex reasoning is needed.
- **Three-tier model offering** in agent_settings: Haiku 4.5 ($1/$5 per 1M), Sonnet 4.6 ($3/$15), Opus 4.7 ($5/$25). Real Eidrix may default users to Sonnet without exposing the choice; Trial and Error exposes all three for learning-mode testing.
- **Anthropic naming convention shift (Apr 2026)** — for Opus 4.7 and Sonnet 4.6, the alias and pinned ID are the same string (`claude-opus-4-7`, `claude-sonnet-4-6`). Only Haiku 4.5 retains the date-suffix convention (`claude-haiku-4-5-20251001`). Both forms are equally stable per Anthropic's docs. New models added via `alter type ... add value` (one-line migration).
- **Cost visibility is non-negotiable.** The Debug tab's per-request cost + cumulative session cost trains intuitive discipline ("don't leave Opus on for testing"). Real Eidrix preserves this in an admin/owner-facing surface.
- **API key management uses the server-side pattern from Chapter 13** (never in the browser).

**Open questions:**
- BYOK (bring your own key) for customers vs. Eidrix-managed keys with markup pricing? Affects unit economics.
- Model fallback strategy when Opus is rate-limited or down
- How much of the chat UI should make model choice visible to the user vs. invisible
- **Per-request model routing** — should Eidrix auto-pick Haiku for simple lookups, Sonnet for general queries, Opus for "thinking" prompts? AC-02 sets the model at session level via Settings; production may want per-message routing based on query classification. Pre-build audit decision.

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
- **Relational entities follow the same shape — both schema-side and store-side.** Jobs (AC-02) is a near-identical structural copy of Customers (Ch 14): same `is_member_of(organization_id)` RLS pattern, same snake/camel mapping at the store boundary, same async/optimistic CRUD shape with rollback, same module-level subscription to authStore for auto-load. The repeatability is the proof — real Eidrix's Customer → Job → Invoice → LineItem chain is N copies of the same template, not N hand-built integrations.
- **The engine is genuinely entity-agnostic.** AC-02 added Jobs as a primary tab and Agent Debug as a primary tab via `BusinessConfig.primaryTabs[]` — zero edits to TabsPanel, RecordListView, RecordDetailView, or any engine file. Validates Chapter 10.5's architecture at scale; real Eidrix gets the engine portable as-is.

**Open questions:**
- Separate Supabase project per environment (dev/staging/prod) — **provisional answer: yes**, one cloud project per environment. Trial and Error currently uses one cloud project; real Eidrix gets cleanly separated. Cheap at the current tier, clean isolation, no schema-cross-contamination risk. Confirm at the pre-build audit.
- When tenant count is high, shared-database vs per-tenant-schema vs per-tenant-database? Probably shared-database until 1000+ tenants, but mark the decision point.

---

## Memory Architecture (Agent Memory)

**Locked decisions (AC-04):**

*Persistence layer:*
- **Chat messages are durable** — every conversation is saved, nothing ephemeral
- **Two message roles, not four** (`user` / `assistant`). Tool interactions live in `messages.metadata.toolCalls` (jsonb) rather than as separate `tool_call` / `tool_result` rows. Keeps row counts predictable, keeps fact-extraction targets clean (only user + assistant text is ever extracted from), aligns with how Anthropic's API already bundles tool_use blocks inside assistant messages.
- **`conversation_id` is a real UUID** with a `conversations` row, not a magic string. One conversation auto-upserted per user-org on sign-in. Multi-conversation UI (create, name, switch) is deferred — schema supports it today, UI layer doesn't expose it yet.
- **User-scoped RLS reads** on `messages`, `conversations`, `memory_facts`, `memory_fact_embeddings`. A member of an org can NOT read another member's conversation history or memories, even if they share the org. Privacy-first default. Real Eidrix will eventually expose this as a per-tenant setting — small businesses with shared operational memory may opt in to org-scoped reads; professional-services tenants (legal, accounting) keep strict isolation.
- **`WITH CHECK` clauses on all UPDATE policies** (hardening migration) so a user can't mutate their own row's `organization_id` / `user_id` to values outside their membership.

*Extraction layer:*
- **Extract signal, don't embed raw messages.** Messages are noisy — chat + small talk + signal mixed. Extracting typed facts (preference / rule / context / commitment / observation) from each user turn gives retrieval a high-SNR surface. See AC-04 chapter's "layered memory" tour moment.
- **Haiku 4.5 as the extraction model.** Structured-output pattern-matching task, not reasoning. ~3× cheaper than Sonnet, fast enough for background work. Verified on the 8-message stress battery; flip to Sonnet only if a future quality regression demands it.
- **Two-tool structured output** — `record_fact` and `no_facts_found` under `tool_choice: any`. Forces a decisive output every turn; no JSON-parse fragility, no ambiguous text responses. Either one-or-more `record_fact` calls OR exactly one `no_facts_found`.
- **`-background.ts` Netlify function for extraction**, fired from the client after the assistant turn persists. Netlify queues background functions independently (15-min budget); naive fire-and-forget to a regular function is NOT safe on serverless. Real Eidrix graduates to a proper queue (Inngest / Trigger.dev / pg-cron work queue) at ~tens of thousands of daily extractions for observable retry + dead-letter handling.
- **Guardrails**: confidence ≥ 0.6 required, max 3 facts per message, exact-content dedupe against existing active facts. AbortController cancels the Anthropic call on an 8s timeout. Dedupe runs BEFORE the 3-fact cap so unique-on-top-of-duplicates survives.
- **Entity registry compiled from customers/jobs/proposals** and passed to the extraction prompt — resolves "Alice" → `entity_id` at extraction time. Invalid or unmatched names become `entity_id: null` rather than hallucinated IDs.

*Embedding + retrieval layer (Session 2):*
- **pgvector + Supabase, not a separate vector DB.** Everything in one Postgres. Lower ops burden, same consistency story, no data-movement between systems, RLS still applies.
- **Separate `memory_fact_embeddings` table** (not a column on `memory_facts`). Chapter-locked design for independence: embeddings are a cache; you can truncate the embeddings table and re-derive from `memory_facts.content`. You cannot do the reverse.
- **Voyage-3 as the embedding provider**, 1024 dims. Anthropic-aligned partner, free tier is plenty for early scale (~200M tokens), $0.02 per 1M tokens afterwards. `model_version` column tracks which model produced each row so provider / model switches become a backfill job rather than a data migration.
- **"Content is source of truth; embeddings are cache"** — locked principle. `memory_facts.content` stays plain text in Postgres forever. Losing embeddings is recoverable in a batch job; losing content isn't.
- **HNSW index** (not ivfflat) with `vector_cosine_ops`. Slower to build, faster to query; correct tradeoff for a workload that embeds on-write and queries on-read.
- **`match_memory_facts` RPC** with `security_invoker` + `user_id_filter` param — RLS is enforced AND an explicit user-id gate at the call site (defense in depth). Returns similarity as `1 - cosine_distance` for intuitive 0-1 scoring.
- **Top-K = 8** as the retrieval default. Hardcoded for Trial and Error; real Eidrix exposes it per-tenant and potentially auto-tunes based on memory density.
- **Retrieval injected as a new prompt layer** between workspace overview and business data. Grouped by fact_type for Claude's reading order (preferences + rules first, then commitments, context, observations). Empty retrieval omits the block entirely — fresh users don't see a meaningless placeholder.
- **`input_type: 'document'` vs `'query'`** at Voyage call time — stored facts are documents, incoming user messages are queries. ~5-10% retrieval quality lift for one field in the API call.
- **Re-embed on edit**, fire-and-forget via a dedicated `/reembed-fact-background` function. Memory UI saves content → store updates optimistically → background function regenerates the embedding.

*UI + observability:*
- **Memory UI in Settings is the trust surface.** Users see every fact, can search, filter, edit (triggers re-embed), forget (soft delete with confirmation), and export (JSON download). Transparency makes memory collaboration; without it, memory becomes surveillance. GDPR / CCPA compliance is mostly handled by this UI.
- **Debug tab retrieval trace** with similarity score + color-coded relevance + "used" badge (4+ consecutive words of fact content found in response text). Answers "did Claude actually use the memory I expected?" per turn.
- **Soft delete, not hard delete.** `is_active = false` excludes a fact from retrieval + UI but preserves the row for audit / undo scenarios. Hard delete via a permanent-delete flow is deferred to real Eidrix.

**Deferred to real-Eidrix work (NOT built in AC-04):**
- **Fact decay** — weighting old facts lower over time. Needs real usage data to calibrate the decay curve.
- **Conflict resolution** — when "Alice prefers mornings" and "Alice prefers afternoons" both exist as active facts, what does retrieval surface? Today: both. Real Eidrix: either pin a "canonical" winner via user action, or let retrieval present both and let Claude reason.
- **Implicit retraction** — a fact not reinforced in N months might be stale even if never explicitly contradicted. Needs a scoring model, not just age-based decay.
- **Entity dissolution cleanup** — when a customer is deleted, what happens to their facts? Today: facts remain, display shows `(deleted)`. Real Eidrix: either cascade-soft-delete, or keep as historical — tenant-configurable.
- **Cross-user memory in the same org** — per-tenant setting (mentioned above). Some orgs want shared operational memory; professional services keep strict isolation.
- **Cross-tenant learning** — aggregating "most contractors prefer morning callbacks" across tenants. Privacy question; probably never.
- **Proactive memory surfacing** — "You mentioned Alice's birthday last month; it's next Tuesday." Active push, not just retrieve-on-query.
- **Graph relationships between facts** — "Bob's kitchen job requires morning schedule → Bob is seasonal → schedule around his wife's flight schedule" as connected triples. Today facts are flat; real Eidrix may graduate to a lightweight knowledge graph.
- **Semantic dedupe at write time** — today's dedupe is exact-content-match. Real dedupe: "User prefers morning callbacks" and "Prefers mornings for callbacks" should collapse.
- **Paging in the Memory UI** — all facts load today (fine at ≤ 1k facts; real Eidrix at 10k+ per user needs virtualization + server-side pagination).
- **Background function → proper queue** graduation — Netlify `-background` is production-grade for moderate scale; at tens of thousands of daily extractions, queue-with-retry wins.
- **Conversation naming + multi-conversation UI** — schema supports it; real Eidrix ships the UI when multi-session use cases justify it.

**Open questions:**
- What's the right Top-K for real-Eidrix tenants? Empirical question, needs real usage data. Default 8 is a starting point.
- At what tenant size does hnsw on pgvector stop performing well? Probably 1M+ facts per tenant; flag for monitoring.
- Memory staleness policy — when do we start scoring down? Needs product decision + usage signal.

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
- **System prompt establishes Eidrix voice** — dry, direct, trustworthy, never cheerful-AI by default; per-tenant customization makes humor/personality opt-in
- **Server-side API calls only** — key never in browser, Netlify/Vercel Functions mediate
- **Per-tenant customizable system prompts** stored in `agent_settings` table, not hardcoded — merch seller's Eidrix, plumber's Eidrix, contractor's Eidrix all configurable
- **Three context modes** (`off` / `subset` / `full`) controlled per-org. Smart Subset is the production default — it captures recent customers + customers with open jobs + their open jobs, plus org-wide totals. Enough signal for most operator queries; cheap on tokens.
- **Structured-data injection format**, never prose. Pipe-separated fields, dashes for absent values, headers with em-dash counts (`CUSTOMERS — 12 of 47 shown`), totals at the bottom. Claude reasons dramatically better on this format than on prose descriptions of the same data.
- **JWT pass-through (not service role)** for server-side data fetches. The function creates a per-request Supabase client with the user's JWT so RLS enforces tenant isolation at the database layer. Defense in depth — any code-level bug becomes "zero rows returned" instead of a cross-tenant data leak.
- **Lazy-upsert defaults** mirrored on both client (Settings UI) and server (chat function). Either path can hit first; both converge on the same defaults defined as constants in their respective files. When real Eidrix moves defaults to a config table or per-tenant template, the convergence guarantee survives.
- **Conversation history is the in-session "memory"** — no separate memory layer at this stage. Context-mode toggles affect ONLY the injected business-data block; previous assistant responses in the messages array still convey domain knowledge from earlier turns. Persistent cross-session memory is AC-04.
- **Observability is a first-class feature, not a debug afterthought.** The Agent Debug tab (dev-only via `VITE_DEV_MODE`) shows the full system prompt sent, the messages array, the response, token counts, response time, and per-request cost. Real Eidrix preserves this pattern as an internal/admin surface — exposed to support staff, not end users.
- **Cumulative session cost** displayed in the Debug tab. Visceral cost feedback during testing trains the discipline of not leaving Opus on for casual chat.
- **Ambient workspace overview** is always injected into the system prompt regardless of `context_mode`. Six-line aggregate block: customer/job/proposal counts broken down by status. O(1) in tenant size (grouped counts, not row data), scales cleanly to millions of rows. Rationale: even with `context_mode = 'off'`, the agent needs a sense of the workspace SHAPE — "how many leads?" should be answerable without a tool round trip. Adding 6 tokens of orientation to every request dramatically improves tool choice and lets broad operator questions ("what should I focus on today?") have something to ground against. See Chat & Agent Behavior > Layered context model below.

### Layered context model (post-ambient-overview refactor)

The `off` / `subset` / `full` mental model proved too flat. What the agent actually sees is a STACK of independently-toggled layers, each with its own cost curve:

| Layer | What | Token size | Always on? | Cost scaling |
|---|---|---|---|---|
| Voice + rules | `settings.system_prompt` | ~300 tokens | ✅ | O(1) |
| UI context | Where the user is looking (tab, record, section) | ~50 tokens | ✅ | O(1) |
| **Workspace overview** | Aggregate counts by status across all entities | ~30 tokens | ✅ | O(1) |
| Business data — subset | Recent customers + open-status jobs + their relations | ~hundreds | opt-in | O(active work) |
| Business data — full | Every customer + every job | ~thousands-to-millions | opt-in | O(total rows) |
| *(future)* Record-scoped | Full record data for whatever's on screen | ~100 tokens | ✅ when a record is open | O(1) |
| *(future)* Recent-activity | Last N minutes of mutations | ~100-500 tokens | opt-in | O(activity rate) |

The three always-on layers combine to ~400 tokens — a fixed cost that scales to any tenant size. Opt-in layers are where token spend tunes to operational value.

**Real Eidrix implementation path:**
1. Ship the always-on layers (voice, UI context, overview) — DONE as of AC-03 + this follow-up
2. Build record-scoped auto-inject: when `activeRecord` is present, inject the full record's row data (not just id/name). "His jobs" stops needing a tool call.
3. Add Anthropic prompt caching for the subset/full blocks — 5-minute TTL, 10% of input cost on cache hit. This makes full-mode viable on moderately-sized tenants where it was previously prohibitive.
4. Revisit the Settings UX — the 3-way toggle may become a layered checklist ("include UI-scoped data", "include recent activity", "include full data") rather than off/subset/full.

**Open questions:**
- At what tenant size does the overview's aggregate query cost matter? Today we fetch `id + status` for each entity; at 100k+ rows it becomes a ≥100ms query. Fallback: a dedicated aggregates view refreshed via trigger, read in O(1).
- Should overview include time-window counts ("3 customers added this week")? Useful for operator orientation; adds complexity.
- Query-classifier approach: a tiny pre-call that classifies the user's query and injects only the relevant slice. Probably overkill until tenant data is huge.

**Open questions:**
- Chat scope: one global conversation, one per record, or one per "session" where user can name them?
- How does Eidrix know when NOT to answer — when is "I'll route this to a human" or "I don't know, here's what I'd look at"?
- Voice and tone customization per tenant — how much to expose to the business owner? (Trial and Error exposes everything — production may want to gate certain settings to org-owners only.)
- Smart Subset selection logic — Trial and Error uses recency (last 30 days) + open status. Real Eidrix at scale may need per-tenant tuning of these heuristics, or a smarter subset (e.g., LLM-driven "what data is relevant to this user query?") rather than fixed rules.
- "Clear conversation" UX — currently only happens via page refresh. Worth a small button in the chat column eventually (out of scope for AC-02).

---

## Tool Calling & Agentic Behavior

**Locked decisions (AC-03):**
- **Tool definitions live in Anthropic's native format** under `netlify/functions/_lib/tools/schemas.ts`. One schema array, one registry mapping name → executor. Real Eidrix ports this layout wholesale.
- **Server-side execution loop in the Netlify Function.** The function calls `anthropic.messages.stream()` per iteration, forwards text events to the client, holds tool_use events server-side, executes tools, loops until `stop_reason === 'end_turn'` or the iteration cap. Iteration cap is 10 — generous for most flows, hard ceiling against runaway loops.
- **Tools execute under the USER'S JWT**, never a service role. Per-request Supabase client is the RLS boundary. A bug that forgot an `organization_id` filter becomes "zero rows" rather than a cross-tenant leak. Non-negotiable at scale.
- **Parallel tool execution within an iteration** via `Promise.all`. Dependent operations naturally serialize across iterations (Claude sees tool_result → next turn calls the next tool). Don't try to order within-iteration tools.
- **TOOL_AFFECTS lookup** maps each write tool to the client-side store it mutates. The chat function emits `affectedEntities: string[]` in the final usage event; the client refetches only those stores. Read-only turns cost zero refetches.
- **Destructive operations use cryptographic two-phase commit.** Phase 1: executor returns `{requires_confirmation: true, summary, confirmation_token}` where the token is an HMAC of `{action, paramsHash, orgId, userId, issuedAt}` under a server-side secret with a 5-minute TTL. Phase 2: executor validates the token matches the exact action + params + user before performing the mutation. **Security-critical:** a `confirmed: boolean` flag would rely on LLM cooperation; HMAC tokens make the policy machine-enforceable.
- **System prompt explicitly teaches the two-phase flow.** Destructive tool descriptions state it, and the main prompt repeats it. Ambiguity-resolution guidance lives in the same place: "explicit name mentions override UI context", "ask when resolving references with multiple matches", "vague requests get a clarification question".
- **Inline confirmation UI in chat.** When a `requires_confirmation` result comes back, the function emits a custom `eidrix_pending_action` SSE event; the client attaches it to the streaming assistant message; `PendingActionCard` renders Confirm / Cancel buttons alongside Claude's explanation. Resolved cards persist in chat history as an audit trail.
- **Destructive-commit rate cap per request** (currently 3). Belt-and-suspenders on top of iteration cap + token validation. A wildly confused agent still can't sweep-delete.
- **Input validation in every write executor** — email regex, phone length, amount bounds (max $10M), UUID format, text length caps (name 120, notes 5000). The server is the authoritative check; the UI's client-side validation is UX not security.
- **Result size caps** on all list/find/search tools (100 items default; 50 for nested arrays in `summarizeForCustomer`; 20 for fuzzy search). Cap metadata (`{truncated, total, shown}`) is returned so Claude can tell the user "showing 100 of 247" instead of silently omitting data.
- **UI context injection** — the client snapshots `{primaryTab, activeRecord?, activeSection?}` at send time and passes it in the request body; the function injects it as a system-prompt block between the base prompt and the business-data block. Always on, not gated by `context_mode` — it's tiny and always useful for reference resolution. Snapshot-at-send-time (not live-subscription) so intent reflects what the user saw when they asked.
- **Full-trace observability in the Agent Debug tab.** Each DebugEntry carries `uiContext`, `toolCalls[]`, `iterations`, `hitIterationCap`, `affectedEntities[]`. The Debug tab renders UI context as a grid and tool calls as an expandable timeline. "Why did Eidrix do X?" is answerable from this surface alone.
- **Structured tool-error visibility in the chat UI.** Failed tool calls surface as a per-message `toolErrors` badge with tool name + error, independent of Claude's paraphrase. Users see the real failure, not just the agent's narration.

**Deferred to real-Eidrix work (NOT built in AC-03):**
- **Audit log table** — every destructive commit should write to `audit_events` with `{who, when, what, params, ip, result}`. Needed for SOC2-style compliance and support-team "did Eidrix really do that" forensics. Trivial to add (one table, one insert call in `runConfirmed.commit`), deferred because AC-03 was already large.
- **Per-org rate limiting** — cap destructive actions per org per minute on top of the per-request cap. Defends against the very-rare "user repeatedly asks the agent to delete things" scenario. Redis or Postgres-row counter.
- **Idempotency keys** — dedupe retried tool calls (network blip retries, client reconnect storms). Generate a key per tool_use id, store in a short-lived table, return the cached result on replay.
- **Targeted "affected record ids" refresh** — Session 2 refetches the affected store entirely; a future refinement returns only the specific ids so large tenants don't reload the full list on every mutation.
- **Paging in list tools** — when `{truncated: true}`, let Claude ask for page 2. Requires a cursor param on the tool schemas.

**Open questions:**
- Token rotation on `EIDRIX_CONFIRM_SECRET` — rotating invalidates in-flight tokens. Graceful approach: accept last two secrets for the TTL window, remove the older one after 10 minutes. Build when rotation happens.
- Agent "dry run" mode — show what a complex turn would do without executing writes. Useful for debugging and for non-destructive power-user workflows.
- How aggressive to make the system-prompt destructive-action guardrails? Currently narrative; could be more structured with negative examples.

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
- **April 23, 2026** — AC-02 (Context-Aware Chat) shipped. Jobs entity added (relational to Customers, mirrors the customers store/RLS pattern exactly — first proof point that the entity template repeats cleanly). `agent_settings` table per org holds system_prompt + context_mode + model. Chat function reads settings at request time via JWT-pass-through, fetches business data RLS-scoped, injects as STRUCTURED text (pipes/dashes/totals — not prose). Three context modes: off / smart subset / full. Agent Debug tab provides per-request observability with token counts, response time, and cumulative session cost — gated by `VITE_DEV_MODE` build-time flag. Sonnet 4.6 is now the production default; Haiku 4.5 and Opus 4.7 also available. Anthropic naming convention shift noted (alias = pinned ID for 4.6/4.7 generation).
- **April 23, 2026** — AC-03 Session 1 (Agentic Foundation) shipped. Proposals entity added as the third rep of the Customer/Job template. 18 tools defined across customers/jobs/proposals + a general summarizeForCustomer. Server-side tool execution loop in `chat.ts` with streaming forward (text events) and buffered tool_use events. MAX_ITERATIONS=10 cap. DEFAULT_CONTEXT_MODE flipped to 'off' — with tools available, on-demand discovery beats preloaded data at scale. Client-side refresh after tool calls.
- **April 23, 2026** — AC-03 Session 2 (Agentic Behavior Layer) shipped. UI context injection (snapshotUiContext + prompt block between base prompt and data). Cryptographic HMAC confirmation tokens for destructive tools (not a `confirmed: boolean` flag — server-enforced two-phase commit so LLM cooperation isn't the security boundary). Inline Confirm/Cancel card in chat, resolved state preserved as audit trail. Targeted refresh via `affectedEntities` from the function — read-only turns cost zero refetches. Hardening layer: input validation (email/phone/amount/length/UUID), result size caps (100 default, 50 nested, 20 fuzzy), destructive-commit rate cap (3/request), structured tool-error visibility in chat. Agent Debug tab upgraded with UI-context grid and full tool-trace timeline. AC-03 complete.
- **April 23, 2026** — Ambient workspace overview shipped as a follow-up. Always-on aggregate block (customer/job/proposal counts by status) injected into the system prompt regardless of `context_mode`. O(1) in tenant size. Fixes the "off mode is flying blind" problem without compromising the tools-fetch-row-data discipline. Introduced the Layered Context Model in this document — reframes context injection from a 3-way toggle to a stack of layers, each independently sized and toggleable.
- **April 23, 2026** — AC-04 Session 1 (Persistence + fact extraction) shipped. Every chat message now persists to Postgres (`messages` + `conversations` tables with user-scoped RLS). Claude-driven fact extraction runs as a Netlify `-background.ts` function after each user turn — loads the message + 3 prior for context, compiles an entity registry from customers/jobs/proposals for name resolution, calls Haiku 4.5 with two tools (record_fact / no_facts_found under tool_choice:any), validates (confidence ≥ 0.6, max 3, dedupe), inserts into `memory_facts`. UX overlays (pendingAction, toolErrors) now persist in message metadata so they survive future multi-conversation resync. Hardening migration added `WITH CHECK` clauses to all three tables' UPDATE policies.
- **April 23, 2026** — AC-04 Session 2 (Embeddings + retrieval + Memory UI) shipped, completing AC-04. pgvector + `memory_fact_embeddings` table with hnsw cosine-distance index and a `match_memory_facts` RPC (security_invoker + user_id filter). Voyage-3 as the embedding provider with the "content as source of truth, embeddings are cache" escape-hatch principle. Hybrid retrieval at chat time injects top-K=8 semantically-relevant facts as a new prompt layer (grouped by fact_type, empty retrieval omits the block). Memory UI in Settings for full transparency — search, filter, edit (fires re-embed), soft-delete with confirmation, JSON export. Debug tab got a memory section with similarity color-coding + "used-in-response" heuristic badge. Eidrix now has durable cross-session memory; the substrate for real Eidrix's long-term tenant defensibility is complete.
