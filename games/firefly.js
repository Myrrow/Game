(() => {
  'use strict';

  const CSS = `
.mg-firefly {
  --night: #0b1424;
  --glow: #e3f07a;
  --gold: #ffc94a;
  --sting: #ff8a5c;
  --mist: #9fb3c8;
  --ink: #eef3f7;
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--night);
  color: var(--ink);
  font-family: var(--body, system-ui, sans-serif);
}
.mg-firefly .hud {
  display: flex;
  align-items: center;
  gap: 8px 22px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(159, 179, 200, 0.14);
  font-variant-numeric: tabular-nums;
}
.mg-firefly .stat { display: flex; align-items: baseline; gap: 6px; }
.mg-firefly .label { font-size: 12px; letter-spacing: 0.08em; color: var(--mist); }
.mg-firefly .value { font-size: 18px; font-weight: 600; min-width: 2ch; }
.mg-firefly .value.glow { color: var(--glow); }
.mg-firefly .value.warn { color: var(--sting); }
.mg-firefly .mult { font-size: 13px; color: var(--gold); margin-left: 2px; }
.mg-firefly .spacer { flex: 1; }
.mg-firefly .hud button {
  font: 12px var(--body, system-ui, sans-serif);
  color: var(--mist);
  background: transparent;
  border: 1px solid rgba(159, 179, 200, 0.3);
  border-radius: 999px;
  padding: 4px 12px;
  cursor: pointer;
}
.mg-firefly .hud button:hover { color: var(--ink); border-color: var(--mist); }
.mg-firefly .stage { position: relative; flex: 1; min-height: 0; }
.mg-firefly canvas { position: absolute; inset: 0; display: block; touch-action: none; cursor: none; }
.mg-firefly .overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
}
.mg-firefly .panel {
  width: 100%;
  max-width: 400px;
  margin: auto;
  padding: 26px 24px 22px;
  background: rgba(11, 20, 36, 0.78);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(227, 240, 122, 0.18);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mg-firefly .eyebrow { margin: 0; font-size: 12px; letter-spacing: 0.2em; color: var(--mist); }
.mg-firefly h1 {
  margin: 0;
  font-family: var(--display, serif);
  font-weight: 400;
  font-size: clamp(36px, 10vw, 50px);
  line-height: 1.05;
  color: var(--glow);
  text-shadow: 0 0 18px rgba(227, 240, 122, 0.45);
}
.mg-firefly .lede { margin: 0; line-height: 1.7; }
.mg-firefly .legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 14px; }
.mg-firefly .legend li { display: flex; align-items: center; gap: 10px; }
.mg-firefly .dot { width: 12px; height: 12px; border-radius: 50%; flex: none; }
.mg-firefly .pts { margin-left: auto; color: var(--mist); font-variant-numeric: tabular-nums; }
.mg-firefly .dot.fly { background: var(--glow); box-shadow: 0 0 10px 2px rgba(227, 240, 122, 0.7); }
.mg-firefly .dot.dim { background: rgba(159, 179, 200, 0.35); }
.mg-firefly .dot.gold { background: var(--gold); box-shadow: 0 0 10px 2px rgba(255, 201, 74, 0.7); }
.mg-firefly .dot.wasp { background: var(--sting); border-radius: 3px; }
.mg-firefly .big { display: flex; align-items: baseline; gap: 8px; font-variant-numeric: tabular-nums; }
.mg-firefly .big span { font-family: var(--display, serif); font-size: 64px; line-height: 1; color: var(--glow); text-shadow: 0 0 22px rgba(227, 240, 122, 0.5); }
.mg-firefly .big small { color: var(--mist); font-size: 16px; }
.mg-firefly .verdict { margin: 0; font-family: var(--display, serif); font-size: 22px; }
.mg-firefly .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0; }
.mg-firefly .stats div { display: flex; flex-direction: column; gap: 2px; }
.mg-firefly .stats dt { font-size: 12px; color: var(--mist); letter-spacing: 0.06em; }
.mg-firefly .stats dd { margin: 0; font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.mg-firefly .fact {
  margin: 0;
  padding-top: 12px;
  border-top: 1px solid rgba(159, 179, 200, 0.16);
  font-size: 13px;
  line-height: 1.7;
  color: var(--mist);
}
.mg-firefly .cta {
  align-self: flex-start;
  font: 600 16px var(--body, system-ui, sans-serif);
  color: var(--night);
  background: var(--glow);
  border: none;
  border-radius: 999px;
  padding: 11px 28px;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(227, 240, 122, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.mg-firefly .cta:hover { transform: translateY(-1px); box-shadow: 0 0 28px rgba(227, 240, 122, 0.55); }
.mg-firefly button:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
.mg-firefly .hint { margin: 0; font-size: 12px; color: var(--mist); line-height: 1.6; }
@media (prefers-reduced-motion: reduce) {
  .mg-firefly .cta { transition: none; }
  .mg-firefly .cta:hover { transform: none; }
}`;

  const HTML = `
<div class="hud">
  <div class="stat"><span class="label">得分</span><span class="value glow" data-k="score">0</span></div>
  <div class="stat"><span class="label">剩余</span><span class="value" data-k="time">60</span><span class="label">秒</span></div>
  <div class="stat"><span class="label">连击</span><span class="value" data-k="combo">0</span><span class="mult" data-k="mult">×1</span></div>
  <div class="spacer"></div>
  <div class="stat"><span class="label">最高</span><span class="value" data-k="best">0</span></div>
  <button type="button" data-k="sound" aria-pressed="true">声音：开</button>
</div>
<div class="stage" data-k="wrap">
  <canvas data-k="cvs" aria-label="夏夜捕萤游戏画面"></canvas>
  <div class="overlay" data-k="overlay">
    <div class="panel" role="dialog" aria-label="夏夜捕萤">
      <p class="eyebrow" data-k="eyebrow">六月 · 池塘边 · 一分钟</p>
      <h1 data-k="title">夏夜捕萤</h1>
      <p class="lede" data-k="lede">提着玻璃罐，接住正在发光的萤火虫。暗下去的那一瞬间，它们是抓不到的。</p>
      <ul class="legend" data-k="legend">
        <li><span class="dot fly"></span>发光的萤火虫<span class="pts">+1 × 倍数</span></li>
        <li><span class="dot dim"></span>熄灭的萤火虫<span class="pts">抓不到</span></li>
        <li><span class="dot gold"></span>金色萤火虫，闪得更快<span class="pts">+5 × 倍数</span></li>
        <li><span class="dot wasp"></span>胡蜂，会追着罐子飞<span class="pts">−3 秒</span></li>
      </ul>
      <div data-k="result" hidden>
        <div class="big"><span data-k="rScore">0</span><small>分</small></div>
        <p class="verdict" data-k="rVerdict"></p>
        <dl class="stats">
          <div><dt>捕到</dt><dd data-k="rCaught">0</dd></div>
          <div><dt>最高连击</dt><dd data-k="rCombo">0</dd></div>
          <div><dt>最高分</dt><dd data-k="rBest">0</dd></div>
        </dl>
        <p class="fact" data-k="rFact"></p>
      </div>
      <button type="button" class="cta" data-k="btn">开始捕萤</button>
      <p class="hint" data-k="hint">鼠标或手指移动罐子，也可以用方向键 / WASD。连续捕捉会提高倍数，最高 ×5。按 P 暂停。</p>
    </div>
  </div>
</div>`;

  const FACTS = [
    '萤火虫的光几乎不产生热量，所以被叫作“冷光”。',
    '不同种类的萤火虫有各自的闪光节奏，它们靠这种节奏辨认同类、寻找伴侣。',
    '很多萤火虫的幼虫生活在水边或潮湿的草丛里，以蜗牛为食。',
    '城市灯光会干扰萤火虫的求偶闪光，这是它们数量减少的原因之一。',
    '“囊萤夜读”说的是晋代的车胤，家贫无油，便把萤火虫装进纱袋照明读书。',
  ];

  const TAU = Math.PI * 2;
  const ROUND = 60;
  const COMBO_WINDOW = 1.8;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
  function seeded(seed) {
    return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function glowSprite(rgb, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size / 2;
    const rg = g.createRadialGradient(r, r, 0, r, r, r);
    rg.addColorStop(0, 'rgba(255,255,235,1)');
    rg.addColorStop(0.1, `rgba(${rgb},1)`);
    rg.addColorStop(0.35, `rgba(${rgb},0.28)`);
    rg.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = rg;
    g.fillRect(0, 0, size, size);
    return c;
  }
  let SPR = null;

  function mount(root, api) {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!SPR) SPR = { fly: glowSprite('214,240,110', 96), gold: glowSprite('255,196,70', 96), sting: glowSprite('255,138,92', 96) };

    const el = document.createElement('div');
    el.className = 'mg-firefly';
    const style = document.createElement('style');
    style.textContent = CSS;
    el.innerHTML = HTML;
    root.append(style, el);
    const ui = {};
    el.querySelectorAll('[data-k]').forEach((n) => { ui[n.dataset.k] = n; });
    const cvs = ui.cvs;
    const ctx = cvs.getContext('2d');
    const wrap = ui.wrap;

    // listeners on window/document are tracked so cleanup can remove them
    const offs = [];
    const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); offs.push(() => target.removeEventListener(type, fn, opts)); };

    // ---------- audio ----------
    let ac = null;
    let soundOn = true;
    function ensureAudio() {
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
      if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    }
    function tone(type, f0, f1, dur, vol) {
      if (!ac || !soundOn) return;
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    const chime = (combo, gold) => {
      const f = (gold ? 784 : 587) * Math.pow(2, Math.min(combo, 14) / 12);
      tone('sine', f, f * 1.01, gold ? 0.5 : 0.32, 0.1);
      if (gold) tone('sine', f * 1.5, f * 1.5, 0.4, 0.05);
    };
    const buzz = () => tone('sawtooth', 160, 70, 0.28, 0.07);

    // ---------- world ----------
    let W = 0, H = 0, DPR = 1;
    const bg = document.createElement('canvas');
    const S = {
      mode: 'title', score: 0, time: ROUND, combo: 0, comboT: 0, maxCombo: 0, caught: 0,
      best: api.getBest() || 0, elapsed: 0, spawnCd: 0,
      flies: [], wasps: [], parts: [], pops: [], jarLights: [],
      jar: { x: 0, y: 0, tx: 0, ty: 0, r: 30, hurt: 0, tilt: 0 },
      keys: {}, pointerActive: false,
    };

    const flyTarget = () => clamp(Math.round((W * H) / 38000), 8, 18);
    function waspTarget() {
      if (S.mode !== 'play') return 0;
      const cap = W < 520 ? 2 : 3;
      return Math.min(cap, S.elapsed < 12 ? 1 : S.elapsed < 32 ? 2 : 3);
    }

    function spawnFly(anywhere) {
      const gold = Math.random() < 0.09;
      S.flies.push({
        x: rand(30, W - 30),
        y: anywhere ? rand(30, H - 60) : rand(H * 0.25, H - 50),
        a: rand(0, TAU),
        sp: gold ? rand(75, 100) : rand(28, 58),
        ph: rand(0, TAU),
        per: gold ? rand(0.85, 1.2) : rand(1.7, 3.1),
        gold, fade: 0, b: 0,
      });
    }

    function spawnWasp() {
      const side = Math.floor(rand(0, 4));
      let x, y;
      if (side === 0) { x = -30; y = rand(0, H * 0.8); }
      else if (side === 1) { x = W + 30; y = rand(0, H * 0.8); }
      else if (side === 2) { x = -30; y = rand(H * 0.1, H * 0.5); }
      else { x = rand(0, W); y = -30; }
      const aim = Math.atan2(rand(H * 0.3, H * 0.7) - y, rand(W * 0.3, W * 0.7) - x);
      S.wasps.push({ x, y, a: aim, life: rand(4, 7), t: rand(0, 10) });
    }

    // ---------- background ----------
    function drawBg() {
      bg.width = Math.max(1, Math.round(W * DPR));
      bg.height = Math.max(1, Math.round(H * DPR));
      const b = bg.getContext('2d');
      b.setTransform(DPR, 0, 0, DPR, 0, 0);
      const rnd = seeded(20260603);

      const sky = b.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#060c18');
      sky.addColorStop(0.55, '#10203a');
      sky.addColorStop(1, '#1a3142');
      b.fillStyle = sky;
      b.fillRect(0, 0, W, H);

      const n = Math.round((W * H) / 2600);
      for (let i = 0; i < n; i++) {
        const x = rnd() * W, y = Math.pow(rnd(), 1.6) * H * 0.65;
        b.fillStyle = `rgba(238,243,247,${0.12 + rnd() * 0.5})`;
        const s = rnd() < 0.08 ? 1.8 : 1;
        b.fillRect(x, y, s, s);
      }

      const mx = W * 0.8, my = clamp(H * 0.14, 50, 100), mr = 16;
      const halo = b.createRadialGradient(mx, my, mr, mx, my, mr * 7);
      halo.addColorStop(0, 'rgba(243,239,214,0.18)');
      halo.addColorStop(1, 'rgba(243,239,214,0)');
      b.fillStyle = halo;
      b.fillRect(mx - mr * 7, my - mr * 7, mr * 14, mr * 14);
      b.fillStyle = '#f3efd6';
      b.beginPath(); b.arc(mx, my, mr, 0, TAU); b.fill();
      b.fillStyle = 'rgba(200,196,170,0.35)';
      b.beginPath(); b.arc(mx - 5, my - 3, 3.5, 0, TAU); b.arc(mx + 4, my + 5, 2.5, 0, TAU); b.fill();

      b.fillStyle = '#0c1727';
      b.beginPath();
      b.moveTo(0, H);
      const base = H * 0.78;
      for (let x = 0; x <= W + 20; x += 14) b.lineTo(x, base - 20 - Math.sin(x * 0.012) * 18 - rnd() * 22);
      b.lineTo(W, H);
      b.closePath();
      b.fill();

      const py = H * 0.86;
      b.fillStyle = '#0f2233';
      b.fillRect(0, py - 18, W, H - py + 18);
      b.fillStyle = 'rgba(243,239,214,0.12)';
      for (let i = 0; i < 6; i++) {
        const w = 40 - i * 5;
        b.fillRect(mx - w / 2 + (rnd() - 0.5) * 8, py - 12 + i * 6, w, 1.5);
      }

      b.fillStyle = '#050a13';
      for (let x = -10; x < W + 10; x += 4) {
        const reed = rnd() < 0.05;
        const h = reed ? 70 + rnd() * 50 : 14 + rnd() * 42;
        const lean = (rnd() - 0.5) * (reed ? 14 : 22);
        b.beginPath();
        b.moveTo(x - 2, H);
        b.quadraticCurveTo(x + lean * 0.3, H - h * 0.6, x + lean, H - h);
        b.quadraticCurveTo(x + lean * 0.3 + 1.5, H - h * 0.6, x + 2.5, H);
        b.fill();
        if (reed) {
          b.beginPath();
          b.ellipse(x + lean * 0.95, H - h + 10, 3, 9, lean * 0.02, 0, TAU);
          b.fill();
        }
      }
    }

    function resize() {
      const r = wrap.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      cvs.width = Math.round(W * DPR);
      cvs.height = Math.round(H * DPR);
      cvs.style.width = W + 'px';
      cvs.style.height = H + 'px';
      S.jar.r = W < 520 ? 26 : 30;
      if (!S.jar.x) { S.jar.x = S.jar.tx = W / 2; S.jar.y = S.jar.ty = H * 0.68; }
      S.jar.tx = clamp(S.jar.tx, S.jar.r, W - S.jar.r);
      S.jar.ty = clamp(S.jar.ty, S.jar.r + 10, H - S.jar.r - 10);
      for (const f of S.flies) { f.x = clamp(f.x, 10, W - 10); f.y = clamp(f.y, 10, H - 40); }
      drawBg();
      while (S.flies.length < flyTarget()) { spawnFly(true); if (S.mode === 'title') S.flies[S.flies.length - 1].fade = 1; }
    }

    // ---------- game flow ----------
    function startGame() {
      ensureAudio();
      Object.assign(S, {
        mode: 'play', score: 0, time: ROUND, combo: 0, comboT: 0, maxCombo: 0, caught: 0,
        elapsed: 0, wasps: [], parts: [], pops: [], jarLights: [],
      });
      S.jar.hurt = 0;
      while (S.flies.length < flyTarget()) spawnFly(true);
      ui.overlay.hidden = true;
      last = performance.now();
    }

    function verdict(s) {
      if (s < 15) return '罐底几点微光';
      if (s < 50) return '够照亮一页书';
      if (s < 110) return '一罐子会呼吸的光';
      if (s < 180) return '照亮了半片池塘';
      return '提着一盏夏夜的灯笼';
    }

    function endGame() {
      S.mode = 'over';
      S.wasps = [];
      const res = api.submitScore(S.score);
      S.best = res.best || 0;
      ui.eyebrow.textContent = res.isNew ? '新纪录' : '时间到';
      ui.title.textContent = '这一罐萤光';
      ui.lede.hidden = true;
      ui.legend.hidden = true;
      ui.result.hidden = false;
      ui.rScore.textContent = S.score;
      ui.rVerdict.textContent = verdict(S.score);
      ui.rCaught.textContent = S.caught + ' 只';
      ui.rCombo.textContent = S.maxCombo;
      ui.rBest.textContent = S.best;
      ui.rFact.textContent = FACTS[Math.floor(Math.random() * FACTS.length)];
      ui.btn.textContent = '再来一局';
      ui.hint.hidden = true;
      ui.overlay.hidden = false;
      ui.btn.focus();
    }

    function pause() {
      if (S.mode !== 'play') return;
      S.mode = 'paused';
      S.keys = {};
      ui.eyebrow.textContent = '暂停中';
      ui.title.textContent = '萤火还在等你';
      ui.lede.hidden = false;
      ui.lede.textContent = `目前 ${S.score} 分，还剩 ${Math.ceil(S.time)} 秒。`;
      ui.legend.hidden = true;
      ui.result.hidden = true;
      ui.btn.textContent = '继续';
      ui.hint.hidden = true;
      ui.overlay.hidden = false;
      ui.btn.focus();
    }

    function resume() {
      ensureAudio();
      S.mode = 'play';
      ui.overlay.hidden = true;
      last = performance.now();
    }

    ui.btn.addEventListener('click', () => { if (S.mode === 'paused') resume(); else startGame(); });
    ui.sound.addEventListener('click', () => {
      soundOn = !soundOn;
      ui.sound.textContent = soundOn ? '声音：开' : '声音：关';
      ui.sound.setAttribute('aria-pressed', String(soundOn));
      if (soundOn) ensureAudio();
    });
    on(document, 'visibilitychange', () => { if (document.hidden) pause(); });

    // ---------- input ----------
    function setTargetFromEvent(e) {
      const r = cvs.getBoundingClientRect();
      const lift = e.pointerType === 'touch' ? 56 : 0;
      S.jar.tx = clamp(e.clientX - r.left, S.jar.r, W - S.jar.r);
      S.jar.ty = clamp(e.clientY - r.top - lift, S.jar.r + 10, H - S.jar.r - 10);
    }
    cvs.addEventListener('pointerdown', (e) => { S.pointerActive = true; setTargetFromEvent(e); });
    cvs.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || S.pointerActive) setTargetFromEvent(e); });
    on(window, 'pointerup', () => { S.pointerActive = false; });

    const KEYMAP = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'u', w: 'u', W: 'u', ArrowDown: 'd', s: 'd', S: 'd' };
    on(window, 'keydown', (e) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (S.mode === 'play') { pause(); e.preventDefault(); return; }
        if (S.mode === 'paused' && e.key !== 'Escape') { resume(); e.preventDefault(); return; }
      }
      const k = KEYMAP[e.key];
      if (k) { S.keys[k] = true; if (S.mode === 'play') e.preventDefault(); }
    });
    on(window, 'keyup', (e) => { const k = KEYMAP[e.key]; if (k) S.keys[k] = false; });
    on(window, 'blur', () => { S.keys = {}; });

    // ---------- update ----------
    function burst(x, y, color, n) {
      const count = reduceMotion ? Math.ceil(n / 3) : n;
      for (let i = 0; i < count; i++) {
        const a = rand(0, TAU), v = rand(30, 120);
        S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, t: 0, life: rand(0.4, 0.8), color });
      }
    }
    const pop = (x, y, txt, color) => S.pops.push({ x, y, txt, color, t: 0 });

    function update(dt) {
      const J = S.jar;
      const playing = S.mode === 'play';

      if (playing) {
        S.elapsed += dt;
        S.time -= dt;
        if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
      }

      const kx = (S.keys.r ? 1 : 0) - (S.keys.l ? 1 : 0);
      const ky = (S.keys.d ? 1 : 0) - (S.keys.u ? 1 : 0);
      if (kx || ky) {
        const m = Math.hypot(kx, ky);
        J.tx = clamp(J.tx + (kx / m) * 430 * dt, J.r, W - J.r);
        J.ty = clamp(J.ty + (ky / m) * 430 * dt, J.r + 10, H - J.r - 10);
      }
      const k = Math.min(1, dt * 14);
      const dx = (J.tx - J.x) * k;
      J.x += dx;
      J.y += (J.ty - J.y) * k;
      J.tilt += (clamp(dx * 0.04, -0.35, 0.35) - J.tilt) * Math.min(1, dt * 10);
      if (J.hurt > 0) J.hurt -= dt;

      S.spawnCd -= dt;
      if (S.flies.length < flyTarget() && S.spawnCd <= 0) { spawnFly(false); S.spawnCd = 0.35; }
      for (let i = S.flies.length - 1; i >= 0; i--) {
        const f = S.flies[i];
        f.fade = Math.min(1, f.fade + dt * 1.6);
        f.ph += (TAU / f.per) * dt;
        f.b = clamp((Math.sin(f.ph) + 0.1) * 1.7, 0, 1);
        f.a += rand(-1, 1) * 2.4 * dt;
        const m = 40;
        if (f.x < m || f.x > W - m || f.y < m || f.y > H - 60) {
          const want = Math.atan2(H * 0.5 - f.y, W * 0.5 - f.x);
          f.a += angDiff(f.a, want) * Math.min(1, dt * 2);
        }
        f.x = clamp(f.x + Math.cos(f.a) * f.sp * dt, 6, W - 6);
        f.y = clamp(f.y + Math.sin(f.a) * f.sp * dt * 0.8, 6, H - 30);

        if (playing && f.fade > 0.6 && f.b > 0.35 && Math.hypot(f.x - J.x, f.y - (J.y - 4)) < J.r + 6) {
          S.flies.splice(i, 1);
          S.combo += 1;
          S.comboT = COMBO_WINDOW;
          S.maxCombo = Math.max(S.maxCombo, S.combo);
          const mult = Math.min(5, 1 + Math.floor((S.combo - 1) / 5));
          const pts = (f.gold ? 5 : 1) * mult;
          S.score += pts;
          S.caught += 1;
          if (S.jarLights.length < 48) {
            S.jarLights.push({ ox: rand(-0.6, 0.6), oy: rand(-0.3, 0.75), ph: rand(0, TAU), per: rand(1.4, 3), gold: f.gold });
          }
          burst(f.x, f.y, f.gold ? '255,201,74' : '227,240,122', f.gold ? 18 : 10);
          pop(f.x, f.y - 14, '+' + pts, f.gold ? '#ffc94a' : '#e3f07a');
          chime(S.combo, f.gold);
        }
      }

      while (S.wasps.length < waspTarget()) spawnWasp();
      const wSpeed = 90 + S.elapsed * 1.7;
      for (let i = S.wasps.length - 1; i >= 0; i--) {
        const w = S.wasps[i];
        w.t += dt;
        w.life -= dt;
        if (w.life > 0 && playing) {
          const want = Math.atan2(J.y - w.y, J.x - w.x);
          w.a += angDiff(w.a, want) * Math.min(1, dt * (0.9 + S.elapsed * 0.012));
        }
        w.a += Math.sin(w.t * 5) * 1.2 * dt;
        w.x += Math.cos(w.a) * wSpeed * dt;
        w.y += Math.sin(w.a) * wSpeed * dt;
        if (w.life < 0 && (w.x < -60 || w.x > W + 60 || w.y < -60 || w.y > H + 60)) { S.wasps.splice(i, 1); continue; }
        if (playing && J.hurt <= 0 && Math.hypot(w.x - J.x, w.y - J.y) < J.r + 10) {
          J.hurt = 1.2;
          S.time -= 3;
          S.combo = 0;
          S.comboT = 0;
          burst(J.x, J.y, '255,138,92', 14);
          pop(J.x, J.y - J.r - 18, '−3 秒', '#ff8a5c');
          buzz();
          w.life = 0;
          w.a += Math.PI;
        }
      }

      for (let i = S.parts.length - 1; i >= 0; i--) {
        const p = S.parts[i];
        p.t += dt;
        if (p.t > p.life) { S.parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94;
      }
      for (let i = S.pops.length - 1; i >= 0; i--) {
        const p = S.pops[i];
        p.t += dt; p.y -= 28 * dt;
        if (p.t > 0.9) S.pops.splice(i, 1);
      }

      if (playing && S.time <= 0) { S.time = 0; endGame(); }
    }

    // ---------- draw ----------
    function roundRectPath(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawFly(f) {
      const a = f.b * f.fade;
      ctx.fillStyle = `rgba(159,179,200,${0.4 * f.fade})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, 1.8, 0, TAU); ctx.fill();
      if (a > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a;
        const s = f.gold ? 58 : 44;
        ctx.drawImage(f.gold ? SPR.gold : SPR.fly, f.x - s / 2, f.y - s / 2, s, s);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    function drawWasp(w, now) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.drawImage(SPR.sting, w.x - 30, w.y - 30, 60, 60);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(w.a);
      const flap = Math.sin(now * 0.06) * 0.45;
      ctx.fillStyle = 'rgba(220,235,255,0.4)';
      ctx.beginPath(); ctx.ellipse(-1, -7, 9, 4, -0.5 + flap, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-1, 7, 9, 4, 0.5 - flap, 0, TAU); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 6.5, 0, 0, TAU);
      ctx.fillStyle = '#f0a63a';
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = '#1a1208';
      for (const sx of [-9, -4, 1]) ctx.fillRect(sx, -7, 2.6, 14);
      ctx.restore();
      ctx.fillStyle = '#1a1208';
      ctx.beginPath(); ctx.arc(13, 0, 4.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(-18, 0); ctx.lineTo(-12, 2); ctx.fill();
      ctx.restore();
    }

    function drawJar(now) {
      const J = S.jar;
      const r = J.r;
      const w = r * 2, h = r * 2.3;
      const shakeX = J.hurt > 0.6 && !reduceMotion ? Math.sin(now * 0.07) * 4 : 0;

      const glow = Math.min(S.jarLights.length, 40) / 40;
      if (glow > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + glow * 0.45;
        const s = r * (4 + glow * 4);
        ctx.drawImage(SPR.fly, J.x - s / 2, J.y - s / 2, s, s);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.save();
      ctx.translate(J.x + shakeX, J.y);
      ctx.rotate(J.tilt);

      ctx.globalCompositeOperation = 'lighter';
      for (const L of S.jarLights) {
        ctx.globalAlpha = 0.35 + 0.65 * Math.max(0, Math.sin(now / 1000 * TAU / L.per + L.ph));
        const lx = L.ox * r * 0.85 + Math.sin(now / 900 + L.ph) * 3;
        const ly = L.oy * h * 0.5 + Math.cos(now / 1100 + L.ph) * 3;
        const s = L.gold ? 22 : 16;
        ctx.drawImage(L.gold ? SPR.gold : SPR.fly, lx - s / 2, ly - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      roundRectPath(-r, -h / 2 + 6, w, h - 6, r * 0.45);
      ctx.fillStyle = 'rgba(190,220,245,0.07)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = J.hurt > 0 ? 'rgba(255,138,92,0.85)' : 'rgba(225,240,255,0.55)';
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r + 8, -h / 2 + 18);
      ctx.lineTo(-r + 8, h / 2 - 16);
      ctx.stroke();
      ctx.fillStyle = '#5c4a36';
      roundRectPath(-r * 0.72, -h / 2 - 4, r * 1.44, 11, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-r * 0.72 + 3, -h / 2 - 2, r * 1.44 - 6, 2);
      ctx.strokeStyle = 'rgba(200,180,150,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -h / 2 - 2);
      ctx.quadraticCurveTo(0, -h / 2 - 26, r * 0.6, -h / 2 - 2);
      ctx.stroke();
      ctx.restore();
    }

    function draw(now) {
      if (!W || !H) return;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.drawImage(bg, 0, 0, W, H);

      for (const f of S.flies) drawFly(f);
      for (const w of S.wasps) drawWasp(w, now);
      if (S.mode !== 'title') drawJar(now);

      ctx.globalCompositeOperation = 'lighter';
      for (const p of S.parts) {
        ctx.fillStyle = `rgba(${p.color},${1 - p.t / p.life})`;
        ctx.fillRect(p.x - 1.2, p.y - 1.2, 2.4, 2.4);
      }
      ctx.globalCompositeOperation = 'source-over';

      ctx.textAlign = 'center';
      ctx.font = '600 17px "Noto Sans SC", "PingFang SC", sans-serif';
      for (const p of S.pops) {
        ctx.globalAlpha = 1 - p.t / 0.9;
        ctx.fillStyle = p.color;
        ctx.fillText(p.txt, p.x, p.y);
      }
      ctx.globalAlpha = 1;

      if (S.mode === 'play' && S.combo > 0 && S.comboT > 0) {
        const J = S.jar, bw = J.r * 2;
        const by = J.y + J.r * 1.15 + 8;
        ctx.fillStyle = 'rgba(159,179,200,0.2)';
        ctx.fillRect(J.x - bw / 2, by, bw, 3);
        ctx.fillStyle = '#ffc94a';
        ctx.fillRect(J.x - bw / 2, by, bw * (S.comboT / COMBO_WINDOW), 3);
      }
    }

    // ---------- HUD ----------
    const hudCache = {};
    function setText(node, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; node.textContent = v; } }
    function renderHud() {
      setText(ui.score, 's', String(S.score));
      const t = Math.ceil(S.time);
      setText(ui.time, 't', String(t));
      ui.time.classList.toggle('warn', S.mode === 'play' && t <= 10);
      setText(ui.combo, 'c', String(S.combo));
      setText(ui.mult, 'm', '×' + Math.min(5, 1 + Math.floor(Math.max(0, S.combo - 1) / 5)));
      setText(ui.best, 'b', String(S.best));
    }

    // ---------- loop ----------
    let last = performance.now();
    let raf = 0;
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (S.mode !== 'paused') update(dt);
      draw(now);
      renderHud();
      raf = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();
    renderHud();
    raf = requestAnimationFrame(frame);
    ui.btn.focus({ preventScroll: true });

    return function cleanup() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      offs.forEach((off) => off());
      if (ac) { try { ac.close(); } catch (e) { /* already closed */ } }
    };
  }

  (window.MiniGames = window.MiniGames || []).push({
    id: 'firefly',
    title: '夏夜捕萤',
    tagline: '提着罐子，接住发光的萤火虫',
    controls: '鼠标 · 触屏 · 方向键',
    accent: '#e3f07a',
    bestLabel: '分',
    lowerIsBetter: false,
    mount,
  });
})();
