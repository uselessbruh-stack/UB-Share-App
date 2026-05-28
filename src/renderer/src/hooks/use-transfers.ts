// ===================================================================
// UB-Share — Transfer Operations Hook
// Provides transfer operations and real-time updates to components
// ===================================================================

import { useEffect, useCallback } from 'react'
import { useTransferStore } from '@/stores/transfer-store'
import { useIpcListener } from './use-ipc-listener'
import type { TransferRecord, TransferProgressEvent, TransferRequest } from '@shared/types'

export function useTransfers() {
  const {
    activeTransfers,
    transferHistory,
    pendingRequest,
    setActiveTransfers,
    setTransferHistory,
    updateTransfer,
    updateProgress,
    setPendingRequest
  } = useTransferStore()

  // Load initial data
  useEffect(() => {
    loadActiveTransfers()
    loadTransferHistory()
  }, [])

  // Listen for real-time updates
  useIpcListener<TransferProgressEvent>(
    window.ubshare.onTransferProgress,
    (event) => updateProgress(event),
    []
  )

  useIpcListener<TransferRecord>(
    window.ubshare.onTransferStateChanged,
    (transfer) => updateTransfer(transfer),
    []
  )

  useIpcListener<TransferRequest>(
    window.ubshare.onTransferRequest,
    (request) => setPendingRequest(request),
    []
  )

  const loadActiveTransfers = useCallback(async () => {
    const transfers = await window.ubshare.getActiveTransfers()
    setActiveTransfers(transfers)
  }, [setActiveTransfers])

  const loadTransferHistory = useCallback(async () => {
    const history = await window.ubshare.getTransferHistory()
    setTransferHistory(history)
  }, [setTransferHistory])

  const sendFile = useCallback(async (peerId: string, filePath: string) => {
    return window.ubshare.sendFileToPeer(peerId, filePath)
  }, [])

  const pauseTransfer = useCallback(async (transferId: string) => {
    await window.ubshare.pauseTransfer(transferId)
  }, [])

  const resumeTransfer = useCallback(async (transferId: string) => {
    await window.ubshare.resumeTransfer(transferId)
  }, [])

  const cancelTransfer = useCallback(async (transferId: string) => {
    await window.ubshare.cancelTransfer(transferId)
  }, [])

  const retryTransfer = useCallback(async (transferId: string) => {
    await window.ubshare.retryTransfer(transferId)
  }, [])

  const respondToRequest = useCallback(
    async (requestId: string, accepted: boolean) => {
      await window.ubshare.respondToRequest(requestId, accepted)
      setPendingRequest(null)
    },
    [setPendingRequest]
  )

  const clearHistory = useCallback(async () => {
    await window.ubshare.clearTransferHistory()
    setTransferHistory([])
  }, [setTransferHistory])

  return {
    activeTransfers,
    transferHistory,
    pendingRequest,
    sendFile,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
    retryTransfer,
    respondToRequest,
    clearHistory,
    refreshActive: loadActiveTransfers,
    refreshHistory: loadTransferHistory
  }
}
