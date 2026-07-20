import { ToolDefinition } from '../../tools/tool.interface';
import { productivityManager } from '../productivity.manager';

export const taskTool: ToolDefinition = {
  id: 'task_tool',
  name: 'Task List Manager',
  description: 'Creates, completes, updates, or lists pending/completed user tasks.',
  parameters: {
    action: {
      type: 'string',
      description: 'Action: create, complete, list, delete',
      required: true,
    },
    title: {
      type: 'string',
      description: 'Title of the task',
      required: false,
    },
    priority: {
      type: 'string',
      description: 'Priority: low, medium, high, urgent',
      required: false,
    },
  },
  permissionLevel: 'SAFE',
  enabled: true,
  async execute(args) {
    const action = (args?.action || 'list').toLowerCase();

    if (action === 'create' && args?.title) {
      const task = await productivityManager.tasks.createTask(
        args.title,
        args.priority || 'medium',
      );
      return { action: 'created', task };
    }

    if (action === 'complete' && args?.id) {
      const completed = await productivityManager.tasks.completeTask(args.id);
      return { action: 'completed', task: completed };
    }

    const tasks = await productivityManager.tasks.getTasks('pending');
    return { action: 'list', tasks };
  },
};
