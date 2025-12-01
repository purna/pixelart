// ui-manager.js
const UIManager = {
    init() {
        this.setupPanelToggle();
        this.setupContextSwitching();
        // Set initial panel state for default tool (pencil)
        this.updatePanelForTool('pencil');
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
        // 1. Listen for Drawing Tool Clicks (Pencil, Brush, etc) - exclude Layers/Settings/Filters/Tilemap buttons
        const drawingToolBtns = document.querySelectorAll('[data-tool]:not(#layersBtn):not(#settingsBtn):not(#filtersBtn):not(#tilemapBtn)');
        drawingToolBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Determine tool name from data attribute
                const toolName = btn.getAttribute('data-tool');
                this.updatePanelForTool(toolName);
                
                // Remove active styling from Layers/Settings buttons
                document.getElementById('layersBtn').classList.remove('active');
                document.getElementById('settingsBtn').classList.remove('active');
            });
        });

        // 2. Listen for Layers Button (prevent event bubbling)
        const layersBtn = document.getElementById('layersBtn');
        layersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showPanelSections(['panel-layers']);
            this.setActiveSidebarButton('layersBtn');
        });

        // 3. Listen for Settings Button (prevent event bubbling)
        const settingsBtn = document.getElementById('settingsBtn');
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showPanelSections(['panel-settings']);
            this.setActiveSidebarButton('settingsBtn');
        });

        // 4. Listen for Filters Button (prevent event bubbling)
        const filtersBtn = document.getElementById('filtersBtn');
        filtersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showPanelSections(['panel-preview', 'panel-filters']);
            this.setActiveSidebarButton('filtersBtn');
        });

        // 5. Listen for Tilemap Button (prevent event bubbling)
        const tilemapBtn = document.getElementById('tilemapBtn');
        tilemapBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showPanelSections(['panel-preview', 'panel-tilemap']);
            this.setActiveSidebarButton('tilemapBtn');
            // Initialize tilemap manager if not already done
            if (typeof TilemapManager !== 'undefined' && TilemapManager.init) {
                TilemapManager.init();
            }
        });
    },

   /**
     * Update the right panel content based on the active drawing tool
     */
    updatePanelForTool(toolName) {
        // Hide all tool option groups first
        document.querySelectorAll('.tool-options-group').forEach(group => group.classList.add('hidden'));

        switch (toolName) {
            case 'pencil':
            case 'brush':
            case 'bucket':
            case 'dither':
            case 'stroke':
            case 'rect':
            case 'circle':
                // Drawing tools need Palette and Options
                this.showPanelSections(['panel-preview', 'panel-palette', 'panel-tool-options']);
                break;

            case 'mirror':
                // Mirror tool needs Palette, Options, and Mirror panel
                this.showPanelSections(['panel-preview', 'panel-palette', 'panel-tool-options', 'mirror-options']);
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
            'panel-tilemap',
            'panel-settings',
            'mirror-options'
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
        if (panel && panel.classList.contains('closed')) {
            // Trigger the toggle click to animate it open nicely
            document.getElementById('panel-toggle').click();
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