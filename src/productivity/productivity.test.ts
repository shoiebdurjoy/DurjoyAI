/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SQLiteProductivityRepository } from './sqlite-productivity.repository';
import { ReminderService } from './reminder.service';
import { TaskService } from './task.service';
import { CalendarService } from './calendar.service';
import { EmailService } from './email/email.service';
import { MockEmailProvider } from './email/mock-email.provider';
import { ProductivityManager } from './productivity.manager';
import { toolExecutor } from '../tools/tool.executor';
import { toolManager } from '../tools/tool.manager';

describe('Productivity Suite (Reminders, Tasks, Calendar, Email) Tests', () => {
  const repo = new SQLiteProductivityRepository(':memory:');
  const reminders = new ReminderService(repo);
  const tasks = new TaskService(repo);
  const calendar = new CalendarService(repo);
  const emailProvider = new MockEmailProvider(repo);
  const email = new EmailService(emailProvider);
  const manager = new ProductivityManager(reminders, tasks, calendar, email);

  it('should create, complete, list, and delete reminders', async () => {
    const rem = await reminders.createReminder(
      'Study TypeScript',
      new Date(Date.now() + 3600000),
      'daily',
    );
    assert.strictEqual(rem.title, 'Study TypeScript');
    assert.strictEqual(rem.recurrence, 'daily');
    assert.strictEqual(rem.completed, false);

    const upcomingBefore = await reminders.getUpcomingReminders();
    assert.ok(upcomingBefore.length > 0);

    const completed = await reminders.completeReminder(rem.id);
    assert.strictEqual(completed?.completed, true);

    const deleted = await reminders.deleteReminder(rem.id);
    assert.strictEqual(deleted, true);
  });

  it('should perform CRUD operations on tasks with priorities', async () => {
    const task = await tasks.createTask(
      'Submit assignment',
      'high',
      new Date(Date.now() + 86400000),
    );
    assert.strictEqual(task.title, 'Submit assignment');
    assert.strictEqual(task.priority, 'high');
    assert.strictEqual(task.status, 'pending');

    const updated = await tasks.updateTask(task.id, { priority: 'urgent' });
    assert.strictEqual(updated?.priority, 'urgent');

    const completed = await tasks.completeTask(task.id);
    assert.strictEqual(completed?.status, 'completed');

    const pending = await tasks.getTasks('pending');
    assert.strictEqual(pending.length, 0);
  });

  it('should manage calendar events and search schedule', async () => {
    const start = new Date(Date.now() + 3600000);
    const end = new Date(Date.now() + 7200000);
    const evt = await calendar.createEvent('Team Standup', start, end, 'Conference Room A');
    assert.strictEqual(evt.title, 'Team Standup');
    assert.strictEqual(evt.location, 'Conference Room A');

    const searchRes = await calendar.searchEvents('Standup');
    assert.strictEqual(searchRes.length, 1);
    assert.strictEqual(searchRes[0].title, 'Team Standup');
  });

  it('should read unread/important emails, search, draft replies, and summarize inbox', async () => {
    const unread = await email.getUnreadEmails();
    assert.ok(unread.length > 0);

    const important = await email.getImportantEmails();
    assert.ok(important.length > 0);

    const summary = await email.summarizeInbox();
    assert.ok(summary.includes('unread email'));

    const searchRes = await email.searchEmails('GitHub');
    assert.ok(searchRes.length > 0);

    const draft = await email.draftReply(unread[0].id, 'I will take care of this.');
    assert.ok(draft.subject.includes('Re:'));

    const sent = await email.sendEmail('test@example.com', 'Hello', 'World');
    assert.strictEqual(sent.success, true);
  });

  it('should produce unified productivity overview via ProductivityManager facade', async () => {
    await reminders.createReminder('Drink water', new Date(Date.now() + 1000));
    await tasks.createTask('Review PR', 'medium');

    const overview = await manager.getProductivityOverview();
    assert.ok(overview.length > 0);
  });

  it('should execute productivity tools through Tool Framework', async () => {
    const remRes = await toolExecutor.executeTool('reminder_tool', {
      action: 'create',
      title: 'Buy groceries',
    });
    assert.strictEqual(remRes.success, true);

    const taskRes = await toolExecutor.executeTool('task_tool', {
      action: 'create',
      title: 'Write unit tests',
      priority: 'high',
    });
    assert.strictEqual(taskRes.success, true);

    const calRes = await toolExecutor.executeTool('calendar_tool', {
      action: 'create',
      title: 'Sprint Demo',
    });
    assert.strictEqual(calRes.success, true);

    const emailRes = await toolExecutor.executeTool('email_tool', { action: 'summarize' });
    assert.strictEqual(emailRes.success, true);
  });

  it('should detect productivity intent in ToolManager from natural language', async () => {
    const remDecision = toolManager.determineToolSelection('Remind me to call Mom tonight');
    assert.strictEqual(remDecision?.toolId, 'reminder_tool');

    const taskDecision = toolManager.determineToolSelection('What are my tasks?');
    assert.strictEqual(taskDecision?.toolId, 'task_tool');

    const calDecision = toolManager.determineToolSelection("What's on my calendar tomorrow?");
    assert.strictEqual(calDecision?.toolId, 'calendar_tool');

    const emailDecision = toolManager.determineToolSelection('Any new emails?');
    assert.strictEqual(emailDecision?.toolId, 'email_tool');
  });
});
