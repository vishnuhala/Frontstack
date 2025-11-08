// Vercel entry point
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

console.log('[Server] Starting server initialization');

// Initialize Express app
const app = express();
const server = http.createServer(app);
console.log('[Server] Express app and HTTP server created');

// Add logging middleware
app.use((req, res, next) => {
    console.log(`[Server] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Get the port from environment or default to 3000
const PORT = process.env.PORT || 3000;
console.log(`[Server] Using port: ${PORT}`);

// Configure Socket.IO with proper settings for Vercel
console.log('[Server] Configuring Socket.IO');
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  allowEIO3: true, // Allow Engine.IO v3 clients
  transports: ["websocket", "polling"], // Try WebSocket first, then polling
  upgrade: true,
  cookie: false, // Disable cookie for Vercel compatibility
  path: "/socket.io", // Explicitly set the path
  serveClient: false, // Don't serve the client files from the server
  // Add additional options for better Vercel compatibility
  allowRequest: (req, callback) => {
    // Allow all requests for better compatibility
    console.log('[Server] Allowing request:', req.url, req.headers);
    callback(null, true);
  }
});
console.log('[Server] Socket.IO configured');

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, 'client')));
console.log('[Server] Static files middleware configured');

// Serve index.html for the root route
app.get('/', (req, res) => {
    console.log('[Server] Serving index.html');
    res.sendFile(path.join(__dirname, 'client/index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('[Server] Health check requested');
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port: PORT
    });
});

// Import room manager and drawing state from server files
console.log('[Server] Importing room manager and drawing state');
const { RoomManager } = require('./server/rooms.js');
const { DrawingState } = require('./server/drawing-state.js');

// Initialize room manager and drawing state
console.log('[Server] Initializing room manager and drawing state');
const roomManager = new RoomManager();
const drawingState = new DrawingState();
console.log('[Server] Room manager and drawing state initialized');

// Handle WebSocket connections
console.log('[Server] Setting up WebSocket connection handler');
io.on('connection', (socket) => {
    console.log('[Server] User connected:', socket.id, 'on port:', PORT);
    console.log('[Server] Socket handshake details:', {
        headers: socket.handshake.headers,
        address: socket.handshake.address,
        time: socket.handshake.time
    });
    
    // Send connection confirmation
    console.log('[Server] Sending connection confirmation to:', socket.id);
    socket.emit('connection-confirmed', { 
        userId: socket.id, 
        timestamp: new Date().toISOString(),
        port: PORT
    });
    
    // Handle user joining a room
    socket.on('join-room', (roomId) => {
        console.log(`[Server] User ${socket.id} attempting to join room:`, roomId);
        // Validate room ID
        if (!roomId || typeof roomId !== 'string') {
            console.log(`[Server] Invalid room ID provided, using default`);
            roomId = 'default';
        }
        
        // Leave any previous rooms
        console.log(`[Server] User ${socket.id} leaving previous rooms`);
        socket.rooms.forEach(room => {
            if (room !== socket.id) {
                socket.leave(room);
                console.log(`[Server] User ${socket.id} left room ${room}`);
            }
        });
        
        // Join the new room
        console.log(`[Server] User ${socket.id} joining room ${roomId}`);
        socket.join(roomId);
        
        // Add user to room
        console.log(`[Server] Adding user ${socket.id} to room ${roomId}`);
        const user = roomManager.addUserToRoom(socket.id, roomId);
        
        // Send initial state to the user
        console.log(`[Server] Sending initial state to user ${socket.id}`);
        const roomState = drawingState.getRoomState(roomId);
        socket.emit('initial-state', {
            paths: roomState.paths,
            users: roomManager.getUsersInRoom(roomId)
        });
        
        // Notify other users in the room
        console.log(`[Server] Notifying other users in room ${roomId} about new user ${socket.id}`);
        socket.to(roomId).emit('user-joined', {
            userId: socket.id,
            color: user.color,
            name: user.name
        });
        
        console.log(`[Server] User ${socket.id} successfully joined room ${roomId}`);
    });
    
    // Handle user leaving a room
    socket.on('leave-room', (roomId) => {
        console.log(`[Server] User ${socket.id} attempting to leave room:`, roomId);
        // Validate room ID
        if (!roomId || typeof roomId !== 'string') {
            console.log(`[Server] No valid room ID provided, leaving all rooms`);
            // Leave all rooms if no specific room is provided
            socket.rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.leave(room);
                    roomManager.removeUserFromRoom(socket.id, room);
                    socket.to(room).emit('user-left', { userId: socket.id });
                    console.log(`[Server] User ${socket.id} left room ${room}`);
                }
            });
            return;
        }
        
        console.log(`[Server] User ${socket.id} leaving room ${roomId}`);
        socket.leave(roomId);
        roomManager.removeUserFromRoom(socket.id, roomId);
        socket.to(roomId).emit('user-left', { userId: socket.id });
        console.log(`[Server] User ${socket.id} successfully left room ${roomId}`);
    });
    
    // Handle drawing path
    socket.on('draw-path', (pathData) => {
        console.log(`[Server] Received draw-path from user ${socket.id}`);
        // Broadcast to all other users in the same room
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                console.log(`[Server] Broadcasting draw-path to room ${roomId}`);
                socket.to(roomId).emit('draw-path', pathData);
                // Update drawing state
                drawingState.addPathToRoom(roomId, pathData);
            }
        });
    });
    
    // Handle undo path
    socket.on('undo-path', (data) => {
        console.log(`[Server] Received undo-path from user ${socket.id}`);
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                console.log(`[Server] Broadcasting path-undone to room ${roomId}`);
                socket.to(roomId).emit('path-undone', data);
                // Update drawing state
                drawingState.removePathFromRoom(roomId, data.pathId);
            }
        });
    });
    
    // Handle redo path
    socket.on('redo-path', (data) => {
        console.log(`[Server] Received redo-path from user ${socket.id}`);
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                console.log(`[Server] Broadcasting path-redone to room ${roomId}`);
                // We would need to store the path data for redo
                // For simplicity, we'll just notify other users
                socket.to(roomId).emit('path-redone', data);
            }
        });
    });
    
    // Handle clear canvas
    socket.on('clear-canvas', () => {
        console.log(`[Server] Received clear-canvas from user ${socket.id}`);
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                console.log(`[Server] Broadcasting canvas-cleared to room ${roomId}`);
                socket.to(roomId).emit('canvas-cleared');
                // Clear drawing state
                drawingState.clearRoom(roomId);
            }
        });
    });
    
    // Handle cursor movement
    socket.on('cursor-move', (data) => {
        console.log(`[Server] Received cursor-move from user ${socket.id}`);
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                console.log(`[Server] Broadcasting cursor-move to room ${roomId}`);
                socket.to(roomId).emit('cursor-move', {
                    ...data,
                    userId: socket.id
                });
            }
        });
    });
    
    // Handle latency test
    socket.on('latency-test', (data) => {
        console.log(`[Server] Received latency-test from user ${socket.id}`);
        socket.emit('latency-response', data);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('[Server] User disconnected:', socket.id);
        
        // Remove user from all rooms
        console.log(`[Server] Removing user ${socket.id} from all rooms`);
        roomManager.removeUser(socket.id);
        
        // Notify all rooms the user was in
        console.log(`[Server] Notifying rooms about disconnected user ${socket.id}`);
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                socket.to(roomId).emit('user-left', { userId: socket.id });
            }
        });
    });
    
    // Handle connection errors
    socket.on('error', (error) => {
        console.error('[Server] Socket error for user', socket.id, ':', error);
    });
    
    console.log('[Server] All event handlers registered for user', socket.id);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[Server] Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Export for Vercel
console.log('[Server] Setting up Vercel export');

// Create the handler function for Vercel
const handler = (req, res) => {
    console.log('[Server] Vercel request received:', req.method, req.url);
    // Handle the request
    return app(req, res);
};

// Export both the handler and the server
module.exports = handler;
module.exports.server = server;

// Start server locally if not in Vercel environment
if (!process.env.NOW_REGION) {
    console.log('[Server] Starting server locally on port', PORT);
    server.listen(PORT, () => {
        console.log(`[Server] Server is running on port ${PORT}`);
    });
} else {
    console.log('[Server] Running in Vercel environment');
    // In Vercel environment, the server will be started by Vercel
    // We just need to make sure it's exported properly
}