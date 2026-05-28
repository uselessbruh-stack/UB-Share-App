// ===================================================================
// UB-Share — Settings Hook
// Load and update app settings
// ===================================================================

import { useEffect, useCallback } from 'react'
import { useSettingsStore } from '@/stores/settings-store'
import type { AppSettings } from '@shared/types'

export function useSettings() {
  const { settings, loading, setSettings, setLoading } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const s = await window.ubshare.getSettings()
      setSettings(s)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }, [setSettings, setLoading])

  const saveSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      try {
        const updated = await window.ubshare.updateSettings(updates)
        setSettings(updated)
      } catch (err) {
        console.error('Failed to save settings:', err)
      }
    },
    [setSettings]
  )

  return {
    settings,
    loading,
    saveSettings,
    refreshSettings: loadSettings
  }
}
