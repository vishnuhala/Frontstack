// Main application entry point
import { CanvasManager } from './canvas.js';
import { WebSocketClient } from './websocket.js';

console.log('[Main] Application starting');

// DOM Elements
console.log('[Main] Getting DOM elements');
const brushToolBtn = document.getElementById('brush-tool');
const eraserToolBtn = document.getElementById('eraser-tool');
const rectangleToolBtn = document.getElementById('rectangle-tool');
const circleToolBtn = document.getElementById('circle-tool');
const lineToolBtn = document.getElementById('line-tool');
const colorPicker = document.getElementById('color-picker');
const strokeWidthSlider = document.getElementById('stroke-width');
const strokeWidthValue = document.getElementById('stroke-width-value');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const clearBtn = document.getElementById('clear-btn');
const usersList = document.getElementById('users-list');
const statusElement = document.getElementById('status');
const performanceMetrics = document.getElementById('performance-metrics');
const roomInput = document.getElementById('room-input');
const joinRoomBtn = document.getElementById('join-room-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const fileInput = document.getElementById('file-input');

console.log('[Main] DOM elements retrieved');

// Initialize application
let canvasManager;
let wsClient;
let currentUser = null;
let onlineUsers = {};
let currentRoom = 'default';
let fpsCounter = 0;
let lastFpsUpdate = Date.now();
let latencyTests = [];
let cursorPosition = { x: 0, y: 0 };
let connectionAttempts = 0;
let maxConnectionAttempts = 5;

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Main] DOM loaded, initializing application');
    try {
        console.log('[Main] Initializing application...');
        // Initialize canvas manager
        console.log('[Main] Creating CanvasManager');
        canvasManager = new CanvasManager('drawing-canvas');
        console.log('[Main] CanvasManager created');
        
        // Initialize WebSocket client with no parameters (will use default based on environment)
        console.log('[Main] Creating WebSocketClient');
        wsClient = new WebSocketClient();
        console.log('[Main] WebSocketClient created');
        
        // Connect to server
        statusElement.textContent = 'Connecting to server...';
        console.log('[Main] Attempting to connect to server...');
        const userId = await connectWithRetry();
        console.log('[Main] Connected with user ID:', userId);
        canvasManager.setUserId(userId);
        currentUser = { id: userId, color: getRandomColor() };
        
        // Join default room
        console.log('[Main] Joining default room...');
        wsClient.joinRoom(currentRoom);
        
        // Setup event listeners
        console.log('[Main] Setting up event listeners...');
        setupEventListeners();
        
        // Setup WebSocket event handlers
        console.log('[Main] Setting up WebSocket event handlers...');
        setupWebSocketHandlers();
        
        // Start performance monitoring
        console.log('[Main] Starting performance monitoring...');
        startPerformanceMonitoring();
        
        statusElement.textContent = 'Connected! Draw something...';
        console.log('[Main] Application initialized successfully');
    } catch (error) {
        console.error('[Main] Failed to initialize application:', error);
        statusElement.textContent = `Connection failed: ${error.message}. Please refresh the page.`;
    }
});

// Connect with retry logic
async function connectWithRetry() {
    console.log('[Main] Starting connection retry logic');
    while (connectionAttempts < maxConnectionAttempts) {
        try {
            connectionAttempts++;
            statusElement.textContent = `Connecting to server... (Attempt ${connectionAttempts}/${maxConnectionAttempts})`;
            console.log(`[Main] Connection attempt ${connectionAttempts}`);
            return await wsClient.connect();
        } catch (error) {
            console.error(`[Main] Connection attempt ${connectionAttempts} failed:`, error);
            if (connectionAttempts >= maxConnectionAttempts) {
                throw error;
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * connectionAttempts));
        }
    }
    throw new Error('Failed to connect after maximum attempts');
}

// Setup event listeners for UI elements
function setupEventListeners() {
    console.log('[Main] Setting up UI event listeners');
    // Tool selection
    brushToolBtn.addEventListener('click', () => {
        console.log('[Main] Brush tool selected');
        setActiveTool('brush');
        canvasManager.setTool('brush');
    });
    
    eraserToolBtn.addEventListener('click', () => {
        console.log('[Main] Eraser tool selected');
        setActiveTool('eraser');
        canvasManager.setTool('eraser');
    });
    
    rectangleToolBtn.addEventListener('click', () => {
        console.log('[Main] Rectangle tool selected');
        setActiveTool('rectangle');
        canvasManager.setTool('rectangle');
    });
    
    circleToolBtn.addEventListener('click', () => {
        console.log('[Main] Circle tool selected');
        setActiveTool('circle');
        canvasManager.setTool('circle');
    });
    
    lineToolBtn.addEventListener('click', () => {
        console.log('[Main] Line tool selected');
        setActiveTool('line');
        canvasManager.setTool('line');
    });
    
    // Color picker
    colorPicker.addEventListener('input', (e) => {
        console.log('[Main] Color changed to:', e.target.value);
        canvasManager.setColor(e.target.value);
    });
    
    // Stroke width
    strokeWidthSlider.addEventListener('input', (e) => {
        const width = e.target.value;
        console.log('[Main] Stroke width changed to:', width);
        strokeWidthValue.textContent = width;
        canvasManager.setStrokeWidth(parseInt(width));
    });
    
    // Undo/Redo
    undoBtn.addEventListener('click', () => {
        console.log('[Main] Undo button clicked');
        const undonePath = canvasManager.undo();
        if (undonePath) {
            wsClient.emit('undo-path', { pathId: undonePath.id });
        }
        updateUndoRedoButtons();
    });
    
    redoBtn.addEventListener('click', () => {
        console.log('[Main] Redo button clicked');
        const redonePath = canvasManager.redo();
        if (redonePath) {
            wsClient.emit('redo-path', { pathId: redonePath.id });
        }
        updateUndoRedoButtons();
    });
    
    // Clear canvas
    clearBtn.addEventListener('click', () => {
        console.log('[Main] Clear button clicked');
        canvasManager.clear();
        wsClient.emit('clear-canvas');
    });
    
    // Room controls
    joinRoomBtn.addEventListener('click', () => {
        console.log('[Main] Join room button clicked');
        const roomName = roomInput.value.trim();
        if (roomName) {
            // Leave current room
            wsClient.leaveRoom(currentRoom);
            
            // Join new room
            currentRoom = roomName;
            wsClient.joinRoom(currentRoom);
            
            statusElement.textContent = `Joined room: ${roomName}`;
        }
    });
    
    createRoomBtn.addEventListener('click', () => {
        console.log('[Main] Create room button clicked');
        const roomName = prompt('Enter new room name:');
        if (roomName && roomName.trim()) {
            // Leave current room
            wsClient.leaveRoom(currentRoom);
            
            // Join new room
            currentRoom = roomName.trim();
            roomInput.value = currentRoom;
            wsClient.joinRoom(currentRoom);
            
            statusElement.textContent = `Created and joined room: ${roomName}`;
        }
    });
    
    // Save/Load functionality
    saveBtn.addEventListener('click', () => {
        console.log('[Main] Save button clicked');
        saveDrawing();
    });
    
    loadBtn.addEventListener('click', () => {
        console.log('[Main] Load button clicked');
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        console.log('[Main] File selected for loading');
        loadDrawing(e.target.files[0]);
    });
    
    // Mouse move event for cursor tracking
    canvasManager.canvas.addEventListener('mousemove', (e) => {
        const rect = canvasManager.canvas.getBoundingClientRect();
        cursorPosition.x = e.clientX - rect.left;
        cursorPosition.y = e.clientY - rect.top;
        sendCursorPosition();
    });
    
    console.log('[Main] UI event listeners set up');
}

// Setup WebSocket event handlers
function setupWebSocketHandlers() {
    console.log('[Main] Setting up WebSocket event handlers');
    // Connection confirmed
    wsClient.on('connection-confirmed', (data) => {
        console.log('[Main] Connection confirmed:', data);
        statusElement.textContent = 'Connected to server! Draw something...';
    });
    
    // User joined
    wsClient.on('user-joined', (data) => {
        console.log('[Main] User joined:', data);
        onlineUsers[data.userId] = {
            id: data.userId,
            color: data.color,
            name: data.name || `User ${Object.keys(onlineUsers).length + 1}`
        };
        updateUserList();
        statusElement.textContent = `${data.name || 'A user'} joined the session`;
    });
    
    // User left
    wsClient.on('user-left', (data) => {
        console.log('[Main] User left:', data);
        delete onlineUsers[data.userId];
        updateUserList();
        statusElement.textContent = 'A user left the session';
    });
    
    // Receive drawing data from other users
    wsClient.on('draw-path', (pathData) => {
        console.log('[Main] Received draw-path:', pathData);
        canvasManager.drawRemotePath(pathData);
    });
    
    // Receive undo action from other users
    wsClient.on('path-undone', (data) => {
        console.log('[Main] Received path-undone:', data);
        // Find and remove the path
        const index = canvasManager.paths.findIndex(p => p.id === data.pathId);
        if (index !== -1) {
            const undonePath = canvasManager.paths[index];
            canvasManager.paths.splice(index, 1);
            
            // Update undo/redo stacks
            const undoIndex = canvasManager.undoStack.findIndex(p => p.id === data.pathId);
            if (undoIndex !== -1) {
                canvasManager.undoStack.splice(undoIndex, 1);
            }
            
            canvasManager.redoStack.push(undonePath);
            canvasManager.redraw();
            updateUndoRedoButtons();
        }
    });
    
    // Receive redo action from other users
    wsClient.on('path-redone', (pathData) => {
        console.log('[Main] Received path-redone:', pathData);
        canvasManager.drawRemotePath(pathData);
        // Move path from redo to undo stack
        const redoIndex = canvasManager.redoStack.findIndex(p => p.id === pathData.id);
        if (redoIndex !== -1) {
            canvasManager.redoStack.splice(redoIndex, 1);
        }
        canvasManager.undoStack.push(pathData);
        updateUndoRedoButtons();
    });
    
    // Receive clear canvas command
    wsClient.on('canvas-cleared', () => {
        console.log('[Main] Received canvas-cleared');
        canvasManager.clear();
        statusElement.textContent = 'Canvas cleared by another user';
    });
    
    // Receive initial canvas state
    wsClient.on('initial-state', (data) => {
        console.log('[Main] Received initial-state:', data);
        if (data.paths) {
            canvasManager.setPaths(data.paths);
        }
        if (data.users) {
            onlineUsers = data.users;
            updateUserList();
        }
    });
    
    // Receive cursor position updates
    wsClient.on('cursor-move', (data) => {
        console.log('[Main] Received cursor-move:', data);
        updateRemoteCursor(data);
    });
    
    // Latency test response
    wsClient.on('latency-response', (data) => {
        console.log('[Main] Received latency-response:', data);
        const now = Date.now();
        const latency = now - data.timestamp;
        latencyTests.push(latency);
        
        // Keep only the last 10 latency tests
        if (latencyTests.length > 10) {
            latencyTests.shift();
        }
    });
    
    // Connection error handling
    wsClient.on('connect_error', (error) => {
        console.error('[Main] WebSocket connection error:', error);
        statusElement.textContent = `Connection error: ${error.message}. Retrying...`;
    });
    
    // Disconnection handling
    wsClient.on('disconnect', (reason) => {
        console.log('[Main] WebSocket disconnected:', reason);
        statusElement.textContent = `Disconnected: ${reason}. Attempting to reconnect...`;
    });
    
    console.log('[Main] WebSocket event handlers set up');
}

// Set active tool in UI
function setActiveTool(tool) {
    console.log('[Main] Setting active tool:', tool);
    // Remove active class from all tools
    brushToolBtn.classList.remove('active');
    eraserToolBtn.classList.remove('active');
    rectangleToolBtn.classList.remove('active');
    circleToolBtn.classList.remove('active');
    lineToolBtn.classList.remove('active');
    
    // Add active class to selected tool
    if (tool === 'brush') {
        brushToolBtn.classList.add('active');
    } else if (tool === 'eraser') {
        eraserToolBtn.classList.add('active');
    } else if (tool === 'rectangle') {
        rectangleToolBtn.classList.add('active');
    } else if (tool === 'circle') {
        circleToolBtn.classList.add('active');
    } else if (tool === 'line') {
        lineToolBtn.classList.add('active');
    }
}

// Update user list display
function updateUserList() {
    console.log('[Main] Updating user list');
    usersList.innerHTML = '';
    
    Object.values(onlineUsers).forEach(user => {
        const li = document.createElement('li');
        li.className = 'user-badge';
        li.style.backgroundColor = user.color;
        li.textContent = user.name || `User ${user.id.substring(0, 4)}`;
        usersList.appendChild(li);
    });
}

// Update remote cursor position
function updateRemoteCursor(data) {
    console.log('[Main] Updating remote cursor:', data);
    let cursor = document.getElementById(`cursor-${data.userId}`);
    
    if (!cursor) {
        // Create new cursor element
        cursor = document.createElement('div');
        cursor.id = `cursor-${data.userId}`;
        cursor.className = 'user-cursor';
        cursor.style.backgroundColor = data.color;
        
        const label = document.createElement('div');
        label.className = 'user-cursor-label';
        label.textContent = data.name || `User ${data.userId.substring(0, 4)}`;
        cursor.appendChild(label);
        
        document.getElementById('cursors-container').appendChild(cursor);
    }
    
    // Update cursor position
    cursor.style.left = `${data.x}px`;
    cursor.style.top = `${data.y}px`;
}

// Send cursor position to other users
function sendCursorPosition() {
    if (wsClient && wsClient.socket && wsClient.socket.connected) {
        wsClient.emit('cursor-move', {
            x: cursorPosition.x,
            y: cursorPosition.y,
            color: currentUser.color,
            userId: currentUser.id
        });
    }
}

// Update undo/redo button states
function updateUndoRedoButtons() {
    console.log('[Main] Updating undo/redo buttons');
    undoBtn.disabled = canvasManager.undoStack.length === 0;
    redoBtn.disabled = canvasManager.redoStack.length === 0;
}

// Generate a random color for user identification
function getRandomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Handle drawing completion
canvasManager.stopDrawing = function() {
    console.log('[Main] Drawing stopped');
    const originalResult = CanvasManager.prototype.stopDrawing.call(this);
    
    // Send path data to other users
    if (originalResult) {
        wsClient.emit('draw-path', originalResult);
    }
    
    return originalResult;
};

// Start performance monitoring
function startPerformanceMonitoring() {
    console.log('[Main] Starting performance monitoring');
    // FPS counter
    setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastFpsUpdate) / 1000;
        const fps = Math.round(fpsCounter / elapsed);
        
        // Calculate average latency
        let avgLatency = 0;
        if (latencyTests.length > 0) {
            const sum = latencyTests.reduce((a, b) => a + b, 0);
            avgLatency = Math.round(sum / latencyTests.length);
        }
        
        // Update performance metrics display
        performanceMetrics.textContent = `FPS: ${fps} | Latency: ${avgLatency}ms`;
        
        // Reset counters
        fpsCounter = 0;
        lastFpsUpdate = now;
    }, 1000);
    
    // Increment FPS counter on each frame
    const updateFps = () => {
        fpsCounter++;
        requestAnimationFrame(updateFps);
    };
    updateFps();
    
    // Periodically test latency
    setInterval(() => {
        if (wsClient && wsClient.socket && wsClient.socket.connected) {
            wsClient.emit('latency-test', { timestamp: Date.now() });
        }
    }, 5000);
}

// Save drawing to file
function saveDrawing() {
    console.log('[Main] Saving drawing');
    try {
        const drawingData = {
            paths: canvasManager.paths,
            createdAt: new Date().toISOString(),
            room: currentRoom
        };
        
        const dataStr = JSON.stringify(drawingData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `drawing-${currentRoom}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        statusElement.textContent = 'Drawing saved successfully!';
    } catch (error) {
        console.error('[Main] Error saving drawing:', error);
        statusElement.textContent = 'Error saving drawing: ' + error.message;
    }
}

// Load drawing from file
function loadDrawing(file) {
    console.log('[Main] Loading drawing');
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const drawingData = JSON.parse(e.target.result);
            
            if (drawingData.paths) {
                // Clear current canvas
                canvasManager.clear();
                wsClient.emit('clear-canvas');
                
                // Load paths
                drawingData.paths.forEach(path => {
                    canvasManager.drawPath(path);
                    canvasManager.paths.push(path);
                });
                
                // Update undo stack
                canvasManager.undoStack = [...drawingData.paths];
                canvasManager.redoStack = [];
                
                statusElement.textContent = 'Drawing loaded successfully!';
                updateUndoRedoButtons();
            } else {
                throw new Error('Invalid drawing file format');
            }
        } catch (error) {
            console.error('[Main] Error loading drawing:', error);
            statusElement.textContent = 'Error loading drawing: ' + error.message;
        }
    };
    
    reader.onerror = function() {
        statusElement.textContent = 'Error reading file';
    };
    
    reader.readAsText(file);
}