# Quick Installation Guide - PAR Stock System

## สรุปการติดตั้งบน VPS (ทั้งหมด 5 ขั้นตอน)

### ข้อมูลระบบ
- **Domain:** sbparstock.online
- **VPS IP:** 123.253.61.116
- **Port:** 8080 (internal), 80/443 (public)

---

## ขั้นตอนที่ 1: เตรียม VPS (5 นาที)

```bash
# SSH เข้า VPS
ssh root@123.253.61.116

# อัพเดทระบบ
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# ติดตั้ง Nginx และ Git
sudo apt install -y nginx git

# ติดตั้ง PM2
sudo npm install -g pm2

# ตรวจสอบ
node --version   # ควรได้ v18.x.x
npm --version    # ควรได้ 9.x.x
nginx -v         # ควรได้ nginx version
```

---

## ขั้นตอนที่ 2: Clone และติดตั้ง Project (2 นาที)

```bash
# สร้างโฟลเดอร์
sudo mkdir -p /var/www
cd /var/www

# Clone repository
sudo git clone https://github.com/gardoffwhite/PARSTOCK.git
cd PARSTOCK

# ติดตั้ง dependencies
npm install

# สร้าง storage directory
mkdir -p storage uploads reports
```

---

## ขั้นตอนที่ 3: ตั้งค่า Nginx (2 นาที)

```bash
# คัดลอก nginx config
sudo cp nginx.conf /etc/nginx/sites-available/sbparstock.online

# เปิดใช้งาน site
sudo ln -s /etc/nginx/sites-available/sbparstock.online /etc/nginx/sites-enabled/

# ลบ default site
sudo rm -f /etc/nginx/sites-enabled/default

# ทดสอบ config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## ขั้นตอนที่ 4: เริ่มใช้งาน Application (1 นาที)

```bash
cd /var/www/PARSTOCK

# Start ด้วย PM2
pm2 start server.js --name parstock

# บันทึก process list
pm2 save

# ตั้งให้เริ่มอัตโนมัติตอน reboot
pm2 startup
# (ทำตามคำสั่งที่มันแสดง)

# ตรวจสอบสถานะ
pm2 status
pm2 logs parstock --lines 20
```

---

## ขั้นตอนที่ 5: ติดตั้ง SSL/HTTPS (3 นาที)

```bash
# ติดตั้ง Certbot
sudo apt install -y certbot python3-certbot-nginx

# ขอ SSL Certificate (ทำทุกอย่างอัตโนมัติ!)
sudo certbot --nginx -d sbparstock.online -d www.sbparstock.online

# ระหว่างติดตั้งจะถาม:
# 1. Email: ใส่อีเมลของคุณ
# 2. Terms: กด A (Agree)
# 3. Newsletter: กด N (No)
# 4. Redirect: กด 2 (Redirect HTTP to HTTPS)

# ทดสอบการต่ออายุอัตโนมัติ
sudo certbot renew --dry-run
```

---

## ✅ เสร็จแล้ว! ทดสอบระบบ

### ทดสอบการเข้าถึง

```bash
# ทดสอบ HTTP (จะ redirect ไป HTTPS)
curl -I http://sbparstock.online

# ทดสอบ HTTPS
curl -I https://sbparstock.online

# ตรวจสอบ PM2
pm2 status

# ดู logs
pm2 logs parstock
```

### เข้าใช้งานผ่าน Browser

1. เปิด browser ไปที่: **https://sbparstock.online**
2. Login ด้วย username/password ที่ตั้งไว้
3. เริ่มใช้งาน!

---

## คำสั่งที่ใช้บ่อย

### จัดการ Application

```bash
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

# ลบออกจาก PM2
pm2 delete parstock
```

### อัพเดทจาก GitHub

```bash
cd /var/www/PARSTOCK

# Pull code ใหม่
git pull

# ติดตั้ง dependencies ใหม่ (ถ้ามี)
npm install

# Restart application
pm2 restart parstock
```

### ตรวจสอบ Nginx

```bash
# ทดสอบ config
sudo nginx -t

# Restart
sudo systemctl restart nginx

# Reload (ไม่ downtime)
sudo systemctl reload nginx

# ดู error logs
sudo tail -f /var/log/nginx/error.log

# ดู access logs
sudo tail -f /var/log/nginx/access.log
```

### Firewall (UFW)

```bash
# ตรวจสอบสถานะ
sudo ufw status

# เปิด ports ที่จำเป็น
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# เปิดใช้งาน firewall
sudo ufw enable
```

---

## Backup ข้อมูล

### Backup Storage

```bash
# สร้าง backup
cd /var/www/PARSTOCK
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz storage/

# ย้าย backup ไปที่อื่น
mv backup-*.tar.gz /root/backups/
```

### Restore Storage

```bash
cd /var/www/PARSTOCK

# แตกไฟล์ backup
tar -xzf /root/backups/backup-YYYYMMDD-HHMMSS.tar.gz

# Restart application
pm2 restart parstock
```

### Automated Backup (Cron)

```bash
# แก้ไข crontab
crontab -e

# เพิ่มบรรทัดนี้ (backup ทุกวันเวลา 3:00 AM)
0 3 * * * cd /var/www/PARSTOCK && tar -czf /root/backups/backup-$(date +\%Y\%m\%d).tar.gz storage/
```

---

## แก้ปัญหา (Troubleshooting)

### Application ไม่ทำงาน

```bash
# ดู logs
pm2 logs parstock --lines 50

# ลอง restart
pm2 restart parstock

# ถ้ายังไม่ได้ ลอง delete และ start ใหม่
pm2 delete parstock
cd /var/www/PARSTOCK
pm2 start server.js --name parstock
pm2 save
```

### Nginx ไม่ทำงาน

```bash
# ตรวจสอบ config
sudo nginx -t

# ดู error logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

### SSL Certificate หมดอายุ

```bash
# ต่ออายุทันที
sudo certbot renew --force-renewal

# Reload nginx
sudo systemctl reload nginx
```

### Port ถูกใช้งานอยู่

```bash
# ดูว่าใครใช้พอร์ท 8080
sudo lsof -i :8080

# Kill process (ระวัง! ตรวจสอบก่อน)
sudo kill -9 <PID>
```

---

## ตรวจสอบความปลอดภัย

### อัพเดท Session Secret

```bash
cd /var/www/PARSTOCK

# สร้างไฟล์ .env
nano .env

# เพิ่มบรรทัดนี้ (เปลี่ยน secret ให้ยากๆ)
SESSION_SECRET=your-very-long-and-random-secret-key-here

# Restart application
pm2 restart parstock
```

### ตั้งค่า Firewall ให้เข้มงวด

```bash
# อนุญาตเฉพาะ ports ที่จำเป็น
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## เอกสารเพิ่มเติม

- **DEPLOYMENT.md** - คู่มือ deployment แบบละเอียด
- **SSL_SETUP.md** - คู่มือติดตั้ง SSL แบบละเอียด
- **README.md** - ข้อมูลเกี่ยวกับระบบ

---

## สรุป URLs

- **Production:** https://sbparstock.online
- **HTTP (redirect):** http://sbparstock.online
- **GitHub:** https://github.com/gardoffwhite/PARSTOCK

---

## การติดต่อและสนับสนุน

หากมีปัญหาหรือคำถาม:
1. ตรวจสอบ logs: `pm2 logs parstock`
2. ตรวจสอบ nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. ดูเอกสารใน DEPLOYMENT.md และ SSL_SETUP.md
