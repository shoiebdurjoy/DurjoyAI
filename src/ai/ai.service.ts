import { AIFactory } from './ai.factory';
import { personalityService, PersonalityService } from './personality.service';
import {
  persistentMemoryService,
  PersistentMemoryService,
} from '../memory/persistent-memory.service';
import { sessionService, SessionService } from '../memory/session.service';
import { memoryExtractorService, MemoryExtractorService } from '../memory/memory-extractor.service';

export interface AIServiceOptions {
  userId?: string;
  sessionId?: string;
}

export class AIService {
  constructor(
    private readonly personality: PersonalityService = personalityService,
    private readonly memory: PersistentMemoryService = persistentMemoryService,
    private readonly session: SessionService = sessionService,
    private readonly extractor: MemoryExtractorService = memoryExtractorService,
  ) {}

  /**
   * Generates an AI response by automatically extracting memories, assembling dialogue history,
   * building a unified system prompt, and delegating to the active LLM provider.
   *
   * @param prompt The input user prompt.
   * @param options Optional userId and sessionId parameters or userId string.
   * @returns A promise resolving to the provider's text response.
   */
  public async generateResponse(
    prompt: string,
    options?: AIServiceOptions | string,
  ): Promise<string> {
    const userId = typeof options === 'string' ? options : options?.userId || 'default-user';
    const sessionId =
      typeof options === 'object' ? options?.sessionId || 'default-session' : 'default-session';

    // 1. Automatic Memory Learning: Extract and save any long-term personal facts
    await this.extractor.analyzeAndSave(prompt);

    // 2. Retrieve recent short-term conversation context before adding current turn
    const conversationContext = await this.session.getRecentHistorySummary(userId, sessionId);

    // 3. Append current user message to session history
    await this.session.appendMessage(userId, sessionId, 'user', prompt);

    // 4. Retrieve relevant long-term memories specifically matching prompt keywords
    const relevantMemories = await this.memory.getRelevantMemories(prompt);

    let contextSummary = '';
    if (relevantMemories.length > 0) {
      contextSummary = relevantMemories
        .map((m) => `- ${m.category} | ${m.key}: ${m.value} (Confidence: ${m.confidence})`)
        .join('\n');
    }

    // 5. Build clean, unified system prompt via PersonalityService
    const systemPrompt = await this.personality.getSystemPrompt({
      userId,
      contextSummary,
      conversationContext,
    });

    // 6. Delegate completion to the active LLM provider
    const provider = AIFactory.getProvider();
    const responseText = await provider.generateResponse(prompt, systemPrompt);

    // 7. Append assistant response to short-term session history
    await this.session.appendMessage(userId, sessionId, 'assistant', responseText);

    return responseText;
  }
}

export const aiService = new AIService();
