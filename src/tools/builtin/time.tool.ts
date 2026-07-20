import { ToolDefinition } from '../tool.interface';

export const timeTool: ToolDefinition = {
  id: 'get_current_time',
  name: 'Current Date & Time',
  description: 'Retrieves the current date, time, day of the week, and ISO timestamp.',
  parameters: {
    timezone: {
      type: 'string',
      description: 'Optional timezone name (e.g. UTC, Asia/Dhaka)',
      required: false,
    },
  },
  permissionLevel: 'SAFE',
  enabled: true,
  async execute(args) {
    const now = new Date();
    const timeZone = args?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const formattedDate = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: timeZone || 'UTC',
    }).format(now);

    return {
      formatted: formattedDate,
      iso: now.toISOString(),
      timestamp: now.getTime(),
      timeZone,
    };
  },
};
