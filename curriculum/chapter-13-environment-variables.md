# Chapter 13 — Environment Variables & Secrets

*Main Track chapter. The gate chapter that unlocks real AI work. You'll set up an Anthropic API key, store it safely (not in Git, not in the browser), configure both local dev and Netlify production to read it, and build a tiny Netlify Function that proves the whole chain works end-to-end. No real AI calls yet — that's AC-01's job. This chapter is plumbing. About 75 minutes. Short chapter with high leverage.*

---

## What you're learning

1. **The server-vs-browser split** — where your code runs, why that matters for API keys, and why the wrong split gets people's credit cards drained
2. **Environment variables** — values stored outside your code that change between local dev and production
3. **The `.env` file pattern** — how local dev stores secrets without committing them to Git
4. **Netlify's environment variable dashboard** — how production stores secrets
5. **Vite's `VITE_` prefix convention** — the one rule that separates "this goes to the browser" from "this stays on the server"
6. **Netlify Functions as serverless infrastructure** — what they are, when to use them, how they read env vars
7. **Spending limits on AI APIs** — the operational hygiene that protects you from bugs and runaway costs

---

## What you're building

Four small things, each a single file or configuration change:

- **`.env`** (local) — holds your Anthropic API key for dev work, gitignored so it never reaches GitHub
- **`.env.example`** — a template showing what env vars exist, committed to Git so other developers (or future-you on a new machine) know what to configure
- **Netlify dashboard entry** — the same env var set in Netlify's production environment
- **`netlify/functions/health.ts`** — a tiny Netlify Function that reads the env var and returns a health check. Proves the chain works end-to-end.

Plus one Anthropic account with an API key and a spending limit set.

---

## Plain English glossary

- **Environment variable** — a named value (like `ANTHROPIC_API_KEY=sk-ant-abc123...`) that's available to your code at runtime but stored outside your source code
- **Secret** — any sensitive value: API keys, passwords, database credentials, tokens. Anything that would cause damage if published publicly.
- **`.env` file** — a plain text file at your project root that holds local environment variables. Git should ignore it so it never gets committed.
- **`.env.example`** — a template showing what env var names exist, with placeholder values. Safe to commit to Git.
- **Server-side code** — code that runs on a server (like a Netlify Function). The user never sees this code or the values it has access to.
- **Client-side / browser code** — code that runs in the user's browser. Everything here is visible via DevTools. Never put secrets here.
- **Serverless function** — a small piece of server-side code that runs on demand, without you managing a persistent server. Netlify Functions, Vercel Functions, AWS Lambda are all examples.
- **VITE_ prefix** — Vite's convention: env vars that start with `VITE_` get exposed to browser code. Unprefixed ones stay server-only. **This is critical for security.**
- **Health check** — a tiny API endpoint whose only job is to confirm the system is alive and reachable. Returns something minimal like `{status: "ok"}`.

---

## Why this chapter matters

Three reasons:

**1. It's the "first time you handle money" chapter.** The Anthropic API key you set up here is a real authentication credential that can spend real money. Handling it correctly is a non-negotiable skill for any developer building AI products. Handling it wrong is how people wake up to $3,000 in bot-scraped API charges.

**2. It enforces the server-vs-browser mental model.** Every web app ever built has some split between "code that runs on the server" and "code that runs in the browser." For AI apps, this split determines whether your API key lives or dies. Once you internalize it, you'll stop making the single most common AI-app security mistake on your own forever.

**3. AC-01 becomes a focused chapter because of this one.** AC-01 (Streaming Chat Foundation) should be about streaming mechanics — how responses come back token by token, how they render incrementally. If AC-01 also had to teach env vars, Netlify Functions, and server/browser split, it'd be a sprawling mess. Chapter 13 carries that weight so AC-01 stays clean.

---

## The plan, in plain English

1. **Set up your Anthropic account and get an API key**
2. **Set a spending limit** so bugs can't cost you real money
3. **Create `.env` and `.env.example` files locally**
4. **Confirm `.env` is gitignored** (critical — if it isn't, your key ends up on GitHub)
5. **Add the env var to Netlify's dashboard**
6. **Build a tiny Netlify Function that reads the key** and confirms it's reachable
7. **Test the function locally and in production**
8. **Document the pattern** in CLAUDE.md so future chapters know the rules

---

## Step 1 — Set up your Anthropic account

Go to **console.anthropic.com** in your browser.

Sign up (or log in if you have an existing account from Claude Desktop use). Use your Eidrix email — this keeps everything on the same account identity you're migrating to.

**Important: this is for the API key account, not just Claude.ai.** The Anthropic Console at `console.anthropic.com` is separate from the Claude.ai chat interface. If you've been chatting with Claude on claude.ai, you have a Claude account, but you may not have set up Anthropic API billing yet.

Once logged in, you should see a developer console with sections for Workbench, API Keys, Settings, Billing.

Tell Claude Code:

```
I've set up my Anthropic API account on console.anthropic.com using my Eidrix email. What's next?
```

Claude Code will walk you through the next bits.

---

## Step 2 — Set a spending limit BEFORE generating the key

**Do this before creating the API key.** This is the discipline that saves you from waking up to a $3,000 bill.

In the Anthropic Console:

1. Go to **Settings → Billing** (or wherever billing lives in the current UI)
2. Add a payment method (credit card, usually)
3. **Set a monthly spending limit** — I'd recommend **$20/month** for development work. You can always raise it later. You genuinely won't hit $20 during the entire curriculum unless you do something weird.
4. Confirm the limit is saved

Why this matters: if there's ever a bug in your code that makes a hundred API calls per second (yes, this happens — happens most often with infinite loops in useEffect), the spending limit caps the damage. Without a limit, you're trusting your code to be perfect. With a limit, you're trusting Anthropic's billing enforcement.

Professional operational hygiene. Never skip it.

---

## Step 3 — Generate the API key

1. Go to **API Keys** in the Anthropic Console
2. Click **Create Key**
3. Name it something descriptive — `trial-and-error-dev` is a good start. Later you'll make a separate key for production, one for real Eidrix, etc. Naming matters.
4. Copy the key that appears. It'll look like `sk-ant-api03-Xyz...`
5. **Save it somewhere secure immediately.** Your password manager is ideal (1Password, Bitwarden, Apple Keychain). Anthropic will show this key exactly once — if you lose it, you have to generate a new one.

The key is now in your password manager. Don't paste it into chat messages, Slack, emails, or anywhere else unencrypted.

---

## Step 4 — Create the `.env` file locally

Tell Claude Code:

```
Create branch feature/chapter-13-env-setup. Then create two files at the repo root:

1. `.env` — contains my actual Anthropic API key:
   ANTHROPIC_API_KEY=sk-ant-[paste my actual key here]

2. `.env.example` — template with placeholder:
   ANTHROPIC_API_KEY=sk-ant-your-key-here

Then verify that `.env` is already in `.gitignore`. Show me the gitignore contents before proceeding.
```

**The gitignore check is non-negotiable.** If `.env` isn't gitignored, your key gets committed to GitHub the next time you push, scraped by bots within minutes, and used to rack up charges within hours. This has happened to real companies. Don't skip this step.

Claude Code should verify `.env` is in `.gitignore`. If it's not, it adds it. Tell Claude Code:

```
Confirm `.env` is gitignored, then commit `.env.example` only (never `.env`). Show me the git status before committing to prove `.env` is NOT staged.
```

Review the output. `git status` should show `.env.example` as staged, and `.env` should NOT appear in the staged list (it should either not appear at all, or appear as "ignored" if you explicitly check ignored files). If `.env` is staged, stop and fix the gitignore before continuing.

---

## Step 5 — Set the env var in Netlify

Now the production side.

1. Go to your Netlify dashboard, open the `trial-and-error` project
2. Click **Site configuration → Environment variables**
3. Click **Add a variable**
4. Key: `ANTHROPIC_API_KEY`
5. Value: paste your API key (the same one as your `.env`)
6. Scopes: leave as all (Builds, Functions, Runtime) — we want all of them
7. Deploy contexts: select **All deploy contexts** (so production AND Deploy Previews both have access)
8. Save

The env var is now available to Netlify Functions and the build process in production.

**Security note:** Netlify stores this encrypted and only exposes it to authorized parts of your build. It never appears in the browser bundle unless you explicitly leak it (which we'll NOT do — more on that below).

---

## Step 6 — Understand the Vite `VITE_` rule

Before building the function, a critical rule about Vite:

**Env vars prefixed with `VITE_` are exposed to browser code. Env vars without that prefix stay server-only.**

This means:

- `VITE_PUBLIC_API_URL=https://api.example.com` → accessible in React components, bundled into the browser JavaScript, visible in DevTools
- `ANTHROPIC_API_KEY=sk-ant-...` → server-only, NEVER bundled into the browser, NEVER accessible from React components

**Our Anthropic API key does NOT have the VITE_ prefix — on purpose.** That means your React components literally cannot see it, even if you tried. The only way to call the Anthropic API is through server-side code (Netlify Functions).

This is the security model. Respect it and your key is safe. Violate it by adding `VITE_` to a secret, and your key ends up in every user's browser.

**Claude Code guardrail:** if you ever ask Claude Code to "use the Anthropic API key in a React component," it should push back hard. The correct answer is always "call a Netlify Function from the component; the function uses the key."

---

## Step 7 — Build the health-check Netlify Function

```
Create a Netlify Function at `netlify/functions/health.ts`. This function:

1. Reads the ANTHROPIC_API_KEY from the environment (process.env.ANTHROPIC_API_KEY)
2. Returns a JSON response with:
   - status: "ok"
   - hasApiKey: true or false (based on whether the key is present and non-empty)
   - keyLength: the length of the key (for diagnostic purposes — NEVER return the key itself)
   - timestamp: current ISO timestamp
3. Handles CORS properly so the browser can call it
4. Never logs the key itself to console or response

The function should be written in TypeScript matching our existing project style.

Also: we need to make sure Netlify knows how to build this function. Check if `netlify.toml` exists at the repo root. If not, create it with the functions directory pointed at `netlify/functions`. If it exists, verify the functions directory is configured correctly.
```

Claude Code creates the function. When it's done, verify:

1. The function file exists at the right path
2. It reads `process.env.ANTHROPIC_API_KEY`
3. It returns diagnostic info but NEVER the key itself
4. `netlify.toml` points the functions directory correctly

---

## Step 8 — Test the function locally

```
Install the Netlify CLI globally if not already installed (`npm install -g netlify-cli`), then run `netlify dev` which spins up both the Vite dev server and the Functions runtime locally. Confirm it starts without errors.
```

Netlify Dev is a local tool that simulates the full Netlify environment (including Functions) on your machine. It reads your local `.env` file for env vars.

When it's running, you should see output like:
- Vite server at `http://localhost:8888` (Netlify's default port — not 5173)
- Functions at `http://localhost:8888/.netlify/functions/health`

Open a new terminal tab and test the function:

```
curl http://localhost:8888/.netlify/functions/health
```

Expected response:
```json
{
  "status": "ok",
  "hasApiKey": true,
  "keyLength": 108,
  "timestamp": "2026-04-22T15:30:00.000Z"
}
```

If `hasApiKey` is `true` and `keyLength` is a believable number (Anthropic keys are ~108 chars), your local env var setup works.

If `hasApiKey` is `false`, your `.env` file isn't being read. Tell Claude Code the symptom and debug.

---

## Step 9 — Test the function in production

Commit the function and `netlify.toml` changes, push, let Netlify auto-deploy.

```
Commit the health function, netlify.toml, and .env.example changes. Push to the feature branch, open a PR so we get a Deploy Preview. Wait for the deploy to complete, then we'll test the production function.
```

When the Deploy Preview is live, test the function in production. The URL will be:

```
https://[deploy-preview-url]/.netlify/functions/health
```

You can hit this from curl, from your browser, or from the DevTools fetch panel. Either way:

- `hasApiKey: true` → production env var is correctly configured
- `hasApiKey: false` → you forgot to set the env var in Netlify's dashboard, or set it wrong

If production shows `hasApiKey: false` but local shows `true`, go back to Netlify's Environment Variables dashboard and double-check. Common mistake: typo in the key name, or setting it with the wrong scope/context.

When both local and production return `hasApiKey: true` with a sensible key length:

```
Both local and production health checks pass. Env vars are configured correctly. Merge the PR into main.
```

---

## Step 10 — Document the pattern in CLAUDE.md

```
Small update to CLAUDE.md. Add a new section called "Environment Variables & Secrets" with:

- The general rule: secrets never go in React components
- The VITE_ prefix rule: prefixed = browser, unprefixed = server-only
- Where secrets live: `.env` locally (gitignored), Netlify dashboard in production
- The pattern: call Netlify Functions from React, functions use the keys
- An explicit note: if future Claude Code sessions are asked to "use the Anthropic key in a component," that request is wrong — it must be called from a function instead

Check off Chapter 13 in PROGRESS.md.

Single commit with both updates. Small PR.
```

Merge, clean up.

---

## What just happened

Trial and Error now has a real Anthropic API key, stored securely, verified reachable from both local dev and production, with a Netlify Function that proves the plumbing. No AI calls have happened yet — but the moment AC-01 arrives, every piece of infrastructure is ready.

More importantly: you now understand the **server-vs-browser split**. Every future chapter that touches sensitive data follows the same pattern. Database queries go through functions. Payment processing goes through functions. AI calls go through functions. Anything that needs a secret goes through functions.

This pattern is the single most important security habit for any web application. You've internalized it on a chapter where nothing is actually at stake (no real API traffic yet), which means when real traffic shows up, the habit is already in place.

---

## What success looks like

- Anthropic account set up under Eidrix email with $20/month spending limit
- API key generated, saved in password manager
- `.env` file created locally with the key, gitignored, never committed
- `.env.example` committed as a template
- Netlify dashboard has ANTHROPIC_API_KEY set in production env vars
- `netlify/functions/health.ts` exists and works locally + in production
- `netlify.toml` correctly configures the functions directory
- `curl https://[url]/.netlify/functions/health` returns `hasApiKey: true` in both local and production
- CLAUDE.md documents the pattern for future sessions
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"`.env` is showing up in git status"** — gitignore not configured. Stop everything, add `.env` to `.gitignore` BEFORE pushing. If you already pushed `.env` somewhere, rotate the key immediately at Anthropic Console and treat the old one as compromised.
- **"Local function returns `hasApiKey: false`"** — `.env` isn't being read by Netlify Dev. Tell Claude Code: *"Health function returns hasApiKey: false locally. Debug — is `.env` being read by `netlify dev`?"*
- **"Production function returns `hasApiKey: false`"** — env var not set in Netlify dashboard, or scope/context is wrong. Double-check: Site configuration → Environment variables → ANTHROPIC_API_KEY exists with all scopes and all deploy contexts selected.
- **"`netlify dev` won't start"** — usually a Netlify CLI install or auth issue. Tell Claude Code: *"netlify dev fails to start with [paste error]. Walk me through the fix."*
- **"I committed `.env` by accident"** — STOP. Do not push. Tell Claude Code: *"I accidentally committed .env. Help me remove it from git history and add it to gitignore. Also: assume the key is compromised, I'll rotate it."* Then rotate the key at Anthropic Console, because if you pushed even once, it may already be scraped.
- **"The health function times out"** — possibly a build config issue. Check `netlify.toml` has the functions directory correctly pointed. Tell Claude Code: *"Health function times out. Here's my netlify.toml: [paste]. Help me check the configuration."*

---

## Tour Moment — The server-vs-browser mental model

Everything you write for the web runs in one of two places:

**On a server** (Netlify Functions, Vercel Functions, AWS Lambda, Node.js servers, Python servers, etc.)
- User can't see the code
- Secrets stored in environment variables are safe here
- Database credentials live here
- API keys for third-party services live here

**In the browser** (React components, anything that ends up in the final bundle)
- User CAN see the code (DevTools, View Source, network inspection)
- Anything here is effectively public
- Secrets placed here are compromised the moment someone visits your site
- Bots scrape public JavaScript constantly looking for leaked keys

This split is the foundation of web security. Every web vulnerability you've heard about — leaked API keys, exposed database credentials, compromised payment flows — is a case of someone putting server-tier data in browser-tier code.

The rule: **if it's a secret, it runs on a server.** No exceptions.

Vite's `VITE_` prefix rule is how this gets enforced at the framework level. Unprefixed = server-only. Prefixed = browser-accessible. If you accidentally put a secret behind a `VITE_` prefix, Vite will happily bundle it into your browser JavaScript where every user can read it. That's why **never give a secret a `VITE_` prefix** is a rule you internalize forever.

---

## Tour Moment — Spending limits as a discipline

You set a $20/month spending limit on Anthropic. That's not caution — it's engineering discipline.

The mindset: *write code as if bugs are inevitable, and configure your infrastructure so the blast radius of any single bug is survivable.*

Spending limits are one of many "blast radius" controls:
- **API spending limits** — cap how much a runaway API call loop can cost
- **Rate limits** — cap how often a single user or IP can hit your API
- **Access controls** — ensure the fewest people possible have production keys
- **Separate dev / staging / production keys** — a compromised dev key doesn't touch production
- **Key rotation policies** — rotate periodically so leaked keys expire

You won't implement all of these in Trial and Error. But you'll see them again in real Eidrix, and the mindset — assume bugs happen, limit the blast radius — is what separates amateur from professional infrastructure.

The $20 limit you just set is the first blast-radius control in Eidrix's history. There'll be more.

---

## Tour Moment — Why Netlify Functions (and not "just call the API from React")

A common beginner question: *why can't I just call Anthropic's API directly from my React component? Isn't that simpler?*

Yes, simpler. Also catastrophically insecure.

To call Anthropic's API, you need an API key. React components run in the browser. Anything accessible in the browser is public. Therefore: your API key would be public.

Public API keys get scraped by bots. Within 24 hours of your first production deploy, automated scrapers find your key in the JavaScript bundle, test it, and start using it. Your $20 spending limit trips on day one and your app stops working. Or, if you forgot the spending limit, your credit card takes a serious hit.

This is why the pattern exists:

1. React component wants to call the AI
2. React component calls your Netlify Function
3. Netlify Function (running on the server, with access to the API key) calls Anthropic
4. Response flows back through the function to the component

You pay a tiny performance cost (one extra network hop) in exchange for security (your key never touches the browser). This tradeoff is mandatory for any production AI app.

Every professional AI product you've used — Claude.ai itself, Cursor, ChatGPT, Perplexity — uses this exact pattern. The API key lives on their servers. Your browser talks to their servers. Their servers talk to the AI. The key is invisible to you as a user.

Now Trial and Error follows the same pattern.

---

## Next up

**AC-01 — Streaming Chat Foundation.** The chapter you've been building toward. The canned responses in the chat column get replaced with real AI streaming from Anthropic's API. The Netlify Function you built in this chapter grows up into the real chat-completion function. The Eye's reactions fire for real AI events. The chat column becomes *actual* Eidrix.

This is the chapter where Eidrix starts being Eidrix. You've earned it.

After AC-01:
- **TC-02 — Web Search** and **TC-03 — Image Analysis** are nice breathers, both ~45 min
- **Chapter 14 — Supabase Foundation** is next on the main track, sets up real data persistence
- **AC-02 — Context-Aware Chat** comes after that, making the chat aware of your records
- **AC-03 — Agentic Foundation** is the big one — AI that can actually DO things in your app

The runway from here to "agentic Eidrix" is short. Every chapter from this point on is building toward the thing you've been imagining.
