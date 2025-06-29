# Custom Video SDK for Gaming

A powerful, self-hosted video calling SDK built with Node.js and WebRTC that replicates Agora's functionality. Perfect for mobile gaming applications requiring real-time video communication.

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

## 🛠️ Installation

1. **Clone and Install Dependencies**
```bash
cd CustomVideoSDK
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
# Clone your code to VPS
git clone your-repo-url /var/www/video-sdk
cd /var/www/video-sdk

# Install dependencies
npm install --production

# Start with PM2
pm2 start server/index.js --name "video-sdk"
pm2 startup
pm2 save
```
### Step 3: Configure Nginx (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

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

- GitHub Issues: Report bugs and feature requests
- Documentation: Comprehensive API docs
- Examples: Multiple integration examples
- Community: Discord/Slack support channel

---

**Built for developers who need full control over their video calling infrastructure** 🎮📹 
