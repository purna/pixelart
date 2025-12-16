// file-manager.js
// Handles project saving, loading, and export

const FileManager = {
    /**
     * Save project as JSON file
     */
    saveProject() {
        try {
            console.log('Starting project save...');

            // Convert ImageData to base64 for JSON serialization
            const serializeFrames = State.frames.map(frame => ({
                layers: frame.layers.map(layer => ({
                    name: layer.name,
                    visible: layer.visible,
                    data: this.imageDataToBase64(layer.data)
                }))
            }));

            const project = {
                version: '3.2',
                width: State.width,
                height: State.height,
                frames: serializeFrames,
                fps: State.fps,
                timestamp: new Date().toISOString(),
                brushPresets: this.getBrushPresetsForExport()
            };

            const json = JSON.stringify(project, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.download = `pixel-art-${Date.now()}.json`;
            link.href = url;
            link.click();

            URL.revokeObjectURL(url);
            console.log('Project saved successfully!');

            // Show success notification
            if (typeof Notifications !== 'undefined') {
                const notifications = new Notifications();
                notifications.success('Project saved successfully!');
            }

            // Save to database as well
            this.saveProjectToDatabase(project);

        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save project: ' + error.message);

            // Show error notification
            if (typeof Notifications !== 'undefined') {
                const notifications = new Notifications();
                notifications.error('Failed to save project: ' + error.message);
            }
        }
    },

    /**
     * Save project to database
     */
    async saveProjectToDatabase(project) {
        try {
            // Check if database manager is available
            if (typeof DatabaseManager !== 'undefined' && typeof app !== 'undefined') {
                // Create database manager instance if it doesn't exist
                if (!app.databaseManager) {
                    app.databaseManager = new DatabaseManager(app);
                }

                // Save to database
                await app.databaseManager.saveProjectToDatabase(project);
                console.log('Project saved to database successfully!');
            } else {
                console.log('DatabaseManager not available, skipping database save');
            }
        } catch (error) {
            console.error('Database save failed:', error);
            // Don't show error to user as the main file save already succeeded
        }
    },

    /**
     * Load project from JSON file
     */
    loadProject() {
        console.log('Opening file dialog for project load...');
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

        // Import brush presets if available
        if (project.brushPresets) {
            this.importBrushPresets(project.brushPresets);
        }

        alert('Project loaded successfully!');

        // Show success notification
        if (typeof Notifications !== 'undefined') {
            const notifications = new Notifications();
            notifications.success('Project loaded successfully!');
        }
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
     * Convert base64 string to ImageData (synchronous version for loading)
     */
    base64ToImageData(base64, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.src = base64;
        
        // Force synchronous load (works for data URLs)
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, width, height);
    },

    /**
     * Export spritesheet as PNG
     */
    exportSpritesheet() {
        try {
            console.log('Starting spritesheet export...');
            
            const canvas = document.createElement('canvas');
            canvas.width = State.width * State.frames.length;
            canvas.height = State.height;
            const ctx = canvas.getContext('2d');
            
            State.frames.forEach((frame, i) => {
                frame.layers.forEach(layer => {
                    if (layer.visible) {
                        const temp = document.createElement('canvas');
                        temp.width = State.width;
                        temp.height = State.height;
                        temp.getContext('2d').putImageData(layer.data, 0, 0);
                        ctx.drawImage(temp, i * State.width, 0);
                    }
                });
            });
            
            const link = document.createElement('a');
            link.download = `spritesheet-${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
            
            console.log('Spritesheet exported successfully!');

            // Show success notification
            if (typeof Notifications !== 'undefined') {
                const notifications = new Notifications();
                notifications.success('Spritesheet exported successfully!');
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export spritesheet: ' + error.message);

            // Show error notification
            if (typeof Notifications !== 'undefined') {
                const notifications = new Notifications();
                notifications.error('Failed to export spritesheet: ' + error.message);
            }
        }
    },
    /**
     * Get brush presets for export
     */
    getBrushPresetsForExport() {
        try {
            // Check if BrushPresetsManager is available and has presets
            if (typeof BrushPresetsManager !== 'undefined' && BrushPresetsManager.presets) {
                return BrushPresetsManager.presets;
            }
            
            // If BrushPresetsManager is not available, try to get from localStorage
            try {
                const savedPresets = localStorage.getItem('pixelArtBrushPresets');
                if (savedPresets) {
                    return JSON.parse(savedPresets);
                }
            } catch (error) {
                console.error('Error loading presets from localStorage:', error);
            }
            
            return [];
        } catch (error) {
            console.error('Error getting brush presets for export:', error);
            return [];
        }
    },

    /**
     * Import brush presets from project
     */
    importBrushPresets(brushPresets) {
        if (brushPresets && Array.isArray(brushPresets) && brushPresets.length > 0) {
            try {
                // Check if BrushPresetsManager is available
                if (typeof BrushPresetsManager !== 'undefined') {
                    BrushPresetsManager.presets = brushPresets;
                    BrushPresetsManager.savePresets();
                    BrushPresetsManager.renderPresetsList();
                    console.log('Brush presets imported successfully:', brushPresets.length);
                } else {
                    // Store in localStorage as fallback
                    localStorage.setItem('pixelArtBrushPresets', JSON.stringify(brushPresets));
                    console.log('Brush presets saved to localStorage:', brushPresets.length);
                }
            } catch (error) {
                console.error('Error importing brush presets:', error);
            }
        }
    }
};
