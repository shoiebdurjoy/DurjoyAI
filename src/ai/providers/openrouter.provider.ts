import { AIProvider } from '../ai.interface';
import { Logger } from '../../utils/logger';

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class OpenRouterProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly models: string[];
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    const configuredModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

    // Primary model + automatic fallbacks for maximum production reliability
    this.models = Array.from(
      new Set([
        configuredModel === 'google/gemini-2.5-flash'
          ? 'google/gemini-2.0-flash-001'
          : configuredModel,
        'google/gemini-2.0-flash-001',
        'google/gemini-flash-1.5',
        'meta-llama/llama-3.3-70b-instruct',
      ]),
    );

    this.maxTokens = parseInt(process.env.OPENROUTER_MAX_TOKENS || '512', 10);
    this.timeoutMs = parseInt(process.env.OPENROUTER_TIMEOUT_MS || '8000', 10);
  }

  /**
   * Generates a response using the OpenRouter Chat Completions API with model failover.
   * Handles API errors, network failures, timeouts, and empty responses.
   *
   * @param prompt The input text prompt.
   * @param systemPrompt Optional system prompt containing personality and behavior instructions.
   * @returns A promise resolving to the generated response string.
   */
  public async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not defined in the environment variables.');
    }

    const messages = [];
    if (systemPrompt && systemPrompt.trim().length > 0) {
      messages.push({
        role: 'system',
        content: systemPrompt.trim(),
      });
    }
    messages.push({
      role: 'user',
      content: prompt,
    });

    let lastError: Error | null = null;

    // Try models in sequence if primary model encounters an error or timeout
    for (const model of this.models) {
      try {
        Logger.info('OpenRouterProvider', `Executing LLM request via model '${model}'...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://github.com/shoiebdurjoy/DurjoyAI',
            'X-Title': 'Durjoy AI Backend',
          },
          body: JSON.stringify({
            model,
            max_tokens: this.maxTokens,
            temperature: 0.7,
            messages,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown HTTP error');
          throw new Error(
            `OpenRouter API status ${response.status} for model '${model}': ${errorText}`,
          );
        }

        const data = (await response.json()) as OpenRouterResponse;
        const content = data?.choices?.[0]?.message?.content;

        if (!content || content.trim().length === 0) {
          throw new Error(`OpenRouter returned empty response for model '${model}'.`);
        }

        const resultText = content.trim();
        Logger.info(
          'OpenRouterProvider',
          `LLM response generated successfully via '${model}' (${resultText.length} chars)`,
        );

        return resultText;
      } catch (error: unknown) {
        const err = error as Error;
        const errMsg =
          err.name === 'AbortError'
            ? `Request timed out after ${this.timeoutMs}ms`
            : err.message || 'Unknown error';

        const safeErrMsg = errMsg.replace(this.apiKey, '***HIDDEN***');
        Logger.warn('OpenRouterProvider', `Model '${model}' failed: ${safeErrMsg}`);
        lastError = new Error(`OpenRouter Provider Error: ${safeErrMsg}`);
      }
    }

    throw lastError || new Error('All OpenRouter models failed to respond.');
  }
}
