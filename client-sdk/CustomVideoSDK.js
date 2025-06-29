const io = require('socket.io-client');

class CustomVideoSDK {
    constructor() {
        this.socket = null;
        this.serverUrl = null;
        this.appId = null;
        this.userId = null;
        this.roomId = null;
        this.localStream = null;
        this.remoteStreams = new Map();
        this.peerConnections = new Map();
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
        this.networkStats = null;

        // Event callbacks (similar to Agora's callbacks)
        this.OnJoinChannelSuccess = null;
        this.OnUserJoined = null;
        this.OnUserOffline = null;
        this.OnError = null;
        this.OnWarning = null;
        this.OnNetworkQuality = null;

        // WebRTC configuration
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.setupNetworkMonitoring();
    }

    // Initialize the engine (similar to Agora's GetEngine)
    static GetEngine(appId, serverUrl = 'http://localhost:5005') {
        const instance = new CustomVideoSDK();
        instance.loadEngine(appId, serverUrl);
        return instance;
    }

    // Load engine (similar to Agora's loadEngine)
    loadEngine(appId, serverUrl = 'http://localhost:5005') {
        this.appId = appId;
        this.serverUrl = serverUrl;
        
        // Connect to signaling server
        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            timeout: 5000
        });

        this.setupSocketEvents();
        console.log('Custom Video SDK Engine loaded with AppID:', appId);
    }

    // Get SDK version (similar to Agora's GetSdkVersion)
    static GetSdkVersion() {
        return "1.0.0";
    }

    getSdkVersion() {
        return CustomVideoSDK.GetSdkVersion();
    }

    // Enable video (similar to Agora's EnableVideo)
    EnableVideo() {
        this.isVideoEnabled = true;
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = true;
            }
        }
        this.notifyMediaChange('video', true);
        console.log('Video enabled');
    }

    // Disable video (similar to Agora's DisableVideo) 
    DisableVideo() {
        this.isVideoEnabled = false;
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = false;
            }
        }
        this.notifyMediaChange('video', false);
        console.log('Video disabled');
    }

    // Enable video observer (for video frame callback)
    EnableVideoObserver() {
        console.log('Video observer enabled');
        // In a real implementation, you'd set up video frame callbacks here
    }

    // Disable video observer
    DisableVideoObserver() {
        console.log('Video observer disabled');
    }

    // Join channel (similar to Agora's JoinChannelByKey)
    async JoinChannelByKey(channelKey = '', channelName, uid = 0) {
        return this.JoinChannel(channelName, uid, channelKey);
    }

    // Join channel (similar to Agora's JoinChannel)
    async JoinChannel(channelName, uid = 0, token = '') {
        try {
            this.roomId = channelName;
            this.userId = uid || this.generateUserId();

            // Get user media first
            await this.getUserMedia();

            // Join room via socket
            this.socket.emit('join-room', {
                roomId: this.roomId,
                userId: this.userId,
                userName: `User_${this.userId}`
            });

            console.log(`Joining channel: ${channelName} with UID: ${this.userId}`);
        } catch (error) {
            console.error('Failed to join channel:', error);
            if (this.OnError) {
                this.OnError(-1, error.message);
            }
        }
    }

    // Leave channel (similar to Agora's LeaveChannel)
    LeaveChannel() {
        try {
            // Close all peer connections
            this.peerConnections.forEach((pc, userId) => {
                pc.close();
            });
            this.peerConnections.clear();
            this.remoteStreams.clear();

            // Stop local stream
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }

            // Leave room via socket
            if (this.socket) {
                this.socket.emit('leave-room');
            }

            this.roomId = null;
            this.userId = null;

            console.log('Left channel successfully');
        } catch (error) {
            console.error('Error leaving channel:', error);
        }
    }

    // Destroy engine (similar to Agora's Destroy)
    static Destroy() {
        // In a real implementation, you'd clean up global resources
        console.log('Engine destroyed');
    }

    // Set log filter (similar to Agora's SetLogFilter)
    SetLogFilter(filter) {
        console.log('Log filter set:', filter);
        // In a real implementation, you'd configure logging levels
    }

    // Enable/disable audio
    enableAudio(enabled) {
        this.isAudioEnabled = enabled;
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = enabled;
            }
        }
        this.notifyMediaChange('audio', enabled);
    }

    // Start screen sharing
    async startScreenShare() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' },
                audio: false
            });

            // Replace video track in all peer connections
            const videoTrack = screenStream.getVideoTracks()[0];
            this.peerConnections.forEach(async (pc, userId) => {
                const sender = pc.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                if (sender) {
                    await sender.replaceTrack(videoTrack);
                }
            });

            this.socket.emit('start-screen-share');
            console.log('Screen sharing started');
        } catch (error) {
            console.error('Failed to start screen sharing:', error);
        }
    }

    // Stop screen sharing
    async stopScreenShare() {
        try {
            // Get camera stream back
            const cameraStream = await navigator.mediaDevices.getUserMedia({
                video: this.isVideoEnabled,
                audio: false
            });

            const videoTrack = cameraStream.getVideoTracks()[0];
            this.peerConnections.forEach(async (pc, userId) => {
                const sender = pc.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                if (sender) {
                    await sender.replaceTrack(videoTrack);
                }
            });

            this.socket.emit('stop-screen-share');
            console.log('Screen sharing stopped');
        } catch (error) {
            console.error('Failed to stop screen sharing:', error);
        }
    }

    // Get user media
    async getUserMedia(constraints = null) {
        try {
            const defaultConstraints = {
                video: {
                    width: { ideal: 854, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 24, max: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(
                constraints || defaultConstraints
            );

            // Apply current media state
            const videoTrack = this.localStream.getVideoTracks()[0];
            const audioTrack = this.localStream.getAudioTracks()[0];
            
            if (videoTrack) videoTrack.enabled = this.isVideoEnabled;
            if (audioTrack) audioTrack.enabled = this.isAudioEnabled;

            return this.localStream;
        } catch (error) {
            console.error('Failed to get user media:', error);
            throw error;
        }
    }

    // Setup socket event handlers
    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
        });

        this.socket.on('joined-room', (data) => {
            console.log('Successfully joined room:', data);
            if (this.OnJoinChannelSuccess) {
                this.OnJoinChannelSuccess(data.roomId, data.userId, 0);
            }
        });

        this.socket.on('user-joined', (data) => {
            console.log('User joined:', data);
            this.handleUserJoined(data.userId);
            if (this.OnUserJoined) {
                this.OnUserJoined(data.userId, 0);
            }
        });

        this.socket.on('user-left', (data) => {
            console.log('User left:', data);
            this.handleUserLeft(data.userId);
            if (this.OnUserOffline) {
                this.OnUserOffline(data.userId, 0);
            }
        });

        // WebRTC signaling
        this.socket.on('offer', async (data) => {
            await this.handleOffer(data);
        });

        this.socket.on('answer', async (data) => {
            await this.handleAnswer(data);
        });

        this.socket.on('ice-candidate', async (data) => {
            await this.handleIceCandidate(data);
        });

        this.socket.on('network-optimization', (data) => {
            console.log('Network optimization received:', data);
            this.applyNetworkOptimization(data);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            if (this.OnError) {
                this.OnError(-1, error.message);
            }
        });
    }

    // Handle user joined
    async handleUserJoined(userId) {
        const peerConnection = new RTCPeerConnection(this.rtcConfig);
        this.peerConnections.set(userId, peerConnection);

        // Add local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            const remoteStream = event.streams[0];
            this.remoteStreams.set(userId, remoteStream);
            console.log('Received remote stream from user:', userId);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    target: userId,
                    candidate: event.candidate
                });
            }
        };

        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        this.socket.emit('offer', {
            target: userId,
            offer: offer
        });
    }

    // Handle WebRTC offer
    async handleOffer(data) {
        const peerConnection = this.peerConnections.get(data.sender) || 
                              new RTCPeerConnection(this.rtcConfig);
        
        if (!this.peerConnections.has(data.sender)) {
            this.peerConnections.set(data.sender, peerConnection);
            
            // Add local stream
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, this.localStream);
                });
            }

            // Handle remote stream
            peerConnection.ontrack = (event) => {
                const remoteStream = event.streams[0];
                this.remoteStreams.set(data.sender, remoteStream);
            };

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('ice-candidate', {
                        target: data.sender,
                        candidate: event.candidate
                    });
                }
            };
        }

        await peerConnection.setRemoteDescription(data.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        this.socket.emit('answer', {
            target: data.sender,
            answer: answer
        });
    }

    // Handle WebRTC answer
    async handleAnswer(data) {
        const peerConnection = this.peerConnections.get(data.sender);
        if (peerConnection) {
            await peerConnection.setRemoteDescription(data.answer);
        }
    }

    // Handle ICE candidate
    async handleIceCandidate(data) {
        const peerConnection = this.peerConnections.get(data.sender);
        if (peerConnection) {
            await peerConnection.addIceCandidate(data.candidate);
        }
    }

    // Handle user left
    handleUserLeft(userId) {
        const peerConnection = this.peerConnections.get(userId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(userId);
        }
        this.remoteStreams.delete(userId);
    }

    // Network monitoring and optimization
    setupNetworkMonitoring() {
        setInterval(() => {
            this.gatherNetworkStats();
        }, 5000); // Check every 5 seconds
    }

    async gatherNetworkStats() {
        if (this.peerConnections.size === 0) return;

        const stats = {
            rtt: 0,
            packetLoss: 0,
            bandwidth: 0,
            jitter: 0,
            connectionType: this.getConnectionType()
        };

        // Gather stats from first peer connection
        const firstPc = this.peerConnections.values().next().value;
        if (firstPc) {
            const rtcStats = await firstPc.getStats();
            rtcStats.forEach(report => {
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    stats.rtt = report.currentRoundTripTime * 1000 || 0;
                } else if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
                    stats.packetLoss = report.packetsLost / (report.packetsReceived + report.packetsLost) || 0;
                    stats.jitter = report.jitter || 0;
                }
            });
        }

        this.networkStats = stats;
        
        // Send to server for optimization
        if (this.socket) {
            this.socket.emit('network-stats', stats);
        }

        // Call quality callback
        if (this.OnNetworkQuality) {
            this.OnNetworkQuality(this.userId, this.calculateNetworkQuality(stats));
        }
    }

    getConnectionType() {
        if (navigator.connection) {
            return navigator.connection.effectiveType || 'unknown';
        }
        return 'unknown';
    }

    calculateNetworkQuality(stats) {
        const { rtt, packetLoss } = stats;
        
        if (rtt < 100 && packetLoss < 0.01) return 6; // Excellent
        if (rtt < 200 && packetLoss < 0.02) return 5; // Good
        if (rtt < 300 && packetLoss < 0.05) return 4; // Fair
        if (rtt < 500 && packetLoss < 0.10) return 3; // Poor
        return 1; // Very Poor
    }

    applyNetworkOptimization(optimization) {
        // Apply recommended settings
        if (optimization.recommendations) {
            optimization.recommendations.forEach(rec => {
                console.log(`Network recommendation: ${rec.message}`);
                // Apply specific optimizations based on recommendations
            });
        }
    }

    notifyMediaChange(mediaType, enabled) {
        if (this.socket) {
            this.socket.emit(`toggle-${mediaType}`, { enabled });
        }
    }

    generateUserId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    // Get local video stream for UI binding
    getLocalVideoStream() {
        return this.localStream;
    }

    // Get remote video stream for specific user
    getRemoteVideoStream(userId) {
        return this.remoteStreams.get(userId);
    }

    // Get all remote streams
    getAllRemoteStreams() {
        return Array.from(this.remoteStreams.entries()).map(([userId, stream]) => ({
            userId,
            stream
        }));
    }
}

// Constants similar to Agora's enums
const LOG_FILTER = {
    DEBUG: 0x0800,
    INFO: 0x0001,
    WARNING: 0x0002,
    ERROR: 0x0004,
    CRITICAL: 0x0008
};

const USER_OFFLINE_REASON = {
    QUIT: 0,
    DROPPED: 1,
    BECOME_AUDIENCE: 2
};

module.exports = {
    CustomVideoSDK,
    LOG_FILTER,
    USER_OFFLINE_REASON
}; 