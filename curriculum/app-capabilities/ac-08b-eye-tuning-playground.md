# AC-08b — The Eidrix Eye Tuning Playground

*App Capability. The companion to AC-08a. You built the Eye; now you build the instrument that lets you tune every parameter of its personality via live UI — same spirit as Motion Lab v2. Presets, live sliders per layer, live TypeScript config export, side-by-side multi-size preview. About 3 hours. Your Brand tab transforms from "demo with dev controls" into a real design instrument.*

---

## What you're learning

1. **Tuning UIs as first-class infrastructure** — building an instrument, not a showcase
2. **Config-driven components under pressure** — the payoff for extracting every magic number in AC-08a
3. **Preset systems with state management** — named configurations that can be loaded, tweaked, saved
4. **Live code export patterns** — generating TypeScript from UI state for copy-paste into production
5. **Experimentation design** — when a playground encourages exploration vs. when it overwhelms the user

---

## What you're building

Your Brand tab (currently: Eye demo with basic dev controls) becomes a full Eye Tuning Playground:

- **Preset bar at top** — Eidrix (your AC-08a defaults) / Calm / Alert / Focused / Custom. One click swaps every parameter. Pick up where you left off last session.
- **Live sliders grouped by layer** — breath, blinks, look-around, cursor tracking, state modifiers, reactions, expression tinting. Every tunable value from `eye-config.ts` has a control.
- **State switcher + reaction triggers** — keep what you already have in the dev panel, upgrade the styling.
- **Side-by-side preview** — three Eyes at 24px / 64px / 240px rendered simultaneously, all driven by the same live config. Watch scaling behavior in real time.
- **Live TypeScript export panel** — shows your current config as valid TypeScript, with a Copy button. Flash "✓ Copied" on click. Same pattern as Motion Lab v2's code panels.
- **Save custom preset** — give a config a name, save it to the preset bar alongside the defaults.

The goal: after AC-08b ships, you can dial in the exact Eye feel you want for any Eidrix deployment, export the config, and paste it straight into real Eidrix. Weeks of design work compressed into a single tab.

---

## Plain English glossary

- **Tuning UI / Instrument** — an interface for dialing in parameters, versus a showcase interface for displaying results. Motion Lab v2 is an instrument; Typography Lab is a showcase.
- **Preset** — a named snapshot of all parameters. "Eidrix preset" is the AC-08a defaults. "Calm preset" slows everything. You can add your own.
- **Custom tuning** — the state when you've modified a preset. The preset indicator switches to "Custom" the moment any slider moves, same as Motion Lab v2.
- **Live export** — UI code panels that update as you tune, showing valid copy-paste-ready TypeScript for your current values.

---

## Why this chapter matters

Three reasons:

**1. You finally have full creative control of your signature mark.** After AC-08b, every parameter of the Eye is dialable via UI. No more editing config files, no more hot-reloading to test a value. Real-time tuning lets you find feels you'd never discover through code editing alone — you'll accidentally stumble onto combinations that are better than anything you'd have planned.

**2. This is the instrument you'll use forever.** Real Eidrix will have multiple Eye contexts someday — the chat Eye, the login screen Eye, maybe a different Eye for the customer portal, maybe custom-tenant Eyes. Every one of those is a config export from this tab. You don't build them from scratch; you tune and copy.

**3. The tuning-UI pattern transfers.** The instrument you build here is the same shape as Motion Lab v2. Any future component worth tuning (future mascot if you add one, future animation systems, future per-tenant design tokens) gets its own instrument, same pattern. You'll know how to build one in your sleep.

---

## The plan, in plain English

1. **Start clean, create branch**
2. **Thorough Plan** — tuning UIs have lots of small parts; worth planning before code
3. **Build the sliders and state controls** — every config value exposed
4. **Build the preset system** — load, modify, save custom presets
5. **Build the side-by-side preview** — three Eyes, one config
6. **Build the live code export** — TypeScript output + copy button
7. **Replace the old dev controls** — clean swap in the Brand tab
8. **Iterate on the feel** — the instrument itself should feel polished, not engineering debug
9. **Code-simplifier review**
10. **PR, review, merge**

---

## Step 1 — Start clean and branch

```
Starting AC-08b — The Eidrix Eye Tuning Playground. Rhythm check, then create branch feature/ac-08b-eye-playground. Read CLAUDE.md, PROGRESS.md, CURRICULUM_DESIGN.md, and the existing AC-08a Eye component + eye-config.ts before planning.
```

---

## Step 2 — Ask for a plan

Trust Claude Code to plan this one. It knows the codebase, it knows Motion Lab v2's playground pattern, it knows the AC-08a Eye architecture.

```
AC-08b turns the Brand tab into the Eye Tuning Playground. Full instrument: preset bar, live sliders for every tunable value in eye-config.ts, state switcher, reaction triggers, three-size side-by-side preview, live TypeScript code export with copy button, and custom preset save. Same infrastructure pattern as Motion Lab v2.

Propose the plan. Cover the file structure, how you'll organize the control panels, how preset state will be managed, how the three preview Eyes will share a single live config, and the code-export format. Also flag anything in eye-config.ts that might need restructuring to be cleanly tunable — if AC-08a left any values in shapes that don't map well to sliders, say so now.

Include initial preset values for Calm / Alert / Focused. Ground them in what you know about the Eye's behavior from AC-08a, not generic guesses.

Don't write code until I approve.
```

Note what I did NOT do there: I didn't list every slider, I didn't dictate the layout, I didn't pre-define the preset values. Claude Code knows the config, knows Motion Lab v2, knows your taste (warm obsidian, ember accents, calm tempo). Let it propose something real and react to the proposal.

---

## Step 3 — Review the plan

Things I'd be checking, not exhaustively:

- **Preset state management.** How does "which preset is active" get tracked, and how does "Custom tuning" kick in when a slider moves? Same pattern as Motion Lab v2 should work.
- **Three-Eye preview architecture.** One config, three mounted Eyes at different sizes. Confirm they share state cleanly.
- **Code export format.** Output should be a valid TypeScript object you can literally paste into `eye-config.ts` in real Eidrix. Not pseudo-code.
- **Preset values for Calm / Alert / Focused.** Claude Code should propose real numbers grounded in the Eye's actual behavior, not placeholders. If they feel arbitrary, push back.
- **Custom preset save.** Where does it persist? localStorage is fine for now — noting this for clarity, not forcing it.

Approve when solid.

---

## Step 4 — Build

Let Claude Code build. Big chunk of UI construction. Expect a long run.

When it's done, open the Brand tab. Everything should be there — preset bar, sliders, three preview Eyes, code panel, save button.

---

## Step 5 — Use it (the long step)

Here's where the chapter earns its keep: **actually tune the Eye.** Spend real time in the playground. Click every preset. Drag every slider. Try weird combinations. Break it on purpose. Find feels you didn't know you wanted.

Things worth trying:
- Push every slider to max simultaneously. What breaks?
- Push every slider to min. Does the Eye still feel alive, or does it go flat?
- Try wildly asymmetric tunings — fast breath but slow blinks, intense cursor tracking but rare look-arounds. What's the feel?
- Load Calm. Then add just one Alert behavior (e.g., fast cursor tracking). Hybrid presets often feel best.
- Save 3–4 custom presets you actually like. Names matter — "Night mode," "Sunday morning," "Heads-down," whatever captures the vibe.

**The test that matters:** at the end of this step, are there one or two presets you'd actually ship to real Eidrix? If yes, you've succeeded. Note the values. You're going to paste them into real Eidrix one day.

If any slider feels pointless (no observable effect), or any tunable value is missing (you wanted to adjust something but couldn't), tell Claude Code. The instrument should respond to every control meaningfully and expose every value worth changing.

---

## Step 6 — Code-simplifier review

```
AC-08b is live. Have code-simplifier review the new playground files and any Eye config changes. Report suggestions but don't auto-apply.
```

Be skeptical of suggestions that consolidate the sliders into a generic "SliderGroup" abstraction — some repetition is fine when it keeps each slider's purpose readable.

---

## Step 7 — Ship

```
I'm happy with the playground. Commit, check off AC-08b in PROGRESS.md in the same commit, push, open PR, give me the link.
```

Review the diff, merge, clean up.

---

## What success looks like

- Brand tab is now a full Eye Tuning Playground, not a dev panel
- Every tunable value in eye-config.ts has a slider or control
- Preset bar includes Eidrix / Calm / Alert / Focused plus your custom saves
- Three Eyes render side-by-side at 24px / 64px / 240px, all driven by live config
- Live TypeScript code panel updates as you tune, Copy button flashes "✓ Copied"
- You've saved at least one custom preset that feels production-ready
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"Sliders update the preview Eye weirdly / laggy"** — probably too many re-renders. Tell Claude Code: *"Slider updates are laggy. Debug whether every slider change is triggering a full Eye remount instead of just updating the animated values."*
- **"One preset looks identical to another"** — the preset values aren't distinct enough. Tell Claude Code: *"Calm and Eidrix presets feel the same. Push the Calm values further from Eidrix — specifically [breath / look-around / whatever]."*
- **"The code export doesn't match what I see"** — state sync bug. Tell Claude Code: *"The exported TypeScript config doesn't match the live Eye's behavior. Debug the handoff between slider state and code output."*
- **"Custom preset save doesn't persist across page reload"** — localStorage not wired. Tell Claude Code: *"Saved presets disappear on refresh. Persist custom presets to localStorage."*
- **"The three-size preview doesn't actually show scaling differences"** — the Eye isn't size-responsive. Tell Claude Code: *"The three preview Eyes look identical except for size. Verify that size-dependent behaviors (layer degradation at 24px, etc.) are actually running."*

---

## Tour Moment — Instruments vs. showcases

You've now built two instruments: Motion Lab v2 and the Eye Tuning Playground. Worth naming what they have in common.

Both follow the same structure:
- **Presets at top** — named starting points
- **Live controls** grouped by logical sections
- **Side-by-side preview** showing the effect in context
- **Live code export** for copy-paste into production
- **Custom save** for capturing discoveries

This pattern is your template for any future design-system-adjacent tooling. Tunable typography, tunable spacing, tunable color ramps, tunable agent personalities — all the same instrument shape. When real Eidrix has per-tenant theming, the tenant admin's theming UI is literally this pattern applied to design tokens.

Instruments are force multipliers. An hour spent building one saves weeks of "edit the config file, refresh, squint, edit again."

---

## Tour Moment — The config-driven payoff

In AC-08a I told you that extracting every Eye parameter into `eye-config.ts` would make AC-08b trivial. How'd that prediction hold up?

If AC-08b felt like "build sliders that drive this config," the architecture paid off. If it felt like "refactor the Eye to be tunable, then build sliders," the architecture didn't pay off and I gave you bad advice.

For most chapters, config-driven is the right call specifically because future tuning is likely. The cost is small (some extra typing and interface definitions) and the payoff compounds (every future tuning chapter is cheaper). Keep this pattern in your pocket for real Eidrix — any component with values worth revisiting later should start config-driven from day one.

---

## Next up

**Back to main track: Chapter 10 — Fake Data & Forms.** You'll populate the Records tab (currently empty placeholder) with fake customer data, and build the form patterns for adding / editing / deleting records. This is the setup for Chapter 14 (Supabase Foundation) — you're building the UI first, wiring the real backend second. Same pattern every production app follows.

After Chapter 10: AC-11 (Optimistic UI & Loading States) pairs beautifully, since you'll finally have real data flows to apply optimistic updates to.
