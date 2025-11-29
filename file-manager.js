// file-manager.js
// Handles project saving, loading, and export

const FileManager = {
    /**
     * Save project as JSON file
     */
    saveProject() {
        // Convert ImageData to base64 for JSON serialization
        const serializeFrames = State.frames.map(frame => ({
            layers: frame.layers.map(layer => ({
                name: layer.name,
                visible: layer.visible,
                data: this.imageDataToBase64(layer.data)
            }))
        }));

        const project = {
            version: '3.1',
            width: State.width,
            height: State.height,
            frames: serializeFrames,
            fps: State.fps,
            timestamp: new Date().toISOString()
        };

        const json = JSON.stringify(project, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `pixel-art-${Date.now()}.json`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
    },

    /**
     * Load project from JSON file
     */
    loadProject() {
        UI.fileInput.click();
    },

    /**
     * Handle file input change
     */
    handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result);
                this.importProject(project);
            } catch (error) {
                alert('Error loading project: ' + error.message);
                console.error(error);
            }
        };
        reader.readAsText(file);
        
        // Reset input so same file can be loaded again
        event.target.value = '';
    },

    /**
     * Import project data
     */
    importProject(project) {
        if (!project.version || !project.width || !project.height || !project.frames) {
            alert('Invalid project file');
            return;
        }

        // Set dimensions
        State.width = project.width;
        State.height = project.height;
        State.fps = project.fps || Config.defaultFPS;

        // Restore canvases
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

        // Deserialize frames
        State.frames = project.frames.map(frame => ({
            layers: frame.layers.map(layer => ({
                name: layer.name,
                visible: layer.visible,
                data: this.base64ToImageData(layer.data, State.width, State.height)
            }))
        }));

        State.currentFrameIndex = 0;
        State.activeLayerIndex = 0;

        // Update UI
        UI.widthInput.value = State.width;
        UI.heightInput.value = State.height;
        UI.fpsSlider.value = State.fps;
        UI.fpsDisplay.textContent = `${State.fps} FPS`;

        CanvasManager.updateZoom(true);
        CanvasManager.render();
        AnimationManager.renderTimeline();
        LayerManager.renderList();

        alert('Project loaded successfully!');
    },

    /**
     * Convert ImageData to base64 string
     */
    imageDataToBase64(imageData) {
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL();
    },

    /**
     * Convert base64 string to ImageData
     */
    base64ToImageData(base64, width, height) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(ctx.getImageData(0, 0, width, height));
            };
            img.src = base64;
        });
    },

    /**
     * Synchronous version for loading (blocking)
     */
    base64ToImageData(base64, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.src = base64;
        
        // Force synchronous load (not ideal but works for data URLs)
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, width, height);
    }
};
