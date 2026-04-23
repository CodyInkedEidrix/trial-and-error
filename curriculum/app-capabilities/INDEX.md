# App Capabilities

This folder contains chapters that teach **reusable app features** — patterns and integrations you can drop into any project, not just the Trial and Error app. Each chapter walks through one feature end-to-end: what it is, when to use it, and how to actually build it.

## How to use this folder

These chapters are **à la carte**. Unlike the Main Track (which builds the Eidrix-style app in a fixed order), App Capabilities can be done whenever you need the feature. Pick one when:

- You're building (or want to build) something that needs the feature
- You want to understand a common pattern before you encounter it in real work
- You're scoping out an app idea and want to know what's involved

The Main Track teaches you to build *the* app. App Capabilities teach you to build *any* app.

## What might live here

Future chapters in this folder might cover:

- User authentication (sign-in, sign-up, sessions)
- Payments (Stripe checkout, subscriptions, webhooks)
- File uploads and storage
- Email sending (transactional, marketing)
- Full-text search
- Real-time updates (websockets, server-sent events)
- Image processing and CDN delivery
- Analytics and event tracking
- Background jobs and queues
- Webhooks (sending and receiving)

## Current chapters

- **[AC-01 — Streaming Chat Foundation](ac-01-streaming-chat-foundation.md)** ⭐ — The first real-AI chapter. Replace the Chapter 11 canned responses with live streaming Claude via Anthropic's Messages API, routed through a Netlify Function so the API key stays server-side. Covers Server-Sent Events, client-side stream consumption, incremental React state updates, system-prompt-as-product-voice, and the full error-handling matrix (network failure, rate limit, mid-stream interruption). Wires Eye reactions to real AI events instead of timers. Foundation every later AI chapter (AC-02, AC-03, AC-04, AC-05, AC-16) builds on. ~3.5 hours. Requires Ch 11, Ch 13.
- **[AC-02 — Context-Aware Chat](ac-02-context-aware-chat.md)** — The chapter where Eidrix stops being generic and starts knowing your business. Adds Jobs as a second entity (relational to Customers), wires context injection (Off / Smart Subset / Full modes) so the AI reasons across the relationship, builds an Agent Debug tab that surfaces exactly what Claude sees each request (system prompt, messages, tokens, response time, cumulative cost), and moves Settings out of hardcoded function code into a Supabase-backed per-org `agent_settings` table. Bumps the default model to Sonnet 4.6. Validates Chapter 10.5's engine pattern at scale — Jobs and Debug tabs both render from BusinessConfig alone, no shell edits. ~5 hours, the biggest AC chapter so far. Requires AC-01, Ch 14.
- **[AC-03 — Agentic Foundation](ac-03-agentic-foundation.md)** ⭐⭐ — The agentic moment. The longest chapter in the curriculum (~8-10 hours across two sessions). Adds Proposals as a third relational entity (Customer → Job → Proposal), defines ~15-18 tools across Customers/Jobs/Proposals, builds the server-side tool execution loop in chat.ts (parallel calls, RLS-respected auth, max-iteration cap, structured error handling), injects UI context so Eidrix knows which tab / record / section the user is looking at, gates destructive actions behind inline confirmation rendered in the chat stream, refreshes affected stores live when the agent mutates data, and upgrades the Agent Debug tab to a full readable trace of every tool call in the loop. Structured as Session 1 (foundation: Proposals + tools + raw loop) and Session 2 (agentic behavior: UI context, confirmation, live refresh, trace UI, ambiguity tuning). After this chapter, Eidrix is real. Requires AC-02, Ch 14.
- **[AC-04 — Agent Memory](ac-04-agent-memory.md)** ⭐⭐ — The strategic chapter. ~5-6 hours across two sessions. Builds the layered memory system that turns Eidrix from "agent that knows your data" into "agent that knows you": persistent conversation history, Claude-driven fact extraction into a typed memory table, vector embeddings via Voyage + pgvector, hybrid retrieval at chat time (recent messages + top-K semantic facts + ambient overview), and a Memory UI in Settings where the user sees, edits, and deletes everything Eidrix has learned. Async extraction runs via Netlify's `-background.ts` pattern so the user never waits. User-scoped reads within an org as the privacy default. The strategic bet: memory is what makes real Eidrix defensible long-term — competitors can clone features, they can't clone 18 months of accumulated tenant memory. Requires AC-01, Ch 14.
- **[AC-05 — Multi-Turn Agentic Loops](ac-05-multi-turn-agentic-loops.md)** ⭐⭐ — The signature visual chapter. ~5-6 hours across two sessions. Where the Eye becomes the agent: when Eidrix takes a complex multi-step request, a plan card emerges from the Eye itself, populates with steps as the agent commits to them, checks off as each executes, syncs visually with the Eye's state throughout. Session 1 builds the agentic behavior (iteration cap raised to 25 with graceful degradation, `emitPlanStep` tool for structured event emission, complexity-assessment system prompt, Stop signaling via Supabase polling, interruption queuing). Session 2 builds the plan card UI, the Eye-plan choreography, the connection visualization, scrollback plan summaries, reduced-motion handling, and the Debug tab plan trace view. The last true build chapter before graduation — after this, Eidrix is a visible agent with presence, not just a chat with AI. Requires AC-03, AC-04.
- **[AC-06 — Command Palette (cmd+K)](ac-06-command-palette.md)** — Build a Linear/Raycast-style command palette with cmd+K/ctrl+K trigger, fuzzy search, and a typed action system. First App Capability chapter, and the pattern foundation for AC-03 (Agentic Foundation) later. ~90 min. Requires Ch 8.
- **[AC-08a — The Eidrix Eye](ac-08a-eidrix-eye.md)** — The signature chapter. Build the Eidrix Eye — a living animated SVG component with six animation layers, four states (Idle / Thinking / Speaking / Muted), and seven reactions. Mounts at 24px in the chat column header and 240px in a new Brand tab. Config-driven so AC-08b's tuning playground drops in cleanly. ~4 hours. Requires Ch 9.
- **[AC-08b — The Eidrix Eye Tuning Playground](ac-08b-eye-tuning-playground.md)** — Companion to AC-08a. Transform the Brand tab into a full design instrument: preset bar, live sliders for every Eye parameter, three-size side-by-side preview, live TypeScript code export, custom preset save. Same pattern as Motion Lab v2. ~3 hours. Requires AC-08a.
- **AC-14 — Toast Notifications with Actions** ✓ *Shipped as part of Chapter 10 — no standalone chapter file.* The Ch 10 undo-delete pattern required a generic toast system, so AC-14's full scope was built alongside it: variants (info/success/warning/danger), actions, glass styling, dismissal-intent triad (auto / manual × / action click), pause-on-hover/focus, `prefers-reduced-motion` respect. The reusable toast infrastructure lives at `src/lib/toastStore.ts` + `src/hooks/useToast.ts` + `src/components/toast/`. Reach for `useToast().push({...})` from anywhere in the app.

## Adding a new App Capability chapter

When you (or a future student) wants a chapter that doesn't exist:

1. Ask Claude Code to draft one as a small PR.
2. The chapter follows the same structural rhythm as Main Track chapters (intro, what you're learning, what you're building, glossary, step-by-step, success criteria, troubleshooting).
3. It lives at `curriculum/app-capabilities/<short-slug>.md`.
4. Add an entry to the "Current chapters" list above.
5. Add an entry to the App Capabilities section in `PROGRESS.md`.
