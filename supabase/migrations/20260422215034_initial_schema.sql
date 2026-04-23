-- initial_schema — the core multi-tenant shape for Trial and Error.
--
-- Three tables, three enums, one generic updated_at bumper. Designed to
-- port verbatim into real Eidrix (see curriculum/REAL_EIDRIX_NOTES.md →
-- Data Architecture). Every business-data table gets organization_id +
-- RLS (policies land in the next migration).
--
-- Conventions:
--   - snake_case columns (Postgres tradition); app-layer mapper translates
--     to camelCase for React consumers
--   - uuid primary keys with gen_random_uuid() default
--   - timestamptz everywhere (stores UTC, renders in user's locale)
--   - enums for small bounded sets (roles, statuses) — type-safety via
--     generated TS types, easy to extend with alter type add value
--   - foreign keys with explicit on delete behavior

-- ─── Organizations: one row per tenant ──────────────────────────────
-- settings is jsonb so we can accumulate per-tenant config (business_type,
-- plan, feature flags) without migrations.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Memberships: auth.users × organizations ────────────────────────
-- Role enum: owner | admin | member. Expandable via alter type later.
create type public.membership_role as enum ('owner', 'admin', 'member');

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.membership_role not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  -- A user can only belong to a given org once. Makes upserts safe.
  unique (user_id, organization_id)
);

-- Every membership lookup happens by user_id (RLS) or organization_id
-- (admin views). Index both.
create index memberships_user_id_idx on public.memberships(user_id);
create index memberships_org_id_idx on public.memberships(organization_id);

-- ─── Customers: tenant-scoped business records ──────────────────────
-- Mirrors the Chapter 10 Customer type; snake_case for the DB layer.
-- Denormalized counts (bids_count, jobs_count) kept here so list views
-- don't need joins — trade-off accepted for read-heavy workloads.
create type public.customer_status as enum ('lead', 'active', 'paused', 'archived');

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  company text,
  status public.customer_status not null default 'lead',
  email text,
  phone text,
  address text,
  notes text,
  bids_count integer not null default 0,
  jobs_count integer not null default 0,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every customers query filters by organization_id (RLS + app-layer).
create index customers_organization_id_idx on public.customers(organization_id);

-- ─── Generic updated_at bumper ──────────────────────────────────────
-- One function, reused by any table that wants auto-updating timestamps.
-- Each table attaches its own trigger below.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();
