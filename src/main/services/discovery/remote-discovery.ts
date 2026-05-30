// ===================================================================
// UB-Share — Remote Discovery Module
// Wraps the existing SignalingClient as a DiscoveryModule
// ===================================================================

import { DiscoveryModule } from './discovery-module'
import { signalingClient } from '../signaling-client'
import type { ConnectionMode, DiscoveredPeer } from '@shared/types'

export class RemoteDiscovery extends DiscoveryModule {
  readonly type: ConnectionMode = 'remote'
  private peers: Map<string, DiscoveredPeer> = new Map()
  private listening = false

  async start(): Promise<void> {
    if (this.listening) return
    this.listening = true

    signalingClient.on('peer-list-updated', this.handlePeerListUpdated)
    signalingClient.on('peer-joined', this.handlePeerJoined)
    signalingClient.on('peer-left', this.handlePeerLeft)

    // Request current peer list
    signalingClient.requestPeerList()
    console.log('[RemoteDiscovery] Started')
  }

  async stop(): Promise<void> {
    if (!this.listening) return
    this.listening = false

    signalingClient.off('peer-list-updated', this.handlePeerListUpdated)
    signalingClient.off('peer-joined', this.handlePeerJoined)
    signalingClient.off('peer-left', this.handlePeerLeft)

    this.peers.clear()
    console.log('[RemoteDiscovery] Stopped')
  }

  async isAvailable(): Promise<boolean> {
    // Always available — signaling connects asynchronously,
    // and the module just listens for events when they arrive
    return true
  }

  getPeers(): DiscoveredPeer[] {
    return Array.from(this.peers.values())
  }

  // --- Event handlers ---

  private handlePeerListUpdated = (peerList: any[]): void => {
    const newIds = new Set<string>()

    for (const p of peerList) {
      const id = p.peerId
      newIds.add(id)

      if (!this.peers.has(id)) {
        const peer: DiscoveredPeer = {
          id,
          displayName: p.displayName,
          connectionMode: 'remote',
          sharedFiles: p.sharedFiles ?? [],
          capabilities: ['remote']
        }
        this.peers.set(id, peer)
        this.emit('peer-discovered', peer)
      }
    }

    // Remove peers no longer in the list
    for (const [id] of this.peers) {
      if (!newIds.has(id)) {
        this.peers.delete(id)
        this.emit('peer-lost', id)
      }
    }
  }

  private handlePeerJoined = (data: any): void => {
    const peer: DiscoveredPeer = {
      id: data.peerId,
      displayName: data.displayName,
      connectionMode: 'remote',
      sharedFiles: data.sharedFiles ?? [],
      capabilities: ['remote']
    }
    this.peers.set(data.peerId, peer)
    this.emit('peer-discovered', peer)
  }

  private handlePeerLeft = (data: any): void => {
    if (this.peers.has(data.peerId)) {
      this.peers.delete(data.peerId)
      this.emit('peer-lost', data.peerId)
    }
  }
}
