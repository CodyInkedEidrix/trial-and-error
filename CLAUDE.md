# CLAUDE.md — Trial and Error

## What this repo is

This repo is a self-teaching curriculum called **Trial and Error**. It walks a complete beginner from zero through building a mini Eidrix-style app — tabs, chat UI, Supabase, AI, MCP — one chapter at a time.

The repo teaches itself: every chapter is a markdown file in `curriculum/` with explicit prompts the student pastes into Claude Code.

## How to help the student

When a student opens a session and asks "where do I start?" or "what do I do next?":

1. Open `curriculum/PROGRESS.md` and find the first unchecked chapter.
2. Open that chapter's markdown file in `curriculum/`.
3. Walk them through it, following the prompts exactly as written.
4. When a chapter is complete and merged, update `curriculum/PROGRESS.md` to check that chapter off.

## Rules for this codebase

- **Never commit or push without asking.** Always wait for the student to approve.
- **Follow the 10-step rhythm** for every feature: branch → plan → approve → build → iterate → PR → review → merge → cleanup.
- **Explain as you go.** The student is learning. When you run a command or create a file, briefly say why.
- **Use plain English.** Avoid jargon. When a new term is introduced, check if it's in `curriculum/glossary.md` and reference it. If it's not there, suggest adding it.
- **Keep commits focused.** One idea per commit, one idea per PR.
- **No unasked-for docs, comments, or abstractions.** If the student didn't request it, don't add it.

## Tech stack (as of Chapter 1)

- Vite + React + TypeScript
- More will be added chapter by chapter (Tailwind in Ch 3, Framer Motion in Ch 9, Supabase in Ch 13, etc.)

## Context files to always read at session start

- `curriculum/PROGRESS.md` — where the student is
- The chapter markdown for the current chapter
- `curriculum/glossary.md` — terms the student has learned
