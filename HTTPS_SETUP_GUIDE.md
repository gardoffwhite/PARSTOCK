# คู่มือการตั้งค่า HTTPS สำหรับ sbparstock.online บน Windows Server

## วิธีที่ 1: ใช้ Win-ACME (แนะนำ - ฟรี Let's Encrypt)

### ขั้นตอนที่ 1: ดาวน์โหลด Win-ACME

1. เปิดเบราว์เซอร์ไปที่: https://github.com/win-acme/win-acme/releases
2. ดาวน์โหลดไฟล์ล่าสุด: `win-acme.v2.x.x.xxxx.x64.pluggable.zip`
3. แตกไฟล์ไปที่ `C:\win-acme\`

### ขั้นตอนที่ 2: เตรียม nginx

1. เปิด Command Prompt (Administrator)
2. สร้างโฟลเดอร์สำหรับ SSL:
```cmd
mkdir C:\nginx-1.29.3\conf\ssl
```

3. สร้างโฟลเดอร์สำหรับ ACME Challenge:
```cmd
mkdir C:\nginx-1.29.3\html\.well-known\acme-challenge
```

### ขั้นตอนที่ 3: แก้ไข nginx config เพื่อรองรับ ACME Challenge

แก้ไขไฟล์ `C:\nginx-1.29.3\conf\nginx.conf`:

```nginx
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    # Nage Game Server (Port 8081)
    server {
        listen 80;
        server_name nage-next.com www.nage-next.com;

        # ACME Challenge for Let's Encrypt
        location /.well-known/acme-challenge/ {
            root C:/nginx-1.29.3/html;
        }

        location / {
            proxy_pass http://localhost:8081;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # PAR Stock System (Port 8080)
    server {
        listen 80;
        server_name sbparstock.online www.sbparstock.online;

        # ACME Challenge for Let's Encrypt
        location /.well-known/acme-challenge/ {
            root C:/nginx-1.29.3/html;
        }

        location / {
            proxy_pass http://localhost:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

4. Reload nginx:
```cmd
cd C:\nginx-1.29.3
nginx -s reload
```

### ขั้นตอนที่ 4: เปิด Port 443 บน Firewall

```cmd
netsh advfirewall firewall add rule name="HTTPS Port 443" dir=in action=allow protocol=TCP localport=443
```

### ขั้นตอนที่ 5: รัน Win-ACME เพื่อขอ SSL Certificate

1. เปิด Command Prompt (Administrator)
2. ไปที่โฟลเดอร์ Win-ACME:
```cmd
cd C:\win-acme
```

3. รันโปรแกรม:
```cmd
wacs.exe
```

4. เลือก **N: Create certificate (full options)**

5. กรอกข้อมูลตามนี้:
   - **Description**: `sbparstock.online`
   - **Domains**:
     - Main domain: `sbparstock.online`
     - Alternate names: `www.sbparstock.online`
   - **Validation**: เลือก **http-01** (HTTP validation)
   - **Validation path**: `C:\nginx-1.29.3\html\.well-known\acme-challenge`
   - **Installation**: เลือก **None** (เราจะติดตั้งเองใน nginx)
   - **Store**: เลือก **PEM files**
   - **PEM path**: `C:\nginx-1.29.3\conf\ssl`

6. โปรแกรมจะขอ certificate จาก Let's Encrypt และบันทึกไฟล์:
   - `C:\nginx-1.29.3\conf\ssl\sbparstock.online-chain.pem` (Certificate)
   - `C:\nginx-1.29.3\conf\ssl\sbparstock.online-key.pem` (Private Key)

### ขั้นตอนที่ 6: อัพเดท nginx config เพื่อใช้ HTTPS

แก้ไขไฟล์ `C:\nginx-1.29.3\conf\nginx.conf` ให้เป็นแบบนี้:

```nginx
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    # Redirect HTTP to HTTPS for PAR Stock
    server {
        listen 80;
        server_name sbparstock.online www.sbparstock.online;

        # ACME Challenge
        location /.well-known/acme-challenge/ {
            root C:/nginx-1.29.3/html;
        }

        # Redirect to HTTPS
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS for PAR Stock
    server {
        listen 443 ssl;
        server_name sbparstock.online www.sbparstock.online;

        # SSL Certificate
        ssl_certificate     C:/nginx-1.29.3/conf/ssl/sbparstock.online-chain.pem;
        ssl_certificate_key C:/nginx-1.29.3/conf/ssl/sbparstock.online-key.pem;

        # SSL Settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        location / {
            proxy_pass http://localhost:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # Nage Game Server (HTTP only)
    server {
        listen 80;
        server_name nage-next.com www.nage-next.com;

        # ACME Challenge
        location /.well-known/acme-challenge/ {
            root C:/nginx-1.29.3/html;
        }

        location / {
            proxy_pass http://localhost:8081;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### ขั้นตอนที่ 7: Reload nginx

```cmd
cd C:\nginx-1.29.3
nginx -t
nginx -s reload
```

### ขั้นตอนที่ 8: ทดสอบ

1. เปิดเบราว์เซอร์ไปที่: https://sbparstock.online
2. ตรวจสอบว่ามี🔒 (กุญแจ) ข้างหน้า URL
3. คลิกที่กุญแจเพื่อดูรายละเอียด certificate

---

## การต่ออายุ Certificate อัตโนมัติ

Win-ACME จะสร้าง Scheduled Task ใน Windows Task Scheduler ให้อัตโนมัติ

ตรวจสอบ:
1. เปิด Task Scheduler
2. ดูที่ Task Library
3. จะมี task ชื่อ "win-acme renew (acme-v02.api.letsencrypt.org)"
4. Task นี้จะรันทุก 2 เดือนเพื่อต่ออายุ certificate

---

## วิธีที่ 2: ใช้ Cloudflare (ง่ายที่สุด - แต่ต้องผ่าน Cloudflare)

### ขั้นตอน:

1. **สมัคร Cloudflare** (ฟรี): https://cloudflare.com
2. **เพิ่มโดเมน**: sbparstock.online
3. **เปลี่ยน Nameserver** ที่ผู้ให้บริการโดเมนของคุณ
4. **เปิด SSL/TLS** ใน Cloudflare:
   - SSL/TLS → Overview
   - เลือก **Flexible** (ถ้า backend เป็น HTTP)
   - หรือ **Full** (ถ้า backend มี HTTPS self-signed)
5. **เปิด "Always Use HTTPS"**:
   - SSL/TLS → Edge Certificates
   - เปิด "Always Use HTTPS"

**ข้อดี:**
- ✅ ตั้งค่าง่าย ไม่ต้องแก้ไข nginx
- ✅ SSL/TLS certificate อัตโนมัติ
- ✅ มี CDN และ DDoS protection

**ข้อเสีย:**
- ❌ Traffic ต้องผ่าน Cloudflare
- ❌ ต้องเปลี่ยน nameserver

---

## วิธีที่ 3: ซื้อ SSL Certificate (เสียเงิน)

ซื้อจาก:
- Namecheap SSL
- GoDaddy SSL
- DigiCert

**ราคา:** 300-3,000 บาท/ปี

---

## คำแนะนำ

**แนะนำวิธีที่ 1 (Win-ACME):**
- ✅ **ฟรี**
- ✅ **ต่ออายุอัตโนมัติ**
- ✅ **ไว้ใจได้** (Let's Encrypt ใช้กันทั่วโลก)
- ✅ **ไม่ต้องผ่าน Cloudflare**

---

## Troubleshooting

### ถ้า Win-ACME ขอ certificate ไม่ได้:

1. **ตรวจสอบ DNS:**
   ```cmd
   nslookup sbparstock.online
   ```
   ต้องชี้ไปที่ IP: 123.253.61.116

2. **ตรวจสอบ Port 80 เปิดอยู่:**
   ```cmd
   netstat -ano | findstr :80
   ```

3. **ตรวจสอบ Firewall:**
   ```cmd
   netsh advfirewall firewall show rule name="HTTP Port 80"
   ```

4. **ทดสอบ ACME Challenge path:**
   - สร้างไฟล์ test: `C:\nginx-1.29.3\html\.well-known\acme-challenge\test.txt`
   - เปิดเบราว์เซอร์: http://sbparstock.online/.well-known/acme-challenge/test.txt
   - ต้องเห็นเนื้อหาไฟล์

### ถ้า nginx ไม่ start:

```cmd
cd C:\nginx-1.29.3
nginx -t
```

ดูข้อผิดพลาด และแก้ไข config

---

## การรักษาความปลอดภัย

หลังจากมี HTTPS แล้ว:

1. **Force HTTPS ใน Node.js** (ถ้าต้องการ):

   แก้ไขไฟล์ `server.js`:
   ```javascript
   // Redirect HTTP to HTTPS (ถ้าไม่ได้ผ่าน nginx)
   app.use((req, res, next) => {
     if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
       return res.redirect(301, `https://${req.headers.host}${req.url}`);
     }
     next();
   });
   ```

2. **อัพเดท Session Cookie**:

   แก้ไขไฟล์ `server.js`:
   ```javascript
   app.use(session({
     secret: process.env.SESSION_SECRET || 'parstock-secret-key-change-in-production',
     resave: false,
     saveUninitialized: false,
     cookie: {
       secure: true,  // เปลี่ยนเป็น true สำหรับ HTTPS
       httpOnly: true,
       maxAge: 24 * 60 * 60 * 1000
     }
   }));
   ```

---

**หมายเหตุ:** Certificate จาก Let's Encrypt มีอายุ 90 วัน แต่ Win-ACME จะต่ออายุอัตโนมัติทุก 60 วัน
