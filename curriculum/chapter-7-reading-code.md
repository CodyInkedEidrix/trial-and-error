# Chapter 7 — Reading Code

*No new features. No new components. You already shipped the Eidrix shell in Chapter 6 — this chapter teaches you how to READ what you already wrote. Reading code is a different skill than writing it, and it's the skill you'll use most when working with real codebases (yours or anyone else's). About 45-60 minutes. Almost no typing.*

---

## What you're learning

1. **How to read a React component** — top to bottom, knowing what each part does
2. **How to follow an import trail** — when one file references another, how to chase the thread
3. **How to ask "what does this do?" in a useful way** — so Claude Code explains rather than rewrites
4. **The vocabulary of component anatomy** — props, state, JSX, imports, exports
5. **How to form a mental map of a codebase** — so you can navigate without getting lost

---

## What you're NOT building

Nothing. This chapter writes zero new code. The entire session is a guided tour of what you already built.

This might feel weird. You've been in build mode for 6 chapters. Breaking rhythm to read feels slow. Resist that feeling — this is the chapter that converts "I got Claude Code to build things" into "I understand what got built." Huge difference.

---

## Plain English glossary

- **JSX** — the HTML-looking stuff inside React components. Technically it's JavaScript, but it looks like HTML with superpowers. The thing between `return (` and `)` in most components.
- **Import** — a line at the top of a file that says "I need this from somewhere else." Like `import Header from './components/Header'`.
- **Export** — a line that says "other files can use this." Like `export default Header` at the bottom of Header.tsx.
- **Props** — values passed into a component when it's used. Like `<Button label="Click me" />` — `label` is a prop.
- **State** — values a component remembers between renders. You saw this in Chapter 6 with `useState` for the active tab.
- **Component hierarchy** — which components live inside which. App renders ChatColumn and TabsPanel; TabsPanel renders TypographyLab and ColorLab. It's a tree.
- **Entry point** — where the app starts. For Vite apps, that's usually `main.tsx`, which renders `App.tsx`, which renders everything else.

---

## Why reading is harder than writing

When you write code, you build up the context as you go — you know why each line exists because you just decided to put it there.

When you read code, the context is missing. You see a line that does something, but you don't know *why* it's there. You don't know what it's connected to. You don't know if it's important or throwaway.

That gap — between "I can see it" and "I understand why it's there" — is what this chapter closes.

---

## The plan, in plain English

You're going to tour five key files with Claude Code as your guide:

1. `src/main.tsx` — the entry point (where it all starts)
2. `src/App.tsx` — the top-level component (the shell)
3. `src/components/ChatColumn.tsx` — the left column
4. `src/components/TabsPanel.tsx` — the right column (the most complex file)
5. `src/components/TypographyLab.tsx` — a Lab section (picking one of two)

For each one, you'll ask Claude Code to walk through it, explain what each part does, and answer your questions. No code changes.

At the end, you'll do a "connect the dots" exercise to make sure the mental map sticks.

---

## Step 1 — Start clean

No branch needed for this chapter. Nothing's being committed.

Tell Claude Code:

```
Starting Chapter 7 — Reading Code. This chapter is a guided code tour, no changes, no commits. Rhythm check: confirm I'm on main, clean, no leftover branches. No branch creation needed.
```

---

## Step 2 — Tour the entry point

The first file is `src/main.tsx`. This is where every Vite + React app begins.

Tell Claude Code:

```
Walk me through src/main.tsx. I want to understand:

1. What this file does at a high level
2. Every import at the top — what it brings in and why
3. What ReactDOM.createRoot does (in plain English)
4. What StrictMode does (in plain English)
5. How this file connects to App.tsx

Don't change anything. Just explain. Assume I know what a function is but not much else about React.
```

Read the response slowly. Ask follow-up questions if anything's unclear:

- *"What's the difference between StrictMode and not having it?"*
- *"What does `.render()` actually do?"*
- *"Why is there a `!` after `document.getElementById('root')`?"*

Don't move on until you could summarize what main.tsx does in one sentence.

---

## Step 3 — Tour App.tsx

Now the top-level component.

```
Walk me through src/App.tsx in the same style — high level first, then every imports, then the component itself. For the component:

- What does it return?
- What layout approach does it use (flex? grid?)
- How do ChatColumn and TabsPanel fit together?
- Why are they in this order?

Don't change anything. Just explain.
```

When you read the response, mentally match it to what you see on screen. If Claude Code says "App.tsx renders a flex row with ChatColumn on the left and TabsPanel on the right" — open `localhost:5173` and confirm that's exactly what you see.

Reading code and comparing it to the live result is the fastest way to build intuition.

---

## Step 4 — Tour ChatColumn.tsx

```
Walk me through src/components/ChatColumn.tsx. Cover:

1. What the component structure is — is there a header, a message list, an input?
2. How the placeholder messages are structured — are they hardcoded? An array? Something else?
3. How the styling is organized — are there repeated patterns?
4. Anything you'd flag as "notice how this is done, it's a pattern you'll see again"

Don't change anything.
```

Pay special attention to question 4. The whole point of reading is noticing patterns that'll repeat in future chapters.

---

## Step 5 — Tour TabsPanel.tsx (the important one)

This is the most complex file in your app. Give it extra attention.

```
Walk me through src/components/TabsPanel.tsx in detail. This is the most complex file in the app, so go slow. Cover:

1. The useState hook at the top — what's it tracking, what are the possible values, what's the default?
2. How clicking a tab actually switches the content — trace the flow from click to re-render
3. The difference between "tab bar" and "tab content" — how are they structured?
4. How the active tab's visual treatment is decided — conditional classes? Ternary? What's the pattern?
5. How "Coming soon" placeholders are handled for inactive tabs

Don't change anything. Go slow. I want to really understand this file.
```

Read the response twice. Then do this:

**Test yourself.** Without looking at the code, try to answer these out loud:

- What's the name of the state variable that tracks the active tab?
- What happens when I click the "Records" tab?
- Which component is responsible for deciding what to render inside the tab?

If any of those feel fuzzy, ask Claude Code to explain that specific piece again.

---

## Step 6 — Tour a Lab section

Pick either `TypographyLab.tsx` or `ColorLab.tsx` — doesn't matter which.

```
Walk me through src/components/TypographyLab.tsx. Cover:

1. Is it broken into subsections? If so, how?
2. How are design tokens being used — show me specific Tailwind classes
3. Is there any logic, or is it pure markup?
4. Anything that could be extracted into a reusable piece later?

Don't change anything.
```

Question 4 is the "expert" question. Reading code well means not just understanding what's there, but also noticing opportunities for improvement. Don't implement any of them — just notice them.

---

## Step 7 — Connect the dots

Now the meta question. This is the most important part of the chapter.

```
Based on everything we just walked through, draw me a map — in text form — of how the five files connect. Something like:

main.tsx → App.tsx → (ChatColumn + TabsPanel)
                         └─> TabsPanel → (TypographyLab + ColorLab)

Then describe the "data flow": when I click the Records tab, what happens, which file changes what, and what the user sees.

This is the mental model I should be carrying in my head.
```

Read the response. Compare it to what you imagined. Adjust your mental model to match reality.

**This is the moment the chapter earns its keep.** If you can describe what happens from click → render in your own words, you now "know" the app in a way you didn't an hour ago. You could open a future chapter's code and have a shot at understanding it without Claude Code explaining everything.

---

## Step 8 — The "one question you're still confused about"

Before closing the chapter, ask Claude Code one last thing:

```
What's one question about my codebase I should probably be asking, but haven't? Something a senior developer would notice and point out. Don't just list random issues — give me the single most important thing I should understand better.
```

This is an insight prompt. Claude Code will usually surface something genuinely useful — like "you're prop-drilling when context would be cleaner" or "your design tokens are great but your spacing tokens could be more systematic."

Read the answer. Don't act on it yet. Just absorb it. It's context for future chapters.

---

## Step 9 — Mark it done

No PR needed for this chapter — no code was changed. Just check it off.

```
Chapter 7 complete. No code changes, no PR. Just check off Chapter 7 in curriculum/PROGRESS.md on a tiny branch called docs/ch7-complete, ship a single-commit PR for the checkoff, and merge it. Then clean up.
```

---

## What success looks like

- You've read all five files with Claude Code explaining as you go
- You can describe what main.tsx → App.tsx → ChatColumn/TabsPanel → Labs does in your own words
- You understand the tab state flow from click to render
- You've noticed at least 2-3 patterns in the code (hardcoded data arrays, consistent use of tokens, etc.)
- Chapter 7 is checked off in PROGRESS.md

---

## If something broke

Almost nothing can break in this chapter — you're not writing code. But:

- **"Claude Code keeps trying to refactor the code instead of explaining it"** — Redirect: *"Stop. Don't rewrite anything. Just explain what's there. Read-only mode for this whole chapter."*
- **"I don't understand the explanations"** — Ask for simpler language: *"That explanation was too technical. Rewrite it assuming I know what a function is but have never used React before."*
- **"I'm getting overwhelmed by details"** — Zoom out: *"Skip the details for now. What's the ONE thing I most need to understand about this file?"*
- **"I lost track of which file we're in"** — That's normal. Tell Claude Code: *"Remind me which file we were walking through and where we left off."*

---

## Tour Moment — Reading vs. writing as two skills

Most people think "knowing code" means "being able to write code." It's half the picture.

The other half is reading. When you inherit a codebase (your brother's Eidrix, a client project, an open source library you want to customize), you spend 80% of your time reading and 20% writing. If you can only do the 20% well, you're stuck.

The developers who ship fast on unfamiliar codebases aren't faster typists. They're faster readers. They can look at a file, build a mental model in seconds, and jump straight to the change that matters without breaking anything else.

This chapter is the first step toward that.

---

## Tour Moment — The questions senior developers ask

When a senior developer opens an unfamiliar codebase, they don't start by reading line-by-line. They scan for patterns first. The questions they ask in their head:

- Where does the app start? (Entry point)
- What's the top-level structure? (Shell)
- What's the state management approach? (useState? Context? Redux?)
- What's the styling approach? (CSS modules? Tailwind? Emotion?)
- Where's the data coming from? (Props? Fetched? Local state?)

They answer those in roughly 2-3 minutes before reading any detailed logic. You're starting to build that same scanning ability now.

Next time you open a new codebase, try asking those five questions first, before diving into any file. See how much mental map you can build from the answers alone.

---

## Tour Moment — "I don't understand this" is a feature, not a bug

Every single line of code you read for the next year, there'll be pieces you don't fully understand. That's fine. That's expected.

The skill isn't "understand everything immediately." It's "identify which confusions are worth resolving now, and which can wait."

- Confusions worth resolving now: anything that affects what you're about to build, anything that's likely to confuse you in multiple future chapters, anything Claude Code can explain in under 2 minutes.
- Confusions that can wait: niche syntax, legacy patterns, things that work but you don't know why. Mark them and move on.

You don't need to understand every line. You need to understand enough to make progress. That's the real mental shift.

---

## Next up

**Chapter 8 — Components Lab.** Back to build mode. You'll create your third Lab section, this time showcasing all the reusable UI components (buttons, cards, inputs) in different states and variations. Same pattern as Typography Lab and Color Lab, but now it's interactive pieces. Fun chapter.

*Optional side quest before Chapter 8:* **TC-04 — Reading Other People's Code.** This chapter taught you to read YOUR own code. TC-04 extends the skill to reading codebases you didn't write — critical for real Eidrix work where you'll be restructuring existing code. Short capability chapter. Highly recommended if you're planning to port to real Eidrix soon, optional otherwise
