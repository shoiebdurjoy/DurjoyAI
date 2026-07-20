import { ISearchProvider, SearchResponse, SearchItem } from '../search.interface';

export class DuckDuckGoSearchProvider implements ISearchProvider {
  public readonly name = 'duckduckgo';

  public async search(query: string, limit = 5): Promise<SearchResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`DuckDuckGo API responded with status ${res.status}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      const results: SearchItem[] = [];

      if (data.AbstractText && data.AbstractURL) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL,
          snippet: data.AbstractText,
          source: data.AbstractSource || 'DuckDuckGo Abstract',
        });
      }

      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (topic.Text && topic.FirstURL && results.length < limit) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 50),
              url: topic.FirstURL,
              snippet: topic.Text,
              source: 'DuckDuckGo Related Topics',
            });
          }
        }
      }

      // Fallback result if API returns no structured abstract
      if (results.length === 0) {
        results.push({
          title: `Search results for ${query}`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: `Live search query results for '${query}'.`,
          source: 'DuckDuckGo Web',
        });
      }

      return {
        query,
        provider: this.name,
        results: results.slice(0, limit),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : 'Search request failed';
      throw new Error(`DuckDuckGo Search error: ${msg}`);
    }
  }
}
