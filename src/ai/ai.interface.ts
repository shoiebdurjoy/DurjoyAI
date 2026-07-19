export interface AIProvider {
  /**
   * Generates a text response from the underlying LLM provider based on the given prompt.
   *
   * @param prompt The input text prompt to send to the provider.
   * @returns A promise resolving to the generated text response.
   */
  generateResponse(prompt: string): Promise<string>;
}
