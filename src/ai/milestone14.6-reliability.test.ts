/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { aiService } from './ai.service';
import { persistentMemoryService } from '../memory/persistent-memory.service';
import { memoryExtractorService } from '../memory/memory-extractor.service';
import { locationResolverService } from '../profile/location-resolver.service';

describe('Milestone Universal Alexa NLP Routing & Reliability Test Suite', () => {
  before(() => {
    process.env.NODE_ENV = 'test';
    process.env.AI_PROVIDER = 'mock';
    process.env.SEARCH_PROVIDER = 'mock';
  });

  after(() => {
    process.env.NODE_ENV = 'production';
    process.env.AI_PROVIDER = 'openrouter';
    process.env.SEARCH_PROVIDER = 'duckduckgo';
  });

  it('should test all 19 natural conversational prompts end-to-end without crashes or blank responses', async () => {
    const testPrompts = [
      'Hello',
      'Hi',
      'How are you',
      'Good morning',
      'Fuck you',
      "It's blue",
      'Actually green',
      'Tomorrow',
      'Yes',
      'No',
      'Maybe',
      'I have an exam',
      'Tell me a joke',
      'Who won yesterday',
      'Will it rain?',
      'Traffic to university',
      'Remind me to study',
      'My laptop is broken',
      "I'm tired",
    ];

    for (const prompt of testPrompts) {
      const res = await aiService.generateResponse(prompt, {
        userId: 'm-nlp-test-user',
        sessionId: 'm-nlp-test-session',
      });

      assert.ok(res, `Response for '${prompt}' must be non-null`);
      assert.ok(res.trim().length > 0, `Response for '${prompt}' must be non-empty`);
      assert.ok(
        !res.includes('[MEMORY_ACTION:'),
        `Response for '${prompt}' must not contain unstripped memory tags`,
      );
    }
  });

  it('should parse short color updates like "its blue" or "it\'s green" and save to SQLite memory', async () => {
    await memoryExtractorService.analyzeAndSave('its blue');
    const mem = await persistentMemoryService.getMemoryByKey('Favorite Color', 'Preference');
    assert.ok(mem, 'Memory for Favorite Color must exist after saying "its blue"');
    assert.strictEqual(mem.value, 'blue');

    await memoryExtractorService.analyzeAndSave("it's green");
    const mem2 = await persistentMemoryService.getMemoryByKey('Favorite Color', 'Preference');
    assert.strictEqual(mem2?.value, 'green');
  });

  it('should expand weather queries like "will it rain" to Uttara Dhaka Bangladesh', async () => {
    const expanded = await locationResolverService.expandSearchQuery('Will it rain?');
    assert.ok(expanded.includes('Uttara'), 'Expanded weather query must include Uttara');
    assert.ok(expanded.includes('Dhaka'), 'Expanded weather query must include Dhaka');
  });

  it('should NOT save uncertain statements into memory', () => {
    const uncertainPrompts = [
      'Maybe my favorite color is yellow',
      'I think I might live in Uttara',
      'Perhaps I study computer science',
      'I guess my GPU is RTX 3060',
    ];

    for (const p of uncertainPrompts) {
      const result = persistentMemoryService.shouldRemember(p);
      assert.strictEqual(
        result,
        false,
        `Uncertain statement '${p}' must NOT be marked for long-term memory`,
      );
    }
  });

  it('should NOT save casual greetings or profanity into memory', () => {
    const casualPrompts = [
      'hello',
      'hi',
      'thanks',
      'okay',
      'yes',
      'no',
      'cool',
      'lol',
      'haha',
      'bye',
      'good morning',
      'fuck you',
    ];

    for (const p of casualPrompts) {
      const result = persistentMemoryService.shouldRemember(p);
      assert.strictEqual(result, false, `Casual prompt '${p}' must NOT be marked for memory`);
    }
  });
});
