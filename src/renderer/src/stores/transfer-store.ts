// ===================================================================
// UB-Share — Transfer Store (Zustand)
// Active and historical transfer state management
// ===================================================================

import { create } from 'zustand'
import type { TransferRecord, TransferProgressEvent, TransferRequest } from '@shared/types'

interface TransferState {
  activeTransfers: TransferRecord[]
  transferHistory: TransferRecord[]
  pendingRequest: TransferRequest | null

  setActiveTransfers: (transfers: TransferRecord[]) => void
  setTransferHistory: (transfers: TransferRecord[]) => void
  updateTransfer: (transfer: TransferRecord) => void
  updateProgress: (event: TransferProgressEvent) => void
  setPendingRequest: (request: TransferRequest | null) => void
  removeTransfer: (transferId: string) => void
}

export const useTransferStore = create<TransferState>((set) => ({
  activeTransfers: [],
  transferHistory: [],
  pendingRequest: null,

  setActiveTransfers: (transfers) => set({ activeTransfers: transfers }),
  setTransferHistory: (transfers) => set({ transferHistory: transfers }),

  updateTransfer: (transfer) =>
    set((state) => {
      const isActive = ['pending', 'awaiting_approval', 'active', 'paused', 'reconnecting'].includes(transfer.status)

      if (isActive) {
        const exists = state.activeTransfers.find((t) => t.id === transfer.id)
        if (exists) {
          return {
            activeTransfers: state.activeTransfers.map((t) =>
              t.id === transfer.id ? transfer : t
            )
          }
        }
        return {
          activeTransfers: [transfer, ...state.activeTransfers]
        }
      } else {
        // Move from active to history
        return {
          activeTransfers: state.activeTransfers.filter((t) => t.id !== transfer.id),
          transferHistory: [
            transfer,
            ...state.transferHistory.filter((t) => t.id !== transfer.id)
          ]
        }
      }
    }),

  updateProgress: (event) =>
    set((state) => ({
      activeTransfers: state.activeTransfers.map((t) =>
        t.id === event.transferId
          ? {
              ...t,
              progress: event.progress,
              bytesTransferred: event.bytesTransferred,
              speed: event.speed,
              eta: event.eta,
              completedChunks: event.completedChunks,
              status: event.status
            }
          : t
      )
    })),

  setPendingRequest: (request) => set({ pendingRequest: request }),

  removeTransfer: (transferId) =>
    set((state) => ({
      activeTransfers: state.activeTransfers.filter((t) => t.id !== transferId),
      transferHistory: state.transferHistory.filter((t) => t.id !== transferId)
    }))
}))
