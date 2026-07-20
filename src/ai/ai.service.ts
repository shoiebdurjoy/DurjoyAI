import { AIFactory } from './ai.factory';
import { personalityService, PersonalityService } from './personality.service';

export class AIService {
  constructor(private readonly personality: PersonalityService = personalityService) {}

  /**
   * Generates an AI response by requesting a system prompt from PersonalityService
   * before delegating to the resolved AI provider.
   *
   * @param prompt The input user prompt.
   * @param userId Optional user identifier for profile/memory context.
   * @returns A promise resolving to the provider's text response.
   */
  public async generateResponse(prompt: string, userId?: string): Promise<string> {
    const systemPrompt = await this.personality.getSystemPrompt({ userId });
    const provider = AIFactory.getProvider();
    return provider.generateResponse(prompt, systemPrompt);
  }
}

export const aiService = new AIService();
