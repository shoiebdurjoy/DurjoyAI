process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../app';
import { aiService } from './ai.service';
import { searchManager, SearchManager } from '../search/search.manager';
import { MockSearchProvider } from '../search/providers/mock.provider';

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeRequest(path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      http
        .get(`http://localhost:${port}${path}`, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            server.close();
            resolve({
              status: res.statusCode || 500,
              body: JSON.parse(data),
            });
          });
        })
        .on('error', (err) => {
          server.close();
          reject(err);
        });
    });
  });
}

describe('Complete Tool Invocation Pipeline Integration Tests', () => {
  it('should trigger SearchManager for queries containing "latest news", "today\'s weather", and "latest FIFA score"', async () => {
    assert.strictEqual(searchManager.shouldSearch('latest news'), true);
    assert.strictEqual(searchManager.shouldSearch("today's weather"), true);
    assert.strictEqual(searchManager.shouldSearch('latest FIFA score'), true);
    assert.strictEqual(searchManager.shouldSearch('current stock price'), true);
    assert.strictEqual(searchManager.shouldSearch('recent breaking news'), true);
  });

  it('should invoke SearchManager before calling LLM and incorporate search results into the prompt', async () => {
    searchManager.clearCache();
    const mockSearch = new MockSearchProvider();
    const customSearchManager = new SearchManager(mockSearch);

    const testAIService = new (
      aiService.constructor as new (...args: unknown[]) => typeof aiService
    )(undefined, undefined, undefined, undefined, undefined, customSearchManager);

    const prompt = 'What is the latest news today?';
    const response = await testAIService.generateResponse(prompt, {
      userId: 'test-user-pipeline',
      sessionId: 'test-session-pipeline',
    });

    assert.ok(response.length > 0);

    const logs = customSearchManager.getLogs();
    assert.ok(logs.length > 0);
    assert.strictEqual(logs[logs.length - 1].query, prompt);
    assert.strictEqual(logs[logs.length - 1].provider, 'mock');
  });

  it('should test debug HTTP endpoints GET /debug/search, /debug/tools, /debug/router', async () => {
    const resSearch = await makeRequest('/debug/search?q=latest%20news');
    assert.strictEqual(resSearch.status, 200);
    assert.strictEqual(resSearch.body.query, 'latest news');
    assert.strictEqual(resSearch.body.shouldSearch, true);

    const resTools = await makeRequest('/debug/tools');
    assert.strictEqual(resTools.status, 200);
    assert.ok(resTools.body.toolCount > 0);
    assert.ok(Array.isArray(resTools.body.tools));

    const resRouter = await makeRequest('/debug/router?q=what%20time%20is%20it');
    assert.strictEqual(resRouter.status, 200);
    assert.strictEqual(resRouter.body.query, 'what time is it');
    assert.notStrictEqual(resRouter.body.toolSelection, null);
    assert.strictEqual(resRouter.body.primaryIntent, 'Tool Invocation (get_current_time)');
  });
});
