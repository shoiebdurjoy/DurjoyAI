import { AIProvider } from '../ai.interface';

export class OpenAIProvider implements AIProvider {
  /**
   * Generates a response using OpenAI.
   *
   * @param prompt The input text prompt.
   * @returns A promise that resolves to the generated response.
   * @todo Implement OpenAI API integration once SDK or HTTP client is set up.
   */
  public async generateResponse(prompt: string): Promise<string> {
    // TODO: Initialize OpenAI client and make chat completion request.
    // Ensure OPENAI_API_KEY is properly validated.
    throw new Error(
      `OpenAI provider is not implemented yet. Failed to process prompt: "${prompt}"`,
    );
  }
}
