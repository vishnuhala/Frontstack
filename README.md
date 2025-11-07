# Collaborative Drawing Canvas

A real-time collaborative drawing application where multiple users can draw simultaneously on the same canvas with live synchronization.

## Features

- **Real-time Drawing**: See other users' drawings as they draw
- **Multiple Tools**: Brush, eraser, color picker, stroke width adjustment
- **User Indicators**: See where other users are currently drawing
- **Global Undo/Redo**: Works across all users
- **User Management**: Shows online users with assigned colors
- **Responsive Design**: Works on desktop and mobile devices

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd collaborative-canvas
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Testing with Multiple Users

1. Open multiple browser tabs or windows
2. Navigate to `http://localhost:3000` in each tab
3. Start drawing in one tab to see the results in real-time in other tabs

## Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html
│   ├── style.css
│   ├── canvas.js          # Canvas drawing logic
│   ├── websocket.js       # WebSocket client
│   └── main.js           # App initialization
├── server/
│   ├── server.js         # Express + WebSocket server
│   ├── rooms.js          # Room management
│   └── drawing-state.js  # Canvas state management
├── package.json
├── README.md
└── ARCHITECTURE.md
```

## Technical Implementation

### Frontend
- Vanilla JavaScript with ES6 modules
- HTML5 Canvas for drawing operations
- WebSocket client for real-time communication

### Backend
- Node.js with Express for HTTP serving
- Socket.IO for WebSocket communication
- In-memory storage for drawing state and room management

## Known Limitations/Bugs

1. Redo functionality is simplified and may not work perfectly in all scenarios
2. No persistent storage - drawings are lost when the server restarts
3. No authentication or user accounts
4. Limited conflict resolution for simultaneous drawing in the same area

## Time Spent

Approximately 8-10 hours were spent on this implementation, including:
- Planning and architecture design
- Frontend implementation
- Backend implementation
- Testing and debugging
- Documentation

## Deployment

To deploy this application:

1. Push to a hosting service like Heroku, Vercel, or AWS
2. Set the appropriate environment variables
3. Ensure the PORT environment variable is respected

Example for Heroku:
```
heroku create
git push heroku main
```