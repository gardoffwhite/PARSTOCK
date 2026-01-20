# ติดตั้ง nginx for Windows - คู่มือฉบับเร็ว

## ภาพรวม

ติดตั้ง nginx เพื่อให้ทั้ง 2 เว็ปเข้าได้โดยไม่ต้องใส่ Port:
- ✅ `http://nage-next.com` → Nage Game (Port 8081)
- ✅ `http://sbparstock.online` → PAR Stock (Port 8080)

---

## ขั้นตอนที่ 1: หยุด App ที่รัน Port 80 (ถ้ามี)

```cmd
# ดูว่าใครใช้ Port 80
netstat -ano | findstr :80

# หยุด process (เปลี่ยน PID ให้ตรง)
taskkill /PID <PID> /F
```

---

## ขั้นตอนที่ 2: ดาวน์โหลด nginx

1. ไปที่: http://nginx.org/en/download.html
2. ดาวน์โหลด **Stable version** สำหรับ Windows (เช่น `nginx-1.24.0`)
3. แตกไฟล์ไปที่ `C:\nginx`

---

## ขั้นตอนที่ 3: คัดลอก Config File

คัดลอกไฟล์ `nginx-config.conf` ที่ผมสร้างให้:

```cmd
copy C:\Users\GG\Desktop\WebStock\nginx-config.conf C:\nginx\conf\nginx.conf
```

หรือคัดลอกด้วยมือ:
- จาก: `C:\Users\GG\Desktop\WebStock\nginx-config.conf`
- ไปที่: `C:\nginx\conf\nginx.conf` (เขียนทับไฟล์เดิม)

---

## ขั้นตอนที่ 4: ทดสอบ Config

```cmd
cd C:\nginx
nginx -t
```

ควรเห็น:
```
nginx: the configuration file C:\nginx/conf/nginx.conf syntax is ok
nginx: configuration file C:\nginx/conf/nginx.conf test is successful
```

---

## ขั้นตอนที่ 5: เริ่ม nginx

```cmd
cd C:\nginx
start nginx
```

ตรวจสอบว่ารันอยู่:
```cmd
netstat -ano | findstr :80
tasklist | findstr nginx
```

---

## ขั้นตอนที่ 6: ทดสอบ

เปิด browser ทดสอบ:

1. **Nage Game:**
   - URL: `http://nage-next.com`
   - ควรเห็นหน้าเกม (ไม่ต้องใส่ :8081)

2. **PAR Stock:**
   - URL: `http://sbparstock.online`
   - ควรเห็นหน้า Login (ไม่ต้องใส่ :8080)

---

## คำสั่งจัดการ nginx

### Start nginx
```cmd
cd C:\nginx
start nginx
```

### Stop nginx
```cmd
cd C:\nginx
nginx -s stop
```

### Reload config (ไม่ต้อง restart)
```cmd
cd C:\nginx
nginx -s reload
```

### ตรวจสอบ config
```cmd
cd C:\nginx
nginx -t
```

### ดู error logs
```cmd
type C:\nginx\logs\error.log
```

---

## ตั้งให้เริ่มอัตโนมัติตอน Boot

### วิธีที่ 1: ใช้ Task Scheduler

1. เปิด **Task Scheduler**
2. คลิก **Create Basic Task**
3. Name: `nginx-autostart`
4. Trigger: **When the computer starts**
5. Action: **Start a program**
   - Program: `C:\nginx\nginx.exe`
   - Start in: `C:\nginx`
6. Finish

### วิธีที่ 2: ใช้ NSSM (Windows Service)

```cmd
# ดาวน์โหลด NSSM
# https://nssm.cc/download

# ติดตั้ง nginx เป็น Windows Service
nssm install nginx C:\nginx\nginx.exe

# Start service
nssm start nginx
```

---

## การอัพเดท Config

ถ้าต้องการแก้ไข config:

1. แก้ไขไฟล์: `C:\nginx\conf\nginx.conf`
2. ทดสอบ: `nginx -t`
3. Reload: `nginx -s reload`

---

## แก้ปัญหา

### nginx ไม่ทำงาน

```cmd
# ดู error logs
type C:\nginx\logs\error.log

# ตรวจสอบว่ามี process อื่นใช้ Port 80
netstat -ano | findstr :80
```

### เว็ปยังไม่เข้า

1. ตรวจสอบว่า nginx รันอยู่:
   ```cmd
   tasklist | findstr nginx
   ```

2. ตรวจสอบว่า Node.js apps รันอยู่:
   ```cmd
   netstat -ano | findstr :8080
   netstat -ano | findstr :8081
   ```

3. ตรวจสอบ DNS:
   ```cmd
   nslookup nage-next.com
   nslookup sbparstock.online
   ```

### Port 80 ถูกใช้งานอยู่

```cmd
# หาว่าใครใช้
netstat -ano | findstr :80

# Kill process
taskkill /PID <PID> /F
```

---

## สรุปหลังติดตั้ง

หลังติดตั้ง nginx แล้ว:

### ✅ สิ่งที่ใช้ได้:
```
http://nage-next.com           → Nage Game (ไม่มี :8081)
http://sbparstock.online       → PAR Stock (ไม่มี :8080)
```

### ⚠️ Node.js ยังต้องรัน:
```
Port 8081 → Nage Game Server
Port 8080 → PAR Stock Server
```

nginx แค่ forward request จาก Port 80 ไปยัง Port ที่ Node.js รันอยู่

---

## ติดตั้ง SSL/HTTPS (ขั้นตอนถัดไป)

ถ้าต้องการ HTTPS:

1. ซื้อ SSL Certificate สำหรับ:
   - `nage-next.com`
   - `sbparstock.online`

2. หรือใช้ Win-ACME (Let's Encrypt ฟรี)
   - https://www.win-acme.com/

3. Uncomment ส่วน HTTPS ใน `nginx.conf`
4. ใส่ path ของ SSL certificate
5. Reload nginx

---

## เอกสารเพิ่มเติม

- nginx for Windows: http://nginx.org/en/docs/windows.html
- nginx Beginner's Guide: http://nginx.org/en/docs/beginners_guide.html
