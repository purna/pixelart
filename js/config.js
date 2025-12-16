// config.js
// Application constants and configuration
//
// HOW TO USE:
// 1. Modify the settings below to customize your application behavior
// 2. Tooltips are DISABLED by default (enabled: false)
// 3. To enable tooltips, change: settings.tooltips.enabled = true
// 4. Other UI settings can be customized in the settings object
//
// Example usage in other files:
// if (Config.settings.tooltips.enabled) {
//     // Show tooltips
// }
//
// The SettingsManager will sync with these defaults and allow
// users to change settings through the UI.

const Config = {
    // Canvas and Drawing Settings
    maxHistory: 20,
    maxFrames: 100,
    maxSize: 128,
    minSize: 4,
    defaultWidth: 32,
    defaultHeight: 32,
    defaultZoom: 20,
    defaultFPS: 12,
    defaultColor: '#000000',
    defaultOpacity: 1.0,
    defaultBrushSize: 1,
    
    // UI Settings
    settings: {
        tooltips: {
            enabled: false,        // Tooltips disabled by default
            delay: 500,           // Delay before showing tooltip (ms)
            duration: 3000        // How long tooltip stays visible (ms)
        },
        ui: {
            animations: true,     // Enable UI animations
            compactMode: false,   // Compact interface mode
            showMinimap: true,    // Show mini map
            autoSave: true        // Auto-save changes
        },
        panels: {
            autoHide: false,      // Auto-hide panels when not in use
            snapToEdges: true,    // Snap panels to screen edges
            rememberPosition: true // Remember panel positions
        }
    },
    
    // Performance Settings
    performance: {
        renderQuality: 'high',    // 'low', 'medium', 'high'
        antialiasing: true,       // Enable anti-aliasing
        hardwareAcceleration: true // Use hardware acceleration
    }
};
