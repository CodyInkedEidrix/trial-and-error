# Chapter 3 — The Canvas

*This is the chapter where your app stops looking generic and starts looking like yours. You'll install Tailwind CSS, set up the Eidrix color palette (warm blacks, ember orange, cassette-futurism warmth), load distinctive fonts, and create a "design tokens" system. By the end, your page still just says "Trial and Error" — but it'll feel completely different. This is the foundation every future chapter's design work will build on. Total time: about 1.5 hours.*

---

## What you're learning

1. **What Tailwind CSS is and why it's the dominant styling tool right now**
2. **Design tokens** — the system that makes an app feel consistent
3. **CSS variables** — browser-native variables that power the token system
4. **Typography choices** — why fonts matter and how "Inter" became generic
5. **Color theory for dark-native UIs** — why pure black is wrong and warm blacks feel premium
6. **The "before you design" step** — committing to an aesthetic direction before writing a single style

---

## What you're building

Your "Trial and Error" page today is black, white, and centered. After this chapter:

- Background: warm obsidian (not pure black — you'll see the difference)
- Main heading: a distinctive display font in warm-white
- Subtitle: a secondary font, muted warm gray
- A subtle ambient feel — maybe a faint warm radial gradient in the background
- All colors referenced through CSS variables so changing the whole theme is one file

The text content doesn't change. The *feel* changes entirely. This is a transformation chapter.

---

## Plain English glossary for this chapter

- **Tailwind CSS** — a styling tool where instead of writing separate CSS files, you write class names directly in your HTML/JSX. So `<div className="text-white bg-black p-4">` gives you white text, black background, 16px padding. Fast, consistent, hard to mess up.
- **Design tokens** — named values for colors, spacing, font sizes, etc. Instead of using `#FF6B1A` in 47 places, you define `--ember-500: #FF6B1A` once and reference the name. Change the value once, update everywhere.
- **CSS variable** — the browser's built-in version of a design token. Looks like `--color-primary: #FF6B1A` in CSS, used as `var(--color-primary)` elsewhere.
- **Font stack** — a list of fonts, in fallback order. "Use Space Grotesk if available, otherwise system-ui, otherwise whatever sans-serif font the browser has."
- **Aesthetic direction** — a commitment to *how* your app should feel: playful? Brutalist? Editorial? Cassette-futurism? Picking a direction means you can make confident design choices instead of wishy-washy ones.
- **Ember** — the warm orange color that anchors the Eidrix aesthetic. Named for fire and glowing coals, not for the JavaScript framework.

---

## Why this chapter matters

Most beginner projects look the same. White background, black text, default Tailwind gray, Inter everywhere, blue buttons. That's not a style — it's an absence of choice.

This chapter is about making a choice. You're committing to a specific aesthetic so every future chapter can build on it. Buttons, cards, motion, animation, chat UI, Supabase tables — all of them will feel cohesive because they'll be built on the palette and fonts you set up today.

The aesthetic we're committing to: **glass and fire.** Warm, alive, premium, distinctive. Think: a piece of translucent equipment glowing inside a machine in a William Gibson novel. Warm blacks, deep embers, a signature hot orange, subtle warm light. Not minimalist Apple. Not corporate Stripe. Not generic AI-tool-purple. *Yours.*

---

## The plan, in plain English

This chapter is bigger than previous ones because it sets up real infrastructure. Here's the arc:

1. **Start clean, create a branch** — same rhythm as always
2. **Install Tailwind CSS** — the styling tool
3. **Install web fonts** — Space Grotesk (display), IBM Plex Sans (body), JetBrains Mono (code)
4. **Set up design tokens** — obsidian palette, ember palette, text colors, in one central file
5. **Apply the tokens to the page** — your heading and subtitle use the new fonts and colors
6. **Add a subtle ambient touch** — a faint warm radial gradient so the background doesn't feel flat
7. **PR, review, merge** — ship it

We'll go through each piece deliberately. Unlike previous chapters where Claude Code could do a lot in one shot, this one we'll check in more often — design decisions matter and we don't want to rush them.

---

## Step 1 — Start clean

Tell Claude Code:

```
Starting Chapter 3 — The Canvas. Rhythm check: confirm I'm on main, clean, no leftover branches. Ready to install Tailwind and set up the Eidrix design system.
```

If anything's off, clean up first.

---

## Step 2 — Create the branch

Tell Claude Code:

```
Read CLAUDE.md and curriculum/PROGRESS.md. Then create a branch called feature/the-canvas.
```

---

## Step 3 — Ask for the full plan first

This chapter makes several changes at once, so the plan is especially important.

Tell Claude Code:

```
Chapter 3 installs Tailwind CSS and sets up the Eidrix design system. Pin `tailwindcss@^3` — this chapter is written for Tailwind v3's config model (separate `tailwind.config.js` + `postcss.config.js`), not v4's CSS-first setup. Before writing any code, give me a full plan covering:

1. What packages you'll install (Tailwind v3 and any related tooling)
2. What config files you'll create or modify (tailwind.config, postcss.config, etc.)
3. What fonts you'll load and how (Google Fonts link in index.html, or self-hosted, etc.)
4. Where the design tokens will live — I want them as CSS variables in a single dedicated file (something like src/styles/tokens.css) rather than scattered throughout components
5. How src/App.tsx and src/index.css will change to use the new tokens
6. Whether the ambient radial gradient goes in CSS or inline in App.tsx

Don't write any code yet. Just the plan. Wait for my approval.

For the aesthetic direction: glass and fire. Warm obsidian backgrounds (not pure black), burnt-orange ember accents, warm whites (not pure white), distinctive display font (Space Grotesk), distinctive body font (IBM Plex Sans), JetBrains Mono for any monospace. Dark-native — no light mode.
```

---

## Step 4 — Review the plan carefully

This is the most important review you've done yet. Things to check:

- **Installation list looks reasonable?** Tailwind v3 + PostCSS + Autoprefixer is normal. Anything else, ask why.
- **Tokens go in ONE file?** You don't want colors scattered across 5 files. `src/styles/tokens.css` or similar is the right answer.
- **Fonts loaded via Google Fonts?** That's fastest for now. We can self-host later if we care about performance.
- **No surprise files?** If the plan mentions changing something unexpected, ask about it.

If the plan looks solid:

```
Plan approved. Let's build it.
```

If something's off, redirect specifically:

```
One change: [what to adjust]. Show me the revised plan before writing code.
```

---

## Step 5 — Let Claude Code install and configure

Once approved, Claude Code will:
- Run `npm install` for Tailwind and related packages
- Create `tailwind.config.js` (Tailwind's settings)
- Create `postcss.config.js` (a helper tool)
- Add Tailwind's directives to your main CSS
- Link the Google Fonts in `index.html`
- Create `src/styles/tokens.css` with all your design tokens
- Update `src/App.tsx` to use the new styles

This takes a minute or two. Watch the dev server — the page might flash or briefly look broken during the transition. That's normal.

**What to expect when it's done:** Your page shows "Trial and Error" with the new look — warm obsidian background, ember-tinted white heading text, a different font.

---

## Step 6 — Check the tokens file

Before iterating on visuals, let's look at what got created.

Tell Claude Code:

```
Show me the contents of src/styles/tokens.css. Walk me through what each section does in plain English.
```

What you're looking for:
- **Obsidian palette** (warm dark colors — `--obsidian-950`, `--obsidian-900`, etc.)
- **Ember palette** (warm orange tones — `--ember-500`, `--ember-700`, etc.)
- **Text colors** (warm whites and muted grays — `--text-primary`, `--text-secondary`)
- **Typography variables** (font stacks, size scale)

Ask questions if anything's unclear. This file is the foundation of every future style decision.

---

## Step 7 — Iterate on the look

Now the fun part. Look at your page. It probably looks good but might not be *quite* right. Iterate by describing what to change.

Examples of good iteration prompts:

```
The background is a little too uniformly dark. Add a subtle warm radial gradient — something like a faint warm glow emanating from the top-right corner, very soft, barely perceptible.
```

```
The main heading feels too bright. Can we pull it back just slightly — maybe use --text-primary at 95% opacity, or try a very slightly warmer off-white?
```

```
The subtitle needs more breathing room above it. Increase the margin between the heading and subtitle by maybe 0.5rem.
```

Notice the pattern: **be specific about what changes, and reference tokens when you can.** "Make it warmer" is vague. "Use a warmer shade from the obsidian palette" is actionable.

Iterate until you love it.

---

## Step 8 — Open the PR

Tell Claude Code:

```
I'm happy with the canvas. Check off Chapter 3 in curriculum/PROGRESS.md and advance "Currently on" to Chapter 4 as part of the same commit. Then push the branch, open the PR, and give me the link.
```

Bundling the PROGRESS.md checkoff into the chapter's feature PR is the rhythm we adopted after Chapter 1 — it means one PR, one review, one merge per chapter instead of a trailing mini-PR.

---

## Step 9 — Review the diff

This PR is bigger than previous ones. Expected files:

- `package.json` + `package-lock.json` — added Tailwind deps
- `tailwind.config.js` — Tailwind settings (new file)
- `postcss.config.js` — PostCSS settings (new file)
- `index.html` — added Google Fonts link
- `src/index.css` — Tailwind directives + tokens imports
- `src/styles/tokens.css` — your design tokens (new file, the important one!)
- `src/App.tsx` — updated to use new styles
- `curriculum/PROGRESS.md` — Chapter 3 checked off, "Currently on" bumped to Chapter 4

**Focus your review on:**

- `src/styles/tokens.css` — does it match the palette we described (obsidian + ember + warm text)?
- `src/App.tsx` — is it clean and readable?
- `curriculum/PROGRESS.md` — checkbox and pointer both updated
- Any surprise files? If yes, ask why before merging.

Don't stress about `package-lock.json` — it's auto-generated and big. Skim the real code files.

If it looks good:

```
PR looks good. Merge it into main.
```

---

## Step 10 — Clean up

```
Switch back to main, pull the latest, and delete the feature branch locally and on GitHub. Confirm the repo is clean and ready for the next feature.
```

---

## What just happened

You installed a styling framework that professionals use at companies like Vercel, Netflix, and Shopify. You set up a design token system that every future style decision will build on. You committed to a specific aesthetic direction — glass and fire — and your app now reflects it.

This is infrastructure work. It's not flashy like adding a new feature. But the next ten chapters are going to feel *so much better* because of what you did today. Every button, every card, every animation will reach for tokens you defined here instead of making them up fresh each time. That's how real apps stay consistent.

---

## The "three-stop" test

A quick test for whether your design system is actually working: can you describe your app's look to someone in three specific words?

Before this chapter: "uh... black and white?"

After this chapter (ideally): "Warm obsidian. Burnt-orange embers. Cassette-futurism."

If you can describe it in three distinctive words, you have a look. If you can't, the tokens need more personality. Refine over time — the tokens file is easy to update.

---

## What success looks like

- Your page looks noticeably more premium and distinctive than before
- Background is warm obsidian, not pure black
- Heading uses a display font (Space Grotesk or similar)
- Subtitle uses a body font (IBM Plex Sans or similar)
- You can open `src/styles/tokens.css` and see a well-organized palette
- The PR merged cleanly, no leftover branches, working tree clean
- You can describe your aesthetic direction in 2-3 words

---

## If something broke

- **"The page is blank after install"** — probably a Tailwind config issue. Tell Claude Code: *"The page is blank after installing Tailwind. Check the Tailwind and PostCSS configs and make sure Tailwind's directives are imported correctly."*
- **"The fonts aren't loading"** — check `index.html` has the Google Fonts link tag. Tell Claude Code: *"The fonts don't look like Space Grotesk. Help me debug the font loading."*
- **"The colors look wrong"** — verify `src/styles/tokens.css` is actually imported in `src/index.css`. Tell Claude Code: *"The colors don't match the tokens. Help me confirm tokens.css is being loaded."*
- **"Tailwind classes aren't working"** — make sure `tailwind.config.js` has the right content paths (usually `src/**/*.{ts,tsx}`). Tell Claude Code to verify.
- **"I accidentally got Tailwind v4"** — the chapter is written for v3. Tell Claude Code: *"I ended up with Tailwind v4 but this chapter assumes v3. Downgrade to the latest v3 release and regenerate the configs."*

---

## Tour Moment — `package.json` dependencies

This PR added several lines to `package.json` under `"devDependencies"`. That section lists tools used during development that aren't part of the final app.

- **`tailwindcss`** — the styling tool itself (pinned to v3)
- **`postcss`** — a helper that processes CSS
- **`autoprefixer`** — automatically adds browser prefixes to CSS so things work in older browsers

You'll see `package.json` grow over future chapters. Every new tool we install ends up there. Think of it as your project's ingredient list — when someone else clones your repo and runs `npm install`, they get every tool you've added, automatically.

---

## A note on design tokens

You just did something that professional design systems teams spend months on: you created a token architecture. Yours is small, but it's the same pattern used by Shopify Polaris, Adobe Spectrum, Atlassian, Linear, and Stripe. When the Eidrix-real app needs to share design decisions across 50 components, this is how it'll stay consistent.

Two principles worth internalizing:

1. **Never hard-code a color in a component.** Always use a token. If you catch yourself typing `color: #FF6B1A`, stop and use `var(--ember-500)` instead. Token = single source of truth. Hard-coded = drift.

2. **Add tokens before components, not after.** When you need a new color, add it to `tokens.css` first, then use the token in the component. This keeps the palette tight and intentional.

---

## Next up

**Chapter 4 — Typography Section.** We're going to build the first actual content section of your app — a typography showcase that demonstrates every font, size, and weight in your system. Why? Because seeing all your typographic choices together in one place makes your design decisions much clearer. It's also the first "lab section" in what will eventually become the Eidrix-style app structure.
