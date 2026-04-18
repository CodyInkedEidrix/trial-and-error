# Chapter 2.5 — When Things Break

*Every developer breaks things. The difference between someone who quits and someone who keeps going isn't that they never break things — it's that they know how to recover. This chapter is all about recovery. You'll deliberately break your app, then practice four different ways to get back to a working state. By the end you'll be bulletproof. Total time: about 45 minutes.*

---

## What you're learning

1. **Breaking things is normal.** Every professional developer breaks their app multiple times a day.
2. **Recovery is a skill, not a talent.** A few specific moves work for 90% of situations.
3. **The "undo" button for code** — how to throw away changes you don't want
4. **The "emergency brake"** — how to get back to the last known-working state fast
5. **When to ask for help** — and how to describe a problem clearly

By the end of this chapter you'll have broken your app on purpose at least three times and recovered from each. You'll stop fearing the Do Something Wrong button — because you'll know where the Undo Something Wrong button is.

---

## What you're building

You're not building a feature. You're building **confidence.**

We'll make a few reversible "mistakes" on purpose and practice getting back to a clean state. At the end, your app will look exactly like it did at the start of the chapter. The experience is the deliverable.

---

## Plain English glossary for this chapter

- **Revert** — undo a change. Different kinds of revert for different situations (we'll go through them).
- **Working tree** — the current state of your files on your computer. "Clean working tree" = no unsaved changes. "Dirty working tree" = you have uncommitted changes sitting around.
- **Stash** — a temporary storage drawer for changes you've made but don't want to commit yet. Think "put this aside for later."
- **Hard reset** — the nuclear option. Throws away all your uncommitted work and forces your local branch to match a specific earlier state. Powerful and permanent.
- **Rollback** — reverting an already-merged change. Creates a new commit that undoes an old one, rather than erasing history.

---

## Why this chapter exists

Most tutorials assume everything goes right. Real development doesn't work that way. You will:
- Accidentally delete something you wanted to keep
- Make a change and immediately regret it
- Get confused halfway through a feature and want to start over
- Merge something broken and need to take it back
- Hit a weird error and not know what caused it

All of these feel like disasters on day one. By the end of this chapter, they'll feel like Tuesday.

The superpower you're building: **every mistake is reversible if you catch it before you push, and recoverable even after.** Once you internalize that, you'll experiment fearlessly.

---

## The four recovery moves

We're going to practice these in order, from "easiest / smallest mistake" to "biggest / nuclear option."

1. **Undo an unsaved change** (working tree is dirty, you haven't committed yet)
2. **Undo a commit you haven't pushed yet** (you've committed but nothing's on GitHub)
3. **Abandon an entire branch** (you want to throw the whole experiment away)
4. **Roll back something already merged to main** (the real-world oops)

You'll do each one. On purpose.

---

## Setup — one clean slate

Before we start breaking things, confirm you're in good shape.

Tell Claude Code:

```
Starting Chapter 2.5 — When Things Break. Rhythm check: confirm I'm on main, up to date, working tree clean. I'm about to deliberately make some reversible mistakes to practice recovery, so I want to start from a known-good state.
```

Claude Code confirms you're clean. If anything's off, clean up first.

---

## Practice 1 — Undo an unsaved change

**The situation:** You start making changes, realize they're wrong, and want to throw them away before committing.

**Set it up:** Tell Claude Code:

```
Create a new branch called practice/recovery-drills. We're going to use this branch for the rest of the chapter — we'll throw it away at the end.

Then on this branch, deliberately make a "bad" change to src/App.tsx: change the subtitle text to something obviously wrong like "THIS IS BROKEN DO NOT SHIP." Don't commit. I want to see a dirty working tree.
```

Now look at your browser — it should show the broken text. Your working tree is dirty.

**Recover it:** Tell Claude Code:

```
Throw away the unsaved change. I want src/App.tsx back to exactly what's in main, working tree clean.
```

Claude Code discards the change. Refresh your browser. The subtitle is back to normal. No commit was made, nothing to undo — the mistake is gone as if it never happened.

**Why this matters:** This is the most common kind of "mistake." You started down a path, didn't like it, walked away. Zero consequences. Do this freely whenever you want to abandon in-progress work.

---

## Practice 2 — Undo a commit you haven't pushed yet

**The situation:** You made a change, committed it, then realized it was wrong. You haven't pushed to GitHub yet. This is still easily reversible.

**Set it up:** Tell Claude Code:

```
Now make a different bad change: remove the subtitle line entirely from src/App.tsx. Commit it with the message "Break the subtitle" but DO NOT push to GitHub. I want to see a local commit that hasn't been shared.
```

Your app now has no subtitle. Your local branch has one extra commit. Nothing has hit GitHub.

**Recover it:** Tell Claude Code:

```
I changed my mind about that commit — undo it. Get me back to the state before that commit, working tree clean, with src/App.tsx restored.
```

Claude Code uses something called a "hard reset" to rewind the branch by one commit. The commit is gone. The file is restored. The page has the subtitle again.

**Why this matters:** If you haven't pushed, you can always undo. GitHub doesn't know what you did locally, so there's no trace. This gives you total freedom to experiment — commit early, commit often, and undo freely if you change direction.

---

## Practice 3 — Abandon an entire branch

**The situation:** You've been working on a branch for a while. Multiple commits. You've decided the whole approach was wrong and you want to throw the entire experiment away.

**Set it up:** Tell Claude Code:

```
Now do a bigger mess. Make three separate changes with three commits on this branch:
1. Change the main heading from "Trial and Error" to "Nope".
2. Change the background from black to pink.
3. Delete the subtitle entirely.

Commit each change separately with a matching message. Don't push. I want a branch with three bad commits on it.
```

Your app now looks nothing like it used to. Your branch has three local commits ahead of main.

**Recover it:** Tell Claude Code:

```
Actually, let's pretend I hate everything I just did. I want to abandon this entire branch. Switch me back to main, working tree clean, and delete the practice/recovery-drills branch. I don't care about any of the commits on it.
```

Claude Code switches you back to main and deletes the branch. All three commits are gone. Your app is back to its clean state. Zero evidence the experiment ever happened.

**Why this matters:** This is the magic of branches. You can go completely off the rails on a branch, and as long as you haven't merged, you can throw the entire thing away in one move. Main is untouched. Your public history is untouched. It's like the experiment never happened.

**Take a second to appreciate this.** This is the reason branches exist. You just committed three pieces of broken code and made them vanish in seconds. On a system without branches, fixing this would mean manually undoing each change. With branches, it's one command.

---

## Practice 4 — Roll back something already merged to main

**The situation:** The scariest one. You already merged a change to main, then realized it was bad. How do you undo something that's "official"?

**Set it up:** We'll build a tiny thing, merge it, then roll it back.

Tell Claude Code:

```
Create a new branch called practice/rollback-drill. Add a line to src/App.tsx: a <p> tag right below the subtitle that says "This message will be rolled back." Commit, push, open a PR, and merge it into main. Walk me through each step.
```

Refresh your browser. You should see the new line. Check GitHub — the PR is merged. This is now "in production" (if you had production).

**Now, the rollback.** Tell Claude Code:

```
Turns out that line was a mistake. Roll it back. Explain the difference between "rolling back" a merged change vs the hard-reset we did in Practice 2.

Create a new branch called revert/remove-rollback-line that undoes the previous PR's changes. Commit, push, open a PR, and merge it. The history should show: original change, then a clear "revert" commit that undoes it.
```

Claude Code creates a revert commit. It explains: unlike a hard reset (which *erases* history), a revert *adds a new commit that undoes* a previous one. Main's history now shows both commits — "added the line" and "removed the line" — preserving the record of what happened.

After the revert PR merges, refresh your browser. The line is gone. Main is clean.

**Why this matters:** In a real project, especially one with other people, you never erase merged history. Instead, you add new commits that reverse old ones. This keeps the record honest — anyone looking at your project's history can see what happened and why. Reverts are how professional teams handle "oops we shipped a bug."

---

## Practice 5 — Describing a problem clearly (bonus)

When something breaks and you don't know why, how you describe the problem determines how fast you can fix it.

**Bad problem description:**
> "It's broken"

**Better:**
> "The page is blank when I refresh."

**Best:**
> "After I made changes to src/App.tsx and saved, the page shows a blank white screen. The browser console shows a red error: 'Uncaught ReferenceError: subtitle is not defined.' The last thing I changed was the subtitle styling in index.css. I'm on branch feature/style-subtitle, uncommitted changes."

The more specific you are, the faster Claude Code (or anyone else) can help.

**A good problem description includes:**
1. What you expected to happen
2. What actually happened
3. Exact error messages (copy-paste, don't paraphrase)
4. What you changed most recently
5. Branch and state

**Try it:** Tell Claude Code:

```
Deliberately break my app: delete the closing </div> tag from src/App.tsx so the JSX is invalid. Don't commit. I want the dev server to show an error.
```

Look at your browser. It probably shows an error overlay. Read it. Practice describing the problem out loud (or type it to Claude Code) using the 5-point format.

Then:

```
Okay, now fix it and restore my working tree to clean.
```

**Why this matters:** The biggest difference between beginners and experienced developers isn't knowledge — it's how they handle the unknown. Experienced devs describe problems clearly, which makes them solvable. Beginners say "it's broken" and feel lost. You're now the first kind.

---

## What just happened

You deliberately broke your app five different ways and recovered from all of them. Let me map that to real situations:

- **Practice 1** = "I changed my mind mid-feature" → throw away unsaved changes
- **Practice 2** = "I committed too fast and regret it" → rewind before pushing
- **Practice 3** = "This whole approach was wrong" → nuke the branch
- **Practice 4** = "The thing I shipped yesterday is broken in production" → revert commit
- **Practice 5** = "Something weird is happening and I don't know what" → describe precisely, then fix

These five situations cover most real-world "oh no" moments. You've now done all of them on purpose, with nothing at stake.

---

## The mindset shift

Before this chapter: *"I have to be careful because I might break something."*

After this chapter: *"I can try anything because I know how to undo it."*

That shift changes how fast you can learn everything else. Fear slows you down. Confidence speeds you up.

Some rules to internalize:

1. **Branches are free.** Make one for every experiment. Throw it away if you don't like it.
2. **Commit often on branches.** Commits are cheap. Small commits are easier to undo than large ones.
3. **Push only when you're ready for others to see it.** Until you push, it's all reversible on your machine alone.
4. **Main is sacred.** Don't commit directly to main. Always go through a branch + PR.
5. **When in doubt, commit before trying something risky.** A committed state is a save point. You can always rewind to it.

---

## What success looks like

- You deliberately broke your app and recovered at least three different ways
- Your app is back to exactly where it was at the start of this chapter
- You understand the difference between a hard reset (erases) and a revert (adds an undo commit)
- You can describe a problem clearly using the 5-point format
- You feel less afraid of breaking things

That last point is the real win. Check it off in `curriculum/PROGRESS.md`.

---

## If something broke for real

Given the whole chapter is about breaking things, you might hit a genuine snag that Claude Code doesn't untangle cleanly. If that happens:

- **Don't panic.** Remember: your code on GitHub is safe. Worst case, you delete the whole local folder and re-clone from GitHub, and you're back.
- **Tell Claude Code:** *"I'm lost. Current state is [describe what you see]. Help me get back to a clean main with all my recent merged work intact."*
- **Last resort:** Delete the local project folder. In Claude Code, run the clone-from-GitHub flow from Chapter 0. You'll be back in minutes, with all merged work intact.

You genuinely cannot lose work you've pushed to GitHub. That's the whole point of pushing. Internalize that.

---

## Tour Moment — The dev server error overlay

When you intentionally broke the closing tag in Practice 5, you probably saw a big red overlay cover your app in the browser. That's Vite showing you the exact error — file, line number, and what's wrong. It's trying to help.

- **Read it.** Most errors tell you exactly what's broken.
- **Copy it.** When asking for help, paste the full error, not a summary.
- **It doesn't crash your app.** Your dev server keeps running. Fix the code, save, and the overlay disappears automatically.

The error overlay is a feature, not a failure. It's saving you from shipping broken code. Treat it as a friend.

---

## Next up

**Chapter 3 — The Canvas.** This is where your app stops looking generic. We install Tailwind, set up the Eidrix color palette, load the right fonts, and your page stops being "black background white text" and starts being *yours.* Big visible upgrade.
