// Main application entry point
console.log('[Main] Script loading started');

// Add a check for require function
if (typeof require !== 'undefined') {
    console.log('[Main] Require function is defined - this should not happen in browser');
} else {
    console.log('[Main] Require function is not defined - this is expected in browser');
}

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
    
    // Create room button
    createRoomBtn.addEventListener('click', () => {
        console.log('[Main] Create room button clicked');
        const roomName = 'room-' + Math.random().toString(36).substr(2, 9);
        roomInput.value = roomName;
        
        // Leave current room
        wsClient.leaveRoom(currentRoom);
        
        // Join new room
        currentRoom = roomName;
        wsClient.joinRoom(currentRoom);
        
        statusElement.textContent = `Created and joined room: ${roomName}`;
    });
    
    // Save button
    saveBtn.addEventListener('click', () => {
        console.log('[Main] Save button clicked');
        const data = canvasManager.export();
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drawing.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // Load button
    loadBtn.addEventListener('click', () => {
        console.log('[Main] Load button clicked');
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        console.log('[Main] File input changed');
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    canvasManager.import(data);
                    console.log('[Main] Drawing loaded successfully');
                } catch (error) {
                    console.error('[Main] Failed to load drawing:', error);
                    statusElement.textContent = 'Failed to load drawing: Invalid file format';
                }
            };
            reader.readAsText(file);
        }
    });
    
    console.log('[Main] UI event listeners setup complete');
}

// Set active tool
function setActiveTool(tool) {
    console.log('[Main] Setting active tool:', tool);
    // Remove active class from all tools
    document.querySelectorAll('.tool').forEach(btn => btn.classList.remove('active'));
    
    // Add active class to selected tool
    const toolBtn = document.getElementById(`${tool}-tool`);
    if (toolBtn) {
        toolBtn.classList.add('active');
    }
}

// Update undo/redo buttons
function updateUndoRedoButtons() {
    console.log('[Main] Updating undo/redo buttons');
    undoBtn.disabled = canvasManager.undoStack.length === 0;
    redoBtn.disabled = canvasManager.redoStack.length === 0;
}

// Setup WebSocket event handlers
function setupWebSocketHandlers() {
    console.log('[Main] Setting up WebSocket event handlers');
    
    wsClient.on('connection-confirmed', (data) => {
        console.log('[Main] Connection confirmed from server:', data);
        statusElement.textContent = `Connected with ID: ${data.userId.substring(0, 8)}...`;
    });
    
    wsClient.on('initial-state', (data) => {
        console.log('[Main] Received initial state from server:', data);
        if (data.paths) {
            canvasManager.import({ paths: data.paths });
        }
        if (data.users) {
            updateUsersList(data.users);
        }
    });
    
    wsClient.on('draw-path', (pathData) => {
        console.log('[Main] Received draw-path from server:', pathData);
        canvasManager.drawPathFromServer(pathData);
    });
    
    wsClient.on('path-undone', (data) => {
        console.log('[Main] Received path-undone from server:', data);
        canvasManager.removePath(data.pathId);
    });
    
    wsClient.on('path-redone', (data) => {
        console.log('[Main] Received path-redone from server:', data);
        // For simplicity, we'll just notify the user
        // In a full implementation, we would need to store the path data for redo
    });
    
    wsClient.on('canvas-cleared', () => {
        console.log('[Main] Received canvas-cleared from server');
        canvasManager.clear();
    });
    
    wsClient.on('user-joined', (data) => {
        console.log('[Main] User joined:', data);
        onlineUsers[data.userId] = { color: data.color, name: data.name };
        updateUsersList(onlineUsers);
    });
    
    wsClient.on('user-left', (data) => {
        console.log('[Main] User left:', data);
        delete onlineUsers[data.userId];
        updateUsersList(onlineUsers);
    });
    
    wsClient.on('cursor-move', (data) => {
        console.log('[Main] Cursor move:', data);
        // Update cursor position for the user
        updateCursorPosition(data.userId, data.x, data.y, onlineUsers[data.userId]?.color);
    });
    
    console.log('[Main] WebSocket event handlers setup complete');
}

// Update users list
function updateUsersList(users) {
    console.log('[Main] Updating users list:', users);
    usersList.innerHTML = '';
    Object.entries(users).forEach(([userId, userData]) => {
        const li = document.createElement('li');
        li.textContent = userId === currentUser.id ? `${userId.substring(0, 8)}... (You)` : userId.substring(0, 8) + '...';
        li.style.color = userData.color;
        usersList.appendChild(li);
    });
}

// Update cursor position
function updateCursorPosition(userId, x, y, color) {
    console.log('[Main] Updating cursor position:', userId, x, y, color);
    let cursor = document.getElementById(`cursor-${userId}`);
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = `cursor-${userId}`;
        cursor.className = 'cursor';
        cursor.style.position = 'absolute';
        cursor.style.width = '10px';
        cursor.style.height = '10px';
        cursor.style.borderRadius = '50%';
        cursor.style.pointerEvents = 'none';
        cursor.style.zIndex = '1000';
        document.getElementById('cursors-container').appendChild(cursor);
    }
    
    cursor.style.left = `${x - 5}px`;
    cursor.style.top = `${y - 5}px`;
    cursor.style.backgroundColor = color || '#000000';
}

// Start performance monitoring
function startPerformanceMonitoring() {
    console.log('[Main] Starting performance monitoring');
    setInterval(() => {
        fpsCounter++;
        const now = Date.now();
        if (now - lastFpsUpdate >= 1000) {
            const fps = Math.round(fpsCounter * 1000 / (now - lastFpsUpdate));
            fpsCounter = 0;
            lastFpsUpdate = now;
            
            // Update performance metrics
            performanceMetrics.textContent = `FPS: ${fps}`;
            
            // Send latency test
            if (wsClient) {
                const startTime = Date.now();
                wsClient.emit('latency-test', { startTime });
            }
        }
        
        // Send cursor position
        if (wsClient && cursorPosition.x !== 0 && cursorPosition.y !== 0) {
            wsClient.emit('cursor-move', cursorPosition);
        }
    }, 16); // ~60 FPS
    
    // Track mouse movement for cursor position
    document.getElementById('drawing-canvas').addEventListener('mousemove', (e) => {
        const rect = e.target.getBoundingClientRect();
        cursorPosition.x = e.clientX - rect.left;
        cursorPosition.y = e.clientY - rect.top;
    });
    
    console.log('[Main] Performance monitoring started');
}

// Handle latency response
wsClient.on('latency-response', (data) => {
    const latency = Date.now() - data.startTime;
    latencyTests.push(latency);
    
    // Keep only the last 10 latency tests
    if (latencyTests.length > 10) {
        latencyTests.shift();
    }
    
    // Calculate average latency
    const avgLatency = Math.round(latencyTests.reduce((a, b) => a + b, 0) / latencyTests.length);
    performanceMetrics.textContent += ` | Latency: ${avgLatency}ms`;
});

// Utility function to generate random color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

console.log('[Main] Script loading completed');