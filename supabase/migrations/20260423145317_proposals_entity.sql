-- proposals_entity — third tenant-scoped business entity.
--
-- AC-03 introduces Proposals as the third relational entity. The chain
-- is now Customer → Job → Proposal, with Proposal belonging to a Customer
-- (required) and optionally tied to a Job (a proposal can pre-date any
-- job being created from it — the artifact often precedes the commit).
--
-- This migration is the third rep of the same pattern used for customers
-- and jobs — same is_member_of() RLS helper, same 4 CRUD policies, same
-- snake_case columns, same set_updated_at trigger, same numeric money.
-- Deliberately repetitive: the point is to prove the template locks,
-- not to invent a new shape.

-- ─── Proposal status enum ────────────────────────────────────────────
-- Four values cover the proposal lifecycle:
--   draft      — being written, not yet shared with customer
--   sent       — delivered to customer, awaiting response
--   approved   — customer accepted; typically converts into a job
--   rejected   — customer declined
create type public.proposal_status as enum (
  'draft',
  'sent',
  'approved',
  'rejected'
);

-- ─── Proposals table ─────────────────────────────────────────────────
create table public.proposals (
  id uuid primary key default gen_random_uuid(),

  -- Tenant scope. Mandatory for RLS.
  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  -- A proposal always belongs to a customer.
  customer_id uuid not null
    references public.customers(id) on delete cascade,

  -- A proposal MAY be tied to a job. Nullable because the proposal
  -- often predates the job being scheduled. on delete set null (not
  -- cascade) — deleting the job shouldn't destroy the artifact that
  -- led to it; the proposal may still be referenced in billing history.
  job_id uuid
    references public.jobs(id) on delete set null,

  title text not null,
  amount numeric(12, 2) not null default 0,
  status public.proposal_status not null default 'draft',
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes — every common access pattern.
--   organization_id + created_at desc: the list view, newest first
--   customer_id: "proposals for this customer"
--   job_id (partial): "proposals attached to this job" — partial so
--     we don't index the null rows that don't participate in the query
--   organization_id + status: filter-by-status common in reporting
create index proposals_org_created_idx
  on public.proposals(organization_id, created_at desc);
create index proposals_customer_idx on public.proposals(customer_id);
create index proposals_job_idx on public.proposals(job_id) where job_id is not null;
create index proposals_org_status_idx on public.proposals(organization_id, status);

-- updated_at auto-bumper (function defined in 20260422215034_initial_schema).
create trigger proposals_set_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();

-- ─── RLS — same four-policy shape as customers and jobs ──────────────
-- Every policy wraps auth.uid() inside (select ...) so Postgres hoists
-- it as an InitPlan instead of per-row evaluation (locked pattern in
-- REAL_EIDRIX_NOTES). is_member_of() handles the tenant-scope check.
alter table public.proposals enable row level security;

create policy "proposals_select_member" on public.proposals
  for select
  using (public.is_member_of(organization_id));

create policy "proposals_insert_member" on public.proposals
  for insert
  with check (public.is_member_of(organization_id));

create policy "proposals_update_member" on public.proposals
  for update
  using (public.is_member_of(organization_id))
  with check (public.is_member_of(organization_id));

create policy "proposals_delete_member" on public.proposals
  for delete
  using (public.is_member_of(organization_id));
