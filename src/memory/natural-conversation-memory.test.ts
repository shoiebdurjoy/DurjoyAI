/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SQLiteMemoryRepository } from './sqlite-memory.repository';
import { PersistentMemoryService } from './persistent-memory.service';
import { MemoryExtractorService } from './memory-extractor.service';
import { aiService } from '../ai/ai.service';
import { personalityService } from '../ai/personality.service';
import { sessionService } from './session.service';

describe('Natural Conversation & Automatic Memory Learning Tests', () => {
  const repo = new SQLiteMemoryRepository(':memory:');
  const memoryService = new PersistentMemoryService(repo);
  const extractor = new MemoryExtractorService(memoryService);

  it('should automatically extract and save important long-term facts', async () => {
    const saved1 = await extractor.analyzeAndSave('My favorite football club is Real Madrid.');
    assert.notStrictEqual(saved1, null);
    assert.strictEqual(saved1?.category, 'Preference');
    assert.strictEqual(saved1?.key, 'Favorite Football Club');
    assert.strictEqual(saved1?.value, 'Real Madrid');

    const saved2 = await extractor.analyzeAndSave('I study Computer Science at BRAC University.');
    assert.notStrictEqual(saved2, null);
    assert.strictEqual(saved2?.category, 'Education');
    assert.strictEqual(saved2?.key, 'University');
    assert.strictEqual(saved2?.value, 'BRAC University');
  });

  it('should ignore transient small talk, food items, and weather requests', async () => {
    const ignored1 = await extractor.analyzeAndSave('I ate pizza today for lunch.');
    assert.strictEqual(ignored1, null);

    const ignored2 = await extractor.analyzeAndSave('What is the weather in Dhaka today?');
    assert.strictEqual(ignored2, null);
  });

  it('should update existing memory when new information replaces old data', async () => {
    await extractor.analyzeAndSave('My laptop is an ASUS TUF.');
    let mem = await memoryService.getMemoryByKey('Laptop', 'Device');
    assert.strictEqual(mem?.value, 'ASUS TUF');

    // Update with new laptop
    await extractor.analyzeAndSave('My laptop is a Lenovo Legion.');
    mem = await memoryService.getMemoryByKey('Laptop', 'Device');
    assert.strictEqual(mem?.value, 'Lenovo Legion');
  });

  it('should increase memory confidence when identical facts are confirmed or repeated', async () => {
    const first = await memoryService.saveMemory('Device', 'GPU', 'RTX 5070', 4);
    assert.strictEqual(first.confidence, 50);

    const second = await memoryService.saveMemory('Device', 'GPU', 'RTX 5070', 4);
    assert.strictEqual(second.confidence, 60);
  });

  it('should maintain short-term session conversation history for multi-turn dialogue', async () => {
    const testUser = 'user-multiturn';
    const testSession = 'session-multiturn';

    await sessionService.appendMessage(testUser, testSession, 'user', 'I bought a new laptop.');
    await sessionService.appendMessage(
      testUser,
      testSession,
      'assistant',
      'Awesome! What specs does it have?',
    );
    await sessionService.appendMessage(testUser, testSession, 'user', 'It has 32GB RAM.');

    const summary = await sessionService.getRecentHistorySummary(testUser, testSession);
    assert.ok(summary.includes('User: I bought a new laptop.'));
    assert.ok(summary.includes('Assistant: Awesome! What specs does it have?'));
    assert.ok(summary.includes('User: It has 32GB RAM.'));
  });

  it('should assemble unified system prompt containing Personality + Relevant Memories + Recent History', async () => {
    const prompt = await personalityService.getSystemPrompt({
      contextSummary: '- Device | Laptop: Lenovo Legion',
      conversationContext: 'User: What GPU does it have?\nAssistant: Checking specs...',
    });

    assert.ok(prompt.includes('Durjoy AI'));
    assert.ok(prompt.includes('RELEVANT MEMORY CONTEXT:'));
    assert.ok(prompt.includes('Device | Laptop: Lenovo Legion'));
    assert.ok(prompt.includes('RECENT DIALOGUE:'));
    assert.ok(prompt.includes('User: What GPU does it have?'));
  });

  it('should execute end-to-end AIService completion with automatic memory learning', async () => {
    const response = await aiService.generateResponse('My favorite color is blue.', {
      userId: 'test-user-e2e',
      sessionId: 'test-session-e2e',
    });

    assert.ok(response.length > 0);
  });
});
