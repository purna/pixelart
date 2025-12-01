// state.js
// Global application state

const State = {
    // Canvas dimensions
    width: Config.defaultWidth,
    height: Config.defaultHeight,
    zoom: Config.defaultZoom,
    
    // Drawing settings
    color: Config.defaultColor,
    opacity: Config.defaultOpacity,
    tool: 'pencil',
    brushSize: Config.defaultBrushSize,
    isDrawing: false,
    mirrorAxis: 'x', // 'x', 'y', or 'both'
    
    // Frame structure: { layers: [ { name: string, visible: bool, data: ImageData }, ... ] }
    frames: [],
    currentFrameIndex: 0,
    activeLayerIndex: 0,
    
    // Animation
    isPlaying: false,
    fps: Config.defaultFPS,
    timer: null,
    
    // History & UI
    recentColors: ['#000000', '#ffffff', '#3b82f6', '#ef4444', '#10b981'],
    currentPalette: ['#000000', '#ffffff', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#ff00ff', '#00ffff'],
    dragStart: { x: 0, y: 0 },
    
    // Undo/Redo history system
    history: [],
    historyIndex: -1,
    maxHistory: Config.maxHistory,
    
    // Offscreen canvases for performance
    offscreenCanvas: document.createElement('canvas'),
    layerCanvas: document.createElement('canvas')
};