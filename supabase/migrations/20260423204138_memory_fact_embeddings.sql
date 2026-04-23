-- memory_fact_embeddings — vector embeddings for semantic retrieval
-- (AC-04 Session 2).
--
-- Enables Eidrix's agent memory to be searched by MEANING rather than
-- keywords. Each row in memory_facts gets a 1024-dim embedding here;
-- at chat time, the user's incoming message is embedded and we find
-- the K most similar facts via pgvector's cosine-distance index.
--
-- ─── Why a separate table (not a column on memory_facts) ─────────────
-- Chapter-locked design:
--   1. Separation of concerns — embeddings are a CACHE of the signal
--      in `memory_facts.content`. We can truncate this table and
--      re-derive the rows entirely from scratch. You cannot do the
--      reverse. This enforces "content is source of truth."
--   2. Provider-independence — if Voyage ever raises prices or a
--      better embedding model ships, switching is a backfill job
--      (iterate facts, regenerate, upsert). The `model_version`
--      column tracks which model produced each row, so mixed-model
--      states during migrations are readable.
--   3. Future polymorphism — we may embed messages too, or proposals,
--      or customer notes. A separate table with a generic shape is a
--      better base for that than bolting columns onto memory_facts.

-- Enable pgvector. Idempotent — safe to run against a cloud project
-- where the extension is already installed.
create extension if not exists vector;

create table public.memory_fact_embeddings (
  id uuid primary key default gen_random_uuid(),
  fact_id uuid not null unique
    references public.memory_facts(id) on delete cascade,
  -- voyage-3 output dimension. Changing this later means a data
  -- migration, so we pick deliberately and document it. If we ever
  -- move to voyage-3-lite (512) or OpenAI text-embedding-3-large
  -- (3072), that's a new table + backfill, not an ALTER.
  embedding vector(1024) not null,
  -- Track which model produced this embedding. On provider switch,
  -- the backfill job filters by `model_version != 'new-model'` and
  -- re-embeds in batches.
  model_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger memory_fact_embeddings_set_updated_at
  before update on public.memory_fact_embeddings
  for each row execute function public.set_updated_at();

-- HNSW index for fast approximate nearest-neighbor search. Cosine
-- distance (<=>) is the operator matching vector_cosine_ops.
-- HNSW is slower to build than ivfflat but faster to query, which
-- is what matters here — facts insert one-at-a-time post-extraction;
-- queries happen on every chat message.
create index memory_fact_embeddings_hnsw_idx
  on public.memory_fact_embeddings
  using hnsw (embedding vector_cosine_ops);

alter table public.memory_fact_embeddings enable row level security;

-- RLS: a user reads embeddings for facts they own. We join to
-- memory_facts inside each policy so the user-scoped policy on
-- memory_facts cascades through.
--
-- (Alternative would be denormalizing user_id + organization_id onto
-- this table for a simpler policy, but the join keeps there being
-- ONE place that knows who owns what — memory_facts.)

create policy memory_fact_embeddings_select_own on public.memory_fact_embeddings
  for select using (
    exists (
      select 1 from public.memory_facts f
      where f.id = memory_fact_embeddings.fact_id
        and f.user_id = (select auth.uid())
        and public.is_member_of(f.organization_id)
    )
  );

create policy memory_fact_embeddings_insert_own on public.memory_fact_embeddings
  for insert with check (
    exists (
      select 1 from public.memory_facts f
      where f.id = fact_id
        and f.user_id = (select auth.uid())
        and public.is_member_of(f.organization_id)
    )
  );

create policy memory_fact_embeddings_update_own on public.memory_fact_embeddings
  for update using (
    exists (
      select 1 from public.memory_facts f
      where f.id = fact_id
        and f.user_id = (select auth.uid())
        and public.is_member_of(f.organization_id)
    )
  ) with check (
    exists (
      select 1 from public.memory_facts f
      where f.id = fact_id
        and f.user_id = (select auth.uid())
        and public.is_member_of(f.organization_id)
    )
  );

-- No delete policy — embeddings are cascade-deleted when the parent
-- fact is hard-deleted (the FK constraint). Soft-delete of facts
-- (is_active=false) leaves the embedding in place but the retrieval
-- RPC filters active-only, so stale soft-deleted embeddings don't
-- surface. Saves an embed call if a fact is re-activated.

-- ─── match_memory_facts — the retrieval RPC ──────────────────────────
-- Nearest-neighbor search against the caller's own active facts.
-- SECURITY INVOKER + locked search_path means the caller's JWT drives
-- RLS — no privilege elevation risk.
--
-- Returns similarity (1 - cosine_distance), so 1.0 is identical and
-- 0.0 is orthogonal. This is more intuitive for Debug-tab display
-- than raw distance.

create or replace function public.match_memory_facts(
  query_embedding vector(1024),
  match_count int default 8,
  user_id_filter uuid default null
)
returns table (
  fact_id uuid,
  content text,
  fact_type public.fact_type,
  entity_type text,
  entity_id uuid,
  confidence numeric,
  similarity float
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    f.id as fact_id,
    f.content,
    f.fact_type,
    f.entity_type,
    f.entity_id,
    f.confidence,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.memory_fact_embeddings e
  inner join public.memory_facts f on f.id = e.fact_id
  where f.is_active = true
    and (user_id_filter is null or f.user_id = user_id_filter)
  order by e.embedding <=> query_embedding
  limit greatest(1, least(match_count, 50))
$$;
