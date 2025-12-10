/**
 * Right Panel Manager
 * Handles tabbed interface for effects panel and other right panel functionality
 */

class RightPanelManager {
    constructor() {
        this.activeEffectsTab = 'mirror'; // Default active tab
        this.init();
    }

    init() {
        this.bindEvents();
        // Set initial active tab
        this.setActiveEffectsTab(this.activeEffectsTab);
    }

    /**
     * Set active effects tab
     */
    setActiveEffectsTab(tabType) {
        // Hide all sub-panels (they are siblings of effects-container, not children)
        const allPanels = document.querySelectorAll('#panel-effects .sub-panel-section');
        allPanels.forEach(panel => {
            panel.classList.add('hidden');
        });

        // Show selected panel
        const selectedPanel = document.getElementById(this.getPanelId(tabType));
        if (selectedPanel) {
            selectedPanel.classList.remove('hidden');
        }

        // Update button highlighting
        const allButtons = document.querySelectorAll('#effects-container [data-type]');
        allButtons.forEach(button => {
            if (button.dataset.type === tabType) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        this.activeEffectsTab = tabType;

        // Trigger custom event for other modules
        document.dispatchEvent(new CustomEvent('effectsTabChanged', {
            detail: { tabType }
        }));
    }

    /**
     * Get panel ID for effect type
     */
    getPanelId(effectType) {
        const panelMap = {
            'mirror': 'mirror-options',
            'dither': 'dither-options',
            'contrast': 'contrast-options',
            'filters': 'filters-list'
        };
        return panelMap[effectType];
    }

    /**
     * Bind events
     */
    bindEvents() {
        // Effects panel button clicks
        document.addEventListener('click', (e) => {
            const effectButton = e.target.closest('[data-type]');
            if (effectButton && effectButton.closest('#effects-container')) {
                e.preventDefault();
                const effectType = effectButton.dataset.type;
                this.setActiveEffectsTab(effectType);
            }
        });

        // Handle toggle section buttons
        document.addEventListener('click', (e) => {
            // Check if the click target is a toggle button or a child of a toggle button
            const toggleButton = e.target.closest('.toggle-sect-btn') || e.target.closest('.section-toggle');
            if (toggleButton) {
                const targetId = toggleButton.dataset.target;
                if (targetId) {
                    this.toggleSection(targetId);
                }
            }
        });
    }

    /**
     * Toggle panel section - updated to work with dropins-container
     */
    toggleSection(sectionId) {
        // Find the section in the entire document (not just dropins-container)
        const section = document.getElementById(sectionId);
        if (!section) {
            console.warn(`Section not found: ${sectionId}`);
            return;
        }

        // Find the parent panel-section element to toggle the minimized class
        const panelSection = section.closest('.panel-section');
        if (panelSection) {
            panelSection.classList.toggle('minimized');
        } else {
            // Fallback to original behavior if no panel-section parent found
            section.classList.toggle('minimized');
        }

        // Find the toggle button that controls this section
        const button = document.querySelector(`[data-target="${sectionId}"]`);
        if (button) {
            const icon = button.querySelector('i');
            // Check if the panel section is minimized (or the section itself if no parent)
            const isMinimized = panelSection ? panelSection.classList.contains('minimized') : section.classList.contains('minimized');
            if (isMinimized) {
                icon.className = 'fas fa-plus';
            } else {
                icon.className = 'fas fa-minus';
            }
        } else {
            console.warn(`Toggle button not found for section: ${sectionId}`);
        }
    }

    /**
     * Get current active effects tab
     */
    getActiveEffectsTab() {
        return this.activeEffectsTab;
    }

    /**
     * Switch to specific effects tab programmatically
     */
    switchToEffectsTab(tabType) {
        this.setActiveEffectsTab(tabType);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rightPanelManager = new RightPanelManager();

    // Initialize tabbed interface
    initTabbedInterface();

    // Set up panel toggle button for dropins-container
    setupPanelToggle();
});

// Set up the floating panel toggle button
function setupPanelToggle() {
    const panelToggle = document.getElementById('panel-toggle');
    if (panelToggle) {
        panelToggle.addEventListener('click', () => {
            const container = document.querySelector('.dropins-container.right');
            if (container) {
                container.classList.toggle('closed');
                panelToggle.classList.toggle('closed-toggle');

                // Update toggle button icon
                const icon = panelToggle.querySelector('i');
                if (container.classList.contains('closed')) {
                    icon.className = 'fas fa-chevron-right';
                } else {
                    icon.className = 'fas fa-chevron-left';
                }
            }
        });
    }
}

// Tabbed Interface Functionality
function initTabbedInterface() {
    // Set up tab clicking for main panel tabs
    const panelTabs = document.querySelectorAll('.panel-tab');
    panelTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            selectPanelTab(this);
        });
    });

    // Set initial active tab
    const initialActiveTab = document.querySelector('.panel-tab.active');
    if (initialActiveTab) {
        const contentId = initialActiveTab.dataset.content;
        const initialContent = document.getElementById(contentId);
        if (initialContent) {
            // Add active class to the aside element instead of its child
            initialContent.classList.add('active');
        }
    }
}

function selectPanelTab(el) {
    const container = el.closest(".dropins-container");
    if (!container) return;

    const activeTab = container.querySelector(".panel-tab.active");
    const relContent = document.getElementById(el.dataset.content);

    if (!relContent) {
        console.error('Content not found for tab:', el.dataset.content);
        return;
    }

    // Find the panel-tab-content element inside the targeted aside
    const targetPanelContent = relContent.querySelector('.panel-tab-content');

    if (!targetPanelContent) {
        console.error('Panel tab content not found inside:', el.dataset.content);
        return;
    }

    // Hide ALL tab contents first
    const allTabContents = container.querySelectorAll('.panel-tab-content');
    allTabContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all aside elements
    const allActiveAsides = container.querySelectorAll('aside.content.active');
    allActiveAsides.forEach(aside => {
        aside.classList.remove('active');
    });

    // Remove active class from all tabs
    const allTabs = container.querySelectorAll('.panel-tab.active');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Add active class to the aside element instead of its child
    relContent.classList.add('active');

    // Add active class to the tab
    el.classList.add('active');

    // Add active class to the target panel content
    targetPanelContent.classList.add('active');

    // Ensure container is showing
    if (!container.classList.contains("showing")) {
        container.classList.add("showing");
    }

    // Update the panel toggle button icon to reflect the showing state
    updatePanelToggleIcon();

    // Debug: log what we're working with
    console.log('Tab clicked:', el.dataset.content);
    console.log('Content element found:', relContent);
    console.log('Target panel content:', targetPanelContent);
}

// Update panel toggle button icon and position based on container state
function updatePanelToggleIcon() {
    const container = document.querySelector('.dropins-container.right');
    const panelToggle = document.getElementById('panel-toggle');
    if (container && panelToggle) {
        const icon = panelToggle.querySelector('i');

        if (container.classList.contains('closed')) {
            icon.className = 'fas fa-chevron-right';
            panelToggle.classList.add('closed-toggle');
        } else {
            icon.className = 'fas fa-chevron-left';
            panelToggle.classList.remove('closed-toggle');
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RightPanelManager;
}