document.addEventListener('DOMContentLoaded', () => {
    ScaleManager.init();

    // ===== 要素マップ =====
    const elements = {
        dialogText:       document.getElementById('dialog-text'),
        dialogName:       document.getElementById('dialog-name'),
        cutinContainer:   document.getElementById('cutin-container'),
        cutinImage:       document.getElementById('cutin-image'),
        minigameContainer: document.getElementById('minigame-container'),
        clearScreen:      document.getElementById('clear-screen'),
        restartBtn:       document.getElementById('restart-btn'),
        headFixBg:        document.getElementById('head-fix-bg'),
        towelArea:        document.getElementById('towel-area'),
        faceArea:         document.getElementById('face-area'),
        arrowDown:        document.getElementById('arrow-down'),
        arrowUp:          document.getElementById('arrow-up'),
        arrowRotate:      document.getElementById('arrow-rotate'),
    };

    let gameState = { phase: 0 };

    // ===== カットイン =====
    function showCutin(imgName, durationMs, callback) {
        elements.cutinImage.style.backgroundImage = `url('assets/img/${imgName}')`;
        elements.cutinContainer.classList.add('active');
        elements.cutinContainer.classList.remove('hidden');
        setTimeout(() => {
            elements.cutinContainer.classList.remove('active');
            setTimeout(() => {
                elements.cutinContainer.classList.add('hidden');
                if (callback) callback();
            }, 400);
        }, durationMs);
    }

    // ===== ダイアログ =====
    function setDialog(text, name) {
        elements.dialogText.textContent = text;
        elements.dialogName.textContent = name || '';
    }

    // ===== ジェスチャー管理 =====
    // 要素に紐付いたハンドラを解除してリセット
    function clearGesture(element) {
        if (element._mouseDownHandler) {
            element.removeEventListener('mousedown',  element._mouseDownHandler);
            element._mouseDownHandler = null;
        }
        if (element._touchStartHandler) {
            element.removeEventListener('touchstart', element._touchStartHandler);
            element._touchStartHandler = null;
        }
        if (element._clickHandler) {
            element.removeEventListener('click', element._clickHandler);
            element._clickHandler = null;
        }
    }

    /**
     * ドラッグジェスチャーを設定する。
     * ドラッグ終了時に (dx, dy) を返す。
     * lastPt を mousemove/touchmove で更新するため touchend でも値が取れる。
     */
    function setupDragGesture(element, onEnd) {
        clearGesture(element);

        let startPt = null;
        let lastPt  = null;

        const onStart = (e) => {
            e.preventDefault();
            startPt = ScaleManager.getGamePoint(e);
            lastPt  = startPt;

            const onMove = (e) => {
                e.preventDefault();
                const pt = ScaleManager.getGamePoint(e);
                if (pt) lastPt = pt;
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('mouseup',   onUp);
                document.removeEventListener('touchend',  onUp);
                if (startPt && lastPt) {
                    onEnd(lastPt.x - startPt.x, lastPt.y - startPt.y);
                }
                startPt = null;
                lastPt  = null;
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('mouseup',   onUp);
            document.addEventListener('touchend',  onUp);
        };

        const onTouchStart = (e) => { e.preventDefault(); onStart(e); };

        element._mouseDownHandler  = onStart;
        element._touchStartHandler = onTouchStart;
        element.addEventListener('mousedown',  onStart);
        element.addEventListener('touchstart', onTouchStart, { passive: false });
    }

    /**
     * タップ（クリック）ジェスチャーを設定する。
     */
    function setupTapGesture(element, callback) {
        clearGesture(element);
        const handler = () => {
            clearGesture(element);
            callback();
        };
        element._clickHandler = handler;
        element.addEventListener('click', handler);
    }

    // ===== 全矢印/エリアを一括非表示 =====
    function hideAllHints() {
        elements.towelArea.classList.add('hidden');
        elements.faceArea.classList.add('hidden');
        elements.arrowDown.classList.add('hidden');
        elements.arrowUp.classList.add('hidden');
        elements.arrowRotate.classList.add('hidden');
        elements.towelArea.classList.remove('golden-highlight', 'yellow-highlight');
    }

    // ===== ゲーム初期化 =====
    function initGame() {
        gameState.phase = 0;
        elements.clearScreen.classList.add('hidden');

        // 最初はウィンドウを隠してイントロセリフを表示
        elements.minigameContainer.classList.add('hidden');
        hideAllHints();

        setDialog("体位を整えます！", "八田");

        // ダイアログクリックでウィンドウ表示 → フェーズ0へ
        const dialogBox = document.getElementById('dialog-box');
        const onIntroClick = () => {
            dialogBox.removeEventListener('click', onIntroClick);
            elements.minigameContainer.classList.remove('hidden');
            elements.headFixBg.style.backgroundImage = "url('assets/img/position1.JPG')";
            showPhase0();
        };
        dialogBox.addEventListener('click', onIntroClick);
    }

    // =====================================================
    // フェーズ 0: position1 → タオルを下にドラッグ
    // =====================================================
    function showPhase0() {
        setDialog("肩枕を外して頭枕に変えないと", "八田");

        // タオルエリアを金色にハイライト
        elements.towelArea.classList.remove('hidden');
        elements.towelArea.classList.add('golden-highlight');

        // 下向き矢印を表示
        elements.arrowDown.classList.remove('hidden');

        // ドラッグ下方向 50px 以上でフェーズ1へ（反応を甘く）
        setupDragGesture(elements.towelArea, (dx, dy) => {
            if (dy > 50) advanceToPhase1();
        });
    }

    // =====================================================
    // フェーズ 1: position2 → タオルをタップ
    // =====================================================
    function advanceToPhase1() {
        gameState.phase = 1;
        elements.headFixBg.style.backgroundImage = "url('assets/img/position2.JPG')";
        elements.arrowDown.classList.add('hidden');
        elements.towelArea.classList.remove('golden-highlight');
        elements.towelArea.classList.add('yellow-highlight');
        setDialog("タオルと低くして・・・", "八田");

        // タップでフェーズ2へ
        setupTapGesture(elements.towelArea, advanceToPhase2);
    }

    // =====================================================
    // フェーズ 2: position3 → タオルを上にスワイプ
    // =====================================================
    function advanceToPhase2() {
        gameState.phase = 2;
        elements.headFixBg.style.backgroundImage = "url('assets/img/position3.JPG')";
        elements.towelArea.classList.remove('yellow-highlight');
        elements.towelArea.classList.add('golden-highlight');

        // 頭に向かう上向き矢印
        elements.arrowUp.classList.remove('hidden');
        setDialog("頭の下にタオルを置こう", "八田");

        // 上方向スワイプ 50px 以上でフェーズ3へ（反応を甘く）
        setupDragGesture(elements.towelArea, (dx, dy) => {
            if (dy < -50) advanceToPhase3();
        });
    }

    // =====================================================
    // フェーズ 3: position3 のまま → 時計回りジェスチャー
    // =====================================================
    function advanceToPhase3() {
        gameState.phase = 3;
        // タオルエリアを隠して顔エリアを表示
        elements.towelArea.classList.add('hidden');
        elements.towelArea.classList.remove('golden-highlight');
        elements.arrowUp.classList.add('hidden');

        elements.faceArea.classList.remove('hidden');
        elements.arrowRotate.classList.remove('hidden');
        setDialog("少し顔を挿管する人の方向に傾けて・・・", "八田");

        // 右方向への弧ジェスチャー（dx > 40px）で完了（反応を甘く）
        setupDragGesture(elements.faceArea, (dx, dy) => {
            if (dx > 40) completeGame();
        });
    }

    // =====================================================
    // 完了: position6 → 0.5 秒後にカットイン + ダイアログ同時表示
    // =====================================================
    function completeGame() {
        hideAllHints();
        elements.headFixBg.style.backgroundImage = "url('assets/img/position6.JPG')";

        setTimeout(() => {
            // カットインとセリフを同時に表示
            showCutin("hatta2.png", 2000, () => {
                elements.minigameContainer.classList.add('hidden');
                elements.clearScreen.classList.remove('hidden');

                setTimeout(() => {
                    window.location.href = '../tenkai/index.html';
                }, 2000);
            });
            setDialog("OKです！", "八田");
        }, 500);
    }

    // ゲーム開始
    initGame();
});
