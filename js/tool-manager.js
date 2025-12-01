// tool-manager.js
// Handles all drawing tools and operations

const ToolManager = {
    /**
     * Convert hex color to RGBA string
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    /**
     * Plot a pixel or brush stroke
     * isWrapperCall: flag to prevent infinite recursion during tilemap wrapping
     */
    plot(x, y, colorStr, context, isEraser = false, isWrapperCall = false) { // ADDED isWrapperCall
        let size = State.brushSize;
        if (State.tool === 'pencil') size = 1;

        // Dither pattern check
        if (State.tool === 'dither') {
            if ((Math.floor(x) + Math.floor(y)) % 2 !== 0) return;
        }

        context.fillStyle = isEraser ? 'rgba(0,0,0,1)' : colorStr;
        context.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';

        const offset = Math.floor(size / 2);
        context.fillRect(Math.floor(x) - offset, Math.floor(y) - offset, size, size);


    },

    /**
     * Draw a line using Bresenham's algorithm
     */
    drawLine(x0, y0, x1, y1, color, ctx, isEraser) {
        x0 = Math.floor(x0); y0 = Math.floor(y0);
        x1 = Math.floor(x1); y1 = Math.floor(y1);

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



    /**
     * Draw a rectangle outline
     */
    drawRect(x0, y0, x1, y1, color, ctx) {
        this.drawLine(x0, y0, x1, y0, color, ctx, false);
        this.drawLine(x0, y1, x1, y1, color, ctx, false);
        this.drawLine(x0, y0, x0, y1, color, ctx, false);
        this.drawLine(x1, y0, x1, y1, color, ctx, false);
    },

    /**
     * Draw a circle using midpoint algorithm
     */
    drawCircle(x0, y0, x1, y1, color, ctx) {
        let r = Math.floor(Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2)));
        let x = r, y = 0, P = 1 - r;

        const plotSym = (cx, cy, x, y) => {
            this.plot(cx + x, cy + y, color, ctx);
            this.plot(cx - x, cy + y, color, ctx);
            this.plot(cx + x, cy - y, color, ctx);
            this.plot(cx - x, cy - y, color, ctx);
            this.plot(cx + y, cy + x, color, ctx);
            this.plot(cx - y, cy + x, color, ctx);
            this.plot(cx + y, cy - x, color, ctx);
            this.plot(cx - y, cy - x, color, ctx);
        };

        while (x > y) {
            y++;
            if (P <= 0) P = P + 2 * y + 1;
            else { x--; P = P + 2 * y - 2 * x + 1; }
            if (x < y) break;
            plotSym(x0, y0, x, y);
        }
    },

    /**
     * Draw a mirrored line using Bresenham's algorithm
     */
    drawMirrorLine(x0, y0, x1, y1, color, ctx) {
        // Draw the original line
        this.drawLine(x0, y0, x1, y1, color, ctx, false);

        // Get mirror settings
        const mirrorX = State.mirrorAxis === 'x' || State.mirrorAxis === 'both';
        const mirrorY = State.mirrorAxis === 'y' || State.mirrorAxis === 'both';

        // Calculate mirrored coordinates
        const mirrorPoint = (x, y) => {
            const mirroredX = mirrorX ? State.width - 1 - x : x;
            const mirroredY = mirrorY ? State.height - 1 - y : y;
            return { x: mirroredX, y: mirroredY };
        };

        const startMirrored = mirrorPoint(x0, y0);
        const endMirrored = mirrorPoint(x1, y1);

        // Draw mirrored lines
        if (mirrorX && !mirrorY) {
            // X-axis only
            this.drawLine(State.width - 1 - x0, y0, State.width - 1 - x1, y1, color, ctx, false);
        } else if (!mirrorX && mirrorY) {
            // Y-axis only
            this.drawLine(x0, State.height - 1 - y0, x1, State.height - 1 - y1, color, ctx, false);
        } else if (mirrorX && mirrorY) {
            // Both axes (draw all combinations)
            // X-axis mirror
            this.drawLine(State.width - 1 - x0, y0, State.width - 1 - x1, y1, color, ctx, false);
            // Y-axis mirror
            this.drawLine(x0, State.height - 1 - y0, x1, State.height - 1 - y1, color, ctx, false);
            // Both axes mirror
            this.drawLine(State.width - 1 - x0, State.height - 1 - y0, State.width - 1 - x1, State.height - 1 - y1, color, ctx, false);
        }
    },

    /**
     * Mirror the active layer based on State.mirrorAxis
     */
    mirrorLayer() {
        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];

        const imageData = layer.data;
        const width = State.width;
        const height = State.height;
        const data = imageData.data;

        const newData = new ImageData(width, height);
        const newDataArray = newData.data;

        const mirrorX = State.mirrorAxis === 'x' || State.mirrorAxis === 'both';
        const mirrorY = State.mirrorAxis === 'y' || State.mirrorAxis === 'both';

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const originalIndex = (y * width + x) * 4;

                // Calculate mirrored coordinates
                const targetX = mirrorX ? width - 1 - x : x;
                const targetY = mirrorY ? height - 1 - y : y;

                const newIndex = (targetY * width + targetX) * 4;

                // Copy all 4 bytes (RGBA)
                newDataArray[newIndex] = data[originalIndex];
                newDataArray[newIndex + 1] = data[originalIndex + 1];
                newDataArray[newIndex + 2] = data[originalIndex + 2];
                newDataArray[newIndex + 3] = data[originalIndex + 3];
            }
        }

        layer.data = newData;

        // Update canvas and save history
        CanvasManager.render();
        // Assuming InputHandler.saveState() handles CanvasManager.saveLayerChange implicitly
        if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
            InputHandler.saveState();
        }

        const axisText = State.mirrorAxis === 'both' ? 'X and Y' : State.mirrorAxis.toUpperCase();
        InputHandler.showNotification(`Layer mirrored on ${axisText} axis!`, 'success');
    },

    /**
     * Start drawing operation
     */
    start(x, y) {
        State.isDrawing = true;
        State.dragStart = { x, y };

        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];
        layerCtx.putImageData(layer.data, 0, 0);

        const rgba = this.hexToRgba(State.color, State.opacity);

        if (State.tool === 'pencil' || State.tool === 'brush' || State.tool === 'eraser' || State.tool === 'dither') {
            this.plot(x, y, rgba, layerCtx, State.tool === 'eraser');
            CanvasManager.render(); // Instant update for small tools
        } else if (State.tool === 'bucket') {
            this.floodFill(x, y, State.color, State.opacity);
        } else if (State.tool === 'eyedropper') {
            this.pickColor(x, y);
            State.isDrawing = false;
            this.setTool('pencil');
        } else if (State.tool === 'move') {
            // Do nothing on start, wait for move
        } else if (State.tool === 'mirror') {
            // Mirror tool behaves like a drawing tool - just start drawing
            // The actual mirroring logic is handled in move() and end() methods
        }
    },

    /**
     * Continue drawing operation
     */
    move(x, y) {
        if (!State.isDrawing) return;

        const currentLayer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];
        if (!currentLayer.visible) return;

        const rgba = this.hexToRgba(State.color, State.opacity);
        const isEraser = State.tool === 'eraser';

        if (['pencil', 'brush', 'dither', 'eraser'].includes(State.tool)) {
            this.drawLine(State.dragStart.x, State.dragStart.y, x, y, rgba, layerCtx, isEraser);
            State.dragStart = { x, y };
            this.updateLayerFromCtx();
        } else if (State.tool === 'mirror') {
            // Draw the original point
            this.plot(x, y, rgba, layerCtx, false);

            // Draw mirrored points based on mirror axis settings
            const mirrorX = State.mirrorAxis === 'x' || State.mirrorAxis === 'both';
            const mirrorY = State.mirrorAxis === 'y' || State.mirrorAxis === 'both';

            if (mirrorX) {
                this.plot(State.width - 1 - x, y, rgba, layerCtx, false);
            }
            if (mirrorY) {
                this.plot(x, State.height - 1 - y, rgba, layerCtx, false);
            }
            if (mirrorX && mirrorY) {
                this.plot(State.width - 1 - x, State.height - 1 - y, rgba, layerCtx, false);
            }

            this.updateLayerFromCtx();
        } else if (['stroke', 'rect', 'circle'].includes(State.tool)) {
            pCtx.clearRect(0, 0, State.width, State.height);
            if (State.tool === 'stroke') this.drawLine(State.dragStart.x, State.dragStart.y, x, y, rgba, pCtx, false);
            if (State.tool === 'rect') this.drawRect(State.dragStart.x, State.dragStart.y, x, y, rgba, pCtx);
            if (State.tool === 'circle') this.drawCircle(State.dragStart.x, State.dragStart.y, x, y, rgba, pCtx);
        }
    },

    /**
     * End drawing operation
     */
    end(x, y) {
        if (!State.isDrawing) return;
        State.isDrawing = false;

        const rgba = this.hexToRgba(State.color, State.opacity);

        if (['stroke', 'rect', 'circle'].includes(State.tool)) {
            if (State.tool === 'stroke') this.drawLine(State.dragStart.x, State.dragStart.y, x, y, rgba, layerCtx, false);
            if (State.tool === 'rect') this.drawRect(State.dragStart.x, State.dragStart.y, x, y, rgba, layerCtx);
            if (State.tool === 'circle') this.drawCircle(State.dragStart.x, State.dragStart.y, x, y, rgba, layerCtx);

            this.updateLayerFromCtx();
            CanvasManager.clearPreviewLayer();
        } else if (State.tool === 'mirror') {
            // For mirror tool, draw lines with mirroring when dragging from start to end
            this.drawMirrorLine(State.dragStart.x, State.dragStart.y, x, y, rgba, layerCtx);
            this.updateLayerFromCtx();
        } else if (State.tool === 'move') {
            const dx = x - State.dragStart.x;
            const dy = y - State.dragStart.y;
            this.shiftLayer(dx, dy);
        }

        ColorManager.addToHistory(State.color);
    },

    /**
     * Update layer data from working canvas
     */
    updateLayerFromCtx() {
        const newData = layerCtx.getImageData(0, 0, State.width, State.height);
        State.frames[State.currentFrameIndex].layers[State.activeLayerIndex].data = newData;
        CanvasManager.saveLayerChange();

        // Save to history for undo/redo
        if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
            InputHandler.saveState();
        }

        // Update tilemap preview if available
        if (typeof TilemapManager !== 'undefined' && TilemapManager.refresh) {
            TilemapManager.refresh();
        }
        
        // Update seamless grid overlay if enabled
        if (typeof TilemapManager !== 'undefined' && TilemapManager.isSeamlessModeEnabled) {
            CanvasManager.updateSeamlessGridOverlay();
        }
    },

    /**
     * Flood fill algorithm
     */
    floodFill(x, y, colorHex, opacity) {
        const layer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];
        const data = layer.data;

        const r = parseInt(colorHex.slice(1, 3), 16);
        const g = parseInt(colorHex.slice(3, 5), 16);
        const b = parseInt(colorHex.slice(5, 7), 16);
        const a = Math.floor(opacity * 255);

        const startPos = (y * State.width + x) * 4;
        const sr = data.data[startPos];
        const sg = data.data[startPos + 1];
        const sb = data.data[startPos + 2];
        const sa = data.data[startPos + 3];

        if (sr === r && sg === g && sb === b && sa === a) return;

        const match = (p) => {
            return data.data[p] === sr && data.data[p + 1] === sg &&
                data.data[p + 2] === sb && data.data[p + 3] === sa;
        };

        const stack = [[x, y]];
        const visited = new Set(); // Prevent infinite loops

        while (stack.length) {
            const [cx, cy] = stack.pop();

            // Skip if out of bounds
            if (cx < 0 || cx >= State.width || cy < 0 || cy >= State.height) continue;

            const pos = (cy * State.width + cx) * 4;
            const posKey = `${cx},${cy}`;

            // Skip if already visited
            if (visited.has(posKey)) continue;
            visited.add(posKey);

            if (match(pos)) {
                data.data[pos] = r;
                data.data[pos + 1] = g;
                data.data[pos + 2] = b;
                data.data[pos + 3] = a;

                stack.push([cx - 1, cy]);
                stack.push([cx + 1, cy]);
                stack.push([cx, cy - 1]);
                stack.push([cx, cy + 1]);
            }
        }

        layerCtx.putImageData(data, 0, 0);
        CanvasManager.saveLayerChange();

        // Save to history for undo/redo
        if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
            InputHandler.saveState();
        }
    },

    /**
     * Shift layer content
     */
    shiftLayer(dx, dy) {
        const data = layerCtx.getImageData(0, 0, State.width, State.height);
        layerCtx.clearRect(0, 0, State.width, State.height);
        layerCtx.putImageData(data, dx, dy);
        this.updateLayerFromCtx();
    },

    /**
     * Pick color from canvas
     */
    pickColor(x, y) {
        const p = ctx.getImageData(x, y, 1, 1).data;
        if (p[3] === 0) return;

        const hex = "#" + ("000000" + ((p[0] << 16) | (p[1] << 8) | p[2]).toString(16)).slice(-6);
        const alpha = (p[3] / 255).toFixed(2);

        State.color = hex;
        State.opacity = parseFloat(alpha);
        UI.colorPicker.value = hex;
        UI.colorHex.textContent = hex;
        UI.opacitySlider.value = alpha;

        this.setTool('pencil');
    },

    /**
     * Set active tool
     */
    setTool(name) {
        State.tool = name;
        UI.toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === name));
    }
};
