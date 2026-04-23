# Chapter 14 — Supabase Foundation

*Main Track chapter. The data layer gets real. You're replacing Chapter 10's localStorage with a production-grade Supabase setup: multi-tenant schema from day one, Row Level Security enforcing tenant isolation, magic link auth, type-safe queries end-to-end, local-first dev workflow via the Supabase CLI. The customer CRUD from Chapter 10 stays visually identical — only the backend changes. This chapter's real work is architectural rehearsal for real Eidrix. About 4 hours.*

---

## What you're learning

1. **Multi-tenant schema design** — organizations, users, memberships, and the `tenant_id` column on every business-data table
2. **Row Level Security (RLS)** — how Postgres enforces tenant isolation at the database layer, not the application layer
3. **Magic link auth** — passwordless email-based login, the pattern most modern SaaS uses
4. **The Supabase CLI and local dev** — running Postgres locally in Docker, applying migrations, iterating fast without touching cloud infrastructure
5. **Type-safe database access** — Supabase generates TypeScript types from your schema, and your app uses them everywhere. One schema change propagates type errors across your whole codebase, which is what you want.
6. **The backend swap pattern** — Chapter 10's CustomerStore gets replaced with Supabase queries. The UI doesn't change. This is the pattern every future data-backed chapter inherits.
7. **Environment-specific configuration** — local dev hits local Supabase, production hits cloud Supabase, same code.

---

## What you're building

**Database schema (real Eidrix-shaped from day one):**

```
organizations         # tenants — every business owner gets one
users                 # individual authenticated people
memberships           # which users belong to which orgs, with what role
customers             # tenant-scoped — every row has organization_id
```

**Auth flow:**
- User visits Trial and Error → sees a "sign in" state if not authed
- Enters email → receives magic link → clicks → logged in
- On first login, auto-creates an organization for them (single-org-per-user for Trial and Error; real Eidrix will support multi-org per user)
- After login, Records tab shows only their customers

**RLS policies:**
- All business-data tables enforce `organization_id = current_user's_active_org`
- Policies written once, enforced by Postgres for every query, impossible to bypass from the app

**Local dev workflow:**
- `supabase start` spins up local Postgres + Auth + Storage in Docker
- `supabase migration new` creates a versioned schema change
- `supabase db push` syncs to the cloud
- All development happens against local first, production only sees reviewed migrations

**Chapter 10's CustomerStore is replaced** with Supabase-backed queries. All the UI from Chapter 10 (table, slide-in form, delete+undo, empty state) keeps working. The backend is the only thing that changes.

---

## Plain English glossary

- **Tenant** — an isolated customer of your SaaS. In Eidrix, each business owner (your brother, the merch guy, the plumber) is a tenant. Their data is invisible to other tenants.
- **Multi-tenant** — the app is designed to serve many tenants on shared infrastructure, with data isolation enforced at the data layer
- **Row Level Security (RLS)** — a Postgres feature where rules are defined on each table specifying which rows a user can see or modify. Enforced in the database itself, not in application code.
- **Organization / org** — the noun for a tenant in the schema. "Eidrix Construction" is an organization. Users belong to organizations via memberships.
- **Membership** — the join between a user and an organization. Optionally includes a role (owner, admin, staff, etc.).
- **Magic link** — email-based authentication. User gives their email, gets a unique URL in their inbox, clicks it, gets logged in. No password.
- **Supabase CLI** — a command-line tool for running Supabase locally in Docker and managing migrations
- **Migration** — a versioned SQL file that describes a schema change (create table, add column, etc.). Applied in order, reversible in theory, the source of truth for schema history
- **Type generation** — Supabase reads your schema and generates a TypeScript `Database` type. Your app imports it; the compiler checks every query against the real schema.
- **Anon key vs service role key** — two different API keys. Anon key respects RLS (safe for browser). Service role key bypasses RLS (only for server-side admin actions). Never put service role in the browser.
- **Backend swap** — the pattern where you build a UI against a fake data source (localStorage, in-memory), then swap the backend later without changing the UI. Chapter 10 prepared this; Chapter 14 executes it.

---

## Why this chapter matters

Three reasons, and this is where the "every chapter rehearses real Eidrix" framing comes into focus:

**1. Multi-tenancy is a one-way door.** The schema decisions you make here — which tables have `organization_id`, how memberships work, which RLS policy you write — are decisions you'll live with for years in real Eidrix. Building single-tenant and retrofitting multi-tenant is a common, expensive mistake. Building multi-tenant from day one is how professional SaaS is built. This chapter rehearses that with stakes low enough to get wrong.

**2. RLS is how Eidrix's security works.** Imagine shipping real Eidrix and a bug in your application code accidentally queries `customers` without filtering by tenant. Without RLS, that bug leaks every tenant's customers to the wrong customer. With RLS, the database returns zero rows — the bug becomes a visible error instead of a silent data breach. This pattern is load-bearing for trust. You'll write your first RLS policies in this chapter.

**3. The local dev workflow you learn here is your daily Eidrix rhythm.** `supabase start`, write migration, test locally, push to cloud. Every real-Eidrix schema change follows this pattern. Learning it now means real Eidrix's development velocity is high from day one.

---

## The plan, in plain English

1. **Start clean, branch**
2. **Thorough Plan** — schema design, auth flow, migration strategy, backend swap
3. **Install Supabase CLI and start local dev**
4. **Write initial migrations** — orgs, users, memberships, customers, RLS policies
5. **Apply migrations locally, verify schema**
6. **Create a Supabase cloud project** for this chapter's production
7. **Build the auth flow** — sign-in page, magic link, session handling
8. **Swap Chapter 10's CustomerStore for Supabase queries**
9. **Test the full flow end-to-end** — sign in, see empty customer list, add customer, verify it persists, delete, undo, etc.
10. **Push migrations to cloud, deploy, verify production works**
11. **Update REAL_EIDRIX_NOTES.md with decisions made**
12. **Code-simplifier review, ship**

---

## Step 1 — Start clean, branch

```
Starting Chapter 14 — Supabase Foundation. This is the big architectural chapter that rehearses real Eidrix's data layer. Rhythm check, then create branch feature/chapter-14-build.

Read CLAUDE.md, PROGRESS.md, CURRICULUM_DESIGN.md, REAL_EIDRIX_NOTES.md (the Data Architecture and Auth sections especially), and the existing customerStore.ts + types/customer.ts from Chapter 10 so you understand what's being replaced.
```

---

## Step 2 — Ask for the Thorough Plan

This plan is going to be long and technically dense. That's appropriate — we're making decisions that outlive the chapter.

```
Chapter 14 replaces Chapter 10's localStorage CustomerStore with a production-grade Supabase setup. Multi-tenant from day one (organizations/users/memberships/RLS), magic link auth, local-first dev workflow via Supabase CLI, type-safe end-to-end. The UI from Chapter 10 stays visually identical — backend swap only. Read REAL_EIDRIX_NOTES.md's Data Architecture and Auth sections as the authoritative source for decisions already made.

Thorough-plan this.

## Schema design

Propose the full SQL for these tables:

- `organizations` — id (uuid), name (text), created_at, updated_at, settings (jsonb for business_type/config later)
- `users` — Supabase manages the auth.users table; propose whether we need a `public.users` profile table or just use auth.users with RLS-safe joins
- `memberships` — id, user_id (fk to auth.users), organization_id (fk to organizations), role (text or enum — propose which), created_at, invited_by (nullable)
- `customers` — id, organization_id (fk), name, email, phone, status, notes, created_at, updated_at, plus whatever Chapter 10's Customer type had

Propose indexes. At minimum: `customers(organization_id)` because every query filters on it.

## RLS policies

Propose the RLS policies for each table. At minimum:

- `organizations` — users can SELECT orgs they're a member of; only owners can UPDATE; nobody deletes in this chapter (defer deletion logic)
- `memberships` — users can SELECT their own memberships; propose who can INSERT (invites later)
- `customers` — all four operations (SELECT, INSERT, UPDATE, DELETE) gated on `organization_id` matching one of the user's memberships

Write the actual Postgres SQL for these policies. Not pseudo-code.

## Auth flow

Propose:

- Sign-in page location and design (new tab? new page? modal on first visit?)
- Magic link email template (default Supabase or customized?)
- Post-signup org auto-creation — on first successful login, create an organization named like "{user's email} Workspace" and create a membership linking them. Handle via Supabase trigger? Via Edge Function? Via client-side logic immediately after first sign-in? Pick one and defend.
- Session handling — how the app knows who's signed in, how it refreshes tokens, how sign-out works

## Local vs cloud strategy

Propose:

- Installing Supabase CLI (one-time setup)
- `supabase init` in the repo → creates `supabase/` directory with config
- Migration workflow: `supabase migration new <name>` creates a SQL file, edit it, `supabase db reset` applies locally
- Environment variables: `.env` holds LOCAL URL and anon key for local dev; Netlify env vars hold CLOUD URL and anon key for production
- Service role key: where does it live? (Netlify env only for server-side admin operations — if we even need it this chapter)

## Backend swap for CustomerStore

Propose:

- The new shape of `customerStore.ts` — it now uses Supabase client instead of localStorage
- How errors surface to the UI (e.g., "can't connect to database" state in the customer table)
- How the UI state updates when another user in the same org adds a customer in real-time — YES or NO to Supabase Realtime subscriptions for this chapter?

For THIS chapter, I lean NO on realtime — adds complexity for a single-user workspace. We can layer it in later. But propose your take.

## Type generation

- Running `supabase gen types typescript` to generate types from the local schema
- Committing the generated types file to the repo (or regenerating in CI?)
- Using the generated Database type in all Supabase queries

## Environment config

Propose the files needed:

- `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for local
- `.env.example` updated accordingly
- `src/lib/supabase.ts` — the shared Supabase client, reads from env, initialized once

Anon key is safe to expose in browser (it respects RLS). Service role key NEVER in browser.

## Architecture questions

1. Should we use Supabase's Auth UI library (pre-built components) or build our own sign-in page? Propose.

2. How is "currently active organization" tracked? For Trial and Error each user has exactly one org, so it's implicit. But real Eidrix will have users in multiple orgs — where does "active org" live in state? Client-side (React context)? Server-side (session claim)? For this chapter, propose the simplest pattern that doesn't paint us into a corner for real Eidrix.

3. What happens when a user's session expires mid-app-use? Silent refresh? Redirect to sign-in? Error toast?

4. What happens when a user signs out? Does the customer data stay in localStorage (weird) or get cleared (right)?

## Edge cases

At least 8:

- User signs in for the first time (no org exists yet) — the org auto-creation
- User signs in but fails the magic link flow (expired link)
- User is signed in, session expires, tries to add a customer
- User has no memberships (should never happen post-Chapter-14 but graceful failure)
- Local Supabase isn't running when dev server starts
- Migration is applied locally but not pushed to cloud — production breaks
- Service role key is accidentally exposed
- User deletes their only org (defer — not in this chapter, but note it)

## What I'm NOT asking you to build

- Multi-org UI (switching between orgs)
- Role-based permissions beyond simple "member" check
- Organization settings page
- Invite flows (inviting other users to your org)
- Customer data migration from Chapter 10's localStorage (fresh start is fine)
- Supabase Realtime
- Edge Functions
- Full backup strategy

## Notes for REAL_EIDRIX_NOTES.md update

As part of the chapter, what architectural decisions surface that should get written back to REAL_EIDRIX_NOTES.md in the Data Architecture and Auth sections? Propose the deltas.

Plan, don't build. This plan will be long. Wait for my approval.
```

---

## Step 3 — Review the plan carefully

Specific things to push back on:

**The schema SQL.** Ask to see the actual `CREATE TABLE` statements. If anything looks sloppy (no indexes, no foreign key constraints, missing timestamps, using `text` where an enum would be better), push. This schema is real-Eidrix-shape; write it like you mean it.

**The RLS policies as literal SQL.** RLS policies are the security layer. Vague descriptions are unacceptable. If the plan has "users can see their org's customers," push for: "the exact SQL USING clause." Something like `organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid())`. Copy-paste-runnable SQL, not English.

**The org auto-creation mechanism.** This is a tricky one. Three options:
- Client-side after login (simple but can fail if JS errors)
- Postgres trigger on `auth.users` insert (atomic, robust, harder to debug)
- Edge Function invoked from the magic link callback

Each has tradeoffs. The plan should pick one and defend. I'd lean toward the trigger because it's atomic — no user ever exists without an org. But the plan's recommendation should come with the tradeoffs articulated.

**The "active organization" tracking.** This is subtle and wrong-answer-now is a pain later. If the plan suggests storing active org in localStorage, that's probably wrong — a user signed into multiple devices would have different "active orgs" per device. If it suggests putting it in the session/JWT, that's more robust but requires more Supabase plumbing. Figure this out now.

**The service role key guidance.** The plan MUST explicitly state: anon key goes in `.env` with `VITE_` prefix (browser-safe because RLS enforces safety), service role key NEVER gets a `VITE_` prefix. If the plan doesn't make this distinction sharply, push for it — this is exactly the kind of thing that leaks service role keys to the browser.

**The type generation workflow.** Ask: "when I change the schema, what's the exact command sequence to regenerate types, and does the repo commit generated types or not?" I'd lean commit them so the build is self-contained. Plan should defend whichever choice.

When solid:

```
Plan approved. Start with the local Supabase CLI setup and initial migrations — no app code changes yet. Stop after the schema is applied locally and I can verify it with the Supabase Studio UI (localhost:54323 or whatever Supabase runs Studio on).
```

---

## Step 4 — Local Supabase setup

Claude Code installs the CLI (via npm or the Supabase install script), initializes Supabase in the repo, writes the first migrations.

When it stops:

- Run `supabase start` to spin up local stack
- Visit `http://localhost:54323` (Supabase Studio locally) — you should see your tables
- Verify: `organizations`, `memberships`, `customers` all exist with expected columns
- Verify RLS policies are listed on each table (Studio has an RLS tab per table)
- If something's missing or wrong, have Claude Code fix before moving on

Tell Claude Code:

```
Schema looks right in local Studio. Let's move to the Supabase cloud project — I'll create the project in my Supabase dashboard under my Eidrix email. Walk me through the steps.
```

---

## Step 5 — Supabase cloud project

You'll:
1. Sign into supabase.com with Eidrix email (GitHub SSO as CodyInkedEidrix)
2. Create a new project — suggested name: `trial-and-error`
3. Choose a region close to you (Idaho → probably `us-west-1`)
4. Set a database password (save to password manager)
5. Wait ~2 minutes for project provisioning
6. Grab the project URL and anon key from Settings → API

Tell Claude Code:

```
Cloud project created. Here's what I grabbed:
- URL: https://[project-id].supabase.co
- Anon key: [paste]

Push the local migrations to the cloud project and verify the schema matches.
```

Claude Code runs `supabase link --project-ref [project-id]` then `supabase db push`. Schema now exists in cloud.

Set the env vars:
- Locally in `.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` pointing at local (via `supabase status`)
- In Netlify dashboard: same two vars but pointing at cloud

Update `.env.example` with placeholder values.

---

## Step 6 — Build the auth flow

```
Now build the magic link auth flow. The sign-in UI should be a clean, warm-obsidian-themed page that appears when the user isn't authenticated. Single email input + "Send magic link" button, feedback messages, and a "check your email" state after submission.

On successful click of the magic link, the user lands back in the app authenticated.

Implement the org auto-creation using whichever mechanism we decided in the plan (likely the Postgres trigger). Confirm it works by signing in fresh and verifying an org + membership row appear.

Implement sign out — a simple menu item in the app somewhere (Settings tab?) that signs the user out and redirects to the sign-in page.

Test: sign in, sign out, sign in again — should work cleanly. Session should persist across page refreshes.
```

Verify:
- Fresh sign-in creates org + membership
- Session persists across refresh
- Sign out clears session
- Returning to the app signed-out shows the sign-in page

---

## Step 7 — Swap the CustomerStore for Supabase

```
Replace customerStore.ts's localStorage-based implementation with Supabase queries. The exported API (addCustomer, updateCustomer, deleteCustomer, etc.) should have identical signatures so the UI code doesn't change.

Every query must:
- Respect the active organization (inserts auto-fill organization_id from session; queries filter by it — though RLS will enforce this anyway)
- Handle errors gracefully — catch Supabase errors, surface user-friendly messages, don't crash

Delete the seed-data logic (no more auto-populated 12 fake customers — a real user starts with empty state, which we now have a designed empty state for from Chapter 10).

Regenerate TypeScript types (`supabase gen types typescript --local`) and wire them into customerStore.ts so queries are type-safe against the actual schema.
```

Test the full flow:
- Sign in
- See empty customer list with the Chapter 10 empty state
- Click "Add your first customer"
- Form works, save creates a customer in Supabase
- Customer appears in list
- Click row, edit panel opens, edit, save
- Delete customer, undo works, 5-second timeout delete works
- Sign out, sign back in — customers persist

If any of this breaks, fix before moving on.

---

## Step 8 — Deploy and verify production

```
Commit the migration files, the auth components, the updated customerStore, the generated types, and any other changes. Push to the feature branch, open a PR. Wait for Netlify Deploy Preview to build.

Before testing the Deploy Preview: verify the Netlify env vars are set correctly for the Deploy Preview context (Site settings → Environment variables). ANTHROPIC_API_KEY should still be there; VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY should now be added with cloud project values.

Test the Deploy Preview end-to-end — sign in with a different email than you used locally, verify everything works against cloud Supabase.
```

Common issues:
- Env vars not set on Netlify — Deploy Preview will show sign-in page but magic link won't work, or queries will fail silently
- Magic link redirect URL mismatch — Supabase's auth URL config must include the Deploy Preview URL (or you use a development "allow any netlify.app" pattern)
- RLS policy that works locally but not in cloud (unlikely but possible if there's a subtle migration drift)

Fix anything broken. When Deploy Preview passes:

```
Deploy Preview works end-to-end. Merge to main, verify production, clean up the branch.
```

---

## Step 9 — Update REAL_EIDRIX_NOTES.md

```
Small final commit on this chapter's branch (before the merge, so it's part of Chapter 14's PR): update REAL_EIDRIX_NOTES.md with what we locked during this chapter.

Data Architecture section updates:
- Add any specific decisions made (migration workflow, generated types committed vs. regenerated, service role key placement, etc.)
- Note any open questions we deferred (realtime subscriptions, multi-org UI, role system expansion)

Auth section updates:
- Note the org-auto-creation mechanism we picked and why
- Note the active-org tracking approach and its limitations for multi-org future
- Note any specific patterns about session handling

Changelog entry: "April [date] 2026 — Chapter 14 (Supabase Foundation) shipped. Multi-tenant schema, RLS, magic link auth all rehearsed in Trial and Error. Decisions captured in Data Architecture and Auth sections."
```

---

## Step 10 — Ship

```
Code-simplifier review on new Supabase files, customerStore, auth components, and the auth UI. Report suggestions, don't auto-apply.

Then: commit if anything accepted, check off Chapter 14 in PROGRESS.md in the same commit, push final changes, merge PR.
```

---

## What just happened

Trial and Error has a real database. Multi-tenant. Secured by RLS. Auth via magic link. Type-safe. Deployable. Every pattern in this chapter maps directly to real Eidrix.

And — more importantly — you just built real-Eidrix-shape infrastructure in the lab. When you sit down to build real Eidrix, the database decisions aren't theoretical. You've written RLS policies. You've debugged auth flow. You've regenerated TypeScript types after a schema change. You've done the local-to-cloud migration dance.

The uncertainty around "how do I structure real Eidrix's data layer" is now substantially resolved. It looks like what you just built, at scale.

---

## The Real Eidrix Port

**Patterns that port verbatim:**

- **The organizations / memberships / users schema shape.** Exact same pattern for real Eidrix, potentially with additional columns (organizations.business_type, organizations.plan, memberships.role enum with more values).
- **The RLS pattern** for business-data tables — every table that holds tenant data gets the same `organization_id IN (SELECT from memberships)` pattern.
- **The local-first dev workflow** — `supabase start`, `migration new`, `db reset`, `db push`. Daily rhythm for real Eidrix.
- **Type generation** — same `supabase gen types typescript` command, same "commit generated types to repo" pattern.
- **The magic link auth flow** — real Eidrix may add social login later (Google, Microsoft) for convenience but magic link stays the core.
- **The Supabase client instance pattern** — one `src/lib/supabase.ts` that reads env vars, used everywhere else.
- **The CustomerStore swap pattern** — every store in real Eidrix follows this shape: typed functions that wrap Supabase queries, error handling, generated types.

**Patterns that need reshaping for real Eidrix:**

- **Active org tracking.** In Trial and Error, implicit (one org per user). In real Eidrix, explicit — users switch between multiple orgs. This needs UI (org picker, likely in the top-left of the app shell) and state management (probably React context that survives navigation). Defer until you actually have a user with multiple orgs.
- **Org auto-creation.** In Trial and Error, a trigger creates an org on first login. In real Eidrix, the **Sunday Interview** creates the org with business-specific config. Much richer, conversational, potentially using tool calling (AC-03 territory).
- **Role system.** Trial and Error has implicit "user is member." Real Eidrix needs real roles (owner, admin, staff, read-only) with RLS policies that differ by role. Significant expansion.
- **Customer detail richness.** Trial and Error's customers table has Chapter 10's fields. Real Eidrix customers will have sub-tables (jobs, invoices, notes, documents) — the Customer detail tab's multi-section view (Chapter 10.5's deferred complexity) comes to life here.

**Things to decide during the pre-build audit:**

- Single Supabase project per environment (dev/staging/prod), or a single project with environment separation via schemas or separate databases? (I'd lean single-project-per-environment for isolation.)
- When to introduce the role system — at launch, or wait until a tenant actually has multiple team members?
- Custom domain for real Eidrix's Supabase Auth redirect — probably `auth.eidrix.ai` or similar once there's a domain.
- Invite flow — when a tenant invites a staff member, what's the UX? Email + role selection, send email with signup link, new user signs up and auto-joins that org with the assigned role.

**Specific things NOT to port:**

- Chapter 14's seed data pattern — gone. Real Eidrix starts users empty, then the Sunday Interview populates initial config.
- Trial and Error's "all fields flat on the Customer record" — real Eidrix customers have much richer related data (jobs, invoices, notes, documents) via foreign key relationships.

---

## What success looks like

- Supabase CLI installed, local stack running via `supabase start`
- `organizations`, `memberships`, `customers` tables created with proper columns, indexes, foreign keys
- RLS policies written as real SQL, verified enforcing tenant isolation (test: try to SELECT customers while simulating a different user — should return zero)
- Magic link auth works: sign in, check email, click, logged in
- Org auto-creation fires on first login, creates org + membership
- Customer CRUD (from Chapter 10's UI) now writes to Supabase, reads from Supabase, works end-to-end
- Sign out, sign back in, customer data persists
- TypeScript types generated from schema and imported into customerStore
- Local dev uses local Supabase; production uses cloud Supabase; same code
- Netlify production works end-to-end against cloud Supabase
- REAL_EIDRIX_NOTES.md updated with decisions from this chapter
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"`supabase start` fails"** — Docker not running or a port conflict. Tell Claude Code: *"supabase start fails with [error]. Debug whether Docker is running and whether required ports (54321, 54322, 54323) are free."*
- **"Magic link email never arrives"** — Supabase has a rate limit on auth emails, and local Supabase only sends emails to a fake inbox. Tell Claude Code: *"Magic link not arriving. For local dev, find the fake inbox URL. For production, verify Supabase Auth email config."*
- **"RLS blocks queries that should work"** — common gotcha. The auth context might not be propagating to the query. Tell Claude Code: *"Queries return zero rows even though data exists. RLS is probably blocking. Verify auth.uid() in a test query."*
- **"Types are out of sync with schema"** — you changed the schema but didn't regenerate types. `supabase gen types typescript --local > src/types/database.types.ts` and commit. Or automate via a script.
- **"Local works, cloud doesn't"** — migration drift. `supabase db push` to sync. Or if that fails, `supabase db diff` to see what's different.
- **"Service role key ended up in .env with VITE_ prefix"** — STOP. Rotate that service role key immediately in Supabase dashboard, remove it from .env, never use VITE_ for server-only secrets.
- **"Sign-in works but customers don't appear"** — RLS filtering by organization_id but the user's membership isn't set up. Check the membership row was auto-created.

---

## Tour Moment — Multi-tenancy as a design mindset

Before this chapter, Trial and Error was effectively single-user. Your customers were *your* customers. Simple.

Now, Trial and Error has the same bone structure as Salesforce, HubSpot, Linear, Notion, Slack, or any other B2B SaaS. Every query filters by organization. Every RLS policy enforces isolation. Every table scoped to a tenant.

This is the mindset shift that separates "app I'm building for myself" from "SaaS product multiple customers pay for." The shift is mostly architectural — organization_id on every business table, RLS on every business table — but the operational consequences cascade:

- **Billing** becomes per-organization. You charge organizations, not users.
- **Support** becomes "which organization does this bug report concern?" — not "which individual user?"
- **Analytics** become organization-scoped ("how many active orgs last week" not "how many individual sign-ins")
- **Admin actions** become organization-level (suspend an organization, not a user)

You'll feel this mindset shift continue through every future chapter. AC-02 (Context-Aware Chat) injects customer data — but it injects the *user's active org's* customer data. AC-03 (Agentic Foundation) gives Claude permission to create customers — but only in the user's active org. Real Eidrix's "Sunday Interview" configures a new *organization's* workspace, not a user's.

Multi-tenancy isn't a feature. It's the shape of the whole product.

---

## Tour Moment — Why RLS is not optional

The tempting alternative to RLS is "just filter by organization_id in every application query." You could do it. Many apps do. It seems simpler — you write application code, the database doesn't need to know about users.

Here's why RLS wins:

**Bugs in application code become data leaks.** You forget to add `.eq('organization_id', activeOrgId)` to one query in six months. The next customer to visit that page sees another tenant's data. You've just broken trust with every customer whose data leaked.

**RLS makes this bug impossible.** The database refuses to return rows the authenticated user can't see, regardless of what the application asked for. Your buggy query returns zero rows; the customer sees an empty list; you debug, find the missing filter, add it, ship. No data leak.

**RLS is enforcement, not suggestion.** Every client — your React app, your mobile app if you build one, a rogue developer with a stolen anon key trying to scrape customers — goes through RLS. Even a direct database API hit from someone who figured out your anon key hits RLS.

**RLS is expressive.** "User can see customers in orgs they're a member of" is one policy. "User can only update customers in orgs where they have role >= 'staff'" is one policy. You write the rules once, and they're enforced everywhere.

The cost of RLS: learning to write policies, occasional "why is this query returning zero rows" debugging. The benefit: a class of security bugs becomes impossible.

Every serious B2B SaaS built on Postgres uses RLS (or equivalent tenant isolation). Eidrix will too. Starting now.

---

## Tour Moment — The local-first dev rhythm

The workflow you just learned:
1. Start local Supabase (`supabase start`)
2. Create migration (`supabase migration new add_something`)
3. Edit the SQL file
4. Apply locally (`supabase db reset`)
5. Test the app against local
6. Push to cloud (`supabase db push`) when ready
7. Generate types if schema changed (`supabase gen types typescript --local`)
8. Commit everything (migration, types, app code)

This rhythm protects production. You never touch cloud directly. Every change goes through a migration file, which is versioned, reviewed via PR, applied reproducibly. If something breaks locally, production is fine — because you haven't pushed yet.

The alternative — editing schema directly in the Supabase cloud dashboard — is seductive because it's fast. It's also how you end up with:
- Schemas that differ between environments with no record of why
- Changes no one remembers making
- Untestable migrations (you changed dev, forgot, pushed code assuming it worked, it didn't)
- Disaster recovery where "restore from backup" doesn't recreate the schema because the schema was never captured in a migration

Real Eidrix will have the same rhythm. Every schema change is a migration. Every migration is in version control. Production only receives reviewed, merged migrations. It's discipline; it pays off every time something goes wrong.

---

## Next up

**AC-02 — Context-Aware Chat.** The AI gets aware of your customer data. Asking "who are my most recent customers?" returns real answers because the chat function injects customer records into Claude's context. The first chapter where Eidrix becomes *useful*, not just *present*. About 2-3 hours.

After AC-02:
- **AC-03 — Agentic Foundation.** THE chapter. Claude gets permission to create/update/delete customers via natural language. Agentic Eidrix begins here. ~4 hours.
- **AC-04 — Agent Memory.** Cross-session persistent memory. The hybrid (Postgres + vector) pattern from REAL_EIDRIX_NOTES.md gets rehearsed. ~3-4 hours.
- **AC-05 — Multi-Turn Loops.** Agent takes multiple steps for one request. "Plan my Thursday" becomes real. ~2 hours.

Then **Pre-Build Audit**, then real Eidrix. Getting close.
