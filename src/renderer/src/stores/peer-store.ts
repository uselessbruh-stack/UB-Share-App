// ===================================================================
// UB-Share — Peer Store (Zustand)
// Online peer state management
// ===================================================================

import { create } from 'zustand'
import type { PeerInfo, PeerConnectionState } from '@shared/types'

interface PeerState {
  peers: PeerInfo[]
  selectedPeerId: string | null

  setPeers: (peers: PeerInfo[]) => void
  updatePeerState: (peerId: string, state: PeerConnectionState) => void
  selectPeer: (peerId: string | null) => void
  getPeer: (peerId: string) => PeerInfo | undefined
}

export const usePeerStore = create<PeerState>((set, get) => ({
  peers: [],
  selectedPeerId: null,

  setPeers: (peers) => set({ peers }),

  updatePeerState: (peerId, state) =>
    set((s) => ({
      peers: s.peers.map((p) =>
        p.id === peerId ? { ...p, connectionState: state } : p
      )
    })),

  selectPeer: (peerId) => set({ selectedPeerId: peerId }),

  getPeer: (peerId) => get().peers.find((p) => p.id === peerId)
}))
