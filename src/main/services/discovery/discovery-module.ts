// ===================================================================
// UB-Share — Discovery Module Interface
// Abstract interface all discovery modules implement
// ===================================================================

import { EventEmitter } from 'events'
import type { ConnectionMode, DiscoveredPeer } from '@shared/types'

export interface DiscoveryModuleEvents {
  'peer-discovered': (peer: DiscoveredPeer) => void
  'peer-lost': (peerId: string) => void
  'error': (error: Error) => void
}

export abstract class DiscoveryModule extends EventEmitter {
  abstract readonly type: ConnectionMode

  /**
   * Start scanning for peers
   */
  abstract start(): Promise<void>

  /**
   * Stop scanning
   */
  abstract stop(): Promise<void>

  /**
   * Check if this discovery method is available on the current system
   */
  abstract isAvailable(): Promise<boolean>

  /**
   * Get currently discovered peers
   */
  abstract getPeers(): DiscoveredPeer[]
}
