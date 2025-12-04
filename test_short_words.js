const NameMatching = require('./utils/nameMatching.js');

// ทดสอบกับคำสั้นๆ
const parItems = [
  'Gin, Nakin, 40%, 750ml',
  'Vodka, Grey Goose, 40%, 1L',
  'Rum, Bacardi, 40%, 70cl',
  'Whisky, Johnnie Walker, Red Label, 40%, 1L'
];

const salesItems = [
  'Gin Nakin 40 750ml',
  'Vodka Grey Goose 40 1L',
  'Rum Bacardi 40 70cl',
  'Whisky Johnnie Walker Red 40 1L'
];

console.log('=== Testing Short Words Matching ===\n');

salesItems.forEach(salesItem => {
  console.log(`Sales: "${salesItem}"`);

  const result = NameMatching.findBestMatch(salesItem, parItems, 0.3);

  console.log(`Match: "${result.match}"`);
  console.log(`Score: ${(result.score * 100).toFixed(1)}%\n`);
});
