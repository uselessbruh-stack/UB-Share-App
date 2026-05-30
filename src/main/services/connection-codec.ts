// ===================================================================
// UB-Share — Connection Codec
// Encodes/decodes connection payloads for QR codes and share links
// ===================================================================

import type { ConnectionPayload } from '@shared/types'

const PROTOCOL_PREFIX = 'P2P://'
const LINK_PREFIX = 'ubshare://peer/'
const PAYLOAD_VERSION = 1

/**
 * Encode a ConnectionPayload into a shareable code string
 * Format: P2P://base64encodedJSON
 */
export function encodeConnectionPayload(payload: ConnectionPayload): string {
  const json = JSON.stringify({ ...payload, version: PAYLOAD_VERSION })
  const base64 = Buffer.from(json, 'utf-8').toString('base64url')
  return `${PROTOCOL_PREFIX}${base64}`
}

/**
 * Decode a connection code string back into a ConnectionPayload
 * Accepts both P2P://... and ubshare://peer/... formats
 */
export function decodeConnectionPayload(code: string): ConnectionPayload | null {
  try {
    let base64: string

    if (code.startsWith(PROTOCOL_PREFIX)) {
      base64 = code.slice(PROTOCOL_PREFIX.length)
    } else if (code.startsWith(LINK_PREFIX)) {
      base64 = code.slice(LINK_PREFIX.length)
    } else {
      // Try raw base64
      base64 = code
    }

    const json = Buffer.from(base64, 'base64url').toString('utf-8')
    const payload = JSON.parse(json) as ConnectionPayload

    // Validate required fields
    if (!payload.peerId || !payload.deviceName || !Array.isArray(payload.capabilities)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Generate a shareable deep link
 * Format: ubshare://peer/base64encodedJSON
 */
export function generateShareableLink(payload: ConnectionPayload): string {
  const json = JSON.stringify({ ...payload, version: PAYLOAD_VERSION })
  const base64 = Buffer.from(json, 'utf-8').toString('base64url')
  return `${LINK_PREFIX}${base64}`
}

/**
 * Check if a string is a valid connection code
 */
export function isValidConnectionCode(code: string): boolean {
  return decodeConnectionPayload(code) !== null
}
