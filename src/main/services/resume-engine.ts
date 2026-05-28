// ===================================================================
// UB-Share — Resume Engine
// Handles transfer recovery after disconnect/restart
// ===================================================================

import { EventEmitter } from 'events'
import { chunkRepository } from '../db/repositories/chunk-repository'
import { transferRepository } from '../db/repositories/transfer-repository'
import { webrtcManager } from './webrtc-manager'
import { getMissingChunks } from '../utils/chunk-utils'
import type { TransferRecord } from '@shared/types'

export class ResumeEngine extends EventEmitter {
  /**
   * Find all transfers that can be resumed
   */
  async getResumableTransfers(): Promise<TransferRecord[]> {
    const transfers = await transferRepository.findResumable()
    return transfers.map((t) => this.mapTransfer(t))
  }

  /**
   * Attempt to resume a transfer
   * Returns the list of missing chunk indices
   */
  async prepareResume(transferId: string): Promise<{
    transfer: TransferRecord
    missingChunks: number[]
    completedChunks: number[]
  } | null> {
    const transfer = await transferRepository.findById(transferId)
    if (!transfer) {
      console.error(`[ResumeEngine] Transfer not found: ${transferId}`)
      return null
    }

    // Get chunk completion status from DB
    const completedChunks = await chunkRepository.getCompletedChunkIndices(transferId)
    const missingChunks = getMissingChunks(transfer.totalChunks, completedChunks)

    console.log(
      `[ResumeEngine] Resume prepared for ${transferId}: ` +
      `${completedChunks.length}/${transfer.totalChunks} chunks completed, ` +
      `${missingChunks.length} chunks remaining`
    )

    return {
      transfer: this.mapTransfer(transfer),
      missingChunks,
      completedChunks
    }
  }

  /**
   * Mark interrupted transfers as paused on app startup
   */
  async recoverInterruptedTransfers(): Promise<number> {
    // Find any transfers that were "active" when the app last closed
    const activeTransfers = await transferRepository.findByStatus('active')
    const reconnectingTransfers = await transferRepository.findByStatus('reconnecting')
    const all = [...activeTransfers, ...reconnectingTransfers]

    let recovered = 0
    for (const transfer of all) {
      await transferRepository.updateStatus(transfer.id, 'paused')
      recovered++
      console.log(`[ResumeEngine] Recovered interrupted transfer: ${transfer.filename} (${transfer.id})`)
    }

    if (recovered > 0) {
      console.log(`[ResumeEngine] Recovered ${recovered} interrupted transfers`)
    }

    return recovered
  }

  /**
   * Validate that a resume is possible (file hash matches)
   */
  async validateResume(transferId: string, fileId: string): Promise<boolean> {
    const transfer = await transferRepository.findById(transferId)
    if (!transfer) return false
    return transfer.fileId === fileId
  }

  private mapTransfer(t: any): TransferRecord {
    return {
      id: t.id,
      fileId: t.fileId,
      filename: t.filename,
      fileSize: t.fileSize,
      peerId: t.peerId,
      peerName: t.peerName ?? '',
      status: t.status as any,
      progress: t.progress,
      bytesTransferred: t.bytesTransferred,
      direction: t.direction as any,
      chunkSize: t.chunkSize,
      totalChunks: t.totalChunks,
      completedChunks: t.completedChunks,
      speed: t.speed ?? 0,
      eta: t.eta ?? 0,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      completedAt: t.completedAt ?? undefined,
      resumeToken: t.resumeToken ?? undefined,
      localPath: t.localPath ?? undefined,
      tempPath: t.tempPath ?? undefined,
      errorMessage: t.errorMessage ?? undefined
    }
  }
}

export const resumeEngine = new ResumeEngine()
