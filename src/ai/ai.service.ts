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
  ) {}

  /**
   * Generates an AI response by checking tools, checking live web search requirements,
   * extracting memories, assembling dialogue history, and delegating to the active LLM provider.
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

    // 1. Tool Intent Detection & Execution
    const toolCall = this.tools.determineToolSelection(prompt);
    if (toolCall) {
      const toolResult = await this.tools.executeAndFormatResult(toolCall.toolId, toolCall.args, {
        confirmed,
      });

      await this.session.appendMessage(userId, sessionId, 'user', prompt);
      await this.session.appendMessage(userId, sessionId, 'assistant', toolResult.text);

      return toolResult.text;
    }

    // 2. Intelligent Live Web Search Decision
    let webSearchContext = '';
    if (this.search.shouldSearch(prompt)) {
      const searchRes = await this.search.search(prompt);
      webSearchContext = this.search.formatSearchResultsForPrompt(searchRes);
    }

    // 3. Automatic Memory Learning: Extract and save any long-term personal facts
    await this.extractor.analyzeAndSave(prompt);

    // 4. Retrieve recent short-term conversation context
    const conversationContext = await this.session.getRecentHistorySummary(userId, sessionId);

    // 5. Append current user message to session history
    await this.session.appendMessage(userId, sessionId, 'user', prompt);

    // 6. Retrieve relevant long-term memories
    const relevantMemories = await this.memory.getRelevantMemories(prompt);

    let contextSummary = '';
    if (relevantMemories.length > 0) {
      contextSummary = relevantMemories
        .map((m) => `- ${m.category} | ${m.key}: ${m.value} (Confidence: ${m.confidence})`)
        .join('\n');
    }

    // 7. Build clean, unified system prompt via PersonalityService
    const systemPrompt = await this.personality.getSystemPrompt({
      userId,
      contextSummary,
      conversationContext,
      webSearchContext,
    });

    // 8. Delegate completion to active LLM provider
    const provider = AIFactory.getProvider();
    const responseText = await provider.generateResponse(prompt, systemPrompt);

    // 9. Append assistant response to short-term session history
    await this.session.appendMessage(userId, sessionId, 'assistant', responseText);

    return responseText;
  }
}

export const aiService = new AIService();
