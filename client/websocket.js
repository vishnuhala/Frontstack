// WebSocket client for collaborative canvas
export class WebSocketClient {
    constructor(url) {
        // For Vercel deployment, we need to construct the WebSocket URL properly
        let socketUrl;
        let socketOptions;
        
        if (!url) {
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
                secure: true
            };
        } else {
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
                forceNew: true
            };
        }
        
        console.log('Connecting to WebSocket server at:', socketUrl || 'same origin');
        this.socket = io(socketUrl, socketOptions);
        this.listeners = {};
        
        // Add connection state logging
        this.socket.on('connect', () => {
            console.log('WebSocket connected with ID:', this.socket.id);
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected. Reason:', reason);
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
        });
    }

    // Connect to the WebSocket server
    connect() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout - please check network and try again'));
            }, 15000); // 15 second timeout
            
            this.socket.on('connect', () => {
                clearTimeout(timeout);
                console.log('Connected to server with ID:', this.socket.id);
                resolve(this.socket.id);
            });

            this.socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                console.error('Connection error:', error);
                reject(new Error(`Failed to connect to server: ${error.message}`));
            });
            
            this.socket.on('disconnect', (reason) => {
                console.log('Disconnected from server:', reason);
            });
            
            // If already connected, resolve immediately
            if (this.socket.connected) {
                clearTimeout(timeout);
                resolve(this.socket.id);
            }
        });
    }

    // Register event listeners
    on(event, callback) {
        this.listeners[event] = callback;
        this.socket.on(event, callback);
    }

    // Emit an event to the server
    emit(event, data) {
        if (this.socket.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn(`Cannot emit event ${event}: Not connected to server`);
        }
    }

    // Disconnect from the server
    disconnect() {
        this.socket.disconnect();
    }

    // Join a drawing room
    joinRoom(roomId) {
        this.socket.emit('join-room', roomId);
    }

    // Leave a drawing room
    leaveRoom(roomId) {
        this.socket.emit('leave-room', roomId);
    }
}