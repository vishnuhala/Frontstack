// Room management for collaborative canvas
class RoomManager {
    constructor() {
        // Store rooms and their users
        this.rooms = new Map(); // roomId -> Map of userId -> user data
    }
    
    // Add a user to a room
    addUserToRoom(userId, roomId) {
        // Create room if it doesn't exist
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Map());
        }
        
        // Create user data
        const user = {
            id: userId,
            color: this.generateRandomColor(),
            name: `User ${userId.substring(0, 4)}`,
            joinedAt: Date.now()
        };
        
        // Add user to room
        this.rooms.get(roomId).set(userId, user);
        
        return user;
    }
    
    // Remove a user from a room
    removeUserFromRoom(userId, roomId) {
        if (this.rooms.has(roomId)) {
            this.rooms.get(roomId).delete(userId);
            
            // Clean up empty room
            if (this.rooms.get(roomId).size === 0) {
                this.rooms.delete(roomId);
            }
        }
    }
    
    // Remove a user from all rooms
    removeUser(userId) {
        this.rooms.forEach((users, roomId) => {
            users.delete(userId);
            
            // Clean up empty room
            if (users.size === 0) {
                this.rooms.delete(roomId);
            }
        });
    }
    
    // Get all users in a room
    getUsersInRoom(roomId) {
        if (!this.rooms.has(roomId)) {
            return {};
        }
        
        const users = {};
        this.rooms.get(roomId).forEach((user, userId) => {
            users[userId] = user;
        });
        
        return users;
    }
    
    // Get all rooms
    getAllRooms() {
        return Array.from(this.rooms.keys());
    }
    
    // Get room statistics
    getRoomStats(roomId) {
        if (!this.rooms.has(roomId)) {
            return { userCount: 0 };
        }
        
        return {
            userCount: this.rooms.get(roomId).size
        };
    }
    
    // Generate a random color for user identification
    generateRandomColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

module.exports = { RoomManager };