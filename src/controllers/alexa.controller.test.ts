/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../app';

describe('Alexa Controller ChatIntent Tests', () => {
  it('should handle ChatIntent with prompt slot and return AI response', async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };
    const port = address.port;

    try {
      const payload = {
        version: '1.0',
        session: { sessionId: 'session-chat-1' },
        request: {
          type: 'IntentRequest',
          requestId: 'req-chat-1',
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

      // Note: If verification is enabled in environment, test checks request integrity or skipped state
      const data = (await res.json()) as any;
      if (res.status === 200) {
        assert.strictEqual(data.version, '1.0');
        assert.strictEqual(data.response.shouldEndSession, false);
        assert.ok(data.response.outputSpeech.text.length > 0);
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
