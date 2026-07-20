import { AIFactory } from './ai.factory';
import { personalityService, PersonalityService } from './personality.service';
import {
  persistentMemoryService,
  PersistentMemoryService,
} from '../memory/persistent-memory.service';

export class AIService {
  constructor(
    private readonly personality: PersonalityService = personalityService,
    private readonly memory: PersistentMemoryService = persistentMemoryService,
  ) {}

  /**
   * Generates an AI response by retrieving relevant memories and requesting a system prompt
   * from PersonalityService before delegating to the resolved AI provider.
   *
   * @param prompt The input user prompt.
   * @param userId Optional user identifier for profile/memory context.
   * @returns A promise resolving to the provider's text response.
   */
  public async generateResponse(prompt: string, userId?: string): Promise<string> {
    // 1. Retrieve relevant memories specifically matching prompt keywords
    const relevantMemories = await this.memory.getRelevantMemories(prompt);

    let contextSummary = '';
    if (relevantMemories.length > 0) {
      contextSummary = relevantMemories
        .map((m) => `- ${m.category} | ${m.key}: ${m.value}`)
        .join('\n');
    }

    // 2. Request system prompt from PersonalityService
    const systemPrompt = await this.personality.getSystemPrompt({ userId, contextSummary });

    // 3. Delegate to provider
    const provider = AIFactory.getProvider();
    return provider.generateResponse(prompt, systemPrompt);
  }
}

export const aiService = new AIService();
