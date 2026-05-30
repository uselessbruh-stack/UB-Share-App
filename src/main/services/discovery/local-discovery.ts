// ===================================================================
// UB-Share — Local Network Discovery Module
// mDNS/Zeroconf-based LAN peer discovery using bonjour-service
// ===================================================================

import { DiscoveryModule } from './discovery-module'
import type { ConnectionMode, DiscoveredPeer } from '@shared/types'
import { networkInterfaces } from 'os'

const SERVICE_TYPE = 'ubshare'
const SERVICE_PORT = 42069

export class LocalDiscovery extends DiscoveryModule {
  readonly type: ConnectionMode = 'local'
  private peers: Map<string, DiscoveredPeer> = new Map()
  private bonjour: any = null
  private browser: any = null
  private publisher: any = null
  private localPeerId: string = ''
  private localDisplayName: string = ''
  private running = false

  /**
   * Configure local identity for advertising
   */
  configure(peerId: string, displayName: string): void {
    this.localPeerId = peerId
    this.localDisplayName = displayName
  }

  async start(): Promise<void> {
    if (this.running) return

    try {
      // Dynamic import — handle CJS/ESM interop
      const bonjourModule = await import('bonjour-service')
      // bonjour-service exports: { Bonjour, Service, Browser } in CJS
      // but bundlers may wrap it differently
      const BonjourClass = (bonjourModule as any).Bonjour
        || (bonjourModule as any).default?.Bonjour
        || (bonjourModule as any).default
        || bonjourModule
      this.bonjour = new BonjourClass()

      // Advertise this peer
      this.publisher = this.bonjour.publish({
        name: `ubshare-${this.localPeerId}`,
        type: SERVICE_TYPE,
        port: SERVICE_PORT,
        txt: {
          peerId: this.localPeerId,
          displayName: this.localDisplayName,
          version: '1'
        }
      })

      // Browse for other UB-Share peers
      this.browser = this.bonjour.find({ type: SERVICE_TYPE }, (service: any) => {
        this.handleServiceUp(service)
      })

      // Some bonjour-service versions use 'up' event
      this.browser.on('up', (service: any) => {
        this.handleServiceUp(service)
      })

      this.browser.on('down', (service: any) => {
        this.handleServiceDown(service)
      })

      this.running = true
      console.log('[LocalDiscovery] Started — advertising and browsing')
    } catch (err) {
      console.error('[LocalDiscovery] Failed to start:', err)
      this.emit('error', err instanceof Error ? err : new Error(String(err)))
    }
  }

  async stop(): Promise<void> {
    if (!this.running) return

    try {
      if (this.browser) {
        this.browser.stop()
        this.browser = null
      }
      if (this.publisher) {
        this.publisher.stop()
        this.publisher = null
      }
      if (this.bonjour) {
        this.bonjour.destroy()
        this.bonjour = null
      }
    } catch {
      // Ignore cleanup errors
    }

    this.peers.clear()
    this.running = false
    console.log('[LocalDiscovery] Stopped')
  }

  async isAvailable(): Promise<boolean> {
    // mDNS is available on all platforms with network access
    try {
      const interfaces = networkInterfaces()
      return Object.values(interfaces).some((ifaces) =>
        ifaces?.some((iface) => !iface.internal && iface.family === 'IPv4')
      )
    } catch {
      return false
    }
  }

  getPeers(): DiscoveredPeer[] {
    return Array.from(this.peers.values())
  }

  // --- Private ---

  private handleServiceUp(service: any): void {
    const txt = service.txt || {}
    const peerId = txt.peerId
    if (!peerId || peerId === this.localPeerId) return // Skip self

    const addresses = (service.addresses || []).filter(
      (a: string) => a && !a.includes(':') // IPv4 only
    )

    const peer: DiscoveredPeer = {
      id: peerId,
      displayName: txt.displayName || service.name || 'Unknown',
      connectionMode: 'local',
      sharedFiles: [],
      addresses,
      capabilities: ['local', 'remote']
    }

    const isNew = !this.peers.has(peerId)
    this.peers.set(peerId, peer)

    if (isNew) {
      console.log(`[LocalDiscovery] Found peer: ${peer.displayName} (${peerId}) at ${addresses.join(', ')}`)
      this.emit('peer-discovered', peer)
    }
  }

  private handleServiceDown(service: any): void {
    const txt = service.txt || {}
    const peerId = txt.peerId
    if (!peerId) return

    if (this.peers.has(peerId)) {
      console.log(`[LocalDiscovery] Peer left: ${peerId}`)
      this.peers.delete(peerId)
      this.emit('peer-lost', peerId)
    }
  }
}
