const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const HotelExcelReader = require('./utils/hotelExcelReader');
const HotelReportGenerator = require('./utils/hotelReportGenerator');
const DataStorage = require('./utils/dataStorage');
const ParStockReader = require('./utils/parStockReader');

const app = express();
const PORT = process.env.PORT || 8080;

// Session configuration
// NOTE: Using MemoryStore for development. For production, use connect-session-sequelize or Redis.
app.use(session({
  secret: process.env.SESSION_SECRET || 'parstock-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if using HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
  // For production, add: store: new SessionStore(...)
}));

app.use(cors());
app.use(express.json());

// Authentication middleware for HTML pages
function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  // Check if it's an API request
  if (req.path.startsWith('/api')) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  }
  res.redirect('/login.html');
}

// Default credentials (Username: admin, Password: admin123)
// In production, store these securely in a database
const USERS = {
  'admin': {
    username: 'admin',
    // Hash of 'admin123'
    passwordHash: '$2a$10$rjp2n4xSb.cJQY6K6KBFsOEUlac7uibUrHG4SBucU5/2sYWTRWj.O'
  }
};

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

// Helper function to delete old report files of the same type
function deleteOldReports(reportPrefix) {
  try {
    const files = fs.readdirSync(reportsDir);
    const pattern = new RegExp(`^${reportPrefix}.*\\.(html|xlsx)$`);

    files.forEach(file => {
      if (pattern.test(file)) {
        const filePath = path.join(reportsDir, file);
        fs.unlinkSync(filePath);
        console.log(`Deleted old report: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error deleting old reports:', error);
  }
}

// Serve static files (CSS, JS, images) - no auth required
app.use(express.static('public', {
  index: false
}));

// Routes
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login page - no auth required
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login API
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const user = USERS[username];
    if (!user) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    // Set session
    req.session.isAuthenticated = true;
    req.session.username = username;

    res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

// Logout API
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'ไม่สามารถออกจากระบบได้' });
    }
    res.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
  });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    res.json({
      isAuthenticated: true,
      username: req.session.username
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});

// Protect all API routes (except login/logout/auth)
app.use('/api', (req, res, next) => {
  // Allow these public endpoints
  if (req.path === '/login' || req.path === '/logout' || req.path.startsWith('/auth')) {
    return next();
  }
  // Require authentication for all other API routes
  return requireAuth(req, res, next);
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

          // First, try to use matching history
          const matchesWithHistory = salesItems.map(saleItem => {
            const bestMatch = storage.getBestMatch(saleItem.name);

            if (bestMatch) {
              // Use historical match
              return {
                saleItem: saleItem.name,
                matched: true,
                matchedName: bestMatch.parName,
                score: 1.0, // Perfect match from history
                conversionRate: bestMatch.conversionRate,
                unit: bestMatch.unit,
                fromHistory: true,
                allMatches: storage.getMatchingHistory(saleItem.name) // All variations
              };
            }

            // No history, use fuzzy matching
            return null;
          });

          // For items without history, use fuzzy matching
          const itemsNeedingMatch = salesItems.filter((_, idx) => !matchesWithHistory[idx]);
          let fuzzyMatches = [];
          const parItems = parStock.summary?.items || parStock.items || [];

          if (itemsNeedingMatch.length > 0) {
            fuzzyMatches = NameMatching.matchItems(itemsNeedingMatch, parItems, 0.3);
          }

          // Combine matches
          let fuzzyIdx = 0;
          const finalMatches = matchesWithHistory.map(match => {
            if (match) return match;
            return fuzzyMatches[fuzzyIdx++];
          });

          parMatches = {
            parDate: selectedParDate,
            matches: finalMatches,
            parItems: parItems  // Send all PAR items for dropdown
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

// NEW API: Get real-time PAR stock levels
app.post('/api/get-realtime-par', async (req, res) => {
  try {
    const { parNames, date } = req.body;

    if (!parNames || !Array.isArray(parNames)) {
      return res.status(400).json({ error: 'Missing parNames array' });
    }

    const storage = new DataStorage();
    const parPeriods = storage.getAllParStockPeriods();

    if (!parPeriods || parPeriods.length === 0) {
      return res.json({ stocks: {} });
    }

    // Find the most recent PAR period that is <= the given date
    // parPeriods is sorted in reverse chronological order (newest first)
    let selectedParDate = null;

    if (!date) {
      // If no date specified, use the most recent PAR
      selectedParDate = parPeriods[0];
    } else {
      // Find the most recent PAR that is on or before the given date
      for (const parDate of parPeriods) {
        if (parDate <= date) {
          selectedParDate = parDate;
          break;
        }
      }
    }

    if (!selectedParDate) {
      return res.json({ stocks: {} });
    }

    const parStock = storage.getParStock(selectedParDate);
    if (!parStock) {
      console.log(`No PAR stock found for date: ${selectedParDate}`);
      return res.json({ stocks: {} });
    }

    const parItems = parStock.summary?.items || parStock.items || [];
    console.log(`Using PAR stock from: ${selectedParDate}, Total items: ${parItems.length}`);

    // Get all daily sales in this PAR period
    const allDailySales = storage.loadDailyData();
    let totalSales = {};

    // Calculate total sales for each item up to the given date
    for (const [saleDate, dailySale] of Object.entries(allDailySales)) {
      if (saleDate >= selectedParDate && (!date || saleDate <= date)) {
        if (dailySale && dailySale.items) {
          dailySale.items.forEach(item => {
            const itemName = item.name;
            const qty = item.qty * (item.conversionRate || 1);
            totalSales[itemName] = (totalSales[itemName] || 0) + qty;
          });
        }
      }
    }

    // Get transfers
    const allTransfers = storage.loadDailyTransfers();
    let totalTransfers = {};

    for (const [transferDate, transfer] of Object.entries(allTransfers)) {
      if (transferDate >= selectedParDate && (!date || transferDate <= date)) {
        if (transfer && transfer.items) {
          transfer.items.forEach(item => {
            const itemName = item.name;
            const qty = item.finalQty; // Already has direction (+/-)
            totalTransfers[itemName] = (totalTransfers[itemName] || 0) + qty;
          });
        }
      }
    }

    // Calculate real-time stock for each requested PAR name
    const stocks = {};
    parNames.forEach(parName => {
      if (!parName) return;

      // Find item in PAR stock
      const parItem = parItems.find(item => item.name === parName);
      if (parItem) {
        const openingStock = parseFloat(parItem.parStock || parItem.qty) || 0;
        const sales = totalSales[parName] || 0;
        const transfers = totalTransfers[parName] || 0;

        // Formula: Opening Stock - Sales + Transfers
        const currentStock = openingStock - sales + transfers;

        console.log(`Item: ${parName}, Opening: ${openingStock}, Sales: ${sales}, Transfers: ${transfers}, Current: ${currentStock}`);

        stocks[parName] = {
          opening: openingStock,
          sales: sales,
          transfers: transfers,
          current: currentStock
        };
      } else {
        console.log(`Item NOT FOUND in PAR: ${parName}`);
        console.log(`Available PAR items (first 5):`, parItems.slice(0, 5).map(i => i.name));
      }
    });

    res.json({ stocks, parPeriod: selectedParDate });

  } catch (error) {
    console.error('Get realtime PAR error:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW API: Save daily sale with conversion rates
app.post('/api/save-daily-sale', async (req, res) => {
  try {
    const { date, items, summary, conversionRates, matchedItems, updateParStock } = req.body;

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

    // Save matching history for future use
    if (matchedItems) {
      matchedItems.forEach(match => {
        if (match.matched && match.matchedName) {
          storage.saveMatchingHistory(
            match.saleItem,
            match.matchedName,
            match.conversionRate || 1,
            match.unit || null
          );
        }
      });
    }

    const response = {
      success: true,
      message: 'Daily sale saved successfully',
      date: date
    };

    // Update PAR Stock if requested
    if (updateParStock) {
      const parStockUpdates = {
        updated: [],
        added: [],
        notFound: []
      };

      // Get all PAR Stock dates to find the latest one
      const parStockDates = storage.getAllParStockPeriods();

      if (parStockDates.length > 0) {
        // Sort dates descending and get the latest
        const latestParDate = parStockDates.sort((a, b) => new Date(b) - new Date(a))[0];
        const parStock = storage.getParStock(latestParDate);

        if (parStock) {
          const parItems = parStock.summary?.items || parStock.items || [];
          let hasChanges = false;

          // Process each Daily Sale item
          items.forEach(saleItem => {
            // Find matching PAR Stock item by name (case-insensitive)
            const parIndex = parItems.findIndex(
              parItem => parItem.name.toLowerCase() === saleItem.name.toLowerCase()
            );

            if (parIndex !== -1) {
              // Item exists - update name if manually edited
              if (saleItem.manuallyEdited) {
                const oldName = parItems[parIndex].name;
                parItems[parIndex].name = saleItem.name;

                // Keep other properties intact
                if (saleItem.category) {
                  parItems[parIndex].category = saleItem.category;
                }

                parStockUpdates.updated.push(saleItem.name);
                console.log(`Updated PAR Stock from Daily Sale: "${oldName}" -> "${saleItem.name}"`);
                hasChanges = true;
              }
            } else {
              // Item not found - add new item to PAR Stock
              const newParItem = {
                name: saleItem.name,
                category: saleItem.category || 'Uncategorized',
                opening: 0,
                current: 0,
                parStock: 0
              };

              parItems.push(newParItem);
              parStockUpdates.added.push(saleItem.name);
              console.log(`Added new item to PAR Stock from Daily Sale: "${saleItem.name}"`);
              hasChanges = true;
            }
          });

          // Save updated PAR Stock if any changes were made
          if (hasChanges) {
            storage.saveParStock(latestParDate, parItems);
            console.log(`PAR Stock updated from Daily Sale: ${parStockUpdates.updated.length} updated, ${parStockUpdates.added.length} added`);
          }
        }
      }

      response.parStockUpdates = parStockUpdates;
    }

    res.json(response);

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

// Get item details (daily sales + transfers)
app.get('/api/item-details/:itemName', async (req, res) => {
  try {
    const { itemName } = req.params;
    const { parStartDate, endDate } = req.query;

    if (!parStartDate || !endDate) {
      return res.status(400).json({ error: 'Missing parStartDate or endDate' });
    }

    const storage = new DataStorage();
    const dailyData = storage.loadDailyData();
    const transferData = storage.loadDailyTransfers();

    // Collect daily sales for this item
    const dailySales = [];
    let totalSales = 0;
    let totalConverted = 0;

    for (const [date, data] of Object.entries(dailyData)) {
      if (date >= parStartDate && date <= endDate && data.items && Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (item.name === itemName) {
            const conversionRate = item.conversionRate || 1;
            const convertedQty = item.qty * conversionRate;

            dailySales.push({
              date: date,
              qty: item.qty,
              conversionRate: conversionRate,
              convertedQty: convertedQty
            });

            totalSales += item.qty;
            totalConverted += convertedQty;
          }
        });
      }
    }

    // Sort by date
    dailySales.sort((a, b) => a.date.localeCompare(b.date));

    // Collect transfers for this item
    const transfers = [];
    let totalTransfer = 0;

    for (const [date, data] of Object.entries(transferData)) {
      if (date >= parStartDate && date <= endDate && data.items && Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (item.name === itemName) {
            transfers.push({
              date: date,
              direction: data.direction,
              qty: item.qty,
              finalQty: item.finalQty
            });

            totalTransfer += item.finalQty;
          }
        });
      }
    }

    // Sort by date
    transfers.sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      itemName: itemName,
      dailySales: dailySales,
      totalSales: totalSales,
      totalConverted: totalConverted,
      transfers: transfers,
      totalTransfer: totalTransfer
    });

  } catch (error) {
    console.error('Error fetching item details:', error);
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

    // Get daily sales details for each date in the range
    const dailySalesDetails = [];
    const start = new Date(parStartDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const dailyData = storage.getDailyData(dateStr);

      if (dailyData) {
        // Calculate total converted qty
        let totalConverted = 0;
        if (dailyData.items) {
          dailyData.items.forEach(item => {
            const convRate = item.conversionRate || 1;
            totalConverted += (item.qty || 0) * convRate;
          });
        }

        dailySalesDetails.push({
          date: dateStr,
          items: dailyData.items || [],
          summary: {
            ...dailyData.summary,
            totalConverted: totalConverted
          }
        });
      }
    }

    // Add daily sales details to summary data
    summary.dailySalesDetails = dailySalesDetails;

    // Format dates as DD-MM-YY for filename (short year format)
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yy = String(date.getFullYear()).slice(-2); // Get last 2 digits of year
      return `${dd}-${mm}-${yy}`;
    };

    const fileName = `SbParstock_${formatDate(parStartDate)}_${formatDate(endDate)}.xlsx`;
    const excelPath = path.join(reportsDir, fileName);

    reportGenerator.exportSummaryToExcel(parStartDate, endDate, summary, excelPath);

    res.json({
      success: true,
      excelReportUrl: `/reports/${fileName}`
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

// DELETE API: Delete daily sale by date
app.delete('/api/daily-sale/:date', requireAuth, async (req, res) => {
  try {
    const { date } = req.params;
    const storage = new DataStorage();

    const result = storage.deleteDailyData(date);

    if (!result) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลวันที่นี้' });
    }

    res.json({
      success: true,
      message: `ลบข้อมูลยอดขายวันที่ ${date} สำเร็จ`
    });

  } catch (error) {
    console.error('Error deleting daily sale:', error);
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

    // Delete old daily reports for this date
    deleteOldReports(`daily-${result.date}`);

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

    // Delete old monthly reports for this month
    deleteOldReports(`monthly-${req.params.yearMonth}`);

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

    // Delete old date range reports for this range
    deleteOldReports(`daterange-${startDate}-to-${endDate}`);

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

    // Delete old PAR comparison reports for this period
    const reportPrefix = date ? `par-comparison-${parStartDate}-${date}` : `par-comparison-${parStartDate}`;
    deleteOldReports(reportPrefix);

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
    const { date, items, direction, updateParStock } = req.body;

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

    const response = {
      success: true,
      data: result
    };

    // Update PAR Stock if requested
    if (updateParStock) {
      const parStockUpdates = {
        updated: [],
        added: [],
        notFound: []
      };

      // Get all PAR Stock dates to find the latest one
      const parStockDates = dataStorage.getAllParStockPeriods();

      if (parStockDates.length > 0) {
        // Sort dates descending and get the latest
        const latestParDate = parStockDates.sort((a, b) => new Date(b) - new Date(a))[0];
        const parStock = dataStorage.getParStock(latestParDate);

        if (parStock) {
          const parItems = parStock.summary?.items || parStock.items || [];
          let hasChanges = false;

          // Process each transfer item
          items.forEach(transferItem => {
            // Find matching PAR Stock item by name (case-insensitive)
            const parIndex = parItems.findIndex(
              parItem => parItem.name.toLowerCase() === transferItem.name.toLowerCase()
            );

            if (parIndex !== -1) {
              // Item exists - update name if manually edited
              if (transferItem.manuallyEdited) {
                const oldName = parItems[parIndex].name;
                parItems[parIndex].name = transferItem.name;

                // Keep other properties intact
                if (transferItem.category) {
                  parItems[parIndex].category = transferItem.category;
                }

                parStockUpdates.updated.push(transferItem.name);
                console.log(`Updated PAR Stock: "${oldName}" -> "${transferItem.name}"`);
                hasChanges = true;
              }
            } else {
              // Item not found - add new item to PAR Stock
              const newParItem = {
                name: transferItem.name,
                category: transferItem.category || 'Uncategorized',
                opening: 0,
                current: 0,
                parStock: 0
              };

              parItems.push(newParItem);
              parStockUpdates.added.push(transferItem.name);
              console.log(`Added new item to PAR Stock: "${transferItem.name}"`);
              hasChanges = true;
            }
          });

          // Save updated PAR Stock if any changes were made
          if (hasChanges) {
            dataStorage.saveParStock(latestParDate, parItems);
            console.log(`PAR Stock updated: ${parStockUpdates.updated.length} updated, ${parStockUpdates.added.length} added`);
          }
        }
      }

      response.parStockUpdates = parStockUpdates;
    }

    res.json(response);

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
