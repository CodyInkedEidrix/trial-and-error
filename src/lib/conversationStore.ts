// ──────────────────────────────────────────────────────────────────────
// conversationStore — the active chat thread for the signed-in user.
//
// AC-04 Session 1 shape: one conversation per user-org, auto-upserted
// on sign-in. The `activeConversation` is the thread chatStore reads
// from and writes to. messagesStore subscribes to this store and loads
// messages whenever activeConversation changes.
//
// Session 2+ will expose create/rename/delete + a switcher UI. The
// schema already supports it; the plumbing here is the floor.
//
// Module-level authStore subscription mirrors customerStore/jobStore/
// proposalStore: on sign-in, ensure a conversation exists and set it
// active; on sign-out, clear.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import type { Conversation } from '../types/conversation'
import type { Database } from '../types/database.types'
import { supabase } from './supabase'
import { useAuthStore } from './useAuth'

type DbConversationRow = Database['public']['Tables']['conversations']['Row']
type DbConversationInsert = Database['public']['Tables']['conversations']['Insert']

export interface ConversationStore {
  activeConversation: Conversation | null
  isLoading: boolean
  loadError: string | null

  /** Ensures a conversation exists for the current user-org and sets
   *  it as active. Idempotent: if one already exists, loads it; if
   *  not, creates one. Called on sign-in. */
  ensureActiveConversation: () => Promise<void>

  /** Updates last_message_at to now() on the active conversation.
   *  Called by messagesStore after persisting a new message. */
  touchLastMessageAt: () => Promise<void>

  /** Wipe on sign-out. */
  clearLocalState: () => void
}

// ─── DB ↔ App mapping ────────────────────────────────────────────────

function dbRowToConversation(row: DbConversationRow): Conversation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    title: row.title,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Store ────────────────────────────────────────────────────────────

export const useConversationStore = create<ConversationStore>((set, get) => ({
  activeConversation: null,
  isLoading: false,
  loadError: null,

  ensureActiveConversation: async () => {
    const activeOrg = useAuthStore.getState().activeOrg
    const user = useAuthStore.getState().user
    if (!activeOrg || !user) {
      set({ activeConversation: null, isLoading: false, loadError: null })
      return
    }

    set({ isLoading: true, loadError: null })

    // Look for an existing conversation. RLS already filters to this
    // user, but when a user belongs to multiple orgs the "first
    // created across all orgs" could leak — explicit filter is
    // defense-in-depth matching the rest of the stores.
    const { data: existing, error: selectErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', activeOrg.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (selectErr) {
      console.error('[conversationStore] select failed:', selectErr)
      set({
        loadError: selectErr.message || 'Failed to load conversation',
        isLoading: false,
      })
      return
    }

    if (existing) {
      set({
        activeConversation: dbRowToConversation(existing),
        isLoading: false,
      })
      return
    }

    // None found — create one.
    const insert: DbConversationInsert = {
      organization_id: activeOrg.id,
      user_id: user.id,
    }
    const { data: inserted, error: insertErr } = await supabase
      .from('conversations')
      .insert(insert)
      .select()
      .single()

    if (insertErr || !inserted) {
      console.error('[conversationStore] insert failed:', insertErr)
      set({
        loadError: insertErr?.message || 'Failed to create conversation',
        isLoading: false,
      })
      return
    }

    set({
      activeConversation: dbRowToConversation(inserted),
      isLoading: false,
    })
  },

  touchLastMessageAt: async () => {
    const active = get().activeConversation
    if (!active) return
    const now = new Date().toISOString()
    // Optimistic local update first.
    set({
      activeConversation: { ...active, lastMessageAt: now },
    })
    const { error } = await supabase
      .from('conversations')
      .update({ last_message_at: now })
      .eq('id', active.id)
    if (error) {
      // Non-fatal — just bookkeeping.
      console.warn('[conversationStore] touch last_message_at failed:', error)
    }
  },

  clearLocalState: () => {
    set({ activeConversation: null, isLoading: false, loadError: null })
  },
}))

// ─── Auth subscription ───────────────────────────────────────────────

useAuthStore.subscribe((state, prevState) => {
  const prevId = prevState.activeOrg?.id ?? null
  const nextId = state.activeOrg?.id ?? null
  if (prevId === nextId) return
  if (nextId === null) {
    useConversationStore.getState().clearLocalState()
  } else {
    void useConversationStore.getState().ensureActiveConversation()
  }
})

if (useAuthStore.getState().activeOrg) {
  void useConversationStore.getState().ensureActiveConversation()
}
