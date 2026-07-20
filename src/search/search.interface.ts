export interface SearchItem {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  publishedDate?: string;
}

export interface SearchResponse {
  query: string;
  provider: string;
  results: SearchItem[];
  executionTimeMs: number;
  cached?: boolean;
}

export interface ISearchProvider {
  name: string;
  search(query: string, limit?: number): Promise<SearchResponse>;
}

export interface SearchLog {
  query: string;
  provider: string;
  executionTimeMs: number;
  cached: boolean;
  success: boolean;
  resultCount: number;
  timestamp: Date;
  error?: string;
}
