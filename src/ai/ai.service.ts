import { AIFactory } from './ai.factory';

export class AIService {
  /**
   * Delegates prompt completion to the configured AI provider resolved by AIFactory.
   *
   * @param prompt The input prompt.
   * @returns A promise resolving to the provider's text response.
   */
  public async generateResponse(prompt: string): Promise<string> {
    const provider = AIFactory.getProvider();
    return provider.generateResponse(prompt);
  }
}
export const aiService = new AIService();
