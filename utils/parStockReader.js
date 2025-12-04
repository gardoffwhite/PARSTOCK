const XLSX = require('xlsx');

class ParStockReader {
  readFile(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const items = this.extractParStockData(worksheet);

      return {
        success: true,
        data: items,
        totalItems: items.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  extractParStockData(worksheet) {
    const items = [];
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    let itemNameCol = -1;
    let currentStockCol = -1;
    let dataStartRow = -1;

    // หา column ของ Item name และ Current stock
    for (let R = range.s.r; R <= Math.min(range.s.r + 10, range.e.r); R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];

        if (cell && cell.v) {
          const value = String(cell.v).toLowerCase();

          // หา Item name column
          if (value.includes('item') && value.includes('name')) {
            itemNameCol = C;
            dataStartRow = R + 1;
          }

          // หา Current stock column
          if (value.includes('current') && value.includes('stock')) {
            currentStockCol = C;
          }
        }
      }
    }

    if (itemNameCol === -1 || currentStockCol === -1) {
      throw new Error('ไม่พบ column Item name หรือ Current stock ในไฟล์');
    }

    // อ่านข้อมูลจากแถวที่เริ่มต้น
    for (let R = dataStartRow; R <= range.e.r; R++) {
      const itemNameCell = worksheet[XLSX.utils.encode_cell({ r: R, c: itemNameCol })];
      const currentStockCell = worksheet[XLSX.utils.encode_cell({ r: R, c: currentStockCol })];

      if (itemNameCell && itemNameCell.v) {
        const itemName = String(itemNameCell.v).trim();
        const currentStock = this.parseNumber(currentStockCell?.v);

        // ข้าม header rows และ empty rows
        if (itemName && !itemName.toLowerCase().includes('item name') && currentStock > 0) {
          items.push({
            name: itemName,
            parStock: currentStock
          });
        }
      }
    }

    return items;
  }

  parseNumber(value) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    const num = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  }

  generateParStockSummary(items, startDate) {
    return {
      startDate: startDate,
      totalItems: items.length,
      totalParStock: items.reduce((sum, item) => sum + item.parStock, 0),
      items: items.sort((a, b) => b.parStock - a.parStock)
    };
  }
}

module.exports = ParStockReader;
