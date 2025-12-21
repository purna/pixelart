/**
 * Settings Manager for Pixel Art Studio
 * Handles the unified settings modal with tabbed interface
 */
const SettingsManager = {
    isOpen: false,
    modalListenersSetup: false,
    settings: {
        showGrid: true,
        showTooltips: (typeof Config !== 'undefined' && Config.settings && Config.settings.tooltips) ? Config.settings.tooltips.enabled : false,
        showHelpers: true,
        showMinimap: true,
        snapToGrid: false,
        darkMode: true,
        autoSave: true,
        backgroundEnabled: true,
        backgroundColor: '#1a1a2e',
        ambientLight: true,
        ambientColor: '#ffffff',
        exportTransparent: true,
        exportResolution: '1920x1080',
        customWidth: 1920,
        customHeight: 1080,
        enableTutorials: true,
        showTutorialHints: true
    },

    init() {
        console.log('Initializing Settings Manager...');

        // Ensure DOM is ready before setting up event listeners
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.loadSettings();
                console.log('Settings Manager initialized (DOM ready)');
            });
        } else {
            this.setupEventListeners();
            this.loadSettings();
            console.log('Settings Manager initialized');
        }

        // Fallback: Also try to attach event listener after a short delay
        setTimeout(() => {
            const settingsBtn = document.getElementById('settingsBtn');
            console.log('Fallback check - settingsBtn found:', !!settingsBtn);
            if (settingsBtn && !settingsBtn.hasAttribute('data-settings-listener')) {
                console.log('Attaching fallback settings button listener');
                settingsBtn.addEventListener('click', (e) => {
                    console.log('Settings button clicked (fallback)');
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleSettings();
                });
                settingsBtn.setAttribute('data-settings-listener', 'true');
            }
        }, 1000);
    },

    setupEventListeners() {
        // Settings button click
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            console.log('Settings button found, attaching event listener');
            settingsBtn.addEventListener('click', (e) => {
                console.log('Settings button clicked');
                e.preventDefault();
                e.stopPropagation();
                this.toggleSettings();
            });
        } else {
            console.error('Settings button not found!');
        }
    },

    toggleSettings() {
        if (this.isOpen) {
            this.closeSettings();
        } else {
            this.openSettings();
        }
    },

    openSettings() {
        const modal = document.getElementById('unified-settings-modal');
        if (!modal) {
            console.error('Settings modal not found in HTML');
            return;
        }

        this.isOpen = true;
        modal.classList.add('open');
        modal.style.display = 'flex'; // Ensure modal is visible

        // Update form values from current settings
        this.updateFormFromSettings();

        // Setup modal event listeners (only once)
        if (!this.modalListenersSetup) {
            this.setupModalEventListeners();
            this.modalListenersSetup = true;
        }

        // Initialize first tab as active if no tab is active
        this.initializeTabs();

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeSettings();
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeSettings();
            }
        });
    },

    updateFormFromSettings() {
        // Update HTML form values from current settings
        const gridCheckbox = document.getElementById('setting-grid');
        const tooltipsCheckbox = document.getElementById('setting-tooltips');
        const helpersCheckbox = document.getElementById('setting-helpers');
        const darkmodeCheckbox = document.getElementById('setting-darkmode');
        const autosaveCheckbox = document.getElementById('setting-autosave');
        const bgEnabledCheckbox = document.getElementById('setting-background-enabled');
        const bgColorPicker = document.getElementById('setting-background-color');
        const ambientCheckbox = document.getElementById('setting-ambient-light');
        const ambientColorPicker = document.getElementById('setting-ambient-color');
        const exportTransparentCheckbox = document.getElementById('setting-export-transparent');
        const exportResolutionSelect = document.getElementById('setting-export-resolution');
        const customWidthInput = document.getElementById('setting-custom-width');
        const customHeightInput = document.getElementById('setting-custom-height');
        const enableTutorialsCheckbox = document.getElementById('settings-enable-tutorials');
        const showTutorialHintsCheckbox = document.getElementById('settings-show-hints');
        const showMinimapCheckbox = document.getElementById('setting-show-minimap');
        const snapToGridCheckbox = document.getElementById('setting-snap-to-grid');

        if (gridCheckbox) gridCheckbox.checked = this.settings.showGrid;
        if (tooltipsCheckbox) tooltipsCheckbox.checked = this.settings.showTooltips;
        if (helpersCheckbox) helpersCheckbox.checked = this.settings.showHelpers;
        if (darkmodeCheckbox) darkmodeCheckbox.checked = this.settings.darkMode;
        if (autosaveCheckbox) autosaveCheckbox.checked = this.settings.autoSave;
        if (bgEnabledCheckbox) bgEnabledCheckbox.checked = this.settings.backgroundEnabled;
        if (bgColorPicker) bgColorPicker.value = this.settings.backgroundColor;
        if (ambientCheckbox) ambientCheckbox.checked = this.settings.ambientLight;
        if (ambientColorPicker) ambientColorPicker.value = this.settings.ambientColor;
        if (exportTransparentCheckbox) exportTransparentCheckbox.checked = this.settings.exportTransparent;
        if (exportResolutionSelect) exportResolutionSelect.value = this.settings.exportResolution;
        if (customWidthInput) customWidthInput.value = this.settings.customWidth;
        if (customHeightInput) customHeightInput.value = this.settings.customHeight;
        if (enableTutorialsCheckbox) enableTutorialsCheckbox.checked = this.settings.enableTutorials;
        if (showTutorialHintsCheckbox) showTutorialHintsCheckbox.checked = this.settings.showTutorialHints;
        if (showMinimapCheckbox) showMinimapCheckbox.checked = this.settings.showMinimap;
        if (snapToGridCheckbox) snapToGridCheckbox.checked = this.settings.snapToGrid;
        // if (loadDefaultPresetsCheckbox) loadDefaultPresetsCheckbox.checked = this.settings.loadDefaultBrushPresets;
    },

    closeSettings() {
        const modal = document.getElementById('unified-settings-modal');
        if (modal) {
            modal.classList.remove('open');
            // Ensure modal is properly hidden
            modal.style.display = 'none';
        }
        this.isOpen = false;
    },

    initializeTabs() {
        // Ensure first tab is active by default
        const tabButtons = document.querySelectorAll('.settings-tab');
        const tabContents = document.querySelectorAll('.settings-tab-content');

        if (tabButtons.length > 0 && tabContents.length > 0) {
            // Check if any tab is already active
            let hasActiveTab = false;
            tabButtons.forEach(button => {
                if (button.classList.contains('active')) {
                    hasActiveTab = true;
                    // Also ensure the corresponding content is active (same as keyboard-shortcuts-modal)
                    const contentId = button.dataset.content;
                    const content = document.getElementById(contentId);
                    if (content) {
                        content.classList.add('active');
                    }
                }
            });

            // If no tab is active, activate the first one
            if (!hasActiveTab && tabButtons[0]) {
                tabButtons[0].classList.add('active');
                const contentId = tabButtons[0].dataset.content;
                const content = document.getElementById(contentId);
                if (content) {
                    content.classList.add('active');
                }
            }
        }
    },

    setupModalEventListeners() {
        const modal = document.getElementById('unified-settings-modal');
        if (!modal) return;

        // X close button
        const xCloseBtn = document.getElementById('btn-settings-close');
        if (xCloseBtn) {
            xCloseBtn.addEventListener('click', () => {
                this.closeSettings();
            });
        }

        // Save button
        const saveBtn = document.getElementById('btn-settings-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
                this.closeSettings();
            });
        }

        // Reset button
        const resetBtn = document.getElementById('btn-settings-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetSettings();
            });
        }

        // Tab switching functionality
        const tabButtons = document.querySelectorAll('.settings-tab');
        const tabContents = document.querySelectorAll('.settings-tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Use data-content attribute to match the content panel ID (same as keyboard-shortcuts-modal)
                const contentId = button.dataset.content;

                // Remove active class from all tabs and content
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to clicked tab and corresponding content
                button.classList.add('active');
                const content = document.getElementById(contentId);
                if (content) {
                    content.classList.add('active');
                }
            });
        });

        // Export resolution change handler
        const exportResolutionSelect = document.getElementById('setting-export-resolution');
        const customResolutionGroup = document.getElementById('custom-resolution-group');

        if (exportResolutionSelect && customResolutionGroup) {
            exportResolutionSelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    customResolutionGroup.style.display = 'block';
                } else {
                    customResolutionGroup.style.display = 'none';
                }
            });
        }
    },

    saveSettings() {
        // Read settings from HTML form
        const gridCheckbox = document.getElementById('setting-grid');
        const tooltipsCheckbox = document.getElementById('setting-tooltips');
        const helpersCheckbox = document.getElementById('setting-helpers');
        const darkmodeCheckbox = document.getElementById('setting-darkmode');
        const autosaveCheckbox = document.getElementById('setting-autosave');
        const bgEnabledCheckbox = document.getElementById('setting-background-enabled');
        const bgColorPicker = document.getElementById('setting-background-color');
        const ambientCheckbox = document.getElementById('setting-ambient-light');
        const ambientColorPicker = document.getElementById('setting-ambient-color');
        const exportTransparentCheckbox = document.getElementById('setting-export-transparent');
        const exportResolutionSelect = document.getElementById('setting-export-resolution');
        const customWidthInput = document.getElementById('setting-custom-width');
        const customHeightInput = document.getElementById('setting-custom-height');
        const enableTutorialsCheckbox = document.getElementById('settings-enable-tutorials');
        const showTutorialHintsCheckbox = document.getElementById('settings-show-hints');
        const showMinimapCheckbox = document.getElementById('setting-show-minimap');
        const snapToGridCheckbox = document.getElementById('setting-snap-to-grid');

        this.settings.showGrid = gridCheckbox ? gridCheckbox.checked : true;
        this.settings.showTooltips = tooltipsCheckbox ? tooltipsCheckbox.checked : true;
        this.settings.showHelpers = helpersCheckbox ? helpersCheckbox.checked : true;
        this.settings.darkMode = darkmodeCheckbox ? darkmodeCheckbox.checked : true;
        this.settings.autoSave = autosaveCheckbox ? autosaveCheckbox.checked : true;
        this.settings.backgroundEnabled = bgEnabledCheckbox ? bgEnabledCheckbox.checked : true;
        this.settings.backgroundColor = bgColorPicker ? bgColorPicker.value : '#1a1a2e';
        this.settings.ambientLight = ambientCheckbox ? ambientCheckbox.checked : true;
        this.settings.ambientColor = ambientColorPicker ? ambientColorPicker.value : '#ffffff';
        this.settings.exportTransparent = exportTransparentCheckbox ? exportTransparentCheckbox.checked : true;
        this.settings.exportResolution = exportResolutionSelect ? exportResolutionSelect.value : '1920x1080';
        this.settings.customWidth = customWidthInput ? parseInt(customWidthInput.value) : 1920;
        this.settings.customHeight = customHeightInput ? parseInt(customHeightInput.value) : 1080;
        this.settings.enableTutorials = enableTutorialsCheckbox ? enableTutorialsCheckbox.checked : true;
        this.settings.showTutorialHints = showTutorialHintsCheckbox ? showTutorialHintsCheckbox.checked : true;
        this.settings.showMinimap = showMinimapCheckbox ? showMinimapCheckbox.checked : true;
        this.settings.snapToGrid = snapToGridCheckbox ? snapToGridCheckbox.checked : false;
        // this.settings.loadDefaultBrushPresets = loadDefaultPresetsCheckbox ? loadDefaultPresetsCheckbox.checked : true;

        // Apply settings
        this.applySettings();

        // Save to localStorage
        this.saveSettingsToStorage();

        if (typeof Notifications !== 'undefined') {
            const notifications = new Notifications();
            notifications.success('Settings saved successfully');
        }
    },

    resetSettings() {
        if (confirm('Reset all settings to default values?')) {
            // Reset to defaults, using Config values where available
            const tooltipDefault = (typeof Config !== 'undefined' && Config.settings && Config.settings.tooltips) ? Config.settings.tooltips.enabled : false;
            
            this.settings = {
                showGrid: true,
                showTooltips: tooltipDefault,
                showHelpers: true,
                showMinimap: true,
                snapToGrid: false,
                darkMode: true,
                autoSave: true,
                backgroundEnabled: true,
                backgroundColor: '#1a1a2e',
                ambientLight: true,
                ambientColor: '#ffffff',
                exportTransparent: true,
                exportResolution: '1920x1080',
                customWidth: 1920,
                customHeight: 1080,
                enableTutorials: true,
                showTutorialHints: true
            };

            // Update HTML form
            this.updateFormFromSettings();

            // Apply settings
            this.applySettings();

            // Save to localStorage
            this.saveSettingsToStorage();

            if (typeof Notifications !== 'undefined') {
                const notifications = new Notifications();
                notifications.info('Settings reset to defaults');
            }
        }
    },

    applySettings() {
        // Apply dark mode setting
        if (this.settings.darkMode) {
            document.body.classList.remove('light-theme');
        } else {
            document.body.classList.add('light-theme');
        }

        // Apply grid visibility
        const gridOverlay = document.getElementById('grid-overlay');
        if (gridOverlay) {
            gridOverlay.style.display = this.settings.showGrid ? 'block' : 'none';
        }

        // Apply minimap visibility
        const previewContainer = document.getElementById('preview-container');
        if (previewContainer) {
            previewContainer.style.display = this.settings.showMinimap ? 'flex' : 'none';
        }

        // Apply auto-save setting (check if FileManager has the methods)
        if (this.settings.autoSave) {
            if (typeof FileManager !== 'undefined' && typeof FileManager.startAutoSave === 'function') {
                FileManager.startAutoSave();
            }
        } else {
            if (typeof FileManager !== 'undefined' && typeof FileManager.stopAutoSave === 'function') {
                FileManager.stopAutoSave();
            }
        }

        // Apply background settings
        if (this.settings.backgroundEnabled) {
            document.body.style.backgroundColor = this.settings.backgroundColor;
        } else {
            document.body.style.backgroundColor = '';
        }

        // Apply ambient light settings
        if (this.settings.ambientLight) {
            // Apply ambient light effect if supported
            document.body.style.setProperty('--ambient-light-color', this.settings.ambientColor);
            document.body.classList.add('ambient-light-enabled');
        } else {
            document.body.classList.remove('ambient-light-enabled');
        }

        console.log('Settings applied:', this.settings);
    },

    loadSettings() {
        try {
            const saved = localStorage.getItem('pixelart-settings');
            if (saved) {
                const loadedSettings = JSON.parse(saved);
                this.settings = { ...this.settings, ...loadedSettings };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }

        this.applySettings();
    },

    saveSettingsToStorage() {
        try {
            localStorage.setItem('pixelart-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    },

    getSettings() {
        return { ...this.settings };
    },

    updateSetting(key, value) {
        this.settings[key] = value;
        this.applySettings();
        this.saveSettingsToStorage();
    }
};
