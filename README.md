# Custom Video SDK for Gaming

[![GitHub Repository](https://img.shields.io/badge/GitHub-StrixSid07%2FCustomVideoSDK-blue?logo=github)](https://github.com/StrixSid07/CustomVideoSDK)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/StrixSid07/CustomVideoSDK/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/StrixSid07/CustomVideoSDK?style=social)](https://github.com/StrixSid07/CustomVideoSDK)

A powerful, self-hosted video calling SDK built with Node.js and WebRTC that replicates Agora's functionality. Perfect for mobile gaming applications requiring real-time video communication.

**🌐 Live Demo:** [videosdk.genisisserver.space](https://videosdk.genisisserver.space)  
**📁 Source Code:** [github.com/StrixSid07/CustomVideoSDK](https://github.com/StrixSid07/CustomVideoSDK)

## 🚀 Features

- **Real-time Video Calling** - Multi-participant video calls
- **Network Optimization** - Adaptive quality based on connection
- **Low Latency** - Optimized for gaming scenarios
- **Mobile Friendly** - Works on cellular and low-bandwidth connections
- **Screen Sharing** - Share screen during calls
- **Recording** - Record video calls
- **Self-Hosted** - Deploy on your own VPS
- **Agora-Compatible API** - Drop-in replacement for Agora SDK

## 📋 Requirements

- Node.js 16+
- VPS with at least 1GB RAM
- SSL Certificate (for HTTPS/WSS)
- Domain name (recommended)

## ⚡ **Quick Start**

```bash
# Clone the repository
git clone https://github.com/StrixSid07/CustomVideoSDK.git
cd CustomVideoSDK

# Install dependencies
npm install

# Start the server
npm start

# Access the dashboard
# Open: http://localhost:5005/host.html
```

## 🛠️ Installation

1. **Clone and Install Dependencies**
```bash
# Clone the repository
git clone https://github.com/StrixSid07/CustomVideoSDK.git
cd CustomVideoSDK

# Install dependencies
npm install
```

2. **Start the Server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

3. **Test the Client SDK**
```bash
npm run client
```

## 🎮 Usage (Same as Agora SDK)

```javascript
const { CustomVideoSDK, LOG_FILTER } = require('./client-sdk/CustomVideoSDK');

// Initialize engine (same as Agora)
const sdk = CustomVideoSDK.GetEngine('your_app_id', 'https://your-server.com');

// Set up callbacks (identical to Agora)
sdk.OnJoinChannelSuccess = (channelName, uid, elapsed) => {
    console.log('Joined channel:', channelName);
};

sdk.OnUserJoined = (uid, elapsed) => {
    console.log('User joined:', uid);
};

// Enable video and join channel (same API as Agora)
sdk.EnableVideo();
sdk.EnableVideoObserver();
await sdk.JoinChannelByKey('', 'channel_name', 0);
```

## 🌐 Deployment on Hostinger VPS

### Step 1: Server Setup
```bash
# Connect to your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2
```

### Step 2: Deploy Application
```bash
# Clone the Custom Video SDK to VPS
git clone https://github.com/StrixSid07/CustomVideoSDK.git /var/www/video-sdk
cd /var/www/video-sdk

# Install dependencies
npm install --production

# Start with PM2
pm2 start server/index.js --name "video-sdk"
pm2 startup
pm2 save
```
### Step 3: Configure Nginx & SSL
```bash
# Install Nginx
apt install nginx -y

# Create Nginx configuration for your domain
sudo nano /etc/nginx/sites-available/videosdk
```

**Add this configuration to `/etc/nginx/sites-available/videosdk`:**
```nginx
server {
    listen 80;
    server_name videosdk.genisisserver.space www.videosdk.genisisserver.space;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name videosdk.genisisserver.space www.videosdk.genisisserver.space;
    
    # SSL Configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/videosdk.genisisserver.space/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/videosdk.genisisserver.space/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable the site and configure SSL:**
```bash
# Enable the Nginx site
sudo ln -s /etc/nginx/sites-available/videosdk /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Install Certbot for SSL certificates
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot

# Create symlink for certbot command
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get SSL certificate for your domain
sudo certbot --nginx -d videosdk.genisisserver.space -d www.videosdk.genisisserver.space --email support@genisisserver.space --agree-tos --no-eff-email

# Verify SSL auto-renewal
sudo certbot renew --dry-run

# Restart services
sudo systemctl restart nginx
sudo systemctl restart pm2-root
```

**For custom domain, replace `videosdk.genisisserver.space` with your domain:**
```bash
# Example for custom domain setup
sudo nano /etc/nginx/sites-available/videosdk
# Replace: videosdk.genisisserver.space with yourdomain.com
# Replace: support@genisisserver.space with your-email@yourdomain.com

# Then run certbot with your domain:
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com --email your-email@yourdomain.com --agree-tos --no-eff-email
```

### Step 4: Validate Deployment
```bash
# Check if all services are running
sudo systemctl status nginx
sudo pm2 status

# Test domain access
curl -I https://videosdk.genisisserver.space
curl -I https://videosdk.genisisserver.space/health

# Test WebSocket connection
curl -I https://videosdk.genisisserver.space/socket.io/

# View application logs
sudo pm2 logs video-sdk

# Monitor real-time logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**🎉 Access Your Video SDK:**
- **Host Dashboard:** `https://videosdk.genisisserver.space/host.html`
- **Client Viewer:** `https://videosdk.genisisserver.space/client.html`
- **Debug Tool:** `https://videosdk.genisisserver.space/debug.html`
- **Health Check:** `https://videosdk.genisisserver.space/health`

## 📊 API Endpoints

- `GET /health` - Server health check
- `GET /api/info` - SDK version and features
- `POST /api/rooms` - Create a new room
- WebSocket endpoints for real-time communication

## 🔧 Configuration

### Environment Variables
```bash
PORT=5005
NODE_ENV=production
MAX_PARTICIPANTS=50
RECORDING_ENABLED=true
```

### Network Optimization
The SDK automatically adjusts quality based on:
- Connection type (WiFi, 4G, 3G)
- Bandwidth availability
- Packet loss rates
- Round-trip time (RTT)

## 📱 Mobile Gaming Integration

### Unity Integration
```csharp
// Similar to original Agora usage
public class CustomVideoManager {
    private IRtcEngine customEngine;
    
    void Start() {
        customEngine = CustomVideoSDK.GetEngine(appId, serverUrl);
        customEngine.OnJoinChannelSuccess = OnJoinChannelSuccess;
        customEngine.EnableVideo();
        customEngine.JoinChannelByKey("", channelName, 0);
    }
}
```

### React Native Integration
```javascript
import { CustomVideoSDK } from './CustomVideoSDK';

const VideoCall = () => {
    const [engine, setEngine] = useState(null);
    
    useEffect(() => {
        const sdk = CustomVideoSDK.GetEngine(appId, serverUrl);
        sdk.OnJoinChannelSuccess = handleJoinSuccess;
        setEngine(sdk);
    }, []);
};
```

## 🚀 Performance Optimizations

### Low Bandwidth Mode
- Automatic quality reduction
- Frame rate adaptation
- Resolution scaling
- Audio bitrate optimization

### Gaming-Specific Features
- Voice activity detection
- Echo cancellation
- Noise suppression
- Low-latency mode

## 📈 Monitoring & Analytics

The SDK provides built-in monitoring:
- Real-time connection stats
- Quality metrics
- User engagement tracking
- Network performance analysis

## 🔒 Security Features

- JWT token authentication
- CORS protection
- Rate limiting
- Secure WebSocket connections
- Input validation

## 💰 Cost Comparison

| Service | Cost | Control |
|---------|------|---------|
| Agora | ~$1-4/1000 min | Limited |
| Custom SDK | VPS cost only | Full |
| Hostinger VPS | ~$5-20/month | Complete |

## 🐛 Troubleshooting

### Common Issues
1. **Video not showing**: Check camera permissions
2. **Audio issues**: Verify microphone access
3. **Connection failed**: Check firewall settings
4. **High latency**: Review network optimization settings

### Nginx & SSL Issues
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check SSL certificate status
sudo certbot certificates

# Renew SSL certificate manually
sudo certbot renew

# Check if ports are open
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :5005

# Restart all services
sudo systemctl restart nginx
sudo systemctl restart pm2-root

# Check firewall settings
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5005/tcp
```

### Debug Mode
```javascript
sdk.SetLogFilter(LOG_FILTER.DEBUG | LOG_FILTER.INFO);
```

## 📚 API Reference

### Core Methods
- `CustomVideoSDK.GetEngine(appId, serverUrl)` - Initialize SDK
- `sdk.EnableVideo()` - Enable video
- `sdk.DisableVideo()` - Disable video
- `sdk.JoinChannelByKey(token, channel, uid)` - Join channel
- `sdk.LeaveChannel()` - Leave channel

### Callbacks
- `OnJoinChannelSuccess(channel, uid, elapsed)`
- `OnUserJoined(uid, elapsed)`
- `OnUserOffline(uid, reason)`
- `OnError(error, message)`
- `OnNetworkQuality(uid, quality)`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - Use freely in commercial projects

## 🆘 Support

### **GitHub Repository**
- **Source Code:** [https://github.com/StrixSid07/CustomVideoSDK](https://github.com/StrixSid07/CustomVideoSDK)
- **Issues & Bug Reports:** [https://github.com/StrixSid07/CustomVideoSDK/issues](https://github.com/StrixSid07/CustomVideoSDK/issues)
- **Contributions:** [https://github.com/StrixSid07/CustomVideoSDK/pulls](https://github.com/StrixSid07/CustomVideoSDK/pulls)
- **Releases:** [https://github.com/StrixSid07/CustomVideoSDK/releases](https://github.com/StrixSid07/CustomVideoSDK/releases)

### **Documentation Links**

## 📋 **Quick Command Reference**

### **Complete Nginx + SSL Setup (Copy & Paste)**
```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/videosdk
# (Copy the Nginx config from Step 3 above)

# Enable site
sudo ln -s /etc/nginx/sites-available/videosdk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install Certbot & Get SSL
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get certificate for videosdk.genisisserver.space
sudo certbot --nginx -d videosdk.genisisserver.space -d www.videosdk.genisisserver.space --email support@genisisserver.space --agree-tos --no-eff-email

# Restart services
sudo systemctl restart nginx
sudo systemctl restart pm2-root
```

### **Service Management Commands**
```bash
# PM2 Commands
pm2 status                    # Check app status
pm2 logs video-sdk           # View logs
pm2 restart video-sdk        # Restart app
pm2 reload video-sdk         # Zero-downtime reload
pm2 monit                    # Monitor resources

# Nginx Commands
sudo systemctl status nginx   # Check Nginx status
sudo nginx -t                # Test config
sudo systemctl reload nginx  # Reload config

# SSL Certificate Management
sudo certbot certificates     # Check certificates
sudo certbot renew          # Renew certificates
sudo certbot renew --dry-run # Test renewal

# Firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5005/tcp
```

### **Health Check URLs**
```bash
# Test these URLs after deployment:
https://videosdk.genisisserver.space/health
https://videosdk.genisisserver.space/api/info
https://videosdk.genisisserver.space/host.html
https://videosdk.genisisserver.space/client.html
https://videosdk.genisisserver.space/debug.html
```

---

**Built for developers who need full control over their video calling infrastructure** 🎮📹 
