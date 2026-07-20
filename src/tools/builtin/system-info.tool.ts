import os from 'os';
import { ToolDefinition } from '../tool.interface';

export const systemInfoTool: ToolDefinition = {
  id: 'system_info',
  name: 'System Information',
  description:
    'Retrieves operating system telemetry including platform, CPU core count, memory usage, and uptime.',
  parameters: {},
  permissionLevel: 'SAFE',
  enabled: true,
  async execute() {
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;

    const toGB = (bytes: number) => Number((bytes / (1024 * 1024 * 1024)).toFixed(2));

    return {
      platform: os.platform(),
      type: os.type(),
      arch: os.arch(),
      cpus: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown CPU',
      uptimeSeconds: Math.floor(os.uptime()),
      memory: {
        totalGB: toGB(totalMemBytes),
        freeGB: toGB(freeMemBytes),
        usedGB: toGB(usedMemBytes),
        usagePercentage: Number(((usedMemBytes / totalMemBytes) * 100).toFixed(1)),
      },
    };
  },
};
