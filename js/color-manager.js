// color-manager.js
// Manages color palette and history

const ColorManager = {
    /**
     * Add color to recent colors history
     */
    addToHistory(hex) {
        if (!State.recentColors.includes(hex)) {
            State.recentColors.unshift(hex);
            if (State.recentColors.length > 10) {
                State.recentColors.pop();
            }
            this.render();
        }
    },

    /**
     * Set current color
     */
    setColor(hex) {
        State.color = hex;
        UI.colorPicker.value = hex;
        UI.colorHex.textContent = hex;
    },

    /**
     * Render color palette swatches
     */
    render() {
        UI.paletteContainer.innerHTML = '';
        
        State.recentColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'palette-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = color;
            swatch.onclick = () => this.setColor(color);
            
            UI.paletteContainer.appendChild(swatch);
        });
    }
};
