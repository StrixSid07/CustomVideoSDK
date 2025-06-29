class NetworkOptimizer {
    constructor() {
        this.qualityProfiles = {
            high: {
                video: { width: 1280, height: 720, frameRate: 30, bitrate: 1500 },
                audio: { bitrate: 128, sampleRate: 48000 }
            },
            medium: {
                video: { width: 854, height: 480, frameRate: 24, bitrate: 800 },
                audio: { bitrate: 64, sampleRate: 44100 }
            },
            low: {
                video: { width: 640, height: 360, frameRate: 15, bitrate: 400 },
                audio: { bitrate: 32, sampleRate: 22050 }
            },
            minimal: {
                video: { width: 320, height: 240, frameRate: 10, bitrate: 150 },
                audio: { bitrate: 16, sampleRate: 16000 }
            }
        };

        this.adaptiveSettings = {
            packetLossThreshold: 0.05, // 5%
            rttThreshold: 300, // 300ms
            bandwidthThreshold: 500 // 500 kbps
        };
    }

    optimizeForConnection(networkStats) {
        const {
            rtt = 0,
            packetLoss = 0,
            bandwidth = 1000,
            jitter = 0,
            connectionType = 'unknown'
        } = networkStats;

        let recommendedProfile = 'high';
        let optimizations = [];

        // Analyze network conditions
        if (packetLoss > this.adaptiveSettings.packetLossThreshold) {
            recommendedProfile = 'low';
            optimizations.push('high-packet-loss-detected');
        }

        if (rtt > this.adaptiveSettings.rttThreshold) {
            recommendedProfile = 'medium';
            optimizations.push('high-latency-detected');
        }

        if (bandwidth < this.adaptiveSettings.bandwidthThreshold) {
            recommendedProfile = 'minimal';
            optimizations.push('low-bandwidth-detected');
        }

        // Mobile connection optimizations
        if (connectionType === 'cellular' || connectionType === '3g' || connectionType === '4g') {
            recommendedProfile = 'low';
            optimizations.push('mobile-connection-optimization');
        }

        const profile = this.qualityProfiles[recommendedProfile];

        return {
            profile: recommendedProfile,
            settings: profile,
            optimizations,
            recommendations: this.generateRecommendations(networkStats),
            adaptiveFeatures: {
                enableFEC: packetLoss > 0.02, // Forward Error Correction
                enableNACK: rtt < 200, // Negative Acknowledgment
                enablePLI: true, // Picture Loss Indication
                enableRTX: true, // Retransmission
                dynamicBitrate: true,
                autoFrameRate: bandwidth < 1000
            }
        };
    }

    generateRecommendations(networkStats) {
        const recommendations = [];
        const { rtt, packetLoss, bandwidth, jitter } = networkStats;

        if (rtt > 200) {
            recommendations.push({
                type: 'latency',
                message: 'High latency detected. Consider enabling low-latency mode.',
                action: 'enable-low-latency'
            });
        }

        if (packetLoss > 0.03) {
            recommendations.push({
                type: 'packet-loss',
                message: 'Packet loss detected. Enabling error correction.',
                action: 'enable-fec'
            });
        }

        if (bandwidth < 500) {
            recommendations.push({
                type: 'bandwidth',
                message: 'Low bandwidth detected. Reducing video quality.',
                action: 'reduce-quality'
            });
        }

        if (jitter > 50) {
            recommendations.push({
                type: 'jitter',
                message: 'High jitter detected. Enabling adaptive buffering.',
                action: 'enable-buffering'
            });
        }

        return recommendations;
    }

    // Get WebRTC configuration optimized for network conditions
    getWebRTCConfig(networkCondition = 'good') {
        const baseConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
        };

        switch (networkCondition) {
            case 'poor':
                return {
                    ...baseConfig,
                    iceTransportPolicy: 'relay', // Force TURN servers
                    iceCandidatePoolSize: 0,
                    bundlePolicy: 'max-bundle'
                };
            case 'mobile':
                return {
                    ...baseConfig,
                    iceCandidatePoolSize: 5,
                    bundlePolicy: 'max-bundle',
                    rtcpMuxPolicy: 'require'
                };
            default:
                return baseConfig;
        }
    }

    // Adaptive bitrate control
    calculateAdaptiveBitrate(currentBitrate, networkStats) {
        const { packetLoss, rtt, bandwidth } = networkStats;
        let newBitrate = currentBitrate;

        // Reduce bitrate on packet loss
        if (packetLoss > 0.02) {
            newBitrate *= 0.8;
        }

        // Reduce bitrate on high RTT
        if (rtt > 200) {
            newBitrate *= 0.9;
        }

        // Adjust based on available bandwidth
        const maxBitrate = bandwidth * 0.8; // Use 80% of available bandwidth
        newBitrate = Math.min(newBitrate, maxBitrate);

        // Don't go below minimum bitrate
        const minBitrate = 50; // 50 kbps minimum
        newBitrate = Math.max(newBitrate, minBitrate);

        return Math.round(newBitrate);
    }

    // Generate codec preferences for different network conditions
    getCodecPreferences(networkCondition) {
        const codecs = {
            good: [
                'video/VP9',
                'video/VP8',
                'video/H264'
            ],
            average: [
                'video/VP8',
                'video/H264'
            ],
            poor: [
                'video/VP8' // VP8 is more resilient to packet loss
            ]
        };

        return codecs[networkCondition] || codecs.average;
    }
}

module.exports = NetworkOptimizer; 