-- jobs_entity — second tenant-scoped business entity, relational to customers.
--
-- AC-02 introduces relational context for the AI agent. A Job belongs
-- to a Customer, both belong to an Organization. RLS pattern mirrors
-- customers exactly — same is_member_of() helper, same four CRUD
-- policies. Real Eidrix extends this chain (Job → Invoice → LineItem,
-- etc.); the pattern is reusable for every future entity.

-- ─── Job status enum ─────────────────────────────────────────────────
-- Five values cover the lifecycle for service-based businesses:
--   draft        — proposal/quote stage
--   scheduled    — confirmed, on the calendar
--   in_progress  — work has started
--   completed    — done and (presumably) invoiced
--   cancelled    — abandoned
-- AC-02's "Smart Subset" context mode treats the first three as "open".
create type public.job_status as enum (
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);

-- ─── Jobs table ──────────────────────────────────────────────────────
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  customer_id uuid not null
    references public.customers(id) on delete cascade,
  title text not null,
  status public.job_status not null default 'draft',
  scheduled_date date,
  amount numeric(12, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes — every common access pattern.
-- organization_id: every list query filters on this (RLS + app layer).
-- customer_id: "show me this customer's jobs" — common in detail views.
-- status: subset queries filter "open status" jobs.
create index jobs_organization_id_idx on public.jobs(organization_id);
create index jobs_customer_id_idx on public.jobs(customer_id);
create index jobs_status_idx on public.jobs(status);

-- updated_at auto-bumper (function defined in 20260422215034_initial_schema).
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- ─── RLS — mirrors customers; one helper function, both tables ──────
alter table public.jobs enable row level security;

create policy "jobs_select_member" on public.jobs
  for select
  using (public.is_member_of(organization_id));

create policy "jobs_insert_member" on public.jobs
  for insert
  with check (public.is_member_of(organization_id));

create policy "jobs_update_member" on public.jobs
  for update
  using (public.is_member_of(organization_id))
  with check (public.is_member_of(organization_id));

create policy "jobs_delete_member" on public.jobs
  for delete
  using (public.is_member_of(organization_id));
