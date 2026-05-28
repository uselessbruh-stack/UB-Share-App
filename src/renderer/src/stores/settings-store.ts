// ===================================================================
// UB-Share — Settings Store (Zustand)
// Application settings state management
// ===================================================================

import { create } from 'zustand'
import type { AppSettings } from '@shared/types'

interface SettingsState {
  settings: AppSettings | null
  loading: boolean

  setSettings: (settings: AppSettings) => void
  updateSettings: (updates: Partial<AppSettings>) => void
  setLoading: (loading: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: true,

  setSettings: (settings) => set({ settings, loading: false }),

  updateSettings: (updates) =>
    set((state) => ({
      settings: state.settings ? { ...state.settings, ...updates } : null
    })),

  setLoading: (loading) => set({ loading })
}))
