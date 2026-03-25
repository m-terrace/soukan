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

    let closerHintShown  = false;
    let deepHintShown    = false;
    let _dialogShownAt   = 0; // 同一クリックで即閉じるのを防ぐタイムスタンプ

    // ===== 効果音 =====
    const sfxCutin = new Audio('../shared/assets/cutin.mp3');
    function playCutin() { sfxCutin.currentTime = 0; sfxCutin.play(); }
    const sfxText = new Audio('../shared/assets/text.mp3');
    function playText() { sfxText.currentTime = 0; sfxText.play(); }
    const sfxCursole = new Audio('assets/img/cursole.mp3');
    function playCursole() { sfxCursole.currentTime = 0; sfxCursole.play(); }
    const sfxChoice = new Audio('assets/img/choice.mp3');
    function playChoice() { sfxChoice.currentTime = 0; sfxChoice.play(); }
    const sfxMiss = new Audio('assets/img/miss.mp3');
    function playMiss() { sfxMiss.currentTime = 0; sfxMiss.play(); }
    const sfxSuction = new Audio('assets/img/suction.mp3');
    function playSuction() { sfxSuction.currentTime = 0; sfxSuction.play(); }

    // ===== ボイス =====
    // tenkai_2・tenkai_3 はナビ操作ヒントのためボイスなし
    const tenkaiVoices = {};
    [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].forEach(i => {
        tenkaiVoices[i] = new Audio(`assets/tenkai_${i}.mp3`);
    });
    function playTenkaiVoice(n) {
        const a = tenkaiVoices[n];
        if (a) { a.currentTime = 0; a.play().catch(() => {}); }
    }

    // -- キャラクター表示 --
    const characterNames = { 'takei': '武居', 'itoshima': '糸島' };

    function showCharacter(name) {
        if (!name) {
            elements.activeCharacter.classList.add('hidden');
            elements.dialogName.textContent = '';
            elements.dialogBox.classList.add('narration');
            return;
        }
        elements.activeCharacter.className = `standing-character char-${name}`;
        elements.dialogName.textContent = characterNames[name] || '';
        elements.dialogBox.classList.remove('narration');
    }

    function showCutin(imgName, durationMs, callback) {
        playCutin();
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
        playCutin();
        elements.cutinImage.style.backgroundImage = `url('assets/img/${imgName}')`;
        elements.cutinContainer.classList.remove('hidden');
        elements.cutinContainer.classList.add('active');
    }

    // -- ダイアログ管理 --
    function queueDialog(text, cutinImg = null, requireClick = true, callback = null, voiceKey = null) {
        gameState.dialogQueue.push({ text, cutinImg, requireClick, callback, voiceKey });
        if (!gameState.dialogActive) {
            playNextDialog();
        }
    }

    function playNextDialog() {
        if (gameState.dialogQueue.length === 0) {
            hideDialog();
            return;
        }

        _dialogShownAt = Date.now();
        gameState.dialogActive = true;
        const currentDialog = gameState.dialogQueue.shift();

        elements.dialogBox.classList.remove('hidden');
        playText();
        elements.dialogText.textContent = currentDialog.text;
        if (currentDialog.voiceKey != null) playTenkaiVoice(currentDialog.voiceKey);

        if (currentDialog.cutinImg) {
            playCutin();
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
        if (Date.now() - _dialogShownAt < 150) return;
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

        // e.target が子要素の場合もあるため closest で確実にボタンを取得
        const btn = e.target.closest('[data-tool]');
        if (!btn) return;
        const selectedTool = btn.dataset.tool;

        if (selectedTool === gameState.awaitingSelection) {
            playChoice();
            btn.classList.add('correct');

            setTimeout(() => {
                elements.toolSelection.classList.add('hidden');
                elements.toolSelection.style.display = '';
                btn.classList.remove('correct');

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
            playMiss();
            btn.classList.add('wrong-choice');
            setTimeout(() => btn.classList.remove('wrong-choice'), 400);
        }
    }

    // -- 左ウィンドウ同期 --
    // 0=start.jpg表示中, 1=start2.jpg表示中, 2=nav連動中
    let window1Phase = 0;

    function syncWindow1ToNav() {
        const { depth, vertical, horizontal } = gameState.scopeNav;
        let img;
        if (depth === 'closer') {
            if (vertical === 'upper')                          img = 'temae_high.jpg';
            else if (vertical === 'lower')                     img = 'temae_low.jpg';
            else if (horizontal === 'left' || horizontal === 'right') img = 'temae_middle.jpg';
            else                                               img = 'temae_middle.jpg'; // middle/middle
        } else {
            if (vertical === 'upper')                          img = 'oku_high.jpg';
            else if (vertical === 'lower')                     img = 'oku_low.jpg';
            else if (horizontal === 'left' || horizontal === 'right') img = 'oku_middle.jpg';
            else                                               img = 'oku_middle.jpg'; // middle/middle
        }
        elements.window1Bg.src = `assets/img/${img}`;
    }

    function onWindow1Action() {
        if (window1Phase === 0) {
            window1Phase = 1;
            elements.window1Bg.src = 'assets/img/start2.jpg';
        } else {
            window1Phase = 2;
            syncWindow1ToNav();
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
            if (!deepHintShown) {
                deepHintShown = true;
                queueDialog("もう少し上か", null, true, null);
            }
        } else {
            nav.depth = 'closer';
        }
        nav.vertical = 'middle';
        nav.horizontal = 'middle';
        updateScopeImage();
        updateDepthBtn();
        onWindow1Action();
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
                if (nav.vertical !== 'lower') {
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
        onWindow1Action();
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
        }, 1);
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
        elements.window1Bg.src = 'assets/img/start.jpg';
        setScopeImageDirect('assets/img/oral cavity/face1.png');

        // 1秒後: 左→start2.jpg / 右→face2.jpg
        setTimeout(() => {
            elements.window1Bg.src = 'assets/img/start2.jpg';
            window1Phase = 1;
            setScopeImageDirect('assets/img/oral cavity/face2.jpg');

            // 0.5秒後: 左・右ともにcloser_middle → ナビ開始
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
        // 左ウィンドウをnav連動フェーズに移行（初期: closer_middle.jpg）
        window1Phase = 2;
        syncWindow1ToNav();

        if (!closerHintShown) {
            closerHintShown = true;
            queueDialog("もうちょっと奥かな", null, true, null);
        }
    }

    function onDeepUpperReached() {
        // deep_upper2.jpg はすでに表示中
        queueDialog("分泌物が多いな。吸引しよう。", null, true, () => {
            showCharacter('takei');
            queueDialog("吸引か、どれだったかな", null, false, () => {
                showToolSelection('suction');
            }, 5);
        }, 4);
    }

    function proceedAfterSuction() {
        gameState.step = 4;
        hideDialog();

        queueDialog("吸引チューブです", null, true, () => {
            showCharacter('itoshima');
            queueDialog("吸引して・・・と", null, true, () => {
                playSuction();
                // 画像を deep_upper.jpg に切り替え
                setScopeImageDirect('assets/img/oral cavity/deep_upper.jpg');

                // エフェクトとテキストを同時表示
                showCutinPersistent('itoshima2.png');
                queueDialog("見えた！", null, true, () => {
                    hideCutin();
                    proceedToStep5();
                }, 8);
            }, 7);
        }, 6);
    }

    function proceedToStep5() {
        gameState.step = 5;
        showCharacter('itoshima');
        queueDialog("武居さんチューブを！", null, true, () => {
            showCharacter('takei');
            queueDialog("えーと、どれだっけ", null, false, () => {
                showToolSelection('tracheal');
            }, 10);
        }, 9);
    }

    function proceedToStep6() {
        gameState.step = 6;
        // カットインとセリフを同時に表示
        showCutinPersistent("takei2.png");
        queueDialog("これだ！", null, true, () => {
            hideCutin();
            startTubeGame();
        }, 11);
    }

    // =====================================================
    // 気管チューブ挿入ゲーム
    // =====================================================

    // チューブ画像の定数（CSSサイズに合わせる）
    const TUBE_W = 686;
    const TUBE_H = 914; // tube.png 2倍サイズ

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
        tube.classList.remove('tube-glow');

        // 画面右外からスライドイン（縦: 中央 top=(720-914)/2=-97px、横: 右1/5=1024px で停止）
        tube.style.left = '1500px';
        tube.style.top  = '-97px';

        elements.tubeInsertionGame.classList.remove('hidden');
        positionTubeTarget();

        // 2フレーム後にスライドイン開始（描画確定後）
        requestAnimationFrame(() => requestAnimationFrame(() => {
            tube.style.transition = 'left 0.6s ease-out';
            tube.style.left = '1024px'; // 右1/5の位置（1280 × 4/5）

            // スライド完了後にゴールドグロー（1秒）
            setTimeout(() => {
                tube.style.transition = ''; // ドラッグに支障がないようリセット
                tube.classList.add('tube-glow');
                setTimeout(() => tube.classList.remove('tube-glow'), 1000);
            }, 600);
        }));

        queueDialog("チューブの先端を声帯の開口部に合わせてください", null, true, () => {
            enableTubeDrag();
        }, 12);
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

    /** チューブ先端がターゲットに重なるか確認 */
    function checkTubeHit(tubeLeft, tubeTop) {
        // 画像を縦3・横2分割した「左列・下行」セルの中心をヒット点とする
        const tipX = tubeLeft + TUBE_W / 4;           // 左列中心（左から25%）
        const tipY = tubeTop  + TUBE_H * 5 / 6;      // 下行中心（上から83%）

        const dx   = tipX - gameState.tubeTargetX;
        const dy   = tipY - gameState.tubeTargetY;

        if (Math.sqrt(dx * dx + dy * dy) < 100) {
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

        // 先端をターゲット中心にスナップ（左下セル基準）
        const snapLeft = gameState.tubeTargetX - TUBE_W / 4;
        const snapTop  = gameState.tubeTargetY - TUBE_H * 5 / 6;
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
            queueDialog("OK、入った！", null, true, proceedToStep7, 13);
        });
    }

    function proceedToStep7() {
        gameState.step = 7;
        queueDialog("じゃあバッグするね", null, true, () => {
            showCharacter('takei');
            queueDialog("えーと、どれだっけ", null, false, () => {
                showToolSelection('bag');
            }, 15);
        }, 14);
    }

    function proceedToStep8() {
        gameState.step = 8;
        hideDialog();
        showCharacter(null);
        elements.clearScreen.classList.remove('hidden');
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
        window1Phase = 0;

        elements.bgImage.style.backgroundImage = "url('assets/img/back.jpg')";

        elements.clearScreen.classList.add('hidden');
        elements.toolSelection.classList.add('hidden');
        hideDialog();
        hideCutin();

        startIntro();
    }

    // -- イベントリスナー --
    document.addEventListener('click', advanceDialog);

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
            if (key) {
                playCursole();
                handleScopeKey(key);
            }
        });
    });

    // 中央の奥へ/手前へボタン
    elements.depthBtn.addEventListener('click', () => {
        playCursole();
        handleDepthBtn();
    });


    // ゲーム開始
    initGame();
});
