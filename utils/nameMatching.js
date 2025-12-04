class NameMatching {
  // วิธีการจาก Apps Script: นับคำที่ตรงกัน
  // a = Sales (ใช้เป็นตัวหลัก), b = PAR
  static similarityScore(a, b) {
    // แยกคำโดยใช้ non-word characters (\W+)
    // ไม่กรองคำสั้นออก เพื่อให้คำสั้นๆ เช่น "cl", "ml", "40" สามารถ match ได้
    const wordsA = a.toLowerCase().split(/\W+/).filter(w => w.length > 0);
    const wordsB = b.toLowerCase().split(/\W+/).filter(w => w.length > 0);

    // นับคำที่ match กัน
    const matchCount = wordsA.filter(word => wordsB.includes(word)).length;

    // ใช้จำนวนคำจาก Sales (a) เป็นตัวหาร
    // เพื่อให้ถ้า Sales มี 1 คำและ match ได้ = 100%
    // ตัวอย่าง: Sales "Chang" vs PAR "Beer, Chang, classic, S bottle, 32cl"
    // matchCount = 1, wordsA.length = 1 → score = 100%
    return wordsA.length > 0 ? (matchCount / wordsA.length) : 0;
  }

  // หาชื่อที่ตรงกันมากที่สุด (ตามวิธีของ Apps Script)
  static findBestMatch(targetName, candidateNames, threshold = 0.4) {
    let bestMatch = null;
    let highestScore = 0;

    for (const candidate of candidateNames) {
      const score = this.similarityScore(targetName, candidate);

      if (score > highestScore) {
        highestScore = score;
        bestMatch = candidate;
      }
    }

    // ถ้า score ต่ำกว่า threshold ให้คืนค่า null
    if (highestScore < threshold) {
      return {
        match: null,
        score: highestScore,
        originalName: targetName
      };
    }

    return {
      match: bestMatch,
      score: highestScore,
      originalName: targetName
    };
  }

  // ===== เก็บ legacy methods ไว้เผื่อใช้ =====

  // คำนวณความคล้ายกันของชื่อโดยใช้ Levenshtein Distance
  static levenshteinDistance(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    const matrix = [];

    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[s2.length][s1.length];
  }

  // คำนวณเปอร์เซ็นต์ความคล้ายกัน
  static similarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  // ทำความสะอาดชื่อสินค้า (ลบตัวเลข, เครื่องหมาย, ช่องว่างเกิน)
  static cleanName(name) {
    return name
      .toLowerCase()
      .replace(/\d+/g, '') // ลบตัวเลข
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // ลบเครื่องหมาย
      .replace(/\s+/g, ' ') // ลดช่องว่างเกิน
      .trim();
  }

  // แยกคำสำคัญออกมาจากชื่อสินค้า
  static extractKeywords(name) {
    const cleaned = this.cleanName(name);
    // แยกเป็นคำๆ และกรองคำที่มีความยาว >= 3 ตัวอักษร
    return cleaned.split(' ').filter(word => word.length >= 3);
  }

  // คำนวณ keyword matching score
  static keywordMatchScore(name1, name2) {
    const keywords1 = this.extractKeywords(name1);
    const keywords2 = this.extractKeywords(name2);

    if (keywords1.length === 0 || keywords2.length === 0) {
      return 0;
    }

    let matchCount = 0;
    const matchedKeywords = new Set();

    for (const kw1 of keywords1) {
      for (const kw2 of keywords2) {
        // ถ้าคำตรงกันพอดี หรือ มีคำหนึ่งอยู่ในอีกคำหนึ่ง
        if (kw1 === kw2 || kw1.includes(kw2) || kw2.includes(kw1)) {
          matchedKeywords.add(kw1);
          matchedKeywords.add(kw2);
          matchCount++;
          break;
        }
      }
    }

    // คำนวณ score จากจำนวนคำที่ match เทียบกับคำที่สั้นกว่า
    // เพราะถ้า Sales มี 3 คำและ match ครบทั้ง 3 = 100%
    const minKeywords = Math.min(keywords1.length, keywords2.length);
    return matchCount / minKeywords;
  }

  // จับคู่รายการทั้งหมด
  static matchItems(parStockItems, salesItems, threshold = 0.6) {
    const salesNames = salesItems.map(item => item.name);
    const matches = [];

    for (const parItem of parStockItems) {
      const result = this.findBestMatch(parItem.name, salesNames, threshold);

      matches.push({
        parName: parItem.name,
        salesName: result.match,
        matchScore: result.score,
        matched: result.match !== null
      });
    }

    return matches;
  }
}

module.exports = NameMatching;
