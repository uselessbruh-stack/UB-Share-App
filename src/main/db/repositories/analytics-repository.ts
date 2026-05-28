// ===================================================================
// UB-Share — Analytics Repository
// Singleton analytics row operations
// ===================================================================

import { eq } from 'drizzle-orm'
import { getDatabase } from '../database'
import { analytics, type Analytics } from '../schema'
import type { AnalyticsData } from '@shared/types'

export class AnalyticsRepository {
  private get db() {
    return getDatabase()
  }

  async get(): Promise<AnalyticsData> {
    const [row] = await this.db.select().from(analytics).where(eq(analytics.id, 1)).limit(1)
    if (!row) {
      return {
        totalUploaded: 0,
        totalDownloaded: 0,
        successfulTransfers: 0,
        failedTransfers: 0,
        averageUploadSpeed: 0,
        averageDownloadSpeed: 0
      }
    }
    return {
      totalUploaded: row.totalUploaded,
      totalDownloaded: row.totalDownloaded,
      successfulTransfers: row.successfulTransfers,
      failedTransfers: row.failedTransfers,
      averageUploadSpeed: row.avgUploadSpeed,
      averageDownloadSpeed: row.avgDownloadSpeed
    }
  }

  async incrementUploaded(bytes: number): Promise<void> {
    const current = await this.get()
    await this.db
      .update(analytics)
      .set({ totalUploaded: current.totalUploaded + bytes })
      .where(eq(analytics.id, 1))
  }

  async incrementDownloaded(bytes: number): Promise<void> {
    const current = await this.get()
    await this.db
      .update(analytics)
      .set({ totalDownloaded: current.totalDownloaded + bytes })
      .where(eq(analytics.id, 1))
  }

  async recordSuccess(direction: 'upload' | 'download', bytes: number, speed: number): Promise<void> {
    const current = await this.get()
    const updates: Partial<Analytics> = {
      successfulTransfers: current.successfulTransfers + 1
    }
    if (direction === 'upload') {
      updates.totalUploaded = current.totalUploaded + bytes
      // Running average
      updates.avgUploadSpeed =
        current.successfulTransfers > 0
          ? (current.averageUploadSpeed * current.successfulTransfers + speed) /
            (current.successfulTransfers + 1)
          : speed
    } else {
      updates.totalDownloaded = current.totalDownloaded + bytes
      updates.avgDownloadSpeed =
        current.successfulTransfers > 0
          ? (current.averageDownloadSpeed * current.successfulTransfers + speed) /
            (current.successfulTransfers + 1)
          : speed
    }
    await this.db.update(analytics).set(updates).where(eq(analytics.id, 1))
  }

  async recordFailure(): Promise<void> {
    const current = await this.get()
    await this.db
      .update(analytics)
      .set({ failedTransfers: current.failedTransfers + 1 })
      .where(eq(analytics.id, 1))
  }
}

export const analyticsRepository = new AnalyticsRepository()
