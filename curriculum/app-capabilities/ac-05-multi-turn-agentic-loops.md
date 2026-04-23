# AC-05 — Multi-Turn Agentic Loops

*App Capability. The Eye becomes the agent. When Eidrix takes a complex multi-step request, a plan card emerges from the Eye itself — populating with steps as the agent commits to them, checking off as each executes, syncing visually with the Eye's state throughout. This is the chapter where Eidrix stops being a chat app with AI and becomes an AI agent with presence. About 5-6 hours across two sessions. The last true build chapter before graduation.*

---

## What you're learning

1. **Long-horizon agent behavior** — planning before acting, adjusting mid-execution, stopping gracefully
2. **Structured event emission from the agent** — Claude outputs parseable plan-item events, not just text
3. **The plan-card-from-Eye pattern** — a signature visual design pattern where the Eye IS the agent
4. **Eye-UI choreography** — how an ambient presence indicator and a functional UI component move in concert
5. **Interruption handling** — users can send new messages mid-loop; the agent must respond coherently
6. **Stop control for agentic loops** — user sovereignty over long-running operations
7. **Working memory within a single loop** — the agent's own reasoning trace carries forward through iterations
8. **Plan persistence as audit trail** — long operations leave a record the user can scroll back to

---

## What you're building

### The agentic behavior layer (Session 1)

**Longer iteration cap with graceful degradation.** Current max is 10; bumping to 25 for complex planning tasks. When the cap is hit mid-plan, agent produces a partial-completion response ("I got through 8 of 12 steps; here's where I stopped") rather than erroring.

**Planning patterns in the system prompt.** Agent assesses request complexity early. For simple requests ("add a customer named X"), proceeds immediately with lightweight narration. For complex requests ("plan my Thursday"), generates a plan upfront, emits it as structured events, executes step-by-step, reports completion.

**Structured plan emission.** Plan items are emitted as tool-call-adjacent structured output — specifically as a special tool `emitPlanStep` that doesn't mutate data but signals plan structure to the client. Each step includes: an id, a human-readable title, and a status. This is the event protocol that drives the UI.

**Interruption handling.** If a user sends a new message while a plan is executing, the agent receives it at the next iteration boundary, acknowledges it, and either adjusts the current plan or abandons it based on what the user said. System prompt guides the decision.

**Stop control.** User can abort a running plan. Sends a special signal to the function that halts the loop at the next iteration boundary. Agent produces a summary of partial progress.

**Working memory within a loop.** Each iteration's tool results and partial reasoning are part of the message array Claude sees on the next iteration — this is already how the AC-03 loop works. AC-05 adds intentionality: system prompt encourages the agent to reference prior steps ("Building on the schedule I just pulled..."), making the working memory visible in responses.

### The plan card UI (Session 2)

**Plan card component.** Anchored to the chat column, spatially adjacent to the Eye. Emerges (with motion) when a plan starts. Populates with steps as events arrive. Each step has three states: pending (○), active (◐ with ember glow), completed (✓ with ember fill). Stop button embedded.

**Eye-plan choreography.**
- Plan card emerges → Eye subtly grows, iris contracts into focused Processing state
- Plan card active step → Eye's Processing pulse syncs with the active step's glow pulse
- Plan card step completes → Eye emits a brief Completion reaction
- Plan card fully completes → Eye settles to a warm Idle with slight ember lingering
- Plan card stopped → Eye briefly flashes Uncertainty, then settles

**Connection visualization.** A subtle line or glow trail connecting the Eye to the plan card, reinforcing "this work is coming from the Eye." Uses the same ember palette, animates in at plan start, fades out at plan end.

**Plan card collapse + persistence.** When the plan finishes, the card animates back toward the Eye (brief retraction motion) and leaves behind a compact summary line in the chat stream: "Plan: Thursday scheduling · 5 steps · completed." Tapping the summary re-expands the plan for review. This makes plans part of the conversation's audit trail.

**Reduced-motion handling.** prefers-reduced-motion users get a static plan card (no animated emergence, no pulsing), steps still update as events arrive, no Eye choreography. Accessibility first.

### Chat interface updates

**Pending interruption indicator.** If the user types while a plan is running, the input field shows a subtle marker ("Your message will be delivered when current plan completes or at the next step — unless you tap Stop").

**Stop button.** Inline with the plan card, subtle but reachable. Confirms nothing ("Stop?") — just stops. Stop is not destructive; it just halts. The user can always ask the agent to resume.

**Scrollback plan summaries.** Historical plans appear as collapsed cards in the chat stream. Expanding them shows the full step list (cached from when they ran). No re-execution, just review.

### Debug tab upgrade

**Plan trace view.** In addition to tool call trace, each plan lifecycle shows as a nested timeline: plan start → each step (with emit time, start time, completion time, tool calls within that step, memory facts retrieved during that step) → plan end. Makes debugging "why did the agent get stuck on step 3" actionable.

### REAL_EIDRIX_NOTES update

- Plan-emerging-from-Eye locked in as Eidrix's signature agentic UX
- Eye-as-agent brand philosophy articulated
- Structured plan emission protocol documented
- Interruption and stop patterns as standard for long operations
- Plan persistence as audit trail pattern (applies beyond plans — any multi-step operation should leave a summary)
- Deferred: nested sub-plans, concurrent plans, plan templates for recurring operations

---

## Plain English glossary

- **Multi-turn agentic loop** — an agent operation that takes multiple reasoning-and-execution steps to complete a single user request. Different from a single-turn tool call.
- **Plan** — the agent's proposed sequence of steps for a complex operation, made visible to the user before/during execution.
- **Plan item / step** — a single unit of work in a plan. Each step typically corresponds to one or more tool calls.
- **Structured event emission** — the agent outputting machine-readable signals (via special tool calls) that the client UI parses into visual state, distinct from the text response.
- **Interruption** — the user sending a new message while a plan is in progress. Handled at the next iteration boundary.
- **Iteration boundary** — the moment between two iterations of the agent loop, where the system decides whether to continue, stop, or incorporate new input.
- **Graceful degradation** — when a limit is hit (e.g., max iterations), the system produces a useful partial response rather than a raw error.
- **Working memory (within a loop)** — the accumulated context of the current agent loop — prior tool results, prior reasoning, prior plan steps — that the agent has access to at each iteration.
- **Choreography** — the coordination of multiple animated elements (Eye + plan card) so their motion feels intentional and related.

---

## Why this chapter matters

Three reasons:

**1. It's where Eidrix's visual identity fuses with its agentic capability.** Up until now, the Eye has been a personality layer (AC-08a) and the agent has been a functional layer (AC-03). They've coexisted. AC-05 fuses them: the Eye is no longer an indicator that an agent is working — *the Eye is the agent doing the work*. Every competitor of real Eidrix will have agentic AI; very few will have this kind of embodied presence around it. This is a signature brand asset.

**2. Long-horizon agents are where most AI products fail.** Short interactions (single tool call, quick response) are easy. Multi-step operations that span 30+ seconds are where agents get lost, users get impatient, trust erodes. Plan visibility is the single biggest factor in whether users tolerate long operations. Users who can see progress will wait; users staring at a spinner won't. AC-05 teaches you to build operations that users stay with for their full duration.

**3. The patterns transfer to every future agentic feature.** Real Eidrix will have dozens of multi-step flows: onboarding (the Sunday Interview), end-of-week summaries, invoice generation, customer outreach campaigns, proposal creation assistance. All of them benefit from the plan-card pattern. Build it right once; reuse everywhere.

---

## The plan, in plain English

**Session 1 — Agentic behavior (2.5-3 hours):**
1. Start clean, branch
2. Thorough Plan (Session 1 scope)
3. Expand iteration cap with graceful degradation
4. Update system prompt for planning behavior
5. Build `emitPlanStep` tool (structured event emission)
6. Build interruption handling at iteration boundaries
7. Build Stop signaling infrastructure
8. Test agentic behavior via Debug tab before any UI changes
9. Commit, merge Session 1

**Session 2 — Plan card UI + Eye choreography (2.5-3 hours):**
10. Plan card component (static version first)
11. Animated emergence from Eye
12. Eye-plan choreography
13. Stop button integration
14. Collapse + persistence in chat stream
15. Reduced-motion handling
16. Debug tab plan trace view
17. Stress test full flow
18. Update REAL_EIDRIX_NOTES
19. Ship

---

## Step 1 — Start clean, branch (Session 1)

````
Starting AC-05 — Multi-Turn Agentic Loops. Last true build chapter before the Pre-Build Audit graduation chapter. This is the chapter where the Eye becomes the visible actor, not just an indicator.

Rhythm check. Then create branch feature/ac-05-session-1.

Read CLAUDE.md, PROGRESS.md, CURRICULUM_DESIGN.md, REAL_EIDRIX_NOTES.md (especially UI Architecture and Chat & Agent Behavior sections), and the AC-03 + AC-04 code — tool loop in chat.ts, Eye component, Debug tab. AC-05 extends all of this. Nothing from AC-03 or AC-04 gets replaced — all additive.
````

---

## Step 2 — Ask for Session 1 Thorough Plan

````
AC-05 Session 1 — agentic behavior layer. Plan card UI is Session 2.

Session 1 scope (this plan):
- Expand iteration cap (10 → 25) with graceful degradation when hit
- System prompt updates for planning behavior (agent assesses complexity, plans for complex tasks, narrates simple ones)
- emitPlanStep tool for structured event emission (plan step id, title, status)
- Interruption handling at iteration boundaries (user sends new message mid-loop)
- Stop signaling infrastructure (user clicks Stop → loop halts at next iteration, graceful summary)
- Working memory within a loop (agent references prior steps explicitly — prompt guidance)

Session 2 scope (separate plan):
- Plan card UI component
- Animated emergence from Eye
- Eye-plan choreography
- Stop button inline
- Collapse + persistence in chat stream
- Reduced-motion handling
- Debug tab plan trace view

Thorough-plan Session 1 only.

## Iteration cap + graceful degradation

Current cap: 10 iterations. Bump to 25 for Session 1. Rationale: complex planning tasks can legitimately hit 15-20 iterations (plan proposal → approval → execution of 8 steps → summary).

Graceful degradation: if the loop hits 25 iterations without a terminal response, don't hard-error. Claude should be prompted to produce a partial-completion response at iteration 23-24 ("If you're about to hit the iteration limit, wrap up with what you've done so far and summarize the rest as next steps for the user").

Propose:
- Where the cap is enforced (server-side, in chat.ts)
- How the warning is signaled to Claude (a synthetic assistant message at iteration 23? A system-prompt clause? Propose the cleanest approach)
- What happens at iteration 25 exactly — does the final response get streamed, or is it cut off? Error response shape if cut off.

## System prompt planning behavior

Current system prompt (post-AC-04) handles tool calling, UI context, ambiguity resolution, memory retrieval. AC-05 adds guidance on planning:

Propose the additions to DEFAULT_SYSTEM_PROMPT. Key elements:

- Agent assesses complexity before acting. Heuristic: if the request involves multiple entities, multiple tool calls, or spans multiple reasoning steps, it's "complex." If it's a single query or a single mutation, it's "simple."
- For complex requests: emit a plan using emitPlanStep tool first, get user acknowledgment if ambiguous, then execute step by step. Narrate progress in the text response.
- For simple requests: proceed directly, narrate briefly (one line of what you're doing).
- When hitting uncertainty mid-plan, pause and ask rather than guessing.
- When a tool fails mid-plan, decide: retry, skip, or abandon the plan and explain.
- Reference prior steps in language ("Building on the schedule I pulled," "Given Alice's preferences...").
- Always close a plan — either "Plan complete, here's what got done" or "Plan interrupted, here's where we stopped."

Write the actual prompt text, not a description. Keep it in the existing system prompt style (dry, direct, voice-matching).

## emitPlanStep tool

New tool, doesn't mutate data. Signature:

```typescript
{
  name: 'emitPlanStep',
  description: 'Emit a planned step. Use at the start of a complex multi-step operation to declare the plan. Emit all steps upfront when possible. The UI renders these as a visible plan card. Can also be used to mark steps complete as you go (by emitting with status: "complete") or failed (status: "failed") or update a pending step (status: "active" when you start it).',
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'A short unique identifier for this step. Reuse the same id when updating status.' },
      title: { type: 'string', description: 'Human-readable title, 3-8 words, present tense. "Pull Thursday schedule", "Draft time blocks".' },
      status: { type: 'string', enum: ['pending', 'active', 'complete', 'failed'], description: 'pending when first emitted as part of initial plan, active when work starts on this step, complete when done, failed if it errored out' }
    },
    required: ['id', 'title', 'status']
  }
}
```

Propose:
- Exact TypeScript for the tool definition
- Where emitPlanStep executes server-side — it's a no-op for database state but the function needs to capture it and include it in the response to the client (so the UI can render). Propose how this flows through chat.ts.
- Does Claude emit the full plan upfront with all steps as 'pending', then update each to 'active' and 'complete'? Or emit each step as it begins? Propose the convention — my lean is "emit full plan upfront when possible, update status as you go" because that gives the user the full picture early.

## Interruption handling

When the user sends a new message while a plan is executing:

- The new message arrives via a new API request, not injected into the running loop
- So "interruption" really means: the running loop keeps going; the new message is queued
- At next iteration boundary, check: did a new user message arrive? (We'll need a way to signal this — propose)

Options:
1. Client tracks "plan in progress," blocks new messages from sending until current completes. Simple, but limits user agency.
2. Client allows sending; server receives, stores as "pending next message," chat.ts checks at each iteration boundary.
3. Running loop can't be interrupted; user has to wait. Use Stop to halt explicitly.

I lean option 3 combined with option 1's UI hint — show "Eidrix is working on your plan. Send will queue, or Stop to interrupt." When plan completes, queued message sends automatically. This keeps the loop simple and gives the user clear choices.

Propose the final approach.

## Stop signaling

User clicks Stop on the (future Session 2) plan card or sends a "/stop" message:

- Server receives a stop signal (new endpoint `/.netlify/functions/chat-stop` or a flag on a new message to chat.ts)
- Running loop checks for stop signal at each iteration boundary
- On stop: the loop terminates at the current iteration, produces a summary ("Stopped at step 4 of 8. Here's what got done so far..."), returns to client

Propose:
- How the stop signal is delivered (separate endpoint vs. flag on next request)
- How the running loop checks for it (polling a shared state? A pub/sub channel? For Netlify Functions, probably just a flag in a small DB table or Redis-like ephemeral store — propose simplest)

Key constraint: Netlify Functions are stateless. Two concurrent function invocations don't share memory. We need an out-of-band signal. Options:
- Supabase row that the client writes to on stop, the running loop polls each iteration
- Netlify Edge Functions with KV store
- Simply: Netlify Function timeout on the loop itself, client displays "stopping..." and the next request breaks out

The last option is elegant: on stop, client sends a follow-up "stop current loop" request that the running loop's next iteration detects. Use a Supabase `active_plans` table with a `requested_stop` column. Loop polls this table at each iteration. Propose this or a better approach.

## Working memory within a loop

Already partially built in AC-03 — the messages array accumulates tool calls and results across iterations. AC-05 adds: system prompt guidance encouraging the agent to *reference* this accumulated memory explicitly in its narration. This isn't new code; it's prompt tuning.

Propose the prompt additions. Examples:
- "Reference prior steps explicitly when relevant ('Given the 3 open jobs I just pulled,' 'Building on the plan we agreed to')."
- "If you retrieved memory facts earlier in this plan, name them as you apply them ('Since Alice prefers morning callbacks, I'll schedule for 9am')."

## Debug tab minimal update (Session 1)

For Session 1, the Debug tab already shows tool calls per iteration. Just make sure `emitPlanStep` tool calls render distinctly — maybe with a different icon or color — so when debugging you can see "the agent emitted a plan" separate from "the agent ran a mutation."

Session 2 builds the full plan trace view. For now, basic visibility is enough.

## Architecture questions

1. Session-level state: do we need to store "active_plans" (what plan is running right now) in Supabase, or is it purely ephemeral to the request? I lean: store active plans in Supabase so stop signaling works AND so the plan UI persists if the user refreshes mid-plan. Propose.

2. Plan identifier: each plan gets a UUID generated server-side at plan start. Emitted plan steps include their plan_id. Propose the data shape — maybe `active_plans` table has id, user_id, org_id, started_at, status ('running' | 'complete' | 'stopped' | 'failed'), steps (jsonb array).

3. Concurrency: can a user run two plans at once? For Session 1, no — one active plan per user at a time. If user sends a complex request while one is running, client should detect and either block or queue. Propose.

4. What counts as "complete" for a plan: the plan's final emitted step has status='complete' AND the loop exits with stop_reason='end_turn'. Propose the exact condition.

5. What if Claude never calls emitPlanStep even for a complex request? Not all complex requests need a plan visualized. If no plan is emitted by iteration 3, client assumes this is a no-plan request and doesn't show the plan card. Propose this fallback.

## Edge cases for Session 1

- Plan with 1 step (overkill to render; still emit, client can decide to show or not)
- Plan with 20 steps (render all, scrollable if needed — but that's Session 2's UI concern)
- Agent emits plan, then diverges mid-execution (adds a step not in original plan). Handle: new emitPlanStep with a new id; client appends. Original plan is visibly modified.
- Agent emits plan, then abandons it entirely (says "actually, let me approach this differently"). Handle: emit all remaining steps as 'failed' or a new emitPlanStep with status that marks plan abandoned. Propose the convention.
- User sends "stop" via message text instead of Stop button. Agent recognizes natural-language stop intent, calls a stop-abort tool or just gracefully wraps up.
- Stop requested while Claude is mid-stream (partial tool call in flight). Iteration boundary is between iterations, not mid-iteration. Stop applies at next boundary.
- Network failure mid-plan. Client sees disconnection, plan card freezes. On reconnect, client queries active_plans table, rehydrates plan state. Partial implementation in Session 1 is fine; full reconnect UX is a polish pass.

## What I'm NOT asking you to build in Session 1

- Plan card UI (Session 2)
- Eye choreography (Session 2)
- Reduced-motion handling for the UI (Session 2)
- Scrollback plan summaries (Session 2)
- Debug tab plan trace view (Session 2)
- Nested sub-plans (real Eidrix)
- Concurrent plans per user (real Eidrix)
- Plan templates (real Eidrix)

Plan Session 1, don't build. Wait for approval.
````

---

## Step 3 — Review the plan

Things to push on:

**The Stop signaling mechanism.** Make sure the plan addresses Netlify Function statelessness. If the plan says "shared memory flag" or anything implying two invocations can share state, that's wrong. Must be out-of-band (Supabase row, external KV). Supabase `active_plans.requested_stop` is clean.

**The emitPlanStep convention.** Verify the plan is specific about WHEN Claude emits the plan. "Upfront when possible" is the right answer; if the plan is vague, push for "agent emits all known steps as 'pending' at the start of a complex operation, then updates status as it progresses."

**Interruption handling approach.** If the plan tries to support true interruption (inject new user message into running loop), flag as too complex. The clean pattern is: queue user input, let plan finish OR user stops explicitly, then process the queued message.

**System prompt additions.** Verify the planning-behavior guidance is concrete with examples, not abstract ("agent assesses complexity" — but HOW does the agent assess complexity? The prompt needs heuristics or examples).

**The fallback when no plan is emitted.** If Claude handles a complex request without emitting a plan, the UI shouldn't freeze waiting. Client-side timeout: if no emitPlanStep arrives within N iterations/seconds, assume no plan, use the simple response flow. Verify this is in the plan.

When solid:

````
Plan approved for Session 1. Start with active_plans table + emitPlanStep tool + chat.ts plumbing. Get the plumbing right before prompting changes. Stop for verification before system prompt updates.
````

---

## Step 4 — Build the plumbing

Claude Code ships the table, the tool, the flow through chat.ts. When done, verify without the system prompt changes (Claude won't yet emit plan steps naturally, but we can test the plumbing by manually triggering emitPlanStep via a tool message).

Test with curl:
````bash
curl -N -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [JWT]" \
  -d '{
    "messages": [
      {"role": "user", "content": "Emit a plan with 3 steps: check calendar, review jobs, draft priorities. Use the emitPlanStep tool."}
    ]
  }'
````

Claude should call emitPlanStep 3 times. Verify:
- Response includes the emitted steps in some structured way (propose: alongside the text response, include a `planSteps` array)
- active_plans table has a row for this plan with steps jsonb populated

If plumbing works:

````
Plumbing works. Now add the system prompt planning guidance and test with a real complex request.
````

---

## Step 5 — System prompt tuning

Claude Code updates the system prompt. Test with real requests:

1. Simple: "how many customers do I have?" → should NOT emit plan, just respond
2. Complex: "add 3 customers named X, Y, Z, then schedule follow-ups for each next Tuesday" → SHOULD emit plan with ~5-6 steps, execute them, update statuses
3. Complex with memory: "plan my Thursday" (after you've established some facts) → plan should reference facts ("Given your preference for morning callbacks...") and open jobs

Look at Debug tab to see the emitted steps. The UI doesn't render them yet (Session 2) but they should appear in the raw tool call log.

Iterate system prompt if behavior is off:
- Too eager on planning (plans for trivial requests) — tighten complexity heuristic
- Too shy on planning (no plan for genuinely complex tasks) — strengthen examples
- Plans steps too vague or too granular — provide better examples in the prompt

---

## Step 6 — Stop signaling

Build the active_plans polling mechanism. Test:

1. Start a long operation
2. Manually update active_plans.requested_stop = true via Supabase Studio (simulates Stop button click)
3. Loop should detect at next iteration and produce a graceful summary

When stop works end-to-end:

````
Stop signaling works. Let's test interruption handling — user sends new message while plan runs.
````

Test: start a complex plan (3-4 step request). Midway, send another message. Verify:
- Plan continues uninterrupted
- Second message is queued (some state somewhere — propose where)
- When plan completes, queued message is sent as a follow-up

If interruption handling is cleaner as a "block send while plan active" pattern, verify that alternative works: during plan execution, the input field is disabled or shows a message like "Eidrix is working — Stop or wait."

---

## Step 7 — Commit Session 1

````
Session 1 works end-to-end — plans emit correctly, stop works, interruption handled. Commit, check off "AC-05 Session 1" in PROGRESS.md, push, merge.
````

Break. Session 2 when fresh.

---

## Step 8 — Session 2 start

````
Starting AC-05 Session 2 — the plan card UI and Eye choreography. This is the visual signature chapter.

Rhythm check, create branch feature/ac-05-session-2.

Session 2 builds the UI for what Session 1 created invisibly.
````

---

## Step 9 — Session 2 Thorough Plan

````
AC-05 Session 2 — plan card UI and Eye choreography.

## Plan card component

Propose:
- Where it lives in the DOM — anchored to the chat column, positioned adjacent to where the Eye mounts. Use absolute or fixed positioning within the chat column container.
- Component file location: `src/components/chat/PlanCard.tsx`
- Props: the active plan data (from a Zustand store or React context holding active_plans state)
- Internal state: expansion/collapse, animation phase

Visual design:
- Rounded card, warm obsidian background matching chat aesthetic
- Plan title at top (extracted from first step's title or generated summary)
- Step list with: status icon (○/◐/✓/✗), step title, subtle timestamps
- Active step has ember glow + subtle pulse matching Eye's Processing rhythm
- Completed steps have ember-filled checkmark
- Failed steps have muted error indicator
- Stop button at bottom-right, small, non-alarming

Animation states:
- **Emerging** — card scales from Eye position outward, opacity 0 → 1, spring physics. ~400ms, matches Eidrix motion tempo.
- **Active** — normal state while plan runs. Steps populate with fade-in. Active step pulses softly.
- **Collapsing** — on plan complete, card scales back toward Eye, opacity fades, leaves behind compact summary pill in chat stream
- **Persisted pill** — collapsed form inlined in chat, tap to re-expand

Propose the exact Framer Motion variants and transitions.

## Eye-plan choreography

Propose how to coordinate Eye state with plan state. Likely:

- Listen to active plan state changes
- When plan starts: `setEyeState('processing')` with enhanced intensity
- For each step transition: brief `fireReaction('acknowledge')` or similar
- On step complete: `fireReaction('completion')` brief pulse
- On plan complete: smooth transition to idle with sustained ember tint for ~2 seconds, then normal idle
- On plan stopped: `fireReaction('uncertainty')` briefly, then idle
- On plan failed: sustained cool glow for a beat, then idle

This requires the Eye component to accept external state signals. If it doesn't already, expose a small API (maybe via context or ref). Propose minimum changes to EidrixEye.tsx.

## Connection visualization

A subtle visual link between Eye and plan card. Options:
- Animated ember gradient line from Eye to card top
- Glow trail that animates on plan start
- Subtle "tether" effect — faint dotted line
- Or: no explicit connection, rely on spatial proximity and color coordination

Propose. I lean: subtle ember gradient "beam" that animates in at plan start, stays faint during plan, fades at plan end. Keeps the "emanating from Eye" feeling without being busy.

## Scrollback plan summaries

When a plan completes, it leaves a compact summary in the chat stream:

````
┌──────────────────────────────────────────┐
│ ✓ Thursday plan · 5 steps · completed   │
│   Tap to review →                        │
└──────────────────────────────────────────┘
````

Clicking expands inline in the chat, showing the full step list (non-interactive, read-only since the plan is done).

Propose:
- Storage: plan summaries persist in the messages table as a special message type `plan_summary` with plan data in content JSONB
- Styling: distinct from regular chat messages, but belonging to the chat flow
- Expand/collapse animation

## Stop button

Part of the active plan card. Small, positioned bottom-right or floating near the card. Text: "Stop" (not "Cancel" — "Cancel" implies undo; Stop means halt).

On click:
- Immediately send a stop signal to Supabase (update active_plans.requested_stop = true)
- Card enters "stopping" visual state (active step ember fades, subtle red tint, "Stopping..." indicator)
- Loop detects within a few seconds, terminates, emits summary
- Card transitions to "stopped" final state with last completed step clearly marked

## Reduced-motion handling

prefers-reduced-motion users get:
- Plan card appears immediately (no emergence animation)
- No Eye choreography (Eye stays in normal states)
- No pulsing on active step (static ember glow)
- No collapsing animation (plan card just disappears when done, or stays visible until dismissed)
- Summary pill still works, just no fancy transitions

Propose how to detect prefers-reduced-motion (CSS media query + matchMedia JS for component logic) and where the conditional branching lives.

## Debug tab plan trace view

Upgrade Debug tab to show plans clearly. Each request that included emitPlanStep gets a "Plan" section:

````
▶ Plan: "Thursday scheduling"
│
├─ Step 1: Check Thursday schedule (complete, 245ms)
│   └─ Tool: findCustomersByStatus (23ms)
│   └─ Tool: findJobsByStatus (18ms)
│
├─ Step 2: Review open jobs (complete, 110ms)
│   └─ Tool: findJobsForCustomer (45ms)
│
├─ Step 3: Draft priorities (complete, 1.2s)
│   └─ Tool: (no tools, pure reasoning)
│
└─ Plan complete · total 2.4s · 5 tool calls
````

Make the plan structure visually clear. Propose the component layout.

## Architecture questions

1. Plan card state management: Zustand store for the currently active plan? React context? Propose. I lean Zustand for shared state across components (Eye, PlanCard, ChatColumn, DebugTab all need to know).

2. Animation library: continue with Framer Motion (already in use) or add anything new? Lean: Framer Motion for everything, no new deps.

3. Connection visualization: SVG overlay, CSS pseudo-elements, or a dedicated component? Propose.

4. Eye-plan timing: choreography is tricky. If the plan completes faster than expected, does the Eye still do a "completion" reaction? Propose minimum durations so animations don't feel abrupt.

5. Multiple messages while plan is running: we said input is disabled or queued in Session 1. Session 2 should make the disabled state visually clear ("Eidrix is working on your plan — tap Stop to interrupt").

## Edge cases for Session 2

- Very short plan (completes in 2 seconds) — card still renders, animations still play at minimum durations
- Very long plan (15+ steps, 2+ minutes) — card handles scrollable step list, active step stays visible via auto-scroll
- Plan fails mid-execution — UI shows clearly failed state, last successful step, failure reason
- Plan stopped by user — similar to failed, but labeled as stopped, no error framing
- Multiple historical plans in scrollback — each has its own collapsed summary, expandable independently
- User refreshes page mid-plan — ideally rehydrates plan card from active_plans table. If stretch, at minimum shows a banner "A plan was running; tap to resume review"
- prefers-reduced-motion user — everything works, just no motion

Plan Session 2, don't build. Wait for approval.
````

---

## Step 10 — Review Session 2 plan

Push on:

**Eye choreography specifics.** Plan should have timing values (Eye reaction durations, glow intensity, etc.) that match the AC-08a config values. If the plan proposes new Eye state logic that conflicts with the six-layer architecture, flag.

**Connection visualization.** Verify the plan has ONE specific approach, not a vague "some visual connection." Specific option, specific implementation.

**Scrollback persistence.** Verify the plan stores plans in messages table as a special message type, not as a separate plans archive. Keeps everything in one timeline.

**Reduced-motion coverage.** Verify the plan explicitly lists every animated element and what it does in reduced-motion mode.

When solid:

````
Plan approved. Start with the static plan card component (no animations yet), wire it to active plan state from Session 1, verify it renders when plans are active. Stop before animations.
````

---

## Step 11 — Static plan card

Claude Code builds the component, wires it to active plan state. Test:

- Send a complex request in chat
- Plan card renders with steps
- Steps update as the agent progresses (pending → active → complete)
- Stop button visible
- No animations yet — just structure and live updates

When structure is solid:

````
Plan card renders live. Now add the animations — emergence from Eye, pulsing active step, collapse at completion, connection visualization.
````

---

## Step 12 — Animations + Eye choreography

This is where the craft lives. Build in order:
1. Plan card emergence animation (scale/fade from Eye position)
2. Eye state choreography on plan start/step/complete
3. Active step pulse (syncs with Eye Processing)
4. Completion reactions on step complete
5. Plan complete transition (card collapse, summary pill, Eye settle)
6. Connection visualization (the beam/line)

Iterate heavily. The difference between "it works" and "it feels magical" lives in the motion timing. Things to tune:

- **Emergence duration** — 400ms is a starting point; 300ms might feel snappier; 500ms might feel more deliberate
- **Active step pulse period** — should match Eye's Processing pulse, approximately
- **Step completion flash** — how long the ember fills, how long it lingers
- **Collapse duration** — fast enough not to feel slow, long enough to feel intentional

Spend real time here. You've earned the craftsmanship budget.

---

## Step 13 — Summary pill + scrollback

Build the collapsed summary that persists in chat. Test:

- Complete a plan, see the collapse → summary pill transition
- Pill renders in chat stream, styled distinctly from regular messages
- Tap pill, it expands to show full step list
- Pill survives refresh (stored in messages table)
- Multiple historical plans each have their own pill

---

## Step 14 — Reduced-motion handling

Toggle prefers-reduced-motion in browser DevTools. Verify:

- Plan card appears immediately
- Steps update without pulsing or animating
- No Eye choreography
- Summary pill appears without transition
- All functionality still works, just without motion

---

## Step 15 — Debug tab plan trace

Build the plan trace view in Debug tab. Every request with emitPlanStep calls gets the plan trace rendered clearly. Verify readable for plans of various lengths.

---

## Step 16 — Stress test

Real testing time. Try:

1. **"Plan my Thursday"** — agent should propose a multi-step plan, execute it, ask for approvals where needed
2. **"Add 5 customers named Test1-Test5 and create a proposal for each"** — bulk operation with 10+ steps
3. **"Review all my open jobs and tell me which ones need attention"** — read-heavy plan with conclusions
4. **"Plan my quarter"** (ambitious open-ended) — agent should push back if scope is unclear OR propose an approach
5. **Start a plan, interrupt with a new message** — verify queuing behavior
6. **Start a plan, click Stop** — verify clean stop + summary
7. **Start a plan, close browser, reopen** — verify rehydration (or graceful acceptance that state was lost)
8. **reduced-motion mode, full flow** — verify all functionality

Iterate on both behavior and visuals. Common tweaks:

- Plan card too loud — dial back animations
- Plan card too quiet — intensify ember on active step
- Eye choreography feels disconnected — tighten timing between plan events and Eye reactions
- Stop button feels aggressive — soften positioning, style
- Summary pill too prominent in chat — make more subdued
- Summary pill too subdued — increase prominence

---

## Step 17 — Update REAL_EIDRIX_NOTES.md

````
Update REAL_EIDRIX_NOTES.md with decisions locked in AC-05:

In UI Architecture:
- Plan-card-emerging-from-Eye locked in as Eidrix's signature agentic UX pattern
- The Eye-is-the-agent brand philosophy articulated
- Structured plan emission via emitPlanStep tool as the protocol
- Plan persistence in chat history as audit trail pattern (applies beyond plans)
- Summary pill pattern for any long operation's chat-stream residue

In Chat & Agent Behavior:
- Iteration cap raised to 25 with graceful degradation
- Complexity-assessment pattern for plan-first vs execute-with-narration
- Interruption handling: queue input, user stops explicitly
- Stop signaling via active_plans polling (Supabase-based for Netlify stateless constraint)

In Model Strategy (no changes; Sonnet 4.6 still correct default for this workload)

Open questions:
- Nested sub-plans for real Eidrix? When a step is itself complex enough to warrant sub-steps?
- Concurrent plans? (One user, two plans at once — probably never needed but flag)
- Plan templates? (Recurring operations — "end of week summary" as a saved plan)
- Can users edit plans mid-execution? (Drag step order, add a step — probably too much UX complexity, defer)

Changelog entry: "April [date] 2026 — AC-05 shipped. Multi-turn agentic loops with visible planning, plan card emerging from the Eye as signature UX, stop signaling, interruption handling, scrollback plan summaries. Eidrix is now a visible agent, not just a chat with AI."
````

---

## Step 18 — Code-simplifier + ship

````
Code-simplifier review on all Session 2 additions — plan card component, Eye choreography, animations, Debug trace view, reduced-motion handling. Report suggestions, don't auto-apply.

Then commit final changes, check off AC-05 (overall) in PROGRESS.md, push, open PR, test Deploy Preview end-to-end (verify plan emission, stop, reduced-motion, persistence all work in production), merge.
````

---

## What just happened

Eidrix became itself.

Not a chat app. Not an AI-powered CRM. Not a tool with some Claude-driven features. **An agent with presence.** The Eye is Eidrix. The plan card is Eidrix showing its work. The conversation is with a collaborator who has visible reasoning and deliberate action.

Users of post-AC-05 Eidrix experience something most AI products don't deliver: *presence*. A feeling that there's something there, doing work, thinking, progressing. The combination of the Eye (personality) + the plan card (deliberation) + the streaming chat (voice) creates an agentic character, not a feature set.

Every architectural pattern from AC-05 ports to real Eidrix:
- Plan-card-from-Eye becomes the signature UX moment customers remember
- Structured plan emission becomes the protocol for every long operation
- Interruption and stop become standard user controls
- Summary pills become the audit trail for every agentic action
- The Eye-plan choreography becomes the design language for how Eidrix's visual identity expresses its functional behavior

You're one chapter from graduation.

---

## What success looks like

- Simple requests don't emit plans (no ceremony for trivial work)
- Complex requests emit plans that populate visibly
- Plan card emerges from the Eye with smooth animation
- Active step pulses in sync with Eye Processing
- Steps check off as they complete
- Plan completion collapses the card with smooth transition
- Summary pill persists in chat stream, expandable
- Stop button halts running plan gracefully with summary
- Interruption (new message mid-plan) is handled cleanly (queued or blocked with clarity)
- reduced-motion users get a functional, motion-free experience
- Debug tab shows plan trace clearly
- Historical plans reviewable in scrollback
- Deploy Preview verifies all of this in production
- REAL_EIDRIX_NOTES.md updated
- Session 1 and Session 2 PRs both merged, branches clean

---

## If something broke

- **"Plan card doesn't appear for complex requests"** — system prompt not triggering emitPlanStep, or emission not reaching UI. Check Debug tab for emitted tools; trace from there.
- **"Plan card appears for simple requests (ceremony overload)"** — system prompt too eager. Tighten complexity heuristic.
- **"Steps don't update from pending → active → complete"** — state update pipeline broken. Verify active_plans table is being updated AND client is subscribed to changes (polling or realtime).
- **"Eye doesn't react to plan events"** — choreography not wired. Trace: plan state changes → Eye state updates. Check the listener.
- **"Stop doesn't stop"** — polling loop not detecting requested_stop. Verify Supabase row is updated AND chat.ts reads it at each iteration boundary.
- **"Interruption — user's second message gets lost"** — queue logic broken. Check where queued messages are stored AND when they're flushed.
- **"Plan card UI stutters during animation"** — too many re-renders. Use React.memo or ref-based state for the animated parts.
- **"Summary pill overwhelming chat visually"** — styling needs dialing back. Subtle differentiation from regular messages, but not too prominent.
- **"Reduced-motion doesn't suppress animations"** — media query not checked, or Framer Motion motion components not respecting it. Wrap in conditional.

---

## Tour Moment — The Eye was always meant for this

Go back and re-read AC-08a's chapter (if you can find it — it's been months). You built the Eye with six animation layers, four states, seven reactions, and — importantly — *no specific purpose beyond presence*. It was a character without a script.

AC-05 gives the Eye its script. The Eye was waiting for AC-05.

The six animation layers are the character's expressiveness (breath, blinks, look-around, state, reactions, tinting). The four states are its moods (idle, thinking, speaking, muted). The seven reactions are its emotional vocabulary (acknowledge, noticed, processing, completion, handoff, uncertainty — and cursor tracking you added as a bonus). Every piece of that was practice for *this*.

In AC-05, the Eye does meaningful work. Processing intensity syncs with active plan steps. Completion reactions fire when real work completes. Uncertainty shows real uncertainty (when a plan fails). Every layer of the Eye is now tied to real events happening in Eidrix's agentic behavior.

This is why we spent so long on AC-08a even though it looked like a digression. The Eye wasn't the point; the *capacity* for the Eye was the point. AC-05 uses that capacity.

Real Eidrix will use it more. When an onboarding flow runs, the Eye animates the journey. When an invoice generates, the Eye shows progress. When customer follow-ups fire, the Eye acknowledges. The Eye becomes the continuity of Eidrix across every feature.

---

## Tour Moment — Why plan visibility is trust

Users don't trust agents that take 30 seconds to respond with no visible work. Users don't trust agents that seem to be doing the wrong thing. Users don't trust agents that can't be stopped.

The plan card solves all three:

1. **Visibility of work** — 30-second operations become 30 seconds of visible progress, not 30 seconds of staring at a spinner.
2. **Transparency of approach** — users see the plan before the work. If the agent's plan is wrong, the user notices and stops it.
3. **Sovereignty** — the Stop button is ALWAYS available. Users know they're in control.

This is why serious agent products (Cursor, Claude Code, v0) all have some form of plan visibility. The products that don't — that just "do stuff" with no visible plan — are the ones that users eventually abandon because they feel out of control.

Real Eidrix's tenants will stay with it, at least partly, because the agent's behavior is legible. They see what it's doing; they stop it when needed; they understand what happened after. Trust compounds over months of legible operations.

---

## Tour Moment — Choreography is a first-class concern

Most apps have one thing animating at a time. Most apps treat animations as decoration.

Your app has two animated systems (Eye + plan card) that need to feel *related*. That's choreography. It requires:

- Shared timing systems so pulses don't clash
- Coordinated color palettes so they read as one visual family
- Shared events so when one reacts, the other can too
- Explicit suppression conditions (when the plan card emerges, does the Eye's normal look-around pause? probably yes)

In professional product design, choreography between animated elements is a specialty. Disney animators call it "pose-to-pose" vs "straight-ahead." Motion designers talk about "layered animation." Interaction designers call it "ambient motion."

You just did real choreography. It's harder than it looks. When real Eidrix has 5+ animated systems (Eye + plan card + notification toast + typing indicator + success confirmation), the choreography discipline you built in AC-05 becomes the backbone of how they all coexist without clashing.

---

## Tour Moment — The "emerging from the Eye" pattern is bigger than this chapter

The visual language "work comes from the Eye" is a brand asset. Anywhere in real Eidrix where something agentic happens — notifications arriving, insights appearing, reports generating — the content can emerge from the Eye.

Examples:

- **Morning summary** — user opens Eidrix, Eye pulses, a card emerges from the Eye with "Here's what I noticed overnight..."
- **Anomaly detection** — Eye flashes gently, a subtle card emerges near the Eye: "I noticed this customer hasn't been contacted in 45 days — normally they're on a 30-day cadence."
- **Proactive suggestion** — Eye leans toward the user (cursor-tracking amplified), emits a small card: "You mentioned wanting to raise rates. Want to review your pricing?"
- **Summary generation** — every Friday, Eye generates a weekly summary card that persists in the chat.

All of these use the same visual pattern: the Eye as source, content emerging from it, Eye choreographing with the emerging content.

Real Eidrix's brand will be "the app where Eidrix works alongside you, visibly, with presence." That brand is established by the plan card pattern you just built.

---

## Next up

**Pre-Build Audit — Shaping Real Eidrix's Foundation.** The graduation chapter. No new features. A deliberate review session:

- Read REAL_EIDRIX_NOTES.md top to bottom
- Revise anything your thinking has evolved on
- Clean up CLAUDE.md for the real Eidrix repo (not Trial and Error's)
- Identify which Trial and Error patterns port verbatim vs which reshape
- Resolve outstanding open questions
- Produce the starting brief for real Eidrix Day 1

About 2-3 hours of deliberate thinking. Not building — *designing* the real thing, fully armed with everything you've learned.

After Pre-Build Audit: real Eidrix begins.

You're one chapter away. Take a deep breath. You've done real work.
