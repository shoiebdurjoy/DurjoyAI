import { AIFactory } from './ai.factory';
import { personalityService, PersonalityService } from './personality.service';
import {
  persistentMemoryService,
  PersistentMemoryService,
} from '../memory/persistent-memory.service';
import { sessionService, SessionService } from '../memory/session.service';
import { memoryExtractorService, MemoryExtractorService } from '../memory/memory-extractor.service';
import { toolManager, ToolManager } from '../tools/tool.manager';
import { searchManager, SearchManager } from '../search/search.manager';
import { reasoningManager, ReasoningManager } from '../reasoning/reasoning.manager';
import { Logger } from '../utils/logger';

export interface AIServiceOptions {
  userId?: string;
  sessionId?: string;
  confirmed?: boolean;
}

export class AIService {
  constructor(
    private readonly personality: PersonalityService = personalityService,
    private readonly memory: PersistentMemoryService = persistentMemoryService,
    private readonly session: SessionService = sessionService,
    private readonly extractor: MemoryExtractorService = memoryExtractorService,
    private readonly tools: ToolManager = toolManager,
    private readonly search: SearchManager = searchManager,
    private readonly reasoning: ReasoningManager = reasoningManager,
  ) {}

  /**
   * Generates an AI response by checking deterministic reasoning, tools, web search,
   * memories, dialogue history, and delegating to active providers.
   *
   * @param prompt The input user prompt.
   * @param options Optional userId, sessionId, or confirmed flags.
   * @returns A promise resolving to the text response.
   */
  public async generateResponse(
    prompt: string,
    options?: AIServiceOptions | string,
  ): Promise<string> {
    const userId = typeof options === 'string' ? options : options?.userId || 'default-user';
    const sessionId =
      typeof options === 'object' ? options?.sessionId || 'default-session' : 'default-session';
    const confirmed = typeof options === 'object' ? options?.confirmed || false : false;

    // 1. Log Incoming User Prompt
    Logger.info('AIService', `Incoming user prompt: "${prompt}"`);

    // 2. Deterministic Calculation Engine Check
    if (this.reasoning.isDeterministicQuery(prompt)) {
      Logger.info('AIService', 'Intent classification: Deterministic Reasoning');
      const deterministicRes = this.reasoning.resolveDeterministicAnswer(prompt);
      if (deterministicRes) {
        await this.session.appendMessage(userId, sessionId, 'user', prompt);
        await this.session.appendMessage(
          userId,
          sessionId,
          'assistant',
          deterministicRes.explanation,
        );
        return deterministicRes.explanation;
      }
    }

    // 3. Tool Framework Routing & Execution
    const toolCall = this.tools.determineToolSelection(prompt);
    if (toolCall) {
      Logger.info('AIService', `Intent classification: Tool Invocation (${toolCall.toolId})`);
      Logger.info('AIService', `Selected tool: "${toolCall.toolId}"`);
      Logger.info(
        'AIService',
        `Tool execution start: "${toolCall.toolId}" with parameters ${JSON.stringify(toolCall.args)}`,
      );

      const toolResult = await this.tools.executeAndFormatResult(toolCall.toolId, toolCall.args, {
        confirmed,
      });

      Logger.info('AIService', `Tool execution end: "${toolCall.toolId}"`);

      await this.session.appendMessage(userId, sessionId, 'user', prompt);
      await this.session.appendMessage(userId, sessionId, 'assistant', toolResult.text);

      return toolResult.text;
    }

    // 4. Intelligent Live Web Search Decision
    let webSearchContext = '';
    if (this.search.shouldSearch(prompt)) {
      Logger.info('AIService', 'Intent classification: Live Web Search Required');
      const searchRes = await this.search.search(prompt);

      Logger.info('AIService', `Search provider used: "${searchRes.provider}"`);
      Logger.info('AIService', `Number of search results: ${searchRes.results.length}`);

      webSearchContext = this.search.formatSearchResultsForPrompt(searchRes);
    } else {
      Logger.info('AIService', 'Intent classification: Conversational LLM Completion');
    }

    // 5. Automatic Memory Learning: Extract and save any long-term personal facts
    await this.extractor.analyzeAndSave(prompt);

    // 6. Retrieve recent short-term conversation context
    const conversationContext = await this.session.getRecentHistorySummary(userId, sessionId);

    // 7. Append current user message to session history
    await this.session.appendMessage(userId, sessionId, 'user', prompt);

    // 8. Retrieve relevant long-term memories
    const relevantMemories = await this.memory.getRelevantMemories(prompt);

    let contextSummary = '';
    if (relevantMemories.length > 0) {
      contextSummary = relevantMemories
        .map((m) => `- ${m.category} | ${m.key}: ${m.value} (Confidence: ${m.confidence})`)
        .join('\n');
    }

    // 9. Build clean, unified system prompt via PersonalityService
    const systemPrompt = await this.personality.getSystemPrompt({
      userId,
      contextSummary,
      conversationContext,
      webSearchContext,
    });

    // 10. Log Final Prompt sent to LLM
    Logger.info(
      'AIService',
      `Final prompt sent to the LLM:\n--- System Prompt ---\n${systemPrompt}\n--- User Prompt ---\n${prompt}`,
    );

    // 11. Delegate completion to active LLM provider
    const provider = AIFactory.getProvider();
    const responseText = await provider.generateResponse(prompt, systemPrompt);

    // 12. Append assistant response to short-term session history
    await this.session.appendMessage(userId, sessionId, 'assistant', responseText);

    return responseText;
  }
}

export const aiService = new AIService();
