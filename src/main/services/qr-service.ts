// ===================================================================
// UB-Share — QR Code Service
// Generates QR codes from connection payloads
// ===================================================================

import QRCode from 'qrcode'
import type { ConnectionPayload } from '@shared/types'
import { encodeConnectionPayload } from './connection-codec'

/**
 * Generate a QR code as a data URL from a ConnectionPayload
 */
export async function generateQRDataUrl(payload: ConnectionPayload): Promise<string> {
  const code = encodeConnectionPayload(payload)
  const dataUrl = await QRCode.toDataURL(code, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 400,
    margin: 2,
    color: {
      dark: '#ffffff',
      light: '#00000000' // transparent background
    }
  })
  return dataUrl
}

/**
 * Generate a QR code as a PNG buffer
 */
export async function generateQRBuffer(payload: ConnectionPayload): Promise<Buffer> {
  const code = encodeConnectionPayload(payload)
  const buffer = await QRCode.toBuffer(code, {
    errorCorrectionLevel: 'M',
    type: 'png',
    width: 600,
    margin: 2,
    color: {
      dark: '#ffffff',
      light: '#111111'
    }
  })
  return buffer
}
