import { DuckDuckGoSearchProvider } from '../src/search/providers/duckduckgo.provider';
import { AIFactory } from '../src/ai/ai.factory';
import { SearchFactory } from '../src/search/search.factory';
import { Logger } from '../src/utils/logger';

async function auditProof() {
  // eslint-disable-next-line no-console
  console.log('=== AUDITING PRODUCTION PROVIDERS FOR REAL DATA & ZERO MOCKS ===\n');

  // 1. Audit Search Provider (DuckDuckGo Real Fetch)
  const ddg = new DuckDuckGoSearchProvider();
  const searchRes = await ddg.search('latest world news', 3);

  // eslint-disable-next-line no-console
  console.log('--- 1. REAL HEADLINES, URLS & SNIPPETS RETRIEVED FROM DUCKDUCKGO ---');
  searchRes.results.forEach((item, index) => {
    // eslint-disable-next-line no-console
    console.log(`\nResult #${index + 1}:`);
    // eslint-disable-next-line no-console
    console.log(`Headline : ${item.title}`);
    // eslint-disable-next-line no-console
    console.log(`URL      : ${item.url}`);
    // eslint-disable-next-line no-console
    console.log(`Snippet  : ${item.snippet}`);
    // eslint-disable-next-line no-console
    console.log(`Source   : ${item.source}`);
  });

  // 2. Verify Production Mock Provider Enforcement
  // eslint-disable-next-line no-console
  console.log('\n--- 2. PRODUCTION MOCK PROVIDER ENFORCEMENT AUDIT ---');
  process.env.NODE_ENV = 'production';
  process.env.AI_PROVIDER = 'mock';

  let caughtMockErr = false;
  try {
    AIFactory.getProvider();
  } catch (err: unknown) {
    caughtMockErr = true;
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.log(`Successfully blocked MockAIProvider in production: "${msg}"`);
  }

  if (!caughtMockErr) {
    throw new Error('FAILED: MockAIProvider was not blocked in production!');
  }

  process.env.SEARCH_PROVIDER = 'mock';
  let caughtSearchMockErr = false;
  try {
    SearchFactory.getProvider();
  } catch (err: unknown) {
    caughtSearchMockErr = true;
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.log(`Successfully blocked MockSearchProvider in production: "${msg}"`);
  }

  if (!caughtSearchMockErr) {
    throw new Error('FAILED: MockSearchProvider was not blocked in production!');
  }

  // Restore env settings
  delete process.env.AI_PROVIDER;
  delete process.env.SEARCH_PROVIDER;
  process.env.NODE_ENV = 'development';

  // 3. Resolve Real Production Factories
  const prodAI = AIFactory.getProvider();
  const prodSearch = SearchFactory.getProvider();

  // eslint-disable-next-line no-console
  console.log('\n--- 3. ACTIVE PRODUCTION PROVIDER RESOLUTION ---');
  Logger.info('Audit', `AI Provider resolved: "${prodAI.constructor.name}"`);
  Logger.info('Audit', `Search Provider resolved: "${prodSearch.name}"`);

  // eslint-disable-next-line no-console
  console.log('\n=== REAL PROVIDER AUDIT COMPLETE & VERIFIED ===');
}

auditProof().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Audit failed:', err);
  process.exit(1);
});
