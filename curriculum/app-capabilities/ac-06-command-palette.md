# AC-06 — Command Palette (cmd+K)

*First App Capability chapter. You'll build a Linear/Raycast/Notion-style command palette — hit cmd+K (or ctrl+K on Windows) and a searchable overlay pops open with navigation commands and actions. Uses the `cmdk` library (the same one Linear, Raycast, and Vercel use) as the base, then styles and wires it with your own Input, Card, and Badge components. About 90 minutes. Real feature you ship — users can tell.*

---

## What you're learning

1. **Keyboard-driven UX** — listening for global keyboard shortcuts, managing focus, closing on Escape
2. **Modal/overlay patterns** — how floating UIs work, backdrop blur, z-index stacking, focus trapping
3. **Using a production library thoughtfully** — how to reach for a battle-tested library without giving up control of the design
4. **Filter-as-you-type** — live filtering a list as the user types, in under 50ms
5. **Action systems** — defining what commands exist in your app as structured data, so they can be searched, categorized, and executed uniformly
6. **Command-palette patterns that transfer to agentic chat** — the same "actions defined as data" pattern shows up in AC-03 (Tool Calling) and AC-16 (Agentic Subagents)

---

## What you're building

A command palette that:

- Opens on **cmd+K** (Mac) or **ctrl+K** (Windows)
- Shows a floating overlay centered on screen with a backdrop blur behind it
- Contains a search Input at the top that auto-focuses
- Shows a list of commands filtered by what you type (fuzzy search)
- Groups commands into categories: **Navigation** (jump to tabs) and **Actions** (clear search, reset view)
- Supports keyboard navigation — arrow keys move selection, Enter executes, Escape closes
- Closes after executing a command
- Uses your existing Input, Card, and Badge components for visual consistency

When you close it, the tab you were on still renders — the palette is pure overlay, nothing underneath changes unless you pick a command that navigates somewhere.

---

## Plain English glossary

- **Command palette** — a search-first UI for triggering any action in an app via keyboard. Popularized by Linear, Raycast, VSCode, Notion.
- **Global keyboard shortcut** — a key combo that works from anywhere in the app, not just when a specific input is focused. cmd+K is global.
- **Overlay / modal** — UI that floats above everything else, usually with a dimmed backdrop to signal "pay attention to me, not what's behind me."
- **Focus trap** — when an overlay is open, keyboard focus stays inside it — you can't accidentally tab to something in the background. Critical for accessibility.
- **Fuzzy search** — search that matches even if you misspell or skip characters. "cmp" should still find "Components." cmdk handles this for you.
- **Command / action** — a structured definition of one thing the palette can do: a name, an icon, a category, and a function to run when selected.
- **Provider** — a React component that wraps your app and makes shared state available to everything inside it. We'll use one for the palette's open/close state.

---

## Why this chapter matters

Three reasons:

**1. Every serious productivity app has this now.** Linear, Raycast, Notion, GitHub, Vercel, Cursor, VSCode — all command-palette-first. Your users who've used any of those will *expect* cmd+K to work. Not having it signals "this app isn't made for power users."

**2. It stress-tests the architecture you just built.** You just added a 5th tab in Chapter 8. The command palette's Navigation category will navigate between those tabs. If your tab state is clean, wiring this up is smooth. If it's shaky, you'll find out now.

**3. The "actions as data" pattern is the foundation of tool calling.** In AC-03, your agentic chat will execute tools like "add a record" or "filter the view." Those tools are defined exactly like command palette actions — name, description, what-it-does. Build the pattern here, reuse the mental model later.

---

## The plan, in plain English

1. **Start clean, create branch** — rhythm
2. **Install cmdk** — the library
3. **Thorough plan** — global keyboard handling plus modal rendering plus filter logic plus action system = not trivial
4. **Build the action system** — a typed list of every command, what category it's in, what it does when executed
5. **Build the palette UI** — uses cmdk under the hood, your Input/Card/Badge for styling
6. **Wire the keyboard shortcut** — cmd+K opens, Escape closes
7. **Wire the actions** — Navigation actions switch the active tab; other actions do simple stuff
8. **Iterate on the feel** — overlays live or die on how they feel when opening and closing
9. **Code-simplifier review**
10. **PR, review, merge**

---

## Step 1 — Start clean

```
Starting AC-06 — Command Palette. Rhythm check: confirm I'm on main, clean, no leftover branches.
```

---

## Step 2 — Create the branch

```
Read CLAUDE.md and curriculum/PROGRESS.md. Then create a branch called feature/ac-06-command-palette.
```

---

## Step 3 — Install cmdk

```
Install the cmdk package. Use npm. Confirm it installs cleanly, no peer dependency warnings. Check package.json afterward and show me that cmdk is listed.
```

Why cmdk specifically: it's the library powering Linear, Raycast, Vercel, and shadcn/ui. Battle-tested, unstyled (works with our Tailwind tokens), accessible by default, built-in fuzzy search. No good reason to roll our own for this chapter.

---

## Step 4 — Ask for a Thorough Plan

Command palettes have more moving parts than they look like. Thorough plan warranted.

```
AC-06 builds a command palette triggered by cmd+K / ctrl+K. Thorough-plan this before writing code.

## Overview
A floating searchable overlay that opens on cmd+K, filters a list of commands as the user types, supports keyboard navigation (arrows + Enter + Escape), and executes actions like switching tabs or clearing state.

## Files to create and modify
Complete list, no "and related files."

## Key architecture decisions to cover

1. **Where does the palette live in the component tree?** Most palettes live at the App.tsx level so they're available everywhere. Propose a structure.

2. **How is the palette's open/close state managed?** Options: local useState in App, a Context provider, or something else. Explain your choice and why.

3. **How are the action definitions structured?** Propose a TypeScript interface for a Command/Action. Must support: id, name, description, category (Navigation / Actions), icon (optional), and an execute function.

4. **How is the keyboard shortcut handled?** useEffect with keydown listener on window? Something else? Make sure it works on both Mac (meta key) and Windows (ctrl key).

5. **How does tab switching work?** The Navigation commands need to switch the active tab in TabsPanel. This means the tab state either needs to be lifted out of TabsPanel up to App.tsx, OR we need a different mechanism (context, callback pass-down, etc.). Propose the cleanest path.

6. **How is the search filtering handled?** cmdk has built-in filtering — we mostly just feed it our items and it handles the fuzzy matching. Confirm this is the approach.

## Files to create
- `src/lib/commands.ts` — the action definitions (typed list of commands)
- `src/components/CommandPalette.tsx` — the palette UI using cmdk

## Files to modify
- `src/App.tsx` — render <CommandPalette /> at the top level, manage open/close state (or a context for tab state if we lift it)
- `src/components/TabsPanel.tsx` — tab state may need to be lifted, depending on the approach chosen

## Visual design spec (push the frontend-design skill)
- Backdrop blur behind the palette (semi-transparent obsidian, 40-60% opacity)
- Palette centered vertically and horizontally, ~600px wide
- Top: search Input (reuse our existing Input component, auto-focused on open)
- Middle: scrollable command list
- Each command row: icon on left, name, description (smaller/dimmer)
- Commands grouped by category with small category labels above each group
- Hover / keyboard-highlighted row: warm ember tint background, not harsh blue
- Enter on highlighted row executes
- Open/close animation: fade + slight scale (200ms)
- NO generic AI aesthetics — this should feel as premium as Linear's command palette

## Initial command roster (hardcoded for now)
Navigation:
- Jump to Lab
- Jump to Components
- Jump to Records
- Jump to Chat
- Jump to Settings

Actions:
- Clear search (clears the palette's search input)
- Close palette

## Edge cases
At least 5:
- User types cmd+K while a text input is focused (should still open the palette)
- Palette open, user clicks outside the palette — should close
- Palette open, user presses Escape — should close and restore focus
- Command executed that navigates to the current tab (should be a no-op gracefully)
- Search string doesn't match any command — show an empty state

## Alternatives considered
- Rolling our own filter/keyboard logic without cmdk (rejected: too much code for a learning chapter, and cmdk's accessibility is better than we'd get building from scratch)
- Using a heavier solution like shadcn's Command component (rejected: we'd pull in a lot of unrelated shadcn infrastructure)
- At least one more alternative you'd flag

## Assumptions I need to verify
Things you're assuming about my setup.

## Risk notes
Anything error-prone. Global keyboard handlers are one — can conflict with browser shortcuts if done wrong.

## Open questions
Anything you need from me before building.

Don't write code. Wait for approval.
```

---

## Step 5 — Review the plan carefully

Specific things to check:

- **The tab state lifting question has a clear answer.** The cleanest approach is usually: lift `activeTab` state up to App.tsx (from TabsPanel), pass it as a prop to TabsPanel, and expose a setter that the command palette can also call. Confirm that's what Claude Code proposed or something equally clean.
- **Keyboard handling works on both OS.** Should use `navigator.platform` or check both `metaKey` and `ctrlKey`.
- **The action interface is well-typed.** No `any` types sneaking in.
- **Animation is in the plan, not bolted on later.** "Fade + slight scale, 200ms" should be explicit.
- **Initial command roster matches the plan above.** If anything got trimmed, question it.
- **Claude Code mentioned at least one risk you wouldn't have thought of.** If not, push: *"What's one risk you'd add if you were being really careful?"*

When the plan's solid:

```
Plan approved. Let's build it.
```

---

## Step 6 — Let Claude Code build

This creates two new files and modifies two. Dev server will rebuild.

When finished, test it immediately:

1. Press **cmd+K** (or ctrl+K) — palette should open
2. Start typing "comp" — should filter down to "Jump to Components"
3. Press Enter — should switch to the Components tab and close the palette
4. Press cmd+K again — should reopen
5. Arrow down through commands — highlighting should be visible
6. Press Escape — should close
7. Click outside the palette — should close

If any of those don't work, report it back to Claude Code immediately. These are all P0 before iterating on design.

---

## Step 7 — Iterate on the feel

This chapter's iteration is more about *feel* than previous chapters. Command palettes are a high-touch UI — how they open, how keyboard navigation feels, how hovered rows look.

**The feel checklist:**

- Does the open animation feel snappy (200ms) or sluggish (400ms+)?
- When highlighted, does a row feel warm and inviting (ember tint) or cold (blue)?
- Is the backdrop blur visible enough that you know the palette is a modal, but not so heavy that the app behind it disappears entirely?
- When you type, does the filtering feel instant? Any lag at all?
- When you press Enter, does the execution feel immediate?
- When the palette closes, does it fade out or just disappear?

**Common iterations:**

- **"The backdrop is too dark / too light."** Redirect: *"Adjust the backdrop opacity — should feel like a gentle veil, not a blackout."*
- **"The highlight color on arrow-navigation is ugly default blue."** Redirect: *"Change the highlighted row's background to a warm ember tint. Match the focus-ring treatment on our inputs."*
- **"Open animation is instant — feels jarring."** Redirect: *"Add a 200ms fade+scale animation on open. Should feel like it breathes in."*
- **"Close is abrupt."** Redirect: *"Mirror the open animation on close — 200ms fade+scale out."*
- **"Search input isn't auto-focusing."** Redirect: *"When the palette opens, the search input should be auto-focused so I can start typing immediately."*
- **"Fonts inside the palette don't match the rest of the app."** Redirect: *"The palette should use our design tokens — font-body for command names, font-mono for category headers (like §01 / §02 elsewhere in the app). Nothing should look out of place."*
- **"Overall it works but feels generic."** Redirect: *"Push the design further. Should feel as premium as Linear's or Raycast's palette — distinctive, not a Bootstrap overlay."*

Iterate until the palette feels like something you'd want to use.

---

## Step 8 — Code-simplifier review

```
We just shipped a command palette. Have code-simplifier review the new files in src/lib/commands.ts and src/components/CommandPalette.tsx, plus changes to App.tsx and TabsPanel.tsx. Report suggestions but don't auto-apply. Show me each one.
```

Read the suggestions. Be skeptical of suggestions that abstract the action system further — a simple typed array is fine and will stay readable. Accept suggestions that flatten nested conditionals, extract repeated Tailwind class strings, or improve type safety.

---

## Step 9 — Commit with PROGRESS.md checkoff

```
I'm happy with the command palette. Commit this work, and in the same commit, check off AC-06 in curriculum/PROGRESS.md. Push, open a PR, give me the link.
```

---

## Step 10 — Review the diff

Expected files:

- `src/lib/commands.ts` — new, the action definitions
- `src/components/CommandPalette.tsx` — new, the palette UI
- `src/App.tsx` — modified, renders <CommandPalette />, may own tab state now
- `src/components/TabsPanel.tsx` — modified, receives tab state as prop
- `package.json` and `package-lock.json` — cmdk added as dependency
- `curriculum/PROGRESS.md` — AC-06 checked off

**Check:**

- Every command in `commands.ts` is typed — no stringly-typed categories
- The keyboard handler checks both `metaKey` (Mac) and `ctrlKey` (Windows)
- Tab state lifting (if that's the approach) is clean — no prop drilling through 4 levels
- Animations are present and consistent
- No hardcoded colors
- The palette is wrapped in enough accessibility semantics that cmdk provides

If it looks good:

```
PR looks good. Merge it into main.
```

---

## Step 11 — Clean up

```
Switch back to main, pull, delete the feature branch locally and on GitHub. Confirm we're clean.
```

---

## What just happened

You shipped a real power-user feature. Not a showcase, not a demo — an actual thing your future users will hit cmd+K on and go *"oh, this has one."* Every serious product has this now. You just joined the club.

More importantly, you built two patterns you'll reuse constantly:

**1. The "actions as data" pattern.** Every command is a structured object with a name, description, and execute function. This exact same pattern shows up in AC-03 (Tool Calling, where AI tools are defined the same way) and AC-16 (Agentic Subagents, where agents have scoped action sets). You just learned the data structure at the heart of agentic AI.

**2. The "global overlay" pattern.** Next time you need a modal (confirm dialogs, image viewers, settings overlays), you already know the ingredients: a provider or lifted state, a backdrop, a focus trap, an Escape handler, mount/unmount animations.

---

## What success looks like

- cmd+K / ctrl+K opens the palette
- Typing filters the command list in real time
- Arrow keys navigate; Enter executes; Escape closes
- Clicking outside closes
- Navigation commands actually switch tabs
- Palette feels as premium as Linear's or Raycast's
- No generic AI styling — uses our design tokens throughout
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"cmd+K doesn't open the palette"** — Global keyboard handler issue. Tell Claude Code: *"cmd+K isn't opening the palette. Help me debug — check that the keydown listener is registered and that it's checking both metaKey and ctrlKey."*
- **"cmd+K opens the browser's URL bar instead"** — Missing `preventDefault()`. Tell Claude Code: *"cmd+K is triggering the browser's default behavior instead of my palette. Add preventDefault and stopPropagation."*
- **"Palette opens but search doesn't filter"** — cmdk wiring issue. Tell Claude Code: *"The palette opens but typing doesn't filter the commands. Help me debug the cmdk setup."*
- **"Enter does nothing when a command is selected"** — Action execution not wired. Tell Claude Code: *"Pressing Enter on a selected command doesn't execute it. Help me debug the action execution flow."*
- **"Tab switching from the palette doesn't work"** — Tab state lifting may not have happened cleanly. Tell Claude Code: *"Navigation commands in the palette don't switch tabs. Check how the tab state is shared between CommandPalette and TabsPanel."*
- **"Palette doesn't close when clicking outside"** — Backdrop click handler missing. Tell Claude Code: *"Clicking outside the palette doesn't close it. Add a backdrop click-to-close handler."*
- **"The palette feels sluggish"** — Animations might be too long, or filtering might be debounced. Tell Claude Code: *"The palette feels sluggish. Check if there's any debouncing or artificial delay slowing it down."*

---

## Tour Moment — The "actions as data" pattern

You just defined every command in your palette as a plain object in `commands.ts`:

```ts
{
  id: 'nav-components',
  name: 'Jump to Components',
  description: 'Switch to the Components tab',
  category: 'Navigation',
  execute: () => setActiveTab('components')
}
```

This pattern — *"describe what things DO, don't hardcode where they live"* — is one of the most important patterns in modern UI engineering.

Why it matters: with actions as data, you can easily:
- Generate keyboard shortcut cheat sheets automatically
- Expose the same actions to AI tool-calling (AC-03)
- Let users remap keyboard shortcuts
- Add telemetry to every action by wrapping the execute function
- Test each action in isolation

This is how Linear, Raycast, and Notion's command palettes are architected. You just built the same shape.

---

## Tour Moment — The cmdk library and "buy vs. build"

You used `cmdk` instead of writing your own filtering + keyboard nav + accessibility logic. That's a deliberate tradeoff:

- **What we gave up:** understanding the internals of fuzzy matching and focus trapping
- **What we got back:** about 3 hours of your life, plus better accessibility than we'd have written ourselves

In real production work, this is the call you make constantly: *"Do I build this from scratch or use a library?"* The heuristic:

- **Build it** if it's core to your product's identity or you're learning
- **Use a library** if it's a well-solved problem with a clear standard (like command palettes — cmdk is the standard)
- **Use a library with heavy customization** if you want the battle-testing but need your own flavor — exactly what we just did

Command palette was a "use the library" moment. Custom design tokens, custom animation, custom command roster — but the underlying machinery? Trust the people who built it for Linear.

---

## Tour Moment — How this previews AC-03

Remember that `execute` function on every command?

```ts
execute: () => setActiveTab('components')
```

In AC-03, you'll build tool calling for your agent chat. Tools will look nearly identical:

```ts
{
  name: 'add_record',
  description: 'Add a new record with the given fields',
  inputSchema: { name: 'string', email: 'string' },
  execute: (input) => addRecord(input)
}
```

Same pattern. Name, description, execute function. The command palette is one caller of that system (keyboard-driven). The agentic chat will be another caller (natural-language-driven). Same underlying shape. You just built the foundation for both.

This is what it means to build a curriculum that compounds. The patterns you learn early keep paying off.

---

## Next up

**Chapter 9 — Motion Lab.** Back to main track. You'll add Framer Motion to the project and build a Motion Lab tab (sixth primary tab, or slot it into Lab — that's a decision you'll make) that showcases signature animations: entrance transitions, loading states, hover micro-interactions, scroll reveals. Short chapter, high-reward visual payoff.

The Motion Lab directly sets up **AC-08 — Animated Brand Marks (the Eidrix Eye)**. That's the "holy shit how did you animate that" capability chapter you've been excited about. Motion Lab is prep work; AC-08 is payoff.
