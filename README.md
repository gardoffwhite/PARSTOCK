# Hotel Sales & PAR Stock System

ระบบจัดการสต๊อกและยอดขายโรงแรม - Hotel PAR Stock Management System
รวบรวมและวิเคราะห์ข้อมูล PAR Stock, Daily Sales, Transfer และ Group Items (Cocktails)

## คุณสมบัติหลัก

### 📦 PAR Stock Management
- อัพโหลดและจัดการ PAR Stock แบบ Period (วันที่เริ่มต้น-สิ้นสุด)
- บันทึกสต๊อกคงเหลือของแต่ละรายการ
- Export รายงาน Excel พร้อม Summary และ PAR Period

### 💰 Daily Sales Upload
- อัพโหลดยอดขายรายวันจากไฟล์ Excel
- Fuzzy Name Matching อัตโนมัติกับ PAR Stock (ใช้ Word-counting Algorithm)
- แสดงผลการ Match พร้อม Score เปอร์เซ็นต์
- รองรับ Unit Conversion (cl, ml, L, bottle)

### 🔄 Daily Transfer System
- บันทึกการโยกย้ายสินค้าระหว่างวัน
- รองรับหน่วยต่างๆ (cl, ml, L, bottle)
- แปลงหน่วยอัตโนมัติให้ตรงกับ PAR Stock
- แสดง Summary พร้อม Usage Percentage

### 🍹 Group Items (Cocktails)
- จัดการกลุ่มสินค้า (เช่น Cocktails)
- กำหนด Recipe ที่ใช้วัตถุดิบจาก PAR Stock
- ระบุปริมาณที่ใช้แต่ละรายการ
- คำนวณต้นทุนและการใช้งานอัตโนมัติ

### 🎯 Fuzzy Name Matching
- ใช้ Apps Script Algorithm (Word-counting)
- รองรับคำสั้นๆ เช่น "40", "cl", "ml"
- ให้ Daily Sales เป็น Base Score หลัก
- ตัวอย่าง: "Chang" match "Beer, Chang, classic, S bottle, 32cl" = 100%
- Threshold: 0.3 (30%)

## การติดตั้ง

1. ติดตั้ง Dependencies:
```bash
npm install
```

2. รันเซิร์ฟเวอร์:
```bash
npm start
```

หรือใช้ Dev mode (auto-reload):
```bash
npm run dev
```

3. เปิดเว็บเบราว์เซอร์ที่:
```
http://localhost:3000
```

## โครงสร้างโปรเจค

```
WebStock/
├── server.js                    # Express server หลัก
├── package.json                 # Dependencies และ scripts
├── utils/
│   ├── nameMatching.js         # Fuzzy Name Matching (Word-counting Algorithm)
│   ├── conversionUnit.js       # Unit Conversion (cl, ml, L, bottle)
│   ├── parStockReader.js       # อ่าน PAR Stock จาก Excel
│   ├── hotelExcelReader.js     # อ่าน Daily Sales จาก Excel
│   ├── hotelReportGenerator.js # สร้างรายงาน Excel พร้อม Summary
│   └── dataStorage.js          # จัดการข้อมูล PAR, Sales, Transfer, Groups
├── public/
│   └── index.html              # หน้าเว็บหลัก (Tailwind CSS)
├── data/
│   ├── parstock.json           # PAR Stock data
│   ├── daily_sales.json        # Daily Sales data
│   ├── daily_transfer.json     # Daily Transfer data
│   └── group_items.json        # Group Items (Cocktails)
├── uploads/                    # โฟลเดอร์เก็บไฟล์อัพโหลด (ชั่วคราว)
└── reports/                    # โฟลเดอร์เก็บรายงาน Excel
```

## วิธีใช้งาน

### 1. PAR Stock Management

1. ไปที่แท็บ **"PAR Stock"**
2. อัพโหลดไฟล์ Excel PAR Stock
3. เลือก **PAR Period** (วันที่เริ่มต้น - สิ้นสุด)
4. ระบบจะอ่านชื่อสินค้าและจำนวนคงเหลือ
5. กด **"Export Excel"** เพื่อดาวน์โหลดรายงาน Summary

### 2. Daily Sales Upload

1. ไปที่แท็บ **"ยอดขายรายวัน"**
2. อัพโหลดไฟล์ Excel Daily Sales
3. ระบบจะ:
   - Match ชื่อสินค้ากับ PAR Stock อัตโนมัติ
   - แสดง Match Score (%)
   - คำนวณการใช้งาน
4. เลือกวันที่เพื่อดูรายงาน

### 3. Daily Transfer

1. ไปที่แท็บ **"Daily Transfer"**
2. กรอกข้อมูล:
   - เลือกสินค้าจาก PAR Stock
   - ระบุจำนวนและหน่วย (cl, ml, L, bottle)
3. กด **"บันทึก Transfer"**
4. ระบบจะแปลงหน่วยอัตโนมัติและคำนวณ Usage

### 4. Group Items (Cocktails)

1. ไปที่แท็บ **"Group Items"**
2. สร้างกลุ่มใหม่:
   - ตั้งชื่อกลุ่ม (เช่น "Mojito")
   - เลือกวัตถุดิบจาก PAR Stock
   - ระบุปริมาณที่ใช้
3. กด **"บันทึก Group"**
4. ระบบจะคำนวณต้นทุนอัตโนมัติ

## รูปแบบข้อมูลในไฟล์ Excel

### PAR Stock Excel
- คอลัมน์ที่ 1: ชื่อสินค้า (Item Name)
- คอลัมน์ที่ 2: จำนวนคงเหลือ (Quantity)

### Daily Sales Excel
- **แถวที่ 4**: วันที่ในรูปแบบ (dd/mm/yyyy)
- **คอลัมน์ F-G**: ชื่อสินค้า (Item Name)
- **คอลัมน์ AB**: จำนวนที่ขาย (Quantity)

## API Endpoints

### PAR Stock
- `POST /api/parstock/upload` - อัพโหลด PAR Stock Excel
- `GET /api/parstock` - ดูข้อมูล PAR Stock
- `POST /api/parstock/period` - ตั้งค่า PAR Period
- `GET /api/parstock/summary` - Export Excel Summary

### Daily Sales
- `POST /api/dailysale/upload` - อัพโหลด Daily Sales Excel
- `GET /api/dailysale/dates` - ดูรายการวันที่มีข้อมูล
- `GET /api/dailysale/:date` - ดูข้อมูลรายวัน

### Daily Transfer
- `POST /api/transfer` - บันทึก Transfer
- `GET /api/transfer/dates` - ดูรายการวันที่มี Transfer
- `GET /api/transfer/:date` - ดูข้อมูล Transfer รายวัน

### Group Items
- `POST /api/groups` - สร้าง Group ใหม่
- `GET /api/groups` - ดูรายการ Groups ทั้งหมด
- `DELETE /api/groups/:name` - ลบ Group

## เทคโนโลยีที่ใช้

- **Backend**: Node.js + Express
- **Excel Processing**: xlsx (รองรับ .xls และ .xlsx)
- **File Upload**: Multer
- **Data Storage**: JSON files
- **Frontend**: HTML, Tailwind CSS, JavaScript (Vanilla)
- **UI Framework**: Tailwind CSS 3.x + Font Awesome 6.x
- **Fuzzy Matching**: Custom Word-counting Algorithm (ported from Google Apps Script)
- **Unit Conversion**: Custom conversion library (cl, ml, L, bottle)

## Screenshot

Modern UI with Purple Gradient Theme:
- 🎨 Tailwind CSS Styling
- 📱 Responsive Design
- 🔍 Real-time Fuzzy Matching
- 📊 Interactive Tables

## Deployment

### Railway.app (Recommended)
1. Push code to GitHub
2. Connect Railway to your GitHub repository
3. Deploy automatically
4. Get public URL

### Local Development
```bash
npm install
npm start
# Visit http://localhost:3000
```

## Author

**Parstock SB**
- Email: parstock@hotel.com
- GitHub: [@gardoffwhite](https://github.com/gardoffwhite)

## License

ISC

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
