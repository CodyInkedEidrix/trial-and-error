// ──────────────────────────────────────────────────────────────────────
// messagesStore — persistent conversation history backed by Supabase
// (AC-04 Session 1).
//
// Owns the CRUD surface for chat messages. chatStore delegates
// persistence here: appendUser on send, appendAssistant on stream
// completion, updateAssistantStreaming if we need to reconcile partial
// text post-flight.
//
// Module-level subscription to conversationStore: when the active
// conversation changes, load its messages. On sign-out, clear.
//
// ─── Division of labor with chatStore ─────────────────────────────────
// messagesStore is the DB interface. chatStore is the streaming / eye /
// in-flight buffer. chatStore.messages reflects what's on screen;
// messagesStore.messages reflects what's in the DB. The two converge
// at stream-end, where chatStore writes through to messagesStore.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import type {
  Message,
  MessageMetadata,
  MessageRole,
  MessageStatus,
} from '../types/message'
import type { Database, Json } from '../types/database.types'
import { supabase } from './supabase'
import { useAuthStore } from './useAuth'
import { useConversationStore } from './conversationStore'
import { useToastStore } from './toastStore'

type DbMessageRow = Database['public']['Tables']['messages']['Row']
type DbMessageInsert = Database['public']['Tables']['messages']['Insert']
type DbMessageUpdate = Database['public']['Tables']['messages']['Update']

/** How many messages to load at mount. 50 is generous for chat context
 *  without swamping the client; Session 2's retrieval layer handles
 *  older-memory questions via semantic search rather than scrollback. */
const MESSAGE_LOAD_LIMIT = 50

export interface MessagesStore {
  messages: Message[]
  isLoading: boolean
  loadError: string | null

  loadForActiveConversation: () => Promise<void>

  /** Persists a user message. Returns the created Message on success,
   *  null on failure. chatStore calls this at send-time and uses the
   *  returned id to fire the fact-extraction trigger. */
  appendUser: (content: string) => Promise<Message | null>

  /** Persists a completed assistant message with its metadata. */
  appendAssistant: (
    content: string,
    metadata: MessageMetadata,
    status?: MessageStatus,
  ) => Promise<Message | null>

  /** Optional: update an existing assistant row (e.g., reconcile
   *  streaming text or flip status to 'error' with partial content). */
  updateAssistant: (
    id: string,
    patch: { content?: string; metadata?: MessageMetadata; status?: MessageStatus },
  ) => Promise<void>

  clearLocalState: () => void
}

// ─── DB ↔ App mapping ────────────────────────────────────────────────

function dbRowToMessage(row: DbMessageRow): Message {
  // The metadata column may have a `status` entry if we chose to
  // persist it; otherwise absence = 'complete'. Also promote UX
  // overlays (pendingAction, toolErrors) to top-level Message fields
  // so the chat UI reads them uniformly — persisted in metadata for
  // resync-safety but consumed at the top level.
  const metadata = (row.metadata ?? {}) as MessageMetadata & {
    status?: MessageStatus
  }
  return {
    id: row.id,
    role: row.role as MessageRole,
    content: row.content,
    createdAt: row.created_at,
    conversationId: row.conversation_id,
    metadata,
    isActive: row.is_active,
    status: metadata.status,
    pendingAction: metadata.pendingAction,
    toolErrors: metadata.toolErrors,
  }
}

function toastError(title: string) {
  useToastStore.getState().push({ title, variant: 'danger', duration: 4000 })
}

// ─── Store ────────────────────────────────────────────────────────────

export const useMessagesStore = create<MessagesStore>((set) => ({
  messages: [],
  isLoading: false,
  loadError: null,

  loadForActiveConversation: async () => {
    const active = useConversationStore.getState().activeConversation
    if (!active) {
      set({ messages: [], isLoading: false, loadError: null })
      return
    }

    set({ isLoading: true, loadError: null })

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', active.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(MESSAGE_LOAD_LIMIT)

    if (error) {
      console.error('[messagesStore] load failed:', error)
      set({
        loadError: error.message || 'Failed to load messages',
        isLoading: false,
      })
      return
    }

    set({
      messages: (data ?? []).map(dbRowToMessage),
      isLoading: false,
    })
  },

  appendUser: async (content) => {
    const activeOrg = useAuthStore.getState().activeOrg
    const user = useAuthStore.getState().user
    const conversation = useConversationStore.getState().activeConversation
    if (!activeOrg || !user || !conversation) {
      toastError("Can't save message: no active conversation.")
      return null
    }

    const insert: DbMessageInsert = {
      organization_id: activeOrg.id,
      user_id: user.id,
      conversation_id: conversation.id,
      role: 'user',
      content,
      metadata: {},
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(insert)
      .select()
      .single()

    if (error || !data) {
      console.error('[messagesStore] appendUser failed:', error)
      toastError("Couldn't save your message.")
      return null
    }

    const message = dbRowToMessage(data)
    set((state) => ({ messages: [...state.messages, message] }))
    // Fire-and-forget bookkeeping.
    void useConversationStore.getState().touchLastMessageAt()
    return message
  },

  appendAssistant: async (content, metadata, status) => {
    const activeOrg = useAuthStore.getState().activeOrg
    const user = useAuthStore.getState().user
    const conversation = useConversationStore.getState().activeConversation
    if (!activeOrg || !user || !conversation) return null

    // Persist status INSIDE metadata (the DB column is just `metadata
    // jsonb`). Lets us surface 'error' states without a separate column.
    // Cast at the boundary — our MessageMetadata is strictly typed for
    // client use; the DB column accepts any Json.
    const persistedMetadata = {
      ...metadata,
      ...(status && status !== 'complete' ? { status } : {}),
    } as unknown as Json

    const insert: DbMessageInsert = {
      organization_id: activeOrg.id,
      user_id: user.id,
      conversation_id: conversation.id,
      role: 'assistant',
      content,
      metadata: persistedMetadata,
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(insert)
      .select()
      .single()

    if (error || !data) {
      console.error('[messagesStore] appendAssistant failed:', error)
      // Don't toast — the message is already on screen via chatStore's
      // streaming buffer; a persistence failure means it'll be missing
      // on refresh, which is its own visible signal.
      return null
    }

    const message = dbRowToMessage(data)
    set((state) => ({ messages: [...state.messages, message] }))
    void useConversationStore.getState().touchLastMessageAt()
    return message
  },

  updateAssistant: async (id, patch) => {
    const update: DbMessageUpdate = {}
    if (patch.content !== undefined) update.content = patch.content
    if (patch.metadata !== undefined || patch.status !== undefined) {
      // Merge status into metadata if present.
      const merged: MessageMetadata & { status?: MessageStatus } = {
        ...(patch.metadata ?? {}),
      }
      if (patch.status !== undefined) merged.status = patch.status
      update.metadata = merged as unknown as Json
    }
    if (Object.keys(update).length === 0) return

    const { data, error } = await supabase
      .from('messages')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.warn('[messagesStore] updateAssistant failed:', error)
      return
    }

    const updated = dbRowToMessage(data)
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? updated : m)),
    }))
  },

  clearLocalState: () => {
    set({ messages: [], isLoading: false, loadError: null })
  },
}))

// ─── Auth / conversation subscriptions ───────────────────────────────
// Load messages whenever the active conversation changes. Clear on
// sign-out (via authStore subscription) or when the conversation
// becomes null (e.g., org switched but no conversation yet).

useConversationStore.subscribe((state, prevState) => {
  const prevId = prevState.activeConversation?.id ?? null
  const nextId = state.activeConversation?.id ?? null
  if (prevId === nextId) return
  if (nextId === null) {
    useMessagesStore.getState().clearLocalState()
  } else {
    void useMessagesStore.getState().loadForActiveConversation()
  }
})

useAuthStore.subscribe((state, prevState) => {
  const prevId = prevState.activeOrg?.id ?? null
  const nextId = state.activeOrg?.id ?? null
  if (prevId === nextId) return
  if (nextId === null) {
    useMessagesStore.getState().clearLocalState()
  }
})

if (useConversationStore.getState().activeConversation) {
  void useMessagesStore.getState().loadForActiveConversation()
}
