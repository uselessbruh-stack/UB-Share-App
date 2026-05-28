// ===================================================================
// UB-Share — Chunk Utilities
// Chunk calculation, verification, and map operations
// ===================================================================

import type { ChunkInfo } from '@shared/types'
import { TRANSFER_CONSTANTS } from '@shared/constants'

/**
 * Calculate the chunk map for a file
 */
export function calculateChunkMap(
  fileSize: number,
  chunkSize: number = TRANSFER_CONSTANTS.DEFAULT_CHUNK_SIZE
): { totalChunks: number; chunks: Omit<ChunkInfo, 'transferId' | 'checksum' | 'completed'>[] } {
  const totalChunks = Math.ceil(fileSize / chunkSize)
  const chunks: Omit<ChunkInfo, 'transferId' | 'checksum' | 'completed'>[] = []

  for (let i = 0; i < totalChunks; i++) {
    const offset = i * chunkSize
    const length = Math.min(chunkSize, fileSize - offset)
    chunks.push({ index: i, offset, length })
  }

  return { totalChunks, chunks }
}

/**
 * Validate chunk size is within acceptable range
 */
export function validateChunkSize(chunkSize: number): number {
  return Math.max(
    TRANSFER_CONSTANTS.MIN_CHUNK_SIZE,
    Math.min(TRANSFER_CONSTANTS.MAX_CHUNK_SIZE, chunkSize)
  )
}

/**
 * Calculate which chunks are missing given a completed set
 */
export function getMissingChunks(totalChunks: number, completedChunks: number[]): number[] {
  const completedSet = new Set(completedChunks)
  const missing: number[] = []
  for (let i = 0; i < totalChunks; i++) {
    if (!completedSet.has(i)) {
      missing.push(i)
    }
  }
  return missing
}

/**
 * Calculate transfer progress percentage
 */
export function calculateProgress(completedChunks: number, totalChunks: number): number {
  if (totalChunks === 0) return 0
  return Math.min(100, Math.round((completedChunks / totalChunks) * 10000) / 100)
}

/**
 * Calculate bytes transferred from completed chunks
 */
export function calculateBytesTransferred(
  completedChunks: number,
  totalChunks: number,
  fileSize: number,
  chunkSize: number
): number {
  if (completedChunks >= totalChunks) return fileSize
  return completedChunks * chunkSize
}
