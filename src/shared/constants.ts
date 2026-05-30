// ===================================================================
// UB-Share — Shared Constants
// IPC channel names, default values, and configuration
// ===================================================================

import type { RTCConfiguration, RTCDataChannelInit } from './types'

// ----- IPC Channel Names -----

export const IPC_CHANNELS = {
  // Peer channels
  PEERS_GET_ONLINE: 'peers:get-online',
  PEERS_CONNECT: 'peers:connect',
  PEERS_LIST_UPDATED: 'peers:list-updated',
  PEERS_STATE_CHANGED: 'peers:state-changed',

  // Discovery channels
  DISCOVERY_START_LOCAL: 'discovery:start-local',
  DISCOVERY_STOP_LOCAL: 'discovery:stop-local',
  DISCOVERY_START_NEARBY: 'discovery:start-nearby',
  DISCOVERY_STOP_NEARBY: 'discovery:stop-nearby',
  DISCOVERY_PEERS_UPDATED: 'discovery:peers-updated',

  // Connection channels
  CONNECTION_GENERATE_PAYLOAD: 'connection:generate-payload',
  CONNECTION_DECODE_PAYLOAD: 'connection:decode-payload',
  CONNECTION_GENERATE_QR: 'connection:generate-qr',
  CONNECTION_FROM_CODE: 'connection:from-code',
  CONNECTION_GET_IDENTITY: 'connection:get-identity',

  // Transfer channels
  TRANSFER_REQUEST: 'transfer:request',
  TRANSFER_SEND: 'transfer:send',
  TRANSFER_PAUSE: 'transfer:pause',
  TRANSFER_RESUME: 'transfer:resume',
  TRANSFER_CANCEL: 'transfer:cancel',
  TRANSFER_RETRY: 'transfer:retry',
  TRANSFER_GET_ACTIVE: 'transfer:get-active',
  TRANSFER_GET_HISTORY: 'transfer:get-history',
  TRANSFER_CLEAR_HISTORY: 'transfer:clear-history',
  TRANSFER_PROGRESS: 'transfer:progress',
  TRANSFER_STATE_CHANGED: 'transfer:state-changed',
  TRANSFER_INCOMING_REQUEST: 'transfer:incoming-request',
  TRANSFER_RESPOND_REQUEST: 'transfer:respond-request',

  // File channels
  FILE_SELECT: 'file:select',
  FILE_SELECT_DIRECTORY: 'file:select-directory',
  FILE_ADD_SHARED: 'file:add-shared',
  FILE_REMOVE_SHARED: 'file:remove-shared',
  FILE_GET_SHARED: 'file:get-shared',

  // Settings channels
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // Analytics channels
  ANALYTICS_GET: 'analytics:get',

  // App channels
  APP_VERSION: 'app:version',
  APP_NETWORK_STATUS: 'app:network-status'
} as const

// ----- Default Settings -----

export const DEFAULT_SETTINGS = {
  peerId: '', // will be generated on first launch
  displayName: `User-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
  chunkSize: 256 * 1024, // 256 KB
  bandwidthLimit: 0, // unlimited
  downloadDir: '', // will be set to app.getPath('downloads') in main
  reconnectTimeout: 30, // seconds
  autoResume: true,
  maxSimultaneousTransfers: 3,
  signalingServerUrl: 'https://ub-share-server.onrender.com',
  startMinimized: false,
  notifications: true,
  theme: 'dark' as const
}

// ----- Transfer Engine Constants -----

export const TRANSFER_CONSTANTS = {
  MIN_CHUNK_SIZE: 64 * 1024, // 64 KB
  MAX_CHUNK_SIZE: 1024 * 1024, // 1 MB
  DEFAULT_CHUNK_SIZE: 256 * 1024, // 256 KB
  MAX_BUFFER_SIZE: 16 * 1024 * 1024, // 16 MB bufferedAmount threshold
  SPEED_SAMPLE_INTERVAL: 1000, // ms between speed calculations
  PROGRESS_UPDATE_INTERVAL: 250, // ms between UI progress updates
  RECONNECT_MAX_RETRIES: 10,
  RECONNECT_BASE_DELAY: 1000, // ms
  RECONNECT_MAX_DELAY: 30000, // ms
  HASH_CHUNK_SIZE: 1024 * 1024 // 1 MB chunks for hashing
}

// ----- WebRTC Configuration -----

export const WEBRTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}

// ----- DataChannel Configuration -----

export const DATA_CHANNEL_CONFIG: RTCDataChannelInit = {
  ordered: true
}

// ----- Socket.IO Events -----

export const SOCKET_EVENTS = {
  // Client → Server
  PEER_REGISTER: 'peer:register',
  PEER_UNREGISTER: 'peer:unregister',
  PEER_LIST: 'peer:list',
  PEER_UPDATE_FILES: 'peer:update-files',
  SIGNAL_OFFER: 'signal:offer',
  SIGNAL_ANSWER: 'signal:answer',
  SIGNAL_ICE_CANDIDATE: 'signal:ice-candidate',
  TRANSFER_REQUEST_SEND: 'transfer:request-send',
  TRANSFER_REQUEST_RESPOND: 'transfer:request-respond',

  // Server → Client
  PEER_JOINED: 'peer:joined',
  PEER_LEFT: 'peer:left',
  PEER_LIST_UPDATED: 'peer:list-updated',
  SIGNAL_OFFER_RECEIVED: 'signal:offer-received',
  SIGNAL_ANSWER_RECEIVED: 'signal:answer-received',
  SIGNAL_ICE_CANDIDATE_RECEIVED: 'signal:ice-candidate-received',
  TRANSFER_REQUEST_RECEIVED: 'transfer:request-received',
  TRANSFER_REQUEST_RESPONSE: 'transfer:request-response'
} as const

// ----- File System -----

export const FILE_CONSTANTS = {
  TEMP_EXTENSION: '.part',
  DB_FILENAME: 'ub-share.sqlite',
  MAX_FILENAME_LENGTH: 255,
  FORBIDDEN_CHARS: /[<>:"/\\|?*\x00-\x1F]/g
}

// ----- App Info -----

export const APP_INFO = {
  NAME: 'UB-Share',
  VERSION: '1.0.0',
  WINDOW_WIDTH: 1200,
  WINDOW_HEIGHT: 800,
  WINDOW_MIN_WIDTH: 500,
  WINDOW_MIN_HEIGHT: 200
}
