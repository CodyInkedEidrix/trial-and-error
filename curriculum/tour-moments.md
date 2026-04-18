# Tour Moments

This file collects pieces of the Claude Code interface that students see but aren't explicitly taught about in the chapter flow. Think of these as sidebar vignettes — "meet your tools."

They get added here as students (starting with the curriculum author) run into UI elements that confuse them. Later, these entries get interspersed as proper "Tour Moment" sections in relevant chapters.

## How to use this file

- If you're a student and you see something in Claude Code that confuses you, add a one-liner here describing what you saw and where.
- If you're Claude Code helping a student, suggest adding entries here when the student expresses confusion about a UI element the current chapter doesn't cover.

## Current entries

### The PR line-count widget
**Where you see it:** Bottom of the Claude Code window after a PR is opened. Looks like `+1892 -0`.

**What it means:** How many lines are being added and removed compared to the target branch (usually `main`). The `+` number is additions. The `-` number is deletions.

**Why it's often scary-big on early PRs:** Most of that number is the `package-lock.json` file — a huge auto-generated file that pins the exact version of every sub-tool your project uses. Nobody reads it manually. When you see a large PR early on, look at the file list to see how much is real code vs. lockfile noise. Usually the real code is tiny.

### The "CI" pill
**Where you see it:** Next to the PR line-count widget, between the branch arrow and the "View PR" button.

**What it means:** "CI" stands for Continuous Integration — an automated system that runs tests whenever you push code. Right now Trial and Error has no CI set up, so this pill is gray or empty. Later chapters might add automated checks; when that happens, this pill will turn green (passing) or red (failing).

**For now:** Ignore it. Not a concern.

### The branch arrow
**Where you see it:** The indicator that looks like `main ← chapter-1-hello-world`.

**What it means:** It's showing the direction of the merge — "this feature branch is about to be merged INTO main." The arrow points toward the destination.

**Quick mental model:** Left side = where your work is going. Right side = where your work is coming from.

### The preview panel
**Where you see it:** The right-side pane when Claude Code is running your dev server. It's essentially a small embedded browser.

**What it shows:** Your live app, updating automatically when code changes (this is called "Hot Module Reload" or HMR). It's the same thing you see if you open `localhost:5173` in a real browser — same source, different window.

**When to use the real browser instead:** For anything you want to test at full size, interact with deeply, or check on mobile. The embedded preview is convenient for quick glances; the real browser is better for real testing.

### The `.claude/` folder
**Where you see it:** It appears in your file tree but is intentionally gitignored (not tracked by git).

**What it is:** Claude Code's per-session state — launch configs, working notes, session metadata. It's specific to your machine and your current session. It's not part of the project itself, which is why it's gitignored.

**Never commit it, never worry about it.** It will come and go on its own.
