/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildAlexaResponse, buildAlexaEmptyResponse } from './alexa-response';

describe('Alexa Response Helper Unit Tests', () => {
  it('should generate a valid Alexa LaunchRequest response schema with reprompt and sessionAttributes', () => {
    const res = buildAlexaResponse(
      "Yo! I'm Durjoy AI. What's up? What can I help you with today?",
      false,
      'What can I help you with today?',
    );

    assert.strictEqual(res.version, '1.0');
    assert.deepStrictEqual(res.sessionAttributes, {});
    assert.strictEqual(res.response.shouldEndSession, false);
    assert.strictEqual(res.response.outputSpeech?.type, 'PlainText');
    assert.strictEqual(
      res.response.outputSpeech?.text,
      "Yo! I'm Durjoy AI. What's up? What can I help you with today?",
    );
    assert.strictEqual(res.response.reprompt?.outputSpeech.type, 'PlainText');
    assert.strictEqual(res.response.reprompt?.outputSpeech.text, 'What can I help you with today?');
  });

  it('should generate a valid empty response for SessionEndedRequest', () => {
    const res = buildAlexaEmptyResponse();
    assert.strictEqual(res.version, '1.0');
    assert.deepStrictEqual(res.sessionAttributes, {});
    assert.strictEqual(res.response.shouldEndSession, true);
  });
});
