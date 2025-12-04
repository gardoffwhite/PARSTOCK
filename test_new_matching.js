const NameMatching = require('./utils/nameMatching.js');

// ทดสอบกรณีที่คุณให้มา
const parItems = [
  'Liqueur, Bols, dry orange, 70cl',
  'Liqueur, Cointreau, orange, 70cl',
  'Gin, Nakin, 40%, 750ml'
];

const salesItems = [
  'Liqueur, Bols, dry orange, 70cl',  // ควร match กับตัวเอง
  'Gin, Nakin, 40%, 750ml'  // ควร match กับตัวเอง
];

console.log('=== Testing New Matching Algorithm ===\n');

salesItems.forEach(salesItem => {
  console.log(`\nSales Item: "${salesItem}"`);
  console.log('---');

  const result = NameMatching.findBestMatch(salesItem, parItems, 0.4);

  console.log(`Best Match: "${result.match}"`);
  console.log(`Score: ${(result.score * 100).toFixed(1)}%`);

  // แสดง score กับทุกตัว
  console.log('\nAll Scores:');
  parItems.forEach(parItem => {
    const score = NameMatching.similarityScore(salesItem, parItem);
    console.log(`  "${parItem}": ${(score * 100).toFixed(1)}%`);
  });
});
