// ===================================================================
// UB-Share — WebRTC Manager
// Manages PeerConnection lifecycle and DataChannels
// Uses node-datachannel for Node.js/Electron main process compatibility
// ===================================================================

import { EventEmitter } from 'events'
import {
  PeerConnection,
  DataChannel
} from 'node-datachannel'
import type { DescriptionType } from 'node-datachannel'
import { WEBRTC_CONFIG, DATA_CHANNEL_CONFIG } from '@shared/constants'
import type { RTCIceCandidateInit } from '@shared/types'
import { signalingClient } from './signaling-client'

interface PeerConn {
  peerId: string
  connection: PeerConnection
  dataChannel: DataChannel | null
  state: 'connecting' | 'connected' | 'disconnected' | 'failed'
  isInitiator: boolean
}

export class WebRTCManager extends EventEmitter {
  private connections: Map<string, PeerConn> = new Map()

  constructor() {
    super()
    this.setupSignalingListeners()
  }

  /**
   * Initiate a WebRTC connection to a peer (as offerer)
   */
  async connectToPeer(peerId: string): Promise<DataChannel> {
    console.log(`[WebRTC] Initiating connection to peer: ${peerId}`)

    const existing = this.connections.get(peerId)
    if (existing?.dataChannel) {
      // node-datachannel doesn't have readyState on DataChannel; check if connection is alive
      if (existing.state === 'connected') {
        console.log(`[WebRTC] Reusing existing connection to ${peerId}`)
        return existing.dataChannel
      }
    }

    // Cleanup existing connection
    if (existing) {
      this.cleanupConnection(peerId)
    }

    // Build ICE server strings from our config
    const iceServers = (WEBRTC_CONFIG.iceServers ?? []).flatMap((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls]
      return urls
    })

    const connection = new PeerConnection(peerId, {
      iceServers,
      iceTransportPolicy: WEBRTC_CONFIG.iceTransportPolicy ?? 'all',
      maxMessageSize: 1048576  // 1MB — must exceed chunkSize + header overhead
    })

    const peerConn: PeerConn = {
      peerId,
      connection,
      dataChannel: null,
      state: 'connecting',
      isInitiator: true
    }

    this.connections.set(peerId, peerConn)
    this.setupConnectionHandlers(peerConn)

    // Create data channel (as initiator)
    const dataChannel = connection.createDataChannel('file-transfer', {
      unordered: !(DATA_CHANNEL_CONFIG.ordered ?? true)
    })
    peerConn.dataChannel = dataChannel
    this.setupDataChannelHandlers(peerId, dataChannel)

    // Wait for connection to be established (data channel open)
    return new Promise<DataChannel>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, 30000)

      // Check if already open (unlikely but safe)
      if (peerConn.state === 'connected') {
        clearTimeout(timeout)
        resolve(dataChannel)
        return
      }

      // Listen for the datachannel-open event for this peer
      const onOpen = (openedPeerId: string): void => {
        if (openedPeerId !== peerId) return
        clearTimeout(timeout)
        this.removeListener('datachannel-open', onOpen)
        this.removeListener('datachannel-error', onError)
        resolve(dataChannel)
      }

      const onError = (errorPeerId: string, err: any): void => {
        if (errorPeerId !== peerId) return
        clearTimeout(timeout)
        this.removeListener('datachannel-open', onOpen)
        this.removeListener('datachannel-error', onError)
        reject(new Error(`DataChannel error: ${err}`))
      }

      this.on('datachannel-open', onOpen)
      this.on('datachannel-error', onError)
    })
  }

  /**
   * Handle incoming WebRTC offer (as answerer)
   */
  async handleOffer(peerId: string, sdpString: string): Promise<void> {
    console.log(`[WebRTC] Received offer from peer: ${peerId}`)

    const existing = this.connections.get(peerId)
    if (existing) {
      this.cleanupConnection(peerId)
    }

    // Build ICE server strings
    const iceServers = (WEBRTC_CONFIG.iceServers ?? []).flatMap((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls]
      return urls
    })

    const connection = new PeerConnection(peerId, {
      iceServers,
      iceTransportPolicy: WEBRTC_CONFIG.iceTransportPolicy ?? 'all',
      maxMessageSize: 1048576  // 1MB — must exceed chunkSize + header overhead
    })

    const peerConn: PeerConn = {
      peerId,
      connection,
      dataChannel: null,
      state: 'connecting',
      isInitiator: false
    }

    this.connections.set(peerId, peerConn)
    this.setupConnectionHandlers(peerConn)

    // Handle incoming data channel
    connection.onDataChannel((dc) => {
      peerConn.dataChannel = dc
      this.setupDataChannelHandlers(peerId, dc)
    })

    // Parse the offer — the sender sends JSON.stringify({ type, sdp })
    const offer = JSON.parse(sdpString)
    connection.setRemoteDescription(offer.sdp, 'offer' as DescriptionType)
  }

  /**
   * Handle incoming WebRTC answer
   */
  async handleAnswer(peerId: string, sdpString: string): Promise<void> {
    const peerConn = this.connections.get(peerId)
    if (!peerConn) {
      console.error(`[WebRTC] No connection found for peer: ${peerId}`)
      return
    }

    const answer = JSON.parse(sdpString)
    peerConn.connection.setRemoteDescription(answer.sdp, 'answer' as DescriptionType)
    console.log(`[WebRTC] Answer set for peer: ${peerId}`)
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerConn = this.connections.get(peerId)
    if (!peerConn) return

    try {
      if (candidate.candidate && candidate.sdpMid !== undefined && candidate.sdpMid !== null) {
        peerConn.connection.addRemoteCandidate(candidate.candidate, candidate.sdpMid)
      }
    } catch (err) {
      console.error(`[WebRTC] Failed to add ICE candidate for ${peerId}:`, err)
    }
  }

  /**
   * Get the data channel for a peer
   */
  getDataChannel(peerId: string): DataChannel | null {
    return this.connections.get(peerId)?.dataChannel ?? null
  }

  /**
   * Get connection state for a peer
   */
  getConnectionState(peerId: string): string {
    return this.connections.get(peerId)?.state ?? 'disconnected'
  }

  /**
   * Check if peer is connected
   */
  isConnected(peerId: string): boolean {
    const conn = this.connections.get(peerId)
    return conn?.state === 'connected' && conn?.dataChannel !== null
  }

  /**
   * Close connection to a peer
   */
  closeConnection(peerId: string): void {
    this.cleanupConnection(peerId)
    this.emit('peer-disconnected', peerId)
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    for (const peerId of this.connections.keys()) {
      this.cleanupConnection(peerId)
    }
  }

  /**
   * Send data over a peer's data channel
   */
  send(peerId: string, data: ArrayBuffer | string): boolean {
    const channel = this.getDataChannel(peerId)
    if (!channel) {
      console.error(`[WebRTC] send() — no channel for peer ${peerId}`)
      return false
    }

    try {
      if (typeof data === 'string') {
        channel.sendMessage(data)
      } else {
        // node-datachannel expects Buffer for binary data
        const buf = Buffer.from(data)
        channel.sendMessageBinary(buf)
      }
      return true
    } catch (err) {
      console.error(`[WebRTC] Failed to send data to ${peerId}:`, err)
      return false
    }
  }

  /**
   * Get buffered amount for backpressure monitoring
   */
  getBufferedAmount(peerId: string): number {
    const channel = this.getDataChannel(peerId)
    if (!channel) return 0
    try {
      return channel.bufferedAmount() ?? 0
    } catch {
      return 0
    }
  }

  // ----- Private Methods -----

  private setupSignalingListeners(): void {
    signalingClient.on('offer-received', async (data: { peerId: string; sdp: string }) => {
      await this.handleOffer(data.peerId, data.sdp)
    })

    signalingClient.on('answer-received', async (data: { peerId: string; sdp: string }) => {
      await this.handleAnswer(data.peerId, data.sdp)
    })

    signalingClient.on('ice-candidate-received', async (data: { peerId: string; candidate: RTCIceCandidateInit }) => {
      await this.handleIceCandidate(data.peerId, data.candidate)
    })
  }

  private setupConnectionHandlers(peerConn: PeerConn): void {
    const { connection, peerId } = peerConn

    // node-datachannel: onLocalDescription fires when the local offer/answer is ready
    connection.onLocalDescription((sdp, type) => {
      console.log(`[WebRTC] Local description ready for ${peerId}: ${type}`)

      // Package as JSON matching the browser API format
      const desc = JSON.stringify({ type, sdp })

      if (type === 'offer') {
        signalingClient.sendOffer(peerId, desc)
      } else if (type === 'answer') {
        signalingClient.sendAnswer(peerId, desc)
      }
    })

    // node-datachannel: onLocalCandidate fires for each ICE candidate
    connection.onLocalCandidate((candidate, mid) => {
      signalingClient.sendIceCandidate(peerId, {
        candidate,
        sdpMid: mid,
        sdpMLineIndex: 0
      })
    })

    connection.onStateChange((state) => {
      console.log(`[WebRTC] Connection state for ${peerId}: ${state}`)

      switch (state) {
        case 'connected':
          peerConn.state = 'connected'
          this.emit('peer-connected', peerId)
          break
        case 'disconnected':
          peerConn.state = 'disconnected'
          this.emit('peer-disconnected', peerId)
          break
        case 'failed':
          peerConn.state = 'failed'
          this.emit('peer-failed', peerId)
          break
        case 'closed':
          this.cleanupConnection(peerId)
          this.emit('peer-disconnected', peerId)
          break
      }
    })

    connection.onGatheringStateChange((state) => {
      console.log(`[WebRTC] ICE gathering state for ${peerId}: ${state}`)
    })
  }

  private setupDataChannelHandlers(peerId: string, channel: DataChannel): void {
    // Set the threshold for onBufferedAmountLow so backpressure drain events fire
    try {
      channel.setBufferedAmountLowThreshold(512 * 1024) // 512KB — resume sending when buffer drops below this
    } catch {
      // Some versions may not support this — backpressure will still work via polling
    }

    channel.onOpen(() => {
      console.log(`[WebRTC] DataChannel open for peer: ${peerId}`)
      const peerConn = this.connections.get(peerId)
      if (peerConn) peerConn.state = 'connected'
      this.emit('datachannel-open', peerId, channel)
    })

    channel.onClosed(() => {
      console.log(`[WebRTC] DataChannel closed for peer: ${peerId}`)
      this.emit('datachannel-closed', peerId)
    })

    channel.onError((err) => {
      console.error(`[WebRTC] DataChannel error for peer ${peerId}:`, err)
      this.emit('datachannel-error', peerId, err)
    })

    channel.onMessage((data) => {
      // node-datachannel delivers messages as string or Buffer
      // Convert Buffer to ArrayBuffer for compatibility with transfer-engine
      if (Buffer.isBuffer(data)) {
        const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
        this.emit('datachannel-message', peerId, ab)
      } else if (typeof data === 'string') {
        // Convert string to ArrayBuffer
        const buf = Buffer.from(data)
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
        this.emit('datachannel-message', peerId, ab)
      } else {
        this.emit('datachannel-message', peerId, data)
      }
    })

    // node-datachannel uses onBufferedAmountLow
    channel.onBufferedAmountLow(() => {
      this.emit('datachannel-drain', peerId)
    })
  }

  private cleanupConnection(peerId: string): void {
    const peerConn = this.connections.get(peerId)
    if (!peerConn) return

    try {
      if (peerConn.dataChannel) {
        peerConn.dataChannel.close()
      }
      peerConn.connection.close()
    } catch (err) {
      // Ignore cleanup errors
    }

    this.connections.delete(peerId)
    console.log(`[WebRTC] Cleaned up connection to ${peerId}`)
  }
}

export const webrtcManager = new WebRTCManager()
