// ===================================================================
// UB-Share — Drizzle ORM Schema
// SQLite database schema for local persistence
// ===================================================================

import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core'

// ----- Transfers Table -----

export const transfers = sqliteTable('transfers', {
  id: text('id').primaryKey(),
  fileId: text('file_id').notNull(),
  filename: text('filename').notNull(),
  fileSize: integer('file_size').notNull(),
  peerId: text('peer_id').notNull(),
  peerName: text('peer_name').default(''),
  status: text('status').notNull().default('pending'),
  progress: real('progress').notNull().default(0),
  bytesTransferred: integer('bytes_transferred').notNull().default(0),
  direction: text('direction').notNull(), // 'upload' | 'download'
  connectionMode: text('connection_mode').notNull().default('remote'), // 'local' | 'nearby' | 'remote'
  chunkSize: integer('chunk_size').notNull(),
  totalChunks: integer('total_chunks').notNull(),
  completedChunks: integer('completed_chunks').notNull().default(0),
  speed: real('speed').default(0),
  eta: integer('eta').default(0),
  resumeToken: text('resume_token'),
  localPath: text('local_path'),
  tempPath: text('temp_path'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  completedAt: integer('completed_at')
})

// ----- Transfer Chunks Table -----

export const transferChunks = sqliteTable(
  'transfer_chunks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    transferId: text('transfer_id')
      .notNull()
      .references(() => transfers.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    offset: integer('offset').notNull(),
    length: integer('length').notNull(),
    checksum: text('checksum'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false)
  },
  (table) => ({
    transferChunkIdx: uniqueIndex('transfer_chunk_idx').on(table.transferId, table.chunkIndex)
  })
)

// ----- Peers Table -----

export const peers = sqliteTable('peers', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  lastSeen: integer('last_seen'),
  trusted: integer('trusted', { mode: 'boolean' }).notNull().default(false)
})

// ----- Settings Table -----

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})

// ----- Analytics Table -----

export const analytics = sqliteTable('analytics', {
  id: integer('id').primaryKey().default(1),
  totalUploaded: integer('total_uploaded').notNull().default(0),
  totalDownloaded: integer('total_downloaded').notNull().default(0),
  successfulTransfers: integer('successful_transfers').notNull().default(0),
  failedTransfers: integer('failed_transfers').notNull().default(0),
  avgUploadSpeed: real('avg_upload_speed').notNull().default(0),
  avgDownloadSpeed: real('avg_download_speed').notNull().default(0)
})

// ----- Shared Files Table -----

export const sharedFiles = sqliteTable('shared_files', {
  id: text('id').primaryKey(), // SHA-256
  filename: text('filename').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type'),
  addedAt: integer('added_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000))
})

// ----- Type Exports -----

export type Transfer = typeof transfers.$inferSelect
export type NewTransfer = typeof transfers.$inferInsert
export type TransferChunk = typeof transferChunks.$inferSelect
export type NewTransferChunk = typeof transferChunks.$inferInsert
export type Peer = typeof peers.$inferSelect
export type NewPeer = typeof peers.$inferInsert
export type Setting = typeof settings.$inferSelect
export type SharedFile = typeof sharedFiles.$inferSelect
export type NewSharedFile = typeof sharedFiles.$inferInsert
export type Analytics = typeof analytics.$inferSelect
