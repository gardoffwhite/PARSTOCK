# Deployment Guide for sbparstock.online

## Prerequisites
- VPS with Ubuntu/Debian
- Domain: sbparstock.online pointing to 123.253.61.116
- Node.js installed
- Nginx installed

## Step 1: Setup DNS (Already Done)
- A Record: sbparstock.online → 123.253.61.116

## Step 2: Install Dependencies on VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
```

## Step 3: Clone and Setup Project

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/gardoffwhite/PARSTOCK.git
cd PARSTOCK

# Install dependencies
npm install

# Create storage directory
mkdir -p storage
```

## Step 4: Setup Nginx

```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/sbparstock.online

# Enable site
sudo ln -s /etc/nginx/sites-available/sbparstock.online /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## Step 5: Start Application

```bash
# Start with PM2
pm2 start server.js --name parstock

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# (Follow the command it shows)

# Check status
pm2 status
pm2 logs parstock
```

## Step 6: Setup SSL (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d sbparstock.online -d www.sbparstock.online

# Certbot will automatically configure nginx for HTTPS
```

## Access Your Site

- HTTP: http://sbparstock.online
- HTTPS (after SSL): https://sbparstock.online

## Useful Commands

```bash
# View logs
pm2 logs parstock

# Restart app
pm2 restart parstock

# Update app from GitHub
cd /var/www/PARSTOCK
git pull
npm install
pm2 restart parstock

# Check nginx status
sudo systemctl status nginx

# Reload nginx after config change
sudo nginx -t && sudo systemctl reload nginx
```

## Troubleshooting

### If port 8080 is already in use:
```bash
# Check what's using port 8080
sudo lsof -i :8080

# Or change port in server.js and restart
```

### If site doesn't load:
```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check PM2 logs
pm2 logs parstock

# Check firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Data Backup
Storage files are in `/var/www/PARSTOCK/storage/`
```bash
# Backup
tar -czf parstock-backup-$(date +%Y%m%d).tar.gz storage/

# Restore
tar -xzf parstock-backup-YYYYMMDD.tar.gz
```
