(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 舞龙 — a snake game dressed as a Lunar New Year dragon dance.
   * Registers itself on window.MiniGames; everything lives inside `root`.
   * ------------------------------------------------------------------ */

  const TAU = Math.PI * 2;
  const RED = '#e5484d';
  const RED_DEEP = '#a82a33';
  const RED_DARK = '#7a1d26';
  const GOLD = '#ffc94a';
  const GOLD_DEEP = '#c98b12';
  const GOLD_DARK = '#8a5c0a';
  const GOLD_LIGHT = '#ffe8a3';
  const BOARD = '#101d33';

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const KEYS = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };

  const BASE_STEP = 150;      // ms per cell at the start
  const MIN_STEP = 78;        // never faster than this
  const STEP_DROP = 2.4;      // ms shaved off per extra segment
  const GRACE_START = 550;    // pause before the first move of a round
  const GRACE_RESUME = 400;   // pause after resuming
  const BONUS_MS = 6000;
  const BONUS_CHANCE = 1 / 8;
  const POINTS = { ball: 10, ingot: 30, pearl: 50 };
  const START_LEN = 3;

  const FACTS = [
    '舞龙是春节、元宵等节庆里常见的民俗表演，在不少地方代代相传。',
    '舞龙时，龙身由许多节连成，每位舞者举一根杆，要一起配合着起伏摆动。',
    '舞龙又叫耍龙灯，龙身常用竹篾扎出骨架、蒙上彩布，有的夜里还会点灯。',
    '舞龙时常有人举着龙珠在前面引路，龙头追着珠子上下翻飞。',
  ];

  const REASONS = {
    wall: '龙头撞上了围墙。',
    self: '龙身缠到了自己。',
    full: '整条龙铺满了场地，舞得漂亮！',
  };

  const CSS = `
.mg-dragon, .mg-dragon *, .mg-dragon *::before, .mg-dragon *::after { box-sizing: border-box; }
.mg-dragon {
  --d-red: #e5484d;
  --d-gold: #ffc94a;
  --d-ink: var(--ink, #eef3f7);
  --d-mist: var(--mist, #9fb3c8);
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--d-ink);
  font-family: var(--body, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif);
  background:
    radial-gradient(ellipse 90% 60% at 50% -15%, rgba(229, 72, 77, 0.13), transparent 75%),
    var(--night, #0b1424);
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}
.mg-dragon [hidden] { display: none !important; }
.mg-dragon button { font: inherit; color: inherit; margin: 0; cursor: pointer; }
.mg-dragon button:focus-visible { outline: 2px solid var(--d-gold); outline-offset: 3px; }
.mg-dragon .sr {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* ---------- HUD ---------- */
.mg-dragon .hud {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px 6px;
}
.mg-dragon .stats { display: flex; gap: 6px 18px; min-width: 0; }
.mg-dragon .stat { display: flex; flex-direction: column; gap: 1px; min-width: 44px; }
.mg-dragon .stat .k { font-size: 11px; line-height: 1.2; letter-spacing: 0.14em; color: var(--d-mist); }
.mg-dragon .stat .v {
  font-size: 20px; font-weight: 600; line-height: 1.15;
  font-variant-numeric: tabular-nums;
  color: var(--d-ink);
}
.mg-dragon .stat.score .v { color: var(--d-gold); }
.mg-dragon .tools { display: flex; gap: 8px; flex: none; }
.mg-dragon .chip {
  min-height: 32px;
  padding: 4px 13px;
  font-size: 13px;
  line-height: 1.2;
  white-space: nowrap;
  color: var(--d-mist);
  background: rgba(238, 243, 247, 0.05);
  border: 1px solid rgba(159, 179, 200, 0.3);
  border-radius: 999px;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.mg-dragon .chip:hover:not(:disabled) { color: var(--d-ink); border-color: var(--d-mist); }
.mg-dragon .chip:disabled { opacity: 0.4; cursor: default; }
.mg-dragon .chip[aria-pressed="false"] { opacity: 0.7; }

/* ---------- board + pad ---------- */
.mg-dragon .body { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }
.mg-dragon .field {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  touch-action: none;
}
.mg-dragon canvas {
  display: block;
  touch-action: none;
  border-radius: 8px;
  background: ${BOARD};
  box-shadow: 0 0 0 1px rgba(255, 201, 74, 0.32), 0 0 30px rgba(229, 72, 77, 0.1);
  outline: 1px solid rgba(229, 72, 77, 0.38);
  outline-offset: 5px;
}

.mg-dragon .dpad { display: none; flex: none; }
.mg-dragon.pad .dpad {
  display: grid;
  grid-template-columns: repeat(3, 60px);
  grid-template-rows: repeat(2, 54px);
  gap: 6px;
  justify-content: center;
  align-content: center;
  padding: 4px 0 max(12px, env(safe-area-inset-bottom));
}
.mg-dragon .dpad button {
  display: grid;
  place-items: center;
  padding: 0;
  color: var(--d-ink);
  background: rgba(229, 72, 77, 0.16);
  border: 1px solid rgba(229, 72, 77, 0.55);
  border-radius: 14px;
  touch-action: manipulation;
  transition: background 0.1s ease;
}
.mg-dragon .dpad button:active { background: rgba(229, 72, 77, 0.5); }
.mg-dragon .dpad svg { width: 26px; height: 26px; display: block; pointer-events: none; }
.mg-dragon .dpad [data-dir="up"] { grid-column: 2; grid-row: 1; }
.mg-dragon .dpad [data-dir="left"] { grid-column: 1; grid-row: 2; }
.mg-dragon .dpad [data-dir="down"] { grid-column: 2; grid-row: 2; }
.mg-dragon .dpad [data-dir="right"] { grid-column: 3; grid-row: 2; }
.mg-dragon .dpad [data-dir="down"] svg { transform: rotate(180deg); }
.mg-dragon .dpad [data-dir="left"] svg { transform: rotate(-90deg); }
.mg-dragon .dpad [data-dir="right"] svg { transform: rotate(90deg); }
.mg-dragon.pad.side .body { flex-direction: row; }
.mg-dragon.pad.side .dpad { padding: 0 max(16px, env(safe-area-inset-right)) 0 4px; }

/* ---------- overlay panels ---------- */
.mg-dragon .overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgba(7, 12, 24, 0.5);
}
.mg-dragon .panel {
  width: min(404px, 100%);
  max-height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 22px 22px 20px;
  text-align: center;
  background: rgba(12, 22, 40, 0.88);
  border: 1px solid rgba(159, 179, 200, 0.2);
  border-radius: 14px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  animation: mg-dragon-pop 0.22s ease-out;
}
@keyframes mg-dragon-pop {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
.mg-dragon .eyebrow { margin: 0; font-size: 12px; letter-spacing: 0.24em; color: var(--d-mist); }
.mg-dragon .title {
  margin: 0;
  font-family: var(--display, "ZCOOL XiaoWei", "Songti SC", "STSong", serif);
  font-weight: 400;
  font-size: 44px;
  line-height: 1.05;
  color: var(--d-gold);
  text-shadow: 0 0 22px rgba(255, 201, 74, 0.35), 0 2px 0 rgba(122, 29, 38, 0.8);
}
.mg-dragon .title.sm { font-size: 34px; }
.mg-dragon .rules { margin: 0; font-size: 14px; line-height: 1.75; color: var(--d-ink); }
.mg-dragon .legend {
  margin: 0; padding: 0; list-style: none;
  display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 14px;
  font-size: 13px; color: var(--d-mist);
  font-variant-numeric: tabular-nums;
}
.mg-dragon .legend li { display: inline-flex; align-items: center; gap: 6px; }
.mg-dragon .legend i {
  width: 11px; height: 11px; border-radius: 50%; display: inline-block;
  background: radial-gradient(circle at 35% 30%, #ff9a9d, var(--d-red) 55%, #a82a33);
}
.mg-dragon .legend i.g { background: radial-gradient(circle at 35% 30%, #fff3c4, var(--d-gold) 55%, #b97d0e); }
.mg-dragon .hint { margin: 0; font-size: 13px; line-height: 1.7; color: var(--d-mist); }
.mg-dragon .touch-only { display: none; }
.mg-dragon.pad .touch-only { display: inline; }
.mg-dragon.pad .kbd-only { display: none; }
.mg-dragon .btn {
  min-height: 44px;
  padding: 10px 30px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #fff;
  background: #d23b41;
  border: 1px solid rgba(255, 201, 74, 0.6);
  border-radius: 999px;
  box-shadow: 0 6px 20px rgba(229, 72, 77, 0.28);
  transition: background 0.15s ease, transform 0.15s ease;
}
.mg-dragon .btn:hover { background: #dd444a; }
.mg-dragon .btn:active { transform: translateY(1px); }
.mg-dragon .reason { margin: -4px 0 0; font-size: 14px; color: var(--d-mist); }
.mg-dragon .result {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 12px 6px;
  border-top: 1px solid rgba(159, 179, 200, 0.16);
  border-bottom: 1px solid rgba(159, 179, 200, 0.16);
}
.mg-dragon .result div { display: flex; flex-direction: column; gap: 2px; }
.mg-dragon .result .k { font-size: 12px; letter-spacing: 0.14em; color: var(--d-mist); }
.mg-dragon .result b {
  font-size: 28px; font-weight: 600; line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--d-ink);
}
.mg-dragon .result div:first-child b { color: var(--d-gold); }
.mg-dragon .badge {
  margin: -2px 0 0;
  padding: 3px 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #2a1604;
  background: var(--d-gold);
  border-radius: 999px;
}
.mg-dragon .fact { margin: 0; font-size: 13px; line-height: 1.75; color: var(--d-mist); text-align: left; }
.mg-dragon .fact b { display: block; margin-bottom: 2px; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; color: var(--d-gold); }

@media (pointer: coarse) {
  .mg-dragon .chip { min-height: 38px; padding: 4px 15px; }
}
@media (max-height: 560px) {
  .mg-dragon .panel { gap: 8px; padding: 14px 18px 14px; }
  .mg-dragon .title { font-size: 34px; }
  .mg-dragon .title.sm { font-size: 28px; }
  .mg-dragon .result { padding: 8px 6px; }
  .mg-dragon .result b { font-size: 24px; }
  .mg-dragon .rules, .mg-dragon .fact { line-height: 1.6; }
}
@media (max-height: 440px) {
  .mg-dragon .panel { gap: 6px; padding: 10px 16px 12px; }
  .mg-dragon .title { font-size: 28px; }
  .mg-dragon .title.sm { font-size: 24px; }
  .mg-dragon .eyebrow, .mg-dragon .legend { display: none; }
  .mg-dragon .result { padding: 6px 4px; }
  .mg-dragon .result b { font-size: 20px; }
  .mg-dragon .fact { font-size: 12px; line-height: 1.5; }
  .mg-dragon .btn { min-height: 38px; padding: 6px 26px; }
}
@media (prefers-reduced-motion: reduce) {
  .mg-dragon .panel { animation: none; }
  .mg-dragon .btn, .mg-dragon .chip, .mg-dragon .dpad button { transition: none; }
}
`;

  const ARROW_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 15.5 12 9l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const TEMPLATE = `
<div class="hud">
  <div class="stats">
    <div class="stat score"><span class="k">得分</span><span class="v" data-ref="score">0</span></div>
    <div class="stat"><span class="k">长度</span><span class="v" data-ref="len">3</span></div>
    <div class="stat"><span class="k">最高</span><span class="v" data-ref="best">—</span></div>
  </div>
  <div class="tools">
    <button type="button" class="chip" data-ref="sound" aria-pressed="true">声音 开</button>
    <button type="button" class="chip" data-ref="pause" disabled>暂停</button>
  </div>
</div>
<div class="body">
  <div class="field" data-ref="field">
    <canvas data-ref="cv" role="img" aria-label="舞龙场地"></canvas>
  </div>
  <div class="dpad" role="group" aria-label="方向键">
    <button type="button" data-dir="up" aria-label="向上">${ARROW_SVG}</button>
    <button type="button" data-dir="left" aria-label="向左">${ARROW_SVG}</button>
    <button type="button" data-dir="down" aria-label="向下">${ARROW_SVG}</button>
    <button type="button" data-dir="right" aria-label="向右">${ARROW_SVG}</button>
  </div>
  <div class="overlay" data-ref="overlay">
    <section class="panel" data-panel="start" aria-label="开始">
      <p class="eyebrow">夜市 · 舞龙</p>
      <h2 class="title">舞龙</h2>
      <p class="rules">引龙头吃红绣球，龙身越舞越长；撞墙或咬到自己就收场。金宝物限时出现，抢到加分更多。</p>
      <ul class="legend">
        <li><i></i>绣球 +10</li>
        <li><i class="g"></i>金元宝 +30</li>
        <li><i class="g"></i>金珠 +50</li>
      </ul>
      <p class="hint"><span class="kbd-only">方向键 / WASD 转向，滑动也行，P 暂停</span><span class="touch-only">滑动屏幕或点下方方向键转向</span></p>
      <button type="button" class="btn" data-act="start">开始舞龙</button>
    </section>
    <section class="panel" data-panel="pause" aria-label="已暂停" hidden>
      <h2 class="title sm">已暂停</h2>
      <p class="rules">歇口气。按 P 或点下面的按钮继续。</p>
      <button type="button" class="btn" data-act="resume">继续舞龙</button>
    </section>
    <section class="panel" data-panel="over" aria-label="本局结果" hidden>
      <h2 class="title sm">这一曲舞完了</h2>
      <p class="reason" data-ref="reason"></p>
      <div class="result">
        <div><span class="k">得分</span><b data-ref="rScore">0</b></div>
        <div><span class="k">长度</span><b data-ref="rLen">0</b></div>
        <div><span class="k">最高</span><b data-ref="rBest">0</b></div>
      </div>
      <p class="badge" data-ref="badge" hidden>新纪录</p>
      <p class="fact"><b>舞龙小知识</b><span data-ref="fact"></span></p>
      <button type="button" class="btn" data-act="again">再来一局</button>
    </section>
  </div>
</div>
<div class="sr" role="status" aria-live="polite" data-ref="live"></div>
`;

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const copyCell = (c) => ({ x: c.x, y: c.y });
  const stepFor = (len) => Math.max(MIN_STEP, BASE_STEP - (len - START_LEN) * STEP_DROP);

  // Rounded-rect path without relying on ctx.roundRect (older Safari).
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  (window.MiniGames = window.MiniGames || []).push({
    id: 'dragon',
    title: '舞龙',
    tagline: '引着金龙吃绣球，越舞越长',
    controls: '方向键 · 滑动',
    accent: '#e5484d',
    bestLabel: '分',
    lowerIsBetter: false,
    mount(root, api) {
      const win = window;
      const doc = root.ownerDocument || document;

      /* ---------- DOM ---------- */
      const style = doc.createElement('style');
      style.textContent = CSS;
      root.appendChild(style);
      const wrap = doc.createElement('div');
      wrap.className = 'mg-dragon';
      wrap.innerHTML = TEMPLATE;
      root.appendChild(wrap);

      const ref = (name) => wrap.querySelector('[data-ref="' + name + '"]');
      const field = ref('field');
      const canvas = ref('cv');
      const overlay = ref('overlay');
      const elScore = ref('score');
      const elLen = ref('len');
      const elBest = ref('best');
      const btnSound = ref('sound');
      const btnPause = ref('pause');
      const live = ref('live');
      const panels = Array.from(wrap.querySelectorAll('[data-panel]'));
      const ctx = canvas.getContext('2d');
      const bgCv = doc.createElement('canvas');

      const mqReduce = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
      const mqCoarse = win.matchMedia ? win.matchMedia('(pointer: coarse)') : null;
      const reduced = () => !!(mqReduce && mqReduce.matches);

      /* ---------- state ---------- */
      let disposed = false;
      let raf = 0;
      let last = performance.now();
      let needsLayout = true;

      let state = 'ready'; // ready | playing | paused | over
      let locked = false;  // grid dimensions are fixed once a round has begun
      let cols = 20, rows = 14, cell = 24, dpr = 1;

      let snake = [], prev = [];
      let dir = DIRS.right;
      let queue = [];
      let headSeq = 0;     // colour parity travels with each segment
      let pending = 0;     // growth still owed
      let food = null, bonus = null;
      let score = 0;
      let best = null;
      let submitted = false;
      let acc = 0, graceLeft = 0, gameTime = 0, danceT = 0;
      let stepMs = BASE_STEP;
      let headAngle = 0;
      let flash = 0;
      let particles = [], popups = [];
      let lastHud = '';
      let fontFamily = '';

      let soundOn = true;
      let audio = null;
      const timers = new Set();

      try { best = api.getBest(); } catch (e) { best = null; }
      if (typeof best !== 'number' || !isFinite(best)) best = null;

      /* ---------- audio ---------- */
      function ensureAudio() {
        if (audio || !soundOn || disposed) return;
        try {
          const AC = win.AudioContext || win.webkitAudioContext;
          if (AC) audio = new AC();
        } catch (e) { audio = null; }
      }
      function blip(freq, dur, type, vol, delay, slideTo) {
        if (!audio || !soundOn) return;
        try {
          if (audio.state === 'suspended') audio.resume();
          const t0 = audio.currentTime + (delay || 0);
          const o = audio.createOscillator();
          const g = audio.createGain();
          o.type = type || 'square';
          o.frequency.setValueAtTime(freq, t0);
          if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(vol || 0.05, t0 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
          o.connect(g);
          g.connect(audio.destination);
          o.start(t0);
          o.stop(t0 + dur + 0.03);
        } catch (e) { /* audio is optional */ }
      }
      const sfx = {
        start() { blip(523, 0.09, 'triangle', 0.06); blip(784, 0.14, 'triangle', 0.06, 0.09); },
        eat() { blip(660, 0.07, 'triangle', 0.07); blip(880, 0.1, 'triangle', 0.07, 0.06); },
        gold() { blip(784, 0.08, 'triangle', 0.07); blip(988, 0.08, 'triangle', 0.07, 0.07); blip(1319, 0.16, 'triangle', 0.07, 0.14); },
        die() { blip(330, 0.4, 'sawtooth', 0.05, 0, 70); },
      };

      /* ---------- helpers ---------- */
      function later(fn, ms) {
        const id = setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms);
        timers.add(id);
      }

      function updateHud() {
        const key = score + '|' + snake.length + '|' + best;
        if (key === lastHud) return;
        lastHud = key;
        elScore.textContent = String(score);
        elLen.textContent = String(snake.length);
        elBest.textContent = best === null ? '—' : String(best);
      }

      function showPanel(name) {
        overlay.hidden = !name;
        for (const p of panels) p.hidden = p.dataset.panel !== name;
      }
      function focusBtn(act) {
        const b = wrap.querySelector('[data-act="' + act + '"]');
        if (b && !b.closest('[hidden]')) { try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      }
      function syncPauseBtn() {
        btnPause.disabled = !(state === 'playing' || state === 'paused');
        btnPause.textContent = state === 'paused' ? '继续' : '暂停';
      }

      /* ---------- grid / layout ---------- */
      function pickGrid(W, H) {
        let c = clamp(Math.round(Math.min(W, H) / 18), 14, 32);
        c = Math.max(c, Math.ceil(W / 40), Math.ceil(H / 30)); // keep huge stages from producing huge grids
        while (c > 8 && (Math.floor(W / c) < 10 || Math.floor(H / c) < 10)) c--;
        cell = c;
        cols = clamp(Math.floor(W / c), 8, 40);
        rows = clamp(Math.floor(H / c), 8, 30);
      }

      function buildBg() {
        const w = cols * cell, h = rows * cell;
        bgCv.width = Math.round(w * dpr);
        bgCv.height = Math.round(h * dpr);
        const b = bgCv.getContext('2d');
        b.setTransform(dpr, 0, 0, dpr, 0, 0);
        b.fillStyle = BOARD;
        b.fillRect(0, 0, w, h);
        b.fillStyle = 'rgba(255,255,255,0.02)';
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) if ((x + y) & 1) b.fillRect(x * cell, y * cell, cell, cell);
        }
        b.strokeStyle = 'rgba(159,179,200,0.075)';
        b.lineWidth = 1;
        b.beginPath();
        const px = (v) => Math.round(v * dpr) / dpr + 0.5 / dpr;
        for (let x = 1; x < cols; x++) { b.moveTo(px(x * cell), 0); b.lineTo(px(x * cell), h); }
        for (let y = 1; y < rows; y++) { b.moveTo(0, px(y * cell)); b.lineTo(w, px(y * cell)); }
        b.stroke();
        const vg = b.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.3)');
        b.fillStyle = vg;
        b.fillRect(0, 0, w, h);
        // faint 回-style inner frame with gold corner ticks
        const inset = Math.max(2, Math.round(cell * 0.14));
        b.strokeStyle = 'rgba(255,201,74,0.16)';
        b.strokeRect(inset + 0.5, inset + 0.5, w - inset * 2 - 1, h - inset * 2 - 1);
        b.strokeStyle = 'rgba(255,201,74,0.4)';
        b.lineWidth = 2;
        const L = Math.max(6, cell * 0.7);
        b.beginPath();
        for (const [cx, cy, sx, sy] of [[inset, inset, 1, 1], [w - inset, inset, -1, 1], [inset, h - inset, 1, -1], [w - inset, h - inset, -1, -1]]) {
          b.moveTo(cx + sx * L, cy); b.lineTo(cx, cy); b.lineTo(cx, cy + sy * L);
        }
        b.stroke();
      }

      function applySize() {
        const w = cols * cell, h = rows * cell;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        canvas.width = Math.max(1, Math.round(w * dpr));
        canvas.height = Math.max(1, Math.round(h * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildBg();
      }

      function fieldSize() {
        return { W: Math.floor(field.clientWidth) - 16, H: Math.floor(field.clientHeight) - 16 };
      }

      function layout() {
        if (disposed) return;
        const rw = root.clientWidth, rh = root.clientHeight;
        if (!rw || !rh) return;
        const pad = !!(mqCoarse && mqCoarse.matches) || rw < 560;
        wrap.classList.toggle('pad', pad);
        wrap.classList.toggle('side', pad && rw >= 640 && rh < 560);
        const { W, H } = fieldSize();
        if (W < 24 || H < 24) return;
        dpr = Math.min(2, win.devicePixelRatio || 1);
        if (!locked) {
          pickGrid(W, H);
          applySize();
          resetGame();
        } else {
          cell = Math.max(4, Math.floor(Math.min(W / cols, H / rows)));
          applySize();
        }
      }

      /* ---------- game logic ---------- */
      function freeCell(minDist) {
        const occ = new Uint8Array(cols * rows);
        for (const s of snake) occ[s.y * cols + s.x] = 1;
        if (food) occ[food.y * cols + food.x] = 1;
        if (bonus) occ[bonus.y * cols + bonus.x] = 1;
        let list = [];
        const h = snake[0];
        for (let i = 0; i < occ.length; i++) {
          if (occ[i]) continue;
          if (minDist && h && Math.abs((i % cols) - h.x) + Math.abs(((i / cols) | 0) - h.y) < minDist) continue;
          list.push(i);
        }
        if (!list.length && minDist) return freeCell(0);
        if (!list.length) return null;
        const i = list[Math.floor(Math.random() * list.length)];
        return { x: i % cols, y: (i / cols) | 0 };
      }

      function resetGame() {
        const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
        dir = DIRS.right;
        queue = [];
        headSeq = 0;
        pending = 0;
        snake = [];
        for (let i = 0; i < START_LEN; i++) snake.push({ x: cx - i, y: cy });
        prev = snake.map(copyCell);
        score = 0;
        food = null;
        bonus = null;
        food = freeCell(5);
        particles = [];
        popups = [];
        acc = 0;
        graceLeft = 0;
        gameTime = 0;
        flash = 0;
        stepMs = stepFor(START_LEN);
        headAngle = 0;
        submitted = false;
        updateHud();
      }

      function startRound() {
        ensureAudio();
        const { W, H } = fieldSize();
        if (W >= 24 && H >= 24) {
          dpr = Math.min(2, win.devicePixelRatio || 1);
          pickGrid(W, H);
          applySize();
        }
        locked = true;
        resetGame();
        state = 'playing';
        graceLeft = GRACE_START;
        showPanel(null);
        syncPauseBtn();
        live.textContent = '';
        sfx.start();
      }

      function pauseGame() {
        if (state !== 'playing') return;
        state = 'paused';
        syncPauseBtn();
        showPanel('pause');
        focusBtn('resume');
      }
      function resumeGame() {
        if (state !== 'paused') return;
        ensureAudio();
        state = 'playing';
        graceLeft = GRACE_RESUME;
        showPanel(null);
        syncPauseBtn();
      }
      function togglePause() {
        if (state === 'playing') pauseGame();
        else if (state === 'paused') resumeGame();
      }

      function turn(name) {
        if (state !== 'playing') return;
        const d = DIRS[name];
        const ref0 = queue.length ? queue[queue.length - 1] : dir;
        if (d === ref0 || (d.x === -ref0.x && d.y === -ref0.y)) return;
        if (queue.length >= 2) return;
        queue.push(d);
      }

      function sparks(cx, cy, colors, n) {
        if (reduced()) return;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU;
          const sp = cell * (2 + Math.random() * 3.5);
          particles.push({
            x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 0, max: 380 + Math.random() * 320,
            r: Math.max(1.5, cell * (0.06 + Math.random() * 0.06)),
            color: colors[i % colors.length],
          });
        }
      }

      function spawnBonus() {
        const c = freeCell(0);
        if (!c) return;
        const kind = Math.random() < 0.62 ? 'ingot' : 'pearl';
        bonus = { x: c.x, y: c.y, kind, points: POINTS[kind], until: gameTime + BONUS_MS };
      }

      function die(reason) {
        if (state === 'over') return;
        state = 'over';
        prev = snake.map(copyCell);
        queue = [];
        flash = reduced() ? 0 : 1;
        syncPauseBtn();
        sfx.die();
        let res = null;
        if (!submitted) {
          submitted = true;
          try { res = api.submitScore(score); } catch (e) { res = null; }
        }
        let isNew = false;
        if (res && typeof res.best === 'number' && isFinite(res.best)) best = res.best;
        if (res && res.isNew) isNew = true;
        updateHud();
        const finalScore = score, finalLen = snake.length;
        live.textContent = '本局结束，得分 ' + finalScore + '，长度 ' + finalLen;
        later(() => {
          if (state !== 'over') return;
          ref('reason').textContent = REASONS[reason] || '';
          ref('rScore').textContent = String(finalScore);
          ref('rLen').textContent = String(finalLen);
          ref('rBest').textContent = best === null ? String(finalScore) : String(best);
          ref('badge').hidden = !(isNew && finalScore > 0);
          ref('fact').textContent = FACTS[Math.floor(Math.random() * FACTS.length)];
          showPanel('over');
          focusBtn('again');
        }, reduced() ? 60 : 520);
      }

      function tick() {
        if (queue.length) dir = queue.shift();
        const h = snake[0];
        const nx = h.x + dir.x, ny = h.y + dir.y;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) { die('wall'); return; }

        const eatBall = !!food && nx === food.x && ny === food.y;
        const eatBonus = !!bonus && nx === bonus.x && ny === bonus.y;
        let grow = 0;
        if (eatBall) grow += 1;
        if (eatBonus) grow += 2;
        const growing = pending + grow > 0;
        // the tail cell is vacated this step unless the dragon is growing
        const limit = growing ? snake.length : snake.length - 1;
        for (let i = 0; i < limit; i++) {
          if (snake[i].x === nx && snake[i].y === ny) { die('self'); return; }
        }

        const old = snake.map(copyCell);
        snake.unshift({ x: nx, y: ny });
        pending += grow;
        if (growing) {
          pending--;
          prev = old.concat([copyCell(old[old.length - 1])]);
        } else {
          snake.pop();
          prev = old;
        }
        headSeq++;

        const cx = (nx + 0.5) * cell, cy = (ny + 0.5) * cell;
        if (eatBall) {
          score += POINTS.ball;
          popups.push({ x: cx, y: cy, text: '+' + POINTS.ball, age: 0, life: 800, gold: false });
          sparks(cx, cy, [RED, GOLD, '#ff8f93'], 10);
          sfx.eat();
          food = null;
          food = freeCell(0);
          if (!food) { stepMs = stepFor(snake.length); updateHud(); die('full'); return; }
          if (!bonus && Math.random() < BONUS_CHANCE) spawnBonus();
        }
        if (eatBonus) {
          score += bonus.points;
          popups.push({ x: cx, y: cy, text: '+' + bonus.points, age: 0, life: 1000, gold: true });
          sparks(cx, cy, [GOLD, GOLD_LIGHT, '#fff'], 16);
          sfx.gold();
          bonus = null;
        }
        stepMs = stepFor(snake.length);
        updateHud();
      }

      /* ---------- drawing ---------- */
      function drawBall(x, y, c, t) {
        const pulse = reduced() ? 1 : 1 + 0.06 * Math.sin(t / 240);
        const r = c * 0.37 * pulse;
        const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, c * 0.95);
        glow.addColorStop(0, 'rgba(229,72,77,0.34)');
        glow.addColorStop(1, 'rgba(229,72,77,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(x, y, c * 0.95, 0, TAU); ctx.fill();
        // tassel
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = Math.max(1, c * 0.055);
        ctx.lineCap = 'round';
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.moveTo(x + k * r * 0.2, y + r * 0.85);
          ctx.lineTo(x + k * r * 0.62, y + r + c * 0.13);
          ctx.stroke();
        }
        // ball
        const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
        g.addColorStop(0, '#ffa3a6');
        g.addColorStop(0.5, RED);
        g.addColorStop(1, RED_DEEP);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        // gold silk stitching
        ctx.strokeStyle = 'rgba(255,214,102,0.95)';
        ctx.lineWidth = Math.max(1, c * 0.045);
        ctx.beginPath(); ctx.ellipse(x, y, r * 0.48, r * 0.98, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r * 0.98, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        // knot on top
        ctx.fillStyle = GOLD;
        ctx.beginPath(); ctx.arc(x, y - r - c * 0.02, Math.max(1.5, c * 0.07), 0, TAU); ctx.fill();
      }

      function drawIngot(x, y, c) {
        const s = c * 1.08;
        ctx.save();
        ctx.translate(x, y + c * 0.03);
        ctx.lineJoin = 'round';
        const hull = ctx.createLinearGradient(0, -0.15 * s, 0, 0.28 * s);
        hull.addColorStop(0, '#ffd95e');
        hull.addColorStop(1, GOLD_DEEP);
        ctx.beginPath();
        ctx.moveTo(-0.46 * s, -0.14 * s);
        ctx.quadraticCurveTo(-0.42 * s, 0.17 * s, -0.25 * s, 0.27 * s);
        ctx.lineTo(0.25 * s, 0.27 * s);
        ctx.quadraticCurveTo(0.42 * s, 0.17 * s, 0.46 * s, -0.14 * s);
        ctx.quadraticCurveTo(0, 0.1 * s, -0.46 * s, -0.14 * s);
        ctx.closePath();
        ctx.fillStyle = hull; ctx.fill();
        ctx.lineWidth = Math.max(1, c * 0.05);
        ctx.strokeStyle = GOLD_DARK; ctx.stroke();
        const dome = ctx.createLinearGradient(0, -0.3 * s, 0, 0.06 * s);
        dome.addColorStop(0, '#fff2b8');
        dome.addColorStop(1, GOLD);
        ctx.beginPath();
        ctx.moveTo(-0.27 * s, 0.03 * s);
        ctx.bezierCurveTo(-0.27 * s, -0.33 * s, 0.27 * s, -0.33 * s, 0.27 * s, 0.03 * s);
        ctx.quadraticCurveTo(0, 0.13 * s, -0.27 * s, 0.03 * s);
        ctx.closePath();
        ctx.fillStyle = dome; ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      function drawPearl(x, y, c, t) {
        const r = c * 0.31;
        const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, c * 0.9);
        glow.addColorStop(0, 'rgba(255,201,74,0.38)');
        glow.addColorStop(1, 'rgba(255,201,74,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(x, y, c * 0.9, 0, TAU); ctx.fill();
        const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
        g.addColorStop(0, '#fffbe4');
        g.addColorStop(0.45, GOLD);
        g.addColorStop(1, GOLD_DEEP);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = GOLD_DARK;
        ctx.lineWidth = Math.max(1, c * 0.04);
        ctx.stroke();
        // sparkle
        const k = reduced() ? 1 : 0.75 + 0.25 * Math.sin(t / 180);
        const sx = x + r * 0.95, sy = y - r * 0.95, sr = c * 0.17 * k;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(sx, sy - sr); ctx.lineTo(sx + sr * 0.28, sy - sr * 0.28); ctx.lineTo(sx + sr, sy);
        ctx.lineTo(sx + sr * 0.28, sy + sr * 0.28); ctx.lineTo(sx, sy + sr); ctx.lineTo(sx - sr * 0.28, sy + sr * 0.28);
        ctx.lineTo(sx - sr, sy); ctx.lineTo(sx - sr * 0.28, sy - sr * 0.28);
        ctx.closePath(); ctx.fill();
      }

      function drawBonus(c, t) {
        const remain = bonus.until - gameTime;
        const x = (bonus.x + 0.5) * c, y = (bonus.y + 0.5) * c;
        let alpha = 1;
        if (remain < 2200) {
          alpha = reduced() ? 0.6 : (Math.floor(remain / 140) % 2 ? 0.35 : 1);
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        if (bonus.kind === 'ingot') drawIngot(x, y, c);
        else drawPearl(x, y, c, t);
        // time ring
        const frac = clamp(remain / BONUS_MS, 0, 1);
        ctx.strokeStyle = 'rgba(255,233,163,0.85)';
        ctx.lineWidth = Math.max(1.5, c * 0.07);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y, c * 0.56, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
        ctx.stroke();
        ctx.restore();
      }

      function drawSegment(x, y, s, red) {
        const fill = red ? RED : GOLD;
        const edge = red ? RED_DARK : GOLD_DARK;
        rr(ctx, x - s / 2, y - s / 2, s, s, s * 0.34);
        const g = ctx.createLinearGradient(x, y - s / 2, x, y + s / 2);
        g.addColorStop(0, red ? '#f26b70' : '#ffe083');
        g.addColorStop(0.55, fill);
        g.addColorStop(1, red ? RED_DEEP : GOLD_DEEP);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = edge;
        ctx.stroke();
        if (s >= 12) {
          // a little scale arc and a bead of the other colour
          ctx.strokeStyle = red ? 'rgba(255,224,131,0.85)' : 'rgba(168,42,51,0.8)';
          ctx.lineWidth = Math.max(1, s * 0.09);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(x, y + s * 0.14, s * 0.25, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        }
      }

      function drawHead(x, y, ang, c, t, dead) {
        const u = c * 1.2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const lw = Math.max(1, u * 0.07);

        // whiskers
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = lw;
        const wob = reduced() || dead ? 0 : Math.sin(t / 190) * u * 0.04;
        for (const sgn of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(u * 0.4, sgn * u * 0.17);
          ctx.quadraticCurveTo(u * 0.92, sgn * (u * 0.1 + wob), u * 0.86, sgn * (u * 0.6 + wob));
          ctx.stroke();
        }
        // horns
        ctx.fillStyle = GOLD_LIGHT;
        ctx.strokeStyle = GOLD_DARK;
        ctx.lineWidth = Math.max(0.75, u * 0.035);
        for (const sgn of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(u * 0.06, sgn * u * 0.3);
          ctx.quadraticCurveTo(-u * 0.2, sgn * u * 0.8, -u * 0.62, sgn * u * 0.64);
          ctx.quadraticCurveTo(-u * 0.34, sgn * u * 0.46, -u * 0.2, sgn * u * 0.3);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
        }
        // golden mane at the back of the head
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(-u * 0.46, 0, u * 0.25, Math.PI * 0.5, Math.PI * 1.5);
        ctx.closePath();
        ctx.fill();
        // head
        rr(ctx, -u * 0.5, -u * 0.43, u * 0.98, u * 0.86, u * 0.32);
        const hg = ctx.createLinearGradient(0, -u * 0.43, 0, u * 0.43);
        hg.addColorStop(0, '#f56a6f');
        hg.addColorStop(0.5, RED);
        hg.addColorStop(1, RED_DEEP);
        ctx.fillStyle = hg;
        ctx.fill();
        ctx.lineWidth = Math.max(1, u * 0.045);
        ctx.strokeStyle = RED_DARK;
        ctx.stroke();
        // gold muzzle
        rr(ctx, u * 0.14, -u * 0.3, u * 0.42, u * 0.6, u * 0.2);
        const mg = ctx.createLinearGradient(0, -u * 0.3, 0, u * 0.3);
        mg.addColorStop(0, '#ffe083');
        mg.addColorStop(1, GOLD_DEEP);
        ctx.fillStyle = mg;
        ctx.fill();
        ctx.lineWidth = Math.max(0.75, u * 0.035);
        ctx.strokeStyle = GOLD_DARK;
        ctx.stroke();
        // nostrils
        ctx.fillStyle = GOLD_DARK;
        for (const sgn of [-1, 1]) {
          ctx.beginPath(); ctx.arc(u * 0.45, sgn * u * 0.1, Math.max(0.8, u * 0.04), 0, TAU); ctx.fill();
        }
        // eyes
        const er = Math.max(1.9, u * 0.15);
        for (const sgn of [-1, 1]) {
          const ex = -u * 0.02, ey = sgn * u * 0.25;
          if (dead) {
            ctx.strokeStyle = '#1b0b0d';
            ctx.lineWidth = Math.max(1.2, u * 0.06);
            const d = er * 0.8;
            ctx.beginPath();
            ctx.moveTo(ex - d, ey - d); ctx.lineTo(ex + d, ey + d);
            ctx.moveTo(ex - d, ey + d); ctx.lineTo(ex + d, ey - d);
            ctx.stroke();
          } else {
            ctx.fillStyle = '#fffaf0';
            ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
            ctx.fillStyle = '#1b0b0d';
            ctx.beginPath(); ctx.arc(ex + er * 0.3, ey, er * 0.55, 0, TAU); ctx.fill();
          }
        }
        ctx.restore();
      }

      function drawDragon(a, now, dead) {
        const n = snake.length, c = cell;
        const bx = new Array(n), by = new Array(n);
        for (let i = 0; i < n; i++) {
          const s = snake[i], p = prev[i] || s;
          bx[i] = (p.x + (s.x - p.x) * a + 0.5) * c;
          by[i] = (p.y + (s.y - p.y) * a + 0.5) * c;
        }
        let px = bx, py = by;
        if (!reduced() && (state === 'playing' || state === 'ready' || state === 'paused')) {
          px = new Array(n); py = new Array(n);
          px[0] = bx[0]; py[0] = by[0];
          for (let i = 1; i < n; i++) {
            const j = i - 1, k = Math.min(n - 1, i + 1);
            let dx = bx[j] - bx[k], dy = by[j] - by[k];
            const len = Math.hypot(dx, dy) || 1;
            dx /= len; dy /= len;
            const off = Math.sin(danceT * 0.0075 - i * 0.85) * c * 0.075 * Math.min(1, i / 3);
            px[i] = bx[i] - dy * off;
            py[i] = by[i] + dx * off;
          }
        }
        // dark cloth connecting the segments
        if (n > 1) {
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.strokeStyle = RED_DARK;
          ctx.lineWidth = c * 0.5;
          ctx.beginPath();
          ctx.moveTo(px[n - 1], py[n - 1]);
          for (let i = n - 2; i >= 0; i--) ctx.lineTo(px[i], py[i]);
          ctx.stroke();
        }
        for (let i = n - 1; i >= 1; i--) {
          const sc = 0.96 - 0.26 * ((i - 1) / Math.max(1, n - 2));
          drawSegment(px[i], py[i], c * sc, ((headSeq - i) & 1) === 0);
        }
        drawHead(px[0], py[0], headAngle, c, now, dead);
      }

      function draw(now) {
        const w = cols * cell, h = rows * cell;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(bgCv, 0, 0, w, h);
        const a = clamp(acc / stepMs, 0, 1);

        if (food) drawBall((food.x + 0.5) * cell, (food.y + 0.5) * cell, cell, now);
        if (bonus) drawBonus(cell, now);
        drawDragon(a, now, state === 'over');

        for (const p of particles) {
          const k = 1 - p.life / p.max;
          ctx.globalAlpha = Math.max(0, k);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + k * 0.5), 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (popups.length) {
          if (!fontFamily) fontFamily = win.getComputedStyle(wrap).fontFamily || 'sans-serif';
          ctx.font = '600 ' + Math.max(12, Math.round(cell * 0.62)) + 'px ' + fontFamily;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineJoin = 'round';
          for (const p of popups) {
            const k = p.age / p.life;
            const rise = reduced() ? cell * 0.7 : cell * (0.5 + k * 0.9);
            ctx.globalAlpha = k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.4);
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(11,20,36,0.85)';
            ctx.strokeText(p.text, p.x, p.y - rise);
            ctx.fillStyle = p.gold ? GOLD : '#fff';
            ctx.fillText(p.text, p.x, p.y - rise);
          }
          ctx.globalAlpha = 1;
        }

        if (flash > 0) {
          ctx.fillStyle = 'rgba(229,72,77,' + (0.32 * flash).toFixed(3) + ')';
          ctx.fillRect(0, 0, w, h);
        }
      }

      /* ---------- main loop ---------- */
      function frame(now) {
        if (disposed) return;
        raf = requestAnimationFrame(frame);
        let dt = now - last;
        last = now;
        if (!(dt > 0)) dt = 0;
        if (dt > 100) dt = 100;

        if (needsLayout) { needsLayout = false; layout(); }

        if (state === 'playing') {
          if (graceLeft > 0) {
            graceLeft -= dt;
          } else {
            gameTime += dt;
            acc += dt;
            let n = 0;
            while (acc >= stepMs && state === 'playing' && n < 6) {
              acc -= stepMs;
              tick();
              n++;
            }
            if (n >= 6) acc = Math.min(acc, stepMs);
            if (bonus && gameTime >= bonus.until) bonus = null;
          }
        }
        if (state === 'playing' || state === 'ready') danceT += dt;

        // ease the head towards its heading
        const target = Math.atan2(dir.y, dir.x);
        let d = target - headAngle;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        headAngle += reduced() ? d : d * Math.min(1, dt / 70);

        if (particles.length) {
          for (const p of particles) { p.life += dt; p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.vx *= 0.97; p.vy *= 0.97; }
          particles = particles.filter((p) => p.life < p.max);
        }
        if (popups.length) {
          for (const p of popups) p.age += dt;
          popups = popups.filter((p) => p.age < p.life);
        }
        if (flash > 0) flash = Math.max(0, flash - dt / 420);

        draw(now);
      }

      /* ---------- input ---------- */
      function onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const name = KEYS[e.code];
        if (name) {
          if (state === 'playing') { e.preventDefault(); turn(name); }
          return;
        }
        if (e.code === 'KeyP' && !e.repeat) togglePause();
      }
      function onVis() {
        if (doc.hidden) pauseGame();
      }

      // swipe
      let swipe = null;
      function onDown(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
        try { field.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      function onMove(e) {
        if (!swipe || e.pointerId !== swipe.id) return;
        const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
        const th = Math.max(16, cell * 0.8);
        if (Math.abs(dx) < th && Math.abs(dy) < th) return;
        turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        swipe.x = e.clientX;
        swipe.y = e.clientY;
      }
      function onUp(e) {
        if (swipe && e.pointerId === swipe.id) swipe = null;
      }
      field.addEventListener('pointerdown', onDown);
      field.addEventListener('pointermove', onMove);
      field.addEventListener('pointerup', onUp);
      field.addEventListener('pointercancel', onUp);
      field.addEventListener('contextmenu', (e) => e.preventDefault());

      // on-screen pad
      for (const b of wrap.querySelectorAll('.dpad [data-dir]')) {
        b.addEventListener('pointerdown', (e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          e.preventDefault();
          turn(b.dataset.dir);
        });
        b.addEventListener('click', (e) => {
          if (e.detail === 0) turn(b.dataset.dir); // keyboard activation only
        });
      }

      // buttons
      wrap.querySelector('[data-act="start"]').addEventListener('click', startRound);
      wrap.querySelector('[data-act="again"]').addEventListener('click', startRound);
      wrap.querySelector('[data-act="resume"]').addEventListener('click', resumeGame);
      btnPause.addEventListener('click', togglePause);
      btnSound.addEventListener('click', () => {
        soundOn = !soundOn;
        btnSound.textContent = soundOn ? '声音 开' : '声音 关';
        btnSound.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
        if (soundOn) { ensureAudio(); blip(660, 0.08, 'triangle', 0.06); }
      });

      win.addEventListener('keydown', onKey);
      doc.addEventListener('visibilitychange', onVis);

      /* ---------- resize ---------- */
      let ro = null;
      const onWinResize = () => { needsLayout = true; };
      let usingWinResize = false;
      if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(() => { needsLayout = true; });
        ro.observe(root);
        ro.observe(field);
      } else {
        usingWinResize = true;
        win.addEventListener('resize', onWinResize);
      }

      /* ---------- boot ---------- */
      layout();
      if (!snake.length) { // root had no size yet; build a placeholder so the first frames can draw
        pickGrid(320, 320);
        resetGame();
        applySize();
      }
      syncPauseBtn();
      showPanel('start');
      focusBtn('start');
      last = performance.now();
      raf = requestAnimationFrame(frame);

      return function cleanup() {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(raf);
        win.removeEventListener('keydown', onKey);
        doc.removeEventListener('visibilitychange', onVis);
        if (usingWinResize) win.removeEventListener('resize', onWinResize);
        if (ro) { ro.disconnect(); ro = null; }
        timers.forEach((id) => clearTimeout(id));
        timers.clear();
        if (audio) {
          try { const p = audio.close(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
          audio = null;
        }
        wrap.remove();
        style.remove();
      };
    },
  });
})();
