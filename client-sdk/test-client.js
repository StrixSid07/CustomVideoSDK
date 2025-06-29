const { CustomVideoSDK, LOG_FILTER } = require('./CustomVideoSDK');

class TestClient {
    constructor() {
        this.sdk = null;
        this.appId = "your_app_id_here"; // Replace with your app ID
        this.channelName = "test_channel";
        this.userId = null;
    }

    // Initialize the SDK (similar to Unity's loadEngine)
    initializeEngine() {
        console.log("🚀 Initializing Custom Video SDK Engine...");
        
        // Get engine instance (similar to Agora's IRtcEngine.GetEngine)
        this.sdk = CustomVideoSDK.GetEngine(this.appId, 'http://localhost:5005');
        
        // Enable logging (similar to Agora's SetLogFilter)
        this.sdk.SetLogFilter(LOG_FILTER.DEBUG | LOG_FILTER.INFO | LOG_FILTER.WARNING | LOG_FILTER.ERROR);
        
        // Set up callbacks (similar to Unity example)
        this.setupCallbacks();
        
        console.log("✅ Engine initialized successfully");
        console.log("📱 SDK Version:", this.sdk.getSdkVersion());
    }

    // Setup callbacks (similar to Unity's callback setup)
    setupCallbacks() {
        // On join channel success (similar to onJoinChannelSuccess)
        this.sdk.OnJoinChannelSuccess = (channelName, uid, elapsed) => {
            console.log(`🎉 Join Channel Success - Channel: ${channelName}, UID: ${uid}, Elapsed: ${elapsed}ms`);
            this.userId = uid;
        };

        // On user joined (similar to onUserJoined)
        this.sdk.OnUserJoined = (uid, elapsed) => {
            console.log(`👤 User Joined - UID: ${uid}, Elapsed: ${elapsed}ms`);
            // In a real app, you'd create a video surface for this user
            this.createVideoSurfaceForUser(uid);
        };

        // On user offline (similar to onUserOffline)
        this.sdk.OnUserOffline = (uid, reason) => {
            console.log(`👋 User Left - UID: ${uid}, Reason: ${reason}`);
            // Clean up video surface for this user
            this.removeVideoSurfaceForUser(uid);
        };

        // On error (similar to HandleError)
        this.sdk.OnError = (error, message) => {
            console.error(`❌ SDK Error - Code: ${error}, Message: ${message}`);
        };

        // On warning
        this.sdk.OnWarning = (warn, message) => {
            console.warn(`⚠️ SDK Warning - Code: ${warn}, Message: ${message}`);
        };

        // Network quality callback
        this.sdk.OnNetworkQuality = (uid, quality) => {
            console.log(`📶 Network Quality - UID: ${uid}, Quality: ${this.getQualityText(quality)}`);
        };
    }

    // Join channel (similar to Unity's join method)
    async joinChannel() {
        try {
            console.log(`🔗 Joining channel: ${this.channelName}...`);
            
            // Enable video (similar to Unity's mRtcEngine.EnableVideo())
            this.sdk.EnableVideo();
            
            // Enable video observer (similar to Unity's mRtcEngine.EnableVideoObserver())
            this.sdk.EnableVideoObserver();
            
            // Join channel by key (similar to Unity's mRtcEngine.JoinChannelByKey())
            await this.sdk.JoinChannelByKey("", this.channelName, 0);
            
        } catch (error) {
            console.error("Failed to join channel:", error);
        }
    }

    // Leave channel (similar to Unity's leave method)
    leaveChannel() {
        console.log("🚪 Leaving channel...");
        
        if (this.sdk) {
            // Leave channel (similar to Unity's mRtcEngine.LeaveChannel())
            this.sdk.LeaveChannel();
            
            // Disable video observer (similar to Unity's mRtcEngine.DisableVideoObserver())
            this.sdk.DisableVideoObserver();
        }
        
        console.log("✅ Left channel successfully");
    }

    // Destroy engine (similar to Unity's unloadEngine)
    destroyEngine() {
        console.log("🔥 Destroying engine...");
        
        if (this.sdk) {
            // Destroy engine (similar to Unity's IRtcEngine.Destroy())
            CustomVideoSDK.Destroy();
            this.sdk = null;
        }
        
        console.log("✅ Engine destroyed");
    }

    // Create video surface for user (similar to Unity's makeImageSurface)
    createVideoSurfaceForUser(uid) {
        console.log(`🖼️ Creating video surface for user: ${uid}`);
        
        // Get remote stream
        const remoteStream = this.sdk.getRemoteVideoStream(uid);
        if (remoteStream) {
            console.log(`📹 Remote video stream available for user: ${uid}`);
            // In a real web app, you'd attach this stream to a video element
            // Example: document.getElementById(`video-${uid}`).srcObject = remoteStream;
        }
    }

    // Remove video surface for user
    removeVideoSurfaceForUser(uid) {
        console.log(`🗑️ Removing video surface for user: ${uid}`);
        // In a real web app, you'd clean up the video element
    }

    // Toggle video (similar to Unity's EnableVideo)
    toggleVideo() {
        if (this.sdk.isVideoEnabled) {
            this.sdk.DisableVideo();
            console.log("📹 Video disabled");
        } else {
            this.sdk.EnableVideo();
            console.log("📹 Video enabled");
        }
    }

    // Toggle audio
    toggleAudio() {
        this.sdk.enableAudio(!this.sdk.isAudioEnabled);
        console.log(`🎤 Audio ${this.sdk.isAudioEnabled ? 'enabled' : 'disabled'}`);
    }

    // Start screen sharing
    async startScreenShare() {
        try {
            await this.sdk.startScreenShare();
            console.log("🖥️ Screen sharing started");
        } catch (error) {
            console.error("Failed to start screen sharing:", error);
        }
    }

    // Stop screen sharing
    async stopScreenShare() {
        try {
            await this.sdk.stopScreenShare();
            console.log("🖥️ Screen sharing stopped");
        } catch (error) {
            console.error("Failed to stop screen sharing:", error);
        }
    }

    // Get quality text
    getQualityText(quality) {
        const qualityMap = {
            1: "Very Poor",
            2: "Poor", 
            3: "Fair",
            4: "Good",
            5: "Very Good",
            6: "Excellent"
        };
        return qualityMap[quality] || "Unknown";
    }

    // Demo flow (similar to Unity's game flow)
    async runDemo() {
        console.log("🎮 Starting Custom Video SDK Demo...");
        console.log("=====================================");
        
        try {
            // Step 1: Initialize engine
            this.initializeEngine();
            
            // Wait a bit for connection
            await this.sleep(2000);
            
            // Step 2: Join channel
            await this.joinChannel();
            
            // Wait in channel for demo
            console.log("⏳ Staying in channel for 30 seconds...");
            console.log("💡 You can start another instance to test multi-user");
            
            // Demo some features
            setTimeout(() => this.toggleVideo(), 5000);
            setTimeout(() => this.toggleVideo(), 10000);
            setTimeout(() => this.toggleAudio(), 15000);
            setTimeout(() => this.toggleAudio(), 20000);
            
            await this.sleep(30000);
            
            // Step 3: Leave channel
            this.leaveChannel();
            
            // Step 4: Destroy engine
            this.destroyEngine();
            
            console.log("✅ Demo completed successfully!");
            
        } catch (error) {
            console.error("❌ Demo failed:", error);
        }
    }

    // Utility function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the demo if this file is executed directly
if (require.main === module) {
    const client = new TestClient();
    client.runDemo().then(() => {
        console.log("🏁 Demo finished");
        process.exit(0);
    }).catch(error => {
        console.error("💥 Demo crashed:", error);
        process.exit(1);
    });
}

module.exports = TestClient; 