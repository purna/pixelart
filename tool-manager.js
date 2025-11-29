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
     */
    plot(x, y, colorStr, context, isEraser = false) {
        let size = State.brushSize;
        if (State.tool === 'pencil' || State.tool === 'mirror') size = 1;

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
     * Start drawing operation
     */
    start(x, y) {
        State.isDrawing = true;
        State.dragStart = { x, y };
        
        const currentLayer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];
        if (!currentLayer.visible) return;

        // Load current layer into working canvas
        layerCtx.clearRect(0, 0, State.width, State.height);
        layerCtx.putImageData(currentLayer.data, 0, 0);

        const rgba = this.hexToRgba(State.color, State.opacity);
        const isEraser = State.tool === 'eraser';

        if (['pencil', 'brush', 'dither', 'eraser'].includes(State.tool)) {
            this.plot(x, y, rgba, layerCtx, isEraser);
            this.updateLayerFromCtx();
        } else if (State.tool === 'mirror') {
            this.plot(x, y, rgba, layerCtx, false);
            this.plot(State.width - 1 - x, y, rgba, layerCtx, false);
            this.updateLayerFromCtx();
        } else if (State.tool === 'bucket') {
            this.floodFill(x, y, State.color, State.opacity);
        } else if (State.tool === 'eyedropper') {
            this.pickColor(x, y);
            State.isDrawing = false;
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
            this.plot(x, y, rgba, layerCtx, false);
            this.plot(State.width - 1 - x, y, rgba, layerCtx, false);
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
        while (stack.length) {
            const [cx, cy] = stack.pop();
            const pos = (cy * State.width + cx) * 4;
            
            if (match(pos)) {
                data.data[pos] = r;
                data.data[pos + 1] = g;
                data.data[pos + 2] = b;
                data.data[pos + 3] = a;
                
                if (cx > 0) stack.push([cx - 1, cy]);
                if (cx < State.width - 1) stack.push([cx + 1, cy]);
                if (cy > 0) stack.push([cx, cy - 1]);
                if (cy < State.height - 1) stack.push([cx, cy + 1]);
            }
        }
        
        layerCtx.putImageData(data, 0, 0);
        CanvasManager.saveLayerChange();
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
