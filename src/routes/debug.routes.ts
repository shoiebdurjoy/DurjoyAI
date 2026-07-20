import { Router, Request, Response } from 'express';
import { searchManager } from '../search/search.manager';
import { toolRegistry } from '../tools/tool.registry';
import { toolExecutor } from '../tools/tool.executor';
import { toolManager } from '../tools/tool.manager';
import { reasoningManager } from '../reasoning/reasoning.manager';

const router = Router();

/**
 * GET /debug/search?q=<query>
 * Independent endpoint to test SearchManager execution without Alexa.
 */
router.get('/debug/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string) || 'latest news';
  const shouldSearch = searchManager.shouldSearch(query);
  const result = await searchManager.search(query);
  const formattedPromptContext = searchManager.formatSearchResultsForPrompt(result);

  res.json({
    query,
    shouldSearch,
    provider: result.provider,
    resultCount: result.results.length,
    results: result.results,
    formattedPromptContext,
    executionTimeMs: result.executionTimeMs,
  });
});

/**
 * GET /debug/tools
 * Endpoint to list all registered tools and recent execution logs.
 */
router.get('/debug/tools', (_req: Request, res: Response) => {
  const tools = toolRegistry.getAllTools().map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    permissionLevel: t.permissionLevel,
    enabled: t.enabled,
  }));
  const executionLogs = toolExecutor.getLogs();

  res.json({
    toolCount: tools.length,
    tools,
    recentExecutionLogs: executionLogs,
  });
});

/**
 * GET /debug/router?q=<query>
 * Endpoint to test intent classification and tool routing without calling external APIs.
 */
router.get('/debug/router', (req: Request, res: Response) => {
  const query = (req.query.q as string) || 'latest news';
  const isDeterministic = reasoningManager.isDeterministicQuery(query);
  const deterministicResult = isDeterministic
    ? reasoningManager.resolveDeterministicAnswer(query)
    : null;
  const toolSelection = toolManager.determineToolSelection(query);
  const shouldSearch = searchManager.shouldSearch(query);

  let primaryIntent = 'Conversational LLM Completion';
  if (isDeterministic) {
    primaryIntent = 'Deterministic Reasoning';
  } else if (toolSelection) {
    primaryIntent = `Tool Invocation (${toolSelection.toolId})`;
  } else if (shouldSearch) {
    primaryIntent = 'Live Web Search Required';
  }

  res.json({
    query,
    primaryIntent,
    isDeterministic,
    deterministicResult,
    toolSelection,
    shouldSearch,
  });
});

export default router;
