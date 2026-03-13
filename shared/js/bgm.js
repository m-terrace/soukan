/**
 * BGM管理 (soukan シリーズ共通)
 * ページをまたいでも再生位置を維持する。
 * 使い方: <script src="...bgm.js" data-bgm="相対パス/soukanbgm.mp3"></script>
 */
(function () {
    const src = document.currentScript
        ? document.currentScript.getAttribute('data-bgm')
        : null;
    if (!src) return;

    const STORAGE_KEY = 'soukan_bgm_state';
    const bgm = new Audio(src);
    bgm.loop   = true;
    bgm.volume = 0.4;

    // ページ離脱時に再生位置と時刻を保存
    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            pos: bgm.currentTime,
            ts:  Date.now()
        }));
    }
    window.addEventListener('pagehide',     saveState);
    window.addEventListener('beforeunload', saveState);

    // 前ページからの位置を復元してから再生
    function startWithRestoredPosition() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const { pos, ts } = JSON.parse(raw);
                const elapsed  = (Date.now() - ts) / 1000;
                const duration = bgm.duration || 0;
                if (duration > 0) {
                    bgm.currentTime = (pos + elapsed) % duration;
                }
            } catch (e) {}
        }
        bgm.play().catch(() => {});
    }

    // メタデータ読み込み後に位置復元（duration が確定してから）
    bgm.addEventListener('loadedmetadata', startWithRestoredPosition, { once: true });

    // autoplay がブロックされた場合は最初の操作で再生
    const resume = () => {
        if (bgm.paused) startWithRestoredPosition();
    };
    document.addEventListener('click',      resume, { once: true });
    document.addEventListener('touchstart', resume, { once: true });
    document.addEventListener('keydown',    resume, { once: true });
})();
