 // --- CONFIG ---
        const Config = { maxHistory: 20, maxFrames: 100, maxSize: 128 };

        // --- STATE ---
        const State = {
            width: 32, height: 32, zoom: 20,
            color: '#000000', opacity: 1.0,
            tool: 'pencil', brushSize: 1,
            isDrawing: false,
            
            // Frame Structure: { layers: [ { visible: true, data: ImageData }, ... ] }
            frames: [], 
            currentFrameIndex: 0,
            activeLayerIndex: 0,
            
            // Animation
            isPlaying: false, fps: 12, timer: null,
            
            // History
            recentColors: ['#000000', '#ffffff', '#3b82f6', '#ef4444', '#10b981'],
            dragStart: { x: 0, y: 0 },
            
            // Offscreen Helpers
            offscreenCanvas: document.createElement('canvas'), // For layer composition
            layerCanvas: document.createElement('canvas')      // For individual layer manipulation
        };

        // --- DOM ---
        const UI = {
            compositionCanvas: document.getElementById('layer-composition'),
            previewLayer: document.getElementById('previewLayer'),
            gridOverlay: document.getElementById('grid-overlay'),
            drawingArea: document.getElementById('drawing-area'),
            wrapper: document.getElementById('canvas-wrapper'),
            
            framesList: document.getElementById('frames-list'),
            layersList: document.getElementById('layers-list'),
            
            previewCanvas: document.getElementById('previewCanvas'),
            minimapOverlay: document.getElementById('minimap-overlay'),
            previewContainer: document.getElementById('preview-container'),
            
            // Inputs
            colorPicker: document.getElementById('colorPicker'),
            opacitySlider: document.getElementById('opacitySlider'),
            brushSizeSlider: document.getElementById('brushSizeSlider'),
            brushSizeDisplay: document.getElementById('brushSizeDisplay'),
            toolBtns: document.querySelectorAll('.tool-btn'),
            fpsSlider: document.getElementById('fpsSlider'),
            
            coords: document.getElementById('coords'),
            zoomDisplay: document.getElementById('zoomDisplay'),
            paletteContainer: document.getElementById('palette-history')
        };

        const ctx = UI.compositionCanvas.getContext('2d');
        const pCtx = UI.previewLayer.getContext('2d');
        const offCtx = State.offscreenCanvas.getContext('2d');
        const layerCtx = State.layerCanvas.getContext('2d');
        const prevCtx = UI.previewCanvas.getContext('2d');

        // --- CANVAS MANAGER ---
        const CanvasManager = {
            init(w, h) {
                State.width = Math.min(Math.max(w, 4), Config.maxSize);
                State.height = Math.min(Math.max(h, 4), Config.maxSize);
                
                // Init Dimensions
                [UI.compositionCanvas, UI.previewLayer].forEach(c => { c.width = State.width; c.height = State.height; });
                State.offscreenCanvas.width = State.width; State.offscreenCanvas.height = State.height;
                State.layerCanvas.width = State.width; State.layerCanvas.height = State.height;
                UI.previewCanvas.width = State.width; UI.previewCanvas.height = State.height;

                // Init Data
                State.frames = [{ layers: [this.createLayer()] }];
                State.currentFrameIndex = 0;
                State.activeLayerIndex = 0;

                this.updateZoom(true);
                this.render();
                AnimationManager.renderTimeline();
                LayerManager.renderList();
            },

            createLayer() {
                return { 
                    visible: true, 
                    data: new ImageData(State.width, State.height) 
                };
            },

            updateZoom(center = false) {
                // Apply Zoom to DOM
                const w = State.width * State.zoom;
                const h = State.height * State.zoom;
                
                UI.drawingArea.style.width = `${w}px`;
                UI.drawingArea.style.height = `${h}px`;
                [UI.compositionCanvas, UI.previewLayer, UI.gridOverlay].forEach(el => { el.style.width = '100%'; el.style.height = '100%'; });

                // Grid Pattern
                UI.gridOverlay.style.backgroundSize = `${State.zoom}px ${State.zoom}px`;
                UI.gridOverlay.style.backgroundImage = State.zoom > 4 ? 
                    `linear-gradient(to right, rgba(128, 128, 128, 0.3) 1px, transparent 1px),
                     linear-gradient(to bottom, rgba(128, 128, 128, 0.3) 1px, transparent 1px)` : 'none';

                UI.zoomDisplay.textContent = `${Math.round(State.zoom * 10)}%`;
                
                if (center) {
                    UI.wrapper.scrollTo((w - UI.wrapper.clientWidth)/2, (h - UI.wrapper.clientHeight)/2);
                }
                
                this.updateMinimap();
            },
            
            updateMinimap() {
                // Calculate Minimap Rect
                const wrap = UI.wrapper;
                const area = UI.drawingArea;
                
                const ratioX = wrap.clientWidth / area.offsetWidth;
                const ratioY = wrap.clientHeight / area.offsetHeight;
                
                // If viewport is smaller than canvas
                if(ratioX < 1 || ratioY < 1) {
                    UI.minimapOverlay.style.display = 'block';
                    const preW = UI.previewContainer.clientWidth;
                    const preH = UI.previewContainer.clientHeight;
                    
                    const rectW = Math.min(1, ratioX) * preW;
                    const rectH = Math.min(1, ratioY) * preH;
                    
                    const left = (wrap.scrollLeft / area.offsetWidth) * preW;
                    const top = (wrap.scrollTop / area.offsetHeight) * preH;
                    
                    UI.minimapOverlay.style.width = `${rectW}px`;
                    UI.minimapOverlay.style.height = `${rectH}px`;
                    UI.minimapOverlay.style.left = `${left}px`;
                    UI.minimapOverlay.style.top = `${top}px`;
                } else {
                    UI.minimapOverlay.style.display = 'none';
                }
            },

            render() {
                // Composite all layers of current frame onto Main Canvas
                ctx.clearRect(0, 0, State.width, State.height);
                
                const frame = State.frames[State.currentFrameIndex];
                if (!frame) return;

                frame.layers.forEach(layer => {
                    if (layer.visible) {
                        // Use offscreen canvas to putImageData, then drawImage to support alpha blending
                        offCtx.putImageData(layer.data, 0, 0);
                        ctx.drawImage(State.offscreenCanvas, 0, 0);
                    }
                });

                // Update Preview Window
                prevCtx.clearRect(0, 0, State.width, State.height);
                prevCtx.drawImage(UI.compositionCanvas, 0, 0);
            },
            
            getCurrentLayerData() {
                return State.frames[State.currentFrameIndex].layers[State.activeLayerIndex].data;
            },
            
            saveLayerChange() {
                // Triggered after drawing actions
                AnimationManager.updateTimelineThumb(State.currentFrameIndex);
                this.render(); // Re-composite
            }
        };

        // --- LAYER MANAGER ---
        const LayerManager = {
            addLayer() {
                // Add a new empty layer to EVERY frame to keep sync
                State.frames.forEach(frame => {
                    frame.layers.push(CanvasManager.createLayer());
                });
                State.activeLayerIndex = State.frames[0].layers.length - 1;
                this.renderList();
                CanvasManager.render();
            },

            deleteLayer(index) {
                if (State.frames[0].layers.length <= 1) return; // Keep at least one
                
                State.frames.forEach(frame => {
                    frame.layers.splice(index, 1);
                });
                
                if (State.activeLayerIndex >= index && State.activeLayerIndex > 0) {
                    State.activeLayerIndex--;
                }
                this.renderList();
                CanvasManager.render();
            },

            toggleVisibility(index) {
                State.frames.forEach(frame => {
                    frame.layers[index].visible = !frame.layers[index].visible;
                });
                this.renderList();
                CanvasManager.render();
            },

            selectLayer(index) {
                State.activeLayerIndex = index;
                this.renderList();
            },

            renderList() {
                UI.layersList.innerHTML = '';
                // Reverse iterate so top layer is at top of list
                const layers = State.frames[State.currentFrameIndex].layers;
                for (let i = layers.length - 1; i >= 0; i--) {
                    const layer = layers[i];
                    const div = document.createElement('div');
                    div.className = `layer-item ${i === State.activeLayerIndex ? 'active' : ''}`;
                    div.onclick = () => this.selectLayer(i);
                    
                    const visBtn = document.createElement('i');
                    visBtn.className = `fas fa-eye layer-vis-btn ${!layer.visible ? 'hidden-layer' : ''}`;
                    visBtn.onclick = (e) => { e.stopPropagation(); this.toggleVisibility(i); };

                    const name = document.createElement('span');
                    name.textContent = `Layer ${i + 1}`;
                    name.className = "flex-1";
                    
                    const delBtn = document.createElement('i');
                    delBtn.className = "fas fa-trash text-gray-500 hover:text-red-400 text-[10px]";
                    delBtn.onclick = (e) => { e.stopPropagation(); this.deleteLayer(i); };

                    div.appendChild(visBtn);
                    div.appendChild(name);
                    div.appendChild(delBtn);
                    UI.layersList.appendChild(div);
                }
            }
        };

        // --- TOOL MANAGER ---
        const ToolManager = {
            hexToRgba(hex, alpha) {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            },

            // Drawing primitive that writes to the Active Layer
            plot(x, y, colorStr, context, isEraser = false) {
                let size = State.brushSize;
                // Pencil is always 1px
                if (State.tool === 'pencil' || State.tool === 'mirror') size = 1;

                if (State.tool === 'dither') {
                    if ((Math.floor(x) + Math.floor(y)) % 2 !== 0) return;
                }

                // We draw onto the Context provided (usually offscreen layerCtx)
                // then commit that back to ImageData
                
                context.fillStyle = isEraser ? 'rgba(0,0,0,1)' : colorStr;
                context.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
                
                const offset = Math.floor(size / 2);
                context.fillRect(Math.floor(x) - offset, Math.floor(y) - offset, size, size);
            },

            // Bresenham Line
            drawLine(x0, y0, x1, y1, color, ctx, isEraser) {
                x0=Math.floor(x0); y0=Math.floor(y0); x1=Math.floor(x1); y1=Math.floor(y1);
                const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
                const sx = (x0 < x1) ? 1 : -1, sy = (y0 < y1) ? 1 : -1;
                let err = dx - dy;
                while (true) {
                    this.plot(x0, y0, color, ctx, isEraser);
                    if (x0 === x1 && y0 === y1) break;
                    const e2 = 2 * err;
                    if (e2 > -dy) { err -= dy; x0 += sx; }
                    if (e2 < dx) { err += dx; y0 += sy; }
                }
            },
            
            drawRect(x0, y0, x1, y1, color, ctx) {
                 this.drawLine(x0, y0, x1, y0, color, ctx, false);
                 this.drawLine(x0, y1, x1, y1, color, ctx, false);
                 this.drawLine(x0, y0, x0, y1, color, ctx, false);
                 this.drawLine(x1, y0, x1, y1, color, ctx, false);
            },

            drawCircle(x0, y0, x1, y1, color, ctx) {
                let r = Math.floor(Math.sqrt(Math.pow(x1-x0, 2) + Math.pow(y1-y0, 2)));
                let x = r, y = 0, P = 1 - r;
                const plotSym = (cx, cy, x, y) => {
                    this.plot(cx+x, cy+y, color, ctx); this.plot(cx-x, cy+y, color, ctx);
                    this.plot(cx+x, cy-y, color, ctx); this.plot(cx-x, cy-y, color, ctx);
                    this.plot(cx+y, cy+x, color, ctx); this.plot(cx-y, cy+x, color, ctx);
                    this.plot(cx+y, cy-x, color, ctx); this.plot(cx-y, cy-x, color, ctx);
                };
                while(x > y) {
                    y++;
                    if(P <= 0) P = P + 2*y + 1; else { x--; P = P + 2*y - 2*x + 1; }
                    if(x < y) break;
                    plotSym(x0, y0, x, y);
                }
            },

            // --- Tool Lifecycle ---

            start(x, y) {
                State.isDrawing = true;
                State.dragStart = { x, y };
                
                // Prepare Layer Canvas for editing
                const currentLayer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];
                if(!currentLayer.visible) return; // Don't edit hidden layers

                layerCtx.clearRect(0, 0, State.width, State.height);
                layerCtx.putImageData(currentLayer.data, 0, 0);

                const rgba = this.hexToRgba(State.color, State.opacity);
                const isEraser = State.tool === 'eraser';

                if (['pencil', 'brush', 'dither', 'eraser'].includes(State.tool)) {
                    this.plot(x, y, rgba, layerCtx, isEraser);
                    this.updateLayerFromCtx(); // Commit immediately for fluid drawing
                } else if (State.tool === 'mirror') {
                    this.plot(x, y, rgba, layerCtx, false);
                    this.plot(State.width - 1 - x, y, rgba, layerCtx, false);
                    this.updateLayerFromCtx();
                } else if (State.tool === 'bucket') {
                    this.floodFill(x, y, State.color, State.opacity); // Bucket handles its own logic
                } else if (State.tool === 'eyedropper') {
                    this.pickColor(x, y);
                    State.isDrawing = false;
                }
            },

            move(x, y) {
                if (!State.isDrawing) return;
                const currentLayer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];
                if(!currentLayer.visible) return;

                const rgba = this.hexToRgba(State.color, State.opacity);
                const isEraser = State.tool === 'eraser';

                if (['pencil', 'brush', 'dither', 'eraser'].includes(State.tool)) {
                    // Interpolate
                    this.drawLine(State.dragStart.x, State.dragStart.y, x, y, rgba, layerCtx, isEraser);
                    State.dragStart = { x, y }; // Update last pos
                    this.updateLayerFromCtx();
                } else if (State.tool === 'mirror') {
                     this.plot(x, y, rgba, layerCtx, false);
                     this.plot(State.width - 1 - x, y, rgba, layerCtx, false);
                     this.updateLayerFromCtx();
                } else if (['stroke', 'rect', 'circle'].includes(State.tool)) {
                    CanvasManager.clearPreviewLayer();
                    const pCtx = UI.previewLayer.getContext('2d');
                    pCtx.clearRect(0,0,State.width, State.height);
                    if (State.tool === 'stroke') this.drawLine(State.dragStart.x, State.dragStart.y, x, y, rgba, pCtx, false);
                    if (State.tool === 'rect') this.drawRect(State.dragStart.x, State.dragStart.y, x, y, rgba, pCtx);
                    if (State.tool === 'circle') this.drawCircle(State.dragStart.x, State.dragStart.y, x, y, rgba, pCtx);
                } else if (State.tool === 'move') {
                    const dx = x - State.dragStart.x;
                    const dy = y - State.dragStart.y;
                    // Real-time move preview is tricky with ImageData logic, let's just do it on End for now
                    // Or implement shift preview
                }
            },

            end(x, y) {
                if (!State.isDrawing) return;
                State.isDrawing = false;
                
                const rgba = this.hexToRgba(State.color, State.opacity);
                
                // Finalize Shapes
                if (['stroke', 'rect', 'circle'].includes(State.tool)) {
                    if (State.tool === 'stroke') this.drawLine(State.dragStart.x, State.dragStart.y, x, y, rgba, layerCtx, false);
                    if (State.tool === 'rect') this.drawRect(State.dragStart.x, State.dragStart.y, x, y, rgba, layerCtx);
                    if (State.tool === 'circle') this.drawCircle(State.dragStart.x, State.dragStart.y, x, y, rgba, layerCtx);
                    
                    this.updateLayerFromCtx();
                    CanvasManager.clearPreviewLayer();
                } else if (State.tool === 'move') {
                    const dx = x - State.dragStart.x;
                    const dy = y - State.dragStart.y;
                    this.shiftLayer(dx, dy);
                }
                
                ColorManager.addToHistory(State.color);
            },

            updateLayerFromCtx() {
                const newData = layerCtx.getImageData(0, 0, State.width, State.height);
                State.frames[State.currentFrameIndex].layers[State.activeLayerIndex].data = newData;
                CanvasManager.saveLayerChange();
            },

            floodFill(x, y, colorHex, opacity) {
                // Get current layer data
                const layer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];
                const data = layer.data;
                const r = parseInt(colorHex.slice(1,3), 16), g = parseInt(colorHex.slice(3,5), 16), b = parseInt(colorHex.slice(5,7), 16), a = Math.floor(opacity*255);
                
                const startPos = (y * State.width + x) * 4;
                const sr = data.data[startPos], sg = data.data[startPos+1], sb = data.data[startPos+2], sa = data.data[startPos+3];
                
                if (sr===r && sg===g && sb===b && sa===a) return;

                const match = (p) => {
                    return data.data[p]===sr && data.data[p+1]===sg && data.data[p+2]===sb && data.data[p+3]===sa;
                };

                const stack = [[x, y]];
                while(stack.length) {
                    const [cx, cy] = stack.pop();
                    const pos = (cy * State.width + cx) * 4;
                    
                    if(match(pos)) {
                        data.data[pos] = r; data.data[pos+1] = g; data.data[pos+2] = b; data.data[pos+3] = a;
                        if(cx > 0) stack.push([cx-1, cy]);
                        if(cx < State.width-1) stack.push([cx+1, cy]);
                        if(cy > 0) stack.push([cx, cy-1]);
                        if(cy < State.height-1) stack.push([cx, cy+1]);
                    }
                }
                
                layerCtx.putImageData(data, 0, 0); // Sync context
                CanvasManager.saveLayerChange();
            },

            shiftLayer(dx, dy) {
                // Simple wrap-around shift or clip shift
                const data = layerCtx.getImageData(0,0,State.width, State.height);
                layerCtx.clearRect(0,0,State.width, State.height);
                layerCtx.putImageData(data, dx, dy);
                this.updateLayerFromCtx();
            },

            pickColor(x, y) {
                // Pick from COMPOSITE view (what user sees)
                const p = ctx.getImageData(x, y, 1, 1).data;
                // p is [r,g,b,a]
                if (p[3] === 0) return; 
                
                const hex = "#" + ("000000" + ((p[0] << 16) | (p[1] << 8) | p[2]).toString(16)).slice(-6);
                const alpha = (p[3] / 255).toFixed(2);
                
                State.color = hex;
                State.opacity = alpha;
                UI.colorPicker.value = hex;
                UI.opacitySlider.value = alpha;
                
                this.setTool('pencil');
            },

            setTool(name) {
                State.tool = name;
                UI.toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === name));
            }
        };

        const AnimationManager = {
            renderTimeline() {
                UI.framesList.innerHTML = '';
                State.frames.forEach((f, i) => {
                    const div = document.createElement('div');
                    div.className = `frame-preview ${i === State.currentFrameIndex ? 'active' : ''}`;
                    div.onclick = () => this.switchFrame(i);
                    
                    // Flatten layers to display thumbnail
                    const c = document.createElement('canvas');
                    c.width = State.width; c.height = State.height;
                    const cx = c.getContext('2d');
                    f.layers.forEach(l => { if(l.visible) {
                        const temp = document.createElement('canvas'); temp.width=State.width; temp.height=State.height;
                        temp.getContext('2d').putImageData(l.data,0,0);
                        cx.drawImage(temp, 0, 0);
                    }});
                    
                    div.appendChild(c);
                    const num = document.createElement('span');
                    num.className = "absolute bottom-0 right-1 text-[9px] text-gray-300 font-bold bg-black/50 px-1 rounded";
                    num.innerText = i + 1;
                    div.appendChild(num);
                    UI.framesList.appendChild(div);
                });
            },
            updateTimelineThumb(i) {
                if(!UI.framesList.children[i]) return;
                const c = UI.framesList.children[i].querySelector('canvas');
                const cx = c.getContext('2d');
                cx.clearRect(0,0,State.width, State.height);
                State.frames[i].layers.forEach(l => { if(l.visible) {
                    const temp = document.createElement('canvas'); temp.width=State.width; temp.height=State.height;
                    temp.getContext('2d').putImageData(l.data,0,0);
                    cx.drawImage(temp, 0, 0);
                }});
            },
            switchFrame(i) {
                State.currentFrameIndex = i;
                LayerManager.renderList();
                CanvasManager.render();
                // Update active UI
                Array.from(UI.framesList.children).forEach((el, idx) => el.classList.toggle('active', idx===i));
            },
            addFrame() {
                // Copy layer structure from frame 0 but empty data
                const newLayers = State.frames[0].layers.map(() => CanvasManager.createLayer());
                State.frames.splice(State.currentFrameIndex+1, 0, { layers: newLayers });
                this.switchFrame(State.currentFrameIndex+1);
                this.renderTimeline();
            },
            duplicateFrame() {
                const src = State.frames[State.currentFrameIndex];
                // Deep Copy
                const newLayers = src.layers.map(l => ({ 
                    visible: l.visible, 
                    data: new ImageData(new Uint8ClampedArray(l.data.data), State.width, State.height) 
                }));
                State.frames.splice(State.currentFrameIndex+1, 0, { layers: newLayers });
                this.switchFrame(State.currentFrameIndex+1);
                this.renderTimeline();
            },
            deleteFrame(i) {
                // Delete active frame logic - defaults to index
                const target = i !== undefined ? i : State.currentFrameIndex;
                if(State.frames.length <= 1) return;
                State.frames.splice(target, 1);
                if(State.currentFrameIndex >= State.frames.length) State.currentFrameIndex = State.frames.length - 1;
                this.switchFrame(State.currentFrameIndex);
                this.renderTimeline();
            }
        };

        const ColorManager = {
            addToHistory(hex) {
                if(!State.recentColors.includes(hex)) {
                    State.recentColors.unshift(hex);
                    if(State.recentColors.length > 10) State.recentColors.pop();
                    this.render();
                }
            },
            render() {
                UI.paletteContainer.innerHTML = '';
                State.recentColors.forEach(c => {
                    const d = document.createElement('div');
                    d.className = 'palette-swatch'; d.style.backgroundColor = c;
                    d.onclick = () => {
                        State.color = c; UI.colorPicker.value = c;
                        document.getElementById('colorHex').textContent = c;
                    };
                    UI.paletteContainer.appendChild(d);
                });
            }
        };

        // --- EVENT HANDLERS ---
        const getCoords = (e) => {
            const r = UI.drawingArea.getBoundingClientRect();
            const cx = e.touches ? e.touches[0].clientX : e.clientX;
            const cy = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: Math.floor((cx - r.left) / State.zoom),
                y: Math.floor((cy - r.top) / State.zoom)
            };
        };

        // Scroll Zooming
        UI.wrapper.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -2 : 2;
                let newZoom = State.zoom + delta;
                newZoom = Math.min(Math.max(newZoom, 1), 60);
                State.zoom = newZoom;
                CanvasManager.updateZoom();
            }
        }, { passive: false });

        // Preview Window Panning
        let isPanningMap = false;
        const handleMapPan = (e) => {
             if(!isPanningMap) return;
             const r = UI.previewContainer.getBoundingClientRect();
             const cx = e.touches ? e.touches[0].clientX : e.clientX;
             const cy = e.touches ? e.touches[0].clientY : e.clientY;
             
             // Calculate percentage relative to preview box
             const px = (cx - r.left) / r.width;
             const py = (cy - r.top) / r.height;
             
             // Scroll main wrapper
             UI.wrapper.scrollLeft = px * UI.drawingArea.offsetWidth - UI.wrapper.clientWidth / 2;
             UI.wrapper.scrollTop = py * UI.drawingArea.offsetHeight - UI.wrapper.clientHeight / 2;
             
             CanvasManager.updateMinimap();
        };
        UI.previewContainer.addEventListener('mousedown', (e) => { isPanningMap = true; handleMapPan(e); });
        window.addEventListener('mousemove', (e) => { handleMapPan(e); });
        window.addEventListener('mouseup', () => isPanningMap = false);

        // Drawing Events
        const start = (e) => {
            if(e.cancelable && e.target === UI.previewLayer) e.preventDefault();
            const {x, y} = getCoords(e);
            if(x>=0 && x<State.width && y>=0 && y<State.height) ToolManager.start(x, y);
        };
        const move = (e) => {
            if(!State.isDrawing) {
                const {x, y} = getCoords(e);
                UI.coords.innerText = `${x}, ${y}`;
            } else {
                const {x, y} = getCoords(e);
                ToolManager.move(x, y);
            }
        };
        const end = (e) => {
            if(!State.isDrawing) return;
            // Get last known if touch
            const {x, y} = getCoords(e.changedTouches ? {touches: e.changedTouches} : e);
            ToolManager.end(x, y);
        };

        UI.previewLayer.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
        UI.previewLayer.addEventListener('touchstart', start, {passive:false});
        window.addEventListener('touchmove', move, {passive:false});
        window.addEventListener('touchend', end);

        // UI Listeners
        document.getElementById('addLayerBtn').onclick = () => LayerManager.addLayer();
        UI.toolBtns.forEach(b => b.onclick = () => ToolManager.setTool(b.dataset.tool));
        UI.colorPicker.oninput = (e) => { State.color = e.target.value; document.getElementById('colorHex').textContent = e.target.value; };
        UI.opacitySlider.oninput = (e) => { State.opacity = parseFloat(e.target.value); };
        UI.brushSizeSlider.oninput = (e) => { State.brushSize = parseInt(e.target.value); UI.brushSizeDisplay.innerText = State.brushSize; };
        
        document.getElementById('addFrameBtn').onclick = () => AnimationManager.addFrame();
        document.getElementById('duplicateFrameBtn').onclick = () => AnimationManager.duplicateFrame();
        document.getElementById('deleteFrameBtn').onclick = () => AnimationManager.deleteFrame();
        
        // Init
        CanvasManager.init(32, 32);
        ColorManager.render();
        
        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if(e.target.tagName === 'INPUT') return;
            const k = e.key.toLowerCase();
            if(k==='b') ToolManager.setTool('brush');
            if(k==='p') ToolManager.setTool('pencil');
            if(k==='e') ToolManager.setTool('eraser');
            if(k==='f') ToolManager.setTool('bucket');
        });
