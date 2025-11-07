// Vercel entry point
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { RoomManager } = require('./server/rooms.js');
const { DrawingState } = require('./server/drawing-state.js');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure Socket.IO with proper settings for Vercel
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true, // Allow Engine.IO v3 clients
  transports: ["websocket", "polling"] // Try WebSocket first, then polling
});

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, 'client')));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize room manager and drawing state
const roomManager = new RoomManager();
const drawingState = new DrawingState();

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Handle user joining a room
    socket.on('join-room', (roomId) => {
        // Validate room ID
        if (!roomId || typeof roomId !== 'string') {
            roomId = 'default';
        }
        
        // Leave any previous rooms
        socket.rooms.forEach(room => {
            if (room !== socket.id) {
                socket.leave(room);
            }
        });
        
        // Join the new room
        socket.join(roomId);
        
        // Add user to room
        const user = roomManager.addUserToRoom(socket.id, roomId);
        
        // Send initial state to the user
        const roomState = drawingState.getRoomState(roomId);
        socket.emit('initial-state', {
            paths: roomState.paths,
            users: roomManager.getUsersInRoom(roomId)
        });
        
        // Notify other users in the room
        socket.to(roomId).emit('user-joined', {
            userId: socket.id,
            color: user.color,
            name: user.name
        });
        
        console.log(`User ${socket.id} joined room ${roomId}`);
    });
    
    // Handle user leaving a room
    socket.on('leave-room', (roomId) => {
        // Validate room ID
        if (!roomId || typeof roomId !== 'string') {
            // Leave all rooms if no specific room is provided
            socket.rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.leave(room);
                    roomManager.removeUserFromRoom(socket.id, room);
                    socket.to(room).emit('user-left', { userId: socket.id });
                    console.log(`User ${socket.id} left room ${room}`);
                }
            });
            return;
        }
        
        socket.leave(roomId);
        roomManager.removeUserFromRoom(socket.id, roomId);
        socket.to(roomId).emit('user-left', { userId: socket.id });
        console.log(`User ${socket.id} left room ${roomId}`);
    });
    
    // Handle drawing path
    socket.on('draw-path', (pathData) => {
        // Broadcast to all other users in the same room
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                socket.to(roomId).emit('draw-path', pathData);
                // Update drawing state
                drawingState.addPathToRoom(roomId, pathData);
            }
        });
    });
    
    // Handle undo path
    socket.on('undo-path', (data) => {
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                socket.to(roomId).emit('path-undone', data);
                // Update drawing state
                drawingState.removePathFromRoom(roomId, data.pathId);
            }
        });
    });
    
    // Handle redo path
    socket.on('redo-path', (data) => {
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                // We would need to store the path data for redo
                // For simplicity, we'll just notify other users
                socket.to(roomId).emit('path-redone', data);
            }
        });
    });
    
    // Handle clear canvas
    socket.on('clear-canvas', () => {
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                socket.to(roomId).emit('canvas-cleared');
                // Clear drawing state
                drawingState.clearRoom(roomId);
            }
        });
    });
    
    // Handle cursor movement
    socket.on('cursor-move', (data) => {
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                socket.to(roomId).emit('cursor-move', {
                    ...data,
                    userId: socket.id
                });
            }
        });
    });
    
    // Handle latency test
    socket.on('latency-test', (data) => {
        socket.emit('latency-response', data);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Remove user from all rooms
        roomManager.removeUser(socket.id);
        
        // Notify all rooms the user was in
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                socket.to(roomId).emit('user-left', { userId: socket.id });
            }
        });
    });
    
    // Handle connection errors
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Export for Vercel
module.exports = (req, res) => {
    // Handle the request
    return app(req, res);
};

// Start server locally if not in Vercel environment
if (!process.env.NOW_REGION) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}