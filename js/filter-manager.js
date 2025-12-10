// filter-manager.js
// Manages image filters using LenaJS

const FilterManager = {
    /**
     * Apply a filter to the current active layer
     */
    applyFilter(filterName) {
        if (typeof LenaJS === 'undefined') {
            alert('LenaJS library not loaded. Please check your internet connection.');
            return;
        }

        const layer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];

        // Create temporary canvas for filter application
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = State.width;
        tempCanvas.height = State.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Put current layer data onto temp canvas
        tempCtx.putImageData(layer.data, 0, 0);

        // Apply LenaJS filter using the correct method
        try {
            if (LenaJS[filterName]) {
                // For filters that work with ImageData directly
                const imageData = tempCtx.getImageData(0, 0, State.width, State.height);
                const filteredData = LenaJS[filterName](imageData);
                tempCtx.putImageData(filteredData, 0, 0);
            } else {
                alert(`Filter "${filterName}" is not available in this version of LenaJS.`);
                return;
            }
        } catch (error) {
            console.error('Error applying filter:', error);
            alert('Error applying filter. Please try again.');
            return;
        }

        // Get filtered data back
        layer.data = tempCtx.getImageData(0, 0, State.width, State.height);

        // Re-render canvas
        CanvasManager.render();
        AnimationManager.updateTimelineThumb(State.currentFrameIndex);
        
        // Save state for undo/redo
        if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
            InputHandler.saveState();
        }
    },

    /**
     * Initialize filter buttons
     */
    initFilters() {
        const filtersList = document.getElementById('filters-list');

        // Check if filters-list element exists
        if (!filtersList) {
            console.warn('filters-list element not found. Filters will not be initialized.');
            return;
        }

        filtersList.innerHTML = '';

        // Available LenaJS filters
        const filters = [
            { name: 'grayscale', label: 'Grayscale' },
            { name: 'sepia', label: 'Sepia' },
            { name: 'invert', label: 'Invert' },
            { name: 'saturation', label: 'Saturation' },
            { name: 'sharpen', label: 'Sharpen' },
            { name: 'gaussian', label: 'Gaussian Blur' },
            { name: 'bigGaussian', label: 'Big Gaussian Blur' },
            { name: 'lowpass3', label: 'Low Pass 3x3' },
            { name: 'lowpass5', label: 'Low Pass 5x5' },
            { name: 'highpass', label: 'High Pass' },
            { name: 'laplacian', label: 'Laplacian' },
            { name: 'sobelHorizontal', label: 'Sobel Horizontal' },
            { name: 'sobelVertical', label: 'Sobel Vertical' },
            { name: 'roberts', label: 'Roberts' },
            { name: 'prewittHorizontal', label: 'Prewitt Horizontal' },
            { name: 'prewittVertical', label: 'Prewitt Vertical' },
            { name: 'canny', label: 'Canny Edge Detection' },
            { name: 'thresholding', label: 'Threshold' },
            { name: 'red', label: 'Red Channel' },
            { name: 'green', label: 'Green Channel' },
            { name: 'blue', label: 'Blue Channel' }
        ];

        filters.forEach(filter => {
            const button = document.createElement('button');
            button.className = 'btn';
            button.style.width = '100%';
            button.textContent = filter.label;
            button.onclick = () => this.applyFilter(filter.name);
            filtersList.appendChild(button);
        });
    }
};