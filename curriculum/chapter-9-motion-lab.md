# Chapter 9 — Motion Lab

*Third section inside the Lab tab, alongside Typography and Color. You'll install Framer Motion, then build a Motion Lab section showcasing entrance animations, hover micro-interactions, loading states, and scroll reveals. Every example is interactive — you click a button to replay it. This chapter teaches the vocabulary of motion so you can describe the Eidrix Eye animation in AC-08 with precision. About 2 hours. Build chapter with more iteration than any previous chapter — motion quality lives in tiny details.*

---

## What you're learning

1. **The vocabulary of motion** — duration, easing, spring physics, stagger, keyframes
2. **Framer Motion basics** — the `motion.div` pattern, `animate` prop, `transition` prop, `whileHover` and `whileTap`
3. **When to use which animation type** — tween vs spring, CSS transition vs Framer Motion, subtle vs showy
4. **Motion as brand language** — why Linear's animations feel different from Stripe's, and how yours should feel distinctly Eidrix
5. **Replaying animations on demand** — React's re-key pattern for restarting animations (you'll use this constantly)
6. **The principle of restraint** — good motion is felt, not noticed. Bad motion is a carnival.

---

## What you're building

A Motion Lab section inside the Lab tab, below Color Lab, with four showcase groups:

**1. Entrance Animations**
- Fade + rise (the "hello, I exist" animation)
- Spring bounce (for emphasis)
- Scale in (for important arrivals)
- Each has a "replay" button so you can trigger it again

**2. Hover Micro-Interactions**
- Subtle scale (the "I'm interactive" signal)
- Color shift to ember (the "I'm your primary option" signal)
- Glow halo (the "I'm a confident action" signal)
- Hover over them to see

**3. Loading States**
- Breathing dots (indeterminate wait)
- Skeleton shimmer (content loading)
- Pulse ring (live activity indicator)
- Each runs continuously — they don't need replay

**4. Staggered List Reveals**
- A list of 5 items that animate in sequentially when the section becomes visible
- Click replay to watch it play out again
- Demonstrates the timing-together pattern you'll use for chat messages, table rows, card grids

By the end, scrolling the Lab tab reads: Typography → Color → Motion. Your visual language is complete.

---

## Plain English glossary

- **Framer Motion** — the library we're using. Production standard for React animations. Powers the animations in Linear, Vercel, Notion's marketing site, and tons of others.
- **Duration** — how long an animation takes, in seconds. `duration: 0.3` is 300 milliseconds.
- **Easing** — the shape of the animation curve. "Linear" is robotic. "Ease-out" feels natural (starts fast, slows at end, like a ball landing). "Spring" wobbles and settles.
- **Spring physics** — an animation based on actual physics (stiffness, damping, mass) instead of a timed curve. Feels organic and alive. What makes Linear's animations feel so good.
- **Stagger** — delaying the start of each item in a list so they animate in sequence, not all at once. Feels orchestrated instead of chaotic.
- **Keyframes** — multiple "poses" an animation passes through. Like `opacity: [0, 0.5, 1]` means "start at 0, pass through 0.5, end at 1."
- **`whileHover` / `whileTap`** — Framer Motion shortcuts for "show this animation state while the user hovers / clicks." Removes most of the manual event handling.
- **Re-key pattern** — changing a component's `key` prop forces React to unmount and remount it, which re-runs any entrance animations. How you build "replay" buttons.

---

## Why this chapter matters

Three reasons:

**1. Motion is the closest thing to a signature your app has.** Apple's motion feels like Apple. Linear's feels like Linear. Your real Eidrix needs its own motion language — warm, confident, deliberate, never frenetic. This chapter builds the vocabulary so you can describe what you want and recognize when you've got it.

**2. It's prep for AC-08 (the Eidrix Eye animation).** The Eye uses multi-stage keyframe animation with staggered sub-elements (iris breathes, circuit traces pulse, blink is an irregular cluster). All of that draws from patterns you'll install in this chapter. AC-08 is where the magic happens; Chapter 9 teaches the spells.

**3. Bad motion is worse than no motion.** A button that bounces when you click it is delightful once and annoying the 200th time. A loading state that's too flashy says "this app wants attention" instead of "this app is working for you." The hardest part of motion design is knowing when to hold back. This chapter teaches that taste, not just the technique.

---

## The plan, in plain English

1. **Start clean, create branch**
2. **Install Framer Motion**
3. **Thorough plan** — four showcase groups, each with its own complexity
4. **Build the MotionLab component** with all four groups
5. **Wire it into the Lab tab** (below ColorLab)
6. **Iterate on the feel** — this step is longer than previous chapters
7. **Code-simplifier review**
8. **PR, review, merge**

---

## Step 1 — Start clean

```
Starting Chapter 9 — Motion Lab. Rhythm check: confirm I'm on main, clean, no leftover branches.
```

---

## Step 2 — Create the branch

```
Read CLAUDE.md and curriculum/PROGRESS.md. Then create a branch called feature/motion-lab.
```

---

## Step 3 — Install Framer Motion

```
Install framer-motion via npm. After installing, check package.json to confirm it's listed as a dependency. Report what version was installed.
```

Framer Motion is the production standard for React animations. It's a big library (~60KB gzipped), but it's worth every byte — covers spring physics, gesture handling, layout animations, scroll-linked animations, and more. You'll use it constantly from here on.

---

## Step 4 — Ask for a Thorough Plan

```
Chapter 9 builds MotionLab as a new section inside the Lab tab, alongside Typography and Color. Thorough-plan this before writing code.

## Overview
A showcase section demonstrating four categories of motion — entrance animations, hover micro-interactions, loading states, and staggered list reveals. Every animation must be replayable on demand via a small replay button, except the loading states which run continuously.

## Files to create and modify
Complete list.

## Files to create
- `src/components/MotionLab.tsx` — the main showcase component

## Files to modify
- `src/components/TabsPanel.tsx` — render <MotionLab /> inside the Lab tab, after ColorLab

## Showcase group specs

### Group 1: Entrance Animations
Three examples, each in its own card:
- **Fade + rise** — opacity 0 → 1 + y: 20px → 0, duration 0.4s, ease-out
- **Spring bounce** — scale 0.5 → 1 using spring(stiffness: 260, damping: 20)
- **Scale in** — scale 0.9 → 1 + opacity 0 → 1, duration 0.3s, ease-out

Each card has a "replay" button below the animated element. Clicking it re-triggers the animation (use the re-key pattern).

### Group 2: Hover Micro-Interactions
Three examples showing what happens on hover:
- **Subtle scale** — hover scales to 1.02, duration 0.15s
- **Color shift to ember** — background transitions to ember-500, duration 0.2s
- **Glow halo** — box-shadow grows, ember-tinted, duration 0.3s

No replay buttons needed. Users just hover.

### Group 3: Loading States
Three examples that run continuously:
- **Breathing dots** — 3 dots, each scaling 1 → 1.3 → 1 on a 1.2s loop, staggered 150ms apart
- **Skeleton shimmer** — a rectangular bar with a gradient sliding across it, 1.5s loop
- **Pulse ring** — an ember-tinted ring expanding and fading (opacity 1 → 0, scale 1 → 1.5), 1.5s loop

No buttons. Always animating.

### Group 4: Staggered List Reveals
A single "replay" button above a vertical list of 5 items. Clicking replay re-triggers all 5 items' entrance animations in sequence — each item starts its fade+rise 80ms after the previous one.

## Visual design spec (push frontend-design hard here)
- Each group has a section header matching the pattern of TypographyLab and ColorLab groups
- Showcase cards use our Card component (bordered variant) for consistency
- Replay buttons use our Button component (tertiary variant, small)
- All colors reference our tokens — no hardcoded values
- Motion timing should feel *Eidrix* — warm, confident, never frantic. Springs feel natural. Tween durations hover between 200-400ms for most things.
- NO generic Material Design bounce. NO Apple-store overexcitement. The vibe is "a premium tool that respects its user."

## Technical approach
- Use Framer Motion's `motion.div` for animated elements
- Use `whileHover` for hover states (not manual event handling)
- Use the re-key pattern (a state counter that increments, passed as `key` to the component) to force replay
- For the continuous loading states, use Framer Motion's `repeat: Infinity` on the transition

## Architecture questions to address in the plan
1. How will the replay state be managed? (Counter per showcase, or one counter, or something else?)
2. How will the staggered list know when to animate? (On replay click, on mount, on scroll?)
3. Should the loading states pause when they scroll off-screen, or always run? (Recommendation: always run — they're demo surfaces, not production loaders.)
4. Any performance concerns with multiple continuous animations running at once?

## Edge cases
At least 5:
- User clicks replay while an animation is already playing (does it interrupt cleanly?)
- Continuous animations eating CPU on lower-end devices
- Animations respecting prefers-reduced-motion (accessibility)
- Hover animations on touch devices (where hover doesn't exist)
- A replay button's own hover animation conflicting with the card's entrance animation

## Alternatives considered
- Using CSS animations instead of Framer Motion (rejected: limited control, harder to replay, no spring physics)
- Rolling our own motion primitives (rejected: Framer Motion is battle-tested and free)
- At least one more alternative

## Assumptions
Things you're assuming about my setup.

## Risk notes
Anything error-prone.

## Open questions
Anything you need from me.

Don't write code. Wait for approval.
```

---

## Step 5 — Review the plan carefully

Things to check:

- **Every showcase has concrete timing values.** "Duration 0.4s, ease-out" is specific. "Smooth animation" is not.
- **Spring values for the bounce are specified.** `stiffness: 260, damping: 20` is Framer Motion's default soft spring — good starting point.
- **Replay state management has a clear answer.** Usually cleanest: one counter per showcase, stored in local state.
- **Accessibility (reduced motion) is considered.** If not mentioned, push: *"What about users with prefers-reduced-motion enabled? How should that affect these animations?"*
- **No hardcoded colors.**
- **The plan flags performance.** Multiple continuous animations at once can be heavy — Claude Code should acknowledge this and have a plan (usually: GPU-accelerated transforms only, no layout-triggering properties).

Approve:

```
Plan approved. Let's build it.
```

---

## Step 6 — Let Claude Code build

This creates one big new file and modifies one. Dev server rebuilds.

When finished, open `localhost:5173`, scroll down past Typography and Color, and you should see:

- Motion Lab section heading
- Four showcase groups, each with examples
- Replay buttons where appropriate
- Continuous animations for the loading states

---

## Step 7 — Iterate on the feel (the long step)

This is where Chapter 9 earns its keep. More iteration than any previous chapter.

**The feel checklist, by group:**

**Entrance Animations:**
- Does the fade+rise feel *graceful* or *sluggish*?
- Does the spring bounce feel *playful* or *silly*?
- Does the scale-in feel *confident* or *jumpy*?

**Hover Micro-Interactions:**
- Does the subtle scale feel *responsive* or *unnoticeable*?
- Does the color shift to ember feel *warm* or *jarring*?
- Does the glow halo feel *premium* or *gaudy*?

**Loading States:**
- Do the breathing dots feel *patient* or *impatient*?
- Does the skeleton shimmer feel *elegant* or *flashy*?
- Does the pulse ring feel *alive* or *desperate*?

**Staggered List:**
- Does the stagger feel *orchestrated* or *janky*?
- Is 80ms between items right, or should it be 60ms / 100ms / 120ms?

**Common iterations:**

- **"The spring bounce is too bouncy — feels silly."** Redirect: *"Increase the damping on the spring bounce from 20 to 28. Should settle faster, feel more confident."*
- **"The hover scale is so subtle I can barely see it."** Redirect: *"Bump the hover scale from 1.02 to 1.04. Should be noticeable without being showy."*
- **"The glow halo looks like a cheap neon sign."** Redirect: *"Make the glow halo more subtle — smaller spread, lower opacity. Should feel like an aura, not a billboard."*
- **"Breathing dots feel nervous."** Redirect: *"Slow the breathing dots loop from 1.2s to 1.6s. Should feel calm, not twitchy."*
- **"The skeleton shimmer is too obvious."** Redirect: *"Tone down the skeleton shimmer — lower contrast on the gradient, slower sweep (2s instead of 1.5s). Should be felt, not seen."*
- **"The staggered list feels mechanical."** Redirect: *"Use a spring transition for the staggered items instead of a tween. Should feel alive."*
- **"Everything works but feels generic."** Redirect: *"Push the motion further. These should feel distinctly Eidrix — warm, deliberate, confident. Not Bootstrap-with-springs."*

**The "would I want to see this 100 times a day" test:**

For every animation, ask: *would I want to see this every time I click this button / hover this card?* If yes → ship it. If it'd annoy you by repeat 10 → tone it down.

Iterate until every animation passes the test.

---

## Step 8 — Code-simplifier review

```
We just shipped MotionLab with four showcase groups. Have code-simplifier review src/components/MotionLab.tsx. Report suggestions but don't auto-apply — show me each one.
```

Common things code-simplifier catches here:
- Repeated transition objects that could be extracted into constants
- Repeated Tailwind class strings for the showcase card layout
- Verbose animation definitions that could be simplified

**Be cautious about over-abstraction.** Motion code reads fine when it's a bit verbose. If code-simplifier wants to extract every transition into a shared config, push back — motion values are often easier to tweak when they're inline.

---

## Step 9 — Commit with PROGRESS.md checkoff

```
I'm happy with the Motion Lab. Commit this work, and in the same commit, check off Chapter 9 in curriculum/PROGRESS.md. Push, open a PR, give me the link.
```

---

## Step 10 — Review the diff

Expected files:

- `src/components/MotionLab.tsx` — new
- `src/components/TabsPanel.tsx` — modified (one line for import, one line for render)
- `package.json` and `package-lock.json` — framer-motion added
- `curriculum/PROGRESS.md` — Chapter 9 checked off

**Check:**

- Framer Motion is used consistently (no mix of CSS animations and Framer Motion for similar things)
- All animation values use tokens where applicable (ember color references, not hardcoded hex)
- Showcase cards reuse the Card component (bordered variant)
- Replay buttons reuse the Button component (tertiary, small)
- Continuous animations use `repeat: Infinity` cleanly
- prefers-reduced-motion is handled (usually via Framer Motion's built-in support or a CSS media query)

Approve:

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

You added a motion language to your design system. From now on, every future chapter can reference patterns from Motion Lab:

- Chapter 10 (Fake Data) — table rows can use the staggered list reveal on load
- Chapter 11 (Fake Chat UI) — new messages can use fade+rise
- AC-06 (Command Palette) — already uses fade+scale from this chapter's vocabulary
- AC-08 (Eidrix Eye) — uses layered keyframe animation with this chapter's timing discipline
- AC-11 (Optimistic UI) — uses skeleton shimmer for loading states
- AC-17 (Streaming UI Updates) — uses staggered reveals for agent-driven changes

Motion is a language. You just taught your app its native tongue.

---

## What success looks like

- MotionLab renders inside the Lab tab, below Color Lab
- All four groups have their showcase items
- Every animation feels deliberate, not jarring
- Replay buttons re-trigger animations cleanly
- Continuous animations run smoothly without jank
- prefers-reduced-motion is respected
- No hardcoded colors
- Uses Card and Button components from Chapter 8
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"Nothing animates — everything just appears"** — Framer Motion not wired up correctly. Tell Claude Code: *"Nothing animates in MotionLab. Check that motion.div elements have animate and transition props wired correctly."*
- **"Replay button does nothing"** — Re-key pattern not working. Tell Claude Code: *"Clicking replay doesn't re-trigger the animation. Check the key-based remount pattern."*
- **"Animations stutter / are jerky"** — Performance issue. Tell Claude Code: *"Animations feel choppy. Check that we're only animating transform and opacity properties, not layout-triggering ones like width or height."*
- **"Hover animations don't work"** — `whileHover` not used correctly. Tell Claude Code: *"Hover animations aren't firing. Confirm whileHover is used on the outer motion element and not buried in children."*
- **"The loading states are eating battery"** — Continuous animations need GPU acceleration. Tell Claude Code: *"The continuous loaders feel heavy. Verify they're using transform-based properties and consider adding will-change: transform."*
- **"Everything works but motion feels wrong"** — This is iteration, not breakage. Re-read Step 7. Pick specific complaints. Push back.

---

## Tour Moment — Motion as brand

You just experienced how small changes to duration, easing, and spring values dramatically change an app's *feel*. A 200ms tween feels crisp. A 400ms tween feels casual. A stiff spring feels confident. A loose spring feels cartoony.

Real products have deliberate motion signatures:

- **Linear** — crisp tweens, subtle springs, everything 150-250ms
- **Stripe** — restrained, almost no decorative motion, just essential transitions
- **Notion** — playful springs, generous stagger, clear "this is fun" vibe
- **Vercel** — sharp, almost glitchy, techy energy

Your Eidrix Eye (AC-08) needs its own signature. My read on what it should feel like, based on your brand language:

- **Warm** — curves that settle gently, not snap into place
- **Confident** — no unnecessary motion, but motion that happens is decisive
- **Alive** — the breathing and blinking signal *intelligence*, not decoration

Keep those in mind during iteration. When you tweak a duration, ask "does this feel more *warm*, *confident*, and *alive*?" If yes, ship it. If no, keep tweaking.

---

## Tour Moment — The re-key pattern

You just used a pattern that's going to show up constantly: changing a React component's `key` prop forces it to unmount and remount.

```tsx
const [replay, setReplay] = useState(0);

...

<button onClick={() => setReplay(r => r + 1)}>Replay
```

Every time `replay` increments, React treats the `motion.div` as a brand new component — unmounts the old one, mounts a new one, which triggers the entrance animation from scratch.

Use this pattern for:
- "Retry" buttons on failed operations
- Resetting a form to initial state
- Re-running an animation for demo/showcase purposes
- Forcing a component to reset its internal state without writing custom reset logic

It's a one-line escape hatch that saves an enormous amount of state management code.

---

## Tour Moment — The restraint principle

Here's the unpopular truth about motion design: **most apps with good motion are restrained, not expressive.**

Superhuman has almost no visible animations. Linear's animations are so subtle most users don't consciously notice them. Apple's macOS has *less* motion now than it did 10 years ago.

This is the opposite of what beginners think. Beginners learn animation libraries and want to animate everything. Experts know that every animation is a small cost (cognitive load, processing, user attention) and needs to earn its place.

When you design future chapters, the rule is: **default to no animation. Only add animation where it serves a functional purpose** — signaling interactivity, communicating state change, guiding attention. If you can't explain *why* something should animate in one sentence, it probably shouldn't.

Your Eidrix Eye is the exception — it's brand, not UX, and brand can be more expressive. But for everything else: restraint.

---

## Next up

**AC-08 — Animated Brand Marks (the Eidrix Eye).** This is the capability chapter you've been excited about. You'll build an animated SVG component that feels alive — breathing, blinking, looking around, maybe idle/speaking/thinking states. Uses everything you just learned in Chapter 9, pushed to signature level. Probably 2-3 hours. The "holy shit how did you do that" payoff chapter.

Or, if you'd rather keep moving on main track: **Chapter 10 — Fake Data & Forms** is queued next. Populates the Records tab with fake customer data and teaches form patterns.

My lean: do AC-08. You just built the motion foundation, your head is in the motion headspace, and the Eye is the thing that'll make you go *"I built that?"* every time you look at it.
