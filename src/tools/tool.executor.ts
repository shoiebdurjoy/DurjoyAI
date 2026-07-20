/* eslint-disable @typescript-eslint/no-explicit-any */
import { ToolExecutionResult, ToolExecutionLog } from './tool.interface';
import { toolRegistry, ToolRegistry } from './tool.registry';

export interface ExecutionOptions {
  confirmed?: boolean;
  userRole?: 'user' | 'admin';
}

export class ToolExecutor {
  private logs: ToolExecutionLog[] = [];

  constructor(private readonly registry: ToolRegistry = toolRegistry) {}

  /**
   * Securely executes a registered tool through the framework pipeline.
   *
   * @param toolId The unique ID of the tool to run.
   * @param args Named parameters passed to the tool.
   * @param options Execution confirmation and permission options.
   * @returns Resolved ToolExecutionResult object.
   */
  public async executeTool(
    toolId: string,
    args: Record<string, any> = {},
    options?: ExecutionOptions,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool = this.registry.getTool(toolId);

    if (!tool) {
      const duration = Date.now() - startTime;
      this.logExecution(toolId, duration, false, 'SAFE', `Unknown tool: ${toolId}`);
      return {
        toolId,
        success: false,
        error: `Tool '${toolId}' is not registered or supported.`,
        executionTimeMs: duration,
      };
    }

    if (!tool.enabled) {
      const duration = Date.now() - startTime;
      this.logExecution(toolId, duration, false, tool.permissionLevel, 'Tool disabled');
      return {
        toolId,
        success: false,
        error: `Tool '${tool.name}' is currently disabled.`,
        executionTimeMs: duration,
      };
    }

    // Permission enforcement checks
    if (tool.permissionLevel === 'CONFIRM_REQUIRED' && !options?.confirmed) {
      const duration = Date.now() - startTime;
      this.logExecution(toolId, duration, false, tool.permissionLevel, 'Confirmation required');
      return {
        toolId,
        success: false,
        permissionRequired: 'CONFIRM_REQUIRED',
        confirmationNeeded: true,
        error: `Action '${tool.name}' requires explicit user confirmation before proceeding.`,
        executionTimeMs: duration,
      };
    }

    if (tool.permissionLevel === 'ADMIN' && options?.userRole !== 'admin') {
      const duration = Date.now() - startTime;
      this.logExecution(toolId, duration, false, tool.permissionLevel, 'Admin rights required');
      return {
        toolId,
        success: false,
        permissionRequired: 'ADMIN',
        error: `Action '${tool.name}' requires administrator privileges.`,
        executionTimeMs: duration,
      };
    }

    try {
      const result = await tool.execute(args);
      const duration = Date.now() - startTime;

      this.logExecution(toolId, duration, true, tool.permissionLevel);

      return {
        toolId: tool.id,
        success: true,
        result,
        executionTimeMs: duration,
      };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const cleanError = err?.message || 'An unexpected tool execution error occurred.';

      this.logExecution(toolId, duration, false, tool.permissionLevel, cleanError);

      return {
        toolId: tool.id,
        success: false,
        error: cleanError,
        executionTimeMs: duration,
      };
    }
  }

  /**
   * Logs tool execution metrics internally.
   */
  private logExecution(
    toolId: string,
    executionTimeMs: number,
    success: boolean,
    permissionLevel: any,
    error?: string,
  ): void {
    const log: ToolExecutionLog = {
      toolId,
      timestamp: new Date(),
      executionTimeMs,
      success,
      permissionLevel,
      error,
    };
    this.logs.push(log);
    if (this.logs.length > 100) {
      this.logs.shift();
    }
  }

  /**
   * Retrieves recorded execution logs.
   */
  public getLogs(): ToolExecutionLog[] {
    return [...this.logs];
  }
}

export const toolExecutor = new ToolExecutor();
