import { AIProvider } from '../ai.interface';

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class OpenRouterProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
    // Use an 8-second request timeout by default
    this.timeoutMs = parseInt(process.env.OPENROUTER_TIMEOUT_MS || '8000', 10);
  }

  /**
   * Generates a response using the OpenRouter Chat Completions API.
   * Handles API errors, network failures, timeouts, and empty responses.
   *
   * @param prompt The input text prompt.
   * @returns A promise resolving to the generated response.
   */
  public async generateResponse(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not defined in the environment variables.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/shoiebdurjoy/DurjoyAI',
          'X-Title': 'Durjoy AI Backend',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown HTTP error');
        throw new Error(`OpenRouter API responded with status ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const content = data?.choices?.[0]?.message?.content;

      if (!content || content.trim().length === 0) {
        throw new Error('OpenRouter API returned an empty response.');
      }

      return content.trim();
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      const err = error as Error;

      if (err.name === 'AbortError') {
        throw new Error(`OpenRouter API request timed out after ${this.timeoutMs}ms.`);
      }

      // Safeguard: make sure error messages do not expose the API key
      const errorMessage = err.message || 'Unknown integration error';

      // We strip the API key from the error message if it somehow leaked in
      const safeErrorMessage = errorMessage.replace(this.apiKey, '***HIDDEN***');
      throw new Error(`OpenRouter Provider Error: ${safeErrorMessage}`);
    }
  }
}
