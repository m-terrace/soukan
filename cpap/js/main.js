document.addEventListener('DOMContentLoaded', () => {
    // 画面スケーリングの初期化
    ScaleManager.init();

    const elements = {
        cpapGaugeFill: document.getElementById('cpap-gauge-fill'),
        cpapBagOverlay: document.getElementById('cpap-bag-overlay'),
        spo2Number: document.getElementById('spo2-number'),
        prNumber: document.getElementById('pr-number'),
        clearScreen: document.getElementById('clear-screen'),
        restartBtn: document.getElementById('restart-btn'),
        minigameContainer: document.getElementById('minigame-container')
    };

    let gameState = {
        cpapPressure: 0,
        spo2Value: 90,
        cpapActive: false
    };

    let cpapInterval = null;
    let cpapPressing = false;
    let spo2Timer = 0;

    function initGame() {
        elements.clearScreen.classList.add('hidden');
        elements.minigameContainer.classList.remove('hidden');

        gameState.cpapPressure = 0;
        gameState.spo2Value = 90;
        gameState.cpapActive = true;

        elements.spo2Number.innerText = gameState.spo2Value;
        elements.prNumber.innerText = Math.floor(Math.random() * 11) + 145;
        elements.cpapGaugeFill.style.height = '0%';
        elements.cpapGaugeFill.style.backgroundColor = 'yellow';
        elements.cpapBagOverlay.style.transform = '';

        startCpapLoop();
    }

    function startCpapLoop() {
        const handlePressStart = (e) => {
            if (e.cancelable) e.preventDefault();
            cpapPressing = true;
        };
        const handlePressEnd = () => {
            cpapPressing = false;
        };

        elements.cpapBagOverlay.onmousedown = handlePressStart;
        elements.cpapBagOverlay.onmouseup = handlePressEnd;
        elements.cpapBagOverlay.onmouseleave = handlePressEnd;
        elements.cpapBagOverlay.ontouchstart = handlePressStart;
        elements.cpapBagOverlay.ontouchend = handlePressEnd;

        if (cpapInterval) clearInterval(cpapInterval);

        cpapInterval = setInterval(() => {
            if (!gameState.cpapActive) {
                clearInterval(cpapInterval);
                return;
            }

            if (cpapPressing) {
                gameState.cpapPressure += 0.3;
            } else {
                gameState.cpapPressure -= 0.2;
            }

            gameState.cpapPressure = Math.max(0, Math.min(10, gameState.cpapPressure));

            if (Math.random() < 0.1) {
                elements.prNumber.innerText = Math.floor(Math.random() * 11) + 145;
            }

            const fillHeight = (gameState.cpapPressure / 10) * 100;
            elements.cpapGaugeFill.style.height = `${fillHeight}%`;

            // バッグオーバーレイの squeeze 変形（横に広がり縦に潰れる）
            const p = gameState.cpapPressure / 10;
            const bsx = 1.0 + p * 0.18;
            const bsy = 1.0 - p * 0.15;
            elements.cpapBagOverlay.style.transform = `scaleX(${bsx.toFixed(3)}) scaleY(${bsy.toFixed(3)})`;

            if (gameState.cpapPressure >= 3 && gameState.cpapPressure <= 8) {
                elements.cpapGaugeFill.style.backgroundColor = '#0f0'; // 緑色
                spo2Timer++;

                if (spo2Timer > 30) {
                    spo2Timer = 0;
                    if (gameState.spo2Value < 95) {
                        gameState.spo2Value++;
                        elements.spo2Number.innerText = gameState.spo2Value;
                        if (gameState.spo2Value >= 95) {
                            completeCpap();
                        }
                    }
                }
            } else {
                elements.cpapGaugeFill.style.backgroundColor = 'yellow'; // 警告色
                spo2Timer = 0;
            }
        }, 33);
    }

    function completeCpap() {
        gameState.cpapActive = false;
        clearInterval(cpapInterval);
        cpapInterval = null;

        elements.cpapBagOverlay.onmousedown = null;
        elements.cpapBagOverlay.onmouseup = null;
        elements.cpapBagOverlay.onmouseleave = null;
        elements.cpapBagOverlay.ontouchstart = null;
        elements.cpapBagOverlay.ontouchend = null;

        elements.cpapBagOverlay.style.transform = '';

        elements.minigameContainer.classList.add('hidden');
        elements.clearScreen.classList.remove('hidden');

        setTimeout(() => {
            window.location.href = '../kotei/index.html';
        }, 2000);
    }

    const dialogBox = document.getElementById('dialog-box');
    if (dialogBox) {
        dialogBox.addEventListener('click', () => {
            dialogBox.classList.add('hidden');
        });
    }

    // --- ECGアニメーション ---
    const ecgCanvas = document.getElementById('ecg-canvas');
    const ecgCtx = ecgCanvas.getContext('2d');
    const ECG_W = ecgCanvas.width;
    const ECG_H = ecgCanvas.height;

    const ecgBuffer = new Array(ECG_W).fill(ECG_H / 2);
    let ecgPhase = 0;
    let lastEcgTime = performance.now();

    // PQRST波形の各成分（負値=上方向）
    function ecgAmp(phase) {
        let a = 0;
        a -= 5  * Math.exp(-Math.pow((phase - 0.15) / 0.04,  2)); // P波
        a += 4  * Math.exp(-Math.pow((phase - 0.30) / 0.02,  2)); // Q
        a -= 28 * Math.exp(-Math.pow((phase - 0.35) / 0.012, 2)); // Rピーク
        a += 8  * Math.exp(-Math.pow((phase - 0.41) / 0.015, 2)); // S
        a -= 8  * Math.exp(-Math.pow((phase - 0.65) / 0.07,  2)); // T波
        return a;
    }

    function drawECG(now) {
        const dt = Math.min((now - lastEcgTime) / 1000, 0.05);
        lastEcgTime = now;

        const bpm = parseInt(elements.prNumber.innerText) || 150;
        const beatsPerSec = bpm / 60;
        const BEATS_VISIBLE = 4;
        const pxPerBeat = ECG_W / BEATS_VISIBLE;
        const phasePerPx = 1 / pxPerBeat;
        const newPx = Math.max(1, Math.round(pxPerBeat * beatsPerSec * dt));

        for (let i = 0; i < newPx; i++) {
            ecgPhase = (ecgPhase + phasePerPx) % 1;
            const y = Math.max(2, Math.min(ECG_H - 2, ECG_H / 2 + ecgAmp(ecgPhase)));
            ecgBuffer.shift();
            ecgBuffer.push(y);
        }

        // 背景
        ecgCtx.fillStyle = '#000d00';
        ecgCtx.fillRect(0, 0, ECG_W, ECG_H);

        // グリッド線
        ecgCtx.strokeStyle = 'rgba(0,120,0,0.25)';
        ecgCtx.lineWidth = 0.5;
        for (let x = 0; x < ECG_W; x += 30) {
            ecgCtx.beginPath(); ecgCtx.moveTo(x, 0); ecgCtx.lineTo(x, ECG_H); ecgCtx.stroke();
        }
        for (let y = 0; y <= ECG_H; y += ECG_H / 2) {
            ecgCtx.beginPath(); ecgCtx.moveTo(0, y); ecgCtx.lineTo(ECG_W, y); ecgCtx.stroke();
        }

        // 波形
        ecgCtx.strokeStyle = '#00ff00';
        ecgCtx.lineWidth = 1.5;
        ecgCtx.shadowColor = '#00ff00';
        ecgCtx.shadowBlur = 4;
        ecgCtx.beginPath();
        for (let x = 0; x < ECG_W; x++) {
            x === 0 ? ecgCtx.moveTo(x, ecgBuffer[x]) : ecgCtx.lineTo(x, ecgBuffer[x]);
        }
        ecgCtx.stroke();
        ecgCtx.shadowBlur = 0;

        requestAnimationFrame(drawECG);
    }

    requestAnimationFrame(drawECG);

    initGame();
});
