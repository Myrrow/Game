(() => {
  'use strict';

  // ---------- data ----------
  // Season colours: bg/fg are for the little tag on a card face (rice paper), glow is for text on the night background.
  const SEASONS = [
    { ch: '春', bg: '#3a8450', fg: '#ffffff', glow: '#7ccf8d' },
    { ch: '夏', bg: '#cc4a25', fg: '#ffffff', glow: '#ff8a5c' },
    { ch: '秋', bg: '#e3a22b', fg: '#2b1d03', glow: '#f0b84a' },
    { ch: '冬', bg: '#a8cbe6', fg: '#12304a', glow: '#9cc7ee' },
  ];

  // [name, season index, month, day (approximate), one-line meaning]
  const TERMS = [
    ['立春', 0, 2, 4, '春季开始，二十四节气之首。'],
    ['雨水', 0, 2, 19, '降雨渐多，冰雪消融，草木萌动。'],
    ['惊蛰', 0, 3, 6, '春雷始鸣，惊醒蛰伏在土里的虫子。'],
    ['春分', 0, 3, 21, '昼夜几乎等长，春季至此过半。'],
    ['清明', 0, 4, 5, '天清地明，草木青翠，踏青祭扫。'],
    ['谷雨', 0, 4, 20, '雨生百谷，春雨滋润，播种正当时。'],
    ['立夏', 1, 5, 6, '夏季开始，气温升高，万物渐盛。'],
    ['小满', 1, 5, 21, '夏熟作物籽粒渐满，尚未成熟。'],
    ['芒种', 1, 6, 6, '有芒的麦子成熟，夏收夏种最忙。'],
    ['夏至', 1, 6, 21, '北半球白昼最长，黑夜最短。'],
    ['小暑', 1, 7, 7, '天气开始炎热，还没到最热的时候。'],
    ['大暑', 1, 7, 23, '一年中最热的时节，酷暑难耐。'],
    ['立秋', 2, 8, 8, '秋季开始，暑气渐消，凉风将至。'],
    ['处暑', 2, 8, 23, '暑气至此渐止，天气由热转凉。'],
    ['白露', 2, 9, 8, '天气转凉，清晨草叶上凝出白露。'],
    ['秋分', 2, 9, 23, '昼夜再次平分，秋季至此过半。'],
    ['寒露', 2, 10, 8, '露水寒凉，渐欲成霜，深秋到来。'],
    ['霜降', 2, 10, 23, '天气渐冷，初霜出现，秋季最后一个节气。'],
    ['立冬', 3, 11, 7, '冬季开始，万物收藏，天气转寒。'],
    ['小雪', 3, 11, 22, '气温下降，开始降雪，雪量还不大。'],
    ['大雪', 3, 12, 7, '降雪更多更大，地面常有积雪。'],
    ['冬至', 3, 12, 22, '北半球白昼最短，此后白昼渐长。'],
    ['小寒', 3, 1, 6, '天气很冷，但还没冷到极点。'],
    ['大寒', 3, 1, 20, '寒冷到了极点，是二十四节气的最后一个。'],
  ];

  const LEVELS = {
    easy: { label: '简单', pairs: 6 },
    normal: { label: '普通', pairs: 8 },
    hard: { label: '困难', pairs: 12 },
  };
  const LEVEL_KEYS = ['easy', 'normal', 'hard'];

  const RATIO = 3 / 4;          // card width / height
  const MAX_CARD_W = 180;
  const FLIP_BACK_MS = 900;     // how long a mismatched pair stays visible
  const RESULT_DELAY_MS = 1100; // let the last pair and its caption be seen before the result panel
  const HINT = '翻开两张牌，找出相同的节气。';

  // Kept for the page session so the choice survives leaving and re-entering the stall.
  let soundPref = true;
  let levelPref = 'normal';

  // ---------- scoring ----------
  // base 100 per pair; +15 for every move under 3 per pair; +2 for every second under 15 per pair.
  function calcScore(pairs, moves, secs) {
    const base = pairs * 100;
    const parMoves = pairs * 3;
    const parSecs = pairs * 15;
    const moveBonus = Math.max(0, parMoves - moves) * 15;
    const timeBonus = Math.max(0, parSecs - secs) * 2;
    return { base, moveBonus, timeBonus, parMoves, parSecs, total: base + moveBonus + timeBonus };
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  const fmtTime = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

  // Paper-cut (窗花) card back, drawn as an inline SVG and used as a CSS background.
  function backArt() {
    const R = '#b04a45', D = '#86312f', BG = '#1c1519';
    let petals = '', small = '', holes = '', dots = '';
    for (let k = 0; k < 8; k++) {
      const a = k * 45;
      petals += `<ellipse cx="45" cy="45" rx="5.4" ry="11.5" transform="rotate(${a} 45 60)"/>`;
      small += `<ellipse cx="45" cy="50.5" rx="3" ry="6.5" transform="rotate(${a + 22.5} 45 60)"/>`;
      holes += `<circle cx="45" cy="41.5" r="1.7" transform="rotate(${a} 45 60)"/>`;
    }
    for (let k = 0; k < 24; k++) dots += `<circle cx="45" cy="29" r=".85" transform="rotate(${k * 15} 45 60)"/>`;
    const corner = `<path d="M20 9A11 11 0 0 1 9 20M15.5 9A6.5 6.5 0 0 1 9 15.5"/>`;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 120">` +
      `<defs><pattern id="l" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M4.5 0L9 4.5 4.5 9 0 4.5z" fill="none" stroke="${R}" stroke-opacity=".12" stroke-width=".5"/></pattern></defs>` +
      `<rect width="90" height="120" fill="${BG}"/><rect width="90" height="120" fill="url(#l)"/>` +
      `<rect x="4.5" y="4.5" width="81" height="111" rx="5" fill="none" stroke="${R}" stroke-opacity=".55"/>` +
      `<rect x="9" y="9" width="72" height="102" rx="3" fill="none" stroke="${R}" stroke-opacity=".28" stroke-width=".7"/>` +
      `<g fill="none" stroke="${R}" stroke-opacity=".6" stroke-width=".8">${corner}` +
      `<g transform="translate(90 0) scale(-1 1)">${corner}</g>` +
      `<g transform="translate(0 120) scale(1 -1)">${corner}</g>` +
      `<g transform="translate(90 120) scale(-1 -1)">${corner}</g></g>` +
      `<circle cx="45" cy="60" r="30.5" fill="none" stroke="${R}" stroke-opacity=".3" stroke-width=".5"/>` +
      `<g fill="${R}" fill-opacity=".38">${dots}</g>` +
      `<g fill="${R}" fill-opacity=".92">${petals}</g>` +
      `<g fill="${D}">${small}</g>` +
      `<g fill="${BG}">${holes}</g>` +
      `<circle cx="45" cy="60" r="8" fill="${BG}" stroke="${R}" stroke-width="1.1"/>` +
      `<circle cx="45" cy="60" r="3.6" fill="${R}"/>` +
      `<g fill="${R}" fill-opacity=".7"><path d="M45 13.5l4.2 4.6-4.2 4.6-4.2-4.6z"/><path d="M45 106.5l4.2-4.6-4.2-4.6-4.2 4.6z"/>` +
      `<circle cx="35" cy="18.1" r="1.1"/><circle cx="55" cy="18.1" r="1.1"/><circle cx="35" cy="101.9" r="1.1"/><circle cx="55" cy="101.9" r="1.1"/></g>` +
      `</svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function buildCss() {
    return `
.mg-jieqi{
  --jq-accent:#5bbf8a; --jq-accent-ink:#06241a; --jq-ink:#eef3f7; --jq-mist:#9fb3c8;
  --jq-night:#0b1424; --jq-panel:rgba(17,29,49,.88); --jq-line:rgba(159,179,200,.18);
  --jq-paper-ink:#1f2a24;
  position:absolute; inset:0; display:flex; flex-direction:column; overflow:hidden;
  color:var(--jq-ink);
  font-family:var(--body,"Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif);
  line-height:1.4;
  background:
    radial-gradient(90% 55% at 50% -8%, rgba(91,191,138,.11), transparent 70%),
    radial-gradient(70% 45% at 100% 100%, rgba(176,74,69,.08), transparent 70%),
    var(--jq-night);
  -webkit-user-select:none; user-select:none; touch-action:manipulation; -webkit-tap-highlight-color:transparent;
}
.mg-jieqi *, .mg-jieqi *::before, .mg-jieqi *::after{ box-sizing:border-box; }
.mg-jieqi [hidden]{ display:none !important; }
.mg-jieqi button{ font:inherit; color:inherit; margin:0; padding:0; border:0; background:none; cursor:pointer; -webkit-appearance:none; appearance:none; }
.mg-jieqi button:focus-visible{ outline:3px solid var(--jq-ink); outline-offset:3px; }
.mg-jieqi .jq-sr{ position:absolute; width:1px; height:1px; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }

/* ---- layout ---- */
.mg-jieqi .jq-main{ flex:1; min-height:0; display:flex; flex-direction:column; }
.mg-jieqi .jq-hud{ flex:none; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px 8px; }
.mg-jieqi .jq-stats{ display:flex; gap:clamp(12px,3.2vw,26px); min-width:0; }
.mg-jieqi .jq-stat{ display:flex; flex-direction:column; align-items:flex-start; line-height:1.15; white-space:nowrap; }
.mg-jieqi .jq-k{ font-size:11px; letter-spacing:.04em; color:var(--jq-mist); }
.mg-jieqi .jq-v{ font-size:17px; font-weight:600; font-variant-numeric:tabular-nums; color:var(--jq-ink); }
.mg-jieqi .jq-tools{ display:flex; gap:6px; flex:none; }
.mg-jieqi .jq-chip{ min-height:32px; padding:5px 12px; font-size:12px; border-radius:999px; border:1px solid rgba(159,179,200,.3); color:var(--jq-mist); white-space:nowrap; }
.mg-jieqi .jq-chip:hover{ color:var(--jq-ink); border-color:var(--jq-mist); }
.mg-jieqi .jq-chip[aria-pressed="true"]{ color:var(--jq-accent); border-color:rgba(91,191,138,.5); }

.mg-jieqi .jq-caption{
  flex:none; margin:0 12px; padding:6px 12px; min-height:46px; display:flex; align-items:center;
  border:1px solid var(--jq-line); border-left:3px solid var(--cap,rgba(159,179,200,.4)); border-radius:10px;
  background:rgba(255,255,255,.035); font-size:13px; line-height:1.45; color:var(--jq-ink);
}
.mg-jieqi .jq-caption.is-hint{ color:var(--jq-mist); }
.mg-jieqi .jq-cap-name{ font-family:var(--display,"Songti SC",serif); font-size:18px; color:var(--cap); }
.mg-jieqi .jq-cap-in{ display:block; }
.mg-jieqi .jq-caption.is-new .jq-cap-in{ animation:jq-cap .45s ease both; }

.mg-jieqi .jq-area{ flex:1; min-height:0; position:relative; }
.mg-jieqi .jq-board{
  position:absolute; inset:0; margin:auto;
  display:flex; flex-wrap:wrap; justify-content:center; align-content:center; gap:var(--gap,8px);
  --r:calc(var(--cw,60px) * .09);
}

/* ---- cards ---- */
.mg-jieqi .jq-card{
  position:relative; flex:none; width:var(--cw); height:var(--ch); border-radius:var(--r);
  perspective:calc(var(--cw) * 5);
}
.mg-jieqi .jq-card[aria-disabled="true"]{ cursor:default; }
.mg-jieqi .jq-inner{
  position:absolute; inset:0; display:block; transform-style:preserve-3d;
  transition:transform .45s cubic-bezier(.3,.7,.3,1);
}
.mg-jieqi .jq-card.is-open .jq-inner{ transform:rotateY(180deg); }
.mg-jieqi .jq-face{
  position:absolute; inset:0; display:block; border-radius:var(--r); overflow:hidden;
  -webkit-backface-visibility:hidden; backface-visibility:hidden;
}
.mg-jieqi .jq-back{
  background-color:#1c1519; background-size:100% 100%; background-repeat:no-repeat;
  box-shadow:0 2px 8px rgba(0,0,0,.5), inset 0 0 0 1px rgba(176,74,69,.4);
}
.mg-jieqi .jq-front{
  transform:rotateY(180deg);
  display:flex; flex-direction:column; align-items:center; justify-content:space-between;
  padding:calc(var(--cw) * .1) calc(var(--cw) * .05) calc(var(--cw) * .085);
  color:var(--jq-paper-ink);
  background:radial-gradient(120% 80% at 50% 0%, #f8f1e1 0%, #efe6d2 55%, #e5d9be 100%);
  box-shadow:0 2px 8px rgba(0,0,0,.45);
}
.mg-jieqi .jq-front::after{
  content:""; position:absolute; inset:calc(var(--cw) * .04); border:1px solid rgba(31,42,36,.16);
  border-radius:calc(var(--r) * .65); pointer-events:none;
}
.mg-jieqi .jq-tag{
  display:block; font-size:max(10px, calc(var(--cw) * .13)); line-height:1; padding:.3em .5em .28em;
  border-radius:.35em; background:var(--tbg); color:var(--tfg); font-weight:600;
}
.mg-jieqi .jq-name{
  display:block; font-family:var(--display,"Songti SC","STSong","SimSun",serif); font-size:calc(var(--cw) * .36);
  line-height:1; letter-spacing:.04em; text-indent:.04em; color:var(--jq-paper-ink); white-space:nowrap;
}
.mg-jieqi .jq-rule{ display:block; width:34%; height:2px; border-radius:2px; background:var(--tbg); opacity:.75; }
.mg-jieqi .jq-date{
  display:block; font-size:max(9px, calc(var(--cw) * .115)); line-height:1.2; text-align:center; white-space:nowrap;
  color:rgba(31,42,36,.74); font-variant-numeric:tabular-nums;
}
.mg-jieqi .jq-board.is-compact .jq-around{ display:none; }
.mg-jieqi .jq-card.is-matched .jq-front{
  background:radial-gradient(120% 80% at 50% 0%, #f3f6e4 0%, #dfecd3 55%, #cde2c4 100%);
  box-shadow:0 0 0 2px var(--jq-accent), 0 0 16px rgba(91,191,138,.4);
}
.mg-jieqi .jq-card.is-miss .jq-front{ box-shadow:0 0 0 2px #d9694f, 0 2px 8px rgba(0,0,0,.45); }
.mg-jieqi .jq-card.is-pop{ animation:jq-pop .5s .4s ease both; }
.mg-jieqi .jq-card.is-miss{ animation:jq-shake .4s .42s ease both; }
@media (hover:hover){
  .mg-jieqi .jq-card:not(.is-open):not([aria-disabled="true"]):hover .jq-inner{ transform:translateY(-3px); }
}

/* ---- overlays and panels ---- */
.mg-jieqi .jq-ov{
  position:absolute; inset:0; z-index:5; display:flex; padding:16px; overflow:auto;
  background:rgba(8,14,26,.68); -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px);
}
.mg-jieqi .jq-panel{
  margin:auto; width:min(100%,400px); padding:22px 20px 18px; text-align:center;
  border:1px solid var(--jq-line); border-radius:14px; background:var(--jq-panel);
  box-shadow:0 18px 50px rgba(0,0,0,.45); animation:jq-rise .35s ease both;
}
.mg-jieqi .jq-eyebrow{ margin:0; font-size:12px; letter-spacing:.2em; color:var(--jq-accent); }
.mg-jieqi .jq-title{ margin:6px 0 0; font-family:var(--display,"Songti SC",serif); font-weight:400; font-size:40px; line-height:1.1; color:var(--jq-ink); }
.mg-jieqi .jq-desc{ margin:10px 0 0; font-size:14px; line-height:1.7; color:var(--jq-mist); text-wrap:balance; }
.mg-jieqi .jq-diffs{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:16px 0 0; }
.mg-jieqi .jq-diff{
  display:flex; flex-direction:column; align-items:center; gap:1px; padding:10px 4px 9px;
  border:1px solid rgba(159,179,200,.28); border-radius:12px; background:rgba(255,255,255,.03);
}
.mg-jieqi .jq-diff b{ font-family:var(--display,"Songti SC",serif); font-weight:400; font-size:21px; line-height:1.2; }
.mg-jieqi .jq-diff span{ font-size:12px; color:var(--jq-mist); }
.mg-jieqi .jq-diff:hover{ border-color:rgba(91,191,138,.55); }
.mg-jieqi .jq-diff[aria-checked="true"]{ border-color:var(--jq-accent); background:rgba(91,191,138,.15); }
.mg-jieqi .jq-diff[aria-checked="true"] b{ color:var(--jq-accent); }
.mg-jieqi .jq-btn{ min-height:44px; padding:10px 26px; border-radius:999px; font-size:16px; font-weight:600; white-space:nowrap; }
.mg-jieqi .jq-primary{ background:var(--jq-accent); color:var(--jq-accent-ink); }
.mg-jieqi .jq-primary:hover{ filter:brightness(1.08); }
.mg-jieqi .jq-ghost{ border:1px solid rgba(159,179,200,.4); color:var(--jq-ink); font-weight:400; }
.mg-jieqi .jq-ghost:hover{ border-color:var(--jq-mist); }
.mg-jieqi .jq-go{ margin-top:16px; width:100%; }
.mg-jieqi .jq-foot{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:14px; font-size:13px; color:var(--jq-mist); }
.mg-jieqi .jq-foot b, .mg-jieqi .jq-bestline b{ color:var(--jq-ink); font-weight:600; font-variant-numeric:tabular-nums; }

.mg-jieqi .jq-scorebox{ margin:10px 0 0; display:flex; align-items:baseline; justify-content:center; gap:6px; flex-wrap:wrap; }
.mg-jieqi .jq-score{ font-family:var(--display,"Songti SC",serif); font-size:60px; line-height:1; color:#8fe3b4; text-shadow:0 0 24px rgba(91,191,138,.4); font-variant-numeric:tabular-nums; }
.mg-jieqi .jq-unit{ font-size:14px; color:var(--jq-mist); }
.mg-jieqi .jq-new{ align-self:center; margin-left:4px; padding:2px 10px; border-radius:999px; background:var(--jq-accent); color:var(--jq-accent-ink); font-size:12px; font-weight:600; letter-spacing:.06em; }
.mg-jieqi .jq-bestline{ margin:6px 0 0; font-size:13px; color:var(--jq-mist); }
.mg-jieqi .jq-break{ list-style:none; margin:14px 0 0; padding:4px 12px; border:1px solid var(--jq-line); border-radius:10px; background:rgba(255,255,255,.03); text-align:left; }
.mg-jieqi .jq-break li{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px 0; font-size:14px; }
.mg-jieqi .jq-break li + li{ border-top:1px solid var(--jq-line); }
.mg-jieqi .jq-break small{ display:block; margin-top:1px; font-size:11.5px; line-height:1.35; color:var(--jq-mist); }
.mg-jieqi .jq-break b{ font-size:16px; font-weight:600; color:var(--jq-accent); font-variant-numeric:tabular-nums; white-space:nowrap; }
.mg-jieqi .jq-sum{ display:flex; justify-content:center; gap:18px; margin-top:12px; font-size:13px; color:var(--jq-mist); }
.mg-jieqi .jq-sum b{ color:var(--jq-ink); font-weight:600; font-variant-numeric:tabular-nums; }
.mg-jieqi .jq-actions{ display:flex; gap:10px; margin-top:16px; }
.mg-jieqi .jq-actions .jq-btn{ flex:1; padding-inline:12px; }

@keyframes jq-rise{ from{ opacity:0; transform:translateY(10px); } to{ opacity:1; transform:none; } }
@keyframes jq-cap{ from{ opacity:.2; transform:translateY(3px); } to{ opacity:1; transform:none; } }
@keyframes jq-pop{ 0%,100%{ transform:scale(1); } 45%{ transform:scale(1.09); } }
@keyframes jq-shake{ 0%,100%{ transform:translateX(0); } 25%{ transform:translateX(-4px); } 75%{ transform:translateX(4px); } }

@media (max-height:540px){
  .mg-jieqi .jq-ov{ padding:10px; }
  .mg-jieqi .jq-panel{ padding:14px 16px 12px; }
  .mg-jieqi .jq-title{ font-size:30px; }
  .mg-jieqi .jq-desc{ margin-top:6px; font-size:13px; line-height:1.55; }
  .mg-jieqi .jq-diffs{ margin-top:10px; }
  .mg-jieqi .jq-diff{ padding:6px 4px 5px; }
  .mg-jieqi .jq-go{ margin-top:10px; min-height:40px; }
  .mg-jieqi .jq-foot{ margin-top:8px; }
  .mg-jieqi .jq-score{ font-size:44px; }
  .mg-jieqi .jq-break{ margin-top:8px; }
  .mg-jieqi .jq-break li{ padding:5px 0; }
  .mg-jieqi .jq-sum{ margin-top:8px; }
  .mg-jieqi .jq-actions{ margin-top:10px; }
  .mg-jieqi .jq-btn{ min-height:40px; }
  .mg-jieqi .jq-hud{ padding-top:6px; padding-bottom:6px; }
}
@media (prefers-reduced-motion:reduce){
  .mg-jieqi *, .mg-jieqi *::before, .mg-jieqi *::after{ transition:none !important; animation:none !important; }
}
.mg-jieqi .jq-back{ background-image:url("${backArt()}"); }
`;
  }

  // ---------- game ----------
  (window.MiniGames = window.MiniGames || []).push({
    id: 'jieqi',
    title: '节气翻牌',
    tagline: '翻牌配对，认识二十四节气',
    controls: '点击 · 键盘',
    accent: '#5bbf8a',
    bestLabel: '分',
    lowerIsBetter: false,
    mount(root, api) {
      let dead = false;
      const timeouts = new Set();
      const later = (fn, ms) => {
        const id = setTimeout(() => { timeouts.delete(id); if (!dead) fn(); }, ms);
        timeouts.add(id);
        return id;
      };
      const cancel = (id) => { if (id) { clearTimeout(id); timeouts.delete(id); } };

      // ----- DOM -----
      const style = document.createElement('style');
      style.textContent = buildCss();
      root.appendChild(style);

      const wrap = document.createElement('div');
      wrap.className = 'mg-jieqi';
      wrap.innerHTML = `
<div class="jq-main">
  <div class="jq-hud">
    <div class="jq-stats">
      <div class="jq-stat"><span class="jq-k">已配对</span><b class="jq-v" data-hud="pairs">0/0</b></div>
      <div class="jq-stat"><span class="jq-k">步数</span><b class="jq-v" data-hud="moves">0</b></div>
      <div class="jq-stat"><span class="jq-k">用时</span><b class="jq-v" data-hud="time">0:00</b></div>
      <div class="jq-stat"><span class="jq-k">最高</span><b class="jq-v" data-hud="best">—</b></div>
    </div>
    <div class="jq-tools">
      <button type="button" class="jq-chip" data-act="sound" aria-pressed="true">声音 开</button>
      <button type="button" class="jq-chip" data-act="redo" aria-label="重来，回到开始面板">重来</button>
    </div>
  </div>
  <div class="jq-caption is-hint" role="status" aria-live="polite"></div>
  <div class="jq-area"><div class="jq-board" role="group" aria-label="节气牌"></div></div>
  <span class="jq-sr" role="status" aria-live="polite" data-sr></span>
</div>
<div class="jq-ov" data-ov="start">
  <div class="jq-panel" role="dialog" aria-modal="true" aria-label="节气翻牌，选择难度">
    <p class="jq-eyebrow">二十四节气 · 记忆配对</p>
    <h2 class="jq-title">节气翻牌</h2>
    <p class="jq-desc">翻开两张牌，找出相同的节气。配对成功时，会读到它的一句小释义。</p>
    <div class="jq-diffs" role="radiogroup" aria-label="难度">
      <button type="button" class="jq-diff" role="radio" data-diff="easy"><b>简单</b><span>6 对</span></button>
      <button type="button" class="jq-diff" role="radio" data-diff="normal"><b>普通</b><span>8 对</span></button>
      <button type="button" class="jq-diff" role="radio" data-diff="hard"><b>困难</b><span>12 对</span></button>
    </div>
    <button type="button" class="jq-btn jq-primary jq-go" data-act="go">开始翻牌</button>
    <div class="jq-foot">
      <span data-startbest></span>
      <button type="button" class="jq-chip" data-act="sound" aria-pressed="true">声音 开</button>
    </div>
  </div>
</div>
<div class="jq-ov" data-ov="result" hidden>
  <div class="jq-panel" role="dialog" aria-modal="true" aria-label="本局结果" data-result></div>
</div>`;
      root.appendChild(wrap);

      const $ = (sel) => wrap.querySelector(sel);
      const main = $('.jq-main');
      const board = $('.jq-board');
      const area = $('.jq-area');
      const cap = $('.jq-caption');
      const srEl = $('[data-sr]');
      const startOv = $('[data-ov="start"]');
      const resultOv = $('[data-ov="result"]');
      const resultPanel = $('[data-result]');
      const goBtn = $('[data-act="go"]');
      const hud = {
        pairs: $('[data-hud="pairs"]'),
        moves: $('[data-hud="moves"]'),
        time: $('[data-hud="time"]'),
        best: $('[data-hud="best"]'),
      };

      // ----- state -----
      let level = LEVEL_KEYS.includes(levelPref) ? levelPref : 'normal';
      let phase = 'menu';      // menu -> ready -> playing -> over
      let pairs = 0, cards = [], first = null, locked = false;
      let found = 0, moves = 0, elapsed = 0, cols = 1;
      let best = null;
      let flipTimer = 0, resultTimer = 0;
      let timerOn = false, paused = false, lastTs = 0, tickId = 0;

      const readBest = () => {
        let b = null;
        try { b = api.getBest(); } catch (e) { /* ignore */ }
        best = typeof b === 'number' && isFinite(b) ? b : null;
      };

      // ----- sound (lazy; soft tones) -----
      let ctx = null, master = null;
      function ensureAudio() {
        if (dead || !soundPref) return;
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          try {
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0.5;
            master.connect(ctx.destination);
          } catch (e) { ctx = null; master = null; return; }
        }
        if (ctx.state === 'suspended') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
      }
      function tone(freq, at, dur, vol, type) {
        const t0 = ctx.currentTime + at;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g);
        g.connect(master);
        osc.start(t0);
        osc.stop(t0 + dur + 0.03);
      }
      function sfx(kind) {
        if (!soundPref || !ctx || dead) return;
        try {
          if (kind === 'flip') tone(600 + Math.random() * 60, 0, 0.09, 0.07);
          else if (kind === 'match') { tone(784, 0, 0.16, 0.09); tone(1175, 0.09, 0.28, 0.08); }
          else if (kind === 'miss') { tone(240, 0, 0.18, 0.06, 'triangle'); tone(200, 0.1, 0.2, 0.05, 'triangle'); }
          else if (kind === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.34, 0.08));
        } catch (e) { /* audio is optional */ }
      }
      function closeAudio() {
        const c = ctx;
        ctx = null; master = null;
        if (c) { try { const p = c.close(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
      }
      function syncSound() {
        wrap.querySelectorAll('[data-act="sound"]').forEach((b) => {
          b.textContent = soundPref ? '声音 开' : '声音 关';
          b.setAttribute('aria-pressed', soundPref ? 'true' : 'false');
        });
      }

      // ----- timer (pauses while the page is hidden) -----
      function tick() {
        if (!timerOn) return;
        const now = performance.now();
        if (!paused) elapsed += now - lastTs;
        lastTs = now;
        hud.time.textContent = fmtTime(Math.floor(elapsed / 1000));
      }
      function startTimer() {
        if (timerOn) return;
        timerOn = true;
        paused = document.hidden;
        lastTs = performance.now();
        tickId = setInterval(tick, 250);
      }
      function stopTimer() {
        timerOn = false;
        if (tickId) { clearInterval(tickId); tickId = 0; }
      }
      function onVisibility() {
        if (!timerOn) return;
        if (document.hidden) { tick(); paused = true; }
        else { lastTs = performance.now(); paused = false; }
      }
      document.addEventListener('visibilitychange', onVisibility);

      // ----- HUD / caption -----
      function updateHud() {
        hud.pairs.textContent = found + '/' + pairs;
        hud.moves.textContent = String(moves);
        hud.time.textContent = fmtTime(Math.floor(elapsed / 1000));
        hud.best.textContent = best === null ? '—' : String(best);
        const sb = $('[data-startbest]');
        sb.textContent = '';
        if (best === null) sb.textContent = '还没有最高分';
        else { sb.append('最高 '); const b = document.createElement('b'); b.textContent = best; sb.append(b, ' 分'); }
      }
      function announce(msg) { srEl.textContent = msg; }
      function setCaption(t) {
        if (t === null) {
          cap.classList.add('is-hint');
          cap.classList.remove('is-new');
          cap.style.removeProperty('--cap');
          cap.textContent = HINT;
          return;
        }
        const term = TERMS[t];
        cap.classList.remove('is-hint', 'is-new');
        cap.style.setProperty('--cap', SEASONS[term[1]].glow);
        const inner = document.createElement('span');
        inner.className = 'jq-cap-in';
        const n = document.createElement('span');
        n.className = 'jq-cap-name';
        n.textContent = term[0];
        inner.append(n, document.createTextNode('：' + term[4]));
        cap.replaceChildren(inner);
        void cap.offsetWidth;
        cap.classList.add('is-new');
      }

      // ----- cards -----
      function label(c) {
        const n = '第' + (c.i + 1) + '张牌，';
        if (c.matched) return n + c.name + '，已配对';
        if (c.open) return n + c.name + '，' + c.season + '，' + c.date + '，已翻开';
        return n + '未翻开';
      }
      function paint(c) {
        c.el.classList.toggle('is-open', c.open);
        c.el.classList.toggle('is-matched', c.matched);
        c.el.dataset.state = c.matched ? 'matched' : c.open ? 'up' : 'down';
        if (c.matched) c.el.setAttribute('aria-disabled', 'true');
        else c.el.removeAttribute('aria-disabled');
        c.el.setAttribute('aria-label', label(c));
      }
      function makeCard(t, i) {
        const [name, s, m, d] = TERMS[t];
        const se = SEASONS[s];
        const c = {
          t, i, name, open: false, matched: false,
          season: ['春季', '夏季', '秋季', '冬季'][s],
          date: m + '月' + d + '日前后',
        };
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'jq-card';
        el.dataset.term = name;
        el.dataset.i = String(i);
        el.innerHTML =
          '<span class="jq-inner"><span class="jq-face jq-back"></span>' +
          '<span class="jq-face jq-front" style="--tbg:' + se.bg + ';--tfg:' + se.fg + '">' +
          '<span class="jq-tag">' + se.ch + '</span>' +
          '<span class="jq-name">' + name + '</span>' +
          '<span class="jq-rule"></span>' +
          '<span class="jq-date">' + m + '月' + d + '日<span class="jq-around">前后</span></span>' +
          '</span></span>';
        c.el = el;
        paint(c);
        return c;
      }

      function layout() {
        const n = cards.length;
        if (!n || dead) return;
        const aw = area.clientWidth, ah = area.clientHeight;
        const pad = aw < 500 ? 6 : 10;
        const W = aw - pad * 2, H = ah - pad * 2;
        if (W < 40 || H < 40) return;
        const gap = Math.round(Math.max(5, Math.min(14, Math.min(W, H) * 0.022)));
        let pick = null;
        for (let c = 1; c <= n; c++) {
          const r = Math.ceil(n / c);
          const w = Math.min((W - (c - 1) * gap) / c, ((H - (r - 1) * gap) / r) * RATIO, MAX_CARD_W);
          if (w <= 0) continue;
          const eff = w * (n % c === 0 ? 1 : 0.94); // a ragged last row looks a little worse than a full one
          if (!pick || eff > pick.eff) pick = { c, r, w, eff };
        }
        if (!pick) return;
        const cw = Math.max(20, Math.floor(pick.w));
        const ch = Math.floor(cw / RATIO);
        cols = pick.c;
        board.style.setProperty('--cw', cw + 'px');
        board.style.setProperty('--ch', ch + 'px');
        board.style.setProperty('--gap', gap + 'px');
        board.style.width = pick.c * cw + (pick.c - 1) * gap + 1 + 'px';
        board.style.height = pick.r * ch + (pick.r - 1) * gap + 'px';
        board.classList.toggle('is-compact', cw < 64);
      }

      function deal() {
        cancel(flipTimer); cancel(resultTimer);
        flipTimer = resultTimer = 0;
        stopTimer();
        const L = LEVELS[level];
        pairs = L.pairs;
        const pool = shuffle(TERMS.map((_, i) => i)).slice(0, pairs);
        const deck = shuffle(pool.concat(pool));
        cards = deck.map((t, i) => makeCard(t, i));
        board.textContent = '';
        cards.forEach((c) => board.appendChild(c.el));
        first = null; locked = false;
        found = 0; moves = 0; elapsed = 0;
        setCaption(null);
        announce('');
        readBest();
        updateHud();
        layout();
      }

      // ----- panels / flow -----
      function setLevelUi() {
        wrap.querySelectorAll('.jq-diff').forEach((b) => {
          const on = b.dataset.diff === level;
          b.setAttribute('aria-checked', on ? 'true' : 'false');
          b.tabIndex = on ? 0 : -1;
        });
      }
      function setLevel(k) {
        if (!LEVELS[k] || k === level) return;
        level = levelPref = k;
        setLevelUi();
        deal();
      }
      function showStart() {
        phase = 'menu';
        resultOv.hidden = true;
        startOv.hidden = false;
        main.setAttribute('inert', '');
        deal();
        try { goBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
      function beginRound() {
        startOv.hidden = true;
        resultOv.hidden = true;
        main.removeAttribute('inert');
        phase = 'ready';
        if (cards[0]) { try { cards[0].el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      }
      function playAgain() {
        deal();
        beginRound();
      }

      function flip(c) {
        if (phase !== 'ready' && phase !== 'playing') return;
        if (locked || c.matched || c.open) return;
        if (phase === 'ready') { phase = 'playing'; startTimer(); }
        c.open = true;
        paint(c);
        sfx('flip');
        if (!first) { first = c; return; }

        const a = first, b = c;
        first = null;
        moves++;
        if (a.t === b.t) {
          a.matched = b.matched = true;
          found++;
          paint(a); paint(b);
          a.el.classList.add('is-pop'); b.el.classList.add('is-pop');
          setCaption(a.t);
          announce(a.name + '，配对成功');
          later(() => sfx('match'), 220);
          updateHud();
          if (found === pairs) finish();
        } else {
          locked = true;
          a.el.classList.add('is-miss'); b.el.classList.add('is-miss');
          updateHud();
          flipTimer = later(() => {
            flipTimer = 0;
            a.open = b.open = false;
            a.el.classList.remove('is-miss'); b.el.classList.remove('is-miss');
            paint(a); paint(b);
            locked = false;
            sfx('miss');
            announce('两张牌不一样，已翻回');
          }, FLIP_BACK_MS);
        }
      }

      function finish() {
        phase = 'over';
        tick();
        stopTimer();
        const secs = Math.floor(elapsed / 1000);
        const sc = calcScore(pairs, moves, secs);
        let res = null;
        try { res = api.submitScore(sc.total); } catch (e) { /* ignore */ }
        const isNew = !!(res && res.isNew);
        const bestNow = res && typeof res.best === 'number' ? res.best : sc.total;
        best = bestNow;
        updateHud();
        resultTimer = later(() => {
          resultTimer = 0;
          sfx('win');
          showResult(sc, secs, bestNow, isNew);
        }, RESULT_DELAY_MS);
      }

      function showResult(sc, secs, bestNow, isNew) {
        const L = LEVELS[level];
        const gap = bestNow - sc.total;
        resultPanel.innerHTML =
          '<p class="jq-eyebrow">' + L.label + ' · ' + pairs + ' 对节气</p>' +
          '<h2 class="jq-title">全部配对</h2>' +
          '<div class="jq-scorebox"><span class="jq-score" data-score>' + sc.total + '</span><span class="jq-unit">分</span>' +
          (isNew ? '<span class="jq-new" data-new>新纪录</span>' : '') + '</div>' +
          '<p class="jq-bestline">' + (isNew ? '刷新了最高分' : '最高 <b>' + bestNow + '</b> 分，还差 ' + gap + ' 分') + '</p>' +
          '<ul class="jq-break">' +
          '<li><span>配对奖励<small>' + pairs + ' 对 × 100</small></span><b>+' + sc.base + '</b></li>' +
          '<li><span>步数奖励<small>少于 ' + sc.parMoves + ' 步，每少 1 步 +15</small></span><b>+' + sc.moveBonus + '</b></li>' +
          '<li><span>速度奖励<small>快于 ' + sc.parSecs + ' 秒，每快 1 秒 +2</small></span><b>+' + sc.timeBonus + '</b></li>' +
          '</ul>' +
          '<div class="jq-sum"><span>步数 <b>' + moves + '</b></span><span>用时 <b>' + fmtTime(secs) + '</b></span><span>最高 <b>' + bestNow + '</b></span></div>' +
          '<div class="jq-actions">' +
          '<button type="button" class="jq-btn jq-primary" data-act="again">再来一局</button>' +
          '<button type="button" class="jq-btn jq-ghost" data-act="change">换难度</button></div>';
        main.setAttribute('inert', '');
        resultOv.hidden = false;
        const again = resultPanel.querySelector('[data-act="again"]');
        try { again.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }

      // ----- events (all delegated on our own wrapper) -----
      wrap.addEventListener('click', (e) => {
        ensureAudio();
        const card = e.target.closest('.jq-card');
        if (card && board.contains(card)) {
          const c = cards[Number(card.dataset.i)];
          if (c) flip(c);
          return;
        }
        const diff = e.target.closest('.jq-diff');
        if (diff) { setLevel(diff.dataset.diff); return; }
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        if (act === 'sound') {
          soundPref = !soundPref;
          syncSound();
          if (soundPref) { ensureAudio(); sfx('flip'); }
        } else if (act === 'go') beginRound();
        else if (act === 'redo' || act === 'change') showStart();
        else if (act === 'again') playAgain();
      }, true);

      wrap.addEventListener('keydown', (e) => {
        const card = e.target.closest && e.target.closest('.jq-card');
        if (card) {
          const i = Number(card.dataset.i);
          let to = -1;
          if (e.key === 'ArrowRight') to = i + 1;
          else if (e.key === 'ArrowLeft') to = i - 1;
          else if (e.key === 'ArrowDown') to = i + cols;
          else if (e.key === 'ArrowUp') to = i - cols;
          else if (e.key === 'Home') to = 0;
          else if (e.key === 'End') to = cards.length - 1;
          else return;
          e.preventDefault();
          if (to >= 0 && to < cards.length) cards[to].el.focus();
          return;
        }
        const diff = e.target.closest && e.target.closest('.jq-diff');
        if (diff) {
          const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          const k = LEVEL_KEYS[(LEVEL_KEYS.indexOf(level) + d + LEVEL_KEYS.length) % LEVEL_KEYS.length];
          setLevel(k);
          const nb = wrap.querySelector('.jq-diff[data-diff="' + k + '"]');
          if (nb) nb.focus();
        }
      });

      // The board keeps every card visible: re-fit whenever the available area changes.
      let ro = null;
      const onResize = () => layout();
      if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(onResize);
        ro.observe(area);
      } else {
        window.addEventListener('resize', onResize);
      }

      // ----- go -----
      syncSound();
      setLevelUi();
      showStart();

      return function cleanup() {
        dead = true;
        timeouts.forEach((id) => clearTimeout(id));
        timeouts.clear();
        stopTimer();
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('resize', onResize);
        if (ro) { ro.disconnect(); ro = null; }
        closeAudio();
        wrap.remove();
        style.remove();
      };
    },
  });
})();
