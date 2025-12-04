const XLSX = require('xlsx');

class ExcelReader {
  constructor() {
    this.categories = {
      glassBottle: ['glass', 'bottle', 'กระป๋อง', 'ขวด'],
      pairing: ['pairing', 'คู่', 'จับคู่'],
      potion: ['potion', 'น้ำ', 'เครื่องดื่ม', 'drink'],
      other: []
    };
  }

  readFile(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      return {
        success: true,
        data: data,
        sheetName: sheetName,
        totalRows: data.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  readBuffer(buffer) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      return {
        success: true,
        data: data,
        sheetName: sheetName,
        totalRows: data.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  categorizeItem(itemName) {
    if (!itemName) return 'other';

    const nameLower = itemName.toString().toLowerCase();

    for (const [category, keywords] of Object.entries(this.categories)) {
      if (category === 'other') continue;

      for (const keyword of keywords) {
        if (nameLower.includes(keyword.toLowerCase())) {
          return category;
        }
      }
    }

    return 'other';
  }

  processData(data) {
    const categorized = {
      glassBottle: [],
      pairing: [],
      potion: [],
      other: []
    };

    const summary = {
      totalItems: data.length,
      byCategory: {
        glassBottle: { count: 0, totalPAR: 0, totalSales: 0 },
        pairing: { count: 0, totalPAR: 0, totalSales: 0 },
        potion: { count: 0, totalPAR: 0, totalSales: 0 },
        other: { count: 0, totalPAR: 0, totalSales: 0 }
      },
      grandTotal: {
        totalPAR: 0,
        totalSales: 0
      }
    };

    data.forEach(row => {
      const itemName = row['Item'] || row['รายการ'] || row['ชื่อสินค้า'] || '';
      const category = this.categorizeItem(itemName);

      const parStock = parseFloat(row['PAR'] || row['PAR Stock'] || row['สต็อก'] || 0);
      const sales = parseFloat(row['Sales'] || row['ยอดขาย'] || row['จำนวนขาย'] || 0);

      const itemData = {
        ...row,
        category: category,
        parStock: parStock,
        sales: sales
      };

      categorized[category].push(itemData);
      summary.byCategory[category].count++;
      summary.byCategory[category].totalPAR += parStock;
      summary.byCategory[category].totalSales += sales;
      summary.grandTotal.totalPAR += parStock;
      summary.grandTotal.totalSales += sales;
    });

    return {
      categorized,
      summary
    };
  }
}

module.exports = ExcelReader;
