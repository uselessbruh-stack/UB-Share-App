// ===================================================================
// UB-Share — Settings Repository
// Key-value settings persistence
// ===================================================================

import { eq } from 'drizzle-orm'
import { getDatabase } from '../database'
import { settings } from '../schema'
import { DEFAULT_SETTINGS } from '@shared/constants'
import type { AppSettings } from '@shared/types'

export class SettingsRepository {
  private get db() {
    return getDatabase()
  }

  async get(key: string): Promise<string | undefined> {
    const [result] = await this.db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1)
    return result?.value
  }

  async set(key: string, value: string): Promise<void> {
    const existing = await this.get(key)
    if (existing !== undefined) {
      await this.db.update(settings).set({ value }).where(eq(settings.key, key))
    } else {
      await this.db.insert(settings).values({ key, value })
    }
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.db.select().from(settings)
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }
    return result
  }

  async getAppSettings(): Promise<AppSettings> {
    const allSettings = await this.getAll()
    return {
      displayName: allSettings.displayName ?? DEFAULT_SETTINGS.displayName,
      chunkSize: parseInt(allSettings.chunkSize ?? String(DEFAULT_SETTINGS.chunkSize), 10),
      bandwidthLimit: parseInt(allSettings.bandwidthLimit ?? String(DEFAULT_SETTINGS.bandwidthLimit), 10),
      downloadDir: allSettings.downloadDir ?? DEFAULT_SETTINGS.downloadDir,
      reconnectTimeout: parseInt(allSettings.reconnectTimeout ?? String(DEFAULT_SETTINGS.reconnectTimeout), 10),
      autoResume: allSettings.autoResume === undefined ? DEFAULT_SETTINGS.autoResume : allSettings.autoResume === 'true',
      maxSimultaneousTransfers: parseInt(
        allSettings.maxSimultaneousTransfers ?? String(DEFAULT_SETTINGS.maxSimultaneousTransfers),
        10
      ),
      signalingServerUrl: allSettings.signalingServerUrl ?? DEFAULT_SETTINGS.signalingServerUrl,
      startMinimized: allSettings.startMinimized === 'true',
      notifications: allSettings.notifications === undefined ? DEFAULT_SETTINGS.notifications : allSettings.notifications === 'true',
      theme: (allSettings.theme as AppSettings['theme']) ?? DEFAULT_SETTINGS.theme
    }
  }

  async updateAppSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        await this.set(key, String(value))
      }
    }
    return this.getAppSettings()
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(settings).where(eq(settings.key, key))
  }
}

export const settingsRepository = new SettingsRepository()
