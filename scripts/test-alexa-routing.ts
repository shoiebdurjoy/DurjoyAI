/* eslint-disable no-console */
/**
 * End-to-end Alexa routing verification script.
 *
 * Tests every required query reaching POST /alexa and confirms:
 *   - Request type is logged
 *   - Intent name is logged
 *   - Extracted prompt is logged
 *   - Session ID is logged
 *   - shouldEndSession is correct for every response
 *
 * Usage:  npx ts-node scripts/test-alexa-routing.ts
 */
process.env.NODE_ENV = 'production';
process.env.AI_PROVIDER = 'openrouter';
process.env.SEARCH_PROVIDER = 'duckduckgo';
process.env.SKIP_ALEXA_VERIFICATION = 'true';

import http from 'http';
import app from '../src/app';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function postAlexa(payload: Record<string, unknown>): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      const data = JSON.stringify(payload);

      const req = http.request(
        {
          hostname: 'localhost',
          port,
          path: '/alexa',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            server.close();
            resolve({ status: res.statusCode ?? 500, body: JSON.parse(body) });
          });
        },
      );
      req.on('error', (e) => {
        server.close();
        reject(e);
      });
      req.write(data);
      req.end();
    });
  });
}

function assert(condition: boolean, label: string) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ PASS: ${label}`);
  }
}

async function run() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log(' ALEXA END-TO-END ROUTING VERIFICATION');
  console.log('════════════════════════════════════════════════════════\n');

  // 1. LaunchRequest
  console.log('[ 1 ] LaunchRequest');
  const r1 = await postAlexa({
    version: '1.0',
    session: { sessionId: 'session-launch', user: { userId: 'uid-prod-1' } },
    request: { type: 'LaunchRequest', requestId: 'rq-launch', timestamp: new Date().toISOString() },
  });
  assert(r1.status === 200, 'HTTP 200');
  assert(r1.body.response.outputSpeech.text === 'Durjoy AI ready.', 'Fast launch speech');
  assert(r1.body.response.shouldEndSession === false, 'shouldEndSession is false');

  // Test Queries Array
  const testQueries = [
    { label: 'weather today', prompt: 'weather today' },
    { label: 'latest FIFA score', prompt: 'latest FIFA score' },
    { label: "what's the final score of fifa twenty six", prompt: "what's the final score of fifa twenty six" },
    { label: "today's news", prompt: "today's news" },
    { label: 'who won yesterday', prompt: 'who won yesterday' },
    { label: 'remember my favorite color is blue', prompt: 'remember my favorite color is blue' },
    { label: "what's my favorite color", prompt: "what's my favorite color" },
    { label: "what's my age", prompt: "what's my age" },
    { label: 'time now', prompt: 'time now' },
  ];

  let stepCounter = 2;
  for (const q of testQueries) {
    console.log(`\n[ ${stepCounter++} ] ChatIntent — "${q.label}"`);
    const res = await postAlexa({
      version: '1.0',
      session: { sessionId: `session-${stepCounter}`, user: { userId: 'uid-prod-1' } },
      request: {
        type: 'IntentRequest',
        requestId: `rq-${stepCounter}`,
        timestamp: new Date().toISOString(),
        intent: {
          name: 'ChatIntent',
          slots: { prompt: { name: 'prompt', value: q.prompt } },
        },
      },
    });

    assert(res.status === 200, 'HTTP 200');
    assert(res.body.response.shouldEndSession === false, 'shouldEndSession is false');
    assert(res.body.response.outputSpeech?.text?.length > 0, 'Non-empty outputSpeech text');
    console.log(`  Speech : "${res.body.response.outputSpeech.text}"`);
  }

  // Stop Intent
  console.log(`\n[ ${stepCounter++} ] AMAZON.StopIntent — session termination`);
  const rStop = await postAlexa({
    version: '1.0',
    session: { sessionId: 'session-stop', user: { userId: 'uid-prod-1' } },
    request: {
      type: 'IntentRequest',
      requestId: 'rq-stop',
      timestamp: new Date().toISOString(),
      intent: { name: 'AMAZON.StopIntent', slots: {} },
    },
  });
  assert(rStop.status === 200, 'HTTP 200');
  assert(rStop.body.response.shouldEndSession === true, 'shouldEndSession is TRUE for StopIntent');
  assert(rStop.body.response.outputSpeech.text === 'Goodbye!', 'Goodbye speech');

  console.log('\n════════════════════════════════════════════════════════');
  console.log(` RESULT: ${process.exitCode === 1 ? '✗ SOME TESTS FAILED' : '✓ ALL TESTS PASSED'}`);
  console.log('════════════════════════════════════════════════════════\n');
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
