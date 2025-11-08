// WebSocket client for collaborative canvas
export class WebSocketClient {
    constructor(url) {
        console.log('[WebSocketClient] Initializing WebSocket client');
        console.log('[WebSocketClient] Provided URL:', url);
        console.log('[WebSocketClient] Window location:', window.location.href);
        console.log('[WebSocketClient] Window protocol:', window.location.protocol);
        console.log('[WebSocketClient] Window host:', window.location.host);
        
        // For Vercel deployment, we need to construct the WebSocket URL properly
        let socketUrl;
        let socketOptions;
        
        if (!url) {
            console.log('[WebSocketClient] No URL provided, constructing URL from current origin');
            // On Vercel, we need to use the same origin for WebSocket connections
            // but we don't specify the protocol as Socket.IO will handle that
            socketUrl = "";
            
            socketOptions = {
                transports: ['websocket', 'polling'],
                upgrade: true,
                rejectUnauthorized: false,
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                randomizationFactor: 0.5,
                path: '/socket.io',
                timeout: 10000,
                // Add Vercel-specific options
                forceNew: true,
                autoConnect: false, // Don't auto-connect, we'll connect manually
                // Add additional options for better Vercel compatibility
                rememberUpgrade: true,
                upgradeTimeout: 10000,
                multiplex: false
            };
        } else {
            console.log('[WebSocketClient] Using provided URL:', url);
            socketUrl = url;
            socketOptions = {
                transports: ['websocket', 'polling'],
                upgrade: true,
                rejectUnauthorized: false,
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                randomizationFactor: 0.5,
                timeout: 10000,
                forceNew: true,
                autoConnect: false, // Don't auto-connect, we'll connect manually
                rememberUpgrade: true,
                upgradeTimeout: 10000,
                multiplex: false
            };
        }
        
        console.log('[WebSocketClient] Socket URL:', socketUrl || 'same origin');
        console.log('[WebSocketClient] Socket Options:', socketOptions);
        
        console.log('[WebSocketClient] Creating Socket.IO connection');
        this.socket = io(socketUrl, socketOptions);
        console.log('[WebSocketClient] Socket.IO instance created:', this.socket);
        this.listeners = {};
        
        // Add comprehensive connection state logging
        this.socket.on('connect', () => {
            console.log('[WebSocketClient] WebSocket connected with ID:', this.socket.id);
            console.log('[WebSocketClient] Connected to namespace:', this.socket.nsp);
            console.log('[WebSocketClient] Transport used:', this.socket.io.engine.transport.name);
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('[WebSocketClient] WebSocket disconnected. Reason:', reason);
            console.log('[WebSocketClient] Disconnection description:', this.getDisconnectReasonDescription(reason));
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('[WebSocketClient] WebSocket connection error:', error);
            console.error('[WebSocketClient] Connection error details:', {
                message: error.message,
                type: error.type,
                description: error.description
            });
        });
        
        this.socket.on('connect_timeout', (timeout) => {
            console.error('[WebSocketClient] WebSocket connection timeout:', timeout);
        });
        
        this.socket.on('error', (error) => {
            console.error('[WebSocketClient] WebSocket general error:', error);
        });
        
        this.socket.on('reconnect', (attemptNumber) => {
            console.log('[WebSocketClient] WebSocket reconnected. Attempt:', attemptNumber);
        });
        
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('[WebSocketClient] WebSocket reconnect attempt:', attemptNumber);
        });
        
        this.socket.on('reconnecting', (attemptNumber) => {
            console.log('[WebSocketClient] WebSocket reconnecting. Attempt:', attemptNumber);
        });
        
        this.socket.on('reconnect_error', (error) => {
            console.error('[WebSocketClient] WebSocket reconnect error:', error);
        });
        
        this.socket.on('reconnect_failed', () => {
            console.error('[WebSocketClient] WebSocket reconnect failed');
        });
        
        console.log('[WebSocketClient] Event listeners registered');
    }
    
    // Helper method to get human-readable disconnect reasons
    getDisconnectReasonDescription(reason) {
        const reasons = {
            'io server disconnect': 'Server disconnected intentionally',
            'io client disconnect': 'Client disconnected intentionally',
            'ping timeout': 'Ping timeout - connection lost',
            'transport close': 'Transport closed',
            'transport error': 'Transport error'
        };
        return reasons[reason] || 'Unknown reason';
    }

    // Connect to the WebSocket server
    connect() {
        console.log('[WebSocketClient] Attempting to connect to server');
        return new Promise((resolve, reject) => {
            console.log('[WebSocketClient] Setting up connection promise');
            
            const timeout = setTimeout(() => {
                console.error('[WebSocketClient] Connection timeout after 15 seconds');
                reject(new Error('Connection timeout - please check network and try again'));
            }, 15000); // 15 second timeout
            
            this.socket.on('connect', () => {
                console.log('[WebSocketClient] Connection established');
                clearTimeout(timeout);
                console.log('[WebSocketClient] Connected to server with ID:', this.socket.id);
                resolve(this.socket.id);
            });

            this.socket.on('connect_error', (error) => {
                console.error('[WebSocketClient] Connection error received');
                clearTimeout(timeout);
                console.error('[WebSocketClient] Connection error:', error);
                reject(new Error(`Failed to connect to server: ${error.message}`));
            });
            
            this.socket.on('disconnect', (reason) => {
                console.log('[WebSocketClient] Disconnected from server:', reason);
            });
            
            // If already connected, resolve immediately
            if (this.socket.connected) {
                console.log('[WebSocketClient] Already connected, resolving immediately');
                clearTimeout(timeout);
                resolve(this.socket.id);
            }
            
            // Manually attempt connection
            console.log('[WebSocketClient] Manually initiating connection');
            this.socket.connect();
        });
    }

    // Register event listeners
    on(event, callback) {
        console.log('[WebSocketClient] Registering event listener for:', event);
        this.listeners[event] = callback;
        this.socket.on(event, callback);
    }

    // Emit an event to the server
    emit(event, data) {
        console.log('[WebSocketClient] Emitting event:', event, data);
        if (this.socket.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn(`[WebSocketClient] Cannot emit event ${event}: Not connected to server`);
        }
    }

    // Disconnect from the server
    disconnect() {
        console.log('[WebSocketClient] Disconnecting from server');
        this.socket.disconnect();
    }

    // Join a drawing room
    joinRoom(roomId) {
        console.log('[WebSocketClient] Joining room:', roomId);
        this.socket.emit('join-room', roomId);
    }

    // Leave a drawing room
    leaveRoom(roomId) {
        console.log('[WebSocketClient] Leaving room:', roomId);
        this.socket.emit('leave-room', roomId);
    }
}