(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const coinEl = document.getElementById('coin-count');
  const multEl = document.getElementById('mult-display');
  const hintCost = document.getElementById('hint-cost');
  const toastEl = document.getElementById('toast');
  const startScreen = document.getElementById('start-screen');
  const comboEl = document.getElementById('combo');
  const bannerEl = document.getElementById('banner');
  const codexEl = document.getElementById('codex');
  const flashEl = document.getElementById('flash');

  const MULTS = [1, 10, 100];
  const MULT_COLORS = ['#6fc3ff', '#c77eff', '#ffb84d'];

  const DPR_BY_Q = [1, 1.5, 2];
  const FISH_BY_Q = [14, 18, 22];
  const FX_BY_Q = [120, 200, 300];
  const MOTE_BY_Q = [0, 22, 40];
  const FXSCALE = [0.5, 0.75, 1];

  const G = {
    state: 'menu',
    coins: 500,
    multIdx: 0,
    W: 0, H: 0,
    fishes: [], bullets: [], nets: [], fx: [], coins3d: [], bubbles: [], motes: [],
    cannon: { x: 0, y: 0, angle: -Math.PI / 2 },
    spawnT: 0, coolT: 0, bossT: 16 + Math.random() * 8,
    time: 0, clock: 0, shake: 0,
    dpr: 1, quality: 2, dprCap: 2,
    fpsAcc: 0, fpsN: 0, qTimer: 0, goodStreak: 0,
    fxCap: FX_BY_Q[2],
    bg: null,
    lightCv: null, lightCtx: null, lightT: -9, caustic: null, lightOn: true,
    last: 0, toastT: null,
    combo: 0, comboT: 0, comboBest: 0,
    flash: 0, flashColor: '255,255,255', flashShown: -1, flashBg: '',
    slowT: 0, timeScale: 1,
    codexOpen: false, codexItems: [], codexT: 0,
    kills: 0
  };

  /* ============================ 尺寸 / 画质 ============================ */
  function resize() {
    G.dpr = Math.min(G.dprCap, window.devicePixelRatio || 1);
    G.W = window.innerWidth;
    G.H = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(G.W * G.dpr));
    canvas.height = Math.max(1, Math.floor(G.H * G.dpr));
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    G.cannon.x = G.W / 2;
    G.cannon.y = G.H + 6;
    buildBackground();
    buildMotes();
    buildLightLayer();
  }

  function setQuality(q) {
    q = Math.max(0, Math.min(2, q));
    if (q === G.quality) return;
    G.quality = q;
    G.dprCap = DPR_BY_Q[q];
    G.fxCap = FX_BY_Q[q];
    G.lightOn = q > 0;
    if (G.fx.length > G.fxCap) G.fx.splice(0, G.fx.length - G.fxCap);
    resize();
  }

  function buildBackground() {
    const b = document.createElement('canvas');
    b.width = Math.max(1, G.W);
    b.height = Math.max(1, G.H);
    const c = b.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, G.H);
    g.addColorStop(0, '#062b4e');
    g.addColorStop(0.4, '#073a63');
    g.addColorStop(1, '#03182d');
    c.fillStyle = g;
    c.fillRect(0, 0, G.W, G.H);

    c.fillStyle = '#0a2c4d';
    for (let i = 0; i < 8; i++) {
      const x = G.W * (i + 0.5) / 8 + (Math.random() - 0.5) * 40;
      const h = 40 + Math.random() * 80;
      const w = 14 + Math.random() * 22;
      c.beginPath();
      c.moveTo(x - w, G.H);
      c.quadraticCurveTo(x - w * 0.4, G.H - h * 0.6, x + Math.random() * 24 - 12, G.H - h);
      c.quadraticCurveTo(x + w * 0.4, G.H - h * 0.55, x + w, G.H);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(20,60,100,.6)';
      c.lineWidth = 1.5;
      c.beginPath();
      for (let k = 0; k < 4; k++) {
        c.moveTo(x, G.H - h * (0.2 + k * 0.2));
        c.lineTo(x + (k % 2 ? w : -w) * 1.6, G.H - h * (0.4 + k * 0.2));
      }
      c.stroke();
    }
    c.fillStyle = 'rgba(8,30,52,.9)';
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * G.W, r = 22 + Math.random() * 44;
      c.beginPath(); c.ellipse(x, G.H - r * 0.3, r, r * 0.55, 0, 0, Math.PI * 2); c.fill();
    }
    G.bg = b;
  }

  /* 光柱 + 焦散：合并到一张低刷新率的光照层，避免每帧全屏混合多次 */
  function buildLightLayer() {
    const S = 200;
    const tile = document.createElement('canvas');
    tile.width = tile.height = S;
    const tg = tile.getContext('2d');
    tg.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 28; i++) {
      const x = Math.random() * S, y = Math.random() * S;
      const r = 16 + Math.random() * 36;
      const rg = tg.createRadialGradient(x, y, 1, x, y, r);
      rg.addColorStop(0, 'rgba(200,244,255,.5)');
      rg.addColorStop(0.5, 'rgba(150,220,255,.14)');
      rg.addColorStop(1, 'rgba(120,200,255,0)');
      tg.fillStyle = rg;
      tg.beginPath(); tg.arc(x, y, r, 0, Math.PI * 2); tg.fill();
    }
    const c = document.createElement('canvas');
    c.width = Math.max(1, G.W);
    c.height = Math.max(1, G.H);
    G.lightCv = c;
    G.lightCtx = c.getContext('2d');
    G.caustic = G.lightCtx.createPattern(tile, 'repeat');
    G.lightT = -9;
  }

  function updateLightLayer(clock) {
    const g = G.lightCtx;
    if (!g) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, G.W, G.H);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.07;
    for (let i = 0; i < 5; i++) {
      const x = (i + 0.5) * G.W / 5 + Math.sin(clock * 0.25 + i) * 46;
      const w = 40 + Math.sin(clock * 0.4 + i * 2) * 16;
      g.save();
      g.translate(x, 0);
      g.rotate(Math.sin(clock * 0.12 + i) * 0.06);
      const grd = g.createLinearGradient(0, 0, 0, G.H * 0.95);
      grd.addColorStop(0, 'rgba(190,244,255,.95)');
      grd.addColorStop(0.6, 'rgba(120,200,255,.25)');
      grd.addColorStop(1, 'rgba(80,160,255,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(-w * 0.4, -20); g.lineTo(w * 0.4, -20);
      g.lineTo(w * 1.7, G.H); g.lineTo(-w * 1.7, G.H);
      g.closePath(); g.fill();
      g.restore();
    }
    if (G.caustic) {
      const S = 200;
      const ox = Math.sin(clock * 0.18) * 26;
      const oy = (clock * 14) % S;
      g.globalAlpha = 0.11 + Math.sin(clock * 0.6) * 0.025;
      g.save();
      g.translate(ox, oy);
      g.fillStyle = G.caustic;
      g.fillRect(-ox - S, -oy - S, G.W + S * 2, G.H + S * 3);
      g.restore();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function buildMotes() {
    G.motes = [];
    const n = MOTE_BY_Q[G.quality];
    for (let i = 0; i < n; i++) {
      G.motes.push({
        x: Math.random() * G.W, y: Math.random() * G.H,
        r: 0.8 + Math.random() * 2.2, v: 6 + Math.random() * 20,
        w: Math.random() * 6.28
      });
    }
  }

  /* ============================ 出鱼逻辑 ============================ */
  function totalWeight() {
    let w = 0;
    for (const t of FISH_TYPES) w += t.weight;
    return w;
  }
  const TOTAL_W = totalWeight();

  function pickType() {
    let r = Math.random() * TOTAL_W;
    for (const t of FISH_TYPES) { r -= t.weight; if (r <= 0) return t; }
    return FISH_TYPES[0];
  }

  function spawnWave() {
    if (Math.random() < 0.05 && !G.fishes.some(function (f) { return f.tp.rare; })) {
      const gt = FISH_TYPES.filter(function (t) { return t.rare; })[0];
      const gf = new Fish(gt, G.W, G.H, Math.random() < 0.5 ? 1 : -1);
      gf.y = G.H * 0.25 + Math.random() * G.H * 0.5;
      G.fishes.push(gf);
      toast('✨ 黄金锦鲤现身！抓住它！');
      SFX.golden();
      for (let i = 0; i < 10; i++) {
        G.fx.push(new Particle(gf.x, gf.y, { kind: 'star', color: '#fff3b0', speed: 210, dur: 0.85, r: 3, grav: -10, drag: 1.2 }));
      }
      G.fx.push(new Ring(gf.x, gf.y, { r0: 10, r1: 130, dur: 0.7, color: 'rgba(255,235,150,1)', width: 4 }));
      return;
    }
    const roll = Math.random();
    if (roll < 0.46) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const n = 2 + (Math.random() * 3 | 0);
      const tp = pickSmall();
      for (let i = 0; i < n; i++) {
        const f = new Fish(tp, G.W, G.H, dir);
        f.y += (Math.random() - 0.5) * 70;
        f.x -= dir * i * (tp.r * 2.6);
        G.fishes.push(f);
      }
    } else if (roll < 0.82) {
      G.fishes.push(new Fish(pickType(), G.W, G.H, Math.random() < 0.5 ? 1 : -1));
    } else if (roll < 0.95) {
      G.fishes.push(new Fish(pickMedium(), G.W, G.H, Math.random() < 0.5 ? 1 : -1));
    } else {
      const tp = pickLarge();
      G.fishes.push(new Fish(tp, G.W, G.H, Math.random() < 0.5 ? 1 : -1));
      if (tp.value >= 90) toast('🐋 ' + tp.name + ' 出现在深海！');
    }
  }

  /* ============================ HUD ============================ */
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(G.toastT);
    G.toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 1500);
  }

  function banner(msg) {
    bannerEl.textContent = msg;
    bannerEl.classList.remove('show');
    void bannerEl.offsetWidth;
    bannerEl.classList.add('show');
  }

  function updateHud() {
    coinEl.textContent = G.coins;
    const m = MULTS[G.multIdx];
    multEl.textContent = '×' + m;
    multEl.style.color = MULT_COLORS[G.multIdx];
    hintCost.textContent = m;
  }

  function bumpCoins() {
    coinEl.classList.remove('bump');
    void coinEl.offsetWidth;
    coinEl.classList.add('bump');
  }

  function updateComboUI() {
    if (G.combo >= 2) {
      comboEl.textContent = '×' + G.combo + ' 连击' + (G.combo >= 5 ? '  火力全开！' : '');
      comboEl.classList.add('show');
      comboEl.style.color = G.combo >= 10 ? '#ff9d5c' : (G.combo >= 5 ? '#ffd867' : '#fff2b8');
    } else {
      comboEl.classList.remove('show');
    }
  }

  function setFlash(a, color) {
    G.flash = a;
    if (color) G.flashColor = color;
  }

  /* 闪光走 DOM 图层，避免整屏 canvas 填充 */
  function applyFlash() {
    const v = G.flash > 0.01 ? Math.min(0.85, G.flash) : 0;
    if (v === 0 && G.flashShown === 0) return;
    if (Math.abs(v - G.flashShown) < 0.04 && !(v === 0)) return;
    if (G.flashBg !== G.flashColor) {
      flashEl.style.background = 'rgb(' + G.flashColor + ')';
      G.flashBg = G.flashColor;
    }
    G.flashShown = v;
    flashEl.style.opacity = v === 0 ? '0' : String(v.toFixed(2));
  }

  function charity() {
    G.coins += 200;
    updateHud();
    bumpCoins();
    toast('系统赠送 200 金币，继续捕鱼！');
    SFX.coin(2);
  }

  /* ============================ 开火 ============================ */
  function fire(px, py) {
    if (G.state !== 'playing') return;
    const cost = MULTS[G.multIdx];
    if (G.coolT > 0) return;
    if (G.coins < cost) {
      SFX.poor();
      if (G.coins < MULTS[0]) charity();
      else toast('金币不足，请切换更低的炮倍');
      return;
    }
    G.coins -= cost;
    updateHud();
    G.coolT = 0.2;
    G.cannon.angle = Math.atan2(py - G.cannon.y, px - G.cannon.x);

    G.shake = Math.max(G.shake, 0.05 + G.multIdx * 0.035);
    const mx = G.cannon.x + Math.cos(G.cannon.angle) * 66;
    const my = G.cannon.y + Math.sin(G.cannon.angle) * 66;
    G.bullets.push(new Bullet(mx, my, G.cannon.angle, cost, G.multIdx));

    if (G.fx.length < G.fxCap) {
      for (let i = 0; i < 5; i++) {
        G.fx.push(new Particle(mx, my, {
          kind: i === 0 ? 'star' : 'dot',
          color: i % 2 ? MULT_COLORS[G.multIdx] : '#fff2b8',
          speed: 90 + Math.random() * 200,
          angle: G.cannon.angle + (Math.random() - 0.5) * 0.9,
          dur: 0.2, r: 2 + Math.random() * 2, grav: 0, drag: 4
        }));
      }
      G.fx.push(new Ring(mx, my, { r0: 2, r1: 26 + G.multIdx * 8, dur: 0.22, color: 'rgba(255,235,170,.9)', width: 3 }));
    }
    SFX.shoot();
  }

  /* ============================ 命中与结算 ============================ */
  function hitCheck(b) {
    for (const f of G.fishes) {
      if (f.caught || f.dead) continue;
      const dx = f.x - b.x, dy = f.y - b.y;
      const rr = f.hitR + 6 + G.multIdx * 2;
      if (dx * dx + dy * dy <= rr * rr) {
        G.nets.push(new Net(f.x, f.y, b.mult, b.level));
        if (G.fx.length < G.fxCap) {
          for (let i = 0; i < 5; i++) {
            G.fx.push(new Particle(b.x, b.y, { kind: 'dot', color: '#ffe9a0', speed: 150, dur: 0.3, r: 2, grav: 0, drag: 3 }));
          }
          G.fx.push(new Ring(b.x, b.y, { r0: 3, r1: 30, dur: 0.3, color: 'rgba(200,235,255,.9)', width: 2.5 }));
        }
        SFX.net();
        return;
      }
    }
  }

  function judgeNet(net) {
    let hitAny = false;
    for (const f of G.fishes) {
      if (f.caught || f.dead) continue;
      const dx = f.x - net.x, dy = f.y - net.y;
      const rr = net.r * 0.92 + f.hitR * 0.55;
      if (dx * dx + dy * dy > rr * rr) continue;
      hitAny = true;
      f.hitFlash = 0.18;
      if (f.tp.hp > 0) {
        const dmg = [2, 6, 16][net.level];
        f.hp -= dmg;
        SFX.hit();
        G.shake = Math.max(G.shake, 0.14);
        G.fx.push(new FloatText(f.x, f.y - f.r - 6, '-' + dmg, '#ff9d5c', 22, { crit: net.level >= 2 }));
        if (G.fx.length < G.fxCap) {
          for (let i = 0; i < 5; i++) {
            G.fx.push(new Particle(f.x, f.y, { kind: 'shard', color: i % 2 ? '#ffd867' : '#fff2b8', speed: 170, dur: 0.35, r: 2, grav: 40, drag: 2 }));
          }
        }
        if (f.hp <= 0) killFish(f, net.level);
      } else {
        const p = Math.min(0.92, f.tp.prob * [1, 1.45, 1.95][net.level]);
        if (Math.random() < p) killFish(f, net.level);
        else {
          SFX.fail();
          G.fx.push(new FloatText(f.x, f.y - f.r - 6, 'MISS', 'rgba(190,215,240,.9)', 16));
        }
      }
    }
    if (G.fx.length < G.fxCap) {
      G.fx.push(new Ring(net.x, net.y, {
        r0: net.r * 0.25, r1: net.r * 1.4, dur: 0.45,
        color: hitAny ? 'rgba(255,225,140,1)' : 'rgba(160,220,255,1)', width: 3
      }));
      const n = hitAny ? Math.round(10 * FXSCALE[G.quality]) : 5;
      for (let i = 0; i < n; i++) {
        G.fx.push(new Particle(net.x + (Math.random() - 0.5) * net.r, net.y + (Math.random() - 0.5) * net.r, {
          kind: i % 3 === 0 ? 'star' : 'dot',
          color: hitAny ? '#ffd867' : '#9fd8ff',
          speed: 90 + Math.random() * 150, dur: 0.4,
          r: 2 + Math.random() * 3, grav: 30, drag: 2
        }));
      }
    }
    if (hitAny) G.shake = Math.max(G.shake, 0.12);
  }

  function killFish(f, level) {
    if (f.caught) return;
    f.caught = true;
    f.caughtT = 0;
    G.kills++;

    G.combo++;
    G.comboT = 1.8;
    if (G.combo > G.comboBest) G.comboBest = G.combo;
    const comboMul = 1 + Math.min(9, G.combo - 1) * 0.06;
    const base = f.maxHp > 0 ? f.tp.value * [1, 4, 12.5][level] : f.tp.value * MULTS[level];
    const reward = Math.round(base * comboMul);
    const boss = f.maxHp > 0;

    const coinRect = coinEl.getBoundingClientRect();
    const tx = coinRect.left + coinRect.width / 2;
    const ty = coinRect.top + coinRect.height / 2;
    G.coins3d.push(new CoinFly(f.x, f.y, tx, ty, reward, function (val) {
      G.coins += val; updateHud(); bumpCoins();
      SFX.coin(boss ? 4 : Math.min(3, 1 + level));
    }));

    const col = f.tp.body;
    const q = FXSCALE[G.quality];
    const burst = Math.round((boss ? 34 : (f.tp.rare ? 20 : 12)) * q);
    for (let i = 0; i < burst && G.fx.length < G.fxCap; i++) {
      G.fx.push(new Particle(f.x, f.y, {
        kind: i % 4 === 0 ? 'star' : (i % 5 === 0 ? 'shard' : 'dot'),
        color: i % 3 === 0 ? '#fff6c0' : (i % 3 === 1 ? col : '#ffd867'),
        speed: boss ? 320 : 190, dur: 0.5 + Math.random() * 0.5,
        r: 2 + Math.random() * 3.2, grav: 55, drag: 1.5
      }));
    }
    G.fx.push(new Ring(f.x, f.y, {
      r0: f.r * 0.3, r1: f.r * (boss ? 7 : (f.tp.rare ? 4.6 : 3.4)),
      dur: 0.6, color: f.tp.rare ? 'rgba(255,240,170,1)' : 'rgba(255,233,160,1)', width: boss ? 6 : 3
    }));
    G.fx.push(new FloatText(f.x, f.y - f.r - 10, '+' + reward, '#ffd867',
      boss ? 40 : (f.tp.rare ? 32 : 25), { crit: boss || f.tp.rare }));

    if (G.combo >= 2 && !boss) {
      G.fx.push(new FloatText(f.x, f.y - f.r - 38, 'COMBO ×' + G.combo, '#7cf5ff', 18 + Math.min(G.combo, 8)));
      SFX.combo(G.combo);
    }
    updateComboUI();

    if (boss) {
      SFX.bigkill();
      G.shake = 1.1;
      setFlash(1, '255,222,150');
      G.slowT = 1.15;
      banner('击杀 ' + f.tp.name + '！+' + reward);
      toast('★ 击败 ' + f.tp.name + '！获得 ' + reward + ' 金币 ★');
      for (let k = 0; k < 3; k++) {
        G.fx.push(new Ring(f.x, f.y, { r0: f.r * (0.4 + k * 0.5), r1: f.r * (5 + k * 2.4), dur: 0.7 + k * 0.2, color: k % 2 ? 'rgba(255,190,80,1)' : 'rgba(255,255,220,1)', width: 4 - k }));
      }
      for (let i = 0; i < 10; i++) {
        G.coins3d.push(new CoinFly(f.x, f.y, tx, ty, 0, null));
      }
    } else if (f.tp.rare) {
      SFX.golden();
      G.shake = Math.max(G.shake, 0.35);
      setFlash(0.45, '255,235,170');
      toast('✨ 捕获黄金锦鲤！+' + reward + ' 金币');
    } else if (f.tp.value >= 90) {
      SFX.kill();
      G.shake = Math.max(G.shake, 0.3);
      setFlash(0.22, '200,230,255');
    }
  }

  /* ============================ 炮台（精灵缓存） ============================ */
  function cannonBarrel(lv) {
    const key = 'cbarrel_' + lv;
    if (SPR[key]) return SPR[key];
    const L = 64, W2 = 17 + lv * 3;
    const ox = 18, oy = W2 + 12;
    const w = L + ox + 12, h = W2 * 2 + 24;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = newCanvas(w * dpr, h * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.translate(ox, oy);
    const colors = [['#2a6db5', '#7ec9ff'], ['#7a3ec9', '#c77eff'], ['#c96a12', '#ffb84d']];
    const bg = g.createLinearGradient(0, -W2, 0, W2);
    bg.addColorStop(0, colors[lv][1]);
    bg.addColorStop(0.5, colors[lv][0]);
    bg.addColorStop(1, '#123');
    g.fillStyle = bg;
    g.strokeStyle = 'rgba(255,255,255,.35)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-10, -W2 * 0.75);
    g.lineTo(L, -W2);
    g.lineTo(L, W2);
    g.lineTo(-10, W2 * 0.75);
    g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.beginPath(); g.ellipse(L, 0, 5, W2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffe9a0';
    g.beginPath(); g.arc(L * 0.45, 0, 4 + lv, 0, Math.PI * 2); g.fill();
    const s = { c: c, w: w, h: h, ox: ox, oy: oy };
    SPR[key] = s;
    return s;
  }

  function cannonBase(lv) {
    const key = 'cbase_' + lv;
    if (SPR[key]) return SPR[key];
    const R = 40 + lv * 4;
    const w = R * 2 + 10, h = R + 12;
    const ox = w / 2, oy = R + 3;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = newCanvas(w * dpr, h * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.translate(ox, oy);
    const colors = [['#2a6db5', '#7ec9ff'], ['#7a3ec9', '#c77eff'], ['#c96a12', '#ffb84d']];
    const base = g.createRadialGradient(0, -10, 4, 0, 0, R);
    base.addColorStop(0, colors[lv][1]);
    base.addColorStop(0.6, colors[lv][0]);
    base.addColorStop(1, '#0c2440');
    g.fillStyle = base;
    g.strokeStyle = 'rgba(255,255,255,.3)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, R, Math.PI, Math.PI * 2);
    g.fill(); g.stroke();
    g.fillStyle = '#0a1e36';
    g.beginPath(); g.arc(0, 0, 15, 0, Math.PI * 2); g.fill();
    const s = { c: c, w: w, h: h, ox: ox, oy: oy };
    SPR[key] = s;
    return s;
  }

  function drawCannon() {
    const x = G.cannon.x, y = G.cannon.y;
    const lv = G.multIdx;
    const barrel = cannonBarrel(lv);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(G.cannon.angle);
    ctx.drawImage(barrel.c, -barrel.ox, -barrel.oy, barrel.w, barrel.h);
    ctx.restore();

    const base = cannonBase(lv);
    ctx.drawImage(base.c, x - base.ox, y - base.oy, base.w, base.h);

    const gs = glowSprite(MULT_COLORS[lv]);
    const R = 9 + Math.sin(G.time * 4) * 2.5;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(gs.c, x - R, y - R, R * 2, R * 2);
    ctx.globalAlpha = 1;
  }

  /* ============================ 主循环 ============================ */
  function loop(ts) {
    requestAnimationFrame(loop);
    const raw = G.last ? (ts - G.last) / 1000 : 0.016;
    G.last = ts;
    const dt = Math.min(Math.max(raw, 0.0005), 0.05);

    /* 帧率采样与自动降级（移动端保流畅） */
    G.clock += dt;
    G.fpsAcc += 1 / Math.min(Math.max(raw, 0.0005), 0.2);
    G.fpsN++;
    G.qTimer += dt;
    if (G.clock > 2 && G.qTimer >= 1.2) {
      const fps = G.fpsAcc / Math.max(1, G.fpsN);
      if (fps < 48 && G.quality > 0) {
        setQuality(G.quality - 1);
        G.goodStreak = 0;
      } else if (fps > 57) {
        G.goodStreak++;
        if (G.goodStreak > 6 && G.quality < 2) { setQuality(G.quality + 1); G.goodStreak = 0; }
      } else G.goodStreak = 0;
      G.fpsAcc = 0; G.fpsN = 0; G.qTimer = 0;
    }

    update(dt);
    draw();
    if (G.codexOpen) {
      G.codexT += dt;
      drawCodex(G.codexT);
    }
  }

  function compact(a) {
    let j = 0;
    for (let i = 0; i < a.length; i++) { if (!a[i].dead) a[j++] = a[i]; }
    a.length = j;
  }

  function update(real) {
    if (G.slowT > 0) {
      G.slowT -= real;
      G.timeScale += (0.3 - G.timeScale) * Math.min(1, real * 9);
    } else {
      G.timeScale += (1 - G.timeScale) * Math.min(1, real * 5);
    }
    const dt = real * G.timeScale;

    G.time += dt;
    if (G.coolT > 0) G.coolT -= dt;
    if (G.shake > 0) G.shake -= real * 1.6;
    if (G.flash > 0) { G.flash -= real * 1.9; if (G.flash < 0) G.flash = 0; }
    applyFlash();

    if (G.comboT > 0) {
      G.comboT -= real;
      if (G.comboT <= 0 && G.combo > 0) {
        if (G.combo >= 5) toast('连击结束：×' + G.combo + ' 连击');
        G.combo = 0;
        updateComboUI();
      }
    }

    G.spawnT -= dt;
    if (G.spawnT <= 0 && G.fishes.length < FISH_BY_Q[G.quality]) {
      spawnWave();
      G.spawnT = 0.7 + Math.random() * 0.85;
    }

    if (G.state === 'playing') {
      G.bossT -= dt;
      if (G.bossT <= 0) {
        if (!G.fishes.some(function (f) { return f.maxHp > 0; })) {
          const tp = pickBoss();
          const f = new Fish(tp, G.W, G.H, Math.random() < 0.5 ? 1 : -1);
          G.fishes.push(f);
          SFX.boss();
          setFlash(0.3, '255,180,90');
          banner('⚠ ' + tp.name + ' 出现了！');
          toast('攻击 BOSS 可获巨额金币');
          for (let i = 0; i < 18; i++) {
            G.fx.push(new Particle(f.x, f.y, { kind: 'star', color: tp.body, speed: 260, dur: 0.9, r: 3, grav: 0, drag: 1.1 }));
          }
          G.bossT = 26 + Math.random() * 14;
        } else G.bossT = 5;
      }
    }

    for (const f of G.fishes) f.update(dt, G.W, G.H, G);
    for (const b of G.bullets) { b.update(dt); if (!b.dead) hitCheck(b); }
    for (const n of G.nets) { if (!n.onSpread) n.onSpread = judgeNet; n.update(dt); }
    for (const c of G.coins3d) c.update(dt);
    for (const p of G.fx) p.update(dt);

    compact(G.fishes);
    compact(G.bullets);
    compact(G.nets);
    compact(G.coins3d);
    compact(G.fx);
    if (G.fx.length > G.fxCap) G.fx.splice(0, G.fx.length - G.fxCap);

    if (Math.random() < dt * 3) {
      G.bubbles.push({
        x: Math.random() * G.W, y: G.H + 10,
        r: 2 + Math.random() * 5, v: 30 + Math.random() * 55, w: Math.random() * 6
      });
    }
    for (const b of G.bubbles) {
      b.y -= b.v * dt;
      b.x += Math.sin(G.time * 2 + b.w) * 14 * dt;
    }
    let j = 0;
    for (let i = 0; i < G.bubbles.length; i++) { if (G.bubbles[i].y > -12) G.bubbles[j++] = G.bubbles[i]; }
    G.bubbles.length = j;

    for (const m of G.motes) {
      m.y -= m.v * dt;
      m.x += Math.sin(G.time * 0.6 + m.w) * 8 * dt;
      if (m.y < -6) { m.y = G.H + 6; m.x = Math.random() * G.W; }
    }
  }

  /* ============================ 绘制 ============================ */
  function drawWater() {
    if (G.lightOn && G.lightCv) {
      const interval = G.quality >= 2 ? 0.05 : 0.12;
      if (G.clock - G.lightT > interval) {
        G.lightT = G.clock;
        updateLightLayer(G.clock);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(G.lightCv, 0, 0, G.W, G.H);
      ctx.restore();
    }

    if (G.motes.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#bfe8ff';
      ctx.beginPath();
      for (const m of G.motes) {
        ctx.moveTo(m.x + m.r, m.y);
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }

    if (G.bubbles.length) {
      ctx.fillStyle = 'rgba(210,240,255,.3)';
      ctx.beginPath();
      for (const b of G.bubbles) {
        ctx.moveTo(b.x + b.r, b.y);
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  function draw() {
    ctx.save();
    if (G.shake > 0) {
      ctx.translate((Math.random() - 0.5) * G.shake * 16, (Math.random() - 0.5) * G.shake * 16);
    }
    if (G.bg) ctx.drawImage(G.bg, 0, 0, G.W, G.H);
    drawWater();

    for (const f of G.fishes) f.draw(ctx);

    /* 所有发光元素统一在一个叠加层绘制：整帧只切换一次合成模式 */
    ctx.globalCompositeOperation = 'lighter';
    for (const b of G.bullets) b.draw(ctx);
    for (const n of G.nets) n.draw(ctx);
    for (const p of G.fx) p.draw(ctx);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    for (const c of G.coins3d) c.draw(ctx);

    ctx.restore();
    drawCannon();
  }

  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? (e.touches[0] || e.changedTouches[0]) : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  function onAim(e) {
    const p = getPos(e);
    G.cannon.angle = Math.atan2(p.y - G.cannon.y, p.x - G.cannon.x);
  }

  function setMult(i) {
    i = Math.max(0, Math.min(MULTS.length - 1, i));
    if (i === G.multIdx) return;
    G.multIdx = i;
    updateHud();
    SFX.switchMult();
    if (G.fx.length < G.fxCap) {
      for (let k = 0; k < 8; k++) {
        G.fx.push(new Particle(G.cannon.x, G.cannon.y - 20, {
          kind: 'star', color: MULT_COLORS[i], speed: 150, dur: 0.5, r: 2.4, grav: -20, drag: 2
        }));
      }
      G.fx.push(new Ring(G.cannon.x, G.cannon.y - 10, { r0: 8, r1: 70, dur: 0.4, color: MULT_COLORS[i], width: 3 }));
    }
  }

  /* ============================ 鱼类图鉴 ============================ */
  function buildCodex() {
    const grid = document.getElementById('codex-grid');
    G.codexItems = [];
    for (let i = 0; i < FISH_TYPES.length; i++) {
      const tp = FISH_TYPES[i];
      const card = document.createElement('div');
      card.className = 'codex-card' + (tp.boss ? ' boss' : '') + (tp.rare ? ' rare' : '');
      const size = 150;
      const cv = document.createElement('canvas');
      cv.width = size * 2;
      cv.height = size * 2;
      const c2 = cv.getContext('2d');
      const name = document.createElement('div');
      name.className = 'codex-name';
      name.innerHTML = '<b>' + tp.name + '</b><span>' + tp.en + '</span>';
      const meta = document.createElement('div');
      meta.className = 'codex-meta';
      meta.innerHTML = (tp.boss ? 'BOSS · ' : (tp.rare ? '稀有 · ' : '')) +
        '分值 <b>' + tp.value + '</b>' +
        (tp.hp > 0 ? ' · 生命 <b>' + tp.hp + '</b>' : ' · 捕获率 <b>' + Math.round(tp.prob * 100) + '%</b>');
      card.appendChild(cv);
      card.appendChild(name);
      card.appendChild(meta);
      grid.appendChild(card);
      G.codexItems.push({ tp: tp, ctx: c2, size: size, idx: i, bg: null });
    }
  }

  function drawCodex(t) {
    for (const it of G.codexItems) {
      const g = it.ctx, S = it.size, tp = it.tp;
      if (!it.bg) {
        const bg = g.createRadialGradient(S * 0.5, S * 0.4, 4, S * 0.5, S * 0.5, S * 0.78);
        bg.addColorStop(0, 'rgba(28,78,138,.85)');
        bg.addColorStop(1, 'rgba(4,16,34,.95)');
        it.bg = bg;
      }
      g.setTransform(2, 0, 0, 2, 0, 0);
      g.clearRect(0, 0, S, S);
      g.fillStyle = it.bg;
      g.fillRect(0, 0, S, S);
      g.fillStyle = 'rgba(200,235,255,.12)';
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const bx = ((k * 47 + t * 12) % (S + 20)) - 10;
        const by = S - ((k * 31 + t * 22) % (S + 20));
        const rr = 2 + (k % 3);
        g.moveTo(bx + rr, by);
        g.arc(bx, by, rr, 0, Math.PI * 2);
      }
      g.fill();
      const scale = (S * 0.6) / (tp.r * 2.3 * (tp.len || 1));
      g.save();
      g.translate(S * 0.5, S * 0.5);
      g.scale(scale, scale);
      fishDrawBody(g, t + it.idx, tp, false, { phase: it.idx * 1.7 });
      g.restore();
    }
  }

  function toggleCodex(open) {
    G.codexOpen = open === undefined ? !G.codexOpen : open;
    if (G.codexOpen) codexEl.classList.add('open');
    else codexEl.classList.remove('open');
    if (G.codexOpen) SFX.switchMult();
  }

  /* ============================ 事件 ============================ */
  canvas.addEventListener('mousemove', onAim);
  canvas.addEventListener('mousedown', function (e) { e.preventDefault(); onAim(e); const p = getPos(e); fire(p.x, p.y); });
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    SFX.unlock();
    onAim(e);
    const p = getPos(e);
    fire(p.x, p.y);
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) { e.preventDefault(); onAim(e); }, { passive: false });

  document.getElementById('btn-down').addEventListener('click', function () { setMult(G.multIdx - 1); });
  document.getElementById('btn-up').addEventListener('click', function () { setMult(G.multIdx + 1); });
  window.addEventListener('keydown', function (e) {
    if (e.key >= '1' && e.key <= '3') setMult(+e.key - 1);
    const k = e.key.toLowerCase();
    if (k === 'c') toggleCodex();
    if (e.key === 'Escape') toggleCodex(false);
  });

  document.getElementById('btn-start').addEventListener('click', function () {
    SFX.unlock();
    SFX.switchMult();
    startScreen.classList.add('hidden');
    G.state = 'playing';
    G.last = 0;
    G.spawnT = 0.2;
    setFlash(0.5, '170,220,255');
    for (let i = 0; i < 14; i++) {
      G.fx.push(new Particle(G.W / 2, G.H * 0.7, { kind: 'star', color: '#bfe8ff', speed: 320, dur: 0.8, r: 3, grav: -30, drag: 1.2 }));
    }
  });

  document.getElementById('btn-codex').addEventListener('click', function () { toggleCodex(true); });
  document.getElementById('btn-codex-close').addEventListener('click', function () { toggleCodex(false); });

  window.addEventListener('resize', resize);

  /* 启动时预生成全部精灵，避免游戏中首次出现某鱼种时卡顿 */
  function warmup() {
    const colors = ['#fff6c0', '#ffd867', '#9fd8ff', '#7cf5ff', '#ffe9a0', '#fff2b8',
      '#ffffff', '#bfe8ff', '#ffd87a', '#ff9d5c', 'rgba(255,215,90,.9)', '#c77eff', '#7ec9ff', '#ffb84d'];
    for (const tp of FISH_TYPES) {
      bodySprite(tp);
      if (tp.glow) { glowSprite(tp.glow); starSprite(tp.glow); }
    }
    for (const c of colors) { glowSprite(c); starSprite(c); }
    bubbleSprite();
    for (let lv = 0; lv < 3; lv++) { cannonBarrel(lv); cannonBase(lv); }
    for (let s = 8; s <= 14; s++) coinSprite(s);
  }

  buildCodex();
  resize();
  warmup();
  updateHud();
  requestAnimationFrame(loop);
})();
