# AC-04 — Agent Memory

*App Capability. The memory chapter. You're building the layered memory system that turns Eidrix from an agent that knows your data into an agent that knows you. Every conversation persists. Claude extracts durable facts from them. Facts get vector embeddings so they're retrievable by semantic meaning, not keyword match. Retrieval is hybrid (recent messages + relevant facts + ambient overview) and happens every request. A Memory tab in Settings lets the user see, edit, and delete what Eidrix has learned. About 5-6 hours across two sessions. Second-biggest chapter in the curriculum, but the most strategically important for real Eidrix's long-term value.*

---

## What you're learning

1. **The layered memory model** — why "dump conversation into a vector DB" isn't enough and what to layer on top
2. **Vector embeddings** — what they are, how they work, how Claude (and other LLMs) use them for semantic retrieval
3. **pgvector inside Postgres** — extending Supabase with vector search capabilities, keeping everything in one database
4. **Fact extraction from conversations** — Claude reads a turn, decides what's durable, stores it as typed memory
5. **Hybrid retrieval at chat time** — combining recent messages, top-K semantic facts, and ambient overview into a single context payload
6. **Async background work in a serverless context** — how to do post-response work without blocking the user
7. **Memory transparency as trust UX** — showing the user exactly what Eidrix has learned and letting them edit it
8. **The ephemeral-vs-durable distinction** — why not everything said becomes a fact, and how the agent decides

---

## What you're building

### Persistence layer

- `messages` Supabase table — every message ever sent, tenant-scoped, RLS-protected. Columns: id, organization_id, user_id, conversation_id (uuid — see below), role (user | assistant | tool_result | tool_call), content (text or JSONB for structured), timestamps
- Replaces the in-memory session state from AC-01. Chat now persists across refresh.
- Conversation grouping: `conversation_id` is a real UUID, one conversation auto-created per user-org on first message. **Real Eidrix divergence:** multi-conversation UI (name, create, switch) is deferred — but storing as a UUID from day one means it becomes a UI change later, not a schema migration.

### Fact extraction layer

- `memory_facts` Supabase table — typed, durable facts extracted from conversations. Columns: id, organization_id, user_id (fact owner — usually the speaker), content (text), fact_type (enum: preference | rule | context | commitment | observation), entity_type (nullable: 'customer' | 'job' | 'proposal' | null for general facts), entity_id (nullable fk), source_message_id (fk to messages), confidence (float 0-1), created_at, updated_at, is_active (bool — for soft deletes)
- After each meaningful user turn (user message with substantive content), a background function calls Claude with a specialized "extract facts" prompt and a structured output schema. Claude returns zero or more facts. Stored.
- The "extract facts" prompt is careful: extracts durable things, skips ephemeral ones. "I want tacos tonight" is not a fact. "I always prefer morning callbacks" is a fact.

### Vector embedding layer

- pgvector extension enabled on Supabase project (both local and cloud)
- Separate `memory_fact_embeddings` table — id, fact_id (fk), embedding (vector(1024) — Voyage's dimension), model_version (text — track which model produced the embedding so future re-embeddings are clean)
- When a fact is created, a background function generates its embedding via Voyage API and stores it
- Index on the embedding column for fast nearest-neighbor search (hnsw)

**Locked principle: `memory_facts.content` is the source of truth; embeddings are a cache.** Switching embedding providers in the future is a backfill job (iterate all active facts, regenerate embeddings, track via `model_version`) rather than a data migration. Never rely on the embedding as the only copy.

### Retrieval at chat time

Every chat request, the function:
1. Fetches recent messages (last N turns — configurable, default 20)
2. Embeds the user's new message via Voyage
3. Runs a vector similarity search against `memory_fact_embeddings` for top K matching facts (K = 8, configurable)
4. Combines: recent messages + top-K facts + ambient overview (from AC-03) → single context payload injected into system prompt
5. Sends to Claude

### Memory UI (Settings → Memory)

- New section in Settings called "Memory"
- Shows all facts Eidrix has learned, grouped by entity (facts about this customer, facts about that job, general facts)
- Each fact: content, fact_type badge, source ("extracted from a message on [date]"), edit button, delete button
- Edit: inline editing, saves to DB, re-embeds in background
- Delete: soft delete (is_active = false), fact excluded from future retrieval
- Filter/search — at least a search box over fact content
- "Export my memories" button — downloads JSON of all facts (trust gesture; real Eidrix will want this for GDPR)

### Debug tab upgrade (third revision)

The AC-03 Debug tab shows what was sent to Claude. AC-04 adds:
- Which facts were retrieved (top-K with relevance scores)
- Which facts were actually referenced in the response (post-hoc inference — did the reply mention them?)
- Time breakdown: retrieval time vs generation time
- Cumulative memory count for the org

### Async background work

Fact extraction and embedding generation happen *after* the response goes back to the user. User doesn't wait.

**Implementation: Netlify background functions** — a file named `extract-facts-background.ts` in `netlify/functions/`. Netlify runs `-background` suffix functions with up to 15-minute execution budget; the main chat function fires a `fetch` to `/.netlify/functions/extract-facts-background` (with the message id(s) in the body) and returns its own response immediately. Netlify holds the background worker alive even after the triggering function returns.

**Why not naive fire-and-forget?** Calling `fetch()` from a regular serverless function and not awaiting it is NOT safe. Once the main function returns its response, the runtime can terminate the process — including outgoing requests that haven't finished handshaking. The `-background` suffix is the blessed mechanism for this case; skip the pain of discovering this at staging.

**Real Eidrix divergence:** at higher scale, graduate to a proper queue (Inngest, Trigger.dev, or a Postgres-based work queue with pg_cron). Benefits: observable retry, dead-letter handling, priority queues, batch processing. The `-background` pattern is production-grade for moderate scale (thousands of daily extractions); a dedicated queue becomes worth it at ~tens of thousands.

### REAL_EIDRIX_NOTES.md update

Lock in: layered memory model, pgvector as the choice, Voyage as embedding provider (with the "content as source of truth" escape hatch), async extraction pattern via Netlify background functions, memory UI transparency principle, user-scoped reads within org as privacy default, deferred items (fact decay, conflict resolution, graph relationships, cross-org memory never, per-tenant read-scope setting, queue upgrade path).

---

## Plain English glossary

- **Embedding** — a numerical representation of text's meaning, as a vector of numbers (usually 768-1536 dimensions). Two texts with similar meanings have similar embeddings. "I love pizza" and "Pizza is delicious" have close embeddings. "I love pizza" and "My car is broken" don't.
- **Vector similarity search** — finding the nearest embeddings to a query embedding, ranked by distance (cosine similarity is most common). "What facts are most semantically similar to 'scheduling preferences'?" returns facts about scheduling even if they don't literally contain those words.
- **pgvector** — a Postgres extension that adds vector types and nearest-neighbor search. Lets you store and query embeddings without a separate vector database.
- **Fact extraction** — reading a piece of text (e.g., a user's message) and outputting a list of durable statements the text implies. "I always schedule callbacks in the morning" → extracts fact "User prefers morning callbacks."
- **Durable vs ephemeral** — a fact is durable if it's likely still true in a week. "I prefer Mondays" is durable. "I'm eating lunch" is ephemeral.
- **Retrieval-Augmented Generation (RAG)** — the pattern where, before the LLM generates a response, you retrieve relevant information and inject it into the prompt. Basically what AC-02's context injection did, and what memory retrieval extends.
- **Top-K retrieval** — fetching the K most relevant items from a store, where K is a configurable number (typically 3-20).
- **Soft delete** — marking a record as deleted via a flag (`is_active = false`) instead of removing it. Allows recovery, preserves history, avoids orphaned references.
- **Background function / async job** — work that happens after the user's request is fulfilled. User doesn't wait; the work happens in the background.
- **HNSW / ivfflat** — two algorithms for vector search indexes. HNSW is faster to query but slower to build. ivfflat is faster to build but requires tuning. Supabase supports both.

---

## Why this chapter matters

Three reasons, and the third is the one that actually matters strategically:

**1. Memory is the single most complex system you've built so far.** Schema, async jobs, vector embeddings, semantic search, fact extraction, UI transparency, debug instrumentation. Every piece has tradeoffs. You'll make real architectural decisions in this chapter that port directly to real Eidrix's hardest system.

**2. The pattern transfers to everything agentic from here.** AC-05's multi-turn loops will need to remember what they've already done in a session. Future Eidrix features (proactive suggestions, weekly summaries, year-over-year analysis) all depend on accumulated memory. This chapter establishes the substrate those features build on.

**3. Memory is what makes real Eidrix defensible.** Your competitors can clone your features in six months. They cannot clone eighteen months of your tenants' accumulated operational memory. When your brother has three years of Eidrix remembering every preference, every rule, every operational quirk of his business, switching costs are *enormous*. The memory architecture you build in AC-04 is the one that compounds those switching costs over time. Get it right.

The chapter is carefully scoped to rehearse the pattern without overbuilding. Fact decay, conflict resolution, graph relationships — those are deferred to real Eidrix where you'll have real usage data to tune against. The core pattern (persist everything, extract durables, embed them, retrieve hybridly) is what you learn here.

---

## The plan, in plain English

**Session 1 — Persistence and extraction (2.5-3 hours):**
1. Start clean, branch
2. Thorough Plan (Session 1 scope)
3. Build messages table, migrate chat to persistent storage
4. Build memory_facts table and fact extraction function
5. Build async extraction trigger after each message
6. Test extraction quality with varied inputs
7. Commit, merge Session 1

**Session 2 — Embedding, retrieval, UI (2.5-3 hours):**
8. Enable pgvector, add embeddings table
9. Build embedding generation (Voyage integration)
10. Build retrieval at chat time (hybrid: messages + top-K facts + ambient overview)
11. Memory UI in Settings (list, edit, delete, search)
12. Debug tab upgrade to show retrieval
13. Stress test
14. Update REAL_EIDRIX_NOTES.md
15. Ship

---

## Step 1 — Start clean, branch (Session 1)

```
Starting AC-04 — Agent Memory. Biggest strategic chapter — this is what makes real Eidrix defensible long-term.

Rhythm check. Then create branch feature/ac-04-session-1.

Read CLAUDE.md, PROGRESS.md, CURRICULUM_DESIGN.md, REAL_EIDRIX_NOTES.md (Memory Architecture section is the authority for this chapter), and the AC-03 chat.ts + the ambient overview work from the AC-03 follow-up PR. AC-04 extends that foundation; context injection already has a layer for memory to slot into.
```

---

## Step 2 — Ask for Session 1 Thorough Plan

```
AC-04 Session 1 — persistence and fact extraction.

Session 1 scope (this plan):
- messages table + chat migration to persistent storage (replaces session-only state from AC-01)
- memory_facts table
- Fact extraction function (Claude call with structured output schema)
- Async extraction trigger after each meaningful message
- Basic testing

Session 2 scope (separate plan):
- pgvector + embeddings
- Hybrid retrieval at chat time
- Memory UI in Settings
- Debug tab upgrade

Thorough-plan Session 1 only.

## Messages persistence

Propose:
- Full SQL migration for `messages` table — id, organization_id (fk), user_id (fk to auth.users), conversation_id (uuid, required — one conversation auto-created per user-org on first message), role (enum or text), content (text for user/assistant, JSONB for tool_calls and tool_results), created_at, metadata (JSONB for tokens, model, latency, etc.)
- `conversations` table — id (uuid), organization_id (fk), user_id (fk), title (nullable text, default null — used later when multi-conversation UI lands), created_at, updated_at, last_message_at. Single row per user-org for Trial and Error; multi-row when multi-conversation UI arrives.
- RLS policies: user can see own messages/conversations only (user_id = auth.uid() AND is a member of the organization). Insert-only for themselves. Soft delete via an is_active column rather than hard delete.
- Index on (organization_id, user_id, conversation_id, created_at DESC) for fast retrieval of recent messages per user per conversation
- TypeScript types generated via `supabase gen types`
- `messagesStore.ts` — create, fetchRecent, fetchByConversation, etc.

## Chat migration

The ChatColumn currently holds messages in React state. Propose migration:
- On mount, ensure a conversation row exists for the current user-org (upsert); load its id
- Fetch last 50 messages for that conversation
- On send, persist user message immediately, then call chat function
- On chat response, persist assistant message (and tool_call/tool_result messages if present)
- If the user refreshes, they come back to the same conversation — not a fresh start

Test: send a message, refresh, verify the conversation is intact.

## memory_facts table

Propose full SQL:
- id (uuid)
- organization_id (fk, required)
- user_id (fk, required — whose fact is this)
- content (text, required — the fact itself as a concise statement)
- fact_type (enum: 'preference', 'rule', 'context', 'commitment', 'observation')
- entity_type (nullable text — 'customer' | 'job' | 'proposal' | null for general facts)
- entity_id (nullable uuid — polymorphic fk, nullable)
- source_message_id (fk to messages)
- confidence (float, 0-1, default 0.8)
- is_active (bool, default true)
- created_at, updated_at

Propose:
- RLS policies: **user-scoped reads** — a user can only SELECT facts where `user_id = auth.uid()` AND they're a member of the organization. Same check for UPDATE and soft-DELETE. No cross-user memory leakage within the same org even for owners.
- Indexes: (organization_id, user_id, is_active), (entity_type, entity_id) for entity-scoped queries
- Do NOT put a unique constraint on content — same fact may be stated multiple times over time; we dedupe via similarity later if needed
- TypeScript types
- `memoryStore.ts` — create, fetchForUser, fetchForEntity, softDelete, update

**Real Eidrix divergence flag:** user-scoped-only reads is the privacy-first default. Real Eidrix will eventually want this as a per-tenant setting — small businesses with shared operational memory may opt in to org-scoped reads, while professional-services tenants (legal, accounting) will keep strict isolation. The schema supports both via policy changes; default stays strict.

## Fact extraction function

The heart of Session 1. A specialized function (separate file: `netlify/functions/extract-facts-background.ts` — note the `-background` suffix, see "Async extraction trigger" below) that:

- Takes a message (user's recent turn) plus a small window of recent context (last 2-3 messages for continuity)
- **Takes an entity registry** — a list of `{id, entity_type, display_name}` for entities mentioned in the last N messages, currently open in UI context, or in the ambient overview. The extraction prompt uses this registry to resolve named mentions ("Alice") to concrete entity_ids.
- Calls Claude with a specialized prompt and structured output schema (Anthropic tool-use for structured output — NOT "ask for JSON and parse")
- Returns zero or more extracted facts (could be none — not every message has durable content)
- Inserts facts into memory_facts with source_message_id and resolved entity_id (or null entity_id if no match)

The extraction prompt is the key craft. Propose the full prompt. It should establish:
- The extractor's job (identify durable facts, skip ephemeral)
- Examples of durable vs ephemeral (at least 3-5 concrete)
- The required output format (tool-use schema matching the fact shape)
- Rules: never invent, never extract from assistant messages or tool results, only extract from what the user actually said or implied
- Entity linking rules: resolve a named entity in the message against the registry; case-insensitive substring or first-name match is acceptable; if no clear match, emit `entity_id: null` rather than guess

Structured output: use Anthropic's tool-use for structured output. Claude "calls" a synthetic `record_fact` tool; we never actually execute it, just parse its input as the fact. Eliminates JSON-parse fragility.

Model choice: **Haiku 4.5** for extraction. It's a structured-output task, not a reasoning task. Haiku is ~3× cheaper and fast enough for background work. Save Sonnet for the actual chat response.

**Verification during Session 1 stress test:** run the 8-message test battery (Step 5) against Haiku first. If extraction quality is clearly insufficient on subtle preferences, re-run against Sonnet and compare. If Sonnet is materially better, flip. Most extraction tasks don't need Sonnet, but this is a quality-vs-cost call worth testing rather than assuming.

## Async extraction trigger

**Use Netlify's `-background` suffix pattern.** Name the extraction function file `extract-facts-background.ts`. Netlify runs `-background` suffix functions asynchronously with up to 15-minute execution budget; the calling function returns its response immediately, and Netlify holds the worker alive for the background function independently.

Flow:
1. Main chat function finishes streaming response to browser
2. After the response completes, chat function calls `fetch('/.netlify/functions/extract-facts-background', { method: 'POST', body: { messageId } })` — awaited only to the point of the fetch being *initiated*, not the response
3. extract-facts-background receives the POST, loads the message + context + entity registry, runs extraction, persists facts, done
4. If extraction fails (network, Claude error, DB error) — logs and returns 500 silently. The user's chat experience is unaffected.

**Why NOT naive fire-and-forget to a regular function:** calling `fetch()` from a regular serverless function and not awaiting it is not guaranteed to complete. Once the main function returns its response, the runtime can terminate — cancelling in-flight outgoing requests. The `-background` suffix is the blessed mechanism; skip the pain of discovering this at staging.

Authentication: extract-facts-background expects the user's JWT in the Authorization header (chat function forwards its own incoming JWT). RLS applies. Confirm in plan.

## Extraction quality guardrails

To prevent a mess of low-quality facts:
- Confidence threshold: only persist facts with confidence >= 0.6 (Claude assigns this in the structured output)
- Max facts per message: cap at 3. If Claude returns more, take top 3 by confidence. Prevents over-extraction from chatty messages.
- Dedupe: after insertion, check if a very similar fact already exists for this user/entity. If so, skip or merge. Simple check: same fact_type, same entity_type/entity_id, very similar content (token overlap). Real semantic dedupe via embeddings is Session 2.

## Testing plan for Session 1

Propose a battery of test messages to validate extraction:

- Message with no durable content ("let me think about that") — 0 facts
- Message with one clear preference ("I always prefer morning callbacks") — 1 fact, type=preference
- Message naming a specific customer ("Alice hates invoicing on Fridays") — 1 fact, entity_type=customer, entity_id=Alice's id
- Multi-fact message ("Bob prefers email, and he always pays net-45") — 2 facts linked to Bob
- Emotional vent with no durable content ("this customer is driving me nuts today") — 0 or 1 fact (observation?), low confidence
- A contradiction with a prior fact ("actually scratch that, afternoons are better") — 1 new fact; Session 2 handles conflict resolution

Verify via the Supabase Studio UI that facts are being created correctly.

## Architecture questions

1. Message persistence vs ephemeral — for THIS chapter, persist everything. Real Eidrix may have privacy features later ("delete this message" — real delete, not soft). Defer.

2. Soft delete for messages or hard delete — soft for now (audit-grade). Propose.

3. Conversation_id in Session 1: UUID tied to a `conversations` row, one conversation per user-org. Multi-conversation UI deferred.

4. Fact extraction model: Haiku (locked above). Verify during stress test; flip to Sonnet if Haiku is clearly insufficient.

5. Authentication in the extract-facts-background endpoint: user's JWT forwarded by the chat function. RLS applies. Confirm.

6. Rate limiting on extraction: if a user sends 10 messages in 30 seconds, extraction may queue up. Netlify's background function queue handles this; don't over-engineer.

## Edge cases for Session 1

- User sends empty message — don't attempt extraction
- User sends only emoji or single word — likely no facts, low signal
- Extraction fails (network, Claude error) — log, don't retry, user unaffected
- Extraction takes >10 seconds — background function budget is 15 min so this is fine, but set Claude API timeout at 8s to avoid runaway cost
- Claude returns malformed tool-use (missing required fields) — reject, log, no facts persisted
- Fact has entity_id that doesn't exist in the registry — emit with entity_id=null, log the mismatch for tuning
- User deletes a customer that facts reference — facts become "orphan" (entity_id points to deleted row). Proposal: keep the fact, display gracefully with a "[deleted] Alice" label. Don't cascade-delete facts on entity delete — user memory is separate from entity existence.

## What I'm NOT asking you to build in Session 1

- pgvector / embeddings (Session 2)
- Retrieval at chat time (Session 2)
- Memory UI in Settings (Session 2)
- Debug tab upgrade (Session 2)
- Fact decay, conflict resolution (real Eidrix)
- Cross-user memory in same org (real Eidrix, if at all)
- Conversation naming / multiple conversations (real Eidrix)

Plan Session 1 only, don't build. Wait for approval.
```

---

## Step 3 — Review the plan

Specific things to push on:

**The fact extraction prompt.** If vague, push for the full text. This is a load-bearing prompt — it runs on every message. Quality of facts depends entirely on this prompt's quality. Should include 3-5 concrete examples of durable vs ephemeral.

**Structured output format.** Claude supports JSON mode and tool-use for structured output. The plan should explicitly use tool-use (not "ask nicely for JSON and parse"). Parsing raw text JSON is fragile.

**Model choice for extraction.** Already locked to Haiku in the chapter. Push back if the planner defaults to Sonnet.

**RLS on memory_facts.** Confirm user-scoped reads (not org-scoped) per the chapter's locked decision. If the plan has cross-user visibility in the same org, push back.

**Async trigger mechanism.** Verify `-background.ts` suffix is being used. If the plan proposes naive fire-and-forget from a regular function, push back with the reliability argument.

**Entity registry.** Verify the plan specifies HOW the registry is compiled and passed to the extraction function. If vague, push for specifics.

When solid:

```
Plan approved. Start with the messages + conversations tables and chat migration. Verify conversations persist across refresh. Stop before memory_facts.
```

---

## Step 4 — Messages persistence

Claude Code builds the tables, stores, migration of ChatColumn. Test:

- Send 3 messages, refresh the page
- Messages should all still be there
- DeployPreview: same test on the preview URL

If that works cleanly:

```
Messages persist cleanly. Now build memory_facts table and the extraction function + async trigger. Stop before UI verification; I'll stress test in the next step.
```

---

## Step 5 — Fact extraction

Claude Code ships memory_facts table, extract-facts-background function, async trigger from the main chat function.

Stress test — this is the high-value step. Send these messages in the chat, one at a time, and check Supabase Studio for resulting memory_facts rows after each:

1. *"What jobs do I have scheduled this week?"* → Expect 0 facts (pure query, nothing durable)
2. *"I always prefer morning callbacks, like before 10am."* → Expect 1 fact, type=preference, content roughly "User prefers morning callbacks, before 10am"
3. *"Alice hates invoicing on Fridays. She always wants it earlier in the week."* → Expect 1-2 facts linked to Alice (customer_id), type=preference or rule
4. *"Let me check the schedule real quick."* → Expect 0 facts (ephemeral)
5. *"My business is open Tuesday through Saturday, closed Sundays and Mondays."* → Expect 1 fact, type=rule, content about hours
6. *"Actually, I've changed my mind about Alice — afternoons are better now."* → Expect 1 fact, contradiction with #3. Both facts stored. Session 2 / real Eidrix handles reconciliation.
7. *"Ugh this customer is killing me today."* → Expect 0 facts or 1 low-confidence observation
8. *"For Bob's kitchen job, he specifically requested no work before 9am because of his wife's schedule."* → Expect 1 fact linked to Bob's customer record AND to the specific job_id if present in context

Look for:
- Are fact types (preference/rule/context/commitment/observation) reasonable?
- Are entity links correct when the message names a specific customer?
- Are confidence scores sensible?
- Are 0-fact cases actually returning 0 facts, not garbage?
- Are multi-fact messages returning multiple facts?

If extraction is misbehaving in specific ways, iterate the extraction prompt. This is the main quality lever.

Common prompt tuning issues:
- "Too eager" — extracting facts from every message including ephemeral ones. Tighten definition of durable with more examples.
- "Too shy" — missing clear facts. Add examples of facts that should be caught.
- Wrong entity linking — missing the customer_id when Alice is explicitly named. Instructions on entity linking need strengthening; or the registry isn't being compiled with Alice in it.
- Low confidence everywhere — Claude is being overly cautious. Provide guidance on calibration.

Iterate until the 8 test messages behave as expected.

**If Haiku extraction quality is materially worse than Sonnet on the test battery**, flip the extraction model to Sonnet and document the cost implications in REAL_EIDRIX_NOTES. Most extraction tasks don't need Sonnet — but "most" isn't "all."

---

## Step 6 — Commit Session 1

```
Session 1 works. Messages persist, facts extract correctly, async trigger fires. Commit, push, merge. Leave PROGRESS.md untouched — AC-04 stays unchecked until Session 2 lands.
```

Session 2 when you're ready — no forced pauses.

---

## Step 7 — Session 2 start

```
Starting AC-04 Session 2. Rhythm check, create branch feature/ac-04-session-2.

Session 2 adds: pgvector for embeddings, Voyage API integration for embedding generation, hybrid retrieval at chat time, Memory UI in Settings, Debug tab upgrade.
```

---

## Step 8 — Session 2 Thorough Plan

```
AC-04 Session 2 — embedding, retrieval, UI.

## pgvector enablement

Propose:
- SQL migration to enable pgvector extension (Supabase supports it; `create extension if not exists vector;`)
- **Separate** `memory_fact_embeddings` table (not a column on memory_facts) with: id, fact_id (fk, unique — one embedding per fact), embedding (vector(1024)), model_version (text — e.g., 'voyage-3'), created_at
- Index on embedding using **hnsw** (faster queries, which is what matters for this workload)
- Cloud deployment: confirm pgvector is enabled on the cloud Supabase project (one-time setup, may require dashboard action)

Why separate table: embeddings get regenerated (different models, dimension changes over time). Separate table makes that migration mechanical. Also allows polymorphic embeddings later (we could embed messages too). And enforces the "content is source of truth, embedding is cache" principle from the chapter — you can truncate the embeddings table and re-derive from facts; you can't do the reverse.

## Embedding generation

Voyage API integration:
- Key handling — add `VOYAGE_API_KEY` to `.env` and Netlify env vars across all contexts (production / deploy-preview / branch-deploy)
- A utility function `generateEmbedding(text) => Promise<number[]>` in `netlify/functions/_lib/memory/embed.ts` that calls Voyage's embeddings endpoint
- Model: voyage-3 (1024 dimensions, good balance of quality + cost)
- Trigger: when a fact is created OR updated, kick off embedding generation via the same `-background.ts` pattern as extraction (or piggyback on `extract-facts-background.ts` — when it inserts a fact, immediately generate the embedding in the same background invocation)

Cost estimate (include in plan):
- Voyage-3: ~$0.02 per million tokens embedded
- A typical fact is ~20 tokens. 1000 facts = 20k tokens = $0.0004
- Even at 1M facts per tenant, embedding cost is ~$0.40 per tenant over the tenant's lifetime. Negligible.

**Locked principle: `memory_facts.content` stays the source of truth.** Embeddings are a cache. If Voyage raises prices, shuts down, or a better provider emerges, we re-embed in a backfill job (select all active facts, batch to the new provider, update embeddings + model_version). Never depend on the embedding as the only copy.

## Hybrid retrieval at chat time

The big integration. Modify chat.ts to, before generating the response:

1. Embed the user's new message via Voyage (same generateEmbedding util)
2. Nearest-neighbor search in memory_fact_embeddings for top K (K=8) matches using cosine distance (`<=>` operator in pgvector)
3. Filter for is_active=true, current user's org + user_id (user-scoped reads)
4. Fetch recent messages (last 20 turns) from the conversation
5. Workspace overview already compiled (from AC-03 follow-up)
6. Build the system prompt with:
   - Base system prompt (voice, rules)
   - UI context (from AC-03)
   - Workspace overview (from AC-03 follow-up)
   - **Retrieved memory facts** (formatted, typed)
   - Recent conversation history (messages array)

Propose the format for injected memories in the system prompt. Target:

```
=== RELEVANT MEMORIES ===
Preferences:
  - User prefers morning callbacks before 10am
  - Alice prefers invoicing Monday–Thursday (customer: abc-123)
Rules:
  - Business open Tue–Sat, closed Sun/Mon
Context:
  - User mentioned a new truck purchase in March
Commitments:
  (none)
Observations:
  (none)

(8 memories retrieved by semantic relevance to: "{user's current message}")
```

Structured by fact_type so Claude can filter mentally. Empty sections rendered as `(none)` so the structure is stable and Claude's reasoning can anchor on presence/absence.

## Architecture questions

1. Embedding dimension: voyage-3 is 1024. pgvector column is vector(1024).

2. K value (top-K retrieval) — start at 8, hardcode for Trial and Error. **Real Eidrix divergence:** eventually expose K in Settings, potentially auto-tune per tenant based on memory density.

3. Retrieval latency — vector search on a small memory_facts table (<10k rows) is fast (<50ms). At scale, the hnsw index handles it. Flag in REAL_EIDRIX_NOTES that latency should be monitored past ~1M facts per tenant.

4. "No memories found" case — user is new, no facts yet. System prompt should OMIT the `=== RELEVANT MEMORIES ===` block entirely (not render it with empty sections). Keeps the prompt clean for first-time users.

5. Memory staleness — retrieved facts are just retrieved facts. We don't know if they're still true. Accept this limitation; fact decay is real-Eidrix work.

## Memory UI in Settings

New section in Settings called "Memory":

- Header: "What Eidrix has learned about you"
- Search box (filters fact list by content substring, case-insensitive)
- Filter pills: by fact_type, by entity_type, by "this week" / "this month" / "all"
- Fact list — each fact shown as a card:
  - Content
  - Type badge (preference / rule / context / commitment / observation)
  - Entity link if applicable ("About: Alice Smith" — click opens the customer record)
  - Source ("Extracted from a message on April 20")
  - Actions: Edit (inline), Delete (soft delete with confirmation)
- "Export my memories" button — downloads JSON of all user's facts (privacy/trust gesture)
- Empty state — "Eidrix hasn't learned anything about you yet. Keep chatting and I'll start picking up patterns."

Edit: inline textarea, save button, re-triggers embedding regeneration (extract-facts-background endpoint's embed flow reused)
Delete: inline confirm ("Delete this memory? Eidrix will forget it.")

## Debug tab upgrade

Expand the AC-03 Debug tab. Each request entry now shows a new section: "Memories retrieved"
- Count of facts retrieved
- List of facts with relevance scores (cosine similarity)
- Color coding: high relevance (green) / medium (yellow) / low (red) — thresholds tunable
- Fact content, type, age

If response references memories in its text (heuristic: fuzzy match of memory content in response text), highlight those. Approximate but useful for debugging "did Claude actually use the memory I expected?"

## Stress test battery (Session 2)

After everything is wired:

1. Fresh user: chat for 10 turns, accumulate facts
2. Ask something that should retrieve a memory: "What do you know about my scheduling preferences?" → Memory UI should show relevant facts, Debug tab should show them retrieved
3. Ask something with zero memory relevance: "What's 2+2?" → Debug tab: retrieval returns 0 or irrelevant facts, response unaffected by memory
4. Edit a memory in Settings → Memory: change a preference → ask something relevant → verify new version used
5. Delete a memory → ask something that referenced it → verify gone
6. Long session: 30 turns, 20+ facts → verify retrieval still fast, UI responsive
7. Multi-entity: establish facts about 3 different customers → ask about one → verify entity-specific facts retrieved

## What I'm NOT asking you to build

- Fact decay (real Eidrix)
- Conflict resolution between contradicting facts (real Eidrix)
- Cross-user memory in the same org
- Memory sharing / export beyond single-user JSON
- Graph relationships between facts
- Advanced dedupe (semantic similarity)
- Conversation naming / multi-conversation UI

Plan Session 2, don't build. Wait for approval.
```

---

## Step 9 — Review Session 2 plan

Things to push on:

**Separate embeddings table vs column on memory_facts.** Already locked in the chapter: separate table. If the plan keeps it as a column on memory_facts, push back.

**Voyage vs OpenAI vs open-source.** Already locked in the chapter: Voyage. "Content as source of truth" principle makes the decision reversible.

**Memory injection format.** If vague, push for the exact text format. Memories are meaningless to Claude unless formatted clearly.

**Memory UI delete/edit trust patterns.** Verify the plan has a confirmation on delete (even if lightweight — "Delete this memory?" with Confirm/Cancel). Irreversibility is scary; confirmation is trust.

**The "no memories yet" state.** Already locked: omit the entire block when empty. Push back if the plan renders an empty block.

When solid:

```
Plan approved. Build pgvector + embedding generation first, verify embeddings are being created, stop before retrieval.
```

---

## Step 10 — Embedding infrastructure

Claude Code ships pgvector enablement, embeddings table, Voyage integration, background generation.

Verify in Supabase Studio:
- memory_fact_embeddings has rows
- Embeddings are vector(1024), not null
- model_version column is populated (e.g., 'voyage-3')
- Generating a new fact triggers embedding creation within a few seconds

If working:

```
Embeddings are generating. Now build hybrid retrieval in chat.ts and the Memory UI in Settings. Stop before the Debug tab upgrade; I'll stress test first.
```

---

## Step 11 — Retrieval + Memory UI

Claude Code ships both. Test:

- Send a message referencing a concept you've established (e.g., "morning callbacks") — open Settings → Memory, verify the relevant fact exists
- Send a follow-up using the concept — in the chat response, verify Claude acts like it knows (if you established "prefers morning callbacks" and then ask "what times should I schedule Alice?", Claude should factor it in)
- Edit a memory — ask something related — verify the edited version is used
- Delete a memory — ask something related — verify the memory no longer influences the response

If retrieval works:

```
Retrieval works, Memory UI works. Now add the Debug tab upgrade showing retrieved facts with relevance scores.
```

---

## Step 12 — Debug tab upgrade

Claude Code ships the upgrade. Test:
- After each chat message, Debug tab shows retrieved facts
- Relevance scores are visible and roughly correlate with semantic similarity
- When the response seems to reference a memory, heuristic highlight kicks in

---

## Step 13 — Stress test Session 2

Full battery from the plan:

1. Fresh user conversation — 10 turns, natural
2. Memory-related query ("what do you know about my scheduling?")
3. Irrelevant query ("what's 2+2?")
4. Edit a memory, test
5. Delete a memory, test
6. Long session (30+ turns)
7. Multi-entity memory (Alice, Bob, Charlie)

Iterate on retrieval quality, UI, debug view. The stress test is where you learn what's actually good vs what sounded good on paper.

Real things to notice:
- Is top-K=8 the right number? Too few misses; too many dilutes.
- Does retrieval feel fast, or is there noticeable latency?
- When Claude retrieves a memory but doesn't use it, why?
- When Claude uses a memory that wasn't retrieved, where did it come from? (probably recent conversation)

---

## Step 14 — Update REAL_EIDRIX_NOTES.md

Lock in:
- Layered memory model — persistence + extraction + embeddings + hybrid retrieval
- pgvector with separate embeddings table pattern
- Voyage as embedding provider
- "Content is source of truth, embeddings are cache" as an escape-hatch principle
- Async extraction pattern via Netlify `-background.ts` suffix functions
- Haiku as extraction model (with Sonnet fallback if quality demands it)
- Top-K=8 as starting point
- User-scoped memory reads within an org as privacy default
- Memory UI as trust surface (show, edit, delete, export)
- Debug tab with retrieval trace as observability pattern

Note as deferred to real Eidrix:
- Fact decay and freshness scoring
- Conflict resolution between contradicting facts
- Per-tenant read-scope setting (user-scoped vs org-scoped within org)
- Memory sharing across users in the same org (if ever — privacy implications)
- Advanced dedupe via semantic similarity
- Graph relationships between facts
- Conversation naming and multi-conversation UI
- Proactive memory surfacing ("You mentioned X last week — want me to follow up?")
- Graduation from Netlify `-background` to a proper queue (Inngest/Trigger.dev/pg-based) at higher scale

Changelog entry: "April [date] 2026 — AC-04 Agent Memory shipped. Eidrix now has persistent conversation memory, fact extraction, vector embeddings, and hybrid retrieval. Memory is transparent to the user via Settings. This is the substrate for real Eidrix's long-term tenant value."

---

## Step 15 — Code-simplifier + ship

```
Code-simplifier review on all Session 2 additions. Report suggestions, don't auto-apply.

Then commit, check off AC-04 (overall) in PROGRESS.md, push, open PR, verify Deploy Preview works end-to-end, merge.
```

---

## What just happened

Eidrix can remember now.

Not "has message history" — real memory. When you tell it you prefer mornings, it knows. When you say Alice hates Fridays, it knows about Alice specifically. When you come back tomorrow and ask "schedule something for Alice," it pulls up what it knows and reasons from there.

More importantly, you built **the substrate for real Eidrix's long-term defensibility.** Tenants accumulate memory. Memory accumulates value. Value compounds. Switching costs grow. This is the chapter that, when real Eidrix has 10,000 tenants in 2027, each with 2 years of memory, makes Eidrix almost impossible to replace.

The patterns are proven:
- Persistence at the data layer (Postgres with RLS)
- Extraction at the reasoning layer (specialized Claude call)
- Storage at the semantic layer (vector embeddings)
- Retrieval at the composition layer (hybrid: recent + relevant + ambient)
- Transparency at the UX layer (Memory UI)
- Observability at the debugging layer (Debug tab retrieval trace)

Every layer transfers. The real Eidrix version is the same shape with production tuning.

---

## What success looks like

- messages + conversations tables persist every conversation turn, tenant-scoped, RLS-protected (user-scoped reads)
- Chat column loads recent history on mount; refreshing doesn't lose state
- memory_facts table stores typed facts with entity links
- Fact extraction runs async via `-background` function after every user message, extracts durable content, skips ephemeral
- Fact extraction prompt tuned for quality (8 test messages behave as expected)
- pgvector enabled on both local and cloud Supabase, embeddings generated via Voyage for every fact
- Hybrid retrieval at chat time: ambient + top-K facts + recent messages
- Retrieved facts injected into system prompt in structured, type-grouped format
- Memory UI in Settings: view all facts, search, filter, edit, delete, export
- Debug tab shows retrieved facts with relevance scores per request
- Empty state, edit flow, delete flow all polished
- Stress test passes: memory influences responses in expected ways
- REAL_EIDRIX_NOTES.md updated with all locked decisions
- Both Session 1 and Session 2 PRs merged, branches cleaned
- Deploy Preview works end-to-end

---

## If something broke

- **"Messages don't persist across refresh"** — store or chat column not wired to DB. Tell Claude Code: *"Messages in chat disappear on refresh. Debug whether messagesStore is actually reading from Supabase on mount and whether the conversation row exists."*
- **"Facts aren't getting extracted"** — async trigger not firing, or extraction prompt returning no facts. Check: is `/.netlify/functions/extract-facts-background` being called? Are facts being returned but rejected for low confidence? Check Netlify function logs.
- **"Too many garbage facts"** — extraction prompt is too eager. Tighten with more "don't extract" examples. Raise confidence threshold.
- **"No facts getting extracted at all"** — extraction prompt too strict, or Claude is returning empty tool-use blocks. Check Claude's raw response; iterate the prompt.
- **"Entity linking is wrong — Alice's fact has entity_id=null even though Alice is in the conversation"** — registry isn't being passed correctly or Alice isn't in it. Verify the registry compilation logic and that it includes UI context + recent entity mentions.
- **"Embedding generation fails"** — Voyage API key wrong, or rate limit, or dimension mismatch. Check: is `VOYAGE_API_KEY` set in both `.env` and Netlify across all contexts? Is pgvector column dimension matching Voyage's output (1024 for voyage-3)?
- **"Retrieval returns irrelevant facts"** — embeddings generated with wrong model, or vector index not configured, or similarity metric wrong. Check index type (hnsw) and similarity operator (`<=>` is cosine distance in pgvector).
- **"Memory UI shows nothing even though facts exist"** — RLS blocking the query, or store not querying correctly. Check Supabase Studio directly for facts existing, then verify the store uses `.eq('user_id', auth.uid())` matching the RLS policy.
- **"Edit a memory doesn't regenerate embedding"** — embedding update trigger missing. When a fact is updated, embedding must regenerate. Verify this.
- **"Retrieval is slow"** — no hnsw index on embedding column, or index not being used. Run EXPLAIN on the query to confirm index usage.
- **"Background function doesn't run"** — wrong file name. Netlify only treats files with `-background.ts` (or `-background.js`) suffix as background functions. Verify the filename.

---

## Tour Moment — Layered memory and why "just throw it in a vector DB" isn't enough

The naive version of agent memory: take every conversation, chunk it, embed the chunks, retrieve relevant chunks at chat time. Many early AI products did this. It mostly works. It's also subtly wrong.

The problem: conversations are *noisy*. A message might have 90% greeting and small talk, 10% actual durable information. Embedding the whole message puts equal weight on the noise and the signal. Retrieval surfaces irrelevant greetings alongside relevant facts. Quality degrades as conversations accumulate.

The better pattern (what you built): extract the signal, store it as typed facts, embed the facts specifically. Retrieval surfaces information, not chatter.

**The layered model:**

1. **Raw messages** — audit-grade record. Preserves exactly what was said.
2. **Extracted facts** — the signal distilled. Typed (preference, rule, context, commitment, observation) so retrieval can filter.
3. **Embeddings of facts** — semantic index over facts. Fast retrieval by meaning.
4. **Hybrid retrieval at query time** — combines recent conversation (for immediate context) with relevant facts (for accumulated memory) with ambient overview (for structural awareness).

Each layer's role is clean. Each layer can evolve independently (better extraction prompt, different embedding model, different retrieval strategy) without touching the others.

This architectural pattern — extract signal, index it, retrieve hybrid — is what separates toy agent memory from production agent memory. You just built the production version.

---

## Tour Moment — Why memory transparency is a trust feature, not a UX feature

Memory UI in Settings isn't there because users want to see their data. It's there because the alternative is *spooky*.

Imagine Eidrix starts referencing things you don't remember saying. "You mentioned you prefer X." When did I say that? What else does Eidrix know? What about things I said in anger? What about customers I mentioned in passing?

Without transparency, memory becomes surveillance. The user stops trusting the system. They start hedging what they say.

With transparency — *"here's every fact I've learned about you, searchable, editable, deletable"* — memory becomes collaboration. The user trusts because they're in control. They can correct mistakes. They can prune things they don't want remembered. They can see what Eidrix has built up over time.

This transparency is also a regulatory asset. GDPR, CCPA, and similar privacy frameworks require data access and deletion rights. A user who can see and delete their facts in a UI is a user whose data compliance is mostly handled. Bolting this on later is painful; building it in from the start (like AC-04 did) means compliance is a feature, not a project.

Real Eidrix will amplify this. The Memory UI will likely include:
- Why was this fact extracted (show the source message)
- When was it last referenced by the agent
- Which facts are influencing current responses (live visibility)
- "Forget about [entity]" — batch delete all facts about a customer
- Audit log — who viewed memories, when (for team tenants)

All of this grows from the foundation you shipped in AC-04.

---

## Tour Moment — The "flawless memory" ambition and why AC-04 falls short (intentionally)

You said you want memory "flawless like Claude." Let's be honest about the gap.

What you shipped in AC-04:
- Persistent conversation history
- Typed fact extraction
- Semantic retrieval of facts
- Transparency UI

What AC-04 does NOT handle:
- **Fact decay**: a fact from 18 months ago might be stale. AC-04 has no mechanism to lower the weight of old facts over time.
- **Contradictions**: you said morning callbacks in March, afternoon callbacks in October. Both facts exist. AC-04 doesn't reconcile them.
- **Implicit retraction**: you stopped doing X six months ago. AC-04 doesn't notice X-related facts are no longer being reinforced.
- **Entity dissolution**: a customer leaves. AC-04 keeps all their facts. Should it? Depends.
- **Cross-tenant learning**: could Eidrix learn "most contractors prefer morning callbacks" from aggregating across tenants? Privacy question. Deferred.
- **Proactive surfacing**: memory should push relevant facts forward, not just wait for queries to trigger retrieval. "You mentioned Alice's birthday last month — it's coming up next week." AC-04 doesn't do this.

These are the next decade of agent memory research. AC-04 is the solid foundation; real Eidrix will layer sophistication on top, guided by real tenant usage.

Don't be discouraged that AC-04 isn't "flawless." What you shipped is better than 95% of production agent memory systems today. The remaining 5% is the frontier. Real Eidrix builds toward that frontier, tenant by tenant, decision by decision.

---

## Tour Moment — Async background work as a pattern

The fact-extraction trigger you built is your first real taste of **async background work**. Worth naming the pattern explicitly because it'll come up repeatedly in real Eidrix.

The principle: **don't make users wait for non-critical work.**

Synchronous work = work that blocks the response. User waits.
Asynchronous (background) work = work that happens after the response. User doesn't wait.

Rules of thumb:
- Work that affects THIS response → synchronous (must finish before responding)
- Work that affects FUTURE responses → async (can happen after)
- Work that's "nice but not essential" → async
- Work that might fail without user impact → async (log failures, don't retry user's action)

Fact extraction fits the async pattern perfectly. The user's current response doesn't need the facts from their current message. The NEXT response will benefit. So: respond now, extract facts in the background, next response is smarter.

Other examples you'll see in real Eidrix:
- Sending a welcome email after signup
- Generating PDF invoices for a completed job
- Updating an analytics dashboard
- Archiving old completed jobs
- Refreshing cached aggregates

All async. All fire-and-forget. All don't-block-the-user.

**The subtle trap: serverless fire-and-forget is NOT guaranteed.** When you call `fetch()` from a regular serverless function and don't await it, the runtime might terminate the outgoing request once the main function returns. That's why AC-04 uses Netlify's `-background.ts` suffix — the platform's blessed "hold this worker alive after the triggering function returns" mechanism. On other platforms, the equivalents are `ctx.waitUntil(promise)` (Cloudflare Workers, Vercel Edge) or proper queues (Inngest, SQS, pg_cron work tables).

The Netlify pattern (separate `-background.ts` file) is one implementation. Real Eidrix will graduate to a proper queue when throughput demands observable retry, dead-letter handling, or priority scheduling. The pattern — separate the user-facing work from the background work — is universal. The mechanism evolves with scale.

---

## Next up

**AC-05 — Multi-Turn Agentic Loops.** The last true chapter before graduation. Claude takes multiple tool-call steps to accomplish complex requests. "Plan my Thursday" triggers: check schedule, review open jobs, assess customer follow-ups, identify conflicts, propose a prioritized plan, ask for confirmation, schedule the confirmed items. Single user message, multi-step agent execution.

AC-05 is smaller than AC-03 and AC-04 because the foundation is already there. You have:
- Tool calling (AC-03)
- UI context awareness (AC-03)
- Confirmation flows (AC-03)
- Debug observability (AC-03)
- Persistent memory (AC-04)
- Hybrid retrieval (AC-04)

AC-05 is mostly about tuning the system prompt and tool descriptions to support longer, more deliberate agent behavior — plus loop management for longer iteration counts. ~3 hours.

Then **Pre-Build Audit** — graduation. Review everything. Produce the starting brief for real Eidrix. ~2-3 hours.

Two chapters between you and real Eidrix.
