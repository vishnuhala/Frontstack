// Main application entry point
import { CanvasManager } from './canvas.js';
import { WebSocketClient } from './websocket.js';

// DOM Elements
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
    try {
        // Initialize canvas manager
        canvasManager = new CanvasManager('drawing-canvas');
        
        // Initialize WebSocket client
        wsClient = new WebSocketClient();
        
        // Connect to server
        statusElement.textContent = 'Connecting to server...';
        const userId = await connectWithRetry();
        canvasManager.setUserId(userId);
        currentUser = { id: userId, color: getRandomColor() };
        
        // Join default room
        wsClient.joinRoom(currentRoom);
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup WebSocket event handlers
        setupWebSocketHandlers();
        
        // Start performance monitoring
        startPerformanceMonitoring();
        
        statusElement.textContent = 'Connected! Draw something...';
    } catch (error) {
        console.error('Failed to initialize application:', error);
        statusElement.textContent = `Connection failed: ${error.message}. Please refresh the page.`;
    }
});

// Connect with retry logic
async function connectWithRetry() {
    while (connectionAttempts < maxConnectionAttempts) {
        try {
            connectionAttempts++;
            statusElement.textContent = `Connecting to server... (Attempt ${connectionAttempts}/${maxConnectionAttempts})`;
            return await wsClient.connect();
        } catch (error) {
            console.error(`Connection attempt ${connectionAttempts} failed:`, error);
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
    // Tool selection
    brushToolBtn.addEventListener('click', () => {
        setActiveTool('brush');
        canvasManager.setTool('brush');
    });
    
    eraserToolBtn.addEventListener('click', () => {
        setActiveTool('eraser');
        canvasManager.setTool('eraser');
    });
    
    rectangleToolBtn.addEventListener('click', () => {
        setActiveTool('rectangle');
        canvasManager.setTool('rectangle');
    });
    
    circleToolBtn.addEventListener('click', () => {
        setActiveTool('circle');
        canvasManager.setTool('circle');
    });
    
    lineToolBtn.addEventListener('click', () => {
        setActiveTool('line');
        canvasManager.setTool('line');
    });
    
    // Color picker
    colorPicker.addEventListener('input', (e) => {
        canvasManager.setColor(e.target.value);
    });
    
    // Stroke width
    strokeWidthSlider.addEventListener('input', (e) => {
        const width = e.target.value;
        strokeWidthValue.textContent = width;
        canvasManager.setStrokeWidth(parseInt(width));
    });
    
    // Undo/Redo
    undoBtn.addEventListener('click', () => {
        const undonePath = canvasManager.undo();
        if (undonePath) {
            wsClient.emit('undo-path', { pathId: undonePath.id });
        }
        updateUndoRedoButtons();
    });
    
    redoBtn.addEventListener('click', () => {
        const redonePath = canvasManager.redo();
        if (redonePath) {
            wsClient.emit('redo-path', { pathId: redonePath.id });
        }
        updateUndoRedoButtons();
    });
    
    // Clear canvas
    clearBtn.addEventListener('click', () => {
        canvasManager.clear();
        wsClient.emit('clear-canvas');
    });
    
    // Room controls
    joinRoomBtn.addEventListener('click', () => {
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
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    canvasManager.import(data);
                } catch (error) {
                    console.error('Failed to load drawing:', error);
                    statusElement.textContent = 'Failed to load drawing: Invalid file format';
                }
            };
            reader.readAsText(file);
        }
    });
}

// Set active tool
function setActiveTool(tool) {
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
    undoBtn.disabled = canvasManager.undoStack.length === 0;
    redoBtn.disabled = canvasManager.redoStack.length === 0;
}

// Setup WebSocket event handlers
function setupWebSocketHandlers() {
    wsClient.on('connection-confirmed', (data) => {
        statusElement.textContent = `Connected with ID: ${data.userId.substring(0, 8)}...`;
    });
    
    wsClient.on('initial-state', (data) => {
        if (data.paths) {
            canvasManager.import({ paths: data.paths });
        }
        if (data.users) {
            updateUsersList(data.users);
        }
    });
    
    wsClient.on('draw-path', (pathData) => {
        canvasManager.drawPathFromServer(pathData);
    });
    
    wsClient.on('path-undone', (data) => {
        canvasManager.removePath(data.pathId);
    });
    
    wsClient.on('path-redone', (data) => {
        // For simplicity, we'll just notify the user
        // In a full implementation, we would need to store the path data for redo
    });
    
    wsClient.on('canvas-cleared', () => {
        canvasManager.clear();
    });
    
    wsClient.on('user-joined', (data) => {
        onlineUsers[data.userId] = { color: data.color, name: data.name };
        updateUsersList(onlineUsers);
        statusElement.textContent = `${data.name || 'A user'} joined the session`;
    });
    
    wsClient.on('user-left', (data) => {
        delete onlineUsers[data.userId];
        updateUsersList(onlineUsers);
        statusElement.textContent = 'A user left the session';
    });
    
    wsClient.on('cursor-move', (data) => {
        // Update cursor position for the user
        updateCursorPosition(data.userId, data.x, data.y, onlineUsers[data.userId]?.color);
    });
}

// Update users list
function updateUsersList(users) {
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