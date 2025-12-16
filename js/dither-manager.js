// dither-manager.js
// Handles all dither tool operations and settings

const DitherManager = {
    
    /**
     * Initialize dither manager
     */
    init() {
        // Initialize state if not present
        if (State.ditherDensity === undefined) {
            State.ditherDensity = 5;
        }
        if (State.ditherColor1 === undefined) {
            State.ditherColor1 = '#00ff41';
        }
        if (State.ditherColor2 === undefined) {
            State.ditherColor2 = '#ffffff';
        }
        if (State.ditherOpacity1 === undefined) {
            State.ditherOpacity1 = 100;
        }
        if (State.ditherOpacity2 === undefined) {
            State.ditherOpacity2 = 100;
        }
        if (State.ditherPattern === undefined) {
            State.ditherPattern = 'checkerboard';
        }
        if (State.ditherMode === undefined) {
            State.ditherMode = 'draw';
        }
        if (State.ditherBrushSize === undefined) {
            State.ditherBrushSize = 1;
        }
    },

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
     * Plot a pixel or brush stroke with dither pattern
     */
    plot(x, y, colorStr, context, isEraser = false, isWrapperCall = false) {
        const size = State.tool === 'dither' ? State.ditherBrushSize : State.brushSize;

        // Dither pattern check with customizable density and colors
        if (State.tool === 'dither') {
            const density = State.ditherDensity || 5;
            const patternSize = 11 - density; // Convert density 1-10 to pattern size 10-1
            const pattern = State.ditherPattern || 'checkerboard';

            // Use the dither pattern based on the selected pattern type
            let shouldDraw = false;
            switch (pattern) {
                case 'checkerboard':
                    // Proper checkerboard: alternating pixels in a 2x2 grid, scaled by density
                    const checkerSize = Math.max(2, 11 - density);
                    shouldDraw = Math.floor(x / (checkerSize / 2)) % 2 === Math.floor(y / (checkerSize / 2)) % 2;
                    break;
                case 'diagonal':
                    shouldDraw = (Math.floor(x) + Math.floor(y)) % patternSize === 0;
                    break;
                case 'horizontal':
                    shouldDraw = Math.floor(y) % patternSize === 0;
                    break;
                case 'vertical':
                    shouldDraw = Math.floor(x) % patternSize === 0;
                    break;
                case 'random':
                    shouldDraw = Math.random() < 0.5;
                    break;
                default:
                    shouldDraw = (Math.floor(x) + Math.floor(y)) % patternSize === 0;
            }

            if (!shouldDraw) return;
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
            if (State.tool === 'dither') {
                // Dither tool with brush size and blur support
                const centerX = Math.floor(x);
                const centerY = Math.floor(y);
                const radius = Math.floor(size / 2);

                // Use dither colors with opacity
                const color1 = State.ditherColor1 || '#00ff41';
                const color2 = State.ditherColor2 || '#ffffff';
                const opacity1 = (State.ditherOpacity1 || 100) / 100;
                const opacity2 = (State.ditherOpacity2 || 100) / 100;
                const pattern = State.ditherPattern || 'checkerboard';

                // Ensure proper transparency handling
                context.globalCompositeOperation = 'source-over';

                if (State.brushBlur > 0) {
                    // Apply blur effect for soft dither edges
                    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + State.brushBlur);
                    
                    // Determine colors for gradient based on dither pattern at each point
                    const colorAtPoint = (px, py) => {
                        let useColor1 = false;
                        const patternSize = 11 - (State.ditherDensity || 5);
                         
                        switch (pattern) {
                            case 'checkerboard':
                                const checkerSize = Math.max(2, 11 - (State.ditherDensity || 5));
                                useColor1 = Math.floor(px / (checkerSize / 2)) % 2 === Math.floor(py / (checkerSize / 2)) % 2;
                                break;
                            case 'diagonal':
                                useColor1 = (Math.floor(px) + Math.floor(py)) % (patternSize * 2) < patternSize;
                                break;
                            case 'horizontal':
                                useColor1 = Math.floor(py) % patternSize === 0;
                                break;
                            case 'vertical':
                                useColor1 = Math.floor(px) % patternSize === 0;
                                break;
                            case 'random':
                                useColor1 = Math.random() < 0.5;
                                break;
                            default:
                                useColor1 = (Math.floor(px) + Math.floor(py)) % (patternSize * 2) < patternSize;
                        }
                         
                        const color = useColor1 ? color1 : color2;
                        const opacity = useColor1 ? opacity1 : opacity2;
                        return this.hexToRgba(color, opacity);
                    };
                     
                    // Create gradient with dither colors
                    const centerColor = colorAtPoint(centerX, centerY);
                    gradient.addColorStop(0, centerColor);
                    gradient.addColorStop(1, 'rgba(0,0,0,0)');
                     
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(centerX, centerY, radius + State.brushBlur, 0, 2 * Math.PI);
                    context.fill();
                } else {
                    // Standard dither tool without blur - use square brush area
                    const offset = Math.floor(size / 2);
                    for (let dy = -offset; dy < size - offset; dy++) {
                        for (let dx = -offset; dx < size - offset; dx++) {
                            const px = centerX + dx;
                            const py = centerY + dy;
                             
                            let useColor1 = false;
                            const patternSize = 11 - (State.ditherDensity || 5);
                             
                            switch (pattern) {
                                case 'checkerboard':
                                    const checkerSize = Math.max(2, 11 - (State.ditherDensity || 5));
                                    useColor1 = Math.floor(px / (checkerSize / 2)) % 2 === Math.floor(py / (checkerSize / 2)) % 2;
                                    break;
                                case 'diagonal':
                                    useColor1 = (Math.floor(px) + Math.floor(py)) % (patternSize * 2) < patternSize;
                                    break;
                                case 'horizontal':
                                    useColor1 = Math.floor(py) % patternSize === 0;
                                    break;
                                case 'vertical':
                                    useColor1 = Math.floor(px) % patternSize === 0;
                                    break;
                                case 'random':
                                    useColor1 = Math.random() < 0.5;
                                    break;
                                default:
                                    useColor1 = (Math.floor(px) + Math.floor(py)) % (patternSize * 2) < patternSize;
                            }
                             
                            const color = useColor1 ? color1 : color2;
                            const opacity = useColor1 ? opacity1 : opacity2;
                            context.fillStyle = this.hexToRgba(color, opacity);
                            context.fillRect(px, py, 1, 1);
                        }
                    }
                }
            } else {
                // Non-dither tools
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
        }
    },

    /**
     * Dither flood fill - applies dither pattern to filled areas
     */
    ditherFloodFill(x, y) {
        const layer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];
        const data = layer.data;

        const startPos = (y * State.width + x) * 4;
        const sr = data.data[startPos];
        const sg = data.data[startPos + 1];
        const sb = data.data[startPos + 2];
        const sa = data.data[startPos + 3];

        // Don't fill if already transparent (nothing to fill)
        if (sa === 0) return;

        // Use a more efficient scanline algorithm instead of stack-based
        const width = State.width;
        const height = State.height;
        const pixels = data.data;
        const visited = new Uint8Array(width * height);

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

        // Scanline flood fill algorithm with dither pattern
        const stack = [];
        stack.push({x, y});

        // Get dither settings
        const density = State.ditherDensity || 5;
        const pattern = State.ditherPattern || 'checkerboard';
        const color1 = State.ditherColor1 || '#00ff41';
        const color2 = State.ditherColor2 || '#ffffff';
        const opacity1 = (State.ditherOpacity1 || 100) / 100;
        const opacity2 = (State.ditherOpacity2 || 100) / 100;

        // Parse dither colors with proper opacity handling
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        const a1 = Math.floor(opacity1 * 255);

        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        const a2 = Math.floor(opacity2 * 255);

        // Ensure transparency is handled correctly
        layerCtx.globalCompositeOperation = 'source-over';

        while (stack.length) {
            const {x: cx, y: cy} = stack.pop();
            const idx = toIndex(cx, cy);

            // Skip if already processed
            if (visited[idx]) continue;
            visited[idx] = 1;

            // Skip if doesn't match target color
            if (!matchColor(cx, cy)) continue;

            // Apply dither pattern to current pixel
            const pixelIdx = idx * 4;
            
            // Determine which dither color to use based on pattern
            let useColor1 = false;
            const patternSize = 11 - density;
            
            switch (pattern) {
                case 'checkerboard':
                    const checkerSize = Math.max(2, 11 - density);
                    useColor1 = Math.floor(cx / (checkerSize / 2)) % 2 === Math.floor(cy / (checkerSize / 2)) % 2;
                    break;
                case 'diagonal':
                    useColor1 = (Math.floor(cx) + Math.floor(cy)) % patternSize === 0;
                    break;
                case 'horizontal':
                    useColor1 = Math.floor(cy) % patternSize === 0;
                    break;
                case 'vertical':
                    useColor1 = Math.floor(cx) % patternSize === 0;
                    break;
                case 'random':
                    useColor1 = Math.random() < 0.5;
                    break;
                default:
                    useColor1 = (Math.floor(cx) + Math.floor(cy)) % patternSize === 0;
            }

            // Apply the selected dither color
            if (useColor1) {
                pixels[pixelIdx] = r1;
                pixels[pixelIdx + 1] = g1;
                pixels[pixelIdx + 2] = b1;
                pixels[pixelIdx + 3] = a1;
            } else {
                pixels[pixelIdx] = r2;
                pixels[pixelIdx + 1] = g2;
                pixels[pixelIdx + 2] = b2;
                pixels[pixelIdx + 3] = a2;
            }

            // Scan left
            let x1 = cx - 1;
            while (x1 >= 0 && matchColor(x1, cy)) {
                const leftIdx = toIndex(x1, cy);
                if (!visited[leftIdx]) {
                    visited[leftIdx] = 1;
                    const leftPixelIdx = leftIdx * 4;
                    
                    // Apply dither pattern to left pixel
                    let leftUseColor1 = false;
                    switch (pattern) {
                        case 'checkerboard':
                            const checkerSize = Math.max(2, 11 - density);
                            leftUseColor1 = Math.floor(x1 / (checkerSize / 2)) % 2 === Math.floor(cy / (checkerSize / 2)) % 2;
                            break;
                        case 'diagonal':
                            leftUseColor1 = (Math.floor(x1) + Math.floor(cy)) % patternSize === 0;
                            break;
                        case 'horizontal':
                            leftUseColor1 = Math.floor(cy) % patternSize === 0;
                            break;
                        case 'vertical':
                            leftUseColor1 = Math.floor(x1) % patternSize === 0;
                            break;
                        case 'random':
                            leftUseColor1 = Math.random() < 0.5;
                            break;
                        default:
                            leftUseColor1 = (Math.floor(x1) + Math.floor(cy)) % patternSize === 0;
                    }
                    
                    if (leftUseColor1) {
                        pixels[leftPixelIdx] = r1;
                        pixels[leftPixelIdx + 1] = g1;
                        pixels[leftPixelIdx + 2] = b1;
                        pixels[leftPixelIdx + 3] = a1;
                    } else {
                        pixels[leftPixelIdx] = r2;
                        pixels[leftPixelIdx + 1] = g2;
                        pixels[leftPixelIdx + 2] = b2;
                        pixels[leftPixelIdx + 3] = a2;
                    }
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
                    
                    // Apply dither pattern to right pixel
                    let rightUseColor1 = false;
                    switch (pattern) {
                        case 'checkerboard':
                            const checkerSize = Math.max(2, 11 - density);
                            rightUseColor1 = Math.floor(x2 / (checkerSize / 2)) % 2 === Math.floor(cy / (checkerSize / 2)) % 2;
                            break;
                        case 'diagonal':
                            rightUseColor1 = (Math.floor(x2) + Math.floor(cy)) % patternSize === 0;
                            break;
                        case 'horizontal':
                            rightUseColor1 = Math.floor(cy) % patternSize === 0;
                            break;
                        case 'vertical':
                            rightUseColor1 = Math.floor(x2) % patternSize === 0;
                            break;
                        case 'random':
                            rightUseColor1 = Math.random() < 0.5;
                            break;
                        default:
                            rightUseColor1 = (Math.floor(x2) + Math.floor(cy)) % patternSize === 0;
                    }
                    
                    if (rightUseColor1) {
                        pixels[rightPixelIdx] = r1;
                        pixels[rightPixelIdx + 1] = g1;
                        pixels[rightPixelIdx + 2] = b1;
                        pixels[rightPixelIdx + 3] = a1;
                    } else {
                        pixels[rightPixelIdx] = r2;
                        pixels[rightPixelIdx + 1] = g2;
                        pixels[rightPixelIdx + 2] = b2;
                        pixels[rightPixelIdx + 3] = a2;
                    }
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
     * Start dither operation based on current mode
     */
    start(x, y) {
        State.isDrawing = true;
        State.dragStart = { x, y };

        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];
        layerCtx.putImageData(layer.data, 0, 0);

        const rgba = this.hexToRgba(State.color, State.opacity);

        // Handle dither tool based on mode
        if (State.ditherMode === 'fill') {
            console.log('Dither fill tool activated at:', x, y);
            this.ditherFloodFill(x, y);
            State.isDrawing = false; // Fill tool completes immediately
            console.log('Dither fill tool completed');
            return; // Don't continue with normal drawing flow
        } else {
            // Draw mode - use standard plot method
            this.plot(x, y, rgba, layerCtx, false);
            CanvasManager.render(); // Instant update for small tools
        }
    },

    /**
     * Continue dither drawing operation (for draw mode)
     */
    move(x, y) {
        if (!State.isDrawing || State.ditherMode === 'fill') return;

        const currentLayer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];
        if (!currentLayer.visible) return;

        const rgba = this.hexToRgba(State.color, State.opacity);

        // Draw line with dither pattern
        this.drawLine(State.dragStart.x, State.dragStart.y, x, y, rgba, layerCtx, false);
        State.dragStart = { x, y };
        this.updateLayerFromCtx();
    },

    /**
     * End dither operation
     */
    end(x, y) {
        if (!State.isDrawing) return;
        State.isDrawing = false;

        if (State.ditherMode === 'draw') {
            const rgba = this.hexToRgba(State.color, State.opacity);
            this.drawLine(State.dragStart.x, State.dragStart.y, x, y, rgba, layerCtx, false);
            this.updateLayerFromCtx();
        }
    },

    /**
     * Draw a line using Bresenham's algorithm (for dither draw mode)
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
     * Update the dither pattern preview
     */
    updateDitherPreview() {
        const previewCanvas = document.getElementById('ditherPreviewCanvas');
        if (!previewCanvas) return;

        const ctx = previewCanvas.getContext('2d');
        const size = 64;
        const density = State.ditherDensity || 5;
        const pattern = State.ditherPattern || 'checkerboard';

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Parse colors with opacity
        const color1 = this.parseColorWithOpacity(State.ditherColor1, State.ditherOpacity1);
        const color2 = this.parseColorWithOpacity(State.ditherColor2, State.ditherOpacity2);

        // Draw dither pattern based on the selected pattern type
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let useColor1 = false;
                
                switch (pattern) {
                    case 'checkerboard':
                        // Proper checkerboard: alternating pixels in a 2x2 grid, scaled by density
                        const checkerSize = Math.max(2, 11 - density);
                        useColor1 = Math.floor(x / (checkerSize / 2)) % 2 === Math.floor(y / (checkerSize / 2)) % 2;
                        break;
                    case 'diagonal':
                        useColor1 = (x + y) % (11 - density) === 0;
                        break;
                    case 'horizontal':
                        useColor1 = y % (11 - density) === 0;
                        break;
                    case 'vertical':
                        useColor1 = x % (11 - density) === 0;
                        break;
                    case 'random':
                        useColor1 = Math.random() < 0.5;
                        break;
                    default:
                        useColor1 = (x + y) % (11 - density) === 0;
                }
                
                ctx.fillStyle = useColor1 ? color1 : color2;
                ctx.fillRect(x, y, 1, 1);
            }
        }
    },

    /**
     * Parse color with opacity
     */
    parseColorWithOpacity(hexColor, opacity) {
        // Remove # if present
        const hex = hexColor.replace('#', '');

        // Parse RGB components
        let r, g, b;
        if (hex.length === 3) {
            // Shorthand hex (e.g., #abc)
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            // Full hex (e.g., #aabbcc)
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else {
            // Default to white if invalid
            return 'rgba(255, 255, 255, 1)';
        }

        // Apply opacity
        const alpha = opacity / 100;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
};

// Initialize the dither manager when the script loads
DitherManager.init();

// Make DitherManager available globally
window.DitherManager = DitherManager;