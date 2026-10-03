/* 灯笼 2048 — a 2048 where every tile is a paper lantern that glows warmer as it grows. */
(() => {
  'use strict';

  /* ---- logic:begin (pure, no DOM) ---- */
  const SIZE = 4;
  const emptyGrid = () => Array.from({ length: SIZE }, () => new Array(SIZE).fill(0));

  // dir: 0 left, 1 up, 2 right, 3 down. Cell k steps along line i, counted from the side the tiles move toward.
  const cellAt = (dir, i, k) => {
    const j = SIZE - 1 - k;
    return dir === 0 ? [i, k] : dir === 1 ? [k, i] : dir === 2 ? [i, j] : [j, i];
  };

  // Slide every tile toward `dir`. Equal neighbours merge once per move.
  // Returns the new grid, the score gained, whether anything changed, and a per-tile trace
  // ({fr,fc} -> {tr,tc}, merge = this tile is absorbed into the tile already waiting at the target).
  function slideGrid(grid, dir) {
    const out = emptyGrid();
    const trace = [];
    let gained = 0;
    let moved = false;
    for (let i = 0; i < SIZE; i++) {
      let n = 0; // slots filled so far on this line
      let fresh = false; // the last placed tile has not merged yet
      for (let k = 0; k < SIZE; k++) {
        const [r, c] = cellAt(dir, i, k);
        const v = grid[r][c];
        if (!v) continue;
        if (n > 0 && fresh) {
          const [pr, pc] = cellAt(dir, i, n - 1);
          if (out[pr][pc] === v) {
            out[pr][pc] = v * 2;
            gained += v * 2;
            fresh = false;
            moved = true;
            trace.push({ fr: r, fc: c, tr: pr, tc: pc, merge: true });
            continue;
          }
        }
        const [tr, tc] = cellAt(dir, i, n);
        out[tr][tc] = v;
        fresh = true;
        n++;
        if (tr !== r || tc !== c) moved = true;
        trace.push({ fr: r, fc: c, tr, tc, merge: false });
      }
    }
    return { grid: out, gained, moved, trace };
  }

  function hasMoves(grid) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        if (!v) return true;
        if (c + 1 < SIZE && grid[r][c + 1] === v) return true;
        if (r + 1 < SIZE && grid[r + 1][c] === v) return true;
      }
    }
    return false;
  }
  /* ---- logic:end ---- */

  const ACCENT = '#ffc94a';
  const ANIM_MS = 110;
  const UNDO_MAX = 3;
  const WIN_TILE = 2048;
  const SAVE_KEY = 'mg-lantern2048-save';
  const KEYMAP = {
    ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3,
    KeyA: 0, KeyW: 1, KeyD: 2, KeyS: 3,
    a: 0, w: 1, d: 2, s: 3, A: 0, W: 1, D: 2, S: 3,
  };
  // A real lantern or festival object for each tile; shown tiny, and only when the tile is big enough to keep it legible.
  const LABELS = {
    2: '灯芯', 4: '纸灯', 8: '花灯', 16: '兔子灯', 32: '莲花灯', 64: '走马灯',
    128: '宫灯', 256: '孔明灯', 512: '鳌山灯', 1024: '龙灯', 2048: '万家灯火',
  };

  const CSS = `
.mg-lantern2048, .mg-lantern2048 * { box-sizing: border-box; }
.mg-lantern2048 [hidden] { display: none !important; }
.mg-lantern2048 {
  --l48-ms: 110ms;
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  color: #eef3f7;
  font-family: var(--body, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif);
  background: radial-gradient(60% 52% at 50% 44%, rgba(255, 201, 74, 0.09), rgba(255, 201, 74, 0) 72%);
  -webkit-user-select: none; user-select: none;
  -webkit-touch-callout: none;
}
.mg-lantern2048 .l48-col {
  display: flex; flex-direction: column; align-items: stretch;
  flex: none; width: var(--bs, 320px); gap: 10px;
}
.mg-lantern2048.is-tight .l48-col { gap: 7px; }

/* HUD */
.mg-lantern2048 .l48-hud { display: flex; gap: 8px; }
.mg-lantern2048 .l48-stat {
  position: relative; flex: 1 1 0; min-width: 0;
  padding: 6px 6px 7px; text-align: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(159, 179, 200, 0.16);
  border-radius: 12px;
}
.mg-lantern2048.is-tight .l48-stat { padding: 4px 6px 5px; }
.mg-lantern2048 .l48-stat-k { display: block; font-size: clamp(11px, calc(var(--bs, 320px) * 0.022), 14px); line-height: 1.35; letter-spacing: 0.1em; color: #9fb3c8; white-space: nowrap; }
.mg-lantern2048 .l48-stat-v {
  display: block; font-size: clamp(20px, calc(var(--bs, 320px) * 0.052), 30px); line-height: 1.2; font-weight: 600; color: #eef3f7;
  font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: clip;
}
.mg-lantern2048.is-tight .l48-stat-v { font-size: 18px; }
.mg-lantern2048 .l48-stat.is-score { border-color: rgba(255, 201, 74, 0.34); }
.mg-lantern2048 .l48-stat.is-score .l48-stat-v { color: #ffc94a; }
.mg-lantern2048 .l48-plus {
  position: absolute; left: 50%; top: 2px; transform: translateX(-50%);
  font-size: 15px; font-weight: 600; color: #ffd978; pointer-events: none;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7);
}

/* board */
.mg-lantern2048 .l48-board {
  position: relative; flex: none; width: var(--bs, 320px); height: var(--bs, 320px);
  border-radius: 14px;
  background:
    repeating-linear-gradient(92deg, rgba(255, 226, 170, 0.02) 0 1px, rgba(0, 0, 0, 0) 1px 7px),
    linear-gradient(160deg, #281d13 0%, #1a1410 55%, #130e0a 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 201, 74, 0.2),
    inset 0 1px 0 rgba(255, 235, 190, 0.07),
    inset 0 0 26px rgba(0, 0, 0, 0.5),
    0 14px 40px rgba(0, 0, 0, 0.55);
  touch-action: none;
}
.mg-lantern2048 .l48-slot, .mg-lantern2048 .l48-tile {
  position: absolute; left: var(--gap, 8px); top: var(--gap, 8px);
  width: var(--cell, 70px); height: var(--cell, 70px);
  transform: translate(calc(var(--c, 0) * (var(--cell, 70px) + var(--gap, 8px))), calc(var(--r, 0) * (var(--cell, 70px) + var(--gap, 8px))));
}
.mg-lantern2048 .l48-slot {
  border-radius: calc(var(--cell, 70px) * 0.2);
  background: rgba(0, 0, 0, 0.33);
  box-shadow: inset 0 2px 7px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 201, 74, 0.07);
}
.mg-lantern2048 .l48-tile {
  z-index: 2;
  transition: transform var(--l48-ms) cubic-bezier(0.2, 0.75, 0.3, 1);
  will-change: transform;
  --rim: rgba(0, 0, 0, 0); --rib: rgba(110, 70, 20, 0.16); --halo-s: 0px;
  --tsh: 0 1px 0 rgba(255, 255, 255, 0.35);
}
.mg-lantern2048 .l48-tile.is-under { z-index: 1; }
.mg-lantern2048.is-sizing .l48-tile { transition: none; }

/* lantern body: paper glow in the middle, wooden caps top and bottom, one curved rib */
.mg-lantern2048 .l48-lantern {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-radius: 24% / 26%;
  background:
    linear-gradient(#3a2818, #3a2818) top center / 34% 6% no-repeat,
    linear-gradient(#3a2818, #3a2818) bottom center / 34% 6% no-repeat,
    radial-gradient(ellipse 80% 75% at 50% 50%, var(--core) 0%, var(--mid) 62%, var(--edge) 100%);
  box-shadow:
    inset 0 0 0 max(1px, calc(var(--cell, 70px) * 0.025)) var(--rim),
    0 0 var(--halo-r, 6px) var(--halo-s) var(--halo, rgba(0, 0, 0, 0));
}
.mg-lantern2048 .l48-lantern::before {
  content: ""; position: absolute; left: 21%; right: 21%; top: 6%; bottom: 6%;
  border: 1px solid var(--rib); border-radius: 50%;
}
.mg-lantern2048 .l48-num {
  position: relative; z-index: 1;
  color: var(--tx); text-shadow: var(--tsh);
  font-weight: 600; font-variant-numeric: tabular-nums;
  line-height: 1; letter-spacing: -0.02em; white-space: nowrap;
  font-size: calc(var(--cell, 70px) * 0.5);
}
.mg-lantern2048 .l48-tile[data-len="2"] .l48-num { font-size: calc(var(--cell, 70px) * 0.44); }
.mg-lantern2048 .l48-tile[data-len="3"] .l48-num { font-size: calc(var(--cell, 70px) * 0.36); }
.mg-lantern2048 .l48-tile[data-len="4"] .l48-num { font-size: calc(var(--cell, 70px) * 0.3); }
.mg-lantern2048 .l48-tile[data-len="5"] .l48-num { font-size: calc(var(--cell, 70px) * 0.24); }
.mg-lantern2048 .l48-tile[data-len="6"] .l48-num { font-size: calc(var(--cell, 70px) * 0.2); }
.mg-lantern2048 .l48-label {
  display: none; position: relative; z-index: 1;
  margin-top: calc(var(--cell, 70px) * 0.045);
  font-size: calc(var(--cell, 70px) * 0.145); line-height: 1.1; font-weight: 600;
  color: var(--tx); opacity: 0.9; white-space: nowrap; text-shadow: var(--tsh);
}
.mg-lantern2048.has-label .l48-label { display: block; }

/* the warmer, the brighter: pale paper -> amber -> orange -> red -> red-gold with a strong glow */
.mg-lantern2048 .l48-tile[data-t="2"]    { --core: #f6ecd4; --mid: #ebdcb9; --edge: #cdbb92; --tx: #46341d; --halo: rgba(255, 232, 180, 0.2);  --halo-r: 6px; }
.mg-lantern2048 .l48-tile[data-t="4"]    { --core: #f6e6c0; --mid: #ecd6a0; --edge: #cfb67c; --tx: #45300f; --halo: rgba(255, 222, 150, 0.3);  --halo-r: 9px; }
.mg-lantern2048 .l48-tile[data-t="8"]    { --core: #ffe9a8; --mid: #ffd070; --edge: #e8a336; --tx: #3a2204; --halo: rgba(255, 200, 90, 0.42);  --halo-r: 13px; }
.mg-lantern2048 .l48-tile[data-t="16"]   { --core: #ffdb8a; --mid: #ffb447; --edge: #e07f1e; --tx: #381b02; --halo: rgba(255, 170, 60, 0.5);   --halo-r: 15px; }
.mg-lantern2048 .l48-tile[data-t="32"]   { --core: #ffc36a; --mid: #ff9232; --edge: #d9601a; --tx: #2e1202; --halo: rgba(255, 140, 50, 0.56);  --halo-r: 17px; }
.mg-lantern2048 .l48-tile[data-t="64"]   { --core: #ffa85a; --mid: #f4702a; --edge: #c4440f; --tx: #2a0f02; --halo: rgba(255, 110, 40, 0.62);  --halo-r: 19px; }
.mg-lantern2048 .l48-tile[data-t="128"]  { --core: #ffa05e; --mid: #f05a28; --edge: #a8300c; --tx: #2a0d02; --halo: rgba(255, 96, 40, 0.68);   --halo-r: 21px; --halo-s: 1px; }
.mg-lantern2048 .l48-tile[data-t="256"]  { --core: #9c2411; --mid: #bf3217; --edge: #f0962c; --tx: #fff4dc; --halo: rgba(255, 150, 40, 0.72);  --halo-r: 22px; --halo-s: 1px; --rib: rgba(255, 210, 140, 0.2); --tsh: 0 1px 3px rgba(40, 0, 0, 0.6); }
.mg-lantern2048 .l48-tile[data-t="512"]  { --core: #96200f; --mid: #c02c14; --edge: #ffa83a; --tx: #fff1d0; --halo: rgba(255, 170, 50, 0.8);  --halo-r: 25px; --halo-s: 2px; --rib: rgba(255, 210, 140, 0.22); --tsh: 0 1px 3px rgba(40, 0, 0, 0.6); }
.mg-lantern2048 .l48-tile[data-t="1024"] { --core: #7c1409; --mid: #a81e10; --edge: #ffc84a; --tx: #ffefc4; --halo: rgba(255, 201, 74, 0.9);  --halo-r: 28px; --halo-s: 2px; --rim: rgba(255, 214, 110, 0.55); --rib: rgba(255, 220, 150, 0.26); --tsh: 0 1px 3px rgba(40, 0, 0, 0.65); }
.mg-lantern2048 .l48-tile[data-t="2048"] { --core: #68100a; --mid: #961a0e; --edge: #ffd95e; --tx: #fff3c9; --halo: rgba(255, 214, 90, 1);    --halo-r: 34px; --halo-s: 3px; --rim: rgba(255, 228, 130, 0.85); --rib: rgba(255, 226, 160, 0.3); --tsh: 0 1px 3px rgba(40, 0, 0, 0.7); }
.mg-lantern2048 .l48-tile[data-t="big"]  { --core: #4a0c22; --mid: #7a1238; --edge: #ffe9a8; --tx: #fff6dd; --halo: rgba(255, 236, 170, 1);   --halo-r: 40px; --halo-s: 4px; --rim: rgba(255, 240, 180, 0.9); --rib: rgba(255, 230, 170, 0.32); --tsh: 0 1px 3px rgba(20, 0, 10, 0.75); }
.mg-lantern2048 .l48-tile[data-t="1024"] .l48-lantern,
.mg-lantern2048 .l48-tile[data-t="2048"] .l48-lantern,
.mg-lantern2048 .l48-tile[data-t="big"] .l48-lantern { animation: mg-lantern2048-breathe 2.8s ease-in-out infinite; }
@keyframes mg-lantern2048-breathe {
  0%, 100% { box-shadow: inset 0 0 0 max(1px, calc(var(--cell, 70px) * 0.025)) var(--rim), 0 0 var(--halo-r) var(--halo-s) var(--halo); }
  50% { box-shadow: inset 0 0 0 max(1px, calc(var(--cell, 70px) * 0.025)) var(--rim), 0 0 calc(var(--halo-r) * 1.4) calc(var(--halo-s) + 3px) var(--halo); }
}

/* hint + buttons */
.mg-lantern2048 .l48-hint { margin: 0; text-align: center; font-size: clamp(13px, calc(var(--bs, 320px) * 0.022), 15px); line-height: 1.5; color: #9fb3c8; }
.mg-lantern2048.is-tight .l48-hint { font-size: 12px; line-height: 1.3; }
.mg-lantern2048 .l48-bar { display: flex; gap: 8px; }
.mg-lantern2048 .l48-btn {
  flex: 1 1 0; min-width: 0; height: clamp(38px, calc(var(--bs, 320px) * 0.075), 50px); padding: 0 8px;
  font: inherit; font-size: clamp(13px, calc(var(--bs, 320px) * 0.026), 17px); font-weight: 600; white-space: nowrap;
  color: #ffd978; background: rgba(255, 201, 74, 0.08);
  border: 1px solid rgba(255, 201, 74, 0.42); border-radius: 999px;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}
.mg-lantern2048.is-tight .l48-btn { height: 34px; font-size: 13px; }
.mg-lantern2048 .l48-btn:hover:not(:disabled) { background: rgba(255, 201, 74, 0.18); border-color: rgba(255, 201, 74, 0.7); }
.mg-lantern2048 .l48-btn:disabled { opacity: 0.38; cursor: not-allowed; }
.mg-lantern2048 .l48-btn:focus-visible { outline: 2px solid #eef3f7; outline-offset: 2px; }
.mg-lantern2048 .l48-btn.is-primary { color: #2a1a05; background: #ffc94a; border-color: #ffc94a; }
.mg-lantern2048 .l48-btn.is-primary:hover:not(:disabled) { background: #ffd666; border-color: #ffd666; }

/* win / game-over panel */
.mg-lantern2048 .l48-panel {
  position: absolute; inset: 0; z-index: 10;
  display: flex; align-items: center; justify-content: center; padding: 16px;
  background: rgba(8, 12, 22, 0.62);
  -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
}
.mg-lantern2048 .l48-card {
  width: min(320px, 100%); padding: 20px 18px 18px; text-align: center;
  background: rgba(20, 15, 11, 0.93);
  border: 1px solid rgba(255, 201, 74, 0.3); border-radius: 14px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6), 0 0 44px rgba(255, 201, 74, 0.12);
}
.mg-lantern2048 .l48-card-title {
  margin: 0; font-family: var(--display, "ZCOOL XiaoWei", "Songti SC", serif);
  font-weight: 400; font-size: 32px; line-height: 1.15; color: #ffc94a;
  text-shadow: 0 0 20px rgba(255, 201, 74, 0.4);
}
.mg-lantern2048 .l48-card-sub { margin: 6px 0 0; font-size: 14px; line-height: 1.6; color: #9fb3c8; }
.mg-lantern2048 .l48-badge {
  display: inline-block; margin-top: 10px; padding: 2px 12px;
  font-size: 13px; font-weight: 600; color: #2a1a05; background: #ffc94a; border-radius: 999px;
}
.mg-lantern2048 .l48-stats { display: flex; gap: 8px; margin: 16px 0 0; }
.mg-lantern2048 .l48-stats > div {
  flex: 1 1 0; min-width: 0; padding: 8px 4px;
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(159, 179, 200, 0.16); border-radius: 10px;
}
.mg-lantern2048 .l48-stats dt { margin: 0; font-size: 11px; letter-spacing: 0.08em; color: #9fb3c8; white-space: nowrap; }
.mg-lantern2048 .l48-stats dd { margin: 2px 0 0; font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; color: #eef3f7; }
.mg-lantern2048 .l48-stats .is-main dd { color: #ffc94a; }
.mg-lantern2048 .l48-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 18px; }
.mg-lantern2048 .l48-actions .l48-btn { flex: none; height: 42px; font-size: 14px; }

@media (prefers-reduced-motion: reduce) {
  .mg-lantern2048 .l48-tile { transition: none; }
  .mg-lantern2048 .l48-lantern { animation: none !important; }
  .mg-lantern2048 .l48-btn { transition: none; }
}
`;

  const tierOf = (v) => (v > WIN_TILE ? 'big' : String(v));

  (window.MiniGames = window.MiniGames || []).push({
    id: 'lantern2048',
    title: '灯笼 2048',
    tagline: '合并灯笼，越拼越亮',
    controls: '方向键 · 滑动',
    accent: ACCENT,
    bestLabel: '分',
    lowerIsBetter: false,
    mount(root, api) {
      const style = document.createElement('style');
      style.textContent = CSS;
      root.appendChild(style);

      const wrap = document.createElement('div');
      wrap.className = 'mg-lantern2048';
      wrap.innerHTML = `
        <div class="l48-col">
          <div class="l48-hud">
            <div class="l48-stat is-score"><span class="l48-stat-k">得分</span><span class="l48-stat-v" data-k="score">0</span></div>
            <div class="l48-stat"><span class="l48-stat-k">最高</span><span class="l48-stat-v" data-k="best">0</span></div>
            <div class="l48-stat"><span class="l48-stat-k">最大灯笼</span><span class="l48-stat-v" data-k="max">0</span></div>
          </div>
          <div class="l48-board" role="group" aria-label="灯笼 2048 棋盘">
            <div class="l48-slots"></div>
            <div class="l48-tiles"></div>
          </div>
          <p class="l48-hint">方向键或滑动，合并相同的灯笼</p>
          <div class="l48-bar">
            <button type="button" class="l48-btn" data-k="undo">撤销 (3)</button>
            <button type="button" class="l48-btn" data-k="sound" aria-pressed="true">声音 开</button>
            <button type="button" class="l48-btn is-primary" data-k="new">新的一局</button>
          </div>
        </div>
        <div class="l48-panel" hidden>
          <div class="l48-card" role="dialog" aria-modal="true" aria-label="游戏结果">
            <h2 class="l48-card-title" data-k="title"></h2>
            <p class="l48-card-sub" data-k="sub"></p>
            <span class="l48-badge" data-k="badge" hidden>新纪录</span>
            <dl class="l48-stats">
              <div class="is-main"><dt>得分</dt><dd data-k="pscore">0</dd></div>
              <div><dt>最高</dt><dd data-k="pbest">0</dd></div>
              <div><dt>最大灯笼</dt><dd data-k="pmax">0</dd></div>
            </dl>
            <div class="l48-actions">
              <button type="button" class="l48-btn is-primary" data-k="again">再来一局</button>
              <button type="button" class="l48-btn" data-k="keep">继续玩</button>
            </div>
          </div>
        </div>`;
      root.appendChild(wrap);
      wrap.style.setProperty('--l48-ms', ANIM_MS + 'ms');

      const $ = (k) => wrap.querySelector('[data-k="' + k + '"]');
      const col = wrap.querySelector('.l48-col');
      const board = wrap.querySelector('.l48-board');
      const slotsEl = wrap.querySelector('.l48-slots');
      const tilesEl = wrap.querySelector('.l48-tiles');
      const panel = wrap.querySelector('.l48-panel');
      const el = {
        score: $('score'), best: $('best'), max: $('max'),
        undo: $('undo'), sound: $('sound'), again: $('again'), keep: $('keep'), nw: $('new'),
        title: $('title'), sub: $('sub'), badge: $('badge'),
        pscore: $('pscore'), pbest: $('pbest'), pmax: $('pmax'),
      };

      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const s = document.createElement('div');
          s.className = 'l48-slot';
          s.style.setProperty('--r', r);
          s.style.setProperty('--c', c);
          slotsEl.appendChild(s);
        }
      }

      /* ---------- helpers ---------- */
      const mql = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      const reduced = () => !!(mql && mql.matches);
      const canAnimate = () => !reduced() && typeof Element.prototype.animate === 'function';
      const timers = new Set();
      const later = (fn, ms) => {
        const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
        timers.add(id);
        return id;
      };
      const unlater = (id) => { clearTimeout(id); timers.delete(id); };
      let raf = 0;
      const bestNow = () => {
        let b = null;
        try { b = api.getBest(); } catch (e) { b = null; }
        return Number.isFinite(b) ? b : 0;
      };

      /* ---------- state ---------- */
      let idSeq = 0;
      const S = {
        at: null, // 4x4 of tile objects (model, already includes the spawned tile)
        byId: new Map(), // id -> tile object currently in the DOM
        score: 0, maxTile: 0, undoLeft: UNDO_MAX, snap: null,
        won: false, over: false, hold: false, panel: null, pendingOver: false,
        busy: false, queued: null, pending: null, panelTimer: 0,
        startBest: null, result: null, sound: true,
      };
      const emptyAt = () => Array.from({ length: SIZE }, () => new Array(SIZE).fill(null));
      const valuesOf = () => S.at.map((row) => row.map((t) => (t ? t.v : 0)));

      /* ---------- persistence (optional resume) ---------- */
      function readSave() {
        try {
          const raw = localStorage.getItem(SAVE_KEY);
          return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
      }
      function writeSave() {
        try {
          const game = S.over ? null : {
            grid: valuesOf(), score: S.score, undoLeft: S.undoLeft, won: S.won,
            maxTile: S.maxTile, startBest: S.startBest,
          };
          localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, sound: S.sound, game }));
        } catch (e) { /* storage unavailable */ }
      }
      const isTileValue = (v) => Number.isInteger(v) && v >= 2 && v <= 131072 && (v & (v - 1)) === 0;
      function validGame(g) {
        if (!g || !Array.isArray(g.grid) || g.grid.length !== SIZE) return false;
        let any = false;
        for (const row of g.grid) {
          if (!Array.isArray(row) || row.length !== SIZE) return false;
          for (const v of row) {
            if (v === 0) continue;
            if (!isTileValue(v)) return false;
            any = true;
          }
        }
        if (!any || !hasMoves(g.grid)) return false;
        if (!Number.isInteger(g.score) || g.score < 0) return false;
        if (!Number.isInteger(g.undoLeft) || g.undoLeft < 0 || g.undoLeft > UNDO_MAX) return false;
        return true;
      }

      /* ---------- layout ---------- */
      function setBoard(want) {
        const gap = Math.max(6, Math.round(want * 0.028));
        const cell = Math.max(10, Math.floor((want - gap * 5) / 4));
        const size = cell * 4 + gap * 5;
        wrap.style.setProperty('--bs', size + 'px');
        wrap.style.setProperty('--gap', gap + 'px');
        wrap.style.setProperty('--cell', cell + 'px');
        wrap.classList.toggle('has-label', cell >= 72);
        return size;
      }
      let lastBs = 0;
      function layout() {
        const w = root.clientWidth;
        const h = root.clientHeight;
        if (w < 40 || h < 40) return;
        const tight = h < 580 || w < 340;
        wrap.classList.toggle('is-tight', tight);
        const padX = w < 480 ? 12 : 24;
        const padY = tight ? 6 : 14;
        const cap = Math.max(120, Math.min(w - padX * 2, 680));
        let want = cap;
        let size = setBoard(want);
        for (let i = 0; i < 4; i++) {
          const overhead = col.offsetHeight - board.offsetHeight;
          const next = Math.max(120, Math.min(cap, h - padY * 2 - overhead));
          if (next === want) break;
          want = next;
          size = setBoard(want);
        }
        // fonts scale with the board, so make sure the final stack really fits
        const spill = col.offsetHeight - (h - padY * 2);
        if (spill > 0 && want > 120) size = setBoard(Math.max(120, want - spill));
        if (size !== lastBs) {
          lastBs = size;
          wrap.classList.add('is-sizing');
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => { raf = 0; wrap.classList.remove('is-sizing'); });
        }
      }

      /* ---------- tiles ---------- */
      function paint(t) {
        t.el.dataset.t = tierOf(t.v);
        t.el.dataset.len = String(String(t.v).length);
        t.num.textContent = String(t.v);
        t.lab.textContent = LABELS[t.v] || '星河';
        t.el.setAttribute('aria-label', String(t.v));
      }
      function place(t, r, c) {
        t.r = r; t.c = c;
        t.el.style.setProperty('--r', r);
        t.el.style.setProperty('--c', c);
      }
      function appear(t, delay) {
        if (!canAnimate()) return;
        t.body.animate(
          [{ transform: 'scale(0.25)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
          { duration: 170, delay, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1.2)', fill: 'backwards' }
        );
      }
      function pop(t) {
        if (!canAnimate()) return;
        t.body.animate(
          [
            { transform: 'scale(1)', filter: 'brightness(1)' },
            { transform: 'scale(1.17)', filter: 'brightness(1.3)', offset: 0.45 },
            { transform: 'scale(1)', filter: 'brightness(1)' },
          ],
          { duration: 190, easing: 'ease-out' }
        );
      }
      function createTile(v, r, c, id) {
        const elTile = document.createElement('div');
        elTile.className = 'l48-tile';
        const body = document.createElement('div');
        body.className = 'l48-lantern';
        const num = document.createElement('span');
        num.className = 'l48-num';
        const lab = document.createElement('span');
        lab.className = 'l48-label';
        body.append(num, lab);
        elTile.appendChild(body);
        const t = { id: id || ++idSeq, v, r, c, el: elTile, body, num, lab };
        elTile.dataset.id = String(t.id);
        paint(t);
        place(t, r, c);
        tilesEl.appendChild(elTile);
        S.byId.set(t.id, t);
        return t;
      }
      function removeTile(t, animated) {
        S.byId.delete(t.id);
        if (animated && canAnimate()) {
          const a = t.body.animate(
            [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.3)', opacity: 0 }],
            { duration: 110, easing: 'ease-in', fill: 'forwards' }
          );
          a.onfinish = () => t.el.remove();
        } else {
          t.el.remove();
        }
      }
      function clearTiles() {
        for (const t of S.byId.values()) t.el.remove();
        S.byId.clear();
        S.at = emptyAt();
      }
      function spawnTile(delay) {
        const free = [];
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!S.at[r][c]) free.push([r, c]);
        if (!free.length) return null;
        const [r, c] = free[Math.floor(Math.random() * free.length)];
        const t = createTile(Math.random() < 0.9 ? 2 : 4, r, c);
        S.at[r][c] = t;
        appear(t, delay);
        return t;
      }

      /* ---------- HUD & panel ---------- */
      function updateHud() {
        el.score.textContent = String(S.score);
        el.best.textContent = String(Math.max(bestNow(), S.score));
        el.max.textContent = String(S.maxTile);
        el.undo.textContent = '撤销 (' + S.undoLeft + ')';
        el.undo.disabled = !S.snap || S.undoLeft <= 0 || S.over || S.hold;
        el.sound.textContent = '声音 ' + (S.sound ? '开' : '关');
        el.sound.setAttribute('aria-pressed', S.sound ? 'true' : 'false');
      }
      function floatScore(n) {
        if (!n || !canAnimate()) return;
        const f = document.createElement('span');
        f.className = 'l48-plus';
        f.textContent = '+' + n;
        el.score.parentNode.appendChild(f);
        const a = f.animate(
          [{ opacity: 0, transform: 'translate(-50%, 4px)' }, { opacity: 1, transform: 'translate(-50%, -8px)', offset: 0.25 }, { opacity: 0, transform: 'translate(-50%, -26px)' }],
          { duration: 620, easing: 'ease-out' }
        );
        a.onfinish = () => f.remove();
      }
      function showPanel(mode) {
        S.hold = true;
        S.panel = mode;
        const win = mode === 'win';
        el.title.textContent = win ? '灯火通明' : '灯火暗了';
        el.sub.textContent = win ? '拼出了 2048 灯笼，满街都亮了' : '没有能合并的灯笼了';
        const res = S.result;
        el.badge.hidden = win || !(res && res.isNew);
        el.pscore.textContent = String(S.score);
        el.pbest.textContent = String(win ? Math.max(bestNow(), S.score) : (res ? res.best : Math.max(bestNow(), S.score)));
        el.pmax.textContent = String(S.maxTile);
        el.keep.hidden = !win;
        panel.hidden = false;
        updateHud();
        try { el.again.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
      function hidePanel() {
        panel.hidden = true;
        S.panel = null;
        S.hold = false;
      }

      /* ---------- sound ---------- */
      let actx = null;
      function ensureAudio() {
        if (!S.sound) return;
        if (!actx) {
          try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            actx = new AC();
          } catch (e) { actx = null; return; }
        }
        if (actx.state === 'suspended') {
          try { const p = actx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
        }
      }
      const PENTA = [0, 2, 4, 7, 9];
      function noteFreq(v) {
        const n = Math.max(0, Math.min(14, Math.round(Math.log2(v)) - 2));
        return 261.63 * Math.pow(2, (PENTA[n % 5] + 12 * Math.floor(n / 5)) / 12);
      }
      function tone(freq, delay, vol) {
        const t0 = actx.currentTime + delay;
        const g = actx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
        const o1 = actx.createOscillator();
        o1.type = 'sine';
        o1.frequency.value = freq;
        const o2 = actx.createOscillator();
        o2.type = 'triangle';
        o2.frequency.value = freq * 2;
        const g2 = actx.createGain();
        g2.gain.value = 0.22;
        o1.connect(g);
        o2.connect(g2);
        g2.connect(g);
        g.connect(actx.destination);
        o1.start(t0); o2.start(t0);
        o1.stop(t0 + 0.55); o2.stop(t0 + 0.55);
        o1.onended = () => { try { o1.disconnect(); o2.disconnect(); g2.disconnect(); g.disconnect(); } catch (e) { /* ignore */ } };
      }
      function playMerges(values) {
        if (!S.sound || !actx || actx.state !== 'running') return;
        const top = values.slice().sort((a, b) => b - a).slice(0, 3);
        top.forEach((v, i) => tone(noteFreq(v), i * 0.05, 0.07 / (1 + i * 0.5)));
      }

      /* ---------- game flow ---------- */
      function settle() {
        const p = S.pending;
        if (!p) return;
        S.pending = null;
        unlater(p.timer);
        for (const t of p.absorbed) removeTile(t, false);
        for (const t of p.merged) { paint(t); pop(t); }
        if (p.merged.length) playMerges(p.merged.map((t) => t.v));
        S.busy = false;
        if (p.panel) {
          const mode = p.panel;
          S.panelTimer = later(() => { S.panelTimer = 0; showPanel(mode); }, mode === 'over' ? 520 : 280);
        } else if (S.queued !== null) {
          const d = S.queued;
          S.queued = null;
          requestMove(d);
        }
      }

      function nudge(dir) {
        if (!canAnimate()) return;
        const dx = dir === 0 ? -1 : dir === 2 ? 1 : 0;
        const dy = dir === 1 ? -1 : dir === 3 ? 1 : 0;
        board.animate(
          [{ transform: 'translate(0, 0)' }, { transform: 'translate(' + dx * 4 + 'px,' + dy * 4 + 'px)', offset: 0.4 }, { transform: 'translate(0, 0)' }],
          { duration: 130, easing: 'ease-out' }
        );
      }

      function requestMove(dir) {
        if (S.over || S.hold) return;
        if (S.busy) { S.queued = dir; return; }
        doMove(dir);
      }

      function doMove(dir) {
        const res = slideGrid(valuesOf(), dir);
        if (!res.moved) { nudge(dir); return; }

        const snapTiles = [];
        for (const t of S.byId.values()) snapTiles.push({ id: t.id, v: t.v, r: t.r, c: t.c });
        S.snap = { tiles: snapTiles, score: S.score, maxTile: S.maxTile, won: S.won };

        const next = emptyAt();
        const absorbed = [];
        const merged = [];
        for (const m of res.trace) {
          const t = S.at[m.fr][m.fc];
          if (m.merge) {
            const survivor = next[m.tr][m.tc];
            survivor.v *= 2; // model only; repainted when the slide ends
            merged.push(survivor);
            absorbed.push(t);
            t.el.classList.add('is-under');
          } else {
            next[m.tr][m.tc] = t;
          }
          place(t, m.tr, m.tc);
        }
        S.at = next;
        S.score += res.gained;
        const animate = canAnimate();
        spawnTile(animate ? ANIM_MS * 0.85 : 0);
        for (const t of S.byId.values()) if (t.v > S.maxTile) S.maxTile = t.v;
        floatScore(res.gained);

        const dead = !hasMoves(valuesOf());
        const win = !S.won && merged.some((t) => t.v >= WIN_TILE);
        let panelMode = null;
        if (win) {
          S.won = true;
          S.hold = true;
          S.pendingOver = dead;
          panelMode = 'win';
        } else if (dead) {
          S.hold = true;
          finishGame();
          panelMode = 'over';
        }

        S.busy = true;
        S.pending = { absorbed, merged, panel: panelMode, timer: 0 };
        updateHud();
        writeSave();
        if (animate) S.pending.timer = later(settle, ANIM_MS + 10);
        else settle();
      }

      // Called once per finished game: records the score and prepares the result data.
      function finishGame() {
        S.over = true;
        let r = null;
        try { r = api.submitScore(S.score); } catch (e) { r = null; }
        const best = r && Number.isFinite(r.best) ? r.best : Math.max(bestNow(), S.score);
        const isNew = !!(r && r.isNew) || (best === S.score && S.score > 0 && (S.startBest === null || S.score > S.startBest));
        S.result = { best, isNew };
        writeSave();
      }

      // Progress counts: bank the running score if the board is abandoned or restarted mid-game.
      function bankProgress() {
        if (S.over || S.score <= 0) return;
        try { api.submitScore(S.score); } catch (e) { /* ignore */ }
      }

      function undo() {
        if (S.busy) { S.queued = null; settle(); }
        if (!S.snap || S.undoLeft <= 0 || S.over || S.hold) return;
        const snap = S.snap;
        S.snap = null;
        S.undoLeft--;
        const inSnap = new Set(snap.tiles.map((s) => s.id));
        for (const t of Array.from(S.byId.values())) if (!inSnap.has(t.id)) removeTile(t, true);
        S.at = emptyAt();
        for (const s of snap.tiles) {
          let t = S.byId.get(s.id);
          if (t) {
            t.v = s.v;
            paint(t);
            t.el.classList.remove('is-under');
            place(t, s.r, s.c);
          } else {
            t = createTile(s.v, s.r, s.c, s.id);
            appear(t, 0);
          }
          S.at[s.r][s.c] = t;
        }
        S.score = snap.score;
        S.maxTile = snap.maxTile;
        S.won = snap.won;
        updateHud();
        writeSave();
      }

      function newGame(fromSave) {
        bankProgress();
        if (S.pending) { unlater(S.pending.timer); S.pending = null; }
        if (S.panelTimer) { unlater(S.panelTimer); S.panelTimer = 0; }
        hidePanel();
        clearTiles();
        Object.assign(S, {
          score: 0, maxTile: 0, undoLeft: UNDO_MAX, snap: null, won: false, over: false,
          hold: false, panel: null, pendingOver: false, busy: false, queued: null, result: null,
        });
        S.startBest = bestNow() > 0 ? bestNow() : null;
        if (fromSave) {
          const g = fromSave;
          for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
              if (g.grid[r][c]) S.at[r][c] = createTile(g.grid[r][c], r, c);
            }
          }
          S.score = g.score;
          S.undoLeft = g.undoLeft;
          S.won = !!g.won;
          S.startBest = Number.isFinite(g.startBest) ? g.startBest : null;
        } else {
          spawnTile(0);
          spawnTile(0);
        }
        for (const t of S.byId.values()) if (t.v > S.maxTile) S.maxTile = t.v;
        if (fromSave && Number.isFinite(fromSave.maxTile) && fromSave.maxTile > S.maxTile) S.maxTile = fromSave.maxTile;
        updateHud();
        writeSave();
      }

      /* ---------- input ---------- */
      function onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const tg = e.target;
        if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
        const dir = KEYMAP[e.code] !== undefined ? KEYMAP[e.code] : KEYMAP[e.key];
        if (dir === undefined) return;
        e.preventDefault();
        if (e.repeat) return;
        ensureAudio();
        requestMove(dir);
      }
      window.addEventListener('keydown', onKey);

      let sw = null;
      const swipeMin = () => Math.max(20, Math.round((lastBs || 300) * 0.06));
      function swipeDir(dx, dy) {
        return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 0) : (dy > 0 ? 3 : 1);
      }
      board.addEventListener('pointerdown', (e) => {
        ensureAudio();
        if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
        sw = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
        try { board.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });
      board.addEventListener('pointermove', (e) => {
        if (!sw || sw.done || e.pointerId !== sw.id) return;
        const dx = e.clientX - sw.x;
        const dy = e.clientY - sw.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < swipeMin()) return;
        sw.done = true;
        requestMove(swipeDir(dx, dy));
      });
      const endSwipe = (e) => {
        if (!sw || e.pointerId !== sw.id) return;
        if (!sw.done && e.type === 'pointerup') {
          const dx = e.clientX - sw.x;
          const dy = e.clientY - sw.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) >= swipeMin()) requestMove(swipeDir(dx, dy));
        }
        sw = null;
      };
      board.addEventListener('pointerup', endSwipe);
      board.addEventListener('pointercancel', endSwipe);

      el.undo.addEventListener('click', () => { ensureAudio(); undo(); });
      el.nw.addEventListener('click', () => { ensureAudio(); newGame(null); });
      el.again.addEventListener('click', () => { ensureAudio(); newGame(null); });
      el.keep.addEventListener('click', () => {
        hidePanel();
        if (S.pendingOver) {
          S.pendingOver = false;
          if (!hasMoves(valuesOf())) { finishGame(); showPanel('over'); return; }
        }
        updateHud();
      });
      el.sound.addEventListener('click', () => {
        S.sound = !S.sound;
        if (S.sound) { ensureAudio(); if (actx && actx.state === 'running') tone(noteFreq(8), 0, 0.06); }
        updateHud();
        writeSave();
      });

      /* ---------- boot ---------- */
      let ro = null;
      if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(() => layout());
        ro.observe(root);
      }
      layout();

      const saved = readSave();
      if (saved && typeof saved.sound === 'boolean') S.sound = saved.sound;
      S.at = emptyAt();
      newGame(saved && validGame(saved.game) ? saved.game : null);
      layout();

      return function cleanup() {
        window.removeEventListener('keydown', onKey);
        if (ro) { ro.disconnect(); ro = null; }
        for (const id of timers) clearTimeout(id);
        timers.clear();
        cancelAnimationFrame(raf);
        raf = 0;
        bankProgress();
        if (actx) {
          try { const p = actx.close(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
          actx = null;
        }
        wrap.remove();
        style.remove();
      };
    },
  });
})();
