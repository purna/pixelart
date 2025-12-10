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
        const size = State.brushSize;

        // Dither pattern check
        if (State.tool === 'dither') {
            if ((Math.floor(x) + Math.floor(y)) % 2 !== 0) return;
        }

        if (isEraser) {
            // Eraser with blur support for partial pixel erasing
            if (State.brushBlur > 0 && State.tool === 'eraser') {
                // Use soft eraser with transparency gradient
                const centerX = Math.floor(x);
                const centerY = Math.floor(y);
                const radius = Math.floor(size / 2);

                // Create radial gradient for soft eraser effect
                const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + State.brushBlur);
                gradient.addColorStop(0, 'rgba(0,0,0,1)'); // Full erasure at center
                gradient.addColorStop(1, 'rgba(0,0,0,0)'); // No erasure at edges

                context.fillStyle = gradient;
                context.globalCompositeOperation = 'destination-out';
                context.beginPath();
                context.arc(centerX, centerY, radius + State.brushBlur, 0, 2 * Math.PI);
                context.fill();
            } else {
                // Standard hard eraser
                context.fillStyle = 'rgba(0,0,0,1)';
                context.globalCompositeOperation = 'destination-out';
                const offset = Math.floor(size / 2);
                context.fillRect(Math.floor(x) - offset, Math.floor(y) - offset, size, size);
            }
        } else {
            // Normal drawing tools
            context.fillStyle = colorStr;
            context.globalCompositeOperation = 'source-over';

            if (State.tool === 'brush') {
                // Brush tool - use circular brush with blur for soft edges
                const centerX = Math.floor(x);
                const centerY = Math.floor(y);
                const radius = Math.floor(size / 2);

                // Create radial gradient for soft brush effect
                const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + State.brushBlur);
                gradient.addColorStop(0, colorStr);
   
                // Extract RGB values from colorStr and create transparent version
                const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                if (rgbaMatch) {
                    const r = parseInt(rgbaMatch[1]);
                    const g = parseInt(rgbaMatch[2]);
                    const b = parseInt(rgbaMatch[3]);
                    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                } else {
                    // Fallback to transparent black if color parsing fails
                    gradient.addColorStop(1, 'rgba(0,0,0,0)');
                }

                context.fillStyle = gradient;
                context.beginPath();
                context.arc(centerX, centerY, radius + State.brushBlur, 0, 2 * Math.PI);
                context.fill();
            } else {
                // Pencil and other tools - use standard square drawing
                const offset = Math.floor(size / 2);
                context.fillRect(Math.floor(x) - offset, Math.floor(y) - offset, size, size);
            }
        }
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
        // Calculate radius from distance between center and edge points
        let r = Math.floor(Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2)));
        // Ensure minimum radius of 1 pixel
        r = Math.max(1, r);

        let x = 0;
        let y = r;
        let d = 3 - 2 * r;

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

        plotSym(x0, y0, x, y);

        while (y >= x) {
            x++;

            if (d > 0) {
                y--;
                d = d + 4 * (x - y) + 10;
            } else {
                d = d + 4 * x + 6;
            }

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
            console.log('Fill tool activated at:', x, y, 'with color:', State.color);
            this.floodFill(x, y, State.color, State.opacity);
            State.isDrawing = false; // Fill tool completes immediately
            console.log('Fill tool completed');
            return; // Don't continue with normal drawing flow
        } else if (State.tool === 'eyedropper') {
            console.log('Eyedropper tool activated at:', x, y);
            this.pickColor(x, y);
            State.isDrawing = false;
            this.setTool('pencil');
            console.log('Eyedropper tool completed, color set to:', State.color);
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
        } else if (State.tool === 'move') {
            // Show move preview during drag
            this.showMovePreview(x, y);
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

            // Clear the preview after move is complete
            pCtx.clearRect(0, 0, State.width, State.height);
            pCtx.setLineDash([]);

            this.shiftLayer(dx, dy);
            InputHandler.showNotification('Layer content moved!', 'success');
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
     * Flood fill algorithm with improved performance and edge case handling
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

        // Don't fill if already the target color (with some tolerance for alpha)
        if (sr === r && sg === g && sb === b && Math.abs(sa - a) < 10) return;

        // Use a more efficient scanline algorithm instead of stack-based
        const width = State.width;
        const height = State.height;
        const pixels = data.data;
        const visited = new Uint8Array(width * height); // More efficient than Set for this use case

        // Convert coordinates to index
        const toIndex = (x, y) => y * width + x;

        // Check if pixel matches the target color (with alpha tolerance)
        const matchColor = (x, y) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return false;

            const idx = toIndex(x, y) * 4;
            // Check RGB exactly, but allow some tolerance for alpha
            return pixels[idx] === sr &&
                   pixels[idx + 1] === sg &&
                   pixels[idx + 2] === sb &&
                   Math.abs(pixels[idx + 3] - sa) < 10;
        };

        // Scanline flood fill algorithm
        const stack = [];
        stack.push({x, y});

        while (stack.length) {
            const {x: cx, y: cy} = stack.pop();
            const idx = toIndex(cx, cy);

            // Skip if already processed
            if (visited[idx]) continue;
            visited[idx] = 1;

            // Skip if doesn't match target color
            if (!matchColor(cx, cy)) continue;

            // Fill current pixel
            const pixelIdx = idx * 4;
            pixels[pixelIdx] = r;
            pixels[pixelIdx + 1] = g;
            pixels[pixelIdx + 2] = b;
            pixels[pixelIdx + 3] = a;

            // Scan left
            let x1 = cx - 1;
            while (x1 >= 0 && matchColor(x1, cy)) {
                const leftIdx = toIndex(x1, cy);
                if (!visited[leftIdx]) {
                    visited[leftIdx] = 1;
                    const leftPixelIdx = leftIdx * 4;
                    pixels[leftPixelIdx] = r;
                    pixels[leftPixelIdx + 1] = g;
                    pixels[leftPixelIdx + 2] = b;
                    pixels[leftPixelIdx + 3] = a;
                }
                x1--;
            }

            // Scan right
            let x2 = cx + 1;
            while (x2 < width && matchColor(x2, cy)) {
                const rightIdx = toIndex(x2, cy);
                if (!visited[rightIdx]) {
                    visited[rightIdx] = 1;
                    const rightPixelIdx = rightIdx * 4;
                    pixels[rightPixelIdx] = r;
                    pixels[rightPixelIdx + 1] = g;
                    pixels[rightPixelIdx + 2] = b;
                    pixels[rightPixelIdx + 3] = a;
                }
                x2++;
            }

            // Check lines above and below for new seed pixels
            for (let x = x1 + 1; x < x2; x++) {
                // Check line above
                if (cy > 0 && matchColor(x, cy - 1) && !visited[toIndex(x, cy - 1)]) {
                    stack.push({x, y: cy - 1});
                }

                // Check line below
                if (cy < height - 1 && matchColor(x, cy + 1) && !visited[toIndex(x, cy + 1)]) {
                    stack.push({x, y: cy + 1});
                }
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
     * Show move preview during drag operation
     */
    showMovePreview(x, y) {
        // Clear previous preview
        pCtx.clearRect(0, 0, State.width, State.height);

        // Calculate translation
        const dx = x - State.dragStart.x;
        const dy = y - State.dragStart.y;

        // Get current layer data
        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];
        const data = layer.data;

        // Draw semi-transparent preview of the moved content
        pCtx.globalAlpha = 0.7;
        pCtx.drawImage(State.layerCanvas, dx, dy);
        pCtx.globalAlpha = 1.0;

        // Draw outline around the moved content
        pCtx.strokeStyle = 'rgba(100, 200, 255, 0.9)';
        pCtx.lineWidth = 1;
        pCtx.setLineDash([5, 3]);

        // Find bounding box of non-transparent pixels for outline
        let minX = State.width, minY = State.height, maxX = 0, maxY = 0;
        let hasContent = false;

        for (let y = 0; y < State.height; y++) {
            for (let x = 0; x < State.width; x++) {
                const index = (y * State.width + x) * 4;
                if (data.data[index + 3] > 0) {
                    hasContent = true;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (hasContent) {
            const width = maxX - minX + 1;
            const height = maxY - minY + 1;
            pCtx.strokeRect(minX + dx, minY + dy, width, height);
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
     * Rotate current layer 90 degrees clockwise
     */
    rotateCurrentLayer() {
        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];
        const imageData = layer.data;
        const width = State.width;
        const height = State.height;

        // Create a new ImageData for the rotated result
        const rotatedData = new ImageData(height, width);

        // Rotate 90 degrees clockwise
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const originalIndex = (y * width + x) * 4;
                const rotatedIndex = ((width - 1 - x) * height + y) * 4;

                // Copy pixel data
                rotatedData.data[rotatedIndex] = imageData.data[originalIndex];
                rotatedData.data[rotatedIndex + 1] = imageData.data[originalIndex + 1];
                rotatedData.data[rotatedIndex + 2] = imageData.data[originalIndex + 2];
                rotatedData.data[rotatedIndex + 3] = imageData.data[originalIndex + 3];
            }
        }

        // Update layer data
        layer.data = rotatedData;

        // Update canvas and save history
        CanvasManager.render();
        if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
            InputHandler.saveState();
        }

        InputHandler.showNotification('Layer rotated 90° clockwise!', 'success');
    },

    /**
     * Flip current layer horizontally
     */
    flipCurrentLayer() {
        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];
        const imageData = layer.data;
        const width = State.width;
        const height = State.height;
        const data = imageData.data;

        // Create a new ImageData for the flipped result
        const flippedData = new ImageData(width, height);
        const flippedDataArray = flippedData.data;

        // Flip horizontally
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const originalIndex = (y * width + x) * 4;
                const flippedIndex = (y * width + (width - 1 - x)) * 4;

                // Copy pixel data
                flippedDataArray[flippedIndex] = data[originalIndex];
                flippedDataArray[flippedIndex + 1] = data[originalIndex + 1];
                flippedDataArray[flippedIndex + 2] = data[originalIndex + 2];
                flippedDataArray[flippedIndex + 3] = data[originalIndex + 3];
            }
        }

        // Update layer data
        layer.data = flippedData;

        // Update canvas and save history
        CanvasManager.render();
        if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
            InputHandler.saveState();
        }

        InputHandler.showNotification('Layer flipped horizontally!', 'success');
    },

    /**
     * Align current layer content to center of canvas
     */
    alignCurrentLayerToCenter() {
        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];
        const imageData = layer.data;
        const width = State.width;
        const height = State.height;
        const data = imageData.data;

        // Find the bounding box of non-transparent pixels
        let minX = width, minY = height, maxX = 0, maxY = 0;
        let hasContent = false;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                if (data[index + 3] > 0) { // If pixel is not transparent
                    hasContent = true;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (!hasContent) {
            InputHandler.showNotification('Layer is empty, nothing to center!', 'info');
            return;
        }

        // Calculate current content dimensions and position
        const contentWidth = maxX - minX + 1;
        const contentHeight = maxY - minY + 1;
        const centerX = Math.floor((width - contentWidth) / 2);
        const centerY = Math.floor((height - contentHeight) / 2);

        // Calculate translation needed
        const translateX = centerX - minX;
        const translateY = centerY - minY;

        // Create a new ImageData for the centered result
        const centeredData = new ImageData(width, height);
        const centeredDataArray = centeredData.data;

        // Clear the new image data (make it transparent)
        for (let i = 0; i < centeredDataArray.length; i += 4) {
            centeredDataArray[i] = 0;
            centeredDataArray[i + 1] = 0;
            centeredDataArray[i + 2] = 0;
            centeredDataArray[i + 3] = 0;
        }

        // Copy pixels to centered position
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const originalIndex = (y * width + x) * 4;
                if (data[originalIndex + 3] > 0) { // If pixel is not transparent
                    const newX = x + translateX;
                    const newY = y + translateY;

                    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                        const newIndex = (newY * width + newX) * 4;
                        centeredDataArray[newIndex] = data[originalIndex];
                        centeredDataArray[newIndex + 1] = data[originalIndex + 1];
                        centeredDataArray[newIndex + 2] = data[originalIndex + 2];
                        centeredDataArray[newIndex + 3] = data[originalIndex + 3];
                    }
                }
            }
        }

        // Update layer data
        layer.data = centeredData;

        // Update canvas and save history
        CanvasManager.render();
        if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
            InputHandler.saveState();
        }

        InputHandler.showNotification('Layer content centered!', 'success');
    },

    /**
     * Pick color from canvas
     */
    pickColor(x, y) {
        console.log('pickColor called at:', x, y);
        // Use the composition canvas context to read pixel data
        const compositionCanvas = document.getElementById('layer-composition');
        if (!compositionCanvas) {
            console.error('Composition canvas not found');
            return;
        }
        const ctx = compositionCanvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2D context from composition canvas');
            return;
        }

        const p = ctx.getImageData(x, y, 1, 1).data;
        console.log('Pixel data at', x, y, ':', p);
        if (p[3] === 0) {
            console.log('Transparent pixel, not picking color');
            return;
        }

        const hex = "#" + ("000000" + ((p[0] << 16) | (p[1] << 8) | p[2]).toString(16)).slice(-6);
        const alpha = (p[3] / 255).toFixed(2);
        console.log('Picked color:', hex, 'with alpha:', alpha);

        State.color = hex;
        State.opacity = parseFloat(alpha);
        UI.colorPicker.value = hex;
        UI.colorHex.textContent = hex;
        UI.opacitySlider.value = alpha;

        // Add the picked color to the palette
        ColorManager.addToHistory(hex);

        this.setTool('pencil');
    },

    /**
     * Set active tool
     */
    setTool(name) {
        State.tool = name;

        // Handle both toolbar buttons and transform panel buttons
        const allToolButtons = [
            ...document.querySelectorAll('.tool-btn[data-tool]'),
            ...document.querySelectorAll('#transform-container .tool-btn')
        ];

        allToolButtons.forEach(b => b.classList.toggle('active', b.dataset.tool === name || b.id === name + 'Btn'));

        // Special handling for transform tools
        if (name === 'move') {
            // Highlight both move buttons (toolbar and transform panel)
            const moveButtons = document.querySelectorAll('#moveBtn');
            moveButtons.forEach(btn => btn.classList.add('active'));
        }

        // When selecting the brush tool, ensure blur value is at least 1
        if (name === 'brush' && State.brushBlur < 1) {
            State.brushBlur = 1;
            // Update the UI to reflect the change
            if (UI.blurSlider) {
                UI.blurSlider.value = 1;
            }
            if (UI.blurDisplay) {
                UI.blurDisplay.textContent = 1;
            }
        }
    },

    // Selection Tools State
    selection: {
        active: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        type: null, // 'rect' or 'circle'
        pixels: null
    },

    /**
     * Start selection operation
     */
    startSelection(x, y, type) {
        this.selection.active = true;
        this.selection.startX = x;
        this.selection.startY = y;
        this.selection.endX = x;
        this.selection.endY = y;
        this.selection.type = type;
        this.selection.pixels = null;
    },

    /**
     * Update selection during drag
     */
    updateSelection(x, y) {
        if (!this.selection.active) return;

        this.selection.endX = x;
        this.selection.endY = y;

        // Clear previous preview
        pCtx.clearRect(0, 0, State.width, State.height);

        // Draw selection preview in blue-grey (50% black with blue tint)
        pCtx.strokeStyle = 'rgba(100, 100, 200, 0.7)';
        pCtx.lineWidth = 1;
        pCtx.setLineDash([5, 3]);

        if (this.selection.type === 'rect') {
            this.drawSelectionRect();
        } else if (this.selection.type === 'circle') {
            this.drawSelectionCircle();
        }
    },

    /**
     * Draw rectangular selection preview
     */
    drawSelectionRect() {
        const x0 = Math.min(this.selection.startX, this.selection.endX);
        const y0 = Math.min(this.selection.startY, this.selection.endY);
        const x1 = Math.max(this.selection.startX, this.selection.endX);
        const y1 = Math.max(this.selection.startY, this.selection.endY);

        pCtx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    },

    /**
     * Draw circular selection preview
     */
    drawSelectionCircle() {
        const x0 = this.selection.startX;
        const y0 = this.selection.startY;
        const x1 = this.selection.endX;
        const y1 = this.selection.endY;

        const r = Math.floor(Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2)));
        pCtx.beginPath();
        pCtx.arc(x0, y0, r, 0, 2 * Math.PI);
        pCtx.stroke();
    },

    /**
     * End selection and capture pixels
     */
    endSelection() {
        if (!this.selection.active) return;

        this.selection.active = false;

        // Clear preview
        pCtx.clearRect(0, 0, State.width, State.height);
        pCtx.setLineDash([]);

        // Capture the selected pixels
        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];

        if (this.selection.type === 'rect') {
            this.captureRectSelection(layer.data);
        } else if (this.selection.type === 'circle') {
            this.captureCircleSelection(layer.data);
        }
    },

    /**
     * Capture rectangular selection pixels
     */
    captureRectSelection(imageData) {
        const x0 = Math.min(this.selection.startX, this.selection.endX);
        const y0 = Math.min(this.selection.startY, this.selection.endY);
        const x1 = Math.max(this.selection.startX, this.selection.endX);
        const y1 = Math.max(this.selection.startY, this.selection.endY);

        const width = x1 - x0;
        const height = y1 - y0;

        // Create a new ImageData for the selection
        const selectionData = new ImageData(width, height);
        const srcData = imageData.data;
        const destData = selectionData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIdx = ((y0 + y) * State.width + (x0 + x)) * 4;
                const destIdx = (y * width + x) * 4;

                // Copy pixel data
                destData[destIdx] = srcData[srcIdx];
                destData[destIdx + 1] = srcData[srcIdx + 1];
                destData[destIdx + 2] = srcData[srcIdx + 2];
                destData[destIdx + 3] = srcData[srcIdx + 3];
            }
        }

        this.selection.pixels = selectionData;
        InputHandler.showNotification(`Rectangular selection captured (${width}x${height} pixels)`, 'success');
    },

    /**
     * Capture circular selection pixels
     */
    captureCircleSelection(imageData) {
        const x0 = this.selection.startX;
        const y0 = this.selection.startY;
        const x1 = this.selection.endX;
        const y1 = this.selection.endY;

        const r = Math.floor(Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2)));
        const diameter = r * 2;

        // Create a square ImageData that can contain the circle
        const selectionData = new ImageData(diameter, diameter);
        const srcData = imageData.data;
        const destData = selectionData.data;

        // Clear the selection data (transparent background)
        for (let i = 0; i < destData.length; i += 4) {
            destData[i] = 0;
            destData[i + 1] = 0;
            destData[i + 2] = 0;
            destData[i + 3] = 0;
        }

        // Copy pixels that are inside the circle
        for (let y = 0; y < diameter; y++) {
            for (let x = 0; x < diameter; x++) {
                // Check if pixel is inside the circle
                const dx = x - r;
                const dy = y - r;
                if (dx * dx + dy * dy <= r * r) {
                    const srcX = x0 - r + x;
                    const srcY = y0 - r + y;

                    // Check bounds
                    if (srcX >= 0 && srcX < State.width && srcY >= 0 && srcY < State.height) {
                        const srcIdx = (srcY * State.width + srcX) * 4;
                        const destIdx = (y * diameter + x) * 4;

                        // Copy pixel data
                        destData[destIdx] = srcData[srcIdx];
                        destData[destIdx + 1] = srcData[srcIdx + 1];
                        destData[destIdx + 2] = srcData[srcIdx + 2];
                        destData[destIdx + 3] = srcData[srcIdx + 3];
                    }
                }
            }
        }

        this.selection.pixels = selectionData;
        InputHandler.showNotification(`Circular selection captured (radius: ${r} pixels)`, 'success');
    },

    /**
     * Copy selected pixels to clipboard (simulated)
     */
    copySelection() {
        if (!this.selection.pixels) {
            InputHandler.showNotification('No active selection to copy', 'error');
            return;
        }

        // Store selection in state for paste operation
        State.copiedSelection = this.selection.pixels;
        InputHandler.showNotification('Selection copied to clipboard', 'success');
    },

    /**
     * Paste copied pixels to a new layer
     */
    pasteSelection() {
        if (!State.copiedSelection) {
            InputHandler.showNotification('No copied selection to paste', 'error');
            return;
        }

        // Create a new layer for the pasted content
        const currentFrame = State.frames[State.currentFrameIndex];
        const newLayer = this.createLayer('Pasted Selection');

        // Position the paste at the center or at a reasonable position
        const pasteX = Math.max(0, Math.min(State.width - State.copiedSelection.width, State.width / 2 - State.copiedSelection.width / 2));
        const pasteY = Math.max(0, Math.min(State.height - State.copiedSelection.height, State.height / 2 - State.copiedSelection.height / 2));

        // Create a temporary canvas to position the pasted content
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = State.width;
        tempCanvas.height = State.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill with transparent background
        tempCtx.clearRect(0, 0, State.width, State.height);

        // Draw the copied selection at the paste position
        tempCtx.putImageData(State.copiedSelection, pasteX, pasteY);

        // Get the result and store in the new layer
        newLayer.data = tempCtx.getImageData(0, 0, State.width, State.height);

        // Add the new layer to the frame
        currentFrame.layers.push(newLayer);
        State.activeLayerIndex = currentFrame.layers.length - 1;

        // Update UI
        CanvasManager.render();
        LayerManager.renderList();

        InputHandler.showNotification('Selection pasted to new layer', 'success');
    }
};
