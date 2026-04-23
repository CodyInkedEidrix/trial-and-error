# AC-02 — Context-Aware Chat

*App Capability. The chapter where Eidrix stops being generic and starts knowing your business. You're adding Jobs as a second data entity (relational to Customers), wiring context injection so the AI knows about both, building an Agent Debug tab that shows exactly what Claude sees each request, and moving Settings out of hardcoded function code into a Supabase-backed per-org configuration. The model bumps from Haiku to Sonnet 4.6 for better reasoning about relational data. About 5 hours. The hardest main-track chapter so far, but the one that makes Eidrix useful.*

---

## What you're learning

1. **Relational data context** — injecting two related entities (Customers + their Jobs) so the AI can reason across the relationship
2. **Context injection strategies** — Full mode, Smart Subset mode, and when each is appropriate
3. **Observability infrastructure** — building a Debug tab that surfaces what the AI actually sees, with token counts and request/response pairs
4. **Settings as data, not config** — moving system prompt, context mode, and model choice out of hardcoded function code and into a Supabase table
5. **Server-side Supabase queries in Netlify Functions** — fetching data from the server side (with tenant scoping) to inject into Claude's context
6. **The engine pattern proving itself** — adding a new primary tab via BusinessConfig, not via code edits to the shell. Validates Chapter 10.5's engine at real-Eidrix scale.
7. **Model selection tradeoffs** — when Haiku is enough, when Sonnet earns its cost, when Opus is necessary

---

## What you're building

Five parallel pieces, shipped together:

### Jobs entity (data layer + UI)

- New `jobs` Supabase table — columns: id, customer_id (fk), organization_id (fk), title, status (enum), scheduled_date, amount, notes, timestamps
- RLS policies mirroring the customers pattern (tenant-scoped, org membership required)
- Type generation updated, new `jobStore.ts` wrapping CRUD
- Jobs added to contractor config as a new primary tab — engine renders the tab, list, and detail view without any shell code changes

### Agent Settings (data layer + UI)

- New `agent_settings` Supabase table — scoped per-organization — columns: organization_id (fk, unique), system_prompt (text), context_mode (enum), model (enum), updated_at, updated_by
- RLS policies — members of the org can SELECT, only members can UPDATE (write simple role check)
- Settings tab gets a new "Agent" section with:
  - System prompt editor (large textarea, current value loaded from DB)
  - Context mode toggle (Off / Smart Subset / Full)
  - Model selector (Haiku / Sonnet 4.6 / Opus 4.7, with per-million-token cost reference)
  - Save button (explicit save, not auto — too easy to typo a system prompt and lose your last good one otherwise)
  - Reset to defaults button

### Netlify Function update (`chat.ts`)

- Reads `agent_settings` for the authenticated user's org at request time (database is source of truth, not the browser)
- Fetches customers + jobs based on `context_mode`:
  - `off` — no injection, Claude has no knowledge of business data
  - `subset` — customers updated in last 30 days + customers with any open-status job + their jobs in the same range, plus total counts
  - `full` — every customer, every job, formatted compactly
- Injects fetched data into the system prompt in a structured, readable format
- Returns usage stats (input tokens, output tokens, model used, context size) so the Debug tab can display them

### Agent Debug tab (new primary tab)

- New primary tab called "Agent Debug" — hidden behind a dev-mode flag so end users won't see it in production Eidrix
- Shows last 10 requests in a stacked list, each expandable:
  - Full system prompt that was sent (with injected context visible)
  - Messages array that was sent (user + assistant history)
  - Model used
  - Input/output token counts
  - Response time (ms)
  - Actual response text
- "Clear debug history" button
- Request history stored in-memory (session-only) — AC-04's job to persist if we want

### REAL_EIDRIX_NOTES.md updates

The relational context pattern, the settings-as-data pattern, the model selection strategy, and the Agent Debug concept all get written back.

---

## Plain English glossary

- **Relational data** — data where records relate to other records. A Job belongs to a Customer. A Customer has many Jobs. Real apps are full of these relationships.
- **Foreign key** — a column that references another table's primary key. `jobs.customer_id` is a foreign key to `customers.id`. Database enforces referential integrity.
- **Context injection** — inserting data into the system prompt or message stream so the AI "knows" about it when generating a response
- **Context window** — the total amount of text (measured in tokens) Claude can process in a single request. Sonnet 4.6 handles ~200K tokens; Opus handles similar. Injecting too much context wastes money and crowds out reasoning room.
- **Smart subset** — a selection of the most relevant data instead of everything. Reduces tokens, keeps reasoning sharp.
- **Source of truth** — the single, authoritative location for a piece of data. For Agent Settings, it's the Supabase database. The browser reads fresh every time.
- **Dev-mode flag** — a toggle (usually in env vars or a config) that enables developer-only features in non-production builds. Keeps things like the Debug tab hidden in real user-facing deployments.
- **Observability** — the practice of making a system's internal state visible from the outside. The Debug tab is observability infrastructure — you can see what Claude sees.

---

## Why this chapter matters

Three reasons, and this chapter is where the "rehearsal for real Eidrix" framing matters most:

**1. Relational context is how Eidrix becomes useful.** Single-entity context is a toy — "I have 12 customers." Relational context is real work — "Al Schindler has 3 open jobs totaling $45K, the oldest scheduled 10 days ago." That second kind of answer is what business owners actually need. This chapter is where you prove the pattern works. And the pattern transfers directly: real Eidrix's customers have jobs, jobs have invoices, invoices have line items. Same relational injection shape all the way down.

**2. Observability is non-negotiable for agentic systems.** Once Claude starts acting on your behalf (AC-03 tool calling), knowing what Claude sees becomes critical. "Why did it think Al Schindler had 5 jobs when he has 3?" — you debug that by looking at the system prompt that was sent. The Debug tab you build here is infrastructure that pays off through every future agentic chapter.

**3. Settings-as-data is how real Eidrix supports customization.** Every tenant of real Eidrix will have a different system prompt voice. Every tenant will want to tune context injection for their scale. Every tenant might choose a different model tier based on their budget. Hardcoded settings don't support any of that. Database-backed settings do. You rehearse the pattern now, at small scale, so the real-Eidrix version is mechanical.

---

## The plan, in plain English

1. **Start clean, branch**
2. **Thorough Plan** — Jobs schema + RLS, agent_settings schema + RLS, context injection logic, Debug tab architecture, Settings UI, BusinessConfig updates
3. **Build Jobs entity end-to-end** — migration, types, store, config update (primary tab appears via engine)
4. **Build agent_settings table + CRUD**
5. **Build Settings → Agent section UI**
6. **Update chat.ts** — reads agent_settings, fetches context based on mode, injects appropriately
7. **Build Agent Debug tab**
8. **Wire everything together** — settings save → next message uses new settings → debug tab shows what was actually sent
9. **Test both context modes with varied queries** — verify Smart Subset and Full both produce reasonable answers
10. **Update REAL_EIDRIX_NOTES.md**
11. **Code-simplifier review**
12. **Ship**

---

## Step 1 — Start clean, branch

```
Starting AC-02 — Context-Aware Chat. Biggest app capability yet. Rhythm check, then create branch feature/ac-02-build.

Read CLAUDE.md, PROGRESS.md, CURRICULUM_DESIGN.md, REAL_EIDRIX_NOTES.md (especially Data Architecture and Chat & Agent Behavior sections), the existing chat.ts Netlify Function from AC-01, customerStore.ts from Chapter 14, and the businessConfig.ts engine from Chapter 10.5. You're about to extend all four.
```

---

## Step 2 — Ask for the Thorough Plan

```
AC-02 adds Jobs as a second entity (relational to Customers), wires context injection in chat.ts so the AI knows about both, builds an Agent Debug tab for observability, and moves Settings into a Supabase agent_settings table so real Eidrix's per-tenant customization works out of the box.

Thorough-plan this. This is the largest AC chapter so far; the plan will be long.

## Jobs entity

Propose:
- `jobs` table schema (SQL) — columns, types, constraints, indexes
- RLS policies on jobs (mirroring customers — tenant-scoped via memberships)
- Migration file naming/structure consistent with Chapter 14's conventions
- `jobStore.ts` shape — CRUD functions, error handling, Supabase type-safety
- BusinessConfig update — adding Jobs as a new primary tab, specifying recordListConfig and recordDetailConfig

The engine should render Jobs as a primary tab with zero shell code changes. If you have to modify TabsPanel or App.tsx to make Jobs render, the engine from Chapter 10.5 has a bug — flag it. My expectation is config-only.

Job detail sections: Overview (the form), Related Customer (shows the customer this job belongs to). Keep it simple; rich multi-section detail is deferred to real Eidrix.

## agent_settings entity

Propose:
- `agent_settings` table schema — scoped per organization (one row per org), columns for system_prompt (text), context_mode (enum: 'off' | 'subset' | 'full'), model (enum: 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6' | 'claude-opus-4-7'), updated_at, updated_by (fk to auth.users)
- RLS policies — members of the org can SELECT and UPDATE; no INSERT needed if we auto-create a row on org creation (via Postgres trigger? client-side on first Settings visit?)
- Default values — what's the default system_prompt, context_mode ('subset' is my lean), model ('claude-sonnet-4-6' is my lean)
- `agentSettingsStore.ts` shape

## Settings UI

Settings already has a tab in the shell. Propose:
- New "Agent" section in Settings
- System prompt editor — textarea, min-height ~200px, monospace font would help for readability of long prompts
- Context mode — three-option radio or segmented control
- Model selector — dropdown or segmented control, with per-million-token cost reference ("$3/$15 per 1M" etc.)
- Save button — explicit save, not auto-save, so accidental keystrokes don't persist
- Reset to defaults button — restores default system prompt, context_mode, model
- Loading state while fetching settings from Supabase
- Error state if fetch/save fails
- Success toast on save

## chat.ts Netlify Function

This is the meatiest update. Propose:

1. Reading agent_settings for the authenticated user's active org at the start of each request. Use the user's session, not a service role. Failing that read is a hard failure — return 500 with a clear error.

2. Branching on context_mode:
   - 'off': system prompt = settings.system_prompt, no data injection
   - 'subset': fetch customers updated in last 30 days OR with any job in 'open' status, plus their associated jobs; format compactly; inject
   - 'full': fetch all customers + all jobs for the org; format compactly; inject

3. The context format in the system prompt. Propose the structure. My lean: something like
```
   === CURRENT BUSINESS DATA ===
   Business type: contractor
   Customers: 47 total, showing 12 most recent
   [customer rows]
   Jobs: 23 total, showing 8 open
   [job rows]
```
   Claude is better at structured context than unstructured. Propose the exact markdown-or-plaintext format.

4. Returning usage stats in the response — input_tokens, output_tokens, cache_tokens if applicable, model used, prompt size (bytes), context mode used, customer/job counts included. The Debug tab renders these.

5. Handling errors — if the data fetch fails, does the request still succeed with no context? Propose. My lean: succeed with no context and include a warning in the debug output, so the user isn't blocked by a flaky DB read.

## Agent Debug tab

- New primary tab "Agent Debug" via BusinessConfig — hidden in production via a dev-mode flag (propose the flag mechanism — env var read at build time, or runtime toggle?)
- UI: list of last 10 requests, stacked, newest first. Each item collapsed shows: timestamp, user message preview, model, token count summary. Expanded shows: full system prompt, full messages array, full response, usage stats, response time.
- Clear button — clears the in-memory history
- Request history stored in a React context or Zustand — not persisted across refreshes (AC-04's job if we want that later)
- Each new chat message triggers a debug entry automatically

The tab should be thoughtfully designed, not a raw JSON dump. Structured sections, proper typography, code-formatted blocks for the system prompt, etc.

## Token cost tracking

The Debug tab has per-request token counts. Propose whether we also show cumulative cost for the session (input_tokens * model_input_rate + output_tokens * model_output_rate). I lean YES — helps you viscerally see the cost difference between models during testing.

## Architecture questions

1. Context size concerns. Propose estimated token counts for 100 customers + 50 jobs in 'full' mode. If it's >5K tokens, we may want to warn the user that 'full' is expensive. If it's <1K, no issue. Calculate this with a real example.

2. Caching. Anthropic supports prompt caching — if the system prompt stays stable, repeated queries cost less. Does our dynamic-context system prompt benefit from caching? Propose. My lean: yes for the static parts (the base system prompt), probably not for the data injection which changes per request.

3. Service role vs user session for the Supabase fetch. The function runs server-side, so it could use service role (bypasses RLS, fastest) or the user's session token (respects RLS, safer). Propose. My lean: use the user's session because we pass it through the JWT and it ensures tenant isolation even if a bug in our code fails to filter correctly. Defense in depth.

4. What happens if the user changes their system_prompt and immediately sends a message? Race condition — the settings update may not have committed before the function reads. Propose. My lean: explicit save button (already proposed) means user clicks Save, waits for toast, then sends. If they don't, worst case is one message uses the old prompt. Non-critical.

5. The Agent Debug tab — how much of what it shows is sensitive? The system prompt and context data are tenant data. In production Eidrix, a user who enables dev mode should still only see their own org's data. Confirm the flow respects this (it will naturally if we respect RLS, but worth stating explicitly).

## Edge cases

At least 8:
- User sends a message with context_mode='full' but has zero customers and zero jobs (the data injection should still happen, just with "no customers yet" text)
- User changes system prompt mid-conversation (should next message use new prompt, yes)
- Claude's response references a customer by name that doesn't exist — hallucination. How does the user know? Debug tab helps.
- User in an org with no agent_settings row (should auto-create on first read with defaults)
- Supabase query for context data times out — function returns with 'no context injected, fallback warning'
- Token count exceeds model's context window for 'full' mode with huge data — function gracefully downgrades to 'subset' and warns
- Two users in the same org editing settings simultaneously — last write wins, updated_by tells you who. Acceptable for this chapter.
- Debug tab viewer — all 10 request entries should render smoothly, no perf issues
- User disables context ('off' mode) but their system prompt references customer data ("I'll help you manage customers") — mismatch but not our problem; user should update their prompt if they change mode

## What I'm NOT asking you to build

- Tool calling (AC-03)
- Persistent debug history across sessions (AC-04 can add)
- Per-user settings (just org-level for now)
- Role-based write permissions (any member can currently edit settings; role check comes later)
- Cost budget alerts / hard spending caps in-app
- Prompt versioning or history (edit history, rollback)
- A/B testing of system prompts
- Streaming of the context injection (it's always a complete block in the system prompt)

Plan, don't build. Wait for approval.
```

---

## Step 3 — Review the plan carefully

Specific things to push on:

**The context injection format.** If the plan shows something vague ("customer data is included"), push for the exact format. Claude is dramatically better with structured context. A real format looks like a bulleted list or markdown table, not a prose paragraph.

**The default system prompt.** Ask to see the actual proposed default. It's going to be shown to every Eidrix user on first load. If it's generic or cheerful, iterate.

**The dev-mode flag mechanism.** In real Eidrix the Agent Debug tab needs to be hidden from end users. Options: env var at build time (`VITE_DEV_MODE=true` shows it), runtime flag in agent_settings (user-level opt-in), auth check (only certain emails). My lean: **env var at build time for now, user-level toggle later.** Whatever Claude Code proposes, make sure it's explicit.

**Model costs in the UI.** Verify current pricing. Anthropic's pricing:
- Haiku 4.5: ~$0.25 / $1.25 per 1M input/output tokens
- Sonnet 4.6: ~$3 / $15 per 1M input/output tokens
- Opus 4.7: ~$15 / $75 per 1M input/output tokens

If the plan has wrong numbers, catch them now.

**The BusinessConfig update.** Adding Jobs as a new primary tab should be a config edit, not engine code edits. If the plan touches the engine or TabsPanel to make Jobs render, something's wrong — push back. The engine should render new entity types from config alone.

**Service role vs user session for data fetch.** This matters. Confirm the plan uses the user's JWT (forwarded from the browser to the function via the Authorization header), and that the Supabase client in the function uses that JWT — so RLS applies, defense in depth. If it uses service role, flag: "what if our query forgets to filter by org_id and we accidentally cross-tenant leak?" RLS-protected queries make that impossible.

When solid:

```
Plan approved. Start with the Jobs entity — migration, RLS policies, types, jobStore, BusinessConfig update. Confirm Jobs appears as a primary tab from config alone, no shell edits. Stop before building agent_settings.
```

---

## Step 4 — Jobs entity, engine validation

Claude Code ships Jobs end-to-end via config. When it stops, open Trial and Error and verify:

- Jobs primary tab appears between existing tabs (wherever the config places it)
- You can add a Job — form works, links to a customer via dropdown
- Jobs list renders with proper columns
- Clicking a Job opens detail tab (Overview + Related Customer sections)
- Customer detail shows jobs related to that customer

**The engine validation moment:** verify App.tsx and TabsPanel.tsx have zero changes from this work. If they do, the engine needs a fix before we proceed. Jobs existing as config alone is a proof point.

When good:

```
Jobs entity works end-to-end, engine renders from config alone. Now build agent_settings table + UI.
```

---

## Step 5 — Agent settings UI

Claude Code ships the `agent_settings` table, default population, Supabase queries, and the Settings → Agent UI section.

Test:
- Settings → Agent loads with defaults (or existing saved values)
- Edit system prompt, save — persists across refresh
- Change context mode, save — persists
- Change model, save — persists
- Reset to defaults works

Nothing yet affects chat because chat.ts doesn't read these. That's next.

```
Agent settings UI works, persists to Supabase. Now update chat.ts to read settings at request time and implement context injection for both 'subset' and 'full' modes.
```

---

## Step 6 — chat.ts update + context injection

The biggest code chunk in this chapter. Claude Code ships:
- Settings read at request time
- Data fetch branching on context_mode
- Structured context format in system prompt
- Usage stats returned

**Before testing in the UI, test the function with curl like in AC-01.** Send a fake user ID, messages array, verify the response includes usage data and that the system prompt length varies based on context_mode (can see this by passing context_mode in the curl body directly for testing if your function shape allows it).

Once the function works:

Test in the UI:
- With context_mode='off', chat behaves as AC-01 did (generic responses, no data awareness)
- With context_mode='subset', chat knows about recent customers and jobs
- With context_mode='full', chat knows about everything
- Ask specific relational questions: "how many jobs does [customer] have?", "which customers have open jobs?", "what's my total job revenue?"

If responses are wrong or Claude hallucinates, that's a context format issue. Iterate.

When good:

```
Context injection works for both modes. Now build the Agent Debug tab.
```

---

## Step 7 — Agent Debug tab

Claude Code builds the Debug tab as a new primary tab via BusinessConfig (engine should render it without shell edits, same pattern as Jobs). Dev-mode flag controls visibility.

Test:
- Debug tab appears (with dev mode on)
- Send a chat message — entry appears in Debug tab with all the data
- Collapsed view shows summary, expanded shows full detail
- Clear button works
- Request history persists within the session

Verify the tab is hidden if the dev-mode flag is off (set env var, restart dev server, check it's gone).

---

## Step 8 — Cumulative session cost

Add cumulative cost display to the Debug tab based on current session's token counts and models used. Small addition but satisfying — you can viscerally see "this session has cost $0.03 so far" as you test.

```
Add cumulative cost tracking to the Debug tab based on current session usage. Show at the top of the tab. Use the current model rates (Haiku $0.25/$1.25, Sonnet $3/$15, Opus $15/$75 per 1M). Reset button clears cost along with history.
```

---

## Step 9 — Iterate and stress-test

This is the "chat with it for 30 minutes" step. Things to try:

- Ask open-ended questions ("what should I focus on today?") — does Claude use context thoughtfully?
- Ask specific relational questions ("which of my customers has the most open jobs?")
- Try questions with no data ("what's the weather?") — Claude should be graceful
- Toggle between context modes during a conversation and notice the shift in responses
- Swap models mid-conversation (Sonnet → Opus) and notice the reasoning difference
- Edit the system prompt aggressively — make Eidrix speak in pirate voice for 5 minutes, just to see the machinery work

Things to notice:
- Does 'subset' feel adequate for most queries?
- When does 'full' actually earn its token cost vs when does 'subset' suffice?
- Does the Debug tab make it easy to understand what went wrong on bad responses?
- Is the cost tracking motivating discipline ("don't leave Opus on for exploratory chat")?

Iterate on whatever's off.

---

## Step 10 — Update REAL_EIDRIX_NOTES.md

```
Update REAL_EIDRIX_NOTES.md with decisions locked in AC-02:

In Data Architecture:
- Add Jobs as a new entity pattern, note that real Eidrix will extend the relational chain (Customer → Job → Invoice → LineItem, etc.)
- Note the RLS pattern mirrors across entity types — every tenant-scoped table uses the same policy shape

In Chat & Agent Behavior:
- Lock in: system prompt lives in agent_settings, per-org, customizable
- Lock in: context injection with Smart Subset as the default production mode; Full mode available for tenants with small datasets
- Lock in: dev-only Debug tab pattern for observability; not shipped to end users without explicit enablement
- Lock in: Sonnet 4.6 as the default model for real Eidrix's context-aware work; Opus 4.7 as upgrade path for heavy reasoning tasks

In Model Strategy:
- Rehearsed model switching mechanics in Trial and Error; production flow is the same pattern
- Cost visibility (Debug tab) is pattern to preserve in real Eidrix, possibly surfaced in admin UI for owners

In Open Questions (new items):
- How does real Eidrix decide WHICH subset data is "smart"? (Trial and Error uses recency + open status; real Eidrix may need per-tenant tuning)
- Role-based Settings write permissions — when? Defer until second paying customer or explicit need.
- Owner-configurable vs locked-by-Eidrix settings — which settings can staff override, which are org-owner-only?

Changelog entry: "April [date] 2026 — AC-02 (Context-Aware Chat) shipped. Jobs entity added, relational context injection working end-to-end in Subset and Full modes, Settings moved to Supabase per-org, Agent Debug tab provides observability. Sonnet 4.6 now default model."
```

---

## Step 11 — Code-simplifier review and ship

```
Code-simplifier review on new Supabase migrations, jobs-related files, agent_settings files, updated chat.ts, Settings UI additions, Agent Debug tab. Report suggestions, don't auto-apply.

Then commit, check off AC-02 in PROGRESS.md, push, open PR.
```

Test Deploy Preview carefully — all the env vars from Chapter 13 plus agent_settings data all need to work against cloud Supabase. If Deploy Preview passes, merge and clean up.

---

## What just happened

Eidrix went from "chat that works" to "chat that knows your business." The difference is measured in utility — a business owner using this version of Eidrix could actually get work done, not just chat about their business.

More importantly, you built the **observability layer** that's going to pay off through every future chapter. The Debug tab you just shipped shows what Claude sees; when AC-03's tool calling starts firing, you'll watch it reason about *whether* to call a tool and *which* tool. When AC-04's memory comes online, you'll see how past context gets recalled. The Debug tab is not a "nice to have" — it's the lens through which you'll understand every future agentic behavior.

And you rehearsed the full pattern real Eidrix needs: relational context, per-tenant settings, configurable models, structured data injection, cost visibility. None of that was theoretical. You wrote it in working code, shipped it, watched it run, iterated on feel. Real rehearsal for the real build.

---

## What success looks like

- Jobs entity exists with full CRUD, relational to Customers
- Jobs appears as primary tab via BusinessConfig alone (no shell edits required)
- agent_settings table exists with RLS, auto-populates defaults on first fetch
- Settings → Agent UI lets you edit system prompt, context mode, and model selection
- Saves persist to Supabase, affect the next message sent
- chat.ts reads settings per request, fetches context based on mode, injects structured data
- Both 'subset' and 'full' modes produce sensible responses to relational queries
- Agent Debug tab shows what was sent, what came back, token counts, response time, cumulative session cost
- Dev-mode flag hides Debug tab in production contexts
- Model switching works end-to-end (Haiku / Sonnet / Opus)
- REAL_EIDRIX_NOTES.md updated with locked decisions
- All Chapter 10/14 features still work (customer CRUD, auth, empty states)
- Deploy Preview and production both work

---

## If something broke

- **"Jobs doesn't appear as a tab"** — BusinessConfig not registering it or engine has hardcoded tab list. Tell Claude Code: *"Added Jobs to config but it doesn't render. Trace why the engine isn't picking it up."*
- **"RLS blocks my job queries even though I'm authed"** — membership row missing or org mismatch. Tell Claude Code: *"Jobs queries return zero rows but data exists. Verify the auth session passes to Supabase and RLS can see auth.uid()."*
- **"Context mode 'full' times out or crashes"** — too much data for the model. Tell Claude Code: *"Full context mode fails with [error]. Check total token count. May need to chunk or downgrade gracefully."*
- **"Debug tab shows stale data"** — React state not updating. Tell Claude Code: *"Debug tab doesn't show new requests. Trace the state update — context provider may not be wired."*
- **"Settings save but don't affect chat"** — chat.ts not re-reading. Tell Claude Code: *"Changed system prompt in settings, saved, but chat still uses old prompt. Verify chat.ts reads settings fresh on each request, not cached."*
- **"Cost tracking shows wrong numbers"** — wrong rate constants or wrong token source. Tell Claude Code: *"Cumulative cost is [wrong amount]. Check the rates being used and the token field names."*
- **"Claude hallucinates customers that don't exist"** — context format is confusing Claude. Tell Claude Code: *"Claude is mentioning customers not in the data. The context format isn't being parsed. Show me the exact system prompt being sent (check Debug tab) and we'll iterate the format."*

---

## Tour Moment — Observability as a discipline

The Agent Debug tab you just shipped is an **observability tool**. In professional software engineering, observability is as important as the software itself. Production apps have dashboards showing latency percentiles, error rates, log streams, traces of individual requests. Teams get alerts when metrics drift. Engineers debug by looking at traces, not by running the code locally and hoping.

For AI apps specifically, observability is even more critical because AI behavior is nondeterministic. "Why did Claude say X?" has no good answer without seeing exactly what it saw. The Debug tab is your window into that.

When you build real Eidrix, you'll want this pattern at production scale. Not exposed to every user, but available to you (and eventually your support team) as a tool for debugging customer reports. "A contractor reports that Eidrix forgot a job" → you look at their Debug tab data → you see the context that was sent → you figure out whether the data was missing, the prompt was wrong, or Claude just blew it.

Observability is what separates "AI app we can maintain" from "AI app that's a black box we pray doesn't break." You just laid that foundation.

---

## Tour Moment — Structured context beats prose

The format you're using to inject customer and job data into the system prompt matters enormously. Compare:

**Prose version:**
> You have 47 customers and 23 jobs. Some recent customers include Al Schindler, Alejandro Valenzuela, and Alex Perez. Al Schindler has 3 open jobs including a $4,540 proposal. Alejandro has no jobs currently.

**Structured version:**
```
=== CUSTOMERS (47 total, showing 12 most recent) ===
- Al Schindler (Lead) | (775) 778-1802 | 3 jobs | last activity: 2026-04-14
- Alejandro Valenzuela (Contacted) | (775) 455-6112 | 0 jobs | last activity: 2026-04-12
- Alex Perez (Inactive) | (177) 593-4714 | 0 jobs | last activity: 2026-03-02

=== JOBS (23 total, showing 8 open) ===
- Proposal for Al (Customer: Al Schindler) | Draft | $4,540 | Created 3 weeks ago
- Siding repair (Customer: Jeff Henderson) | Scheduled | $12,800 | Starts 2026-04-25
```

Claude's reasoning quality is dramatically higher on the structured version. It can parse relationships, count things, filter by status, and generally reason about the data as data. The prose version it processes as language, which means it makes language-shaped mistakes.

Rule for life: **when injecting data for AI to reason about, format it like data, not like a description of data.** Tables, bullet lists, key-value pairs, JSON when complex. Save prose for instructions.

---

## Tour Moment — The "config over code" payoff

You just added a new primary tab (Jobs) and a new debug tab (Agent Debug) without modifying TabsPanel.tsx or App.tsx. The engine from Chapter 10.5 rendered both from BusinessConfig alone.

That's the payoff for the work you did months ago. And that payoff compounds — AC-03 will add new detail sections (jobs nested inside customer detail, maybe proposals nested inside jobs) and again, it'll be config changes, not engine changes. AC-16's subagents will eventually add specialized chat contexts and again, config changes.

Every time you add to the config without editing the engine, you're validating the architectural decision. Every time you would need to edit the engine, you're learning something new about what the engine should support.

Real Eidrix gets the benefit of every validation you do here. The engine you port to real Eidrix has been stress-tested across two business types (contractor, merch), multiple entity types (customers, jobs, proposals via extension), multiple UI patterns (list, form, detail, nested sections). That's a lot of architectural maturity for what was a chapter about adaptability.

---

## Tour Moment — Model selection is a product decision

You now have three models available in Settings. Most users of AI products never see this choice — platforms pick for them. Real Eidrix might do the same eventually. But before you can pick for users, you have to know *why* you'd pick one over another.

Rough heuristics from the field:
- **Haiku (fast, cheap)** — good for quick responses, simple questions, high-volume chat, conversational flow. If Eidrix becomes a fast-turnaround assistant, Haiku is a legitimate production choice.
- **Sonnet (balanced)** — the workhorse. Good reasoning, fast enough, cost-effective. Most production AI apps sit here. This is what we're defaulting to.
- **Opus (deep thinking)** — when getting it right matters more than getting it fast or cheap. Agentic loops with many steps. Complex reasoning. Legal/medical/financial analysis. Opus earns its cost when the alternative is "wrong answer delivered quickly."

For real Eidrix's production path, I'd expect:
- **Normal conversational chat**: Sonnet 4.6
- **Tool calling (AC-03) with complex multi-step agent behavior**: Sonnet by default, Opus when the user asks a "thinking" question
- **Quick factual queries ("when's my next appointment?")**: could route to Haiku

This is **model routing** — deciding per-request which model to use. Trial and Error doesn't do this; real Eidrix might. Flag for the pre-build audit.

---

## Next up

**AC-03 — Tool Calling.** THE chapter. Claude gets permission to CREATE, UPDATE, DELETE customers and jobs via natural language. "Add a customer named John Smith, phone 555-1234" — a new row appears. "Mark Al's proposal as approved" — the status changes. This is where Eidrix becomes agentic, not just aware. About 4-5 hours. The centerpiece of the entire curriculum.

After AC-03:
- **AC-04 — Agent Memory.** Cross-session persistent memory via hybrid storage (Postgres + vector store). ~3-4 hours.
- **AC-05 — Multi-Turn Loops.** Agent takes multiple steps per request. "Plan my Thursday" becomes real. ~2-3 hours.
- **Pre-Build Audit.** The graduation chapter. Review everything, clean up CLAUDE.md, produce starting brief for real Eidrix. ~2-3 hours.

Three agentic chapters + the audit between you and building the real thing. Close.
