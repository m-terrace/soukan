document.addEventListener('DOMContentLoaded', () => {
    // 画面スケーリングの初期化
    ScaleManager.init();

    // DOM要素の取得
    const elements = {
        dialogBox: document.getElementById('dialog-box'),
        dialogText: document.getElementById('dialog-text'),
        dialogNextIndicator: document.getElementById('dialog-next-indicator'),
        cutinContainer: document.getElementById('cutin-container'),
        cutinImage: document.getElementById('cutin-image'),
        toolSelection: document.getElementById('tool-selection'),
        minigameContainer: document.getElementById('minigame-container'),
        laryngoscopeTool: document.getElementById('laryngoscope-tool'),
        laryngoscopeArea: document.getElementById('laryngoscope-area'),
        scopeContent: document.getElementById('scope-content'),
        hintPanel: document.getElementById('hint-panel'),
        hintText: document.getElementById('hint-text'),
        clearScreen: document.getElementById('clear-screen'),
        restartBtn: document.getElementById('restart-btn'),
        toolBtns: document.querySelectorAll('.tool-btn'),
        bgImage: document.getElementById('bg-image'),
        activeCharacter: document.getElementById('active-character'),
        // 頭部固定ミニゲーム用
        headFixContainer: document.getElementById('head-fix-container'),
        headFixBg: document.getElementById('head-fix-bg'),
        headTowel: document.getElementById('head-towel'),
        nurseHands: document.getElementById('nurse-hands'),
        towelTarget: document.getElementById('towel-target'),
        handsTarget: document.getElementById('hands-target'),
        // CPAPミニゲーム用
        cpapContainer: document.getElementById('cpap-container'),
        cpapGaugeFill: document.getElementById('cpap-gauge-fill'),
        cpapBag: document.getElementById('cpap-bag'),
        spo2Window: document.getElementById('spo2-window'),
        spo2Number: document.getElementById('spo2-number')
    };

    // ゲームの進行管理
    let gameState = {
        step: 0,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
        toolStartPos: { x: 140, y: 140 }, // window1 center-ish
        targetHitTriggered: false,
        dialogActive: false,
        dialogQueue: [],
        currentDialogCallback: null,
        awaitingSelection: null, // 'suction', 'tracheal', 'bag'

        // 頭部固定ミニゲーム用
        headFixPhase: 0, // 0: towel, 1: hands, 2: swipe up
        headFixActiveItem: null,
        headFixStartY: 0, // スワイプ検知用

        // CPAPミニゲーム用
        cpapPressure: 0,
        spo2Value: 90,
        cpapActive: false
    };

    /**
     * Helper: Show standing character
     */
    function showCharacter(name) {
        if (!name) {
            elements.activeCharacter.classList.add('hidden');
            return;
        }
        elements.activeCharacter.className = `standing-character char-${name}`;
    }

    /**
     * Helper: Show Cutin with duration
     */
    function showCutin(imgName, durationMs, callback) {
        elements.cutinImage.style.backgroundImage = `url('assets/img/${imgName}')`;
        elements.cutinContainer.classList.add('active');
        elements.cutinContainer.classList.remove('hidden');

        setTimeout(() => {
            elements.cutinContainer.classList.remove('active');
            setTimeout(() => {
                elements.cutinContainer.classList.add('hidden');
                if (callback) callback();
            }, 400); // Wait for transition
        }, durationMs);
    }

    /**
     * Helper: Set Scope blur
     */
    function setBlur(isBlurred) {
        if (isBlurred) {
            elements.scopeContent.classList.add('blurred');
        } else {
            elements.scopeContent.classList.remove('blurred');
        }
    }

    /**
     * 背景変更関数
     */
    function setBackground(imageName) {
        elements.bgImage.style.backgroundImage = `url('assets/img/${imageName}')`;
    }

    /**
     * 台詞とカットインの表示開始
     */
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

        // テキスト表示
        elements.dialogBox.classList.remove('hidden');
        elements.dialogText.textContent = currentDialog.text;

        // カットイン表示 (台詞連動の古い仕組みは今回は使わず、showCutinで明示的に呼ぶ方針とするが、互換性のため残す)
        if (currentDialog.cutinImg) {
            elements.cutinImage.style.backgroundImage = `url('assets/img/${currentDialog.cutinImg}')`;
            elements.cutinContainer.classList.add('active');
            elements.cutinContainer.classList.remove('hidden');
        } else if (!elements.cutinContainer.classList.contains('active')) {
            // 他のshowCutinで出ていない時のみhideCutinを実行したいが、簡単なため今回は台詞ごとには呼ばない運用とする
        }

        // クリック待ちか自動進行か
        gameState.currentDialogCallback = currentDialog.callback;
        if (currentDialog.requireClick) {
            elements.dialogNextIndicator.classList.remove('hidden');
            // クリックリスナーは別途設定済み
        } else {
            elements.dialogNextIndicator.classList.add('hidden');
            if (currentDialog.callback) {
                currentDialog.callback();
                gameState.currentDialogCallback = null;
            }
        }
    }

    function advanceDialog() {
        if (!gameState.dialogActive) return;

        if (gameState.currentDialogCallback) {
            gameState.currentDialogCallback();
            gameState.currentDialogCallback = null;
        }

        playNextDialog();
    }

    function hideDialog() {
        elements.dialogBox.classList.add('hidden');
        elements.dialogNextIndicator.classList.add('hidden');
        hideCutin();
        gameState.dialogActive = false;
        elements.dialogText.textContent = ''; // Clear text when hidden
    }

    function hideCutin() {
        elements.cutinContainer.classList.remove('active');
        // トランジション後に非表示にする
        setTimeout(() => {
            if (!elements.cutinContainer.classList.contains('active')) {
                elements.cutinContainer.classList.add('hidden');
            }
        }, 400);
    }

    // --- テストプレイ向けヒント表示機能 ---
    function updateHint(message) {
        if (message) {
            elements.hintPanel.classList.remove('hidden');
            elements.hintText.textContent = message;
        } else {
            elements.hintPanel.classList.add('hidden');
        }
    }

    /**
     * 選択肢UIの表示
     */
    function showToolSelection(correctToolId) {
        // メッセージ更新
        if (correctToolId === 'suction') {
            updateHint("【テスト表示】「吸引チューブ」を選択してください");
        } else if (correctToolId === 'tracheal') {
            updateHint("【テスト表示】「気管チューブ」を選択してください");
        } else if (correctToolId === 'bag') {
            updateHint("【テスト表示】「流量膨張式バッグ」を選択してください");
        }

        gameState.awaitingSelection = correctToolId;
        elements.toolSelection.classList.remove('hidden');

        // 喉頭鏡のドラッグを一時ロック
        if (elements.laryngoscopeTool) {
            elements.laryngoscopeTool.style.pointerEvents = 'none';
        }

        elements.toolBtns.forEach(btn => {
            btn.classList.remove('wrong-choice');
        });
    }

    function handleSelection(e) {
        if (!gameState.awaitingSelection) return;

        const selectedTool = e.target.dataset.tool;
        if (selectedTool === gameState.awaitingSelection) {
            e.target.classList.add('correct');

            setTimeout(() => {
                elements.toolSelection.classList.add('hidden');
                e.target.classList.remove('correct');

                let selectedId = gameState.awaitingSelection;
                gameState.awaitingSelection = null;

                // 次のステップへ振り分け
                if (selectedId === 'suction') {
                    proceedToStep4();
                } else if (selectedId === 'tracheal') {
                    proceedToStep6();
                } else if (selectedId === 'bag') {
                    proceedToStep8(); // Game Clear
                }
            }, 300);
        } else {
            // 不正解アニメーション
            e.target.classList.add('wrong-choice');
            setTimeout(() => {
                e.target.classList.remove('wrong-choice');
            }, 400);
        }
    }

    /**
     * ドラッグ操作関連
     */
    function startDrag(e) {
        if (elements.laryngoscopeTool.style.pointerEvents === 'none') return;
        if (gameState.step !== 2) return; // ステップ2のみミニゲーム進行
        if (!elements.dialogBox.classList.contains('hidden') && elements.dialogText.textContent !== "") return;

        gameState.isDragging = true;
        const gamePoint = ScaleManager.getGamePoint(e);
        const rect = elements.laryngoscopeTool.getBoundingClientRect();

        // Window1エリア内のローカル座標系ではなく、ドラッグのズレはgamePointで計算
        gameState.dragOffset.x = gamePoint.x - parseInt(elements.laryngoscopeTool.style.left || 0);
        gameState.dragOffset.y = gamePoint.y - parseInt(elements.laryngoscopeTool.style.top || 0);

        elements.laryngoscopeTool.style.transform = 'scale(1.1)';

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
    }

    function onDrag(e) {
        if (!gameState.isDragging) return;
        e.preventDefault();

        const gamePoint = ScaleManager.getGamePoint(e);
        let newX = gamePoint.x - gameState.dragOffset.x;
        let newY = gamePoint.y - gameState.dragOffset.y;

        // Constraint within Window1 (400x400), image is 120x120
        newX = Math.max(0, Math.min(newX, 280));
        newY = Math.max(0, Math.min(newY, 280));

        elements.laryngoscopeTool.style.left = `${newX}px`;
        elements.laryngoscopeTool.style.top = `${newY}px`;

        if (gameState.step === 2) {
            // Target is center: X=140, Y=140
            const targetX = 140;
            const targetY = 140;
            const diffX = newX - targetX;
            const diffY = newY - targetY;

            const panFactor = 1.5;
            elements.scopeContent.style.transform = `translate(${-diffX * panFactor}px, ${-diffY * panFactor}px)`;

            checkInteractionTriggers(newX, newY);
        }
    }

    function endDrag() {
        gameState.isDragging = false;
        elements.laryngoscopeTool.style.transform = 'scale(1)';
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
    }

    function checkInteractionTriggers(toolX, toolY) {
        if (gameState.step === 2 && !gameState.targetHitTriggered) {
            const targetGameOrigin = { x: 140, y: 140 };

            if (Math.abs(toolX - targetGameOrigin.x) < 15 &&
                Math.abs(toolY - targetGameOrigin.y) < 15) {

                gameState.targetHitTriggered = true;
                endDrag();
                elements.laryngoscopeTool.style.left = `${targetGameOrigin.x}px`;
                elements.laryngoscopeTool.style.top = `${targetGameOrigin.y}px`;
                elements.laryngoscopeTool.style.pointerEvents = 'none';

                // 中心に固定
                elements.scopeContent.style.transform = `translate(0px, 0px)`;

                proceedToStep3();
            }
        }
    }

    /**
     * 新しいノベルゲーム風シーンフロー
     */
    function proceedToStep1() {
        gameState.step = 1;
        setBackground('scene2.png');
        showCharacter('hatta');
        hideDialog();

        showCutin("hatta2.png", 1000, () => {
            queueDialog("頭を固定します！", null, true, proceedToHeadFixMinigame);
        });
    }

    /**
     * 頭部固定ミニゲーム (Step 1.5)
     */
    function proceedToHeadFixMinigame() {
        gameState.step = 1.5;
        gameState.headFixPhase = 0;

        // UI初期化
        elements.minigameContainer.classList.remove('hidden'); // 親コンテナを表示
        elements.headFixContainer.classList.remove('hidden');
        elements.headTowel.classList.remove('hidden', 'locked');
        elements.headTowel.classList.add('golden-highlight'); // 初期ハイライト
        elements.towelTarget.classList.add('golden-highlight'); // ターゲットもハイライト
        elements.towelTarget.classList.remove('hidden'); // 確認のために表示（枠線などはCSSに依存）

        // 四つ折りから元に戻す（リトライ時用）
        elements.headTowel.style.backgroundImage = "url('assets/img/towel_for_head.png')";

        elements.nurseHands.classList.add('hidden'); // 両手は今回は使わない
        elements.headFixBg.classList.remove('extended'); // 一応リセット

        // 初期位置にリセット
        elements.headTowel.style.left = '20px';
        elements.headTowel.style.top = '480px';
        elements.nurseHands.style.left = '340px';
        elements.nurseHands.style.top = '340px';

        setupHeadFixDrag(elements.headTowel, 'towel');
    }

    function setupHeadFixDrag(itemEl, type) {
        itemEl.style.pointerEvents = 'auto';

        const onDragStart = (e) => {
            if (gameState.step !== 1.5) return;
            gameState.isDragging = true;
            gameState.headFixActiveItem = { el: itemEl, type: type };

            const point = ScaleManager.getGamePoint(e);
            gameState.dragOffset.x = point.x - parseInt(itemEl.style.left || 0);
            gameState.dragOffset.y = point.y - parseInt(itemEl.style.top || 0);

            itemEl.style.transform = 'scale(1.1)';

            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('touchmove', onDragMove, { passive: false });
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchend', onDragEnd);
        };

        const onDragMove = (e) => {
            if (!gameState.isDragging || !gameState.headFixActiveItem) return;
            e.preventDefault();

            const point = ScaleManager.getGamePoint(e);
            let nx = point.x - gameState.dragOffset.x;
            let ny = point.y - gameState.dragOffset.y;

            // Container boundary roughly
            nx = Math.max(-50, Math.min(nx, 500));
            ny = Math.max(-50, Math.min(ny, 500));

            itemEl.style.left = `${nx}px`;
            itemEl.style.top = `${ny}px`;
        };

        const onDragEnd = () => {
            if (!gameState.isDragging) return;
            gameState.isDragging = false;
            itemEl.style.transform = 'scale(1)';

            checkHeadFixDrop(itemEl, type);

            gameState.headFixActiveItem = null;
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('touchmove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            document.removeEventListener('touchend', onDragEnd);
        };

        itemEl.onmousedown = onDragStart;
        itemEl.ontouchstart = (e) => { e.preventDefault(); onDragStart(e); };
    }

    function checkHeadFixDrop(itemEl, type) {
        const rect = itemEl.getBoundingClientRect();
        const targetEl = type === 'towel' ? elements.towelTarget : elements.handsTarget;
        const targetRect = targetEl.getBoundingClientRect();

        // 中心座標で大雑把なヒット判定
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const tcx = targetRect.left + targetRect.width / 2;
        const tcy = targetRect.top + targetRect.height / 2;

        const distance = Math.hypot(cx - tcx, cy - tcy);

        if (distance < 80) { // ヒット範囲
            // 吸着させる（CSS側の設定値に合わせて左上座標を固定）
            itemEl.style.left = type === 'towel' ? '260px' : '100px';
            itemEl.style.top = type === 'towel' ? '450px' : '250px';

            itemEl.classList.add('locked');
            itemEl.onmousedown = null;
            itemEl.ontouchstart = null;

            if (type === 'towel') {
                // 画像を四つ折りに変更
                itemEl.style.backgroundImage = "url('assets/img/folded_towel.png')";

                // ハイライトを消す
                itemEl.classList.remove('golden-highlight');
                elements.towelTarget.classList.remove('golden-highlight');
                elements.towelTarget.classList.add('hidden');

                // 両手や背屈フェーズは省略し、即座にクリア演出へ
                completeHeadFix();
            }
        }
    }

    function setupHeadFixSwipe() {
        // 顔（手が重なった後）を上方向にスワイプして背屈させる
        const touchArea = elements.headFixContainer;

        const onSwipeStart = (e) => {
            if (gameState.step !== 1.5 || gameState.headFixPhase !== 2) return;
            const point = ScaleManager.getGamePoint(e);
            gameState.headFixStartY = point.y;

            document.addEventListener('mousemove', onSwipeMove);
            document.addEventListener('touchmove', onSwipeMove, { passive: false });
            document.addEventListener('mouseup', onSwipeEnd);
            document.addEventListener('touchend', onSwipeEnd);
        };

        const onSwipeMove = (e) => {
            if (gameState.step !== 1.5 || gameState.headFixPhase !== 2) return;
            e.preventDefault();
            const point = ScaleManager.getGamePoint(e);
            const deltaY = point.y - gameState.headFixStartY;

            // 上に一定距離スワイプされたらクリア判定
            if (deltaY < -40) {
                completeHeadFix();
                document.removeEventListener('mousemove', onSwipeMove);
                document.removeEventListener('touchmove', onSwipeMove);
                document.removeEventListener('mouseup', onSwipeEnd);
                document.removeEventListener('touchend', onSwipeEnd);
            }
        };

        const onSwipeEnd = () => {
            document.removeEventListener('mousemove', onSwipeMove);
            document.removeEventListener('touchmove', onSwipeMove);
            document.removeEventListener('mouseup', onSwipeEnd);
            document.removeEventListener('touchend', onSwipeEnd);
        };

        touchArea.onmousedown = onSwipeStart;
        touchArea.ontouchstart = (e) => { e.preventDefault(); onSwipeStart(e); };
    }

    function completeHeadFix() {
        gameState.headFixPhase = 3;
        elements.headFixBg.classList.add('extended'); // 不要なら外すが現状はアニメーションとして残す

        setTimeout(() => {
            // OKです！カットインではなくhatta2.pngを1秒表示 -> 次のステップへ
            showCutin("hatta2.png", 1000, () => {
                elements.headFixContainer.classList.add('hidden');
                proceedToStep2();
            });
        }, 800); // 延長アニメーションを見せる時間
    }


    function proceedToStep2() {
        gameState.step = 2;
        showCharacter('itoshima');
        hideDialog();

        // 喉頭鏡の領域を表示
        document.getElementById('window1').classList.remove('hidden');
        document.getElementById('window2').classList.remove('hidden');
        elements.minigameContainer.classList.remove('hidden');
        setBlur(true);
        elements.laryngoscopeTool.style.pointerEvents = 'auto'; // allow dragging
    }

    function proceedToStep3() {
        gameState.step = 3;
        showCharacter('itoshima');
        queueDialog("分泌物が多いな、吸引するか", null, true, () => {
            showCharacter('takei');
            queueDialog("えーとどれだっけ", null, true, () => {
                showToolSelection('suction');
            });
        });
    }

    function proceedToStep4() {
        gameState.step = 4;
        showCharacter('itoshima');
        hideDialog();

        queueDialog("吸引して・・と", null, false);
        setBlur(false); // scope becomes clear

        setTimeout(() => {
            showCutin("itoshima2.png", 1000, proceedToStep5);
        }, 800);
    }

    function proceedToStep5() {
        gameState.step = 5;
        showCharacter('itoshima');
        queueDialog("武井さんチューブを！", null, true, () => {
            showCharacter('takei');
            showToolSelection('tracheal');
        });
    }

    function proceedToStep6() {
        gameState.step = 6;
        setBackground('scene3.png');
        showCharacter('itoshima');
        elements.minigameContainer.classList.add('hidden'); // Minigame over

        queueDialog("OK、入ったよ", null, true, proceedToStep7);
    }

    function proceedToStep7() {
        gameState.step = 7;
        showCharacter('takei');
        showToolSelection('bag');
    }

    function proceedToStep8() {
        gameState.step = 8;
        showCutin("takei2.png", 1000, () => {
            elements.clearScreen.classList.remove('hidden');
        });
    }

    function initGame() {
        // 状態初期化
        gameState.step = 0;
        gameState.targetHitTriggered = false;
        elements.laryngoscopeTool.style.left = `${gameState.toolStartPos.x}px`;
        elements.laryngoscopeTool.style.top = `${gameState.toolStartPos.y}px`;
        elements.laryngoscopeTool.style.pointerEvents = 'none';
        elements.headFixContainer.classList.add('hidden'); // Init head fix minigame
        elements.cpapContainer.classList.add('hidden'); // Init CPAP
        elements.spo2Window.classList.add('hidden');
        document.getElementById('window1').classList.add('hidden'); // 喉頭鏡エリアも隠す
        document.getElementById('window2').classList.add('hidden'); // 声帯ビューも隠す
        elements.minigameContainer.classList.add('hidden');
        elements.clearScreen.classList.add('hidden');
        gameState.dialogQueue = [];
        hideDialog();
        showCharacter(null); // delete any standing

        // Step 0: Initial Screen
        setBackground('scene1.png');
        queueDialog("気管内挿管にトライしよう", null, true, proceedToCpap);
    }

    // --- CPAP Mini-game Logic ---
    let cpapInterval = null;
    let cpapPressing = false;
    let spo2Timer = 0;

    function proceedToCpap() {
        gameState.step = 0.5; // Insert before Step 1
        hideDialog();

        elements.minigameContainer.classList.remove('hidden');
        elements.cpapContainer.classList.remove('hidden');
        elements.spo2Window.classList.remove('hidden');

        gameState.cpapPressure = 0;
        gameState.spo2Value = 90;
        gameState.cpapActive = true;

        elements.spo2Number.innerText = gameState.spo2Value;
        elements.cpapGaugeFill.style.height = '0%';
        elements.cpapGaugeFill.style.backgroundColor = 'yellow';

        startCpapLoop();
    }

    function startCpapLoop() {
        const handlePressStart = (e) => {
            if (e.cancelable) e.preventDefault();
            cpapPressing = true;
            elements.cpapBag.classList.add('active-press');
        };
        const handlePressEnd = () => {
            cpapPressing = false;
            elements.cpapBag.classList.remove('active-press');
        };

        elements.cpapBag.onmousedown = handlePressStart;
        elements.cpapBag.onmouseup = handlePressEnd;
        elements.cpapBag.onmouseleave = handlePressEnd;
        elements.cpapBag.ontouchstart = handlePressStart;
        elements.cpapBag.ontouchend = handlePressEnd;

        if (cpapInterval) clearInterval(cpapInterval);

        cpapInterval = setInterval(() => {
            if (!gameState.cpapActive) {
                clearInterval(cpapInterval);
                return;
            }

            // 押している時は上昇、離している時は低下（スピードを少し落として操作しやすく）
            if (cpapPressing) {
                gameState.cpapPressure += 0.3; // 0.4 -> 0.3
            } else {
                gameState.cpapPressure -= 0.2; // 0.3 -> 0.2
            }

            // 範囲を 0 〜 10 に制限
            gameState.cpapPressure = Math.max(0, Math.min(10, gameState.cpapPressure));

            // ゲージの高さを更新
            const fillHeight = (gameState.cpapPressure / 10) * 100;
            elements.cpapGaugeFill.style.height = `${fillHeight}%`;

            // 3〜8cmH2Oの範囲チェック（安全エリア拡大）
            if (gameState.cpapPressure >= 3 && gameState.cpapPressure <= 8) {
                elements.cpapGaugeFill.style.backgroundColor = '#0f0'; // 緑色
                spo2Timer++;

                // 約1秒強キープごとにSpO2が+1される
                if (spo2Timer > 30) {
                    spo2Timer = 0;
                    if (gameState.spo2Value < 95) {
                        gameState.spo2Value++;
                        elements.spo2Number.innerText = gameState.spo2Value;
                        // 95に達したらクリア
                        if (gameState.spo2Value >= 95) {
                            completeCpap();
                        }
                    }
                }
            } else {
                elements.cpapGaugeFill.style.backgroundColor = 'yellow'; // 警告色
                spo2Timer = 0; // 範囲外に出たらキープ時間リセット
            }
        }, 33); // 約30fpsで更新
    }

    function completeCpap() {
        gameState.cpapActive = false;
        clearInterval(cpapInterval);
        cpapInterval = null;

        elements.cpapBag.onmousedown = null;
        elements.cpapBag.onmouseup = null;
        elements.cpapBag.onmouseleave = null;
        elements.cpapBag.ontouchstart = null;
        elements.cpapBag.ontouchend = null;

        elements.cpapContainer.classList.add('hidden');
        elements.spo2Window.classList.add('hidden');
        elements.minigameContainer.classList.add('hidden'); // 一旦閉じる

        // 次のステップへ
        proceedToStep1();
    }

    // イベントリスナーの登録
    elements.dialogBox.addEventListener('click', advanceDialog);

    elements.toolBtns.forEach(btn => {
        btn.addEventListener('click', handleSelection);
    });

    elements.laryngoscopeTool.addEventListener('mousedown', startDrag);
    elements.laryngoscopeTool.addEventListener('touchstart', startDrag, { passive: false });

    elements.restartBtn.addEventListener('click', initGame);

    // ゲーム開始
    initGame();
});
