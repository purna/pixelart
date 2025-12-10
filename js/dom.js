// dom.js
// DOM element references and context initialization

// 1. Define UI object with initial null references
const UI = {
    // Canvas elements
    compositionCanvas: null,
    previewLayer: null,
    gridOverlay: null,
    tilemapOverlay: null,
    drawingArea: null,
    wrapper: null,
    
    // Timeline and layers
    framesList: null,
    layersList: null,
    
    // Preview window
    previewCanvas: null,
    minimapOverlay: null,
    previewContainer: null,
    
    // Controls
    colorPicker: null,
    colorHex: null,
    opacitySlider: null,
    brushSizeSlider: null,
    blurSlider: null,
    opacityDisplay: null,
    brushSizeDisplay: null,
    blurDisplay: null,
    toolBtns: null,
    fpsSlider: null,
    fpsDisplay: null,

    // Palette & New Controls
    paletteContainer: null,
    saveColorBtn: null,
    paletteFileInput: null,
    importPaletteUrlBtn: null,
    
    // Panel elements
    sidePanel: null,
    
    // Settings panel elements
    showGrid: null,
    snapToGrid: null,
    showMinimap: null,
    darkMode: null,
    autoSave: null,
    showCoords: null,
    applySettingsBtn: null,
    resetSettingsBtn: null,
    exportSettingsBtn: null,
    saveToBrowserBtn: null,
    loadFromBrowserBtn: null,
    
    // Info displays
    coords: null,
    zoomDisplay: null,
    zoomPercentage: null,
    
    // Buttons
    undoBtn: null,
    redoBtn: null,
    addLayerBtn: null,
    addFrameBtn: null,
    duplicateFrameBtn: null,
    deleteFrameBtn: null,
    playBtn: null,
    stopBtn: null,
    downloadSheetBtn: null,
    saveProjectBtn: null,
    loadProjectBtn: null,
    zoomInBtn: null,
    zoomOutBtn: null,
    zoomResetBtn: null,
    layersBtn: null,
    settingsBtn: null,
    settingsToggle: null,
    tilemapBtn: null,
    filtersBtn: null,
    rotateBtn: null,
    flipBtn: null,
    alignCenterBtn: null,
    closeLayersPanelBtn: null,
    closeTilemapPanelBtn: null,

    // Mirror Controls
    mirrorOptions: null,
    mirrorX: null,
    mirrorY: null,
    
    // Inputs
    widthInput: null,
    heightInput: null,
    fileInput: null
};

// 2. Define global context variables (will be assigned later in initDOM)
let ctx, pCtx, offCtx, layerCtx, prevCtx, tilemapCtx;

// 3. Initialization function to be called after DOMContentLoaded
const initDOM = () => {
    // Canvas elements
    UI.compositionCanvas = document.getElementById('layer-composition');
    UI.previewLayer = document.getElementById('previewLayer');
    UI.gridOverlay = document.getElementById('grid-overlay');
    UI.tilemapOverlay = document.getElementById('tilemap-overlay');
    UI.drawingArea = document.getElementById('drawing-area');
    UI.wrapper = document.getElementById('canvas-wrapper');
    
    // Timeline and layers
    UI.framesList = document.getElementById('frames-list');
    UI.layersList = document.getElementById('layers-list');
    
    // Preview window
    UI.previewCanvas = document.getElementById('previewCanvas');
    UI.minimapOverlay = document.getElementById('minimap-overlay');
    UI.previewContainer = document.getElementById('preview-container');
    
    // Controls
    UI.colorPicker = document.getElementById('colorPicker');
    UI.colorHex = document.getElementById('colorHex');
    UI.opacitySlider = document.getElementById('opacitySlider');
    UI.brushSizeSlider = document.getElementById('brushSizeSlider');
    UI.blurSlider = document.getElementById('blurSlider');
    UI.opacityDisplay = document.getElementById('opacityDisplay');
    UI.brushSizeDisplay = document.getElementById('brushSizeDisplay');
    UI.blurDisplay = document.getElementById('blurDisplay');
    UI.toolBtns = document.querySelectorAll('#tool-buttons .tool-btn');
    UI.fpsSlider = document.getElementById('fpsSlider');
    UI.fpsDisplay = document.getElementById('fpsDisplay');

    // Palette & New Controls
    UI.paletteContainer = document.getElementById('palette-container');
    UI.saveColorBtn = document.getElementById('saveColorBtn');
    UI.paletteFileInput = document.getElementById('paletteFileInput');
    UI.importPaletteUrlBtn = document.getElementById('importPaletteUrlBtn');
    
    // Panel elements
    UI.sidePanel = document.getElementById('side-panel');
    UI.layersPanel = document.getElementById('layers-panel');
    UI.tilemapPanel = document.getElementById('tilemap-panel');
    
    // Settings panel elements - use new modal-based checkbox IDs
    UI.showGrid = document.getElementById('setting-grid');
    UI.snapToGrid = document.getElementById('setting-snap-to-grid');
    UI.showMinimap = document.getElementById('setting-show-minimap');
    UI.darkMode = document.getElementById('setting-darkmode');
    UI.autoSave = document.getElementById('setting-autosave');
    UI.showCoords = document.getElementById('setting-show-coords');
    UI.applySettingsBtn = document.getElementById('btn-settings-save');
    UI.resetSettingsBtn = document.getElementById('btn-settings-reset');
    UI.exportSettingsBtn = document.getElementById('exportSettingsBtn');
    UI.saveToBrowserBtn = document.getElementById('saveToBrowserBtn');
    UI.loadFromBrowserBtn = document.getElementById('loadFromBrowserBtn');
    
    // Info displays
    UI.coords = document.getElementById('coords');
    UI.zoomDisplay = document.getElementById('zoomDisplay');
    UI.zoomPercentage = document.getElementById('zoomPercentage');
    
    // Buttons
    UI.undoBtn = document.getElementById('undoBtn');
    UI.redoBtn = document.getElementById('redoBtn');
    UI.addLayerBtn = document.getElementById('addLayerBtn');
    UI.addFrameBtn = document.getElementById('addFrameBtn');
    UI.duplicateFrameBtn = document.getElementById('duplicateFrameBtn');
    UI.deleteFrameBtn = document.getElementById('deleteFrameBtn');
    UI.playBtn = document.getElementById('playBtn');
    UI.stopBtn = document.getElementById('stopBtn');
    UI.downloadSheetBtn = document.getElementById('downloadSheetBtn');
    UI.saveProjectBtn = document.getElementById('saveProjectBtn');
    UI.loadProjectBtn = document.getElementById('loadProjectBtn');
    UI.zoomInBtn = document.getElementById('zoomInBtn');
    UI.zoomOutBtn = document.getElementById('zoomOutBtn');
    UI.zoomResetBtn = document.getElementById('zoomResetBtn');
    UI.layersBtn = document.getElementById('layersBtn');
    UI.settingsBtn = document.getElementById('settingsBtn');
    UI.settingsToggle = document.getElementById('settings-toggle');
    UI.tilemapBtn = document.getElementById('tilemapBtn');
    UI.filtersBtn = document.getElementById('filtersBtn');
    UI.rotateBtn = document.getElementById('rotateBtn');
    UI.flipBtn = document.getElementById('flipBtn');
    UI.alignCenterBtn = document.getElementById('alignCenterBtn');
    UI.closeLayersPanelBtn = document.getElementById('close-layers-panel');
    UI.closeTilemapPanelBtn = document.getElementById('close-tilemap-panel');

    // Mirror Controls
    UI.mirrorOptions = document.getElementById('mirror-options');
    UI.mirrorX = document.getElementById('mirrorX');
    UI.mirrorY = document.getElementById('mirrorY');
    UI.mirrorBoth = document.getElementById('mirrorBoth');
    
    // Inputs
    UI.widthInput = document.getElementById('widthInput');
    UI.heightInput = document.getElementById('heightInput');
    UI.fileInput = document.getElementById('fileInput');
    
    // Initialize canvas contexts after all elements are found
    // Use willReadFrequently for canvases that will be read often with getImageData
    ctx = UI.compositionCanvas.getContext('2d', { willReadFrequently: true });
    pCtx = UI.previewLayer.getContext('2d', { willReadFrequently: true });
    offCtx = State.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    layerCtx = State.layerCanvas.getContext('2d', { willReadFrequently: true });
    prevCtx = UI.previewCanvas.getContext('2d', { willReadFrequently: true });
    tilemapCtx = UI.tilemapOverlay.getContext('2d', { willReadFrequently: true });
};

// 4. Function to update UI checkboxes based on settings
const updateSettingsUI = (settings) => {
    // Skip if SettingsManager is handling settings
    if (typeof SettingsManager !== 'undefined') {
        console.log('SettingsManager is handling settings UI updates, skipping DOM updates');
        return;
    }

    // Update UI checkboxes - use new modal-based checkbox IDs
    if (UI.showGrid) UI.showGrid.checked = settings.showGrid;
    if (UI.snapToGrid) UI.snapToGrid.checked = settings.snapToGrid;
    if (UI.showMinimap) UI.showMinimap.checked = settings.showMinimap;
    if (UI.darkMode) UI.darkMode.checked = settings.darkMode;
    if (UI.autoSave) UI.autoSave.checked = settings.autoSave;
    if (UI.showCoords) UI.showCoords.checked = settings.showCoords;
};