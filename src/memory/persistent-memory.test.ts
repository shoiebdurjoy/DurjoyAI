/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SQLiteMemoryRepository } from './sqlite-memory.repository';
import { PersistentMemoryService } from './persistent-memory.service';

describe('Persistent Memory System Unit & Integration Tests', () => {
  // Use in-memory SQLite database for test isolation
  const repo = new SQLiteMemoryRepository(':memory:');
  const service = new PersistentMemoryService(repo);

  it('should save new memories correctly', async () => {
    const mem1 = await service.saveMemory('Personal', 'University', 'BRAC University', 5);
    assert.strictEqual(mem1.category, 'Personal');
    assert.strictEqual(mem1.key, 'University');
    assert.strictEqual(mem1.value, 'BRAC University');
    assert.strictEqual(mem1.importance, 5);

    const mem2 = await service.saveMemory('Device', 'GPU', 'RTX 5070', 4);
    assert.strictEqual(mem2.key, 'GPU');
    assert.strictEqual(mem2.value, 'RTX 5070');
  });

  it('should handle duplicates by updating existing key values instead of creating duplicate records', async () => {
    // Initial entry
    await service.saveMemory('Preference', 'Favorite Club', 'Barcelona', 3);
    let all = await service.searchMemories('Favorite Club');
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].value, 'Barcelona');

    // Update existing key
    await service.saveMemory('Preference', 'Favorite Club', 'Real Madrid', 4);
    all = await service.searchMemories('Favorite Club');
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].value, 'Real Madrid');
    assert.strictEqual(all[0].importance, 4);
  });

  it('should retrieve memories by key', async () => {
    const mem = await service.getMemoryByKey('GPU', 'Device');
    assert.notStrictEqual(mem, null);
    assert.strictEqual(mem?.value, 'RTX 5070');
  });

  it('should delete memories by ID', async () => {
    const created = await service.saveMemory('Temp', 'TemporaryKey', 'TempValue');
    let found = await service.getMemoryByKey('TemporaryKey');
    assert.notStrictEqual(found, null);

    const deleted = await service.deleteMemory(created.id);
    assert.strictEqual(deleted, true);

    found = await service.getMemoryByKey('TemporaryKey');
    assert.strictEqual(found, null);
  });

  it('should perform keyword search and relevant memory retrieval for prompts', async () => {
    await service.saveMemory('Device', 'Laptop', 'ASUS TUF', 5);

    // Search query for laptop
    const relevant = await service.getRelevantMemories('What laptop do I use for coding?');
    assert.ok(relevant.length > 0);
    assert.strictEqual(relevant[0].key, 'Laptop');
    assert.strictEqual(relevant[0].value, 'ASUS TUF');

    // Query with no matching memories
    const emptyResult = await service.getRelevantMemories('What is the weather in London today?');
    assert.strictEqual(emptyResult.length, 0);
  });

  it('should correctly classify long-term facts vs transient small talk', () => {
    assert.strictEqual(service.shouldRemember('My laptop is an ASUS TUF'), true);
    assert.strictEqual(service.shouldRemember('I study Computer Science'), true);
    assert.strictEqual(service.shouldRemember('My favorite color is blue'), true);

    assert.strictEqual(service.shouldRemember('Hello how are you'), false);
    assert.strictEqual(service.shouldRemember('What is the weather today'), false);
    assert.strictEqual(service.shouldRemember('Tell me a funny joke'), false);
  });
});
