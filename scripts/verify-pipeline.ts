import { aiService } from '../src/ai/ai.service';
import { searchManager } from '../src/search/search.manager';

async function verifyLiveFlow() {
  // eslint-disable-next-line no-console
  console.log('=== STARTING END-TO-END PIPELINE VERIFICATION ===\n');

  // Test 1: Search Query
  const searchPrompt = 'What is the latest news today?';
  searchManager.clearCache();

  // eslint-disable-next-line no-console
  console.log('--- TEST 1: LIVE SEARCH QUERY ---');
  const searchResponse = await aiService.generateResponse(searchPrompt, {
    userId: 'verify-user-1',
    sessionId: 'verify-session-1',
  });
  // eslint-disable-next-line no-console
  console.log('LLM Search Response:', searchResponse);

  // Test 2: Tool Query
  const toolPrompt = 'What time is it right now?';
  // eslint-disable-next-line no-console
  console.log('\n--- TEST 2: TOOL INVOCATION QUERY ---');
  const toolResponse = await aiService.generateResponse(toolPrompt, {
    userId: 'verify-user-2',
    sessionId: 'verify-session-2',
  });
  // eslint-disable-next-line no-console
  console.log('Tool Response:', toolResponse);

  // Test 3: Deterministic Query
  const detPrompt = 'How old am I?';
  // eslint-disable-next-line no-console
  console.log('\n--- TEST 3: DETERMINISTIC QUERY ---');
  const detResponse = await aiService.generateResponse(detPrompt, {
    userId: 'verify-user-3',
    sessionId: 'verify-session-3',
  });
  // eslint-disable-next-line no-console
  console.log('Deterministic Response:', detResponse);

  // eslint-disable-next-line no-console
  console.log('\n=== ALL END-TO-END TESTS COMPLETED SUCCESSFULLY ===');
}

verifyLiveFlow().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Verification failed:', err);
  process.exit(1);
});
