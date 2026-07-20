import { ToolDefinition } from './tool.interface';
import { timeTool } from './builtin/time.tool';
import { calculatorTool } from './builtin/calculator.tool';
import { randomTool } from './builtin/random.tool';
import { uuidTool } from './builtin/uuid.tool';
import { systemInfoTool } from './builtin/system-info.tool';
import { reminderTool } from '../productivity/tools/reminder.tool';
import { taskTool } from '../productivity/tools/task.tool';
import { calendarTool } from '../productivity/tools/calendar.tool';
import { emailTool } from '../productivity/tools/email.tool';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    // Register built-in system tools
    this.registerTool(timeTool);
    this.registerTool(calculatorTool);
    this.registerTool(randomTool);
    this.registerTool(uuidTool);
    this.registerTool(systemInfoTool);

    // Register productivity suite tools
    this.registerTool(reminderTool);
    this.registerTool(taskTool);
    this.registerTool(calendarTool);
    this.registerTool(emailTool);
  }

  /**
   * Registers a new tool.
   *
   * @param tool The tool definition instance.
   */
  public registerTool(tool: ToolDefinition): void {
    if (!tool.id) {
      throw new Error('Tool ID is required for registration.');
    }
    this.tools.set(tool.id.toLowerCase(), tool);
  }

  /**
   * Unregisters a tool by ID.
   */
  public unregisterTool(id: string): boolean {
    return this.tools.delete(id.toLowerCase());
  }

  /**
   * Retrieves a tool by ID.
   */
  public getTool(id: string): ToolDefinition | null {
    return this.tools.get(id.toLowerCase()) || null;
  }

  /**
   * Returns all registered tools.
   */
  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Returns all currently enabled tools.
   */
  public getEnabledTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => t.enabled);
  }
}

export const toolRegistry = new ToolRegistry();
