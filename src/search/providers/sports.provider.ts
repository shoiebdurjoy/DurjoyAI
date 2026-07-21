import { ISearchProvider, SearchResponse, SearchItem } from '../search.interface';
import { Logger } from '../../utils/logger';

export interface SportsMatch {
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  status: string;
  date: string;
}

export class SportsSearchProvider implements ISearchProvider {
  public readonly name = 'sports';

  // Map of common sports keywords to ESPN API endpoint paths
  private readonly espnEndpoints: Array<{ keywords: RegExp; path: string; compName: string }> = [
    {
      keywords: /\b(fifa|world cup|international)\b/i,
      path: 'soccer/fifa.world',
      compName: 'FIFA World Cup',
    },
    {
      keywords: /\b(premier league|epl|england)\b/i,
      path: 'soccer/eng.1',
      compName: 'English Premier League',
    },
    {
      keywords: /\b(champions league|ucl|uefa)\b/i,
      path: 'soccer/uefa.champions',
      compName: 'UEFA Champions League',
    },
    {
      keywords: /\b(la liga|laliga|spain|barcelona|real madrid)\b/i,
      path: 'soccer/esp.1',
      compName: 'Spanish LALIGA',
    },
    {
      keywords: /\b(bundesliga|germany|bayern)\b/i,
      path: 'soccer/ger.1',
      compName: 'German Bundesliga',
    },
    {
      keywords: /\b(serie a|italy|juventus|inter|milan)\b/i,
      path: 'soccer/ita.1',
      compName: 'Italian Serie A',
    },
    {
      keywords: /\b(europa league|europa)\b/i,
      path: 'soccer/uefa.europa',
      compName: 'UEFA Europa League',
    },
    {
      keywords: /\b(cricket|odi|t20|ipl|bangladesh)\b/i,
      path: 'cricket/15473',
      compName: 'International Cricket',
    },
    {
      keywords: /\b(nba|basketball)\b/i,
      path: 'basketball/nba',
      compName: 'NBA',
    },
    {
      keywords: /\b(nfl|american football)\b/i,
      path: 'football/nfl',
      compName: 'NFL',
    },
  ];

  /**
   * Executes a structured live sports score search via ESPN APIs.
   *
   * @param query Search query string
   * @param limit Maximum results to return (default 3)
   * @returns SearchResponse with structured sports results
   */
  public async search(query: string, limit = 3): Promise<SearchResponse> {
    const startTime = Date.now();
    const text = query.trim().toLowerCase();

    // Determine target ESPN endpoints
    const matchedEndpoints = this.espnEndpoints.filter((ep) => ep.keywords.test(text));
    const endpointsToFetch =
      matchedEndpoints.length > 0 ? matchedEndpoints : [this.espnEndpoints[0]];

    const results: SearchItem[] = [];

    for (const ep of endpointsToFetch) {
      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/${ep.path}/scoreboard`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await res.json();
        const compName = data?.leagues?.[0]?.name || ep.compName;
        const events = data?.events || [];

        for (const ev of events) {
          if (results.length >= limit) break;

          const matchDate = ev.date || new Date().toISOString();
          const statusDetail =
            ev.status?.type?.detail || ev.status?.type?.description || 'Scheduled';
          const competition = ev.competitions?.[0];

          if (competition) {
            const home = competition.competitors?.find((c: any) => c.homeAway === 'home');
            const away = competition.competitors?.find((c: any) => c.homeAway === 'away');

            const homeName = home?.team?.displayName || home?.team?.name || 'Home';
            const awayName = away?.team?.displayName || away?.team?.name || 'Away';
            const homeScore = home?.score ?? '0';
            const awayScore = away?.score ?? '0';

            const title = `${compName}: ${homeName} ${homeScore} - ${awayScore} ${awayName}`;
            const snippet = `[Status: ${statusDetail}] Match: ${homeName} (${homeScore}) vs ${awayName} (${awayScore}). Competition: ${compName}. Date: ${matchDate}.`;
            const webUrl =
              competition.links?.[0]?.href || `https://www.espn.com/soccer/match/_/gameId/${ev.id}`;

            results.push({
              title,
              url: webUrl,
              snippet,
              source: `ESPN ${compName}`,
            });
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'ESPN fetch error';
        Logger.warn('SportsSearchProvider', `Failed fetching ESPN endpoint '${ep.path}'`, msg);
      }
    }

    const duration = Date.now() - startTime;
    Logger.info(
      'SportsSearchProvider',
      `Live sports search for '${query}' completed in ${duration}ms (${results.length} matches found)`,
    );

    return {
      query,
      provider: this.name,
      results,
      executionTimeMs: duration,
    };
  }
}
