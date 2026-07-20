/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { personalityService } from './personality.service';
import { loadOwnerProfile } from '../profile/owner-profile.loader';
import { aiService } from './ai.service';

describe('Personality Engine Unit & Integration Tests', () => {
  it('should generate a comprehensive system prompt containing personality rules and Brain 0 owner info', async () => {
    await loadOwnerProfile();
    const systemPrompt = await personalityService.getSystemPrompt();

    assert.ok(systemPrompt.includes('You are Durjoy AI, a personal AI assistant.'));
    assert.ok(systemPrompt.includes('Be friendly, confident, and modern.'));
    assert.ok(systemPrompt.includes('Never use markdown formatting'));
    assert.ok(systemPrompt.includes('Owner Name: Durjoy'));
    assert.ok(systemPrompt.includes('BRAC University'));
  });

  it('should include optional context summary when provided', async () => {
    const contextSummary = 'User prefers answers in under 20 words.';
    const systemPrompt = await personalityService.getSystemPrompt({ contextSummary });

    assert.ok(systemPrompt.includes('RELEVANT MEMORY CONTEXT:'));
    assert.ok(systemPrompt.includes('User prefers answers in under 20 words.'));
  });

  it('should request system prompt from PersonalityService during AIService completion', async () => {
    const res = await aiService.generateResponse('Hello Durjoy AI');
    assert.ok(res.length > 0);
  });
});
