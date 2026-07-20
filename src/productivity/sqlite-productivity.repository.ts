import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import {
  ReminderRecord,
  TaskRecord,
  CalendarEventRecord,
  EmailMessage,
  RecurrenceType,
  TaskPriority,
  TaskStatus,
} from './productivity.interface';

export class SQLiteProductivityRepository {
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

  private initializeSync(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS productivity_reminders (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        datetime TEXT NOT NULL,
        recurrence TEXT NOT NULL DEFAULT 'none',
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS productivity_tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS productivity_calendar (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        reminders TEXT,
        attendees TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS productivity_emails (
        id TEXT PRIMARY KEY,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        folder TEXT NOT NULL DEFAULT 'inbox',
        is_read INTEGER NOT NULL DEFAULT 0,
        is_important INTEGER NOT NULL DEFAULT 0,
        date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // --- Reminders ---
  public async saveReminder(
    r: Omit<ReminderRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): Promise<ReminderRecord> {
    const id = r.id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const dt = r.datetime.toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO productivity_reminders (id, title, description, datetime, recurrence, completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        datetime = excluded.datetime,
        recurrence = excluded.recurrence,
        completed = excluded.completed,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      id,
      r.title,
      r.description || null,
      dt,
      r.recurrence || 'none',
      r.completed ? 1 : 0,
      now,
      now,
    );
    return this.getReminderById(id) as Promise<ReminderRecord>;
  }

  public async getReminderById(id: string): Promise<ReminderRecord | null> {
    const stmt = this.db.prepare('SELECT * FROM productivity_reminders WHERE id = ?');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.get(id) as any;
    return row ? this.mapReminder(row) : null;
  }

  public async getReminders(): Promise<ReminderRecord[]> {
    const stmt = this.db.prepare('SELECT * FROM productivity_reminders ORDER BY datetime ASC');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all() as any[];
    return rows.map((r) => this.mapReminder(r));
  }

  public async deleteReminder(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM productivity_reminders WHERE id = ?');
    return stmt.run(id).changes > 0;
  }

  // --- Tasks ---
  public async saveTask(
    t: Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): Promise<TaskRecord> {
    const id = t.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const dueDateStr = t.dueDate ? t.dueDate.toISOString() : null;

    const stmt = this.db.prepare(`
      INSERT INTO productivity_tasks (id, title, description, priority, due_date, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        priority = excluded.priority,
        due_date = excluded.due_date,
        status = excluded.status,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      id,
      t.title,
      t.description || null,
      t.priority || 'medium',
      dueDateStr,
      t.status || 'pending',
      now,
      now,
    );
    return this.getTaskById(id) as Promise<TaskRecord>;
  }

  public async getTaskById(id: string): Promise<TaskRecord | null> {
    const stmt = this.db.prepare('SELECT * FROM productivity_tasks WHERE id = ?');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.get(id) as any;
    return row ? this.mapTask(row) : null;
  }

  public async getTasks(status?: TaskStatus): Promise<TaskRecord[]> {
    let stmt;
    if (status) {
      stmt = this.db.prepare(
        'SELECT * FROM productivity_tasks WHERE status = ? ORDER BY due_date ASC, priority DESC',
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = stmt.all(status) as any[];
      return rows.map((r) => this.mapTask(r));
    }
    stmt = this.db.prepare('SELECT * FROM productivity_tasks ORDER BY due_date ASC, priority DESC');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all() as any[];
    return rows.map((r) => this.mapTask(r));
  }

  public async deleteTask(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM productivity_tasks WHERE id = ?');
    return stmt.run(id).changes > 0;
  }

  // --- Calendar ---
  public async saveCalendarEvent(
    e: Omit<CalendarEventRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): Promise<CalendarEventRecord> {
    const id = e.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const remStr = e.reminders ? JSON.stringify(e.reminders) : null;
    const attStr = e.attendees ? JSON.stringify(e.attendees) : null;

    const stmt = this.db.prepare(`
      INSERT INTO productivity_calendar (id, title, description, location, start_time, end_time, reminders, attendees, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        location = excluded.location,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        reminders = excluded.reminders,
        attendees = excluded.attendees,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      id,
      e.title,
      e.description || null,
      e.location || null,
      e.startTime.toISOString(),
      e.endTime.toISOString(),
      remStr,
      attStr,
      now,
      now,
    );
    return this.getCalendarEventById(id) as Promise<CalendarEventRecord>;
  }

  public async getCalendarEventById(id: string): Promise<CalendarEventRecord | null> {
    const stmt = this.db.prepare('SELECT * FROM productivity_calendar WHERE id = ?');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.get(id) as any;
    return row ? this.mapCalendarEvent(row) : null;
  }

  public async getCalendarEvents(): Promise<CalendarEventRecord[]> {
    const stmt = this.db.prepare('SELECT * FROM productivity_calendar ORDER BY start_time ASC');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all() as any[];
    return rows.map((r) => this.mapCalendarEvent(r));
  }

  public async deleteCalendarEvent(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM productivity_calendar WHERE id = ?');
    return stmt.run(id).changes > 0;
  }

  // --- Email Store ---
  public async saveEmail(msg: EmailMessage): Promise<EmailMessage> {
    const stmt = this.db.prepare(`
      INSERT INTO productivity_emails (id, from_address, to_address, subject, body, folder, is_read, is_important, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        folder = excluded.folder,
        is_read = excluded.is_read,
        is_important = excluded.is_important
    `);
    stmt.run(
      msg.id,
      msg.from,
      msg.to,
      msg.subject,
      msg.body,
      msg.folder,
      msg.read ? 1 : 0,
      msg.important ? 1 : 0,
      msg.date.toISOString(),
    );
    return msg;
  }

  public async getEmails(folder = 'inbox'): Promise<EmailMessage[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM productivity_emails WHERE folder = ? ORDER BY date DESC',
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all(folder) as any[];
    return rows.map((r) => this.mapEmail(r));
  }

  // --- Mappers ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapReminder(row: any): ReminderRecord {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      datetime: new Date(row.datetime),
      recurrence: row.recurrence as RecurrenceType,
      completed: Boolean(row.completed),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapTask(row: any): TaskRecord {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      priority: row.priority as TaskPriority,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      status: row.status as TaskStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapCalendarEvent(row: any): CalendarEventRecord {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      location: row.location || undefined,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      reminders: row.reminders ? JSON.parse(row.reminders) : undefined,
      attendees: row.attendees ? JSON.parse(row.attendees) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapEmail(row: any): EmailMessage {
    return {
      id: row.id,
      from: row.from_address,
      to: row.to_address,
      subject: row.subject,
      body: row.body,
      folder: row.folder,
      read: Boolean(row.is_read),
      important: Boolean(row.is_important),
      date: new Date(row.date),
    };
  }
}

export const sqliteProductivityRepository = new SQLiteProductivityRepository();
