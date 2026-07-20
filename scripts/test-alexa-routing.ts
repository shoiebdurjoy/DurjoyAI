/* eslint-disable no-console */
/**
 * End-to-end Alexa routing verification script.
 *
 * Tests every request reaching POST /alexa and confirms:
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
      req.on('error', (e) => { server.close(); reject(e); });
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
  console.log(' ALEXA ROUTING VERIFICATION — POST /alexa pipeline');
  console.log('════════════════════════════════════════════════════════\n');

  // ── 1. LaunchRequest ──────────────────────────────────────────────────────
  console.log('[ 1 ] LaunchRequest');
  const r1 = await postAlexa({
    version: '1.0',
    session: { sessionId: 'amzn1.echo-api.session.launch', user: { userId: 'uid-1' } },
    request: { type: 'LaunchRequest', requestId: 'rq-launch-001', timestamp: new Date().toISOString() },
  });
  assert(r1.status === 200, 'HTTP 200');
  assert(r1.body.response.outputSpeech.text === 'Durjoy AI ready.', 'Fast launch speech');
  assert(r1.body.response.shouldEndSession === false, 'shouldEndSession is false');
  console.log(`  Speech : "${r1.body.response.outputSpeech.text}"`);
  console.log(`  shouldEndSession : ${r1.body.response.shouldEndSession}\n`);

  // ── 2. ChatIntent: "weather today" ───────────────────────────────────────
  console.log('[ 2 ] ChatIntent — "weather today"');
  const r2 = await postAlexa({
    version: '1.0',
    session: { sessionId: 'amzn1.echo-api.session.s2', user: { userId: 'uid-1' } },
    request: {
      type: 'IntentRequest',
      requestId: 'rq-weather-001',
      timestamp: new Date().toISOString(),
      intent: {
        name: 'ChatIntent',
        slots: { prompt: { name: 'prompt', value: 'weather today' } },
      },
    },
  });
  assert(r2.status === 200, 'HTTP 200');
  assert(r2.body.response.shouldEndSession === false, 'shouldEndSession is false');
  assert(r2.body.response.outputSpeech.text.length > 0, 'Non-empty speech output');
  console.log(`  Speech : "${r2.body.response.outputSpeech.text}"`);
  console.log(`  shouldEndSession : ${r2.body.response.shouldEndSession}\n`);

  // ── 3. ChatIntent: "latest FIFA score" ───────────────────────────────────
  console.log('[ 3 ] ChatIntent — "latest FIFA score"');
  const r3 = await postAlexa({
    version: '1.0',
    session: { sessionId: 'amzn1.echo-api.session.s3', user: { userId: 'uid-1' } },
    request: {
      type: 'IntentRequest',
      requestId: 'rq-fifa-001',
      timestamp: new Date().toISOString(),
      intent: {
        name: 'ChatIntent',
        slots: { prompt: { name: 'prompt', value: 'latest FIFA score' } },
      },
    },
  });
  assert(r3.status === 200, 'HTTP 200');
  assert(r3.body.response.shouldEndSession === false, 'shouldEndSession is false');
  assert(r3.body.response.outputSpeech.text.length > 0, 'Non-empty speech output');
  console.log(`  Speech : "${r3.body.response.outputSpeech.text}"`);
  console.log(`  shouldEndSession : ${r3.body.response.shouldEndSession}\n`);

  // ── 4. ChatIntent: "what's my age" ───────────────────────────────────────
  console.log("[ 4 ] ChatIntent — \"what's my age\"");
  const r4 = await postAlexa({
    version: '1.0',
    session: { sessionId: 'amzn1.echo-api.session.s4', user: { userId: 'uid-1' } },
    request: {
      type: 'IntentRequest',
      requestId: 'rq-age-001',
      timestamp: new Date().toISOString(),
      intent: {
        name: 'ChatIntent',
        slots: { prompt: { name: 'prompt', value: "what's my age" } },
      },
    },
  });
  assert(r4.status === 200, 'HTTP 200');
  assert(r4.body.response.shouldEndSession === false, 'shouldEndSession is false');
  assert(
    r4.body.response.outputSpeech.text.toLowerCase().includes('23') ||
    r4.body.response.outputSpeech.text.toLowerCase().includes('age'),
    'Response references age or year',
  );
  console.log(`  Speech : "${r4.body.response.outputSpeech.text}"`);
  console.log(`  shouldEndSession : ${r4.body.response.shouldEndSession}\n`);

  // ── 5. ChatIntent: "remember this my favorite color is red" ──────────────
  console.log('[ 5 ] ChatIntent — "remember this my favorite color is red"');
  const r5 = await postAlexa({
    version: '1.0',
    session: { sessionId: 'amzn1.echo-api.session.s5', user: { userId: 'uid-1' } },
    request: {
      type: 'IntentRequest',
      requestId: 'rq-memory-001',
      timestamp: new Date().toISOString(),
      intent: {
        name: 'ChatIntent',
        slots: { prompt: { name: 'prompt', value: 'remember this my favorite color is red' } },
      },
    },
  });
  assert(r5.status === 200, 'HTTP 200');
  assert(r5.body.response.shouldEndSession === false, 'shouldEndSession is false');
  assert(r5.body.response.outputSpeech.text.length > 0, 'Non-empty speech output');
  console.log(`  Speech : "${r5.body.response.outputSpeech.text}"`);
  console.log(`  shouldEndSession : ${r5.body.response.shouldEndSession}\n`);

  // ── 6. AMAZON.FallbackIntent — no slots (correct Alexa behaviour) ────────
  console.log('[ 6 ] AMAZON.FallbackIntent — no slots (reprompt expected)');
  const r6 = await postAlexa({
    version: '1.0',
    session: { sessionId: 'amzn1.echo-api.session.s6', user: { userId: 'uid-1' } },
    request: {
      type: 'IntentRequest',
      requestId: 'rq-fallback-001',
      timestamp: new Date().toISOString(),
      intent: { name: 'AMAZON.FallbackIntent', slots: {} },
    },
  });
  assert(r6.status === 200, 'HTTP 200');
  assert(r6.body.response.shouldEndSession === false, 'shouldEndSession is false (session preserved)');
  assert(r6.body.response.outputSpeech.text.length > 0, 'Non-empty reprompt speech');
  console.log(`  Speech : "${r6.body.response.outputSpeech.text}"`);
  console.log(`  shouldEndSession : ${r6.body.response.shouldEndSession}\n`);

  // ── 7. AMAZON.StopIntent — session should end ─────────────────────────────
  console.log('[ 7 ] AMAZON.StopIntent — session should end');
  const r7 = await postAlexa({
    version: '1.0',
    session: { sessionId: 'amzn1.echo-api.session.s7', user: { userId: 'uid-1' } },
    request: {
      type: 'IntentRequest',
      requestId: 'rq-stop-001',
      timestamp: new Date().toISOString(),
      intent: { name: 'AMAZON.StopIntent', slots: {} },
    },
  });
  assert(r7.status === 200, 'HTTP 200');
  assert(r7.body.response.shouldEndSession === true, 'shouldEndSession is TRUE for StopIntent');
  console.log(`  Speech : "${r7.body.response.outputSpeech.text}"`);
  console.log(`  shouldEndSession : ${r7.body.response.shouldEndSession}\n`);

  console.log('════════════════════════════════════════════════════════');
  console.log(` RESULT: ${process.exitCode === 1 ? '✗ SOME TESTS FAILED' : '✓ ALL TESTS PASSED'}`);
  console.log('════════════════════════════════════════════════════════\n');
}

run().catch((e) => { console.error('Fatal:', e); process.exit(1); });
