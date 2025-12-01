// tilemap-manager.js
// Manages tilemap preview and seamless grid drawing

const TilemapManager = {
    activeSquares: new Set(),
    isSeamlessModeEnabled: false,
    seamlessCanvases: [], // Array of 9 canvas elements for seamless grid
    seamlessContexts: [], // Array of 9 contexts
    isDrawing: false,
    currentBrush: null,
    TILE_DIM: 32, // Will be updated from actual canvas size
    
    /**
     * Initialize the tilemap manager
     */
    init() {
        // Check if UI elements are ready
        if (!UI.compositionCanvas || !document.getElementById('tilemapGrid')) {
            console.warn('TilemapManager: UI elements not ready, deferring initialization');
            return;
        }
        
        this.setupTilemapGrid();
        this.setupSeamlessGrid();
        this.attachEventListeners();
    },

    /**
     * Setup the original 3x3 tilemap preview grid
     */
    setupTilemapGrid() {
        const grid = document.getElementById('tilemapGrid');
        if (!grid) return;

        grid.innerHTML = '';

        // Create 3x3 grid
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const square = document.createElement('div');
                square.className = 'tilemap-square';
                square.dataset.row = r;
                square.dataset.col = c;

                // Center square (1,1)
                if (r === 1 && c === 1) {
                    square.classList.add('center');
                }

                // Create canvas for this square
                const canvas = document.createElement('canvas');
                const canvasSize = Math.min(State.width, State.height);
                canvas.width = canvasSize;
                canvas.height = canvasSize;
                square.appendChild(canvas);

                square.addEventListener('click', () => this.toggleSquare(r, c));
                grid.appendChild(square);
            }
        }

        this.refresh();
    },

    /**
     * Setup the seamless 3x3 grid overlay on the main canvas
     */
    setupSeamlessGrid() {
        // Check if overlay already exists
        let overlay = document.getElementById('seamlessGridOverlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'seamlessGridOverlay';
            overlay.className = 'seamless-grid-overlay';
            
            // Create 9 cells for the 3x3 grid
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'seamless-grid-cell';
                    cell.dataset.gridR = r;
                    cell.dataset.gridC = c;
                    
                    // Center cell (1,1) is the main canvas
                    if (r === 1 && c === 1) {
                        cell.classList.add('center');
                    }
                    
                    // Create canvas for this cell
                    const canvas = document.createElement('canvas');
                    canvas.width = State.width;
                    canvas.height = State.height;
                    cell.appendChild(canvas);
                    
                    overlay.appendChild(cell);
                }
            }
            
            // Insert overlay into drawing area
            const drawingArea = document.getElementById('drawing-area');
            if (drawingArea) {
                drawingArea.appendChild(overlay);
            }
        }

        // Store references to all canvases and contexts
        this.seamlessCanvases = [];
        this.seamlessContexts = [];
        
        const cells = overlay.querySelectorAll('.seamless-grid-cell');
        cells.forEach(cell => {
            const canvas = cell.querySelector('canvas');
            if (canvas) {
                this.seamlessCanvases.push(canvas);
                // Get context with willReadFrequently hint for better performance
                this.seamlessContexts.push(canvas.getContext('2d', { willReadFrequently: true }));
            }
        });
        
        this.updateSeamlessCanvasSizes();
    },

    /**
     * Update seamless canvas sizes when main canvas size changes
     */
    updateSeamlessCanvasSizes() {
        this.TILE_DIM = State.width; // Update tile dimension
        
        this.seamlessCanvases.forEach(canvas => {
            canvas.width = State.width;
            canvas.height = State.height;
        });
        
        if (this.isSeamlessModeEnabled) {
            this.updateAllSeamlessCanvases();
        }
    },

    /**
     * Attach event listeners for seamless mode and tilemap controls
     */
    attachEventListeners() {
        const toggleBtn = document.getElementById('toggleSeamlessModeBtn');
        const clearBtn = document.getElementById('clearTilemapBtn');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSeamlessMode());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }

        // Attach drawing handlers to seamless canvases
        this.attachSeamlessDrawingHandlers();
    },

    /**
     * Attach drawing event handlers to all seamless canvases
     */
    attachSeamlessDrawingHandlers() {
        const overlay = document.getElementById('seamlessGridOverlay');
        if (!overlay) return;

        const cells = overlay.querySelectorAll('.seamless-grid-cell');
        
        cells.forEach((cell, index) => {
            const canvas = cell.querySelector('canvas');
            if (!canvas) return;

            // Mouse events
            canvas.addEventListener('mousedown', (e) => this.handleSeamlessDrawStart(e, cell));
            canvas.addEventListener('mousemove', (e) => this.handleSeamlessDrawMove(e, cell));
            canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.handleSeamlessDrawStart(e, cell);
            });

            // Touch events
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleSeamlessDrawStart(e, cell);
            });
            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                this.handleSeamlessDrawMove(e, cell);
            });
        });

        // Global mouse/touch up events
        document.body.addEventListener('mouseup', () => this.handleSeamlessDrawEnd());
        document.body.addEventListener('touchend', () => this.handleSeamlessDrawEnd());
        document.body.addEventListener('touchcancel', () => this.handleSeamlessDrawEnd());
    },

    /**
     * Handle drawing start on seamless canvas
     */
    handleSeamlessDrawStart(e, cell) {
        if (!this.isSeamlessModeEnabled) return;

        // Determine brush type
        if (e.type === 'contextmenu' || e.button === 2) {
            this.currentBrush = 'rgba(255, 255, 255, 1)'; // Eraser
        } else {
            // Use current color and opacity from State
            const r = parseInt(State.color.slice(1, 3), 16);
            const g = parseInt(State.color.slice(3, 5), 16);
            const b = parseInt(State.color.slice(5, 7), 16);
            this.currentBrush = `rgba(${r}, ${g}, ${b}, ${State.opacity})`;
        }

        this.isDrawing = true;
        this.handleSeamlessDrawMove(e, cell);
    },

    /**
     * Handle drawing move on seamless canvas
     */
    handleSeamlessDrawMove(e, cell) {
        if (!this.isDrawing || !this.isSeamlessModeEnabled) return;

        const canvas = cell.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
        
        // Get mouse/touch position
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;
        
        if (!clientX || !clientY) return;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Convert to tile coordinates
        const zoom = State.zoom;
        const tileX = Math.floor(x / zoom);
        const tileY = Math.floor(y / zoom);

        if (tileX < 0 || tileX >= this.TILE_DIM || tileY < 0 || tileY >= this.TILE_DIM) return;

        // Calculate offset from center cell (1,1)
        const gridR = parseInt(cell.dataset.gridR);
        const gridC = parseInt(cell.dataset.gridC);
        const deltaX = (gridC - 1) * this.TILE_DIM;
        const deltaY = (gridR - 1) * this.TILE_DIM;

        // Calculate absolute tile coordinate
        const absTileX = tileX + deltaX;
        const absTileY = tileY + deltaY;

        // Draw with brush size
        const brushR = State.brushSize;
        
        for (let dx = -brushR; dx <= brushR; dx++) {
            for (let dy = -brushR; dy <= brushR; dy++) {
                const brushAbsX = absTileX + dx;
                const brushAbsY = absTileY + dy;

                // Wrap to main canvas coordinates
                let drawX = ((brushAbsX % this.TILE_DIM) + this.TILE_DIM) % this.TILE_DIM;
                let drawY = ((brushAbsY % this.TILE_DIM) + this.TILE_DIM) % this.TILE_DIM;

                // Draw on main canvas layer
                this.drawPixelOnMainCanvas(drawX, drawY);
            }
        }

        // Update all seamless canvases
        this.updateAllSeamlessCanvases();
    },

    /**
     * Handle drawing end
     */
    handleSeamlessDrawEnd() {
        if (this.isDrawing) {
            this.isDrawing = false;
            // Save state for undo/redo
            if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
                InputHandler.saveState();
            }
            // Update main canvas render
            CanvasManager.saveLayerChange();
        }
    },

    /**
     * Draw a single pixel on the main canvas at the current layer
     */
    drawPixelOnMainCanvas(x, y) {
        const layerData = CanvasManager.getCurrentLayerData();
        const index = (y * State.width + x) * 4;

        if (this.currentBrush === 'rgba(255, 255, 255, 1)') {
            // Eraser - set to transparent
            layerData.data[index] = 0;
            layerData.data[index + 1] = 0;
            layerData.data[index + 2] = 0;
            layerData.data[index + 3] = 0;
        } else {
            // Extract RGBA from current brush
            const match = this.currentBrush.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
            if (match) {
                const r = parseInt(match[1]);
                const g = parseInt(match[2]);
                const b = parseInt(match[3]);
                const a = match[4] ? parseFloat(match[4]) * 255 : 255;

                layerData.data[index] = r;
                layerData.data[index + 1] = g;
                layerData.data[index + 2] = b;
                layerData.data[index + 3] = a;
            }
        }
    },

    /**
     * Update all seamless canvases with the current main canvas content
     */
    updateAllSeamlessCanvases() {
        if (!UI.compositionCanvas) return;
        
        const sourceCtx = UI.compositionCanvas.getContext('2d');
        const imageData = sourceCtx.getImageData(0, 0, State.width, State.height);

        this.seamlessContexts.forEach(ctx => {
            ctx.putImageData(imageData, 0, 0);
        });
    },

    /**
     * Toggle seamless mode on/off
     */
    toggleSeamlessMode() {
        this.isSeamlessModeEnabled = !this.isSeamlessModeEnabled;
        
        const overlay = document.getElementById('seamlessGridOverlay');
        const toggleText = document.getElementById('toggleSeamlessModeText');
        
        if (overlay) {
            if (this.isSeamlessModeEnabled) {
                overlay.classList.add('enabled');
                if (toggleText) toggleText.textContent = 'Disable Seamless Grid';
                this.updateAllSeamlessCanvases();
                this.updateSeamlessGridVisibility();
            } else {
                overlay.classList.remove('enabled');
                if (toggleText) toggleText.textContent = 'Enable Seamless Grid';
            }
        }
        
        CanvasManager.updateZoom();
    },

    /**
     * Update visibility of seamless grid cells based on active tilemap squares
     */
    updateSeamlessGridVisibility() {
        const overlay = document.getElementById('seamlessGridOverlay');
        if (!overlay) return;

        const cells = overlay.querySelectorAll('.seamless-grid-cell');
        
        cells.forEach(cell => {
            const gridR = parseInt(cell.dataset.gridR);
            const gridC = parseInt(cell.dataset.gridC);
            
            // Center cell is always visible
            if (gridR === 1 && gridC === 1) {
                cell.style.display = 'block';
                return;
            }
            
            // Check if this position is active in tilemap
            const key = `${gridR}-${gridC}`;
            const isActive = this.activeSquares.has(key);
            
            cell.style.display = isActive ? 'block' : 'none';
        });
    },

    /**
     * Toggle a tilemap square
     */
    toggleSquare(row, col) {
        // Can't toggle center square
        if (row === 1 && col === 1) return;

        const key = `${row}-${col}`;
        const grid = document.getElementById('tilemapGrid');
        const square = grid.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        if (this.activeSquares.has(key)) {
            this.activeSquares.delete(key);
            square.classList.remove('active');
        } else {
            this.activeSquares.add(key);
            square.classList.add('active');
        }

        this.refresh();
        
        // Update seamless grid visibility if enabled
        if (this.isSeamlessModeEnabled) {
            this.updateSeamlessGridVisibility();
        }
    },

    /**
     * Clear all active squares
     */
    clearAll() {
        this.activeSquares.clear();
        const squares = document.querySelectorAll('.tilemap-square:not(.center)');
        squares.forEach(sq => sq.classList.remove('active'));
        this.refresh();
        
        if (this.isSeamlessModeEnabled) {
            this.updateSeamlessGridVisibility();
        }
    },

    /**
     * Refresh tilemap preview
     */
    refresh() {
        const grid = document.getElementById('tilemapGrid');
        if (!grid || !UI.compositionCanvas) {
            console.warn('TilemapManager.refresh: Required elements not available');
            return;
        }

        // Get context - willReadFrequently should be set in dom.js initialization
        const sourceCtx = UI.compositionCanvas.getContext('2d');
        if (!sourceCtx) {
            console.warn('TilemapManager.refresh: Could not get canvas context');
            return;
        }

        const imageData = sourceCtx.getImageData(0, 0, State.width, State.height);

        // Update all squares
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const square = grid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                const canvas = square?.querySelector('canvas');
                
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Draw white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Draw the image data
                    ctx.putImageData(imageData, 0, 0);
                }
            }
        }
    }
};

// Initialize when called from app.js (after DOM and other managers are ready)
// Don't auto-initialize on DOMContentLoaded since we need other managers first
if (typeof window !== 'undefined') {
    window.TilemapManager = TilemapManager;
}