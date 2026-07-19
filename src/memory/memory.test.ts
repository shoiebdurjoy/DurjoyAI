/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { profileService } from './profile.service';
import { sessionService } from './session.service';
import { memoryService } from './memory.service';
import { memoryRepository } from './memory.repository';

describe('Durjoy AI Memory Module Integration Tests', () => {
  const testUserId = 'test-user-123';
  const testSessionId = 'test-session-456';

  it('should successfully get or create user profile and save custom facts', async () => {
    // Clear initial state
    await memoryRepository.clearMemory(testUserId);

    const profile = await profileService.getOrCreateProfile(testUserId, 'Test User');
    assert.strictEqual(profile.userId, testUserId);
    assert.strictEqual(profile.displayName, 'Test User');
    assert.strictEqual(profile.customFacts.length, 0);

    const updatedProfile = await profileService.addCustomFact(testUserId, 'Likes computer science');
    assert.strictEqual(updatedProfile.customFacts.length, 1);
    assert.strictEqual(updatedProfile.customFacts[0], 'Likes computer science');
  });

  it('should successfully record conversation history and retrieve sessions', async () => {
    const session = await sessionService.getOrCreateSession(testUserId, testSessionId);
    assert.strictEqual(session.messages.length, 0);

    await sessionService.appendMessage(testUserId, testSessionId, 'user', 'Hello Durjoy');
    const updatedSession = await sessionService.appendMessage(
      testUserId,
      testSessionId,
      'assistant',
      'Hey there!',
    );

    assert.strictEqual(updatedSession.messages.length, 2);
    assert.strictEqual(updatedSession.messages[0].content, 'Hello Durjoy');
    assert.strictEqual(updatedSession.messages[1].content, 'Hey there!');

    const sessions = await memoryRepository.getConversationSessions(testUserId);
    assert.strictEqual(sessions.length, 1);
    assert.strictEqual(sessions[0].sessionId, testSessionId);
  });

  it('should manage long-term preferences and habits', async () => {
    await memoryService.addPreference(testUserId, 'Prefers brief answers');
    await memoryService.addHabit(testUserId, 'Wakes up at 8 AM');
    await memoryService.addFact(testUserId, 'Works as software developer');

    const summary = await memoryService.getContextSummary(testUserId);
    assert.ok(summary.includes('Prefers brief answers'));
    assert.ok(summary.includes('Wakes up at 8 AM'));
    assert.ok(summary.includes('Works as software developer'));
  });
});
