# 🚀 Complete Deployment Guide

## 📋 **Prerequisites**
- VPS Server (77.37.44.161)
- GitHub repository
- Local machine with SSH access
- Domain configured (videosdk.genisisserver.space)

## 🔑 **Step 1: SSH Key Setup**

### **On Your Local Machine:**
```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "github-actions@videosdk"
# Press Enter for default location (~/.ssh/id_rsa)
# Press Enter twice for no passphrase

# Copy public key to server
ssh-copy-id root@77.37.44.161

# Test SSH connection
ssh root@77.37.44.161
```

### **Manual SSH Setup (Alternative):**
```bash
# View your public key
cat ~/.ssh/id_rsa.pub

# On your server (77.37.44.161)
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste your public key here

# Set correct permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## 🛠️ **Step 2: Server Initial Setup**

```bash
# Connect to your server
ssh root@77.37.44.161

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y curl wget git nginx

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Create application directory
mkdir -p /var/www/video-sdk
chown root:root /var/www/video-sdk

# Create log directory
mkdir -p /var/log/custom-video-sdk
```

## 🔒 **Step 3: GitHub Secrets Configuration**

### **Go to GitHub Repository:**
1. Navigate to your repository on GitHub
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### **Add These Secrets:**

#### **SERVER_HOST**
- **Name:** `SERVER_HOST`
- **Value:** `77.37.44.161`

#### **SERVER_USER**
- **Name:** `SERVER_USER`
- **Value:** `root`

#### **SERVER_PORT**
- **Name:** `SERVER_PORT`
- **Value:** `22`

#### **SERVER_SSH_KEY**
- **Name:** `SERVER_SSH_KEY`
- **Value:** Your private SSH key

**To get your private SSH key:**
```bash
# On your local machine
cat ~/.ssh/id_rsa

# Copy ENTIRE output including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# [key content]
# -----END OPENSSH PRIVATE KEY-----
```

## 🔧 **Step 4: Verify GitHub Actions Workflow**

The workflow file is located at: `.github/workflows/deploy.yaml`

**Features:**
- ✅ Automatic deployment on push to main
- ✅ Smart git reset for clean updates
- ✅ Dependency installation
- ✅ PM2 process management
- ✅ Nginx configuration
- ✅ SSL certificate setup
- ✅ Health checks

## 🚀 **Step 5: First Deployment**

```bash
# On your local machine
git add .
git commit -m "Setup GitHub Actions deployment"
git push origin main

# Go to GitHub → Actions tab to monitor deployment
```

## 📋 **Step 6: Verification**

### **Check Deployment Status:**
```bash
# On GitHub
# Go to: https://github.com/StrixSid07/CustomVideoSDK/actions
# Check latest workflow run
```

### **Test Your Application:**
```bash
# Test endpoints
curl https://videosdk.genisisserver.space/health
curl https://videosdk.genisisserver.space/api/info

# Test in browser:
# - https://videosdk.genisisserver.space/host.html
# - https://videosdk.genisisserver.space/client.html
# - https://videosdk.genisisserver.space/debug.html
```

### **Server-side Verification:**
```bash
# SSH into server
ssh root@77.37.44.161

# Check services
pm2 status
systemctl status nginx

# Check logs
pm2 logs custom-video-sdk
tail -f /var/log/nginx/access.log
```

## 🔄 **Step 7: Future Deployments**

Every time you push to main branch:
```bash
# Make your changes
git add .
git commit -m "Your update message"
git push origin main

# Automatic deployment will:
# 1. Pull latest code with hard reset
# 2. Install/update dependencies
# 3. Restart services with zero downtime
# 4. Run health checks
# 5. Update SSL if needed
```

## 🛠️ **Troubleshooting**

### **SSH Connection Issues:**
```bash
# Test SSH connection
ssh -v root@77.37.44.161

# Check SSH key
ssh-add -l
ssh-add ~/.ssh/id_rsa
```

### **GitHub Actions Failing:**
1. Check **Actions** tab on GitHub
2. Click on failed workflow
3. Check logs for errors
4. Common issues:
   - SSH key format wrong
   - Server not accessible
   - Permissions issues

### **Application Not Working:**
```bash
# SSH into server
ssh root@77.37.44.161

# Check application status
pm2 status
pm2 logs custom-video-sdk --lines 50

# Check Nginx
systemctl status nginx
nginx -t

# Restart services
pm2 restart custom-video-sdk
systemctl restart nginx
```

### **SSL Issues:**
```bash
# Check SSL certificate
sudo certbot certificates

# Renew SSL
sudo certbot renew

# Manual SSL setup
sudo certbot --nginx -d videosdk.genisisserver.space
```

## 📊 **Monitoring**

### **GitHub Actions:**
- Monitor deployments at: https://github.com/StrixSid07/CustomVideoSDK/actions
- Get email notifications for failed deployments

### **Server Monitoring:**
```bash
# Real-time logs
pm2 monit
tail -f /var/www/video-sdk/logs/combined.log

# System resources
htop
df -h
free -h
```

### **Application Health:**
```bash
# Health check endpoint
curl https://videosdk.genisisserver.space/health
```

## 🎯 **Best Practices**

1. **Always test locally first**
2. **Use meaningful commit messages**
3. **Monitor GitHub Actions for failures**
4. **Keep server updated**
5. **Regular backups**
6. **Monitor disk space and memory**

## 🎉 **Success!**

Your Custom Video SDK is now:
- ✅ **Auto-deploying** on every push
- ✅ **SSL secured** with automatic renewal
- ✅ **Zero-downtime** updates
- ✅ **Health monitored**
- ✅ **Production ready**

**Live URLs:**
- 🌐 **Main:** https://videosdk.genisisserver.space
- 🎮 **Host:** https://videosdk.genisisserver.space/host.html
- 📺 **Client:** https://videosdk.genisisserver.space/client.html
- 🔧 **Debug:** https://videosdk.genisisserver.space/debug.html
- ❤️ **Health:** https://videosdk.genisisserver.space/health 