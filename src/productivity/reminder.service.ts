import { ReminderRecord, RecurrenceType } from './productivity.interface';
import {
  sqliteProductivityRepository,
  SQLiteProductivityRepository,
} from './sqlite-productivity.repository';

export class ReminderService {
  constructor(private readonly repo: SQLiteProductivityRepository = sqliteProductivityRepository) {}

  public async createReminder(
    title: string,
    datetime: Date,
    recurrence: RecurrenceType = 'none',
    description?: string,
  ): Promise<ReminderRecord> {
    return this.repo.saveReminder({
      title: title.trim(),
      datetime,
      recurrence,
      description: description?.trim(),
      completed: false,
    });
  }

  public async completeReminder(id: string): Promise<ReminderRecord | null> {
    const existing = await this.repo.getReminderById(id);
    if (!existing) return null;
    return this.repo.saveReminder({
      ...existing,
      completed: true,
    });
  }

  public async getUpcomingReminders(): Promise<ReminderRecord[]> {
    const all = await this.repo.getReminders();
    return all.filter((r) => !r.completed);
  }

  public async deleteReminder(id: string): Promise<boolean> {
    return this.repo.deleteReminder(id);
  }
}

export const reminderService = new ReminderService();
