# Tool Capabilities

This folder contains chapters that level up your **Claude Code** skills — not the app you're building, but the tool you're using to build it. Each chapter teaches one specific Claude Code feature in depth.

## How to use this folder

These chapters are **à la carte**. Unlike the Main Track (which builds the Eidrix-style app in order), Tool Capabilities can be done in any sequence. Pick one when:

- You're curious about a specific Claude Code feature
- You hit a workflow problem and want to learn the tool's solution
- You want to push past beginner-level Claude Code use

You don't have to do any of them. The Main Track works fine without them. They're side quests for going deeper.

## What might live here

Future chapters in this folder might cover:

- Custom slash commands (extending Claude Code with your own workflows)
- Hooks (automating actions on tool events)
- MCP servers (connecting Claude Code to external tools and data)
- Subagents (delegating work to specialized assistants)
- Custom skills (the same kind of skill currently installed at `.claude/skills/frontend-design/`)
- Settings, keybindings, and harness configuration
- Worktrees and parallel sessions

## Current chapters

- **[TC-01 — Plan Mode & Thorough Planning](tc-01-plan-mode.md)** — Three levels of planning (quick / standard / thorough) and when to reach for each. Foundation skill that makes every other chapter cleaner. ~45 min.

## Planned chapters

Chapters scheduled in the [locked execution order](../CURRICULUM_DESIGN.md) but not yet written. Research notes for each accumulate here as we encounter relevant material.

### TC-09 — Skills Discovery & Curation *(not yet written)*

Tour of the most powerful skills in the ecosystem. Learn to evaluate viral skills critically — extract principles, don't blindly install.

**Research notes for when this chapter gets written:**

- **Case study: `forrestchang/andrej-karpathy-skills`** (30k+ GitHub stars, viral early 2026). A single CLAUDE.md file encoding four Karpathy principles: (1) surface assumptions don't bury them, (2) don't overengineer/YAGNI, (3) touch only what the task requires, (4) goal-driven execution with verification loops. Good example of "viral skill worth studying but not necessarily installing." Our existing CLAUDE.md already covers ~80% of it. Teaching angle: how to read a viral skill critically, extract the 2-3 ideas worth stealing, and incorporate them into your own system instead of installing everything.

- **Philosophy to teach:** A junior student sees "30k stars" and installs. A power user extracts principles. TC-09's job is to build that second instinct.

- **Other skills to evaluate in this chapter:** Will grow as we encounter interesting ones during the curriculum.

## Adding a new Tool Capability chapter

When you (or a future student) wants a chapter that doesn't exist:

1. Ask Claude Code to draft one as a small PR.
2. The chapter follows the same structural rhythm as Main Track chapters (intro, what you're learning, what you're building/practicing, plain English glossary, step-by-step, success criteria, troubleshooting).
3. It lives at `curriculum/tool-capabilities/<short-slug>.md`.
4. Add an entry to the "Current chapters" list above.
5. Add an entry to the Tool Capabilities section in `PROGRESS.md`.
