// ===================================================================
// UB-Share — Electron Main Process Entry Point
// Application lifecycle, window creation, and service initialization
// ===================================================================

import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './db/database'
import { initSettings, getSettings } from './services/settings-service'
import { signalingClient } from './services/signaling-client'
import { discoveryManager } from './services/discovery/discovery-manager'
import { transferManager } from './services/transfer-manager'
import { registerIpcHandlers, setupSignalingForwarding } from './ipc/ipc-handlers'
import { sharedFilesRepository } from './db/repositories/shared-files-repository'
import { APP_INFO, IPC_CHANNELS } from '@shared/constants'

let mainWindow: BrowserWindow | null = null

// Generate a persistent peer ID (stored in settings)
let peerId: string = ''

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: APP_INFO.WINDOW_WIDTH,
    height: APP_INFO.WINDOW_HEIGHT,
    minWidth: APP_INFO.WINDOW_MIN_WIDTH,
    minHeight: APP_INFO.WINDOW_MIN_HEIGHT,
    title: APP_INFO.NAME,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d1117',
    titleBarStyle: 'hiddenInset',
    frame: process.platform === 'darwin' ? false : true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (is.dev) {
      mainWindow?.webContents.openDevTools({ mode: 'bottom' })
    }
  })

  // Send initial connection status once the renderer has loaded
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.APP_NETWORK_STATUS, signalingClient.isConnected)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Log renderer errors
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[App] Renderer process gone:', details.reason)
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[App] Failed to load: ${errorCode} - ${errorDescription}`)
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ----- App Lifecycle -----

app.whenReady().then(async () => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.ubshare.app')

  // Default open or close DevTools by F12 in dev mode
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    // 1. Initialize database
    console.log('[App] Initializing database...')
    initDatabase()

    // 2. Initialize settings (generates persistent peerId on first run)
    console.log('[App] Initializing settings...')
    const settings = await initSettings()

    // 3. Use persistent peer ID from settings
    peerId = settings.peerId
    console.log(`[App] Peer ID: ${peerId}`)

    // 4. Register IPC handlers
    console.log('[App] Registering IPC handlers...')
    registerIpcHandlers()

    // 5. Initialize transfer manager (recovers interrupted transfers)
    console.log('[App] Initializing transfer manager...')
    await transferManager.initialize()

    // 6. Setup signaling forwarding
    setupSignalingForwarding()

    // 7. Connect to signaling server
    console.log('[App] Connecting to signaling server...')
    const sharedFiles = await sharedFilesRepository.findAll()
    signalingClient.connect(
      settings.signalingServerUrl,
      peerId,
      settings.displayName,
      sharedFiles.map((f) => ({
        fileId: f.id,
        filename: f.filename,
        fileSize: f.fileSize,
        mimeType: f.mimeType ?? undefined
      }))
    )

    // 8. Configure and start discovery
    console.log('[App] Starting discovery...')
    discoveryManager.local.configure(peerId, settings.displayName)
    await discoveryManager.startModule('remote')
    // Local discovery starts on demand from the UI

    // Forward discovery events to renderer
    discoveryManager.on('peers-updated', (peers) => {
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        win.webContents.send(IPC_CHANNELS.DISCOVERY_PEERS_UPDATED, peers)
      }
    })

    // 9. Create window
    createWindow()

    console.log('[App] UB-Share started successfully')
  } catch (err) {
    console.error('[App] Failed to initialize:', err)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  console.log('[App] Shutting down...')
  await discoveryManager.stopAll()
  signalingClient.disconnect()
  closeDatabase()
})
