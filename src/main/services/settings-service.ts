import { app } from 'electron'
import { settingsRepository } from '../db/repositories/settings-repository'
import { getDefaultDownloadDir } from '../utils/file-utils'
import { generatePeerId } from './peer-identity'
import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/constants'

let cachedSettings: AppSettings | null = null

/**
 * Initialize settings with defaults
 */
export async function initSettings(): Promise<AppSettings> {
  const settings = await settingsRepository.getAppSettings()

  // Set download directory default if empty
  if (!settings.downloadDir) {
    settings.downloadDir = getDefaultDownloadDir()
    await settingsRepository.set('downloadDir', settings.downloadDir)
  }

  // Generate persistent peer ID on first launch
  if (!settings.peerId) {
    settings.peerId = generatePeerId()
    await settingsRepository.set('peerId', settings.peerId)
    console.log(`[Settings] Generated peer ID: ${settings.peerId}`)
  }

  cachedSettings = settings
  console.log('[Settings] Initialized:', JSON.stringify(settings, null, 2))
  return settings
}

/**
 * Get current settings (cached)
 */
export async function getSettings(): Promise<AppSettings> {
  if (!cachedSettings) {
    cachedSettings = await settingsRepository.getAppSettings()
  }
  return cachedSettings
}

/**
 * Update settings and refresh cache
 */
export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const updated = await settingsRepository.updateAppSettings(updates)
  cachedSettings = updated
  return updated
}

/**
 * Get a specific setting value
 */
export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const settings = await getSettings()
  return settings[key]
}
