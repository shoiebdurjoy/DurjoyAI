import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { IPersistentMemoryRepository, MemoryRecord, MemoryHistoryRecord } from './memory.interface';

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
   * Synchronously creates database tables and indexes if missing.
   */
  private initializeSync(): void {
    // 1. Create base tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS persistent_memories (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        importance INTEGER NOT NULL DEFAULT 5,
        confidence REAL NOT NULL DEFAULT 50.0,
        access_count INTEGER NOT NULL DEFAULT 1,
        last_accessed TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        parent_id TEXT,
        related_ids TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, key)
      );

      CREATE TABLE IF NOT EXISTS memory_history (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        old_value TEXT NOT NULL,
        new_value TEXT NOT NULL,
        changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Safely upgrade existing SQLite databases
    const safeAddColumn = (sql: string) => {
      try {
        this.db.exec(sql);
      } catch {
        // Column already exists
      }
    };

    safeAddColumn(
      'ALTER TABLE persistent_memories ADD COLUMN confidence REAL NOT NULL DEFAULT 50.0;',
    );
    safeAddColumn(
      'ALTER TABLE persistent_memories ADD COLUMN access_count INTEGER NOT NULL DEFAULT 1;',
    );
    safeAddColumn('ALTER TABLE persistent_memories ADD COLUMN last_accessed TEXT;');
    safeAddColumn('ALTER TABLE persistent_memories ADD COLUMN parent_id TEXT;');
    safeAddColumn('ALTER TABLE persistent_memories ADD COLUMN related_ids TEXT;');

    // 3. Create indexes AFTER columns exist
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_mem_key_cat ON persistent_memories(key, category);
      CREATE INDEX IF NOT EXISTS idx_mem_importance ON persistent_memories(importance);
      CREATE INDEX IF NOT EXISTS idx_mem_last_accessed ON persistent_memories(last_accessed);
    `);
  }

  public async initialize(): Promise<void> {
    this.initializeSync();
  }

  public async getAllMemories(): Promise<MemoryRecord[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM persistent_memories ORDER BY importance DESC, updated_at DESC',
    );
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
    memory: Omit<
      MemoryRecord,
      'id' | 'createdAt' | 'updatedAt' | 'lastAccessed' | 'accessCount' | 'confidence'
    > & {
      id?: string;
      confidence?: number;
      accessCount?: number;
      lastAccessed?: Date;
    },
  ): Promise<MemoryRecord> {
    const existing = await this.getMemoryByKey(memory.key, memory.category);
    const now = new Date().toISOString();
    const relatedStr = memory.relatedIds
      ? JSON.stringify(memory.relatedIds)
      : existing?.relatedIds
        ? JSON.stringify(existing.relatedIds)
        : null;
    const parentId = memory.parentId !== undefined ? memory.parentId : existing?.parentId;

    if (existing) {
      const sameValue = existing.value.trim().toLowerCase() === memory.value.trim().toLowerCase();

      if (sameValue) {
        // Reinforce identical memories: increase confidence & access count
        const newConfidence = Math.min(100.0, existing.confidence + 10.0);
        const newAccessCount = existing.accessCount + 1;

        const stmt = this.db.prepare(`
          UPDATE persistent_memories
          SET importance = ?, confidence = ?, access_count = ?, last_accessed = ?, parent_id = ?, related_ids = ?, updated_at = ?
          WHERE id = ?
        `);
        stmt.run(
          memory.importance ?? existing.importance,
          newConfidence,
          newAccessCount,
          now,
          parentId || null,
          relatedStr,
          now,
          existing.id,
        );
      } else {
        // Conflict Resolution: Replace outdated active fact and archive previous value in history
        const historyId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const histStmt = this.db.prepare(`
          INSERT INTO memory_history (id, memory_id, old_value, new_value, changed_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        histStmt.run(historyId, existing.id, existing.value, memory.value, now);

        const newConfidence = memory.confidence ?? 50.0;
        const newAccessCount = existing.accessCount + 1;

        const stmt = this.db.prepare(`
          UPDATE persistent_memories
          SET value = ?, importance = ?, confidence = ?, access_count = ?, last_accessed = ?, parent_id = ?, related_ids = ?, updated_at = ?
          WHERE id = ?
        `);
        stmt.run(
          memory.value,
          memory.importance ?? 5,
          newConfidence,
          newAccessCount,
          now,
          parentId || null,
          relatedStr,
          now,
          existing.id,
        );
      }

      const updated = await this.getMemoryByKey(memory.key, memory.category);
      return updated!;
    } else {
      const id = memory.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const initialConfidence = memory.confidence ?? 50.0;
      const initialAccessCount = memory.accessCount ?? 1;

      const stmt = this.db.prepare(`
        INSERT INTO persistent_memories (
          id, category, key, value, importance, confidence, access_count, last_accessed, parent_id, related_ids, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        memory.category,
        memory.key,
        memory.value,
        memory.importance ?? 5,
        initialConfidence,
        initialAccessCount,
        now,
        memory.parentId || null,
        relatedStr,
        now,
        now,
      );

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
      ORDER BY importance DESC, confidence DESC, updated_at DESC
    `);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all(searchTerm, searchTerm, searchTerm) as any[];
    return rows.map((row) => this.mapRowToMemoryRecord(row));
  }

  public async touchMemory(id: string): Promise<void> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE persistent_memories
      SET access_count = access_count + 1, last_accessed = ?
      WHERE id = ?
    `);
    stmt.run(now, id);
  }

  public async getMemoryHistory(memoryId: string): Promise<MemoryHistoryRecord[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM memory_history WHERE memory_id = ? ORDER BY changed_at DESC',
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all(memoryId) as any[];
    return rows.map((r) => ({
      id: r.id,
      memoryId: r.memory_id,
      oldValue: r.old_value,
      newValue: r.new_value,
      changedAt: new Date(r.changed_at),
    }));
  }

  public async cleanupMemories(minConfidence = 10): Promise<number> {
    // Safely remove low-confidence, low-importance memories without deleting critical owner facts
    const stmt = this.db.prepare(
      'DELETE FROM persistent_memories WHERE confidence < ? AND importance < 5',
    );
    const info = stmt.run(minConfidence);
    return info.changes;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRowToMemoryRecord(row: any): MemoryRecord {
    let relatedIds: string[] | undefined;
    if (row.related_ids) {
      try {
        relatedIds = JSON.parse(row.related_ids);
      } catch {
        relatedIds = undefined;
      }
    }

    return {
      id: row.id,
      category: row.category,
      key: row.key,
      value: row.value,
      importance: Number(row.importance ?? 5),
      confidence: Number(row.confidence ?? 50.0),
      accessCount: Number(row.access_count ?? 1),
      lastAccessed: new Date(row.last_accessed || row.updated_at || Date.now()),
      parentId: row.parent_id || undefined,
      relatedIds,
      createdAt: new Date(row.created_at || Date.now()),
      updatedAt: new Date(row.updated_at || Date.now()),
    };
  }
}

export const sqliteMemoryRepository = new SQLiteMemoryRepository();
