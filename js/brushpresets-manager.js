// brushpresets-manager.js
// Comprehensive brush presets management system

const BrushPresetsManager = {
    presets: [],
    currentPresetIndex: null,
    storageKey: 'pixelArtBrushPresets',
    maxPresets: 20,

    init() {
        this.loadPresets();
        this.setupUI();
        this.renderPresetsList();
        
        // Always load default presets if none exist
        if (this.presets.length === 0) {
            this.loadDefaultPresets();
        }
        
        console.log('BrushPresetsManager initialized');
    },

    setupUI() {
        // Set up event listeners for preset management UI
        const addPresetBtn = document.getElementById('addPresetBtn');
        const savePresetBtn = document.getElementById('savePresetBtn');
        const cancelPresetBtn = document.getElementById('cancelPresetBtn');
        const loadDefaultPresetsBtn = document.getElementById('loadDefaultPresetsBtn');
        
        if (addPresetBtn) {
            addPresetBtn.addEventListener('click', () => this.showAddPresetDialog());
        }
        
        if (savePresetBtn) {
            savePresetBtn.addEventListener('click', () => this.savePreset());
        }
        
        if (cancelPresetBtn) {
            cancelPresetBtn.addEventListener('click', () => this.hidePresetDialog());
        }
        
        if (loadDefaultPresetsBtn) {
            loadDefaultPresetsBtn.addEventListener('click', () => this.loadDefaultPresetsFromFile());
        }
    },

    showAddPresetDialog() {
        const presetDialog = document.getElementById('presetDialog');
        const presetNameInput = document.getElementById('presetName');
        
        if (presetDialog && presetNameInput) {
            presetNameInput.value = '';
            presetDialog.style.display = 'block';
            presetNameInput.focus();
        }
    },

    hidePresetDialog() {
        const presetDialog = document.getElementById('presetDialog');
        if (presetDialog) {
            presetDialog.style.display = 'none';
        }
    },

    savePreset() {
        const presetNameInput = document.getElementById('presetName');
        if (!presetNameInput) return;
        
        const presetName = presetNameInput.value.trim();
        if (!presetName) {
            alert('Please enter a preset name');
            return;
        }
        
        // Get current brush settings
        const brushSize = parseInt(document.getElementById('brushSizeSlider')?.value) || 1;
        const brushBlur = parseInt(document.getElementById('blurSlider')?.value) || 0;
        const opacity = parseInt(document.getElementById('opacitySlider')?.value) || 100;
        const color = document.getElementById('colorPicker')?.value || '#00ff41';
        
        // Create preset object
        const preset = {
            id: Date.now().toString(),
            name: presetName,
            brushSize: brushSize,
            brushBlur: brushBlur,
            opacity: opacity,
            color: color,
            createdAt: new Date().toISOString(),
            lastUsed: null
        };
        
        // Add to presets array
        this.presets.push(preset);
        
        // Save and update UI
        this.savePresets();
        this.renderPresetsList();
        this.hidePresetDialog();
        
        console.log('Preset saved:', preset);
    },

    loadPresets() {
        try {
            const savedPresets = localStorage.getItem(this.storageKey);
            if (savedPresets) {
                this.presets = JSON.parse(savedPresets);
                console.log('Loaded presets:', this.presets.length);
            }
        } catch (error) {
            console.error('Error loading presets:', error);
        }
    },

    savePresets() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
            console.log('Presets saved:', this.presets.length);
        } catch (error) {
            console.error('Error saving presets:', error);
        }
    },

    renderPresetsList() {
        const presetsContainer = document.getElementById('presetsContainer');
        if (!presetsContainer) return;
        
        // Clear existing presets
        presetsContainer.innerHTML = '';
        
        // Create preset items
        this.presets.forEach((preset, index) => {
            const presetItem = document.createElement('div');
            presetItem.className = 'preset-item';
            presetItem.dataset.presetId = preset.id;
            
            // Create preview swatch
            const previewSwatch = document.createElement('div');
            previewSwatch.className = 'preset-preview';
            previewSwatch.style.backgroundColor = preset.color;
            previewSwatch.style.width = '30px'; // `${preset.brushSize * 5}px`;
            previewSwatch.style.height = '30px'; // `${preset.brushSize * 5}px`;
            
            // Create info section
            const infoSection = document.createElement('div');
            infoSection.className = 'preset-info';
            
            const nameElement = document.createElement('div');
            nameElement.className = 'preset-name';
            nameElement.textContent = preset.name;
            
            const detailsElement = document.createElement('div');
            detailsElement.className = 'preset-details-inline';
            detailsElement.innerHTML = `
                <div class="preset-detail">Size: ${preset.brushSize}</div>
                <div class="preset-detail">Blur: ${preset.brushBlur}</div>
                <div class="preset-detail">Opacity: ${preset.opacity}%</div>
            `;

            // Create hover tooltip element
            const hoverTooltip = document.createElement('div');
            hoverTooltip.className = 'preset-details';
            hoverTooltip.innerHTML = `
                <div class="preset-detail">Size: ${preset.brushSize}px</div>
                <div class="preset-detail">Blur: ${preset.brushBlur}px</div>
                <div class="preset-detail">Opacity: ${preset.opacity}%</div>
            `;
            
            // Create action buttons
            const actionsElement = document.createElement('div');
            actionsElement.className = 'preset-actions';
            
            const applyBtn = document.createElement('button');
            applyBtn.className = 'preset-action-btn apply-btn';
            applyBtn.innerHTML = '<i class="fas fa-check"></i>';
            applyBtn.title = 'Apply Preset';
            applyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.applyPreset(index);
            });
            
            const editBtn = document.createElement('button');
            editBtn.className = 'preset-action-btn edit-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Edit Preset';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editPreset(index);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'preset-action-btn delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete Preset';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePreset(index);
            });
            
            // Assemble elements
            actionsElement.appendChild(applyBtn);
            actionsElement.appendChild(editBtn);
            actionsElement.appendChild(deleteBtn);
            
            infoSection.appendChild(nameElement);
            infoSection.appendChild(detailsElement);
            infoSection.appendChild(actionsElement);

            presetItem.appendChild(previewSwatch);
            presetItem.appendChild(infoSection);
            presetItem.appendChild(hoverTooltip);
            
            // Add click handler for the whole item
            presetItem.addEventListener('click', () => {
                this.applyPreset(index);
            });
            
            presetsContainer.appendChild(presetItem);
        });
        
        // Show/hide empty state
        const emptyState = document.getElementById('presetsEmptyState');
        if (emptyState) {
            emptyState.style.display = this.presets.length > 0 ? 'none' : 'block';
        }
    },

    applyPreset(index) {
        if (index < 0 || index >= this.presets.length) return;
        
        const preset = this.presets[index];
        
        // Update current brush settings
        if (document.getElementById('brushSizeSlider')) {
            document.getElementById('brushSizeSlider').value = preset.brushSize;
            document.getElementById('brushSizeDisplay').textContent = preset.brushSize;
        }
        
        if (document.getElementById('blurSlider')) {
            document.getElementById('blurSlider').value = preset.brushBlur;
            document.getElementById('blurDisplay').textContent = preset.brushBlur;
        }
        
        if (document.getElementById('opacitySlider')) {
            document.getElementById('opacitySlider').value = preset.opacity;
            document.getElementById('opacityDisplay').textContent = preset.opacity;
        }
        
        if (document.getElementById('colorPicker')) {
            document.getElementById('colorPicker').value = preset.color;
            document.getElementById('colorHex').value = preset.color;
        }
        
        // Update last used timestamp
        preset.lastUsed = new Date().toISOString();
        this.savePresets();
        
        // Update UI to show which preset is active
        this.currentPresetIndex = index;
        this.updateActivePresetUI();
        
        console.log('Applied preset:', preset.name);
        
        // Trigger events to update tool settings
        this.triggerBrushSettingsUpdate();
    },

    editPreset(index) {
        if (index < 0 || index >= this.presets.length) return;
        
        const preset = this.presets[index];
        const presetNameInput = document.getElementById('presetName');
        
        if (presetNameInput) {
            presetNameInput.value = preset.name;
            this.currentPresetIndex = index;
            this.showAddPresetDialog();
        }
    },

    deletePreset(index) {
        if (index < 0 || index >= this.presets.length) return;
        
        const presetName = this.presets[index].name;
        const confirmDelete = confirm(`Delete preset "${presetName}"? This cannot be undone.`);
        
        if (confirmDelete) {
            this.presets.splice(index, 1);
            this.savePresets();
            this.renderPresetsList();
            
            // If we deleted the current preset, reset current preset
            if (this.currentPresetIndex === index) {
                this.currentPresetIndex = null;
                this.updateActivePresetUI();
            }
            
            console.log('Deleted preset:', presetName);
        }
    },

    updateActivePresetUI() {
        // Remove active class from all preset items
        document.querySelectorAll('.preset-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current preset
        if (this.currentPresetIndex !== null) {
            const presetItems = document.querySelectorAll('.preset-item');
            if (presetItems[this.currentPresetIndex]) {
                presetItems[this.currentPresetIndex].classList.add('active');
            }
        }
    },

    triggerBrushSettingsUpdate() {
        // Trigger input events to update the tool manager
        const brushSizeSlider = document.getElementById('brushSizeSlider');
        const blurSlider = document.getElementById('blurSlider');
        const opacitySlider = document.getElementById('opacitySlider');
        const colorPicker = document.getElementById('colorPicker');
        
        if (brushSizeSlider) {
            brushSizeSlider.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (blurSlider) {
            blurSlider.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (opacitySlider) {
            opacitySlider.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (colorPicker) {
            colorPicker.dispatchEvent(new Event('input', { bubbles: true }));
        }
    },

    // Additional utility methods
    getPresetById(presetId) {
        return this.presets.find(preset => preset.id === presetId);
    },

    getCurrentPreset() {
        if (this.currentPresetIndex !== null && this.currentPresetIndex >= 0 && this.currentPresetIndex < this.presets.length) {
            return this.presets[this.currentPresetIndex];
        }
        return null;
    },

    loadDefaultPresetsFromFile() {
        fetch('brushpresets.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load brushpresets.json');
                }
                return response.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                        // Check if we already have presets
                    if (this.presets.length > 0) {
                        const choice = confirm('Load default brush presets? Click OK to replace current presets, or Cancel to append them.');
                        if (choice) {
                            // Replace presets
                            this.presets = data;
                        } else {
                            // Append presets (avoiding duplicates by name)
                            const existingNames = new Set(this.presets.map(p => p.name));
                            const newPresets = data.filter(p => !existingNames.has(p.name));
                            this.presets = [...this.presets, ...newPresets];
                        }
                    } else {
                        // No existing presets, just load them
                        this.presets = data;
                    }
                    this.savePresets();
                    this.renderPresetsList();
                    this.currentPresetIndex = null;
                    this.updateActivePresetUI();
                    
                    console.log('Default brush presets loaded:', this.presets.length);
                    
                    if (typeof Notifications !== 'undefined') {
                        const notifications = new Notifications();
                        notifications.success(`${this.presets.length} default brush presets loaded`);
                    }
                } else {
                    throw new Error('Invalid presets data format');
                }
            })
            .catch(error => {
                console.error('Error loading default presets:', error);
                if (typeof Notifications !== 'undefined') {
                    const notifications = new Notifications();
                    notifications.error('Failed to load default brush presets');
                }
            });
    },

    clearAllPresets() {
        const confirmClear = confirm('Delete ALL brush presets? This cannot be undone.');
        
        if (confirmClear) {
            this.presets = [];
            this.currentPresetIndex = null;
            this.savePresets();
            this.renderPresetsList();
            this.updateActivePresetUI();
            console.log('All presets cleared');
        }
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrushPresetsManager;
}