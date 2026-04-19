# Chapter 6 — The Eidrix Shell

*This is the chapter where your app stops being a scrollable document and becomes a real product shape. You'll split the screen into two panels: a chat column on the left (~380px wide) and a tabs area on the right (fills the rest). Your Typography Lab and Color Lab move into the first tab. You'll build the tab system, the chat column skeleton, and the overall structural shell. Nothing is functional yet — the chat doesn't send messages and the tabs are just navigation. But the Eidrix shape is real, and every future chapter will build inside this shell. Milestone chapter. Total time: about 2 hours.*

---

## What you're learning

1. **App shell architecture** — how real apps separate chrome (the persistent UI frame) from content (what changes inside it)
2. **Flex layout at the page level** — using flexbox to split the screen into columns
3. **State-driven tabs** — how clicking a tab changes what's rendered without reloading the page
4. **Component composition at scale** — now you have 5+ components working together
5. **The Eidrix shape** — why chat-left + tabs-right is a deliberate pattern, not just a layout choice

---

## What you're building

Your app transforms from one scrollable page into a fixed two-column layout:

**Left column (~380px wide, full height):**
- A chat panel header (title, maybe a close/collapse icon for later)
- A message list area (with 2-3 hardcoded placeholder messages to show the visual pattern)
- A chat input at the bottom (not functional yet — just visual)

**Right column (fills remaining space):**
- A primary tab bar at the top (P-1, P-2, P-3 style, named "Lab" / "Records" / "Chat" / "Settings" or similar — see the plan step for decisions)
- A tab content area that renders whatever tab is active
- The first tab contains your existing **Typography Lab** and **Color Lab** (which now live inside the Lab tab instead of on the page directly)
- Other tabs are placeholders for now

**Important — nothing is functional yet.** The chat input doesn't send. The tabs just switch what's shown. We're building the frame, not the plumbing.

---

## Plain English glossary for this chapter

- **App shell** — the persistent UI frame that doesn't change when you navigate. In Eidrix-style apps, the chat column and tab bar are the shell.
- **Chrome** — UI that's always there (navigation, headers, chat column). Distinct from "content" which changes.
- **Flexbox** — a CSS layout system for arranging items in rows or columns with flexible sizing. You'll use it to split the screen.
- **State** — values a component remembers. In this chapter, "which tab is currently active" is state.
- **Primary tab vs secondary tab** — primary tabs are the top-level navigation (Lab, Records, Chat). Secondary tabs sit inside a primary tab (e.g., Typography, Colors within Lab). For Chapter 6 we're just doing primary tabs; secondary tabs come later.
- **Shell vs content separation** — the shell is permanent, the content is swappable. When you click a tab, only the content swaps — the shell stays put.

---

## Why this is a milestone chapter

Three reasons:

1. **It's the first time your app looks like a product, not a demo.** All previous chapters have been "a page with stuff on it." After Chapter 6, you have "an application shell." Night-and-day visual leap.

2. **Every future chapter builds inside this shell.** Chapter 7 reads code inside the shell. Chapter 8 builds the Components Lab inside the Lab tab. Chapter 11 makes the chat column real. Chapter 13 puts real data into a tab. The shell is the foundation for everything after.

3. **You're building the same pattern as real Eidrix.** The Eidrix architecture is "persistent chat on the left, tabbed workspace on the right." Your brother's Eidrix, every Eidrix customer's Eidrix, they all have this shape. You're building the skeleton of a product pattern that scales to a whole company.

---

## The plan, in plain English

This chapter is bigger than previous ones, so we'll break the build into three phases:

**Phase 1: The shell layout**
- Restructure `App.tsx` into a two-column flex layout
- Create `src/components/ChatColumn.tsx` — the left column (mostly empty for now)
- Create `src/components/TabsPanel.tsx` — the right column (with tab bar + content area)

**Phase 2: The tab system**
- Inside TabsPanel, implement state-driven tabs
- Primary tabs: "Lab", plus 3 placeholder tabs ("Records", "Chat", "Settings") that just show "Coming soon"
- The Lab tab renders `<TypographyLab />` and `<ColorLab />` stacked

**Phase 3: The chat column skeleton**
- Header with "Chat" title
- Message list with 2-3 hardcoded placeholder messages (styled, not functional)
- Chat input at bottom (styled, not functional)

We'll ask Claude Code to do this as one coordinated build, not three separate PRs — the pieces only make sense together.

---

## Step 1 — Start clean

```
Starting Chapter 6 — The Eidrix Shell. This is a milestone chapter — we're restructuring the whole app layout. Rhythm check: confirm I'm on main, clean, no leftover branches.
```

---

## Step 2 — Create the branch

```
Read CLAUDE.md and curriculum/PROGRESS.md. Then create a branch called feature/eidrix-shell.
```

---

## Step 3 — Ask for the full plan first

Because this is structural work, the plan needs extra detail.

```
Chapter 6 transforms the app from a scrollable page into the Eidrix shell: persistent chat column on the left (~380px wide), tabbed workspace on the right. The Lab tab contains existing Typography Lab + Color Lab. Other primary tabs are placeholders.

Before any code, give me a plan covering:

1. File structure — what components get created, what gets modified, what gets moved.
2. Layout approach — flex vs grid for the two-column split, and how the columns are sized.
3. ChatColumn structure — header, message list with placeholder messages, chat input. All styled but not functional.
4. TabsPanel structure:
   - Primary tab bar at the top showing 4 tabs: Lab, Records, Chat, Settings
   - Tab state managed via useState (not URL routing — that's overkill for now)
   - Active tab visually distinct (underline, background tint, or something using ember accent)
   - Tab content area that renders the active tab's content
   - Lab tab renders TypographyLab + ColorLab inside it
   - Other tabs show a centered "Coming soon" placeholder
5. Overall page layout — no more scrolling on App.tsx itself; the only scrolling happens inside the Lab tab's content area
6. Responsive considerations — for now, assume desktop-only (1024px+). Mobile is a later chapter.

Design direction:
- Chat column should feel like the Eidrix chat: warm obsidian background, slight visual separation from the tabs area (subtle border or contrast), chat input with ember accent on focus
- Tab bar should feel like premium product nav — not generic bootstrap tabs. Active tab clearly marked.
- Use all existing design tokens. No hardcoded colors or sizes.
- The frontend-design skill should push us toward distinctive, not generic. Trust its instincts on specifics.

Placeholder chat messages (for the ChatColumn, to show the visual pattern):
- Message 1: from "assistant" (Eidrix): "Hey! This is the Eidrix chat. It's not wired up yet — that comes later in the curriculum."
- Message 2: from "user": "Got it. Just getting the shape right."
- Message 3: from "assistant": "Exactly. See you in Chapter 11."

Don't write code yet. Wait for my approval.
```

---

## Step 4 — Review the plan carefully

Because this chapter affects so much of the app structure, review the plan with extra care. Check:

- **File structure makes sense?** You should expect at minimum: new `ChatColumn.tsx`, new `TabsPanel.tsx`, modified `App.tsx`. Existing `TypographyLab.tsx` and `ColorLab.tsx` should NOT be moved or modified — they just get rendered inside the Lab tab.
- **Is it using flex for the two-column split?** Flex is the right choice here. If it proposes grid or something complex, ask why.
- **Is tab state implemented with useState?** Don't let Claude Code reach for React Router or a global state library for four simple tabs. That's overkill for Chapter 6.
- **Does the plan describe the visual distinction between active and inactive tabs?** It should. If it's vague, ask for specifics.
- **Placeholder messages look right?** These are easy to miss. Make sure the voice matches (friendly, meta, acknowledging the unfinished state).
- **Is the design leaning distinctive?** If the proposed visuals sound like generic Bootstrap tabs, push back: *"Make the tab bar feel more deliberate and premium — not generic."*

When the plan looks solid:

```
Plan approved. Let's build it.
```

Or redirect specifically if not.

---

## Step 5 — Let Claude Code build

This will take a minute — it's creating 2 new files and restructuring App.tsx. The dev server will probably flash a few times as files come in.

When the rebuild finishes, look at your browser. You should see:

- Left column: a chat panel with 3 placeholder messages and an input box at the bottom
- Right column: tab bar at the top showing 4 tabs
- Lab tab active by default, showing Typography Lab + Color Lab below the tab bar
- Clicking other tabs shows "Coming soon"

**This is the moment.** First time your app looks like an actual product instead of a page. Sit with it for a second. Notice the shape.

---

## Step 6 — Iterate on the shell

This is the most important iteration pass of the curriculum so far. Things to look at critically:

**The two-column split:**
- Does the chat column feel the right width? Too narrow, messages get cramped. Too wide, tabs area feels squeezed.
- Is there a clear visual break between columns? Subtle border, background shift — something to make them feel like distinct zones.

**The chat column:**
- Header feels intentional or slapped on?
- Message styling — does it feel like a real chat? Assistant messages vs user messages visually distinct?
- The input at the bottom — is it grounded (feels like it belongs there) or floating (feels disconnected)?

**The tab bar:**
- Active tab obviously different from inactive tabs?
- Tab names readable, not cramped?
- Does the bar feel premium or generic?

**The tab content area:**
- When you click "Records" or "Chat" or "Settings," does the "Coming soon" message feel intentional or placeholder-ugly?
- Lab tab content — does it feel good living inside the tab now, or does it feel squeezed?

**Iterate with specific prompts:**

```
The chat column feels too narrow — maybe bump it to 420px. Also the border between columns is too harsh — make it more subtle, maybe a 1px obsidian-800 border instead of a full divider.
```

```
The active tab isn't distinct enough — it should be obvious at a glance which one I'm on. Try adding an ember underline or a stronger background contrast.
```

```
The "Coming soon" placeholder on inactive tabs looks lazy. Make it centered, muted, with a brief subtitle like "This tab will be built in a later chapter" so it feels intentional.
```

Iterate until every part feels like it belongs in a real product.

---

## Step 7 — Commit with PROGRESS.md checkoff

When you're happy:

```
I'm happy with the shell. Check off Chapter 6 in curriculum/PROGRESS.md and advance "Currently on" to Chapter 7 as part of the same commit. Then push, open a PR, and give me the link.
```

---

## Step 8 — Review the diff

Expected files:

- `src/App.tsx` — significantly restructured, now renders `<ChatColumn />` and `<TabsPanel />` in a flex row
- `src/components/ChatColumn.tsx` — new file
- `src/components/TabsPanel.tsx` — new file
- `curriculum/PROGRESS.md` — Chapter 6 checked off

**Things to check:**

- `App.tsx` is simpler than it was, not more complex. If it's bloated, something went wrong.
- `ChatColumn.tsx` uses design tokens throughout — no hardcoded colors.
- `TabsPanel.tsx` implements tabs cleanly — should be pretty readable even if the pattern is new.
- TypographyLab and ColorLab files should NOT appear in the diff. They weren't modified — just rendered inside the Lab tab.
- No surprise files. This should be a clean 4-file PR.

If it looks good:

```
PR looks good. Merge it into main.
```

---

## Step 9 — Clean up

```
Switch back to main, pull, delete the feature branch locally and on GitHub. Confirm we're clean.
```

---

## What just happened

You just transformed your app from a page into a product. Real Eidrix has this exact shape — chat on the left, tabs on the right. Every customer's workspace in Eidrix will use this shell. You just built a tiny version of it.

More importantly, you now have an **architectural backbone**. Everything from here on slots into the shell:

- Chapter 7 (Reading Code) → you'll poke around the shell you just built
- Chapter 8 (Components Lab) → new Lab section inside the Lab tab
- Chapter 9 (Motion Lab) → same, another Lab section
- Chapter 10 (Fake Data) → populate the Records tab
- Chapter 11 (Fake Chat UI) → make the chat column functional (fake responses)
- Chapter 12 (Environment Variables) → prep for real backend
- Chapter 13 (Supabase) → wire Records tab to a real database
- Chapter 14 (Real AI Chat) → wire the chat column to a real model

The shell doesn't change much from here. The content inside it does.

---

## What success looks like

- App is two columns: chat on the left, tabs on the right
- Chat column has a header, 3 placeholder messages, and an input at the bottom (not functional — visual only)
- Tab bar has 4 primary tabs: Lab, Records, Chat, Settings
- Lab tab is active by default and renders Typography Lab + Color Lab
- Other tabs show a styled "Coming soon" placeholder
- Clicking a tab changes the content — no page reload
- Everything uses design tokens — no hardcoded colors
- The whole thing feels like a premium product, not a generic React starter
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"The tabs don't switch when I click them"** — probably a state wiring issue. Tell Claude Code: *"Clicking tabs doesn't change the content. Help me debug the tab state logic."*
- **"My Typography Lab and Color Lab disappeared"** — they need to be rendered inside the Lab tab. Tell Claude Code: *"TypographyLab and ColorLab aren't showing up. Make sure they're rendered inside the Lab tab's content area."*
- **"The chat column is overlapping the tabs area"** — flex setup issue. Tell Claude Code: *"The layout is broken — chat column and tabs area are overlapping. Fix the flex layout so they sit side by side cleanly."*
- **"The layout works but looks generic"** — push back on design: *"The layout works but feels like a basic React starter. Make the shell feel more deliberate — stronger visual distinction between columns, a more premium tab bar, more intentional chat styling."*

---

## Tour Moment — State in React

You just used React state for the first time (the tab switching). The `useState` hook is one of the most important things in React. Quick mental model:

- A component can "remember" values between renders
- When a remembered value changes, the component re-renders to show the new state
- `const [activeTab, setActiveTab] = useState('lab')` means: "remember the current tab, let me update it when the user clicks something"
- When someone clicks the Records tab, `setActiveTab('records')` runs, React re-renders, and the content area shows the Records tab's content

You'll use `useState` constantly from here on. Forms, toggles, modals, counters, selection — all state. This is the fundamental React pattern, and you just used it in a real way for the first time.

---

## Tour Moment — The mental model of "shell vs content"

Every app has two layers:
- **Shell** = the stuff that persists. Navigation, header, sidebar, chat column.
- **Content** = the stuff that changes. The current page, the current tab's body, the open modal.

Good apps make this separation clear. Bad apps mix them up, which is why you sometimes see websites where the nav disappears or jumps around when you click things.

Your app now has clean shell/content separation:
- Shell: ChatColumn + TabsPanel (bar)
- Content: whatever's inside the active tab

This is the pattern Gmail uses. Notion uses. Linear uses. Every Eidrix customer's workspace will use. You just joined the club.

---

## Next up

**Chapter 7 — Reading Code.** Now that your app has real structure, we pause and do a "code tour." You'll learn how to open a file you didn't write and understand what's going on. This is a skill nobody teaches but everybody needs. Short chapter, no new features — just a deliberate walk-through of your own codebase.
