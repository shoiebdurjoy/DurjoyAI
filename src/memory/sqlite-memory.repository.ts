import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { IPersistentMemoryRepository, MemoryRecord } from './memory.interface';

export class SQLiteMemoryRepository implements IPersistentMemoryRepository {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath =
      process.env.NODE_ENV === 'test' || dbPath === ':memory:'
        ? ':memory:'
        : path.join(process.cwd(), 'data', 'durjoy_memory.db');

    if (defaultPath !== ':memory:') {
      const dir = path.dirname(defaultPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(defaultPath);
    this.initializeSync();
  }

  /**
   * Synchronously creates tables if they do not exist.
   */
  private initializeSync(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS persistent_memories (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        importance INTEGER NOT NULL DEFAULT 3,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(category, key)
      );
    `);
  }

  public async initialize(): Promise<void> {
    this.initializeSync();
  }

  public async getAllMemories(): Promise<MemoryRecord[]> {
    const stmt = this.db.prepare('SELECT * FROM persistent_memories ORDER BY updated_at DESC');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all() as any[];
    return rows.map((row) => this.mapRowToMemoryRecord(row));
  }

  public async getMemoryByKey(key: string, category?: string): Promise<MemoryRecord | null> {
    let stmt;
    let row;
    if (category) {
      stmt = this.db.prepare(
        'SELECT * FROM persistent_memories WHERE LOWER(key) = LOWER(?) AND LOWER(category) = LOWER(?)',
      );
      row = stmt.get(key, category);
    } else {
      stmt = this.db.prepare('SELECT * FROM persistent_memories WHERE LOWER(key) = LOWER(?)');
      row = stmt.get(key);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return row ? this.mapRowToMemoryRecord(row as any) : null;
  }

  public async saveMemory(
    memory: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): Promise<MemoryRecord> {
    const existing = await this.getMemoryByKey(memory.key, memory.category);
    const now = new Date().toISOString();

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE persistent_memories
        SET value = ?, importance = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(memory.value, memory.importance ?? 3, now, existing.id);
      const updated = await this.getMemoryByKey(memory.key, memory.category);
      return updated!;
    } else {
      const id = memory.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const stmt = this.db.prepare(`
        INSERT INTO persistent_memories (id, category, key, value, importance, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, memory.category, memory.key, memory.value, memory.importance ?? 3, now, now);
      const created = await this.getMemoryByKey(memory.key, memory.category);
      return created!;
    }
  }

  public async deleteMemory(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM persistent_memories WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }

  public async searchMemories(query: string): Promise<MemoryRecord[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM persistent_memories
      WHERE LOWER(key) LIKE ? OR LOWER(value) LIKE ? OR LOWER(category) LIKE ?
      ORDER BY importance DESC, updated_at DESC
    `);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all(searchTerm, searchTerm, searchTerm) as any[];
    return rows.map((row) => this.mapRowToMemoryRecord(row));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRowToMemoryRecord(row: any): MemoryRecord {
    return {
      id: row.id,
      category: row.category,
      key: row.key,
      value: row.value,
      importance: row.importance,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const sqliteMemoryRepository = new SQLiteMemoryRepository();
