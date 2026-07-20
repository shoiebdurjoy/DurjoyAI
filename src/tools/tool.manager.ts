/* eslint-disable @typescript-eslint/no-explicit-any */
import { toolExecutor, ToolExecutor, ExecutionOptions } from './tool.executor';
import { ToolExecutionResult } from './tool.interface';

export interface ToolCallDecision {
  toolId: string;
  args: Record<string, any>;
}

export class ToolManager {
  constructor(private readonly executor: ToolExecutor = toolExecutor) {}

  /**
   * Analyzes a user message to decide whether a registered tool should be invoked.
   *
   * @param prompt The input user query string.
   * @returns ToolCallDecision if a tool match is found, or null if normal conversational handling is needed.
   */
  public determineToolSelection(prompt: string): ToolCallDecision | null {
    if (!prompt || prompt.trim().length === 0) {
      return null;
    }

    const text = prompt.trim().toLowerCase();

    // 1. Time / Date queries
    if (
      /\b(what time|current time|date today|what date|what day is it|clock|time is it)\b/i.test(
        text,
      )
    ) {
      return {
        toolId: 'get_current_time',
        args: {},
      };
    }

    // 2. Calculator queries
    const calcMatch =
      text.match(/calculate:?\s*(.+)/i) ||
      text.match(/what is\s+([0-9+\-*/().\s^]+)/i) ||
      text.match(/compute:?\s*(.+)/i);

    if (calcMatch && /[0-9]/.test(calcMatch[1])) {
      return {
        toolId: 'calculator',
        args: { expression: calcMatch[1].replace(/\?/g, '').trim() },
      };
    }

    // 3. Random Number queries
    const randMatch = text.match(/random number (between|from) (\d+) (and|to) (\d+)/i);
    if (randMatch) {
      return {
        toolId: 'random_number',
        args: {
          min: parseInt(randMatch[2], 10),
          max: parseInt(randMatch[4], 10),
        },
      };
    }
    if (/\b(random number|pick a number|roll a die|generate a number)\b/i.test(text)) {
      return {
        toolId: 'random_number',
        args: { min: 1, max: 100 },
      };
    }

    // 4. UUID Generator queries
    if (/\b(generate uuid|create uuid|random uuid|uuid)\b/i.test(text)) {
      return {
        toolId: 'uuid_generator',
        args: {},
      };
    }

    // 5. System Info queries
    if (
      /\b(system info|server specs|cpu usage|memory usage|ram usage|system status|platform specs)\b/i.test(
        text,
      )
    ) {
      return {
        toolId: 'system_info',
        args: {},
      };
    }

    return null;
  }

  /**
   * Executes a tool via ToolExecutor and formats its result into natural conversational text.
   *
   * @param toolId Tool identifier
   * @param args Tool input parameters
   * @param options Execution confirmation options
   * @returns Formatted result string
   */
  public async executeAndFormatResult(
    toolId: string,
    args: Record<string, any> = {},
    options?: ExecutionOptions,
  ): Promise<{ text: string; rawResult: ToolExecutionResult }> {
    const rawResult = await this.executor.executeTool(toolId, args, options);

    if (!rawResult.success) {
      return {
        text: `I ran into an issue executing that tool: ${rawResult.error}`,
        rawResult,
      };
    }

    const res = rawResult.result;
    let formattedText = '';

    switch (toolId) {
      case 'get_current_time':
        formattedText = `The current date and time is ${res.formatted}.`;
        break;
      case 'calculator':
        formattedText = `The result of ${res.expression} is ${res.result}.`;
        break;
      case 'random_number':
        formattedText = `Your random number between ${res.min} and ${res.max} is ${res.value}.`;
        break;
      case 'uuid_generator':
        formattedText = `Generated UUID: ${res.uuid}`;
        break;
      case 'system_info':
        formattedText = `System Specs: Running on ${res.platform} (${res.arch}) with ${res.cpus} CPU cores. Memory usage is ${res.memory.usedGB} GB / ${res.memory.totalGB} GB (${res.memory.usagePercentage}%).`;
        break;
      default:
        formattedText = `Tool Result: ${JSON.stringify(res)}`;
        break;
    }

    return {
      text: formattedText,
      rawResult,
    };
  }
}

export const toolManager = new ToolManager();
