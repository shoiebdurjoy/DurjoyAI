/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../app';

describe('Alexa Controller ChatIntent Tests', () => {
  // Skip verification during controller tests — we test verification separately
  before(() => {
    process.env.SKIP_ALEXA_VERIFICATION = 'true';
  });
  after(() => {
    process.env.SKIP_ALEXA_VERIFICATION = 'false';
  });

  it('should handle ChatIntent with prompt slot and return AI response', async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };
    const port = address.port;

    try {
      const payload = {
        version: '1.0',
        session: {
          sessionId: 'amzn1.echo-api.session.chat-test-1',
          user: { userId: 'test-uid' },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'amzn1.echo-api.request.chat-test-1',
          timestamp: new Date().toISOString(),
          intent: {
            name: 'ChatIntent',
            slots: {
              prompt: {
                name: 'prompt',
                value: 'capital of bangladesh',
              },
            },
          },
        },
      };

      const res = await fetch(`http://localhost:${port}/alexa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.version, '1.0');
      assert.strictEqual(data.response.shouldEndSession, false);
      assert.ok(data.response.outputSpeech);
      assert.ok(data.response.outputSpeech.text.length > 0, 'outputSpeech.text must not be empty');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
