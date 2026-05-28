// ===================================================================
// UB-Share — Chunk Repository
// Operations for the transfer_chunks table (chunk maps)
// ===================================================================

import { eq, and, sql } from 'drizzle-orm'
import { getDatabase } from '../database'
import { transferChunks, type TransferChunk, type NewTransferChunk } from '../schema'

export class ChunkRepository {
  private get db() {
    return getDatabase()
  }

  /**
   * Create all chunks for a transfer at once (bulk insert)
   */
  async createChunkMap(chunks: NewTransferChunk[]): Promise<void> {
    if (chunks.length === 0) return

    // Insert in batches of 500 to avoid SQLite variable limits
    const batchSize = 500
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      await this.db.insert(transferChunks).values(batch)
    }
  }

  /**
   * Get all chunks for a transfer
   */
  async findByTransferId(transferId: string): Promise<TransferChunk[]> {
    return this.db
      .select()
      .from(transferChunks)
      .where(eq(transferChunks.transferId, transferId))
      .orderBy(transferChunks.chunkIndex)
  }

  /**
   * Get completed chunk indices for a transfer
   */
  async getCompletedChunkIndices(transferId: string): Promise<number[]> {
    const rows = await this.db
      .select({ chunkIndex: transferChunks.chunkIndex })
      .from(transferChunks)
      .where(
        and(
          eq(transferChunks.transferId, transferId),
          eq(transferChunks.completed, true)
        )
      )
      .orderBy(transferChunks.chunkIndex)
    return rows.map((r) => r.chunkIndex)
  }

  /**
   * Get missing (incomplete) chunk indices for a transfer
   */
  async getMissingChunkIndices(transferId: string): Promise<number[]> {
    const rows = await this.db
      .select({ chunkIndex: transferChunks.chunkIndex })
      .from(transferChunks)
      .where(
        and(
          eq(transferChunks.transferId, transferId),
          eq(transferChunks.completed, false)
        )
      )
      .orderBy(transferChunks.chunkIndex)
    return rows.map((r) => r.chunkIndex)
  }

  /**
   * Mark a single chunk as completed
   */
  async markCompleted(transferId: string, chunkIndex: number, checksum?: string): Promise<void> {
    await this.db
      .update(transferChunks)
      .set({ completed: true, checksum: checksum ?? null })
      .where(
        and(
          eq(transferChunks.transferId, transferId),
          eq(transferChunks.chunkIndex, chunkIndex)
        )
      )
  }

  /**
   * Get count of completed chunks
   */
  async getCompletedCount(transferId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(transferChunks)
      .where(
        and(
          eq(transferChunks.transferId, transferId),
          eq(transferChunks.completed, true)
        )
      )
    return result.count
  }

  /**
   * Get total chunk count for a transfer
   */
  async getTotalCount(transferId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(transferChunks)
      .where(eq(transferChunks.transferId, transferId))
    return result.count
  }

  /**
   * Get a specific chunk by index
   */
  async findChunk(transferId: string, chunkIndex: number): Promise<TransferChunk | undefined> {
    const [result] = await this.db
      .select()
      .from(transferChunks)
      .where(
        and(
          eq(transferChunks.transferId, transferId),
          eq(transferChunks.chunkIndex, chunkIndex)
        )
      )
      .limit(1)
    return result
  }

  /**
   * Delete all chunks for a transfer
   */
  async deleteByTransferId(transferId: string): Promise<void> {
    await this.db
      .delete(transferChunks)
      .where(eq(transferChunks.transferId, transferId))
  }

  /**
   * Reset all chunks to incomplete (for retry)
   */
  async resetChunks(transferId: string): Promise<void> {
    await this.db
      .update(transferChunks)
      .set({ completed: false, checksum: null })
      .where(eq(transferChunks.transferId, transferId))
  }
}

export const chunkRepository = new ChunkRepository()
