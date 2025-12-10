/**
 * Tutorial System
 *
 * Handles the display and interaction of tutorial steps
 */

class TutorialSystem {
    constructor(app) {
        this.app = app;
        this.config = app.tutorialConfig;
        this.currentTutorialStep = null;
        this.tutorialElement = null;
        this.overlayElement = null;
        this.isInitialized = false;
    }

    init() {
        // Create tutorial elements
        this.createTutorialElements();

        // Add tutorial toggle to settings
        this.addTutorialSetting();

        // Initialize event listeners
        this.setupEventListeners();

        // Add resize handler
        window.addEventListener('resize', () => this.handleResize());

        this.isInitialized = true;
    }

    createTutorialElements() {
        // Create overlay
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'tutorial-overlay';
        document.body.appendChild(this.overlayElement);

        // Create tutorial container
        this.tutorialElement = document.createElement('div');
        this.tutorialElement.id = 'tutorial-container';
        document.body.appendChild(this.tutorialElement);

        // Add tutorial content structure
        this.tutorialElement.innerHTML = `
            <div id="tutorial-header">
                <h3 id="tutorial-heading"></h3>
                <button id="tutorial-close">×</button>
            </div>
            <div id="tutorial-content"></div>
            <div id="tutorial-controls">
                <div id="tutorial-buttons">
                    <button id="tutorial-prev" class="tutorial-btn" style="display: none;">Previous</button>
                    <button id="tutorial-next" class="tutorial-btn">Next</button>
                </div>
                <div id="tutorial-progress-dots"></div>
            </div>
        `;
    }

    addTutorialSetting() {
        // Check if tutorial settings already exist in the modal (new structure)
        const existingTutorialCheckbox = document.getElementById('settings-enable-tutorials');
        const existingStartBtn = document.getElementById('startTutorialBtn');

        // If settings don't exist, try to add them to the old panel-settings structure
        if (!existingTutorialCheckbox && !existingStartBtn) {
            const settingsPanel = document.getElementById('panel-settings');
            if (settingsPanel) {
                const tutorialSettingHTML = `
                    <div class="control-section">
                        <div class="section-title" style="margin-bottom: 12px;">
                            <span>Tutorial Settings</span>
                        </div>

                        <div class="setting-item" style="margin-bottom: 12px;">
                            <label class="setting-label">
                                <input type="checkbox" id="enableTutorialsSettings" checked>
                                <span class="checkmark"></span> Enable Tutorials
                            </label>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; margin-left: 30px;">
                                Show interactive tutorials on startup
                            </div>
                        </div>

                        <div class="setting-item" style="margin-bottom: 16px;">
                            <label class="setting-label">
                                <input type="checkbox" id="showTutorialHints" checked>
                                <span class="checkmark"></span> Show Tutorial Hints
                            </label>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; margin-left: 30px;">
                                Display helpful hints and tooltips
                            </div>
                        </div>

                        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                            <button id="startTutorialBtn" class="full-btn" style="margin-bottom: 8px;">
                                <i class="fas fa-graduation-cap"></i> Start Tutorial
                            </button>
                            <button id="resetTutorialBtn" class="full-btn secondary">
                                <i class="fas fa-redo"></i> Reset Tutorial Progress
                            </button>
                        </div>
                    </div>
                `;

                // Insert before storage section
                const storageSection = settingsPanel.querySelector('.control-section:last-child');
                if (storageSection) {
                    storageSection.insertAdjacentHTML('beforebegin', tutorialSettingHTML);
                } else {
                    settingsPanel.insertAdjacentHTML('beforeend', tutorialSettingHTML);
                }
            }
        }

        // Use the settings from the modal if they exist, otherwise use the old ones
        const enableTutorialsCheckbox = document.getElementById('settings-enable-tutorials') ||
                                        document.getElementById('enableTutorialsSettings');
        const showTutorialHintsCheckbox = document.getElementById('settings-show-hints') ||
                                        document.getElementById('showTutorialHints');
        const startTutorialBtn = document.getElementById('startTutorialBtn');
        const resetTutorialBtn = document.getElementById('resetTutorialBtn');

        if (enableTutorialsCheckbox) {
            // Set default to enabled (checked) but respect SettingsManager if available
            const tutorialsEnabled = typeof SettingsManager !== 'undefined' ? SettingsManager.settings.enableTutorials : true;
            enableTutorialsCheckbox.checked = tutorialsEnabled;
            this.app.tutorialConfig.tutorials.main.enabled = tutorialsEnabled;

            enableTutorialsCheckbox.addEventListener('change', (e) => {
                this.app.tutorialConfig.tutorials.main.enabled = e.target.checked;
                if (!e.target.checked && this.config.isTutorialActive()) {
                    this.hideTutorial();
                }
            });
        }

        if (showTutorialHintsCheckbox) {
            showTutorialHintsCheckbox.checked = true;
            showTutorialHintsCheckbox.addEventListener('change', (e) => {
                // Store hint preference
                this.app.tutorialConfig.showHints = e.target.checked;
            });
        }

        if (startTutorialBtn) {
            startTutorialBtn.addEventListener('click', () => {
                this.startTutorial('main');
            });
        }

        if (resetTutorialBtn) {
            resetTutorialBtn.addEventListener('click', () => {
                this.config.resetTutorial();
                if (typeof Notifications !== 'undefined') {
                    const notifications = new Notifications();
                    notifications.info('Tutorial progress has been reset. You can start over anytime.');
                }
            });
        }

        // Auto-start tutorial if enabled in settings
        this.autoStartTutorialIfEnabled();
    }

    /**
     * Check if tutorials are enabled and auto-start if needed
     */
    autoStartTutorialIfEnabled() {
        // Check if tutorials are enabled - prioritize SettingsManager if available
        let tutorialsEnabled = false;

        if (typeof SettingsManager !== 'undefined') {
            // Use SettingsManager settings if available
            tutorialsEnabled = SettingsManager.settings.enableTutorials;
        } else {
            // Fallback to DOM checkbox state if SettingsManager not available
            const oldEnableTutorialsCheckbox = document.getElementById('enableTutorialsSettings');
            const newEnableTutorialsCheckbox = document.getElementById('settings-enable-tutorials');
            tutorialsEnabled = (oldEnableTutorialsCheckbox && oldEnableTutorialsCheckbox.checked) ||
                             (newEnableTutorialsCheckbox && newEnableTutorialsCheckbox.checked);
        }

        if (tutorialsEnabled) {
            // Small delay to ensure DOM is fully ready
            setTimeout(() => {
                this.startTutorial('main', true);
            }, 500);
        }
    }

    setupEventListeners() {
        // Tutorial control buttons
        const closeBtn = document.getElementById('tutorial-close');
        const nextBtn = document.getElementById('tutorial-next');
        const skipBtn = document.getElementById('tutorial-skip');
        const prevBtn = document.getElementById('tutorial-prev');

        if (closeBtn) closeBtn.addEventListener('click', () => this.hideTutorial());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
        if (skipBtn) skipBtn.addEventListener('click', () => this.hideTutorial());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevStep());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.config.isTutorialActive()) return;

            // Escape to close tutorial
            if (e.key === 'Escape') {
                this.hideTutorial();
            }
            // Right arrow for next
            else if (e.key === 'ArrowRight') {
                this.nextStep();
            }
            // Left arrow for previous
            else if (e.key === 'ArrowLeft') {
                this.prevStep();
            }
        });
    }

    startTutorial(tutorialId, isAutoStart = false) {
        // Check if tutorials are enabled - prioritize SettingsManager if available
        let tutorialsEnabled = false;

        if (typeof SettingsManager !== 'undefined') {
            // Use SettingsManager settings if available
            tutorialsEnabled = SettingsManager.settings.enableTutorials;
        } else {
            // Fallback to DOM checkbox state if SettingsManager not available
            const oldEnableTutorialsCheckbox = document.getElementById('enableTutorialsSettings');
            const newEnableTutorialsCheckbox = document.getElementById('settings-enable-tutorials');
            tutorialsEnabled = (oldEnableTutorialsCheckbox && oldEnableTutorialsCheckbox.checked) ||
                             (newEnableTutorialsCheckbox && newEnableTutorialsCheckbox.checked);
        }

        if (!tutorialsEnabled) {
            console.log('Tutorials are disabled in settings');
            return;
        }

        // Check if tutorial is already active
        if (this.config.isTutorialActive()) {
            console.log('Tutorial is already active');
            return;
        }

        this.config.startTutorial(tutorialId);
        this.showCurrentStep();

        // Show notification for auto-start
        if (isAutoStart && typeof Notifications !== 'undefined') {
            const notifications = new Notifications();
            notifications.info('Welcome! Starting interactive tutorial...');
        }
    }

    showCurrentStep() {
        const step = this.config.getCurrentStep();
        if (!step) {
            this.hideTutorial();
            return;
        }

        this.currentTutorialStep = step;

        // Position tutorial based on step configuration
        this.positionTutorial(step);

        // Update content
        const headingElement = document.getElementById('tutorial-heading');
        const contentElement = document.getElementById('tutorial-content');
        if (headingElement) headingElement.textContent = step.heading;
        if (contentElement) contentElement.textContent = step.content;

        // Show/hide previous button
        const prevBtn = document.getElementById('tutorial-prev');
        if (prevBtn) {
            prevBtn.style.display = this.config.currentStep > 0 ? 'inline-block' : 'none';
        }

        // Show tutorial
        this.tutorialElement.style.display = 'block';
        this.overlayElement.style.display = 'block';

        // Update progress dots
        this.updateProgressDots();

        // Highlight target element if it exists
        this.highlightTargetElement(step.elementId);

        // Add directional arrow based on arrowPosition config
        this.addDirectionalArrow(step.arrowPosition || step.position, step.arrowPositionOverride);
    }

    positionTutorial(step) {
        const targetElement = document.getElementById(step.elementId);
        if (!targetElement || !this.tutorialElement) return;

        const targetRect = targetElement.getBoundingClientRect();
        const tutorialRect = this.tutorialElement.getBoundingClientRect();

        // Get margin override from config or use default
        const margin = step.marginOverride ? parseInt(step.marginOverride) : 10;
        let top, left;

        switch(step.position) {
            case 'top':
                top = targetRect.top - tutorialRect.height - margin;
                left = targetRect.left + (targetRect.width / 2) - (tutorialRect.width / 2);
                break;

            case 'bottom':
                top = targetRect.bottom + margin;
                left = targetRect.left + (targetRect.width / 2) - (tutorialRect.width / 2);
                break;

            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tutorialRect.height / 2);
                left = targetRect.left - tutorialRect.width - margin;
                break;

            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tutorialRect.height / 2);
                left = targetRect.right + margin;
                break;

            case 'center':
                top = window.innerHeight / 2 - tutorialRect.height / 2;
                left = window.innerWidth / 2 - tutorialRect.width / 2;
                break;

            default:
                // Default to right position
                top = targetRect.top + (targetRect.height / 2) - (tutorialRect.height / 2);
                left = targetRect.right + margin;
        }

        // Ensure tutorial stays within viewport
        top = Math.max(10, Math.min(top, window.innerHeight - tutorialRect.height - 10));
        left = Math.max(10, Math.min(left, window.innerWidth - tutorialRect.width - 10));

        this.tutorialElement.style.top = top + 'px';
        this.tutorialElement.style.left = left + 'px';
    }

    highlightTargetElement(elementId) {
        // Remove any existing highlights
        const existingHighlights = document.querySelectorAll('.tutorial-highlight');
        existingHighlights.forEach(el => el.classList.remove('tutorial-highlight'));

        // Add highlight to target element
        const targetElement = document.getElementById(elementId);
        if (targetElement) {
            targetElement.classList.add('tutorial-highlight');

            // Add highlight style if not already present
            if (!document.getElementById('tutorial-highlight-style')) {
                const style = document.createElement('style');
                style.id = 'tutorial-highlight-style';
                style.textContent = `
                    .tutorial-highlight {
                        position: relative;
                        z-index: 9999;
                    }
                    .tutorial-highlight::after {
                        content: '';
                        position: absolute;
                        top: -4px;
                        left: -4px;
                        right: -4px;
                        bottom: -4px;
                        border: 2px solid var(--accent-primary);
                        border-radius: 6px;
                        pointer-events: none;
                        animation: pulse 2s infinite;
                        z-index: -1;
                    }
                    @keyframes pulse {
                        0% { box-shadow: 0 0 0 0 rgba(0, 255, 65, 0.4); }
                        70% { box-shadow: 0 0 0 10px rgba(0, 255, 65, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(0, 255, 65, 0); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    nextStep() {
        const nextStep = this.config.nextStep();
        if (nextStep) {
            this.showCurrentStep();
        } else {
            // Tutorial complete
            this.hideTutorial();
            console.log('Tutorial completed!');

            // Show notification when tutorial completes
            if (typeof Notifications !== 'undefined') {
                const notifications = new Notifications();
                notifications.success('Tutorial completed! You can now use all features.');
            }
        }
    }

    prevStep() {
        const prevStep = this.config.prevStep();
        if (prevStep) {
            this.showCurrentStep();
        }
    }

    hideTutorial() {
        this.tutorialElement.style.display = 'none';
        this.overlayElement.style.display = 'none';
        this.config.stopTutorial();

        // Remove highlights
        const existingHighlights = document.querySelectorAll('.tutorial-highlight');
        existingHighlights.forEach(el => el.classList.remove('tutorial-highlight'));

        // Remove directional arrow
        const existingArrow = document.querySelector('.tutorial-arrow');
        if (existingArrow) {
            existingArrow.remove();
        }
    }

    // Update progress dots to show current step
    updateProgressDots() {
        const dotsContainer = document.getElementById('tutorial-progress-dots');
        if (!dotsContainer) return;

        // Clear existing dots
        dotsContainer.innerHTML = '';

        // Get current tutorial and steps
        const tutorial = this.config.getTutorial(this.config.currentTutorial);
        if (!tutorial || !tutorial.steps || tutorial.steps.length === 0) return;

        // Create dots for each step
        tutorial.steps.forEach((step, index) => {
            const dot = document.createElement('div');
            dot.className = 'tutorial-progress-dot';
            if (index === this.config.currentStep) {
                dot.classList.add('active');
            }
            dotsContainer.appendChild(dot);
        });
    }

    // Add directional arrow to tutorial box
    addDirectionalArrow(position, arrowPositionOverride) {
        // Remove any existing arrow
        const existingArrow = document.querySelector('.tutorial-arrow');
        if (existingArrow) {
            existingArrow.remove();
        }

        // Don't add arrow for center position
        if (position === 'center') return;

        // Create arrow element
        const arrow = document.createElement('div');
        arrow.className = `tutorial-arrow ${position}`;

        // Add position override class if specified
        if (arrowPositionOverride && arrowPositionOverride !== 'center') {
            arrow.classList.add(arrowPositionOverride);
        }

        // Add to tutorial container
        this.tutorialElement.appendChild(arrow);
    }

    // Handle window resize
    handleResize() {
        if (this.config.isTutorialActive() && this.currentTutorialStep) {
            this.positionTutorial(this.currentTutorialStep);
        }
    }
}
