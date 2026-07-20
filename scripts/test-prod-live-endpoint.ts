/* eslint-disable no-console */
process.env.NODE_ENV = 'production';
process.env.AI_PROVIDER = 'openrouter';
process.env.SEARCH_PROVIDER = 'duckduckgo';

import { searchManager } from '../src/search/search.manager';

async function testProductionPipeline() {
  console.log('=== TESTING PRODUCTION PIPELINE (NODE_ENV=production) ===\n');

  // Test 1: "What is the latest news today?"
  const prompt1 = 'What is the latest news today?';
  searchManager.clearCache();

  console.log(`--- PRODUCTION TEST 1: "${prompt1}" ---`);
  const shouldSearch1 = searchManager.shouldSearch(prompt1);
  console.log(`SearchManager.shouldSearch("${prompt1}"):`, shouldSearch1);

  const searchRes1 = await searchManager.search(prompt1);
  console.log(`\nSearch Provider Used: "${searchRes1.provider}"`);
  console.log(`Search Execution Time: ${searchRes1.executionTimeMs}ms`);
  console.log(`Number of Search Results: ${searchRes1.results.length}`);

  console.log('\nRetrieved Production Results:');
  searchRes1.results.forEach((item, index) => {
    console.log(`\n  Result #${index + 1}:`);
    console.log(`  Headline : ${item.title}`);
    console.log(`  URL      : ${item.url}`);
    console.log(`  Snippet  : ${item.snippet}`);
  });

  const formattedPrompt1 = searchManager.formatSearchResultsForPrompt(searchRes1);
  console.log('\nFormatted System Prompt Context:');
  console.log(formattedPrompt1);

  // Test 2: "What is the latest FIFA score?"
  const prompt2 = 'What is the latest FIFA score?';
  searchManager.clearCache();

  console.log(`\n--- PRODUCTION TEST 2: "${prompt2}" ---`);
  const shouldSearch2 = searchManager.shouldSearch(prompt2);
  console.log(`SearchManager.shouldSearch("${prompt2}"):`, shouldSearch2);

  const searchRes2 = await searchManager.search(prompt2);
  console.log(`\nSearch Provider Used: "${searchRes2.provider}"`);
  console.log(`Search Execution Time: ${searchRes2.executionTimeMs}ms`);
  console.log(`Number of Search Results: ${searchRes2.results.length}`);

  console.log('\nRetrieved Production Results:');
  searchRes2.results.forEach((item, index) => {
    console.log(`\n  Result #${index + 1}:`);
    console.log(`  Headline : ${item.title}`);
    console.log(`  URL      : ${item.url}`);
    console.log(`  Snippet  : ${item.snippet}`);
  });

  const formattedPrompt2 = searchManager.formatSearchResultsForPrompt(searchRes2);
  console.log('\nFormatted System Prompt Context:');
  console.log(formattedPrompt2);

  console.log('\n=== PRODUCTION PIPELINE VERIFICATION COMPLETE ===');
}

testProductionPipeline().catch((err) => {
  console.error('Production test failed:', err);
  process.exit(1);
});
