const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');

// Import our custom modules
const RoomManager = require('./modules/RoomManager');
const NetworkOptimizer = require('./modules/NetworkOptimizer');
const MediaController = require('./modules/MediaController');

class CustomVideoSDKServer {
    constructor(port = 5005) {
        this.port = port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            },
            pingTimeout: 60000,
            pingInterval: 25000
        });

        this.roomManager = new RoomManager();
        this.networkOptimizer = new NetworkOptimizer();
        this.mediaController = new MediaController();

        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
    }

    setupMiddleware() {
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrcAttr: ["'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "ws:", "wss:"],
                    fontSrc: ["'self'", "https:", "data:"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'self'"],
                },
            },
        }));
        this.app.use(compression());
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                rooms: this.roomManager.getRoomsCount(),
                connections: this.io.engine.clientsCount
            });
        });

        // Get server info (similar to Agora's getSdkVersion)
        this.app.get('/api/info', (req, res) => {
            res.json({
                version: '1.0.0',
                features: ['video', 'audio', 'screen-share', 'recording'],
                maxParticipants: 50,
                supportedCodecs: ['VP8', 'VP9', 'H264', 'AV1']
            });
        });

        // Create room endpoint
        this.app.post('/api/rooms', (req, res) => {
            const { roomName, maxParticipants = 10 } = req.body;
            const roomId = this.roomManager.createRoom(roomName, maxParticipants);
            res.json({ roomId, roomName, maxParticipants });
        });

        // Unity documentation page
        this.app.get('/unity-docs', (req, res) => {
            res.sendFile('unity-docs.html', { root: 'public' });
        });

        // Alternative route for docs
        this.app.get('/docs', (req, res) => {
            res.sendFile('unity-docs.html', { root: 'public' });
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);
            
            // Join room (similar to Agora's joinChannel)
            socket.on('join-room', async (data) => {
                try {
                    const { roomId, userId, userName, role = 'viewer' } = data;
                    const user = {
                        id: userId || uuidv4(),
                        socketId: socket.id,
                        name: userName || 'Anonymous',
                        role: role, // 'host' or 'viewer'
                        joinedAt: Date.now()
                    };

                    // Join the room
                    const room = this.roomManager.joinRoom(roomId, user);
                    socket.join(roomId);
                    socket.userId = user.id;
                    socket.roomId = roomId;
                    socket.userRole = role;

                    if (role === 'host') {
                        // Host joined - notify all viewers
                        socket.to(roomId).emit('host-joined', {
                            userId: user.id,
                            userName: user.name,
                            timestamp: user.joinedAt
                        });
                        console.log(`🎮 Host ${user.name} started streaming in room ${roomId}`);
                    } else {
                        // Viewer joined - notify host and other viewers
                        socket.to(roomId).emit('viewer-joined', {
                            userId: user.id,
                            userName: user.name,
                            timestamp: user.joinedAt
                        });
                        console.log(`👤 Viewer ${user.name} joined stream ${roomId}`);
                    }

                    // Send room info to new user
                    socket.emit('joined-room', {
                        roomId,
                        userId: user.id,
                        role: role,
                        participants: room.participants,
                        roomInfo: room.info
                    });

                } catch (error) {
                    socket.emit('error', { type: 'join-failed', message: error.message });
                }
            });

            // Viewer requests stream from host
            socket.on('viewer-request-stream', (data) => {
                console.log(`📺 Viewer ${socket.id} requesting stream in room ${socket.roomId}`);
                // Find host in the room and forward request
                const roomSockets = this.io.sockets.adapter.rooms.get(socket.roomId);
                if (roomSockets) {
                    for (const socketId of roomSockets) {
                        const targetSocket = this.io.sockets.sockets.get(socketId);
                        if (targetSocket && targetSocket.userRole === 'host') {
                            console.log(`🎮 Forwarding stream request to host ${socketId}`);
                            targetSocket.emit('viewer-request-stream', {
                                viewerId: socket.id,
                                viewerName: socket.userName || 'Anonymous'
                            });
                            break;
                        }
                    }
                } else {
                    console.log(`❌ No room found for ${socket.roomId}`);
                }
            });

            // WebRTC Signaling
            socket.on('offer', (data) => {
                console.log(`📡 Offer from ${socket.userRole} (${socket.id}) to ${data.target}`);
                // Find the target socket and send directly
                const targetSocket = this.io.sockets.sockets.get(data.target);
                if (targetSocket) {
                    targetSocket.emit('offer', {
                        offer: data.offer,
                        sender: socket.userRole === 'host' ? 'host' : socket.id,
                        hostSocketId: socket.id
                    });
                    console.log(`✅ Offer sent to ${data.target}`);
                } else {
                    console.log(`❌ Target socket ${data.target} not found for offer`);
                }
            });

            socket.on('answer', (data) => {
                console.log(`📡 Answer from ${socket.userRole} (${socket.id}) to ${data.target}`);
                // Find the target socket and send directly
                const targetSocket = this.io.sockets.sockets.get(data.target);
                if (targetSocket) {
                    targetSocket.emit('answer', {
                        answer: data.answer,
                        sender: socket.id
                    });
                } else {
                    console.log(`❌ Target socket ${data.target} not found for answer`);
                }
            });

            socket.on('ice-candidate', (data) => {
                console.log(`🧊 ICE candidate from ${socket.userRole} (${socket.id}) to ${data.target}`);
                // Find the target socket and send directly
                const targetSocket = this.io.sockets.sockets.get(data.target);
                if (targetSocket) {
                    targetSocket.emit('ice-candidate', {
                        candidate: data.candidate,
                        sender: socket.userRole === 'host' ? 'host' : socket.id
                    });
                } else {
                    console.log(`❌ Target socket ${data.target} not found for ICE candidate`);
                }
            });

            // Media control events
            socket.on('toggle-video', (data) => {
                socket.to(socket.roomId).emit('user-video-toggle', {
                    userId: socket.userId,
                    enabled: data.enabled
                });
            });

            socket.on('toggle-audio', (data) => {
                socket.to(socket.roomId).emit('user-audio-toggle', {
                    userId: socket.userId,
                    enabled: data.enabled
                });
            });

            // Screen sharing
            socket.on('start-screen-share', () => {
                socket.to(socket.roomId).emit('user-screen-share-start', {
                    userId: socket.userId
                });
            });

            socket.on('stop-screen-share', () => {
                socket.to(socket.roomId).emit('user-screen-share-stop', {
                    userId: socket.userId
                });
            });

            // Network quality monitoring
            socket.on('network-stats', (data) => {
                const optimizedSettings = this.networkOptimizer.optimizeForConnection(data);
                socket.emit('network-optimization', optimizedSettings);
            });

            // Disconnect handling
            socket.on('disconnect', () => {
                if (socket.roomId && socket.userId) {
                    this.roomManager.leaveRoom(socket.roomId, socket.userId);
                    
                    if (socket.userRole === 'host') {
                        // Host disconnected - notify all viewers
                        socket.to(socket.roomId).emit('host-left', {
                            userId: socket.userId,
                            timestamp: Date.now()
                        });
                        console.log(`🎮 Host left room ${socket.roomId} - stream ended`);
                    } else {
                        // Viewer disconnected - notify host
                        socket.to(socket.roomId).emit('viewer-left', {
                            userId: socket.userId,
                            timestamp: Date.now()
                        });
                        console.log(`👤 Viewer left room ${socket.roomId}`);
                    }
                }
                console.log(`Client disconnected: ${socket.id}`);
            });

            // Leave room explicitly
            socket.on('leave-room', () => {
                if (socket.roomId && socket.userId) {
                    this.roomManager.leaveRoom(socket.roomId, socket.userId);
                    
                    if (socket.userRole === 'host') {
                        // Host leaving - notify all viewers
                        socket.to(socket.roomId).emit('host-left', {
                            userId: socket.userId,
                            timestamp: Date.now()
                        });
                        console.log(`🎮 Host explicitly left room ${socket.roomId}`);
                    } else {
                        // Viewer leaving - notify host
                        socket.to(socket.roomId).emit('viewer-left', {
                            userId: socket.userId,
                            timestamp: Date.now()
                        });
                        console.log(`👤 Viewer explicitly left room ${socket.roomId}`);
                    }
                    
                    socket.leave(socket.roomId);
                    socket.roomId = null;
                    socket.userId = null;
                    socket.userRole = null;
                }
            });
        });
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`🚀 Custom Video SDK Server running on port ${this.port}`);
            console.log(`📊 Health check: http://localhost:${this.port}/health`);
            console.log(`🔧 API Info: http://localhost:${this.port}/api/info`);
        });
    }
}

// Start the server
const port = process.env.PORT || 5005;
const server = new CustomVideoSDKServer(port);
server.start();

module.exports = CustomVideoSDKServer; 