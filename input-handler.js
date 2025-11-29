// input-handler.js
// Handles mouse, touch, and keyboard input

const InputHandler = {
    isPanningMap: false,

    /**
     * Get canvas coordinates from mouse/touch event
     */
    getCoords(e) {
        const r = UI.drawingArea.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        
        return {
            x: Math.floor((cx - r.left) / State.zoom),
            y: Math.floor((cy - r.top) / State.zoom)
        };
    },

    /**
     * Handle drawing start
     */
    onDrawStart(e) {
        if (e.cancelable && e.target === UI.previewLayer) {
            e.preventDefault();
        }
        
        const { x, y } = this.getCoords(e);
        if (x >= 0 && x < State.width && y >= 0 && y < State.height) {
            ToolManager.start(x, y);
        }
    },

    /**
     * Handle drawing move
     */
    onDrawMove(e) {
        const { x, y } = this.getCoords(e);
        
        if (x >= 0 && x < State.width && y >= 0 && y < State.height) {
            UI.coords.textContent = `${x}, ${y}`;
            
            if (State.isDrawing) {
                ToolManager.move(x, y);
            }
        }
    },

    /**
     * Handle drawing end
     */
    onDrawEnd(e) {
        if (!State.isDrawing) return;
        
        const { x, y } = this.getCoords(
            e.changedTouches ? { touches: e.changedTouches } : e
        );
        
        ToolManager.end(x, y);
    },

    /**
     * Handle mouse wheel zoom
     */
    onWheel(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) {
            e.preventDefault();
            
            const delta = e.deltaY > 0 ? -2 : 2;
            let newZoom = State.zoom + delta;
            newZoom = Math.min(Math.max(newZoom, 1), 60);
            
            State.zoom = newZoom;
            CanvasManager.updateZoom();
        }
    },

    /**
     * Handle minimap panning
     */
    onMinimapPanStart(e) {
        this.isPanningMap = true;
        this.onMinimapPan(e);
    },

    /**
     * Handle minimap pan movement
     */
    onMinimapPan(e) {
        if (!this.isPanningMap) return;
        
        const r = UI.previewContainer.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        
        const px = (cx - r.left) / r.width;
        const py = (cy - r.top) / r.height;
        
        UI.wrapper.scrollLeft = px * UI.drawingArea.offsetWidth - UI.wrapper.clientWidth / 2;
        UI.wrapper.scrollTop = py * UI.drawingArea.offsetHeight - UI.wrapper.clientHeight / 2;
        
        CanvasManager.updateMinimap();
    },

    /**
     * Handle minimap pan end
     */
    onMinimapPanEnd() {
        this.isPanningMap = false;
    },

    /**
     * Handle keyboard shortcuts
     */
    onKeyDown(e) {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT') return;
        
        const key = e.key.toLowerCase();
        
        // Tool shortcuts
        const toolShortcuts = {
            'p': 'pencil',
            'b': 'brush',
            'e': 'eraser',
            'f': 'bucket',
            'i': 'eyedropper',
            'l': 'stroke',
            'r': 'rect',
            'c': 'circle',
            'm': 'move',
            'd': 'dither'
        };
        
        if (toolShortcuts[key]) {
            ToolManager.setTool(toolShortcuts[key]);
            e.preventDefault();
            return;
        }
        
        // Animation shortcuts
        if (key === ' ') {
            e.preventDefault();
            State.isPlaying ? AnimationManager.stop() : AnimationManager.play();
        } else if (key === 'arrowright') {
            e.preventDefault();
            AnimationManager.switchFrame(State.currentFrameIndex + 1);
        } else if (key === 'arrowleft') {
            e.preventDefault();
            AnimationManager.switchFrame(State.currentFrameIndex - 1);
        }
        
        // Save/Load shortcuts
        if (e.ctrlKey || e.metaKey) {
            if (key === 's') {
                e.preventDefault();
                FileManager.saveProject();
            } else if (key === 'o') {
                e.preventDefault();
                FileManager.loadProject();
            }
        }
    },

    /**
     * Initialize all event listeners
     */
    init() {
        // Drawing events
        UI.previewLayer.addEventListener('mousedown', (e) => this.onDrawStart(e));
        window.addEventListener('mousemove', (e) => this.onDrawMove(e));
        window.addEventListener('mouseup', (e) => this.onDrawEnd(e));
        
        UI.previewLayer.addEventListener('touchstart', (e) => this.onDrawStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this.onDrawMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this.onDrawEnd(e));

        // Zoom
        UI.wrapper.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        UI.wrapper.addEventListener('scroll', () => CanvasManager.updateMinimap());

        // Minimap panning
        UI.previewContainer.addEventListener('mousedown', (e) => this.onMinimapPanStart(e));
        window.addEventListener('mousemove', (e) => this.onMinimapPan(e));
        window.addEventListener('mouseup', () => this.onMinimapPanEnd());

        // Keyboard
        window.addEventListener('keydown', (e) => this.onKeyDown(e));

        // UI Controls
        UI.toolBtns.forEach(btn => {
            btn.addEventListener('click', () => ToolManager.setTool(btn.dataset.tool));
        });

        UI.colorPicker.addEventListener('input', (e) => {
            State.color = e.target.value;
            UI.colorHex.textContent = e.target.value;
        });

        UI.opacitySlider.addEventListener('input', (e) => {
            State.opacity = parseFloat(e.target.value);
        });

        UI.brushSizeSlider.addEventListener('input', (e) => {
            State.brushSize = parseInt(e.target.value);
            UI.brushSizeDisplay.textContent = State.brushSize;
        });

        UI.fpsSlider.addEventListener('input', (e) => {
            AnimationManager.updateFPS(parseInt(e.target.value));
        });

        // Layer controls
        UI.addLayerBtn.addEventListener('click', () => LayerManager.addLayer());

        // Frame controls
        UI.addFrameBtn.addEventListener('click', () => AnimationManager.addFrame());
        UI.duplicateFrameBtn.addEventListener('click', () => AnimationManager.duplicateFrame());
        UI.deleteFrameBtn.addEventListener('click', () => AnimationManager.deleteFrame());

        // Animation controls
        UI.playBtn.addEventListener('click', () => AnimationManager.play());
        UI.stopBtn.addEventListener('click', () => AnimationManager.stop());

        // File operations
        UI.resizeBtn.addEventListener('click', () => {
            const w = parseInt(UI.widthInput.value);
            const h = parseInt(UI.heightInput.value);
            if (confirm('Create new canvas? Unsaved work will be lost.')) {
                CanvasManager.init(w, h);
            }
        });

        UI.downloadSheetBtn.addEventListener('click', () => AnimationManager.exportSpritesheet());
        UI.saveProjectBtn.addEventListener('click', () => FileManager.saveProject());
        UI.loadProjectBtn.addEventListener('click', () => FileManager.loadProject());
        UI.fileInput.addEventListener('change', (e) => FileManager.handleFileLoad(e));
    }
};
