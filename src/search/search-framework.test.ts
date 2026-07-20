/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SearchManager } from './search.manager';
import { SearchFactory } from './search.factory';
import { MockSearchProvider } from './providers/mock.provider';
import { DuckDuckGoSearchProvider } from './providers/duckduckgo.provider';
import { TavilySearchProvider } from './providers/tavily.provider';
import { personalityService } from '../ai/personality.service';
import { aiService } from '../ai/ai.service';

describe('Live Knowledge & Web Intelligence Search Framework Tests', () => {
  const mockProvider = new MockSearchProvider();
  const manager = new SearchManager(mockProvider);

  it('should correctly distinguish queries requiring live search vs static/personal queries', () => {
    assert.strictEqual(manager.shouldSearch("What's the weather in London today?"), true);
    assert.strictEqual(manager.shouldSearch('latest AI models 2026'), true);
    assert.strictEqual(manager.shouldSearch('who won the match today'), true);
    assert.strictEqual(manager.shouldSearch('current price of bitcoin'), true);

    // Static/Personal queries should return false
    assert.strictEqual(manager.shouldSearch('What is my laptop model?'), false);
    assert.strictEqual(manager.shouldSearch('calculate 15 + 25'), false);
    assert.strictEqual(manager.shouldSearch('How to write a loop in JavaScript?'), false);
    assert.strictEqual(manager.shouldSearch('tell me a joke'), false);
  });

  it('should resolve providers via SearchFactory correctly', () => {
    process.env.SEARCH_PROVIDER = 'duckduckgo';
    const ddg = SearchFactory.getProvider();
    assert.ok(ddg instanceof DuckDuckGoSearchProvider);

    process.env.SEARCH_PROVIDER = 'tavily';
    const tavily = SearchFactory.getProvider();
    assert.ok(tavily instanceof TavilySearchProvider);

    process.env.SEARCH_PROVIDER = 'mock';
    const mock = SearchFactory.getProvider();
    assert.ok(mock instanceof MockSearchProvider);

    delete process.env.SEARCH_PROVIDER;
  });

  it('should execute web searches and cache identical queries for fast retrieval', async () => {
    manager.clearCache();
    const res1 = await manager.search('latest tech news');
    assert.strictEqual(res1.cached, false);
    assert.strictEqual(res1.results.length, 2);

    const res2 = await manager.search('latest tech news');
    assert.strictEqual(res2.cached, true);
    assert.strictEqual(res2.results.length, 2);
  });

  it('should deduplicate search results by URL and limit output size', async () => {
    const res = await manager.search('duplicate test', 2);
    assert.ok(res.results.length <= 2);
  });

  it('should format search results cleanly for prompt injection', async () => {
    const res = await manager.search('formatting test');
    const formatted = manager.formatSearchResultsForPrompt(res);

    assert.ok(formatted.includes('LIVE WEB SEARCH RESULTS'));
    assert.ok(formatted.includes('Snippet:'));
  });

  it('should handle search errors gracefully without crashing', async () => {
    const errorProvider = {
      name: 'error-provider',
      search: async () => {
        throw new Error('Network timeout during search');
      },
    };
    const errManager = new SearchManager(errorProvider);
    const res = await errManager.search('failing search');

    assert.strictEqual(res.results.length, 0);
  });

  it('should inject live search context into PersonalityService system prompt', async () => {
    const searchRes = await manager.search('weather today');
    const webSearchContext = manager.formatSearchResultsForPrompt(searchRes);

    const systemPrompt = await personalityService.getSystemPrompt({ webSearchContext });

    assert.ok(systemPrompt.includes('LIVE WEB SEARCH RESULTS'));
    assert.ok(systemPrompt.includes('Instructions: Use the search data above accurately.'));
  });

  it('should execute end-to-end AIService completion with automatic live web search', async () => {
    const res = await aiService.generateResponse("What's the weather in London today?");
    assert.ok(res.length > 0);
  });
});
