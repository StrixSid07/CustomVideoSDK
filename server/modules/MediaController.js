const fs = require('fs');
const path = require('path');

class MediaController {
    constructor() {
        this.recordings = new Map();
        this.streamQuality = new Map();
        this.recordingsPath = path.join(__dirname, '../../recordings');
        
        // Ensure recordings directory exists
        if (!fs.existsSync(this.recordingsPath)) {
            fs.mkdirSync(this.recordingsPath, { recursive: true });
        }
    }

    // Start recording a room
    startRecording(roomId, options = {}) {
        if (this.recordings.has(roomId)) {
            throw new Error('Recording already in progress for this room');
        }

        const recordingId = `rec_${roomId}_${Date.now()}`;
        const recording = {
            id: recordingId,
            roomId,
            startTime: Date.now(),
            options: {
                includeAudio: options.includeAudio !== false,
                includeVideo: options.includeVideo !== false,
                quality: options.quality || 'medium',
                format: options.format || 'webm'
            },
            participants: new Set(),
            chunks: []
        };

        this.recordings.set(roomId, recording);
        console.log(`Recording started for room ${roomId}: ${recordingId}`);
        
        return recordingId;
    }

    // Stop recording
    stopRecording(roomId) {
        const recording = this.recordings.get(roomId);
        if (!recording) {
            throw new Error('No active recording found for this room');
        }

        recording.endTime = Date.now();
        recording.duration = recording.endTime - recording.startTime;

        // Save recording metadata
        const metadataPath = path.join(this.recordingsPath, `${recording.id}_metadata.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(recording, null, 2));

        this.recordings.delete(roomId);
        console.log(`Recording stopped for room ${roomId}: ${recording.id}`);
        
        return recording;
    }

    // Get recording status
    getRecordingStatus(roomId) {
        const recording = this.recordings.get(roomId);
        if (!recording) {
            return { isRecording: false };
        }

        return {
            isRecording: true,
            recordingId: recording.id,
            startTime: recording.startTime,
            duration: Date.now() - recording.startTime,
            participants: Array.from(recording.participants),
            options: recording.options
        };
    }

    // Stream quality management
    updateStreamQuality(userId, qualityData) {
        this.streamQuality.set(userId, {
            ...qualityData,
            timestamp: Date.now()
        });
    }

    getStreamQuality(userId) {
        return this.streamQuality.get(userId);
    }

    // Get media constraints based on quality profile
    getMediaConstraints(profile = 'medium', networkCondition = 'good') {
        const profiles = {
            high: {
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 60 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000
                }
            },
            medium: {
                video: {
                    width: { ideal: 854, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 24, max: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                }
            },
            low: {
                video: {
                    width: { ideal: 640, max: 854 },
                    height: { ideal: 360, max: 480 },
                    frameRate: { ideal: 15, max: 24 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 22050
                }
            },
            minimal: {
                video: {
                    width: { ideal: 320, max: 640 },
                    height: { ideal: 240, max: 360 },
                    frameRate: { ideal: 10, max: 15 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false,
                    sampleRate: 16000
                }
            }
        };

        let constraints = profiles[profile] || profiles.medium;

        // Adjust for network conditions
        if (networkCondition === 'poor') {
            constraints.video.frameRate.ideal = Math.min(constraints.video.frameRate.ideal, 15);
            constraints.video.width.ideal = Math.min(constraints.video.width.ideal, 640);
            constraints.video.height.ideal = Math.min(constraints.video.height.ideal, 360);
        }

        return constraints;
    }

    // Screen sharing constraints
    getScreenShareConstraints() {
        return {
            video: {
                mediaSource: 'screen',
                width: { max: 1920 },
                height: { max: 1080 },
                frameRate: { max: 15 } // Lower frame rate for screen sharing
            },
            audio: false // Usually don't capture system audio
        };
    }

    // Adaptive streaming parameters
    getStreamingParameters(networkStats, profile = 'medium') {
        const { bandwidth, packetLoss, rtt } = networkStats;
        
        const baseParams = {
            encodings: [
                {
                    rid: 'high',
                    maxBitrate: 1500000,
                    scaleResolutionDownBy: 1
                },
                {
                    rid: 'medium',
                    maxBitrate: 800000,
                    scaleResolutionDownBy: 2
                },
                {
                    rid: 'low',
                    maxBitrate: 400000,
                    scaleResolutionDownBy: 4
                }
            ]
        };

        // Adjust based on network conditions
        if (bandwidth < 1000) {
            baseParams.encodings = baseParams.encodings.filter(enc => 
                enc.rid !== 'high'
            );
        }

        if (packetLoss > 0.03) {
            baseParams.encodings.forEach(enc => {
                enc.maxBitrate *= 0.8; // Reduce bitrate by 20%
            });
        }

        if (rtt > 200) {
            baseParams.degradationPreference = 'maintain-framerate';
        }

        return baseParams;
    }

    // Cleanup old recordings
    cleanupOldRecordings(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
        const now = Date.now();
        const files = fs.readdirSync(this.recordingsPath);
        
        files.forEach(file => {
            if (file.endsWith('_metadata.json')) {
                const filePath = path.join(this.recordingsPath, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    try {
                        const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        // Delete associated recording files
                        const recordingFiles = files.filter(f => 
                            f.startsWith(metadata.id) && f !== file
                        );
                        
                        recordingFiles.forEach(rf => {
                            fs.unlinkSync(path.join(this.recordingsPath, rf));
                        });
                        
                        fs.unlinkSync(filePath);
                        console.log(`Cleaned up old recording: ${metadata.id}`);
                    } catch (error) {
                        console.error(`Error cleaning up recording ${file}:`, error);
                    }
                }
            }
        });
    }
}

module.exports = MediaController; 