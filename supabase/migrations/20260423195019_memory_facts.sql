-- memory_facts — typed durable facts extracted from user messages
-- (AC-04 Session 1).
--
-- This is the "signal" layer of Eidrix's memory architecture. The
-- fact-extraction background function reads a user message, identifies
-- durable statements (preferences, rules, context, commitments,
-- observations), and writes one row here per fact. Session 2 adds
-- vector embeddings for semantic retrieval.
--
-- Key principle: `content` is the source of truth. Embeddings (Session
-- 2) are a cache — they can be regenerated from `content` at any time
-- if the embedding provider changes or dimensions shift. Never rely on
-- the embedding as the only copy.
--
-- RLS is user-scoped (not just org-scoped): a user can only read their
-- own facts, even within their org. Privacy-first default. Real Eidrix
-- makes this a per-tenant setting.

-- ─── fact_type enum ──────────────────────────────────────────────────
-- Five types chosen to match how operators actually categorize what
-- they remember about their work:
--   preference  — "I like X" / "Alice prefers Y"
--   rule        — "I never do X" / "Business hours are Y"
--   context     — "I bought a new truck in March" (background info)
--   commitment  — "I promised X by Y" (time-bound)
--   observation — softer "I noticed Z happens when Y" (low confidence)
create type public.fact_type as enum (
  'preference',
  'rule',
  'context',
  'commitment',
  'observation'
);

create table public.memory_facts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  -- The fact itself, concise statement. Length capped to prevent a
  -- confused model dumping paragraphs. App-layer truncates at 500
  -- before insert; constraint enforces it at the DB boundary too.
  content text not null check (length(content) between 1 and 500),
  fact_type public.fact_type not null,
  -- Polymorphic link to a related entity. Nullable when the fact is
  -- general ("business open Tue-Sat"). Entity_type is a plain text
  -- check rather than an enum so adding entity types (invoice,
  -- timesheet, line_item) later is a single ALTER, not a TYPE dance.
  entity_type text check (entity_type in ('customer', 'job', 'proposal')),
  entity_id uuid,
  -- Audit trail: which message did this fact come from? on delete
  -- set null so soft-deleting a message (or if we ever hard-delete
  -- one) leaves the fact intact.
  source_message_id uuid
    references public.messages(id) on delete set null,
  -- Claude assigns this 0-1 during extraction. App-layer rejects
  -- anything below 0.6 before insert; the CHECK backstops values
  -- the model tries to emit outside the valid range.
  confidence numeric(3, 2) not null default 0.8
    check (confidence >= 0 and confidence <= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Main retrieval: "all active facts for this user in this org" —
-- used by the Memory UI (Session 2) and by retrieval at chat time
-- (Session 2).
create index memory_facts_user_idx
  on public.memory_facts(organization_id, user_id, is_active);

-- Entity-scoped retrieval: "what do we know about this customer?"
-- Partial because facts without an entity_id are the majority.
create index memory_facts_entity_idx
  on public.memory_facts(entity_type, entity_id)
  where entity_id is not null and is_active = true;

create trigger memory_facts_set_updated_at
  before update on public.memory_facts
  for each row execute function public.set_updated_at();

alter table public.memory_facts enable row level security;

-- User-scoped reads/writes. A fact is owned by its user_id; only
-- they can see it, edit it, or soft-delete it. An owner of the org
-- cannot read a staff member's facts — that's by design.
create policy memory_facts_select_own on public.memory_facts
  for select using (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );
create policy memory_facts_insert_own on public.memory_facts
  for insert with check (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );
create policy memory_facts_update_own on public.memory_facts
  for update using (
    (select auth.uid()) = user_id
    and public.is_member_of(organization_id)
  );
-- No delete policy — soft-delete via is_active=false through update.
