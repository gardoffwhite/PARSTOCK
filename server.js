const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const HotelExcelReader = require('./utils/hotelExcelReader');
const HotelReportGenerator = require('./utils/hotelReportGenerator');
const DataStorage = require('./utils/dataStorage');
const ParStockReader = require('./utils/parStockReader');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xls' && ext !== '.xlsx') {
      return cb(new Error('Only Excel files are allowed'));
    }
    cb(null, true);
  }
});

const reportsDir = './reports';
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// NEW API: Preview daily sale for conversion rate selection
app.post('/api/preview-daily-sale', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const excelReader = new HotelExcelReader();
    const result = excelReader.readFile(req.file.path);

    if (!result.success) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: result.error });
    }

    const summary = excelReader.generateDailySummary(result.data, result.date);

    // Get latest PAR stock for matching
    const storage = new DataStorage();
    const parPeriods = storage.getAllParStockPeriods();
    let parMatches = null;

    if (parPeriods && parPeriods.length > 0) {
      // Use the most recent PAR stock that is <= upload date
      let selectedParDate = null;
      for (const parDate of parPeriods) {
        if (parDate <= result.date) {
          selectedParDate = parDate;
          break;
        }
      }

      if (selectedParDate) {
        const parStock = storage.getParStock(selectedParDate);
        if (parStock) {
          // Match sales items with PAR stock
          const NameMatching = require('./utils/nameMatching');
          const salesItems = result.data.map(item => ({ name: item.name }));
          const matches = NameMatching.matchItems(salesItems, parStock.summary.items, 0.3);

          parMatches = {
            parDate: selectedParDate,
            matches: matches,
            parItems: parStock.summary.items  // Send all PAR items for dropdown
          };
        }
      }
    }

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      date: result.date,
      items: result.data,
      summary: summary,
      parMatches: parMatches
    });

  } catch (error) {
    console.error('Error previewing file:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// NEW API: Save daily sale with conversion rates
app.post('/api/save-daily-sale', async (req, res) => {
  try {
    const { date, items, summary, conversionRates } = req.body;

    if (!date || !items || !summary || !conversionRates) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Apply conversion rates to items
    const itemsWithConversion = items.map(item => ({
      ...item,
      conversionRate: conversionRates[item.name] || 1
    }));

    const storage = new DataStorage();
    storage.saveDailySaleWithConversion(date, itemsWithConversion, summary, conversionRates);

    res.json({
      success: true,
      message: 'Daily sale saved successfully',
      date: date
    });

  } catch (error) {
    console.error('Error saving daily sale:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW API: Get summary with PAR comparison
app.get('/api/summary/:parStartDate/:endDate', async (req, res) => {
  try {
    const { parStartDate, endDate } = req.params;
    const storage = new DataStorage();

    const summary = storage.getSummaryWithPar(parStartDate, endDate);

    if (!summary) {
      return res.status(404).json({ error: 'No data found' });
    }

    res.json(summary);

  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export Summary to Excel
app.get('/api/export-summary/:parStartDate/:endDate', async (req, res) => {
  try {
    const { parStartDate, endDate } = req.params;
    const storage = new DataStorage();
    const reportGenerator = new HotelReportGenerator();

    const summary = storage.getSummaryWithPar(parStartDate, endDate);

    if (!summary) {
      return res.status(404).json({ error: 'No data found' });
    }

    const timestamp = Date.now();
    const excelPath = path.join(reportsDir, `summary-${parStartDate}-to-${endDate}-${timestamp}.xlsx`);

    reportGenerator.exportSummaryToExcel(parStartDate, endDate, summary, excelPath);

    res.json({
      success: true,
      excelReportUrl: `/reports/summary-${parStartDate}-to-${endDate}-${timestamp}.xlsx`
    });

  } catch (error) {
    console.error('Error exporting summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW API: Get daily sale by date
app.get('/api/daily-sale/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const storage = new DataStorage();

    const dailyData = storage.getDailyData(date);

    if (!dailyData) {
      return res.status(404).json({ error: 'No data found for this date' });
    }

    res.json(dailyData);

  } catch (error) {
    console.error('Error getting daily sale:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { conversionRate } = req.body;
    const excelReader = new HotelExcelReader();
    const reportGenerator = new HotelReportGenerator();
    const storage = new DataStorage();

    const result = excelReader.readFile(req.file.path);

    if (!result.success) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: result.error });
    }

    const summary = excelReader.generateDailySummary(result.data, result.date);

    // บันทึกพร้อม conversion rate ถ้ามี
    const parsedRate = conversionRate ? parseFloat(conversionRate) : null;
    storage.saveDailyData(result.date, result.data, summary, parsedRate);

    const timestamp = Date.now();
    const htmlReport = reportGenerator.generateDailyHTMLReport(result.date, summary, result.data);
    const htmlPath = path.join(reportsDir, `daily-${result.date}-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);

    const excelPath = path.join(reportsDir, `daily-${result.date}-${timestamp}.xlsx`);
    reportGenerator.exportDailyToExcel(result.date, summary, result.data, excelPath);

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'File processed successfully',
      date: result.date,
      summary: summary,
      conversionRate: parsedRate,
      htmlReportUrl: `/reports/daily-${result.date}-${timestamp}.html`,
      excelReportUrl: `/reports/daily-${result.date}-${timestamp}.xlsx`
    });

  } catch (error) {
    console.error('Error processing file:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

app.use('/reports', express.static('reports'));

app.get('/api/reports', (req, res) => {
  try {
    const files = fs.readdirSync(reportsDir);
    const reports = files
      .filter(file => file.endsWith('.html'))
      .map(file => {
        const stats = fs.statSync(path.join(reportsDir, file));
        const timestamp = file.match(/report-(\d+)\.html/)[1];
        return {
          filename: file,
          url: `/reports/${file}`,
          excelUrl: `/reports/report-${timestamp}.xlsx`,
          createdAt: stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/daily/:date', (req, res) => {
  try {
    const storage = new DataStorage();
    const data = storage.getDailyData(req.params.date);

    if (!data) {
      return res.status(404).json({ error: 'No data found for this date' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/monthly/:yearMonth', (req, res) => {
  try {
    const storage = new DataStorage();
    const reportGenerator = new HotelReportGenerator();
    const data = storage.getMonthlyData(req.params.yearMonth);

    if (!data) {
      return res.status(404).json({ error: 'No data found for this month' });
    }

    const timestamp = Date.now();
    const htmlReport = reportGenerator.generateMonthlyHTMLReport(req.params.yearMonth, data);
    const htmlPath = path.join(reportsDir, `monthly-${req.params.yearMonth}-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);

    res.json({
      success: true,
      data: data,
      htmlReportUrl: `/reports/monthly-${req.params.yearMonth}-${timestamp}.html`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/daterange/:startDate/:endDate', (req, res) => {
  try {
    const storage = new DataStorage();
    const reportGenerator = new HotelReportGenerator();
    const { startDate, endDate } = req.params;

    const dateRangeData = storage.getDateRangeData(startDate, endDate);

    if (!dateRangeData || dateRangeData.totalItems === 0) {
      return res.status(404).json({ error: 'No data found for this date range' });
    }

    const timestamp = Date.now();
    const htmlReport = reportGenerator.generateDateRangeHTMLReport(startDate, endDate, dateRangeData);
    const htmlPath = path.join(reportsDir, `daterange-${startDate}-to-${endDate}-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);

    res.json({
      success: true,
      data: dateRangeData,
      htmlReportUrl: `/reports/daterange-${startDate}-to-${endDate}-${timestamp}.html`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload-par', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { startDate } = req.body;
    if (!startDate) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Start date is required (format: YYYY-MM-DD)' });
    }

    const parReader = new ParStockReader();
    const storage = new DataStorage();

    const result = parReader.readFile(req.file.path);

    if (!result.success) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: result.error });
    }

    const summary = parReader.generateParStockSummary(result.data, startDate);
    storage.saveParStock(startDate, result.data, summary);

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'PAR Stock uploaded successfully',
      startDate: startDate,
      summary: summary
    });

  } catch (error) {
    console.error('Error processing PAR stock file:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/par-comparison/:parStartDate', (req, res) => {
  try {
    const storage = new DataStorage();
    const reportGenerator = new HotelReportGenerator();
    const { parStartDate } = req.params;
    const { date } = req.query; // รับวันที่จาก query parameter

    const comparison = storage.compareParWithSales(parStartDate, date);

    if (!comparison) {
      return res.status(404).json({ error: 'No PAR Stock data found for this period' });
    }

    const timestamp = Date.now();
    const htmlReport = reportGenerator.generateParComparisonHTMLReport(parStartDate, comparison);
    const filenamePart = date ? `par-comparison-${parStartDate}-${date}-${timestamp}` : `par-comparison-${parStartDate}-${timestamp}`;
    const htmlPath = path.join(reportsDir, `${filenamePart}.html`);
    fs.writeFileSync(htmlPath, htmlReport);

    res.json({
      success: true,
      data: comparison,
      htmlReportUrl: `/reports/${filenamePart}.html`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dates-in-par-period/:parStartDate', (req, res) => {
  try {
    const storage = new DataStorage();
    const { parStartDate } = req.params;

    const dateRange = storage.getValidDateRangeForPar(parStartDate);
    if (!dateRange) {
      return res.status(404).json({ error: 'No PAR period found' });
    }

    const allDates = storage.getAllDates();

    // กรองเฉพาะวันที่ในช่วง PAR period
    const datesInPeriod = allDates.filter(date =>
      date >= dateRange.startDate && date <= dateRange.endDate
    );

    res.json({
      success: true,
      dates: datesInPeriod,
      dateRange: dateRange
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const storage = new DataStorage();
    const stats = storage.getStats();
    const allDates = storage.getAllDates();
    const allMonths = storage.getAllMonths();
    const parPeriods = storage.getAllParStockPeriods();

    res.json({
      stats,
      dates: allDates,
      months: allMonths,
      parPeriods: parPeriods,
      dailyDates: allDates // Add dailyDates for viewing daily sales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Group Items Management APIs ==========

// Get all group items
app.get('/api/group-items', (req, res) => {
  try {
    const dataStorage = new DataStorage();
    const groupItems = dataStorage.loadGroupItems();
    res.json({ success: true, items: groupItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single group item
app.get('/api/group-items/:id', (req, res) => {
  try {
    const dataStorage = new DataStorage();
    const groupItem = dataStorage.getGroupItem(req.params.id);

    if (!groupItem) {
      return res.status(404).json({ error: 'Group item not found' });
    }

    res.json({ success: true, item: groupItem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new group item
app.post('/api/group-items', (req, res) => {
  try {
    const dataStorage = new DataStorage();
    const { name, description, subItems } = req.body;

    // Validate
    if (!name || !subItems || subItems.length === 0) {
      return res.status(400).json({ error: 'Name and subItems are required' });
    }

    // Check duplicate name
    const existing = dataStorage.findGroupItemByName(name);
    if (existing) {
      return res.status(400).json({ error: 'Group item with this name already exists' });
    }

    const newGroupItem = dataStorage.addGroupItem({
      name,
      description: description || '',
      subItems
    });

    res.json({ success: true, item: newGroupItem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update group item
app.put('/api/group-items/:id', (req, res) => {
  try {
    const dataStorage = new DataStorage();
    const { name, description, subItems } = req.body;

    const updatedItem = dataStorage.updateGroupItem(req.params.id, {
      name,
      description,
      subItems
    });

    res.json({ success: true, item: updatedItem });
  } catch (error) {
    if (error.message === 'Group item not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete group item
app.delete('/api/group-items/:id', (req, res) => {
  try {
    const dataStorage = new DataStorage();
    dataStorage.deleteGroupItem(req.params.id);
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'Group item not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// ===== DAILY TRANSFER ENDPOINTS =====

/**
 * Parse transfer data and match with PAR stock
 */
app.post('/api/parse-transfer', (req, res) => {
  try {
    const dataStorage = new DataStorage();
    const { items, date } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items data' });
    }

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const matchedItems = dataStorage.parseTransferWithPAR(items, date);

    res.json({
      success: true,
      items: matchedItems,
      count: matchedItems.length
    });

  } catch (error) {
    console.error('Parse transfer error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Save daily transfer data
 */
app.post('/api/save-daily-transfer', (req, res) => {
  try {
    const dataStorage = new DataStorage();
    const { date, items, direction } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items data' });
    }

    if (!direction || !['in', 'out'].includes(direction)) {
      return res.status(400).json({ error: 'Direction must be "in" or "out"' });
    }

    const result = dataStorage.saveDailyTransfer(date, items, direction);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Save transfer error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get daily transfer by date
 */
app.get('/api/daily-transfer/:date', (req, res) => {
  try {
    const dataStorage = new DataStorage();
    const { date } = req.params;
    const transferData = dataStorage.getDailyTransfer(date);

    if (!transferData) {
      return res.status(404).json({ error: 'Transfer data not found for this date' });
    }

    res.json(transferData);

  } catch (error) {
    console.error('Get transfer error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all transfer dates
 */
app.get('/api/transfer-dates', (req, res) => {
  try {
    const dataStorage = new DataStorage();
    const dates = dataStorage.getTransferDates();

    res.json({
      success: true,
      dates: dates
    });

  } catch (error) {
    console.error('Get transfer dates error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete daily transfer
 */
app.delete('/api/daily-transfer/:date', (req, res) => {
  try {
    const dataStorage = new DataStorage();
    const { date } = req.params;
    const deleted = dataStorage.deleteDailyTransfer(date);

    if (!deleted) {
      return res.status(404).json({ error: 'Transfer data not found for this date' });
    }

    res.json({
      success: true,
      message: 'Transfer deleted successfully'
    });

  } catch (error) {
    console.error('Delete transfer error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Upload Excel files to generate Hotel Sales reports`);
});
