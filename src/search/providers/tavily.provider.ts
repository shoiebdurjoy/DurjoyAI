import { ISearchProvider, SearchResponse, SearchItem } from '../search.interface';

export class TavilySearchProvider implements ISearchProvider {
  public readonly name = 'tavily';

  public async search(query: string, limit = 5): Promise<SearchResponse> {
    const startTime = Date.now();
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      throw new Error('Tavily API key missing. Set TAVILY_API_KEY environment variable.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: limit,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Tavily API returned status ${res.status}`);
      }

      const data = (await res.json()) as Record<string, unknown>;
      const rawResults = (data.results || []) as Array<Record<string, unknown>>;

      const results: SearchItem[] = rawResults.map((r) => ({
        title: (r.title as string) || query,
        url: r.url as string,
        snippet: (r.content as string) || (r.snippet as string) || '',
        source: 'Tavily Search',
      }));

      return {
        query,
        provider: this.name,
        results,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : 'Tavily search request failed';
      throw new Error(`Tavily Search error: ${msg}`);
    }
  }
}
