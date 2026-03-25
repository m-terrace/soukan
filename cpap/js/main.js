document.addEventListener('DOMContentLoaded', () => {
    // 画面スケーリングの初期化
    ScaleManager.init();

    const elements = {
        cpapGaugeFill:    document.getElementById('cpap-gauge-fill'),
        cpapBagOverlay:   document.getElementById('cpap-bag-overlay'),
        spo2Number:       document.getElementById('spo2-number'),
        prNumber:         document.getElementById('pr-number'),
        clearScreen:      document.getElementById('clear-screen'),
        restartBtn:       document.getElementById('restart-btn'),
        minigameContainer: document.getElementById('minigame-container'),
        touchHint:        document.getElementById('touch-hint'),
        gaugeHint:        document.getElementById('gauge-hint'),
        dialogBox:        document.getElementById('dialog-box'),
        dialogName:       document.getElementById('dialog-name'),
        dialogText:       document.getElementById('dialog-text'),
        activeCharacter:  document.getElementById('active-character'),
    };

    let gameState = {
        cpapPressure: 0,
        spo2Value:    90,
        cpapActive:   false
    };

    let cpapInterval   = null;
    let cpapPressing   = false;
    let spo2Timer      = 0;
    let spo2DownTimer  = 0;
    let firstTouchDone = false;

    const sfxText        = new Audio('../shared/assets/text.mp3');
    const sfxMonitor     = new Audio('assets/monitor.mp3');
    const sfxMonitorDown = new Audio('assets/monitor_down.mp3');
    const sfxBag         = new Audio('assets/bag.mp3');

    // ===== ダイアログ =====
    let _dialogClickHandler = null;
    let _dialogShownAt      = 0;

    function showDialog(text, name, callback) {
        if (_dialogClickHandler) {
            document.removeEventListener('click', _dialogClickHandler);
            _dialogClickHandler = null;
        }

        elements.dialogName.textContent = name || '';
        elements.dialogText.textContent = text;

        if (name) {
            elements.activeCharacter.classList.remove('hidden');
            elements.dialogBox.classList.remove('narration');
        } else {
            elements.activeCharacter.classList.add('hidden');
            elements.dialogBox.classList.add('narration');
        }

        sfxText.currentTime = 0;
        sfxText.play();
        elements.dialogBox.classList.remove('hidden');
        _dialogShownAt = Date.now();

        _dialogClickHandler = () => {
            if (Date.now() - _dialogShownAt < 150) return;
            document.removeEventListener('click', _dialogClickHandler);
            _dialogClickHandler = null;
            elements.dialogBox.classList.add('hidden');
            if (callback) callback();
        };
        document.addEventListener('click', _dialogClickHandler);
    }

    // ===== ゲーム初期化 =====
    function initGame() {
        elements.clearScreen.classList.add('hidden');
        elements.minigameContainer.classList.add('hidden');
        elements.touchHint.classList.add('hidden');
        elements.gaugeHint.classList.add('hidden');

        gameState.cpapPressure = 0;
        gameState.spo2Value    = 90;
        gameState.cpapActive   = false;
        spo2Timer      = 0;
        spo2DownTimer  = 0;
        firstTouchDone = false;

        elements.spo2Number.innerText = gameState.spo2Value;
        elements.prNumber.innerText   = Math.floor(Math.random() * 11) + 145;
        elements.cpapGaugeFill.style.height          = '0%';
        elements.cpapGaugeFill.style.backgroundColor = 'yellow';
        elements.cpapBagOverlay.style.transform      = '';
        elements.activeCharacter.classList.remove('hidden');

        // イントロダイアログ
        showDialog("まずはCPAPで肺をしっかり広げておこう", "糸島", () => {
            showDialog("CPAP（Continuous Positive Airway Pressure：持続陽圧呼吸療法）を行いましょう　バッグを押して、一定の圧をかけ続けてください", null, () => {
                startCpapGame();
            });
        });
    }

    function startCpapGame() {
        elements.activeCharacter.classList.remove('hidden');
        elements.minigameContainer.classList.remove('hidden');
        gameState.cpapActive = true;
        firstTouchDone = false;

        // バッグを2回金色に光らせて操作を促す
        elements.cpapBagOverlay.classList.add('bag-hint');
        setTimeout(() => elements.cpapBagOverlay.classList.remove('bag-hint'), 2000);

        elements.touchHint.classList.remove('hidden');
        elements.gaugeHint.classList.add('hidden');

        startCpapLoop();
    }

    function startCpapLoop() {
        const handlePressStart = (e) => {
            if (e.cancelable) e.preventDefault();
            cpapPressing = true;
            sfxBag.currentTime = 0;
            sfxBag.play();
            // 初回タッチ時: ヒントを切り替えてダイアログ表示（ゲームは継続）
            if (!firstTouchDone) {
                firstTouchDone = true;
                elements.touchHint.classList.add('hidden');
                elements.gaugeHint.classList.remove('hidden');
                showDialog("酸素飽和度が95％になったら挿管するか", "糸島", null);
            }
        };
        const handlePressEnd = () => {
            cpapPressing = false;
        };

        elements.cpapBagOverlay.onmousedown  = handlePressStart;
        elements.cpapBagOverlay.onmouseup    = handlePressEnd;
        elements.cpapBagOverlay.onmouseleave = handlePressEnd;
        elements.cpapBagOverlay.ontouchstart = handlePressStart;
        elements.cpapBagOverlay.ontouchend   = handlePressEnd;

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

            // バッグオーバーレイの squeeze 変形
            const p   = gameState.cpapPressure / 10;
            const bsx = 1.0 + p * 0.18;
            const bsy = 1.0 - p * 0.15;
            elements.cpapBagOverlay.style.transform = `scaleX(${bsx.toFixed(3)}) scaleY(${bsy.toFixed(3)})`;

            if (gameState.cpapPressure >= 3 && gameState.cpapPressure <= 8) {
                elements.cpapGaugeFill.style.backgroundColor = '#0f0';
                spo2DownTimer = 0;
                spo2Timer++;

                if (spo2Timer > 30) {
                    spo2Timer = 0;
                    if (gameState.spo2Value < 95) {
                        gameState.spo2Value++;
                        elements.spo2Number.innerText = gameState.spo2Value;
                        sfxMonitor.currentTime = 0;
                        sfxMonitor.play();
                        if (gameState.spo2Value >= 91) {
                            elements.gaugeHint.classList.add('hidden');
                        }
                        if (gameState.spo2Value >= 95) {
                            completeCpap();
                        }
                    }
                }
            } else {
                elements.cpapGaugeFill.style.backgroundColor = 'yellow';
                spo2Timer = 0;
                spo2DownTimer++;

                if (spo2DownTimer > 60) {
                    spo2DownTimer = 0;
                    if (gameState.spo2Value > 89) {
                        gameState.spo2Value--;
                        elements.spo2Number.innerText = gameState.spo2Value;
                        sfxMonitorDown.currentTime = 0;
                        sfxMonitorDown.play();
                    }
                }
            }
        }, 33);
    }

    function completeCpap() {
        gameState.cpapActive = false;
        clearInterval(cpapInterval);
        cpapInterval = null;

        elements.cpapBagOverlay.onmousedown  = null;
        elements.cpapBagOverlay.onmouseup    = null;
        elements.cpapBagOverlay.onmouseleave = null;
        elements.cpapBagOverlay.ontouchstart = null;
        elements.cpapBagOverlay.ontouchend   = null;

        elements.cpapBagOverlay.style.transform = '';
        elements.touchHint.classList.add('hidden');
        elements.gaugeHint.classList.add('hidden');
        elements.activeCharacter.classList.remove('hidden');

        showDialog("OK、じゃあ挿管するよ。八田さん体位を整えて", "糸島", () => {
            elements.minigameContainer.classList.add('hidden');
            elements.clearScreen.classList.remove('hidden');
            setTimeout(() => {
                window.location.href = '../kotei/index.html';
            }, 500);
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
