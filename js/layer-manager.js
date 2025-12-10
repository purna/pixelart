// layer-manager.js
// Manages layer creation, deletion, visibility, and renaming

const LayerManager = {
    // Drag and drop state
    dragState: {
        draggedIndex: null,
        draggedElement: null,
        dropIndex: null
    },

    // Layer grouping state
    folders: [],
    nextFolderId: 1,

    /**
     * Handle drag start event
     */
    handleDragStart(e) {
        const layerItem = e.target.closest('.layer-item');
        if (!layerItem) return;

        const index = parseInt(layerItem.dataset.index);
        const folderId = layerItem.dataset.folderId;

        this.dragState = {
            draggedIndex: index,
            draggedElement: layerItem,
            dropIndex: null,
            sourceFolderId: folderId,
            isLayer: true
        };

        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
        e.dataTransfer.setData('text/plain', index.toString());
        e.dataTransfer.setData('folder-id', folderId || '');

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

        // Handle folder drop targets
        const folderHeader = e.target.closest('.folder-header');
        if (folderHeader) {
            // Remove previous drop targets
            const previousDropTargets = document.querySelectorAll('.drag-over');
            previousDropTargets.forEach(el => el.classList.remove('drag-over'));

            // Add drag-over class to folder header
            folderHeader.classList.add('drag-over');
            return;
        }

        // Handle layer drop targets
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
        this.dragState.targetFolderId = null; // Not dropping on a folder
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

        if (!this.dragState.draggedElement) {
            this.handleDragEnd();
            return;
        }

        // Handle dropping on folder headers
        const folderHeader = e.target.closest('.folder-header');
        if (folderHeader) {
            const folderId = folderHeader.closest('.layer-folder-item').dataset.folderId;
            if (folderId) {
                this.handleDropOnFolder(folderId);
                this.handleDragEnd();
                return;
            }
        }

        // Handle dropping on layers (reordering)
        if (this.dragState.dropIndex !== null) {
            // Don't reorder if dropping on the same item
            if (this.dragState.draggedIndex === this.dragState.dropIndex) {
                this.handleDragEnd();
                return;
            }

            // Reorder layers
            this.reorderLayers(this.dragState.draggedIndex, this.dragState.dropIndex);
        }

        // Clean up visual feedback
        this.handleDragEnd();
    },

    /**
     * Handle dropping a layer on a folder
     */
    handleDropOnFolder(folderId) {
        if (!this.dragState.draggedElement || this.dragState.draggedIndex === null) return;

        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        // Get the layer from the current frame
        const layers = State.frames[State.currentFrameIndex].layers;
        if (this.dragState.draggedIndex >= layers.length) {
            console.error('Invalid layer index for drag operation:', this.dragState.draggedIndex);
            return;
        }

        const layer = layers[this.dragState.draggedIndex];

        // Check if we're dragging from a folder
        if (this.dragState.sourceFolderId) {
            // Moving between folders or from folder to same folder
            if (this.dragState.sourceFolderId === folderId) {
                // Same folder, just reorder (handled by regular drag-drop)
                return;
            }

            // Different folders - move layer from one folder to another
            const sourceFolder = this.folders.find(f => f.id === this.dragState.sourceFolderId);
            if (sourceFolder && this.dragState.draggedIndex < sourceFolder.layers.length) {
                const sourceLayer = sourceFolder.layers[this.dragState.draggedIndex];

                // Remove from source folder
                sourceFolder.layers.splice(this.dragState.draggedIndex, 1);

                // Add to target folder
                folder.layers.push(sourceLayer);
            }
        } else {
            // Dragging from main list to folder
            // Add layer reference to folder (don't remove from main layers)
            folder.layers.push(layer);
        }

        this.renderList();
        CanvasManager.render();
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
     * Add a new folder/group
     */
    addFolder(name = 'New Group') {
        const folder = {
            id: `folder-${this.nextFolderId++}`,
            name: name,
            layers: [],
            expanded: true
        };
        this.folders.push(folder);
        this.renderList();
    },

    /**
     * Expand or collapse all folders
     */
    expandCollapseAll(expand) {
        this.folders.forEach(folder => {
            folder.expanded = expand;
        });
        this.renderList();
    },

    /**
     * Add layer to folder
     */
    addLayerToFolder(folderId, layerIndex) {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        // Get the layer from the current frame
        const layers = State.frames[State.currentFrameIndex].layers;
        if (layerIndex >= layers.length) {
            console.error('Invalid layer index:', layerIndex);
            return;
        }

        const layer = layers[layerIndex];

        // Check if layer is already in this folder
        const alreadyInFolder = folder.layers.some(l => l === layer);
        if (alreadyInFolder) {
            console.warn('Layer already in folder');
            return;
        }

        // Add layer reference to folder (don't remove from main layers)
        folder.layers.push(layer);

        // Update active layer if needed
        if (State.activeLayerIndex === layerIndex) {
            // Keep the same layer active, just update UI
            this.renderList();
        } else {
            this.renderList();
        }

        CanvasManager.render();
    },

    /**
     * Remove layer from folder
     */
    removeLayerFromFolder(folderId, layerIndex) {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder || layerIndex >= folder.layers.length) return;

        // Remove from folder (layer stays in main layers)
        folder.layers.splice(layerIndex, 1);

        // Update UI
        this.renderList();
        CanvasManager.render();
    },

    /**
     * Delete a folder
     */
    deleteFolder(folderId) {
        const folderIndex = this.folders.findIndex(f => f.id === folderId);
        if (folderIndex === -1) return;

        // Remove folder (layers stay in main layers)
        this.folders.splice(folderIndex, 1);
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
     * Render the layer list UI with folder/group support
     */
    renderList() {
        UI.layersList.innerHTML = '';

        // First render folders
        this.folders.forEach(folder => {
            this.renderFolder(folder);
        });

        // Then render layers NOT in any folder (like pixelAudio)
        const layers = State.frames[State.currentFrameIndex].layers;
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            // Only render in main list if not in any folder
            const isInAnyFolder = this.folders.some(folder =>
                folder.layers.includes(layer)
            );
            if (!isInAnyFolder) {
                this.renderLayer(layer, i, null);
            }
        }
    },

    /**
     * Render a folder/group
     */
    renderFolder(folder) {
        const folderEl = document.createElement('div');
        folderEl.className = 'layer-folder-item';
        folderEl.dataset.folderId = folder.id;

        folderEl.innerHTML = `
            <div class="folder-header" draggable="true">
                <i class="fas ${folder.expanded ? 'fa-folder-open' : 'fa-folder'} folder-icon"></i>
                <input type="text" class="folder-name" value="${folder.name}">
                <div class="folder-actions">
                    <i class="fas fa-trash folder-delete-btn" title="Delete Folder"></i>
                    <i class="fas ${folder.expanded ? 'fa-chevron-up' : 'fa-chevron-down'} folder-toggle-btn" title="${folder.expanded ? 'Collapse' : 'Expand'}"></i>
                </div>
            </div>
            <div class="folder-contents" style="display: ${folder.expanded ? 'block' : 'none'};">
            </div>
        `;

        // Add folder header events
        const header = folderEl.querySelector('.folder-header');
        const toggleBtn = folderEl.querySelector('.folder-toggle-btn');
        const deleteBtn = folderEl.querySelector('.folder-delete-btn');
        const nameInput = folderEl.querySelector('.folder-name');

        // Toggle folder expansion
        header.addEventListener('click', (e) => {
            if (e.target === nameInput || e.target === toggleBtn || e.target === deleteBtn) return;
            folder.expanded = !folder.expanded;
            this.renderList();
        });

        // Toggle button
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            folder.expanded = !folder.expanded;
            this.renderList();
        });

        // Delete folder
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteFolder(folder.id);
        });

        // Rename folder
        nameInput.addEventListener('change', (e) => {
            folder.name = e.target.value;
        });
        nameInput.addEventListener('click', (e) => e.stopPropagation());

        // Add drag-and-drop event listeners to folder header for receiving layers
        header.addEventListener('dragover', (e) => this.handleDragOver(e));
        header.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        header.addEventListener('drop', (e) => this.handleDrop(e));

        // Render folder contents
        const contentsEl = folderEl.querySelector('.folder-contents');
        for (let i = folder.layers.length - 1; i >= 0; i--) {
            const layer = folder.layers[i];
            // Find the layer index in the main layers array
            const layerIndex = State.frames[State.currentFrameIndex].layers.findIndex(l => l === layer);
            if (layerIndex !== -1) {
                this.renderLayer(layer, layerIndex, folder.id);
            }
        }

        UI.layersList.appendChild(folderEl);
    },

    /**
     * Render a single layer (in folder or main list)
     */
    renderLayer(layer, index, folderId) {
        const div = document.createElement('div');
        div.className = `layer-item ${index === State.activeLayerIndex ? 'active' : ''}`;
        div.dataset.index = index.toString();
        div.dataset.folderId = folderId || '';

        // Add drag and drop event listeners
        div.draggable = true;
        div.addEventListener('dragstart', (e) => this.handleDragStart(e));
        div.addEventListener('dragover', (e) => this.handleDragOver(e));
        div.addEventListener('dragend', () => this.handleDragEnd());
        div.addEventListener('drop', (e) => this.handleDrop(e));

        div.onclick = () => this.selectLayer(index);

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
            this.toggleVisibility(index);
        };

        // Layer name input (editable)
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'layer-name-input';
        nameInput.value = layer.name;
        nameInput.onclick = (e) => e.stopPropagation();
        nameInput.onblur = (e) => this.renameLayer(index, e.target.value);
        nameInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
            e.stopPropagation(); // Prevent keyboard shortcuts while editing
        };

        // Action buttons container
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'layer-actions';
        actionsContainer.onclick = (e) => e.stopPropagation();

        // Add to folder / Remove from folder button
        const folderBtn = document.createElement('i');
        if (folderId) {
            folderBtn.className = 'fas fa-folder-minus layer-btn remove-from-folder';
            folderBtn.title = 'Remove from Group';
            folderBtn.onclick = (e) => {
                e.stopPropagation();
                const layerIndex = folder.layers.findIndex(l => l === layer);
                this.removeLayerFromFolder(folderId, layerIndex);
            };
        } else {
            folderBtn.className = 'fas fa-folder-plus layer-btn add-to-folder';
            folderBtn.title = 'Add to Group';
            folderBtn.onclick = (e) => {
                e.stopPropagation();
                this.showFolderSelection(index);
            };
        }

        // Delete button
        const delBtn = document.createElement('i');
        delBtn.className = "fas fa-trash text-gray-500 hover:text-red-400 text-[10px]";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteLayer(index);
        };

        actionsContainer.appendChild(folderBtn);
        actionsContainer.appendChild(delBtn);

        div.appendChild(dragHandle);
        div.appendChild(visBtn);
        div.appendChild(nameInput);
        div.appendChild(actionsContainer);

        // Add to appropriate container
        if (folderId) {
            const folderEl = document.querySelector(`.layer-folder-item[data-folder-id="${folderId}"] .folder-contents`);
            if (folderEl) {
                folderEl.appendChild(div);
            }
        } else {
            UI.layersList.appendChild(div);
        }
    },

    /**
     * Show folder selection dropdown
     */
    showFolderSelection(layerIndex) {
        // Create a simple dropdown to select folder
        const existingDropdown = document.getElementById('folder-select-dropdown');
        if (existingDropdown) existingDropdown.remove();

        const dropdown = document.createElement('div');
        dropdown.id = 'folder-select-dropdown';
        dropdown.className = 'folder-select-dropdown';
        dropdown.innerHTML = `
            <div class="dropdown-header">Select Group</div>
            ${this.folders.map(folder => `
                <div class="dropdown-item" data-folder-id="${folder.id}">${folder.name}</div>
            `).join('')}
            <div class="dropdown-item new-folder-item">+ New Group</div>
        `;

        // Position near the layer
        const layerElement = document.querySelector(`.layer-item[data-index="${layerIndex}"]`);
        if (layerElement) {
            const rect = layerElement.getBoundingClientRect();
            dropdown.style.position = 'absolute';
            dropdown.style.left = `${rect.right + 10}px`;
            dropdown.style.top = `${rect.top}px`;
            document.body.appendChild(dropdown);

            // Add event listeners
            dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (item.classList.contains('new-folder-item')) {
                        const folderName = prompt('Enter group name:', 'New Group');
                        if (folderName) {
                            this.addFolder(folderName);
                            this.addLayerToFolder(`folder-${this.nextFolderId - 1}`, layerIndex);
                        }
                    } else {
                        const folderId = item.dataset.folderId;
                        this.addLayerToFolder(folderId, layerIndex);
                    }
                    dropdown.remove();
                });
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target)) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }
    }
};
