// ===================================================================
// UB-Share — Discovery Manager
// Central aggregator for all discovery modules
// ===================================================================

import { EventEmitter } from 'events'
import { DiscoveryModule } from './discovery-module'
import { RemoteDiscovery } from './remote-discovery'
import { LocalDiscovery } from './local-discovery'
import type { ConnectionMode, DiscoveredPeer } from '@shared/types'

export class DiscoveryManager extends EventEmitter {
  private modules: Map<ConnectionMode, DiscoveryModule> = new Map()
  private allPeers: Map<string, DiscoveredPeer> = new Map()

  // Concrete module instances
  readonly remote = new RemoteDiscovery()
  readonly local = new LocalDiscovery()

  constructor() {
    super()
    this.registerModule(this.remote)
    this.registerModule(this.local)

    // Prevent ERR_UNHANDLED_ERROR for module-error events
    this.on('module-error', (type: string, err: Error) => {
      console.warn(`[DiscoveryManager] Module error (${type}): ${err.message}`)
    })
  }

  /**
   * Register a discovery module
   */
  private registerModule(module: DiscoveryModule): void {
    this.modules.set(module.type, module)

    module.on('peer-discovered', (peer: DiscoveredPeer) => {
      this.handlePeerDiscovered(peer)
    })

    module.on('peer-lost', (peerId: string) => {
      this.handlePeerLost(peerId, module.type)
    })

    module.on('error', (error: Error) => {
      console.error(`[DiscoveryManager] Error in ${module.type} module:`, error.message)
      this.emit('module-error', module.type, error)
    })
  }

  /**
   * Start a specific discovery module
   */
  async startModule(type: ConnectionMode): Promise<void> {
    const module = this.modules.get(type)
    if (!module) {
      console.warn(`[DiscoveryManager] No module for type: ${type}`)
      return
    }

    const available = await module.isAvailable()
    if (!available) {
      console.warn(`[DiscoveryManager] ${type} discovery not available`)
      return
    }

    try {
      await module.start()
    } catch (err) {
      console.error(`[DiscoveryManager] Failed to start ${type}:`, err)
    }
  }

  /**
   * Stop a specific discovery module
   */
  async stopModule(type: ConnectionMode): Promise<void> {
    const module = this.modules.get(type)
    if (module) {
      await module.stop()
      // Remove peers from this module
      for (const [id, peer] of this.allPeers) {
        if (peer.connectionMode === type) {
          this.allPeers.delete(id)
        }
      }
      this.emitPeersUpdated()
    }
  }

  /**
   * Start all available discovery modules
   */
  async startAll(): Promise<void> {
    for (const [type, module] of this.modules) {
      try {
        const available = await module.isAvailable()
        if (available) {
          await module.start()
          console.log(`[DiscoveryManager] Started ${type} discovery`)
        }
      } catch (err) {
        console.error(`[DiscoveryManager] Failed to start ${type}:`, err)
      }
    }
  }

  /**
   * Stop all discovery modules
   */
  async stopAll(): Promise<void> {
    for (const module of this.modules.values()) {
      try {
        await module.stop()
      } catch (err) {
        console.error(`[DiscoveryManager] Failed to stop ${module.type}:`, err)
      }
    }
    this.allPeers.clear()
  }

  /**
   * Get all discovered peers across all modules
   */
  getAllPeers(): DiscoveredPeer[] {
    return Array.from(this.allPeers.values())
  }

  /**
   * Get peers from a specific discovery method
   */
  getPeersByMode(mode: ConnectionMode): DiscoveredPeer[] {
    return this.getAllPeers().filter((p) => p.connectionMode === mode)
  }

  /**
   * Check if a module is available
   */
  async isModuleAvailable(type: ConnectionMode): Promise<boolean> {
    const module = this.modules.get(type)
    return module ? module.isAvailable() : false
  }

  // --- Private ---

  private handlePeerDiscovered(peer: DiscoveredPeer): void {
    const existing = this.allPeers.get(peer.id)

    if (existing) {
      // Merge capabilities if peer found through multiple methods
      const mergedCapabilities = new Set([
        ...(existing.capabilities ?? []),
        ...(peer.capabilities ?? []),
        peer.connectionMode
      ])
      existing.capabilities = Array.from(mergedCapabilities)

      // Prefer local connection mode if available
      if (peer.connectionMode === 'local') {
        existing.connectionMode = 'local'
        existing.addresses = peer.addresses
      }
    } else {
      this.allPeers.set(peer.id, { ...peer })
    }

    this.emitPeersUpdated()
  }

  private handlePeerLost(peerId: string, mode: ConnectionMode): void {
    const peer = this.allPeers.get(peerId)
    if (!peer) return

    // Only remove if no other module has this peer
    const stillExists = Array.from(this.modules.values()).some((m) =>
      m.type !== mode && m.getPeers().some((p) => p.id === peerId)
    )

    if (!stillExists) {
      this.allPeers.delete(peerId)
    } else {
      // Update connection mode to whatever remains
      for (const m of this.modules.values()) {
        if (m.type !== mode) {
          const found = m.getPeers().find((p) => p.id === peerId)
          if (found) {
            peer.connectionMode = found.connectionMode
            break
          }
        }
      }
    }

    this.emitPeersUpdated()
  }

  private emitPeersUpdated(): void {
    this.emit('peers-updated', this.getAllPeers())
  }
}

// Export singleton
export const discoveryManager = new DiscoveryManager()
