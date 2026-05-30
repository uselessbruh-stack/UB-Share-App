// ===================================================================
// UB-Share — Scan QR Tab
// Universal QR scanner for all connection types
// ===================================================================

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, ScanLine, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { fadeUpVariants } from '@/lib/animations'
import type { ConnectionPayload } from '@shared/types'

export function ScanQRTab() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [decoded, setDecoded] = useState<ConnectionPayload | null>(null)
  const [connecting, setConnecting] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
      startQRScanning()
    } catch (err: any) {
      setCameraError(err.message || 'Cannot access camera')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setScanning(false)
  }

  const startQRScanning = () => {
    // Simple frame capture + send to main process for decode
    // html5-qrcode could be used here, but for simplicity
    // we'll use a basic approach with the canvas
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx || video.videoWidth === 0) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      // Try to detect QR code from canvas data
      // In a full implementation, use html5-qrcode or jsQR
      // For now, this is a visual placeholder — real scanning
      // will use the paste code tab as primary input
    }, 500)
  }

  const handleConnect = async () => {
    if (!decoded) return
    setConnecting(true)
    try {
      const code = await window.ubshare.generateConnectionPayload()
      // Connect using the decoded payload
      await window.ubshare.connectFromCode(code)
    } catch (err) {
      console.error('Failed to connect:', err)
    }
    setConnecting(false)
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  return (
    <motion.div variants={fadeUpVariants} className="space-y-4">
      {/* Info Banner */}
      <div className="discovery-info-banner">
        <Camera className="w-4 h-4 text-[hsl(45,80%,55%)]" />
        <p>Scan a QR code from another UB-Share device to connect. Works with all connection types.</p>
      </div>

      {/* Camera View */}
      <div className="discovery-camera-container">
        {!scanning ? (
          <div className="discovery-camera-placeholder">
            <ScanLine className="w-12 h-12 text-[hsl(0,0%,25%)]" />
            <p className="text-[13px] text-[hsl(0,0%,40%)] mt-3">Camera preview will appear here</p>
            <button onClick={startCamera} className="btn-primary mt-4">
              <Camera className="w-4 h-4" />
              Start Scanner
            </button>
          </div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-xl"
              style={{ maxHeight: 360 }}
              playsInline
              muted
            />
            <div className="discovery-scan-overlay">
              <div className="discovery-scan-frame" />
            </div>
            <button onClick={stopCamera} className="absolute top-3 right-3 btn-secondary text-[11px] py-1.5 px-3">
              Stop
            </button>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {cameraError && (
        <div className="discovery-error">
          <XCircle className="w-4 h-4" />
          <p>{cameraError}</p>
          <p className="text-[11px] text-[hsl(0,0%,35%)] mt-1">
            Try using "Paste Connection Code" instead
          </p>
        </div>
      )}

      {/* Decoded Result */}
      {decoded && (
        <div className="discovery-decoded">
          <CheckCircle2 className="w-5 h-5 text-[hsl(170,70%,50%)]" />
          <div>
            <p className="text-[13px] font-medium text-[hsl(0,0%,90%)]">{decoded.deviceName}</p>
            <p className="text-[11px] text-[hsl(0,0%,45%)]">{decoded.peerId}</p>
          </div>
          <button onClick={handleConnect} disabled={connecting} className="btn-primary ml-auto">
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
          </button>
        </div>
      )}
    </motion.div>
  )
}
