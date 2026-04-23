-- auto_create_org — trigger to scaffold an organization + owner membership
-- whenever a new auth.users row appears.
--
-- Runs with SECURITY DEFINER (function-owner privileges) so it can insert
-- into public tables that the user themselves has no direct INSERT policy
-- for. search_path is locked to public to prevent schema-shadowing attacks.
--
-- Workspace name heuristic: take the part of the email before "@". If the
-- email is somehow null (shouldn't happen with Supabase auth), fall back to
-- "My". Suffixed with " Workspace" so the list reads naturally.
--
-- Real-Eidrix note: this trigger eventually gets replaced by the Sunday
-- Interview flow (AC-03) which generates a richer org with BusinessConfig.
-- Same insertion point, richer payload. See REAL_EIDRIX_NOTES.md → Auth.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  workspace_name text := coalesce(split_part(new.email, '@', 1), 'My') || ' Workspace';
begin
  insert into public.organizations (name)
  values (workspace_name)
  returning id into new_org_id;

  insert into public.memberships (user_id, organization_id, role)
  values (new.id, new_org_id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
