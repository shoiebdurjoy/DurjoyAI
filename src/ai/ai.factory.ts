import { AIProvider } from './ai.interface';
import { MockProvider } from './providers/mock.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';

export class AIFactory {
  /**
   * Resolves and returns the concrete AI provider instance based on the AI_PROVIDER env variable.
   * Defaults to 'openrouter' in production/development, and 'mock' in test mode.
   *
   * @returns An instance implementing the AIProvider interface.
   * @throws Error if mock provider is requested in production environment.
   */
  public static getProvider(): AIProvider {
    const isProd = process.env.NODE_ENV === 'production';
    const defaultProvider = process.env.NODE_ENV === 'test' ? 'mock' : 'openrouter';
    const providerType = (process.env.AI_PROVIDER || defaultProvider).toLowerCase();

    if (isProd && providerType === 'mock') {
      throw new Error('MockAIProvider is strictly forbidden in production environment.');
    }

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
            `Supported providers are: 'openrouter', 'gemini', 'openai', 'mock'.`,
        );
    }
  }
}
