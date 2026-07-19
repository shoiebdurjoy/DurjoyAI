import { AIProvider } from '../ai.interface';

export class MockProvider implements AIProvider {
  /**
   * Generates a mock response for testing.
   *
   * @param prompt The input text prompt.
   * @returns A promise that resolves to a mock response.
   */
  public async generateResponse(prompt: string): Promise<string> {
    return `[Mock AI Response] Simulated response for prompt: "${prompt}"`;
  }
}
