// Drawing state management for collaborative canvas
class DrawingState {
    constructor() {
        // Store drawing state for each room
        this.roomStates = new Map(); // roomId -> { paths: [], ... }
    }
    
    // Get room state
    getRoomState(roomId) {
        if (!this.roomStates.has(roomId)) {
            this.roomStates.set(roomId, {
                paths: [],
                lastUpdate: Date.now()
            });
        }
        
        return this.roomStates.get(roomId);
    }
    
    // Add a path to a room
    addPathToRoom(roomId, pathData) {
        const roomState = this.getRoomState(roomId);
        roomState.paths.push(pathData);
        roomState.lastUpdate = Date.now();
        
        // Limit the number of paths to prevent memory issues
        if (roomState.paths.length > 1000) {
            roomState.paths.shift();
        }
    }
    
    // Remove a path from a room (for undo)
    removePathFromRoom(roomId, pathId) {
        const roomState = this.getRoomState(roomId);
        const index = roomState.paths.findIndex(p => p.id === pathId);
        
        if (index !== -1) {
            roomState.paths.splice(index, 1);
            roomState.lastUpdate = Date.now();
        }
    }
    
    // Clear a room's canvas
    clearRoom(roomId) {
        const roomState = this.getRoomState(roomId);
        roomState.paths = [];
        roomState.lastUpdate = Date.now();
    }
    
    // Get path by ID
    getPath(roomId, pathId) {
        const roomState = this.getRoomState(roomId);
        return roomState.paths.find(p => p.id === pathId) || null;
    }
    
    // Update a path (for editing)
    updatePath(roomId, pathId, updatedPath) {
        const roomState = this.getRoomState(roomId);
        const index = roomState.paths.findIndex(p => p.id === pathId);
        
        if (index !== -1) {
            roomState.paths[index] = updatedPath;
            roomState.lastUpdate = Date.now();
        }
    }
    
    // Get room statistics
    getRoomStats(roomId) {
        const roomState = this.getRoomState(roomId);
        return {
            pathCount: roomState.paths.length,
            lastUpdate: roomState.lastUpdate
        };
    }
    
    // Clean up old rooms (to prevent memory leaks)
    cleanupInactiveRooms(thresholdMs = 24 * 60 * 60 * 1000) { // 24 hours
        const now = Date.now();
        const roomsToDelete = [];
        
        this.roomStates.forEach((state, roomId) => {
            if (now - state.lastUpdate > thresholdMs) {
                roomsToDelete.push(roomId);
            }
        });
        
        roomsToDelete.forEach(roomId => {
            this.roomStates.delete(roomId);
        });
        
        return roomsToDelete.length;
    }
}

module.exports = { DrawingState };