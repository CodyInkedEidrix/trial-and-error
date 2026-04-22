# Curriculum Design — Trial and Error

*The source of truth for what Trial and Error is, what it teaches, and how the pieces fit together. Read this when deciding what to build next, whether a new chapter should be added, or how to explain the whole thing to someone.*

---

## The thesis

Trial and Error is a **capability bootcamp** disguised as an app build.

The student builds a mini Eidrix-style app — chat on the left, tabs on the right — one chapter at a time. But the real deliverable isn't the app. It's the *builder*. By the end, a student who's never coded before can:

- Confidently drive Claude Code through any real project
- Articulate what they want precisely enough to get it built
- Ship features that make people ask "where did you learn to do that?"
- Build and wire agentic AI systems from scratch
- Style and animate at a level above generic AI output
- Know when to use skills, MCP, subagents, and other leverage tools

The app is the vehicle. The power-user is the destination.

---

## The three tracks

### Main Track (build the app)

Linear. Each chapter builds on the last. Ships working app features.

The Main Track is the backbone. It goes from "empty folder" to "fully architected Eidrix-style app with chat, tabs, real backend, real AI, and a proper design system." Completing it means you've shipped a real product.

### Tool Capabilities (master Claude Code)

Short, à la carte chapters about using Claude Code itself better. Things like plan mode, web search, image analysis, subagents, writing custom skills.

These don't add app features — they make *you* a better operator of Claude Code. Most can be done anytime, with a few exceptions (like writing custom skills, which needs Chapter 16 as prerequisite).

### App Capabilities (build features for any app)

Longer chapters that build real, portable features. Streaming chat, tool calling, agentic subagents, drag-and-drop uploads, voice input, command palettes.

Each one ships working code into Trial and Error AND teaches a pattern the student can reuse in any future project. These are the "holy shit where did you learn this" features.

---

## The dependency principle

Capabilities only unlock when their prerequisites are built. You can't wire agentic AI chat to a non-existent chat UI. You can't teach context injection without context to inject. You can't do tool calling without real data to manipulate.

The execution order in this doc respects those dependencies. Follow it.

Students are free to skip à la carte items, but the prerequisites for each are listed so nothing gets attempted too early.

---

## The full capability menu

### Tool Capabilities

| ID | Name | Depends on | Why it matters |
|---|---|---|---|
| TC-01 | Plan Mode & Thorough Planning | Nothing | Meta-skill. Makes every future chapter better. Do first. |
| TC-02 | Web Search & Research | Nothing | Opens the internet as a research tool inside Claude Code. |
| TC-03 | Image Analysis & Screenshots | Nothing | Drop a screenshot, have Claude Code read it. Design work accelerator. |
| TC-04 | Reading Other People's Code | Ch 7 helpful | Critical for working with real Eidrix, inherited codebases, open source. |
| TC-05 | Git Surgery | Ch 2.5 | Stash, rebase, cherry-pick, revert merged PRs. Recovery at the expert level. |
| TC-06 | Subagents (Claude Code's) | TC-01 | How Claude Code spawns helpers. Leverage them deliberately. |
| TC-07 | Writing Custom Skills | Ch 16 | Write SKILL.md files that encode your own expertise. Massive multiplier. |
| TC-08 | CLAUDE.md Mastery | Nothing | Shape Claude Code's behavior in any project. |
| TC-09 | Skills Discovery & Curation | Ch 16 | Tour of the most powerful skills in the ecosystem. Find the ones that change your work. |

### App Capabilities

| ID | Name | Depends on | Why it matters |
|---|---|---|---|
| AC-01 | Streaming Chat Foundation | Ch 11, Ch 13 | First real AI chat. Foundation for everything agentic. |
| AC-02 | Context-Aware Chat | AC-01, Ch 10 or Ch 14 | Chat that knows what's happening in your app. |
| AC-03 | Tool Calling | AC-02, Ch 14 | Chat can DO things, not just talk. The agent moment. |
| AC-04 | Agent Memory & Persistence | AC-01, Ch 14 | Conversations remembered across sessions. |
| AC-05 | Multi-Turn Agentic Loops | AC-03 | Plan → execute → reflect → execute again. Real autonomy. |
| AC-06 | Command Palette (cmd+K) | Ch 8 | Linear/Raycast/Notion-style universal search and actions. |
| AC-07 | Keyboard Shortcuts | Ch 11, AC-06 rec | Invisible keyboard polish — Escape to close overlays, Cmd+Enter to submit, tab trapping in modals. The affordances users feel without noticing. |
| AC-08a | The Eidrix Eye | Ch 9 | The signature living animated SVG component — six layers, four states, seven reactions. Ships to real Eidrix unchanged. |
| AC-08b | Eye Tuning Playground | AC-08a | Live sliders, preset save/load, code export for tuning every Eye parameter. Same pattern as Motion Lab v2. |
| AC-09 | Drag-and-Drop File Uploads | Ch 15 | With preview, progress, chunked uploads, error handling. |
| AC-10 | Voice Input / Speech-to-Text | AC-03 rec | Contractor-with-dirty-hands feature. Real-world operator value. |
| AC-11 | Optimistic UI & Loading States | Ch 10 | Skeleton loaders, optimistic updates, smooth transitions. |
| AC-12 | Smart Search with Fuzzy Matching | Ch 14 | Raycast-quality search. Keyboard nav, instant results. |
| AC-13 | Real-Time Presence | Ch 14 | "3 people viewing this record." Figma/Linear collab vibes. |
| AC-14 | Toast Notifications with Actions | Ch 8 | "Saved! Undo?" Polished feedback loop. |
| AC-15 | Magic Link / Passwordless Auth | Ch 14 | No passwords. Feels premium. |
| AC-16 | Agentic Subagents Within Your App | AC-05 | Specialized agents inside your chat — scheduling agent, notes agent, etc. The real Eidrix vision. |
| AC-17 | Streaming UI Updates from Agent Actions | AC-03 | Watch the UI update live as the agent acts. Feels like magic. |

---

## The locked execution order

This is the order in which chapters unlock. Main track is linear; capability chapters slot in where their prerequisites are met.

Stars mark the biggest "milestone" moments.

### Phase 1 — Foundations (done)

1. Chapter 0 — First Session
2. Chapter 1 — Hello World
3. Chapter 2 — Git Rhythm
4. Chapter 2.5 — When Things Break
5. Chapter 3 — The Canvas
6. Chapter 4 — Typography Section
7. Chapter 5 — Color Section
8. Chapter 6 — The Eidrix Shell

### Phase 2 — Range and Polish

9. TC-01 Plan Mode
10. Chapter 7 — Reading Code
11. TC-04 Reading Other People's Code
12. Chapter 8 — Components Tab
13. AC-06 Command Palette
14. AC-14 Toast Notifications ✓ (shipped as part of Ch 10)
15. Chapter 9 — Motion Lab
16. AC-08a The Eidrix Eye ⭐
17. AC-08b Eye Tuning Playground
18. Chapter 10 — Fake Data & Forms
19. Chapter 10.5 — The Record-Detail Tab Pattern
20. AC-11 Optimistic UI & Loading States
21. Chapter 11 — Fake Chat UI
22. AC-07 Keyboard Shortcuts
23. Chapter 12 — Deploy It ⭐

### Phase 3 — Going Real

24. Chapter 13 — Environment Variables
25. AC-01 Streaming Chat Foundation ⭐
26. TC-02 Web Search
27. TC-03 Image Analysis
28. Chapter 14 — Supabase Foundation
29. AC-02 Context-Aware Chat
30. AC-03 Tool Calling ⭐⭐
31. AC-17 Streaming UI Updates
32. AC-04 Agent Memory & Persistence
33. AC-05 Multi-Turn Agentic Loops
34. AC-16 Agentic Subagents ⭐⭐⭐

### Phase 4 — Completion

35. Chapter 15 — Files & Images
36. AC-09 Drag-and-Drop File Uploads
37. AC-10 Voice Input
38. AC-12 Smart Search (à la carte)
39. AC-13 Real-Time Presence (à la carte)
40. AC-15 Magic Link (à la carte)

### Phase 5 — Advanced

41. Chapter 16 — Skills & Design System
42. TC-07 Writing Custom Skills
43. TC-09 Skills Discovery & Curation
44. Chapter 17 — MCP Introduction
45. Chapter 18 — Registry Pattern
46. TC-05 Git Surgery (à la carte)
47. TC-06 Subagents — Claude Code's (à la carte)
48. TC-08 CLAUDE.md Mastery (à la carte)
49. Chapter 19 — Graduation Project

---

## Quality bar

Every chapter should have these sections:

- Italic intro (what + estimated time)
- What you're learning
- What you're building
- Plain English glossary (for new terms)
- The plan, in plain English
- Numbered steps with specific copy-paste prompts
- What success looks like
- If something broke (troubleshooting)
- Tour Moments (optional, for UI/concept asides)
- Next up

Main Track chapters tend to be longer (60-120 min). Tool Capability chapters tend to be shorter (30-60 min). App Capability chapters range from 90 min to 3 hours depending on scope.

---

## A note on the student

The primary user is someone who has built things before (maybe with Bolt, Lovable, or similar tools) but hasn't driven Claude Code seriously. They know HTML exists. They know what a button is. They get lost the moment someone says "branch" or "PR."

The curriculum meets them there. By the end, they're not a junior dev — they're a confident Claude Code power user with enough range to build whatever their imagination comes up with.

The secondary user — the true beginner — can also use this, but may need to go slower, ask Claude Code more questions, and lean harder on the glossary.

Either user finishes this and knows how to build.

---

## Changelog

- **April 18, 2026** — Initial design doc. 19 Main Track chapters locked. 9 Tool Capabilities and 17 App Capabilities planned. Execution order defined with dependency respect.
- **April 21, 2026** — Rescheduled AC-07 (Keyboard Shortcuts) from Phase 2 position #14 to #20. Reframed from "complete shortcut system for users who love them" to "invisible keyboard polish — the affordances users feel without noticing." New dependency on Ch 11 (Fake Chat UI) so the chapter lands with a chat input and more overlays to polish, not just a command palette.
- **April 21, 2026** — Split AC-08 (Animated Brand Marks) into AC-08a (The Eidrix Eye — the signature component itself) and AC-08b (Eye Tuning Playground — live sliders and preset save/load). AC-08a keeps position #16 and the ⭐ signature marking; AC-08b inserts at new position #17. Every item from old #17 onward shifted +1 (31 items renumbered across Phases 2–5, total curriculum length 47 → 48).
- **April 21, 2026** — Inserted Chapter 10.5 — The Record-Detail Tab Pattern at position 19 (right after Chapter 10, before AC-11). Short Main Track chapter (~90 min) that teaches the tab-based record-detail pattern used in real Eidrix — clicking a customer row opens them as a third-tier tab (Records → [Customer Name]), editable in place rather than in a slide-in panel. Same data, different UI pattern. Every item from old #19 onward shifted +1 (30 items renumbered across Phases 2–5, total curriculum length 48 → 49).
- **April 21, 2026** — Absorbed AC-14 (Toast Notifications with Actions) into Chapter 10. AC-14 was originally scheduled at position #14 but never shipped standalone; the Chapter 10 build needed a generic toast system for the undo-delete pattern, so the full AC-14 capability was built and shipped as part of position #18. Position #14 retained in the locked order with a "✓ shipped as part of Ch 10" inline marker so the historical sequence stays readable. Also established a new architectural principle in CLAUDE.md — the chat column is sovereign and overlays must scope to the tabs area. Curriculum length unchanged at 49.
