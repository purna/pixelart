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
        console.log('Drawing started at:', x, y, 'Tool:', State.tool, 'Color:', State.color, 'isDrawing:', State.isDrawing);
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

        // NEW: Handle selection end for selection tools
        if (typeof ToolManager.endSelection === 'function' && State.tool && State.tool.startsWith('select-')) {
            ToolManager.endSelection(x, y);
        }
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
           'x': 'mirror',
           'K': 'lighten',
           'k': 'darken',
           '1': 'select-rect',
           '2': 'select-circle',
           '3': 'select-lasso'
       };
        
        if (toolShortcuts[key]) {
            const toolType = toolShortcuts[key];
            ToolManager.setTool(toolType);

            // Update the panel for the selected tool (same as button click)
            if (typeof UIManager !== 'undefined' && UIManager.updatePanelForTool) {
                UIManager.updatePanelForTool(toolType);
            }

            // Activate the unified panel and ensure it's visible (same as button click)
            const unifiedPanel = document.getElementById('unified-panel');
            const toolsTab = document.querySelector('.tab[data-content="unified-panel"]');
            const dropinsContainer = document.querySelector('.dropins-container');

            if (unifiedPanel) {
                unifiedPanel.classList.remove('hidden');
                unifiedPanel.classList.add('active');
            }
            if (toolsTab) {
                toolsTab.classList.add('active');
                // Remove active class from other tabs
                document.querySelectorAll('.tab').forEach(tab => {
                    if (tab !== toolsTab) {
                        tab.classList.remove('active');
                    }
                });
            }
            if (dropinsContainer) {
                dropinsContainer.classList.add('showing');
            }

            // Ensure the right panel sections are visible for drawing tools
            if (['pencil', 'brush', 'bucket', 'dither', 'stroke', 'rect', 'circle'].includes(toolType)) {
                const panelPreview = document.getElementById('panel-preview');
                const panelPalette = document.getElementById('panel-palette');
                const panelToolOptions = document.getElementById('panel-tool-options');

                if (panelPreview) panelPreview.classList.remove('hidden');
                if (panelPalette) panelPalette.classList.remove('hidden');
                if (panelToolOptions) panelToolOptions.classList.remove('hidden');
            }

            e.preventDefault();
            // Ensure eyedropper tool is ready to use immediately
            if (toolType === 'eyedropper') {
                State.isDrawing = false;
            }
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

        // Color history shortcuts (1-4)
        if (['1', '2', '3', '4'].includes(key)) {
            e.preventDefault();
            const colorIndex = parseInt(key) - 1;
            if (State.recentColors[colorIndex]) {
                State.color = State.recentColors[colorIndex];
                UI.colorPicker.value = State.recentColors[colorIndex];
                UI.colorHex.textContent = State.recentColors[colorIndex];

                // Update color history display
                if (typeof ColorManager !== 'undefined') {
                    ColorManager.updateColorHistoryDisplay();
                }

                // Show notification
                this.showNotification(`Selected color: ${State.recentColors[colorIndex]}`, 'info');
            }
        }

        // Onion skinning shortcut (Alt+O)
        if (e.altKey && key === 'o') {
            e.preventDefault();
            State.onionSkinEnabled = !State.onionSkinEnabled;
            const onionBtn = document.getElementById('onionBtn');
            if (onionBtn) {
                onionBtn.classList.toggle('active', State.onionSkinEnabled);
            }
            CanvasManager.render();
            this.showNotification(State.onionSkinEnabled ? 'Onion Skin Enabled' : 'Onion Skin Disabled', 'info');
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
            } else if (key === 'c') {
                e.preventDefault();
                if (typeof ToolManager !== 'undefined' && ToolManager.copySelection) {
                    ToolManager.copySelection();
                }
            } else if (key === 'v') {
                e.preventDefault();
                if (typeof ToolManager !== 'undefined' && ToolManager.pasteSelection) {
                    ToolManager.pasteSelection();
                }
            }
        }
    },

    /**
     * Initialize all event listeners
     */
    init() {
        // Section toggle functionality is now handled by right-panel-manager.js
        // this.setupSectionToggles();

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

        // Add event listeners for palette control buttons
        document.querySelectorAll('.palette-control-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                if (button.id === 'saveColorBtn') {
                    ColorManager.saveColorToPalette(State.color);
                    this.showNotification('Color added to palette!', 'success');
                } else if (button.id === 'importPaletteUrlBtn') {
                    const url = prompt("Enter the Coolors URL (e.g., https://coolors.co/daffed-9bf3f0-473198-4a0d67-adfc92):");
                    if (url) {
                        ColorManager.importPaletteFromUrl(url.trim());
                        this.showNotification('Palette imported!', 'success');
                    }
                }
            });
        });

        // Add event listeners for layer control buttons
        document.querySelectorAll('.layer-control-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                if (button.id === 'addLayerBtn') {
                    LayerManager.addLayer();
                    this.showNotification('Layer added!', 'success');
                }
            });
        });

        // Setup brightness control functionality
        this.setupBrightnessControls();

        // Setup brightness preset buttons
        // Setup brightness/contrast controls for contrast panel
        this.setupBrightnessContrastControls();
        this.setupBrightnessPresets();

        // Setup dither tool controls
        this.setupDitherControls();

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
                btn.addEventListener('click', (e) => {
                    // Don't interfere with menu parent clicks
                    if (btn.classList.contains('menu-parent')) {
                        return;
                    }
    
                    const toolType = btn.dataset.tool;
    
                    if (toolType === 'lighten') {
                        // Set lighten tool with lightening factor
                        State.brightnessFactor = 1.2; // Default lightening factor
                        ToolManager.setTool('lighten');
                        InputHandler.showNotification('Lighten tool activated (1.2x brightness)', 'success');
                    } else if (toolType === 'darken') {
                        // Set darken tool with darkening factor
                        State.brightnessFactor = 0.8; // Default darkening factor
                        ToolManager.setTool('darken');
                        InputHandler.showNotification('Darken tool activated (0.8x brightness)', 'success');
                    } else {
                        ToolManager.setTool(toolType);
                        // Ensure eyedropper tool is ready to use immediately
                        if (toolType === 'eyedropper') {
                            State.isDrawing = false;
                        }
                    }
    
                    // Update the panel for the selected tool
                    if (typeof UIManager !== 'undefined' && UIManager.updatePanelForTool) {
                        UIManager.updatePanelForTool(toolType);
                    }
    
                    // Activate the unified panel and ensure it's visible
                    const unifiedPanel = document.getElementById('unified-panel');
                    const toolsTab = document.querySelector('.tab[data-content="unified-panel"]');
                    const dropinsContainer = document.querySelector('.dropins-container');
    
                    if (unifiedPanel) {
                        unifiedPanel.classList.remove('hidden');
                        unifiedPanel.classList.add('active');
                    }
                    if (toolsTab) {
                        toolsTab.classList.add('active');
                        // Remove active class from other tabs
                        document.querySelectorAll('.tab').forEach(tab => {
                            if (tab !== toolsTab) {
                                tab.classList.remove('active');
                            }
                        });
                    }
                    if (dropinsContainer) {
                        dropinsContainer.classList.add('showing');
                    }
    
                    // Ensure the right panel sections are visible for drawing tools
                    if (['pencil', 'brush', 'bucket', 'dither', 'stroke', 'rect', 'circle'].includes(toolType)) {
                        const panelPreview = document.getElementById('panel-preview');
                        const panelPalette = document.getElementById('panel-palette');
                        const panelToolOptions = document.getElementById('panel-tool-options');
    
                        if (panelPreview) panelPreview.classList.remove('hidden');
                        if (panelPalette) panelPalette.classList.remove('hidden');
                        if (panelToolOptions) panelToolOptions.classList.remove('hidden');
                    }
    
                    // Only prevent default if we actually handled the click
                    // Don't stop propagation to allow normal button behavior
                    e.preventDefault();
                    // Don't stop propagation - allow normal event flow
                });
            }
        });

        // Handle submenu tool buttons (for popout menus)
        document.querySelectorAll('.tool-submenu .tool-btn').forEach(btn => {
            if (btn.dataset.action === 'tool' && btn.dataset.type) {
                btn.addEventListener('click', (e) => {
                    // Only stop propagation if we're actually clicking on a tool button
                    // Don't interfere with menu parent clicks
                    if (e.target === btn || e.target.closest('.tool-submenu .tool-btn') === btn) {
                        e.stopPropagation(); // Prevent event from bubbling to parent menu
                        const toolType = btn.dataset.type;
    
                        // Set the tool
                        ToolManager.setTool(toolType);
                        // Ensure eyedropper tool is ready to use immediately
                        if (toolType === 'eyedropper') {
                            State.isDrawing = false;
                        }
    
                        // Update the panel for the selected tool
                        if (typeof UIManager !== 'undefined' && UIManager.updatePanelForTool) {
                            UIManager.updatePanelForTool(toolType);
                        }
    
                        // Activate the unified panel and ensure it's visible
                        const unifiedPanel = document.getElementById('unified-panel');
                        const toolsTab = document.querySelector('.tab[data-content="unified-panel"]');
                        const dropinsContainer = document.querySelector('.dropins-container');
    
                        if (unifiedPanel) {
                            unifiedPanel.classList.remove('hidden');
                            unifiedPanel.classList.add('active');
                        }
                        if (toolsTab) {
                            toolsTab.classList.add('active');
                            // Remove active class from other tabs
                            document.querySelectorAll('.tab').forEach(tab => {
                                if (tab !== toolsTab) {
                                    tab.classList.remove('active');
                                }
                            });
                        }
                        if (dropinsContainer) {
                            dropinsContainer.classList.add('showing');
                        }
    
                        // Ensure the right panel sections are visible
                        const panelPreview = document.getElementById('panel-preview');
                        const panelPalette = document.getElementById('panel-palette');
                        const panelToolOptions = document.getElementById('panel-tool-options');
    
                        if (panelPreview) panelPreview.classList.remove('hidden');
                        if (panelPalette) panelPalette.classList.remove('hidden');
                        if (panelToolOptions) panelToolOptions.classList.remove('hidden');
    
                        // Close all submenus after selection with a slight delay
                        setTimeout(() => {
                            document.querySelectorAll('.tool-submenu').forEach(menu => {
                                menu.classList.remove('visible');
                                menu.classList.remove('persistent-submenu');
                            });
                            document.querySelectorAll('.tool-btn.menu-parent').forEach(parent => {
                                parent.classList.remove('persistent-menu-active');
                            });
                            activeMenuParent = null;
                        }, 100);
                    }
                });
            }
        });

        // Track which menu parent is currently active
        let activeMenuParent = null;
        let lastClickedMenu = null;
    
        // Handle menu parent click behavior (replacing hover with click)
        document.querySelectorAll('.tool-btn.menu-parent').forEach(menuParent => {
            menuParent.addEventListener('click', (e) => {
                const submenu = menuParent.querySelector('.tool-submenu');
                if (submenu) {
                    // Close any other open submenus first
                    document.querySelectorAll('.tool-submenu').forEach(otherSubmenu => {
                        if (otherSubmenu !== submenu) {
                            otherSubmenu.classList.remove('visible');
                            otherSubmenu.style.display = 'none';
                        }
                    });

                    // Remove active state from other menu parents
                    document.querySelectorAll('.tool-btn.menu-parent').forEach(otherParent => {
                        if (otherParent !== menuParent) {
                            otherParent.classList.remove('persistent-menu-active');
                            otherParent.classList.remove('active-menu');
                        }
                    });

                    // Toggle this submenu
                    const isCurrentlyVisible = submenu.classList.contains('visible');
                    if (isCurrentlyVisible) {
                        // Close the submenu
                        submenu.classList.remove('visible');
                        submenu.style.display = 'none';
                        menuParent.classList.remove('persistent-menu-active');
                        activeMenuParent = null;
                    } else {
                        // Open the submenu
                        const rect = menuParent.getBoundingClientRect();
                        submenu.style.setProperty('--submenu-top', `${rect.top + window.scrollY}px`);
                        submenu.classList.add('visible');
                        submenu.style.display = 'flex';
                        submenu.style.opacity = '1';

                        // Mark this as the active menu parent
                        activeMenuParent = menuParent;
                        menuParent.classList.add('persistent-menu-active');

                        // Track this as the last clicked menu and add green dot indicator
                        if (lastClickedMenu) {
                            lastClickedMenu.classList.remove('active-menu');
                        }
                        lastClickedMenu = menuParent;
                        menuParent.classList.add('active-menu');
                    }

                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        });
    
        // Handle clicks on submenu items
        document.querySelectorAll('.tool-submenu .tool-btn').forEach(submenuItem => {
            submenuItem.addEventListener('click', (e) => {
                // Close all submenus when a tool is selected
                document.querySelectorAll('.tool-submenu').forEach(submenu => {
                    submenu.classList.remove('visible');
                    submenu.style.display = 'none';
                });

                // Remove active state from all menu parents
                document.querySelectorAll('.tool-btn.menu-parent').forEach(parent => {
                    parent.classList.remove('persistent-menu-active');
                    parent.classList.remove('active-menu');
                });

                activeMenuParent = null;
                lastClickedMenu = null;

                // Don't prevent default or stop propagation to allow normal tool selection
            });
        });
    
        // Close submenus when clicking outside (but not on layer-related elements)
        document.addEventListener('click', (e) => {
            // Don't interfere with layer-related interactions
            if (e.target.closest('.layer-item') ||
                e.target.closest('.layer-folder-item') ||
                e.target.closest('.folder-header') ||
                e.target.closest('.folder-contents')) {
                return;
            }
            
            if (!e.target.closest('.tool-btn.menu-parent') && !e.target.closest('.tool-submenu')) {
                document.querySelectorAll('.tool-submenu').forEach(submenu => {
                    submenu.classList.remove('visible');
                    submenu.style.display = 'none';
                });
    
                document.querySelectorAll('.tool-btn.menu-parent').forEach(parent => {
                    parent.classList.remove('persistent-menu-active');
                });
    
                activeMenuParent = null;
            }
        });

        // No global click handler - handle specific UI elements directly
        // This approach from pixelTilemaps avoids interfering with normal page behavior

        UI.colorPicker.addEventListener('input', (e) => {
            State.color = e.target.value;
            UI.colorHex.textContent = e.target.value;
            // Add the new color to history/palette
            ColorManager.addToHistory(State.color);
            console.log('Color picker changed to:', State.color);
        });

        // Add event listener for hex input field
        UI.colorHex.addEventListener('input', (e) => {
            const hexValue = e.target.value;
            // Validate hex format
            if (/^#([0-9A-F]{3}){1,2}$/i.test(hexValue)) {
                State.color = hexValue;
                UI.colorPicker.value = hexValue;
                // Add the new color to history/palette
                ColorManager.addToHistory(State.color);
                console.log('Hex input changed to:', State.color);
            } else {
                console.log('Invalid hex color:', hexValue);
            }
        });

        // Add blur event listener for hex input field to handle completion
        UI.colorHex.addEventListener('blur', (e) => {
            const hexValue = e.target.value;
            // Try to normalize the hex value (add # if missing, expand shorthand)
            let normalizedHex = hexValue;
            if (normalizedHex && !normalizedHex.startsWith('#')) {
                normalizedHex = '#' + normalizedHex;
            }
            // Expand shorthand hex (e.g., #abc to #aabbcc)
            if (normalizedHex && normalizedHex.length === 4) {
                normalizedHex = '#' + normalizedHex[1] + normalizedHex[1] +
                               normalizedHex[2] + normalizedHex[2] +
                               normalizedHex[3] + normalizedHex[3];
            }
            // Validate and apply if valid
            if (/^#([0-9A-F]{3}){1,2}$/i.test(normalizedHex)) {
                State.color = normalizedHex;
                UI.colorPicker.value = normalizedHex;
                UI.colorHex.textContent = normalizedHex;
                // Add the new color to history/palette
                ColorManager.addToHistory(State.color);
                console.log('Hex input finalized to:', State.color);
            } else if (hexValue) {
                console.log('Invalid hex color after normalization:', hexValue);
                // Revert to previous valid color
                UI.colorHex.textContent = State.color;
            }
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

        UI.blurSlider.addEventListener('input', (e) => {
            State.brushBlur = parseInt(e.target.value);
            UI.blurDisplay.textContent = State.brushBlur;
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



        // Folder controls
        document.getElementById('add-group-btn')?.addEventListener('click', () => {
            LayerManager.addFolder('New Group');
        });

        document.getElementById('expand-all-btn')?.addEventListener('click', () => {
            LayerManager.expandCollapseAll(true);
        });

        document.getElementById('collapse-all-btn')?.addEventListener('click', () => {
            LayerManager.expandCollapseAll(false);
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

        // Onion skinning controls
        const onionBtn = document.getElementById('onionBtn');
        if (onionBtn) {
            onionBtn.addEventListener('click', () => {
                State.onionSkinEnabled = !State.onionSkinEnabled;
                onionBtn.classList.toggle('active', State.onionSkinEnabled);
                CanvasManager.render();
                this.showNotification(State.onionSkinEnabled ? 'Onion Skin Enabled' : 'Onion Skin Disabled', 'info');
            });

            // Initialize button state
            onionBtn.classList.toggle('active', State.onionSkinEnabled);
            onionBtn.title = 'Toggle Onion Skin (Alt+O)';
        }

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

        // Add specific handler for fill tool button to ensure it works
        const fillToolBtn = document.querySelector('.tool-btn[data-tool="bucket"]');
        if (fillToolBtn) {
            fillToolBtn.addEventListener('click', (e) => {
                console.log('Fill tool button clicked');
                ToolManager.setTool('bucket');
                State.isDrawing = false;
                e.preventDefault();
                e.stopPropagation();
            });
        }
        /*

        // Add event listeners for transform buttons
        if (UI.rotateBtn) {
            UI.rotateBtn.addEventListener('click', (e) => {
                console.log('Rotate button clicked');
                ToolManager.rotateCurrentLayer();
                e.preventDefault();
                e.stopPropagation();
            });
        }

        // Add event listener for move button in transform panel
        const transformMoveBtn = document.getElementById('moveBtn');
        if (transformMoveBtn && !transformMoveBtn.dataset.tool) {
            // Only add event listener if it's the transform panel move button (not the toolbar one)
            transformMoveBtn.addEventListener('click', (e) => {
                console.log('Transform move button clicked');
                ToolManager.setTool('move');
                e.preventDefault();
                e.stopPropagation();
            });
        }

        if (UI.flipBtn) {
            UI.flipBtn.addEventListener('click', (e) => {
                console.log('Flip button clicked');
                // Get the currently selected flip axis from the radio buttons
                const selectedFlipAxis = document.querySelector('input[name="mirror-axis"]:checked')?.value || 'x';
                ToolManager.flipCurrentLayer(selectedFlipAxis);
                e.preventDefault();
                e.stopPropagation();
            });
        }

        if (UI.alignCenterBtn) {
            UI.alignCenterBtn.addEventListener('click', (e) => {
                console.log('Align center button clicked');
                ToolManager.alignCurrentLayerToCenter();
                e.preventDefault();
                e.stopPropagation();
            });
        }
        */

        // Add specific handler for eyedropper tool button to ensure it works
        const eyedropperToolBtn = document.querySelector('.tool-btn[data-tool="eyedropper"]');
        if (eyedropperToolBtn) {
            eyedropperToolBtn.addEventListener('click', (e) => {
                console.log('Eyedropper tool button clicked');
                ToolManager.setTool('eyedropper');
                State.isDrawing = false;
                e.preventDefault();
                e.stopPropagation();
            });
        }
        
        // Add event listeners for rotate radio buttons to trigger rotation on every click
        const rotateRadioButtons = document.querySelectorAll('input[name="rotate"]');
        rotateRadioButtons.forEach(radio => {
            radio.addEventListener('click', (e) => {
                console.log('Rotate radio button clicked:', e.target.value);
                // Rotate the layer every time the button is clicked
                ToolManager.rotateCurrentLayer(e.target.value);
            });
        });
        
        /*
        // The mirror tool is now in the mirror-options panel

        // Add specific handler for mirror tool button to ensure it works
        const mirrorToolBtn = document.querySelector('.tool-btn[data-type="mirror"]');
        if (mirrorToolBtn) {
            mirrorToolBtn.addEventListener('click', (e) => {
                console.log('Mirror tool button clicked');
                // Get the currently selected mirror axis from the radio buttons
                const selectedMirrorAxis = document.querySelector('input[name="mirror-axis"]:checked')?.value || 'x';
                ToolManager.mirrorLayer();
                e.preventDefault();
                e.stopPropagation();
            });
        }
        

        // Mirror Axis Controls
        const mirrorInputs = [UI.mirrorNone, UI.mirrorX, UI.mirrorY, UI.mirrorBoth].filter(Boolean);
        mirrorInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                State.mirrorAxis = e.target.value;

                 // Update visual states for professional mirror options - only in mirror-options panel
                 document.querySelectorAll('#mirror-options .mirror-axis-option').forEach(option => {
                    option.classList.remove('checked');
                });

                 if (e.target.checked) {
                    e.target.closest('.mirror-axis-option').classList.add('checked');
                 }

                 const axisText = e.target.value === 'both' ? 'X and Y' : e.target.value === 'none' ? 'None' : e.target.value.toUpperCase();
                 this.showNotification(`Mirror axis set to ${axisText} for next use.`, 'info');
            });
        });

        */




        // Initialize mirror option states
        document.querySelectorAll('#mirror-options .mirror-axis-option').forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                option.classList.add('checked');
            }

            // Add event listener for mirror axis radio buttons
            if (radio) {
                radio.addEventListener('change', (e) => {
                    // Update visual states for mirror options
                    document.querySelectorAll('#mirror-options .mirror-axis-option').forEach(opt => {
                        opt.classList.remove('checked');
                    });

                    if (e.target.checked) {
                        e.target.closest('.mirror-axis-option').classList.add('checked');
                    }

                    // Update state
                    State.mirrorAxis = e.target.value;

                    // Show notification about the selected mirror axis
                    const axisText = e.target.value === 'both' ? 'X and Y' : e.target.value === 'none' ? 'None' : e.target.value.toUpperCase();
                    this.showNotification(`Mirror axis set to ${axisText} for next use.`, 'info');
                });
            }
        });

        // Initialize flip option states and add event listeners
        document.querySelectorAll('.flip-axis-container .mirror-axis-option').forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                option.classList.add('checked');
            }

            // Add click event listener for flip options to toggle flip behavior
            if (radio) {
                radio.addEventListener('click', (e) => {
                    // Flip the current layer immediately when a flip option is clicked
                    if (typeof ToolManager !== 'undefined' && ToolManager.flipCurrentLayer) {
                        ToolManager.flipCurrentLayer(e.target.value);
                    }

                    // Update visual states for flip options
                    document.querySelectorAll('.flip-axis-container .mirror-axis-option').forEach(opt => {
                        opt.classList.remove('checked');
                    });

                    if (e.target.checked) {
                        e.target.closest('.mirror-axis-option').classList.add('checked');
                    }

                    // Show notification about the flip operation
                    const axisText = e.target.value === 'both' ? 'X and Y' : e.target.value.toUpperCase();
                    this.showNotification(`Layer flipped on ${axisText} axis!`, 'success');
                });
            }
        });
      
        // Initialize align option states and add event listeners
        document.querySelectorAll('.align-container .align-btn').forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                option.classList.add('checked');
            }

            // Add click event listener for align options to trigger alignment
            if (radio) {
                radio.addEventListener('click', (e) => {
                    // Align the current layer immediately when an align option is clicked
                    if (typeof ToolManager !== 'undefined' && ToolManager.alignCurrentLayer) {
                        ToolManager.alignCurrentLayer(e.target.value);
                    }

                    // Update visual states for align options
                    document.querySelectorAll('.align-container .align-btn').forEach(opt => {
                        opt.classList.remove('checked');
                    });

                    if (e.target.checked) {
                        e.target.closest('.align-btn').classList.add('checked');
                    }

                    // Show notification about the alignment operation
                    const alignmentNames = {
                        'top-left': 'Top Left',
                        'top-center': 'Top Center',
                        'top-right': 'Top Right',
                        'left': 'Left',
                        'center': 'Center',
                        'right': 'Right',
                        'bottom-left': 'Bottom Left',
                        'bottom-center': 'Bottom Center',
                        'bottom-right': 'Bottom Right'
                    };
                    const alignmentName = alignmentNames[e.target.value] || 'Center';
                    this.showNotification(`Layer content aligned to ${alignmentName}!`, 'success');
                });
            }
        });

        // Check if the old reset button exists, otherwise use the new one
        const resetBtn = UI.resetSettingsBtn || document.getElementById('btn-settings-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetSetting();
                this.showNotification('Settings reset to defaults!', 'info');
            });
        }

        // Add null check for export settings button
        const exportBtn = UI.exportSettingsBtn || document.getElementById('exportSettingsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSettings();
                this.showNotification('Settings exported!', 'success');
            });
        }
        // Keyboard shortcuts button
        const keyboardBtn = document.getElementById('keyboardBtn');
        if (keyboardBtn) {
            keyboardBtn.addEventListener('click', () => {
                this.toggleKeyboardShortcutsModal();
            });
        }

        // Keyboard shortcuts modal buttons
        const keyboardCloseBtn = document.getElementById('btn-keyboard-close');
        const keyboardPrintBtn = document.getElementById('btn-keyboard-print');

        if (keyboardCloseBtn) {
            keyboardCloseBtn.addEventListener('click', () => {
                this.closeKeyboardShortcutsModal();
            });
        }

        if (keyboardPrintBtn) {
            keyboardPrintBtn.addEventListener('click', () => {
                this.printKeyboardShortcuts();
            });
        }

        // Keyboard shortcuts modal tab switching
        const keyboardModal = document.getElementById('keyboard-shortcuts-modal');
        if (keyboardModal) {
            const settingsTabs = keyboardModal.querySelectorAll('.settings-tab');
            settingsTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Remove active class from all tabs and content
                    keyboardModal.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                    keyboardModal.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));

                    // Add active class to clicked tab and corresponding content
                    tab.classList.add('active');
                    const contentId = tab.getAttribute('data-content');
                    const content = keyboardModal.querySelector(`#${contentId}`);
                    if (content) {
                        content.classList.add('active');
                    }
                });
            });
        }

        // Settings checkboxes - skip if SettingsManager is handling settings
        // The new modal-based settings system handles these checkboxes
        if (typeof SettingsManager === 'undefined') {
            // Only set up old checkbox listeners if SettingsManager is not available
            const settingGrid = document.getElementById('setting-grid');
            const settingSnapToGrid = document.getElementById('setting-snap-to-grid');
            const settingShowMinimap = document.getElementById('setting-show-minimap');
            const settingDarkMode = document.getElementById('setting-darkmode');
            const settingAutoSave = document.getElementById('setting-autosave');
            const settingShowCoords = document.getElementById('setting-show-coords');

            if (settingGrid) settingGrid.addEventListener('change', (e) => this.updateSetting('showGrid', e.target.checked));
            if (settingSnapToGrid) settingSnapToGrid.addEventListener('change', (e) => this.updateSetting('snapToGrid', e.target.checked));
            if (settingShowMinimap) settingShowMinimap.addEventListener('change', (e) => this.updateSetting('showMinimap', e.target.checked));
            if (settingDarkMode) settingDarkMode.addEventListener('change', (e) => this.updateSetting('darkMode', e.target.checked));
            if (settingAutoSave) settingAutoSave.addEventListener('change', (e) => this.updateSetting('autoSave', e.target.checked));
            if (settingShowCoords) settingShowCoords.addEventListener('change', (e) => this.updateSetting('showCoords', e.target.checked));
        } else {
            console.log('SettingsManager is handling settings checkboxes, skipping InputHandler setup');
        }

        // Browser storage save/load functionality
        if (UI.saveToBrowserBtn) {
            UI.saveToBrowserBtn.addEventListener('click', () => {
                try {
                    const state = this.getState();

                    // Convert ImageData to base64 for proper JSON serialization
                    const stateWithSerializedLayers = {
                        ...state,
                        frames: state.frames.map(frame => ({
                            ...frame,
                            layers: frame.layers.map(layer => ({
                                name: layer.name,
                                visible: layer.visible,
                                data: this.imageDataToBase64(layer.data)
                            }))
                        }))
                    };

                    localStorage.setItem('pixelArtProject', JSON.stringify(stateWithSerializedLayers));
                    this.showNotification('Project saved to browser!', 'success');
                } catch (e) {
                    console.error('Failed to save project:', e);
                    this.showNotification('Failed to save project to browser', 'error');
                }
            });
        }

        if (UI.loadFromBrowserBtn) {
            UI.loadFromBrowserBtn.addEventListener('click', () => {
                const saved = localStorage.getItem('pixelArtProject');
                if (saved) {
                    try {
                        const state = JSON.parse(saved);

                        // Convert base64 back to ImageData if needed
                        const stateWithDeserializedLayers = {
                            ...state,
                            frames: state.frames.map(frame => ({
                                ...frame,
                                layers: frame.layers.map(layer => ({
                                    name: layer.name,
                                    visible: layer.visible,
                                    data: typeof layer.data === 'string'
                                        ? this.base64ToImageData(layer.data, State.width, State.height)
                                        : layer.data
                                }))
                            }))
                        };

                        this.setState(stateWithDeserializedLayers);
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
        
        // Update UI checkboxes - skip if SettingsManager is handling settings
        if (typeof SettingsManager === 'undefined') {
            // Only update checkboxes if SettingsManager is not available
            if (UI.showGrid) UI.showGrid.checked = settings.showGrid;
            if (UI.snapToGrid) UI.snapToGrid.checked = settings.snapToGrid;
            if (UI.showMinimap) UI.showMinimap.checked = settings.showMinimap;
            if (UI.darkMode) UI.darkMode.checked = settings.darkMode;
            if (UI.autoSave) UI.autoSave.checked = settings.autoSave;
            if (UI.showCoords) UI.showCoords.checked = settings.showCoords;
        } else {
            console.log('SettingsManager is handling settings UI updates, skipping InputHandler updates');
        }
        
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
            brushBlur: State.brushBlur,
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
        State.brushBlur = state.brushBlur || 0;
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
        UI.blurSlider.value = State.brushBlur;
        UI.blurDisplay.textContent = State.brushBlur;
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
    },

    /**
     * Setup section toggle functionality for right panel sections
     * Note: This is now handled by right-panel-manager.js to avoid conflicts
     */
    setupSectionToggles() {
        // Section toggles are now handled by right-panel-manager.js
        // This method is kept for compatibility but does nothing
    },

    /**
     * Setup brightness control functionality for lighten/darken tool
     */
    setupBrightnessControls() {
        // Initialize brightness factor in state if not present
        if (State.brightnessFactor === undefined) {
            State.brightnessFactor = 1.0;
        }

        // Set initial display value
        const brightnessDisplay = document.getElementById('brightnessFactorDisplay');
        if (brightnessDisplay) {
            brightnessDisplay.textContent = State.brightnessFactor.toFixed(1);
        }

        // Brightness slider event listener
        const brightnessSlider = document.getElementById('brightnessFactorSlider');
        if (brightnessSlider) {
            brightnessSlider.addEventListener('input', (e) => {
                State.brightnessFactor = parseFloat(e.target.value);
                if (brightnessDisplay) {
                    brightnessDisplay.textContent = State.brightnessFactor.toFixed(1);
                }
            });
        }
    },

    /**
    * Setup brightness preset buttons
    */
    setupBrightnessPresets() {
        // Add event listeners to brightness preset buttons
        document.querySelectorAll('.brightness-preset').forEach(button => {
            button.addEventListener('click', (e) => {
                const factor = parseFloat(button.getAttribute('data-factor'));
                State.brightnessFactor = factor;

                // Update slider and display
                const brightnessSlider = document.getElementById('brightnessFactorSlider');
                const brightnessDisplay = document.getElementById('brightnessFactorDisplay');

                if (brightnessSlider) {
                    brightnessSlider.value = factor;
                }
                if (brightnessDisplay) {
                    brightnessDisplay.textContent = factor.toFixed(1);
                }

                // Update active button state
                document.querySelectorAll('.brightness-preset').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');

                // Show notification
                const effectName = factor > 1 ? (factor === 1.2 ? 'Slight Lighten' : 'Lighten') :
                               factor < 1 ? (factor === 0.8 ? 'Slight Darken' : 'Darken') : 'Normal';
                this.showNotification(`Brightness set to ${effectName} (${factor.toFixed(1)})`, 'success');
            });
        });

        // Set initial active preset button
        const initialPreset = document.querySelector('.brightness-preset[data-factor="1.0"]');
        if (initialPreset) {
            initialPreset.classList.add('active');
        }
    },

    /**
     * Setup brightness/contrast controls for contrast panel
     */
    setupBrightnessContrastControls() {
        // Initialize brightness factor in state if not present
        if (State.brightnessFactor === undefined) {
            State.brightnessFactor = 1.0;
        }

        // Set initial display value
        const brightnessContrastDisplay = document.getElementById('brightnessContrastDisplay');
        if (brightnessContrastDisplay) {
            brightnessContrastDisplay.textContent = State.brightnessFactor.toFixed(1);
        }

        // Brightness/Contrast slider event listener
        const brightnessContrastSlider = document.getElementById('brightnessContrastSlider');
        if (brightnessContrastSlider) {
            brightnessContrastSlider.addEventListener('input', (e) => {
                State.brightnessFactor = parseFloat(e.target.value);
                if (brightnessContrastDisplay) {
                    brightnessContrastDisplay.textContent = State.brightnessFactor.toFixed(1);
                }
            });
        }

        // Setup brightness preset buttons for contrast panel
        document.querySelectorAll('#contrast-options .brightness-preset').forEach(button => {
            button.addEventListener('click', (e) => {
                const factor = parseFloat(button.getAttribute('data-factor'));
                State.brightnessFactor = factor;

                // Update slider and display
                if (brightnessContrastSlider) {
                    brightnessContrastSlider.value = factor;
                }
                if (brightnessContrastDisplay) {
                    brightnessContrastDisplay.textContent = factor.toFixed(1);
                }

                // Update active button state
                document.querySelectorAll('#contrast-options .brightness-preset').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');

                // Show notification
                const effectName = factor > 1 ? (factor === 1.2 ? 'Slight Lighten' : 'Lighten') :
                               factor < 1 ? (factor === 0.8 ? 'Slight Darken' : 'Darken') : 'Normal';
                this.showNotification(`Brightness set to ${effectName} (${factor.toFixed(1)})`, 'success');
            });
        });

        // Set initial active preset button
        const initialPreset = document.querySelector('#contrast-options .brightness-preset[data-factor="1.0"]');
        if (initialPreset) {
            initialPreset.classList.add('active');
        }

        // Setup apply button
        const applyBtn = document.getElementById('applyBrightnessContrastBtn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                console.log('Apply brightness/contrast button clicked');
                console.log('Current brightness factor:', State.brightnessFactor);
                console.log('Current frame index:', State.currentFrameIndex);
                console.log('Current layer index:', State.activeLayerIndex);

                // Ensure we have valid state
                if (State.frames && State.frames[State.currentFrameIndex] &&
                    State.frames[State.currentFrameIndex].layers &&
                    State.frames[State.currentFrameIndex].layers[State.activeLayerIndex]) {

                    this.applyBrightnessContrastToLayer();
                } else {
                    console.error('Invalid state for brightness/contrast application');
                    this.showNotification('Cannot apply brightness/contrast: invalid layer selection', 'error');
                }
            });
        }
    },

    /**
     * Setup dither tool controls and preview
     */
    setupDitherControls() {
        // Initialize dither state if not present
        if (State.ditherDensity === undefined) {
            State.ditherDensity = 5;
        }
        if (State.ditherColor1 === undefined) {
            State.ditherColor1 = '#00ff41';
        }
        if (State.ditherColor2 === undefined) {
            State.ditherColor2 = '#ffffff';
        }
        if (State.ditherOpacity1 === undefined) {
            State.ditherOpacity1 = 100;
        }
        if (State.ditherOpacity2 === undefined) {
            State.ditherOpacity2 = 100;
        }
        if (State.ditherPattern === undefined) {
            State.ditherPattern = 'checkerboard';
        }

        // Pattern density slider
        const densitySlider = document.getElementById('ditherDensity');
        const densityValue = document.getElementById('ditherDensityValue');

        if (densitySlider && densityValue) {
            densitySlider.value = State.ditherDensity;
            densityValue.textContent = State.ditherDensity;

            densitySlider.addEventListener('input', (e) => {
                State.ditherDensity = parseInt(e.target.value);
                densityValue.textContent = State.ditherDensity;
                this.updateDitherPreview();
            });
        }

        // Color pickers
        const colorPicker1 = document.getElementById('ditherColor1');
        const colorPicker2 = document.getElementById('ditherColor2');

        if (colorPicker1) {
            colorPicker1.value = State.ditherColor1;
            colorPicker1.addEventListener('input', (e) => {
                State.ditherColor1 = e.target.value;
                this.updateDitherPreview();
            });
        }

        if (colorPicker2) {
            colorPicker2.value = State.ditherColor2;
            colorPicker2.addEventListener('input', (e) => {
                State.ditherColor2 = e.target.value;
                this.updateDitherPreview();
            });
        }

        // Opacity sliders
        const opacitySlider1 = document.getElementById('ditherOpacity1');
        const opacityValue1 = document.getElementById('ditherOpacityValue1');
        const opacitySlider2 = document.getElementById('ditherOpacity2');
        const opacityValue2 = document.getElementById('ditherOpacityValue2');

        if (opacitySlider1 && opacityValue1) {
            opacitySlider1.value = State.ditherOpacity1;
            opacityValue1.textContent = State.ditherOpacity1 + '%';

            opacitySlider1.addEventListener('input', (e) => {
                State.ditherOpacity1 = parseInt(e.target.value);
                opacityValue1.textContent = State.ditherOpacity1 + '%';
                this.updateDitherPreview();
            });
        }

        if (opacitySlider2 && opacityValue2) {
            opacitySlider2.value = State.ditherOpacity2;
            opacityValue2.textContent = State.ditherOpacity2 + '%';

            opacitySlider2.addEventListener('input', (e) => {
                State.ditherOpacity2 = parseInt(e.target.value);
                opacityValue2.textContent = State.ditherOpacity2 + '%';
                this.updateDitherPreview();
            });
        }

        // Pattern style selector
        const patternSelector = document.getElementById('ditherPattern');
        const patternDisplay = document.getElementById('ditherPatternDisplay');

        if (patternSelector) {
            patternSelector.value = State.ditherPattern;
            
            patternSelector.addEventListener('change', (e) => {
                State.ditherPattern = e.target.value;
                if (patternDisplay) {
                    // Get the display text from the selected option
                    const selectedOption = patternSelector.options[patternSelector.selectedIndex];
                    patternDisplay.textContent = selectedOption.textContent;
                }
                this.updateDitherPreview();
            });
        }

        // Initialize dither preview
        this.updateDitherPreview();
    },

    /**
     * Update the dither pattern preview
     */
    updateDitherPreview() {
        const previewCanvas = document.getElementById('ditherPreviewCanvas');
        if (!previewCanvas) return;

        const ctx = previewCanvas.getContext('2d');
        const size = 64;
        const density = State.ditherDensity || 5;
        const pattern = State.ditherPattern || 'checkerboard';

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Parse colors with opacity
        const color1 = this.parseColorWithOpacity(State.ditherColor1, State.ditherOpacity1);
        const color2 = this.parseColorWithOpacity(State.ditherColor2, State.ditherOpacity2);

        // Draw dither pattern based on the selected pattern type
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let useColor1 = false;
                
                switch (pattern) {
                    case 'checkerboard':
                        // Proper checkerboard: alternating pixels in a 2x2 grid, scaled by density
                        const checkerSize = Math.max(2, 11 - density);
                        useColor1 = Math.floor(x / (checkerSize / 2)) % 2 === Math.floor(y / (checkerSize / 2)) % 2;
                        break;
                    case 'diagonal':
                        useColor1 = (x + y) % (11 - density) === 0;
                        break;
                    case 'horizontal':
                        useColor1 = y % (11 - density) === 0;
                        break;
                    case 'vertical':
                        useColor1 = x % (11 - density) === 0;
                        break;
                    case 'random':
                        useColor1 = Math.random() < 0.5;
                        break;
                    default:
                        useColor1 = (x + y) % (11 - density) === 0;
                }
                
                ctx.fillStyle = useColor1 ? color1 : color2;
                ctx.fillRect(x, y, 1, 1);
            }
        }
    },

    /**
     * Parse color with opacity
     */
    parseColorWithOpacity(hexColor, opacity) {
        // Remove # if present
        const hex = hexColor.replace('#', '');

        // Parse RGB components
        let r, g, b;
        if (hex.length === 3) {
            // Shorthand hex (e.g., #abc)
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            // Full hex (e.g., #aabbcc)
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else {
            // Default to white if invalid
            return 'rgba(255, 255, 255, 1)';
        }

        // Apply opacity
        const alpha = opacity / 100;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    /**
     * Apply brightness/contrast adjustment to the selected layer
     */
    applyBrightnessContrastToLayer() {
        console.log('applyBrightnessContrastToLayer called');

        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];
        const imageData = layer.data;
        const width = State.width;
        const height = State.height;
        const data = imageData.data;
        const factor = State.brightnessFactor;

        console.log('Applying brightness/contrast to layer:', layer.name);
        console.log('Layer dimensions:', width, 'x', height);
        console.log('Brightness factor:', factor);
        console.log('Original image data length:', data.length);

        // Create a new ImageData for the adjusted result
        const adjustedData = new ImageData(width, height);
        const adjustedDataArray = adjustedData.data;

        // Apply brightness/contrast adjustment to each pixel
        for (let i = 0; i < data.length; i += 4) {
            // Skip transparent pixels (alpha = 0)
            if (data[i + 3] === 0) {
                adjustedDataArray[i] = data[i];     // R
                adjustedDataArray[i + 1] = data[i + 1]; // G
                adjustedDataArray[i + 2] = data[i + 2]; // B
                adjustedDataArray[i + 3] = data[i + 3]; // A
                continue;
            }

            // Improved brightness/contrast algorithm that handles black pixels better
            if (factor > 1) {
                // Lightening - use a more sophisticated approach for dark colors
                adjustedDataArray[i] = Math.min(255, data[i] + (255 - data[i]) * (factor - 1) * 0.5);     // R
                adjustedDataArray[i + 1] = Math.min(255, data[i + 1] + (255 - data[i + 1]) * (factor - 1) * 0.5); // G
                adjustedDataArray[i + 2] = Math.min(255, data[i + 2] + (255 - data[i + 2]) * (factor - 1) * 0.5); // B
            } else {
                // Darkening - use simple multiplication
                adjustedDataArray[i] = Math.min(255, Math.max(0, data[i] * factor));     // R
                adjustedDataArray[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor)); // G
                adjustedDataArray[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor)); // B
            }
            adjustedDataArray[i + 3] = data[i + 3]; // A (keep original alpha)
        }

        // Update layer data
        layer.data = adjustedData;
        console.log('Updated layer data with adjusted image data');

        // Update canvas and save history
        CanvasManager.render();
        if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
            InputHandler.saveState();
        }

        // Show notification
        const effectName = factor > 1 ? (factor === 1.2 ? 'Slight Lighten' : 'Lighten') :
                       factor < 1 ? (factor === 0.8 ? 'Slight Darken' : 'Darken') : 'Normal';
        this.showNotification(`Applied ${effectName} effect to layer!`, 'success');
    },

    /**
     * Toggle keyboard shortcuts modal visibility
     */
    toggleKeyboardShortcutsModal() {
        const modal = document.getElementById('keyboard-shortcuts-modal');
        if (modal) {
            modal.classList.toggle('open');
        }
    },

    /**
     * Close keyboard shortcuts modal
     */
    closeKeyboardShortcutsModal() {
        const modal = document.getElementById('keyboard-shortcuts-modal');
        if (modal) {
            modal.classList.remove('open');
        }
    },

    /**
     * Print keyboard shortcuts
     */
    printKeyboardShortcuts() {
        const modal = document.getElementById('keyboard-shortcuts-modal');
        if (modal) {
            // Create a printable version
            const printWindow = window.open('', '_blank');
            printWindow.document.write('<html><head><title>Pixel Art Studio - Keyboard Shortcuts</title>');
            printWindow.document.write('<style>');
            printWindow.document.write(`
                body { font-family: Arial, sans-serif; padding: 20px; background: white; color: black; }
                h1 { color: #a855f7; border-bottom: 2px solid #a855f7; padding-bottom: 10px; }
                h2 { color: #a855f7; margin-top: 20px; }
                .shortcut-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin: 15px 0; }
                .shortcut-item { border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
                .shortcut-key { font-family: monospace; font-size: 1.2rem; font-weight: bold; color: #a855f7; background: #f0f0f0; padding: 5px; border-radius: 3px; display: inline-block; margin-bottom: 5px; }
                .shortcut-description { font-size: 0.9rem; }
                @media print {
                    .shortcut-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
                }
            `);
            printWindow.document.write('</style></head><body>');
            printWindow.document.write('<h1><i class="fas fa-keyboard"></i> Pixel Art Studio - Keyboard Shortcuts</h1>');
            printWindow.document.write('<p>Quick reference for all available keyboard shortcuts</p>');

            // Copy content from each tab
            const toolsContent = document.getElementById('shortcuts-tools');
            const generalContent = document.getElementById('shortcuts-general');
            const navigationContent = document.getElementById('shortcuts-navigation');

            if (toolsContent) {
                printWindow.document.write('<h2>Drawing Tools</h2>');
                printWindow.document.write(toolsContent.innerHTML);
            }

            if (generalContent) {
                printWindow.document.write('<h2>General Operations</h2>');
                printWindow.document.write(generalContent.innerHTML);
            }

            if (navigationContent) {
                printWindow.document.write('<h2>Navigation</h2>');
                printWindow.document.write(navigationContent.innerHTML);
            }

            printWindow.document.write('</body></html>');
            printWindow.document.close();

            // Print after a small delay
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    },

/**
 * Convert ImageData to base64 string (copied from FileManager for consistency)
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
 * Convert base64 string to ImageData (copied from FileManager for consistency)
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
}
};
// Make InputHandler available globally
window.InputHandler = InputHandler;