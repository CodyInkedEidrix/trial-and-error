// ──────────────────────────────────────────────────────────────────────
// memoryStore — typed fact CRUD backed by Supabase (AC-04 Session 1).
//
// Reads what extract-facts-background writes. The server-side
// extraction function is the main writer; the client-side Memory UI
// (Session 2) exposes list / edit / soft-delete. `createFact` here is
// for manual additions (future feature) and for the stress-test
// verification step of Session 1.
//
// Module-level authStore subscription mirrors the other entity stores:
// load on sign-in, clear on sign-out.
//
// ─── User-scoped, not org-scoped ─────────────────────────────────────
// RLS filters by user_id = auth.uid(); members of the same org don't
// see each other's facts. Privacy-first default locked in AC-04
// chapter. Real Eidrix may expose this as a per-tenant setting.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import type {
  FactEntityType,
  FactType,
  MemoryFact,
  MemoryFactInput,
} from '../types/memoryFact'
import type { Database } from '../types/database.types'
import { supabase } from './supabase'
import { useAuthStore } from './useAuth'
import { useToastStore } from './toastStore'

/** Fire the re-embed background function for a fact whose content
 *  changed. Fire-and-forget: the UI update stays instant; the
 *  embedding refresh happens after. `-background` suffix guarantees
 *  Netlify queues it independently.
 *
 *  Silent on failure (logged) — the fact is still persisted, the
 *  retrieval layer just uses the stale embedding until a later edit
 *  or a backfill job. "Content is source of truth." */
async function fireReembedFact(factId: string) {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    if (!accessToken) {
      console.warn('[memoryStore] skipping reembed: no access token')
      return
    }
    void fetch('/.netlify/functions/reembed-fact-background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ factId }),
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          console.warn('[memoryStore] reembed auth rejected:', res.status)
        }
      })
      .catch((err) => console.warn('[memoryStore] reembed dispatch failed:', err))
  } catch (err) {
    console.warn('[memoryStore] reembed setup failed:', err)
  }
}

type DbFactRow = Database['public']['Tables']['memory_facts']['Row']
type DbFactInsert = Database['public']['Tables']['memory_facts']['Insert']
type DbFactUpdate = Database['public']['Tables']['memory_facts']['Update']

export interface MemoryStore {
  facts: MemoryFact[]
  isLoading: boolean
  loadError: string | null

  /** Load all active facts for the signed-in user. */
  loadFacts: () => Promise<void>

  /** Create a fact manually (Memory UI / stress-test helper).
   *  The extraction function writes directly via its own path. */
  createFact: (input: MemoryFactInput) => Promise<MemoryFact | null>

  /** Update a fact's content / type / confidence. Session 2's Memory
   *  UI uses this for inline edits. */
  updateFact: (id: string, patch: Partial<MemoryFactInput>) => Promise<void>

  /** Soft-delete via is_active=false. Session 2's Memory UI uses this. */
  softDelete: (id: string) => Promise<void>

  clearLocalState: () => void

  /** Serialize active facts as JSON for the Memory UI's export button. */
  exportToJson: () => string
}

// ─── DB ↔ App mapping ────────────────────────────────────────────────

function dbRowToFact(row: DbFactRow): MemoryFact {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    content: row.content,
    factType: row.fact_type as FactType,
    entityType:
      row.entity_type === null ? undefined : (row.entity_type as FactEntityType),
    entityId: row.entity_id ?? undefined,
    sourceMessageId: row.source_message_id ?? undefined,
    confidence: Number(row.confidence),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toastError(title: string) {
  useToastStore.getState().push({ title, variant: 'danger', duration: 4000 })
}

// ─── Store ────────────────────────────────────────────────────────────

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  facts: [],
  isLoading: false,
  loadError: null,

  loadFacts: async () => {
    const activeOrg = useAuthStore.getState().activeOrg
    if (!activeOrg) {
      set({ facts: [], isLoading: false, loadError: null })
      return
    }

    set({ isLoading: true, loadError: null })

    const { data, error } = await supabase
      .from('memory_facts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[memoryStore] loadFacts failed:', error)
      set({
        loadError: error.message || 'Failed to load memory facts',
        isLoading: false,
      })
      return
    }

    set({
      facts: (data ?? []).map(dbRowToFact),
      isLoading: false,
    })
  },

  createFact: async (input) => {
    const activeOrg = useAuthStore.getState().activeOrg
    const user = useAuthStore.getState().user
    if (!activeOrg || !user) {
      toastError("Can't save memory: no active workspace.")
      return null
    }

    const insert: DbFactInsert = {
      organization_id: activeOrg.id,
      user_id: user.id,
      content: input.content,
      fact_type: input.factType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      source_message_id: input.sourceMessageId ?? null,
      confidence: input.confidence,
    }

    const { data, error } = await supabase
      .from('memory_facts')
      .insert(insert)
      .select()
      .single()

    if (error || !data) {
      console.error('[memoryStore] createFact failed:', error)
      toastError("Couldn't save memory.")
      return null
    }

    const fact = dbRowToFact(data)
    set((state) => ({ facts: [fact, ...state.facts] }))
    return fact
  },

  updateFact: async (id, patch) => {
    const previous = get().facts.find((f) => f.id === id)
    if (!previous) return

    set((state) => ({
      facts: state.facts.map((f) =>
        f.id === id
          ? {
              ...f,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : f,
      ),
    }))

    const update: DbFactUpdate = {}
    if (patch.content !== undefined) update.content = patch.content
    if (patch.factType !== undefined) update.fact_type = patch.factType
    if (patch.entityType !== undefined) {
      update.entity_type = patch.entityType ?? null
    }
    if (patch.entityId !== undefined) update.entity_id = patch.entityId ?? null
    if (patch.confidence !== undefined) update.confidence = patch.confidence

    if (Object.keys(update).length === 0) return

    const { data, error } = await supabase
      .from('memory_facts')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('[memoryStore] updateFact failed:', error)
      toastError("Couldn't save memory edit. Reverted.")
      set((state) => ({
        facts: state.facts.map((f) => (f.id === id ? previous : f)),
      }))
      return
    }

    const reconciled = dbRowToFact(data)
    set((state) => ({
      facts: state.facts.map((f) => (f.id === id ? reconciled : f)),
    }))

    // Content changed → re-embed in the background so semantic
    // retrieval uses the updated phrasing. Fire-and-forget; the
    // existing embedding works fine in the meantime (the old
    // phrasing is still semantically close to the new one).
    if (patch.content !== undefined && patch.content !== previous.content) {
      void fireReembedFact(id)
    }
  },

  softDelete: async (id) => {
    const previous = get().facts.find((f) => f.id === id)
    if (!previous) return

    // Optimistic removal from local list.
    set((state) => ({
      facts: state.facts.filter((f) => f.id !== id),
    }))

    const { error } = await supabase
      .from('memory_facts')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('[memoryStore] softDelete failed:', error)
      toastError("Couldn't delete memory. Restored.")
      set((state) => ({
        facts: [previous, ...state.facts],
      }))
    }
  },

  clearLocalState: () => {
    set({ facts: [], isLoading: false, loadError: null })
  },

  /** Serialize all active facts as a JSON blob for the user's download.
   *  Includes only the fields a user would want to keep — internal
   *  ids (organization_id, user_id) and the source_message_id audit
   *  link are omitted for privacy. GDPR-flavored trust gesture. */
  exportToJson: () => {
    const facts = get().facts
    const payload = {
      exportedAt: new Date().toISOString(),
      count: facts.length,
      facts: facts.map((f) => ({
        id: f.id,
        content: f.content,
        fact_type: f.factType,
        entity_type: f.entityType ?? null,
        entity_id: f.entityId ?? null,
        confidence: f.confidence,
        created_at: f.createdAt,
        updated_at: f.updatedAt,
      })),
    }
    return JSON.stringify(payload, null, 2)
  },
}))

// ─── Auth subscription ───────────────────────────────────────────────

useAuthStore.subscribe((state, prevState) => {
  const prevId = prevState.activeOrg?.id ?? null
  const nextId = state.activeOrg?.id ?? null
  if (prevId === nextId) return
  if (nextId === null) {
    useMemoryStore.getState().clearLocalState()
  } else {
    void useMemoryStore.getState().loadFacts()
  }
})

if (useAuthStore.getState().activeOrg) {
  void useMemoryStore.getState().loadFacts()
}
