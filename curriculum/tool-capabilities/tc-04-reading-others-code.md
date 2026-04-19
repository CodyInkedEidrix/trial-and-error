# TC-04 — Reading Other People's Code

*Tool Capability. About 60 minutes. You'll clone an open-source repo you've never seen, build a mental map of how it works, and locate where a hypothetical feature would go — all without changing any code. By the end, you'll have a repeatable method for opening any unfamiliar codebase.*

---

## What you're learning

1. **The 5-question scan** — the questions senior engineers ask in the first 3 minutes of opening a new codebase
2. **How to locate the entry point and trace outward** — not read top-to-bottom
3. **How to use Claude Code as a codebase tour guide** — asking the right questions, not the obvious ones
4. **How to find "where does X live"** — the most common question you'll ever ask of an unfamiliar codebase
5. **How to know when you've read enough** — the hardest skill of all

By the end, you'll have a method you can apply to your own 20+ Eidrix versions, your brother's code, or any open-source project you want to learn from.

---

## Why this is different from Chapter 7

Chapter 7 taught you to read YOUR code. Everything was familiar — you wrote it, you remember the decisions, the naming matches your mental model.

Other people's code is different. The naming is theirs, not yours. The architecture choices might be unfamiliar. The patterns might be ones you've never seen. You're a tourist, not a resident.

This chapter gives you the tourist's playbook.

---

## Plain English glossary

- **Entry point** — the file where an app boots up. For web apps, usually `main.tsx`, `index.tsx`, or `src/index.ts`.
- **README** — the main documentation file in a repo's root. Usually tells you what the project is and how to run it. Sometimes useful, sometimes outdated, always worth skimming first.
- **package.json** — for Node/React/Vite projects, this file tells you what libraries the project uses, what scripts it has, and what it's named. Critical early-read.
- **Folder structure** — how code is organized into directories. Tells you a lot about the mental model of whoever built it.
- **Convention** — the unwritten rules of a codebase. Where components go, how files are named, how state is managed. Conventions vary by project.
- **Architecture** — the high-level shape. "This is a React SPA with a Supabase backend" is architecture. "Records are fetched in a useEffect" is implementation.

---

## The 5-question scan

Before reading any logic, a senior engineer answers these five questions about any new codebase. Takes about 3 minutes.

1. **What is this project?** (Read the README and package.json's description field)
2. **What tech stack does it use?** (Read package.json's dependencies)
3. **Where does it start?** (Find the entry point)
4. **How is the code organized?** (Scan the folder structure)
5. **What's the convention?** (Pick one component or module and see how it's named/placed)

After those five, you have a rough mental map. Now you can read individual files with context. Skip the scan and every file feels disconnected from every other file.

---

## What you're doing in this chapter

You're going to clone a well-known open-source React project — something small enough to feel approachable, big enough to feel real. Then you'll run the 5-question scan, answer a few "where does X live" questions, and wrap up without changing a line of code.

The specific repo we'll use: **`vercel/next.js` examples — the `blog-starter` example.** Small, well-organized, real production code, no weird exotic patterns. Uses the modern App Router (`src/app/`), Tailwind, and TypeScript.

The repo lives at: `github.com/vercel/next.js/tree/canary/examples/blog-starter`

For this chapter you'll only clone a small piece — the example folder — not the entire Next.js monorepo. Keeps things tight.

**Heads-up:** the Next.js team rotates their examples folder pretty often. If `blog-starter` doesn't exist anymore by the time you read this, browse `github.com/vercel/next.js/tree/canary/examples/` and pick any small Tailwind-using example. The 5-question scan works on any Next.js codebase — the lesson isn't the specific repo.

---

## Step 1 — Start clean

No branch on the Trial and Error repo. You'll be working in a completely separate throwaway directory.

Tell Claude Code:

```
Starting TC-04 — Reading Other People's Code. Rhythm check: confirm my Trial and Error repo is on main, clean. For this chapter I'll be working in a separate scratch directory, not touching Trial and Error at all. Confirm that approach makes sense.
```

---

## Step 2 — Set up a scratch directory

```
Create a scratch directory on my machine called `~/scratch/code-reading-practice` (or the Windows equivalent). This is throwaway — we'll delete it at the end. It's just a place to clone someone else's repo and poke around.
```

Claude Code will either create it or confirm it exists. Either is fine.

---

## Step 3 — Clone the practice repo

```
Inside the scratch directory, do a shallow clone of just the blog-starter Next.js example. The easiest way is to clone the whole next.js repo shallow (depth 1) and then navigate to the examples/blog-starter folder — we don't need the rest.

Actually, faster approach: use git sparse-checkout to grab ONLY the examples/blog-starter folder. Set that up. If sparse-checkout is finicky, fall back to the full shallow clone and just cd into the examples folder.

Once done, confirm we have a working copy of the example and show me the folder structure.
```

When this finishes, you should see a folder containing a small Next.js + Tailwind example — a few files, nothing massive.

---

## Step 4 — Run the 5-question scan

This is the core of the chapter. Ask Claude Code to answer the five questions for you.

```
We just cloned the `blog-starter` Next.js example. Don't read any code yet — walk through the 5-question scan for this codebase:

1. **What is this project?** Read the README (if any) and package.json's description/name. Tell me what this project IS in one sentence.
2. **What tech stack does it use?** Read package.json's dependencies and devDependencies. Give me the top 5 most important ones and what each does.
3. **Where does it start?** Find the entry point — for modern Next.js (App Router) this is `app/layout.tsx`, sometimes wrapped under `src/app/layout.tsx`. Tell me where this project's entry point lives and why it matters.
4. **How is the code organized?** Describe the folder structure at a high level — where pages live (`app/` or `src/app/`), where components live, where public assets and styles live.
5. **What's the convention?** Pick ONE component file and describe: what's it named, where does it live, how is it styled, what does it export?

Keep each answer under 3 sentences. I want the mental-map version, not the deep dive.
```

Read the response. This is your whole mental map of the project in about 15 lines.

**Notice:** you now know more about this codebase than you did 5 minutes ago, and you haven't read a single line of actual component code yet. That's the scan working.

---

## Step 5 — Ask a "where does X live" question

The most common question you'll ever ask of an unfamiliar codebase is "where does X live?" — where do I find the authentication logic, where's the header component, where does routing happen, etc.

Pick a specific thing in the example and ask:

```
If I wanted to change the page that loads when someone first visits this site, which file would I edit? Walk me through how you'd find that answer.
```

The *walk me through how you'd find that answer* is important. You're not just asking for the answer — you're asking Claude Code to show you its navigation process. That's the skill.

Then try another one:

```
If I wanted to change the global styles — like the font used across the whole app — where would that live?
```

Notice how fast these answers come once the mental map is in place. Without the scan, you'd be reading random files trying to stumble onto it.

---

## Step 6 — The "compare and contrast" move

Now the expert move. Ask Claude Code to compare this codebase's approach to yours:

```
Compare the folder structure and conventions of this Next.js example to my Trial and Error repo.

- What's similar?
- What's different?
- What conventions from this example might be worth borrowing if I were starting a bigger project?

Don't recommend changes to my current project — I'm not refactoring. I just want to understand the design choices.
```

This is the move that teaches you *taste*. Seeing two different projects handle the same problems differently builds your intuition for what's possible. Without that comparison, you only know your own way.

Read the response carefully. If you notice something you like, mentally note it for when you eventually restructure real Eidrix.

---

## Step 7 — Test yourself

Before wrapping, do a "fog of war" test.

Without asking Claude Code, try to answer these in your head:

- What's this project's entry point?
- Where do components live?
- Where do styles live?
- Where would I add a new page?
- If I wanted to add a new dependency, which file tells me the current versions?

If you can answer 4 out of 5 without looking — you've built a working mental map of a codebase you'd never seen an hour ago. That's the whole win.

If you're stuck on 3+, go back to Step 4 and have Claude Code re-explain whatever's fuzzy. No shame in second passes.

---

## Step 8 — Clean up

```
TC-04 practice complete. Delete the `~/scratch/code-reading-practice` directory entirely. We don't need it anymore. Confirm when clean.

Then switch to the Trial and Error repo and mark TC-04 complete in curriculum/PROGRESS.md on a tiny branch called `tc-04-complete`, ship a single-commit PR for the checkoff, merge it, and clean up.
```

---

## The broader principle

Reading code is triage, not full comprehension.

When you open an unfamiliar codebase, your job isn't to understand every line. It's to build a map fast enough that you can find what you need and ignore what you don't. The 5-question scan is designed to give you that map in 3 minutes.

Most people skip the scan because it feels like "not real work." Then they spend 2 hours reading random files, get overwhelmed, and close the project without having shipped anything. The scan prevents that death spiral.

Every time you open a new repo from here out, do the scan first. It'll feel slow for the first five projects. By the tenth, it'll be automatic.

---

## When you go back to real Eidrix

Your 20+ Eidrix versions are the perfect testing ground for this skill. Each one is a codebase you've been away from long enough to feel unfamiliar again. Try this:

1. Pick one of the older Eidrix versions
2. Open it in Claude Code
3. Run the 5-question scan before touching anything
4. Notice what you remember vs. what surprises you
5. Only THEN decide what you want to change

You'll make better restructuring decisions because you'll have the full mental map in hand instead of fragments. That's the real payoff of this chapter.

---

## What success looks like

- You cloned a real open-source codebase
- You ran the 5-question scan without Claude Code explaining it to you line-by-line
- You can answer "where does X live" for at least 3 different things in the example project
- You compared its conventions to Trial and Error and noticed at least 2 differences
- Scratch directory is deleted, no junk left on your machine
- TC-04 is checked off in PROGRESS.md

---

## If something broke

- **"Git sparse-checkout didn't work"** — Fall back to shallow clone of the full repo: `git clone --depth 1 https://github.com/vercel/next.js` then cd into `examples/blog-starter`. Delete the rest if it bugs you.
- **"The example repo looks different from what the chapter describes"** — Next.js examples update over time. The concepts are still valid. Tell Claude Code: *"The specific files in this example have changed since the chapter was written. Adapt the 5-question scan to what's actually here."*
- **"`blog-starter` doesn't exist in the examples folder anymore"** — The Next.js team rotates examples. Browse `github.com/vercel/next.js/tree/canary/examples/`, pick any small Tailwind-using example, and run the 5-question scan on that instead. The repo is just a vehicle — the lesson is the scan.
- **"I'm overwhelmed by how different Next.js is from my Trial and Error setup"** — That's normal. Next.js uses different conventions than Vite. Tell Claude Code: *"Explain the big conceptual differences between this Next.js example and my Vite/React setup, in plain English."*
- **"I can't tell if my mental map is right"** — Test it. Pick a random task like "add a new page called /about" and ask Claude Code to describe how you'd do it. If your guess matches Claude Code's approach, your map is solid.

---

## Tour Moment — The scratch-directory habit

You just used a scratch directory for this chapter. That pattern — "I need to poke at something, let me do it in a throwaway folder" — is one you should adopt permanently.

Any time you want to:
- Try out a new library
- Clone someone's repo to learn from it
- Experiment with a pattern you're not sure about
- Practice a skill

...do it in a scratch directory. Not inside a real project. Scratch directories are disposable. Real projects are precious. Mixing them up is how you accidentally commit experimental garbage into something that matters.

My recommendation: make a folder called `~/scratch/` on your machine and use it aggressively. Delete contents whenever it gets crowded. Nothing in it should ever matter.

---

## Tour Moment — The "where would this live?" question

You just practiced asking "where does X live?" as a navigation skill. Here's the expert extension: before you look at a codebase, guess where X *would* live if you were building it.

- "If this app has auth, I'd expect it in `src/auth/` or `src/lib/auth.ts`"
- "If there's a database schema, probably `prisma/schema.prisma` or `db/schema.ts`"
- "Styles probably in `styles/`, `src/styles/`, or inline Tailwind"

Then look. If your guess matches, the codebase follows conventions — you can trust your instincts. If it doesn't match, something's unusual and worth understanding before touching.

This is how senior engineers navigate unfamiliar codebases faster than the people who wrote them — they're using conventions as shortcuts.

---

## Next up

**Chapter 8 — Components Lab.** Back to the main track, back to build mode. You'll create your third Lab section inside the Lab tab — this one showcasing reusable UI components (buttons, cards, inputs) in their various states. It's the foundation chapter for all future feature work, because every feature you build from here on will use these components
