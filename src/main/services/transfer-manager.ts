// ===================================================================
// UB-Share — Transfer Manager
// Orchestrates transfers: queuing, coordination, state management
// ===================================================================

import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { BrowserWindow } from 'electron'
import { transferEngine } from './transfer-engine'
import { resumeEngine } from './resume-engine'
import { webrtcManager } from './webrtc-manager'
import { signalingClient } from './signaling-client'
import { transferRepository } from '../db/repositories/transfer-repository'
import { chunkRepository } from '../db/repositories/chunk-repository'
import { sharedFilesRepository } from '../db/repositories/shared-files-repository'
import { hashFile } from './file-hasher'
import { calculateChunkMap, validateChunkSize } from '../utils/chunk-utils'
import { getTempFilePath, getFinalFilePath, ensureDir, finalizeTempFile, getMimeType, getFileInfo } from '../utils/file-utils'
import { getSettings } from './settings-service'
import { recordTransferSuccess, recordTransferFailure } from './analytics-service'
import { IPC_CHANNELS } from '@shared/constants'
import type {
  TransferRecord,
  TransferRequest,
  FileMetadata,
  TransferProgressEvent,
  SharedFileInfo
} from '@shared/types'

export class TransferManager extends EventEmitter {
  private pendingRequests: Map<string, {
    peerId: string
    file: FileMetadata
    resolve: (accepted: boolean) => void
  }> = new Map()

  // Tracks prepared download transfers awaiting file-meta from the sender's DataChannel
  private pendingReceives: Map<string, {
    transferId: string
    peerId: string
    tempPath: string
    fileMeta: FileMetadata
  }> = new Map()

  constructor() {
    super()
    this.setupEngineListeners()
    this.setupSignalingListeners()
    this.setupWebRTCListeners()
  }

  /**
   * Initialize — recover interrupted transfers from previous session
   */
  async initialize(): Promise<void> {
    await resumeEngine.recoverInterruptedTransfers()
  }

  /**
   * Send a file to a peer
   */
  async sendFile(peerId: string, filePath: string): Promise<string> {
    const settings = await getSettings()
    const fileInfo = getFileInfo(filePath)

    if (!fileInfo.exists) {
      throw new Error('File does not exist')
    }

    // Hash the file
    const fileId = await hashFile(filePath)
    const filename = require('path').basename(filePath)
    const chunkSize = validateChunkSize(settings.chunkSize)
    const { totalChunks, chunks } = calculateChunkMap(fileInfo.size, chunkSize)

    const transferId = uuidv4()

    // Create transfer record in DB
    await transferRepository.create({
      id: transferId,
      fileId,
      filename,
      fileSize: fileInfo.size,
      peerId,
      peerName: '',
      status: 'pending',
      direction: 'upload',
      chunkSize,
      totalChunks,
      localPath: filePath
    })

    // Create chunk map in DB
    await chunkRepository.createChunkMap(
      chunks.map((c) => ({
        transferId,
        chunkIndex: c.index,
        offset: c.offset,
        length: c.length,
        completed: false
      }))
    )

    // Send transfer request via signaling server
    const requestId = uuidv4()
    const fileMeta: FileMetadata = {
      fileId,
      filename,
      fileSize: fileInfo.size,
      mimeType: getMimeType(filename),
      chunkSize,
      totalChunks
    }

    signalingClient.sendTransferRequest(peerId, requestId, fileMeta)
    await transferRepository.updateStatus(transferId, 'awaiting_approval')

    // Store pending request for when response arrives
    this.pendingRequests.set(requestId, {
      peerId,
      file: fileMeta,
      resolve: async (accepted: boolean) => {
        if (accepted) {
          await this.startSendTransfer(transferId, peerId, filePath, fileMeta)
        } else {
          await transferRepository.updateStatus(transferId, 'cancelled', 'Rejected by peer')
          this.emitTransferChanged(transferId)
        }
      }
    })

    this.emitTransferChanged(transferId)
    return transferId
  }

  /**
   * Request a file from a peer
   */
  async requestFile(peerId: string, fileId: string): Promise<string> {
    // File info should come from the peer's shared file list
    // For now, send a request via signaling
    const requestId = uuidv4()
    signalingClient.sendTransferRequest(peerId, requestId, { fileId } as any)
    return requestId
  }

  /**
   * Respond to an incoming transfer request
   */
  async respondToRequest(requestId: string, accepted: boolean): Promise<void> {
    const request = this.pendingRequests.get(requestId)
    if (!request) {
      console.error(`[TransferManager] No pending request found: ${requestId}`)
      return
    }

    this.pendingRequests.delete(requestId)
    signalingClient.respondToTransferRequest(request.peerId, requestId, accepted)

    if (accepted) {
      // Create download transfer record
      await this.startReceiveTransfer(request.peerId, request.file)
    }
  }

  /**
   * Pause a transfer
   */
  async pauseTransfer(transferId: string): Promise<void> {
    transferEngine.pauseTransfer(transferId)
    await transferRepository.updateStatus(transferId, 'paused')
    this.emitTransferChanged(transferId)
  }

  /**
   * Resume a transfer
   */
  async resumeTransfer(transferId: string): Promise<void> {
    const resumeData = await resumeEngine.prepareResume(transferId)
    if (!resumeData) {
      throw new Error('Cannot resume transfer')
    }

    const { transfer, missingChunks } = resumeData

    // Reconnect WebRTC if needed
    if (!webrtcManager.isConnected(transfer.peerId)) {
      await transferRepository.updateStatus(transferId, 'reconnecting')
      this.emitTransferChanged(transferId)

      try {
        await webrtcManager.connectToPeer(transfer.peerId)
      } catch (err) {
        await transferRepository.updateStatus(transferId, 'failed', 'Failed to reconnect')
        this.emitTransferChanged(transferId)
        throw err
      }
    }

    await transferRepository.updateStatus(transferId, 'active')

    if (transfer.direction === 'upload' && transfer.localPath) {
      await transferEngine.startSend(
        transferId,
        transfer.peerId,
        transfer.localPath,
        transfer.fileId,
        transfer.filename,
        transfer.fileSize,
        transfer.chunkSize,
        transfer.totalChunks,
        missingChunks
      )
    }

    this.emitTransferChanged(transferId)
  }

  /**
   * Cancel a transfer
   */
  async cancelTransfer(transferId: string): Promise<void> {
    const transfer = await transferRepository.findById(transferId)
    if (transfer) {
      await transferEngine.cancelTransfer(transferId, transfer.peerId)
      await transferRepository.updateStatus(transferId, 'cancelled')
      this.emitTransferChanged(transferId)
    }
  }

  /**
   * Retry a failed transfer
   */
  async retryTransfer(transferId: string): Promise<void> {
    const transfer = await transferRepository.findById(transferId)
    if (!transfer) throw new Error('Transfer not found')

    // Reset chunks and try again
    await chunkRepository.resetChunks(transferId)
    await transferRepository.update(transferId, {
      status: 'pending',
      progress: 0,
      bytesTransferred: 0,
      completedChunks: 0,
      speed: 0,
      eta: 0,
      errorMessage: null
    })

    this.emitTransferChanged(transferId)
    await this.resumeTransfer(transferId)
  }

  /**
   * Get active transfers
   */
  async getActiveTransfers(): Promise<TransferRecord[]> {
    const transfers = await transferRepository.findActive()
    return transfers.map((t) => this.mapTransfer(t))
  }

  /**
   * Get transfer history
   */
  async getTransferHistory(): Promise<TransferRecord[]> {
    const transfers = await transferRepository.findHistory()
    return transfers.map((t) => this.mapTransfer(t))
  }

  /**
   * Clear completed/failed/cancelled transfer history
   */
  async clearTransferHistory(): Promise<void> {
    await transferRepository.clearHistory()
  }

  // ----- Private Methods -----

  private async startSendTransfer(
    transferId: string,
    peerId: string,
    filePath: string,
    fileMeta: FileMetadata
  ): Promise<void> {
    try {
      // Establish WebRTC connection
      if (!webrtcManager.isConnected(peerId)) {
        await webrtcManager.connectToPeer(peerId)
      }

      await transferRepository.updateStatus(transferId, 'active')
      this.emitTransferChanged(transferId)

      await transferEngine.startSend(
        transferId,
        peerId,
        filePath,
        fileMeta.fileId,
        fileMeta.filename,
        fileMeta.fileSize,
        fileMeta.chunkSize,
        fileMeta.totalChunks
      )
    } catch (err: any) {
      await transferRepository.updateStatus(transferId, 'failed', err.message)
      await recordTransferFailure()
      this.emitTransferChanged(transferId)
    }
  }

  private async startReceiveTransfer(
    peerId: string,
    fileMeta: FileMetadata
  ): Promise<void> {
    const settings = await getSettings()
    const transferId = uuidv4()
    const tempPath = getTempFilePath(settings.downloadDir, fileMeta.filename)
    const { chunks } = calculateChunkMap(fileMeta.fileSize, fileMeta.chunkSize)

    ensureDir(settings.downloadDir)

    // Create transfer record — status is 'pending' until DataChannel delivers file-meta
    await transferRepository.create({
      id: transferId,
      fileId: fileMeta.fileId,
      filename: fileMeta.filename,
      fileSize: fileMeta.fileSize,
      peerId,
      peerName: '',
      status: 'pending',
      direction: 'download',
      chunkSize: fileMeta.chunkSize,
      totalChunks: fileMeta.totalChunks,
      localPath: getFinalFilePath(settings.downloadDir, fileMeta.filename),
      tempPath
    })

    // Create chunk map
    await chunkRepository.createChunkMap(
      chunks.map((c) => ({
        transferId,
        chunkIndex: c.index,
        offset: c.offset,
        length: c.length,
        completed: false
      }))
    )

    // Store this pending receive so the file-meta-received handler can activate it.
    // Key by "peerId:fileId" so we can match when the sender's file-meta arrives.
    const key = `${peerId}:${fileMeta.fileId}`
    this.pendingReceives.set(key, { transferId, peerId, tempPath, fileMeta })

    this.emitTransferChanged(transferId)
    console.log(`[TransferManager] Prepared receive for ${fileMeta.filename} — waiting for sender to connect`)

    // NOTE: We do NOT call webrtcManager.connectToPeer() here.
    // The SENDER will initiate the WebRTC connection after it receives our
    // acceptance via the signaling server. The receiver passively accepts
    // the incoming offer via the signaling handlers in webrtc-manager.ts.
  }

  // ----- Event Handlers -----

  private setupEngineListeners(): void {
    transferEngine.on('progress', async (event: TransferProgressEvent) => {
      // Update DB (throttled — every 10th chunk or so)
      await transferRepository.updateProgress(
        event.transferId,
        event.progress,
        event.bytesTransferred,
        event.completedChunks,
        event.speed,
        event.eta
      )
      // Forward to renderer
      this.sendToRenderer(IPC_CHANNELS.TRANSFER_PROGRESS, event)
    })

    transferEngine.on('transfer-complete', async (transferId: string, direction: string) => {
      const transfer = await transferRepository.findById(transferId)
      if (!transfer) return

      if (direction === 'download' && transfer.tempPath && transfer.localPath) {
        // Finalize downloaded file
        try {
          finalizeTempFile(transfer.tempPath, transfer.localPath)
        } catch (err) {
          console.error('[TransferManager] Failed to finalize file:', err)
        }
      }

      await transferRepository.updateStatus(transferId, 'completed')
      await recordTransferSuccess(
        direction as 'upload' | 'download',
        transfer.fileSize,
        transfer.speed ?? 0
      )

      this.emitTransferChanged(transferId)
      console.log(`[TransferManager] Transfer completed: ${transfer.filename}`)
    })

    transferEngine.on('transfer-error', async (transferId: string, error: Error) => {
      await transferRepository.updateStatus(transferId, 'failed', error.message)
      await recordTransferFailure()
      this.emitTransferChanged(transferId)
    })

    transferEngine.on('transfer-cancelled', async (transferId: string) => {
      await transferRepository.updateStatus(transferId, 'cancelled')
      this.emitTransferChanged(transferId)
    })

    // When the sender's file-meta arrives over the DataChannel, activate the
    // matching pending receive and start writing chunks to disk.
    transferEngine.on('file-meta-received', async (peerId: string, remoteTransferId: string, payload: any) => {
      const key = `${peerId}:${payload.fileId}`
      const pending = this.pendingReceives.get(key)
      if (!pending) {
        console.warn(`[TransferManager] Received file-meta for unknown receive: ${key}`)
        return
      }

      this.pendingReceives.delete(key)

      // Map the sender's transferId to our local transferId so incoming
      // chunk-data and ack messages can be routed to the correct session.
      transferEngine.registerRemoteTransferId(remoteTransferId, pending.transferId)

      try {
        await transferRepository.updateStatus(pending.transferId, 'active')
        this.emitTransferChanged(pending.transferId)

        await transferEngine.startReceive(
          pending.transferId,
          pending.peerId,
          pending.tempPath,
          pending.fileMeta.fileId,
          pending.fileMeta.filename,
          pending.fileMeta.fileSize,
          pending.fileMeta.chunkSize,
          pending.fileMeta.totalChunks
        )

        console.log(`[TransferManager] Receive session activated for ${pending.fileMeta.filename}`)
      } catch (err: any) {
        await transferRepository.updateStatus(pending.transferId, 'failed', err.message)
        await recordTransferFailure()
        this.emitTransferChanged(pending.transferId)
      }
    })
  }

  private setupSignalingListeners(): void {
    signalingClient.on('transfer-request-received', (data: any) => {
      const request: TransferRequest = {
        requestId: data.requestId,
        peerId: data.peerId,
        peerName: data.peerName,
        file: data.file,
        direction: 'download'
      }

      // Store for response
      this.pendingRequests.set(data.requestId, {
        peerId: data.peerId,
        file: data.file,
        resolve: () => {} // Will be called from respondToRequest
      })

      // Notify renderer for approval popup
      this.sendToRenderer(IPC_CHANNELS.TRANSFER_INCOMING_REQUEST, request)
    })

    signalingClient.on('transfer-request-response', (data: any) => {
      const pending = this.pendingRequests.get(data.requestId)
      if (pending) {
        pending.resolve(data.accepted)
        this.pendingRequests.delete(data.requestId)
      }
    })
  }

  private setupWebRTCListeners(): void {
    webrtcManager.on('peer-disconnected', async (peerId: string) => {
      // Mark active transfers with this peer as reconnecting
      const transfers = await transferRepository.findActive()
      for (const t of transfers) {
        if (t.peerId === peerId && (t.status === 'active' || t.status === 'pending')) {
          await transferRepository.updateStatus(t.id, 'reconnecting')
          this.emitTransferChanged(t.id)
        }
      }
    })
  }

  // ----- Helpers -----

  private async emitTransferChanged(transferId: string): Promise<void> {
    const transfer = await transferRepository.findById(transferId)
    if (transfer) {
      this.sendToRenderer(IPC_CHANNELS.TRANSFER_STATE_CHANGED, this.mapTransfer(transfer))
    }
  }

  private sendToRenderer(channel: string, data: any): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send(channel, data)
    }
  }

  private mapTransfer(t: any): TransferRecord {
    return {
      id: t.id,
      fileId: t.fileId,
      filename: t.filename,
      fileSize: t.fileSize,
      peerId: t.peerId,
      peerName: t.peerName ?? '',
      status: t.status,
      progress: t.progress,
      bytesTransferred: t.bytesTransferred,
      direction: t.direction,
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

export const transferManager = new TransferManager()
