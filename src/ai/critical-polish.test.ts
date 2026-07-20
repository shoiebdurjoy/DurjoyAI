/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeQuery } from '../utils/query-normalizer';
import { aiService } from './ai.service';
import { searchManager } from '../search/search.manager';
import { alexaController } from '../controllers/alexa.controller';

describe('Critical Production Polish & Live Alexa Unit & Integration Tests', () => {
  it('should normalize speech input, typos, misspellings, and missing words', () => {
    assert.strictEqual(normalizeQuery('latest fifa scare'), 'latest fifa score');
    assert.strictEqual(normalizeQuery('latest fipa score'), 'latest fifa score');
    assert.strictEqual(normalizeQuery('fifa tweny six'), 'fifa 2026');
    assert.strictEqual(normalizeQuery('what my age'), 'how old am i');
    assert.strictEqual(normalizeQuery('whats my ag'), 'how old am i');
    assert.strictEqual(normalizeQuery('my fav color'), 'my favorite color');
    assert.strictEqual(normalizeQuery('remeber this'), 'remember this');
    assert.strictEqual(normalizeQuery('todys news'), "today's news");
    assert.strictEqual(normalizeQuery('lates news'), 'latest news');
    assert.strictEqual(normalizeQuery('weathr'), 'weather');
    assert.strictEqual(normalizeQuery('calender'), 'calendar');
    assert.strictEqual(normalizeQuery('remind me tmrw'), 'remind me tomorrow');
  });

  it('should trigger SearchManager for normalized queries with misspellings', () => {
    const q1 = normalizeQuery('lates news');
    assert.strictEqual(searchManager.shouldSearch(q1), true);

    const q2 = normalizeQuery('latest fipa score');
    assert.strictEqual(searchManager.shouldSearch(q2), true);

    const q3 = normalizeQuery('weathr in Dhaka');
    assert.strictEqual(searchManager.shouldSearch(q3), true);
  });

  it('should handle memory queries when empty without hanging or returning empty responses', async () => {
    const res = await aiService.generateResponse('What do you remember about me?', {
      userId: 'test-user-polish-mem',
      sessionId: 'test-session-polish-mem',
    });
    assert.ok(res.length > 0);
    assert.ok(res.includes('remember') || res.includes('know'));
  });

  it('should return 3-word fast launch response for LaunchRequest', async () => {
    let responseData: any;
    const req = {
      body: {
        version: '1.0',
        session: { sessionId: 's-launch' },
        request: { type: 'LaunchRequest', requestId: 'r-launch' },
      },
    } as any;

    const res = {
      status: (code: number) => {
        assert.strictEqual(code, 200);
        return res;
      },
      json: (data: any) => {
        responseData = data;
      },
    } as any;

    await alexaController.handleWebhook(req, res);

    assert.strictEqual(responseData.version, '1.0');
    assert.strictEqual(responseData.response.outputSpeech.text, 'Durjoy AI ready.');
  });
});
