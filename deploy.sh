#!/bin/bash

# Custom Video SDK Deployment Script for Hostinger VPS
# Run this on your VPS to deploy the video calling service

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="custom-video-sdk"
APP_DIR="/var/www/$APP_NAME"
DOMAIN="your-domain.com"  # Change this to your domain
EMAIL="your-email@domain.com"  # Change this to your email

echo -e "${BLUE}🚀 Starting Custom Video SDK Deployment${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install Node.js 18
echo -e "${YELLOW}📦 Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install additional dependencies
echo -e "${YELLOW}📦 Installing system dependencies...${NC}"
apt-get install -y \
    nginx \
    certbot \
    python3-certbot-nginx \
    git \
    curl \
    htop \
    ufw

# Install PM2 globally
echo -e "${YELLOW}📦 Installing PM2...${NC}"
npm install -g pm2

# Configure firewall
echo -e "${YELLOW}🔒 Configuring firewall...${NC}"
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443

# Create application directory
echo -e "${YELLOW}📁 Setting up application directory...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone or copy application code
echo -e "${YELLOW}📥 Deploying application code...${NC}"
# If you have this in a git repository, uncomment and modify:
# git clone https://github.com/yourusername/custom-video-sdk.git .

# For now, we'll create the structure (assuming code is already copied)
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Application code not found. Please copy your code to $APP_DIR${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing application dependencies...${NC}"
npm install --production

# Create directories
mkdir -p recordings logs

# Set up PM2 ecosystem file
echo -e "${YELLOW}⚙️ Creating PM2 configuration...${NC}"
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      MAX_PARTICIPANTS: 50,
      RECORDING_ENABLED: true
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Configure Nginx
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL configuration (will be set up by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:3000/health;
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"

# Start application with PM2
cd $APP_DIR
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# Start Nginx
systemctl enable nginx
systemctl restart nginx

# Set up SSL with Let's Encrypt
echo -e "${YELLOW}🔒 Setting up SSL certificate...${NC}"
if [ "$DOMAIN" != "your-domain.com" ]; then
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL
    systemctl reload nginx
else
    echo -e "${YELLOW}⚠️ Skipping SSL setup. Please update DOMAIN variable in this script.${NC}"
fi

# Set up log rotation
echo -e "${YELLOW}📝 Setting up log rotation...${NC}"
cat > /etc/logrotate.d/$APP_NAME << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create maintenance script
echo -e "${YELLOW}🔧 Creating maintenance scripts...${NC}"
cat > /usr/local/bin/video-sdk-status << 'EOF'
#!/bin/bash
echo "=== Custom Video SDK Status ==="
pm2 status
echo ""
echo "=== System Resources ==="
free -h
echo ""
df -h
echo ""
echo "=== Recent Logs ==="
tail -20 /var/www/custom-video-sdk/logs/combined.log
EOF

chmod +x /usr/local/bin/video-sdk-status

# Create backup script
cat > /usr/local/bin/video-sdk-backup << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/video-sdk"
mkdir -p $BACKUP_DIR
cd /var/www/custom-video-sdk
tar -czf "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz" \
    recordings/ logs/ package.json ecosystem.config.js
echo "Backup created in $BACKUP_DIR"
EOF

chmod +x /usr/local/bin/video-sdk-backup

# Set up cron job for cleanup
echo -e "${YELLOW}🗑️ Setting up automatic cleanup...${NC}"
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/video-sdk-backup") | crontab -
(crontab -l 2>/dev/null; echo "0 3 * * 0 find /var/www/custom-video-sdk/recordings -type f -mtime +7 -delete") | crontab -

# Final status check
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
pm2 status
echo ""
echo -e "${BLUE}🔗 Your video SDK is available at:${NC}"
if [ "$DOMAIN" != "your-domain.com" ]; then
    echo -e "   https://$DOMAIN"
    echo -e "   Health check: https://$DOMAIN/health"
    echo -e "   API info: https://$DOMAIN/api/info"
else
    echo -e "   http://$(curl -s ifconfig.me):80"
    echo -e "   Health check: http://$(curl -s ifconfig.me)/health"
fi
echo ""
echo -e "${BLUE}🛠️ Management Commands:${NC}"
echo -e "   Status: video-sdk-status"
echo -e "   Backup: video-sdk-backup"
echo -e "   Restart: pm2 restart $APP_NAME"
echo -e "   Logs: pm2 logs $APP_NAME"
echo ""
echo -e "${GREEN}🎉 Your custom video SDK is ready for production!${NC}" 