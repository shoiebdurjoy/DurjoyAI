import { ToolDefinition } from '../../tools/tool.interface';
import { productivityManager } from '../productivity.manager';

export const calendarTool: ToolDefinition = {
  id: 'calendar_tool',
  name: 'Calendar & Event Manager',
  description: 'Creates events or lists upcoming calendar schedule events.',
  parameters: {
    action: {
      type: 'string',
      description: 'Action: create, list, search, delete',
      required: true,
    },
    title: {
      type: 'string',
      description: 'Title of the event',
      required: false,
    },
  },
  permissionLevel: 'SAFE',
  enabled: true,
  async execute(args) {
    const action = (args?.action || 'list').toLowerCase();

    if (action === 'create' && args?.title) {
      const start = args.startTime ? new Date(args.startTime) : new Date(Date.now() + 3600000);
      const end = args.endTime ? new Date(args.endTime) : new Date(start.getTime() + 3600000);
      const event = await productivityManager.calendar.createEvent(
        args.title,
        start,
        end,
        args.location,
      );
      return { action: 'created', event };
    }

    const events = await productivityManager.calendar.getUpcomingEvents();
    return { action: 'list', events };
  },
};
