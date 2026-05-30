// ===================================================================
// UB-Share — Remote Share Tab
// Shows online peers from the signaling server (long-range discovery)
// ===================================================================

import React from 'react'
import { motion } from 'framer-motion'
import { Globe, Users, Send, RefreshCw, Radio } from 'lucide-react'
import { fadeUpVariants } from '@/lib/animations'
import { usePeers } from '@/hooks/use-peers'
import { PeerCard } from '@/components/peers/PeerCard'

export function RemoteShareTab() {
  const { peers, refreshPeers, requestFile } = usePeers()

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
        <Globe className="w-4 h-4 text-[hsl(var(--accent))]" />
        <p>Peers connected to the same signaling server. Works across any network — no LAN required.</p>
      </div>

      {/* Header + Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[hsl(0,0%,40%)]" />
          <h3 className="text-[12px] font-semibold text-[hsl(0,0%,50%)] uppercase tracking-wider">
            Online Peers ({peers.length})
          </h3>
        </div>
        <button onClick={refreshPeers} className="btn-secondary text-[11px] py-1.5 px-3">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Peer List */}
      {peers.length > 0 ? (
        <div className="space-y-2">
          {peers.map((peer, i) => (
            <PeerCard
              key={peer.id}
              peer={peer}
              index={i}
              onRequestFile={requestFile}
              onSendFile={handleSendFile}
            />
          ))}
        </div>
      ) : (
        <div className="discovery-empty">
          <div className="w-14 h-14 rounded-2xl bg-[hsla(var(--accent),0.08)] flex items-center justify-center mb-3">
            <Radio className="w-7 h-7 text-[hsla(var(--accent),0.4)]" />
          </div>
          <p className="text-[13px] text-[hsl(0,0%,45%)]">No peers online</p>
          <p className="text-[11px] text-[hsl(0,0%,35%)] mt-1">Share your connection code from the Connect tab</p>
        </div>
      )}
    </motion.div>
  )
}
