// ===================================================================
// UB-Share — Theme Hook
// Reads theme setting and applies data-theme attribute to <html>
// ===================================================================

import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/settings-store'

export function useTheme() {
  const settings = useSettingsStore((s) => s.settings)
  const theme = settings?.theme ?? 'dark'

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const apply = () => root.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
      apply()
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }

    root.setAttribute('data-theme', theme)
  }, [theme])
}
