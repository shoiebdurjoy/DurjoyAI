/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ToolRegistry } from './tool.registry';
import { ToolExecutor } from './tool.executor';
import { ToolManager } from './tool.manager';
import { ToolDefinition } from './tool.interface';

describe('Tool Calling & Action Framework Tests', () => {
  const registry = new ToolRegistry();
  const executor = new ToolExecutor(registry);
  const manager = new ToolManager(executor);

  it('should register and retrieve built-in offline tools correctly', () => {
    const timeTool = registry.getTool('get_current_time');
    assert.notStrictEqual(timeTool, null);
    assert.strictEqual(timeTool?.permissionLevel, 'SAFE');

    const tools = registry.getAllTools();
    assert.ok(tools.length >= 5);
  });

  it('should execute time tool and return formatted date time result', async () => {
    const res = await executor.executeTool('get_current_time');
    assert.strictEqual(res.success, true);
    assert.ok(res.result.formatted !== undefined);
    assert.ok(res.executionTimeMs >= 0);
  });

  it('should execute calculator tool and evaluate mathematical expressions safely', async () => {
    const res = await executor.executeTool('calculator', { expression: '15 * 8' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.result.result, 120);
  });

  it('should execute random number and uuid generator tools', async () => {
    const randRes = await executor.executeTool('random_number', { min: 10, max: 20 });
    assert.strictEqual(randRes.success, true);
    assert.ok(randRes.result.value >= 10 && randRes.result.value <= 20);

    const uuidRes = await executor.executeTool('uuid_generator');
    assert.strictEqual(uuidRes.success, true);
    assert.strictEqual(typeof uuidRes.result.uuid, 'string');
    assert.strictEqual(uuidRes.result.uuid.length, 36);
  });

  it('should execute system info tool and return telemetry specs', async () => {
    const sysRes = await executor.executeTool('system_info');
    assert.strictEqual(sysRes.success, true);
    assert.ok(sysRes.result.platform !== undefined);
    assert.ok(sysRes.result.memory.totalGB > 0);
  });

  it('should enforce permission level CONFIRM_REQUIRED when execution is unconfirmed', async () => {
    const dangerousTool: ToolDefinition = {
      id: 'delete_file',
      name: 'Delete File',
      description: 'Deletes a specified file',
      parameters: {},
      permissionLevel: 'CONFIRM_REQUIRED',
      enabled: true,
      async execute() {
        return { deleted: true };
      },
    };

    registry.registerTool(dangerousTool);

    // Unconfirmed execution
    const blocked = await executor.executeTool('delete_file');
    assert.strictEqual(blocked.success, false);
    assert.strictEqual(blocked.confirmationNeeded, true);

    // Confirmed execution
    const confirmed = await executor.executeTool('delete_file', {}, { confirmed: true });
    assert.strictEqual(confirmed.success, true);
  });

  it('should handle tool errors gracefully without crashing or exposing stack traces', async () => {
    const failRes = await executor.executeTool('calculator', {
      expression: 'invalid + expression',
    });
    assert.strictEqual(failRes.success, false);
    assert.ok(failRes.error?.includes('Calculation error'));
  });

  it('should return error for unknown or disabled tools', async () => {
    const unknownRes = await executor.executeTool('non_existent_tool');
    assert.strictEqual(unknownRes.success, false);
    assert.ok(unknownRes.error?.includes('not registered'));
  });

  it('should record execution logs including metrics and timestamps', () => {
    const logs = executor.getLogs();
    assert.ok(logs.length > 0);
    assert.ok(logs[0].executionTimeMs >= 0);
    assert.ok(logs[0].timestamp instanceof Date);
  });

  it('should detect tool intent in ToolManager and produce natural answers', async () => {
    const decision = manager.determineToolSelection('What time is it?');
    assert.notStrictEqual(decision, null);
    assert.strictEqual(decision?.toolId, 'get_current_time');

    const formatted = await manager.executeAndFormatResult('get_current_time');
    assert.ok(formatted.text.includes('current date and time'));
  });
});
