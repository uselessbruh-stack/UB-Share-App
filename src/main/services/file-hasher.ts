// ===================================================================
// UB-Share — File Hasher Service
// Streaming SHA-256 file hashing with progress callbacks
// ===================================================================

import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { TRANSFER_CONSTANTS } from '@shared/constants'

export interface HashProgress {
  bytesProcessed: number
  totalBytes: number
  progress: number
}

/**
 * Hash a file using streaming SHA-256 with optional progress callback
 */
export async function hashFileWithProgress(
  filePath: string,
  onProgress?: (progress: HashProgress) => void
): Promise<string> {
  const stats = await stat(filePath)
  const totalBytes = stats.size

  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    let bytesProcessed = 0

    const stream = createReadStream(filePath, {
      highWaterMark: TRANSFER_CONSTANTS.HASH_CHUNK_SIZE
    })

    stream.on('data', (chunk) => {
      const buf = chunk as Buffer
      hash.update(buf)
      bytesProcessed += buf.length

      if (onProgress) {
        onProgress({
          bytesProcessed,
          totalBytes,
          progress: Math.round((bytesProcessed / totalBytes) * 100)
        })
      }
    })

    stream.on('end', () => {
      resolve(hash.digest('hex'))
    })

    stream.on('error', (err) => {
      reject(new Error(`Failed to hash file: ${err.message}`))
    })
  })
}

/**
 * Quick hash of a file (no progress reporting)
 */
export async function hashFile(filePath: string): Promise<string> {
  return hashFileWithProgress(filePath)
}
