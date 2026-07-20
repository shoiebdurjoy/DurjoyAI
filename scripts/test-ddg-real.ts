import { DuckDuckGoSearchProvider } from '../src/search/providers/duckduckgo.provider';

async function testDDG() {
  const provider = new DuckDuckGoSearchProvider();
  const res = await provider.search('latest technology news', 3);
  // eslint-disable-next-line no-console
  console.log('Real DDG Search Results:', JSON.stringify(res, null, 2));
}

testDDG().catch(console.error);
