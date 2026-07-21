/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { persistentMemoryService } from './persistent-memory.service';
import { memoryExtractorService } from './memory-extractor.service';

describe('Memory Bug Investigation & Fix Verification Tests', () => {
  it('should classify purchase statement "I bought Alexa version four on seventeenth July" as long-term memory', () => {
    const prompt = 'I bought Alexa version four on seventeenth July.';
    const isRememberable = persistentMemoryService.shouldRemember(prompt);

    assert.strictEqual(
      isRememberable,
      true,
      'Purchase statement must be classified as rememberable memory',
    );
  });

  it('should extract structured Purchase fact from "I bought Alexa version four on seventeenth July."', () => {
    const prompt = 'I bought Alexa version four on seventeenth July.';
    const fact = memoryExtractorService.extractFact(prompt);

    assert.ok(fact, 'Extracted fact must exist');
    assert.strictEqual(fact.shouldRemember, true);
    assert.strictEqual(fact.category, 'Purchase');
    assert.strictEqual(fact.key, 'Alexa Purchase');
    assert.ok(
      fact.value && fact.value.toLowerCase().includes('alexa version four'),
      `Value '${fact?.value}' must contain item details`,
    );
  });

  it('should save purchase fact to SQLite and retrieve it for "When did I buy Alexa?" query', async () => {
    const prompt = 'I bought Alexa version four on seventeenth July.';

    // 1. Analyze and save to SQLite
    const saved = await memoryExtractorService.analyzeAndSave(prompt);
    assert.ok(saved, 'Saved fact should be returned');
    assert.strictEqual(saved.category, 'Purchase');

    // 2. Query memory using "When did I buy Alexa?"
    const query = 'When did I buy Alexa?';
    const memories = await persistentMemoryService.getRelevantMemories(query);

    assert.ok(memories.length > 0, 'Relevant memories must be found for "When did I buy Alexa?"');
    const matched = memories.find((m) => m.category === 'Purchase');
    assert.ok(matched, 'Purchase memory must be retrieved');
    assert.ok(matched.value && matched.value.toLowerCase().includes('alexa version four'));
  });
});
