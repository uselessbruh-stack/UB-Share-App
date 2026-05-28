// ===================================================================
// UB-Share — Shared Files Repository
// Manages files the user has chosen to share
// ===================================================================

import { eq, desc } from 'drizzle-orm'
import { getDatabase } from '../database'
import { sharedFiles, type SharedFile, type NewSharedFile } from '../schema'

export class SharedFilesRepository {
  private get db() {
    return getDatabase()
  }

  async add(file: NewSharedFile): Promise<SharedFile> {
    // Upsert: update path if same hash exists
    const existing = await this.findById(file.id)
    if (existing) {
      const [result] = await this.db
        .update(sharedFiles)
        .set({ filePath: file.filePath, filename: file.filename })
        .where(eq(sharedFiles.id, file.id))
        .returning()
      return result
    }
    const [result] = await this.db.insert(sharedFiles).values(file).returning()
    return result
  }

  async findById(id: string): Promise<SharedFile | undefined> {
    const [result] = await this.db
      .select()
      .from(sharedFiles)
      .where(eq(sharedFiles.id, id))
      .limit(1)
    return result
  }

  async findAll(): Promise<SharedFile[]> {
    return this.db.select().from(sharedFiles).orderBy(desc(sharedFiles.addedAt))
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(sharedFiles).where(eq(sharedFiles.id, id))
  }

  async getFilePath(fileId: string): Promise<string | undefined> {
    const file = await this.findById(fileId)
    return file?.filePath
  }
}

export const sharedFilesRepository = new SharedFilesRepository()
