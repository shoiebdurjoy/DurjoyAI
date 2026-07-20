/* eslint-disable @typescript-eslint/no-explicit-any */
export type PermissionLevel = 'SAFE' | 'CONFIRM_REQUIRED' | 'ADMIN';

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  permissionLevel: PermissionLevel;
  enabled: boolean;
  execute(args: Record<string, any>): Promise<any>;
}

export interface ToolExecutionResult {
  toolId: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTimeMs: number;
  permissionRequired?: PermissionLevel;
  confirmationNeeded?: boolean;
}

export interface ToolExecutionLog {
  toolId: string;
  timestamp: Date;
  executionTimeMs: number;
  success: boolean;
  permissionLevel: PermissionLevel;
  error?: string;
}
