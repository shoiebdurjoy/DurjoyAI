import { ISearchProvider } from './search.interface';
import { MockSearchProvider } from './providers/mock.provider';
import { DuckDuckGoSearchProvider } from './providers/duckduckgo.provider';
import { TavilySearchProvider } from './providers/tavily.provider';

export class SearchFactory {
  /**
   * Resolves the active web search provider based on environment variables.
   * Defaults to 'duckduckgo' in production and 'mock' in test mode.
   *
   * @returns ISearchProvider instance.
   */
  public static getProvider(): ISearchProvider {
    const providerName = (process.env.SEARCH_PROVIDER || '').toLowerCase();

    if (process.env.NODE_ENV === 'test' || providerName === 'mock') {
      return new MockSearchProvider();
    }

    if (providerName === 'tavily') {
      return new TavilySearchProvider();
    }

    // Default search provider
    return new DuckDuckGoSearchProvider();
  }
}
