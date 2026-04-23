-- agent_settings — per-organization configuration for the AI agent.
--
-- AC-02 introduces this so real Eidrix's per-tenant customization works
-- out of the box. Every org gets exactly one row (organization_id is
-- the primary key). The chat function reads this on every request to
-- determine the system prompt, what business data to inject as context,
-- and which Claude model to call.
--
-- Lazy-upsert pattern: rows are NOT created at org creation. The store
-- inserts defaults on first read instead — keeps handle_new_user()
-- thin and avoids tying agent-config evolution to user-creation logic.

-- ─── Enums ──────────────────────────────────────────────────────────

-- How much business data the agent sees in its system prompt.
-- 'subset' is the production default — recent + open data only,
-- which keeps tokens (and cost) reasonable at scale.
create type public.context_mode as enum ('off', 'subset', 'full');

-- Pinned Anthropic model IDs that the agent_settings.model column may
-- reference. Friendly names ("Sonnet 4.5", "Opus 4.1") live in the UI;
-- these IDs are what the SDK actually receives. To add a newer model,
-- run: alter type public.agent_model add value 'claude-...-YYYYMMDD'.
create type public.agent_model as enum (
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5-20250929',
  'claude-opus-4-1-20250805'
);

-- ─── Table ──────────────────────────────────────────────────────────
-- One row per org enforced naturally by making organization_id the PK.
create table public.agent_settings (
  organization_id uuid primary key
    references public.organizations(id) on delete cascade,
  system_prompt text not null,
  context_mode public.context_mode not null default 'subset',
  model public.agent_model not null default 'claude-sonnet-4-5-20250929',
  updated_at timestamptz not null default now(),
  -- Records who last touched the settings — useful when multiple
  -- members of an org can edit. Nullable so initial inserts (before a
  -- specific user is associated) don't fail.
  updated_by uuid references auth.users(id) on delete set null
);

create trigger agent_settings_set_updated_at
  before update on public.agent_settings
  for each row execute function public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────
-- Members can SELECT, INSERT (lazy upsert), and UPDATE their org's
-- settings. No DELETE policy — nobody deletes settings, "reset" =
-- update to defaults.
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
