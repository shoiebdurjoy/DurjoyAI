import { AIProvider } from '../ai.interface';

export class OpenRouterProvider implements AIProvider {
  /**
   * Generates a response using OpenRouter.
   *
   * @param prompt The input text prompt.
   * @returns A promise that resolves to the generated response.
   * @todo Implement OpenRouter API integration once HTTP client is set up.
   */
  public async generateResponse(prompt: string): Promise<string> {
    // TODO: Make HTTP POST request to OpenRouter chat completion endpoint.
    // Ensure OPENROUTER_API_KEY is properly validated.
    throw new Error(
      `OpenRouter provider is not implemented yet. Failed to process prompt: "${prompt}"`,
    );
  }
}
