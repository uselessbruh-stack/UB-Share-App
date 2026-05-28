// ===================================================================
// UB-Share — File Utilities
// Path sanitization, temp file management, MIME type detection
// ===================================================================

import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { FILE_CONSTANTS } from '@shared/constants'

/**
 * Sanitize a filename to prevent path traversal and invalid characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  let sanitized = path.basename(filename)
  // Remove forbidden characters
  sanitized = sanitized.replace(FILE_CONSTANTS.FORBIDDEN_CHARS, '_')
  // Truncate if too long
  if (sanitized.length > FILE_CONSTANTS.MAX_FILENAME_LENGTH) {
    const ext = path.extname(sanitized)
    const name = path.basename(sanitized, ext)
    sanitized = name.substring(0, FILE_CONSTANTS.MAX_FILENAME_LENGTH - ext.length) + ext
  }
  return sanitized || 'unnamed_file'
}

/**
 * Get the temp file path for a download in progress
 */
export function getTempFilePath(downloadDir: string, filename: string): string {
  const sanitized = sanitizeFilename(filename)
  return path.join(downloadDir, sanitized + FILE_CONSTANTS.TEMP_EXTENSION)
}

/**
 * Get the final file path, handling name collisions
 */
export function getFinalFilePath(downloadDir: string, filename: string): string {
  const sanitized = sanitizeFilename(filename)
  let finalPath = path.join(downloadDir, sanitized)

  // Handle name collisions
  if (fs.existsSync(finalPath)) {
    const ext = path.extname(sanitized)
    const name = path.basename(sanitized, ext)
    let counter = 1
    while (fs.existsSync(finalPath)) {
      finalPath = path.join(downloadDir, `${name} (${counter})${ext}`)
      counter++
    }
  }

  return finalPath
}

/**
 * Ensure a directory exists, create if not
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Get default download directory
 */
export function getDefaultDownloadDir(): string {
  return app.getPath('downloads')
}

/**
 * Get file info (size, exists)
 */
export function getFileInfo(filePath: string): { exists: boolean; size: number } {
  try {
    const stats = fs.statSync(filePath)
    return { exists: true, size: stats.size }
  } catch {
    return { exists: false, size: 0 }
  }
}

/**
 * Rename temp file to final file
 */
export function finalizeTempFile(tempPath: string, finalPath: string): void {
  // Ensure final path directory exists
  ensureDir(path.dirname(finalPath))
  fs.renameSync(tempPath, finalPath)
}

/**
 * Delete a file if it exists
 */
export function deleteFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    console.error(`[FileUtils] Failed to delete file: ${filePath}`, err)
  }
}

/**
 * Simple MIME type detection based on extension
 */
export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.zip': 'application/zip',
    '.rar': 'application/vnd.rar',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.exe': 'application/x-executable',
    '.dmg': 'application/x-apple-diskimage',
    '.iso': 'application/x-iso9660-image',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.ts': 'application/typescript'
  }
  return mimeTypes[ext] ?? 'application/octet-stream'
}
