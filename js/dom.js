// dom.js
// DOM element references and context initialization

// 1. Define UI object with initial null references
const UI = {
    // Canvas elements
    compositionCanvas: null,
    previewLayer: null,
    gridOverlay: null,
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
    opacityDisplay: null,
    brushSizeDisplay: null,
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
    
    // Inputs
    widthInput: null,
    heightInput: null,
    fileInput: null
};

// 2. Define global context variables (will be assigned later in initDOM)
let ctx, pCtx, offCtx, layerCtx, prevCtx;

// 3. Initialization function to be called after DOMContentLoaded
const initDOM = () => {
    // Canvas elements
    UI.compositionCanvas = document.getElementById('layer-composition');
    UI.previewLayer = document.getElementById('previewLayer');
    UI.gridOverlay = document.getElementById('grid-overlay');
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
    UI.opacityDisplay = document.getElementById('opacityDisplay');
    UI.brushSizeDisplay = document.getElementById('brushSizeDisplay');
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
    
    // Settings panel elements
    UI.showGrid = document.getElementById('showGrid');
    UI.snapToGrid = document.getElementById('snapToGrid');
    UI.showMinimap = document.getElementById('showMinimap');
    UI.darkMode = document.getElementById('darkMode');
    UI.autoSave = document.getElementById('autoSave');
    UI.showCoords = document.getElementById('showCoords');
    UI.applySettingsBtn = document.getElementById('apply-settings');
    UI.resetSettingsBtn = document.getElementById('resetSettingsBtn');
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
    
    // Inputs
    UI.widthInput = document.getElementById('widthInput');
    UI.heightInput = document.getElementById('heightInput');
    UI.fileInput = document.getElementById('fileInput');
    
    // Initialize canvas contexts after all elements are found
    ctx = UI.compositionCanvas.getContext('2d');
    pCtx = UI.previewLayer.getContext('2d');
    offCtx = State.offscreenCanvas.getContext('2d');
    layerCtx = State.layerCanvas.getContext('2d');
    prevCtx = UI.previewCanvas.getContext('2d');
};

// 4. Function to update UI checkboxes based on settings
const updateSettingsUI = (settings) => {
    // Update UI checkboxes
    UI.showGrid.checked = settings.showGrid;
    UI.snapToGrid.checked = settings.snapToGrid;
    UI.showMinimap.checked = settings.showMinimap;
    UI.darkMode.checked = settings.darkMode;
    UI.autoSave.checked = settings.autoSave;
    UI.showCoords.checked = settings.showCoords;
};