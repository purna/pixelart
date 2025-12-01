// app.js
// Application initialization and startup

/**
 * Initialize the application
 */
function init() {

    initDOM();

    // Initialize canvas with default size
    CanvasManager.init(Config.defaultWidth, Config.defaultHeight);
    
    // Render initial UI
    ColorManager.render();
    LayerManager.renderList();
    AnimationManager.renderTimeline();
    FilterManager.initFilters();
    
    // Initialize UI management
    UIManager.init();
    
    // Load user settings
    InputHandler.loadSettings();
    
    // Save initial state for undo/redo
    InputHandler.saveState();
    
    // Set up event listeners
    InputHandler.init();

    // Initialize tilemap manager (must be after DOM and canvas setup)
    if (typeof TilemapManager !== 'undefined') {
        TilemapManager.init();
    }
    
    console.log('PixlPro v3.1 initialized');
    console.log('Keyboard shortcuts:');
    console.log('  P - Pencil, B - Brush, E - Eraser, F - Fill');
    console.log('  D - Dither');
    console.log('  L - Line, R - Rectangle, C - Circle');
    console.log('  I - Eyedropper, M - Move');
    console.log('  Space - Play/Stop animation');
    console.log('  Arrow Keys - Navigate frames');
    console.log('  +/- - Zoom in/out, 0 - Reset zoom');
    console.log('  Ctrl+S - Save project, Ctrl+O - Load project');
    console.log('  Ctrl+Scroll - Zoom');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init); // Correctly waits for DOM
} else {
    init();
}