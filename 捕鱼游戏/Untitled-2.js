const SFX = (() => {
  let ctx = null, master = null, noiseBuf = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(freq, dur, opts) {
    opts = opts || {};
    if (!ensure()) return;
    const type = opts.type || 'sine';
    const vol = opts.vol === undefined ? 0.5 : opts.vol;
    const slideTo = opts.slideTo || 0;
    const delay = opts.delay || 0;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, opts) {
    opts = opts || {};
    if (!ensure()) return;
    const vol = opts.vol === undefined ? 0.4 : opts.vol;
    const freq = opts.freq || 1200;
    const q = opts.q || 1;
    const delay = opts.delay || 0;
    const slideTo = opts.slideTo || 0;
    const t0 = ctx.currentTime + delay;
    /* 白噪声缓冲只生成一次并复用，避免每次开火都做一次大数组分配 */
    if (!noiseBuf) {
      const len = Math.max(1, (ctx.sampleRate * 2) | 0);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const off = Math.random() * 1.0;
    const dur2 = Math.min(dur, 0.95);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) f.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0, off, dur2);
  }

  return {
    unlock() { ensure(); },
    shoot() {
      tone(520, 0.12, { type: 'square', vol: 0.22, slideTo: 160 });
      noise(0.08, { vol: 0.15, freq: 2400 });
    },
    net() {
      noise(0.3, { vol: 0.3, freq: 700, slideTo: 2600, q: 0.8 });
    },
    hit() {
      noise(0.06, { vol: 0.2, freq: 1800 });
    },
    coin(n) {
      const c = n || 1;
      for (let i = 0; i < Math.min(c, 4); i++) {
        tone(988, 0.09, { type: 'triangle', vol: 0.3, delay: i * 0.07 });
        tone(1319, 0.14, { type: 'triangle', vol: 0.26, delay: i * 0.07 + 0.05 });
      }
    },
    fail() {
      tone(220, 0.18, { type: 'sawtooth', vol: 0.12, slideTo: 110 });
    },
    boss() {
      tone(160, 0.4, { type: 'sawtooth', vol: 0.25 });
      tone(213, 0.4, { type: 'sawtooth', vol: 0.25, delay: 0.25 });
      tone(160, 0.5, { type: 'sawtooth', vol: 0.25, delay: 0.5 });
    },
    kill() {
      tone(523, 0.12, { type: 'triangle', vol: 0.3 });
      tone(659, 0.12, { type: 'triangle', vol: 0.3, delay: 0.09 });
      tone(784, 0.12, { type: 'triangle', vol: 0.3, delay: 0.18 });
      tone(1047, 0.3, { type: 'triangle', vol: 0.32, delay: 0.27 });
      noise(0.5, { vol: 0.18, freq: 500, slideTo: 4000, delay: 0.05 });
    },
    switchMult() {
      tone(700, 0.05, { type: 'square', vol: 0.15 });
      tone(1050, 0.07, { type: 'square', vol: 0.15, delay: 0.05 });
    },
    poor() {
      tone(330, 0.12, { type: 'square', vol: 0.15 });
      tone(262, 0.2, { type: 'square', vol: 0.15, delay: 0.1 });
    },
    /* ------- 新增特效音 ------- */
    combo(n) {
      const k = Math.min(n || 2, 14);
      const base = 560 + k * 55;
      tone(base, 0.09, { type: 'triangle', vol: 0.26 });
      tone(base * 1.5, 0.11, { type: 'triangle', vol: 0.2, delay: 0.05 });
    },
    golden() {
      tone(1046, 0.13, { type: 'sine', vol: 0.28 });
      tone(1318, 0.13, { type: 'sine', vol: 0.26, delay: 0.08 });
      tone(1568, 0.2, { type: 'sine', vol: 0.24, delay: 0.16 });
      tone(2093, 0.32, { type: 'sine', vol: 0.2, delay: 0.24 });
    },
    bigkill() {
      tone(120, 0.75, { type: 'sawtooth', vol: 0.3, slideTo: 55 });
      noise(0.9, { vol: 0.32, freq: 420, slideTo: 180, q: 0.6 });
      for (let i = 0; i < 5; i++) {
        tone(523 * Math.pow(1.26, i), 0.32, { type: 'triangle', vol: 0.22, delay: 0.1 + i * 0.09 });
      }
    },
    shock() {
      noise(0.25, { vol: 0.22, freq: 300, slideTo: 3000, q: 0.7 });
    },
    bubble() {
      tone(300 + Math.random() * 220, 0.08, { type: 'sine', vol: 0.07, slideTo: 640 });
    }
  };
})();
