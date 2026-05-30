// ===================================================================
// UB-Share — Local Network Discovery Tab
// Shows mDNS-discovered peers on the same LAN
// ===================================================================

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wifi, RefreshCw, Monitor, Send, Loader2, WifiOff } from 'lucide-react'
import { fadeUpVariants } from '@/lib/animations'
import type { DiscoveredPeer } from '@shared/types'

export function LocalNetworkTab() {
  const [peers, setPeers] = useState<DiscoveredPeer[]>([])
  const [scanning, setScanning] = useState(false)
  const [started, setStarted] = useState(false)

  const startScan = async () => {
    setScanning(true)
    try {
      await window.ubshare.startLocalDiscovery()
      setStarted(true)
    } catch (err) {
      console.error('Failed to start local discovery:', err)
    }
    setTimeout(() => setScanning(false), 2000)
  }

  const stopScan = async () => {
    await window.ubshare.stopLocalDiscovery()
    setStarted(false)
    setPeers([])
  }

  useEffect(() => {
    const unsub = window.ubshare.onDiscoveryPeersUpdated((allPeers) => {
      setPeers(allPeers.filter((p) => p.connectionMode === 'local'))
    })
    return () => {
      unsub()
      if (started) {
        window.ubshare.stopLocalDiscovery()
      }
    }
  }, [started])

  const handleSendFile = async (peerId: string) => {
    const filePath = await window.ubshare.selectFile()
    if (filePath) {
      await window.ubshare.sendFileToPeer(peerId, filePath)
    }
  }

  return (
    <motion.div variants={fadeUpVariants} className="space-y-4">
      {/* Info Banner */}
      <div className="discovery-info-banner">
        <Wifi className="w-4 h-4 text-[hsl(var(--accent))]" />
        <p>Discover devices on the same Wi-Fi or LAN network. Both devices must be connected to the same network.</p>
      </div>

      {/* Scan Button */}
      <div className="flex gap-2">
        <button onClick={startScan} disabled={scanning} className="btn-primary">
          {scanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {started ? 'Refresh' : 'Start Scanning'}
        </button>
        {started && (
          <button onClick={stopScan} className="btn-secondary">
            Stop
          </button>
        )}
      </div>

      {/* Scanning Indicator */}
      {scanning && (
        <div className="discovery-scanning">
          <div className="discovery-scanning-pulse" />
          <span>Scanning local network...</span>
        </div>
      )}

      {/* Peer List */}
      {peers.length > 0 ? (
        <div className="space-y-2">
          {peers.map((peer) => (
            <div key={peer.id} className="discovery-peer-card">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="discovery-peer-icon local">
                  <Monitor className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[hsl(0,0%,90%)] truncate">{peer.displayName}</p>
                  <p className="text-[11px] text-[hsl(0,0%,45%)]">
                    {peer.addresses?.[0] ?? 'Local Network'} · {peer.id}
                  </p>
                </div>
              </div>
              <button onClick={() => handleSendFile(peer.id)} className="btn-sm-primary">
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          ))}
        </div>
      ) : started && !scanning ? (
        <div className="discovery-empty">
          <WifiOff className="w-8 h-8 text-[hsl(0,0%,25%)]" />
          <p>No devices found on the local network</p>
          <p className="text-[11px] text-[hsl(0,0%,35%)]">Make sure both devices are on the same Wi-Fi</p>
        </div>
      ) : null}
    </motion.div>
  )
}
