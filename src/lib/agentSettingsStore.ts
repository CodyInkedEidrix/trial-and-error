// ──────────────────────────────────────────────────────────────────────
// agentSettingsStore — per-org agent configuration backed by Supabase.
//
// Lazy-upsert pattern: the first time we try to load settings for an
// org and find no row, we INSERT defaults and re-read. Keeps the
// handle_new_user() trigger thin (it doesn't have to know about agent
// config) and makes adding new settings columns trivial — just bump
// the defaults here, don't touch any trigger.
//
// Module-level subscription to authStore mirrors customerStore /
// jobStore — auto-load on activeOrg change, clear on sign-out.
// ──────────────────────────────────────────────────────────────────────

import { create } from 'zustand'

import type {
  AgentSettings,
  AgentSettingsInput,
  AgentModel,
  ContextMode,
} from '../types/agentSettings'
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_CONTEXT_MODE,
  DEFAULT_MODEL,
} from '../types/agentSettings'
import type { Database } from '../types/database.types'
import { supabase } from './supabase'
import { useAuthStore } from './useAuth'
import { useToastStore } from './toastStore'

type DbRow = Database['public']['Tables']['agent_settings']['Row']
type DbInsert = Database['public']['Tables']['agent_settings']['Insert']
type DbUpdate = Database['public']['Tables']['agent_settings']['Update']

export interface AgentSettingsStore {
  settings: AgentSettings | null
  isLoading: boolean
  loadError: string | null
  isSaving: boolean

  loadSettings: () => Promise<void>
  updateSettings: (patch: Partial<AgentSettingsInput>) => Promise<void>
  resetToDefaults: () => Promise<void>
  clearLocalState: () => void
}

// ─── DB ↔ App mapping ────────────────────────────────────────────────

function dbRowToSettings(row: DbRow): AgentSettings {
  return {
    organizationId: row.organization_id,
    systemPrompt: row.system_prompt,
    contextMode: row.context_mode as ContextMode,
    model: row.model as AgentModel,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? null,
  }
}

function defaultsForOrg(organizationId: string): DbInsert {
  return {
    organization_id: organizationId,
    system_prompt: DEFAULT_SYSTEM_PROMPT,
    context_mode: DEFAULT_CONTEXT_MODE,
    model: DEFAULT_MODEL,
  }
}

function patchToDbUpdate(
  patch: Partial<AgentSettingsInput>,
  userId: string | null,
): DbUpdate {
  const update: DbUpdate = {
    // Always stamp updated_by on writes, even if the patch is partial.
    updated_by: userId,
  }
  if (patch.systemPrompt !== undefined) update.system_prompt = patch.systemPrompt
  if (patch.contextMode !== undefined) update.context_mode = patch.contextMode
  if (patch.model !== undefined) update.model = patch.model
  return update
}

function toastError(title: string) {
  useToastStore.getState().push({ title, variant: 'danger', duration: 4000 })
}

// ─── Store ────────────────────────────────────────────────────────────

export const useAgentSettingsStore = create<AgentSettingsStore>((set, get) => ({
  settings: null,
  isLoading: false,
  loadError: null,
  isSaving: false,

  loadSettings: async () => {
    const activeOrg = useAuthStore.getState().activeOrg
    if (!activeOrg) {
      set({ settings: null, isLoading: false, loadError: null })
      return
    }

    set({ isLoading: true, loadError: null })

    // First attempt: read existing row.
    const { data, error } = await supabase
      .from('agent_settings')
      .select('*')
      .eq('organization_id', activeOrg.id)
      .maybeSingle()

    if (error) {
      console.error('[agentSettingsStore] loadSettings select failed:', error)
      set({
        loadError: error.message || 'Failed to load agent settings',
        isLoading: false,
      })
      return
    }

    if (data) {
      set({ settings: dbRowToSettings(data), isLoading: false, loadError: null })
      return
    }

    // No row — lazy upsert defaults.
    const { data: inserted, error: insertError } = await supabase
      .from('agent_settings')
      .insert(defaultsForOrg(activeOrg.id))
      .select()
      .single()

    if (insertError || !inserted) {
      console.error(
        '[agentSettingsStore] lazy-upsert insert failed:',
        insertError,
      )
      set({
        loadError:
          insertError?.message || 'Failed to create default agent settings',
        isLoading: false,
      })
      return
    }

    set({
      settings: dbRowToSettings(inserted),
      isLoading: false,
      loadError: null,
    })
  },

  updateSettings: async (patch) => {
    const activeOrg = useAuthStore.getState().activeOrg
    const userId = useAuthStore.getState().user?.id ?? null
    const previous = get().settings
    if (!activeOrg || !previous) {
      toastError('Save failed: no active workspace.')
      return
    }

    set({ isSaving: true })

    // Optimistic merge so the UI feels instant. Reverted on DB failure.
    set({
      settings: {
        ...previous,
        ...patch,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      },
    })

    const { data, error } = await supabase
      .from('agent_settings')
      .update(patchToDbUpdate(patch, userId))
      .eq('organization_id', activeOrg.id)
      .select()
      .single()

    if (error || !data) {
      console.error('[agentSettingsStore] updateSettings failed:', error)
      toastError('Save failed. Reverted.')
      set({ settings: previous, isSaving: false })
      return
    }

    set({ settings: dbRowToSettings(data), isSaving: false })
  },

  resetToDefaults: async () => {
    await get().updateSettings({
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      contextMode: DEFAULT_CONTEXT_MODE,
      model: DEFAULT_MODEL,
    })
  },

  clearLocalState: () =>
    set({
      settings: null,
      isLoading: false,
      loadError: null,
      isSaving: false,
    }),
}))

// ─── Auth subscription ───────────────────────────────────────────────

useAuthStore.subscribe((state, prevState) => {
  const prevId = prevState.activeOrg?.id ?? null
  const nextId = state.activeOrg?.id ?? null

  if (prevId === nextId) return

  if (nextId === null) {
    useAgentSettingsStore.getState().clearLocalState()
  } else {
    void useAgentSettingsStore.getState().loadSettings()
  }
})

if (useAuthStore.getState().activeOrg) {
  void useAgentSettingsStore.getState().loadSettings()
}
