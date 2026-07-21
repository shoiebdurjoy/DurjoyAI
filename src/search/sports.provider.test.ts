import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SportsSearchProvider } from './providers/sports.provider';
import { searchManager } from './search.manager';

describe('Sports Search Provider & Routing Unit Tests', () => {
  const sportsProvider = new SportsSearchProvider();

  it('should identify sports queries accurately in SearchManager', () => {
    assert.strictEqual(searchManager.isSportsQuery('latest FIFA score'), true);
    assert.strictEqual(searchManager.isSportsQuery('final FIFA score'), true);
    assert.strictEqual(searchManager.isSportsQuery('Barcelona score'), true);
    assert.strictEqual(searchManager.isSportsQuery('Bangladesh cricket score'), true);
    assert.strictEqual(searchManager.isSportsQuery("today's matches"), true);
    assert.strictEqual(searchManager.isSportsQuery('weather today'), false);
    assert.strictEqual(searchManager.isSportsQuery('latest world news'), false);
  });

  it('should execute SportsSearchProvider and return structured score data', async () => {
    const res = await sportsProvider.search('latest FIFA score', 3);
    assert.strictEqual(res.provider, 'sports');
    assert.ok(Array.isArray(res.results));
    if (res.results.length > 0) {
      assert.ok(res.results[0].title.length > 0);
      assert.ok(res.results[0].snippet.includes('Status:'));
    }
  });

  it('should route sports queries through SearchManager using sports provider', async () => {
    const res = await searchManager.search('latest FIFA score', 3);
    assert.strictEqual(res.provider, 'sports');
    assert.ok(res.results.length > 0);
    assert.ok(!res.results[0].snippet.includes("I don't have real-time scores"));
  });
});
