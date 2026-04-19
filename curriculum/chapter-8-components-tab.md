# Chapter 8 — Components Tab

*First interactive tab. You'll build four reusable UI components (Button, Card, Input, Badge) AND restructure your tab bar to give Components its own dedicated tab alongside Lab. The tab bar grows from 4 primary tabs to 5. Components Tab becomes your playground — room to grow as the curriculum adds more UI primitives. About 2 hours. Build chapter — back to full rhythm after the two reading chapters.*

---

## What you're learning

1. **Component variants** — how one component handles multiple visual treatments (primary/secondary/etc.) without becoming a mess
2. **Interactive states** — hover, focus, active, disabled. How they feel and how to build them in Tailwind
3. **Props with TypeScript** — passing values into a component with type safety
4. **Dedicated-tab architecture** — when content deserves its own tab vs. when it belongs in an existing one (a decision you'll make for real Eidrix)
5. **Primary-tab expansion** — extending your app's tab bar without breaking anything

---

## What you're building

Two parallel pieces of work that ship together:

**The components (new `ui/` subfolder):**
- **Button** — four variants (primary, secondary, tertiary, destructive), interactive states (default, hover, active, disabled), size prop (sm, md, lg)
- **Card** — three variants (default, bordered, elevated), with a children prop for content
- **Input** — text input with states (default, focused, error with message, disabled), label and placeholder props
- **Badge** — four variants (default, success, warning, info), small pill-shaped

**The new tab:**
- New "Components" tab added to the primary tab bar (between Lab and Records)
- New `ComponentsTab.tsx` body — displays all four components in all variants and states
- Tab bar goes from 4 primary tabs (Lab, Records, Chat, Settings) to 5 (Lab, Components, Records, Chat, Settings)
- The new tab has room to grow — future chapters may add Tabs, Tooltip, Modal, Dropdown, Avatar, Toggle, etc.

By the end: your tab bar reads *Lab · Components · Records · Chat · Settings*. Clicking Components gives you a dedicated playground for every interactive primitive in the system.

---

## Plain English glossary

- **Variant** — a version of a component with different styling. "Primary button" and "secondary button" are variants of the Button component.
- **Props** — values you pass into a component when you use it. `<Button variant="primary" label="Save" />` — `variant` and `label` are props.
- **TypeScript interface** — a definition of what props a component expects. Like a contract: "this component expects a string label and optionally a variant."
- **Interactive state** — how a component looks when the user is interacting with it. Hover (mouse over), focus (keyboard selected), active (being clicked), disabled (can't be interacted with).
- **Primitive** — a small, reusable UI piece that doesn't know about app-specific logic. Button is a primitive; ChatColumn is not.
- **Atomic design** — the idea that UIs are built from small atoms (Button, Input) that combine into molecules (Card-with-button) that combine into organisms (a full form).

---

## Why this chapter matters

Every future chapter uses components from this one.

- Chapter 10 (Forms) — uses Input, Button
- Chapter 11 (Fake Chat UI) — uses Card, Button, Input
- AC-06 (Command Palette) — uses Input, Card, Badge
- AC-14 (Toast Notifications) — uses Badge, Card
- AC-01/02/03 (The agent chat chain) — uses Button, Input, Card throughout
- Chapter 14 (Supabase data tables) — uses Card, Badge, Button

If your components are solid, every future chapter feels easy. If they're shaky, every future chapter feels like a fight.

Also: this is your first real tab-bar restructure. The skill of "expand the app's primary navigation cleanly" is one you'll use in real Eidrix repeatedly.

---

## The plan, in plain English

1. **Start clean, create branch** — rhythm
2. **Thorough plan** — components + tab-bar restructure = architectural change, deserves Thorough mode (per TC-01)
3. **Build the components** — Button first (most complex), then Card, Input, Badge
4. **Build the ComponentsTab showcase**
5. **Restructure the tab bar** — add Components tab, wire it up
6. **Iterate on the visual result** — components need to *feel* right
7. **Let code-simplifier do its thing** — review cleanup suggestions
8. **PR, review, merge**

---

## Step 1 — Start clean

```
Starting Chapter 8 — Components Tab. Rhythm check: confirm I'm on main, clean, no leftover branches.
```

---

## Step 2 — Create the branch

```
Read CLAUDE.md and curriculum/PROGRESS.md. Then create a branch called feature/components-tab.
```

---

## Step 3 — Ask for a Thorough Plan

Per TC-01, architectural work (components + tab-bar restructure) earns a Thorough plan. Use the format you just learned.

```
Chapter 8 does two things at once: builds the foundation UI components I'll reuse for the rest of the curriculum, AND gives those components their own dedicated primary tab (replacing the "Components Lab inside the Lab tab" approach). Thorough-plan this before writing code.

## Overview
Build four components in a new `src/components/ui/` subfolder: Button, Card, Input, Badge. Build a new `ComponentsTab.tsx` that showcases them. Restructure the TabsPanel so the primary tab bar has 5 tabs instead of 4: Lab, Components, Records, Chat, Settings.

## Files to create, modify, and delete
List every file. No "and related files" language.

## Components spec
1. **`src/components/ui/Button.tsx`** — four variants: primary, secondary, tertiary, destructive. Interactive states: default, hover, active, disabled. Size prop: sm, md, lg (default md).
2. **`src/components/ui/Card.tsx`** — three variants: default, bordered, elevated. Children prop for content.
3. **`src/components/ui/Input.tsx`** — text input. States: default, focused, error (with error message below), disabled. Props: label, placeholder, error (optional), disabled (optional).
4. **`src/components/ui/Badge.tsx`** — four variants: default, success, warning, info. Small pill-shaped, takes a text prop.

## ComponentsTab spec
New file: `src/components/ComponentsTab.tsx`. Displays all four components in all variants and states, labeled clearly. Follows the visual pattern established by TypographyLab and ColorLab but lives in its own tab instead of inside Lab.

## TabsPanel restructure
Modify `src/components/TabsPanel.tsx`:
- Primary tab bar goes from 4 tabs to 5
- New tab "Components" inserted between Lab and Records
- Tab state updated to accept 'components' as a valid value
- When Components tab is active, render `<ComponentsTab />`
- Lab tab continues to render Typography Lab + Color Lab (unchanged)
- Other placeholder tabs (Records, Chat, Settings) unchanged

## TypeScript approach
- Every component has a typed props interface
- Variant props use union types (e.g. `variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive'`)
- Sensible defaults — a Button with no props renders as primary md

## Styling approach
- Tailwind classes throughout, using existing design tokens (obsidian, ember, cobalt, text)
- No hardcoded colors anywhere
- Variants should be clearly distinct but share a family feel
- Interactive states must feel intentional — not default browser behavior
- Ember = primary brand accent; use for primary variants and focus states

## Specific design intent (push the frontend-design skill on this)
- Buttons feel deliberate — ember glow on hover, subtle press animation on active, confident corners
- Cards feel premium — not flat Bootstrap cards
- Inputs feel inviting on focus — warm ember border
- Badges feel restrained — small, confident, readable
- NO generic AI aesthetics

## Architecture questions to address in your plan
1. How will variants be mapped to classes internally — object lookup, class-variance-authority, ternary chain? Explain your choice.
2. How will hover/focus/active states be handled? Tailwind modifiers only, or something more?
3. For Button, will you use `<button>` or something else? Why?
4. For Input, how will the error state be visually distinct — border color, label color, both?
5. For the tab bar restructure: will the 5 tabs fit visually in the existing tab bar width, or does the bar need to accommodate the extra tab somehow?

## Edge cases
At least 5 things that could go wrong:
- Tab state already at 'lab' when Components is added — default behavior on load
- Tab bar overflow on narrow viewports (we're desktop-first for now, but still)
- Focus rings clashing with ember border on inputs
- Disabled buttons still showing hover effects
- Badge text being longer than expected and wrapping weirdly

## Alternatives considered
At least 2 ways this could be structured differently and why you'd reject them.

## Assumptions
Things you're assuming that I should verify before approving.

## Risk notes
Anything particularly error-prone or expensive to reverse. Tab-bar restructure is one — getting the state handling wrong could break existing Lab content.

## Open questions
Anything you genuinely don't know and need me to answer before you could build this.

Don't write code. Wait for my approval.
```

---

## Step 4 — Review the plan carefully

Things to verify:

- **All five files mentioned in the components + ComponentsTab spec are in the "files to create" list.** Plus the TabsPanel modification.
- **Props interfaces are defined for each component.** If vague, ask for specifics.
- **Tab state handling is clear.** What does `activeTab` hold now — a union type? Is 'lab' still the default?
- **Each architecture question got a real answer.** If any are hand-wavy, push back.
- **Edge cases feel real, not boilerplate.** Tab bar overflow is a real one — did Claude Code think about it?
- **At least one alternative is interesting.** "I considered putting Components inside Lab as a subsection" counts, for instance.
- **No hardcoded colors mentioned.**

If anything's off:

```
Good plan, but [specific redirect]. Revise and show me the updated plan.
```

When it's solid:

```
Plan approved. Let's build it.
```

---

## Step 5 — Let Claude Code build

This creates five new files and modifies one. Dev server rebuilds as files come in.

When finished, open `localhost:5173`. You should see:

- Tab bar now has 5 tabs: **Lab · Components · Records · Chat · Settings**
- Lab tab (default active) still shows Typography Lab + Color Lab as before
- Click Components — you should see a new tab body with all four components on display
- Records / Chat / Settings still show placeholder

---

## Step 6 — Iterate (the longest step)

Components need to *feel* right, not just look right. Spend real time on this.

**First: test the interactions.** On the Components tab:
- Hover over each button variant — what feels deliberate vs. generic?
- Click them — any press animation or is it static?
- Tab through inputs — how does the focus state look?
- Try the disabled states — clearly non-interactive?
- Look at the Badge variants — do they feel restrained or sticker-like?

**Common iterations:**

- **"The primary button hover is just a darker shade — feels generic."** Redirect: *"Make the primary button hover more interesting — a subtle ember glow, slight lift, or something that feels premium. Not a default-browser color shift."*
- **"The focus ring is ugly Tailwind default blue."** Redirect: *"Replace Tailwind's default focus ring everywhere with a warm ember-toned ring that matches our design language."*
- **"Disabled buttons don't feel obviously disabled."** Redirect: *"Disabled needs to be clearly non-interactive — dim them further, remove all hover effects, change the cursor."*
- **"Cards feel flat."** Redirect: *"Default cards feel flat. Add a subtle warm shadow and faint border to give presence."*
- **"Badges look like bright stickers."** Redirect: *"Tone badges down — smaller, more restrained, feels like a professional status indicator."*
- **"Tab bar looks cramped with 5 tabs."** Redirect: *"The tab bar feels crowded with 5 tabs. Look at the spacing and typography — can we tighten or adjust to make it breathe?"*
- **"Everything works but feels generic."** Redirect: *"Components work but feel like a Bootstrap clone. Push further — more distinctive, more considered, more 'Eidrix-feel.' Use ember and cobalt with intent."*

Iterate in small steps. One change at a time. Refresh. Evaluate. Next.

**The scroll test:** scroll all five tabs. Does the transition Lab → Components feel natural? Does Components feel like it belongs in the same product as Typography Lab and Color Lab?

---

## Step 7 — Let code-simplifier do its thing

Since Chapter 7, code-simplifier has been silently running on recently-modified files. For Chapter 8 specifically:

```
We just shipped four new components and a new tab. Have code-simplifier review the new files in src/components/ui/ and src/components/ComponentsTab.tsx, plus the changes to src/components/TabsPanel.tsx. Report suggestions but don't auto-apply — show me each one so I can approve or skip.
```

Read the suggestions. Common patterns it catches:
- Repeated Tailwind class strings that could be extracted
- Overly clever ternaries that could be clearer
- Nested conditionals that could be flat
- Unnecessary abstractions (be skeptical — code-simplifier sometimes over-abstracts)

Approve good ones:

```
Apply [specific suggestion]. Show me the diff before committing.
```

---

## Step 8 — Commit with PROGRESS.md checkoff

```
I'm happy with the Components Tab. Commit this work, and in the same commit, check off Chapter 8 in curriculum/PROGRESS.md. Then push, open a PR, and give me the link.
```

---

## Step 9 — Review the diff

Expected files:

- `src/components/ui/Button.tsx` — new
- `src/components/ui/Card.tsx` — new
- `src/components/ui/Input.tsx` — new
- `src/components/ui/Badge.tsx` — new
- `src/components/ComponentsTab.tsx` — new
- `src/components/TabsPanel.tsx` — modified (new tab + state handling)
- `curriculum/PROGRESS.md` — Chapter 8 checked off

**Check:**

- Every component has a typed props interface with union types for variants
- No hardcoded colors or sizes anywhere in the components
- Tailwind classes reference design tokens consistently
- Each component file is focused — no extra utilities shoved in
- TabsPanel state handling cleanly supports the 5th tab
- ComponentsTab is cleanly organized — labeled showcase blocks for each component
- No surprise files

If it looks good:

```
PR looks good. Merge it into main.
```

---

## Step 10 — Clean up

```
Switch back to main, pull, delete the feature branch locally and on GitHub. Confirm we're clean.
```

---

## What just happened

Two big things:

**You stocked your toolbox.** Every future chapter now has Button, Card, Input, Badge to reach for. When a chapter says "add a button," you don't write one — you use `<Button variant="primary" label="Save" />`. That reuse is what makes building complex apps manageable.

**You made your first primary-navigation expansion.** Your app now has 5 primary tabs instead of 4. Adding a primary tab cleanly (without breaking existing tabs) is a small-but-real architectural skill. You'll do this again in real Eidrix when you need a Reports tab or a Billing tab. Now you've done it once.

The `ui/` subfolder also kicks off a convention: primitives go there, app-specific components stay at the `components/` root level. By end of curriculum, `ui/` will have 10+ components. Real Eidrix eventually gets a `@eidrix/ui` package. You just planted that seed.

---

## What success looks like

- Four new components exist in `src/components/ui/`: Button, Card, Input, Badge
- Each has typed props with variant union types
- All variants and states are visible in the Components tab
- Tab bar has 5 primary tabs; clicking each shows the correct content
- Lab tab unchanged — Typography Lab + Color Lab still render there
- Hover, focus, active, disabled states all feel intentional
- No hardcoded colors in components
- code-simplifier reviewed and any sensible suggestions applied
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"Clicking Components tab shows nothing / crashes"** — Tab state wiring issue. Tell Claude Code: *"Components tab doesn't render its content. Debug the tab state logic and the rendering in TabsPanel."*
- **"Clicking Components breaks the Lab tab"** — State handling bug. Tell Claude Code: *"Switching to Components breaks Lab when I switch back. Fix the state handling to properly isolate each tab's content."*
- **"TypeScript is yelling about the new tab value"** — Union type wasn't updated. Tell Claude Code: *"TypeScript error on the tab state. Update the union type to include 'components' as a valid value."*
- **"Tab bar is overflowing on narrower windows"** — Layout issue. Tell Claude Code: *"Tab bar overflows at narrow widths. Tighten spacing or typography without losing legibility."*
- **"Variants all look the same"** — Style mapping didn't wire up. Tell Claude Code: *"All button variants render identically. Check that the variant prop is actually driving different class strings."*
- **"Focus ring is ugly default blue"** — Tell Claude Code: *"Replace Tailwind's default focus ring everywhere with a warm ember-toned ring."*
- **"Disabled still responds to hover"** — Missing disabled check. Tell Claude Code: *"Disabled buttons still show hover states. Make disabled truly non-interactive."*

---

## Tour Moment — The `ui/` vs `components/` split

You just introduced a convention: `src/components/ui/` for primitives (Button, Card, Input, Badge), and `src/components/` for app-specific stuff (Header, ChatColumn, TabsPanel, TypographyLab, ColorLab, ComponentsTab).

The rule:
- **`ui/`** → reusable in any project. A Button is a Button whether it's in a SaaS dashboard or a marketing site. No app-specific context.
- **`components/`** → specific to THIS app. ChatColumn only makes sense here.

This separation sets up a future where `ui/` could be extracted into a standalone design system package. Real Eidrix will eventually have `@eidrix/ui`. Seed planted.

---

## Tour Moment — Why variants use union types, not strings

Variants declared like `variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive'` instead of just `variant?: string`.

The difference: with the union type, TypeScript catches `<Button variant="primarry" />` (typo) at compile time. Without it, the typo silently passes and the button renders with default styling — a bug you'd find later when you wonder why a button looks wrong.

Union types = "only these specific values allowed." Use them for any prop with a fixed set of valid values.

---

## Tour Moment — The dedicated-tab decision you just made

You chose to give Components its own tab instead of stuffing it into Lab. That decision wasn't random — it's based on a real architectural principle: *interactive content deserves dedicated space, reference content can share.*

The Lab tab is display-only (look at typography, look at colors). The Components tab is a playground (click, type, hover). Those are different kinds of content, and they want different kinds of space.

You'll make this exact decision repeatedly in real Eidrix. "Does this deserve its own primary tab, or does it belong inside an existing one?" There's no formula, but the heuristic is: *if users will reach for it frequently and alone, it earns its own tab. If it's a sibling of something they'd look at together, it shares.*

You just used this heuristic. Trust it.

---

## Tour Moment — Writing your own components vs. using a library

You just wrote four components from scratch. Most real products use component libraries like shadcn/ui, Radix, or Mantine — pre-built components you configure to match your brand.

Why write your own? Two reasons:

1. **Learning.** Writing a Button teaches you 10x more about React and Tailwind than configuring someone else's.
2. **Distinctiveness.** Libraries look like libraries. Your warm obsidian palette, your ember accents, your specific hover animations — those live in custom components.

In production, the answer's usually "both" — libraries for 80% of boring primitives (dropdowns, dialogs, tooltips), custom for the 20% that defines your brand. That's Chapter 16 territory. For now: write your own.

---

## Next up

**AC-06 — Command Palette (cmd+K).** First App Capability chapter. You'll build a Linear/Raycast/Notion-style command palette users pop with cmd+K to search and navigate anywhere in the app. Uses your new Input and Card components. Produces real "holy shit I can build this?" energy.

Or if you'd rather stay on the main track: **Chapter 9 — Motion Lab** is next. Framer Motion, signature animations, setup for the Eidrix Eye chapter (AC-08). Your call.
