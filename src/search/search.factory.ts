import { ISearchProvider } from './search.interface';
import { MockSearchProvider } from './providers/mock.provider';
import { DuckDuckGoSearchProvider } from './providers/duckduckgo.provider';
import { TavilySearchProvider } from './providers/tavily.provider';
import { SportsSearchProvider } from './providers/sports.provider';

export class SearchFactory {
  /**
   * Resolves the active web search provider based on environment variables.
   * Defaults to 'duckduckgo'.
   *
   * @returns ISearchProvider instance.
   * @throws Error if mock search provider is requested in production environment.
   */
  public static getProvider(): ISearchProvider {
    const isProd = process.env.NODE_ENV === 'production';
    const providerName = (process.env.SEARCH_PROVIDER || 'duckduckgo').toLowerCase();

    if (isProd && providerName === 'mock') {
      throw new Error('MockSearchProvider is strictly forbidden in production environment.');
    }

    if (providerName === 'sports') {
      return new SportsSearchProvider();
    }

    if (providerName === 'tavily') {
      return new TavilySearchProvider();
    }

    if (providerName === 'mock' && process.env.NODE_ENV === 'test') {
      return new MockSearchProvider();
    }

    return new DuckDuckGoSearchProvider();
  }
}
