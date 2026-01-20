# SSL/HTTPS Setup Guide with Let's Encrypt (ฟรี!)

## ข้อกำหนดเบื้องต้น

1. ✅ Domain ชี้มาที่ VPS แล้ว (sbparstock.online → 123.253.61.116)
2. ✅ Nginx ติดตั้งและรันอยู่แล้ว
3. ✅ Application รันที่พอร์ท 8080
4. ✅ Port 80 และ 443 เปิดอยู่

---

## วิธีที่ 1: ใช้ Certbot (ง่ายที่สุด - แนะนำ!)

### ขั้นตอนที่ 1: ติดตั้ง Certbot

```bash
# อัพเดทระบบ
sudo apt update

# ติดตั้ง Certbot และ Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

### ขั้นตอนที่ 2: ขอ SSL Certificate

```bash
# รัน Certbot (มันจะตั้งค่าทุกอย่างให้อัตโนมัติ!)
sudo certbot --nginx -d sbparstock.online -d www.sbparstock.online
```

**Certbot จะถาม:**

1. **Email address:** ใส่อีเมลของคุณ (สำหรับแจ้งเตือนเมื่อ certificate จะหมดอายุ)
   ```
   Enter email address: your-email@example.com
   ```

2. **Terms of Service:** กด `A` เพื่อยอมรับ
   ```
   Please read the Terms of Service... (A)gree/(C)ancel: A
   ```

3. **Share email with EFF:** กด `N` (ไม่บังคับ)
   ```
   (Y)es/(N)o: N
   ```

4. **Redirect HTTP to HTTPS:** กด `2` เพื่อ redirect อัตโนมัติ
   ```
   1: No redirect
   2: Redirect - Make all requests redirect to secure HTTPS
   Select: 2
   ```

### ขั้นตอนที่ 3: ทดสอบ

```bash
# ทดสอบว่า SSL ทำงานไหม
curl -I https://sbparstock.online

# ควรเห็น "HTTP/2 200" หรือ "HTTP/1.1 200"
```

### ขั้นตอนที่ 4: ตั้งค่า Auto-Renewal (ต่ออายุอัตโนมัติ)

```bash
# ทดสอบการต่ออายุ (dry run)
sudo certbot renew --dry-run

# ถ้าไม่มี error แสดงว่าจะต่ออายุอัตโนมัติได้
# Certbot จะตั้งค่า cron job ให้อัตโนมัติแล้ว
```

**เสร็จแล้ว!** ✅ เข้าใช้งานได้ที่ **https://sbparstock.online**

---

## วิธีที่ 2: Manual Setup (สำหรับผู้ที่ต้องการควบคุมเอง)

### ขั้นตอนที่ 1: ขอ Certificate แบบ Manual

```bash
sudo certbot certonly --nginx -d sbparstock.online -d www.sbparstock.online
```

### ขั้นตอนที่ 2: แก้ไข Nginx Config

```bash
sudo nano /etc/nginx/sites-available/sbparstock.online
```

แก้ไขเป็น:

```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name sbparstock.online www.sbparstock.online;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name sbparstock.online www.sbparstock.online;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/sbparstock.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sbparstock.online/privkey.pem;

    # SSL Configuration (Best Practices)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HSTS (optional but recommended)
    add_header Strict-Transport-Security "max-age=31536000" always;

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
```

### ขั้นตอนที่ 3: ทดสอบและ Reload Nginx

```bash
# ทดสอบ config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## ตรวจสอบสถานะ SSL

### 1. ดู Certificate ที่ติดตั้ง

```bash
sudo certbot certificates
```

ผลลัพธ์:
```
Certificate Name: sbparstock.online
  Domains: sbparstock.online www.sbparstock.online
  Expiry Date: 2024-XX-XX XX:XX:XX+00:00 (VALID: 89 days)
```

### 2. ทดสอบ SSL Online

เข้า: https://www.ssllabs.com/ssltest/analyze.html?d=sbparstock.online

ควรได้เกรด **A** หรือ **A+**

### 3. ทดสอบการ Redirect

```bash
# ทดสอบว่า HTTP redirect ไป HTTPS ไหม
curl -I http://sbparstock.online

# ควรเห็น "301 Moved Permanently"
# Location: https://sbparstock.online/
```

---

## การต่ออายุ Certificate

Let's Encrypt certificates หมดอายุทุก **90 วัน** แต่ Certbot จะต่ออายุอัตโนมัติให้

### ตรวจสอบ Auto-Renewal

```bash
# ดู systemd timer
sudo systemctl list-timers | grep certbot

# หรือดู cron job
sudo cat /etc/cron.d/certbot
```

### ต่ออายุด้วยตัวเอง (ถ้าต้องการ)

```bash
# ต่ออายุทุก certificates
sudo certbot renew

# Reload nginx หลังต่ออายุ
sudo systemctl reload nginx
```

---

## แก้ปัญหา (Troubleshooting)

### ปัญหา: "Unable to find a virtual host"

**วิธีแก้:**
```bash
# ตรวจสอบว่า nginx config ถูกต้อง
sudo nginx -t

# ตรวจสอบว่า domain ชี้ถูก
ping sbparstock.online

# ควรได้ IP: 123.253.61.116
```

### ปัญหา: "Port 80 already in use"

**วิธีแก้:**
```bash
# หา process ที่ใช้พอร์ท 80
sudo lsof -i :80

# Stop process หรือ service ที่ขัดแย้ง
```

### ปัญหา: Certificate หมดอายุ

**วิธีแก้:**
```bash
# บังคับต่ออายุทันที
sudo certbot renew --force-renewal

# Reload nginx
sudo systemctl reload nginx
```

### ปัญหา: "Too many certificates already issued"

Let's Encrypt จำกัด **50 certificates/week/domain**

**วิธีแก้:**
```bash
# รอ 1 สัปดาห์ หรือใช้ --staging สำหรับทดสอบ
sudo certbot --nginx --staging -d sbparstock.online
```

---

## สรุป

หลังจากติดตั้ง SSL แล้ว:

1. ✅ เข้าได้ทั้ง HTTP และ HTTPS
2. ✅ HTTP จะ redirect ไป HTTPS อัตโนมัติ
3. ✅ Certificate จะต่ออายุอัตโนมัติทุก 60 วัน
4. ✅ ปลอดภัยด้วย TLS 1.2/1.3

**URLs:**
- 🔓 HTTP: http://sbparstock.online (จะ redirect)
- 🔒 HTTPS: https://sbparstock.online ✅

---

## คำสั่งที่ใช้บ่อย

```bash
# ดูสถานะ certificates
sudo certbot certificates

# ต่ออายุทั้งหมด
sudo certbot renew

# ลบ certificate
sudo certbot delete --cert-name sbparstock.online

# ทดสอบ nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# ดู nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```
