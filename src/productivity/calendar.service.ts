import { CalendarEventRecord } from './productivity.interface';
import {
  sqliteProductivityRepository,
  SQLiteProductivityRepository,
} from './sqlite-productivity.repository';

export class CalendarService {
  constructor(private readonly repo: SQLiteProductivityRepository = sqliteProductivityRepository) {}

  public async createEvent(
    title: string,
    startTime: Date,
    endTime: Date,
    location?: string,
    description?: string,
  ): Promise<CalendarEventRecord> {
    return this.repo.saveCalendarEvent({
      title: title.trim(),
      startTime,
      endTime,
      location: location?.trim(),
      description: description?.trim(),
    });
  }

  public async getUpcomingEvents(limit = 10): Promise<CalendarEventRecord[]> {
    const all = await this.repo.getCalendarEvents();
    const now = new Date();
    return all.filter((e) => e.endTime >= now).slice(0, limit);
  }

  public async searchEvents(query: string): Promise<CalendarEventRecord[]> {
    const q = query.trim().toLowerCase();
    const all = await this.repo.getCalendarEvents();
    return all.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.location && e.location.toLowerCase().includes(q)),
    );
  }

  public async deleteEvent(id: string): Promise<boolean> {
    return this.repo.deleteCalendarEvent(id);
  }

  public async updateEvent(
    id: string,
    updates: Partial<CalendarEventRecord>,
  ): Promise<CalendarEventRecord | null> {
    const existing = await this.repo.getCalendarEventById(id);
    if (!existing) return null;
    return this.repo.saveCalendarEvent({
      ...existing,
      ...updates,
    });
  }
}

export const calendarService = new CalendarService();
