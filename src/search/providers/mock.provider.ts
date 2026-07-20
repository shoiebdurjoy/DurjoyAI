import { ISearchProvider, SearchResponse } from '../search.interface';

export class MockSearchProvider implements ISearchProvider {
  public readonly name = 'mock';

  public async search(query: string, limit = 3): Promise<SearchResponse> {
    const startTime = Date.now();

    const mockItems = [
      {
        title: `Latest Live News & Updates for ${query}`,
        url: `https://news.example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Recent coverage and live reports regarding ${query} with up-to-date analysis and details.`,
        source: 'Example News',
        publishedDate: new Date().toISOString().split('T')[0],
      },
      {
        title: `${query} - Official Release & Announcements`,
        url: `https://tech.example.org/topics/${encodeURIComponent(query)}`,
        snippet: `Official announcement notes and latest model specifications for ${query}.`,
        source: 'Tech Insights',
      },
    ];

    const results = mockItems.slice(0, limit);
    const executionTimeMs = Date.now() - startTime;

    return {
      query,
      provider: this.name,
      results,
      executionTimeMs,
    };
  }
}
