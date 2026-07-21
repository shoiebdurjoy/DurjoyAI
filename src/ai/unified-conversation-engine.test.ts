/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { aiService } from './ai.service';
import { persistentMemoryService } from '../memory/persistent-memory.service';
import { memoryExtractorService } from '../memory/memory-extractor.service';

describe('Unified Conversation Engine & Structured Memory Integration Tests', () => {
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

  it('should process natural short utterances without returning blank responses', async () => {
    const utterances = [
      'hello',
      'how are you',
      'thanks',
      'yes',
      'no',
      "it's blue",
      'tomorrow',
      'okay',
      'I have an exam',
      'My laptop is slow',
      'Remember this',
    ];

    for (const text of utterances) {
      const res = await aiService.generateResponse(text, {
        userId: 'test-unified-user',
        sessionId: 'test-unified-session',
      });

      assert.ok(res, `Response for '${text}' must exist`);
      assert.ok(res.trim().length > 0, `Response for '${text}' must not be empty`);
    }
  });

  it('should parse embedded [MEMORY_ACTION: ...] tags from LLM completions and upsert SQLite memory', async () => {
    const mockLLMOutput =
      'Got it! I will remember that your favorite color is blue. [MEMORY_ACTION: Preference|Favorite Color|blue]';

    const cleanSpeech = await memoryExtractorService.processMemoryActionTags(mockLLMOutput);

    assert.strictEqual(
      cleanSpeech,
      'Got it! I will remember that your favorite color is blue.',
      'Memory tag must be stripped from clean spoken text',
    );

    const savedMem = await persistentMemoryService.getMemoryByKey('Favorite Color', 'Preference');
    assert.ok(savedMem, 'Memory record must be saved in SQLite');
    assert.strictEqual(savedMem.value, 'blue');
  });

  it('should perform upsert replacement when updating a memory value', async () => {
    // 1. Initial fact
    await memoryExtractorService.processMemoryActionTags(
      'Got it. [MEMORY_ACTION: Preference|Favorite Color|blue]',
    );
    const mem1 = await persistentMemoryService.getMemoryByKey('Favorite Color', 'Preference');
    assert.strictEqual(mem1?.value, 'blue');

    // 2. Updated fact ("It\'s actually green.")
    await memoryExtractorService.processMemoryActionTags(
      'No problem. I updated your favorite color to green. [MEMORY_ACTION: Preference|Favorite Color|green]',
    );

    const mem2 = await persistentMemoryService.getMemoryByKey('Favorite Color', 'Preference');
    assert.strictEqual(
      mem2?.value,
      'green',
      'Memory value must be replaced in-place without duplicate keys',
    );

    const allMems = await persistentMemoryService.getAllMemories();
    const matches = allMems.filter((m) => m.key.toLowerCase() === 'favorite color');
    assert.strictEqual(
      matches.length,
      1,
      'Should have exactly 1 record for Favorite Color (no duplicates)',
    );
  });

  it('should NOT create memory records for trivial or small talk utterances', () => {
    const trivials = ['thanks', 'lol', 'okay', 'good', 'what time is it', 'hello'];

    for (const text of trivials) {
      const fact = memoryExtractorService.extractFact(text);
      assert.strictEqual(fact?.shouldRemember, false, `Trivial prompt '${text}' must not be saved`);
    }
  });
});
