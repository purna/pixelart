// canvas-manager.js
// Handles canvas initialization, rendering, and zoom

const CanvasManager = {
    /**
     * Initialize or reset the canvas with given dimensions
     */
    init(w, h) {
        State.width = Math.min(Math.max(w, Config.minSize), Config.maxSize);
        State.height = Math.min(Math.max(h, Config.minSize), Config.maxSize);
        
        // Set canvas dimensions
        [UI.compositionCanvas, UI.previewLayer].forEach(c => {
            c.width = State.width;
            c.height = State.height;
        });
        
        State.offscreenCanvas.width = State.width;
        State.offscreenCanvas.height = State.height;
        State.layerCanvas.width = State.width;
        State.layerCanvas.height = State.height;
        UI.previewCanvas.width = State.width;
        UI.previewCanvas.height = State.height;

        // Initialize with one frame and one layer
        State.frames = [{ layers: [this.createLayer('Layer 1')] }];
        State.currentFrameIndex = 0;
        State.activeLayerIndex = 0;

        this.updateZoom(true);
        this.render();
        AnimationManager.renderTimeline();
        LayerManager.renderList();
        
        UI.widthInput.value = State.width;
        UI.heightInput.value = State.height;
    },

    /**
     * Create a new empty layer
     */
    createLayer(name = 'New Layer') {
        return {
            name: name,
            visible: true,
            data: new ImageData(State.width, State.height)
        };
    },

    /**
     * Update canvas zoom and viewport
     */
    updateZoom(center = false) {
        const w = State.width * State.zoom;
        const h = State.height * State.zoom;
        
        UI.drawingArea.style.width = `${w}px`;
        UI.drawingArea.style.height = `${h}px`;
        
        [UI.compositionCanvas, UI.previewLayer, UI.gridOverlay].forEach(el => {
            el.style.width = '100%';
            el.style.height = '100%';
        });

        // Update grid
        UI.gridOverlay.style.backgroundSize = `${State.zoom}px ${State.zoom}px`;
        UI.gridOverlay.style.backgroundImage = State.zoom > 4 ? 
            `linear-gradient(to right, rgba(128, 128, 128, 0.3) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(128, 128, 128, 0.3) 1px, transparent 1px)` : 'none';

        const percentage = Math.round(State.zoom * 10);
        UI.zoomDisplay.textContent = `${percentage}%`;
        if (UI.zoomPercentage) {
            UI.zoomPercentage.textContent = `${percentage}%`;
        }
        
        if (center) {
            UI.wrapper.scrollTo(
                (w - UI.wrapper.clientWidth) / 2,
                (h - UI.wrapper.clientHeight) / 2
            );
        }
        
        this.updateMinimap();
    },

    /**
     * Zoom in
     */
    zoomIn() {
        console.log('Zoom In clicked, current zoom:', State.zoom);
        State.zoom = Math.min(State.zoom + 2, 60);
        this.updateZoom();
        console.log('New zoom:', State.zoom);
    },

    /**
     * Zoom out
     */
    zoomOut() {
        console.log('Zoom Out clicked, current zoom:', State.zoom);
        State.zoom = Math.max(State.zoom - 2, 1);
        this.updateZoom();
        console.log('New zoom:', State.zoom);
    },

    /**
     * Reset zoom to fit canvas nicely
     */
    zoomReset() {
        const zoom = 500 / Math.max(State.width, State.height);
        State.zoom = Math.max(Math.min(zoom, 50), 4);
        this.updateZoom(true);
    },
    
    /**
     * Update minimap overlay position
     */
    updateMinimap() {
        const wrap = UI.wrapper;
        const area = UI.drawingArea;
        
        const ratioX = wrap.clientWidth / area.offsetWidth;
        const ratioY = wrap.clientHeight / area.offsetHeight;
        
        if (ratioX < 1 || ratioY < 1) {
            UI.minimapOverlay.style.display = 'block';
            const preW = UI.previewContainer.clientWidth;
            const preH = UI.previewContainer.clientHeight;
            
            const rectW = Math.min(1, ratioX) * preW;
            const rectH = Math.min(1, ratioY) * preH;
            
            const left = (wrap.scrollLeft / area.offsetWidth) * preW;
            const top = (wrap.scrollTop / area.offsetHeight) * preH;
            
            UI.minimapOverlay.style.width = `${rectW}px`;
            UI.minimapOverlay.style.height = `${rectH}px`;
            UI.minimapOverlay.style.left = `${left}px`;
            UI.minimapOverlay.style.top = `${top}px`;
        } else {
            UI.minimapOverlay.style.display = 'none';
        }
    },

    /**
     * Render current frame by compositing all visible layers
     */
    render() {
        ctx.clearRect(0, 0, State.width, State.height);
        
        const frame = State.frames[State.currentFrameIndex];
        if (!frame) return;

        frame.layers.forEach(layer => {
            if (layer.visible) {
                offCtx.clearRect(0, 0, State.width, State.height);
                offCtx.putImageData(layer.data, 0, 0);
                ctx.drawImage(State.offscreenCanvas, 0, 0);
            }
        });

        // Update preview window
        prevCtx.clearRect(0, 0, State.width, State.height);
        prevCtx.drawImage(UI.compositionCanvas, 0, 0);
    },
    
    /**
     * Get the current active layer's ImageData
     */
    getCurrentLayerData() {
        return State.frames[State.currentFrameIndex].layers[State.activeLayerIndex].data;
    },
    
    /**
     * Called after drawing operations to save and re-render
     */
    saveLayerChange() {
        AnimationManager.updateTimelineThumb(State.currentFrameIndex);
        this.render();
    },
    
    /**
     * Resize the canvas to new dimensions
     */
    resizeCanvas(newWidth, newHeight) {
        const oldWidth = State.width;
        const oldHeight = State.height;

        // Update state
        State.width = Math.min(Math.max(newWidth, Config.minSize), Config.maxSize);
        State.height = Math.min(Math.max(newHeight, Config.minSize), Config.maxSize);

        // Resize canvases
        [UI.compositionCanvas, UI.previewLayer].forEach(c => {
            c.width = State.width;
            c.height = State.height;
        });

        State.offscreenCanvas.width = State.width;
        State.offscreenCanvas.height = State.height;
        State.layerCanvas.width = State.width;
        State.layerCanvas.height = State.height;
        UI.previewCanvas.width = State.width;
        UI.previewCanvas.height = State.height;

        // Resize all layer data in all frames
        State.frames.forEach(frame => {
            frame.layers.forEach(layer => {
                const newData = new ImageData(State.width, State.height);
                const oldData = layer.data;

                // Copy pixels, cropping or padding as needed
                const copyWidth = Math.min(oldWidth, State.width);
                const copyHeight = Math.min(oldHeight, State.height);

                for (let y = 0; y < copyHeight; y++) {
                    for (let x = 0; x < copyWidth; x++) {
                        const oldIndex = (y * oldWidth + x) * 4;
                        const newIndex = (y * State.width + x) * 4;

                        newData.data[newIndex] = oldData.data[oldIndex];     // R
                        newData.data[newIndex + 1] = oldData.data[oldIndex + 1]; // G
                        newData.data[newIndex + 2] = oldData.data[oldIndex + 2]; // B
                        newData.data[newIndex + 3] = oldData.data[oldIndex + 3]; // A
                    }
                }

                layer.data = newData;
            });
        });

        // Update UI
        UI.widthInput.value = State.width;
        UI.heightInput.value = State.height;

        this.updateZoom(true);
        this.render();
        AnimationManager.renderTimeline();
        LayerManager.renderList();
    },

    /**
     * Clear the preview layer (used for shape tools)
     */
    clearPreviewLayer() {
        pCtx.clearRect(0, 0, State.width, State.height);
    }
};
