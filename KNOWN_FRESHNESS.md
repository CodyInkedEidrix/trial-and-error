# Known Freshness

Software updates fast. Tools change their UI. This file tracks when the curriculum was last known to match reality, so students can tell if they might hit drift.

## Last verified end-to-end

**April 18, 2026**

Against:
- Claude Code Desktop — redesigned version released March 2026
- Opus 4.7 as the default model
- Node 22, npm 10
- GitHub (web interface and Desktop app — either works)
- Vite 5.x + React 18.x + TypeScript 5.x

## UI-dependent instructions

These are parts of the curriculum that rely on specific UI elements or behaviors. If the UI changes, these may need updating:

- **Chapter 0:** Sign-in flow, Claude Code Desktop installation
- **Chapter 1:** Preview panel references, `localhost:5173` default port
- **Tour Moments:** The PR widget layout, CI pill, branch arrow indicator

(This list grows as new chapters are added.)

## External-repo references

Chapters that depend on a specific file or folder in someone else's repo. If the upstream repo restructures, these may need updating:

- **TC-04 — Reading Other People's Code:** uses `vercel/next.js` example `blog-starter` as the practice codebase. Originally pointed to `with-tailwindcss` (verified gone April 2026). If `blog-starter` also disappears, the chapter has a built-in fallback: pick any small Tailwind-using example from `github.com/vercel/next.js/tree/canary/examples/`.

## Environment notes

### Worktree-mode Claude Code sessions

Some Claude Code setups run sessions inside a git **worktree** (a secondary folder linked to the same repo). You can tell this is happening if the session's working directory path includes `.claude/worktrees/...`.

In a worktree, `main` is already checked out by the primary folder, so the worktree itself always runs on its own branch. This means the chapters' "confirm I'm on main" instruction won't match `git status` literally — you'll see a feature branch name or a detached HEAD instead.

**This is not drift — the chapters are correct for a standard single-folder setup.** The functional equivalent in worktree mode is being **at the tip of `origin/main` with a clean working tree** (same commit, same content, different git label).

If a student hits this, Claude Code should acknowledge the worktree constraint, confirm the state is equivalent, and proceed without rewriting the chapter.

## If you're using this curriculum more than 3 months after the date above

Ask Claude Code, at the start of your session:

> The curriculum file `KNOWN_FRESHNESS.md` says it was last verified on [DATE]. Based on the current Claude Code UI you can see, are there any parts of the upcoming chapter that might be stale? Flag anything that looks different.

Claude Code will scan ahead and warn you about likely drift points. When something is stale, don't panic — the *intent* of the chapter is always achievable, even if the UI buttons moved.

## Found something stale?

That's valuable! The fix flow:
1. Finish what you were trying to do (ask Claude Code for the current equivalent)
2. Open a small PR updating the affected chapter and this file
3. Note the date and what you changed

The curriculum gets better every time a student ships a staleness fix.
