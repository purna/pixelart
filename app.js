// app.js
// Application initialization and startup

/**
 * Initialize the application
 */
function init() {
    // Initialize canvas with default size
    CanvasManager.init(Config.defaultWidth, Config.defaultHeight);
    
    // Render initial UI
    ColorManager.render();
    LayerManager.renderList();
    AnimationManager.renderTimeline();
    
    // Set up event listeners
    InputHandler.init();
    
    console.log('PixlPro v3.1 initialized');
    console.log('Keyboard shortcuts:');
    console.log('  P - Pencil, B - Brush, E - Eraser, F - Fill');
    console.log('  L - Line, R - Rectangle, C - Circle');
    console.log('  I - Eyedropper, M - Move, D - Dither');
    console.log('  Space - Play/Stop animation');
    console.log('  Arrow Keys - Navigate frames');
    console.log('  Ctrl+S - Save project, Ctrl+O - Load project');
    console.log('  Ctrl+Scroll - Zoom');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
