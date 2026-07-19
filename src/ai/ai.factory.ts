import { AIProvider } from './ai.interface';
import { MockProvider } from './providers/mock.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';

export class AIFactory {
  /**
   * Resolves and returns the concrete AI provider instance based on the AI_PROVIDER env variable.
   *
   * @returns An instance implementing the AIProvider interface.
   * @throws Error if an invalid or unsupported provider is requested.
   */
  public static getProvider(): AIProvider {
    const providerType = (process.env.AI_PROVIDER || 'mock').toLowerCase();

    switch (providerType) {
      case 'mock':
        return new MockProvider();
      case 'openai':
        return new OpenAIProvider();
      case 'gemini':
        return new GeminiProvider();
      case 'openrouter':
        return new OpenRouterProvider();
      default:
        throw new Error(
          `Invalid AI provider configuration: "${process.env.AI_PROVIDER}". ` +
            `Supported providers are: 'mock', 'openai', 'gemini', 'openrouter'.`,
        );
    }
  }
}
