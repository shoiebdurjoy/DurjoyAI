const fs = require('fs');
const path = require('path');

const modelPath = path.join(__dirname, '..', 'interaction-model.json');
const raw = fs.readFileSync(modelPath, 'utf8');

try {
  const model = JSON.parse(raw);
  const intents = model.interactionModel.languageModel.intents;
  
  let totalUtterances = 0;
  const globalSet = new Set();
  let duplicateCount = 0;
  let invalidCount = 0;

  intents.forEach(intent => {
    const samples = intent.samples || [];
    console.log(`Intent "${intent.name}": ${samples.length} samples`);
    totalUtterances += samples.length;

    samples.forEach(sample => {
      // Check for duplicate
      if (globalSet.has(sample.toLowerCase())) {
        duplicateCount++;
      } else {
        globalSet.add(sample.toLowerCase());
      }

      // Check valid slot syntax if slot present
      if (sample.includes('{') || sample.includes('}')) {
        if (!sample.includes('{prompt}')) {
          console.error(`Invalid slot format in intent "${intent.name}": "${sample}"`);
          invalidCount++;
        }
      }
    });
  });

  console.log(`--- Validation Summary ---`);
  console.log(`Total Utterances: ${totalUtterances}`);
  console.log(`Global Unique Utterances: ${globalSet.size}`);
  console.log(`Duplicates Across Intents: ${duplicateCount}`);
  console.log(`Invalid Slot Format Count: ${invalidCount}`);

  if (invalidCount === 0 && duplicateCount === 0) {
    console.log(`✅ INTERACTION MODEL VALIDATION PASSED 100%!`);
  } else {
    console.error(`❌ Validation failed with errors.`);
  }

} catch (err) {
  console.error(`JSON Parse Error: ${err.message}`);
}
