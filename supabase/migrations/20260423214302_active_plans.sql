-- active_plans — tracks multi-turn agentic loops (AC-05 Session 1).
--
-- A plan is created when the agent calls emitPlanStep for the first
-- time during a chat request. chat.ts generates the plan UUID server-
-- side, inserts a row here with status='running', and then updates
-- the steps jsonb + lifecycle timestamps as the loop progresses.
--
-- ─── Why a table (not just ephemeral state in the function) ─────────
-- Two reasons:
--   1. Stop signaling — Netlify Functions are stateless, so two
--      concurrent invocations can't share memory. The client's Stop
--      button writes requested_stop=true via /chat-stop; the running
--      chat.ts function polls this row at each iteration boundary.
--   2. Rehydration — if the user refreshes mid-plan, the client
--      queries for their running plans to restore the UI. (Session 2
--      adds the UI; Session 1 makes rehydration possible.)
--
-- ─── Why steps as jsonb (not a separate plan_steps table) ───────────
-- Steps are always read/written together with their parent plan.
-- Normalizing would mean an extra query per SSE event for zero
-- analytical benefit. The steps array grows to at most ~20-30 entries
-- even for complex plans — jsonb is comfortable at this size.

-- Plan lifecycle enum.
--   running   — chat.ts loop is active, steps mutating
--   complete  — loop exited with stop_reason='end_turn' naturally
--   stopped   — user (or iteration-cap) halted it
--   failed    — unrecoverable error mid-plan
create type public.plan_status as enum (
  'running',
  'complete',
  'stopped',
  'failed'
);

create table public.active_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  -- Audit + rehydration anchor: the user message that triggered this
  -- plan. on delete set null so a message soft-/hard-delete doesn't
  -- kill the plan row (plans are their own history).
  triggering_message_id uuid
    references public.messages(id) on delete set null,
  status public.plan_status not null default 'running',
  -- Array of PlanStep objects:
  --   { id, title, status, emittedAt, startedAt?, completedAt? }
  -- Mutated in-place as emitPlanStep fires. See PlanStep type in
  -- src/types/activePlan.ts for the canonical shape.
  steps jsonb not null default '[]'::jsonb,
  -- Stop signaling. Client writes true via /chat-stop; chat.ts polls
  -- this at each iteration boundary.
  requested_stop boolean not null default false,
  -- Human-readable summary of how the plan ended ("Stopped at step 4
  -- of 8," "Completed all 6 steps," etc.). Rendered in the Session 2
  -- scrollback plan-summary pill.
  completion_summary text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Common queries:
--   "Does this user have a running plan right now?" — hot path for
--   the client send-gate and the rehydrate-on-load flow. Partial
--   index on status='running' keeps it small.
create index active_plans_user_running_idx
  on public.active_plans(organization_id, user_id)
  where status = 'running';

-- "Show me plans from this conversation, newest first" — scrollback
-- plan-summary rendering in Session 2.
create index active_plans_conv_idx
  on public.active_plans(conversation_id, started_at desc);

create trigger active_plans_set_updated_at
  before update on public.active_plans
  for each row execute function public.set_updated_at();

alter table public.active_plans enable row level security;

-- User-scoped reads — matching messages/memory_facts privacy default.
-- A user can't see another member's plans even within the same org.
create policy active_plans_select_own on public.active_plans
  for select using (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );

create policy active_plans_insert_own on public.active_plans
  for insert with check (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );

-- WITH CHECK matches USING — prevents the "update my own row's
-- user_id to another user" loophole that the hardening pass for
-- messages/memory_facts closed.
create policy active_plans_update_own on public.active_plans
  for update using (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  ) with check (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );

-- No delete policy — plans are audit-grade history. Eventually a
-- user-facing "clear plan history" action might land; for now,
-- plans persist forever (cascade-deleted only if the parent
-- conversation is deleted).
