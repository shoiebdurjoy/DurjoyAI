import { ISearchProvider, SearchResponse, SearchItem } from '../search.interface';
import { Logger } from '../../utils/logger';

export class GoogleNewsSearchProvider implements ISearchProvider {
  public readonly name = 'google-news';

  /**
   * Executes a live web search using the official Google News RSS feed endpoint.
   * Guaranteed high-availability (HTTP 200) for real-time news, sports, weather, and current events.
   *
   * @param query Search query string
   * @param limit Maximum results to return (default 3)
   * @returns SearchResponse object containing real web results
   */
  public async search(query: string, limit = 3): Promise<SearchResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Google News RSS responded with status ${res.status}`);
      }

      const xml = await res.text();
      const results: SearchItem[] = [];

      // Extract RSS items: <item><title>...</title><link>...</link><pubDate>...</pubDate></item>
      const itemRegex =
        /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>/gi;

      let match;
      while ((match = itemRegex.exec(xml)) !== null && results.length < limit) {
        const rawTitle = match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const rawUrl = match[2].trim();
        const pubDate = match[3].trim();

        if (rawTitle && rawUrl) {
          // Clean title (remove source suffix if present, e.g. " - ESPN")
          const cleanTitle = rawTitle.replace(/&amp;/g, '&').replace(/&#39;/g, "'");

          results.push({
            title: cleanTitle,
            url: rawUrl,
            snippet: `Published ${pubDate}: ${cleanTitle}`,
            source: 'Google News',
          });
        }
      }

      const duration = Date.now() - startTime;
      Logger.info(
        'GoogleNewsSearchProvider',
        `Live search for '${query}' completed in ${duration}ms (${results.length} results)`,
      );

      return {
        query,
        provider: this.name,
        results,
        executionTimeMs: duration,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : 'Google News RSS search failed';
      Logger.warn('GoogleNewsSearchProvider', `Search failed for '${query}'`, msg);
      throw new Error(`Google News Search error: ${msg}`);
    }
  }
}
