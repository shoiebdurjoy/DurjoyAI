/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../app';

describe('Health Routes Integration Tests', () => {
  it('should return 200 OK and expected JSON payload for both /health and /api/health', async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };
    const port = address.port;

    try {
      // 1. Test GET /health
      const res1 = await fetch(`http://localhost:${port}/health`);
      assert.strictEqual(res1.status, 200);
      const data1 = (await res1.json()) as { status: string; message: string };
      assert.strictEqual(data1.status, 'ok');
      assert.strictEqual(data1.message, 'Durjoy AI backend is running');

      // 2. Test GET /api/health
      const res2 = await fetch(`http://localhost:${port}/api/health`);
      assert.strictEqual(res2.status, 200);
      const data2 = (await res2.json()) as { status: string; message: string };
      assert.strictEqual(data2.status, 'ok');
      assert.strictEqual(data2.message, 'Durjoy AI backend is running');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
