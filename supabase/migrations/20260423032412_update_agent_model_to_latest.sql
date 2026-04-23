-- update_agent_model_to_latest — switch the agent_model enum to the
-- current Anthropic frontier (April 2026).
--
-- Why a new migration instead of editing the original: append-only
-- migration discipline. Even though the previous agent_settings table
-- has only lazy-upserted defaults (no real user data), the discipline
-- of "never edit applied migrations" is what keeps cloud + dev from
-- drifting in real systems. We rehearse the discipline here.
--
-- Postgres can't drop or rename enum values once they exist (without
-- gymnastics involving table rewrites), so the cleanest path is:
--   1. Drop the agent_settings table (only contained defaults rows)
--   2. Drop the old agent_model enum type
--   3. Recreate both with the current model IDs and pricing-aware order
--
-- Auth.users, customers, jobs, organizations, memberships — all
-- untouched. Only agent_settings (which is org-derived defaults) and
-- the agent_model enum are affected.
--
-- ─── Anthropic naming convention shift (April 2026) ─────────────────
-- For Opus 4.7 and Sonnet 4.6, the API alias and the pinned ID are
-- the SAME string ('claude-opus-4-7', 'claude-sonnet-4-6'). Only Haiku
-- 4.5 retains the old date-suffix convention. Source: Anthropic
-- platform docs, models overview page.

drop table if exists public.agent_settings;
drop type if exists public.agent_model;

create type public.agent_model as enum (
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-7'
);

create table public.agent_settings (
  organization_id uuid primary key
    references public.organizations(id) on delete cascade,
  system_prompt text not null,
  context_mode public.context_mode not null default 'subset',
  model public.agent_model not null default 'claude-sonnet-4-6',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create trigger agent_settings_set_updated_at
  before update on public.agent_settings
  for each row execute function public.set_updated_at();

alter table public.agent_settings enable row level security;

create policy "agent_settings_select_member" on public.agent_settings
  for select
  using (public.is_member_of(organization_id));

create policy "agent_settings_insert_member" on public.agent_settings
  for insert
  with check (public.is_member_of(organization_id));

create policy "agent_settings_update_member" on public.agent_settings
  for update
  using (public.is_member_of(organization_id))
  with check (public.is_member_of(organization_id));
