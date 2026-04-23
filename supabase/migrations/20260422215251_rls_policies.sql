-- rls_policies — Row Level Security for every tenant-data table.
--
-- This is the security layer. Application code can have bugs; these
-- policies cannot be bypassed from the client. Even a rogue caller with
-- a stolen anon key hits these rules.
--
-- See curriculum/chapter-14-supabase-foundation.md → Tour Moment "Why
-- RLS is not optional" for the full rationale.

-- Enable RLS on every tenant-data table. A table with RLS enabled and
-- NO policies blocks everything by default — safer than the reverse.
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.customers enable row level security;

-- ─── Helper: is the caller a member of this org? ────────────────────
-- SECURITY DEFINER with locked search_path. This is important:
--   - SECURITY DEFINER means the function runs with the *function owner's*
--     rights, not the caller's — so it can read memberships even though
--     the caller's RLS would restrict that read
--   - search_path = public prevents schema-shadowing attacks (an attacker
--     creating a sibling `memberships` table in another schema and
--     tricking the function into reading theirs instead)
-- Called from every tenant-table policy below. One function, many tables.
create or replace function public.is_member_of(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.memberships
    where organization_id = target_org
      and user_id = auth.uid()
  );
$$;

-- ─── Organizations ──────────────────────────────────────────────────
-- Members SELECT their orgs; only owners UPDATE.
-- No INSERT policy — creation happens via the handle_new_user trigger
-- (SECURITY DEFINER bypasses RLS). No DELETE policy — deletion deferred.

create policy "orgs_select_member" on public.organizations
  for select
  using (public.is_member_of(id));

create policy "orgs_update_owner" on public.organizations
  for update
  using (
    exists(
      select 1 from public.memberships
      where organization_id = organizations.id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- ─── Memberships ────────────────────────────────────────────────────
-- Users see only their own memberships. No INSERT policy — trigger creates.
-- Admin invite flows in later chapters will add INSERT with appropriate
-- role checks.

create policy "memberships_select_own" on public.memberships
  for select
  using (user_id = auth.uid());

-- ─── Customers — full CRUD gated on org membership ──────────────────
-- Every operation checks is_member_of(organization_id). UPDATE uses both
-- USING (what rows are visible to update) and WITH CHECK (what rows are
-- allowed to result from the update) so a user can't UPDATE to move a
-- customer into an org they don't belong to.

create policy "customers_select_member" on public.customers
  for select
  using (public.is_member_of(organization_id));

create policy "customers_insert_member" on public.customers
  for insert
  with check (public.is_member_of(organization_id));

create policy "customers_update_member" on public.customers
  for update
  using (public.is_member_of(organization_id))
  with check (public.is_member_of(organization_id));

create policy "customers_delete_member" on public.customers
  for delete
  using (public.is_member_of(organization_id));
