/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { persistentMemoryService } from './persistent-memory.service';
import { memoryExtractorService } from './memory-extractor.service';

describe('Master Memory & Free-Form Personal Statement Investigation Tests', () => {
  it('should extract and store all 6 master personal facts into SQLite', async () => {
    const facts = [
      {
        prompt: 'I bought Alexa version four on seventeenth July.',
        query: 'When did I buy Alexa?',
        expectedKey: 'Alexa Purchase',
      },
      {
        prompt: 'I bought a new laptop.',
        query: 'What laptop do I use?',
        expectedKey: 'Laptop Purchase',
      },
      {
        prompt: 'I moved to Uttara.',
        query: 'Where do I live?',
        expectedKey: 'Residence',
      },
      {
        prompt: 'I use Windows 11.',
        query: 'What OS do I use?',
        expectedKey: 'Operating System',
      },
      {
        prompt: 'My favorite football club is Barcelona.',
        query: 'What is my favorite football club?',
        expectedKey: 'Favorite Football Club',
      },
      {
        prompt: 'My passport expires in 2031.',
        query: 'When does my passport expire?',
        expectedKey: 'Passport Expiration',
      },
    ];

    for (const f of facts) {
      // 1. Analyze and save to SQLite
      const saved = await memoryExtractorService.analyzeAndSave(f.prompt);
      assert.ok(saved, `Fact '${f.prompt}' must be extracted and saved`);

      // 2. Query memory
      const retrieved = await persistentMemoryService.getRelevantMemories(f.query);
      assert.ok(retrieved.length > 0, `Relevant memory must be found for query '${f.query}'`);
    }
  });
});
