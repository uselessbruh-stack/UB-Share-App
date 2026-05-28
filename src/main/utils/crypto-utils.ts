// ===================================================================
// UB-Share — Crypto Utilities
// Streaming SHA-256 hashing for files and chunks
// ===================================================================

import { createHash, type Hash } from 'crypto'
import { createReadStream } from 'fs'
import { TRANSFER_CONSTANTS } from '@shared/constants'

/**
 * Compute SHA-256 hash of a file using streaming (low memory)
 */
export function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath, {
      highWaterMark: TRANSFER_CONSTANTS.HASH_CHUNK_SIZE
    })

    stream.on('data', (chunk) => {
      hash.update(chunk as Buffer)
    })

    stream.on('end', () => {
      resolve(hash.digest('hex'))
    })

    stream.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Compute SHA-256 hash of a buffer (for chunk verification)
 */
export function hashBuffer(data: Buffer | ArrayBuffer): string {
  const hash = createHash('sha256')
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(new Uint8Array(data))
  hash.update(buf)
  return hash.digest('hex')
}

/**
 * Create an incremental hasher for streaming verification
 */
export function createIncrementalHasher(): {
  update: (data: Buffer) => void
  digest: () => string
  hash: Hash
} {
  const hash = createHash('sha256')
  return {
    update: (data: Buffer) => hash.update(data),
    digest: () => hash.digest('hex'),
    hash
  }
}
