class ConversionUnit {
  // กำหนด conversion rates ตาม category
  static getConversionRate(category, itemName) {
    const cat = category ? category.toLowerCase() : '';
    const name = itemName ? itemName.toLowerCase() : '';

    // Wine by glass
    if (cat.includes('glass') || name.includes('glass')) {
      return 0.2; // 1 ขวด = 5 แก้ว
    }

    // Wine pairing (ดูจากชื่อที่ขึ้นต้นด้วย 0., 1., 2.)
    if (this.isWinePairing(itemName)) {
      return 0.142857; // 1 ขวด = 7 แก้ว (1/7)
    }

    // Wine bottle
    if (cat.includes('wine') && (cat.includes('btl') || cat.includes('bottle'))) {
      return 1; // 1 ขวด
    }

    // Cocktail - ยังไม่ทำระบบ
    if (cat.includes('cocktail')) {
      return null; // N/A
    }

    // Default สำหรับ Sake, Beer, Champagne และอื่นๆ
    return 1;
  }

  // ตรวจสอบว่าเป็น wine pairing หรือไม่
  static isWinePairing(itemName) {
    if (!itemName) return false;

    const name = itemName.trim();
    // ตรวจสอบว่าขึ้นต้นด้วย "0." หรือ "1." หรือ "2." หรือตัวเลขตามด้วย "."
    return /^[0-9]+\./.test(name);
  }

  // แปลง qty ตาม conversion rate
  static convertQty(qty, category, itemName) {
    const conversionRate = this.getConversionRate(category, itemName);

    if (conversionRate === null) {
      return {
        originalQty: qty,
        convertedQty: null,
        conversionRate: null,
        unit: 'N/A'
      };
    }

    return {
      originalQty: qty,
      convertedQty: qty * conversionRate,
      conversionRate: conversionRate,
      unit: this.getUnitName(category, itemName)
    };
  }

  // รับชื่อหน่วย
  static getUnitName(category, itemName) {
    const cat = category ? category.toLowerCase() : '';
    const name = itemName ? itemName.toLowerCase() : '';

    if (cat.includes('glass') || name.includes('glass')) {
      return 'แก้ว (Glass)';
    }

    if (this.isWinePairing(itemName)) {
      return 'แก้ว (Pairing)';
    }

    if (cat.includes('wine')) {
      return 'ขวด (Bottle)';
    }

    if (cat.includes('cocktail')) {
      return 'Cocktail (N/A)';
    }

    if (cat.includes('sake')) {
      return 'Sake';
    }

    if (cat.includes('beer')) {
      return 'Beer';
    }

    if (cat.includes('champagne') || cat.includes('champagn')) {
      return 'Champagne';
    }

    return 'ขวด';
  }

  // สรุปการแปลงหน่วย
  static summarizeConversion(items) {
    const summary = {
      byCategory: {},
      total: {
        items: items.length,
        withConversion: 0,
        withoutConversion: 0
      }
    };

    items.forEach(item => {
      const conversion = this.convertQty(item.qty, item.category, item.name);

      if (conversion.conversionRate !== null) {
        summary.total.withConversion++;
      } else {
        summary.total.withoutConversion++;
      }

      const unit = conversion.unit;
      if (!summary.byCategory[unit]) {
        summary.byCategory[unit] = {
          count: 0,
          totalOriginalQty: 0,
          totalConvertedQty: 0
        };
      }

      summary.byCategory[unit].count++;
      summary.byCategory[unit].totalOriginalQty += item.qty;
      if (conversion.convertedQty !== null) {
        summary.byCategory[unit].totalConvertedQty += conversion.convertedQty;
      }
    });

    return summary;
  }
}

module.exports = ConversionUnit;
