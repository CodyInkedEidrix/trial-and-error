# Chapter 1 — Hello World

*Your first real build. By the end of this chapter you'll have a black page with "Trial and Error" written on it, running on your computer. It's not impressive visually — that's the whole point. Every cool thing in later chapters will build on this foundation. Total time: about 20 minutes.*

---

## What you're learning

1. How to turn an empty folder into a real web project
2. How to start a "dev server" (the thing that lets you see your app in a browser)
3. The rhythm of asking Claude Code to do something and watching it happen
4. How to do your first commit — your first "save point"

---

## What you're building

A single web page. Black background. The words "Trial and Error" in white in the middle. That's it.

Why so simple? Because we need to prove the whole pipeline works before adding anything to it. If this works, everything else in the curriculum will work.

---

## What files matter

You're about to create these. They'll make more sense once you see them, but here's the preview:

- `package.json` — a list of ingredients the project uses (libraries, tools)
- `vite.config.ts` — configuration for the tool that builds and serves the app
- `index.html` — the actual web page that browsers load
- `src/main.tsx` — the entry point where the app starts
- `src/App.tsx` — the main component (where "Trial and Error" text lives)

Don't worry about understanding these yet. You'll see them across every future chapter and they'll become familiar.

---

## Plain English glossary

- **Vite** — a tool that takes your code, compiles it, and serves it at a local web address so you can see it in a browser. Kind of like Live Server if you've used that before.
- **React** — a library for building user interfaces. Instead of writing raw HTML, you write small reusable pieces called "components."
- **TypeScript** — JavaScript with type-checking. It catches mistakes before they become bugs.
- **Component** — a reusable piece of UI. A button is a component. A navigation bar is a component. You build apps by assembling components.
- **Dev server** — a local web server running on your computer that shows you your app while you build. Default address is usually `http://localhost:5173`.

---

## Step 1 — Start a new Claude Code session (optional but recommended)

If you're continuing from Chapter 0, you can stay in the same session. But if it's been a while, start a fresh one — Claude Code works better with clean context.

---

## Step 2 — Ask Claude Code to scaffold the project

"Scaffold" means "set up the basic structure." Paste this prompt:

```
I'm starting Chapter 1 of the Trial and Error curriculum. We're going to create a minimal Vite + React + TypeScript project. Here's what I need you to do:

1. Before anything, confirm we're on the `main` branch with a clean working tree.
2. Create a new branch called `feature/chapter-1-hello-world`.
3. Scaffold a fresh Vite + React + TypeScript project in the current folder (not in a subfolder — we want package.json and src/ at the repo root).
4. Give me a plan first: list every file you'll create, any dependencies you'll install, and what the final folder structure will look like. Do NOT write any code yet. Wait for my approval.
```

**What to expect:** Claude Code will probably run a couple of commands to check what's in the folder, then come back with a numbered list of files it plans to create and dependencies it plans to install.

---

## Step 3 — Review Claude Code's plan

This is a habit we're building early: **read the plan before approving it.**

What you're looking for:
- Does the plan mention `package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`? Good.
- Does it mention installing `react`, `react-dom`, `vite`, `typescript`, and a few related packages? Good.
- Is it trying to do anything weird like "set up a database" or "configure authentication"? Bad. Say no.

If the plan looks reasonable, approve it:

```
Plan approved. Proceed.
```

If something looks off:

```
A few changes: [WHAT TO CHANGE]. Show me the revised plan before writing code.
```

---

## Step 4 — Let Claude Code build

After approval, Claude Code will:
- Install the dependencies (this takes a minute or two — you'll see npm running in the background)
- Create all the files
- Report back when done

**Success looks like:** Claude Code tells you the scaffold is complete and asks if you want to start the dev server.

---

## Step 5 — Make the page say "Trial and Error"

The scaffold creates a default Vite welcome page. We want to replace it.

Paste this prompt:

```
Now modify src/App.tsx so the page shows:
- A completely black background (fill the whole viewport)
- The text "Trial and Error" centered horizontally and vertically
- The text should be white, large, in whatever default font is available

Keep it minimal. No fancy styling, no extra elements. Just black background, centered text. Don't start the dev server yet.
```

Claude Code edits the file. Once done, you're ready to see it.

---

## Step 6 — Start the dev server and look at your app

Paste this:

```
Start the dev server. Once it's running, give me the URL to open in my browser.
```

Claude Code runs the dev server in the background and tells you the address (usually `http://localhost:5173`).

1. Open that URL in any browser.
2. You should see: **a black page with "Trial and Error" centered on it.**

If you do — congratulations, you have a working web app.

---

## Step 7 — Your first commit, PR, and merge

You've built something worth saving. Now you'll do your first complete git cycle.

Paste this:

```
I'm happy with it. Commit the changes with a clear message, push the branch to GitHub, and open a Pull Request. Give me the PR link when done.
```

Claude Code commits, pushes, opens the PR, and gives you a link.

**Look at the PR on GitHub.** Click the link. Scroll down to "Files changed." You'll see a list of every file Claude Code created and every line it added. This is a diff — a visual of exactly what's about to be merged into `main`.

Scan it. Don't panic if you don't understand all of it. You're just building the *muscle* of looking at diffs before merging.

When you're ready:

```
PR looks good. Merge it into main.
```

Then:

```
Switch back to main, pull the latest, and delete the feature branch locally and on the remote. Confirm we're clean.
```

---

## What success looks like

At the end of this chapter you have:
- A browser tab showing a black page with "Trial and Error" on it
- A GitHub repo with one merged PR in its history
- A local copy of the project on `main`, up to date, with no open branches
- Your first completed git cycle (branch → build → PR → merge → cleanup)

That's the full rhythm you'll use for every single chapter from here on.

---

## What just happened (in plain English)

You just did a professional developer's daily workflow, compressed into one chapter:

1. **Made a safe lane to work in** (the branch)
2. **Built something** (the scaffold + the text change)
3. **Looked at your work** (the dev server, the PR diff)
4. **Saved it permanently** (the merge into main)
5. **Cleaned up** (deleted the branch)

This is the loop. Everything in every future chapter is a variation of this loop. Get comfortable with it.

---

## If something broke

- **"Port 5173 is already in use"** — another dev server is running somewhere. Tell Claude Code: *"Kill any existing dev servers and try again."*
- **"npm install failed"** — usually means Node.js isn't installed or is too old. Tell Claude Code: *"I got an npm error. Help me check my Node version and install/update if needed."*
- **"The page is blank"** — open your browser's developer tools (right-click → Inspect → Console tab) and copy any red error messages. Paste them into Claude Code and ask for help.
- **"The PR won't merge"** — usually a merge conflict (very unlikely on your first PR). Tell Claude Code what GitHub is showing you.

Fifteen-minute rule: if you're stuck for more than fifteen minutes, ask for help. You're not failing — every developer gets stuck. The skill isn't "never get stuck," it's "know when to ask."

---

## Next up

**Chapter 2 — Git Rhythm.** We'll do another tiny PR on purpose, walking through every step slowly, so the branch/PR/merge cycle becomes second nature before we add more complexity.
