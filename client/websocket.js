// WebSocket client for collaborative canvas
export class WebSocketClient {
    constructor(url) {
        // For Vercel deployment, we need to construct the WebSocket URL properly
        let socketUrl;
        let socketOptions;
        
        if (!url) {
            // On Vercel, we need to use wss:// for secure connections
            // and ws:// for non-secure connections
            const isSecure = window.location.protocol === 'https:';
            const protocol = isSecure ? 'wss://' : 'ws://';
            const host = window.location.host;
            socketUrl = `${protocol}${host}`;
            
            socketOptions = {
                transports: ['websocket', 'polling'],
                upgrade: true,
                rejectUnauthorized: false,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                randomizationFactor: 0.5,
                path: '/socket.io'
            };
        } else {
            socketUrl = url;
            socketOptions = {
                transports: ['websocket', 'polling'],
                upgrade: true,
                rejectUnauthorized: false,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                randomizationFactor: 0.5
            };
        }
        
        console.log('Connecting to WebSocket server at:', socketUrl);
        this.socket = io(socketUrl, socketOptions);
        this.listeners = {};
    }

    // Connect to the WebSocket server
    connect() {
        return new Promise((resolve, reject) => {
            this.socket.on('connect', () => {
                console.log('Connected to server with ID:', this.socket.id);
                resolve(this.socket.id);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                reject(new Error(`Failed to connect to server: ${error.message}`));
            });
            
            this.socket.on('disconnect', (reason) => {
                console.log('Disconnected from server:', reason);
            });
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