/* eslint-disable no-console */
process.env.NODE_ENV = 'production';
process.env.AI_PROVIDER = 'openrouter';
process.env.SEARCH_PROVIDER = 'duckduckgo';
process.env.SKIP_ALEXA_VERIFICATION = 'true';

import http from 'http';
import app from '../src/app';

function postAlexaPayload(payload: Record<string, unknown>): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      const dataStr = JSON.stringify(payload);

      const req = http.request(
        {
          hostname: 'localhost',
          port,
          path: '/alexa',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataStr),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            server.close();
            resolve({
              status: res.statusCode || 500,
              body: JSON.parse(body),
            });
          });
        },
      );

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      req.write(dataStr);
      req.end();
    });
  });
}

async function verifyAlexaRouting() {
  console.log('=== VERIFYING ALEXA ROUTING & SHOULD_END_SESSION ===\n');

  // Test 1: LaunchRequest
  console.log('--- 1. Testing LaunchRequest ---');
  const launchPayload = {
    version: '1.0',
    session: { sessionId: 's-launch-1' },
    request: { type: 'LaunchRequest', requestId: 'r-launch-1' },
  };
  const resLaunch = await postAlexaPayload(launchPayload);
  console.log('Status:', resLaunch.status);
  console.log('OutputSpeech:', resLaunch.body.response.outputSpeech.text);
  console.log('shouldEndSession:', resLaunch.body.response.shouldEndSession);

  // Test 2: "weather today"
  console.log('\n--- 2. Testing IntentRequest ("weather today") ---');
  const weatherPayload = {
    version: '1.0',
    session: { sessionId: 's-chat-1' },
    request: {
      type: 'IntentRequest',
      requestId: 'r-weather-1',
      intent: {
        name: 'ChatIntent',
        slots: { prompt: { name: 'prompt', value: 'weather today' } },
      },
    },
  };
  const resWeather = await postAlexaPayload(weatherPayload);
  console.log('Status:', resWeather.status);
  console.log('OutputSpeech:', resWeather.body.response.outputSpeech.text);
  console.log('shouldEndSession:', resWeather.body.response.shouldEndSession);

  // Test 3: "latest FIFA score"
  console.log('\n--- 3. Testing IntentRequest ("latest FIFA score") ---');
  const fifaPayload = {
    version: '1.0',
    session: { sessionId: 's-chat-2' },
    request: {
      type: 'IntentRequest',
      requestId: 'r-fifa-1',
      intent: {
        name: 'ChatIntent',
        slots: { prompt: { name: 'prompt', value: 'latest FIFA score' } },
      },
    },
  };
  const resFifa = await postAlexaPayload(fifaPayload);
  console.log('Status:', resFifa.status);
  console.log('OutputSpeech:', resFifa.body.response.outputSpeech.text);
  console.log('shouldEndSession:', resFifa.body.response.shouldEndSession);

  // Test 4: "what's my age"
  console.log('\n--- 4. Testing IntentRequest ("what\'s my age") ---');
  const agePayload = {
    version: '1.0',
    session: { sessionId: 's-chat-3' },
    request: {
      type: 'IntentRequest',
      requestId: 'r-age-1',
      intent: {
        name: 'ChatIntent',
        slots: { prompt: { name: 'prompt', value: "what's my age" } },
      },
    },
  };
  const resAge = await postAlexaPayload(agePayload);
  console.log('Status:', resAge.status);
  console.log('OutputSpeech:', resAge.body.response.outputSpeech.text);
  console.log('shouldEndSession:', resAge.body.response.shouldEndSession);

  // Test 5: FallbackIntent ("remember this")
  console.log('\n--- 5. Testing AMAZON.FallbackIntent ("remember this my favorite color is red") ---');
  const fallbackPayload = {
    version: '1.0',
    session: { sessionId: 's-chat-4' },
    request: {
      type: 'IntentRequest',
      requestId: 'r-fallback-1',
      intent: {
        name: 'AMAZON.FallbackIntent',
        slots: { prompt: { name: 'prompt', value: 'my favorite color is red' } },
      },
    },
  };
  const resFallback = await postAlexaPayload(fallbackPayload);
  console.log('Status:', resFallback.status);
  console.log('OutputSpeech:', resFallback.body.response.outputSpeech.text);
  console.log('shouldEndSession:', resFallback.body.response.shouldEndSession);

  console.log('\n=== ALEXA ROUTING VERIFICATION COMPLETE ===');
}

verifyAlexaRouting().catch((err) => {
  console.error('Alexa routing test failed:', err);
  process.exit(1);
});
