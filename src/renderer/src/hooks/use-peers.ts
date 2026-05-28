// ===================================================================
// UB-Share — Peer Operations Hook
// Provides peer discovery and real-time updates
// ===================================================================

import { useEffect, useCallback } from 'react'
import { usePeerStore } from '@/stores/peer-store'
import { useAppStore } from '@/stores/app-store'
import { useIpcListener } from './use-ipc-listener'
import type { PeerInfo } from '@shared/types'

export function usePeers() {
  const { peers, selectedPeerId, setPeers, selectPeer } = usePeerStore()
  const { setConnected } = useAppStore()

  // Listen for peer list updates
  useIpcListener<PeerInfo[]>(
    window.ubshare.onPeerListUpdated,
    (peerList) => setPeers(peerList),
    []
  )

  // Listen for network status
  useIpcListener<boolean>(
    window.ubshare.onNetworkStatus,
    (online) => setConnected(online),
    []
  )

  // Load initial peer list
  useEffect(() => {
    refreshPeers()
  }, [])

  const refreshPeers = useCallback(async () => {
    try {
      const peerList = await window.ubshare.getOnlinePeers()
      setPeers(peerList)
    } catch (err) {
      console.error('Failed to refresh peers:', err)
    }
  }, [setPeers])

  const connectToPeer = useCallback(async (peerId: string) => {
    await window.ubshare.connectToPeer(peerId)
  }, [])

  const requestFile = useCallback(async (peerId: string, fileId: string) => {
    return window.ubshare.requestFile(peerId, fileId)
  }, [])

  return {
    peers,
    selectedPeerId,
    selectPeer,
    refreshPeers,
    connectToPeer,
    requestFile,
    onlinePeerCount: peers.length
  }
}
