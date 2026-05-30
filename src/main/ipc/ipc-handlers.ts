// ===================================================================
// UB-Share — IPC Handlers Registration
// Registers all IPC handlers in the main process
// ===================================================================

import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import { transferManager } from '../services/transfer-manager'
import { signalingClient } from '../services/signaling-client'
import { webrtcManager } from '../services/webrtc-manager'
import { discoveryManager } from '../services/discovery/discovery-manager'
import { encodeConnectionPayload, decodeConnectionPayload } from '../services/connection-codec'
import { generateQRDataUrl } from '../services/qr-service'
import { generatePeerId, getDeviceCapabilities } from '../services/peer-identity'
import { peerRepository } from '../db/repositories/peer-repository'
import { sharedFilesRepository } from '../db/repositories/shared-files-repository'
import { getSettings, updateSettings } from '../services/settings-service'
import { getAnalytics } from '../services/analytics-service'
import { hashFile } from '../services/file-hasher'
import { getFileInfo, getMimeType } from '../utils/file-utils'
import type { PeerInfo, SharedFileInfo, ConnectionPayload } from '@shared/types'
import path from 'path'

// In-memory online peer list (synced from signaling client)
let onlinePeers: PeerInfo[] = []

export function registerIpcHandlers(): void {
  // ===== PEER HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.PEERS_GET_ONLINE, async () => {
    return onlinePeers
  })

  ipcMain.handle(IPC_CHANNELS.PEERS_CONNECT, async (_event, peerId: string) => {
    await webrtcManager.connectToPeer(peerId)
  })

  // ===== TRANSFER HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.TRANSFER_REQUEST, async (_event, peerId: string, fileId: string) => {
    return transferManager.requestFile(peerId, fileId)
  })

  ipcMain.handle(IPC_CHANNELS.TRANSFER_SEND, async (_event, peerId: string, filePath: string) => {
    return transferManager.sendFile(peerId, filePath)
  })

  ipcMain.handle(IPC_CHANNELS.TRANSFER_PAUSE, async (_event, transferId: string) => {
    await transferManager.pauseTransfer(transferId)
  })

  ipcMain.handle(IPC_CHANNELS.TRANSFER_RESUME, async (_event, transferId: string) => {
    await transferManager.resumeTransfer(transferId)
  })

  ipcMain.handle(IPC_CHANNELS.TRANSFER_CANCEL, async (_event, transferId: string) => {
    await transferManager.cancelTransfer(transferId)
  })

  ipcMain.handle(IPC_CHANNELS.TRANSFER_RETRY, async (_event, transferId: string) => {
    await transferManager.retryTransfer(transferId)
  })

  ipcMain.handle(IPC_CHANNELS.TRANSFER_GET_ACTIVE, async () => {
    return transferManager.getActiveTransfers()
  })

  ipcMain.handle(IPC_CHANNELS.TRANSFER_GET_HISTORY, async () => {
    return transferManager.getTransferHistory()
  })

  ipcMain.handle(IPC_CHANNELS.TRANSFER_CLEAR_HISTORY, async () => {
    await transferManager.clearTransferHistory()
  })

  ipcMain.handle(IPC_CHANNELS.TRANSFER_RESPOND_REQUEST, async (_event, requestId: string, accepted: boolean) => {
    await transferManager.respondToRequest(requestId, accepted)
  })

  // ===== FILE HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.FILE_SELECT, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      title: 'Select file to share'
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.FILE_SELECT_DIRECTORY, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select download directory'
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.FILE_ADD_SHARED, async (_event, filePath: string): Promise<SharedFileInfo> => {
    const fileId = await hashFile(filePath)
    const filename = path.basename(filePath)
    const info = getFileInfo(filePath)
    const mimeType = getMimeType(filename)

    await sharedFilesRepository.add({
      id: fileId,
      filename,
      filePath,
      fileSize: info.size,
      mimeType
    })

    // Update signaling server with new shared files
    const allShared = await sharedFilesRepository.findAll()
    signalingClient.updateSharedFiles(
      allShared.map((f) => ({
        fileId: f.id,
        filename: f.filename,
        fileSize: f.fileSize,
        mimeType: f.mimeType ?? undefined
      }))
    )

    return { fileId, filename, fileSize: info.size, mimeType }
  })

  ipcMain.handle(IPC_CHANNELS.FILE_REMOVE_SHARED, async (_event, fileId: string) => {
    await sharedFilesRepository.remove(fileId)

    // Update signaling server
    const allShared = await sharedFilesRepository.findAll()
    signalingClient.updateSharedFiles(
      allShared.map((f) => ({
        fileId: f.id,
        filename: f.filename,
        fileSize: f.fileSize,
        mimeType: f.mimeType ?? undefined
      }))
    )
  })

  ipcMain.handle(IPC_CHANNELS.FILE_GET_SHARED, async (): Promise<SharedFileInfo[]> => {
    const files = await sharedFilesRepository.findAll()
    return files.map((f) => ({
      fileId: f.id,
      filename: f.filename,
      fileSize: f.fileSize,
      mimeType: f.mimeType ?? undefined
    }))
  })

  // ===== SETTINGS HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_event, settings: any) => {
    return updateSettings(settings)
  })

  // ===== ANALYTICS HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_GET, async () => {
    return getAnalytics()
  })

  // ===== APP HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.APP_VERSION, () => {
    return app.getVersion()
  })

  // ===== DISCOVERY HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.DISCOVERY_START_LOCAL, async () => {
    await discoveryManager.startModule('local')
  })

  ipcMain.handle(IPC_CHANNELS.DISCOVERY_STOP_LOCAL, async () => {
    await discoveryManager.stopModule('local')
  })

  ipcMain.handle(IPC_CHANNELS.DISCOVERY_START_NEARBY, async () => {
    // Bluetooth discovery — placeholder for Phase 4
    console.log('[IPC] Nearby discovery not yet implemented')
  })

  ipcMain.handle(IPC_CHANNELS.DISCOVERY_STOP_NEARBY, async () => {
    console.log('[IPC] Nearby discovery stop — not yet implemented')
  })

  // ===== CONNECTION HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.CONNECTION_GET_IDENTITY, async () => {
    const settings = await getSettings()
    return {
      peerId: settings.peerId || 'Unknown',
      deviceName: settings.displayName,
      capabilities: getDeviceCapabilities()
    }
  })

  ipcMain.handle(IPC_CHANNELS.CONNECTION_GENERATE_PAYLOAD, async () => {
    const settings = await getSettings()
    const payload: ConnectionPayload = {
      version: 1,
      peerId: settings.peerId || 'Unknown',
      deviceName: settings.displayName,
      capabilities: getDeviceCapabilities(),
      signalingUrl: settings.signalingServerUrl
    }
    return encodeConnectionPayload(payload)
  })

  ipcMain.handle(IPC_CHANNELS.CONNECTION_DECODE_PAYLOAD, async (_event, code: string) => {
    return decodeConnectionPayload(code)
  })

  ipcMain.handle(IPC_CHANNELS.CONNECTION_GENERATE_QR, async () => {
    const settings = await getSettings()
    const payload: ConnectionPayload = {
      version: 1,
      peerId: settings.peerId || 'Unknown',
      deviceName: settings.displayName,
      capabilities: getDeviceCapabilities(),
      signalingUrl: settings.signalingServerUrl
    }
    return generateQRDataUrl(payload)
  })

  ipcMain.handle(IPC_CHANNELS.CONNECTION_FROM_CODE, async (_event, code: string) => {
    const payload = decodeConnectionPayload(code)
    if (!payload) throw new Error('Invalid connection code')

    // Connect via signaling (Remote Share path)
    if (payload.signalingUrl) {
      // Peer should be on the same signaling server
      // Try to establish WebRTC connection
      await webrtcManager.connectToPeer(payload.peerId)
    }
  })

  console.log('[IPC] All handlers registered')
}

// ----- Signaling Event Forwarding -----

export function setupSignalingForwarding(): void {
  signalingClient.on('peer-list-updated', (peers: any[]) => {
    onlinePeers = peers.map((p) => ({
      id: p.peerId,
      displayName: p.displayName,
      sharedFiles: p.sharedFiles ?? [],
      lastSeen: Date.now(),
      trusted: false,
      connectionState: 'connected' as const
    }))

    // Forward to renderer
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send(IPC_CHANNELS.PEERS_LIST_UPDATED, onlinePeers)
    }
  })

  signalingClient.on('peer-joined', (data: any) => {
    const newPeer: PeerInfo = {
      id: data.peerId,
      displayName: data.displayName,
      sharedFiles: data.sharedFiles ?? [],
      lastSeen: Date.now(),
      trusted: false,
      connectionState: 'connected'
    }

    // Add to list if not already there
    if (!onlinePeers.find((p) => p.id === newPeer.id)) {
      onlinePeers.push(newPeer)
    }

    // Persist in DB
    peerRepository.upsert({
      id: data.peerId,
      displayName: data.displayName,
      lastSeen: Math.floor(Date.now() / 1000)
    })

    // Forward
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send(IPC_CHANNELS.PEERS_LIST_UPDATED, onlinePeers)
    }
  })

  signalingClient.on('peer-left', (data: any) => {
    onlinePeers = onlinePeers.filter((p) => p.id !== data.peerId)

    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send(IPC_CHANNELS.PEERS_LIST_UPDATED, onlinePeers)
    }
  })

  signalingClient.on('peer-files-updated', (data: any) => {
    const peer = onlinePeers.find((p) => p.id === data.peerId)
    if (peer) {
      peer.sharedFiles = data.sharedFiles ?? []
    }

    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send(IPC_CHANNELS.PEERS_LIST_UPDATED, onlinePeers)
    }
  })

  signalingClient.on('connected', () => {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send(IPC_CHANNELS.APP_NETWORK_STATUS, true)
    }
  })

  signalingClient.on('disconnected', () => {
    onlinePeers = []
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send(IPC_CHANNELS.APP_NETWORK_STATUS, false)
      win.webContents.send(IPC_CHANNELS.PEERS_LIST_UPDATED, [])
    }
  })

  console.log('[IPC] Signaling forwarding set up')
}
