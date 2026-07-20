export interface AIProvider {
  /**
   * Generates a text response from the underlying LLM provider based on the given prompt and optional system prompt.
   *
   * @param prompt The input text prompt to send to the provider.
   * @param systemPrompt Optional system prompt containing personality and behavior instructions.
   * @returns A promise resolving to the generated text response.
   */
  generateResponse(prompt: string, systemPrompt?: string): Promise<string>;
}
