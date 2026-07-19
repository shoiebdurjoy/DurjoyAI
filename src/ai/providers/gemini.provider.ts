import { AIProvider } from '../ai.interface';

export class GeminiProvider implements AIProvider {
  /**
   * Generates a response using Gemini.
   *
   * @param prompt The input text prompt.
   * @returns A promise that resolves to the generated response.
   * @todo Implement Gemini API integration once SDK or HTTP client is set up.
   */
  public async generateResponse(prompt: string): Promise<string> {
    // TODO: Initialize Gemini client and make generation request.
    // Ensure GEMINI_API_KEY is properly validated.
    throw new Error(
      `Gemini provider is not implemented yet. Failed to process prompt: "${prompt}"`,
    );
  }
}
