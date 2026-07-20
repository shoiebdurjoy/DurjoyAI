/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildAlexaResponse, buildAlexaEmptyResponse, stripMarkdown } from './alexa-response';

describe('Alexa Response Helper Unit Tests', () => {
  it('should strip markdown formatting correctly', () => {
    const raw = '# Title\n**Bold** text, *italic* word, `code` and [link](https://example.com)';
    const clean = stripMarkdown(raw);
    assert.strictEqual(clean, 'Title\nBold text, italic word, code and link');
  });

  it('should strip markdown automatically inside buildAlexaResponse', () => {
    const rawSpeech = 'Python was created by **Guido van Rossum** in `1991`.';
    const res = buildAlexaResponse(rawSpeech, false);

    assert.strictEqual(
      res.response.outputSpeech?.text,
      'Python was created by Guido van Rossum in 1991.',
    );
    assert.strictEqual(
      res.response.reprompt?.outputSpeech.text,
      'Python was created by Guido van Rossum in 1991.',
    );
  });

  it('should generate a valid Alexa LaunchRequest response schema with reprompt and sessionAttributes', () => {
    const res = buildAlexaResponse('Durjoy AI ready.', false, 'How can I help?');

    assert.strictEqual(res.version, '1.0');
    assert.deepStrictEqual(res.sessionAttributes, {});
    assert.strictEqual(res.response.shouldEndSession, false);
    assert.strictEqual(res.response.outputSpeech?.type, 'PlainText');
    assert.strictEqual(res.response.outputSpeech?.text, 'Durjoy AI ready.');
    assert.strictEqual(res.response.reprompt?.outputSpeech.type, 'PlainText');
    assert.strictEqual(res.response.reprompt?.outputSpeech.text, 'How can I help?');
  });

  it('should generate a valid empty response for SessionEndedRequest', () => {
    const res = buildAlexaEmptyResponse();
    assert.strictEqual(res.version, '1.0');
    assert.deepStrictEqual(res.sessionAttributes, {});
    assert.strictEqual(res.response.shouldEndSession, true);
  });
});
