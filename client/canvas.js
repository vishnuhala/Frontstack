// Canvas drawing logic for collaborative canvas
export class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentPath = [];
        this.paths = []; // Store all paths for undo/redo
        this.undoStack = [];
        this.redoStack = [];
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.currentStrokeWidth = 5;
        this.userId = null;
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initialize canvas context
        this.setupCanvasContext();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    // Resize canvas to fit container
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.setupCanvasContext();
        
        // Redraw existing paths
        this.redraw();
    }
    
    // Setup canvas context properties
    setupCanvasContext() {
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.currentStrokeWidth;
        this.ctx.fillStyle = this.currentColor;
    }
    
    // Setup event listeners for drawing
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });
    }
    
    // Set current tool
    setTool(tool) {
        this.currentTool = tool;
        this.setupCanvasContext();
    }
    
    // Set current color
    setColor(color) {
        this.currentColor = color;
        this.setupCanvasContext();
    }
    
    // Set stroke width
    setStrokeWidth(width) {
        this.currentStrokeWidth = width;
        this.setupCanvasContext();
    }
    
    // Set user ID
    setUserId(id) {
        this.userId = id;
    }
    
    // Start drawing
    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;
        
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.currentPath = [{
                x: this.startX,
                y: this.startY,
                tool: this.currentTool,
                color: this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor,
                strokeWidth: this.currentStrokeWidth
            }];
            
            // Draw the starting point
            this.drawPoint(this.startX, this.startY);
        }
    }
    
    // Draw a point
    drawPoint(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.currentStrokeWidth / 2, 0, Math.PI * 2);
        
        if (this.currentTool === 'eraser') {
            // For eraser, use destination-out composite operation
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.fillStyle = 'rgba(0,0,0,1)';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.fillStyle = this.currentColor;
        }
        
        this.ctx.fill();
    }
    
    // Draw line
    draw(e) {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.currentPath.push({
                x,
                y,
                tool: this.currentTool,
                color: this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor,
                strokeWidth: this.currentStrokeWidth
            });
            
            // Draw the line segment
            this.ctx.beginPath();
            this.ctx.moveTo(this.currentPath[this.currentPath.length - 2].x, this.currentPath[this.currentPath.length - 2].y);
            this.ctx.lineTo(x, y);
            
            if (this.currentTool === 'eraser') {
                // For eraser, use destination-out composite operation
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.strokeStyle = this.currentColor;
            }
            
            this.ctx.lineWidth = this.currentStrokeWidth;
            this.ctx.stroke();
        } else if (this.currentTool === 'rectangle' || this.currentTool === 'circle' || this.currentTool === 'line') {
            // For shape tools, we redraw the entire canvas and draw a preview
            this.redraw();
            
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.currentStrokeWidth;
            this.ctx.globalCompositeOperation = 'source-over';
            
            if (this.currentTool === 'rectangle') {
                const width = x - this.startX;
                const height = y - this.startY;
                this.ctx.strokeRect(this.startX, this.startY, width, height);
            } else if (this.currentTool === 'circle') {
                const radius = Math.sqrt(Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2));
                this.ctx.arc(this.startX, this.startY, radius, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (this.currentTool === 'line') {
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            }
            
            // Store current coordinates for shape completion
            this.endX = x;
            this.endY = y;
        }
    }
    
    // Stop drawing
    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        // Reset composite operation to default
        this.ctx.globalCompositeOperation = 'source-over';
        
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            // Save the path if it has more than one point
            if (this.currentPath.length > 0) {
                const pathData = {
                    id: Date.now() + '-' + Math.random(),
                    userId: this.userId,
                    points: [...this.currentPath],
                    timestamp: Date.now()
                };
                
                this.paths.push(pathData);
                this.undoStack.push(pathData);
                this.redoStack = []; // Clear redo stack when new action is performed
                
                return pathData;
            }
        } else if (this.currentTool === 'rectangle' || this.currentTool === 'circle' || this.currentTool === 'line') {
            // For shape tools, create a path representation
            const shapePath = {
                id: Date.now() + '-' + Math.random(),
                userId: this.userId,
                tool: this.currentTool,
                color: this.currentColor,
                strokeWidth: this.currentStrokeWidth,
                startX: this.startX,
                startY: this.startY,
                endX: this.endX,
                endY: this.endY,
                timestamp: Date.now()
            };
            
            this.paths.push(shapePath);
            this.undoStack.push(shapePath);
            this.redoStack = []; // Clear redo stack when new action is performed
            
            // Redraw to finalize the shape
            this.redraw();
            
            return shapePath;
        }
        
        return null;
    }
    
    // Redraw all paths
    redraw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw all paths
        this.paths.forEach(path => {
            this.drawPath(path);
        });
    }
    
    // Draw a specific path
    drawPath(pathData) {
        this.ctx.beginPath();
        this.ctx.lineWidth = pathData.strokeWidth || this.currentStrokeWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        if (pathData.points) {
            // Regular path (brush/eraser)
            if (pathData.points.length === 0) return;
            
            if (pathData.points.length === 1) {
                // Draw a point
                const point = pathData.points[0];
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, point.strokeWidth / 2, 0, Math.PI * 2);
                
                if (point.tool === 'eraser') {
                    this.ctx.globalCompositeOperation = 'destination-out';
                    this.ctx.fillStyle = 'rgba(0,0,0,1)';
                } else {
                    this.ctx.globalCompositeOperation = 'source-over';
                    this.ctx.fillStyle = point.color;
                }
                
                this.ctx.fill();
            } else {
                // Draw a path
                this.ctx.beginPath();
                this.ctx.moveTo(pathData.points[0].x, pathData.points[0].y);
                
                for (let i = 1; i < pathData.points.length; i++) {
                    this.ctx.lineTo(pathData.points[i].x, pathData.points[i].y);
                }
                
                if (pathData.points[0].tool === 'eraser') {
                    this.ctx.globalCompositeOperation = 'destination-out';
                    this.ctx.strokeStyle = 'rgba(0,0,0,1)';
                } else {
                    this.ctx.globalCompositeOperation = 'source-over';
                    this.ctx.strokeStyle = pathData.points[0].color;
                }
                
                this.ctx.lineWidth = pathData.points[0].strokeWidth;
                this.ctx.stroke();
            }
        } else if (pathData.tool) {
            // Shape path (rectangle, circle, line)
            this.ctx.beginPath();
            this.ctx.strokeStyle = pathData.color;
            this.ctx.lineWidth = pathData.strokeWidth;
            this.ctx.globalCompositeOperation = 'source-over';
            
            if (pathData.tool === 'rectangle') {
                const width = pathData.endX - pathData.startX;
                const height = pathData.endY - pathData.startY;
                this.ctx.strokeRect(pathData.startX, pathData.startY, width, height);
            } else if (pathData.tool === 'circle') {
                const radius = Math.sqrt(Math.pow(pathData.endX - pathData.startX, 2) + Math.pow(pathData.endY - pathData.startY, 2));
                this.ctx.arc(pathData.startX, pathData.startY, radius, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (pathData.tool === 'line') {
                this.ctx.moveTo(pathData.startX, pathData.startY);
                this.ctx.lineTo(pathData.endX, pathData.endY);
                this.ctx.stroke();
            }
        }
        
        // Reset composite operation to default
        this.ctx.globalCompositeOperation = 'source-over';
    }
    
    // Draw path from another user (real-time)
    drawRemotePath(pathData) {
        this.drawPath(pathData);
        this.paths.push(pathData);
    }
    
    // Undo last action
    undo() {
        if (this.undoStack.length === 0) return null;
        
        const pathToUndo = this.undoStack.pop();
        this.redoStack.push(pathToUndo);
        
        // Remove the path from paths array
        const index = this.paths.findIndex(p => p.id === pathToUndo.id);
        if (index !== -1) {
            this.paths.splice(index, 1);
        }
        
        // Redraw everything
        this.redraw();
        
        return pathToUndo;
    }
    
    // Redo last undone action
    redo() {
        if (this.redoStack.length === 0) return null;
        
        const pathToRedo = this.redoStack.pop();
        this.undoStack.push(pathToRedo);
        
        // Add the path back to paths array
        this.paths.push(pathToRedo);
        
        // Redraw the path
        this.drawPath(pathToRedo);
        
        return pathToRedo;
    }
    
    // Clear canvas
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.paths = [];
        this.undoStack = [];
        this.redoStack = [];
    }
    
    // Get current paths for synchronization
    getPaths() {
        return [...this.paths];
    }
    
    // Set paths from server
    setPaths(paths) {
        this.paths = [...paths];
        this.undoStack = [...paths];
        this.redoStack = [];
        this.redraw();
    }
}