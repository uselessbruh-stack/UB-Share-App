// ===================================================================
// UB-Share — Peer Repository
// CRUD operations for the peers table
// ===================================================================

import { eq, desc } from 'drizzle-orm'
import { getDatabase } from '../database'
import { peers, type Peer, type NewPeer } from '../schema'

export class PeerRepository {
  private get db() {
    return getDatabase()
  }

  async upsert(peer: NewPeer): Promise<Peer> {
    const existing = await this.findById(peer.id)
    if (existing) {
      const [result] = await this.db
        .update(peers)
        .set({
          displayName: peer.displayName,
          lastSeen: peer.lastSeen ?? Math.floor(Date.now() / 1000),
          trusted: peer.trusted ?? existing.trusted
        })
        .where(eq(peers.id, peer.id))
        .returning()
      return result
    }
    const [result] = await this.db.insert(peers).values({
      ...peer,
      lastSeen: peer.lastSeen ?? Math.floor(Date.now() / 1000)
    }).returning()
    return result
  }

  async findById(id: string): Promise<Peer | undefined> {
    const [result] = await this.db.select().from(peers).where(eq(peers.id, id)).limit(1)
    return result
  }

  async findAll(): Promise<Peer[]> {
    return this.db.select().from(peers).orderBy(desc(peers.lastSeen))
  }

  async findTrusted(): Promise<Peer[]> {
    return this.db.select().from(peers).where(eq(peers.trusted, true))
  }

  async updateLastSeen(id: string): Promise<void> {
    await this.db
      .update(peers)
      .set({ lastSeen: Math.floor(Date.now() / 1000) })
      .where(eq(peers.id, id))
  }

  async setTrusted(id: string, trusted: boolean): Promise<void> {
    await this.db.update(peers).set({ trusted }).where(eq(peers.id, id))
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(peers).where(eq(peers.id, id))
  }
}

export const peerRepository = new PeerRepository()
