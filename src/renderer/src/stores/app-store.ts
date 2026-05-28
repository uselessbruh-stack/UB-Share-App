// ===================================================================
// UB-Share — App Store (Zustand)
// Global application state: connection status, theme
// ===================================================================

import { create } from 'zustand'

interface AppState {
  isConnected: boolean
  theme: 'dark' | 'light' | 'system'
  sidebarCollapsed: boolean

  setConnected: (connected: boolean) => void
  setTheme: (theme: 'dark' | 'light' | 'system') => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  isConnected: false,
  theme: 'dark',
  sidebarCollapsed: false,

  setConnected: (connected) => set({ isConnected: connected }),
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
}))
