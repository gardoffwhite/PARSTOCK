const fs = require('fs');
const path = require('path');
const NameMatching = require('./nameMatching');
const ConversionUnit = require('./conversionUnit');

class DataStorage {
  constructor() {
    this.storageDir = './storage';
    this.dailyDataFile = path.join(this.storageDir, 'daily_sales.json');
    this.monthlyDataFile = path.join(this.storageDir, 'monthly_sales.json');
    this.parStockFile = path.join(this.storageDir, 'par_stock.json');
    this.groupItemsFile = path.join(this.storageDir, 'group_items.json');
    this.dailyTransfersFile = path.join(this.storageDir, 'daily_transfers.json');
    this.matchingHistoryFile = path.join(this.storageDir, 'matching_history.json');

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    this.initializeStorage();
  }

  initializeStorage() {
    if (!fs.existsSync(this.dailyDataFile)) {
      fs.writeFileSync(this.dailyDataFile, JSON.stringify({}));
    }
    if (!fs.existsSync(this.monthlyDataFile)) {
      fs.writeFileSync(this.monthlyDataFile, JSON.stringify({}));
    }
    if (!fs.existsSync(this.parStockFile)) {
      fs.writeFileSync(this.parStockFile, JSON.stringify({}));
    }
    if (!fs.existsSync(this.groupItemsFile)) {
      fs.writeFileSync(this.groupItemsFile, JSON.stringify([]));
    }
    if (!fs.existsSync(this.dailyTransfersFile)) {
      fs.writeFileSync(this.dailyTransfersFile, JSON.stringify({}));
    }
    if (!fs.existsSync(this.matchingHistoryFile)) {
      fs.writeFileSync(this.matchingHistoryFile, JSON.stringify({}));
    }
  }

  saveDailyData(date, salesData, summary, conversionRate = null) {
    const allData = this.loadDailyData();

    // ถ้ามี conversionRate ให้เพิ่มเข้าไปในทุก item
    if (conversionRate !== null) {
      salesData = salesData.map(item => ({
        ...item,
        conversionRate: conversionRate
      }));
    }

    allData[date] = {
      date: date,
      uploadedAt: new Date().toISOString(),
      summary: summary,
      items: salesData,
      conversionRate: conversionRate
    };

    fs.writeFileSync(this.dailyDataFile, JSON.stringify(allData, null, 2));

    this.updateMonthlySummary(date, summary);

    return true;
  }

  loadDailyData() {
    try {
      const data = fs.readFileSync(this.dailyDataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  getDailyData(date) {
    const allData = this.loadDailyData();
    return allData[date] || null;
  }

  deleteDailyData(date) {
    const allData = this.loadDailyData();

    if (!allData[date]) {
      return false;
    }

    delete allData[date];

    // Save directly without calling saveDailyData to avoid parameter mismatch
    fs.writeFileSync(this.dailyDataFile, JSON.stringify(allData, null, 2));

    return true;
  }

  getDailyDataByDateRange(startDate, endDate) {
    const allData = this.loadDailyData();
    const result = [];

    for (const [date, data] of Object.entries(allData)) {
      if (date >= startDate && date <= endDate) {
        result.push(data);
      }
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  updateMonthlySummary(date, dailySummary) {
    const yearMonth = date.substring(0, 7);
    const allMonthly = this.loadMonthlyData();

    if (!allMonthly[yearMonth]) {
      allMonthly[yearMonth] = {
        month: yearMonth,
        totalQty: 0,
        totalItems: 0,
        days: 0,
        allItems: {}
      };
    }

    const monthly = allMonthly[yearMonth];
    monthly.totalQty += dailySummary.totalQty;
    monthly.totalItems += dailySummary.totalItems;
    monthly.days++;

    dailySummary.allItems.forEach(item => {
      if (!monthly.allItems[item.name]) {
        monthly.allItems[item.name] = {
          name: item.name,
          category: item.category || '',
          totalQty: 0
        };
      }
      monthly.allItems[item.name].totalQty += item.totalQty;
      // อัพเดท category ถ้ายังไม่มี
      if (!monthly.allItems[item.name].category && item.category) {
        monthly.allItems[item.name].category = item.category;
      }
    });

    fs.writeFileSync(this.monthlyDataFile, JSON.stringify(allMonthly, null, 2));

    return monthly;
  }

  loadMonthlyData() {
    try {
      const data = fs.readFileSync(this.monthlyDataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  getMonthlyData(yearMonth) {
    const allData = this.loadMonthlyData();
    const monthly = allData[yearMonth];

    if (!monthly) return null;

    monthly.allItems = Object.values(monthly.allItems)
      .sort((a, b) => b.totalQty - a.totalQty);

    return monthly;
  }

  getAllMonths() {
    const allData = this.loadMonthlyData();
    return Object.keys(allData).sort().reverse();
  }

  getAllDates() {
    const allData = this.loadDailyData();
    return Object.keys(allData).sort().reverse();
  }

  getDateRangeData(startDate, endDate) {
    const dailyDataList = this.getDailyDataByDateRange(startDate, endDate);

    if (dailyDataList.length === 0) {
      return null;
    }

    const aggregated = {
      startDate,
      endDate,
      totalQty: 0,
      totalItems: 0,
      days: dailyDataList.length,
      allItems: {}
    };

    dailyDataList.forEach(dailyData => {
      aggregated.totalQty += dailyData.summary.totalQty;
      aggregated.totalItems += dailyData.summary.totalItems;

      dailyData.summary.allItems.forEach(item => {
        if (!aggregated.allItems[item.name]) {
          aggregated.allItems[item.name] = {
            name: item.name,
            totalQty: 0
          };
        }
        aggregated.allItems[item.name].totalQty += item.totalQty;
      });
    });

    aggregated.allItems = Object.values(aggregated.allItems)
      .sort((a, b) => b.totalQty - a.totalQty);

    return aggregated;
  }

  saveParStock(startDate, items, summary, conversionSettings = {}) {
    const allData = this.loadParStockData();

    // เก็บ PAR Stock ตาม startDate แทน month
    allData[startDate] = {
      startDate: startDate,
      uploadedAt: new Date().toISOString(),
      summary: summary,
      items: items,
      conversionSettings: conversionSettings // เก็บ conversion rate settings
    };

    fs.writeFileSync(this.parStockFile, JSON.stringify(allData, null, 2));
    return true;
  }

  loadParStockData() {
    try {
      const data = fs.readFileSync(this.parStockFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  getParStock(startDate) {
    const allData = this.loadParStockData();
    return allData[startDate] || null;
  }

  getAllParStockPeriods() {
    const allData = this.loadParStockData();
    // Return all PAR periods sorted by date (newest first)
    return Object.keys(allData).sort().reverse();
  }

  // หา PAR Stock period ที่ถูกต้องสำหรับวันที่ที่เลือก
  findParStockForDate(targetDate) {
    const allPeriods = this.getAllParStockPeriods();

    // หา period ที่ startDate <= targetDate และใกล้ที่สุด
    for (const startDate of allPeriods) {
      if (startDate <= targetDate) {
        return this.getParStock(startDate);
      }
    }

    return null;
  }

  // หาช่วงวันที่ที่ valid สำหรับ PAR period
  getValidDateRangeForPar(parStartDate) {
    const allPeriods = this.getAllParStockPeriods().sort();
    const currentIndex = allPeriods.indexOf(parStartDate);

    if (currentIndex === -1) return null;

    const startDate = parStartDate;
    // ถ้ามี PAR period ถัดไป ให้ใช้วันก่อนหน้าเป็น endDate
    const endDate = currentIndex < allPeriods.length - 1
      ? this.subtractOneDay(allPeriods[currentIndex + 1])
      : new Date().toISOString().split('T')[0]; // ถ้าเป็น period ล่าสุด ใช้วันปัจจุบัน

    return { startDate, endDate };
  }

  subtractOneDay(dateStr) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  }

  compareParWithSales(parStartDate, specificDate = null) {
    const parStock = this.getParStock(parStartDate);
    if (!parStock) {
      return null;
    }

    // หาช่วงวันที่ที่ valid สำหรับ PAR period นี้
    const dateRange = this.getValidDateRangeForPar(parStartDate);
    if (!dateRange) {
      return null;
    }

    const dailyData = this.loadDailyData();
    const transferData = this.loadDailyTransfers();
    const salesInPeriod = {};
    const transfersInPeriod = {};

    // รวมยอดขายตามช่วงวันที่ของ PAR period หรือเฉพาะวันที่เลือก
    for (const [date, data] of Object.entries(dailyData)) {
      let shouldInclude = false;

      if (specificDate) {
        // ถ้าระบุวันที่เฉพาะ ให้ดึงเฉพาะวันนั้น
        shouldInclude = (date === specificDate);
      } else {
        // ถ้าไม่ระบุ ให้ดึงทั้ง PAR period
        shouldInclude = (date >= dateRange.startDate && date <= dateRange.endDate);
      }

      if (shouldInclude && data.items && Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (!salesInPeriod[item.name]) {
            salesInPeriod[item.name] = {
              qty: 0,
              category: item.category || '',
              conversionRate: item.conversionRate || null
            };
          }
          salesInPeriod[item.name].qty += item.qty;
          if (!salesInPeriod[item.name].category && item.category) {
            salesInPeriod[item.name].category = item.category;
          }
          if (item.conversionRate && !salesInPeriod[item.name].conversionRate) {
            salesInPeriod[item.name].conversionRate = item.conversionRate;
          }
        });
      }
    }

    // รวมยอด Transfer ในช่วงเวลาเดียวกัน
    for (const [date, data] of Object.entries(transferData)) {
      let shouldInclude = false;

      if (specificDate) {
        shouldInclude = (date === specificDate);
      } else {
        shouldInclude = (date >= dateRange.startDate && date <= dateRange.endDate);
      }

      if (shouldInclude && data.items && Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (!transfersInPeriod[item.name]) {
            transfersInPeriod[item.name] = {
              qty: 0,
              category: item.category || ''
            };
          }
          // Transfer: finalQty มีเครื่องหมาย (+ สำหรับ in, - สำหรับ out)
          transfersInPeriod[item.name].qty += item.finalQty;
          if (!transfersInPeriod[item.name].category && item.category) {
            transfersInPeriod[item.name].category = item.category;
          }
        });
      }
    }

    // จับคู่ชื่อระหว่าง PAR Stock และ Sales
    const salesItems = Object.keys(salesInPeriod).map(name => ({ name }));
    const matches = NameMatching.matchItems(parStock.summary.items, salesItems, 0.6);

    // สร้าง mapping สำหรับ matched names
    const nameMapping = {};
    matches.forEach(match => {
      if (match.matched) {
        nameMapping[match.parName] = match.salesName;
      }
    });

    // เปรียบเทียบ PAR กับยอดขาย + Transfer
    const comparison = [];
    parStock.summary.items.forEach(parItem => {
      const matchedName = nameMapping[parItem.name] || parItem.name;
      const salesData = salesInPeriod[matchedName] || { qty: 0, category: '', conversionRate: null };
      const transferData = transfersInPeriod[matchedName] || { qty: 0, category: '' };

      const soldQty = salesData.qty;
      const transferQty = transferData.qty; // มีเครื่องหมาย: + สำหรับ IN, - สำหรับ OUT
      const category = salesData.category || transferData.category;
      const userConversionRate = salesData.conversionRate;

      // คำนวณ conversion: ใช้ user-selected rate ถ้ามี ไม่งั้นใช้ auto-detect
      let conversion;
      if (userConversionRate !== null && userConversionRate !== undefined) {
        conversion = {
          convertedQty: soldQty * userConversionRate,
          conversionRate: userConversionRate,
          unit: 'ขวด'
        };
      } else {
        conversion = ConversionUnit.convertQty(soldQty, category, matchedName);
      }

      const convertedSoldQty = conversion.convertedQty !== null ? conversion.convertedQty : soldQty;

      // คำนวณคงเหลือ: PAR - ขาย + Transfer (transfer IN เป็น +, OUT เป็น -)
      // Transfer เป็นขวดเต็มอยู่แล้ว ไม่ต้อง convert
      const remaining = parItem.parStock - convertedSoldQty + transferQty;
      const usagePercent = parItem.parStock > 0 ? (convertedSoldQty / parItem.parStock * 100) : 0;

      comparison.push({
        name: parItem.name,
        matchedName: matchedName !== parItem.name ? matchedName : null,
        matchScore: nameMapping[parItem.name] ? matches.find(m => m.parName === parItem.name)?.matchScore : 1,
        category: category,
        parStock: parItem.parStock,
        soldQty: soldQty,
        convertedSoldQty: convertedSoldQty,
        transferQty: transferQty, // เพิ่ม transfer quantity
        conversionRate: conversion.conversionRate,
        unit: conversion.unit,
        remaining: remaining,
        usagePercent: usagePercent,
        needsReorder: remaining < (parItem.parStock * 0.2)
      });
    });

    return {
      parStartDate: parStartDate,
      dateRange: dateRange,
      totalParItems: parStock.summary.items.length,
      comparison: comparison.sort((a, b) => b.convertedSoldQty - a.convertedSoldQty)
    };
  }

  // Calculate conversion rate based on PAR item name and oz quantity
  calculateConversionRate(parName, ozQuantity) {
    const parNameLower = parName.toLowerCase();

    // Check if this is a spirit (needs oz conversion)
    const isSpirit = parNameLower.includes('vodka') ||
                    parNameLower.includes('gin') ||
                    parNameLower.includes('rum') ||
                    parNameLower.includes('tequila') ||
                    parNameLower.includes('whisky') ||
                    parNameLower.includes('whiskey') ||
                    parNameLower.includes('bourbon') ||
                    parNameLower.includes('cognac') ||
                    parNameLower.includes('brandy') ||
                    parNameLower.includes('aperitif') ||
                    parNameLower.includes('liqueur') ||
                    parNameLower.includes('mezcal') ||
                    parNameLower.includes('grappa') ||
                    parNameLower.includes('sake');

    if (!isSpirit) {
      // Not a spirit - no conversion needed
      return 1;
    }

    // Determine bottle size multiplier (1 Oz base)
    let bottleMultiplier = 0.04; // Default to 75cl (most common)

    if (parNameLower.includes('1l') || parNameLower.includes('1 l') || parNameLower.includes('1000ml')) {
      bottleMultiplier = 0.0303030303; // 33 units per liter
    } else if (parNameLower.includes('75cl') || parNameLower.includes('750ml')) {
      bottleMultiplier = 0.04; // 25 units per 75cl
    } else if (parNameLower.includes('70cl') || parNameLower.includes('700ml')) {
      bottleMultiplier = 0.04347826087; // 23 units per 70cl
    } else if (parNameLower.includes('50cl') || parNameLower.includes('500ml')) {
      bottleMultiplier = 0.0625; // 16 units per 50cl
    }

    // Calculate conversion rate = bottleMultiplier * oz quantity
    return bottleMultiplier * ozQuantity;
  }

  saveDailySaleWithConversion(date, items, summary, conversionRates) {
    const allData = this.loadDailyData();
    const groupItems = this.loadGroupItems();
    const NameMatching = require('./nameMatching');

    // Process each item and check if it matches a group item
    const expandedItems = [];

    items.forEach(item => {
      // Check if this item matches any group item (fuzzy matching)
      const groupItemNames = groupItems.map(g => g.name);
      const matchResult = NameMatching.findBestMatch(item.originalName || item.name, groupItemNames, 0.6);

      if (matchResult.match) {
        // Found a matching group item - expand it
        const groupItem = groupItems.find(g => g.name === matchResult.match);

        // Add the group item itself with NEGATIVE quantity (sale quantity, decreases stock)
        expandedItems.push({
          name: groupItem.name,
          category: item.category || '',
          qty: -item.qty, // NEGATIVE because it's being sold/removed from stock
          conversionRate: 1, // No conversion for the group itself
          originalName: item.originalName || item.name,
          isExpanded: false,
          isGroupSale: true, // Mark this as a group sale
          matchScore: matchResult.score
        });

        // Add all sub-items from the group with POSITIVE quantity (ingredients used)
        groupItem.subItems.forEach(subItem => {
          // Calculate base conversion rate (1 oz base) from bottle size
          const baseConversionRate = this.calculateConversionRate(subItem.parName, 1);

          expandedItems.push({
            name: subItem.parName,
            category: item.category || '',
            qty: item.qty * subItem.qty, // Sale qty × oz quantity (e.g., 1 Margarita × 2oz = 2)
            conversionRate: baseConversionRate, // Base rate for 1 oz (e.g., 1/23 = 0.043 for 70cl)
            originalName: item.originalName || item.name, // Keep original sales name
            isExpanded: true, // Mark as expanded from group
            groupName: groupItem.name,
            matchScore: matchResult.score
          });
        });
      } else {
        // Not a group item - keep original item
        expandedItems.push({
          ...item,
          isExpanded: false
        });
      }
    });

    allData[date] = {
      date: date,
      uploadedAt: new Date().toISOString(),
      summary: summary,
      items: expandedItems,
      conversionRates: conversionRates // store original mapping
    };

    fs.writeFileSync(this.dailyDataFile, JSON.stringify(allData, null, 2));
    this.updateMonthlySummary(date, summary);

    return true;
  }

  getSummaryWithPar(parStartDate, endDate) {
    const parStock = this.getParStock(parStartDate);
    if (!parStock) {
      return null;
    }

    const dailyData = this.loadDailyData();
    const transferData = this.loadDailyTransfers();
    const salesInPeriod = {};
    const transfersInPeriod = {};

    // Aggregate ALL sales from parStartDate to endDate
    for (const [date, data] of Object.entries(dailyData)) {
      if (date >= parStartDate && date <= endDate && data.items && Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (!salesInPeriod[item.name]) {
            salesInPeriod[item.name] = {
              qty: 0,
              category: item.category || '',
              conversionRate: item.conversionRate || 1
            };
          }
          salesInPeriod[item.name].qty += item.qty;
          if (!salesInPeriod[item.name].category && item.category) {
            salesInPeriod[item.name].category = item.category;
          }
        });
      }
    }

    // Aggregate ALL transfers from parStartDate to endDate
    for (const [date, data] of Object.entries(transferData)) {
      if (date >= parStartDate && date <= endDate && data.items && Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (!transfersInPeriod[item.name]) {
            transfersInPeriod[item.name] = { qty: 0, category: '' };
          }
          transfersInPeriod[item.name].qty += item.finalQty;
        });
      }
    }

    // Match PAR items with sales (bidirectional fuzzy matching)
    const salesItems = Object.keys(salesInPeriod).map(name => ({ name }));
    const parToSalesMatches = NameMatching.matchItems(parStock.summary.items, salesItems, 0.6);

    const nameMapping = {}; // par -> sales
    const reverseNameMapping = {}; // sales -> par

    // First pass: PAR to Sales matching
    parToSalesMatches.forEach(match => {
      if (match.matched) {
        nameMapping[match.parName] = match.salesName;
        reverseNameMapping[match.salesName] = match.parName;
      }
    });

    // Second pass: Sales to PAR matching (for unmatched sales items)
    const salesToParMatches = NameMatching.matchItems(salesItems, parStock.summary.items, 0.6);
    salesToParMatches.forEach(match => {
      if (match.matched && !reverseNameMapping[match.parName]) {
        // Only add if this sales item wasn't already matched
        reverseNameMapping[match.parName] = match.salesName;
        // Also update the reverse mapping
        if (!nameMapping[match.salesName]) {
          nameMapping[match.salesName] = match.parName;
        }
      }
    });

    // Calculate comparison for PAR items
    const comparison = [];
    const matchedSalesNames = new Set();
    let totalSold = 0;
    let totalRemaining = 0;
    let totalUsagePercent = 0;

    parStock.summary.items.forEach(parItem => {
      const matchedName = nameMapping[parItem.name] || parItem.name;
      const salesData = salesInPeriod[matchedName] || { qty: 0, category: '', conversionRate: 1 };
      const transferData = transfersInPeriod[matchedName] || { qty: 0, category: '' };
      const soldQty = salesData.qty;
      const transferQty = transferData.qty;
      const conversionRate = salesData.conversionRate;

      // Mark this sales item as matched
      if (salesInPeriod[matchedName]) {
        matchedSalesNames.add(matchedName);
      }

      // Also check if any sales items matched to this PAR item
      Object.keys(reverseNameMapping).forEach(salesName => {
        if (reverseNameMapping[salesName] === parItem.name) {
          matchedSalesNames.add(salesName);
        }
      });

      // Apply conversion and include transfer
      const convertedSoldQty = soldQty * conversionRate;
      const remaining = parItem.parStock - convertedSoldQty + transferQty;
      const usagePercent = parItem.parStock > 0 ? (convertedSoldQty / parItem.parStock * 100) : 0;

      totalSold += convertedSoldQty;
      totalRemaining += remaining;
      totalUsagePercent += usagePercent;

      comparison.push({
        name: parItem.name,
        matchedName: matchedName !== parItem.name ? matchedName : null,
        category: salesData.category,
        parStock: parItem.parStock,
        soldQty: soldQty,
        convertedSoldQty: convertedSoldQty,
        transferQty: transferQty,
        conversionRate: conversionRate,
        remaining: remaining,
        usagePercent: usagePercent,
        type: 'par_item'
      });
    });

    // Add unmatched sales items (items sold but not in PAR)
    // Check both direct match and reverse mapping from fuzzy matching
    const unmatchedSales = [];
    Object.keys(salesInPeriod).forEach(salesName => {
      // Check if this sales item was matched to any PAR item
      const isMatched = matchedSalesNames.has(salesName);

      if (!isMatched) {
        const salesData = salesInPeriod[salesName];
        const transferData = transfersInPeriod[salesName] || { qty: 0 };
        const conversionRate = salesData.conversionRate;
        const convertedSoldQty = salesData.qty * conversionRate;
        const transferQty = transferData.qty;

        unmatchedSales.push({
          name: salesName,
          matchedName: null,
          category: salesData.category,
          parStock: 0,
          soldQty: salesData.qty,
          convertedSoldQty: convertedSoldQty,
          transferQty: transferQty,
          conversionRate: conversionRate,
          remaining: -convertedSoldQty + transferQty, // negative because no PAR, but add transfer
          usagePercent: 0,
          type: 'unmatched_sale'
        });
      }
    });

    // Combine and sort: PAR items first (by usage), then unmatched sales
    const allItems = [
      ...comparison.sort((a, b) => b.usagePercent - a.usagePercent),
      ...unmatchedSales.sort((a, b) => b.convertedSoldQty - a.convertedSoldQty)
    ];

    return {
      parStartDate: parStartDate,
      endDate: endDate,
      totalParItems: parStock.summary.items.length,
      totalSalesItems: Object.keys(salesInPeriod).length,
      totalSold: totalSold,
      totalRemaining: totalRemaining,
      avgUsagePercent: parStock.summary.items.length > 0 ? totalUsagePercent / parStock.summary.items.length : 0,
      unmatchedSalesCount: unmatchedSales.length,
      comparison: allItems
    };
  }

  getStats() {
    const dailyData = this.loadDailyData();
    const monthlyData = this.loadMonthlyData();

    return {
      totalDays: Object.keys(dailyData).length,
      totalMonths: Object.keys(monthlyData).length,
      latestDate: Object.keys(dailyData).sort().reverse()[0] || null,
      oldestDate: Object.keys(dailyData).sort()[0] || null
    };
  }

  // ========== Group Items Management ==========

  loadGroupItems() {
    try {
      const data = fs.readFileSync(this.groupItemsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  saveGroupItems(groupItems) {
    fs.writeFileSync(this.groupItemsFile, JSON.stringify(groupItems, null, 2));
  }

  addGroupItem(groupItem) {
    const groupItems = this.loadGroupItems();

    // Generate ID
    groupItem.id = Date.now().toString();
    groupItem.createdAt = new Date().toISOString();

    groupItems.push(groupItem);
    this.saveGroupItems(groupItems);

    // Add group name to latest PAR stock for easier matching
    this.addGroupToPARStock(groupItem.name);

    return groupItem;
  }

  updateGroupItem(id, updatedData) {
    const groupItems = this.loadGroupItems();
    const index = groupItems.findIndex(item => item.id === id);

    if (index === -1) {
      throw new Error('Group item not found');
    }

    const oldName = groupItems[index].name;
    const newName = updatedData.name;

    groupItems[index] = {
      ...groupItems[index],
      ...updatedData,
      id: groupItems[index].id, // Keep original ID
      createdAt: groupItems[index].createdAt, // Keep original creation date
      updatedAt: new Date().toISOString()
    };

    this.saveGroupItems(groupItems);

    // If name changed, update PAR stock
    if (oldName !== newName) {
      this.removeGroupFromPARStock(oldName);
      this.addGroupToPARStock(newName);
    }

    return groupItems[index];
  }

  deleteGroupItem(id) {
    const groupItems = this.loadGroupItems();
    const itemToDelete = groupItems.find(item => item.id === id);

    if (!itemToDelete) {
      throw new Error('Group item not found');
    }

    const filteredItems = groupItems.filter(item => item.id !== id);
    this.saveGroupItems(filteredItems);

    // Remove group name from PAR stock
    this.removeGroupFromPARStock(itemToDelete.name);

    return true;
  }

  getGroupItem(id) {
    const groupItems = this.loadGroupItems();
    return groupItems.find(item => item.id === id);
  }

  findGroupItemByName(name) {
    const groupItems = this.loadGroupItems();
    const nameLower = name.toLowerCase().trim();
    return groupItems.find(item =>
      item.name.toLowerCase().trim() === nameLower
    );
  }

  // Add group name to latest PAR stock
  addGroupToPARStock(groupName) {
    try {
      const allParStock = this.loadParStockData();
      const parDates = Object.keys(allParStock).sort().reverse();

      if (parDates.length === 0) {
        console.log('No PAR stock available to add group to');
        return;
      }

      const latestDate = parDates[0];
      const latestPar = allParStock[latestDate];

      // Check if group already exists in PAR stock
      const existingItem = latestPar.summary.items.find(
        item => item.name.toLowerCase().trim() === groupName.toLowerCase().trim()
      );

      if (!existingItem) {
        // Add group item with 0 PAR stock (it's virtual, will be expanded)
        latestPar.summary.items.push({
          name: groupName,
          parStock: 0
        });

        allParStock[latestDate] = latestPar;
        fs.writeFileSync(this.parStockFile, JSON.stringify(allParStock, null, 2));
        console.log(`✅ Added group "${groupName}" to PAR stock (${latestDate})`);
      } else {
        console.log(`ℹ️ Group "${groupName}" already exists in PAR stock`);
      }
    } catch (error) {
      console.error('Error adding group to PAR stock:', error);
    }
  }

  // Remove group name from all PAR stocks
  removeGroupFromPARStock(groupName) {
    try {
      const allParStock = this.loadParStockData();
      let removed = false;

      Object.keys(allParStock).forEach(date => {
        const parData = allParStock[date];
        const originalLength = parData.summary.items.length;

        parData.summary.items = parData.summary.items.filter(
          item => item.name.toLowerCase().trim() !== groupName.toLowerCase().trim()
        );

        if (parData.summary.items.length < originalLength) {
          removed = true;
          allParStock[date] = parData;
        }
      });

      if (removed) {
        fs.writeFileSync(this.parStockFile, JSON.stringify(allParStock, null, 2));
        console.log(`✅ Removed group "${groupName}" from PAR stock`);
      }
    } catch (error) {
      console.error('Error removing group from PAR stock:', error);
    }
  }

  // ===== DAILY TRANSFER METHODS =====

  /**
   * Parse and match transfer items with PAR stock
   * Transfer uses simple 1:1 conversion (bottle-based, not oz-based)
   */
  parseTransferWithPAR(items, date) {
    const parStock = this.findParStockForDate(date);

    if (!parStock || !parStock.summary || !parStock.summary.items) {
      throw new Error('ไม่พบข้อมูล PAR Stock กรุณาอัพโหลด PAR ก่อน');
    }

    const parItems = parStock.summary.items;
    const parNames = parItems.map(item => item.name);
    const matchedItems = [];

    items.forEach(item => {
      const matchResult = NameMatching.findBestMatch(item.originalName, parNames, 0.3);

      if (matchResult && matchResult.match) {
        const parItem = parItems.find(p => p.name === matchResult.match);

        matchedItems.push({
          name: matchResult.match,
          originalName: item.originalName,
          category: parItem?.category || '',
          qty: item.qty, // จำนวนขวดเต็ม (bottle-based)
          matchScore: matchResult.score
        });
      } else {
        // ถ้าไม่เจอ match ก็ใช้ชื่อเดิม
        matchedItems.push({
          name: item.originalName,
          originalName: item.originalName,
          category: 'Unknown',
          qty: item.qty,
          matchScore: 0
        });
      }
    });

    return matchedItems;
  }

  /**
   * Save daily transfer data
   */
  saveDailyTransfer(date, items, direction) {
    const allTransfers = this.loadDailyTransfers();

    allTransfers[date] = {
      date: date,
      uploadedAt: new Date().toISOString(),
      direction: direction, // 'in' or 'out'
      items: items
    };

    fs.writeFileSync(this.dailyTransfersFile, JSON.stringify(allTransfers, null, 2));
    console.log(`✅ Saved transfer data for ${date}`);

    return allTransfers[date];
  }

  /**
   * Load all daily transfers
   */
  loadDailyTransfers() {
    if (!fs.existsSync(this.dailyTransfersFile)) {
      return {};
    }

    const data = fs.readFileSync(this.dailyTransfersFile, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * Get daily transfer by date
   */
  getDailyTransfer(date) {
    const allTransfers = this.loadDailyTransfers();
    return allTransfers[date] || null;
  }

  /**
   * Get all transfer dates
   */
  getTransferDates() {
    const allTransfers = this.loadDailyTransfers();
    return Object.keys(allTransfers).sort((a, b) => new Date(b) - new Date(a));
  }

  /**
   * Delete daily transfer
   */
  deleteDailyTransfer(date) {
    const allTransfers = this.loadDailyTransfers();

    if (allTransfers[date]) {
      delete allTransfers[date];
      fs.writeFileSync(this.dailyTransfersFile, JSON.stringify(allTransfers, null, 2));
      console.log(`✅ Deleted transfer for ${date}`);
      return true;
    }

    return false;
  }

  // ==================== Matching History ====================

  loadMatchingHistory() {
    try {
      const data = fs.readFileSync(this.matchingHistoryFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  saveMatchingHistory(saleName, parName, conversionRate, unit = null) {
    const history = this.loadMatchingHistory();

    // Normalize sale name (lowercase, trim)
    const normalizedSaleName = saleName.toLowerCase().trim();

    // Initialize array if not exists
    if (!history[normalizedSaleName]) {
      history[normalizedSaleName] = [];
    }

    // Check if this exact match already exists
    const existingIndex = history[normalizedSaleName].findIndex(
      match => match.parName === parName &&
               match.conversionRate === conversionRate &&
               match.unit === unit
    );

    const matchData = {
      parName: parName,
      conversionRate: conversionRate,
      unit: unit,
      lastUsed: new Date().toISOString(),
      useCount: 1
    };

    if (existingIndex >= 0) {
      // Update existing match
      history[normalizedSaleName][existingIndex].lastUsed = new Date().toISOString();
      history[normalizedSaleName][existingIndex].useCount++;
    } else {
      // Add new match
      history[normalizedSaleName].push(matchData);
    }

    fs.writeFileSync(this.matchingHistoryFile, JSON.stringify(history, null, 2));
  }

  getMatchingHistory(saleName) {
    const history = this.loadMatchingHistory();
    const normalizedSaleName = saleName.toLowerCase().trim();
    return history[normalizedSaleName] || [];
  }

  getBestMatch(saleName) {
    const matches = this.getMatchingHistory(saleName);
    if (matches.length === 0) return null;

    // Sort by use count (descending), then by last used (most recent first)
    matches.sort((a, b) => {
      if (b.useCount !== a.useCount) {
        return b.useCount - a.useCount;
      }
      return new Date(b.lastUsed) - new Date(a.lastUsed);
    });

    return matches[0];
  }
}

module.exports = DataStorage;
