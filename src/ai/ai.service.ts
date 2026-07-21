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
import { locationResolverService } from '../profile/location-resolver.service';
import { normalizeQuery } from '../utils/query-normalizer';
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
   * Generates an AI response by checking normalization, deterministic reasoning, tools,
   * web search, memories, dialogue history, and delegating to active providers with retries.
   *
   * @param rawPrompt The input user prompt.
   * @param options Optional userId, sessionId, or confirmed flags.
   * @returns A promise resolving to the text response.
   */
  public async generateResponse(
    rawPrompt: string,
    options?: AIServiceOptions | string,
  ): Promise<string> {
    const userId = typeof options === 'string' ? options : options?.userId || 'default-user';
    const sessionId =
      typeof options === 'object' ? options?.sessionId || 'default-session' : 'default-session';
    const confirmed = typeof options === 'object' ? options?.confirmed || false : false;

    // 1. Normalize Query for Typo / Phonetic Speech Tolerance
    const prompt = normalizeQuery(rawPrompt);
    Logger.info('AIService', `Incoming prompt: "${rawPrompt}" -> Normalized: "${prompt}"`);

    try {
      // 2. Deterministic Calculation Engine Check
      if (this.reasoning.isDeterministicQuery(prompt)) {
        Logger.info('AIService', 'Intent classification: Deterministic Reasoning');
        const deterministicRes = this.reasoning.resolveDeterministicAnswer(prompt);
        if (deterministicRes) {
          Logger.info('AIService', `Calculation execution: ${deterministicRes.explanation}`);
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

      // 3. Special Memory Query Inspection ("What do you remember about me?")
      if (/\b(what do you remember|what do you know about me|remember about me)\b/i.test(prompt)) {
        Logger.info('AIService', 'Intent classification: Memory Lookup Query');
        const allMems = await this.memory.getAllMemories();
        if (allMems.length === 0) {
          const emptyMemMsg = "I don't know much about you yet. Tell me something about yourself!";
          await this.session.appendMessage(userId, sessionId, 'user', prompt);
          await this.session.appendMessage(userId, sessionId, 'assistant', emptyMemMsg);
          return emptyMemMsg;
        }
        const memSummary = allMems.map((m) => `${m.category}: ${m.key} is ${m.value}`).join(', ');
        const memAns = `Here is what I remember: ${memSummary}`;
        await this.session.appendMessage(userId, sessionId, 'user', prompt);
        await this.session.appendMessage(userId, sessionId, 'assistant', memAns);
        return memAns;
      }

      // 4. Tool Framework Routing & Execution
      const toolCall = this.tools.determineToolSelection(prompt);
      if (toolCall) {
        Logger.info('AIService', `Intent classification: Tool Invocation (${toolCall.toolId})`);
        Logger.info('AIService', `Tool selection: "${toolCall.toolId}"`);
        Logger.info(
          'AIService',
          `Tool execution start: "${toolCall.toolId}" params: ${JSON.stringify(toolCall.args)}`,
        );

        const toolResult = await this.tools.executeAndFormatResult(toolCall.toolId, toolCall.args, {
          confirmed,
        });

        Logger.info('AIService', `Tool execution end: "${toolCall.toolId}"`);

        await this.session.appendMessage(userId, sessionId, 'user', prompt);
        await this.session.appendMessage(userId, sessionId, 'assistant', toolResult.text);

        return toolResult.text;
      }

      // 5. Intelligent Live Web Search Decision with 1 Retry Fallback
      let webSearchContext = '';
      if (this.search.shouldSearch(prompt)) {
        Logger.info('AIService', 'Intent classification: Live Web Search Required');
        const expandedQuery = await locationResolverService.expandSearchQuery(prompt);
        let searchRes;
        try {
          searchRes = await this.search.search(expandedQuery);
        } catch (searchErr) {
          Logger.warn('AIService', 'Primary web search failed. Retrying search once...', searchErr);
          searchRes = await this.search.search(expandedQuery);
        }

        Logger.info('AIService', `Search provider used: "${searchRes.provider}"`);
        Logger.info('AIService', `Search execution: ${searchRes.results.length} results returned`);

        webSearchContext = this.search.formatSearchResultsForPrompt(searchRes);
      } else {
        Logger.info('AIService', 'Intent classification: Conversational LLM Completion');
      }

      // 6. Automatic Memory Extraction
      await this.extractor.analyzeAndSave(prompt);

      // 7. Retrieve short-term dialogue history
      const conversationContext = await this.session.getRecentHistorySummary(userId, sessionId);

      // 8. Append user message to session
      await this.session.appendMessage(userId, sessionId, 'user', prompt);

      // 9. Retrieve relevant long-term memories
      const relevantMemories = await this.memory.getRelevantMemories(prompt);
      Logger.info(
        'AIService',
        `Memory lookup: ${relevantMemories.length} relevant memories retrieved`,
      );

      let contextSummary = '';
      if (relevantMemories.length > 0) {
        contextSummary = relevantMemories
          .map((m) => `- ${m.category} | ${m.key}: ${m.value}`)
          .join('\n');
      }

      // 10. System prompt assembly
      const systemPrompt = await this.personality.getSystemPrompt({
        userId,
        contextSummary,
        conversationContext,
        webSearchContext,
      });

      Logger.info(
        'AIService',
        `AI request sent to LLM provider:\n--- System Prompt ---\n${systemPrompt}\n--- User Prompt ---\n${prompt}`,
      );

      // 11. Provider Completion Execution with 1 Retry Fallback
      const provider = AIFactory.getProvider();
      let responseText = '';
      try {
        responseText = await provider.generateResponse(prompt, systemPrompt);
      } catch (providerErr) {
        Logger.warn(
          'AIService',
          'Primary LLM provider call failed. Retrying provider completion once...',
          providerErr,
        );
        responseText = await provider.generateResponse(prompt, systemPrompt);
      }

      Logger.info('AIService', `AI response received: "${responseText}"`);

      // 12. Append assistant response to short-term session history
      await this.session.appendMessage(userId, sessionId, 'assistant', responseText);

      return responseText;
    } catch (err: unknown) {
      Logger.error('AIService', 'Unhandled exception in generateResponse pipeline', err);
      const fallbackMsg = "I couldn't get that right now, but I'm ready for your next question.";
      await this.session.appendMessage(userId, sessionId, 'user', prompt);
      await this.session.appendMessage(userId, sessionId, 'assistant', fallbackMsg);
      return fallbackMsg;
    }
  }
}

export const aiService = new AIService();
