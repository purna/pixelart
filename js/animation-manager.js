// animation-manager.js
// Handles frame management and animation playback

const AnimationManager = {
    /**
     * Render the timeline with all frames
     */
    renderTimeline() {
        UI.framesList.innerHTML = '';
        
        State.frames.forEach((frame, i) => {
            const div = document.createElement('div');
            div.className = `frame-preview ${i === State.currentFrameIndex ? 'active' : ''}`;
            div.onclick = () => this.switchFrame(i);
            
            // Create thumbnail by compositing layers
            const canvas = document.createElement('canvas');
            canvas.width = State.width;
            canvas.height = State.height;
            const ctx = canvas.getContext('2d');
            
            frame.layers.forEach(layer => {
                if (layer.visible) {
                    const temp = document.createElement('canvas');
                    temp.width = State.width;
                    temp.height = State.height;
                    temp.getContext('2d').putImageData(layer.data, 0, 0);
                    ctx.drawImage(temp, 0, 0);
                }
            });
            
            div.appendChild(canvas);
            
            // Frame number label
            const num = document.createElement('span');
            num.className = "absolute bottom-0 right-1 text-[9px] text-gray-300 font-bold bg-black/50 px-1 rounded";
            num.innerText = i + 1;
            div.appendChild(num);
            
            UI.framesList.appendChild(div);
        });
    },

    /**
     * Update a specific frame's thumbnail
     */
    updateTimelineThumb(index) {
        if (!UI.framesList.children[index]) return;
        
        const canvas = UI.framesList.children[index].querySelector('canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, State.width, State.height);
        
        State.frames[index].layers.forEach(layer => {
            if (layer.visible) {
                const temp = document.createElement('canvas');
                temp.width = State.width;
                temp.height = State.height;
                temp.getContext('2d').putImageData(layer.data, 0, 0);
                ctx.drawImage(temp, 0, 0);
            }
        });
    },

    /**
     * Switch to a different frame
     */
    switchFrame(index) {
        if (index < 0 || index >= State.frames.length) return;
        
        State.currentFrameIndex = index;
        LayerManager.renderList();
        CanvasManager.render();
        
        // Update active state in timeline
        Array.from(UI.framesList.children).forEach((el, idx) => {
            el.classList.toggle('active', idx === index);
        });
    },

    /**
     * Add a new frame
     */
    addFrame() {
        // Create new frame with same layer structure as current frame
        const newLayers = State.frames[0].layers.map(layer => 
            CanvasManager.createLayer(layer.name)
        );
        
        State.frames.splice(State.currentFrameIndex + 1, 0, { layers: newLayers });
        this.switchFrame(State.currentFrameIndex + 1);
        this.renderTimeline();
    },

    /**
     * Duplicate current frame
     */
    duplicateFrame() {
        const src = State.frames[State.currentFrameIndex];
        
        // Deep copy all layers
        const newLayers = src.layers.map(layer => ({
            name: layer.name,
            visible: layer.visible,
            data: new ImageData(new Uint8ClampedArray(layer.data.data), State.width, State.height)
        }));
        
        State.frames.splice(State.currentFrameIndex + 1, 0, { layers: newLayers });
        this.switchFrame(State.currentFrameIndex + 1);
        this.renderTimeline();
    },

    /**
     * Delete a frame
     */
    deleteFrame() {
        if (State.frames.length <= 1) {
            alert('Cannot delete the last frame');
            return;
        }
        
        if (!confirm('Delete this frame?')) return;
        
        State.frames.splice(State.currentFrameIndex, 1);
        
        if (State.currentFrameIndex >= State.frames.length) {
            State.currentFrameIndex = State.frames.length - 1;
        }
        
        this.switchFrame(State.currentFrameIndex);
        this.renderTimeline();
    },

    /**
     * Start animation playback
     */
    play() {
        if (State.isPlaying) return;
        
        State.isPlaying = true;
        UI.playBtn.classList.add('bg-green-800');
        
        let frameIndex = 0;
        const loop = () => {
            if (!State.isPlaying) return;
            
            prevCtx.clearRect(0, 0, State.width, State.height);
            
            // Composite frame layers
            State.frames[frameIndex].layers.forEach(layer => {
                if (layer.visible) {
                    const temp = document.createElement('canvas');
                    temp.width = State.width;
                    temp.height = State.height;
                    temp.getContext('2d').putImageData(layer.data, 0, 0);
                    prevCtx.drawImage(temp, 0, 0);
                }
            });
            
            frameIndex = (frameIndex + 1) % State.frames.length;
            State.timer = setTimeout(loop, 1000 / State.fps);
        };
        
        loop();
    },

    /**
     * Stop animation playback
     */
    stop() {
        State.isPlaying = false;
        clearTimeout(State.timer);
        UI.playBtn.classList.remove('bg-green-800');
        CanvasManager.render(); // Restore current frame view
    },

    /**
     * Update FPS and restart animation if playing
     */
    updateFPS(fps) {
        State.fps = fps;
        UI.fpsDisplay.textContent = `${fps} FPS`;
        
        if (State.isPlaying) {
            this.stop();
            this.play();
        }
    },

    /**
     * Export animation as spritesheet
     */
    exportSpritesheet() {
        const canvas = document.createElement('canvas');
        canvas.width = State.width * State.frames.length;
        canvas.height = State.height;
        const ctx = canvas.getContext('2d');
        
        State.frames.forEach((frame, i) => {
            frame.layers.forEach(layer => {
                if (layer.visible) {
                    const temp = document.createElement('canvas');
                    temp.width = State.width;
                    temp.height = State.height;
                    temp.getContext('2d').putImageData(layer.data, 0, 0);
                    ctx.drawImage(temp, i * State.width, 0);
                }
            });
        });
        
        const link = document.createElement('a');
        link.download = 'spritesheet.png';
        link.href = canvas.toDataURL();
        link.click();
    }
};
