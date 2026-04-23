-- harden_schema — address Supabase Advisor warnings from the initial
-- migrations. Three small fixes that clear the Security + Performance
-- lints visible in Studio → Advisors.
--
-- Kept as a separate migration (instead of editing the originals)
-- because migrations are immutable discipline — real Eidrix will have
-- cloud Postgres applying these in sequence, and editing a migration
-- that's already been applied is how schema drift starts.

-- ─── 1. Lock search_path on set_updated_at ──────────────────────────
-- Fixes: "Function public.set_updated_at has a role mutable search_path"
--
-- Empty search_path is fine here because now() lives in pg_catalog,
-- which is always implicitly in the path. This prevents a theoretical
-- schema-shadowing attack where a user-created schema earlier in path
-- could override now() with a malicious function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── 2. Rewrite policies to wrap auth.uid() in (SELECT) subqueries ──
-- Fixes: "Auth RLS initialization plan" performance lint
--
-- Without the subquery wrapper, Postgres evaluates auth.uid() per row.
-- With (SELECT auth.uid()), the planner hoists it as an InitPlan —
-- evaluated once per query. Scales 10-100x better on large tables.
-- https://supabase.com/docs/guides/database/postgres/row-level-security#use-auth-uid-in-an-initplan

drop policy "memberships_select_own" on public.memberships;
create policy "memberships_select_own" on public.memberships
  for select
  using (user_id = (select auth.uid()));

drop policy "orgs_update_owner" on public.organizations;
create policy "orgs_update_owner" on public.organizations
  for update
  using (
    exists(
      select 1 from public.memberships
      where organization_id = organizations.id
        and user_id = (select auth.uid())
        and role = 'owner'
    )
  );

-- ─── 3. Add missing index on memberships.invited_by ─────────────────
-- Fixes: "Unindexed foreign key" performance lint
--
-- Nullable FK that's rarely queried, but indexed so lookups like
-- "who did I invite?" stay fast once real Eidrix adds the invite UI.
create index memberships_invited_by_idx on public.memberships(invited_by);
