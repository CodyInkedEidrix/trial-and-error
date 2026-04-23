# AC-03 — Agentic Foundation

*App Capability. The centerpiece chapter. Eidrix stops being aware and starts being agentic. You're adding Proposals as a third entity, defining a full suite of tools across Customers/Jobs/Proposals, building the server-side tool execution loop, injecting UI context so Eidrix knows what the user is looking at, handling ambiguity with inline clarification, gating destructive actions behind inline confirmation, refreshing the UI live as the agent mutates data, and upgrading the Agent Debug tab to full-trace mode. The longest chapter in the curriculum. About 8-10 hours across two sessions. After this chapter, Eidrix is real.*

---

## What you're learning

1. **Tool definitions** — how you describe capabilities to Claude so it knows when and how to call them
2. **The tool execution loop** — the server-side orchestration where Claude calls a tool, your code runs it, the result goes back, Claude decides what's next, repeat until done
3. **Anthropic's tool use protocol** — specifically how tool calls and tool results are structured in the message stream
4. **UI context as part of agent awareness** — injecting "where the user is" alongside the data context from AC-02
5. **Ambiguity resolution** — when the agent has enough info to act vs. when it should ask
6. **Inline confirmation flows** — destructive actions that require human approval without breaking conversation flow
7. **Live UI refresh patterns** — when the agent mutates data, how the affected views update without manual refresh
8. **Full-trace observability** — seeing every step of a multi-tool-call sequence in the Debug tab
9. **Error handling across a tool loop** — tools failing, retries, graceful degradation, keeping the agent oriented

---

## Mental Model (read before planning)

Tool calling feels complicated until you see the loop. Here's the entire flow on one page.

**Without tools (AC-01 through AC-02):**
````
user message → Claude → response text → done
````

**With tools (AC-03):**
````
user message
  ↓
Claude (with tool definitions)
  ↓
Claude decides: respond directly OR call a tool
  ↓ (if tool)
Tool call request (e.g., "call addCustomer with name='John'")
  ↓
Your Netlify Function: extract tool call, run the actual mutation
  ↓
Tool result (e.g., {success: true, customer: {id: '...', name: 'John'}})
  ↓
Result sent BACK to Claude in the messages array
  ↓
Claude sees the result, decides: respond OR call another tool
  ↓
(loop until Claude stops calling tools)
  ↓
Final response text → user
````

A single user message can trigger one tool call (simple: "add John"), several in parallel (plausible: "add John, Jane, and Joe"), or a chain where each call depends on the previous one (complex: "add John, then create a proposal for his new kitchen job at $15,000" — requires addCustomer, createJob, then createProposal with the new IDs).

**Your Netlify Function becomes the orchestrator of this loop.** It's no longer just "forward the message to Claude, stream back the response." It's "manage a back-and-forth conversation with Claude where tool calls get intercepted, executed, results returned, until Claude's done." This is the single biggest architectural change of the chapter.

**Confirmations complicate the loop.** For destructive actions (delete customer, bulk operations), Claude outputs a "pending action" rather than calling the tool directly, and the user confirms via inline chat buttons. Only after confirmation does the tool actually run. This means the chat state tracks "pending confirmations" as part of message history.

**UI context injection** is the easier piece — just a new section in the system prompt showing active tab, active record, active sub-view. Claude reads it and uses it to interpret ambiguous requests.

Read this section twice. When you ask Claude Code for the plan, it'll propose an architecture; you need this mental model to evaluate it.

---

## What you're building

### Proposals entity

- `proposals` Supabase table — id, job_id (fk, optional — proposals can pre-date jobs), customer_id (fk), organization_id (fk), title, amount, status ('draft' | 'sent' | 'approved' | 'rejected'), created_at, updated_at, notes
- RLS policies mirroring customers and jobs patterns
- `proposalsStore.ts` wrapping CRUD
- Proposals added to BusinessConfig — new primary tab appears via engine, no shell changes
- Proposal detail sections: Overview (form), Related Customer, Related Job

### Tool definitions

~15-18 tools covering the operational surface. Proposed set:

**Customer tools:**
- `addCustomer` (name, email?, phone?, status?)
- `updateCustomer` (id, fields to update)
- `deleteCustomer` (id) — destructive, requires confirmation
- `searchCustomers` (query — name/email/phone fuzzy match, returns matches)
- `findCustomerByStatus` (status)

**Job tools:**
- `addJob` (customer_id, title, status?, scheduled_date?, amount?)
- `updateJob` (id, fields to update)
- `deleteJob` (id) — destructive, requires confirmation
- `markJobStatus` (id, new_status)
- `findJobsForCustomer` (customer_id)
- `findJobsByStatus` (status)

**Proposal tools:**
- `addProposal` (customer_id, job_id?, title, amount, status?)
- `updateProposal` (id, fields)
- `deleteProposal` (id) — destructive
- `markProposalStatus` (id, new_status)
- `findProposalsForCustomer` (customer_id)
- `findProposalsForJob` (job_id)

**General:**
- `summarizeForCustomer` (customer_id — returns combined view of customer + jobs + proposals, useful for overview requests)

### Tool execution loop in chat.ts

- Accepts message + conversation history + user's active UI context (active tab, active record, active section)
- Reads agent_settings (model, system prompt, context mode) from AC-02
- Fetches context data (customers/jobs/proposals based on mode) from AC-02
- Injects UI context into system prompt (new)
- Sends to Anthropic with tool definitions
- Loop: receive response → if tool calls present, execute each (with proper authentication/RLS), append results to messages → send again → repeat
- Streams the final text response back to the browser once no more tool calls
- Returns tool execution log alongside response for the Debug tab
- Handles tool errors with structured error results back to Claude so it can reason about failures

### UI context injection

New client-side state: "what is the user currently looking at?"
- `activeTab` — which primary tab is active
- `activeRecord` — the open record tab if any (customer id, job id, proposal id)
- `activeSection` — which secondary tab within the active record

This state is gathered on each chat message send, included in the request to the function, and injected into the system prompt as:

````
=== CURRENT UI CONTEXT ===
Primary tab: Customers
Active record: Al Schindler (customer id: abc-123)
Active section: Jobs

The user is currently viewing Al Schindler's record, on the Jobs sub-section.
Interpret ambiguous references to "this customer" or "this job" in light of this context.
````

### Inline confirmation UI

When Claude wants to call a destructive tool, it instead returns a structured "pending action" in its response:

````json
{
  "type": "pending_action",
  "action": "deleteCustomer",
  "params": {"id": "abc-123"},
  "summary": "Delete customer Al Schindler (775-778-1802, 3 jobs)"
}
````

The chat UI renders this as a message with the summary text and two buttons: **Confirm** and **Cancel**. Clicking Confirm sends a follow-up message to the function like `"Confirmed: deleteCustomer abc-123"` which actually calls the tool. Clicking Cancel sends `"Cancelled"`.

This means pending confirmations become part of the visible chat history — which is exactly what you want for auditability.

### Ambiguity resolution

When Claude encounters an ambiguous reference:
- If the UI context resolves it (user is on Joe Smith's record, user said "schedule Joe's job") → Claude proceeds
- If UI context doesn't resolve it (user on list view, multiple matches, user said "Joe") → Claude responds asking for clarification: *"Which Joe — Joe Smith (3 open jobs) or Joe Martinez (1 proposal)?"* with optional clickable options in the chat

Clickable options in ambiguity resolution are optional polish; core is the agent asking naturally with specific info. We'll add clickable if time permits.

### Live UI refresh

When the agent mutates data (adds a customer, updates a job), the UI must reflect it without the user needing to refresh or re-navigate.

Approach: the customerStore, jobStore, and proposalsStore already use Supabase. When the function mutates data server-side, we need the client-side stores to know to refetch. Options:

- **Manual refetch** — after a tool call completes, the chat function returns a list of affected entity IDs, the client refetches those stores
- **Supabase Realtime** — subscribe to database changes, auto-refresh. More elegant but adds complexity
- **Full invalidation** — simplest, refetches everything after any mutation. Cheap at current scale.

For this chapter: **manual refetch**, client-side, based on affected entity types returned from the function. Real Eidrix at scale might use Realtime.

### Agent Debug tab full-trace upgrade

The Debug tab from AC-02 currently shows system prompt + response. For AC-03, each request entry expands to show:

- User's original message
- System prompt sent (with injected UI context visible)
- Claude's response (which may be tool calls, not text)
- For each tool call: tool name, parameters, result (or error), timing
- Claude's next response (may be more tool calls, or final text)
- ... continues for the full loop
- Final text response delivered to user
- Total round trips, total tokens, total time

This is the primary diagnostic tool for everything agentic going forward. Build it well.

### REAL_EIDRIX_NOTES.md updates

Locking in: tool calling architecture, tool execution loop pattern, confirmation UI pattern, UI context injection pattern, live refresh strategy, full-trace observability pattern, model-required-for-tool-calling (Sonnet 4.6 minimum) commitment.

---

## Plain English glossary

- **Tool definition** — a JSON schema describing a function the agent can call (name, description, parameter types). You give Claude these; Claude decides when to call them.
- **Tool call** — Claude's output when it wants to invoke a tool (tool name + arguments). Not executed by Claude; your code executes it.
- **Tool result** — the return value from executing a tool, sent back to Claude so it can continue reasoning.
- **Tool use loop** — the back-and-forth between Claude and your code: Claude makes tool calls, your code executes, returns results, Claude decides next step, repeat until Claude stops calling tools.
- **Structured output** — when Claude returns data (like a pending action) in a machine-readable format rather than freeform text.
- **UI context** — information about what the user is currently looking at in the app, injected into the agent's context to disambiguate references.
- **Ambiguity resolution** — the agent's judgment about whether to proceed confidently or ask for clarification.
- **Confirmation flow** — the pattern where a destructive action is proposed, shown to the user for approval, and only executed after explicit confirmation.
- **Live UI refresh** — updating the UI in response to data changes without requiring the user to trigger a manual refresh.
- **Full trace** — a complete record of an agent's reasoning, including every tool call and result in order, for debugging.

---

## Why this chapter matters

Three reasons:

**1. It's the chapter where Eidrix becomes a product, not a demo.** Every chapter before this was preparation. AC-03 is where "I built an AI app" becomes "my AI app does actual work for me." A business owner using post-AC-03 Eidrix doesn't type into forms; they describe intent and the app executes. That's the product you've been building toward.

**2. The patterns in AC-03 are the architectural core of real Eidrix.** Tool definitions, execution loop, confirmation UI, UI context, live refresh, full-trace debugging — every one of these ports directly. When you sit down to build real Eidrix, you're not relearning these patterns; you're extending them. AC-03 is where the architectural DNA gets established.

**3. Agent building is a distinct skill, and this chapter is where you develop it.** Writing React components is one skill. Building agents is a different one — it requires thinking about tool granularity, context design, failure modes, confirmation boundaries, and observability simultaneously. You only get good at this by doing it, failing, iterating. AC-03 is your first serious reps. The mistakes you make here become the intuitions you rely on in real Eidrix.

---

## The plan, in plain English

This plan is structured across two sessions because doing it in one sitting produces sloppy work.

**Session 1 — Foundation (4-5 hours):**
1. Start clean, branch
2. Thorough Plan
3. Build Proposals entity end-to-end (migration, RLS, types, store, config)
4. Verify Proposals as primary tab via engine (no shell edits)
5. Define all tools (JSON schemas, TypeScript types)
6. Build the tool execution loop in chat.ts (without confirmations, without UI context — just raw tool calling)
7. Test with curl and in the UI — simple tool calls working
8. Break session — merge Session 1 PR, update PROGRESS

**Session 2 — Agentic behavior (4-5 hours):**
9. UI context injection (new primary tab state tracking, passed to function, injected into system prompt)
10. Confirmation UI (pending action pattern, inline buttons, two-step flow)
11. Live UI refresh (store invalidation after mutations)
12. Agent Debug tab upgrade (full trace view)
13. Ambiguity resolution patterns (system prompt guidance, testing edge cases)
14. Stress test — long session, many tool calls, confirm the loop is stable
15. Update REAL_EIDRIX_NOTES.md with all decisions
16. Code-simplifier review, ship Session 2 PR

Treat Session 1 and Session 2 as truly separate. Merge Session 1 cleanly before starting Session 2. If Session 1 has bugs, fix them in Session 2's setup, don't carry debt forward.

---

## Step 1 — Start clean and branch (Session 1)

````
Starting AC-03 — Agentic Foundation. Biggest chapter. I want to ship this in two sessions.

First: rhythm check. Then check the model setting in agent_settings — AC-03 requires Sonnet 4.6 or Opus 4.7. If it's still Haiku, tell me before we proceed; I'll update Settings before starting.

Once model is confirmed Sonnet+, create branch feature/ac-03-session-1.

Read CLAUDE.md, PROGRESS.md, CURRICULUM_DESIGN.md, REAL_EIDRIX_NOTES.md (especially the Tool Calling & Agentic Behavior section — even if empty, we'll fill it during this chapter), plus the AC-02 chat.ts, agentSettingsStore, and customerStore/jobStore patterns. All new work builds on those.
````

Before the plan, double-check you're on Sonnet. AC-03 on Haiku is painful.

---

## Step 2 — Ask for the Thorough Plan (Session 1 scope)

````
AC-03 Session 1 — Agentic Foundation, first half.

Session 1 scope (this plan):
- Proposals entity (migration, RLS, types, store, BusinessConfig update)
- Tool definitions for Customers, Jobs, Proposals (~15-18 tools total)
- Server-side tool execution loop in chat.ts
- Basic testing via curl and in-UI

Session 2 scope (separate plan later):
- UI context injection
- Confirmation UI for destructive actions
- Live UI refresh
- Agent Debug tab full-trace upgrade
- Ambiguity resolution patterns

Thorough-plan Session 1 only.

## Proposals entity

Propose the full SQL migration, RLS policies, TypeScript types, proposalsStore.ts shape. Match the patterns established in Chapter 14 (customers) and AC-02 (jobs). Proposals need:
- customer_id (fk, required — proposals always belong to a customer)
- job_id (fk, nullable — a proposal can pre-date any job being created)
- organization_id (fk, required, tenant-scoped)
- title, amount (numeric/decimal), status (enum)
- timestamps

BusinessConfig update: add Proposals as the fourth primary tab (after Customers, Jobs). Detail sections: Overview (form), Related Customer, Related Job. Config-only — engine renders from config.

## Tool definitions

Propose the full set of tool definitions as a TypeScript file exporting an array of tool specs in Anthropic's format:

```typescript
{
  name: 'addCustomer',
  description: 'Add a new customer to the organization...',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '...' },
      email: { type: 'string', description: '...' },
      // ...
    },
    required: ['name']
  }
}
```

For each of the 15-18 tools I listed in the chapter scope, write the full spec. Description matters more than you'd think — Claude uses descriptions to decide which tool to call. Good descriptions explain when to use the tool, not just what it does.

Pay particular attention to:
- `searchCustomers` description — how Claude knows to use this vs. relying on injected context
- `summarizeForCustomer` description — when Claude should request a fuller picture
- Destructive tool descriptions — mention that the system will gate these behind user confirmation; don't tell Claude to skip calling them for destructive actions, let Session 2's confirmation UI handle that

## Tool execution in chat.ts

Propose the full updated shape of chat.ts. Core changes:
- On each incoming message, Claude may return `stop_reason: 'tool_use'` with tool calls
- When that happens: extract tool calls, execute each server-side, append results as `tool_result` messages, send the updated message array back to Claude
- Loop until Claude returns `stop_reason: 'end_turn'` (no more tool calls)
- Stream the final text response

Key architecture question: since Claude's streaming response may include tool calls rather than text, streaming-to-browser only happens on the FINAL response. During intermediate tool-use turns, we're not streaming text — we're executing tools. Confirm the plan handles this correctly.

## Tool execution implementation

Each tool maps to a server-side function. Propose where these live:
- `netlify/functions/_lib/tools/customers.ts` — addCustomer, updateCustomer, deleteCustomer, searchCustomers, etc.
- `netlify/functions/_lib/tools/jobs.ts` — job tools
- `netlify/functions/_lib/tools/proposals.ts` — proposal tools
- `netlify/functions/_lib/tools/index.ts` — aggregates, maps tool name → executor function

Each executor:
- Takes parameters and the authenticated Supabase client (user's JWT, RLS-respected)
- Performs the operation
- Returns a structured result: `{ success: true, data: {...} }` or `{ success: false, error: "..." }`
- Never throws — always returns structured error for Claude to reason about

## Error handling

When a tool fails (bad parameters, RLS denial, database error, etc.):
- Return structured error to Claude
- Claude sees the error, reasons about what to do (retry with fix? tell user? ask for clarification?)
- Don't short-circuit the loop on errors — let Claude handle them

Propose specific error shapes for common cases.

## Debug instrumentation (Session 1 basic)

The Debug tab currently shows system prompt + response. For Session 1, add:
- Tool calls made (as JSON)
- Tool results (as JSON)
- Loop iterations (e.g., "3 round trips before final response")
- Per-tool execution time

Session 2 upgrades this to full trace view. For now, raw JSON is fine — we'll make it pretty in Session 2.

## Architecture questions

1. How does the Netlify Function authenticate Supabase for tool execution? Same pattern as AC-02 (user's JWT) or service role? Confirm same pattern — we want RLS to enforce safety even through tool execution.

2. What happens if a tool call takes >10 seconds (Netlify Function timeout on Hobby plan)? For this chapter, most tools are fast Supabase writes (<1s). But flag: if a loop has many iterations, total time could approach the timeout. What's the plan if we hit it?

3. Parallel vs. serial tool execution — Claude may output multiple tool calls at once ("add Customer X, Y, Z"). Should we execute in parallel or serially? Propose. My lean: parallel when tools are independent, but confirm the plan handles any dependency cases.

4. Tool call determinism — Claude is non-deterministic; for the same input it may call different tools. How do we handle "Claude decides not to call any tool when it clearly should have"? Not solvable, but the system prompt should set expectations.

5. Rate limiting — Anthropic has rate limits. A long tool loop could burn through tokens fast. Should we cap the number of loop iterations? Propose a max (10 iterations? 20?) with graceful failure.

6. Context_mode interaction with tool-backed retrieval — once `searchCustomers`, `findJobsByStatus`, and `summarizeForCustomer` are available as tools, is AC-02's "Full" context injection redundant (agent receives data twice — once in the system prompt, once on demand via tools)? Is "Subset" still the right default, or should tool availability shift the default toward "Off" (agent fetches on demand via tools)? Propose how the three modes should behave now that tools exist, and what the new default should be.

## Edge cases for Session 1

At least 8:
- Claude calls a tool that doesn't exist (typo'd name) — graceful error back to Claude
- Claude calls a tool with invalid parameters — validation error back to Claude
- A tool fails (RLS denial, database error) — structured error back to Claude
- Claude calls tools in parallel but one fails — partial success handling
- Loop exceeds max iterations — graceful "I'm having trouble completing this. Here's where I got..." response
- Claude outputs text response without calling any tool — normal flow, stream back
- Claude calls a tool, then returns text, then calls another tool — handle the sequence correctly
- User's session expires mid-loop (auth token refresh) — retry or fail gracefully
- Very long tool chain (5+ iterations) — UI shows "Eidrix is working..." with progress indication (for UX, Session 2 will polish this)

## What I'm NOT asking you to build in Session 1

- UI context injection (Session 2)
- Confirmation UI (Session 2)
- Live UI refresh after mutations (Session 2)
- Agent Debug tab upgrade to full trace (Session 2)
- Ambiguity resolution patterns beyond "Claude will naturally ask if confused" (Session 2)

Plan Session 1 only, don't build. Wait for approval.
````

---

## Step 3 — Review the plan carefully

Specific things to push on:

**Tool descriptions.** If descriptions are generic ("Adds a customer"), push for richer. Good descriptions explain when AND why and include example phrases. Example: *"Add a new customer to the organization. Use when the user describes someone not yet in the system by name, or explicitly asks to add/create/register a customer. Required: name. Optional: email, phone, initial status."*

**The tool execution loop architecture.** Verify the plan correctly handles Claude's `stop_reason` values. Specifically:
- `end_turn` means done, stream the response
- `tool_use` means execute tools, send results back, continue
- `max_tokens` means we hit a limit, handle as error
- If the plan treats all non-tool responses the same, push for precision

**Authentication through the loop.** The plan must clearly show that every tool execution uses the user's JWT, respecting RLS. If any tool executor bypasses to service role, flag it — that's a security regression.

**Parallel tool execution.** If the plan serializes everything, that's a perf issue — Claude often outputs 3+ independent tool calls and serializing costs real time. But if the plan parallelizes without thought for dependencies, that's a correctness issue. The right answer: parallelize by default, detect dependencies (this is rare but possible), serialize when needed.

**Loop iteration cap.** 10 iterations is reasonable. If the plan has no cap, push — runaway loops burn tokens fast. If it's set too low (3), Claude might not be able to complete complex tasks.

**Error structure consistency.** Every tool should return the same error shape so Claude can reason about errors uniformly. If different tools have different error shapes, flag.

When solid:

````
Plan approved for Session 1. Start with Proposals entity end-to-end. Stop after Proposals works in the UI as a primary tab.
````

---

## Step 4 — Build Proposals (Session 1)

Same pattern as AC-02's Jobs. Claude Code builds migration, types, store, config update. Verify:

- Proposals appears as primary tab via engine (zero shell edits)
- Add Proposal form works with customer selection dropdown
- Proposal detail opens as third-tier tab
- Relationships visible — proposal's customer, optional linked job

When good:

````
Proposals works as a primary tab. Now define all the tools (types + Anthropic-format schemas), add the server-side tool executors, update chat.ts with the tool execution loop.

No UI context yet, no confirmation UI yet — just raw tool calling. When the loop works, I'll test with curl then in the UI.
````

---

## Step 5 — Build the tool loop (Session 1)

This is the biggest single chunk of code in Session 1. Claude Code ships tool definitions, executors, and the updated chat.ts.

When it's done, test with curl before UI:

````bash
curl -N -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your JWT from Supabase session]" \
  -d '{
    "messages": [
      {"role": "user", "content": "Add a customer named Test User with email test@test.com"}
    ]
  }'
````

You should see:
- Request goes out
- Response shows tool execution happened (in debug output)
- Customer appears in your Supabase database (check Supabase Studio)

If that works, test multi-tool:

````bash
-d '{"messages": [{"role": "user", "content": "Add customers Alice, Bob, and Charlie"}]}'
````

Should result in 3 customer rows created (parallel tool execution).

Test a chain:

````bash
-d '{"messages": [{"role": "user", "content": "Add a customer named Test User, then create a job titled Kitchen Remodel for that customer"}]}'
````

Should result in: customer created → Claude sees the new customer ID → job created with the correct customer_id. This validates the loop.

**If curl tests pass, move to the UI.** If they fail, don't proceed — fix the function first.

---

## Step 6 — Test in the UI (Session 1)

Open Trial and Error in the browser. Open the Chat column. Try:

- "Add a customer named John Smith with phone 555-1234"
- "How many open jobs do I have?"
- "Create a proposal for John Smith's kitchen remodel at $15,000"
- "Mark John's proposal as approved"
- "Find all customers with open jobs"

You should see:
- Chat responses are generated after tool calls complete
- Data actually changes in the database
- Records tab / Jobs tab / Proposals tab show the new data (though you may need to refresh — live refresh is Session 2)

**Known rough edges at this point (fixed in Session 2):**
- UI doesn't auto-refresh after agent mutations (you need to click away and back)
- No confirmation before destructive actions (agent will straight-up delete if asked)
- Agent doesn't know what tab you're on
- Debug tab shows raw tool JSON, not a pretty trace

**That's fine.** Session 1 is proving the mechanics. Session 2 is making it usable.

---

## Step 7 — Commit Session 1

````
Session 1 works — tool calling foundation is live. Commit, push, open PR, merge to main. Leave PROGRESS.md untouched — AC-03 stays unchecked until Session 2 lands; the merged Session 1 PR is visible on its own.
````

Take a break. Session 2 tomorrow (or after a real break today). Coming back to Session 2 with a fresh head is better than pushing through at hour 6.

---

## Step 8 — Start Session 2

````
Starting AC-03 Session 2 — Agentic behavior layer.

Rhythm check, create branch feature/ac-03-session-2. Session 2 adds: UI context injection, inline confirmation UI for destructive actions, live UI refresh after mutations, Agent Debug tab full-trace upgrade, ambiguity resolution patterns.

Session 1's tool calling foundation is merged. Session 2 builds on top.
````

---

## Step 9 — Session 2 Thorough Plan

````
AC-03 Session 2 — agentic behavior layer on top of Session 1's tool foundation.

## UI context injection

Client-side: track active tab, active record (if any), active section (if record is open).

Propose:
- Where this state lives — React context (probably, since it needs to be accessible from ChatColumn)
- How it's populated — listen to tab changes, record opens, section changes
- How it's passed to the function — include in request body alongside messages
- How it's injected into system prompt

Format in system prompt (propose exact text):
````
=== CURRENT UI CONTEXT ===
Primary tab: Jobs
Active record: None (viewing full list of 23 jobs)
Active section: All Jobs

The user is currently viewing the full jobs list. When they reference "this" or "here," they likely mean the jobs view generally.
````

Or when a record is open:

````
=== CURRENT UI CONTEXT ===
Primary tab: Customers
Active record: Al Schindler (customer)
Active section: Jobs

The user is currently viewing Al Schindler's record, Jobs section. When they say "him," "this customer," "his job," they mean Al Schindler unless the context makes that impossible.
````

## Inline confirmation UI

When Claude wants to call a destructive tool, the new pattern:

Instead of calling deleteCustomer directly, Claude outputs a structured response like:

```json
{
  "type": "pending_action",
  "action": "deleteCustomer",
  "params": {"id": "abc-123"},
  "summary": "Delete customer Al Schindler (775-778-1802, 3 jobs, 1 proposal)"
}
```

Propose:
- How this structured response format is generated — do we use Anthropic's structured output feature, or parse it from text, or use a special tool like "proposeDeletion"?
- How the chat UI renders it — a message bubble with the summary, two buttons (Confirm / Cancel)
- How confirmation round-trips — user clicks Confirm, what happens? Does it send a new message to Claude? Does it directly call the tool?

My lean on the last point: user clicks Confirm, a new message like "[USER CONFIRMED: deleteCustomer abc-123]" gets sent to Claude via the function, which intercepts it, executes deleteCustomer, and returns a normal success response that Claude then summarizes to the user.

Clicking Cancel sends "[USER CANCELLED]" and Claude responds naturally ("Got it, leaving that customer in place").

## Live UI refresh

After a tool execution that mutates data, the response to the browser must include a list of affected entities, e.g.:

````
{
  response: "Added John Smith.",
  affected: ["customers"],
  affectedIds: { customers: ["new-uuid"] }
}
````

The client uses this to invalidate/refetch the affected stores:
- `affected: ['customers']` → refetch customerStore
- `affected: ['jobs', 'proposals']` → refetch both

Propose how this list is compiled in the function (tool executors declare what they affect) and how the client consumes it.

## Agent Debug tab full-trace upgrade

Current: shows raw tool JSON dumps. Upgrade to readable trace:

````
▶ User: "Add John Smith and create a $15K kitchen proposal"
│
├─ 🔧 Tool: addCustomer({name: "John Smith"})
│   └─ ✓ Result: customer_id = "xyz-789" (23ms)
│
├─ 🔧 Tool: addProposal({customer_id: "xyz-789", title: "Kitchen", amount: 15000})
│   └─ ✓ Result: proposal_id = "abc-123" (41ms)
│
└─ 💬 Response: "I've added John Smith and created a $15,000 proposal titled Kitchen."

Total: 2 tool calls, 3 round trips, 1,247 tokens, 2.1s
````

Propose the component structure and styling. Match Trial and Error's aesthetic (warm obsidian, ember accents, monospace for code).

## Ambiguity resolution

Mostly handled by Claude naturally with good system prompt guidance. Propose additions to the system prompt that encourage:

- When the user says a name that matches multiple records, ask for clarification with specifics ("Which Joe — Joe Smith with 3 open jobs, or Joe Martinez?")
- When the user references "this" or "here", use UI context; if UI context doesn't resolve, ask
- When the user requests something broadly ("clean up my customer list"), ask what they mean before acting

These are prompt updates, not code additions. Propose exactly what text to add.

## Architecture questions (Session 2)

1. UI context state management — React context? Which part of the tree owns it?
2. How does the chat component know to show the confirmation buttons? Parse response for pending_action type, render accordingly?
3. Client-side store invalidation — use existing store patterns, or a dedicated invalidation utility?
4. Debug tab upgrade — incremental from existing tab, or rewrite?

## Edge cases for Session 2

- User confirms a destructive action, then a different user in the same org is viewing it live — UI should update for them too (defer via polling or Realtime in real Eidrix; manual in Trial and Error)
- User is on Customer A, but asks about Customer B by name — UI context suggests A, but request names B. Claude should respect the explicit mention.
- User cancels a confirmation, then immediately asks for the same thing again — confirmation should re-prompt, not remember the cancel
- Tool mutates data → affected list includes the type → client refetches → but the user was mid-edit on an affected record. Don't blow away unsaved edits.
- Debug tab shows a very long trace — performance? Virtualize long lists if needed.

Plan, don't build. Wait for approval.
````

---

## Step 10 — Review Session 2 plan, build

Same pattern: review carefully, push back on anything vague, approve, build.

Build order within Session 2:
1. UI context injection first (simplest, pure additive)
2. Confirmation UI (most visible user-facing change)
3. Live UI refresh (integrates with confirmation because deletions need refresh)
4. Debug tab upgrade (polish, does it last so earlier work is already feeding it data)
5. Ambiguity resolution system prompt updates (tuning)

---

## Step 11 — Stress test

Spend real time doing agentic work:

**Creation flows:**
- "Add three customers: Alice Smith, Bob Jones, Charlie Brown"
- "Create jobs for Alice: kitchen remodel, bathroom remodel"
- "Draft a proposal for Alice's kitchen remodel at $18,500"

**Update flows:**
- "Mark Alice's kitchen job as scheduled for next Tuesday"
- "Update Bob's phone to 555-1234"
- "Change Alice's kitchen proposal status to sent"

**Destructive flows (verify confirmation):**
- "Delete Charlie Brown" (should show confirmation)
- "Delete all customers marked inactive" (should show confirmation, even if it's doing something destructive in bulk)

**Context-aware flows:**
- Open Alice's customer record, then ask "how many jobs does he have?" (should work based on UI context)
- Open Alice's customer record, then ask "schedule his next job" (ambiguous but resolvable — which job?)
- Stand on the customer list, say "schedule Joe's job" with two Joes in the list (should ask which one)

**Edge cases:**
- Ask Claude to do something it has no tool for ("send an email to Alice") — Claude should explain
- Ask Claude to do something clearly bad ("delete all customers") — should refuse or require serious confirmation
- Ask Claude to do an extremely long chain ("create 20 customers named Test1 through Test20") — verify loop limit kicks in gracefully

**Debug tab check:**
- After each interaction, check Debug tab
- Trace should be readable and complete
- Token counts should be visible
- Any errors should be surfaced

Iterate based on what you find. Common fixes:
- System prompt tuning for ambiguity handling ("Claude is being too eager to assume" or "too shy to act")
- Tool description tuning ("Claude used the wrong tool for X")
- Error message improvements ("Claude's error responses are confusing")

---

## Step 12 — Update REAL_EIDRIX_NOTES.md

````
Update REAL_EIDRIX_NOTES.md with the architectural decisions from AC-03:

In Tool Calling & Agentic Behavior section (promote from "pending AC-03" to "Locked decisions"):
- Tool definitions in Anthropic format, organized by entity
- Server-side execution loop pattern with RLS-respected authentication
- Destructive actions gated behind inline confirmation UI
- UI context injection via system prompt (active tab, record, section)
- Live UI refresh via affected-entities list from function
- Max loop iterations capped (current: 10)
- Ambiguity resolution via system prompt guidance + UI context
- Agent Debug tab full-trace as observability pattern

In Chat & Agent Behavior section:
- Sonnet 4.6 required for tool calling; document why (Haiku's tool selection accuracy)
- Confirmation UI pattern becomes the template for all destructive action flows in real Eidrix

In Model Strategy:
- Lock Sonnet 4.6 as minimum for tool-calling workflows
- Opus 4.7 upgrade when reasoning across long tool chains

Open questions (new):
- When the agent makes a mistake (deletes wrong thing despite confirmation), what's the recovery UX?
- Should tool call history be queryable/searchable in the Debug tab for debugging production issues?
- Agent "dry run" mode — show what would happen without actually doing it?

Changelog entry: "April [date] 2026 — AC-03 Agentic Foundation shipped across two sessions. Tool calling, execution loop, confirmation UI, UI context, live refresh, full-trace debug all working end-to-end. Eidrix is now agentic."
````

---

## Step 13 — Ship Session 2

````
Code-simplifier review on all Session 2 additions. Report suggestions, don't auto-apply.

Then commit final changes, check off AC-03 (overall, not just Session 2) in PROGRESS.md, push, open PR, test Deploy Preview end-to-end before merging.
````

Deploy Preview testing is important — you want tool calling to work in production, not just locally. Verify all paths work: add customer, create job, delete with confirmation, etc.

When merged: clean up, celebrate. You just built agentic Eidrix.

---

## What just happened

You crossed the biggest line in the curriculum.

Before AC-03: Eidrix was an app with AI attached. You type things, it responds.

After AC-03: Eidrix is an agent embedded in your work. You describe intent; it executes. You ask ambiguous things; it clarifies. You request dangerous things; it confirms. You work inside a record; it understands the context. The UI reflects its actions live.

Every architectural decision in AC-03 will be in real Eidrix. Tool definitions. The execution loop. The confirmation pattern. UI context. Live refresh. Full-trace observability. Sonnet as the floor. You rehearsed the entire shape.

The value of the next chapters (AC-04 memory, AC-05 multi-turn loops) is additive — they extend what you just built. But the foundation is AC-03. If AC-03 is solid, everything downstream is polish. If AC-03 was sloppy, everything downstream fights bad foundations.

Treat what you just built with care. When you port to real Eidrix, don't just copy — review. But don't rewrite, either. The patterns are the patterns. Extend them; don't redo them.

---

## What success looks like

- Proposals entity works end-to-end, appears as primary tab via engine
- ~15-18 tools defined and executable server-side
- Tool execution loop handles multi-tool calls correctly
- Parallel tool execution working
- Max iteration cap prevents runaway loops
- RLS-respected auth through every tool call
- UI context (tab, record, section) injected into agent awareness
- Destructive actions gate behind inline confirmation UI
- Live UI refresh after mutations
- Agent Debug tab shows full readable trace
- Ambiguity resolution working naturally
- Sonnet 4.6 handling everything well
- Stress test passes: complex multi-step operations work
- Deploy Preview works end-to-end in production
- REAL_EIDRIX_NOTES.md updated
- Session 1 and Session 2 PRs both merged, branches cleaned

---

## If something broke

- **"Tool calls work via curl but not in UI"** — auth not forwarding or response parsing wrong. Check the browser sends Authorization header and the function accepts it.
- **"Loop runs forever"** — iteration cap not enforced or Claude keeps seeing new work to do. Verify max iterations code exists and is being hit.
- **"Destructive confirmation doesn't appear"** — pending_action format not being generated or parsed. Check both function output and client parsing.
- **"UI doesn't refresh after agent adds a customer"** — affected list not returned or client not refetching. Trace from function response → client response handling → store refresh.
- **"Claude calls wrong tool for the job"** — tool description too vague or conflicting. Iterate descriptions.
- **"Claude refuses to act confidently — always asks"** — system prompt too defensive. Tune toward "act on clear instructions; ask only when ambiguous."
- **"Claude acts too confidently — doesn't ask enough"** — system prompt too aggressive. Tune toward "for ambiguous references, always confirm."
- **"Debug trace is messy / hard to read"** — layout iteration needed. Design the trace component carefully; it's a long-lived diagnostic.

---

## Tour Moment — Why tool descriptions matter more than tool names

Claude picks tools based on descriptions, not names. If you name a tool `addCustomer` but describe it as "Creates a new customer record", Claude is less likely to use it for the phrase "register this person" than if you describe it as "Add a new customer to the organization. Use when the user describes someone not yet in the system, or requests to add/register/create/enter a new customer."

The rule: **write descriptions like you're explaining the tool to a new hire.** Include when to use it, when NOT to use it if relevant, and example phrases that should trigger it. This is the single most impactful optimization for tool calling quality.

When real Eidrix has 50+ tools across many entity types, tool descriptions become a meaningful art. The investment in writing them well pays off forever.

---

## Tour Moment — Confirmation UX is trust UX

The inline confirmation pattern you built isn't just safety — it's trust.

Every time Eidrix pauses to confirm a destructive action, the user sees: this thing is careful. It doesn't just do whatever I say. It checks. That builds confidence.

The opposite pattern — "AI agents that just do things" — might be faster, but it terrifies users who've been burned by unexpected AI behavior. Every article about "agent did this thing I didn't want" is a vote against that UX.

Real Eidrix's trust advantage over competitors will partly be built on this confirmation pattern. Tenants who see Eidrix confirming destructive actions will trust it with bigger things over time. Tenants who see an agent "just doing things" will stay suspicious of every feature.

This is why the inline-chat pattern matters more than modals: modals interrupt; inline buttons invite conversation. "Delete this?" in a modal feels like a threat. "Confirm deletion?" in chat feels like a collaboration.

---

## Tour Moment — UI context makes agents feel like colleagues

A coworker sees what you're looking at. They know when you say "schedule his next job" that "his" is the customer whose record you have open. They don't ask clarifying questions about obvious context.

Pre-UI-context agents are like a remote coworker on a phone call with no screen share — every reference is potentially ambiguous.

Post-UI-context agents are like a coworker next to you looking at the same screen. The conversation quality shifts dramatically.

For real Eidrix, this pattern extends further: the agent should know not just what the user is looking at, but what they just did (edited a field, ran a search, started a proposal). That's richer — activity log stuff, AC-04 territory. But UI context is the foundation.

Users of real Eidrix won't articulate this consciously. They'll just notice that Eidrix "gets it" in a way other AI tools don't. That feeling is built from UI context awareness.

---

## Tour Moment — The debugging tax of agents

When a regular app has a bug, you inspect state, look at the code path, find the issue. When an agent has a bug, you also have to inspect the reasoning — which tool did it choose, why, what did it see, what did it conclude.

Without observability (your Debug tab), agent bugs are invisible. The agent did something unexpected; you have no idea why. Reproducing the bug is hard; debugging it is impossible.

With observability, you see the whole chain: user message, system prompt with context, tool calls, tool results, reasoning between calls, final response. The bug is findable.

**Every serious agent system needs this.** Real Eidrix will have the Debug tab you built here, extended to admin surfaces so when customers report "Eidrix did something weird", you can go look.

The time investment in observability feels disproportionate when things work ("why am I building UI for something that's working?"). It pays back entirely the first time something breaks in ways you couldn't have predicted.

---

## Next up

**AC-04 — Agent Memory.** Cross-session persistent memory. The hybrid storage pattern from REAL_EIDRIX_NOTES.md gets rehearsed: Postgres for durability, vector store for semantic recall. Conversations persist across sessions; Eidrix remembers what you talked about yesterday. About 3-4 hours.

Then **AC-05 — Multi-Turn Agentic Loops.** Now that tools and memory work, the agent can handle genuinely complex requests: "plan my Thursday" triggers a sequence of reads (schedule, open jobs, weather, customer follow-ups) and writes (draft prioritization, suggest time blocks, ask for approvals) across multiple tool calls. This is the chapter where agentic Eidrix becomes prescriptive, not just reactive. About 3 hours.

Then **Pre-Build Audit** — the graduation chapter. Review everything, lock final decisions, produce the starting brief for real Eidrix. About 2-3 hours.

You're **three chapters from real Eidrix.** After AC-03, the remaining chapters are each narrower and faster because the foundation is done. AC-04 and AC-05 both extend AC-03's architecture rather than introducing new paradigms.

Close.
