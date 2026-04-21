# Chapter 10 — Fake Data & Forms

*Main Track chapter. The Records tab is currently an empty placeholder. By the end of this chapter, it's a working customer management surface — a table of fake customers, a slide-in form panel for adding and editing, localStorage persistence, undo-able deletes. This is the foundation chapter for every future chapter that touches user data: Chapter 13 (Supabase) swaps the backend, AC-02 feeds these records to the agent, AC-03 gives the agent permission to manipulate them, AC-11 polishes the UX. About 3 hours. Build chapter — the widest single chapter in the curriculum so far.*

---

## What you're learning

1. **CRUD patterns** — Create / Read / Update / Delete, the four operations every data-driven app needs
2. **Local state management** — holding a list of records in one place, reading from anywhere, writing with intention
3. **localStorage persistence** — surviving page refresh, the pattern that's 80% of what most apps need before a real backend
4. **Form UX that doesn't suck** — validation, error states, keyboard-friendly, cancel without losing work
5. **Slide-in panels** — the Linear/Superhuman/Notion pattern for secondary UI surfaces
6. **Empty states** — what the app shows when there's nothing to show (often the most-neglected UI in any app)
7. **Undo-able destructive actions** — the one UX pattern that separates professional apps from amateur ones

---

## What you're building

The Records tab transforms from "Coming soon" placeholder into a real customer management surface:

- **Data layer** — a typed Customer record, a store that persists to localStorage, helper functions for CRUD
- **Customer table** — a scrollable list of customers with relevant columns (name, status, contact, last activity)
- **Slide-in form panel** — triggered by "Add Customer" or by clicking a row to edit. Slides in from the right, Linear-style. Uses your existing Input, Button, and Badge components from Chapter 8.
- **Delete with undo** — destructive actions don't just delete. They delete *then offer 5 seconds to undo* via a toast-style notification.
- **Empty state** — when there are zero customers, the table shows a deliberate, designed empty state, not a blank space
- **Seed data** — on first load, the app populates 12 fake customers so you immediately have something to work with

By the end, you've got a working customer list with full CRUD, real persistence, and professional-feeling interactions.

---

## Plain English glossary

- **CRUD** — Create, Read, Update, Delete. The four operations every data-driven app does.
- **Store** — the centralized place where app data lives. In this chapter, we're doing a simple store with React state + localStorage. Later chapters may upgrade to Zustand, Redux, or just Supabase queries.
- **localStorage** — browser-native key-value storage that persists across page reloads and tab closes. Max ~5MB, string-only (we'll serialize with JSON).
- **Seed data** — initial fake data the app creates on first load so the app doesn't start empty. Users see something immediately.
- **Optimistic update** — updating the UI immediately on user action, assuming the operation will succeed, rather than waiting for confirmation. We won't fully implement this in Chapter 10 (AC-11 covers it), but we'll set up the pattern.
- **Empty state** — the designed UI that appears when there's no data to display. A blank table is amateur; a thoughtful "no customers yet, here's how to add one" is professional.
- **Destructive action** — any action the user can't easily reverse. Delete is the classic one. Professional apps make these undo-able.

---

## Why this chapter matters

Three reasons:

**1. It's the first chapter where your app holds something the user cares about.** Everything before this either had no data or throwaway placeholder data. A user can spend 20 minutes building up a customer list in Trial and Error now, and the app is responsible for not losing it. That responsibility changes how you think about every interaction.

**2. The patterns in this chapter show up in every future chapter.** Chapter 13 replaces localStorage with Supabase — same UI, different backend. AC-02 injects the customer list into the agent's context. AC-03 gives the agent CRUD tools over these records. AC-11 applies optimistic-UI polish on top. Chapter 10 is the scaffold everything else hangs on.

**3. Real apps live or die on CRUD feel.** Add-record, edit-record, delete-record-with-undo — that's 60% of the interactions in any business app. If your customers hit "Add" and the form is awkward, they'll remember. If they accidentally delete a row and can't undo it, they'll rage. Professional CRUD UX is invisible; amateur CRUD UX is a feature they hate.

---

## The plan, in plain English

1. **Start clean, create branch**
2. **Thorough Plan** — data layer, form panel, table, empty state, undo system. Lots of moving parts.
3. **Build the data layer first** — Customer type, store, seed data, localStorage persistence
4. **Build the customer table** — in the Records tab
5. **Build the slide-in form panel**
6. **Wire up add/edit/delete flows**
7. **Build the undo-toast for delete**
8. **Build the empty state**
9. **Iterate on feel**
10. **Code-simplifier review**
11. **Ship**

---

## Step 1 — Start clean and branch

```
Starting Chapter 10 — Fake Data & Forms. Rhythm check, then create branch feature/chapter-10-content. Read CLAUDE.md, PROGRESS.md, and CURRICULUM_DESIGN.md before planning.
```

---

## Step 2 — Ask for the Thorough Plan

```
Chapter 10 turns the Records tab into a working customer management surface with full CRUD, localStorage persistence, slide-in form panels, and undo-able deletes. This is the foundation chapter for every future data chapter.

Thorough-plan this before writing code. Cover:

**The Customer type.** Propose a TypeScript interface matching real-Eidrix-style fields — name, status, contact info, timestamps, bids/jobs count, whatever makes sense. Ground this in the Eidrix app I've been describing (contractors/cleaners/landscapers). This type becomes the shape for Supabase in Chapter 13, so get it right.

**The data store.** How state is managed, how localStorage is read on load and written on every change, how components subscribe to changes, how seed data gets populated on first load.

**The customer table.** Which columns, how they sort (if at all), how rows feel on hover, what clicking a row does (opens edit panel).

**The slide-in form panel.** One component that handles both Add and Edit (different title/button but same shape). Slides from the right. Uses existing Input, Button, Badge components. Form validation — which fields required, how errors display.

**The delete + undo pattern.** Delete removes from the list but holds the record for 5 seconds with a toast offering undo. After 5 seconds, actually-deleted. If undo is clicked, restore.

**The empty state.** Designed, not blank. Includes a clear CTA to add the first customer.

**Seed data.** 12 fake customers, varied statuses and names, realistic data. Populated only on first load (if localStorage is empty), never overwrites existing data.

**Architecture questions I want answered:**
- Zustand, jotai, React Context, or just useState in the TabsPanel? Pick one and defend it.
- Where does the slide-in panel mount? App level (so it's above everything) or inside Records tab (scoped)?
- How is the undo system structured? A separate toast system or baked into the store?
- How do form changes get validated — on every keystroke, on blur, on submit?

**Flag anything that might tangle with AC-08a's Brand tab or the cursor-tracking Eye.** The Eye follows the cursor; the slide-in panel is new UI. Make sure they play nice.

Plan, don't build. Wait for approval.
```

---

## Step 3 — Review the plan

Trust Claude Code's proposal, push back on anything that feels off. Specific things worth verifying:

- **Customer type is realistic for Eidrix.** If the fields feel generic or incomplete, push. The goal is "when you port this to real Eidrix, the schema is already right."
- **State management choice has a real defense.** Don't accept "because it's simple" — every option is simple for 12 records. Why is this the right foundation when you have 500 records in real Eidrix?
- **Undo toast is architecturally sound.** It should work even if the user deletes a second record before the first undo expires. Ask how that's handled.
- **Seed data runs exactly once.** If localStorage is empty, seed. If localStorage has *any* customers, don't touch it. Easy to get this wrong and accidentally overwrite real data on every load.

Approve when solid.

---

## Step 4 — Build the data layer first

```
Plan approved. Start with the data layer only — Customer type, store, seed data logic, localStorage wiring, helper functions (add/update/delete/undoDelete). No UI yet. Stop and show me before building the table.
```

When it stops, verify in the browser console that you can call the store methods and see data change. This is the foundation — confirm it works before building UI on top.

---

## Step 5 — Build the customer table

```
Foundation looks good. Build the customer table in the Records tab. Render all seed data. Hover states, row click opens edit (but the edit panel doesn't exist yet, so clicking a row can log to console for now). Stop before the slide-in panel.
```

Check the table in the browser. Design should feel consistent with the rest of the app — obsidian backgrounds, ember accents, warm whites. If it feels generic, iterate before moving on.

---

## Step 6 — Build the slide-in form panel

```
Table looks right. Build the slide-in form panel. Slides in from the right when Add Customer is clicked or a row is clicked for edit. Uses existing Input and Button components. Validates required fields. Cancel discards changes; Save commits via the store. Animation is Framer Motion — smooth, Eidrix-tempo (slower-than-average, confident).
```

Test thoroughly: Add new customer, edit existing customer, cancel without losing work, try to save with missing required fields (validation should catch it).

---

## Step 7 — Build the delete + undo toast

```
Forms work. Add the delete + undo pattern. Each row has a delete action (icon button, maybe). Clicking it removes the record from the table AND triggers a toast at the bottom of the screen: "Customer deleted · Undo". Toast auto-dismisses after 5 seconds, at which point the record is truly gone. Clicking Undo restores the record to its position in the list.

The toast itself should feel quiet, not alarming. Uses Badge or Card components. Slides up from the bottom.
```

Test: delete a row, undo before the timer ends (record restored). Delete a row, wait 5 seconds, try to undo (no longer possible, record gone). Delete two rows in quick succession (should queue or replace cleanly — find out which feels right).

---

## Step 8 — Build the empty state

```
Delete + undo works. Now the empty state. When there are zero customers (user deleted them all, for instance), the table area shows a designed empty state, not a blank space. Includes a gentle header, one sentence of guidance, and a prominent "Add your first customer" button. Matches the rest of the app's aesthetic — warm obsidian, ember accent, confident typography.

Test it by deleting all seed data from localStorage and refreshing.
```

---

## Step 9 — Iterate on feel

This is the long step. Spend real time making the Records tab feel like a premium product, not a CRUD demo.

**The feel checklist:**

- **Adding a customer** — does the panel open smoothly? Does saving feel decisive? Does the new row appear where you expect it?
- **Editing a customer** — does clicking a row feel responsive? Is the edit panel identical in layout to add (it should be)? Is Cancel clearly distinct from Save?
- **Deleting a customer** — does the toast feel friendly or alarming? Can you undo without fumbling? Does it land at the right screen position?
- **Empty state** — does it feel like a designed moment, or like a default Bootstrap page?
- **Keyboard** — can you tab through the form? Does Enter submit? Does Escape close the panel?
- **Validation errors** — do they feel like helpful feedback or like the app yelling at you?

**Common iterations:**

```
The slide-in panel snaps in too fast — feels jarring. Slow it down to ~400ms with a gentler easing. Match the Eidrix tempo from Motion Lab.
```

```
The delete icon is too prominent. Make it appear only on row hover, and use a muted color by default that reddens on hover.
```

```
The undo toast is too loud — feels like an alert. Make it quieter: smaller text, lower prominence, longer readable duration.
```

```
The empty state feels like a placeholder. Push it — add a subtle illustration, better typography hierarchy, make it feel like a deliberate moment in the app.
```

---

## Step 10 — Code-simplifier review

```
Chapter 10 is live. Have code-simplifier review the new data layer, table, form panel, and toast system. Report suggestions, don't auto-apply.
```

Be cautious about suggestions that over-abstract the form panel — forms that handle multiple entity types often go sideways fast. Fine to keep it Customer-specific.

---

## Step 11 — Ship

```
Ready to ship. Commit, check off Chapter 10 in PROGRESS.md in the same commit, push, open PR.
```

Review the diff. Expected files: `src/types/customer.ts`, `src/lib/customerStore.ts`, `src/components/records/CustomerTable.tsx`, `src/components/records/CustomerForm.tsx`, `src/components/records/UndoToast.tsx`, `src/components/records/EmptyState.tsx` (or similar organization), plus `src/components/TabsPanel.tsx` modification.

Merge, clean up.

---

## What just happened

Your app can now hold data that matters. Close the browser tab, reopen it, your customers are still there. Add a customer, edit it, delete it, undo the delete — all the core data operations every real app supports.

More importantly: you built **the foundation every future chapter depends on**:

- **Chapter 13** swaps localStorage for Supabase. The UI doesn't change — only the store implementation does.
- **Chapter 14** adds file uploads to customer records. Same form panel, one new field type.
- **AC-01 (Streaming Chat)** has the Eidrix chat access to the records list, so it can reference customers by name.
- **AC-02 (Context-Aware Chat)** injects the current record list into every AI message.
- **AC-03 (Tool Calling)** gives the agent permission to CREATE / UPDATE / DELETE these records via natural language. "Add John Smith at 555-1234" → new row appears.
- **AC-11 (Optimistic UI)** applies polish to the save/delete animations you just built.
- **AC-12 (Fuzzy Search)** adds search across the customer list.
- **AC-13 (Real-Time Presence)** shows which customers are being edited by other users.

Chapter 10 is the trunk; every future chapter is a branch.

---

## What success looks like

- Records tab shows a working customer table with 12 seed customers on first load
- Add Customer button opens a slide-in panel from the right
- Clicking a row opens the same panel in edit mode, pre-filled with that customer's data
- Form validation catches required-field errors before save
- Save commits to the store and closes the panel
- Cancel discards changes without committing
- Delete triggers an undo-toast; undo restores the record, ignore lets it truly delete after 5s
- Deleting all customers shows a designed empty state with "Add your first customer" CTA
- All data persists across page reloads via localStorage
- Keyboard navigation works — tab through form, Enter submits, Escape cancels
- Every interaction feels premium, not tutorial-grade
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"Data disappears on refresh"** — localStorage isn't wired correctly. Tell Claude Code: *"Customer data doesn't persist on refresh. Debug the localStorage read/write cycle."*
- **"Seed data overwrites my edits every refresh"** — seed logic runs unconditionally. Tell Claude Code: *"The seed data is overwriting real customer data on every page load. Seed should only run when localStorage is empty."*
- **"Slide-in panel feels laggy"** — likely too many re-renders. Tell Claude Code: *"The form panel feels slow. Debug whether every keystroke is re-rendering the entire table."*
- **"Undo toast doesn't show up"** — state management issue between delete and toast. Tell Claude Code: *"Delete removes the record but no toast appears. Debug the toast trigger chain."*
- **"Empty state shows briefly before data loads"** — initial render issue. Tell Claude Code: *"Empty state flashes on every page load before seed data loads. Fix the initial-load sequence so empty state only shows when there are truly zero records."*
- **"Two quick deletes break the undo system"** — toast queue isn't handled. Tell Claude Code: *"Deleting two records quickly breaks undo. Handle the case where multiple deletes queue their toasts or replace each other."*
- **"The Eye's cursor tracking interferes with the form"** — AC-08a interaction. Tell Claude Code: *"The cursor-tracking Eye feels distracting when I'm filling out the form. Maybe the Eye should pause cursor tracking when a form panel is open, or tracking feels fine actually. Try pausing and see which feels better."*

---

## Tour Moment — The persistence tradeoff

You just chose localStorage instead of a real database for this chapter. That's a deliberate architectural choice, not laziness. Here's the mental model:

**localStorage is great for:**
- Single-user data (your own customer list)
- Small datasets (under 5MB)
- Prototyping and learning
- Preferences, drafts, recent searches

**localStorage is bad for:**
- Multi-device sync (your phone won't see what you added on your laptop)
- Multi-user apps (your coworker can't see your customers)
- Large datasets (hit 5MB and you're stuck)
- Anything that must survive a browser cache clear

Real Eidrix hits every "bad for" case — it's multi-user (you + your team), multi-device (office laptop + phone on-site), and potentially has thousands of customers per tenant. So Chapter 13 upgrades to Supabase, which solves all of those while keeping the same UI.

The pattern: **start with localStorage, upgrade to a real backend once you've proven the UI**. Most apps rush to a database too early, waste weeks on backend decisions, then find out the UI is wrong. Going localStorage-first means you only spend backend time once you know what the data needs to look like.

---

## Tour Moment — The undo pattern (and why amateurs skip it)

You just built undo-for-delete. This is the single UX pattern that most often separates professional apps from amateur ones.

The amateur version: "Are you sure? [Yes] [Cancel]" modal on every destructive action.

The professional version: perform the action immediately, then offer undo for a few seconds.

Why the second is better:
- **Modal confirmations train users to click "Yes" without reading.** They're friction, not safety.
- **Undo is actually reversible.** Confirmations claim to prevent mistakes but don't fix them once they happen.
- **Undo feels respectful.** The app trusts you to know what you meant, but has your back if you didn't.

Linear does this. Superhuman does this. Gmail does this. Every premium productivity app does this. Most SaaS admin panels don't — they're full of "Are you sure?" modals that train users to hate the app.

Steal this pattern for every destructive action in real Eidrix. Delete customers, delete invoices, cancel jobs, archive records — all of them should be immediate-with-undo, not modal-confirmed.

---

## Tour Moment — Forms that don't suck

The slide-in form panel you just built seems simple, but it's doing a lot of quiet work:

- **Required field validation** without looking aggressive
- **Save commits and closes** (one action, not two)
- **Cancel discards without nagging** ("Are you sure you want to discard?" is amateur — if they clicked Cancel, they want to discard)
- **Escape closes** (keyboard-friendly)
- **Same component handles Add and Edit** (write once, use twice)
- **Error states inline, not alert-style** (helpful, not punishing)

Most form UX failures come from missing one of these. Your form hits all of them. Steal this structure for every future form in real Eidrix.

One specific pattern worth naming: **don't show validation errors until the user has tried to submit once.** If someone starts typing their email and you show "Invalid email" after the second character, you're being annoying. Wait until submit, then show errors. After submit, show errors live (so they can fix them without submitting again). This is the Gmail/Linear pattern.

---

## Next up

**Chapter 10.5 — The Record-Detail Tab Pattern.** Same data, different pattern. Clicking a customer row opens them as a *third-tier tab* (Records → [Customer Name]), editable in place rather than in a slide-in panel. This is the real-Eidrix pattern — tab-based record detail — and you'll build it on top of the data layer you just finished. Short chapter, ~90 minutes. You'll get a direct side-by-side comparison between slide-in and tab-detail patterns, and after using both you'll know which one feels right for real Eidrix.

Or, if you want a breather after Chapter 10: **AC-11 — Optimistic UI & Loading States** polishes everything you just built. Save indicators, loading skeletons, smooth transitions, error states. Pairs beautifully with fresh CRUD work.

My lean: do Chapter 10.5 while the code is still hot in your head. But 10 alone is legitimately done — not a partial chapter.
