// ===================================================================
// UB-Share — Transfer Engine
// Core chunk-based file transfer logic over WebRTC DataChannels
// ===================================================================

import { EventEmitter } from 'events'
import { createReadStream } from 'fs'
import { open, stat } from 'fs/promises'
import type { FileHandle } from 'fs/promises'
import { webrtcManager } from './webrtc-manager'
import { chunkRepository } from '../db/repositories/chunk-repository'
import { transferRepository } from '../db/repositories/transfer-repository'
import { hashBuffer } from '../utils/crypto-utils'
import { calculateProgress } from '../utils/chunk-utils'
import { TRANSFER_CONSTANTS } from '@shared/constants'
import type { TransferProgressEvent, ChunkMessageType } from '@shared/types'

// Protocol message format sent over DataChannel
interface ProtocolMessage {
  type: ChunkMessageType
  transferId: string
  payload: any
}

/**
 * Encodes a protocol message + optional binary payload into a single ArrayBuffer.
 * Format: [4 bytes header length][JSON header][binary payload]
 */
function encodeMessage(msg: ProtocolMessage, binaryPayload?: ArrayBuffer): ArrayBuffer {
  const headerStr = JSON.stringify(msg)
  const headerBytes = new TextEncoder().encode(headerStr)
  const headerLen = headerBytes.byteLength
  const payloadLen = binaryPayload?.byteLength ?? 0
  const buffer = new ArrayBuffer(4 + headerLen + payloadLen)
  const view = new DataView(buffer)
  view.setUint32(0, headerLen)
  new Uint8Array(buffer, 4, headerLen).set(headerBytes)
  if (binaryPayload && payloadLen > 0) {
    new Uint8Array(buffer, 4 + headerLen, payloadLen).set(new Uint8Array(binaryPayload))
  }
  return buffer
}

/**
 * Decodes a received ArrayBuffer into protocol message + optional binary payload.
 */
function decodeMessage(data: ArrayBuffer): { msg: ProtocolMessage; binaryPayload?: ArrayBuffer } {
  const view = new DataView(data)
  const headerLen = view.getUint32(0)
  const headerBytes = new Uint8Array(data, 4, headerLen)
  const headerStr = new TextDecoder().decode(headerBytes)
  const msg = JSON.parse(headerStr) as ProtocolMessage
  const payloadStart = 4 + headerLen
  let binaryPayload: ArrayBuffer | undefined
  if (payloadStart < data.byteLength) {
    binaryPayload = data.slice(payloadStart)
  }
  return { msg, binaryPayload }
}

export class TransferEngine extends EventEmitter {
  // Active send sessions
  private sendSessions: Map<string, SendSession> = new Map()
  // Active receive sessions
  private receiveSessions: Map<string, ReceiveSession> = new Map()
  // Maps remote (sender's) transferId → local (receiver's) transferId
  private remoteToLocalId: Map<string, string> = new Map()
  // Maps local (receiver's) transferId → remote (sender's) transferId
  private localToRemoteId: Map<string, string> = new Map()
  // Chunks that arrived before the receive session was ready (race condition buffer)
  private pendingChunks: Map<string, Array<{ peerId: string; transferId: string; payload: any; binaryPayload: ArrayBuffer }>> = new Map()
  // Progress throttle timers
  private progressTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    super()
    // Listen for incoming DataChannel messages
    webrtcManager.on('datachannel-message', (peerId: string, data: ArrayBuffer) => {
      this.handleMessage(peerId, data)
    })
  }

  /**
   * Register a mapping from the sender's (remote) transferId to the local one.
   * This is needed because the sender and receiver each generate their own
   * transferId, but protocol messages carry the sender's transferId.
   */
  registerRemoteTransferId(remoteTransferId: string, localTransferId: string): void {
    this.remoteToLocalId.set(remoteTransferId, localTransferId)
    this.localToRemoteId.set(localTransferId, remoteTransferId)
  }

  /**
   * Start sending a file to a peer
   */
  async startSend(
    transferId: string,
    peerId: string,
    filePath: string,
    fileId: string,
    filename: string,
    fileSize: number,
    chunkSize: number,
    totalChunks: number,
    missingChunks?: number[]
  ): Promise<void> {
    console.log(`[TransferEngine] Starting send: ${filename} to ${peerId}`)

    const chunksToSend = missingChunks ?? Array.from({ length: totalChunks }, (_, i) => i)
    const alreadyCompleted = totalChunks - chunksToSend.length
    const alreadyTransferred = alreadyCompleted * chunkSize

    const session: SendSession = {
      transferId,
      peerId,
      filePath,
      fileId,
      filename,
      fileSize,
      chunkSize,
      totalChunks,
      currentChunkIndex: 0,
      completedChunks: alreadyCompleted,
      bytesTransferred: Math.min(alreadyTransferred, fileSize),
      startTime: Date.now(),
      paused: false,
      cancelled: false,
      chunksToSend,
      speedSamples: [],
      lastSpeedCalc: Date.now()
    }

    this.sendSessions.set(transferId, session)

    // Send file metadata first
    const metaMsg: ProtocolMessage = {
      type: 'file-meta',
      transferId,
      payload: {
        fileId,
        filename,
        fileSize,
        chunkSize,
        totalChunks,
        isResume: !!missingChunks
      }
    }
    webrtcManager.send(peerId, encodeMessage(metaMsg))

    // Start sending chunks
    await this.sendNextChunk(transferId)
  }

  /**
   * Start receiving a file from a peer
   */
  async startReceive(
    transferId: string,
    peerId: string,
    tempPath: string,
    fileId: string,
    filename: string,
    fileSize: number,
    chunkSize: number,
    totalChunks: number
  ): Promise<void> {
    console.log(`[TransferEngine] Starting receive: ${filename} from ${peerId}`)

    // Open file handle for writing
    const fileHandle = await open(tempPath, 'w')

    const session: ReceiveSession = {
      transferId,
      peerId,
      tempPath,
      fileId,
      filename,
      fileSize,
      chunkSize,
      totalChunks,
      completedChunks: 0,
      bytesTransferred: 0,
      startTime: Date.now(),
      fileHandle,
      paused: false,
      cancelled: false,
      speedSamples: [],
      lastSpeedCalc: Date.now()
    }

    this.receiveSessions.set(transferId, session)

    // Flush any chunks that arrived before the session was ready
    const queued = this.pendingChunks.get(transferId)
    if (queued && queued.length > 0) {
      console.log(`[TransferEngine] Flushing ${queued.length} buffered chunks for ${filename}`)
      this.pendingChunks.delete(transferId)
      for (const chunk of queued) {
        await this.handleChunkData(chunk.peerId, chunk.transferId, chunk.payload, chunk.binaryPayload)
      }
    }
  }

  /**
   * Pause a transfer
   */
  pauseTransfer(transferId: string): void {
    const send = this.sendSessions.get(transferId)
    if (send) send.paused = true

    const recv = this.receiveSessions.get(transferId)
    if (recv) recv.paused = true
  }

  /**
   * Resume a transfer
   */
  async resumeTransfer(transferId: string): Promise<void> {
    const send = this.sendSessions.get(transferId)
    if (send) {
      send.paused = false
      await this.sendNextChunk(transferId)
      return
    }

    const recv = this.receiveSessions.get(transferId)
    if (recv) {
      recv.paused = false
    }
  }

  /**
   * Cancel a transfer
   */
  async cancelTransfer(transferId: string, peerId: string): Promise<void> {
    const send = this.sendSessions.get(transferId)
    if (send) {
      send.cancelled = true
      this.sendSessions.delete(transferId)
    }

    const recv = this.receiveSessions.get(transferId)
    if (recv) {
      recv.cancelled = true
      await recv.fileHandle.close()
      this.receiveSessions.delete(transferId)
    }

    // Notify peer
    const cancelMsg: ProtocolMessage = {
      type: 'transfer-cancel',
      transferId,
      payload: {}
    }
    webrtcManager.send(peerId, encodeMessage(cancelMsg))

    this.clearProgressTimer(transferId)
  }

  /**
   * Check if a transfer is active
   */
  isActive(transferId: string): boolean {
    return this.sendSessions.has(transferId) || this.receiveSessions.has(transferId)
  }

  /**
   * Cleanup all sessions
   */
  async cleanup(): Promise<void> {
    for (const [, session] of this.receiveSessions) {
      try { await session.fileHandle.close() } catch { /* ignore */ }
    }
    this.sendSessions.clear()
    this.receiveSessions.clear()
    for (const timer of this.progressTimers.values()) {
      clearInterval(timer)
    }
    this.progressTimers.clear()
  }

  // ----- Private: Sending -----

  private async sendNextChunk(transferId: string): Promise<void> {
    const session = this.sendSessions.get(transferId)
    if (!session || session.paused || session.cancelled) return

    // Check if all chunks dispatched
    if (session.currentChunkIndex >= session.chunksToSend.length) {
      // All chunks dispatched — wait for final ACKs to confirm completion
      return
    }

    // Backpressure check — pause sending if the DataChannel buffer is full
    const buffered = webrtcManager.getBufferedAmount(session.peerId)
    if (buffered > TRANSFER_CONSTANTS.MAX_BUFFER_SIZE) {
      // Wait for the buffer to drain before sending more
      webrtcManager.once('datachannel-drain', () => {
        this.sendNextChunk(transferId)
      })
      return
    }

    const chunkIndex = session.chunksToSend[session.currentChunkIndex]
    const offset = chunkIndex * session.chunkSize
    const length = Math.min(session.chunkSize, session.fileSize - offset)

    try {
      // Read chunk from file
      const chunkData = await this.readChunk(session.filePath, offset, length)
      const checksum = hashBuffer(chunkData)

      // Encode and send
      const msg: ProtocolMessage = {
        type: 'chunk-data',
        transferId,
        payload: {
          index: chunkIndex,
          offset,
          length,
          checksum
        }
      }

      // IMPORTANT: Buffer.buffer returns the underlying ArrayBuffer pool which
      // may be larger than the actual data. Use slice to get only our portion.
      const chunkArrayBuffer = chunkData.buffer.slice(
        chunkData.byteOffset,
        chunkData.byteOffset + chunkData.byteLength
      ) as ArrayBuffer

      const encoded = encodeMessage(msg, chunkArrayBuffer)
      const sent = webrtcManager.send(session.peerId, encoded)
      if (!sent) {
        console.error(`[TransferEngine] Failed to send chunk ${chunkIndex} — channel not available`)
        return
      }

      session.currentChunkIndex++

      // Immediately queue the next chunk (streaming — don't wait for ACK).
      // Use setImmediate to yield to the event loop so ACKs and other
      // messages can be processed between chunks.
      setImmediate(() => this.sendNextChunk(transferId))
    } catch (err) {
      console.error(`[TransferEngine] Error sending chunk ${chunkIndex}:`, err)
      this.emit('transfer-error', transferId, err)
    }
  }

  private async readChunk(filePath: string, offset: number, length: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const stream = createReadStream(filePath, {
        start: offset,
        end: offset + length - 1,
        highWaterMark: length
      })

      stream.on('data', (chunk) => chunks.push(chunk as Buffer))
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', reject)
    })
  }

  // ----- Private: Receiving -----

  private async handleChunkData(
    peerId: string,
    transferId: string,
    payload: any,
    binaryPayload: ArrayBuffer
  ): Promise<void> {
    const session = this.receiveSessions.get(transferId)
    if (!session) {
      // Session not yet created — buffer the chunk for when startReceive() finishes
      if (!this.pendingChunks.has(transferId)) {
        this.pendingChunks.set(transferId, [])
      }
      this.pendingChunks.get(transferId)!.push({ peerId, transferId, payload, binaryPayload })
      console.log(`[TransferEngine] Buffered early chunk ${payload.index} for transfer ${transferId}`)
      return
    }
    if (session.paused || session.cancelled) return

    const { index, offset, length, checksum } = payload
    const chunkBuffer = Buffer.from(binaryPayload)

    // Use the sender's (remote) transferId for outgoing messages
    // so the sender can match them to its send session
    const remoteTransferId = this.localToRemoteId.get(transferId) ?? transferId

    // Verify checksum
    const actualChecksum = hashBuffer(chunkBuffer)
    if (actualChecksum !== checksum) {
      console.error(`[TransferEngine] Chunk ${index} checksum mismatch!`)
      // Send NACK — request resend
      const nack: ProtocolMessage = {
        type: 'chunk-ack',
        transferId: remoteTransferId,
        payload: { index, success: false }
      }
      webrtcManager.send(peerId, encodeMessage(nack))
      return
    }

    // Write to file at correct offset
    await session.fileHandle.write(chunkBuffer, 0, chunkBuffer.length, offset)

    // Mark chunk as completed in DB
    await chunkRepository.markCompleted(transferId, index, checksum)

    session.completedChunks++
    session.bytesTransferred += length

    // Send ACK
    const ack: ProtocolMessage = {
      type: 'chunk-ack',
      transferId: remoteTransferId,
      payload: { index, success: true }
    }
    webrtcManager.send(peerId, encodeMessage(ack))

    // Emit progress
    this.emitProgress(session, transferId)

    // Check if transfer is complete
    if (session.completedChunks >= session.totalChunks) {
      await session.fileHandle.close()
      this.receiveSessions.delete(transferId)
      this.clearProgressTimer(transferId)
      this.emit('transfer-complete', transferId, 'download')
    }
  }

  // ----- Private: Message Handling -----

  private handleMessage(peerId: string, data: ArrayBuffer): void {
    try {
      const { msg, binaryPayload } = decodeMessage(data)
      const { type, transferId: rawTransferId, payload } = msg

      // Translate sender's transferId to local one for receive sessions.
      const transferId = this.remoteToLocalId.get(rawTransferId) ?? rawTransferId

      switch (type) {
        case 'file-meta':
          // Pass the RAW (sender's) transferId so the manager can register the mapping
          this.emit('file-meta-received', peerId, rawTransferId, payload)
          break

        case 'chunk-data':
          if (binaryPayload) {
            this.handleChunkData(peerId, transferId, payload, binaryPayload)
          }
          break

        case 'chunk-ack':
          this.handleChunkAck(transferId, payload)
          break

        case 'resume-request':
          this.emit('resume-request-received', peerId, transferId, payload)
          break

        case 'resume-response':
          this.emit('resume-response-received', peerId, transferId, payload)
          break

        case 'transfer-complete':
          this.emit('transfer-complete', transferId, 'upload')
          this.sendSessions.delete(transferId)
          this.clearProgressTimer(transferId)
          break

        case 'transfer-cancel':
          this.handleRemoteCancel(transferId)
          break

        case 'transfer-pause':
          this.pauseTransfer(transferId)
          break

        case 'transfer-error':
          this.emit('transfer-error', transferId, new Error(payload.message))
          break
      }
    } catch (err) {
      console.error('[TransferEngine] Failed to decode message:', err)
    }
  }

  private handleChunkAck(transferId: string, payload: { index: number; success: boolean }): void {
    const session = this.sendSessions.get(transferId)
    if (!session) return

    if (payload.success) {
      session.completedChunks++
      session.bytesTransferred += Math.min(
        session.chunkSize,
        session.fileSize - payload.index * session.chunkSize
      )

      // Emit progress
      this.emitProgress(session, transferId)

      // Check completion — all chunks sent AND all ACKs received
      if (session.completedChunks >= session.totalChunks) {
        const completeMsg: ProtocolMessage = {
          type: 'transfer-complete',
          transferId,
          payload: {}
        }
        webrtcManager.send(session.peerId, encodeMessage(completeMsg))
        this.sendSessions.delete(transferId)
        this.clearProgressTimer(transferId)
        this.emit('transfer-complete', transferId, 'upload')
        return
      }

      // Note: we do NOT call sendNextChunk here — the streaming loop
      // in sendNextChunk handles continuous sending via setImmediate.
    } else {
      // Chunk failed verification — re-add to send queue and retry
      console.log(`[TransferEngine] Chunk ${payload.index} NACK — will resend`)
      session.chunksToSend.push(payload.index)
      this.sendNextChunk(transferId)
    }
  }

  private handleRemoteCancel(transferId: string): void {
    const send = this.sendSessions.get(transferId)
    if (send) {
      send.cancelled = true
      this.sendSessions.delete(transferId)
    }

    const recv = this.receiveSessions.get(transferId)
    if (recv) {
      recv.cancelled = true
      recv.fileHandle.close().catch(() => {})
      this.receiveSessions.delete(transferId)
    }

    this.clearProgressTimer(transferId)
    this.emit('transfer-cancelled', transferId)
  }

  // ----- Progress -----

  private emitProgress(
    session: SendSession | ReceiveSession,
    transferId: string
  ): void {
    const now = Date.now()
    const elapsed = (now - session.startTime) / 1000

    // Calculate speed (bytes per second)
    session.speedSamples.push({ time: now, bytes: session.bytesTransferred })
    // Keep last 10 samples
    if (session.speedSamples.length > 10) {
      session.speedSamples.shift()
    }

    let speed = 0
    if (session.speedSamples.length >= 2) {
      const oldest = session.speedSamples[0]
      const newest = session.speedSamples[session.speedSamples.length - 1]
      const timeDiff = (newest.time - oldest.time) / 1000
      const bytesDiff = newest.bytes - oldest.bytes
      speed = timeDiff > 0 ? bytesDiff / timeDiff : 0
    }

    const progress = calculateProgress(session.completedChunks, session.totalChunks)
    const remaining = session.fileSize - session.bytesTransferred
    const eta = speed > 0 ? Math.ceil(remaining / speed) : 0

    const event: TransferProgressEvent = {
      transferId,
      progress,
      bytesTransferred: session.bytesTransferred,
      speed,
      eta,
      completedChunks: session.completedChunks,
      totalChunks: session.totalChunks,
      status: 'active'
    }

    this.emit('progress', event)
  }

  private clearProgressTimer(transferId: string): void {
    const timer = this.progressTimers.get(transferId)
    if (timer) {
      clearInterval(timer)
      this.progressTimers.delete(transferId)
    }
  }
}

// ----- Session Types -----

interface SendSession {
  transferId: string
  peerId: string
  filePath: string
  fileId: string
  filename: string
  fileSize: number
  chunkSize: number
  totalChunks: number
  currentChunkIndex: number
  completedChunks: number
  bytesTransferred: number
  startTime: number
  paused: boolean
  cancelled: boolean
  chunksToSend: number[]
  speedSamples: { time: number; bytes: number }[]
  lastSpeedCalc: number
}

interface ReceiveSession {
  transferId: string
  peerId: string
  tempPath: string
  fileId: string
  filename: string
  fileSize: number
  chunkSize: number
  totalChunks: number
  completedChunks: number
  bytesTransferred: number
  startTime: number
  fileHandle: FileHandle
  paused: boolean
  cancelled: boolean
  speedSamples: { time: number; bytes: number }[]
  lastSpeedCalc: number
}

export const transferEngine = new TransferEngine()
