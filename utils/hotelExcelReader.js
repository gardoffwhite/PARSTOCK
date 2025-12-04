const XLSX = require('xlsx');

class HotelExcelReader {
  constructor() {
    this.departments = ['Wine', 'Liquor', 'Champagne'];
  }

  readFile(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      return this.processWorksheet(worksheet, sheetName);
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

      return this.processWorksheet(worksheet, sheetName);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  processWorksheet(worksheet, sheetName) {
    try {
      const dateCell = this.findDateInRow4(worksheet);
      const salesData = this.extractSalesData(worksheet);

      return {
        success: true,
        date: dateCell,
        data: salesData,
        sheetName: sheetName,
        totalItems: salesData.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  findDateInRow4(worksheet) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 3, c: col });
      const cell = worksheet[cellAddress];

      if (cell && cell.v) {
        const value = cell.v.toString();
        if (value.includes('/') || value.includes('-') || !isNaN(Date.parse(value))) {
          return this.parseDate(value);
        }
      }
    }

    return new Date().toISOString().split('T')[0];
  }

  parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    if (dateStr.includes('(') && dateStr.includes(')')) {
      const match = dateStr.match(/\(([^)]+)\)/);
      if (match) {
        dateStr = match[1];
      }
    }

    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format.source.startsWith('(\\d{4})')) {
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else {
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const year = match[3];
          return `${year}-${month}-${day}`;
        }
      }
    }

    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // ignore
    }

    return new Date().toISOString().split('T')[0];
  }

  extractSalesData(worksheet) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const salesData = [];

    let currentDepartment = '';
    let currentOutlet = '';
    let currentCheckType = '';

    for (let row = range.s.r; row <= range.e.r; row++) {
      const rowData = this.getRowData(worksheet, row, range.e.c);

      if (rowData.checkType) {
        currentCheckType = rowData.checkType;
      }

      if (rowData.outlet) {
        currentOutlet = rowData.outlet;
      }

      if (rowData.department) {
        currentDepartment = rowData.department;
      }

      if (rowData.isDataRow && rowData.name) {
        const item = {
          name: rowData.name,
          qty: this.parseNumber(rowData.qty),
          category: rowData.category || ''
        };

        if (item.name && item.name.trim() !== '') {
          salesData.push(item);
        }
      }
    }

    return salesData;
  }

  getRowData(worksheet, row, maxCol) {
    const getData = (col) => {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      return cell ? cell.v : '';
    };

    const checkTypePattern = /Check Type:\s*(.+)/i;
    const outletPattern = /Outlet:\s*(.+)/i;
    const departmentPattern = /Department:\s*(.+)/i;

    const colAValue = getData(0);
    const colBValue = getData(1);

    const checkTypeMatch = (colAValue + ' ' + colBValue).match(checkTypePattern);
    const outletMatch = (colAValue + ' ' + colBValue).match(outletPattern);
    const departmentMatch = (colAValue + ' ' + colBValue).match(departmentPattern);

    if (checkTypeMatch) {
      return { checkType: checkTypeMatch[1].trim() };
    }

    if (outletMatch) {
      return { outlet: outletMatch[1].trim() };
    }

    if (departmentMatch) {
      return { department: departmentMatch[1].trim() };
    }

    const nameCol = getData(5);
    if (!nameCol || nameCol === 'Name') return { isDataRow: false };

    const isDataRow = true;

    return {
      isDataRow,
      code: getData(0),
      name: getData(5),
      skuCode: getData(6),
      category: getData(7),
      course: getData(8),
      price: getData(9),
      priceAfter: getData(10),
      qty: getData(27),
      grossItem: getData(28),
      discount: getData(29),
      inclusive: getData(30)
    };
  }

  parseNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(value.toString().replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  }

  generateDailySummary(salesData, date) {
    const summary = {
      date: date,
      totalQty: 0,
      totalItems: salesData.length,
      allItems: []
    };

    salesData.forEach(item => {
      summary.totalQty += item.qty;
    });

    const itemSummary = {};
    salesData.forEach(item => {
      if (!itemSummary[item.name]) {
        itemSummary[item.name] = {
          name: item.name,
          category: item.category || '',
          totalQty: 0
        };
      }
      itemSummary[item.name].totalQty += item.qty;
      // ถ้ายังไม่มี category ให้เอาจาก item ปัจจุบัน
      if (!itemSummary[item.name].category && item.category) {
        itemSummary[item.name].category = item.category;
      }
    });

    summary.allItems = Object.values(itemSummary)
      .sort((a, b) => b.totalQty - a.totalQty);

    return summary;
  }
}

module.exports = HotelExcelReader;
