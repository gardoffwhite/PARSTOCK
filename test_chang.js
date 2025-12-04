const NameMatching = require('./utils/nameMatching.js');

// ทดสอบกรณี Chang
const parItems = [
  'Beer, Chang, classic, S bottle, 32cl',
  'Beer, Singha, 33cl',
  'Beer, Leo, 33cl',
  'Wine, Chardonnay, 75cl'
];

const salesItems = [
  'Chang',
  'Singha',
  'Leo'
];

console.log('=== Testing Chang Matching (Sales word as main score) ===\n');

salesItems.forEach(salesItem => {
  console.log(`Sales: "${salesItem}"`);
  console.log('---');

  const result = NameMatching.findBestMatch(salesItem, parItems, 0.3);

  console.log(`Best Match: "${result.match}"`);
  console.log(`Score: ${(result.score * 100).toFixed(1)}%`);

  // แสดง score กับทุกตัว
  console.log('\nAll Scores:');
  parItems.forEach(parItem => {
    const score = NameMatching.similarityScore(salesItem, parItem);
    console.log(`  "${parItem}": ${(score * 100).toFixed(1)}%`);
  });
  console.log('\n');
});
