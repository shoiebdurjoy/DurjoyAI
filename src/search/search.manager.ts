import { ISearchProvider, SearchResponse, SearchItem, SearchLog } from './search.interface';
import { SearchFactory } from './search.factory';
import { Logger } from '../utils/logger';

export interface CacheEntry {
  response: SearchResponse;
  expiresAt: number;
}

export class SearchManager {
  private cache: Map<string, CacheEntry> = new Map();
  private logs: SearchLog[] = [];
  private readonly cacheTtlMs = 15 * 60 * 1000; // 15 minutes

  constructor(private provider?: ISearchProvider) {}

  private getActiveProvider(): ISearchProvider {
    return this.provider || SearchFactory.getProvider();
  }

  /**
   * Intelligently determines whether a user prompt requires live up-to-date web information.
   *
   * @param prompt User input query string
   * @returns True if live search is required, false otherwise.
   */
  public shouldSearch(prompt: string): boolean {
    if (!prompt || prompt.trim().length === 0) {
      return false;
    }

    const text = prompt.trim().toLowerCase();

    // 1. Never search for math calculations, standard code concepts, user profile/memories
    const staticOrPersonalPatterns = [
      /^(calculate|what is \d+|\d+\s*[+-/*])/i,
      /\b(my name|my favorite|my laptop|my gpu|my university|my degree|what do i study)\b/i,
      /\b(how to loop|syntax in|closure in|what is recursion|what is OOP)\b/i,
      /\b(tell me a joke|say hello|good morning|who created python|capital of)\b/i,
    ];

    if (staticOrPersonalPatterns.some((p) => p.test(text))) {
      return false;
    }

    // 2. Indicators explicitly requiring live search
    const liveSearchPatterns = [
      /\b(news|weather|price|stock price|score|sports score|match score|who won|latest|current|today|today's|live|recent)\b/i,
      /\b(2026|release date|version|recent announcement|breaking news|live update)\b/i,
      /\b(latest ai model|latest model|current price|weather in|temperature in)\b/i,
    ];

    return liveSearchPatterns.some((p) => p.test(text));
  }

  /**
   * Executes a web search query with result deduplication and caching.
   *
   * @param query Search query string
   * @param limit Maximum results to return (default 3)
   * @returns Resolved SearchResponse object
   */
  public async search(query: string, limit = 3): Promise<SearchResponse> {
    const startTime = Date.now();
    const cacheKey = query.trim().toLowerCase();
    const activeProvider = this.getActiveProvider();

    // Check cache
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      const duration = Date.now() - startTime;
      this.logSearch(
        query,
        activeProvider.name,
        duration,
        true,
        true,
        cachedEntry.response.results.length,
      );
      Logger.debug('SearchManager', `Cache hit for search query: '${query}'`);
      return {
        ...cachedEntry.response,
        cached: true,
      };
    }

    try {
      const response = await activeProvider.search(query, limit);
      const duration = Date.now() - startTime;

      // Deduplicate results by URL
      const uniqueMap = new Map<string, SearchItem>();
      response.results.forEach((item) => {
        if (!uniqueMap.has(item.url)) {
          uniqueMap.set(item.url, item);
        }
      });
      const deduplicatedResults = Array.from(uniqueMap.values()).slice(0, limit);

      const finalResponse: SearchResponse = {
        ...response,
        results: deduplicatedResults,
        executionTimeMs: duration,
        cached: false,
      };

      // Store in cache
      this.cache.set(cacheKey, {
        response: finalResponse,
        expiresAt: Date.now() + this.cacheTtlMs,
      });

      this.logSearch(query, activeProvider.name, duration, false, true, deduplicatedResults.length);
      Logger.info(
        'SearchManager',
        `Web search executed via '${activeProvider.name}' in ${duration}ms (${deduplicatedResults.length} results)`,
      );

      return finalResponse;
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : 'Search error occurred';
      this.logSearch(query, activeProvider.name, duration, false, false, 0, errMsg);
      Logger.error('SearchManager', `Web search failed via '${activeProvider.name}'`, errMsg);

      return {
        query,
        provider: activeProvider.name,
        results: [],
        executionTimeMs: duration,
        cached: false,
      };
    }
  }

  /**
   * Formats raw search results into a clean text context block for prompt injection.
   *
   * @param response SearchResponse object
   * @returns Formatted markdown/text string
   */
  public formatSearchResultsForPrompt(response: SearchResponse): string {
    if (!response || response.results.length === 0) {
      return '';
    }

    const items = response.results
      .map(
        (r) =>
          `- Title: ${r.title}\n  Source: ${r.source || 'Web'}\n  URL: ${r.url}\n  Snippet: ${r.snippet}`,
      )
      .join('\n');

    return `LIVE WEB SEARCH RESULTS (Provider: ${response.provider}):\n${items}`;
  }

  /**
   * Records execution metrics internally.
   */
  private logSearch(
    query: string,
    provider: string,
    executionTimeMs: number,
    cached: boolean,
    success: boolean,
    resultCount: number,
    error?: string,
  ): void {
    this.logs.push({
      query,
      provider,
      executionTimeMs,
      cached,
      success,
      resultCount,
      timestamp: new Date(),
      error,
    });

    if (this.logs.length > 100) {
      this.logs.shift();
    }
  }

  /**
   * Retrieves search logs.
   */
  public getLogs(): SearchLog[] {
    return [...this.logs];
  }

  /**
   * Clears in-memory cache for test isolation.
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

export const searchManager = new SearchManager();
