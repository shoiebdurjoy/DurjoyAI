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
  });

  it('should fall back to safe default when outputSpeech.text would be empty after stripping', () => {
    // All-markdown string that strips to empty
    const res = buildAlexaResponse('**', false);
    assert.ok(
      res.response.outputSpeech?.text && res.response.outputSpeech.text.length > 0,
      'outputSpeech.text must never be empty',
    );
    assert.strictEqual(res.response.outputSpeech?.text, 'How can I help you?');
  });

  it('should generate a valid Alexa LaunchRequest response with fast launch speech', () => {
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
    assert.ok(!res.response.outputSpeech, 'SessionEndedRequest must have no outputSpeech');
  });

  it('should never include reprompt when shouldEndSession is true', () => {
    const res = buildAlexaResponse('Goodbye!', true);
    assert.strictEqual(res.response.shouldEndSession, true);
    assert.ok(!res.response.reprompt, 'No reprompt when ending session');
  });

  it('should include reprompt when shouldEndSession is false and repromptText is given', () => {
    const res = buildAlexaResponse('Here is your answer.', false, 'What else can I help with?');
    assert.strictEqual(res.response.shouldEndSession, false);
    assert.strictEqual(res.response.reprompt?.outputSpeech.text, 'What else can I help with?');
  });
});
