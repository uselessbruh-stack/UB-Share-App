// ===================================================================
// UB-Share — Transfer Repository
// CRUD operations for the transfers table
// ===================================================================

import { eq, desc, inArray, and, sql } from 'drizzle-orm'
import { getDatabase } from '../database'
import { transfers, type Transfer, type NewTransfer } from '../schema'

export class TransferRepository {
  private get db() {
    return getDatabase()
  }

  async create(transfer: NewTransfer): Promise<Transfer> {
    const [result] = await this.db.insert(transfers).values(transfer).returning()
    return result
  }

  async findById(id: string): Promise<Transfer | undefined> {
    const [result] = await this.db.select().from(transfers).where(eq(transfers.id, id)).limit(1)
    return result
  }

  async findByStatus(status: string): Promise<Transfer[]> {
    return this.db.select().from(transfers).where(eq(transfers.status, status)).orderBy(desc(transfers.updatedAt))
  }

  async findActive(): Promise<Transfer[]> {
    return this.db
      .select()
      .from(transfers)
      .where(
        inArray(transfers.status, ['active', 'paused', 'reconnecting', 'pending', 'awaiting_approval'])
      )
      .orderBy(desc(transfers.updatedAt))
  }

  async findHistory(): Promise<Transfer[]> {
    return this.db
      .select()
      .from(transfers)
      .orderBy(desc(transfers.updatedAt))
      .limit(200)
  }

  async findResumable(): Promise<Transfer[]> {
    return this.db
      .select()
      .from(transfers)
      .where(
        inArray(transfers.status, ['paused', 'failed', 'reconnecting'])
      )
      .orderBy(desc(transfers.updatedAt))
  }

  async findByPeerId(peerId: string): Promise<Transfer[]> {
    return this.db
      .select()
      .from(transfers)
      .where(eq(transfers.peerId, peerId))
      .orderBy(desc(transfers.updatedAt))
  }

  async update(id: string, data: Partial<NewTransfer>): Promise<Transfer | undefined> {
    const [result] = await this.db
      .update(transfers)
      .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(transfers.id, id))
      .returning()
    return result
  }

  async updateProgress(
    id: string,
    progress: number,
    bytesTransferred: number,
    completedChunks: number,
    speed: number,
    eta: number
  ): Promise<void> {
    await this.db
      .update(transfers)
      .set({
        progress,
        bytesTransferred,
        completedChunks,
        speed,
        eta,
        updatedAt: Math.floor(Date.now() / 1000)
      })
      .where(eq(transfers.id, id))
  }

  async updateStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    const data: Partial<NewTransfer> = {
      status,
      updatedAt: Math.floor(Date.now() / 1000)
    }
    if (errorMessage !== undefined) {
      data.errorMessage = errorMessage
    }
    if (status === 'completed') {
      data.completedAt = Math.floor(Date.now() / 1000)
      data.progress = 100
    }
    await this.db.update(transfers).set(data).where(eq(transfers.id, id))
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(transfers).where(eq(transfers.id, id))
  }

  async clearHistory(): Promise<void> {
    await this.db
      .delete(transfers)
      .where(
        inArray(transfers.status, ['completed', 'failed', 'cancelled'])
      )
  }

  async getCount(): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(transfers)
    return result.count
  }

  async getActiveCount(): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(transfers)
      .where(eq(transfers.status, 'active'))
    return result.count
  }
}

export const transferRepository = new TransferRepository()
