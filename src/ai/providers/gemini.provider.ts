import { AIProvider } from '../ai.interface';

export class GeminiProvider implements AIProvider {
  /**
   * Generates a response using Gemini.
   *
   * @param prompt The input text prompt.
   * @param _systemPrompt Optional system prompt containing personality instructions.
   * @returns A promise that resolves to the generated response.
   * @todo Implement Gemini API integration once SDK or HTTP client is set up.
   */
  public async generateResponse(prompt: string, _systemPrompt?: string): Promise<string> {
    // TODO: Initialize Gemini client and make generation request using _systemPrompt.
    // Ensure GEMINI_API_KEY is properly validated.
    throw new Error(
      `Gemini provider is not implemented yet. Failed to process prompt: "${prompt}"`,
    );
  }
}
