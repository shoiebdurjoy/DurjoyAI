/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SQLiteMemoryRepository } from './sqlite-memory.repository';
import { PersistentMemoryService } from './persistent-memory.service';

describe('Brain 2 – Self-Improving Memory & Relationship Engine Tests', () => {
  const repo = new SQLiteMemoryRepository(':memory:');
  const service = new PersistentMemoryService(repo);

  it('should establish memory relationships and group parent/child linked memories', async () => {
    // Save laptop device
    const laptop = await service.saveMemory('Device', 'Laptop', 'ASUS TUF', 8);

    // Save GPU & RAM linked to laptop ID
    const gpu = await service.saveMemory('Device', 'GPU', 'RTX 5070', 7, laptop.id);
    const ram = await service.saveMemory('Device', 'RAM', '32GB', 6, laptop.id);

    // Link Laptop parent to GPU & RAM children
    await service.saveMemory('Device', 'Laptop', 'ASUS TUF', 8, undefined, [gpu.id, ram.id]);

    const retrieved = await service.getRelevantMemories('What laptop do I have?');
    assert.ok(retrieved.length >= 2);

    const keys = retrieved.map((m) => m.key);
    assert.ok(keys.includes('Laptop'));
    assert.ok(keys.includes('GPU'));
  });

  it('should resolve conflicts by replacing outdated active facts and archiving history', async () => {
    // Save initial laptop
    const v1 = await service.saveMemory('Device', 'Laptop', 'ASUS TUF', 8);
    assert.strictEqual(v1.value, 'ASUS TUF');

    // Replace with new laptop
    const v2 = await service.saveMemory('Device', 'Laptop', 'Lenovo Legion', 9);
    assert.strictEqual(v2.value, 'Lenovo Legion');

    // Verify current active value is Lenovo Legion
    const active = await service.getMemoryByKey('Laptop', 'Device');
    assert.strictEqual(active?.value, 'Lenovo Legion');

    // Verify archived history contains old ASUS TUF record
    const history = await service.getMemoryHistory(v1.id);
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].oldValue, 'ASUS TUF');
    assert.strictEqual(history[0].newValue, 'Lenovo Legion');
  });

  it('should reinforce confidence and access count when identical facts are repeated', async () => {
    const mem1 = await service.saveMemory('Personal', 'Name', 'Durjoy', 10);
    const initialConf = mem1.confidence;
    const initialAccess = mem1.accessCount;

    // Repeat identical fact
    const mem2 = await service.saveMemory('Personal', 'Name', 'Durjoy', 10);
    assert.ok(mem2.confidence > initialConf);
    assert.ok(mem2.accessCount > initialAccess);
  });

  it('should rank memories according to importance, confidence, and keyword relevance', async () => {
    await service.saveMemory('Personal', 'Name', 'Durjoy', 10);
    await service.saveMemory('Preference', 'Favorite Color', 'Blue', 4);
    await service.saveMemory('Education', 'University', 'BRAC University', 9);

    const ranked = await service.getRelevantMemories('Where do I study?');
    assert.ok(ranked.length > 0);
    assert.strictEqual(ranked[0].key, 'University');
    assert.strictEqual(ranked[0].value, 'BRAC University');
    assert.ok(ranked[0].selectionReason !== undefined);
  });

  it('should safely clean up low-confidence memories without deleting critical owner facts', async () => {
    // Save critical fact
    await service.saveMemory('Personal', 'Name', 'Durjoy', 10);

    // Save low confidence memory
    const lowMem = await service.saveMemory('Custom', 'TempKey', 'TempValue', 2);
    // Manually lower confidence for test
    (repo as any).db
      .prepare('UPDATE persistent_memories SET confidence = 5 WHERE id = ?')
      .run(lowMem.id);

    const deletedCount = await service.cleanupMemories(10);
    assert.ok(deletedCount >= 1);

    const criticalName = await service.getMemoryByKey('Name', 'Personal');
    assert.notStrictEqual(criticalName, null);
    assert.strictEqual(criticalName?.value, 'Durjoy');
  });

  it('should perform fast indexed memory retrieval under scale', async () => {
    const startTime = Date.now();
    for (let i = 0; i < 30; i++) {
      await service.saveMemory('Custom', `Key_${i}`, `Value_${i}`, 5);
    }

    const retrieved = await service.getRelevantMemories('Key_15');
    const duration = Date.now() - startTime;

    assert.ok(retrieved.length > 0);
    assert.ok(duration < 2000, `Bulk retrieval completed in ${duration}ms`);
  });
});
