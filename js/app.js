// app.js
// Application initialization and startup

// Create app object to hold all managers and systems
const app = {
    tutorialConfig: tutorialConfig,
    databaseManager: null
};

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

    // Initialize color history overlay
    if (typeof ColorManager !== 'undefined') {
        ColorManager.initColorHistory();
    }

    // Initialize Settings Manager first
    if (typeof SettingsManager !== 'undefined') {
        SettingsManager.init();
    }

    // Initialize brush presets manager
    if (typeof BrushPresetsManager !== 'undefined') {
        BrushPresetsManager.init();
    }

    // Initialize UI management
    UIManager.init();

    // Load user settings using the new SettingsManager first
    if (typeof SettingsManager !== 'undefined') {
        SettingsManager.loadSettings();
    } else {
        // Fallback to old InputHandler if SettingsManager not available
        if (typeof InputHandler !== 'undefined') {
            InputHandler.loadSettings();
        }
    }

    // Initialize tutorial system after settings are loaded
    if (typeof TutorialSystem !== 'undefined') {
        app.tutorialSystem = new TutorialSystem(app);
        app.tutorialSystem.init();
    }

    // Initialize database manager
    if (typeof DatabaseManager !== 'undefined') {
        app.databaseManager = new DatabaseManager(app);
    }

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

    // Test tutorial system initialization
    console.log('Tutorial System initialized:', typeof app.tutorialSystem !== 'undefined');
    if (typeof app.tutorialSystem !== 'undefined') {
        console.log('Tutorial System is ready');
    }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init); // Correctly waits for DOM
} else {
    init();
}