const NameMatching = require('./utils/nameMatching');

// Test cases
const testCases = [
  {
    par: "Rose wine, Chateau d Esclans, whispering angel, cotes de provence, 75cl",
    sales: "6. Whispering Angel Rose"
  },
  {
    par: "Champagne, Louis Roederer, rose, 75cl",
    sales: "Louis Roederer Rose"
  },
  {
    par: "Vodka, Belvedere, pure, 70cl",
    sales: "Belvedere Vodka"
  }
];

console.log("=== Testing Name Matching Algorithm ===\n");

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`PAR:   "${test.par}"`);
  console.log(`Sales: "${test.sales}"`);

  const parKeywords = NameMatching.extractKeywords(test.par);
  const salesKeywords = NameMatching.extractKeywords(test.sales);
  console.log(`PAR Keywords:   [${parKeywords.join(', ')}]`);
  console.log(`Sales Keywords: [${salesKeywords.join(', ')}]`);

  const cleanPar = NameMatching.cleanName(test.par);
  const cleanSales = NameMatching.cleanName(test.sales);
  console.log(`Cleaned PAR:   "${cleanPar}"`);
  console.log(`Cleaned Sales: "${cleanSales}"`);

  const levenshteinScore = NameMatching.similarity(cleanPar, cleanSales);
  const keywordScore = NameMatching.keywordMatchScore(test.par, test.sales);

  console.log(`Levenshtein Score: ${levenshteinScore.toFixed(3)}`);
  console.log(`Keyword Score:     ${keywordScore.toFixed(3)}`);

  // Calculate final score (same logic as findBestMatch)
  let finalScore;
  if (keywordScore >= 0.4) {
    finalScore = (keywordScore * 0.7) + (levenshteinScore * 0.3);
  } else {
    finalScore = levenshteinScore;
  }

  console.log(`Final Score:       ${finalScore.toFixed(3)}`);
  console.log(`Match: ${finalScore >= 0.6 ? '✅ YES' : '❌ NO'}\n`);
  console.log('---\n');
});
