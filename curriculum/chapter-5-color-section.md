# Chapter 5 — Color Section

*You built the first Lab section in Chapter 4. Now you're going to build a second one using the exact same pattern — but showing off your color system this time. By the end of this chapter, scrolling your app shows: Header → Typography Lab → Color Lab. You're going to start feeling like you can build sections on muscle memory. Total time: about 45 minutes.*

---

## What you're learning

1. **Repetition is the point** — professional developers reuse patterns constantly. This chapter intentionally uses the same pattern as Chapter 4.
2. **Color system vocabulary** — palette, ramp, swatch, hex value, semantic color
3. **How to present color professionally** — the conventions real design system docs use
4. **The difference between "raw" tokens and "semantic" tokens** — the foundation of scalable color systems

---

## What you're building

A new section that sits below Typography Lab:

- A "Color Lab" section heading
- The full **Obsidian palette** displayed as swatches (your warm dark backgrounds)
- The full **Ember palette** displayed as swatches (your burnt orange accent)
- The **text color set** with small examples of each
- Every swatch labeled with its token name and hex value

It's a color spec sheet. Same energy as the typography showcase — but for color.

---

## Plain English glossary for this chapter

- **Palette** — the complete set of colors in a design system. Yours has two palettes: Obsidian (dark backgrounds) and Ember (orange accents).
- **Ramp** — a single color family, shown as a scale from lightest to darkest. The Obsidian ramp, the Ember ramp. Each ramp has multiple "stops" (950, 900, 800, etc.).
- **Swatch** — a single color sample. A small square or rectangle filled with the color.
- **Hex value** — a color written as `#FF6B1A`. Six characters after the `#` encoding red, green, blue. You don't need to memorize how it works — just recognize it.
- **Stop** — one specific color within a ramp. `ember-500` is one stop. `ember-700` is another.
- **Raw token** — a token named for what it *is*: `ember-500`, `obsidian-950`.
- **Semantic token** — a token named for what it *does*: `text-primary`, `background-default`. (We're not making semantic tokens in this chapter — just noting they exist for later.)

---

## Why this chapter matters

Three reasons:

1. **You're proving the Lab section pattern works.** Chapter 4 introduced the pattern. Chapter 5 proves it's reusable. By the end, you'll trust the pattern.

2. **Showing your color system catches problems.** When you lay out all your colors side by side, you immediately notice if one is off (too bright, too similar to another, the wrong warmth). A system you can't see is a system you can't fix.

3. **You're building a reference doc for yourself.** When you're in Chapter 12 trying to decide what color to use for a warning message, you can scroll back to Color Lab and pick from your own palette instead of making up something new. Your own app is your own spec.

---

## The plan, in plain English

This chapter follows the Chapter 4 pattern almost exactly. If you feel like you're repeating yourself, good — that's the point. Reps build muscle memory.

1. **Start clean, create branch** — rhythm
2. **Ask for a plan** — what the Color Lab will contain, how to display swatches
3. **Build the component** — `src/components/ColorLab.tsx`
4. **Wire it into App.tsx** — below TypographyLab
5. **Iterate** — visual refinements
6. **PR, review, merge**

---

## Step 1 — Start clean

```
Starting Chapter 5 — Color Section. Rhythm check: confirm I'm on main, clean, no leftover branches.
```

---

## Step 2 — Create the branch

```
Read CLAUDE.md and curriculum/PROGRESS.md. Then create a branch called feature/color-section.
```

---

## Step 3 — Ask for the plan

```
Chapter 5 builds the Color Lab section. Before writing code, give me a plan covering:

1. New component file: src/components/ColorLab.tsx
2. How it'll be wired into App.tsx (rendered below TypographyLab)
3. Structure inside ColorLab:
   - Section heading ("Color Lab" or similar)
   - Obsidian palette showcase — all four stops we have (obsidian-950, 900, 800, 700)
   - Ember palette showcase — all four stops we have (ember-900, 700, 500, 300)
   - Cobalt accent — the single cobalt-500 we added in Chapter 3
   - Text colors showcase — examples of text-primary, text-secondary, text-tertiary
4. How each swatch will be presented:
   - A colored block/rectangle
   - The token name (e.g. "obsidian-800")
   - The hex value (e.g. "#1A0D08")
   - Maybe a light/dark indicator so I can tell at a glance whether text should be light or dark on it
5. Layout approach — probably a grid of swatches for each palette, with the heading above each group
6. All Tailwind + design token based — no hardcoded hex in the component (the hex values being DISPLAYED don't count — those should be read from the tokens somehow)

The frontend-design skill will likely have opinions on swatch presentation — let it lean into distinctive, not generic.

Don't write code yet. Wait for my approval.
```

---

## Step 4 — Review the plan

Things to check:

- **Component structure mirrors TypographyLab?** Same pattern is good.
- **Does the plan propose reading hex values from tokens?** Instead of hardcoding hex strings in the component, Claude Code should propose pulling them from `tokens.css` or a data structure. This is important — it means if you ever change a color, the display updates automatically.
- **Grid layout or stacked?** Either works. If the swatches are tiny and there are a lot of them, grid is better. If they're large and labeled, stacked might work.
- **Usage examples included?** Ideally every color isn't just a square — show what it looks like *as text on a background* or *as a button color*. Context sells a color.
- **Any surprise files?** Question anything beyond the one new component + App.tsx tweak.

If the plan is good:

```
Plan approved. Let's build it.
```

If not, redirect with specifics.

---

## Step 5 — Let Claude Code build

Claude Code creates `ColorLab.tsx`, wires it into `App.tsx`, and the dev server rebuilds. Scroll your page — you should now see:

- Header (unchanged)
- Typography Lab (unchanged)
- **NEW: Color Lab** with all your palettes on display

This is the moment. You should now have what's essentially a one-page design system reference.

---

## Step 6 — Iterate

Things to look at critically:

- **Swatch sizing** — are they big enough to see the color clearly? Too big and they dominate the page. Sweet spot is usually ~80-120px per side.
- **Label legibility** — the token name and hex should be readable without squinting
- **Spacing between swatches** — too tight feels cramped, too loose feels disjointed
- **The transition from Typography Lab to Color Lab** — is there a clear visual break, or do they blur together? Might need more padding between sections.
- **Palette order** — does obsidian-to-light read naturally, or should it go light-to-dark?
- **Usage examples** — are they demonstrative, or just filler?

Iterate with specific prompts like:

```
The swatches in the Obsidian palette feel too small. Bump them up to about 120x120px.
```

```
There's not enough vertical separation between Typography Lab and Color Lab — they blend together. Add more padding between sections.
```

```
Each ember swatch needs a "sample text" showing what text-primary text looks like on top of it. Add that below each swatch label.
```

Iterate until it feels clear and confident.

---

## Step 7 — Open the PR

```
I'm happy with the color section. Check off Chapter 5 in curriculum/PROGRESS.md and advance "Currently on" to Chapter 6 as part of the same commit. Then push, open a PR, give me the link.
```

Bundling the PROGRESS.md checkoff into the chapter's feature PR is the rhythm we adopted after Chapter 1 — one PR, one review, one merge per chapter.

---

## Step 8 — Review the diff

Expected files:

- `src/components/ColorLab.tsx` — new file, the new section
- `src/App.tsx` — one or two line change, importing and rendering `<ColorLab />`
- `curriculum/PROGRESS.md` — Chapter 5 checked off, "Currently on" advanced to Chapter 6

**Things to check:**

- `ColorLab.tsx` uses design tokens throughout
- Hex values displayed in the UI should be sourced from somewhere central (tokens file or a data structure), not typed twice
- No surprise files — this should be a small, focused PR
- `App.tsx` change is minimal — just importing + rendering the new component
- `PROGRESS.md` shows the Chapter 5 checkbox ticked and the "Currently on" pointer reading Chapter 6

If it looks good:

```
PR looks good. Merge it into main.
```

---

## Step 9 — Clean up

```
Switch back to main, pull the latest, and delete the feature branch locally and on GitHub. Confirm we're clean.
```

---

## What just happened

You shipped your second Lab section using the exact pattern from Chapter 4. Take a second to appreciate:

- Chapter 4 took meaningful effort because it was new
- Chapter 5 should've felt easier because the pattern was already there
- **Every future section chapter will feel easier still**

That's how real development compounds. The first time you do something, it's slow. The second time, it's faster. By the fifth time, you don't think about the structure — you only think about the content.

---

## Why we're building sections instead of tabs

You might be wondering: "The plan says Chapter 6 turns this into a tab layout. Why build it as a scrollable page first?"

Two reasons:

1. **Scrollable pages are dead simple.** You're learning component composition, not navigation routing. Scroll first, complexity later.
2. **It's a stress test for the design system.** When every section is stacked and visible at once, inconsistencies are glaring. If typography-lab and color-lab don't feel like they're from the same app, you'll notice immediately. Tabs hide problems — scrolling surfaces them.

By Chapter 6 you'll have shipped enough sections that splitting them into tabs will feel like an obvious upgrade rather than a confusing jump.

---

## What success looks like

- Scrolling your app shows: Header → Typography Lab → Color Lab
- Every color in your system is displayed as a swatch with its token name and hex value
- Swatches are visually clear — you can see at a glance what each color looks like
- The transition between sections feels intentional, not accidental
- Component uses design tokens — no hardcoded hex in the TSX
- PR merged, branch deleted, PROGRESS.md updated

---

## If something broke

- **"The palette is displaying wrong / weird colors"** — probably a tokens reference issue. Tell Claude Code: *"The colors in ColorLab don't match the tokens.css values. Help me debug how the swatches are reading their colors."*
- **"The section isn't appearing"** — App.tsx likely didn't get updated. Tell Claude Code: *"ColorLab isn't showing up on the page. Check App.tsx imports and rendering."*
- **"The page looks great but my hex values show `undefined`"** — the hex-reading approach didn't wire up right. Tell Claude Code: *"The hex values are showing as undefined. Help me fix how the component reads them from tokens."*
- **"Section transitions feel jarring"** — probably a spacing issue. Tell Claude Code: *"Add consistent padding between the Typography Lab and Color Lab sections. They should feel like sibling sections, not crashed-together."*

---

## Tour Moment — Your app as documentation

With Typography Lab and Color Lab in place, your app is now doubling as design documentation. Every future chapter, you can scroll back to these sections to check what your colors and fonts *actually* are — instead of guessing.

Real products do this too. Companies like Shopify, Stripe, and Atlassian publish public design system websites that *look a lot like what you're building.* You're not just practicing — you're building something with the same DNA as real professional design systems.

When you eventually build the Chapter 8 Components Lab, your button examples will pull from these same palettes. When you build Chapter 9 Motion Lab, the animated elements will use these exact colors. You're creating your own vocabulary for the rest of the curriculum.

---

## Tour Moment — The "scroll test"

Once Chapter 5 is done, do this: scroll your app from top to bottom, slowly. Ask yourself:

1. Do the sections flow naturally from one to the next?
2. Does every part feel like it belongs in the same app?
3. If you landed on this page cold, would you believe it was built by someone with a clear aesthetic vision?

If yes to all three: your system is working. If no to any: note specifically what's off — that's your next iteration target (can be in a follow-up small PR).

The scroll test is something to do at the end of every section-building chapter from here out. It keeps you honest.

---

## Next up

**Chapter 6 — The Eidrix Shell.** This is a milestone chapter. Your scrollable page gets transformed into a chat-on-left + tabs-on-right layout. Typography Lab and Color Lab move into the first tab. You'll see the Eidrix-shape for the first time, and it'll feel like a real product leap. That's the next big visual milestone.
