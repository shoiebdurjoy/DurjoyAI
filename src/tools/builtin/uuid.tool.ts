import crypto from 'crypto';
import { ToolDefinition } from '../tool.interface';

export const uuidTool: ToolDefinition = {
  id: 'uuid_generator',
  name: 'UUID Generator',
  description: 'Generates a random RFC4122 v4 UUID string.',
  parameters: {
    count: {
      type: 'number',
      description: 'Number of UUIDs to generate (default 1, max 10)',
      required: false,
    },
  },
  permissionLevel: 'SAFE',
  enabled: true,
  async execute(args) {
    const count = Math.min(10, Math.max(1, args?.count || 1));
    const uuids: string[] = [];

    for (let i = 0; i < count; i++) {
      uuids.push(crypto.randomUUID());
    }

    return {
      count,
      uuid: uuids[0],
      uuids,
    };
  },
};
