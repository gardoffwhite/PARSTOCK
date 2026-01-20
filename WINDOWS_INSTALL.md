# Installation Guide for Windows Server

## ข้อมูลระบบ
- **Domain:** sbparstock.online
- **VPS IP:** 123.253.61.116
- **OS:** Windows Server
- **Port:** 8080

---

## ขั้นตอนที่ 1: ติดตั้ง Node.js (5 นาที)

1. **ดาวน์โหลด Node.js:**
   - เปิด browser ใน Windows Server
   - ไปที่: https://nodejs.org/
   - ดาวน์โหลด **LTS version** (แนะนำ v18.x.x)
   - รันไฟล์ติดตั้ง `.msi`
   - กด Next ไปเรื่อยๆ (ใช้ค่า default)

2. **ตรวจสอบการติดตั้ง:**
   - เปิด **PowerShell** หรือ **Command Prompt**
   - รันคำสั่ง:
   ```cmd
   node --version
   npm --version
   ```
   - ควรเห็น version ของ Node.js และ npm

---

## ขั้นตอนที่ 2: ติดตั้ง Git (3 นาที)

1. **ดาวน์โหลด Git:**
   - ไปที่: https://git-scm.com/download/win
   - ดาวน์โหลดและติดตั้ง
   - กด Next ไปเรื่อยๆ (ใช้ค่า default)

2. **ตรวจสอบ:**
   ```cmd
   git --version
   ```

---

## ขั้นตอนที่ 3: Clone Project (5 นาที)

1. **สร้างโฟลเดอร์:**
   ```cmd
   cd C:\
   mkdir websites
   cd websites
   ```

2. **Clone repository:**
   ```cmd
   git clone https://github.com/gardoffwhite/PARSTOCK.git
   cd PARSTOCK
   ```

3. **ติดตั้ง dependencies:**
   ```cmd
   npm install
   ```

---

## ขั้นตอนที่ 4: ทดสอบรันแอพ (2 นาที)

```cmd
node server.js
```

**ควรเห็น:**
```
Server is running on http://localhost:8080
Upload Excel files to generate Hotel Sales reports
```

**ทดสอบ:**
- เปิด browser
- ไปที่: `http://localhost:8080`
- ควรเห็นหน้า login

**กด Ctrl+C เพื่อหยุด server**

---

## ขั้นตอนที่ 5: ติดตั้ง PM2 (รันตลอด 24/7)

1. **ติดตั้ง pm2-windows-service:**
   ```cmd
   npm install -g pm2
   npm install -g pm2-windows-service
   ```

2. **ติดตั้ง Windows Service:**
   ```cmd
   pm2-service-install
   ```

   **จะถาม:**
   - PM2_HOME: กด Enter (ใช้ default)
   - PM2_SERVICE_NAME: พิมพ์ `PM2` แล้วกด Enter

3. **Start Application:**
   ```cmd
   cd C:\websites\PARSTOCK
   pm2 start server.js --name parstock
   pm2 save
   ```

4. **ตรวจสอบ:**
   ```cmd
   pm2 status
   pm2 logs parstock
   ```

---

## ขั้นตอนที่ 6: เปิด Firewall (2 นาที)

1. **เปิด Windows Firewall:**
   - กด **Windows + R**
   - พิมพ์ `wf.msc` แล้วกด Enter

2. **เพิ่ม Inbound Rule สำหรับพอร์ท 8080:**
   - คลิก **Inbound Rules** ซ้ายมือ
   - คลิก **New Rule...** ขวามือ
   - เลือก **Port** → Next
   - เลือก **TCP** → Specific local ports: `8080` → Next
   - เลือก **Allow the connection** → Next
   - เลือก **Domain, Private, Public** ทั้งหมด → Next
   - Name: `PAR Stock App` → Finish

3. **เพิ่ม Inbound Rule สำหรับ HTTP (80):**
   - ทำซ้ำขั้นตอนด้านบน แต่ใช้พอร์ท `80`
   - Name: `HTTP`

4. **เพิ่ม Inbound Rule สำหรับ HTTPS (443):**
   - ทำซ้ำอีกครั้ง ใช้พอร์ท `443`
   - Name: `HTTPS`

---

## ขั้นตอนที่ 7: ตั้งค่า IIS เป็น Reverse Proxy (10 นาที)

### 7.1 ติดตั้ง IIS

1. เปิด **Server Manager**
2. คลิก **Add roles and features**
3. Next จนถึง **Server Roles**
4. เลือก **Web Server (IIS)**
5. คลิก **Add Features** → Next
6. Next จนถึง **Role Services**
7. เลือก:
   - **Application Development** → **WebSocket Protocol**
8. คลิก **Install**

### 7.2 ติดตั้ง URL Rewrite และ ARR

1. **ดาวน์โหลดและติดตั้ง:**
   - URL Rewrite: https://www.iis.net/downloads/microsoft/url-rewrite
   - Application Request Routing (ARR): https://www.iis.net/downloads/microsoft/application-request-routing

### 7.3 Enable Proxy ใน ARR

1. เปิด **IIS Manager** (พิมพ์ `inetmgr` ใน Run)
2. คลิกที่ **server name** (ระดับบนสุด)
3. Double-click **Application Request Routing Cache**
4. คลิก **Server Proxy Settings...** ขวามือ
5. เลือก **Enable proxy**
6. คลิก **Apply**

### 7.4 สร้าง Website

1. ใน **IIS Manager**
2. ขยาย **Sites** → คลิกขวาที่ **Default Web Site** → **Remove**
3. คลิกขวาที่ **Sites** → **Add Website...**
   - Site name: `sbparstock`
   - Physical path: `C:\websites\PARSTOCK\public` (สร้างโฟลเดอร์นี้ถ้ายังไม่มี)
   - Binding:
     - Type: `http`
     - IP: `All Unassigned`
     - Port: `80`
     - Host name: `sbparstock.online`
   - คลิก **OK**

### 7.5 ตั้งค่า URL Rewrite

1. คลิกที่ website `sbparstock`
2. Double-click **URL Rewrite**
3. คลิก **Add Rule(s)...** ขวามือ
4. เลือก **Reverse Proxy**
5. ใส่: `localhost:8080`
6. คลิก **OK**

---

## ขั้นตอนที่ 8: เพิ่ม Host Binding สำหรับ www

1. คลิกขวาที่ website `sbparstock` → **Edit Bindings...**
2. คลิก **Add...**
   - Type: `http`
   - Port: `80`
   - Host name: `www.sbparstock.online`
3. คลิก **OK**

---

## ขั้นตอนที่ 9: ติดตั้ง SSL Certificate (15 นาที)

### Option 1: ใช้ Win-ACME (Let's Encrypt - ฟรี แต่ซับซ้อน)

1. **ดาวน์โหลด Win-ACME:**
   - ไปที่: https://www.win-acme.com/
   - ดาวน์โหลด latest version
   - แตกไฟล์ไปที่ `C:\win-acme`

2. **รัน wacs.exe:**
   ```cmd
   cd C:\win-acme
   wacs.exe
   ```

3. **เลือก:**
   - กด `N` (Create certificate)
   - กด `4` (Manual input)
   - ใส่ hostname: `sbparstock.online,www.sbparstock.online`
   - กด `2` (Single certificate)
   - เลือก validation method: `1` (HTTP validation)
   - เลือก IIS site
   - ทำตามขั้นตอน

### Option 2: ซื้อ SSL Certificate (ง่ายกว่า แต่เสียเงิน)

1. ซื้อ SSL จาก:
   - Namecheap SSL: ~$8/ปี
   - Let's Encrypt (ฟรี แต่ต้อง manual renew)

2. **Import Certificate ใน IIS:**
   - เปิด **IIS Manager**
   - คลิกที่ **server name**
   - Double-click **Server Certificates**
   - คลิก **Import...** ขวามือ
   - เลือกไฟล์ `.pfx`
   - ใส่รหัสผ่าน

3. **Add HTTPS Binding:**
   - คลิกที่ website `sbparstock`
   - คลิกขวา → **Edit Bindings...**
   - คลิก **Add...**
   - Type: `https`
   - Port: `443`
   - Host name: `sbparstock.online`
   - SSL certificate: เลือก certificate ที่ import
   - คลิก **OK**

4. **เพิ่ม binding สำหรับ www:**
   - ทำซ้ำสำหรับ `www.sbparstock.online`

---

## ✅ เสร็จแล้ว! ทดสอบ

1. **เปิด browser:**
   - ไปที่: `http://sbparstock.online`
   - หรือ: `https://sbparstock.online` (ถ้าติดตั้ง SSL แล้ว)

2. **ควรเห็นหน้า Login**

---

## คำสั่งที่ใช้บ่อย

### จัดการ PM2

```cmd
# ดูสถานะ
pm2 status

# ดู logs
pm2 logs parstock

# Restart
pm2 restart parstock

# Stop
pm2 stop parstock

# Start
pm2 start parstock
```

### อัพเดทจาก GitHub

```cmd
cd C:\websites\PARSTOCK
git pull
npm install
pm2 restart parstock
```

### Restart IIS

```cmd
iisreset
```

---

## Backup ข้อมูล

### Manual Backup

```cmd
cd C:\websites\PARSTOCK
xcopy storage C:\backups\parstock\storage-2024-XX-XX\ /E /I
```

### Automated Backup (Task Scheduler)

1. เปิด **Task Scheduler**
2. สร้าง **Basic Task**
3. Trigger: **Daily** เวลา 03:00
4. Action: **Start a program**
   - Program: `xcopy`
   - Arguments: `C:\websites\PARSTOCK\storage C:\backups\parstock\storage-%date:~-4,4%%date:~-7,2%%date:~-10,2%\ /E /I /Y`

---

## แก้ปัญหา

### Application ไม่ทำงาน

```cmd
pm2 logs parstock --lines 100
```

### IIS ไม่ forward ไป Node.js

1. ตรวจสอบว่า Node.js รันอยู่: `pm2 status`
2. ตรวจสอบ URL Rewrite rule ใน IIS
3. ดู logs: `C:\inetpub\logs\LogFiles\`

### Port 8080 ถูกใช้

```cmd
# ดูว่าใครใช้พอร์ท 8080
netstat -ano | findstr :8080

# Kill process
taskkill /PID <PID> /F
```

---

## สรุป

เข้าใช้งานได้ที่:
- **HTTP:** http://sbparstock.online
- **HTTPS:** https://sbparstock.online (หลังติดตั้ง SSL)

**หมายเหตุ:** Windows Server ซับซ้อนกว่า Linux แต่ทำได้เช่นกัน!
