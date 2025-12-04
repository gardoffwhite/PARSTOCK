const XLSX = require('xlsx');

class ReportGenerator {
  generateSummaryReport(summary) {
    const report = {
      title: 'PAR Stock และสรุปยอดขาย',
      generatedAt: new Date().toLocaleString('th-TH'),
      categories: []
    };

    const categoryNames = {
      glassBottle: 'Glass Bottles / ขวดแก้ว',
      pairing: 'Pairing Items / สินค้าจับคู่',
      potion: 'Potions / เครื่องดื่ม',
      other: 'อื่นๆ'
    };

    for (const [key, value] of Object.entries(summary.byCategory)) {
      if (value.count > 0) {
        report.categories.push({
          name: categoryNames[key],
          count: value.count,
          totalPAR: value.totalPAR,
          totalSales: value.totalSales,
          variance: value.totalPAR - value.totalSales,
          utilizationRate: value.totalPAR > 0
            ? ((value.totalSales / value.totalPAR) * 100).toFixed(2) + '%'
            : '0%'
        });
      }
    }

    report.grandTotal = {
      totalItems: summary.totalItems,
      totalPAR: summary.grandTotal.totalPAR,
      totalSales: summary.grandTotal.totalSales,
      variance: summary.grandTotal.totalPAR - summary.grandTotal.totalSales,
      utilizationRate: summary.grandTotal.totalPAR > 0
        ? ((summary.grandTotal.totalSales / summary.grandTotal.totalPAR) * 100).toFixed(2) + '%'
        : '0%'
    };

    return report;
  }

  exportToExcel(categorized, summary, outputPath) {
    const workbook = XLSX.utils.book_new();

    const summarySheet = this.createSummarySheet(summary);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'สรุปรวม');

    const categoryNames = {
      glassBottle: 'Glass Bottles',
      pairing: 'Pairing',
      potion: 'Potions',
      other: 'Other'
    };

    for (const [key, items] of Object.entries(categorized)) {
      if (items.length > 0) {
        const sheet = XLSX.utils.json_to_sheet(items);
        XLSX.utils.book_append_sheet(workbook, sheet, categoryNames[key]);
      }
    }

    XLSX.writeFile(workbook, outputPath);
    return outputPath;
  }

  createSummarySheet(summary) {
    const summaryData = [
      ['PAR Stock และสรุปยอดขาย'],
      ['สร้างเมื่อ:', new Date().toLocaleString('th-TH')],
      [],
      ['หมวดหมู่', 'จำนวนรายการ', 'PAR Stock', 'ยอดขาย', 'ส่วนต่าง', 'อัตราการใช้งาน (%)'],
    ];

    const categoryNames = {
      glassBottle: 'Glass Bottles / ขวดแก้ว',
      pairing: 'Pairing Items / สินค้าจับคู่',
      potion: 'Potions / เครื่องดื่ม',
      other: 'อื่นๆ'
    };

    for (const [key, value] of Object.entries(summary.byCategory)) {
      if (value.count > 0) {
        const variance = value.totalPAR - value.totalSales;
        const utilizationRate = value.totalPAR > 0
          ? ((value.totalSales / value.totalPAR) * 100).toFixed(2)
          : 0;

        summaryData.push([
          categoryNames[key],
          value.count,
          value.totalPAR,
          value.totalSales,
          variance,
          utilizationRate
        ]);
      }
    }

    summaryData.push([]);
    summaryData.push([
      'รวมทั้งหมด',
      summary.totalItems,
      summary.grandTotal.totalPAR,
      summary.grandTotal.totalSales,
      summary.grandTotal.totalPAR - summary.grandTotal.totalSales,
      summary.grandTotal.totalPAR > 0
        ? ((summary.grandTotal.totalSales / summary.grandTotal.totalPAR) * 100).toFixed(2)
        : 0
    ]);

    return XLSX.utils.aoa_to_sheet(summaryData);
  }

  generateHTMLReport(report, categorized) {
    let html = `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
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
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
            margin: 0 0 15px 0;
            color: #667eea;
            font-size: 14px;
            text-transform: uppercase;
        }
        .summary-card .number {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        .summary-card .label {
            color: #666;
            font-size: 14px;
        }
        table {
            width: 100%;
            background: white;
            border-collapse: collapse;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        th {
            background-color: #667eea;
            color: white;
            padding: 15px;
            text-align: left;
        }
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #f0f0f0;
        }
        tr:hover {
            background-color: #f8f9ff;
        }
        .positive {
            color: #10b981;
            font-weight: bold;
        }
        .negative {
            color: #ef4444;
            font-weight: bold;
        }
        .grand-total {
            background-color: #f8f9ff;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p>สร้างเมื่อ: ${report.generatedAt}</p>
    </div>

    <div class="summary-grid">
        <div class="summary-card">
            <h3>จำนวนรายการทั้งหมด</h3>
            <div class="number">${report.grandTotal.totalItems}</div>
            <div class="label">รายการ</div>
        </div>
        <div class="summary-card">
            <h3>PAR Stock รวม</h3>
            <div class="number">${report.grandTotal.totalPAR.toLocaleString()}</div>
            <div class="label">หน่วย</div>
        </div>
        <div class="summary-card">
            <h3>ยอดขายรวม</h3>
            <div class="number">${report.grandTotal.totalSales.toLocaleString()}</div>
            <div class="label">หน่วย</div>
        </div>
        <div class="summary-card">
            <h3>อัตราการใช้งาน</h3>
            <div class="number">${report.grandTotal.utilizationRate}</div>
            <div class="label">ของ PAR Stock</div>
        </div>
    </div>

    <h2>สรุปตามหมวดหมู่</h2>
    <table>
        <thead>
            <tr>
                <th>หมวดหมู่</th>
                <th>จำนวนรายการ</th>
                <th>PAR Stock</th>
                <th>ยอดขาย</th>
                <th>ส่วนต่าง</th>
                <th>อัตราการใช้งาน</th>
            </tr>
        </thead>
        <tbody>`;

    report.categories.forEach(cat => {
      const varianceClass = cat.variance >= 0 ? 'positive' : 'negative';
      html += `
            <tr>
                <td><strong>${cat.name}</strong></td>
                <td>${cat.count}</td>
                <td>${cat.totalPAR.toLocaleString()}</td>
                <td>${cat.totalSales.toLocaleString()}</td>
                <td class="${varianceClass}">${cat.variance.toLocaleString()}</td>
                <td>${cat.utilizationRate}</td>
            </tr>`;
    });

    const totalVarianceClass = report.grandTotal.variance >= 0 ? 'positive' : 'negative';
    html += `
            <tr class="grand-total">
                <td>รวมทั้งหมด</td>
                <td>${report.grandTotal.totalItems}</td>
                <td>${report.grandTotal.totalPAR.toLocaleString()}</td>
                <td>${report.grandTotal.totalSales.toLocaleString()}</td>
                <td class="${totalVarianceClass}">${report.grandTotal.variance.toLocaleString()}</td>
                <td>${report.grandTotal.utilizationRate}</td>
            </tr>
        </tbody>
    </table>
</body>
</html>`;

    return html;
  }
}

module.exports = ReportGenerator;
