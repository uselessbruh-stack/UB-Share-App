// ===================================================================
// UB-Share — Database Initialization
// Sets up SQLite with better-sqlite3 and Drizzle ORM
// ===================================================================

import path from 'path'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { FILE_CONSTANTS } from '@shared/constants'

let db: BetterSQLite3Database<typeof schema> | null = null
let sqlite: Database.Database | null = null

/**
 * Get the database file path in the user data directory
 */
function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, FILE_CONSTANTS.DB_FILENAME)
}

/**
 * Initialize the SQLite database and run migrations
 */
export function initDatabase(): BetterSQLite3Database<typeof schema> {
  if (db) return db

  const dbPath = getDbPath()
  console.log(`[DB] Initializing database at: ${dbPath}`)

  sqlite = new Database(dbPath)

  // Enable WAL mode for better concurrent read/write performance
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  // Run schema creation (inline migrations for simplicity)
  runMigrations(sqlite)

  db = drizzle(sqlite, { schema })

  console.log('[DB] Database initialized successfully')
  return db
}

/**
 * Get the existing database instance
 */
export function getDatabase(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    throw new Error('[DB] Database not initialized. Call initDatabase() first.')
  }
  return db
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    db = null
    console.log('[DB] Database connection closed')
  }
}

/**
 * Run database migrations (creates tables if they don't exist)
 */
function runMigrations(database: Database.Database): void {
  console.log('[DB] Running migrations...')

  database.exec(`
    CREATE TABLE IF NOT EXISTS transfers (
      id            TEXT PRIMARY KEY,
      file_id       TEXT NOT NULL,
      filename      TEXT NOT NULL,
      file_size     INTEGER NOT NULL,
      peer_id       TEXT NOT NULL,
      peer_name     TEXT DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'pending',
      progress      REAL NOT NULL DEFAULT 0,
      bytes_transferred INTEGER NOT NULL DEFAULT 0,
      direction     TEXT NOT NULL,
      chunk_size    INTEGER NOT NULL,
      total_chunks  INTEGER NOT NULL,
      completed_chunks INTEGER NOT NULL DEFAULT 0,
      speed         REAL DEFAULT 0,
      eta           INTEGER DEFAULT 0,
      resume_token  TEXT,
      local_path    TEXT,
      temp_path     TEXT,
      error_message TEXT,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      completed_at  INTEGER
    );

    CREATE TABLE IF NOT EXISTS transfer_chunks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_id   TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
      chunk_index   INTEGER NOT NULL,
      offset        INTEGER NOT NULL,
      length        INTEGER NOT NULL,
      checksum      TEXT,
      completed     INTEGER NOT NULL DEFAULT 0,
      UNIQUE(transfer_id, chunk_index)
    );

    CREATE TABLE IF NOT EXISTS peers (
      id            TEXT PRIMARY KEY,
      display_name  TEXT NOT NULL,
      last_seen     INTEGER,
      trusted       INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key           TEXT PRIMARY KEY,
      value         TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics (
      id                   INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      total_uploaded       INTEGER NOT NULL DEFAULT 0,
      total_downloaded     INTEGER NOT NULL DEFAULT 0,
      successful_transfers INTEGER NOT NULL DEFAULT 0,
      failed_transfers     INTEGER NOT NULL DEFAULT 0,
      avg_upload_speed     REAL NOT NULL DEFAULT 0,
      avg_download_speed   REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shared_files (
      id            TEXT PRIMARY KEY,
      filename      TEXT NOT NULL,
      file_path     TEXT NOT NULL,
      file_size     INTEGER NOT NULL,
      mime_type     TEXT,
      added_at      INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Ensure analytics singleton row exists
    INSERT OR IGNORE INTO analytics (id) VALUES (1);

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
    CREATE INDEX IF NOT EXISTS idx_transfers_peer_id ON transfers(peer_id);
    CREATE INDEX IF NOT EXISTS idx_transfer_chunks_transfer_id ON transfer_chunks(transfer_id);
  `)

  console.log('[DB] Migrations completed')
}
