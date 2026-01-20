# Quick Start - Windows Server (5 นาที)

## ข้อมูล
- **VPS IP:** 123.253.61.116
- **Domain:** sbparstock.online
- **Port:** 8080

---

## ขั้นตอนที่ 1: ติดตั้ง Node.js (3 นาที)

1. **ดาวน์โหลด Node.js:**
   - เปิด browser ใน Windows Server
   - ไปที่: https://nodejs.org/
   - ดาวน์โหลด **LTS version** (แนะนำ v18.x.x)
   - รันไฟล์ `.msi` และติดตั้ง (กด Next ไปเรื่อยๆ)

2. **ติดตั้ง Git:**
   - ไปที่: https://git-scm.com/download/win
   - ดาวน์โหลดและติดตั้ง (กด Next ไปเรื่อยๆ)

---

## ขั้นตอนที่ 2: Clone Project และรัน (2 นาที)

เปิด **PowerShell** หรือ **Command Prompt**:

```cmd
cd C:\
mkdir websites
cd websites

git clone https://github.com/gardoffwhite/PARSTOCK.git
cd PARSTOCK

npm install

node server.js
```

---

## ✅ เสร็จแล้ว!

**ทดสอบ:**
- เปิด browser ไปที่: `http://123.253.61.116:8080`
- หรือ: `http://localhost:8080` (ถ้าเปิดบน server)

---

## เปิด Firewall (ถ้าเข้าจากภายนอกไม่ได้)

1. กด **Windows + R**
2. พิมพ์ `wf.msc` แล้วกด Enter
3. คลิก **Inbound Rules** → **New Rule...**
4. เลือก **Port** → Next
5. TCP → Specific ports: `8080` → Next
6. Allow the connection → Next
7. เลือกทั้งหมด → Next
8. Name: `PAR Stock App` → Finish

---

## ใช้งาน Domain (sbparstock.online)

### วิธีที่ 1: เข้าผ่าน Port โดยตรง (ง่ายที่สุด)
- ตั้ง DNS A Record: `sbparstock.online` → `123.253.61.116`
- เข้าใช้งาน: `http://sbparstock.online:8080`

### วิธีที่ 2: ใช้ IIS Reverse Proxy (ไม่ต้องใส่ :8080)
- ดูรายละเอียดใน **WINDOWS_INSTALL.md** ขั้นตอนที่ 7

---

## รัน 24/7 ด้วย PM2

```cmd
npm install -g pm2
npm install -g pm2-windows-service

pm2-service-install
# กด Enter ตอนถาม PM2_HOME
# พิมพ์ "PM2" ตอนถาม PM2_SERVICE_NAME

cd C:\websites\PARSTOCK
pm2 start server.js --name parstock
pm2 save
```

ตรวจสอบ:
```cmd
pm2 status
pm2 logs parstock
```

---

## คำสั่งที่ใช้บ่อย

```cmd
# ดูสถานะ
pm2 status

# ดู logs
pm2 logs parstock

# Restart
pm2 restart parstock

# Stop
pm2 stop parstock

# อัพเดทจาก GitHub
cd C:\websites\PARSTOCK
git pull
npm install
pm2 restart parstock
```

---

## สรุป

| เข้าใช้งานได้ที่ | URL |
|------------------|-----|
| IP:Port (ตอนนี้) | http://123.253.61.116:8080 |
| Domain:Port | http://sbparstock.online:8080 |
| Domain เฉยๆ (ต้องติดตั้ง IIS) | http://sbparstock.online |
| HTTPS (ต้องติดตั้ง SSL) | https://sbparstock.online |

**หมายเหตุ:**
- ถ้าต้องการใช้งานแบบเต็มรูปแบบ (ไม่ต้องใส่ :8080) ดูใน **WINDOWS_INSTALL.md**
- ถ้าต้องการ HTTPS/SSL ดูใน **WINDOWS_INSTALL.md** ขั้นตอนที่ 9
