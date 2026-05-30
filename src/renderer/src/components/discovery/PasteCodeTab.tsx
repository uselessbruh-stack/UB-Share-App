// ===================================================================
// UB-Share — Paste Connection Code Tab
// Text input for pasting P2P://... connection codes
// ===================================================================

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardPaste, CheckCircle2, XCircle, Loader2, Link2 } from 'lucide-react'
import { fadeUpVariants } from '@/lib/animations'
import type { ConnectionPayload } from '@shared/types'

export function PasteCodeTab() {
  const [code, setCode] = useState('')
  const [decoded, setDecoded] = useState<ConnectionPayload | null>(null)
  const [error, setError] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)

  const handleValidate = async () => {
    if (!code.trim()) return
    setError('')
    setDecoded(null)

    try {
      const payload = await window.ubshare.decodeConnectionPayload(code.trim())
      if (payload) {
        setDecoded(payload)
      } else {
        setError('Invalid connection code. Make sure you copied the full code.')
      }
    } catch (err) {
      setError('Failed to decode connection code')
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setCode(text)
      // Auto-validate
      if (text.trim()) {
        const payload = await window.ubshare.decodeConnectionPayload(text.trim())
        if (payload) {
          setDecoded(payload)
          setError('')
        }
      }
    } catch {
      // Clipboard API may fail if not focused
    }
  }

  const handleConnect = async () => {
    if (!decoded) return
    setConnecting(true)
    try {
      await window.ubshare.connectFromCode(code.trim())
      setConnected(true)
    } catch (err: any) {
      setError(err.message || 'Failed to connect')
    }
    setConnecting(false)
  }

  return (
    <motion.div variants={fadeUpVariants} className="space-y-4">
      {/* Info Banner */}
      <div className="discovery-info-banner">
        <Link2 className="w-4 h-4 text-[hsl(30,80%,55%)]" />
        <p>Paste a connection code received from another UB-Share user to connect directly.</p>
      </div>

      {/* Input Area */}
      <div className="paste-code-input-container">
        <textarea
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setDecoded(null)
            setError('')
            setConnected(false)
          }}
          placeholder="Paste connection code here (P2P://...)"
          rows={4}
          className="paste-code-textarea"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={handlePaste} className="btn-secondary flex-1">
            <ClipboardPaste className="w-3.5 h-3.5" />
            Paste from Clipboard
          </button>
          <button onClick={handleValidate} disabled={!code.trim()} className="btn-primary flex-1">
            Validate
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="discovery-error">
          <XCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      {/* Decoded Result */}
      {decoded && !connected && (
        <div className="discovery-decoded">
          <CheckCircle2 className="w-5 h-5 text-[hsl(170,70%,50%)]" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[hsl(0,0%,90%)]">{decoded.deviceName}</p>
            <p className="text-[11px] text-[hsl(0,0%,45%)]">
              {decoded.peerId} · {decoded.capabilities?.join(', ')}
            </p>
          </div>
          <button onClick={handleConnect} disabled={connecting} className="btn-primary">
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
          </button>
        </div>
      )}

      {/* Connected */}
      {connected && (
        <div className="discovery-decoded">
          <CheckCircle2 className="w-5 h-5 text-[hsl(140,70%,50%)]" />
          <p className="text-[13px] font-medium text-[hsl(140,70%,50%)]">
            Connected to {decoded?.deviceName}!
          </p>
        </div>
      )}
    </motion.div>
  )
}
