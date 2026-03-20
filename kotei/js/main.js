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
        tapIcon:          document.getElementById('tap-icon'),
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
        elements.tapIcon.classList.add('hidden');
        elements.towelArea.classList.remove('golden-highlight', 'yellow-highlight', 'towel-phase1', 'towel-phase2');
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
            elements.headFixBg.style.backgroundImage = "url('assets/img/position1.jpg')";
            showPhase0();
        };
        dialogBox.addEventListener('click', onIntroClick);
    }

    // =====================================================
    // フェーズ 0: position1.jpg → タオルを下にドラッグ
    // =====================================================
    function showPhase0() {
        setDialog("肩枕を外して頭枕に変えないと", "八田");

        // タオルエリアを金色にハイライト
        elements.towelArea.classList.remove('hidden');
        elements.towelArea.classList.add('golden-highlight');

        // 下向き矢印を表示
        elements.arrowDown.classList.remove('hidden');

        // ドラッグ下方向 25px 以上でフェーズ1へ
        setupDragGesture(elements.towelArea, (dx, dy) => {
            if (dy > 25) advanceToPhase1();
        });
    }

    // =====================================================
    // フェーズ 1: position2.jpg → タオルをタップ
    //   操作1の結果：手前にタオルが移動した状態
    // =====================================================
    function advanceToPhase1() {
        gameState.phase = 1;
        elements.headFixBg.style.backgroundImage = "url('assets/img/position2.jpg')";
        elements.arrowDown.classList.add('hidden');
        elements.towelArea.classList.remove('golden-highlight');
        elements.towelArea.classList.add('towel-phase1', 'yellow-highlight');
        elements.tapIcon.classList.remove('hidden');
        setDialog("タオルを平たく折りたたんで・・・", "八田");

        // タップでフェーズ2へ
        setupTapGesture(elements.towelArea, advanceToPhase2);
    }

    // =====================================================
    // フェーズ 2: position3.jpg → タオルを上方向にドラッグ
    //   操作2の結果：タオルが平たく折りたたまれた状態
    // =====================================================
    function advanceToPhase2() {
        gameState.phase = 2;
        elements.tapIcon.classList.add('hidden');
        elements.headFixBg.style.backgroundImage = "url('assets/img/position3.jpg')";
        elements.towelArea.classList.remove('yellow-highlight', 'towel-phase1');
        elements.towelArea.classList.add('towel-phase2', 'golden-highlight');

        // 右上45度矢印を表示
        elements.arrowUp.classList.remove('hidden');
        setDialog("頭の下にタオルを置こう", "八田");

        // 上方向ドラッグ（上: dy < -20）でフェーズ3へ
        setupDragGesture(elements.towelArea, (dx, dy) => {
            if (dy < -20) advanceToPhase3();
        });
    }

    // =====================================================
    // フェーズ 3: position4.jpg → ダイアログクリックでフェーズ4へ
    //   操作3の結果：平たいタオルが頭の下に敷いてある状態
    // =====================================================
    function advanceToPhase3() {
        gameState.phase = 3;
        hideAllHints();
        elements.headFixBg.style.backgroundImage = "url('assets/img/position4.jpg')";
        setDialog("上手にタオルが置けました！頭を固定します", "八田");

        // ダイアログクリックでフェーズ4へ
        const dialogBox = document.getElementById('dialog-box');
        const onPhase3Click = () => {
            dialogBox.removeEventListener('click', onPhase3Click);
            advanceToPhase4();
        };
        dialogBox.addEventListener('click', onPhase3Click);
    }

    // =====================================================
    // フェーズ 4: position5.jpg → 時計回りスワイプで完了
    //   八田さんが頭を固定した状態 → 顎を上げる操作
    // =====================================================
    function advanceToPhase4() {
        gameState.phase = 4;
        elements.headFixBg.style.backgroundImage = "url('assets/img/position5.jpg')";

        // 顔エリアと時計回り矢印を表示
        elements.faceArea.classList.remove('hidden');
        elements.arrowRotate.classList.remove('hidden');
        setDialog("少し顎を挿管する人の方向に傾けて・・・", "八田");

        // 時計回り弧ジェスチャー（dx > 20px）で完了
        setupDragGesture(elements.faceArea, (dx, dy) => {
            if (dx > 20) completeGame();
        });
    }

    // =====================================================
    // 完了: position6.jpg → 画像読み込み完了後にカットイン + ダイアログ表示
    //   操作4の結果：赤ちゃんの顎が少し上がった状態
    // =====================================================
    function completeGame() {
        hideAllHints();

        const showResult = () => {
            elements.headFixBg.style.backgroundImage = "url('assets/img/position6.jpg')";
            // 画像が表示されてからカットイン＋セリフを出す
            setTimeout(() => {
                showCutin("hatta2.png", 2000, () => {
                    elements.minigameContainer.classList.add('hidden');
                    elements.clearScreen.classList.remove('hidden');

                    setTimeout(() => {
                        window.location.href = '../tenkai/index.html';
                    }, 2000);
                });
                setDialog("OKです！", "八田");
            }, 700);
        };

        // 画像を先にプリロードして読み込み完了後に表示
        const img = new Image();
        img.onload  = showResult;
        img.onerror = showResult; // 読み込み失敗でも進める
        img.src = 'assets/img/position6.jpg';
    }

    // ゲーム開始
    initGame();
});
