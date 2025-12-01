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
        console.log('Drawing started at:', x, y, 'Tool:', State.tool, 'Color:', State.color);
        if (x >= 0 && x < State.width && y >= 0 && y < State.height) {
            ToolManager.start(x, y);
        } else {
            console.log('Draw coordinates out of bounds:', x, y);
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
            'd': 'dither',
            'x': 'mirror'
        };
        
        if (toolShortcuts[key]) {
            ToolManager.setTool(toolShortcuts[key]);
            e.preventDefault();
            return;
        }

        // Zoom shortcuts: Ctrl/Cmd + + / - / 0
        if (e.ctrlKey || e.metaKey) {
            let handled = false;
            let newZoom = State.zoom;
            
            if (e.key === '+' || e.key === '=') { // Cmd/Ctrl + +
                newZoom = State.zoom + 2;
                handled = true;
            } else if (e.key === '-') { // Cmd/Ctrl + -
                newZoom = State.zoom - 2;
                handled = true;
            } else if (e.key === '0') { // Cmd/Ctrl + 0
                newZoom = Config.defaultZoom;
                handled = true;
            }

            if (handled) {
                e.preventDefault();
                newZoom = Math.min(Math.max(newZoom, 1), 60);
                State.zoom = newZoom;
                CanvasManager.updateZoom();
                return;
            }
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
        
        // Zoom shortcuts
        if (key === '+' || key === '=') {
            e.preventDefault();
            CanvasManager.zoomIn();
        } else if (key === '-' || key === '_') {
            e.preventDefault();
            CanvasManager.zoomOut();
        } else if (key === '0') {
            e.preventDefault();
            CanvasManager.zoomReset();
        }
        
        // Save/Load shortcuts
        if (e.ctrlKey || e.metaKey) {
            if (key === 's') {
                e.preventDefault();
                FileManager.saveProject();
            } else if (key === 'o') {
                e.preventDefault();
                FileManager.loadProject();
            } else if (key === 'z') {
                e.preventDefault();
                this.undo();
            } else if (key === 'y') {
                e.preventDefault();
                this.redo();
            }
        }
    },

    /**
     * Initialize all event listeners
     */
    init() {
        // New Palette & Color Listeners 
        UI.saveColorBtn.addEventListener('click', () => {
            ColorManager.saveColorToPalette(State.color);
            this.showNotification('Color added to palette!', 'success');
        });
        
        // NEW: URL Import Listener
        UI.importPaletteUrlBtn.addEventListener('click', () => {
            const url = prompt("Enter the Coolors URL (e.g., https://coolors.co/daffed-9bf3f0-473198-4a0d67-adfc92):");
            if (url) {
                ColorManager.importPaletteFromUrl(url.trim());
                this.showNotification('Palette imported!', 'success');
            }
        });

        // Drawing events
        UI.previewLayer.addEventListener('mousedown', (e) => this.onDrawStart(e));
        window.addEventListener('mousemove', (e) => this.onDrawMove(e));
        window.addEventListener('mouseup', (e) => this.onDrawEnd(e));
        
        UI.previewLayer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onDrawStart(e);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (State.isDrawing) {
                e.preventDefault();
            }
            this.onDrawMove(e);
        }, { passive: false });
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

        // UI Controls - only for drawing tools (exclude layer/settings buttons)
        UI.toolBtns.forEach(btn => {
            if (btn.dataset.tool) { // Only attach to buttons with data-tool attribute
                btn.addEventListener('click', () => ToolManager.setTool(btn.dataset.tool));
            }
        });

        UI.colorPicker.addEventListener('input', (e) => {
            State.color = e.target.value;
            UI.colorHex.textContent = e.target.value;
        });

        UI.opacitySlider.addEventListener('input', (e) => {
            State.opacity = parseFloat(e.target.value) / 100;
            UI.opacityDisplay.textContent = e.target.value;
        });

        UI.brushSizeSlider.addEventListener('input', (e) => {
            State.brushSize = parseInt(e.target.value);
            UI.brushSizeDisplay.textContent = State.brushSize;
            this.updatePresetBrushButtons(State.brushSize);
        });

        // Preset brush size buttons
        document.querySelectorAll('.preset-brush-size').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const size = parseInt(e.target.dataset.size);
                State.brushSize = size;
                UI.brushSizeSlider.value = size;
                UI.brushSizeDisplay.textContent = size;
                this.updatePresetBrushButtons(size);
            });
        });

        // Initialize preset buttons on load
        this.updatePresetBrushButtons(State.brushSize);

        UI.fpsSlider.addEventListener('input', (e) => {
            AnimationManager.updateFPS(parseInt(e.target.value));
        });

        // Layer controls
        UI.addLayerBtn.addEventListener('click', () => {
            LayerManager.addLayer();
            this.showNotification('Layer added!', 'success');
        });

        // Frame controls
        UI.addFrameBtn.addEventListener('click', () => {
            AnimationManager.addFrame();
            this.showNotification('Frame added!', 'success');
        });
        UI.duplicateFrameBtn.addEventListener('click', () => {
            AnimationManager.duplicateFrame();
            this.showNotification('Frame duplicated!', 'success');
        });
        UI.deleteFrameBtn.addEventListener('click', () => {
            AnimationManager.deleteFrame();
            this.showNotification('Frame deleted!', 'error');
        });

        // Animation controls
        UI.playBtn.addEventListener('click', () => {
            AnimationManager.play();
            this.showNotification('Animation started!', 'info');
        });
        UI.stopBtn.addEventListener('click', () => {
            AnimationManager.stop();
            this.showNotification('Animation stopped!', 'info');
        });

        // Undo/Redo functionality
        UI.undoBtn.addEventListener('click', () => {
            this.undo();
            this.showNotification('Action undone!', 'info');
        });
        UI.redoBtn.addEventListener('click', () => {
            this.redo();
            this.showNotification('Action redone!', 'info');
        });
        
        // File operations
        UI.saveProjectBtn.addEventListener('click', () => {
            FileManager.saveProject();
            this.showNotification('Project saved successfully!', 'success');
        });
        UI.loadProjectBtn.addEventListener('click', () => {
            FileManager.loadProject();
            this.showNotification('Loading project...', 'info');
        });
        UI.downloadSheetBtn.addEventListener('click', () => {
            FileManager.exportSpritesheet();
            this.showNotification('Spritesheet exported!', 'success');
        });
        UI.fileInput.addEventListener('change', (e) => FileManager.handleFileLoad(e));

        // Zoom controls
        if (UI.zoomInBtn && UI.zoomOutBtn && UI.zoomResetBtn) {
            const zoomAction = (delta) => {
                let newZoom = State.zoom + delta;
                newZoom = Math.min(Math.max(newZoom, 1), 60);
                State.zoom = newZoom;
                CanvasManager.updateZoom();
            };
            
            UI.zoomInBtn.addEventListener('click', () => zoomAction(2));
            UI.zoomOutBtn.addEventListener('click', () => zoomAction(-2));
            UI.zoomResetBtn.addEventListener('click', () => {
                State.zoom = Config.defaultZoom;
                CanvasManager.updateZoom();
            });
        }

        // Mirror Axis Controls
        const mirrorInputs = [UI.mirrorX, UI.mirrorY, UI.mirrorBoth].filter(Boolean);
        mirrorInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                State.mirrorAxis = e.target.value;
                this.showNotification(`Mirror axis set to ${e.target.value.toUpperCase()} for next use.`, 'info');
            });
        });
        // Settings panel controls
        UI.applySettingsBtn.addEventListener('click', () => {
            const newWidth = parseInt(UI.widthInput.value);
            const newHeight = parseInt(UI.heightInput.value);
            if (newWidth >= 4 && newWidth <= 128 && newHeight >= 4 && newHeight <= 128) {
                CanvasManager.resizeCanvas(newWidth, newHeight);
                this.saveState();
                this.showNotification('Canvas resized successfully!', 'success');
            } else {
                this.showNotification('Invalid canvas size. Must be between 4 and 128.', 'error');
            }
        });
        UI.resetSettingsBtn.addEventListener('click', () => {
            this.resetSetting();
            this.showNotification('Settings reset to defaults!', 'info');
        });
        UI.exportSettingsBtn.addEventListener('click', () => {
            this.exportSettings();
            this.showNotification('Settings exported!', 'success');
        });

        // Settings checkboxes
        UI.showGrid.addEventListener('change', (e) => this.updateSetting('showGrid', e.target.checked));
        UI.snapToGrid.addEventListener('change', (e) => this.updateSetting('snapToGrid', e.target.checked));
        UI.showMinimap.addEventListener('change', (e) => this.updateSetting('showMinimap', e.target.checked));
        UI.darkMode.addEventListener('change', (e) => this.updateSetting('darkMode', e.target.checked));
        UI.autoSave.addEventListener('change', (e) => this.updateSetting('autoSave', e.target.checked));
        UI.showCoords.addEventListener('change', (e) => this.updateSetting('showCoords', e.target.checked));

        // Browser storage save/load functionality
        if (UI.saveToBrowserBtn) {
            UI.saveToBrowserBtn.addEventListener('click', () => {
                const state = this.getState();
                try {
                    localStorage.setItem('pixelAudioProject', JSON.stringify(state));
                    this.showNotification('Project saved to browser!', 'success');
                } catch (e) {
                    console.error('Failed to save project:', e);
                    this.showNotification('Failed to save project to browser', 'error');
                }
            });
        }

        if (UI.loadFromBrowserBtn) {
            UI.loadFromBrowserBtn.addEventListener('click', () => {
                const saved = localStorage.getItem('pixelAudioProject');
                if (saved) {
                    try {
                        const state = JSON.parse(saved);
                        this.setState(state);
                        this.showNotification('Project loaded from browser!', 'success');
                    } catch (e) {
                        console.error('Failed to load project:', e);
                        this.showNotification('Failed to load project from browser', 'error');
                    }
                } else {
                    this.showNotification('No saved project found in browser', 'info');
                }
            });
        }

        // Create global app object for compatibility
        window.app = {
            getState: () => this.getState(),
            setState: (state) => this.setState(state),
            showNotification: (message, type) => this.showNotification(message, type),
            hideNotification: () => this.hideNotification(),
            forceHideAllNotifications: () => this.forceHideAllNotifications()
        };
    },

    /**
     * Save current state to history
     */
    saveState() {
        // Remove any redo states when new action is performed
        State.history = State.history.slice(0, State.historyIndex + 1);
        
        // Create a deep copy of the current frame state
        const currentFrame = State.frames[State.currentFrameIndex];
        const historyState = {
            layers: currentFrame.layers.map(layer => ({
                name: layer.name,
                visible: layer.visible,
                data: new ImageData(new Uint8ClampedArray(layer.data.data), State.width, State.height)
            }))
        };
        
        State.history.push(historyState);
        
        // Limit history size
        if (State.history.length > State.maxHistory) {
            State.history.shift();
        } else {
            State.historyIndex++;
        }
    },

    /**
     * Undo last action
     */
    undo() {
        console.log('Undo clicked, historyIndex:', State.historyIndex, 'history length:', State.history.length);
        if (State.historyIndex > 0) {
            State.historyIndex--;
            this.restoreState(State.history[State.historyIndex]);
            console.log('Undo completed, new historyIndex:', State.historyIndex);
        } else {
            console.log('Nothing to undo');
        }
    },

    /**
     * Redo last undone action
     */
    redo() {
        console.log('Redo clicked, historyIndex:', State.historyIndex, 'history length:', State.history.length);
        if (State.historyIndex < State.history.length - 1) {
            State.historyIndex++;
            this.restoreState(State.history[State.historyIndex]);
            console.log('Redo completed, new historyIndex:', State.historyIndex);
        } else {
            console.log('Nothing to redo');
        }
    },

    /**
     * Restore state from history
     */
    restoreState(historyState) {
        const currentFrame = State.frames[State.currentFrameIndex];
        currentFrame.layers = historyState.layers.map(layer => ({
            name: layer.name,
            visible: layer.visible,
            data: new ImageData(new Uint8ClampedArray(layer.data.data), State.width, State.height)
        }));
        
        CanvasManager.render();
        LayerManager.renderList();
    },

    /**
     * Toggle layers panel visibility
     */
    toggleLayersPanel() {
        UI.sidePanel.classList.toggle('closed');
        const toggleIcon = document.getElementById('panel-toggle').querySelector('i');
        
        if (UI.sidePanel.classList.contains('closed')) {
            toggleIcon.className = 'fas fa-chevron-left';
            document.getElementById('panel-toggle').style.right = '0';
        } else {
            toggleIcon.className = 'fas fa-chevron-right';
            document.getElementById('panel-toggle').style.right = '280px';
        }
    },

    /**
     * Toggle settings panel visibility (new sliding panel)
     */
    toggleSettingsPanel() {
        const settingsPanel = document.getElementById('settings-panel-container');
        settingsPanel.classList.toggle('open');
    },

    /**
     * Update individual setting
     */
    updateSetting(key, value) {
        const settings = this.getStoredSettings();
        settings[key] = value;
        this.applySettings(settings);
        this.saveSettings(settings);
    },

    /**
     * Reset settings to defaults
     */
    resetSetting() {
        const defaultSettings = {
            showGrid: true,
            snapToGrid: false,
            showMinimap: true,
            darkMode: true,
            autoSave: false,
            showCoords: true
        };
        
        this.applySettings(defaultSettings);
        this.saveSettings(defaultSettings);
        this.loadSettings(); // Refresh UI
    },

    /**
     * Export settings to JSON
     */
    exportSettings() {
        const settings = this.getStoredSettings();
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pixelpro-settings.json';
        link.click();
        
        URL.revokeObjectURL(url);
    },

    /**
     * Load settings from localStorage and update UI
     */
    loadSettings() {
        const settings = this.getStoredSettings();
        console.log('Loading settings:', settings);
        
        // Update UI checkboxes
        UI.showGrid.checked = settings.showGrid;
        UI.snapToGrid.checked = settings.snapToGrid;
        UI.showMinimap.checked = settings.showMinimap;
        UI.darkMode.checked = settings.darkMode;
        UI.autoSave.checked = settings.autoSave;
        UI.showCoords.checked = settings.showCoords;
        
        console.log('Settings loaded, checkbox states updated. showMinimap checkbox is now:', UI.showMinimap.checked);
        
        // Apply settings to application
        this.applySettings(settings);
    },

    /**
     * Get stored settings from localStorage
     */
    getStoredSettings() {
        const defaultSettings = {
            showGrid: true,
            snapToGrid: false,
            showMinimap: true, // Ensure preview is visible by default
            darkMode: true,
            autoSave: false,
            showCoords: true
        };
        
        try {
            const stored = localStorage.getItem('pixelProSettings');
            const loadedSettings = stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
            console.log('Retrieved settings from localStorage:', loadedSettings);
            return loadedSettings;
        } catch (e) {
            console.warn('Failed to load settings:', e);
            console.log('Using default settings:', defaultSettings);
            return defaultSettings;
        }
    },

    /**
     * Save settings to localStorage
     */
    saveSettings(settings) {
        try {
            localStorage.setItem('pixelProSettings', JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    },

    /**
     * Apply settings to the application
     */
    applySettings(settings) {
        // Grid visibility
        if (settings.showGrid !== undefined) {
            const gridOverlay = document.getElementById('grid-overlay');
            if (gridOverlay) {
                gridOverlay.style.display = settings.showGrid ? 'block' : 'none';
            }
        }

        // Minimap visibility
        if (settings.showMinimap !== undefined) {
            const minimap = document.getElementById('preview-container');
            if (minimap) {
                minimap.style.display = settings.showMinimap ? 'flex' : 'none';
                console.log('Preview container visibility set to:', minimap.style.display, '(showMinimap:', settings.showMinimap + ')');
            } else {
                console.warn('Preview container element not found when applying settings');
            }
        } else {
            console.warn('showMinimap setting is undefined');
        }

        // Coordinates visibility
        if (settings.showCoords !== undefined) {
            const coords = document.querySelector('.zoom-overlay');
            if (coords) {
                coords.style.display = settings.showCoords ? 'block' : 'none';
            }
        }

        // Snap to grid functionality would be implemented in the drawing logic
        // Auto-save functionality would be implemented with intervals
        // Dark mode would require CSS class changes
    },

    /**
     * Get current application state for saving
     */
    getState() {
        return {
            width: State.width,
            height: State.height,
            zoom: State.zoom,
            color: State.color,
            opacity: State.opacity,
            tool: State.tool,
            brushSize: State.brushSize,
            frames: State.frames,
            currentFrameIndex: State.currentFrameIndex,
            activeLayerIndex: State.activeLayerIndex,
            fps: State.fps,
            recentColors: State.recentColors,
            currentPalette: State.currentPalette
        };
    },

    /**
     * Set application state from loaded data
     */
    setState(state) {
        if (!state) return;
        
        // Update basic properties
        State.width = state.width;
        State.height = state.height;
        State.zoom = state.zoom;
        State.color = state.color;
        State.opacity = state.opacity;
        State.tool = state.tool;
        State.brushSize = state.brushSize;
        State.frames = state.frames;
        State.currentFrameIndex = state.currentFrameIndex || 0;
        State.activeLayerIndex = state.activeLayerIndex || 0;
        State.fps = state.fps;
        State.recentColors = state.recentColors || State.recentColors;
        State.currentPalette = state.currentPalette || State.currentPalette;
        
        // Update canvas size and re-render
        CanvasManager.resizeCanvas(State.width, State.height);
        CanvasManager.render();
        LayerManager.renderList();
        AnimationManager.renderTimeline();
        ColorManager.render();
        
        // Update UI elements
        UI.colorPicker.value = State.color;
        UI.colorHex.value = State.color;
        UI.opacitySlider.value = Math.floor(State.opacity * 100);
        UI.opacityDisplay.textContent = Math.floor(State.opacity * 100);
        UI.brushSizeSlider.value = State.brushSize;
        UI.brushSizeDisplay.textContent = State.brushSize;
        UI.fpsSlider.value = State.fps;
        UI.fpsDisplay.textContent = State.fps;
        
        // Save state for undo/redo
        this.saveState();
    },

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '4px';
        notification.style.color = '#fff';
        notification.style.fontSize = '12px';
        notification.style.fontWeight = 'bold';
        notification.style.zIndex = '10000';
        notification.style.border = '1px solid rgba(255,255,255,0.2)';
        notification.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        notification.style.transition = 'all 0.3s ease';
        notification.style.transform = 'translateY(-20px)';
        notification.style.opacity = '0';

        const colors = { success: '#00ff41', error: '#ff006e', info: '#00d9ff' };
        notification.style.backgroundColor = '#1a1a2e';
        notification.style.borderLeft = `4px solid ${colors[type] || colors.info}`;

        document.body.appendChild(notification);

        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });

        // Auto remove after 3 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 3000);
    },

    /**
     * Hide/remove notification manually
     */
    hideNotification() {
        const notification = document.querySelector('.notification');
        if (notification) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    },

    /**
     * Force hide all notifications (for debugging)
     */
    forceHideAllNotifications() {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => {
            notification.remove();
        });
    },

    /**
     * Update preset brush size buttons visual state
     */
    updatePresetBrushButtons(currentSize) {
        document.querySelectorAll('.preset-brush-size').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.size) === currentSize);
        });
    }
};