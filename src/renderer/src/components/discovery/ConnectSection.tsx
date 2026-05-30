// ===================================================================
// UB-Share — Connect Section
// Combined QR/code display + QR scan + paste code in one panel
// Top: Connect to peer | Bottom: Your sharing info
// ===================================================================

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, QrCode, RefreshCw, Camera, ClipboardPaste,
  Link2, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, ScanLine
} from 'lucide-react'
import { fadeUpVariants } from '@/lib/animations'
import type { ConnectionPayload } from '@shared/types'

export function ConnectSection() {
  // --- Your Code/QR State ---
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [connectionCode, setConnectionCode] = useState('')
  const [identity, setIdentity] = useState<{ peerId: string; deviceName: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [loadingInfo, setLoadingInfo] = useState(true)

  // --- Connect State ---
  const [connectMode, setConnectMode] = useState<'paste' | 'scan'>('paste')
  const [pasteCode, setPasteCode] = useState('')
  const [decoded, setDecoded] = useState<ConnectionPayload | null>(null)
  const [connectError, setConnectError] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)

  // --- Camera State ---
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const streamRef = useRef<MediaStream | null>(null)

  // --- Section collapse ---
  const [shareExpanded, setShareExpanded] = useState(true)

  useEffect(() => {
    loadConnectionInfo()
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [])

  // --- Load your connection info ---
  const loadConnectionInfo = async () => {
    setLoadingInfo(true)
    try {
      const [qr, code, id] = await Promise.all([
        window.ubshare.generateQRCode(),
        window.ubshare.generateConnectionPayload(),
        window.ubshare.getPeerIdentity()
      ])
      setQrDataUrl(qr)
      setConnectionCode(code)
      setIdentity(id)
    } catch (err) {
      console.error('Failed to load connection info:', err)
    }
    setLoadingInfo(false)
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(connectionCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // --- Paste / Validate ---
  const handleValidate = async () => {
    if (!pasteCode.trim()) return
    setConnectError('')
    setDecoded(null)
    setConnected(false)
    try {
      const payload = await window.ubshare.decodeConnectionPayload(pasteCode.trim())
      if (payload) {
        setDecoded(payload)
      } else {
        setConnectError('Invalid connection code. Make sure you copied the full code.')
      }
    } catch {
      setConnectError('Failed to decode connection code')
    }
  }

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setPasteCode(text)
      if (text.trim()) {
        const payload = await window.ubshare.decodeConnectionPayload(text.trim())
        if (payload) {
          setDecoded(payload)
          setConnectError('')
        }
      }
    } catch {
      // Clipboard API may fail
    }
  }

  const handleConnect = async () => {
    if (!decoded) return
    setConnecting(true)
    try {
      await window.ubshare.connectFromCode(pasteCode.trim())
      setConnected(true)
    } catch (err: any) {
      setConnectError(err.message || 'Failed to connect')
    }
    setConnecting(false)
  }

  // --- Camera ---
  const startCamera = async () => {
    try {
      setCameraError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setScanning(true)
    } catch (err: any) {
      setCameraError(err.message || 'Cannot access camera')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  return (
    <motion.div variants={fadeUpVariants} className="connect-section">
      {/* ============================================================
          TOP: Connect to a Peer
          ============================================================ */}
      <div className="connect-section-block">
        <h3 className="connect-section-title">
          <Link2 className="w-4 h-4 text-[hsl(var(--accent))]" />
          Connect to a Peer
        </h3>
        <p className="connect-section-desc">Scan a QR code or paste a connection code from another UB-Share user</p>

        {/* Mode Toggle */}
        <div className="connect-mode-toggle">
          <button
            onClick={() => { setConnectMode('paste'); stopCamera() }}
            className={`connect-mode-btn ${connectMode === 'paste' ? 'active' : ''}`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Paste Code
          </button>
          <button
            onClick={() => setConnectMode('scan')}
            className={`connect-mode-btn ${connectMode === 'scan' ? 'active' : ''}`}
          >
            <Camera className="w-3.5 h-3.5" />
            Scan QR
          </button>
        </div>

        {/* Paste Code Input */}
        {connectMode === 'paste' && (
          <div className="mt-3">
            <textarea
              value={pasteCode}
              onChange={(e) => {
                setPasteCode(e.target.value)
                setDecoded(null)
                setConnectError('')
                setConnected(false)
              }}
              placeholder="Paste connection code here (P2P://...)"
              rows={3}
              className="paste-code-textarea"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handlePasteFromClipboard} className="btn-secondary flex-1">
                <ClipboardPaste className="w-3.5 h-3.5" />
                Paste
              </button>
              <button onClick={handleValidate} disabled={!pasteCode.trim()} className="btn-primary flex-1">
                Validate & Connect
              </button>
            </div>
          </div>
        )}

        {/* Scan QR Camera */}
        {connectMode === 'scan' && (
          <div className="mt-3">
            <div className="discovery-camera-container">
              {!scanning ? (
                <div className="discovery-camera-placeholder">
                  <ScanLine className="w-10 h-10 text-[hsl(0,0%,25%)]" />
                  <p className="text-[12px] text-[hsl(0,0%,40%)] mt-2">Camera preview will appear here</p>
                  <button onClick={startCamera} className="btn-primary mt-3">
                    <Camera className="w-4 h-4" />
                    Start Scanner
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <video ref={videoRef} className="w-full rounded-xl" style={{ maxHeight: 280 }} playsInline muted />
                  <div className="discovery-scan-overlay">
                    <div className="discovery-scan-frame" />
                  </div>
                  <button onClick={stopCamera} className="absolute top-2 right-2 btn-secondary text-[11px] py-1 px-2">
                    Stop
                  </button>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            {cameraError && (
              <div className="discovery-error mt-2">
                <XCircle className="w-4 h-4" />
                <div>
                  <p>{cameraError}</p>
                  <p className="text-[11px] text-[hsl(0,0%,35%)] mt-0.5">Switch to "Paste Code" instead</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {connectError && (
          <div className="discovery-error mt-3">
            <XCircle className="w-4 h-4" />
            <p>{connectError}</p>
          </div>
        )}

        {/* Decoded Peer */}
        {decoded && !connected && (
          <div className="discovery-decoded mt-3">
            <CheckCircle2 className="w-5 h-5 text-[hsl(170,70%,50%)]" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[hsl(0,0%,90%)]">{decoded.deviceName}</p>
              <p className="text-[11px] text-[hsl(0,0%,45%)]">{decoded.peerId}</p>
            </div>
            <button onClick={handleConnect} disabled={connecting} className="btn-primary">
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
            </button>
          </div>
        )}

        {/* Connected */}
        {connected && (
          <div className="discovery-decoded mt-3">
            <CheckCircle2 className="w-5 h-5 text-[hsl(140,70%,50%)]" />
            <p className="text-[13px] font-medium text-[hsl(140,70%,50%)]">
              Connected to {decoded?.deviceName}!
            </p>
          </div>
        )}
      </div>

      {/* ============================================================
          BOTTOM: Your Code & QR for Others
          ============================================================ */}
      <div className="connect-section-block">
        <button
          onClick={() => setShareExpanded(!shareExpanded)}
          className="connect-section-title w-full flex items-center justify-between cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-[hsl(var(--accent))]" />
            Share Your Code
          </span>
          {shareExpanded ? <ChevronUp className="w-4 h-4 text-[hsl(0,0%,40%)]" /> : <ChevronDown className="w-4 h-4 text-[hsl(0,0%,40%)]" />}
        </button>

        <AnimatePresence>
          {shareExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="connect-section-desc mt-1">Share this QR code or connection code with another UB-Share user</p>

              <div className="connect-share-grid">
                {/* QR Code */}
                <div className="connect-qr-panel">
                  {loadingInfo ? (
                    <div className="w-[160px] h-[160px] rounded-xl bg-[hsl(0,0%,8%)] animate-pulse" />
                  ) : qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" className="w-[160px] h-[160px] rounded-xl" />
                  ) : (
                    <div className="w-[160px] h-[160px] rounded-xl bg-[hsl(0,0%,8%)] flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-[hsl(0,0%,25%)]" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-3">
                  {identity && (
                    <div className="space-y-1.5">
                      <div className="connect-field">
                        <span className="connect-field-label">Peer ID</span>
                        <span className="connect-field-value">{identity.peerId}</span>
                      </div>
                      <div className="connect-field">
                        <span className="connect-field-label">Device</span>
                        <span className="connect-field-value">{identity.deviceName}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="connect-field-label">Connection Code</span>
                    <div className="remote-share-code-box mt-1">
                      <code className="text-[11px] text-[hsl(170,60%,50%)] break-all leading-relaxed">
                        {connectionCode || '...'}
                      </code>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={handleCopyCode} className="btn-primary flex-1">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                    <button onClick={loadConnectionInfo} className="btn-secondary" title="Refresh">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
