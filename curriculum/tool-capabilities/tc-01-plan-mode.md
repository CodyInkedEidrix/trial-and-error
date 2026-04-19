# TC-01 — Plan Mode & Thorough Planning

*Tool Capability. About 45 minutes. No new app code — this chapter teaches you a way of using Claude Code that will make every future chapter cleaner, faster, and less error-prone. You've been using a basic version of this already. This chapter levels it up.*

---

## What you're learning

1. **Why "plan before code" is non-negotiable** and what good plans actually contain
2. **How to force Claude Code into deeper planning** when the stakes are high
3. **How to read a plan critically** — spotting gaps, ambiguity, and scope creep before any code is written
4. **When to push back and how** — the language patterns that redirect without restarting
5. **The "thorough mode" trigger** — a specific prompt shape that produces noticeably better plans for complex work

By the end, you'll be able to get a professional-quality build plan out of Claude Code for anything from a tiny one-file tweak to a multi-day feature. And you'll know the difference between a plan that's ready to approve and a plan that needs another pass.

---

## Why this is a Tool Capability, not a Main Track chapter

The Main Track teaches you to build a specific app. This track teaches you to *use Claude Code better in general*.

Plan mode is the first Tool Capability because it's the foundation for everything else. Every chapter you do from here on — content, capability, main track, whatever — will go better if your plans are sharper. Every minute spent getting better at plans is a multiplier on every other minute you'll ever spend in Claude Code.

Think of this as sharpening the axe before chopping the wood.

---

## Plain English glossary

- **Plan Mode** — a mode of working where you ask Claude Code to produce a written plan *before* writing any code. You review, approve, then it builds.
- **Thorough Planning** — a deeper version of Plan Mode for complex work. Asks explicitly for edge cases, risks, alternatives, and a file-level breakdown.
- **Scope creep** — when a plan includes things you didn't ask for. Small scope creep = annoying. Big scope creep = mystery files in your PR.
- **Ambiguity** — when a plan uses vague words like "handle errors" or "style appropriately" without specifying what that means. Ambiguity means you'll hate the result.
- **Plan-level review** — reviewing the plan before code is written. Catches issues 10x cheaper than reviewing code after.

---

## The three levels of planning

Not every task needs the same depth of planning. Match the mode to the stakes.

### Level 1 — Quick Plan

For small changes. One or two files. Low risk.

You ask: *"Plan this before writing code."*

Claude Code gives a short response — files touched, what changes, any questions. You approve or redirect. Takes 30 seconds.

**Example:** "Change the subtitle text to say 'Learning in public.'"

### Level 2 — Standard Plan

For most feature work. Multiple files. Some design decisions.

You ask: *"Before writing code, give me a plan covering: files touched, what each change does, any dependencies, and anything you'd flag as unclear. Wait for approval."*

This is what you've been doing on every chapter so far. It's the default mode.

### Level 3 — Thorough Plan

For architectural work. New features touching multiple parts of the app. Things where getting it wrong is expensive.

You ask for a full structured plan covering:
- Every file created, modified, or deleted
- Why each change is needed
- Dependencies (what has to be installed, configured, or in place first)
- Edge cases (what could go wrong)
- Alternatives considered (and why they weren't chosen)
- Assumptions being made (that you should verify)
- A specific "risk note" for anything high-stakes

Takes longer to read, but catches problems no Level 1 or 2 plan would.

**Use Thorough Plan for:** setting up auth, restructuring major components, integrating third-party services, anything that touches production data, architectural decisions that'll be painful to reverse.

---

## What you're doing in this chapter

You'll run three experiments in Claude Code — one at each level — and see the differences in what you get back. You're not building anything new. You're just learning the shape of the tool.

All three experiments happen on a throwaway branch that gets deleted at the end. Nothing ships to main.

---

## Step 1 — Start clean

Tell Claude Code:

```
Starting TC-01 — Plan Mode practice. Rhythm check: confirm I'm on main, clean. I'm going to experiment with planning prompts at different depths. Nothing will be committed or pushed — I'll throw away the branch at the end.
```

---

## Step 2 — Create a throwaway branch

```
Create a branch called experiment/plan-mode-practice. This entire chapter runs on this branch and we'll delete it at the end.
```

---

## Experiment 1 — Quick Plan

The first experiment is a trivial task where a quick plan is all you need.

Tell Claude Code:

```
Quick-plan this: change the subtitle in Header.tsx to say "Where imagination meets implementation." Don't write code — just plan it in one short reply.
```

What you should see back: a two or three line response. "I'll modify src/components/Header.tsx line X to change the text from Y to Z. Nothing else touched. Waiting for approval."

**Read it.** Not because it could be wrong — because you're practicing the muscle of reviewing plans before code.

Then tell Claude Code:

```
Good — but don't actually build it. I'm in practice mode. Move on to Experiment 2.
```

---

## Experiment 2 — Standard Plan

The second experiment is a normal feature ask. Write the prompt the way you'd write a real feature prompt.

Tell Claude Code:

```
Plan this as a standard feature build. I want to add a visible "Plan Mode reminder" card to the Lab tab — a small card that says "Always ask for a plan before code" in muted ember text, positioned above the Typography Lab. Before writing code, give me a plan covering:

- Files you'll create or modify
- Where the card goes in the component hierarchy
- How it'll be styled using existing tokens
- Anything you'd flag as unclear about the ask
- Anything you'd do differently than what I asked for

Don't write code yet. I'm in practice mode — I won't approve, I just want to read the plan.
```

When the plan comes back, **read it carefully.** Notice:

- How much more detail is there than Experiment 1?
- Did Claude Code flag any ambiguities you didn't think about?
- Did it push back on anything? (Good plans sometimes push back.)
- Are there any surprise files or changes?

This is the shape of a plan you should be seeing on most feature work.

Tell Claude Code:

```
Good plan. Don't build it — still in practice mode. Move to Experiment 3.
```

---

## Experiment 3 — Thorough Plan

Now the payoff. Here's a prompt that forces depth.

Tell Claude Code:

```
Thorough-plan this. Imagine I'm about to ask you to add real Supabase auth to the app — email/password login, session persistence, logout, protected routes. Don't write any code. Give me a THOROUGH plan with the following structure:

1. **Overview** — one paragraph describing what you'd build
2. **Files created, modified, and deleted** — a complete list, not "and related files"
3. **Dependencies** — what has to be installed, what env vars are needed, what accounts/services need to be set up outside the code
4. **Sequence of operations** — numbered steps in order
5. **Edge cases** — at least 5 things that could go wrong or break
6. **Alternatives considered** — at least 2 other ways this could be done and why you'd reject them
7. **Assumptions** — things you're assuming that I should verify before approving
8. **Risk notes** — anything you'd flag as particularly error-prone or expensive to reverse
9. **Open questions** — things you genuinely don't know and need me to answer before you could build this

Don't write any code. I'm in practice mode — I just want to see what a full thorough plan looks like.
```

When this comes back, it'll be significantly longer than Experiment 2. Might be hundreds of lines.

**Read the whole thing.** Pay special attention to:

- **Edge cases you wouldn't have thought of.** Session expiration. Race conditions on signup. What happens if the user closes the tab during auth. Good plans surface these.
- **Alternatives considered.** A Level 3 plan proposes multiple ways to build the thing and explains the choice. Sometimes the rejected alternative is actually what you want.
- **Assumptions.** Things Claude Code *assumed* you wanted. If any feel wrong, that's a redirect opportunity.
- **Open questions.** If the plan ends with genuine questions Claude Code can't answer without you, that means it's doing the work of thinking critically, not just pattern-matching to a template.

**The meta-learning:** A Level 3 plan exposes decisions you didn't realize were decisions. That's the whole point. It forces *you* to think through things before a single line of code exists.

---

## Step 6 — Throw it all away

Tell Claude Code:

```
Great session. This was all practice — nothing to ship. Switch me back to main, delete the experiment/plan-mode-practice branch locally and on GitHub, working tree clean. Then mark TC-01 complete in curriculum/PROGRESS.md on a tiny branch called tc-01-complete, ship a single-commit PR just for the checkoff, and merge it.
```

That's an intentionally weird-looking cleanup. The reason: the *experimentation* doesn't get committed, but the *completion* does. We mark TC-01 done via a clean one-commit PR so PROGRESS.md reflects reality.

---

## When to use each level in the wild

Now that you've felt the three levels, here's the rule of thumb going forward:

- **Quick Plan** — any change that touches one or two files with no real design decisions. Copy tweaks, color swaps, text edits, small bug fixes.
- **Standard Plan** — any new feature, any component that didn't exist before, any time you're not 100% sure what files will be touched.
- **Thorough Plan** — auth, payments, database schemas, real integrations, anything with external services, anything that moves user data around, any architectural refactor.

If you're ever unsure which level to ask for, **ask for one level up from your instinct.** The cost of a slightly-longer plan is seconds. The cost of a not-deep-enough plan is a PR full of surprises.

---

## The power move: "What am I missing?"

Here's a prompt pattern that genuinely makes Claude Code smarter. Try it on your next real feature:

```
[Your feature description]

Before planning, answer this first: **what am I missing?** What edge cases, constraints, or side effects am I probably not thinking about? Then give me the plan with those accounted for.
```

That "what am I missing?" line inverts the usual dynamic. Normally, you describe a feature and Claude Code builds the plan from what you said. That prompt makes Claude Code *first* think about what you *didn't* say.

You'll be surprised how often this catches real issues.

---

## What success looks like

- You've seen the three levels of plans side-by-side and felt the difference in depth
- You understand which level to reach for based on task complexity
- You know the "what am I missing?" pattern for extra-rigorous planning
- TC-01 is checked off in PROGRESS.md
- No lingering experimental branches

---

## If something broke

- **"Claude Code wrote code anyway when I said don't"** — Tell it: *"Stop. Don't build anything. We're in practice mode. Throw away any uncommitted changes and just give me the plan."* Then `git restore` anything it touched.
- **"My plan came back too short / too generic"** — Ask for it again with more constraints: *"That plan was too thin. Give me a thorough plan with specific files, edge cases, and assumptions called out."*
- **"I lost track of which experiment I'm on"** — No problem. Tell Claude Code which experiment number you want next, or restart the chapter from Step 1. Nothing is at stake.
- **"The experiment branch never got pushed, so I can't 'delete on GitHub' in Step 6"** — That's expected. The experiments stayed local. Just delete the branch locally; the "delete on GitHub" instruction is a safety net for cases where a student accidentally pushed.
- **"I accidentally let it commit something to the experiment branch"** — Fine. The branch gets thrown away anyway. `git reset --hard` to wipe local commits, or just delete the branch.

---

## The broader principle

Most people using Claude Code treat it like autocomplete: "write me X," wait, review result. That works for small tasks. It falls apart for complex ones because by the time you're reviewing code, Claude Code has already committed to an architecture you might not want.

Plan Mode inverts that. You review the *thinking* before the *typing*. It's the single most important habit that separates casual Claude Code users from power users.

Every professional you've ever seen operate Claude Code fluently is doing some version of this. Most of them don't even realize they're doing it — they just know that asking for plans first "feels better." Now you know why.

Use this on every future chapter. Use it on every real project. Use it forever.

---

## Tour Moment — The "wait for approval" pattern

You've seen Claude Code stop and wait for your approval constantly. That pattern — propose, wait, approve, execute — is the bedrock of plan-first development. It feels slow at first. It gets fast with practice.

The slowness is doing real work. You're catching problems cheaply instead of expensively.

Any time you find yourself rushing through an approval without reading the plan, pause. If the plan isn't worth reading, the code won't be worth reviewing. Either slow down and read, or ask for a simpler plan. Don't half-ass the review step. That's where the whole system earns its keep.

---

## Next up

Whichever Main Track chapter is currently unchecked. Per the design doc, that's **Chapter 7 — Reading Code**. But you can also jump to any other capability chapter that's currently unlocked. Your call.
