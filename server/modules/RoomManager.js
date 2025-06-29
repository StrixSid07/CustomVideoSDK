const { v4: uuidv4 } = require('uuid');

class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    createRoom(roomName, maxParticipants = 10) {
        const roomId = uuidv4();
        const room = {
            id: roomId,
            name: roomName,
            maxParticipants,
            participants: new Map(),
            createdAt: Date.now(),
            info: {
                isRecording: false,
                screenShareActive: false,
                dominantSpeaker: null
            }
        };

        this.rooms.set(roomId, room);
        console.log(`Room created: ${roomId} (${roomName})`);
        return roomId;
    }

    joinRoom(roomId, user) {
        let room = this.rooms.get(roomId);
        
        // Create room if it doesn't exist
        if (!room) {
            room = {
                id: roomId,
                name: `Room-${roomId.slice(0, 8)}`,
                maxParticipants: 10,
                participants: new Map(),
                createdAt: Date.now(),
                info: {
                    isRecording: false,
                    screenShareActive: false,
                    dominantSpeaker: null
                }
            };
            this.rooms.set(roomId, room);
        }

        // Check room capacity
        if (room.participants.size >= room.maxParticipants) {
            throw new Error('Room is full');
        }

        // Add user to room
        room.participants.set(user.id, user);
        return room;
    }

    leaveRoom(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.participants.delete(userId);

        // Clean up empty rooms
        if (room.participants.size === 0) {
            this.rooms.delete(roomId);
            console.log(`Room deleted: ${roomId} (empty)`);
        }

        return true;
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    getRoomsCount() {
        return this.rooms.size;
    }

    getRoomParticipants(roomId) {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room.participants.values()) : [];
    }

    updateRoomInfo(roomId, info) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.info = { ...room.info, ...info };
        }
    }

    // Get stats for monitoring
    getStats() {
        const stats = {
            totalRooms: this.rooms.size,
            totalParticipants: 0,
            roomDetails: []
        };

        this.rooms.forEach((room, roomId) => {
            stats.totalParticipants += room.participants.size;
            stats.roomDetails.push({
                id: roomId,
                name: room.name,
                participants: room.participants.size,
                maxParticipants: room.maxParticipants,
                createdAt: room.createdAt,
                uptime: Date.now() - room.createdAt
            });
        });

        return stats;
    }
}

module.exports = RoomManager; 