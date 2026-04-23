-- harden_memory_rls_with_check — adds WITH CHECK clauses to the
-- UPDATE policies on messages, conversations, and memory_facts.
--
-- The original AC-04 Session 1 migrations set USING (auth.uid() =
-- user_id AND is_member_of(organization_id)) on UPDATE — this
-- prevents a user from updating someone else's row. But without a
-- matching WITH CHECK, a user CAN update their own row to change
-- organization_id or user_id to something outside their membership.
-- After such an update, the row is orphaned under their account but
-- Postgres accepts the write because the row STILL passes USING at
-- the moment of the update.
--
-- Adding WITH CHECK that mirrors USING forces the post-update row
-- to also satisfy the policy, closing the loophole. Standard RLS
-- defense-in-depth pattern — REAL_EIDRIX_NOTES "Hardening migrations
-- are append-only" rule means we fix this in a NEW migration rather
-- than editing the originals.

-- ─── messages ────────────────────────────────────────────────────────
drop policy if exists messages_update_own on public.messages;
create policy messages_update_own on public.messages
  for update using (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  )
  with check (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );

-- ─── conversations ───────────────────────────────────────────────────
drop policy if exists conversations_update_own on public.conversations;
create policy conversations_update_own on public.conversations
  for update using (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  )
  with check (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );

-- ─── memory_facts ────────────────────────────────────────────────────
drop policy if exists memory_facts_update_own on public.memory_facts;
create policy memory_facts_update_own on public.memory_facts
  for update using (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  )
  with check (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );
