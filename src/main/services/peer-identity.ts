// ===================================================================
// UB-Share — Peer Identity Service
// Manages persistent peer identity (ID, name, capabilities)
// ===================================================================

import type { ConnectionMode } from '@shared/types'

/**
 * Generate a human-readable peer ID in the format P2P-XXXX-XXXX
 */
export function generatePeerId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segment = (len: number): string =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `P2P-${segment(4)}-${segment(4)}`
}

/**
 * Validate a peer ID format
 */
export function isValidPeerId(id: string): boolean {
  return /^P2P-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id)
}

/**
 * Get device capabilities based on available hardware/software
 */
export function getDeviceCapabilities(): ConnectionMode[] {
  const caps: ConnectionMode[] = ['remote'] // always available

  // Local network is always available (mDNS)
  caps.push('local')

  // Bluetooth LE — will check at runtime when module is loaded
  // caps.push('nearby')

  return caps
}

/**
 * Format a peer ID for display (already human-readable)
 */
export function formatPeerId(peerId: string): string {
  return peerId
}
