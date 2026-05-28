// ===================================================================
// UB-Share — Shared Type Definitions
// Used across main process, preload, and renderer
// ===================================================================

// ----- Transfer Types -----

export type TransferStatus =
  | 'pending'
  | 'awaiting_approval'
  | 'active'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'reconnecting'

export type TransferDirection = 'upload' | 'download'

// ----- Peer Types -----

export type PeerConnectionState =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'paused'
  | 'offline'
  | 'failed'

// ----- Core Data Interfaces -----

export interface PeerInfo {
  id: string
  displayName: string
  sharedFiles: SharedFileInfo[]
  lastSeen: number
  trusted: boolean
  connectionState: PeerConnectionState
}

export interface SharedFileInfo {
  fileId: string
  filename: string
  fileSize: number
  mimeType?: string
}

export interface FileMetadata {
  fileId: string // SHA-256 hash
  filename: string
  fileSize: number
  mimeType?: string
  chunkSize: number
  totalChunks: number
}

export interface TransferRecord {
  id: string
  fileId: string
  filename: string
  fileSize: number
  peerId: string
  peerName: string
  status: TransferStatus
  progress: number // 0-100
  bytesTransferred: number
  direction: TransferDirection
  chunkSize: number
  totalChunks: number
  completedChunks: number
  speed: number // bytes per second
  eta: number // seconds remaining
  createdAt: number // unix timestamp
  updatedAt: number // unix timestamp
  completedAt?: number // unix timestamp
  resumeToken?: string
  localPath?: string
  tempPath?: string
  errorMessage?: string
}

export interface ChunkInfo {
  index: number
  transferId: string
  offset: number
  length: number
  checksum?: string // SHA-256 of chunk
  completed: boolean
}

export interface TransferRequest {
  requestId: string
  peerId: string
  peerName: string
  file: FileMetadata
  direction: TransferDirection
}

// ----- Settings -----

export interface AppSettings {
  displayName: string
  chunkSize: number // bytes, default 256KB
  bandwidthLimit: number // bytes per second, 0 = unlimited
  downloadDir: string
  reconnectTimeout: number // seconds
  autoResume: boolean
  maxSimultaneousTransfers: number
  signalingServerUrl: string
  startMinimized: boolean
  notifications: boolean
  theme: 'dark' | 'light' | 'system'
}

// ----- Analytics -----

export interface AnalyticsData {
  totalUploaded: number // bytes
  totalDownloaded: number // bytes
  successfulTransfers: number
  failedTransfers: number
  averageUploadSpeed: number // bytes/sec
  averageDownloadSpeed: number // bytes/sec
}

// ----- WebRTC Signaling -----

/**
 * Minimal RTCIceCandidateInit definition for the main process.
 * The full type lives in lib.dom.d.ts, which isn't included in
 * tsconfig.node.json (intentionally — this is a Node/Electron context).
 */
export interface RTCIceCandidateInit {
  candidate?: string
  sdpMid?: string | null
  sdpMLineIndex?: number | null
  usernameFragment?: string | null
}

/**
 * Minimal RTCConfiguration for the main process.
 */
export interface RTCConfiguration {
  iceServers?: RTCIceServer[]
  iceTransportPolicy?: 'all' | 'relay'
  bundlePolicy?: 'balanced' | 'max-bundle' | 'max-compat'
  rtcpMuxPolicy?: 'require'
}

export interface RTCIceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

/**
 * Minimal RTCDataChannelInit for the main process.
 */
export interface RTCDataChannelInit {
  ordered?: boolean
  maxPacketLifeTime?: number
  maxRetransmits?: number
  protocol?: string
  negotiated?: boolean
  id?: number
}

export interface SignalingOffer {
  type: 'offer'
  peerId: string
  targetPeerId: string
  sdp: string
}

export interface SignalingAnswer {
  type: 'answer'
  peerId: string
  targetPeerId: string
  sdp: string
}

export interface SignalingIceCandidate {
  type: 'ice-candidate'
  peerId: string
  targetPeerId: string
  candidate: RTCIceCandidateInit
}

export type SignalingMessage = SignalingOffer | SignalingAnswer | SignalingIceCandidate

// ----- Chunk Protocol (DataChannel messages) -----

export type ChunkMessageType =
  | 'file-meta'
  | 'chunk-data'
  | 'chunk-ack'
  | 'chunk-request'
  | 'resume-request'
  | 'resume-response'
  | 'transfer-complete'
  | 'transfer-cancel'
  | 'transfer-pause'
  | 'transfer-error'

export interface ChunkProtocolMessage {
  type: ChunkMessageType
  transferId: string
  payload: unknown
}

export interface ChunkDataPayload {
  index: number
  offset: number
  length: number
  checksum: string
  data: ArrayBuffer
}

export interface ChunkAckPayload {
  index: number
  success: boolean
}

export interface ResumeRequestPayload {
  fileId: string
  completedChunks: number[]
}

export interface ResumeResponsePayload {
  fileId: string
  missingChunks: number[]
  canResume: boolean
}

// ----- Transfer Progress (IPC events) -----

export interface TransferProgressEvent {
  transferId: string
  progress: number
  bytesTransferred: number
  speed: number
  eta: number
  completedChunks: number
  totalChunks: number
  status: TransferStatus
}

// ----- IPC API Shape (for preload type safety) -----

export interface UBShareAPI {
  // Peers
  getOnlinePeers: () => Promise<PeerInfo[]>
  connectToPeer: (peerId: string) => Promise<void>
  onPeerListUpdated: (callback: (peers: PeerInfo[]) => void) => () => void
  onPeerStateChanged: (callback: (peerId: string, state: PeerConnectionState) => void) => () => void

  // Transfers
  requestFile: (peerId: string, fileId: string) => Promise<string>
  sendFileToPeer: (peerId: string, filePath: string) => Promise<string>
  pauseTransfer: (transferId: string) => Promise<void>
  resumeTransfer: (transferId: string) => Promise<void>
  cancelTransfer: (transferId: string) => Promise<void>
  retryTransfer: (transferId: string) => Promise<void>
  getActiveTransfers: () => Promise<TransferRecord[]>
  getTransferHistory: () => Promise<TransferRecord[]>
  clearTransferHistory: () => Promise<void>
  onTransferProgress: (callback: (event: TransferProgressEvent) => void) => () => void
  onTransferStateChanged: (callback: (transfer: TransferRecord) => void) => () => void
  onTransferRequest: (callback: (request: TransferRequest) => void) => () => void
  respondToRequest: (requestId: string, accepted: boolean) => Promise<void>

  // Files
  selectFile: () => Promise<string | null>
  selectDirectory: () => Promise<string | null>
  addSharedFile: (filePath: string) => Promise<SharedFileInfo>
  removeSharedFile: (fileId: string) => Promise<void>
  getSharedFiles: () => Promise<SharedFileInfo[]>

  // Settings
  getSettings: () => Promise<AppSettings>
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>

  // Analytics
  getAnalytics: () => Promise<AnalyticsData>

  // App
  getAppVersion: () => Promise<string>
  onNetworkStatus: (callback: (online: boolean) => void) => () => void
}
