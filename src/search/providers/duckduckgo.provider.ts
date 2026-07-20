import { ISearchProvider, SearchResponse, SearchItem } from '../search.interface';

export class DuckDuckGoSearchProvider implements ISearchProvider {
  public readonly name = 'duckduckgo';

  public async search(query: string, limit = 5): Promise<SearchResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

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

      if (!res.ok) {
        throw new Error(`DuckDuckGo responded with status ${res.status}`);
      }

      const html = await res.text();
      const results: SearchItem[] = [];

      // Regex pattern to extract titles, URLs, and snippets from DuckDuckGo HTML results
      const resultBlockRegex =
        /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>)/gi;

      let match;
      while ((match = resultBlockRegex.exec(html)) !== null && results.length < limit) {
        let rawUrl = match[1];
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        const snippet = (match[3] || match[4] || '').replace(/<[^>]+>/g, '').trim();

        // Extract actual URL if redirected via duckduckgo.com/l/?uddg=
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

      // Secondary fallback regex if the primary result block pattern was strict
      if (results.length === 0) {
        const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(html)) !== null && results.length < limit) {
          let rawUrl = linkMatch[1];
          const title = linkMatch[2].replace(/<[^>]+>/g, '').trim();

          if (rawUrl.includes('uddg=')) {
            const urlMatch = rawUrl.match(/uddg=([^&]+)/);
            if (urlMatch) {
              rawUrl = decodeURIComponent(urlMatch[1]);
            }
          }

          if (title && rawUrl) {
            results.push({
              title,
              url: rawUrl,
              snippet: `Live result for: ${title}`,
              source: 'DuckDuckGo Web',
            });
          }
        }
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
