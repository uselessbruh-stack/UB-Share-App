// ===================================================================
// UB-Share — Signaling Client
// Socket.IO client connecting to the discovery/signaling server
// ===================================================================

import { io, Socket } from 'socket.io-client'
import { EventEmitter } from 'events'
import { SOCKET_EVENTS } from '@shared/constants'
import type { PeerInfo, SharedFileInfo, TransferRequest, RTCIceCandidateInit } from '@shared/types'

export class SignalingClient extends EventEmitter {
  private socket: Socket | null = null
  private peerId: string = ''
  private displayName: string = ''
  private serverUrl: string = ''
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10

  /**
   * Connect to the signaling server
   */
  connect(serverUrl: string, peerId: string, displayName: string, sharedFiles: SharedFileInfo[] = []): void {
    if (this.socket?.connected) {
      this.disconnect()
    }

    this.serverUrl = serverUrl
    this.peerId = peerId
    this.displayName = displayName

    console.log(`[SignalingClient] Connecting to ${serverUrl}...`)

    this.socket = io(serverUrl, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000
    })

    this.setupEventHandlers(sharedFiles)
  }

  /**
   * Disconnect from the signaling server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket.removeAllListeners()
      this.socket = null
      console.log('[SignalingClient] Disconnected')
    }
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  /**
   * Request online peer list
   */
  requestPeerList(): void {
    this.socket?.emit(SOCKET_EVENTS.PEER_LIST)
  }

  /**
   * Update shared files on the server
   */
  updateSharedFiles(sharedFiles: SharedFileInfo[]): void {
    this.socket?.emit(SOCKET_EVENTS.PEER_UPDATE_FILES, { sharedFiles })
  }

  /**
   * Send WebRTC offer to a peer
   */
  sendOffer(targetPeerId: string, sdp: string): void {
    this.socket?.emit(SOCKET_EVENTS.SIGNAL_OFFER, { targetPeerId, sdp })
  }

  /**
   * Send WebRTC answer to a peer
   */
  sendAnswer(targetPeerId: string, sdp: string): void {
    this.socket?.emit(SOCKET_EVENTS.SIGNAL_ANSWER, { targetPeerId, sdp })
  }

  /**
   * Send ICE candidate to a peer
   */
  sendIceCandidate(targetPeerId: string, candidate: RTCIceCandidateInit): void {
    this.socket?.emit(SOCKET_EVENTS.SIGNAL_ICE_CANDIDATE, { targetPeerId, candidate })
  }

  /**
   * Send a transfer request to a peer
   */
  sendTransferRequest(targetPeerId: string, requestId: string, file: any): void {
    this.socket?.emit(SOCKET_EVENTS.TRANSFER_REQUEST_SEND, {
      targetPeerId,
      requestId,
      file
    })
  }

  /**
   * Respond to a transfer request
   */
  respondToTransferRequest(targetPeerId: string, requestId: string, accepted: boolean): void {
    this.socket?.emit(SOCKET_EVENTS.TRANSFER_REQUEST_RESPOND, {
      targetPeerId,
      requestId,
      accepted
    })
  }

  /**
   * Setup all Socket.IO event handlers
   */
  private setupEventHandlers(sharedFiles: SharedFileInfo[]): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('[SignalingClient] Connected to signaling server')
      this.reconnectAttempts = 0

      // Register with the server
      this.socket!.emit(SOCKET_EVENTS.PEER_REGISTER, {
        peerId: this.peerId,
        displayName: this.displayName,
        sharedFiles
      })

      this.emit('connected')
    })

    this.socket.on('disconnect', (reason: string) => {
      console.log(`[SignalingClient] Disconnected: ${reason}`)
      this.emit('disconnected', reason)
    })

    this.socket.on('connect_error', (error: Error) => {
      this.reconnectAttempts++
      console.error(`[SignalingClient] Connection error (attempt ${this.reconnectAttempts}):`, error.message)
      this.emit('connection-error', error)
    })

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`[SignalingClient] Reconnected after ${attemptNumber} attempts`)
      this.emit('reconnected')
    })

    // Peer events
    this.socket.on(SOCKET_EVENTS.PEER_LIST_UPDATED, (peers: any[]) => {
      this.emit('peer-list-updated', peers)
    })

    this.socket.on(SOCKET_EVENTS.PEER_JOINED, (data: any) => {
      this.emit('peer-joined', data)
    })

    this.socket.on(SOCKET_EVENTS.PEER_LEFT, (data: any) => {
      this.emit('peer-left', data)
    })

    this.socket.on('peer:files-updated', (data: any) => {
      this.emit('peer-files-updated', data)
    })

    // WebRTC signaling events
    this.socket.on(SOCKET_EVENTS.SIGNAL_OFFER_RECEIVED, (data: any) => {
      this.emit('offer-received', data)
    })

    this.socket.on(SOCKET_EVENTS.SIGNAL_ANSWER_RECEIVED, (data: any) => {
      this.emit('answer-received', data)
    })

    this.socket.on(SOCKET_EVENTS.SIGNAL_ICE_CANDIDATE_RECEIVED, (data: any) => {
      this.emit('ice-candidate-received', data)
    })

    // Transfer request events
    this.socket.on(SOCKET_EVENTS.TRANSFER_REQUEST_RECEIVED, (data: any) => {
      this.emit('transfer-request-received', data)
    })

    this.socket.on(SOCKET_EVENTS.TRANSFER_REQUEST_RESPONSE, (data: any) => {
      this.emit('transfer-request-response', data)
    })

    this.socket.on('transfer:request-failed', (data: any) => {
      this.emit('transfer-request-failed', data)
    })

    this.socket.on('signal:error', (data: any) => {
      console.error('[SignalingClient] Signaling error:', data.message)
      this.emit('signaling-error', data)
    })
  }
}

// Export singleton
export const signalingClient = new SignalingClient()
