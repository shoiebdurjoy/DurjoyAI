import { ToolDefinition } from '../tool.interface';

export const randomTool: ToolDefinition = {
  id: 'random_number',
  name: 'Random Number Generator',
  description: 'Generates a random integer within a specified min and max range.',
  parameters: {
    min: {
      type: 'number',
      description: 'Minimum boundary integer (default 1)',
      required: false,
    },
    max: {
      type: 'number',
      description: 'Maximum boundary integer (default 100)',
      required: false,
    },
  },
  permissionLevel: 'SAFE',
  enabled: true,
  async execute(args) {
    const min = Math.ceil(args?.min ?? 1);
    const max = Math.floor(args?.max ?? 100);

    if (min > max) {
      throw new Error('Minimum value cannot be greater than maximum value.');
    }

    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return {
      min,
      max,
      value,
    };
  },
};
