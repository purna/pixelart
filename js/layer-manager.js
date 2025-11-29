// layer-manager.js
// Manages layer creation, deletion, visibility, and renaming

const LayerManager = {
    // Drag and drop state
    dragState: {
        draggedIndex: null,
        draggedElement: null,
        dropIndex: null
    },

    /**
     * Handle drag start event
     */
    handleDragStart(e) {
        const index = parseInt(e.target.dataset.index);
        this.dragState.draggedIndex = index;
        this.dragState.draggedElement = e.target.closest('.layer-item');
        
        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
        e.dataTransfer.setData('text/plain', index.toString());
        
        // Add dragging class for visual feedback
        this.dragState.draggedElement.classList.add('dragging');
        UI.layersList.classList.add('dragging');
    },

    /**
     * Handle drag over event
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const targetElement = e.target.closest('.layer-item');
        if (!targetElement || targetElement === this.dragState.draggedElement) {
            return;
        }
        
        // Remove previous drop target
        const previousDropTarget = UI.layersList.querySelector('.layer-item.drag-over');
        if (previousDropTarget) {
            previousDropTarget.classList.remove('drag-over');
        }
        
        // Add drag-over class to new target
        targetElement.classList.add('drag-over');
        this.dragState.dropIndex = parseInt(targetElement.dataset.index);
    },

    /**
     * Handle drag end event
     */
    handleDragEnd() {
        // Clean up visual feedback
        if (this.dragState.draggedElement) {
            this.dragState.draggedElement.classList.remove('dragging');
        }
        
        const dragOverElement = UI.layersList.querySelector('.layer-item.drag-over');
        if (dragOverElement) {
            dragOverElement.classList.remove('drag-over');
        }
        
        UI.layersList.classList.remove('dragging');
        
        // Reset drag state
        this.dragState = {
            draggedIndex: null,
            draggedElement: null,
            dropIndex: null
        };
    },

    /**
     * Handle drop event
     */
    handleDrop(e) {
        e.preventDefault();
        
        if (this.dragState.draggedIndex === null || this.dragState.dropIndex === null) {
            return;
        }
        
        // Don't reorder if dropping on the same item
        if (this.dragState.draggedIndex === this.dragState.dropIndex) {
            return;
        }
        
        // Reorder layers
        this.reorderLayers(this.dragState.draggedIndex, this.dragState.dropIndex);
        
        // Clean up visual feedback
        this.handleDragEnd();
    },

    /**
     * Reorder layers in all frames
     */
    reorderLayers(fromIndex, toIndex) {
        // Adjust indices if dragging from lower to higher index
        // (since we'll be removing an item from the array)
        let adjustedFromIndex = fromIndex;
        let adjustedToIndex = toIndex;
        
        if (fromIndex < toIndex) {
            adjustedToIndex = toIndex - 1;
        }
        
        State.frames.forEach(frame => {
            const layer = frame.layers.splice(adjustedFromIndex, 1)[0];
            frame.layers.splice(adjustedToIndex, 0, layer);
        });
        
        // Update active layer index if necessary
        if (State.activeLayerIndex === fromIndex) {
            State.activeLayerIndex = adjustedToIndex;
        } else if (State.activeLayerIndex >= Math.min(fromIndex, adjustedToIndex) && 
                   State.activeLayerIndex <= Math.max(fromIndex, adjustedToIndex)) {
            if (fromIndex < adjustedToIndex) {
                State.activeLayerIndex--;
            } else {
                State.activeLayerIndex++;
            }
        }
        
        // Re-render the layer list and canvas
        this.renderList();
        CanvasManager.render();
    },
    /**
     * Add a new layer to all frames
     */
    addLayer() {
        const layerCount = State.frames[0].layers.length;
        const newLayerName = `Layer ${layerCount + 1}`;
        
        State.frames.forEach(frame => {
            frame.layers.push(CanvasManager.createLayer(newLayerName));
        });
        
        State.activeLayerIndex = State.frames[0].layers.length - 1;
        this.renderList();
        CanvasManager.render();
    },

    /**
     * Delete a layer from all frames
     */
    deleteLayer(index) {
        if (State.frames[0].layers.length <= 1) {
            alert('Cannot delete the last layer');
            return;
        }
        
        if (!confirm(`Delete ${State.frames[0].layers[index].name}?`)) return;
        
        State.frames.forEach(frame => {
            frame.layers.splice(index, 1);
        });
        
        if (State.activeLayerIndex >= index && State.activeLayerIndex > 0) {
            State.activeLayerIndex--;
        }
        
        this.renderList();
        CanvasManager.render();
    },

    /**
     * Toggle layer visibility across all frames
     */
    toggleVisibility(index) {
        State.frames.forEach(frame => {
            frame.layers[index].visible = !frame.layers[index].visible;
        });
        
        this.renderList();
        CanvasManager.render();
    },

    /**
     * Select a layer as active
     */
    selectLayer(index) {
        State.activeLayerIndex = index;
        this.renderList();
    },

    /**
     * Rename a layer across all frames
     */
    renameLayer(index, newName) {
        if (!newName || newName.trim() === '') return;
        
        State.frames.forEach(frame => {
            frame.layers[index].name = newName.trim();
        });
        
        this.renderList();
    },

    /**
     * Render the layer list UI
     */
    renderList() {
        UI.layersList.innerHTML = '';
        
        const layers = State.frames[State.currentFrameIndex].layers;
        
        // Render in reverse order (top layer first)
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            const div = document.createElement('div');
            div.className = `layer-item ${i === State.activeLayerIndex ? 'active' : ''}`;
            div.dataset.index = i.toString();
            
            // Add drag and drop event listeners
            div.draggable = true;
            div.addEventListener('dragstart', (e) => this.handleDragStart(e));
            div.addEventListener('dragover', (e) => this.handleDragOver(e));
            div.addEventListener('dragend', () => this.handleDragEnd());
            div.addEventListener('drop', (e) => this.handleDrop(e));
            
            div.onclick = () => this.selectLayer(i);
            
            // Drag handle
            const dragHandle = document.createElement('i');
            dragHandle.className = 'fas fa-grip-vertical drag-handle';
            dragHandle.title = 'Drag to reorder';
            dragHandle.onclick = (e) => e.stopPropagation(); // Prevent layer selection when clicking handle

            // Visibility toggle
            const visBtn = document.createElement('i');
            visBtn.className = `fas fa-eye layer-vis-btn ${!layer.visible ? 'hidden-layer' : ''}`;
            visBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggleVisibility(i);
            };

            // Layer name input (editable)
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'layer-name-input';
            nameInput.value = layer.name;
            nameInput.onclick = (e) => e.stopPropagation();
            nameInput.onblur = (e) => this.renameLayer(i, e.target.value);
            nameInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
                e.stopPropagation(); // Prevent keyboard shortcuts while editing
            };
            
            // Delete button
            const delBtn = document.createElement('i');
            delBtn.className = "fas fa-trash text-gray-500 hover:text-red-400 text-[10px]";
            delBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteLayer(i);
            };

            div.appendChild(dragHandle);
            div.appendChild(visBtn);
            div.appendChild(nameInput);
            div.appendChild(delBtn);
            UI.layersList.appendChild(div);
        }
    }
};
