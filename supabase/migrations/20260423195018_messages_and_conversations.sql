-- messages_and_conversations — persistent chat history (AC-04 Session 1).
--
-- Replaces the in-memory session state from AC-01. Every chat message
-- now persists to Postgres — refreshing the page, coming back tomorrow,
-- switching devices (in real Eidrix) all keep the conversation intact.
--
-- Schema decision: TWO roles (user, assistant). Tool interactions live
-- in the assistant message's `metadata` JSONB rather than as separate
-- tool_call / tool_result rows. Keeps row counts predictable, keeps
-- fact-extraction targets clean (only user + assistant text is ever
-- extracted from), and aligns with how Anthropic's API already bundles
-- tool_use blocks inside assistant messages.
--
-- conversation_id is a real UUID FK to a `conversations` row, not a
-- magic string. Multi-conversation UI (create, name, switch) is AC-04
-- Session 2+ work but the schema supports it today — future work is
-- a UI change, not a migration.

-- ─── conversations ───────────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  -- Nullable title: not used in Session 1 (single conversation per
  -- user-org), populated later when multi-conversation UI lands.
  title text,
  -- Denormalized pointer for ordering conversation lists by recency
  -- without a subquery. Maintained by application code on insert.
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Most-recent-first listing per user.
create index conversations_user_idx
  on public.conversations(organization_id, user_id, last_message_at desc nulls last);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;

-- User-scoped reads: a user can only see their own conversations
-- within orgs they belong to. Owners do NOT see staff members'
-- conversations (privacy default, see REAL_EIDRIX_NOTES).
create policy conversations_select_own on public.conversations
  for select using (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );
create policy conversations_insert_own on public.conversations
  for insert with check (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );
create policy conversations_update_own on public.conversations
  for update using (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );

-- ─── messages ────────────────────────────────────────────────────────

-- Two roles only — tool_use/tool_result blocks live in
-- metadata.toolCalls on assistant rows. See migration comment.
create type public.message_role as enum ('user', 'assistant');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  role public.message_role not null,
  -- The human-readable text. Empty string allowed for assistant turns
  -- that only executed tools without emitting visible text (rare).
  content text not null,
  -- Free-form: { model, inputTokens, outputTokens, toolCalls,
  -- iterations, errorMessage, contextMode, ... }. Debug tab reads from
  -- here; fact extraction ignores it.
  metadata jsonb not null default '{}'::jsonb,
  -- Soft delete. No hard-delete path — messages are audit-grade.
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Primary access pattern: load recent messages for a conversation,
-- newest-first or oldest-first. Partial on is_active so soft-deleted
-- rows don't bloat the index.
create index messages_conv_time_idx
  on public.messages(conversation_id, created_at)
  where is_active = true;

-- Secondary: "all messages for this user in this org" (used by the
-- fact-extraction function to pull context without knowing the
-- conversation id).
create index messages_org_user_idx
  on public.messages(organization_id, user_id, created_at desc)
  where is_active = true;

alter table public.messages enable row level security;

-- Same user-scoped shape as conversations.
create policy messages_select_own on public.messages
  for select using (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );
create policy messages_insert_own on public.messages
  for insert with check (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );
create policy messages_update_own on public.messages
  for update using (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );
