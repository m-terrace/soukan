document.addEventListener('DOMContentLoaded', () => {
    ScaleManager.init();

    const elements = {
        dialogBox: document.getElementById('dialog-box'),
        dialogText: document.getElementById('dialog-text'),
        dialogNextIndicator: document.getElementById('dialog-next-indicator'),
        cutinContainer: document.getElementById('cutin-container'),
        cutinImage: document.getElementById('cutin-image'),
        toolSelection: document.getElementById('tool-selection'),
        minigameContainer: document.getElementById('minigame-container'),
        scopeContent: document.getElementById('scope-content'),
        hintPanel: document.getElementById('hint-panel'),
        hintText: document.getElementById('hint-text'),
        clearScreen: document.getElementById('clear-screen'),
        restartBtn: document.getElementById('restart-btn'),
        toolBtns: document.querySelectorAll('.tool-btn'),
        activeCharacter: document.getElementById('active-character'),
        bgImage: document.getElementById('bg-image'),
        navControls: document.getElementById('nav-controls'),
        navBtns: document.querySelectorAll('.nav-btn[data-dir]'),
        depthBtn: document.getElementById('depth-btn'),
        window1Bg: document.getElementById('window1-bg'),
        dialogName: document.getElementById('dialog-name'),
        scopeLens: document.getElementById('scope-lens'),
        tubeInsertionGame: document.getElementById('tube-insertion-game'),
        dragTube: document.getElementById('drag-tube'),
        tubeTargetIndicator: document.getElementById('tube-target-indicator'),
    };

    let gameState = {
        step: 0,
        dialogActive: false,
        dialogQueue: [],
        currentDialogCallback: null,
        awaitingSelection: null,
        scopeNav: { depth: 'closer', vertical: 'middle', horizontal: 'middle' },
        deepUpperTriggered: false,
        navDisabled: false,
        tubeInserted: false,
        tubeTargetX: 0,
        tubeTargetY: 0,
    };

    // -- キャラクター表示 --
    const characterNames = { 'takei': '武居', 'itoshima': '糸島' };

    function showCharacter(name) {
        if (!name) {
            elements.activeCharacter.classList.add('hidden');
            elements.dialogName.textContent = '';
            return;
        }
        elements.activeCharacter.className = `standing-character char-${name}`;
        elements.dialogName.textContent = characterNames[name] || '';
    }

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

    function showCutinPersistent(imgName) {
        elements.cutinImage.style.backgroundImage = `url('assets/img/${imgName}')`;
        elements.cutinContainer.classList.remove('hidden');
        elements.cutinContainer.classList.add('active');
    }

    // -- ダイアログ管理 --
    function queueDialog(text, cutinImg = null, requireClick = true, callback = null) {
        gameState.dialogQueue.push({ text, cutinImg, requireClick, callback });
        if (!gameState.dialogActive) {
            playNextDialog();
        }
    }

    function playNextDialog() {
        if (gameState.dialogQueue.length === 0) {
            hideDialog();
            return;
        }

        gameState.dialogActive = true;
        const currentDialog = gameState.dialogQueue.shift();

        elements.dialogBox.classList.remove('hidden');
        elements.dialogText.textContent = currentDialog.text;

        if (currentDialog.cutinImg) {
            elements.cutinImage.style.backgroundImage = `url('assets/img/${currentDialog.cutinImg}')`;
            elements.cutinContainer.classList.add('active');
            elements.cutinContainer.classList.remove('hidden');
        }

        gameState.currentDialogCallback = currentDialog.callback;

        if (currentDialog.requireClick) {
            elements.dialogNextIndicator.classList.remove('hidden');
        } else {
            elements.dialogNextIndicator.classList.add('hidden');
            if (currentDialog.callback) {
                currentDialog.callback();
                gameState.currentDialogCallback = null;
            }
            if (gameState.dialogQueue.length === 0) {
                if (!gameState.awaitingSelection) hideDialog();
            } else {
                setTimeout(advanceDialog, 2000);
            }
        }
    }

    function advanceDialog() {
        if (!gameState.dialogActive) return;
        gameState.dialogActive = false;

        if (gameState.currentDialogCallback) {
            const cb = gameState.currentDialogCallback;
            gameState.currentDialogCallback = null;
            cb();
        }

        if (!gameState.dialogActive) {
            if (gameState.dialogQueue.length > 0) {
                playNextDialog();
            } else {
                hideDialog();
            }
        }
    }

    function hideDialog() {
        elements.dialogBox.classList.add('hidden');
        elements.dialogNextIndicator.classList.add('hidden');
        hideCutin();
        gameState.dialogActive = false;
        elements.dialogText.textContent = '';
    }

    function hideCutin() {
        elements.cutinContainer.classList.remove('active');
        setTimeout(() => {
            if (!elements.cutinContainer.classList.contains('active')) {
                elements.cutinContainer.classList.add('hidden');
            }
        }, 400);
    }

    function updateHint(message) {
        if (message) {
            elements.hintPanel.classList.remove('hidden');
            elements.hintText.textContent = message;
        } else {
            elements.hintPanel.classList.add('hidden');
        }
    }

    function showToolSelection(correctToolId) {
        gameState.awaitingSelection = correctToolId;
        elements.toolSelection.classList.remove('hidden');
        elements.toolSelection.style.display = 'block';
        elements.toolBtns.forEach(btn => btn.classList.remove('wrong-choice'));
    }

    function handleSelection(e) {
        if (!gameState.awaitingSelection) return;

        const selectedTool = e.target.dataset.tool;
        if (selectedTool === gameState.awaitingSelection) {
            e.target.classList.add('correct');

            setTimeout(() => {
                elements.toolSelection.classList.add('hidden');
                elements.toolSelection.style.display = '';
                e.target.classList.remove('correct');

                let selectedId = gameState.awaitingSelection;
                gameState.awaitingSelection = null;
                hideDialog();

                if (selectedId === 'suction') {
                    proceedAfterSuction();
                } else if (selectedId === 'tracheal') {
                    proceedToStep6();
                } else if (selectedId === 'bag') {
                    proceedToStep8();
                }
            }, 300);
        } else {
            e.target.classList.add('wrong-choice');
            setTimeout(() => e.target.classList.remove('wrong-choice'), 400);
        }
    }

    // -- 口腔内ナビゲーション --
    function getScopeImagePath(nav) {
        const { depth, vertical, horizontal } = nav;
        if (depth === 'closer') {
            if (vertical === 'upper') return 'assets/img/oral cavity/closer_upper.jpg';
            if (vertical === 'lower') return 'assets/img/oral cavity/closer_lower.jpg';
            if (horizontal === 'left')  return 'assets/img/oral cavity/closer_left.jpg';
            if (horizontal === 'right') return 'assets/img/oral cavity/closer_right.jpg';
            return 'assets/img/oral cavity/face2.jpg';
        } else {
            if (vertical === 'upper') return 'assets/img/oral cavity/deep_upper2.jpg';
            if (vertical === 'lower') return 'assets/img/oral cavity/deep_lower.jpg';
            if (horizontal === 'left')  return 'assets/img/oral cavity/deep_left.jpg';
            if (horizontal === 'right') return 'assets/img/oral cavity/deel_right.jpg';
            return 'assets/img/oral cavity/deep_middle.png';
        }
    }

    function updateScopeImage() {
        const path = getScopeImagePath(gameState.scopeNav);
        const encoded = path.replace(/ /g, '%20');
        elements.scopeContent.style.backgroundImage = `url('${encoded}')`;
    }

    // 中央ボタンのラベルを depth に合わせて更新
    function updateDepthBtn() {
        if (!elements.depthBtn) return;
        const isDeep = gameState.scopeNav.depth === 'deep';
        elements.depthBtn.innerHTML = isDeep
            ? '<span>手前へ</span>'
            : '<span>奥へ</span>';
    }

    // 中央ボタン: closer ↔ deep を切り替え
    function handleDepthBtn() {
        if (gameState.step !== 3 || gameState.navDisabled) return;
        const nav = gameState.scopeNav;
        if (nav.depth === 'closer') {
            nav.depth = 'deep';
        } else {
            nav.depth = 'closer';
        }
        nav.vertical = 'middle';
        nav.horizontal = 'middle';
        updateScopeImage();
        updateDepthBtn();
        checkDeepUpperTrigger();
    }

    function setScopeImageDirect(path) {
        const encoded = path.replace(/ /g, '%20');
        elements.scopeContent.style.backgroundImage = `url('${encoded}')`;
    }

    function handleScopeKey(key) {
        if (gameState.step !== 3 || gameState.navDisabled) return;

        const nav = gameState.scopeNav;
        switch (key) {
            case 'ArrowUp':
                if (nav.vertical !== 'upper') {
                    nav.vertical = 'upper';
                    nav.horizontal = 'middle';
                }
                break;
            case 'ArrowDown':
                if (nav.depth === 'deep' && nav.vertical !== 'lower') {
                    nav.vertical = 'lower';
                    nav.horizontal = 'middle';
                }
                break;
            case 'ArrowLeft':
                nav.horizontal = 'left';
                nav.vertical = 'middle';
                break;
            case 'ArrowRight':
                nav.horizontal = 'right';
                nav.vertical = 'middle';
                break;
        }

        updateScopeImage();
        checkDeepUpperTrigger();
    }

    function checkDeepUpperTrigger() {
        const nav = gameState.scopeNav;
        if (nav.depth === 'deep' && nav.vertical === 'upper' && !gameState.deepUpperTriggered) {
            gameState.deepUpperTriggered = true;
            gameState.navDisabled = true;
            elements.navControls.classList.add('hidden');
            setTimeout(onDeepUpperReached, 400);
        }
    }

    // -- ゲームフロー --

    // イントロ: 立ち絵表示 → セリフ → ウィンドウ表示
    function startIntro() {
        showCharacter('itoshima');
        elements.minigameContainer.classList.add('hidden');
        elements.navControls.classList.add('hidden');

        queueDialog("じゃあ喉頭展開するよ", null, true, () => {
            startWindowAnimation();
        });
    }

    // ウィンドウ出現 → 画像アニメーション → ナビ有効化
    function startWindowAnimation() {
        elements.minigameContainer.classList.remove('hidden');
        elements.navControls.classList.add('hidden');

        // scope-contentをナビモードに切替
        elements.scopeContent.classList.add('nav-mode');
        elements.scopeContent.classList.remove('blurred', 'half-masked');
        elements.scopeContent.style.transform = '';

        // 初期画像
        elements.window1Bg.src = 'assets/img/soukan1.jpeg';
        setScopeImageDirect('assets/img/oral cavity/face1.png');

        // 1秒後: 左→soukan2.jpeg、右→face2.jpg
        setTimeout(() => {
            elements.window1Bg.src = 'assets/img/soukan2.jpeg';
            setScopeImageDirect('assets/img/oral cavity/face2.jpg');

            // 0.5秒後: 右→closer_middle.jpg → ナビ開始
            setTimeout(() => {
                setScopeImageDirect('assets/img/oral cavity/closer_middle.jpg');
                enableNavigation();
            }, 500);
        }, 1000);
    }

    // ナビゲーション操作を有効化
    function enableNavigation() {
        gameState.step = 3;
        gameState.scopeNav = { depth: 'closer', vertical: 'middle', horizontal: 'middle' };
        gameState.navDisabled = false;
        elements.navControls.classList.remove('hidden');
        updateDepthBtn();
    }

    function onDeepUpperReached() {
        // deep_upper2.jpg はすでに表示中
        queueDialog("分泌物が多いな。吸引するか。", null, true, () => {
            showCharacter('takei');
            queueDialog("吸引か、どれだったかな", null, false, () => {
                showToolSelection('suction');
            });
        });
    }

    function proceedAfterSuction() {
        gameState.step = 4;
        hideDialog();

        queueDialog("吸引チューブです", null, true, () => {
            showCharacter('itoshima');
            queueDialog("吸引して・・・と", null, true, () => {
                // 画像を deep_upper.jpg に切り替え
                setScopeImageDirect('assets/img/oral cavity/deep_upper.jpg');

                // エフェクトとテキストを同時表示
                showCutinPersistent('itoshima2.png');
                queueDialog("見えた！", null, true, () => {
                    hideCutin();
                    proceedToStep5();
                });
            });
        });
    }

    function proceedToStep5() {
        gameState.step = 5;
        showCharacter('itoshima');
        queueDialog("武井さんチューブを！", null, true, () => {
            showCharacter('takei');
            queueDialog("えーと、どれだっけ", null, false, () => {
                showToolSelection('tracheal');
            });
        });
    }

    function proceedToStep6() {
        gameState.step = 6;
        // カットインとセリフを同時に表示
        showCutinPersistent("takei2.png");
        queueDialog("これだ！", null, true, () => {
            hideCutin();
            startTubeGame();
        });
    }

    // =====================================================
    // 気管チューブ挿入ゲーム
    // =====================================================

    // チューブ画像の定数（SVGサイズに合わせる）
    const TUBE_W = 60;
    const TUBE_H = 220;

    /** ゲーム開始: チューブを表示して声帯ターゲットを配置 */
    function startTubeGame() {
        gameState.step = 'tube';
        gameState.tubeInserted = false;

        // 声帯が見えているシーンなので立ち絵を非表示にする
        showCharacter(null);

        const tube = elements.dragTube;
        tube.style.transition = '';
        tube.style.opacity = '1';
        tube.style.pointerEvents = 'auto';
        tube.style.cursor = 'grab';

        // チューブの初期位置（左ウィンドウ中央付近）
        tube.style.left = '340px';
        tube.style.top = '80px';

        elements.tubeInsertionGame.classList.remove('hidden');

        // ターゲットリングの位置を声帯開口部に合わせる
        positionTubeTarget();

        queueDialog("声帯が見えます。チューブを声帯の開口部に合わせてください", null, true, () => {
            enableTubeDrag();
        });
    }

    /** ターゲットリングを scope-lens の声帯開口部（上40%付近）に配置 */
    function positionTubeTarget() {
        const gameContainer = document.getElementById('game-container');
        const gameRect  = gameContainer.getBoundingClientRect();
        const lensRect  = elements.scopeLens.getBoundingClientRect();
        const scale     = gameRect.width / 1280;

        const lensGameX = (lensRect.left - gameRect.left) / scale;
        const lensGameY = (lensRect.top  - gameRect.top)  / scale;
        const lensGameW = lensRect.width  / scale;
        const lensGameH = lensRect.height / scale;

        // 声帯の開口部はスコープ中央・上方40%あたり
        gameState.tubeTargetX = lensGameX + lensGameW * 0.50;
        gameState.tubeTargetY = lensGameY + lensGameH * 0.40;

        elements.tubeTargetIndicator.style.left  = gameState.tubeTargetX + 'px';
        elements.tubeTargetIndicator.style.top   = gameState.tubeTargetY + 'px';
        elements.tubeTargetIndicator.style.opacity = '1';
    }

    /** ドラッグ操作を有効化 */
    let _tubeMoveHandler = null;
    let _tubeUpHandler   = null;

    function enableTubeDrag() {
        const tube          = elements.dragTube;
        const gameContainer = document.getElementById('game-container');

        tube.addEventListener('mousedown', onTubeMouseDown);

        function onTubeMouseDown(e) {
            if (gameState.tubeInserted) return;
            e.preventDefault();

            const gameRect   = gameContainer.getBoundingClientRect();
            const scale      = gameRect.width / 1280;
            const tubeLeft   = parseFloat(tube.style.left)  || 0;
            const tubeTop    = parseFloat(tube.style.top)   || 0;
            const dragOffX   = (e.clientX - gameRect.left) / scale - tubeLeft;
            const dragOffY   = (e.clientY - gameRect.top)  / scale - tubeTop;

            tube.style.cursor = 'grabbing';

            _tubeMoveHandler = (e) => {
                if (gameState.tubeInserted) return;
                const newLeft = (e.clientX - gameRect.left) / scale - dragOffX;
                const newTop  = (e.clientY - gameRect.top)  / scale - dragOffY;
                tube.style.left = newLeft + 'px';
                tube.style.top  = newTop  + 'px';
                checkTubeHit(newLeft, newTop);
            };

            _tubeUpHandler = () => {
                document.removeEventListener('mousemove', _tubeMoveHandler);
                document.removeEventListener('mouseup',   _tubeUpHandler);
                if (!gameState.tubeInserted) tube.style.cursor = 'grab';
            };

            document.addEventListener('mousemove', _tubeMoveHandler);
            document.addEventListener('mouseup',   _tubeUpHandler);
        }
    }

    /** チューブ先端（bottom-center）がターゲットに重なるか確認 */
    function checkTubeHit(tubeLeft, tubeTop) {
        const tipX = tubeLeft + TUBE_W / 2;
        const tipY = tubeTop  + TUBE_H * 0.96;   // 先端は高さの96%付近

        const dx   = tipX - gameState.tubeTargetX;
        const dy   = tipY - gameState.tubeTargetY;

        if (Math.sqrt(dx * dx + dy * dy) < 55) {
            onTubeInserted();
        }
    }

    /** チューブ挿入成功: スナップ → 挿入アニメ → 次のフェーズへ */
    function onTubeInserted() {
        if (gameState.tubeInserted) return;
        gameState.tubeInserted = true;

        // ドラッグを無効化
        if (_tubeMoveHandler) document.removeEventListener('mousemove', _tubeMoveHandler);
        if (_tubeUpHandler)   document.removeEventListener('mouseup',   _tubeUpHandler);

        const tube = elements.dragTube;
        tube.style.cursor       = 'default';
        tube.style.pointerEvents = 'none';

        // 先端をターゲット中心にスナップ
        const snapLeft = gameState.tubeTargetX - TUBE_W / 2;
        const snapTop  = gameState.tubeTargetY - TUBE_H * 0.96;
        tube.style.transition = 'left 0.15s ease, top 0.15s ease';
        tube.style.left = snapLeft + 'px';
        tube.style.top  = snapTop  + 'px';

        // ターゲットリングを消す
        elements.tubeTargetIndicator.style.transition = 'opacity 0.2s';
        elements.tubeTargetIndicator.style.opacity    = '0';

        // スナップ完了後に挿入アニメーション（下にスライド + フェードアウト）
        setTimeout(() => {
            tube.style.transition = 'top 0.65s ease-in, opacity 0.55s ease 0.1s';
            tube.style.top        = (parseFloat(tube.style.top) + 65) + 'px';
            tube.style.opacity    = '0';
        }, 160);

        // アニメーション完了後に次フェーズへ
        setTimeout(() => {
            elements.tubeInsertionGame.classList.add('hidden');
            // リセット（再スタート用）
            tube.style.transition = '';
            tube.style.opacity    = '1';
            elements.tubeTargetIndicator.style.transition = '';
            elements.tubeTargetIndicator.style.opacity    = '1';
            finishIntubation();
        }, 920);
    }

    function finishIntubation() {
        elements.minigameContainer.classList.add('hidden');
        showCharacter('itoshima');

        showCutin("itoshima2.png", 1000, () => {
            queueDialog("OK、入った！", null, true, proceedToStep7);
        });
    }

    function proceedToStep7() {
        gameState.step = 7;
        queueDialog("じゃあバッグするね", null, true, () => {
            showCharacter('takei');
            queueDialog("えーと、どれだっけ", null, false, () => {
                showToolSelection('bag');
            });
        });
    }

    function proceedToStep8() {
        gameState.step = 8;
        hideDialog();
        showCharacter(null);
        elements.clearScreen.classList.remove('hidden');

        setTimeout(() => {
            window.location.href = '../cpap/index.html';
        }, 2000);
    }

    function initGame() {
        gameState.step = 0;
        gameState.dialogQueue = [];
        gameState.dialogActive = false;
        gameState.awaitingSelection = null;
        gameState.deepUpperTriggered = false;
        gameState.navDisabled = false;
        gameState.scopeNav = { depth: 'closer', vertical: 'middle', horizontal: 'middle' };
        gameState.tubeInserted = false;
        gameState.tubeTargetX  = 0;
        gameState.tubeTargetY  = 0;

        elements.tubeInsertionGame.classList.add('hidden');

        elements.bgImage.style.backgroundImage = "url('assets/img/back.jpg')";

        elements.clearScreen.classList.add('hidden');
        elements.toolSelection.classList.add('hidden');
        hideDialog();
        hideCutin();

        startIntro();
    }

    // -- イベントリスナー --
    elements.dialogBox.addEventListener('click', advanceDialog);

    elements.toolBtns.forEach(btn => {
        btn.addEventListener('click', handleSelection);
    });

    // キーボード矢印キー
    document.addEventListener('keydown', (e) => {
        const dirs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (dirs.includes(e.key)) {
            e.preventDefault();
            handleScopeKey(e.key);
        }
    });

    // 画面上の矢印ボタン（data-dir 付きのみ）
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const dirMap = {
                up: 'ArrowUp',
                down: 'ArrowDown',
                left: 'ArrowLeft',
                right: 'ArrowRight'
            };
            const key = dirMap[btn.dataset.dir];
            if (key) handleScopeKey(key);
        });
    });

    // 中央の奥へ/手前へボタン
    elements.depthBtn.addEventListener('click', handleDepthBtn);


    // ゲーム開始
    initGame();
});
