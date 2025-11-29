// layer-manager.js
// Manages layer creation, deletion, visibility, and renaming

const LayerManager = {
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
            div.onclick = () => this.selectLayer(i);
            
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

            div.appendChild(visBtn);
            div.appendChild(nameInput);
            div.appendChild(delBtn);
            UI.layersList.appendChild(div);
        }
    }
};
