// ===================================================================
// UB-Share — Discover Peers Page (v2)
// =================================================================== 

import React from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search, Users, WifiOff } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/shared/SharedComponents'
import { PeerCard } from '@/components/peers/PeerCard'
import { usePeers } from '@/hooks/use-peers'
import { useAppStore } from '@/stores/app-store'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'

export default function DiscoverPeers() {
  const { peers, refreshPeers, requestFile } = usePeers()
  const { isConnected } = useAppStore()
  const [search, setSearch] = React.useState('')
  const [refreshing, setRefreshing] = React.useState(false)

  const filteredPeers = peers.filter((p) =>
    p.displayName.toLowerCase().includes(search.toLowerCase())
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshPeers()
    setTimeout(() => setRefreshing(false), 600)
  }

  const handleSendFile = async (peerId: string) => {
    const filePath = await window.ubshare.selectFile()
    if (filePath) {
      await window.ubshare.sendFileToPeer(peerId, filePath)
    }
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <PageHeader
        title="Discover Peers"
        description={`${peers.length} peer${peers.length !== 1 ? 's' : ''} online`}
        action={
          <button onClick={handleRefresh} className="btn-secondary">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* Search */}
      <motion.div variants={fadeUpVariants} className="mb-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(220,10%,35%)]" />
          <input
            type="text"
            placeholder="Search peers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-search"
          />
        </div>
      </motion.div>

      {/* Connection Warning */}
      {!isConnected && (
        <motion.div variants={fadeUpVariants} className="mb-4 warning-bar">
          <WifiOff className="w-4 h-4 shrink-0" />
          <p>Not connected to signaling server. Check your settings.</p>
        </motion.div>
      )}

      {/* Peer List */}
      <motion.div variants={fadeUpVariants}>
        {filteredPeers.length > 0 ? (
          <div className="space-y-2">
            {filteredPeers.map((peer, i) => (
              <PeerCard
                key={peer.id}
                peer={peer}
                index={i}
                onRequestFile={requestFile}
                onSendFile={handleSendFile}
              />
            ))}
          </div>
        ) : search ? (
          <EmptyState
            icon={Search}
            title="No peers found"
            description={`No peers matching "${search}"`}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="No peers online"
            description="Other UB-Share users on your network will appear here when they come online."
            action={
              <button onClick={handleRefresh} className="btn-secondary">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            }
          />
        )}
      </motion.div>
    </motion.div>
  )
}
