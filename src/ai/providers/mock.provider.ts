import { AIProvider } from '../ai.interface';

export class MockProvider implements AIProvider {
  /**
   * Generates a mock response for testing.
   *
   * @param prompt The input text prompt.
   * @param _systemPrompt Optional system prompt containing personality and behavior instructions.
   * @returns A promise that resolves to a mock response.
   */
  public async generateResponse(prompt: string, _systemPrompt?: string): Promise<string> {
    return `[Mock AI Response] Simulated response for prompt: "${prompt}"`;
  }
}
