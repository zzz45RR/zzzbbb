/* =========================================================================
   深海捕鱼 · 鱼类图鉴 & 渲染引擎 v3 (性能优化版)
   - 全部贴图预渲染为离屏精灵（Sprite），运行期只做 drawImage
   - 粒子/金币/子弹/渔网零渐变、零 shadowBlur、零合成模式切换
   ========================================================================= */

const FISH_TYPES = [
  /* ── 小型鱼：成群出现，一击必杀 ───────────────────────────── */
  { id: 's1', name: '蓝雀鲷', en: 'Blue Damselfish', tier: 1, value: 2, r: 15, speed: 104, prob: 0.58, weight: 24, hp: 0,
    shape: 'torpedo', pattern: 'scales', len: 1.0, hgt: 0.94,
    body: '#3ec6e0', belly: '#eefcff', fin: '#1d8fb0', accent: '#a9ecff',
    outline: 'rgba(6,52,72,.75)', glow: null },

  { id: 's2', name: '霓虹灯鱼', en: 'Neon Tetra', tier: 1, value: 3, r: 14, speed: 118, prob: 0.52, weight: 20, hp: 0,
    shape: 'torpedo', pattern: 'neon', len: 1.06, hgt: 0.84,
    body: '#2f8cff', belly: '#e6f2ff', fin: '#ff5a7a', accent: '#5cffe0',
    outline: 'rgba(4,28,70,.8)', glow: 'rgba(90,200,255,.5)' },

  { id: 's3', name: '小丑鱼', en: 'Clownfish', tier: 1, value: 4, r: 17, speed: 92, prob: 0.46, weight: 18, hp: 0,
    shape: 'torpedo', pattern: 'bands', len: 1.0, hgt: 1.0,
    body: '#ff8c3a', belly: '#ffe2c2', fin: '#e05e12', accent: '#fff4e0',
    outline: 'rgba(110,40,0,.7)', glow: null },

  { id: 's4', name: '黄尾鲷', en: 'Yellowtail Snapper', tier: 1, value: 6, r: 19, speed: 88, prob: 0.42, weight: 15, hp: 0,
    shape: 'torpedo', pattern: 'scales', len: 1.02, hgt: 0.98,
    body: '#ffd23e', belly: '#fff8d6', fin: '#e0a414', accent: '#fff0a8',
    outline: 'rgba(120,80,0,.65)', glow: null },

  /* ── 中型鱼 ───────────────────────────────────────────────── */
  { id: 'm1', name: '天使鱼', en: 'Angelfish', tier: 2, value: 14, r: 27, speed: 66, prob: 0.2, weight: 10, hp: 0,
    shape: 'angel', pattern: 'bands', len: 0.84, hgt: 1.7,
    body: '#8a6bff', belly: '#ece6ff', fin: '#5a34d8', accent: '#ffd867',
    outline: 'rgba(35,15,90,.8)', glow: 'rgba(150,110,255,.45)' },

  { id: 'm2', name: '蝴蝶鱼', en: 'Butterflyfish', tier: 2, value: 16, r: 28, speed: 70, prob: 0.18, weight: 9, hp: 0,
    shape: 'round', pattern: 'stripe', len: 0.9, hgt: 1.38,
    body: '#ffd23e', belly: '#fff6cf', fin: '#e0a414', accent: '#3a2a00',
    outline: 'rgba(110,75,0,.7)', glow: null },

  { id: 'm3', name: '狮子鱼', en: 'Lionfish', tier: 2, value: 24, r: 31, speed: 50, prob: 0.14, weight: 7, hp: 0,
    shape: 'lion', pattern: 'bands', len: 1.05, hgt: 1.15,
    body: '#e0573f', belly: '#ffe6d6', fin: '#fff0d0', accent: '#ffd867',
    outline: 'rgba(120,25,10,.75)', glow: 'rgba(255,150,80,.35)' },

  { id: 'm4', name: '河豚', en: 'Pufferfish', tier: 2, value: 22, r: 30, speed: 44, prob: 0.16, weight: 7, hp: 0,
    shape: 'puffer', pattern: 'spots', len: 1.0, hgt: 1.05,
    body: '#f5c542', belly: '#fff6da', fin: '#d98a10', accent: '#3a2a00',
    outline: 'rgba(110,75,0,.7)', glow: null },

  { id: 'm5', name: '灯笼鱼', en: 'Lanternfish', tier: 2, value: 30, r: 29, speed: 58, prob: 0.13, weight: 6, hp: 0,
    shape: 'lantern', pattern: 'mottle', len: 1.1, hgt: 1.1,
    body: '#2b3d5c', belly: '#7fa8d0', fin: '#1a2740', accent: '#ffd867',
    outline: 'rgba(0,10,25,.85)', glow: 'rgba(255,214,110,.65)' },

  /* ── 大型鱼 ───────────────────────────────────────────────── */
  { id: 'l1', name: '红莲鱼', en: 'Lotus Grouper', tier: 3, value: 48, r: 40, speed: 56, prob: 0.075, weight: 5, hp: 0,
    shape: 'round', pattern: 'spots', len: 1.08, hgt: 1.12,
    body: '#ff4d6d', belly: '#ffd3dc', fin: '#c41838', accent: '#fff0f4',
    outline: 'rgba(110,5,30,.8)', glow: 'rgba(255,90,130,.4)' },

  { id: 'l2', name: '剑齿鲨', en: 'Sabertooth Shark', tier: 3, value: 110, r: 52, speed: 86, prob: 0.03, weight: 3, hp: 0,
    shape: 'shark', pattern: 'shark', len: 1.18, hgt: 0.92,
    body: '#5f84a3', belly: '#dceaf6', fin: '#39536d', accent: '#ffffff',
    outline: 'rgba(10,35,55,.85)', glow: null },

  { id: 'l3', name: '魔鬼鱼', en: 'Manta Ray', tier: 3, value: 96, r: 54, speed: 60, prob: 0.034, weight: 3, hp: 0,
    shape: 'manta', pattern: 'mottle', len: 1.0, hgt: 0.8,
    body: '#43536f', belly: '#ccdaec', fin: '#2a364c', accent: '#e8f2ff',
    outline: 'rgba(5,15,30,.85)', glow: 'rgba(120,180,255,.3)' },

  { id: 'l4', name: '电鳗', en: 'Electric Eel', tier: 3, value: 84, r: 34, speed: 76, prob: 0.038, weight: 3, hp: 0,
    shape: 'eel', pattern: 'grid', len: 1.95, hgt: 0.72,
    body: '#4d7a48', belly: '#dcecc8', fin: '#8fd44a', accent: '#7cf5ff',
    outline: 'rgba(10,45,15,.85)', glow: 'rgba(120,245,255,.55)' },

  /* ── 稀有鱼 & BOSS ────────────────────────────────────────── */
  { id: 'gold', name: '黄金锦鲤', en: 'Golden Koi', tier: 3, value: 70, r: 26, speed: 126, prob: 0.2, weight: 2, hp: 0,
    rare: true, shape: 'torpedo', pattern: 'scales', len: 1.12, hgt: 1.0,
    body: '#ffd24a', belly: '#fff8d2', fin: '#ffae1a', accent: '#fff6c0',
    outline: 'rgba(140,80,0,.8)', glow: 'rgba(255,215,90,.9)' },

  { id: 'boss', name: '深海金龙', en: 'Abyss Golden Dragon', tier: 4, value: 420, r: 72, speed: 34, prob: 0, weight: 0, hp: 24,
    boss: true, shape: 'dragon', pattern: 'dragon', len: 1.45, hgt: 1.12,
    body: '#ffce4a', belly: '#fff4c2', fin: '#e0552a', accent: '#7cf5ff',
    outline: 'rgba(120,45,0,.9)', glow: 'rgba(255,190,60,.85)' },

  { id: 'boss2', name: '玄武巨鲸', en: 'Abyss Leviathan', tier: 4, value: 780, r: 84, speed: 28, prob: 0, weight: 0, hp: 36,
    boss: true, shape: 'whale', pattern: 'mottle', len: 1.35, hgt: 1.0,
    body: '#3d5c78', belly: '#d6e6f5', fin: '#24384f', accent: '#8fd8ff',
    outline: 'rgba(5,20,40,.9)', glow: 'rgba(120,200,255,.55)' }
];

/* ============================ 颜色工具 ============================ */
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function parseColor(c) {
  if (!c) return [255, 255, 255];
  if (c.charAt(0) === '#') return hexToRgb(c);
  const i = c.indexOf('('), j = c.indexOf(')');
  if (i < 0 || j < 0) return [255, 255, 255];
  const p = c.substring(i + 1, j).split(',');
  return [parseInt(p[0], 10) || 0, parseInt(p[1], 10) || 0, parseInt(p[2], 10) || 0];
}
function mix(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
    Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
    Math.round(a[2] + (b[2] - a[2]) * t) + ')';
}
function rgba(c, a) {
  const r = hexToRgb(c);
  return 'rgba(' + r[0] + ',' + r[1] + ',' + r[2] + ',' + a + ')';
}

/* ============================ 精灵缓存 ============================ */
const SPR = {};
function newCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/* 柔光光斑：替代 shadowBlur 与每帧径向渐变 */
function glowSprite(color) {
  const key = 'glow_' + color;
  if (SPR[key]) return SPR[key];
  const S = 96;
  const c = newCanvas(S, S);
  const g = c.getContext('2d');
  const rgb = parseColor(color);
  const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  rg.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.95)');
  rg.addColorStop(0.32, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.45)');
  rg.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, S, S);
  const s = { c: c, w: S, h: S };
  SPR[key] = s;
  return s;
}

/* 四角星屑 */
function starSprite(color) {
  const key = 'star_' + color;
  if (SPR[key]) return SPR[key];
  const S = 64;
  const c = newCanvas(S, S);
  const g = c.getContext('2d');
  const rgb = parseColor(color);
  const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  rg.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.4)');
  rg.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, S, S);
  g.translate(S / 2, S / 2);
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    g.lineTo(Math.cos(a) * S * 0.47, Math.sin(a) * S * 0.47);
    g.lineTo(Math.cos(a + Math.PI / 4) * S * 0.11, Math.sin(a + Math.PI / 4) * S * 0.11);
  }
  g.closePath();
  g.fill();
  const s = { c: c, w: S, h: S };
  SPR[key] = s;
  return s;
}

/* 气泡 */
function bubbleSprite() {
  if (SPR.bubble) return SPR.bubble;
  const S = 48;
  const c = newCanvas(S, S);
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(200,238,255,.75)';
  g.lineWidth = 2;
  g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2); g.stroke();
  const rg = g.createRadialGradient(S * 0.36, S * 0.34, 0, S * 0.36, S * 0.34, S * 0.28);
  rg.addColorStop(0, 'rgba(255,255,255,.85)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg;
  g.beginPath(); g.arc(S * 0.36, S * 0.34, S * 0.28, 0, Math.PI * 2); g.fill();
  const s = { c: c, w: S, h: S };
  SPR.bubble = s;
  return s;
}

/* 金币（自带光晕，避免 shadowBlur） */
function coinSprite(size) {
  const key = 'coin_' + size;
  if (SPR[key]) return SPR[key];
  const D = size * 3;
  const c = newCanvas(D, D);
  const g = c.getContext('2d');
  const R = D / 2;
  const halo = g.createRadialGradient(R, R, size * 0.9, R, R, R);
  halo.addColorStop(0, 'rgba(255,200,70,.55)');
  halo.addColorStop(1, 'rgba(255,200,70,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, D, D);
  const gr = g.createRadialGradient(R - size * 0.3, R - size * 0.35, 1, R, R, size);
  gr.addColorStop(0, '#fff6c0');
  gr.addColorStop(0.55, '#f6b93b');
  gr.addColorStop(1, '#c97b12');
  g.fillStyle = gr;
  g.beginPath(); g.arc(R, R, size, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(160,95,10,.85)';
  g.lineWidth = Math.max(1, size * 0.14);
  g.stroke();
  g.fillStyle = 'rgba(255,246,190,.8)';
  g.beginPath(); g.arc(R, R, size * 0.5, 0, Math.PI * 2); g.fill();
  const s = { c: c, w: D, h: D };
  SPR[key] = s;
  return s;
}

/* ============================ 贴图纹理 ============================ */
const TEX_CACHE = {};
function textureCanvas(pat) {
  if (TEX_CACHE[pat]) return TEX_CACHE[pat];
  const S = 48;
  const c = newCanvas(S, S);
  const g = c.getContext('2d');
  g.lineCap = 'round';
  if (pat === 'scales') {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const x = col * 6 + (row % 2 ? 3 : 0), y = row * 6;
        g.strokeStyle = 'rgba(255,255,255,.20)';
        g.lineWidth = 1.2;
        g.beginPath(); g.arc(x, y + 3, 3.6, Math.PI * 0.12, Math.PI * 0.88); g.stroke();
        g.strokeStyle = 'rgba(0,20,40,.16)';
        g.lineWidth = 1;
        g.beginPath(); g.arc(x, y + 4.4, 3.8, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
      }
    }
  } else if (pat === 'stripe') {
    for (let i = 0; i < 4; i++) {
      g.fillStyle = 'rgba(0,20,40,.17)';
      g.fillRect(i * 12, -10, 5, S + 20);
      g.fillStyle = 'rgba(255,255,255,.11)';
      g.fillRect(i * 12 + 6, -10, 2, S + 20);
    }
  } else if (pat === 'bands') {
    for (let i = 0; i < 2; i++) {
      g.fillStyle = 'rgba(255,255,255,.26)';
      g.fillRect(0, i * 24 + 4, S, 8);
      g.fillStyle = 'rgba(0,10,25,.10)';
      g.fillRect(0, i * 24 + 12, S, 3);
    }
  } else if (pat === 'spots' || pat === 'dot') {
    for (let i = 0; i < 14; i++) {
      g.fillStyle = 'rgba(255,255,255,.22)';
      g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 1.6 + Math.random() * 2.6, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 10; i++) {
      g.fillStyle = 'rgba(0,15,35,.14)';
      g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 1.4 + Math.random() * 2.2, 0, Math.PI * 2); g.fill();
    }
  } else if (pat === 'mottle') {
    for (let i = 0; i < 30; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(0,15,35,.12)' : 'rgba(255,255,255,.10)';
      g.beginPath();
      g.ellipse(Math.random() * S, Math.random() * S, 3 + Math.random() * 7, 2 + Math.random() * 4, Math.random() * 3, 0, Math.PI * 2);
      g.fill();
    }
  } else if (pat === 'grid') {
    g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      g.strokeStyle = 'rgba(140,255,255,.34)';
      g.beginPath(); g.moveTo(i * 12, 0); g.lineTo(i * 12, S); g.stroke();
      g.strokeStyle = 'rgba(140,255,255,.20)';
      g.beginPath(); g.moveTo(0, i * 12); g.lineTo(S, i * 12); g.stroke();
    }
  } else if (pat === 'neon') {
    g.fillStyle = 'rgba(90,255,230,.55)';
    g.fillRect(0, S * 0.6, S, 3.5);
    g.fillStyle = 'rgba(255,90,130,.38)';
    g.fillRect(0, S * 0.74, S, 2.5);
  } else if (pat === 'shark') {
    g.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      g.strokeStyle = 'rgba(255,255,255,.09)';
      const y = i * 4.6;
      g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,.18)';
    for (let i = 0; i < 20; i++) {
      g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 0.8 + Math.random(), 0, Math.PI * 2); g.fill();
    }
  } else if (pat === 'dragon') {
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = 'rgba(255,120,30,.38)';
      g.lineWidth = 2;
      g.beginPath(); g.arc(i * 14, 24, 9, -1.1, 1.1); g.stroke();
    }
  }
  TEX_CACHE[pat] = c;
  return c;
}

const PAT_CACHE = new WeakMap();
function fishPattern(c, pat) {
  let m = PAT_CACHE.get(c);
  if (!m) { m = {}; PAT_CACHE.set(c, m); }
  if (!m[pat]) m[pat] = c.createPattern(textureCanvas(pat), 'repeat');
  return m[pat];
}

/* ============================ 身体轮廓 ============================ */
function traceBody(g, L, H, shape) {
  const hl = L / 2, hh = H / 2;
  g.beginPath();
  if (shape === 'manta') {
    g.moveTo(hl, 0);
    g.quadraticCurveTo(hl * 0.1, -hh * 1.5, -hl * 0.7, -hh * 1.8);
    g.quadraticCurveTo(-hl * 1.02, -hh * 1.15, -hl * 1.04, 0);
    g.quadraticCurveTo(-hl * 1.02, hh * 1.15, -hl * 0.7, hh * 1.8);
    g.quadraticCurveTo(hl * 0.1, hh * 1.5, hl, 0);
  } else if (shape === 'shark' || shape === 'whale') {
    g.moveTo(hl, -hh * 0.1);
    g.quadraticCurveTo(hl * 0.44, -hh * (shape === 'whale' ? 1.02 : 0.9), -hl * 0.42, -hh * 0.86);
    g.quadraticCurveTo(-hl * 0.85, -hh * 0.7, -hl * 0.95, -hh * 0.26);
    g.quadraticCurveTo(-hl * 1.02, 0, -hl * 0.95, hh * 0.26);
    g.quadraticCurveTo(-hl * 0.85, hh * 0.7, -hl * 0.42, hh * 0.9);
    g.quadraticCurveTo(hl * 0.44, hh * (shape === 'whale' ? 1.1 : 0.98), hl, hh * 0.1);
  } else if (shape === 'dragon') {
    g.moveTo(hl, -hh * 0.06);
    g.quadraticCurveTo(hl * 0.5, -hh * 1.0, -hl * 0.3, -hh * 0.86);
    g.quadraticCurveTo(-hl * 0.82, -hh * 0.6, -hl * 0.98, 0);
    g.quadraticCurveTo(-hl * 0.82, hh * 0.6, -hl * 0.3, hh * 0.86);
    g.quadraticCurveTo(hl * 0.5, hh * 1.0, hl, hh * 0.06);
  } else if (shape === 'puffer') {
    g.moveTo(hl * 0.95, 0);
    g.quadraticCurveTo(hl * 0.95, -hh * 1.0, 0, -hh * 1.02);
    g.quadraticCurveTo(-hl * 0.95, -hh * 1.0, -hl * 0.95, 0);
    g.quadraticCurveTo(-hl * 0.95, hh * 1.0, 0, hh * 1.02);
    g.quadraticCurveTo(hl * 0.95, hh * 1.0, hl * 0.95, 0);
  } else if (shape === 'round' || shape === 'angel' || shape === 'lantern') {
    g.moveTo(hl * 0.96, 0);
    g.quadraticCurveTo(hl * 0.86, -hh * 1.05, 0, -hh * 1.12);
    g.quadraticCurveTo(-hl * 0.86, -hh * 1.0, -hl * 0.92, 0);
    g.quadraticCurveTo(-hl * 0.86, hh * 1.0, 0, hh * 1.12);
    g.quadraticCurveTo(hl * 0.86, hh * 1.05, hl * 0.96, 0);
  } else {
    g.moveTo(hl, 0);
    g.quadraticCurveTo(hl * 0.55, -hh * 1.02, -hl * 0.28, -hh * 0.9);
    g.quadraticCurveTo(-hl * 0.82, -hh * 0.62, -hl, 0);
    g.quadraticCurveTo(-hl * 0.82, hh * 0.62, -hl * 0.28, hh * 0.9);
    g.quadraticCurveTo(hl * 0.55, hh * 1.02, hl, 0);
  }
  g.closePath();
}

/* ============================ 鱼鳍（动画，逐帧绘制） ============================ */
function drawTailFin(g, tp, L, H, wag) {
  const hh = H / 2, shape = tp.shape;
  g.save();
  g.translate(-L * 0.45, 0);
  g.rotate(wag);
  g.globalAlpha *= 0.95;
  g.fillStyle = tp.fin;
  g.beginPath();
  if (shape === 'manta') {
    g.moveTo(0, -hh * 0.1);
    g.quadraticCurveTo(-L * 0.42, -hh * 0.28, -L * 0.92, -hh * 0.06);
    g.quadraticCurveTo(-L * 0.42, hh * 0.24, 0, hh * 0.1);
  } else if (shape === 'whale') {
    g.moveTo(0, 0);
    g.quadraticCurveTo(-L * 0.14, -hh * 0.7, -L * 0.34, -hh * 1.05);
    g.quadraticCurveTo(-L * 0.18, -hh * 0.2, -L * 0.24, 0);
    g.quadraticCurveTo(-L * 0.18, hh * 0.2, -L * 0.34, hh * 1.05);
    g.quadraticCurveTo(-L * 0.14, hh * 0.7, 0, 0);
  } else if (shape === 'puffer' || shape === 'lantern') {
    g.moveTo(0, -hh * 0.16);
    g.quadraticCurveTo(-L * 0.16, -hh * 0.6, -L * 0.3, -hh * 0.52);
    g.quadraticCurveTo(-L * 0.2, 0, -L * 0.3, hh * 0.52);
    g.quadraticCurveTo(-L * 0.16, hh * 0.6, 0, hh * 0.16);
  } else if (shape === 'eel') {
    g.moveTo(0, -hh * 0.5);
    g.quadraticCurveTo(-L * 0.2, -hh * 0.95, -L * 0.4, 0);
    g.quadraticCurveTo(-L * 0.2, hh * 0.95, 0, hh * 0.5);
  } else if (shape === 'dragon') {
    g.moveTo(0, 0);
    g.quadraticCurveTo(-L * 0.2, -hh * 0.95, -L * 0.38, -hh * 0.72);
    g.quadraticCurveTo(-L * 0.22, 0, -L * 0.38, hh * 0.72);
    g.quadraticCurveTo(-L * 0.2, hh * 0.95, 0, 0);
  } else {
    g.moveTo(0, -hh * 0.06);
    g.quadraticCurveTo(-L * 0.14, -hh * 0.5, -L * 0.3, -hh * 0.8);
    g.quadraticCurveTo(-L * 0.2, -hh * 0.26, -L * 0.14, 0);
    g.quadraticCurveTo(-L * 0.2, hh * 0.26, -L * 0.3, hh * 0.8);
    g.quadraticCurveTo(-L * 0.14, hh * 0.5, 0, hh * 0.06);
    g.closePath();
  }
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.28)';
  g.lineWidth = Math.max(1, tp.r * 0.045);
  g.beginPath();
  for (let i = -2; i <= 2; i++) {
    g.moveTo(0, 0);
    g.quadraticCurveTo(-L * 0.16, i * hh * 0.18, -L * 0.32, i * hh * 0.34);
  }
  g.stroke();
  g.restore();
}

function drawDorsalFin(g, tp, L, H, flap) {
  const hh = H / 2, shape = tp.shape;
  if (shape === 'manta') return;
  g.save();
  g.fillStyle = tp.fin;
  g.globalAlpha *= 0.94;
  if (shape === 'shark' || shape === 'whale') {
    const x = shape === 'whale' ? -L * 0.12 : -L * 0.02;
    g.beginPath();
    g.moveTo(x + L * 0.15, -hh * 0.7);
    g.quadraticCurveTo(x - L * 0.02, -hh * (shape === 'whale' ? 1.55 : 1.95), x - L * 0.17, -hh * 0.66);
    g.closePath();
    g.fill();
  } else if (shape === 'dragon') {
    g.beginPath();
    g.moveTo(L * 0.38, -hh * 0.58);
    for (let i = 0; i < 7; i++) {
      const x = L * 0.38 - i * L * 0.12;
      g.lineTo(x, -hh * (1.0 + (i % 2 ? 0.3 : 0)) - Math.sin(flap + i) * 2.5);
      g.lineTo(x - L * 0.055, -hh * 0.58);
    }
    g.closePath();
    g.fill();
  } else if (shape === 'lion') {
    g.strokeStyle = tp.fin;
    g.lineWidth = Math.max(1.6, tp.r * 0.085);
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const x = L * 0.3 - i * L * 0.1;
      g.moveTo(x, -hh * 0.6);
      g.quadraticCurveTo(x - L * 0.05, -hh * 1.4, x - L * 0.16 + Math.sin(flap + i) * 3, -hh * (1.5 + (i % 2) * 0.5));
    }
    g.stroke();
  } else if (shape === 'eel') {
    g.globalAlpha *= 0.6;
    g.beginPath();
    g.moveTo(L * 0.44, -hh * 0.66);
    g.quadraticCurveTo(0, -hh * 1.5, -L * 0.5, -hh * 0.36);
    g.quadraticCurveTo(0, -hh * 0.92, L * 0.44, -hh * 0.66);
    g.fill();
  } else if (shape === 'angel') {
    g.beginPath();
    g.moveTo(L * 0.34, -hh * 0.86);
    g.quadraticCurveTo(L * 0.04, -hh * 1.95, -L * 0.32, -hh * 0.95);
    g.quadraticCurveTo(-L * 0.02, -hh * 1.15, L * 0.34, -hh * 0.86);
    g.fill();
  } else {
    g.beginPath();
    g.moveTo(L * 0.3, -hh * 0.72);
    g.quadraticCurveTo(L * 0.02, -hh * (1.28 + flap * 0.05), -L * 0.34, -hh * 0.72);
    g.quadraticCurveTo(-L * 0.02, -hh * 0.9, L * 0.3, -hh * 0.72);
    g.fill();
  }
  g.restore();
}

function drawAnalFin(g, tp, L, H, flap) {
  const shape = tp.shape;
  if (shape === 'manta' || shape === 'dragon') return;
  const hh = H / 2;
  g.save();
  g.fillStyle = tp.fin;
  g.globalAlpha *= 0.9;
  if (shape === 'lion') {
    g.strokeStyle = tp.fin;
    g.lineWidth = Math.max(1.4, tp.r * 0.07);
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const x = L * 0.08 - i * L * 0.09;
      g.moveTo(x, hh * 0.66);
      g.quadraticCurveTo(x - L * 0.02, hh * 1.3, x - L * 0.12 + Math.sin(flap + i) * 3, hh * (1.45 + (i % 2) * 0.4));
    }
    g.stroke();
  } else if (shape === 'angel') {
    g.beginPath();
    g.moveTo(L * 0.24, hh * 0.9);
    g.quadraticCurveTo(-L * 0.05, hh * 1.75, -L * 0.34, hh * 0.95);
    g.quadraticCurveTo(-L * 0.02, hh * 1.05, L * 0.24, hh * 0.9);
    g.fill();
  } else {
    g.beginPath();
    g.moveTo(L * 0.02, hh * 0.66);
    g.quadraticCurveTo(-L * 0.1, hh * (1.05 + flap * 0.05), -L * 0.32, hh * 0.66);
    g.quadraticCurveTo(-L * 0.1, hh * 0.82, L * 0.02, hh * 0.66);
    g.fill();
  }
  g.restore();
}

function drawPectoralFin(g, tp, L, H, flap, side) {
  g.save();
  g.translate(L * 0.14, H * 0.28);
  g.rotate((side || 1) * (0.42 + Math.sin(flap) * 0.3));
  g.fillStyle = tp.fin;
  g.globalAlpha *= 0.78;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(-L * 0.1, H * 0.18, -L * 0.3, H * 0.06);
  g.quadraticCurveTo(-L * 0.12, -H * 0.05, 0, 0);
  g.fill();
  g.restore();
}

function drawEye(g, tp, L, H, xEyes) {
  const ex = L * 0.3, ey = -H * 0.13, er = Math.max(2.2, tp.r * 0.125);
  if (xEyes) {
    g.strokeStyle = '#1b2430';
    g.lineWidth = Math.max(1.4, er * 0.5);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(ex - er, ey - er); g.lineTo(ex + er, ey + er);
    g.moveTo(ex + er, ey - er); g.lineTo(ex - er, ey + er);
    g.stroke();
    return;
  }
  g.fillStyle = '#f7fbff';
  g.beginPath(); g.arc(ex, ey, er, 0, Math.PI * 2); g.fill();
  g.fillStyle = tp.eye || '#12222e';
  g.beginPath(); g.arc(ex + er * 0.18, ey, er * 0.62, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.92)';
  g.beginPath(); g.arc(ex - er * 0.3, ey - er * 0.32, er * 0.26, 0, Math.PI * 2); g.fill();
}

/* ============================ 物种特征（动画部分） ============================ */
function drawExtras(g, tp, L, H, t, flap, shape) {
  const hh = H / 2;

  if (shape === 'dragon') {
    g.save();
    g.strokeStyle = tp.fin;
    g.lineWidth = Math.max(1.4, tp.r * 0.06);
    g.lineCap = 'round';
    g.beginPath();
    for (let s = -1; s <= 1; s += 2) {
      g.moveTo(L * 0.42, hh * 0.14 * s);
      g.quadraticCurveTo(L * 0.72, (hh * 0.5 + Math.sin(t * 4) * 6) * s, L * 0.88, (hh * 0.95 + Math.cos(t * 3.4) * 9) * s);
    }
    g.stroke();
    g.fillStyle = '#ffedb8';
    g.strokeStyle = 'rgba(201,123,18,.85)';
    g.lineWidth = Math.max(1, tp.r * 0.035);
    for (let i = 0; i < 2; i++) {
      const bx = L * (0.34 - i * 0.12);
      g.beginPath();
      g.moveTo(bx, -hh * 0.84);
      g.quadraticCurveTo(bx - L * 0.05, -hh * 1.5, bx - L * 0.2, -hh * 1.78);
      g.quadraticCurveTo(bx - L * 0.05, -hh * 1.22, bx - L * 0.13, -hh * 0.84);
      g.closePath();
      g.fill(); g.stroke();
    }
    g.restore();
  } else if (shape === 'lantern') {
    const pulse = 0.6 + Math.sin(t * 5) * 0.4;
    const R = tp.r * 1.05 * (0.8 + pulse * 0.4);
    const gs = glowSprite('#ffd867');
    g.globalAlpha *= 0.85;
    g.drawImage(gs.c, L * 0.72 - R, -hh * 1.62 - R, R * 2, R * 2);
    g.globalAlpha /= 0.85;
    g.strokeStyle = 'rgba(223,233,245,.8)';
    g.lineWidth = Math.max(1, tp.r * 0.05);
    g.beginPath();
    g.moveTo(L * 0.36, -hh * 0.66);
    g.quadraticCurveTo(L * 0.5, -hh * 1.5, L * 0.72, -hh * 1.62);
    g.stroke();
    g.fillStyle = '#fff6c0';
    g.beginPath(); g.arc(L * 0.72, -hh * 1.62, tp.r * 0.15 * (0.8 + pulse * 0.4), 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(180,240,255,.4)';
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const rr = 1 + Math.abs(Math.sin(t * 3 + i)) * 1.2;
      g.moveTo(L * 0.3 - i * L * 0.12 + rr, hh * (i % 2 ? 0.34 : -0.22));
      g.arc(L * 0.3 - i * L * 0.12, hh * (i % 2 ? 0.34 : -0.22), rr, 0, Math.PI * 2);
    }
    g.fill();
  } else if (shape === 'puffer') {
    g.strokeStyle = 'rgba(107,74,5,.6)';
    g.lineWidth = Math.max(1, tp.r * 0.045);
    g.beginPath();
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2;
      const rx = L * 0.46 * Math.cos(a), ry = hh * 1.0 * Math.sin(a);
      g.moveTo(rx * 0.9, ry * 0.9);
      g.lineTo(rx * 1.2, ry * 1.2);
    }
    g.stroke();
  } else if (shape === 'lion') {
    g.strokeStyle = tp.fin;
    g.globalAlpha *= 0.85;
    g.lineWidth = Math.max(1.2, tp.r * 0.055);
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      g.moveTo(L * 0.2, hh * 0.5);
      g.quadraticCurveTo(L * 0.08 + Math.sin(flap + i) * 4, hh * (1.0 + i * 0.18), L * 0.02 - i * L * 0.05, hh * (1.28 + i * 0.26));
    }
    g.stroke();
  } else if (shape === 'shark') {
    g.strokeStyle = 'rgba(10,25,45,.5)';
    g.lineWidth = Math.max(1, tp.r * 0.05);
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const x = L * 0.18 - i * L * 0.075;
      g.moveTo(x, -hh * 0.5);
      g.quadraticCurveTo(x + 4, 0, x, hh * 0.42);
    }
    g.stroke();
    g.fillStyle = '#f7fbff';
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const x = L * 0.42 - i * L * 0.05;
      g.moveTo(x, hh * 0.14);
      g.lineTo(x + L * 0.02, hh * 0.14);
      g.lineTo(x + L * 0.01, hh * 0.34);
    }
    g.fill();
  } else if (shape === 'manta') {
    g.fillStyle = tp.fin;
    g.beginPath();
    for (let s = -1; s <= 1; s += 2) {
      g.moveTo(L * 0.44, hh * 0.36 * s);
      g.quadraticCurveTo(L * 0.66, (hh * 0.5 + Math.sin(flap) * 6) * s, L * 0.8, hh * 0.95 * s);
      g.quadraticCurveTo(L * 0.56, hh * 0.7 * s, L * 0.44, hh * 0.36 * s);
    }
    g.fill();
    g.strokeStyle = 'rgba(0,15,30,.4)';
    g.lineWidth = Math.max(1, tp.r * 0.04);
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      const x = L * 0.06 - i * L * 0.08;
      g.moveTo(x, hh * 0.5); g.lineTo(x, hh * 0.8);
    }
    g.stroke();
  }
}

/* ============================ 身体本体（预渲染进精灵） ============================ */
function drawBodyCore(g, tp, L, H) {
  const hh = H / 2;
  traceBody(g, L, H, tp.shape);
  const bg = g.createLinearGradient(0, -hh * 1.05, 0, hh * 1.15);
  bg.addColorStop(0, mix(tp.body, '#00121f', 0.36));
  bg.addColorStop(0.44, tp.body);
  bg.addColorStop(1, tp.belly);
  g.fillStyle = bg;
  g.fill();

  if (tp.pattern && tp.pattern !== 'none') {
    const pat = fishPattern(g, tp.pattern);
    if (pat) {
      g.save();
      g.globalAlpha = 0.62;
      g.fillStyle = pat;
      g.fill();
      g.restore();
    }
  }

  g.save();
  traceBody(g, L, H, tp.shape);
  g.clip();
  const hi = g.createRadialGradient(L * 0.16, -hh * 0.52, 1, L * 0.08, -hh * 0.3, H * 0.98);
  hi.addColorStop(0, 'rgba(255,255,255,.44)');
  hi.addColorStop(0.5, 'rgba(255,255,255,.08)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hi;
  g.fillRect(-L, -H * 1.5, L * 2, H * 3);
  const sh = g.createLinearGradient(0, hh * 0.05, 0, hh * 1.25);
  sh.addColorStop(0, 'rgba(0,20,40,0)');
  sh.addColorStop(1, 'rgba(0,15,35,.38)');
  g.fillStyle = sh;
  g.fillRect(-L, 0, L * 2, H * 1.7);
  g.restore();

  traceBody(g, L, H, tp.shape);
  g.strokeStyle = tp.outline || 'rgba(0,20,40,.7)';
  g.lineWidth = Math.max(1, tp.r * 0.055);
  g.stroke();

  g.strokeStyle = 'rgba(0,15,35,.26)';
  g.lineWidth = Math.max(1, tp.r * 0.045);
  g.beginPath();
  g.moveTo(L * 0.2, -hh * 0.7);
  g.quadraticCurveTo(L * 0.1, 0, L * 0.2, hh * 0.66);
  g.stroke();

  g.beginPath();
  g.moveTo(L * 0.46, hh * 0.12);
  g.quadraticCurveTo(L * 0.33, hh * 0.3, L * 0.26, hh * 0.08);
  g.stroke();
}

const BODY_SPR = {};
function bodySprite(tp) {
  const key = tp.id;
  if (BODY_SPR[key]) return BODY_SPR[key];
  const L = tp.r * 2.2 * (tp.len || 1);
  const H = tp.r * 1.32 * (tp.hgt || 1);
  const w = L * 1.16, h = H * 1.5;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = newCanvas(w * dpr, h * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.translate(w / 2, h / 2);
  drawBodyCore(g, tp, L, H);
  const s = { c: c, w: w, h: h };
  BODY_SPR[key] = s;
  return s;
}

/* ============================ 主绘制（零渐变 / 零阴影） ============================ */
function fishDrawBody(ctx, t, tp, caught, opts) {
  opts = opts || {};
  const shape = tp.shape || 'torpedo';
  const L = tp.r * 2.2 * (tp.len || 1);
  const H = tp.r * 1.32 * (tp.hgt || 1);
  const phase = opts.phase || 0;
  let wf = 8.4;
  if (shape === 'eel') wf = 5.4;
  else if (shape === 'manta') wf = 4.2;
  else if (shape === 'puffer') wf = 11;
  else if (shape === 'angel' || shape === 'lion') wf = 6.4;
  const wag = Math.sin(t * wf + phase) * (shape === 'eel' ? 0.44 : 0.3);
  const flap = Math.sin(t * wf * 1.08 + phase + 1.2);

  if (caught) ctx.globalAlpha *= Math.max(0, 1 - t / 0.9);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  drawTailFin(ctx, tp, L, H, wag);
  drawDorsalFin(ctx, tp, L, H, flap);
  drawAnalFin(ctx, tp, L, H, flap);

  const s = bodySprite(tp);
  ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);

  drawPectoralFin(ctx, tp, L, H, flap, 1);
  drawExtras(ctx, tp, L, H, t, flap, shape);
  drawEye(ctx, tp, L, H, opts.xEyes);
}

/* ============================ 生成器辅助 ============================ */
function pickFrom(list) {
  let w = 0;
  for (let i = 0; i < list.length; i++) w += list[i].weight || 1;
  let r = Math.random() * w;
  for (let i = 0; i < list.length; i++) {
    r -= list[i].weight || 1;
    if (r <= 0) return list[i];
  }
  return list[0];
}
function pickSmall() { return pickFrom(FISH_TYPES.filter(function (t) { return t.tier === 1; })); }
function pickMedium() { return pickFrom(FISH_TYPES.filter(function (t) { return t.tier === 2; })); }
function pickLarge() { return pickFrom(FISH_TYPES.filter(function (t) { return t.tier === 3 && !t.rare; })); }
function pickBoss() {
  const b = FISH_TYPES.filter(function (t) { return t.boss; });
  return b[Math.random() * b.length | 0];
}

/* ============================ 鱼 ============================ */
class Fish {
  constructor(tp, W, H, dir) {
    this.tp = tp;
    this.dir = dir;
    this.r = tp.r;
    this.hp = tp.hp;
    this.maxHp = tp.hp;
    this.hitFlash = 0;
    this.caught = false;
    this.caughtT = 0;
    this.t = Math.random() * 10;
    this.wobble = Math.random() * Math.PI * 2;
    this.phase = Math.random() * Math.PI * 2;
    const margin = tp.r * 2.5;
    this.x = dir > 0 ? -margin : W + margin;
    this.y = tp.r + 50 + Math.random() * Math.max(20, H - tp.r * 2 - 120);
    const targetY = tp.r + 40 + Math.random() * Math.max(20, H - tp.r * 2 - 110);
    this.baseAngle = Math.atan2(targetY - this.y, (W + margin * 2) * dir);
    this.pathKind = Math.random() < 0.55 ? 0 : (Math.random() < 0.6 ? 1 : 2);
    this.amp = 20 + Math.random() * 46;
    this.freq = 0.008 + Math.random() * 0.01;
    this.turn = (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.25);
    this.turnT = 0;
    this.angle = this.baseAngle;
    this.dead = false;
    this.sparkleT = Math.random() * 0.3;
    this.wakeT = 0;
  }
  update(dt, W, H, world) {
    this.t += dt;
    if (this.caught) {
      this.caughtT += dt;
      this.y -= 46 * dt;
      this.x += Math.sin(this.caughtT * 12) * 18 * dt;
      if (this.caughtT > 0.9) this.dead = true;
      return;
    }
    let a = this.baseAngle;
    if (this.pathKind === 1) {
      a += Math.sin(this.t * this.freq * 60 + this.wobble) * 0.55;
    } else if (this.pathKind === 2) {
      this.turnT += dt;
      if (this.turnT > 1.1 && this.turnT < 2.3) a += this.turn * (this.turnT - 1.1);
      if (this.turnT >= 2.3) a += this.turn * 1.2;
    }
    const sp = this.tp.speed * (1 + Math.sin(this.t * 3 + this.wobble) * 0.12);
    this.x += Math.cos(a) * sp * dt;
    this.y += Math.sin(a) * sp * dt;
    if (this.y < this.r) this.y = this.r;
    if (this.y > H - this.r) this.y = H - this.r;
    this.angle = a;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (world && world.fx.length < world.fxCap) {
      if (this.tp.glow || this.tp.rare) {
        this.sparkleT -= dt;
        if (this.sparkleT <= 0) {
          this.sparkleT = 0.3 + Math.random() * 0.4;
          world.fx.push(new Particle(this.x + (Math.random() - 0.5) * this.r * 2, this.y + (Math.random() - 0.5) * this.r * 1.5,
            { kind: 'star', color: this.tp.rare ? '#fff3b0' : '#bfe8ff', speed: 16, dur: 0.7, r: 1.6 + Math.random() * 1.6, grav: -16, drag: 1 }));
        }
      }
      if (this.tp.r >= 34) {
        this.wakeT -= dt;
        if (this.wakeT <= 0) {
          this.wakeT = 0.16 + Math.random() * 0.2;
          const ang = this.angle || 0;
          world.fx.push(new Particle(this.x - Math.cos(ang) * this.r * 1.7, this.y - Math.sin(ang) * this.r * 1.7,
            { kind: 'bubble', color: '#cfeeff', speed: 14, angle: -Math.PI / 2 + (Math.random() - 0.5), dur: 0.9 + Math.random() * 0.7, r: 1.4 + Math.random() * 3, grav: -30, drag: 0.5 }));
        }
      }
      if (this.tp.id === 'l4' && Math.random() < dt * 1.4) {
        world.fx.push(new Ring(this.x, this.y, { r0: this.r * 0.3, r1: this.r * 1.7, dur: 0.36, color: 'rgba(124,245,255,1)', width: 2 }));
        for (let i = 0; i < 3; i++) {
          world.fx.push(new Particle(this.x, this.y, { kind: 'dot', color: '#7cf5ff', speed: 130, dur: 0.3, r: 2, grav: 0, drag: 3 }));
        }
      }
    }

    const m = this.r * 3;
    if ((this.dir > 0 && this.x > W + m) || (this.dir < 0 && this.x < -m)) this.dead = true;
  }
  draw(ctx) {
    const caught = this.caught;
    const k = caught ? Math.min(1, this.caughtT / 0.85) : 0;
    const tp = this.tp;

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.save();
    ctx.globalAlpha = 0.2 * (1 - k);
    ctx.fillStyle = '#001428';
    ctx.beginPath();
    ctx.ellipse(this.r * 0.12, this.r * 0.95, this.r * 1.05, this.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if ((tp.glow || tp.rare) && !caught) {
      const gs = glowSprite(tp.glow || 'rgba(255,215,90,.9)');
      const R = this.r * (2.3 + Math.sin(this.t * 4 + this.wobble) * 0.16);
      ctx.save();
      ctx.globalAlpha = 0.26 + 0.1 * Math.sin(this.t * 4 + this.wobble);
      ctx.drawImage(gs.c, -R, -R, R * 2, R * 2);
      ctx.restore();
    }

    const ang = (this.angle === undefined ? (this.dir > 0 ? 0 : Math.PI) : this.angle);
    const flip = Math.cos(ang) < 0 ? -1 : 1;
    ctx.rotate(flip === 1 ? ang : Math.PI - ang);
    if (caught) {
      ctx.rotate((flip === 1 ? 1 : -1) * k * 6.5);
      const s = Math.max(0.08, 1 - k * 0.9);
      ctx.scale(s, s);
    }

    if (this.hitFlash > 0) {
      const ws = glowSprite('#ffffff');
      const R = this.r * 1.9;
      ctx.save();
      ctx.globalAlpha = Math.min(0.75, this.hitFlash * 4);
      ctx.drawImage(ws.c, -R, -R, R * 2, R * 2);
      ctx.restore();
    }

    ctx.globalAlpha = caught ? Math.max(0, 1 - k * 0.95) : 1;
    fishDrawBody(ctx, this.t, tp, false, { phase: this.phase, xEyes: caught });
    ctx.restore();

    if (this.maxHp > 0 && this.hp < this.maxHp && !this.caught) {
      const w = this.r * 1.8, y = this.y - this.r * 1.15 - 20;
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(this.x - w / 2, y, w, 8);
      const p = this.hp / this.maxHp;
      ctx.fillStyle = p > 0.5 ? '#7dff6e' : (p > 0.25 ? '#ffd23e' : '#ff5b4d');
      ctx.fillRect(this.x - w / 2 + 1, y + 1, (w - 2) * p, 6);
      ctx.strokeStyle = 'rgba(255,255,255,.65)';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - w / 2, y, w, 8);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = '700 10px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tp.name + ' ' + Math.max(0, Math.ceil(this.hp)) + '/' + this.maxHp, this.x, y - 4);
    }
  }
  get hitR() { return this.r * 1.12; }
}

/* ============================ 子弹 ============================ */
const BULLET_COLORS = ['#7ec9ff', '#c77eff', '#ffb84d'];
class Bullet {
  constructor(x, y, angle, mult, level) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * 920;
    this.vy = Math.sin(angle) * 920;
    this.mult = mult;
    this.level = level;
    this.dead = false;
    this.trail = [];
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -40 || this.x > window.innerWidth + 40 || this.y < -40 || this.y > window.innerHeight + 40) this.dead = true;
  }
  draw(ctx) {
    const color = BULLET_COLORS[this.level];
    const sp = glowSprite(color);
    const tr = this.trail;
    for (let i = 0; i < tr.length; i++) {
      const a = (i + 1) / tr.length;
      const R = (this.level * 2.2 * a + 3) * 1.9;
      ctx.globalAlpha = a * 0.34;
      ctx.drawImage(sp.c, tr[i].x - R, tr[i].y - R, R * 2, R * 2);
    }
    const R = (5 + this.level * 3) * 2.0;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(sp.c, this.x - R, this.y - R, R * 2, R * 2);
    const core = glowSprite('#ffffff');
    const CR = 3.4 + this.level * 1.4;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(core.c, this.x - CR, this.y - CR, CR * 2, CR * 2);
    ctx.globalAlpha = 1;
  }
}

/* ============================ 渔网 ============================ */
class Net {
  constructor(x, y, mult, level) {
    this.x = x; this.y = y;
    this.mult = mult;
    this.level = level;
    this.maxR = 58 + level * 16;
    this.t = 0;
    this.judged = false;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    if (this.t >= 0.18 && !this.judged) { this.judged = true; if (this.onSpread) this.onSpread(this); }
    if (this.t > 0.62) this.dead = true;
  }
  get r() { return this.t < 0.18 ? this.maxR * (this.t / 0.18) : this.maxR; }
  get alpha() { return this.t < 0.42 ? 1 : Math.max(0, 1 - (this.t - 0.42) / 0.2); }
  draw(ctx) {
    const r = this.r, a = this.alpha;
    const sp = glowSprite('#ffd87a');
    ctx.globalAlpha = a * 0.45;
    ctx.drawImage(sp.c, this.x - r, this.y - r, r * 2, r * 2);

    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffe9a0';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = 'rgba(255,233,160,.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 1; i <= 3; i++) {
      const rr = r * (1 - i * 0.24);
      ctx.moveTo(this.x + rr, this.y);
      ctx.arc(this.x, this.y, rr, 0, Math.PI * 2);
    }
    ctx.stroke();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.t * 2.4);
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const ang = i * Math.PI / 6;
      ctx.moveTo(Math.cos(ang) * r * 0.22, Math.sin(ang) * r * 0.22);
      ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.stroke();
    ctx.restore();

    if (this.level >= 1) {
      ctx.strokeStyle = this.level >= 2 ? 'rgba(255,230,140,.9)' : 'rgba(160,220,255,.85)';
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) {
        const a0 = Math.random() * Math.PI * 2;
        let px = this.x + Math.cos(a0) * r * 0.3, py = this.y + Math.sin(a0) * r * 0.3;
        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let s = 0; s < 4; s++) {
          px += Math.cos(a0 + (Math.random() - 0.5) * 1.6) * r * 0.24;
          py += Math.sin(a0 + (Math.random() - 0.5) * 1.6) * r * 0.24;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}

/* ============================ 金币飞行 ============================ */
class CoinFly {
  constructor(x, y, tx, ty, count, onArrive) {
    this.sx = x; this.sy = y;
    this.tx = tx; this.ty = ty;
    this.t = 0;
    this.dur = 0.7;
    const mx = (x + tx) / 2, my = Math.min(y, ty) - 90 - Math.random() * 60;
    this.cx1 = x + (mx - x) * 0.4; this.cy1 = my;
    this.cx2 = tx - (tx - mx) * 0.4; this.cy2 = my;
    this.count = count;
    this.onArrive = onArrive;
    this.dead = false;
    this.spin = Math.random() * Math.PI;
    this.size = Math.round(8 + Math.min(6, Math.log(Math.max(1, count)) * 2.2));
  }
  update(dt) {
    this.t += dt;
    this.spin += dt * 10;
    if (this.t >= this.dur) { this.dead = true; if (this.onArrive) this.onArrive(this.count); }
  }
  static point(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  }
  draw(ctx) {
    const t = Math.min(1, this.t / this.dur);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const x = CoinFly.point(this.sx, this.cx1, this.cx2, this.tx, e);
    const y = CoinFly.point(this.sy, this.cy1, this.cy2, this.ty, e);
    const sc = Math.abs(Math.cos(this.spin)) * 0.82 + 0.18;
    const sp = coinSprite(this.size);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, 1);
    ctx.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
    ctx.restore();
  }
}

/* ============================ 粒子（纯 drawImage） ============================ */
class Particle {
  constructor(x, y, o) {
    o = o || {};
    this.x = x; this.y = y;
    const a = (o.angle === undefined) ? Math.random() * Math.PI * 2 : o.angle;
    const sp = (o.speed === undefined ? 120 : o.speed) * (o.spread === undefined ? 1 : o.spread);
    this.vx = Math.cos(a) * sp;
    this.vy = Math.sin(a) * sp;
    this.t = 0;
    this.dur = o.dur === undefined ? 0.6 : o.dur;
    this.r = o.r === undefined ? 3 : o.r;
    this.color = o.color || '#ffffff';
    this.kind = o.kind || 'dot';
    this.grav = o.grav === undefined ? 40 : o.grav;
    this.drag = o.drag === undefined ? 0.5 : o.drag;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    this.vx -= this.vx * this.drag * dt;
    this.vy -= this.vy * this.drag * dt;
    this.vy += this.grav * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.t > this.dur) this.dead = true;
  }
  draw(ctx) {
    const k = 1 - this.t / this.dur;
    if (k <= 0) return;
    ctx.globalAlpha = k > 1 ? 1 : k;
    const grow = 1 + (1 - k) * 0.7;
    if (this.kind === 'star') {
      const sp = starSprite(this.color);
      const R = this.r * 3.2 * grow;
      ctx.drawImage(sp.c, this.x - R, this.y - R, R * 2, R * 2);
    } else if (this.kind === 'bubble') {
      const sp = bubbleSprite();
      const R = this.r * (1 + this.t * 1.5) * 1.9;
      ctx.drawImage(sp.c, this.x - R, this.y - R, R * 2, R * 2);
    } else if (this.kind === 'shard') {
      ctx.fillStyle = this.color;
      const w = this.r * 3.2 * k + 1;
      ctx.fillRect(this.x - w / 2, this.y - this.r * 0.4, w, this.r * 0.8);
    } else {
      const sp = glowSprite(this.color);
      const R = this.r * 2.4 * grow;
      ctx.drawImage(sp.c, this.x - R, this.y - R, R * 2, R * 2);
    }
  }
}

/* ============================ 冲击波 ============================ */
class Ring {
  constructor(x, y, o) {
    o = o || {};
    this.x = x; this.y = y;
    this.r0 = o.r0 === undefined ? 6 : o.r0;
    this.r1 = o.r1 === undefined ? 90 : o.r1;
    this.dur = o.dur === undefined ? 0.5 : o.dur;
    this.color = o.color || 'rgba(255,233,160,1)';
    this.width = o.width === undefined ? 3 : o.width;
    this.t = 0;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    if (this.t > this.dur) this.dead = true;
  }
  draw(ctx) {
    const k = this.t / this.dur;
    const e = 1 - Math.pow(1 - k, 3);
    const r = this.r0 + (this.r1 - this.r0) * e;
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(0.5, this.width * (1 - k * 0.7));
    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = Math.max(0, 0.35 * (1 - k));
    ctx.lineWidth = Math.max(0.5, this.width * 2 * (1 - k));
    ctx.beginPath(); ctx.arc(this.x, this.y, r * 0.94, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/* ============================ 火花（兼容旧调用） ============================ */
class Spark {
  constructor(x, y, color, speed) {
    const a = Math.random() * Math.PI * 2;
    this.x = x; this.y = y;
    this.vx = Math.cos(a) * speed * (0.4 + Math.random() * 0.8);
    this.vy = Math.sin(a) * speed * (0.4 + Math.random() * 0.8);
    this.t = 0;
    this.dur = 0.4 + Math.random() * 0.4;
    this.color = color;
    this.r = 1.5 + Math.random() * 2.5;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vy += 60 * dt;
    if (this.t > this.dur) this.dead = true;
  }
  draw(ctx) {
    const a = 1 - this.t / this.dur;
    ctx.globalAlpha = a;
    const sp = glowSprite(this.color);
    const R = this.r * 2.2;
    ctx.drawImage(sp.c, this.x - R, this.y - R, R * 2, R * 2);
    ctx.globalAlpha = 1;
  }
}

/* ============================ 漂浮文字 ============================ */
class FloatText {
  constructor(x, y, text, color, size, opts) {
    opts = opts || {};
    this.x = x; this.y = y;
    this.text = text;
    this.color = color;
    this.size = size || 22;
    this.t = 0;
    this.dead = false;
    this.crit = !!opts.crit;
    this.outline = opts.outline || 'rgba(0,0,0,.6)';
    this.rise = opts.rise === undefined ? 52 : opts.rise;
  }
  update(dt) {
    this.t += dt;
    this.y -= this.rise * dt;
    if (this.t > 1.1) this.dead = true;
  }
  draw(ctx) {
    const a = this.t < 0.7 ? 1 : Math.max(0, 1 - (this.t - 0.7) / 0.4);
    const pop = this.t < 0.18 ? (1 - Math.pow(1 - this.t / 0.18, 3)) * 0.3 + 0.9 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(this.x, this.y);
    if (this.crit) {
      const gs = glowSprite(this.color);
      const R = this.size * 1.6 * pop;
      ctx.globalAlpha = a * 0.45;
      ctx.drawImage(gs.c, -R, -R, R * 2, R * 2);
      ctx.globalAlpha = a;
    }
    if (pop !== 1) ctx.scale(pop, pop);
    ctx.font = '900 ' + this.size + 'px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = Math.max(3, this.size * 0.16);
    ctx.strokeStyle = this.outline;
    ctx.strokeText(this.text, 0, 0);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}
