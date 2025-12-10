// ui-manager.js
const UIManager = {
    activeSubmenu: null,
    menuEventListenersAdded: false,
    isMenuOpen: false,

    init() {
        this.setupPanelToggle();
        this.setupContextSwitching();
        this.setupMenuSystem();
        this.initDropins();
        // Set initial panel state for default tool (pencil)
        this.updatePanelForTool('pencil');
    },

    setupMenuSystem() {
        // Use event delegation for better performance and reliability
        const toolbar = document.getElementById('tool-buttons');
        if (!toolbar) return;

        // Only clean up if we haven't already set up listeners
        if (!this.menuEventListenersAdded) {
            this.cleanupMenuEventListeners();
        }

        let closeTimeout;

            
        // Add event listener to toolbar for menu parent clicks
        toolbar.addEventListener('click', (e) => {
            const menuParent = e.target.closest('.tool-btn.menu-parent');
            if (menuParent) {
                this.toggleSubmenu(menuParent);
                e.stopPropagation();
                e.preventDefault();
                return;
            }

            // Handle submenu item clicks
            const submenuItem = e.target.closest('.tool-submenu .tool-btn');
            if (submenuItem) {
                this.handleSubmenuClick(e);
                e.stopPropagation();
                e.preventDefault();
                return;
            }
        });

        // Close submenus when clicking outside toolbar
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.toolbar') && !e.target.closest('.tool-submenu')) {
                this.closeAllSubmenus();
            }
        }, { capture: true }); // Use capture phase to ensure it runs first

        this.menuEventListenersAdded = true;
    },

    cleanupMenuEventListeners() {
        // Remove any existing event listeners to prevent duplicates
        const toolbar = document.getElementById('tool-buttons');
        if (toolbar) {
            const clone = toolbar.cloneNode(true);
            toolbar.parentNode.replaceChild(clone, toolbar);
        }
    },

    toggleSubmenu(btn) {
        const submenu = btn.querySelector('.tool-submenu');
        if (!submenu) return;

        // Close all other submenus first
        this.closeAllSubmenus();

        // Position the submenu
        const btnRect = btn.getBoundingClientRect();
        const topOffset = btnRect.top + btnRect.height / 2 - 24;

        // Set positioning but let CSS handle display via .visible class
        submenu.style.top = `${topOffset}px`;
        submenu.style.left = '60px';  // Changed from 68px to 60px - NO GAP!
        submenu.style.zIndex = '200';
        submenu.style.position = 'fixed';
        submenu.style.pointerEvents = 'auto';

        // Force reflow before adding visible class to prevent flickering
        void submenu.offsetHeight;

        // Show submenu
        submenu.classList.add('visible');
        this.activeSubmenu = submenu;
        this.isMenuOpen = true;

        // Add event listeners to submenu items for better reliability
        const submenuItems = submenu.querySelectorAll('.tool-btn');
        submenuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleSubmenuClick(e);
            }, { once: true }); // Use once: true to prevent memory leaks
        });
    },

    handleSubmenuClick(e) {
        e.stopPropagation();
        e.preventDefault();

        const btn = e.target.closest('.tool-btn');
        if (!btn) return;

        // Close submenu immediately
        this.closeAllSubmenus();

        // Remove active class from ALL tools first
        document.querySelectorAll('.tool-btn').forEach(b => {
            b.classList.remove('active');
        });

        // Add active class to clicked button
        btn.classList.add('active');

        // Mark parent menu as active
        const parentMenu = btn.closest('.tool-submenu')?.previousElementSibling;
        if (parentMenu && parentMenu.classList.contains('menu-parent')) {
            parentMenu.classList.add('active');
        }

        // Handle tool selection
        const action = btn.dataset.action;
        const type = btn.dataset.type;
        if (action && type && typeof ToolManager !== 'undefined' && ToolManager.setTool) {
            // Small delay to ensure UI updates before tool change
            setTimeout(() => {
                ToolManager.setTool(type);
                this.updatePanelForTool(type);
            }, 50);
        }
    },

    closeAllSubmenus() {
        document.querySelectorAll('.tool-submenu').forEach(menu => {
            menu.classList.remove('visible');
            // REMOVED: menu.style.display = 'none'; // Let CSS handle this
        });
        this.activeSubmenu = null;
        this.isMenuOpen = false;
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

        // Set up close buttons for sliding panels
        this.setupSlidingPanelCloseButtons();
    },

    /**
     * Set up close buttons for sliding panels
     */
    setupSlidingPanelCloseButtons() {
        // Slide out layers panel button
        const slideOutLayersBtn = document.getElementById('slide-out-layers-panel');
        if (slideOutLayersBtn) {
            slideOutLayersBtn.addEventListener('click', () => {
                this.slideOutLayersPanel();
            });
        }

        // Close tilemap panel button
        const closeTilemapBtn = document.getElementById('close-tilemap-panel');
        if (closeTilemapBtn) {
            closeTilemapBtn.addEventListener('click', () => {
                const tilemapPanel = document.getElementById('tilemap-panel');
                if (tilemapPanel) {
                    tilemapPanel.classList.remove('open');
                }
            });
        }
    },

    setupContextSwitching() {
        // 1. Listen for Drawing Tool Clicks (Pencil, Brush, etc) - exclude Layers/Settings/Filters/Tilemap buttons
        const drawingToolBtns = document.querySelectorAll('[data-tool]:not(#layersBtn):not(#settingsBtn):not(#filtersBtn):not(#tilemapBtn)');
        drawingToolBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Determine tool name from data attribute
                const toolName = btn.getAttribute('data-tool');
                this.updatePanelForTool(toolName);
                
                // Remove active styling from Layers/Settings buttons (with null checks)
                const layersBtn = document.getElementById('layersBtn');
                const settingsBtn = document.getElementById('settingsBtn');
                if (layersBtn) layersBtn.classList.remove('active');
                if (settingsBtn) settingsBtn.classList.remove('active');
            });
        });

        // 2. Listen for Layers Button (prevent event bubbling)
        const layersBtn = document.getElementById('layersBtn');
        if (layersBtn) {
            console.log('UIManager: Setting up layers button event listener');
            layersBtn.addEventListener('click', (e) => {
                console.log('UIManager: Layers button clicked');
                e.preventDefault();
                e.stopPropagation();
                console.log('UIManager: Calling slideInLayersPanel()');
                this.slideInLayersPanel();
                console.log('UIManager: Calling setActiveSidebarButton()');
                this.setActiveSidebarButton('layersBtn');
            });
        } else {
            console.error('UIManager: Layers button not found!');
        }

        // 3. Listen for Settings Button (prevent event bubbling)
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            console.log('UIManager: Setting up settings button event listener');
            settingsBtn.addEventListener('click', (e) => {
                console.log('UIManager: Settings button clicked');
                e.preventDefault();
                e.stopPropagation();
                // Use the new settings manager modal instead of the old panel
                if (typeof SettingsManager !== 'undefined' && SettingsManager.toggleSettings) {
                    console.log('UIManager: Calling SettingsManager.toggleSettings()');
                    SettingsManager.toggleSettings();
                } else {
                    console.error('UIManager: SettingsManager not available, using fallback');
                    // Fallback to old behavior if settings manager not available
                    this.showPanelSections(['panel-settings']);
                    this.setActiveSidebarButton('settingsBtn');
                }
            });
        } else {
            console.error('UIManager: Settings button not found!');
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

        // 5. Listen for Tilemap Button (prevent event bubbling)
        const tilemapBtn = document.getElementById('tilemapBtn');
        if (tilemapBtn) {
            console.log('UIManager: Setting up tilemap button event listener');
            tilemapBtn.addEventListener('click', (e) => {
                console.log('UIManager: Tilemap button clicked');
                e.preventDefault();
                e.stopPropagation();
                this.toggleTilemapPanel();
                this.setActiveSidebarButton('tilemapBtn');
                // Initialize tilemap manager if not already done
                if (typeof TilemapManager !== 'undefined' && TilemapManager.init) {
                    TilemapManager.init();
                }
            });
        } else {
            console.error('UIManager: Tilemap button not found!');
        }
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
     * Toggle layers panel visibility with slide-in animation
     */
    toggleLayersPanel() {
        console.log('UIManager: toggleLayersPanel() called');
        const layersPanel = document.getElementById('layers-panel');
        console.log('UIManager: layersPanel found:', !!layersPanel);
        if (layersPanel) {
            console.log('UIManager: Current layersPanel classes:', layersPanel.className);
            layersPanel.classList.toggle('open');
            console.log('UIManager: After toggle layersPanel classes:', layersPanel.className);
            // Ensure other panels are closed
            const tilemapPanel = document.getElementById('tilemap-panel');
            if (tilemapPanel && tilemapPanel.classList.contains('open')) {
                tilemapPanel.classList.remove('open');
            }
        }
    },

    /**
     * Slide in layers panel next to right panel
     */
    slideInLayersPanel() {
        const layersPanel = document.getElementById('layers-panel');
        if (layersPanel) {
            layersPanel.classList.add('open');
            // Ensure other panels are closed
            const tilemapPanel = document.getElementById('tilemap-panel');
            if (tilemapPanel && tilemapPanel.classList.contains('open')) {
                tilemapPanel.classList.remove('open');
            }
        }
    },

    /**
     * Slide out layers panel
     */
    slideOutLayersPanel() {
        const layersPanel = document.getElementById('layers-panel');
        if (layersPanel) {
            layersPanel.classList.remove('open');
        }
    },

    /**
     * Toggle tilemap panel visibility (new sliding panel)
     */
    toggleTilemapPanel() {
        const tilemapPanel = document.getElementById('tilemap-panel');
        if (tilemapPanel) {
            tilemapPanel.classList.toggle('open');
            // Ensure other panels are closed
            const layersPanel = document.getElementById('layers-panel');
            if (layersPanel && layersPanel.classList.contains('open')) {
                layersPanel.classList.remove('open');
            }
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
    },

    /**
     * Initialize dropins system (side tabs)
     */
    initDropins() {
        // Set up dropin tab switching
        const dropinTabs = document.querySelectorAll('.dropins-container .tab');
        if (dropinTabs.length > 0) {
            dropinTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    this.selectDropin(tab);
                });
            });
        }

        // Set up toolbar buttons to switch dropins
        const layersBtn = document.getElementById('layersBtn');
        const tilemapBtn = document.getElementById('tilemapBtn');

        if (layersBtn) {
            layersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const layersTab = document.querySelector('.tab[data-content="layers-panel"]');
                if (layersTab) {
                    this.selectDropin(layersTab);
                }
                this.setActiveSidebarButton('layersBtn');
            });
        }

        if (tilemapBtn) {
            tilemapBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tilemapTab = document.querySelector('.tab[data-content="tilemap-panel"]');
                if (tilemapTab) {
                    this.selectDropin(tilemapTab);
                }
                this.setActiveSidebarButton('tilemapBtn');
            });
        }
    },

    /**
     * Select dropin tab (side tab functionality)
     */
    selectDropin(el) {
        const $el = el;
        const container = $el.closest(".dropins-container");
        const activeTab = container.querySelector(".tab.active");
        const activeAside = container.querySelector("aside.active");
        const relAside = document.getElementById($el.dataset.content);

        if ($el.classList.contains("active") && container.classList.contains("showing")) {
            $el.classList.remove("active");
            container.classList.remove("showing");
            if (relAside) relAside.classList.remove("active");
        }
        else {
            if (activeAside) activeAside.classList.remove("active");
            if (activeTab) activeTab.classList.remove("active");

            if (relAside) {
                relAside.classList.add("active");
                console.log(`Activated aside: #${$el.dataset.content}`);
            } else {
                console.error(`Aside not found: #${$el.dataset.content}`);
            }
            $el.classList.add("active");

            if (!container.classList.contains("showing")) {
                container.classList.add("showing");
            }
        }

        console.log(`Selected dropin: ${$el.dataset.content}`);
    }
};