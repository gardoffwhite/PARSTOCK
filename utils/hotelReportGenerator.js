const XLSX = require('xlsx');

class HotelReportGenerator {
  generateDailyHTMLReport(date, summary, salesData) {
    let html = `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>รายงานยอดขายประจำวัน - ${this.formatThaiDate(date)}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #667eea;
            font-size: 14px;
        }
        .summary-card .number {
            font-size: 32px;
            font-weight: bold;
            color: #333;
        }
        .section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #667eea;
            margin: 0 0 20px 0;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th {
            background-color: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #f0f0f0;
        }
        tr:hover {
            background-color: #f8f9ff;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 รายงานยอดขายประจำวัน</h1>
        <p>วันที่: ${this.formatThaiDate(date)}</p>
    </div>

    <div class="section">
        <h2>รายการสินค้าทั้งหมด (${summary.allItems.length} รายการ)</h2>
        <table>
            <thead>
                <tr>
                    <th style="width: 80px;">อันดับ</th>
                    <th>ชื่อสินค้า</th>
                    <th style="width: 150px; text-align: right;">จำนวนที่ขาย</th>
                </tr>
            </thead>
            <tbody>`;

    summary.allItems.forEach((item, index) => {
      html += `
                <tr>
                    <td><strong>#${index + 1}</strong></td>
                    <td>${item.name}</td>
                    <td style="text-align: right;"><strong>${item.totalQty.toLocaleString()}</strong></td>
                </tr>`;
    });

    html += `
            </tbody>
        </table>
    </div>
</body>
</html>`;

    return html;
  }

  generateMonthlyHTMLReport(yearMonth, summary) {
    const allItems = summary.allItems || [];

    let html = `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>รายงานยอดขายประจำเดือน - ${this.formatMonth(yearMonth)}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #10b981;
            font-size: 14px;
        }
        .summary-card .number {
            font-size: 32px;
            font-weight: bold;
            color: #333;
        }
        .section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #10b981;
            margin: 0 0 20px 0;
            border-bottom: 2px solid #10b981;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th {
            background-color: #10b981;
            color: white;
            padding: 12px;
            text-align: left;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #f0f0f0;
        }
        tr:hover {
            background-color: #f0fdf4;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📅 รายงานยอดขายประจำเดือน</h1>
        <p>เดือน: ${this.formatMonth(yearMonth)}</p>
    </div>

    <div class="section">
        <h2>รายการสินค้าทั้งหมด (${allItems.length} รายการ)</h2>
        <table>
            <thead>
                <tr>
                    <th style="width: 80px;">อันดับ</th>
                    <th>ชื่อสินค้า</th>
                    <th style="width: 150px; text-align: right;">จำนวนที่ขาย</th>
                </tr>
            </thead>
            <tbody>`;

    allItems.forEach((item, index) => {
      html += `
                <tr>
                    <td><strong>#${index + 1}</strong></td>
                    <td>${item.name}</td>
                    <td style="text-align: right;"><strong>${item.totalQty.toLocaleString()}</strong></td>
                </tr>`;
    });

    html += `
            </tbody>
        </table>
    </div>
</body>
</html>`;

    return html;
  }

  generateDateRangeHTMLReport(startDate, endDate, summary) {
    const allItems = summary.allItems || [];

    let html = `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>รายงานยอดขายช่วง ${this.formatThaiDate(startDate)} - ${this.formatThaiDate(endDate)}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #f59e0b;
            font-size: 14px;
        }
        .summary-card .number {
            font-size: 32px;
            font-weight: bold;
            color: #333;
        }
        .section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #f59e0b;
            margin: 0 0 20px 0;
            border-bottom: 2px solid #f59e0b;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th {
            background-color: #f59e0b;
            color: white;
            padding: 12px;
            text-align: left;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #f0f0f0;
        }
        tr:hover {
            background-color: #fffbeb;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 รายงานยอดขายตามช่วงวันที่</h1>
        <p>ช่วงวันที่: ${this.formatThaiDate(startDate)} - ${this.formatThaiDate(endDate)}</p>
    </div>

    <div class="section">
        <h2>รายการสินค้าทั้งหมด (${allItems.length} รายการ)</h2>
        <table>
            <thead>
                <tr>
                    <th style="width: 80px;">อันดับ</th>
                    <th>ชื่อสินค้า</th>
                    <th style="width: 150px; text-align: right;">จำนวนที่ขาย</th>
                </tr>
            </thead>
            <tbody>`;

    allItems.forEach((item, index) => {
      html += `
                <tr>
                    <td><strong>#${index + 1}</strong></td>
                    <td>${item.name}</td>
                    <td style="text-align: right;"><strong>${item.totalQty.toLocaleString()}</strong></td>
                </tr>`;
    });

    html += `
            </tbody>
        </table>
    </div>
</body>
</html>`;

    return html;
  }

  exportDailyToExcel(date, summary, salesData, outputPath) {
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ['รายงานยอดขายประจำวัน'],
      ['วันที่:', this.formatThaiDate(date)],
      [],
      ['จำนวนรายการทั้งหมด', summary.totalItems],
      ['จำนวนที่ขายทั้งหมด', summary.totalQty],
      [],
      ['อันดับ', 'ชื่อสินค้า', 'จำนวนที่ขาย']
    ];

    summary.allItems.forEach((item, index) => {
      summaryData.push([index + 1, item.name, item.totalQty]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'สรุปรวม');

    XLSX.writeFile(workbook, outputPath);
    return outputPath;
  }

  exportSummaryToExcel(parStartDate, endDate, summaryData, outputPath) {
    const workbook = XLSX.utils.book_new();

    // ========== Sheet 1: Summary ==========
    // Header with period information
    const excelData = [
      ['PAR Stock & Sales Summary Report'],
      [],
      ['PAR Period:', `${parStartDate} ถึง ${endDate}`],
      [],
      ['#', 'ชื่อสินค้า', 'PAR Stock', 'ขายไป (converted)', 'Transfer', 'คงเหลือ', 'การใช้งาน (%)']
    ];

    // Add comparison data with color indicators
    summaryData.comparison.forEach((item, index) => {
      const remaining = item.remaining;
      let remainingValue = item.remaining.toFixed(2);

      // Add emoji indicators for low/negative stock
      if (remaining < 0) {
        remainingValue = `🔴 ${remainingValue}`; // Red circle for negative
      } else if (remaining === 0) {
        remainingValue = `🟠 ${remainingValue}`; // Orange circle for zero
      } else if (remaining > 0 && remaining < 2) {
        remainingValue = `🟡 ${remainingValue}`; // Yellow circle for low stock
      }

      excelData.push([
        index + 1,
        item.name,
        item.parStock.toFixed(2),
        item.convertedSoldQty.toFixed(2),
        (item.transferQty || 0).toFixed(2),
        remainingValue,
        item.type === 'par_item' ? item.usagePercent.toFixed(1) : '-'
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths
    sheet['!cols'] = [
      { wch: 5 },   // #
      { wch: 50 },  // ชื่อสินค้า
      { wch: 12 },  // PAR Stock
      { wch: 18 },  // ขายไป
      { wch: 12 },  // Transfer
      { wch: 15 },  // คงเหลือ (wider for emoji)
      { wch: 15 }   // การใช้งาน
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, 'Summary');

    // ========== Sheets 2-N: Daily Sales Details ==========
    if (summaryData.dailySalesDetails && Array.isArray(summaryData.dailySalesDetails)) {
      summaryData.dailySalesDetails.forEach((dailyData, sheetIndex) => {
        const dailyExcelData = [
          [`Daily Sales - ${dailyData.date}`],
          [],
          ['#', 'ชื่อสินค้า', 'จำนวนขาย', 'หน่วย', 'Conversion Rate', 'Converted Qty']
        ];

        // Add daily sales items
        if (dailyData.items && Array.isArray(dailyData.items)) {
          dailyData.items.forEach((item, idx) => {
            const convRate = item.conversionRate || 1;
            const convertedQty = (item.qty || 0) * convRate;

            dailyExcelData.push([
              idx + 1,
              item.name || '-',
              (item.qty || 0).toFixed(2),
              item.unit || '-',
              convRate.toFixed(3),
              convertedQty.toFixed(2)
            ]);
          });
        }

        // Add totals row
        if (dailyData.summary) {
          dailyExcelData.push([]);
          dailyExcelData.push([
            '',
            'รวมทั้งหมด:',
            (dailyData.summary.totalQty || 0).toFixed(2),
            '',
            '',
            (dailyData.summary.totalConverted || 0).toFixed(2)
          ]);
          dailyExcelData.push([
            '',
            'จำนวนรายการ:',
            dailyData.items ? dailyData.items.length : 0
          ]);
        }

        const dailySheet = XLSX.utils.aoa_to_sheet(dailyExcelData);

        // Set column widths for daily sheet
        dailySheet['!cols'] = [
          { wch: 5 },   // #
          { wch: 50 },  // ชื่อสินค้า
          { wch: 12 },  // จำนวนขาย
          { wch: 10 },  // หน่วย
          { wch: 15 },  // Conversion Rate
          { wch: 15 }   // Converted Qty
        ];

        // Sheet name format: "DD-MM" (e.g., "15-Jan")
        const dateObj = new Date(dailyData.date);
        const sheetName = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

        XLSX.utils.book_append_sheet(workbook, dailySheet, sheetName);
      });
    }

    XLSX.writeFile(workbook, outputPath);
    return outputPath;
  }

  formatThaiDate(dateStr) {
    const date = new Date(dateStr);
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                       'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
  }

  generateParComparisonHTMLReport(parStartDate, comparison) {
    const items = comparison.comparison || [];
    const dateRange = comparison.dateRange;
    const periodLabel = dateRange
      ? `${this.formatThaiDate(dateRange.startDate)} - ${this.formatThaiDate(dateRange.endDate)}`
      : this.formatThaiDate(parStartDate);

    let html = `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>รายงานเปรียบเทียบ PAR Stock vs ยอดขาย - PAR Period ${periodLabel}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
        }
        .section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #dc2626;
            margin: 0 0 20px 0;
            border-bottom: 2px solid #dc2626;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 13px;
        }
        th {
            background-color: #dc2626;
            color: white;
            padding: 10px 8px;
            text-align: left;
        }
        td {
            padding: 8px;
            border-bottom: 1px solid #f0f0f0;
        }
        tr:hover {
            background-color: #fef2f2;
        }
        .status-ok {
            color: #059669;
            font-weight: bold;
        }
        .status-warning {
            color: #f59e0b;
            font-weight: bold;
        }
        .status-critical {
            color: #dc2626;
            font-weight: bold;
        }
        .progress-bar {
            width: 100%;
            height: 18px;
            background-color: #f0f0f0;
            border-radius: 9px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981 0%, #059669 100%);
            transition: width 0.3s ease;
        }
        .progress-fill.warning {
            background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
        }
        .progress-fill.critical {
            background: linear-gradient(90deg, #dc2626 0%, #991b1b 100%);
        }
        .matched-name {
            font-size: 11px;
            color: #666;
            font-style: italic;
        }
        .match-score {
            display: inline-block;
            padding: 2px 6px;
            background-color: #10b981;
            color: white;
            border-radius: 4px;
            font-size: 10px;
            margin-left: 5px;
        }
        .match-score.medium {
            background-color: #f59e0b;
        }
        .match-score.low {
            background-color: #dc2626;
        }
        .category-badge {
            display: inline-block;
            padding: 2px 8px;
            background-color: #e5e7eb;
            color: #374151;
            border-radius: 4px;
            font-size: 11px;
        }
        .conversion-info {
            font-size: 11px;
            color: #6b7280;
        }
        .unit-badge {
            display: inline-block;
            padding: 2px 6px;
            background-color: #dbeafe;
            color: #1e40af;
            border-radius: 4px;
            font-size: 10px;
            margin-left: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 รายงานเปรียบเทียบ PAR Stock vs ยอดขาย</h1>
        <p>PAR Period: ${periodLabel}</p>
        <p style="font-size: 14px; opacity: 0.9;">PAR เริ่มวันที่: ${this.formatThaiDate(parStartDate)}</p>
    </div>

    <div class="section">
        <h2>รายการสินค้าทั้งหมด (${items.length} รายการ)</h2>
        <table>
            <thead>
                <tr>
                    <th style="width: 40px;">อันดับ</th>
                    <th style="width: 250px;">ชื่อสินค้า / Category</th>
                    <th style="width: 90px; text-align: right;">PAR Stock</th>
                    <th style="width: 140px; text-align: right;">ยอดขาย</th>
                    <th style="width: 90px; text-align: right;">Transfer</th>
                    <th style="width: 90px; text-align: right;">คงเหลือ</th>
                    <th style="width: 140px; text-align: center;">% การใช้งาน</th>
                    <th style="width: 80px; text-align: center;">สถานะ</th>
                </tr>
            </thead>
            <tbody>`;

    items.forEach((item, index) => {
      let statusClass = 'status-ok';
      let statusText = 'ปกติ';
      let progressClass = '';

      if (item.usagePercent >= 100) {
        statusClass = 'status-critical';
        statusText = 'เกิน PAR!';
        progressClass = 'critical';
      } else if (item.usagePercent >= 80 || item.needsReorder) {
        statusClass = 'status-warning';
        statusText = 'ใกล้หมด';
        progressClass = 'warning';
      }

      const progressWidth = Math.min(item.usagePercent, 100);

      // ชื่อสินค้าและการจับคู่
      let nameDisplay = item.name;

      // แสดง originalNames ทั้งหมดที่ match กับ PAR item นี้
      if (item.originalNames && item.originalNames.length > 0) {
        const uniqueNames = [...new Set(item.originalNames)]; // Remove duplicates
        const namesHtml = uniqueNames.map(name =>
          `<span class="matched-name">← ${name}</span>`
        ).join('<br>');
        nameDisplay += `<br>${namesHtml}`;
      }

      // Category badge
      const categoryDisplay = item.category ? `<span class="category-badge">${item.category}</span>` : '';

      // ยอดขาย (แสดงทั้งต้นฉบับและแปลงแล้ว)
      let salesDisplay = '';
      if (item.conversionRate !== null && item.conversionRate !== 1) {
        salesDisplay = `
          ${item.soldQty.toLocaleString()} → <strong>${item.convertedSoldQty.toFixed(2)}</strong>
          <span class="unit-badge">${item.unit}</span>
          <br><span class="conversion-info">อัตราแปลง: ${item.conversionRate.toFixed(4)}</span>
        `;
      } else if (item.conversionRate === null) {
        salesDisplay = `${item.soldQty.toLocaleString()} <span class="unit-badge">${item.unit}</span>`;
      } else {
        salesDisplay = `<strong>${item.soldQty.toLocaleString()}</strong> <span class="unit-badge">${item.unit}</span>`;
      }

      // Transfer display (แสดงเครื่องหมาย + หรือ -)
      const transferQty = item.transferQty || 0;
      let transferDisplay = '';
      let transferColor = '#6b7280';
      if (transferQty > 0) {
        transferDisplay = `<span style="color: #059669; font-weight: bold;">+${transferQty.toFixed(2)}</span>`;
      } else if (transferQty < 0) {
        transferDisplay = `<span style="color: #dc2626; font-weight: bold;">${transferQty.toFixed(2)}</span>`;
      } else {
        transferDisplay = `<span style="color: #9ca3af;">-</span>`;
      }

      html += `
                <tr>
                    <td><strong>#${index + 1}</strong></td>
                    <td>
                        ${nameDisplay}
                        ${categoryDisplay ? '<br>' + categoryDisplay : ''}
                    </td>
                    <td style="text-align: right;">${item.parStock.toLocaleString()}</td>
                    <td style="text-align: right;">${salesDisplay}</td>
                    <td style="text-align: right;">${transferDisplay}</td>
                    <td style="text-align: right;"><strong>${item.remaining.toFixed(2)}</strong></td>
                    <td style="text-align: center;">
                        <div class="progress-bar">
                            <div class="progress-fill ${progressClass}" style="width: ${progressWidth}%"></div>
                        </div>
                        <small>${item.usagePercent.toFixed(1)}%</small>
                    </td>
                    <td style="text-align: center;" class="${statusClass}">${statusText}</td>
                </tr>`;
    });

    html += `
            </tbody>
        </table>
    </div>
</body>
</html>`;

    return html;
  }

  formatMonth(yearMonth) {
    const [year, month] = yearMonth.split('-');
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                       'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${thaiMonths[parseInt(month) - 1]} ${parseInt(year) + 543}`;
  }
}

module.exports = HotelReportGenerator;
