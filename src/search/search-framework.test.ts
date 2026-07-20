import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SearchManager } from './search.manager';
import { MockSearchProvider } from './providers/mock.provider';
import { SearchFactory } from './search.factory';
import { personalityService } from '../ai/personality.service';
import { aiService } from '../ai/ai.service';

describe('Live Knowledge & Web Intelligence Search Framework Tests', () => {
  const mockProvider = new MockSearchProvider();
  const manager = new SearchManager(mockProvider);

  it('should correctly distinguish queries requiring live search vs static/personal queries', () => {
    // Queries requiring live search
    assert.strictEqual(manager.shouldSearch("What's the weather in Dhaka today?"), true);
    assert.strictEqual(manager.shouldSearch('Latest news on OpenAI 2026'), true);
    assert.strictEqual(manager.shouldSearch('What is the stock price of Apple?'), true);
    assert.strictEqual(manager.shouldSearch('Who won the match score today?'), true);

    // Queries NOT requiring live search
    assert.strictEqual(manager.shouldSearch('Calculate 15 * 8'), false);
    assert.strictEqual(manager.shouldSearch('What is a closure in Javascript?'), false);
    assert.strictEqual(manager.shouldSearch('My favorite color is blue'), false);
    assert.strictEqual(manager.shouldSearch('Tell me a funny joke'), false);
  });

  it('should resolve providers via SearchFactory correctly', () => {
    const provider = SearchFactory.getProvider();
    assert.ok(provider.name !== undefined);
  });

  it('should execute web searches and cache identical queries for fast retrieval', async () => {
    manager.clearCache();

    // First search - Cache Miss
    const res1 = await manager.search('OpenAI latest AI models 2026');
    assert.strictEqual(res1.cached, false);
    assert.ok(res1.results.length > 0);

    // Second search - Cache Hit
    const res2 = await manager.search('OpenAI latest AI models 2026');
    assert.strictEqual(res2.cached, true);
    assert.strictEqual(res2.results.length, res1.results.length);
  });

  it('should deduplicate search results by URL and limit output size', async () => {
    manager.clearCache();
    const res = await manager.search('quantum computing news', 2);
    assert.ok(res.results.length <= 2);

    const urls = res.results.map((r) => r.url);
    const uniqueUrls = new Set(urls);
    assert.strictEqual(urls.length, uniqueUrls.size);
  });

  it('should format search results cleanly for prompt injection', async () => {
    const searchRes = await manager.search('latest news 2026');
    const formatted = manager.formatSearchResultsForPrompt(searchRes);

    assert.ok(formatted.includes('LIVE WEB SEARCH RESULTS'));
    assert.ok(formatted.includes('Title:'));
    assert.ok(formatted.includes('URL:'));
  });

  it('should handle search errors gracefully without crashing', async () => {
    const errorProvider = {
      name: 'error-provider',
      async search(): Promise<never> {
        throw new Error('Network timeout during search');
      },
    };

    const errManager = new SearchManager(errorProvider);
    const result = await errManager.search('broken query');

    assert.strictEqual(result.results.length, 0);
    assert.strictEqual(result.cached, false);
  });

  it('should inject live search context into PersonalityService system prompt', async () => {
    const prompt = await personalityService.getSystemPrompt({
      webSearchContext:
        'LIVE WEB SEARCH RESULTS:\n- Title: OpenAI GPT-5 Released\n  URL: https://example.com',
    });

    assert.ok(prompt.includes('LIVE WEB SEARCH RESULTS:'));
    assert.ok(prompt.includes('OpenAI GPT-5 Released'));
  });

  it('should execute end-to-end AIService completion with automatic live web search', async () => {
    const response = await aiService.generateResponse("What's the weather in London today?", {
      userId: 'test-user-search',
      sessionId: 'test-session-search',
    });

    assert.ok(response.length > 0);
  });
});
