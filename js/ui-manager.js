// ui-manager.js
const UIManager = {
    init() {
        this.setupPanelToggle();
        this.setupContextSwitching();
    },

    setupPanelToggle() {
        const toggleBtn = document.getElementById('panel-toggle');
        const panel = document.getElementById('side-panel');
        if (!toggleBtn || !panel) return;

        toggleBtn.addEventListener('click', () => {
            panel.classList.toggle('closed');
            const icon = toggleBtn.querySelector('i');
            if (panel.classList.contains('closed')) {
                icon.className = 'fas fa-chevron-left';
                toggleBtn.style.right = '0';
            } else {
                icon.className = 'fas fa-chevron-right';
                toggleBtn.style.right = '280px';
            }
        });
    },

    setupContextSwitching() {
        // 1. Listen for Drawing Tool Clicks (Pencil, Brush, etc) - exclude Layers/Settings/Filters buttons
        const drawingToolBtns = document.querySelectorAll('[data-tool]:not(#layersBtn):not(#settingsBtn):not(#filtersBtn)');
        drawingToolBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Determine tool name from data attribute
                const toolName = btn.getAttribute('data-tool');
                this.updatePanelForTool(toolName);
                
                // Remove active styling from Layers/Settings buttons
                const layersBtn = document.getElementById('layersBtn');
                const settingsBtn = document.getElementById('settingsBtn');
                if (layersBtn) layersBtn.classList.remove('active');
                if (settingsBtn) settingsBtn.classList.remove('active');
            });
        });

        // 2. Listen for Layers Button (prevent event bubbling)
        const layersBtn = document.getElementById('layersBtn');
        if (layersBtn) {
            layersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showPanelSections(['panel-layers']);
                this.setActiveSidebarButton('layersBtn');
            });
        }

        // 3. Listen for Settings Button (prevent event bubbling)
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showPanelSections(['panel-settings']);
                this.setActiveSidebarButton('settingsBtn');
            });
        }

        // 4. Listen for Filters Button (prevent event bubbling)
        const filtersBtn = document.getElementById('filtersBtn');
        if (filtersBtn) {
            filtersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showPanelSections(['panel-preview', 'panel-filters']);
                this.setActiveSidebarButton('filtersBtn');
            });
        }
    },

    /**
     * Updates the right panel content based on the selected drawing tool
     */
    updatePanelForTool(toolName) {
        // Define what shows for each tool
        // Always show 'panel-preview' unless specifically excluded
        
        switch (toolName) {
            case 'pencil':
            case 'brush':
            case 'bucket':
            case 'dither':
            case 'stroke':
            case 'rect':
            case 'circle':
            case 'mirror':
                // Drawing tools need Palette and Options
                this.showPanelSections(['panel-preview', 'panel-palette', 'panel-tool-options']);
                break;

            case 'eraser':
                // Eraser needs Size (Options) but not Palette
                this.showPanelSections(['panel-preview', 'panel-tool-options']);
                break;

            case 'eyedropper':
                // Eyedropper mainly needs Palette to see what was picked
                this.showPanelSections(['panel-preview', 'panel-palette']);
                break;

            case 'move':
                // Move don't need options, just Preview
                this.showPanelSections(['panel-preview']);
                break;

            default:
                // Fallback
                this.showPanelSections(['panel-preview', 'panel-palette']);
                break;
        }
    },

    /**
     * Utility to hide all sections and show only the requested IDs
     */
    showPanelSections(idsToShow) {
        const allSections = [
            'panel-preview',
            'panel-palette',
            'panel-tool-options',
            'panel-layers',
            'panel-filters',
            'panel-settings'
        ];

        allSections.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (idsToShow.includes(id)) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            }
        });
        
        // Ensure panel is open if the user clicks a specific view
        const panel = document.getElementById('side-panel');
        const toggleBtn = document.getElementById('panel-toggle');
        if (panel && panel.classList.contains('closed') && toggleBtn) {
            // Trigger the toggle click to animate it open nicely
            toggleBtn.click();
        }
    },

    /**
     * Visual helper to highlight Layers/Settings buttons
     */
    setActiveSidebarButton(activeId) {
        // Deactivate tools (visually only - assumes ToolManager handles tool state logic separately)
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        
        // Activate the specific button
        const btn = document.getElementById(activeId);
        if (btn) btn.classList.add('active');
    }
};