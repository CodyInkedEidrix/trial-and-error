# Chapter 2 — Git Rhythm

*In Chapter 1 you shipped your first PR, but a lot happened fast. This chapter slows way down. You're going to make one small visible change to your page — adding a subtitle — and use it as an excuse to walk through every single step of the git rhythm carefully. By the end, the "branch → plan → build → PR → merge" cycle will stop feeling like magic and start feeling like a pattern you can do in your sleep. Total time: about 45 minutes.*

---

## What you're learning

1. **The 10-step rhythm** — the pattern every piece of work will use from here on out
2. **Why each step exists** — not just what to do, but why
3. **How to read a PR diff** — looking at what's about to change before you commit to it
4. **How to recover** if you make a change you don't like partway through
5. **Why small PRs beat big PRs**

---

## What you're building

Your Hello World page gets ONE small visual upgrade: a subtitle underneath "Trial and Error" that says "Learning to build, one chapter at a time."

That's it. You already know you can add text to a page — you did it in Chapter 1. The point of this chapter isn't the feature. **The point is the workflow around the feature.** You're building the muscle memory of how professional developers ship code every day.

---

## Plain English glossary for this chapter

- **Rhythm** — a repeatable pattern you use every time you change code. Like a checklist pilots run before takeoff. Same steps, every flight.
- **Feature branch** — a branch specifically created to build one thing. When that one thing is done, the branch is merged and deleted.
- **Diff** — short for "difference." A visual showing what changed between two versions of your code. Green lines are added, red lines are removed.
- **Merge conflict** — when two branches changed the same line differently and git doesn't know which version to keep. Rare in solo work, we'll deal with it when it happens.
- **Commit message** — the note you leave when saving a change, explaining what the change does. Write them like you're reminding your future self what you did.

---

## Why rhythm matters

You might be thinking "this seems like overhead for adding one line of text." Fair. Here's why it's worth it anyway:

Rhythm is insurance. When you're building fast and confident, the rhythm feels like bureaucracy. But the day you ship a bug that breaks your app, or you change your mind about a feature halfway through, or another person joins your project — the rhythm is what saves you.

- Branches mean experiments can fail safely. You can throw the whole thing away.
- PRs mean every change gets a second look before it becomes official.
- Small PRs mean each change is easy to understand in isolation.
- Clean cleanup means you never accumulate mystery branches.

Think of the rhythm like how a chef cleans their station after every dish. Not required to cook one dish. Absolutely required to cook a hundred.

---

## The 10 steps (memorize this)

Every time you change code, you run this cycle:

1. **Start clean** — confirm you're on `main`, up to date, nothing hanging around
2. **Name the thing** — one sentence describing what you're about to build
3. **Create a branch** — named after the thing
4. **Ask for a plan** — before any code is written
5. **Review the plan** — approve or redirect
6. **Build** — Claude Code writes the code while the dev server runs live
7. **Iterate** — look at the change, refine until it's right
8. **Open a PR** — commit, push, request review
9. **Review the diff, then merge** — read what's about to land, then approve
10. **Clean up** — back to main, pull, delete the branch

Every chapter from here on uses these steps. We're going to do them in slow motion right now.

---

## Step 1 — Start clean

Tell Claude Code:

```
Starting Chapter 2 — Git Rhythm. Before anything else, confirm I'm on main, up to date with origin, working tree clean, no leftover branches from earlier work. If anything is off, tell me what and help me get clean.
```

**Why:** You never want to start new work on top of leftover old work. Confusion compounds fast.

**What to expect:** Claude Code confirms you're clean or flags what needs fixing. Usually you'll be clean since you did cleanup at the end of Chapter 1.

---

## Step 2 — Name the thing

**You do this mentally, not in a prompt.** The name of what you're building should fit in one sentence without using the word "and."

For this chapter: *"Add a subtitle underneath the main heading."*

**Why:** If your sentence needs "and," you're really building two things — split them into two separate PRs. Clear names lead to clean branches and clean PRs.

---

## Step 3 — Create a branch

Tell Claude Code:

```
Read CLAUDE.md and curriculum/PROGRESS.md before starting. Then create a new branch called feature/add-subtitle.
```

**Why read those files every time?** CLAUDE.md has the rules for this repo. PROGRESS.md shows where you are in the curriculum. You want every session starting on the same page as you.

**Branch naming convention:** `feature/short-descriptive-name`. All lowercase. Dashes instead of spaces. No punctuation.

**What to expect:** Claude Code confirms it read the docs and created the branch. You're now in a safe lane where anything you do won't affect main.

---

## Step 4 — Ask for a plan

Tell Claude Code:

```
Before writing any code, give me a plan: what file(s) you'll modify, what you'll add, and how it'll look. The goal: add a subtitle under the "Trial and Error" heading that says "Learning to build, one chapter at a time." It should be smaller than the main heading, still white, with a subtle muted feel — maybe lighter weight or slightly transparent. Don't write code yet. Wait for my approval.
```

**Why ask for a plan first?** Because changing direction after code is written is harder than changing direction before. The plan is free to throw away. The code isn't.

**What to expect:** Claude Code tells you something like *"I'll modify `src/App.tsx` to add a `<p>` element under the `<h1>`, and update `src/index.css` to style it smaller and more muted. Here's the approximate look..."*

---

## Step 5 — Review the plan

Read it carefully. Ask yourself:
- Does this match what I asked for?
- Are the files listed expected?
- Is anything being changed that I didn't request?

If it looks good:

```
Plan approved. Let's build it.
```

If something's off:

```
One change: [what to adjust]. Show me the revised plan before writing code.
```

**Why review carefully?** Approving a plan is a commitment. Once code is written, undoing it is extra work. Thirty seconds of reading saves thirty minutes of redoing.

---

## Step 6 — Build

Tell Claude Code:

```
Build it. Keep the dev server running so I can see changes live.
```

**What happens:** Claude Code edits the files. If the dev server is running, your browser (or the preview panel) updates automatically within a second or two.

**What to look for:** The subtitle appears on your page. It's smaller than the main heading. It's styled to feel secondary, not primary.

If the dev server wasn't already running, Claude Code will start it and give you a URL. Open `http://localhost:5173` in a browser to see the page.

---

## Step 7 — Iterate

Now the important part: **look at it and decide if it's right.**

If you like it → skip to Step 8.

If it's not quite right, be specific about what to adjust. Don't say "make it better" — that's not actionable. Say things like:

```
The subtitle feels too close to the heading. Add more vertical space between them — maybe 1rem of margin.
```

Or:

```
It's a little too bright — make it about 30% less prominent. Maybe opacity 0.7 or a lighter color.
```

**Why be specific?** Vague requests produce vague results. "Make it better" could mean 40 different things. "Add 1rem margin-top" is one thing, and Claude Code will do exactly that.

Iterate until you're happy.

---

## Step 8 — Open the PR

Tell Claude Code:

```
I'm happy with it. Commit the change with a clear message, push the branch, open a PR, and give me the PR link.
```

**Commit message style:** Short first line describing what the change does, active voice. "Add subtitle under main heading" — not "added a subtitle" and not "subtitle stuff."

**What to expect:** Claude Code runs the commit, pushes the branch to GitHub, opens a PR, and gives you a clickable link.

---

## Step 9 — Review the diff, then merge

This is the step most beginners rush. Don't.

Click the PR link. You'll land on GitHub. Look for the tab called "Files changed" near the top of the page — click it.

You'll see every file that's about to change, with green lines for additions and red lines for deletions.

**For this PR, you should see:**
- `src/App.tsx` — one or two new lines adding the subtitle element
- `src/index.css` — a new style block for the subtitle

**Read every changed line.** Ask yourself:
- Does this match what I approved in Step 5?
- Is anything here that I didn't ask for?
- Does it make sense even if I don't understand every character?

If everything looks right:

```
PR looks good. Merge it into main.
```

**Why this matters:** On day one, reviewing is just "does this match what I approved?" A month from now, you'll be catching real bugs. The habit matters more than the current depth.

---

## Step 10 — Clean up

Tell Claude Code:

```
Switch back to main, pull the latest, and delete the feature branch locally and on GitHub. Confirm the repo is clean and ready for the next feature.
```

**Why clean up?** Old feature branches accumulate like dirty dishes. One is fine. Fifty is chaos. Deleting them as you finish keeps you always able to see what's actually in progress.

**What "clean" means:**
- You're on `main`
- `main` has the new change
- No feature branches exist locally or on GitHub other than `main`
- Working tree is empty

That's a clean slate. Ready for Chapter 3.

---

## What just happened

You shipped a feature. In doing so, you did exactly what a professional developer does every single day:

1. Made a safe lane to work in (branch)
2. Decided what to build before building (plan)
3. Reviewed the plan before approving
4. Built, then looked at the result
5. Iterated until it was right
6. Documented the change (commit + PR)
7. Reviewed the diff before merging
8. Cleaned up after yourself

The feature was small. The pattern is permanent. Every chapter from here on will use this same 10-step rhythm. Soon you won't think about it — you'll just do it.

---

## What success looks like

- Your browser shows "Trial and Error" with the new subtitle underneath
- Your GitHub repo has a merged PR in its history
- You're back on `main`, clean, no leftover branches
- You can explain each step of the 10-step rhythm in your own words
- You understand why small PRs are better than big ones

---

## If something broke

- **"I don't see a subtitle on my page"** — did you save the file? Refresh the browser. If still nothing, tell Claude Code: *"The subtitle isn't appearing on my page. Help me figure out why."*
- **"My PR shows files I didn't expect"** — pause. Don't merge. Ask Claude Code: *"The PR is showing files I didn't approve. Explain why these are in the diff."*
- **"I changed my mind about the subtitle"** — no problem. You're on a branch. Tell Claude Code: *"I want to revert this work and close the PR without merging. Help me do that cleanly."* The branch gets thrown away, main is untouched, you start over if you want.
- **"My dev server stopped"** — tell Claude Code: *"Restart the dev server."*

---

## Tour Moment — The Files Changed tab

This chapter's the first time you're deliberately using the "Files changed" tab on a GitHub PR. A few things worth knowing:

- **File list on the left** — click any filename to jump to that file's diff
- **Green background = added line, red background = removed line**
- **Gray lines** around changes are context so you can see where the change lands
- **"Viewed" checkboxes** next to each file — handy for marking off as you review, especially useful when you have 20+ files in one PR

On a PR this small, you can review the whole thing in 30 seconds. That's the goal — small PRs stay reviewable.

---

## Next up

**Chapter 2.5 — When Things Break.** Before we add more features, we'll deliberately break something and walk through how to recover. This is the chapter nobody else teaches and everybody needs.
