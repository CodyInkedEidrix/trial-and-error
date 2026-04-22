# Chapter 10.5 — The Adaptable Three-Tier Tab Engine

*Main Track chapter. You built the Records tab in Chapter 10 with a slide-in form. This chapter rebuilds record detail as a **third-tier primary tab** — clicking a customer row opens them as a peer of Lab, Components, Records, etc. But the real work isn't the tab pattern. It's making the whole tab system **config-driven** — so swapping one file turns Trial and Error from a contractor workspace into a merch seller workspace, no other code changes. This is the architectural foundation for Eidrix-as-engine, not Eidrix-as-one-CRM. About 3.5 hours.*

---

## What you're learning

1. **The three-tier tab pattern** — primary → secondary → record-detail, the operational-workspace shape used nowhere else in commercial software
2. **Config-driven architecture** — the difference between "an app" and "an app engine." Same code, different configs, different products.
3. **The separation of structure from content** — the tab system doesn't know or care what a "Customer" is. It just renders whatever config hands it.
4. **Real-world adaptability proof** — by the end, you swap one import line and your contractor workspace becomes a merch seller workspace. Seeing that work is the pattern landing.
5. **Architectural foresight** — building the `BusinessConfig` contract that future chapters (Sunday Interview, per-tenant theming, tool calling over records) all consume

---

## What you're building

Two parallel things, shipped together:

**The engine**

A three-tier tab system driven by a typed `BusinessConfig` object. The engine:
- Reads `BusinessConfig.primaryTabs` and renders them as the top tab bar
- Each primary tab can have a `recordListConfig` (what a table of those records looks like) and a `recordDetailConfig` (what sections show up when one is opened)
- When a user clicks a record row, it opens as a new primary tab with the record's display name
- The record tab renders secondary tabs (Overview, Notes — or whatever the config specifies)
- Inside each secondary tab, the third-tier content renders

**Two configs that prove adaptability**

- `configs/contractor.ts` — the current Trial and Error shape. Primary tabs: Lab, Components, Records, Chat, Settings, Brand. Record type on Records tab: Customer. Customer detail sections: Overview, Notes.
- `configs/merch.ts` — a demonstrably different business shape. Primary tabs: Lab, Components, Products, Orders, Chat, Settings, Brand. Record type on Products tab: Product. Product detail sections: Overview, Variants, Inventory.

At the top of `App.tsx`, one import line chooses which config is active. Switching configs switches business types. Everything else stays the same.

---

## Why this chapter matters more than Chapter 10

Chapter 10 gave you working CRUD — add/edit/delete customers. That's necessary but not special. Every tutorial ships a CRUD app.

Chapter 10.5 gives you something most developers never see: **the engine that lets the same codebase be multiple products.** Linear is a Linear. Notion is a Notion. You're building the substrate that becomes a CRM for one customer and an inventory tool for the next, without rewriting anything.

This is the load-bearing architectural decision that determines whether Eidrix becomes "a CRM you sell to contractors" or "a platform small business owners configure to match their work." You told me yesterday you want the second one. This chapter is where that thesis becomes code.

Three concrete payoffs:

**1. Every conversation about Eidrix changes after this chapter.** When you talk to your merch guy Saturday, you have a working demo of the exact shape you're proposing to build for him. Not a mockup. Not a pitch. A live app configured for his business.

**2. The `BusinessConfig` type becomes the spec for every future Eidrix customization.** Per-tenant theming (Chapter 18's Registry Pattern), Sunday Interview onboarding, agentic tool calling over records (AC-03) — they all read from or write to this type.

**3. You prove the thesis to yourself.** Until you've seen the same codebase render as two different products, "adaptable engine" is a theory. After, it's a thing you've watched work on your screen.

---

## Plain English glossary

- **Config-driven** — app behavior is determined by data files (configs) rather than hardcoded logic. Change the data, change the behavior, no code changes.
- **BusinessConfig** — the typed object that describes a business's operational shape: which primary tabs exist, what records they contain, what sections each record has.
- **The engine** — the rendering layer that reads a BusinessConfig and produces the UI. Doesn't know what "Customer" or "Product" means — just knows how to render whatever config specifies.
- **Primary tab** — top-level navigation. For contractor: Customers, Jobs, Schedule. For merch: Products, Orders, Shipping. Different per business, but always the top-level entry points to work.
- **Secondary tab** — inside a primary tab, slices the data. For Customers: All, Leads, Active, Non-Active. Filtering and organizing views of the same data.
- **Third-tier / Record tab** — individual records opened as first-class primary tabs for deep work. "Al Schindler" sits next to "Customers" in the tab bar when opened. Closes with X.
- **Substrate** — the underlying shared infrastructure that multiple products are built on top of. The three-tier engine is Eidrix's substrate. Configs are the products built on it.

---

## The plan, in plain English

Because you're past the beginner-handholding phase, this plan skips some "what is a component" explanations and assumes you're tracking architecturally.

1. **Start clean, branch** — rhythm
2. **Thorough Plan from Claude Code** — define `BusinessConfig` type, design engine contract, plan both configs
3. **Build the types first** — `BusinessConfig`, supporting types, no implementation yet
4. **Build the contractor config** — extract current Trial and Error's primary tabs into a config file; nothing visually changes yet
5. **Refactor TabsPanel into the engine** — reads from config instead of hardcoded tabs
6. **Wire record-tab opening** — click a customer row → opens as new primary tab with `activeRecord` state
7. **Build the record detail engine** — reads `recordDetailConfig.sections`, renders secondary tabs, renders section content
8. **Build the merch config** — second config, Products/Orders/etc. Test the swap.
9. **Iterate on feel** — record-tab open animation, close animation, how squishing behaves when many tabs are open
10. **Code-simplifier review**
11. **Ship**

---

## Step 1 — Start clean, branch

```
Starting Chapter 10.5 — The Adaptable Three-Tier Tab Engine. Rhythm check, then create branch feature/chapter-10-5-build. Read CLAUDE.md, PROGRESS.md, CURRICULUM_DESIGN.md, and skim the existing TabsPanel.tsx and App.tsx for current tab architecture.
```

---

## Step 2 — Ask for the Thorough Plan

Big architectural chapter. Full Thorough treatment.

```
Chapter 10.5 rebuilds the tab system as a config-driven three-tier engine. Thorough-plan this.

Core idea: the tab system becomes data-driven. A BusinessConfig object describes the business shape (primary tabs, which ones hold records, what detail sections each record has). The tab engine reads that config and renders. Swapping configs swaps business types.

## What the engine does

- Reads BusinessConfig to render primary tabs
- If a primary tab has a recordListConfig, it shows a table of records for that tab
- Clicking a record row opens that record as a NEW primary tab (peer of the others, with the record's display name, closeable via X)
- Record tabs render secondary tabs from the config's recordDetailConfig.sections
- Each section renders its specified content

## What you propose

**The BusinessConfig type.** What fields, what shape. Think through: primary tab definitions, record-holding tabs (which tabs show a record list), record detail configuration (which sections, what they render).

**The engine architecture.** How TabsPanel changes. Is it still one component? Does it split? Where does the config get injected — context, prop-drilling, global import?

**Record-tab state management.** How the engine tracks which records are open. One record at a time for this chapter — opening a second one replaces the first. But design the state shape so multi-tab is a future enhancement, not a rewrite.

**The two configs.** Propose the full contractor config (matching current Trial and Error shape — Lab/Components/Records/Chat/Settings/Brand, with Records holding Customer detail) and a full merch config (Lab/Components/Products/Orders/Chat/Settings/Brand, with Products holding Product detail). Give me the actual TypeScript for both so I can see what the developer ergonomics feel like.

**The section rendering pattern.** Each section needs a name, a renderer. Overview renders the existing Customer form from Chapter 10. Notes renders a simple textarea. Variants/Inventory for merch can be stub components that just show "Variants for {productName}" — we're proving the engine, not building a full merch app.

## Architecture questions

1. How does the engine handle the fact that contractor's "Records" tab and merch's "Products" tab need different data stores (customerStore vs some hypothetical productStore)? Does the config reference the store, or does the engine resolve it?

2. When a record tab is open and the user switches back to the primary tab list, then back to the record — does the record tab stay? For this chapter, yes — it persists until explicitly closed. Confirm your plan handles this.

3. The existing Chapter 10 Records tab code — how much of it survives the refactor? Ideally the CustomerTable and CustomerForm stay as-is; the engine just orchestrates them. If major changes are needed, flag them.

4. The Eye, cursor tracking, Motion Lab tempo — all stays. The three-tier refactor is structural; the visual and motion language doesn't change.

5. prefers-reduced-motion — opening/closing record tabs should animate by default, respect reduced-motion preference.

## Edge cases

At least 5:
- User clicks same customer row twice in a row (already-open tab — focus it, don't open twice)
- User opens a customer, then opens a different customer (first one closes, second opens — with any unsaved Overview form edits, what happens?)
- User opens a customer, edits the Notes section, closes the tab, reopens the same customer (do the edits survive the close?)
- 10 record tabs hypothetically open (which won't happen this chapter but the tab bar needs to not break visually — if we're at 6 primary tabs + 1 record tab = 7 tabs, already tight)
- Config is malformed (missing required field) — graceful degradation or crash? Err toward graceful + a dev-mode console warning.

## What I'm NOT asking you to build

- Multi-tab stacking (deferred to real Eidrix)
- Chrome-style tab squishing (deferred)
- Cross-session tab persistence (deferred — AC-04 territory)
- Chat awareness of open record tab (deferred to AC-02)
- Real merch data/storage — merch config is a scaffold proving the engine. Renders empty Products table if no merch store exists, or uses a tiny hardcoded sample array.

Plan, don't build. Wait for approval.
```

---

## Step 3 — Review the plan carefully

Specific things worth verifying in the plan:

- **`BusinessConfig` is fully typed.** No `any`, no loose strings where union types belong. If the plan uses `string` for tab IDs, push for a more constrained type.
- **The engine genuinely doesn't know about Customers.** If Claude Code proposes conditional logic like `if (tab.recordType === 'Customer') { ... }`, that's a leak. The engine should only reference the config interface, never specific record types.
- **The section renderer pattern is clean.** Each section should be a pluggable component reference, not a switch statement in the engine. If the plan has a big `switch(section.type)` somewhere, that's the pattern breaking.
- **The merch config is actually different, not a color-swap.** Tabs should be different, record type should be different, sections should be different. If merch config looks suspiciously similar to contractor config, the test isn't rigorous enough.
- **Unsaved-changes handling for record close.** This is the trickiest UX question. Confirm the plan has an answer (even if the answer is "we don't support it yet, changes are immediate on save").

When the plan's solid:

```
Plan approved. Start with types + both configs — no engine implementation yet. Stop and show me the two config files before refactoring TabsPanel.
```

That intermediate stop matters. The two config files side-by-side are where the pattern either proves itself or feels contrived. See them before committing to the engine.

---

## Step 4 — Review the configs

When Claude Code shows you the two config files:

**The test:** can you read the contractor config and the merch config side-by-side and clearly see them as two different products? If they look nearly identical with just string swaps ("Customers" → "Products"), the abstraction is too thin. Push for richer differentiation — different sections per record type, different list column definitions, etc.

**The developer-ergonomics check:** imagine you're a developer handed just the contractor config file with no other context. Could you figure out what the app looks like from the config alone? If yes, the config is self-documenting (good). If no, the config is too abstract and needs inline comments or better field names.

If satisfied:

```
Configs look right. Build the engine — refactor TabsPanel to read from the active config, wire the contractor config as the current active one. Trial and Error should behave identically to before after the refactor. Stop before wiring record-tab opening.
```

---

## Step 5 — Verify the refactor didn't break anything

After the engine refactor, **open Trial and Error and check everything still works.** All current tabs render. Lab tab shows Typography/Color/Motion. Components tab shows primitives. Records tab shows the customer table. Brand tab shows the Eye. Chat column still present. Motion Lab sliders still work.

If anything is broken, fix it before moving on. Refactoring something this load-bearing without proving feature parity is how silent regressions happen.

When confirmed:

```
Engine refactor is clean — everything works as before. Now wire record-tab opening and the secondary-tab record detail rendering.
```

---

## Step 6 — The record-tab experience

This is the moment of truth. Click a customer row. A new primary tab should slide in next to the existing primary tabs, labeled with the customer's name. Click it. You should see the record detail with Overview and Notes secondary tabs. Overview shows the Customer form. Notes shows a notes field.

**Feel check:**
- Does the new tab appear with motion that matches your Eidrix tempo? Or does it snap in?
- Does clicking the X close it smoothly?
- Does clicking the customer's name in the tab bar focus it if already open, rather than reopening it?
- Does switching back to the Records tab still show the full customer list, with your open customer still selected in the tab bar?

---

## Step 7 — The merch swap (the moment)

Time to prove the engine.

```
Switch the active config from contractor to merch by changing the import in App.tsx. Keep Trial and Error's data stores intact — the merch config's Products tab can show an empty table or a small hardcoded sample. Confirm that swapping configs swaps the business type end-to-end: primary tabs change, Records becomes Products, clicking a product opens a product-detail tab with Variants and Inventory sections.
```

**This is the chapter's payoff moment.** Sit with it for a minute. The same codebase is now a merch seller's workspace. Not because we wrote merch code — because we configured it.

Swap back to contractor. Confirm nothing broke. Swap to merch. Confirm nothing broke. You just proved the engine works.

---

## Step 8 — Iterate on feel

Things worth polishing:

- **Tab bar spacing** at 6 primary + 1 record tab. Does it feel balanced? Squished?
- **Open animation** for the record tab. Does it slide in smoothly from the right?
- **Close animation.** Quick fade or slide? Match Eidrix tempo.
- **Focus behavior** when closing a record tab — does it return focus to the Records/Products tab, or the last primary tab visited?
- **The chat column** when many tabs are open — does it still feel balanced? The 380px chat column plus 6+ primary tabs might feel tight on smaller screens.

Iterate as usual.

---

## Step 9 — Code-simplifier review

```
Chapter 10.5 is live. Have code-simplifier review the new config files, the refactored engine, and the record-tab state management. Report suggestions, don't auto-apply.
```

Watch for:
- Over-abstraction suggestions in the engine (the config interface is already the abstraction; don't add more layers)
- Suggestions to collapse contractor and merch configs into one "generic business config" that's parametrized (this would defeat the entire point)

Accept cleanups within a single file. Skip anything that reduces the cleanness of the config/engine split.

---

## Step 10 — Ship

```
Ready to ship. Commit, check off Chapter 10.5 in PROGRESS.md in the same commit, push, open PR.
```

Review the diff. Expected files:
- `src/config/businessConfig.ts` — the `BusinessConfig` type and supporting types
- `src/config/contractor.ts` — contractor config
- `src/config/merch.ts` — merch config
- `src/components/engine/` — engine components (exact split per the plan)
- `src/components/TabsPanel.tsx` — significantly refactored, now config-driven
- `src/App.tsx` — imports active config
- `curriculum/PROGRESS.md` — Chapter 10.5 checked off

Plus potentially deleted or migrated files as the engine absorbs what TabsPanel used to do.

Merge, clean up.

---

## What just happened

You built the Eidrix engine.

That's not hyperbole. The three-tier engine you just shipped is the architectural core of every Eidrix variant you've been prototyping for months. The `BusinessConfig` type is now the spec every future "which business type is this deployment?" decision flows through. The Sunday Interview onboarding generates this type. Per-tenant customization modifies this type. Agentic tool calling reads this type to know what records exist.

When you have your conversation with the merch guy Saturday, you can literally open Trial and Error with the merch config active and say *"here, this is the shape. Products live here, orders live here, customer records open as third-tier tabs when you need them. Configurable, your workspace, your shape."*

You also just validated a product thesis that most founders spend years stumbling into. The idea that small business tooling should be *configurable substrate* rather than *per-industry products* is a real strategic insight. You've now got working code that proves the substrate can exist.

---

## What success looks like

- `BusinessConfig` type defined with no `any`, no loose stringly-typed IDs
- Contractor and merch configs in their own files, visibly different
- Engine renders correctly from either config
- Swapping the active config import changes the entire app's business shape
- Clicking a customer row opens them as a third-tier primary tab with Overview + Notes
- X or Escape closes the record tab
- Opening an already-open record focuses it rather than duplicating
- Nothing from Chapters 0–10 visibly breaks
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"Swapping configs doesn't actually change the app"** — the engine is reading hardcoded values somewhere. Tell Claude Code: *"Changing the config import doesn't change the app's primary tabs. Audit for hardcoded tab references and move them to read from the active config."*
- **"The merch config renders broken / missing components"** — stub renderers for merch-specific sections aren't in place. Tell Claude Code: *"Variants and Inventory sections render nothing / crash. Add minimal stub renderers that show 'Variants for {productName}' style placeholders."*
- **"Opening a customer tab then switching away loses state"** — record-tab state lifecycle bug. Tell Claude Code: *"Opening a customer tab, switching to Lab, then switching back to the customer shows blank. The record tab state isn't persisting while the tab exists. Fix the lifecycle."*
- **"Opening a second customer breaks the tab bar"** — one-at-a-time logic missing. Tell Claude Code: *"Opening a second customer opens a second record tab instead of replacing the first. Per the spec, opening a new record replaces the current one for this chapter."*
- **"Chapter 10 functionality regressed"** — engine refactor ate the Records tab behavior. Tell Claude Code: *"The customer CRUD from Chapter 10 is broken — adding/editing/deleting doesn't work through the engine. Restore feature parity."*

---

## Tour Moment — Config-driven as a design philosophy

You just did something that separates mid-level developers from architects: you extracted *what the app does* into data, and kept *how the app works* in code.

Most apps mix these. A React component has conditional logic: `if (businessType === 'contractor') renderContractorThing() else renderMerchThing()`. That works for two business types. It collapses at 20.

You did the opposite: the engine knows nothing about business types. It only knows about the config interface. The config knows nothing about rendering — it only describes shape. The business type is an emergent property of "which config is active."

This pattern has names in different contexts: *dependency injection* in OOP, *data-driven design* in game engines, *composition over conditionals* in functional programming. All the same idea. Push variance out to data; keep code uniform.

When you see an app with `if (tenantType === X)` scattered everywhere, you're looking at an architecture that didn't learn this pattern early. Your Eidrix, because you learned it now, won't have that problem.

---

## Tour Moment — Why configs should be typed

The `BusinessConfig` type you built isn't a nice-to-have. It's load-bearing.

Without it: a new business type gets added, someone fat-fingers a field name, the engine silently renders a broken workspace, a customer opens their dashboard and sees empty tabs. Hours of debugging.

With it: fat-fingering the field name is a TypeScript error at compile time. The engine never sees a malformed config. Errors surface at "someone wrote a config" time, not "a customer loaded the app" time.

This is especially important when the Sunday Interview eventually *generates* these configs from user answers. AI-generated configs will sometimes produce incorrect shapes. A well-typed `BusinessConfig` means the type system catches those before they reach a user.

Cost of typing the config: ~30 extra minutes of interface definitions. Payoff: forever.

---

## Tour Moment — When to configure vs. when to code

Now that you have the config/engine split, you'll face a new question constantly: *"Does this new feature belong in the engine, or in the config?"*

Rule of thumb:

- **If the feature is structural — how records work, how tabs behave, how state is managed — it belongs in the engine.** Engine changes affect every config.
- **If the feature is descriptive — what records exist, what sections a record has, what the tabs are called — it belongs in the config.** Config changes affect only that business type.

You'll get this wrong sometimes. Everyone does. When you notice an engine feature that only one business type actually uses, that's a signal to push it back into config. When you notice the same thing being configured across five business types, that's a signal to pull it into the engine.

The engine/config boundary is where your real architectural skill grows from here on.

---

## Next up

**Chapter 11 — Fake Chat UI.** Your chat column becomes interactive with hardcoded responses. Users can type, the Eidrix responds with canned messages, typing indicators fire, messages fade in with the motion language you dialed in at Chapter 9. This is the prep chapter for AC-01 (Streaming Chat Foundation) — we're building the UI first, wiring real AI second. Classic separation-of-concerns chapter.

Or: **AC-11 — Optimistic UI & Loading States.** Pairs beautifully with Chapter 10 + 10.5. Every data operation gets skeleton loaders, success toasts, smooth transitions. Short chapter, high polish payoff.

Or: **Chapter 12 — Deploy It.** You've built enough to deploy. Getting Trial and Error on a real URL is its own milestone.

Your call.
