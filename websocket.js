// WebSocket client for collaborative canvas
export class WebSocketClient {
    constructor(url) {
        this.socket = io(url);
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
                reject(error);
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
        this.socket.emit(event, data);
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