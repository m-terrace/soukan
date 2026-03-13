const ScaleManager = {
    GAME_WIDTH: 1280,
    GAME_HEIGHT: 720,
    containerId: 'game-container',
    scale: 1,
    offsetX: 0,
    offsetY: 0,

    init(containerId = 'game-container') {
        this.containerId = containerId;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const scaleX = windowWidth / this.GAME_WIDTH;
        const scaleY = windowHeight / this.GAME_HEIGHT;

        // Fit inside window (Letterbox/Pillarbox)
        this.scale = Math.min(scaleX, scaleY);

        const newWidth = this.GAME_WIDTH * this.scale;
        const newHeight = this.GAME_HEIGHT * this.scale;

        this.offsetX = (windowWidth - newWidth) / 2;
        this.offsetY = (windowHeight - newHeight) / 2;

        container.style.width = `${this.GAME_WIDTH}px`;
        container.style.height = `${this.GAME_HEIGHT}px`;
        container.style.position = 'absolute';
        
        // Reset top/left to ensure absolute positioning calculations from (0,0)
        container.style.top = '0';
        container.style.left = '0';

        // Apply transform
        container.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        container.style.transformOrigin = '0 0';
    },

    /**
     * Converts screen coordinates (MouseEvent/TouchEvent) to Game Coordinates (1280x720 space).
     * @param {Event} e - DOM Event
     * @returns {Object} { x, y } in game coordinates
     */
    getGamePoint(e) {
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = (clientX - this.offsetX) / this.scale;
        const y = (clientY - this.offsetY) / this.scale;

        return { x, y };
    }
};
