import { ToolDefinition } from '../../tools/tool.interface';
import { productivityManager } from '../productivity.manager';

export const reminderTool: ToolDefinition = {
  id: 'reminder_tool',
  name: 'Reminder Manager',
  description: 'Creates, completes, or lists upcoming user reminders.',
  parameters: {
    action: {
      type: 'string',
      description: 'Action: create, complete, list, delete',
      required: true,
    },
    title: {
      type: 'string',
      description: 'Title of the reminder',
      required: false,
    },
    datetime: {
      type: 'string',
      description: 'Date and time ISO string for the reminder',
      required: false,
    },
  },
  permissionLevel: 'SAFE',
  enabled: true,
  async execute(args) {
    const action = (args?.action || 'list').toLowerCase();

    if (action === 'create' && args?.title) {
      const dt = args.datetime ? new Date(args.datetime) : new Date(Date.now() + 3600000);
      const reminder = await productivityManager.reminders.createReminder(args.title, dt);
      return { action: 'created', reminder };
    }

    if (action === 'complete' && args?.id) {
      const completed = await productivityManager.reminders.completeReminder(args.id);
      return { action: 'completed', reminder: completed };
    }

    const upcoming = await productivityManager.reminders.getUpcomingReminders();
    return { action: 'list', reminders: upcoming };
  },
};
