// dom.js
// DOM element references and context initialization

const UI = {
    // Canvas elements
    compositionCanvas: document.getElementById('layer-composition'),
    previewLayer: document.getElementById('previewLayer'),
    gridOverlay: document.getElementById('grid-overlay'),
    drawingArea: document.getElementById('drawing-area'),
    wrapper: document.getElementById('canvas-wrapper'),
    
    // Timeline and layers
    framesList: document.getElementById('frames-list'),
    layersList: document.getElementById('layers-list'),
    
    // Preview window
    previewCanvas: document.getElementById('previewCanvas'),
    minimapOverlay: document.getElementById('minimap-overlay'),
    previewContainer: document.getElementById('preview-container'),
    
    // Controls
    colorPicker: document.getElementById('colorPicker'),
    colorHex: document.getElementById('colorHex'),
    opacitySlider: document.getElementById('opacitySlider'),
    brushSizeSlider: document.getElementById('brushSizeSlider'),
    brushSizeDisplay: document.getElementById('brushSizeDisplay'),
    toolBtns: document.querySelectorAll('.tool-btn'),
    fpsSlider: document.getElementById('fpsSlider'),
    fpsDisplay: document.getElementById('fpsDisplay'),
    
    // Info displays
    coords: document.getElementById('coords'),
    zoomDisplay: document.getElementById('zoomDisplay'),
    paletteContainer: document.getElementById('palette-history'),
    
    // Buttons
    addLayerBtn: document.getElementById('addLayerBtn'),
    addFrameBtn: document.getElementById('addFrameBtn'),
    duplicateFrameBtn: document.getElementById('duplicateFrameBtn'),
    deleteFrameBtn: document.getElementById('deleteFrameBtn'),
    playBtn: document.getElementById('playBtn'),
    stopBtn: document.getElementById('stopBtn'),
    resizeBtn: document.getElementById('resizeBtn'),
    downloadSheetBtn: document.getElementById('downloadSheetBtn'),
    saveProjectBtn: document.getElementById('saveProjectBtn'),
    loadProjectBtn: document.getElementById('loadProjectBtn'),
    
    // Inputs
    widthInput: document.getElementById('widthInput'),
    heightInput: document.getElementById('heightInput'),
    fileInput: document.getElementById('fileInput')
};

// Initialize canvas contexts
const ctx = UI.compositionCanvas.getContext('2d');
const pCtx = UI.previewLayer.getContext('2d');
const offCtx = State.offscreenCanvas.getContext('2d');
const layerCtx = State.layerCanvas.getContext('2d');
const prevCtx = UI.previewCanvas.getContext('2d');
