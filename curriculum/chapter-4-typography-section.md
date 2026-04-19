# Chapter 4 — Typography Section

*Chapter 3 set up your design system. This chapter uses it. You'll build the first real content section of your app — a typography showcase that demonstrates every font, size, and weight in your design tokens. Why? Because seeing all your typographic choices together in one place is how you lock in whether the system actually works. It's also the first "Lab section" — the same pattern every future section will follow. Total time: about 1 hour.*

---

## What you're learning

1. **Component structure** — splitting content into reusable pieces instead of cramming everything in `App.tsx`
2. **Layout patterns** — sections, containers, vertical rhythm, max-width constraints
3. **Typography hierarchy** — how display fonts, body fonts, and mono fonts work together
4. **The Lab section pattern** — the template every future chapter's content will use
5. **Using Tailwind classes with design tokens** — pairing utility classes with your variable-based system

---

## What you're building

Your page grows from "title + subtitle centered on a warm background" into a real scrollable content area:

- Header at the top (keeps your existing "Trial and Error" + subtitle — now acting as a page header)
- Below that: a **Typography Lab** section
- Inside Typography Lab: live examples of every font size, weight, and face in your system, each labeled so you can see what's what

At the end, your page is a real typographic spec sheet you can scroll. Every future chapter's "Lab section" will copy this pattern.

---

## Plain English glossary for this chapter

- **Component** — a reusable piece of UI. Instead of putting all your code in `App.tsx`, you split it into files like `Header.tsx` and `TypographyLab.tsx`. Each one renders a specific piece.
- **Section** — a logical chunk of your page. Think of a landing page: hero section, features section, pricing section. Your Typography Lab is a section.
- **Container** — a wrapper element that constrains content width so text doesn't stretch edge-to-edge on a wide monitor. Usually caps at around 1280px.
- **Vertical rhythm** — consistent spacing between stacked elements. Like how a well-designed book has the same spacing between every paragraph — not random gaps.
- **Props** — values you pass into a component to customize it. Like arguments to a function.
- **Composition** — building a bigger thing out of smaller things. Your page is *composed* of a header + sections + future stuff.

---

## Why this chapter matters

Every app, no matter how fancy, is ultimately just sections of content arranged thoughtfully. Landing pages, dashboards, mobile apps, internal tools — same pattern. Master the Lab section structure here and you have the template for every future feature in this curriculum.

Also: typography is the single biggest determinant of whether an app looks professional or amateur. You can have mediocre color, mediocre layout, mediocre everything — but strong typography hierarchy alone will make an app look 10x more premium. This chapter hardcodes that skill.

---

## The plan, in plain English

1. **Start clean, create branch** — same rhythm
2. **Plan the structure first** — ask Claude Code to propose how to split the code into components
3. **Extract the header into its own component** — `src/components/Header.tsx`
4. **Create the Typography Lab section** — `src/components/TypographyLab.tsx`
5. **Build the typography showcase** — heading scale, body weights, mono samples, real usage examples
6. **Wire it into App.tsx** — header on top, typography lab below
7. **Iterate on the visual result** — spacing, proportions, anything that feels off
8. **PR, review, merge**

This chapter is more about *structure* than styling. Tailwind is doing the heavy lifting on look — you're focused on getting the layout right.

---

## Step 1 — Start clean

Tell Claude Code:

```
Starting Chapter 4 — Typography Section. Rhythm check: confirm I'm on main, clean, no leftover branches. Ready to build the first real content section.
```

---

## Step 2 — Create the branch

```
Read CLAUDE.md and curriculum/PROGRESS.md. Then create a branch called feature/typography-section.
```

---

## Step 3 — Ask for a structural plan first

This chapter introduces component splitting for the first time, so the plan matters extra.

```
Chapter 4 builds the first Lab section: a Typography showcase. Before writing code, give me a plan covering:

1. How you'll restructure the app into components. I want at minimum: a Header component (the existing "Trial and Error" + subtitle) and a TypographyLab component (the new section). Propose the file structure.
2. How App.tsx will change — it should get simpler, just rendering <Header /> and <TypographyLab /> stacked.
3. What goes in TypographyLab — I want to see:
   - A section heading ("Typography Lab" or similar)
   - Display font showcase (Space Grotesk at multiple sizes and weights, labeled)
   - Body font showcase (IBM Plex Sans, different weights, with sample paragraphs)
   - Mono font showcase (JetBrains Mono, showing what code and data would look like)
   - Each showcase block clearly labeled with the font name and any relevant metadata (size, weight)
4. Layout approach — how will the section be contained? Max-width? Padding? Vertical spacing between showcase blocks?
5. How existing design tokens will be used — I don't want hardcoded colors or font sizes anywhere.

Use Tailwind classes for layout and spacing. Reference our design tokens (from Chapter 3) for all colors and font choices — nothing hardcoded.

Don't write code yet. Wait for my approval.
```

---

## Step 4 — Review the plan carefully

Things to check:

- **Does the component split make sense?** Header + TypographyLab as separate files is the minimum. If it proposes more components, ask why.
- **Does every showcase block use a real token?** No hardcoded `#FFFFFF` or `18px`. Everything should reference `font-display`, `text-text-primary`, etc.
- **Is the layout thoughtful?** Max-width container so content doesn't stretch forever. Generous vertical spacing between showcase blocks. Left-aligned content (not centered — centered looks like a landing page, we want documentation energy).
- **Any surprise files?** If it wants to touch something unrelated, question it.

When the plan looks good:

```
Plan approved. Let's build it.
```

If something's off:

```
One change: [specific redirect]. Show me the revised plan before writing code.
```

---

## Step 5 — Let Claude Code build

Claude Code creates the components and updates App.tsx. The dev server rebuilds automatically.

Look at your browser. You should see:
- Your original heading + subtitle at the top (now rendered from `Header.tsx`)
- Below that: a "Typography Lab" section with all the showcase blocks

Scroll through it. Read the labels. See every font, size, and weight in action.

**Expected first impression:** It'll be functional but probably not perfect. That's intentional. The next step is iteration.

---

## Step 6 — Iterate on spacing and rhythm

This is where the skill shows its teeth. Look at the page and notice what feels off. Common things on first build:

- **Too much or too little space between showcase blocks** — "Add more vertical space between each showcase block — maybe 3rem."
- **Container too wide or too narrow** — "Constrain the max-width of the typography lab to around 800px, centered horizontally."
- **Section heading feels disconnected** — "The 'Typography Lab' section heading should feel like a clear divider. Make it larger and give it more breathing room above and below."
- **Labels too close to samples** — "Add a little more space between each label and the sample text it describes."
- **Mono font too dim** — "JetBrains Mono samples feel too faded. Brighten them slightly — maybe use text-text-primary instead of text-text-secondary."
- **Everything feels cramped** — "The whole section needs more breathing room. Increase vertical padding on TypographyLab to 4rem top and bottom."

**Important:** Iterate in small steps. One change at a time. Refresh. Decide. Next change. Don't say "make it better" — say exactly what's bugging you.

Iterate until it looks deliberate. When you're happy:

---

## Step 7 — Open the PR

```
I'm happy with the typography section. Check off Chapter 4 in curriculum/PROGRESS.md and advance "Currently on" to Chapter 5 as part of the same commit. Then push, open a PR, give me the link.
```

Bundling the PROGRESS.md checkoff into the chapter's feature PR is the rhythm we adopted after Chapter 1 — one PR, one review, one merge per chapter.

---

## Step 8 — Review the diff

Expected files:

- `src/App.tsx` — much simpler now, just renders Header + TypographyLab
- `src/components/Header.tsx` — new file, extracted from App.tsx
- `src/components/TypographyLab.tsx` — new file, the actual new content
- `curriculum/PROGRESS.md` — Chapter 4 checked off, "Currently on" advanced to Chapter 5

**Things to check on the diff:**

- `App.tsx` should be dramatically shorter. If it's still huge, something went wrong.
- `Header.tsx` should contain exactly what used to be in App.tsx's heading area.
- `TypographyLab.tsx` should use token-based Tailwind classes throughout. Look for `font-display`, `font-body`, `font-mono`, `text-text-primary`, `text-text-secondary`, etc.
- **NO hardcoded hex colors or px font sizes** should appear in the component code. If you see `#FFFFFF` or `fontSize: '24px'`, flag it.
- `PROGRESS.md` shows the Chapter 4 checkbox ticked and the "Currently on" pointer reading Chapter 5.

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

You shipped your first real content section. You also introduced the pattern every future Lab chapter will use:

1. A section in its own component file
2. Uses design tokens for all visual choices
3. Sits inside App.tsx alongside other sections
4. Scrollable vertical layout

Chapter 5 (Color Section) will add another section below Typography Lab using the exact same pattern. Chapter 8 (Components Lab) will add another. Chapter 9 (Motion Lab) will add another. By Chapter 10 your app is a legitimate design reference you can scroll through — before any real app features exist.

This is the foundation for the eventual Eidrix-style tabbed app. We're building one long scrollable page now, and later (Chapter 6) we'll split those sections into tabs. Same content, different arrangement.

---

## What success looks like

- Scrolling your app from top to bottom shows: Header → Typography Lab
- Typography Lab demonstrates at minimum: display font at 3+ sizes, body font at 2+ weights with a paragraph sample, mono font with a sample
- Every showcase block is labeled so you can see what you're looking at
- Layout feels spacious and deliberate, not cramped
- No hardcoded colors or sizes in component code
- `App.tsx` is much simpler than before
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"I see a blank page / white flash / error overlay"** — probably a typo in JSX or a missing import. The error overlay usually tells you the file and line. Copy the whole error message and paste it to Claude Code.
- **"The new section isn't showing"** — confirm App.tsx actually imports and renders both components. Tell Claude Code: *"The TypographyLab section isn't appearing. Check App.tsx and confirm both components are being rendered."*
- **"Fonts look the same as before"** — your design tokens might not be wired into Tailwind's theme. Tell Claude Code: *"The showcase shows the same font for everything. Help me debug whether font-display, font-body, and font-mono are actually mapped to different fonts in tailwind.config."*
- **"My existing heading disappeared"** — Header.tsx probably didn't get wired back into App.tsx. Tell Claude Code: *"The original heading is gone. Make sure Header is rendered at the top of App.tsx."*

---

## Tour Moment — The components folder

You now have a `src/components/` folder with two files in it. This folder is where almost all your reusable UI pieces will live going forward.

A few conventions worth knowing:

- **One component per file** — `Header.tsx` exports `Header`, `TypographyLab.tsx` exports `TypographyLab`. Don't pack multiple components into one file.
- **PascalCase filenames** — `Header.tsx` not `header.tsx`. Matches the component name.
- **Default export for the main component** — lets other files import it cleanly with `import Header from './components/Header'`.
- **Keep components focused** — when a component gets big enough that scrolling it is annoying, split it into subcomponents.

By the end of this curriculum, `src/components/` will have 20+ components. This is where almost all of your "stuff to build" lives.

---

## Tour Moment — Reading Tailwind classes

Your TypographyLab component is full of Tailwind classes like `mt-8 text-3xl font-display text-text-primary`. Quick guide to reading them:

- `mt-8` — margin-top, size 8 (Tailwind uses a scale, 8 ≈ 2rem)
- `text-3xl` — text size 3xl (one of Tailwind's preset size scales)
- `font-display` — uses your `font-display` token (from Chapter 3's config)
- `text-text-primary` — uses your `text-text-primary` color token

Not every class is self-explanatory, but over time you'll recognize the common ones. Don't try to memorize them now — just notice the pattern: most classes are `property-value` pairs.

---

## Next up

**Chapter 5 — Color Section.** Same pattern as this chapter: another Lab section, below Typography Lab. We'll build a color showcase that displays every color in your design system with swatches, hex values, and usage examples. By the end of Chapter 5, scrolling your app will show: Header → Typography Lab → Color Lab. The app is starting to feel real.
