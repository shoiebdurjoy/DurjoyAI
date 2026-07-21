import { ISearchProvider, SearchResponse, SearchItem } from '../search.interface';
import { GoogleNewsSearchProvider } from './google-news.provider';
import { Logger } from '../../utils/logger';

export class DuckDuckGoSearchProvider implements ISearchProvider {
  public readonly name = 'duckduckgo';
  private readonly fallbackProvider = new GoogleNewsSearchProvider();

  public async search(query: string, limit = 5): Promise<SearchResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const results: SearchItem[] = [];

        const resultBlockRegex =
          /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>)/gi;

        let match;
        while ((match = resultBlockRegex.exec(html)) !== null && results.length < limit) {
          let rawUrl = match[1];
          const title = match[2].replace(/<[^>]+>/g, '').trim();
          const snippet = (match[3] || match[4] || '').replace(/<[^>]+>/g, '').trim();

          if (rawUrl.includes('uddg=')) {
            const urlMatch = rawUrl.match(/uddg=([^&]+)/);
            if (urlMatch) {
              rawUrl = decodeURIComponent(urlMatch[1]);
            }
          } else if (rawUrl.startsWith('//')) {
            rawUrl = 'https:' + rawUrl;
          }

          if (title && rawUrl && snippet) {
            results.push({
              title,
              url: rawUrl,
              snippet,
              source: 'DuckDuckGo Web',
            });
          }
        }

        if (results.length > 0) {
          return {
            query,
            provider: this.name,
            results: results.slice(0, limit),
            executionTimeMs: Date.now() - startTime,
          };
        }
      }

      // If DuckDuckGo HTML scraping returned 0 results or HTTP 202, use Google News RSS fallback
      Logger.info(
        'DuckDuckGoSearchProvider',
        `DuckDuckGo HTML returned no results for '${query}'. Executing Google News fallback...`,
      );
      const fallbackRes = await this.fallbackProvider.search(query, limit);
      return {
        ...fallbackRes,
        provider: this.name,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : 'DuckDuckGo search error';
      Logger.warn(
        'DuckDuckGoSearchProvider',
        `DuckDuckGo search failed for '${query}'. Executing Google News fallback... Error: ${msg}`,
      );
      try {
        const fallbackRes = await this.fallbackProvider.search(query, limit);
        return {
          ...fallbackRes,
          provider: this.name,
        };
      } catch {
        return {
          query,
          provider: this.name,
          results: [],
          executionTimeMs: Date.now() - startTime,
        };
      }
    }
  }
}
