# AC-08a — The Eidrix Eye

*App Capability. The signature chapter. You're building the Eidrix Eye — a living animated SVG component that breathes, blinks, looks around, expresses four states (Idle, Thinking, Speaking, Muted), and reacts to seven specific moments. It mounts small in your chat column header (always-on ambient presence) and large as a demo inside a new sixth tab called "Brand." About 4 hours across Thorough Planning, build, and iteration. The Eye you ship here is the real Eye — the component can move straight into real Eidrix unchanged.*

---

## What you're learning

1. **SVG component architecture** — building a programmatic, animated SVG where every element (iris, pupil, eyelid, glow, circuits) is independently animatable
2. **Layered animation systems** — running six independent animation loops simultaneously on the same component without them fighting each other
3. **State machines in React** — declarative state (idle/thinking/speaking/muted) driving declarative motion
4. **One-shot reactions over ambient motion** — interrupt a running animation layer briefly, then return to normal
5. **Config-driven components** — every timing, rate, amplitude, and color lives in a typed config object so the Eye is fully tunable (sets up AC-08b's tuning playground)
6. **Presence as brand** — the discipline of expressive-but-not-emotive motion

---

## What you're building

A single component, `<EidrixEye />`, that mounts in two places:

**Small mount — always-on ambient presence**
In the chat column header, at 24px. Always in Idle state. Breathes, blinks, occasionally glances around. Never stops. This is the "someone's working alongside you" feeling.

**Large mount — Brand tab demo**
In a new sixth primary tab called "Brand," at 240px. Includes a temporary dev-only control panel so you can cycle states (Idle/Thinking/Speaking/Muted) and trigger all seven reactions manually. This is where you iterate on feel before AC-08b builds the real tuning playground.

Plus: every timing, rate, and amplitude lives in a typed `eye-config.ts` file so AC-08b's tuning playground becomes "build sliders that drive this config" rather than "refactor the Eye."

---

## The six animation layers

Running simultaneously, additively, with independent timing. This is how professional interactive mascots are architected (Rive's state machine model) — not one big animation, but stacked layers each responsible for one behavior.

**Layer 1 — Ambient Breath** (always running)
A slow scale pulse on the iris: 1.00 → 1.02 → 1.00, roughly 4-second cycle. Never stops. Modulated by state (slower during Thinking, syncs with cadence during Speaking, barely perceptible during Muted).

**Layer 2 — Blinks** (always running, irregular timing)
Eyelid closes and opens in clusters, not metronomic. Base frequency 3–8 seconds between blinks. Occasional double-blinks (~15% of the time) and occasional long-blinks (~8% of the time, eye closed 400ms vs. normal 120ms). Irregularity is what separates "alive" from "mechanical."

**Layer 3 — Look Around** (idle and state-aware)
Every 8–20 seconds during Idle, the iris drifts to a new position — up-left, down-right, etc. — holds briefly, then returns to center. Spring physics with moderate damping. Can also be directed: when the chat input gets focused, the iris glances toward it. When a tool result appears, the iris briefly tracks to it.

**Layer 4 — State Expression** (driven by the `state` prop)
- **Idle** — base behavior, all other layers running naturally
- **Thinking** — iris contracts ~8%, circuit traces intensify and speed up, breath slows ~20%, blinks become more deliberate (longer hold). Reads as "focused inward."
- **Speaking** — iris pulses at ~0.6s intervals (pulse depth 3%), glow warms slightly, iris orients slightly outward. Reads as "alive and talking."
- **Muted** — entire Eye dims to ~40% opacity, breath slows to ~7 seconds per cycle, blinks stop, circuit traces fade. Reads unambiguously "off duty."

**Layer 5 — Reactions** (one-shot interrupts, triggered by the `reaction` prop)
Brief 0.6–1.5s animations that interrupt normal behavior, then return to the current state. All seven below.

**Layer 6 — Expression Tinting** (subtle, always running)
Warm ember glow shifts subtly based on state. Confident warm ember for Idle, slightly richer for Speaking, cooler (touches of cobalt) for Thinking, coolest desaturated for Uncertainty reactions. Never jarring — always within palette — color as a personality channel.

---

## The seven reactions

Each one is a short, purposeful interrupt. Form discipline: no faces, no smiles, no emoting — but push the iris, glow, and circuit language to the edge of what they can express.

1. **Greeting** — on app load or session start. Iris contracts then expands in a heartbeat rhythm (0.5s), glow ignites from 40% to 90% opacity across 600ms. "I'm here."

2. **Acknowledge** — user sends a message or does a significant action. Iris glances briefly toward the direction of the input (300ms), glow brightens 15% and settles. "Got it."

3. **Noticed** — something happens on screen the Eye should register without interrupting. Quick iris-flick toward the event (200ms), no glow change. Ambient awareness. "Saw that."

4. **Processing** — sustained focused state for longer operations (>2s work). Different texture than Thinking: iris holds fixed, circuits pulse rhythmically, glow has a slow inhale/exhale. Runs until the operation completes. "Working on it."

5. **Completion** — task or tool call finishes successfully. One soft deep breath (1s, breath depth to 5%), warmth shift in glow for 800ms, settles. "Done."

6. **Handoff** — Eye acknowledges a user action and hands back control. Iris centers deliberately, one slow blink, glow steadies. "Back to you."

7. **Uncertainty** — error, ambiguous input, or confusion moment. Glow cools toward cobalt for 800ms, iris contracts 8%, one deliberate blink, subtle iris tremor. "Let me reconsider."

---

## Plain English glossary

- **SVG** — Scalable Vector Graphics. An XML-based image format where every shape is defined by math, not pixels. Scales cleanly to any size. The Eye is one SVG composed of many `<path>` and `<circle>` elements.
- **Path** — an SVG shape defined by a sequence of draw commands. Used for the circuit traces and any non-circular shapes.
- **Circle** — an SVG shape with a center and radius. Used for the iris, pupil, glow halo, hot core.
- **Animation layer** — one independent animation running on one part of the Eye. Six layers run simultaneously without fighting because each targets different properties of different elements.
- **State machine** — a design pattern where the system is always in exactly one of several named states, and transitions between states are explicit. Four states: Idle, Thinking, Speaking, Muted.
- **One-shot** — an animation that plays once then ends, versus a loop that runs continuously. Reactions are one-shots.
- **Config-driven** — every tunable value (breath rate, blink interval, etc.) is imported from a config file rather than hardcoded. Makes AC-08b trivial.

---

## Why this is the signature chapter

Three reasons it deserves extra care:

**1. This component is actually shipping in real Eidrix.** Unlike most chapters where the output is "practice," the Eye from this chapter goes straight into real Eidrix. Build it like production code because it is production code.

**2. The Eye is Eidrix's visual identity.** Linear has the cursor. Stripe has the gradient. Vercel has the triangle. You have the Eye. Every user's first impression of Eidrix starts with whether the Eye feels alive and trustworthy. This chapter determines whether your brand has a presence or a logo.

**3. The layered architecture transfers to every future chapter.** Running six animation loops additively is the same pattern you'll use for streaming chat messages (AC-01), optimistic UI (AC-11), streaming UI updates (AC-17), and agentic subagent indicators (AC-16). Learn the pattern once, reuse everywhere.

---

## The plan, in plain English

This is a Thorough-plan chapter from start to finish. The component has enough internal complexity that a casual plan will miss things.

1. **Start clean, create branch**
2. **Thorough Plan** — six layers × four states × seven reactions + SVG architecture + config structure. Don't skip steps.
3. **Build the SVG structure first** — static Eye, no animation yet, just the visual form
4. **Build the config file** — every timing/amplitude/color lives here
5. **Wire Layer 1 (breath) and Layer 2 (blinks)** — the always-running foundations
6. **Wire Layer 3 (look-around)** — idle drift
7. **Wire Layer 4 (state expression)** — the four states
8. **Wire Layer 5 (reactions)** — all seven one-shots
9. **Wire Layer 6 (expression tinting)** — subtle color shifts
10. **Mount small in chat column header**
11. **Build Brand tab with large demo mount + dev state switcher**
12. **Iterate on feel** (the long step — motion work needs living-with time)
13. **Code-simplifier review**
14. **PR, review, merge**

---

## Step 1 — Start clean

```
Starting AC-08a — The Eidrix Eye. This is the signature chapter. Rhythm check: confirm I'm on main, clean, no leftover branches.
```

---

## Step 2 — Create the branch

```
Read CLAUDE.md, curriculum/PROGRESS.md, and curriculum/CURRICULUM_DESIGN.md. Then create a branch called feature/ac-08a-eidrix-eye.
```

---

## Step 3 — Ask for a Thorough Plan

Big chapter, big plan.

```
AC-08a builds the Eidrix Eye — a living animated SVG component with six animation layers, four states, and seven reactions. It mounts small (24px) in the chat column header as always-on ambient presence, and large (240px) in a new sixth primary tab called "Brand" as a demo with dev-only state controls. This is the signature component of Eidrix and ships to real Eidrix unchanged.

Thorough-plan this before writing any code.

## Overview
One component, two mount locations, six animation layers running simultaneously, four states, seven reactions. All timing/amplitude/color values live in a typed config file so AC-08b can build a tuning playground that drives this config.

## Files to create
- `src/components/brand/EidrixEye.tsx` — the component
- `src/components/brand/EidrixEye.types.ts` — TypeScript interfaces for props, state, reactions, config
- `src/components/brand/eye-config.ts` — default tunable values (breath rate, blink intervals, state parameters, reaction durations, colors)
- `src/components/brand/useEyeAnimations.ts` — custom hook that orchestrates the six layers (optional but recommended for separation of concerns)
- `src/components/BrandTab.tsx` — the sixth-tab body with the 240px Eye demo and dev state/reaction controls

## Files to modify
- `src/components/TabsPanel.tsx` — add sixth primary tab "Brand", wire tab state
- `src/components/ChatColumn.tsx` — mount <EidrixEye size={24} state="idle" /> in the header

## SVG architecture spec
The Eye is composed of these programmatic elements, each independently animatable:

1. **Almond frame** — the outer eye shape (a single SVG path)
2. **Eyelid** — an overlay that animates closed/open for blinks (SVG path or rect clipping)
3. **Iris** — outer circle, ember-colored, scalable for breath
4. **Pupil** — inner circle, obsidian
5. **Hot core** — small bright circle at pupil center, drives glow
6. **Circuit traces** — 3–5 geodesic paths radiating from iris edges, individually animatable opacity/pulse
7. **Glow halo** — outer soft circle with blur filter, drives ambient tint and reaction pulses

Confirm the SVG structure in your plan. If you'd organize it differently, propose the alternative and why.

## Config structure
Propose a TypeScript interface for `EyeConfig`. At minimum it needs:

- Breath: rate, depth, state-specific modifiers
- Blinks: base interval range, irregularity, double-blink chance, long-blink chance, close duration, open duration
- Look-around: idle frequency range, distance range, spring stiffness, spring damping
- States: idle (base), thinking (iris contraction, circuit intensity, breath modifier), speaking (pulse rate, pulse depth, warmth), muted (opacity, breath slowdown)
- Reactions: seven entries, each with duration and specific motion parameters
- Colors: base ember, warm ember, cool ember, cobalt-tinged, muted palette

Propose the full interface in your plan. Also propose what the default values should be — these become the initial Eidrix feel before I tune them in AC-08b.

## Animation orchestration question
Six independent animation loops running on one SVG is the architecturally hardest part. Propose:

1. Will you use useEffect with setInterval/setTimeout for each layer, Framer Motion's animate controls, or a combination?
2. How do the layers avoid fighting each other when they target overlapping properties? (e.g. breath modulates iris scale; speaking also modulates iris scale — how do they compose?)
3. How does a reaction temporarily interrupt a state without breaking it? (e.g. Acknowledge fires during Thinking — how does it play then cleanly return to Thinking?)

## State and reaction API
Propose the component props interface. At minimum:

- `state: 'idle' | 'thinking' | 'speaking' | 'muted'` (required)
- `reaction?: ReactionName | null` (optional, when set fires once then clears)
- `size?: number` (default 64)
- `config?: Partial<EyeConfig>` (optional overrides for specific values)

## Brand tab spec
- New sixth primary tab labeled "Brand"
- Tab body renders `<EidrixEye size={240} />` prominently
- Below the Eye: temporary dev-only control panel with:
  - State radio buttons: Idle / Thinking / Speaking / Muted
  - Seven reaction buttons: Greeting / Acknowledge / Noticed / Processing / Completion / Handoff / Uncertainty
  - Clicking a reaction button sets the reaction prop, which auto-clears after the reaction duration
- Note in the Brand tab that the real tuning playground is AC-08b; this panel is for initial iteration only

## Chat column mount spec
- `<EidrixEye size={24} state="idle" />` mounts in the chat column header
- Replaces or sits alongside the existing brand mark (whichever is cleaner)
- Always Idle state in this mount for now (session-driven states come in AC-01+)

## Expressive-presence discipline
These are constraints to preserve during build and iteration:

- No faces, smiles, frowns, or anthropomorphic emoting
- All "expression" happens through: iris scale, iris position, glow intensity, glow color temperature, circuit trace pulse, eyelid motion
- Every animation must pass the "does this convey system state, or is it decorative?" test
- Reactions are bold but brief — never more than 1.5 seconds
- Ambient motion never stops (except Muted) so the Eye always feels alive

## Architecture questions to answer in the plan
1. Framer Motion for everything, or mix with CSS animations / requestAnimationFrame for the loops?
2. How do we handle `prefers-reduced-motion`? (Mandatory consideration — accessibility)
3. At 24px, do all six layers remain visible/meaningful, or do some layers gracefully degrade at small sizes?
4. Performance: six simultaneous animations × two mount locations = 12 concurrent animations on the page. Any concerns? GPU-accelerated properties only?
5. How do reactions queue if two fire in rapid succession? (Ignore second, interrupt first, queue?)

## Edge cases
At least 7:
- State changes mid-reaction (e.g. switching Idle → Thinking while Acknowledge is playing)
- Reaction fires while Eye is Muted (should it fire or be suppressed?)
- Component unmounts mid-animation (cleanup of timers and animation handles)
- Tab not visible but Eye is still mounted in chat column — do we pause animations for performance?
- prefers-reduced-motion user with all six layers
- Two instances of the Eye on screen simultaneously (chat column + Brand tab)
- Rapid-fire reactions (user spamming the trigger buttons in dev controls)

## Alternatives considered
- Using Rive or Lottie for the animation instead of SVG+Framer Motion (reject or propose reasons)
- One monolithic animation timeline vs. six independent loops (we've chosen six independent — confirm)
- At least one more alternative you'd flag

## Assumptions I need to verify
## Risk notes
## Open questions

Don't write code yet. This plan will be long. Wait for my approval.
```

---

## Step 4 — Review the plan carefully

This plan is going to be lengthy. Don't skim it. Specific things to check:

- **Props interface is fully typed.** Every prop, every reaction name, every state.
- **Config interface is complete.** Can you look at the proposed `EyeConfig` and see every value you'd want to tune? If not, push for more.
- **Default config values are concrete.** "Reasonable defaults" isn't good enough — Claude Code should propose actual numbers. `breathRate: 4.0` not `breathRate: "moderate"`.
- **The layer composition question has a real answer.** How does breath + speaking pulse both modulating iris scale actually compose? Multiplicatively? Additively? Whichever — it needs a specific answer.
- **`prefers-reduced-motion` is accounted for.** If not mentioned, push: *"How should the Eye behave when the user has prefers-reduced-motion enabled?"*
- **Performance concern is addressed.** 12 concurrent animations is non-trivial. Transform + opacity only, no layout-triggering properties.
- **The 24px degradation is specified.** Do circuit traces show at 24px? Does the glow halo render? Some layers may need to gracefully disable at small sizes.

When the plan is solid:

```
Plan approved. Let's build it. Start with the SVG structure + config file, then Layer 1 and Layer 2, then stop and show me — I want to review the foundation before you build the state layers and reactions.
```

That intermediate checkpoint matters — if the SVG and breath/blinks are wrong, everything else is wrong. Catch it early.

---

## Step 5 — Build the SVG foundation + breath + blinks

Claude Code builds the static SVG, the config file, and the two always-running layers. When it stops and shows you:

Open `localhost:5173`, scroll to the chat column — you should see a tiny 24px Eye breathing and blinking. Also navigate to the new Brand tab — you should see the 240px Eye doing the same at full scale.

**Feel check:**
- Does the breath feel calm or nervous? Target: calm.
- Do the blinks feel irregular and natural, or metronomic and robotic? Target: irregular.
- Does the Eye *already* feel alive just from these two layers? It should. If it doesn't, the base is wrong — fix it now before building more on top.

If the foundation feels good:

```
Foundation looks good. Continue with Layer 3 (look-around), then stop and show me again before the state layers.
```

If anything's off:

```
Before continuing — [specific issue]. Adjust and re-show me.
```

---

## Step 6 — Build look-around

Claude Code adds the look-around drift. When it stops:

Watch the Eye for 60 seconds without touching anything. You should see:
- Occasional iris drifts to off-center positions
- Variable timing between drifts (not metronomic)
- Smooth spring-physics return to center
- Movement that feels curious, not random

**Feel check:** Does the Eye feel like it's noticing things in its environment? Or does it feel like it has restless-leg syndrome? Target: noticing.

If the feel is right:

```
Look-around feels right. Continue with Layer 4 (state expression) — all four states. Stop before reactions.
```

---

## Step 7 — Build the four states

Claude Code wires Idle/Thinking/Speaking/Muted. The Brand tab's dev control panel should now let you switch between them.

**Test each state:**
- **Idle** — the base feel from previous steps
- **Thinking** — iris contracted, circuits more active, breath slower. Should read as "focused."
- **Speaking** — iris pulsing rhythmically, warmer tint. Should read as "talking."
- **Muted** — dimmed, barely breathing, no blinks or circuits. Should read as "off duty."

**The transition test:** switch between states rapidly. Do the transitions feel smooth, or do they pop/jerk? Target: smooth crossfades, no pops.

If states feel right:

```
States feel right. Now build Layer 5 (all seven reactions) and Layer 6 (expression tinting). Wire the dev reaction buttons in the Brand tab. Stop before iteration.
```

---

## Step 8 — Build all seven reactions + expression tinting

Claude Code wires reactions and color tinting. Dev control panel should now have all seven reaction buttons.

**Test every reaction in every state.** Click Greeting during Idle. Click Uncertainty during Thinking. Click Acknowledge during Muted (does it fire? should it?). Click reactions back-to-back (how does the queueing behave?).

**The reaction checklist:**
- **Greeting** — heartbeat rhythm, glow ignites. Reads: "I'm here."
- **Acknowledge** — quick directional glance, brief brightening. Reads: "Got it."
- **Noticed** — fast iris flick, no glow change. Reads: "Saw that."
- **Processing** — sustained focus, slow glow inhale/exhale. Reads: "Working."
- **Completion** — deep breath + warmth pulse. Reads: "Done."
- **Handoff** — center iris, slow blink, steady glow. Reads: "Back to you."
- **Uncertainty** — cobalt tinge, iris contraction + tremor, deliberate blink. Reads: "Reconsidering."

If any reaction feels wrong — too quick, too much, unclear reading — flag it:

```
Reaction [name] isn't landing. It should feel like [specific target]. Try [specific adjustment].
```

---

## Step 9 — Iteration (the long step)

This is where AC-08a earns its keep. Budget real time here — probably 45–90 minutes of just living with the Eye, tweaking, and tweaking again.

**The iteration passes:**

**Pass 1 — the "10-minute living test."** Keep the Eye on screen at the Brand tab, 240px, Idle state. Do something else in another window for 10 minutes. Glance back occasionally. Does the Eye continue to feel alive? Or do you notice the loop repeating? If you notice a loop, the irregularity parameters need more chaos.

**Pass 2 — the 24px chat column test.** Stare at the 24px Eye in the chat column for 2 minutes. At small size, several things might break: blink durations might look wrong, circuit traces might be invisible, glow halo might be too subtle or too dominant. Adjust the 24px-specific degradation if needed.

**Pass 3 — state transition test.** Switch states in sequence: Idle → Thinking → Speaking → Idle → Muted → Idle. Every transition should feel intentional, not jarring. If any transition pops, adjust crossfade duration.

**Pass 4 — reaction-during-state test.** In each of the four states, fire each of the seven reactions. All 28 combinations. Some will feel off — a Greeting during Muted shouldn't be as bright as during Idle. Adjust reaction scaling per state.

**Pass 5 — the taste pass.** This is subjective. Does the Eye feel like Eidrix? Warm-obsidian-and-ember, confident, alive, not cartoonish, not cold? If yes — ship it. If no, identify what's off:

- Too cold → increase glow warmth, richer ember
- Too nervous → slow breath, fewer look-arounds, longer blink intervals
- Too sleepy → faster breath, more frequent small look-arounds
- Too mechanical → increase all randomness / irregularity parameters
- Too cartoonish → reduce reaction amplitudes, slow everything 10%

**Common specific iterations:**

```
The breath feels too fast. Slow the base rate from 4.0s to 5.0s. See if that reads more calm.
```

```
The blink looks sleepy — it's closing too slowly. Drop the close duration to 90ms.
```

```
The Thinking state's circuit pulse is too aggressive. Drop the pulse speed by 20% and reduce intensity from 1.0 to 0.8.
```

```
The Greeting reaction feels like a wink because the iris expansion happens too late. Speed up the expansion phase from 250ms to 180ms.
```

```
The Muted state looks broken, not off. Increase the opacity from 40% to 55% — should read as "paused" not "disabled."
```

Iterate until every layer, state, and reaction feels right. Don't rush.

---

## Step 10 — Code-simplifier review

```
We just shipped the Eidrix Eye — the signature component. Have code-simplifier review the new files in src/components/brand/ and src/components/BrandTab.tsx. Report suggestions but don't auto-apply — show me each one.
```

Be especially skeptical of suggestions to consolidate the six layer hooks into one. The separation is intentional — AC-08b will tune each layer independently, and tangled layers make that much harder. Accept suggestions that clean up repetition within a single layer, not across layers.

---

## Step 11 — Commit with PROGRESS.md checkoff

```
The Eye is alive and feels right. Commit this work, and in the same commit, check off AC-08a in curriculum/PROGRESS.md. Push, open a PR, give me the link.
```

---

## Step 12 — Review the diff

Expected files:

- `src/components/brand/EidrixEye.tsx` — new
- `src/components/brand/EidrixEye.types.ts` — new
- `src/components/brand/eye-config.ts` — new
- `src/components/brand/useEyeAnimations.ts` — new (if we went with the hook approach)
- `src/components/BrandTab.tsx` — new
- `src/components/TabsPanel.tsx` — modified (sixth tab added)
- `src/components/ChatColumn.tsx` — modified (24px Eye mounted in header)
- `curriculum/PROGRESS.md` — AC-08a checked off

**Check:**

- Every timing/amplitude/color value in the Eye is imported from `eye-config.ts` — zero magic numbers in the component files
- `EyeConfig` interface is fully typed with no `any`
- The component renders at both 24px and 240px without layout issues
- prefers-reduced-motion is handled (via the hook or CSS media query)
- Performance: only transform + opacity properties animated
- No hardcoded colors anywhere

If it looks good:

```
PR looks good. Merge it into main.
```

---

## Step 13 — Clean up

```
Switch back to main, pull, delete the feature branch locally and on GitHub. Confirm we're clean.
```

---

## What just happened

Eidrix has a face now. Not literally — it has a presence. The Eye breathes in the corner of your screen while you work, glances around occasionally, reacts to things you do, changes demeanor when it's thinking vs. speaking. That's not a logo. That's a companion.

More importantly, you built a component with **real production-grade architecture**: six independent animation layers composing cleanly, state-machine expression, config-driven tuning, zero magic numbers, reduced-motion accessibility. This component will move straight into real Eidrix when you're ready. No refactor needed.

And the pattern — layered, state-driven, config-tunable animation — is what you'll reach for every time you build something living in future chapters. The streaming chat message (AC-01). The tool call indicator (AC-03). The agentic subagent handoff (AC-16). Same architecture, different skins.

---

## What success looks like

- The Eye mounts at 24px in the chat column header, always running, always Idle
- The Brand tab shows the Eye at 240px with dev controls for states and reactions
- All six layers running without fighting each other
- All four states feel distinctly different
- All seven reactions read as their intended meaning
- Expression tinting is noticeable but never jarring
- 10-minute living test passes — no visible looping
- 24px version remains expressive and legible
- State transitions don't pop
- All tunable values in `eye-config.ts`, component code has zero magic numbers
- prefers-reduced-motion handled
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"The Eye looks dead / doesn't animate"** — usually a Framer Motion animation-prop issue. Tell Claude Code: *"The Eye is static. Check that motion components have animate and transition props correctly wired for each layer."*
- **"Blinks are perfectly timed — too robotic"** — irregularity parameters aren't being used. Tell Claude Code: *"Blinks are metronomic. Verify the irregularity algorithm is actually randomizing intervals within the configured ranges."*
- **"State transitions pop / jerk"** — no crossfade. Tell Claude Code: *"Switching states causes animation pops. Add interpolated crossfades between state parameter sets."*
- **"Reactions don't interrupt correctly"** — layer composition issue. Tell Claude Code: *"Reactions aren't interrupting the current state animation cleanly. Debug the reaction layer's priority over the state layer."*
- **"The 24px version looks broken"** — layers don't degrade. Tell Claude Code: *"At 24px, [specific thing] looks wrong. Propose how the layers should gracefully degrade at small sizes — circuit traces hiding, glow halo simplifying, etc."*
- **"Performance is tanking — fans spinning"** — animating wrong properties. Tell Claude Code: *"The Eye is hitting performance. Audit which properties each layer animates. Only transform and opacity should be animated. Fix any that aren't."*
- **"It feels like a mascot"** — iteration issue. Re-read the expressive-presence discipline at the top of this chapter and tell Claude Code: *"The Eye feels anthropomorphic. Reduce [specific reaction] amplitude. No emotion, just state indicators."*

---

## Tour Moment — Layered animation vs. monolithic timelines

You just built something most web animations don't do: six independent loops, each with its own timing, composing additively on the same component. That's the Rive/Disney approach.

The alternative — one big timeline that defines what every element does at every moment — is how most web animations are built. It works for short one-shots (entrance, exit, simple transitions) but falls apart for anything "living," because living things don't have a timeline. They have simultaneous behaviors at different rhythms: breath rhythm, blink rhythm, attention rhythm, mood rhythm.

Layered animation is the architecture of *presence*. Learn it once on the Eye, reuse it everywhere you want something to feel alive.

---

## Tour Moment — Config-driven components

Look at your finished `eye-config.ts` file. Every number in there could have been a hardcoded value inside the component. Why'd we spend the effort to extract them all?

Three reasons:

1. **AC-08b becomes trivial.** The tuning playground just renders sliders that drive config values. If the Eye's internals were hardcoded, AC-08b would be a refactor, not a UI build.

2. **Brand variants for free.** Want a "Calm Eye" for the customer portal and an "Alert Eye" for the internal dashboard? Just pass a different config. No component changes needed.

3. **Design without code.** A designer (or you, a year from now) can change the Eye's personality by editing numbers in one file. No need to remember how the component is structured.

This pattern — extract all tunable values into a typed config — is gold. Use it for any component you might want to evolve independently of its logic.

---

## Tour Moment — Expressive-presence discipline

You kept the Eye from drifting toward mascot territory by enforcing rules: no faces, no emoting, all expression through iris/glow/circuits.

That discipline is the hardest part of brand motion. Every iteration is a chance to add "just one more personality touch" — a tiny smile, a playful bounce, a surprise wink. Each one individually feels fine. Stacked together, they turn presence into caricature.

The test that saved you: *"does this convey system state, or is it decorative?"* If decorative, cut. That's the heuristic to keep in your pocket forever. It's why Apple's Siri orb never feels silly, why the Claude logo breathing never gets annoying, and why your Eye will hold up over a million user sessions in real Eidrix.

---

## Next up

**AC-08b — The Eidrix Eye Tuning Playground.** Now that the Eye is alive with sensible defaults, you build the full playground: state switcher, reaction triggers, live sliders for every layer (breath rate, blink irregularity, look-around timing, state modifiers, reaction durations), preset save/load (Eidrix / Calm / Alert / Focused), live code export. Same pattern as Motion Lab v2 — but for the signature component of your entire product.

After AC-08b: back to the main track. **Chapter 10 — Fake Data & Forms** is queued next. You'll populate the Records tab with fake customer data and build the form patterns that set up real Supabase in Chapter 14.

Or if you want a breather from signature work: **TC-02 — Web Search** or **TC-03 — Image Analysis** are both à la carte tool capabilities you can knock out in under an hour.

Your call.
