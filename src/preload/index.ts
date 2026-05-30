// ===================================================================
// UB-Share — Preload Script
// Secure bridge between main and renderer processes
// ===================================================================

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { UBShareAPI } from '@shared/types'

/**
 * Helper to create a listener that returns an unsubscribe function
 */
function createListener(channel: string, callback: (...args: any[]) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, ...args: any[]): void => {
    callback(...args)
  }
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}

const api: UBShareAPI = {
  // ----- Peers -----
  getOnlinePeers: () => ipcRenderer.invoke(IPC_CHANNELS.PEERS_GET_ONLINE),
  connectToPeer: (peerId) => ipcRenderer.invoke(IPC_CHANNELS.PEERS_CONNECT, peerId),
  onPeerListUpdated: (cb) => createListener(IPC_CHANNELS.PEERS_LIST_UPDATED, cb),
  onPeerStateChanged: (cb) => createListener(IPC_CHANNELS.PEERS_STATE_CHANGED, cb),

  // ----- Discovery -----
  startLocalDiscovery: () => ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY_START_LOCAL),
  stopLocalDiscovery: () => ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY_STOP_LOCAL),
  startNearbyDiscovery: () => ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY_START_NEARBY),
  stopNearbyDiscovery: () => ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY_STOP_NEARBY),
  onDiscoveryPeersUpdated: (cb) => createListener(IPC_CHANNELS.DISCOVERY_PEERS_UPDATED, cb),

  // ----- Connection Codes & QR -----
  generateConnectionPayload: () => ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_GENERATE_PAYLOAD),
  decodeConnectionPayload: (code) => ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_DECODE_PAYLOAD, code),
  generateQRCode: () => ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_GENERATE_QR),
  connectFromCode: (code) => ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_FROM_CODE, code),
  getPeerIdentity: () => ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_GET_IDENTITY),

  // ----- Transfers -----
  requestFile: (peerId, fileId) => ipcRenderer.invoke(IPC_CHANNELS.TRANSFER_REQUEST, peerId, fileId),
  sendFileToPeer: (peerId, filePath) => ipcRenderer.invoke(IPC_CHANNELS.TRANSFER_SEND, peerId, filePath),
  pauseTransfer: (transferId) => ipcRenderer.invoke(IPC_CHANNELS.TRANSFER_PAUSE, transferId),
  resumeTransfer: (transferId) => ipcRenderer.invoke(IPC_CHANNELS.TRANSFER_RESUME, transferId),
  cancelTransfer: (transferId) => ipcRenderer.invoke(IPC_CHANNELS.TRANSFER_CANCEL, transferId),
  retryTransfer: (transferId) => ipcRenderer.invoke(IPC_CHANNELS.TRANSFER_RETRY, transferId),
  getActiveTransfers: () => ipcRenderer.invoke(IPC_CHANNELS.TRANSFER_GET_ACTIVE),
  getTransferHistory: () => ipcRenderer.invoke(IPC_CHANNELS.TRANSFER_GET_HISTORY),
  clearTransferHistory: () => ipcRenderer.invoke(IPC_CHANNELS.TRANSFER_CLEAR_HISTORY),
  onTransferProgress: (cb) => createListener(IPC_CHANNELS.TRANSFER_PROGRESS, cb),
  onTransferStateChanged: (cb) => createListener(IPC_CHANNELS.TRANSFER_STATE_CHANGED, cb),
  onTransferRequest: (cb) => createListener(IPC_CHANNELS.TRANSFER_INCOMING_REQUEST, cb),
  respondToRequest: (requestId, accepted) =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSFER_RESPOND_REQUEST, requestId, accepted),

  // ----- Files -----
  selectFile: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_SELECT),
  selectDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_SELECT_DIRECTORY),
  addSharedFile: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.FILE_ADD_SHARED, filePath),
  removeSharedFile: (fileId) => ipcRenderer.invoke(IPC_CHANNELS.FILE_REMOVE_SHARED, fileId),
  getSharedFiles: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_GET_SHARED),

  // ----- Settings -----
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  updateSettings: (settings) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),

  // ----- Analytics -----
  getAnalytics: () => ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_GET),

  // ----- App -----
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_VERSION),
  onNetworkStatus: (cb) => createListener(IPC_CHANNELS.APP_NETWORK_STATUS, cb)
}

// Expose to renderer
contextBridge.exposeInMainWorld('ubshare', api)
