# Chapter 12 — Deploy It

*Main Track chapter. Milestone moment. Trial and Error stops living only on your machine and becomes a real URL anyone can visit. Netlify handles the hosting. You'll connect the GitHub repo, get the first build working, learn how Deploy Previews work, and understand what Netlify does to your app between `git push` and a live site. About 90 minutes — most of that is clicking through dashboards and waiting for builds, not coding.*

---

## A note on platform choice

Trial and Error deploys to **Netlify**. Real Eidrix and future production work will deploy to **Vercel** — once an account-level phone verification issue resolves with Vercel support.

Both platforms do effectively the same job. The curriculum's Netlify choice for Trial and Error is a routing decision around temporary infrastructure friction, not a strategic one. Everything you learn here transfers ~95% to Vercel when the time comes. When real Eidrix eventually ships, it ships on Vercel. When babbsfence gets rebuilt in Claude Code, it ships on Vercel. Trial and Error just happens to live on Netlify for now because that's what unblocks the curriculum today.

If you're reading this chapter in the future, substitute "Netlify" for "Vercel" in your head if that's where you're deploying. The concepts are identical.

---

## What you're learning

1. **What deployment actually means** — the difference between "works on my machine" and "works on a server"
2. **The build-on-push mental model** — push to GitHub, the platform builds, a URL updates automatically
3. **Reading build logs** — the single most useful deployment skill, and the one everyone skips
4. **Deploy Previews for PRs** — every pull request automatically gets its own live URL for review
5. **Rollback and republish** — how to unship a bad deploy in 30 seconds
6. **What NOT to deploy yet** — environment variables, secrets, API keys (Chapter 13's job)

---

## What you're building

No new code. Instead:

- A Netlify account under your Eidrix email, connected to your GitHub (CodyInkedEidrix)
- The `trial-and-error` repo linked to a Netlify project
- Production deploys from `main` — every merge automatically updates the live URL
- Deploy Previews from PRs — every branch gets its own temporary URL for testing before merge
- A public URL like `trial-and-error-cody.netlify.app` (or similar) that anyone can visit
- A deploy log you can read when things break (and they will, at some point)

By the end of this chapter, you can send a URL to your brother, to Saturday's merch guy, or to anyone curious — and they can click it and see the entire Trial and Error app running live.

---

## Plain English glossary

- **Deployment** — taking code from your local machine and running it on a public server so other people can access it
- **Netlify** — a hosting platform built for modern JavaScript apps. Connects to GitHub, auto-deploys on push.
- **Build** — the process of transforming your source code into the optimized static files that actually run in production. Vite does this locally; Netlify does it on their servers.
- **Production deploy** — what users see when they visit your main URL. Updates when you merge to `main`.
- **Deploy Preview** — a temporary URL for a specific PR or branch. Lets you test changes before merging. Auto-generated for every PR.
- **Build log** — the output from the build process. When things break, this tells you why.
- **Environment variables** — values that differ between local development and production (API keys, secrets, flags). We won't set any this chapter — that's Chapter 13.
- **Rollback** — reverting to a previous deploy, usually because the current one broke. Netlify calls this "Publish deploy."

---

## Why this chapter matters

Three reasons:

**1. It changes what Trial and Error is.** Right now it's a personal project. After this chapter it's a *thing* — something with a URL, something you can share, something real. That psychological shift matters. You stop building for yourself and start building for people.

**2. It's prerequisite infrastructure for everything agentic.** AC-01 (Streaming Chat) will need a serverless function somewhere to hold your Anthropic API key safely. Whether that lives on Netlify Functions (for Trial and Error) or Vercel Functions (for real Eidrix), the deployment model is the same. You need to understand the build-and-deploy rhythm before reasoning about where AI calls happen in production. This chapter builds that foundation; Chapter 13 (Environment Variables) starts using it; AC-01 completes the picture.

**3. It teaches the "works in prod" mindset.** Local dev and production behave differently. Environment variables behave differently. Builds behave differently. The first deploy is where you start thinking about *both environments at once* — the skill that separates hobby projects from shipped software.

---

## The plan, in plain English

1. **Account setup** — Netlify account under Eidrix email, GitHub SSO
2. **Project import** — link the `trial-and-error` repo to Netlify
3. **First deploy** — trigger the build, watch it (possibly fail, read logs, fix)
4. **Test the live URL** — verify every feature works in production
5. **Deploy Preview on a PR** — open a tiny PR, see the preview URL appear automatically
6. **Intentional break & rollback drill** — deliberately ship something broken, practice the rollback
7. **Document the URL and platform choice** — add to CLAUDE.md and PROGRESS.md

No Thorough Plan needed. This is mostly dashboard clicking with some troubleshooting. Claude Code can guide you through it in conversation.

---

## Step 1 — Start clean

```
Starting Chapter 12 — Deploy It. I'm deploying Trial and Error to Netlify (not Vercel — Vercel has an account-level phone verification issue I'm resolving with support separately; real Eidrix will deploy to Vercel later, Netlify is Trial and Error's temporary home). Rhythm check — confirm I'm on main, clean, no leftover branches. No new branch needed yet — we'll create one later for the rollback drill.
```

---

## Step 2 — Netlify account setup

Go to **netlify.com** in your browser. Click **Sign up** (top right).

**Sign up with GitHub** — this is the important part. When prompted to choose a signup method, pick GitHub SSO. Make sure you're signed into GitHub as **CodyInkedEidrix** first — Netlify will connect to whichever GitHub identity is active in your browser.

When Netlify asks which email to use for the account, **use your Eidrix email.** This is the account you're building under long-term.

Plan selection: Netlify's **Starter** (free) plan is what you want. 100GB bandwidth per month, 300 build minutes per month, unlimited sites. Plenty for Trial and Error and your future real Eidrix work.

Tell Claude Code:

```
I've created my Netlify account using GitHub SSO with CodyInkedEidrix and my Eidrix email. What's next?
```

Claude Code will likely guide you through importing the project.

---

## Step 3 — Import the repo

In Netlify's dashboard, click **Add new project → Import an existing project**. Choose **Deploy with GitHub**. Netlify may ask you to authorize access to your GitHub repositories — allow it for CodyInkedEidrix.

Find **trial-and-error** in the repo list and click it.

Netlify will inspect the repo and auto-detect it as a Vite project. The defaults should all be correct:

- Base directory: (blank — root of repo)
- Build command: `npm run build` (Netlify auto-fills this)
- Publish directory: `dist` (Netlify auto-fills this)
- Functions directory: (blank — we don't have any yet)

**Don't change any of these** unless Netlify got them wrong. If it detected Vite and the build command is `npm run build` with publish directory `dist`, you're good.

Environment variables: **leave blank for this chapter.** Chapter 13 handles those.

Click **Deploy trial-and-error**.

Netlify will start building. This takes 30–90 seconds. Watch the logs as they stream in.

---

## Step 4 — The first build

Three possible outcomes:

**Outcome A: It built successfully.**
You'll see a green success state and a live URL (usually `trial-and-error-[random].netlify.app` or similar). Click the URL. Trial and Error should load. Test every tab, scroll through Lab, open the Brand tab, try the chat column, open a customer record. Verify everything works.

**Outcome B: The build failed.**
This is normal. First deploys fail for lots of reasons — TypeScript errors that local dev let slide, imports that work on your filesystem but not on Linux (case sensitivity), missing dependencies that happened to be installed globally on your machine.

Read the build log. Find the actual error. Then tell Claude Code:

```
Netlify build failed. Here's the error log: [paste the error]. Help me debug.
```

Claude Code will walk you through the fix. Common fixes:
- TypeScript type errors that didn't surface locally — fix the types, commit, push, Netlify auto-rebuilds
- Case-sensitivity imports (`./Components/Button` vs `./components/Button`) — fix to match actual file case
- Missing dependencies — add to package.json, commit, push

**Outcome C: It built but the site looks broken.**
You click the URL, the page loads, but something's off — blank sections, missing fonts, broken animations.

Open the browser DevTools on the live URL (F12). Check the Console tab for errors. Common causes:
- Asset paths that assumed a dev-server base URL
- Framer Motion behavior that differs in production builds
- Environment-dependent conditionals that take different branches in prod

Tell Claude Code the specific symptom with the browser console error.

**Whatever outcome you got, don't move on until the live URL shows the full Trial and Error app working.**

---

## Step 5 — Verify everything works on the live URL

Run through the full app on the production URL (not localhost). Check:

- Every primary tab renders (Lab, Components, Records, Chat, Settings, Brand, plus any others in your current active config)
- Typography Lab, Color Lab, Motion Lab render correctly
- Components Lab shows all four primitives with their variants
- The Eidrix Eye breathes and blinks in the chat column header
- Brand tab opens, the big Eye renders, the tuning playground works
- Records tab shows customer table, clicking a row opens detail as a primary tab (Chapter 10.5 pattern)
- Chat column accepts typing, sends messages, canned responses appear, Eye reactions fire

**Things that might differ in production:**
- Framer Motion: occasionally timings feel different in production due to build optimizations. Usually tighter.
- Fonts: web fonts load differently in production. You might see a brief FOUT (flash of unstyled text) on first load.
- LocalStorage: has a different domain in production, so your dev customer data isn't there. Seed data will re-populate. Not a bug.

If anything looks meaningfully broken, fix it locally, push, Netlify rebuilds automatically.

---

## Step 6 — Open a trivial PR to see the Deploy Preview magic

This is the part that'll make you understand why platforms like Netlify and Vercel are such a big deal.

```
Create a branch called feature/chapter-12-readme, add a single line to the README mentioning the live URL (something like "**Live: https://trial-and-error-[yourslug].netlify.app**"), commit, push, open a PR.
```

Now watch Netlify. Within 30–60 seconds, a comment appears on the PR from Netlify's GitHub bot. It includes a **Deploy Preview URL** — a unique URL just for this PR's code.

Click the preview URL. The README change is trivial so the site looks identical — but this URL exists *specifically for your PR*, and if you pushed more commits to this branch the preview would update automatically.

**Why this is powerful:** when you (or your brother, or future teammates) open PRs, reviewers can click a live URL of that PR's changes instead of pulling the branch locally and running it themselves. This is how modern teams ship. Every PR is reviewable as both code AND a live demo.

Don't merge yet — we're about to use this PR for the rollback drill.

Merge the PR when you've clicked around the preview:

```
Merge the README PR into main. Confirm production updates within a minute.
```

Production rebuilds on merge. Refresh your production URL after ~60 seconds — the README reflects live.

---

## Step 7 — The rollback drill

The single most important deployment skill is undoing a broken deploy fast. Let's practice.

```
Create a branch called feature/chapter-12-break, deliberately break the app — simplest option: put a syntax error at the top of App.tsx, or a hard crash like `throw new Error('intentional')` at module load. Commit, push, merge directly to main without a PR review so production actually ships the broken code.
```

Wait 60 seconds. Visit your production URL. It's broken — blank screen, error page, something.

Now the drill. Tell Claude Code:

```
Production is broken. Walk me through the Netlify dashboard rollback — find the previous successful deploy and republish it to production. Don't fix the code yet, just roll back production to the last working version.
```

Claude Code walks you through the Netlify UI:
1. Open the project dashboard on Netlify
2. Go to the **Deploys** tab
3. Find the previous working deploy (the README merge was the last known-good one)
4. Click on that deploy, then click **Publish deploy** (the button that promotes it back to production)
5. Confirm

Within 30 seconds, production is back to the working version. You've just learned the single most important production-ops skill.

Now fix the code:

```
Revert the intentional break — either with git revert on main, or a new PR that undoes the change. Confirm production goes back to auto-deploying from the latest main commit.
```

When you've restored auto-deploy and everything's clean:

```
Production is healthy, last main commit deployed successfully, all working. Confirm state is clean.
```

---

## Step 8 — Add the live URL and platform context to CLAUDE.md and PROGRESS.md

Small housekeeping PR to document this for future-you:

```
Small housekeeping PR. Create branch docs/chapter-12-url. In CLAUDE.md, add a "Deployment" section near the top (right below where project goals are described) that includes:

- The production Netlify URL for Trial and Error
- Note that Trial and Error deploys to Netlify specifically, not Vercel
- Note that this is a temporary routing decision due to a Vercel account phone-verification issue being worked through with support separately
- Note that real Eidrix and future production work will deploy to Vercel once that resolves
- Build details: main auto-deploys, PRs get Deploy Preview URLs

Also update the Chapter 12 entry in PROGRESS.md to checked.

Commit, push, open a PR (which will itself generate a Deploy Preview URL — meta), merge.
```

This matters because future Claude Code sessions will read CLAUDE.md and instantly know where the app lives AND why it lives there. Future-you in a month won't remember this morning's Vercel drama. The comment in CLAUDE.md is a gift to that future-you.

---

## Step 9 — Share it

Send the URL to someone. Your brother, Saturday's merch guy, anyone.

This step isn't frivolous. Getting one outside person to load the URL and see Trial and Error — even for thirty seconds — is a psychological shift. You're now someone with a deployed app.

---

## What just happened

Trial and Error exists on the internet now.

More importantly, you learned the **deploy-first-deploy-often** rhythm. Every merge to main = automatic production deploy. Every PR = automatic Deploy Preview. No ritual, no FTP, no server SSH, no manual uploads. The feedback loop between "I wrote code" and "users can see this running" just collapsed from days to minutes.

This pattern transfers directly to Vercel when you migrate there. Every concept — deploy-on-push, previews-per-PR, rollback-via-dashboard, build-logs-as-debugging — is identical. The UI looks slightly different. The mental model is the same.

---

## What success looks like

- Trial and Error has a live Netlify URL accessible from any device
- Every tab, component, and feature works on the live URL
- PRs automatically get Deploy Preview URLs via Netlify's GitHub bot
- Main merges auto-deploy to production within a minute
- You successfully rolled back a deliberately-broken production deploy via the Netlify dashboard
- CLAUDE.md and PROGRESS.md reflect the deployment state, URL, and the Netlify-vs-Vercel context
- You've shared the URL with at least one person

---

## If something broke

- **"Netlify didn't detect my project as Vite"** — it auto-detects based on `package.json`'s dependencies. Make sure `vite` is in dependencies or devDependencies. Tell Claude Code: *"Netlify didn't detect Vite. Here's my package.json: [paste]. Help me check what's missing."*
- **"Build fails with `Cannot find module './Components/Button'`"** — case sensitivity. Linux (Netlify's build environment) is case-sensitive; macOS isn't by default. Fix the import to match actual filename case, commit, push.
- **"Build succeeds but page is blank"** — usually a client-side JS error. Open DevTools console on the live URL. Paste errors to Claude Code for debugging.
- **"Production works but Deploy Previews show stale content"** — Netlify caches aggressively sometimes. Check the specific Deploy Preview URL from the PR comment, not the main production URL. They're different.
- **"Can't find the Publish deploy button"** — it only appears when you click into a specific previous deploy, not on the Deploys list view. Click the deploy itself, then look for "Publish deploy" in the deploy details.
- **"Environment variables from my .env aren't working in production"** — `.env` is (correctly) in `.gitignore`, so Netlify doesn't see it. Environment variables need to be set in the Netlify dashboard separately (Site settings → Environment variables). This is Chapter 13's job — don't worry about it now.

---

## Tour Moment — What Netlify actually does

When you push to GitHub, here's the chain that fires:

1. GitHub sees the push, looks for installed webhooks
2. Netlify's webhook fires, Netlify queues a build
3. Netlify spins up a fresh Linux container
4. It runs `npm install` to restore dependencies
5. It runs your build command (`npm run build`) — Vite compiles, tree-shakes, minifies, generates the `dist/` folder
6. Netlify takes the `dist/` folder and publishes it to their global CDN (Content Delivery Network)
7. DNS routing sends visitors to the nearest edge server for fast loads

Each step can fail and each has its own category of fix. Understanding the chain means when something breaks you can narrow down *where*.

The magic of the "just push to deploy" feeling isn't really magic — it's seven separate pieces of infrastructure automated into one flow. Vercel, Netlify, Railway, Render, Fly.io, Cloudflare Pages — they all do this same chain, with different specializations and pricing. Learning it once (on any of them) means you can pick up any of the others in a day.

---

## Tour Moment — Environment parity

You might have noticed Trial and Error behaves slightly differently in production vs. local. This is called *environment parity* — how close your production environment is to your development environment.

Things that commonly differ:

- **Build optimizations** — production minifies, strips dead code, optimizes bundle size. Can change timing-sensitive code.
- **File path case sensitivity** — macOS doesn't care about case, Linux does.
- **Environment variables** — local has `.env`, production has Netlify's dashboard variables (different values possible).
- **Node versions** — your local Node vs Netlify's Node can differ, rarely matters but sometimes does.
- **Network latency** — localhost has zero latency; production has real network delay.
- **LocalStorage/cookies** — tied to the domain, so dev and prod have entirely separate stores.

Modern frameworks try hard to minimize these differences, but they never fully eliminate them. The rule: *assume production will behave slightly differently, test on the Deploy Preview URL before merging any non-trivial PR.* This is why preview deploys matter — you're catching production-only bugs before they reach production.

---

## Tour Moment — Deploy Previews change how you work with others

Before preview deploys, code review looked like this: open the PR, read the diff, squint at screenshots, maybe pull the branch locally and run it yourself to test.

With Deploy Previews: open the PR, read the diff, click the preview URL, *use* the change in a real browser.

This changes the economics of review. You (or a teammate) can spot-check visual changes, interaction bugs, and feel-problems in 30 seconds instead of 5 minutes of local setup. That means more PRs get proper review, and fewer subtle bugs reach production.

When your brother starts reviewing your real-Eidrix PRs eventually, this is the workflow that'll let him meaningfully contribute without needing to run the project locally. He opens the PR, clicks the URL, says "feels good" or "the button spacing is off," and you either merge or iterate.

Deploy Previews are one of those pieces of infrastructure that doesn't sound exciting until you have it, at which point you can't imagine working without it.

---

## Tour Moment — Why the Netlify-vs-Vercel note matters

CLAUDE.md now includes a note that Trial and Error is on Netlify temporarily, real Eidrix goes to Vercel. That note isn't bookkeeping — it's protecting future-you from an easy mistake.

Imagine you come back to this project in three months and ask Claude Code "can you deploy this fix?" Without that note, Claude Code might assume you want to deploy to Vercel (the eventual target), create a new Vercel project, get confused about the existing Netlify deploy, and leave you with two half-configured deployments.

With the note, Claude Code reads CLAUDE.md, sees "Trial and Error = Netlify for now, Vercel later," and deploys correctly.

This is the kind of comment that earns its weight forever. Whenever you make a decision that a future reader wouldn't understand by reading the code alone — *why* this choice, what *alternative* was considered, what *context* drove it — leave a note. CLAUDE.md is the right home for context that crosses sessions.

---

## Next up

**Chapter 13 — Environment Variables.** Tiny chapter. You'll set up the `ANTHROPIC_API_KEY` in Netlify's dashboard (and a local `.env` file), learn how environment variables differ between dev and production, and understand the security model for secrets. Prerequisite for AC-01.

Or: **AC-11 — Optimistic UI & Loading States.** Polishes all the data flows from Chapters 10, 10.5, and 11. Skeleton loaders, smooth transitions, success toasts. Pairs well with fresh CRUD and chat work.

Or take a breather with **TC-02 — Web Search** or **TC-03 — Image Analysis.** Both are à la carte tool capabilities, ~45 min each.

My lean: **Chapter 13 next.** Short, sets up AC-01, and you'll want to be able to reason about secrets in production the moment real AI enters the picture. Don't put it off.
