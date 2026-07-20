import { reminderService, ReminderService } from './reminder.service';
import { taskService, TaskService } from './task.service';
import { calendarService, CalendarService } from './calendar.service';
import { emailService, EmailService } from './email/email.service';

export class ProductivityManager {
  constructor(
    public readonly reminders: ReminderService = reminderService,
    public readonly tasks: TaskService = taskService,
    public readonly calendar: CalendarService = calendarService,
    public readonly email: EmailService = emailService,
  ) {}

  /**
   * Generates a unified overview summary of upcoming reminders, tasks, calendar events, and unread emails.
   */
  public async getProductivityOverview(): Promise<string> {
    const upcomingReminders = await this.reminders.getUpcomingReminders();
    const pendingTasks = await this.tasks.getTasks('pending');
    const upcomingEvents = await this.calendar.getUpcomingEvents(3);
    const unreadEmails = await this.email.getUnreadEmails();

    const parts: string[] = [];

    if (upcomingEvents.length > 0) {
      const evtList = upcomingEvents
        .map((e) => `- ${e.title} at ${e.startTime.toLocaleTimeString()}`)
        .join('\n');
      parts.push(`Upcoming Calendar Events (${upcomingEvents.length}):\n${evtList}`);
    }

    if (pendingTasks.length > 0) {
      const taskList = pendingTasks
        .map((t) => `- [${t.priority.toUpperCase()}] ${t.title}`)
        .join('\n');
      parts.push(`Pending Tasks (${pendingTasks.length}):\n${taskList}`);
    }

    if (upcomingReminders.length > 0) {
      const remList = upcomingReminders
        .map((r) => `- ${r.title} (${r.datetime.toLocaleString()})`)
        .join('\n');
      parts.push(`Upcoming Reminders (${upcomingReminders.length}):\n${remList}`);
    }

    if (unreadEmails.length > 0) {
      parts.push(
        `Unread Emails (${unreadEmails.length}):\n- ${unreadEmails.length} new message(s) in inbox.`,
      );
    }

    if (parts.length === 0) {
      return "You're all clear! No upcoming events, pending tasks, or unread emails.";
    }

    return parts.join('\n\n');
  }
}

export const productivityManager = new ProductivityManager();
