/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isExitIntent, getRandomExitMessage } from '../utils/exit-detector';
import { getRandomReprompt } from '../utils/reprompt-rotator';

describe('Milestone 14.7 — Session Manager & Natural Exit Detection Tests', () => {
  it('should detect natural exit phrases correctly', () => {
    const exitPhrases = [
      'bye',
      'goodbye',
      'see you',
      'talk later',
      'good night',
      'exit',
      'quit',
      'stop',
      'nothing else',
      "that's all",
      'thanks bye',
      'thanks goodbye',
    ];

    for (const phrase of exitPhrases) {
      assert.strictEqual(
        isExitIntent(phrase),
        true,
        `Phrase '${phrase}' must be classified as exit intent`,
      );
    }
  });

  it('should NOT classify normal conversation as exit intent', () => {
    const normalPhrases = [
      'hello',
      'how are you',
      'my favorite color is blue',
      "what's the weather today",
      'i have an exam tomorrow',
      'traffic to university',
    ];

    for (const phrase of normalPhrases) {
      assert.strictEqual(
        isExitIntent(phrase),
        false,
        `Phrase '${phrase}' must NOT be classified as exit intent`,
      );
    }
  });

  it('should return natural goodbye messages on exit', () => {
    const msg = getRandomExitMessage();
    assert.ok(msg, 'Exit message must exist');
    assert.ok(msg.length > 0, 'Exit message must be non-empty');
  });

  it('should dynamically rotate natural reprompt phrases', () => {
    const reprompt1 = getRandomReprompt();
    const reprompt2 = getRandomReprompt();

    assert.ok(reprompt1, 'Reprompt 1 must exist');
    assert.ok(reprompt2, 'Reprompt 2 must exist');
    assert.ok(reprompt1.length > 0);
    assert.ok(reprompt2.length > 0);
  });
});
