'use strict';
/* Core engine: canvas scaling, main loop, input, scene switching, particles. */

const W = 1280, H = 720;
const TAU = Math.PI * 2;
const FONT_TITLE = '"Cinzel Decorative", "Cinzel", Georgia, serif';
const FONT_HEAD = '"Cinzel", Georgia, "Times New Roman", serif';
const FONT_BODY = '"Alegreya", Georgia, "Times New Roman", serif';

const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  approach: (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target)),
  // exponential smoothing that is frame-rate independent
  damp: (a, b, rate, dt) => b + (a - b) * Math.exp(-rate * dt),
  seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  ease: {
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
    outBounce: (t) => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
  },
};

const Store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('bruteInvasion.' + key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('bruteInvasion.' + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  },
};

const Game = {
  canvas: null,
  ctx: null,
  dpr: 1,
  scale: 1,
  ox: 0,
  oy: 0,
  scenes: {},
  scene: null,
  sceneName: '',
  time: 0,
  last: 0,
  mouse: { x: -9999, y: -9999, down: false, inside: false },
  hoverBtn: null,
  pressBtn: null,
  shakeT: 0,
  shakeDur: 1,
  shakeMag: 0,
  fade: 1,
  fadeDir: -1,
  pending: null,
  settings: null,
  progress: null,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.settings = Object.assign(
      { music: 0.55, sfx: 0.8, difficulty: 'normal', shake: true, seenIntro: false },
      Store.get('settings', {})
    );
    this.progress = Object.assign({ unlocked: 1, stars: {} }, Store.get('progress', {}));
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.bindInput();
    requestAnimationFrame((t) => this.loop(t));
  },

  saveSettings() { Store.set('settings', this.settings); },
  saveProgress() { Store.set('progress', this.progress); },

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cw = window.innerWidth, ch = window.innerHeight;
    this.dpr = dpr;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    this.scale = Math.min(cw / W, ch / H);
    this.ox = (cw - W * this.scale) / 2;
    this.oy = (ch - H * this.scale) / 2;
  },

  toGame(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (clientX - r.left - this.ox) / this.scale, y: (clientY - r.top - this.oy) / this.scale };
  },

  bindInput() {
    const c = this.canvas;
    const move = (e) => {
      const p = this.toGame(e.clientX, e.clientY);
      this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.inside = true;
      if (this.scene && this.scene.onPointerMove) this.scene.onPointerMove(p.x, p.y);
    };
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Sound.unlock();
      move(e);
      this.mouse.down = true;
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (this.fade > 0.6 && this.fadeDir > 0) return;
      const btn = this.findButton(this.mouse.x, this.mouse.y);
      if (btn) { this.pressBtn = btn; btn.press = 1; return; }
      if (this.scene && this.scene.onPointerDown) this.scene.onPointerDown(this.mouse.x, this.mouse.y, e);
    });
    const up = (e) => {
      if (!this.mouse.down) return;
      this.mouse.down = false;
      move(e);
      const btn = this.pressBtn;
      this.pressBtn = null;
      if (btn) {
        if (btn === this.findButton(this.mouse.x, this.mouse.y) && btn.onClick && btn.enabled !== false) {
          Sound.play('click');
          btn.onClick(btn);
        }
        return;
      }
      if (this.scene && this.scene.onPointerUp) this.scene.onPointerUp(this.mouse.x, this.mouse.y, e);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', () => { this.mouse.inside = false; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      Sound.unlock();
      if (e.repeat) return;
      if (this.scene && this.scene.onKey) {
        if (this.scene.onKey(e.key, e) === true) e.preventDefault();
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.scene && this.scene.onBlur) this.scene.onBlur();
    });
  },

  buttons() { return (this.scene && this.scene.activeButtons ? this.scene.activeButtons() : this.scene && this.scene.buttons) || []; },

  findButton(x, y) {
    const list = this.buttons();
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      if (b.hidden) continue;
      if (x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && y >= b.y - b.h / 2 && y <= b.y + b.h / 2) return b;
    }
    return null;
  },

  register(name, scene) { this.scenes[name] = scene; },

  go(name, params, instant) {
    if (this.pending) return;
    if (instant || !this.scene) { this.switchTo(name, params); this.fade = instant ? 0 : 1; this.fadeDir = -1; return; }
    this.pending = { name, params };
    this.fadeDir = 1;
  },

  switchTo(name, params) {
    if (this.scene && this.scene.exit) this.scene.exit();
    this.scene = this.scenes[name];
    this.sceneName = name;
    this.hoverBtn = null;
    this.pressBtn = null;
    if (this.scene.enter) this.scene.enter(params || {});
  },

  shake(mag, dur) {
    if (!this.settings.shake) return;
    if (mag >= this.shakeMag * (this.shakeT / this.shakeDur)) {
      this.shakeMag = mag; this.shakeT = dur; this.shakeDur = dur;
    }
  },

  loop(ts) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.05, Math.max(0, (ts - (this.last || ts)) / 1000));
    this.last = ts;
    this.time += dt;
    this.update(dt);
    this.draw();
  },

  update(dt) {
    // fading between scenes
    if (this.fadeDir > 0) {
      this.fade = Math.min(1, this.fade + dt * 3.2);
      if (this.fade >= 1 && this.pending) {
        const p = this.pending; this.pending = null;
        this.switchTo(p.name, p.params);
        this.fadeDir = -1;
      }
    } else if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt * 2.6);
    }
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);

    // hover handling for buttons
    const hb = this.mouse.inside ? this.findButton(this.mouse.x, this.mouse.y) : null;
    if (hb !== this.hoverBtn) {
      if (hb && hb.enabled !== false) Sound.play('hover');
      this.hoverBtn = hb;
    }
    for (const b of this.buttons()) {
      b.hover = U.damp(b.hover || 0, b === hb && b.enabled !== false ? 1 : 0, 14, dt);
      b.press = U.damp(b.press || 0, b === this.pressBtn ? 1 : 0, 20, dt);
    }
    this.canvas.style.cursor = hb && hb.enabled !== false ? 'pointer' : (this.scene && this.scene.cursor) || 'default';

    if (this.scene && this.scene.update) this.scene.update(dt);
  },

  draw() {
    const ctx = this.ctx, d = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0706';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(d * this.scale, 0, 0, d * this.scale, d * this.ox, d * this.oy);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    if (this.shakeT > 0) {
      const k = this.shakeMag * (this.shakeT / this.shakeDur);
      ctx.translate(U.rand(-k, k), U.rand(-k, k));
    }
    if (this.scene && this.scene.draw) this.scene.draw(ctx);
    ctx.restore();
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(8,4,3,${this.fade})`;
      ctx.fillRect(0, 0, W, H);
    }
  },

  toggleFullscreen() {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } catch (e) { /* not supported */ }
  },
};

/* ------------------------------------------------------------------ */
/* Particle / floating text system. Each scene owns its own instance. */
class FX {
  constructor() { this.parts = []; this.texts = []; }

  add(p) {
    const o = Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, life: 1, size: 4, size2: null, color: '#fff', g: 0, drag: 0,
      shape: 'circle', rot: 0, vr: 0, alpha: 1, add: false, t: 0, layer: 1,
    }, p);
    o.max = o.life;
    if (o.size2 == null) o.size2 = o.size;
    this.parts.push(o);
    return o;
  }

  burst(x, y, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = opts.angle != null ? opts.angle + U.rand(-(opts.spread || 0.5), opts.spread || 0.5) : U.rand(0, TAU);
      const sp = U.rand(opts.speed * 0.4, opts.speed);
      const p = Object.assign({}, opts, {
        x: x + U.rand(-(opts.jitter || 0), opts.jitter || 0),
        y: y + U.rand(-(opts.jitter || 0), opts.jitter || 0),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: U.rand((opts.life || 1) * 0.6, opts.life || 1),
        color: Array.isArray(opts.color) ? U.pick(opts.color) : opts.color,
        rot: U.rand(0, TAU), vr: U.rand(-(opts.spin || 0), opts.spin || 0),
      });
      delete p.angle; delete p.spread; delete p.speed; delete p.jitter; delete p.spin;
      this.add(p);
    }
  }

  ring(x, y, r0, r1, life, color, width, layer) {
    this.add({ shape: 'ring', x, y, size: r0, size2: r1, life, color, width: width || 4, layer: layer == null ? 1 : layer });
  }

  text(x, y, str, opts) {
    this.texts.push(Object.assign({
      x, y, str, t: 0, life: 1.1, color: '#fff', size: 22, vy: -60, stroke: '#1a0d06', pop: true,
    }, opts));
  }

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt;
      if (p.t >= p.max) { this.parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.floor != null && p.y > p.floor) { p.y = p.floor; p.vy *= -0.35; p.vx *= 0.6; }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt;
      if (t.t >= t.life) { this.texts.splice(i, 1); continue; }
      t.y += t.vy * dt;
      t.vy *= Math.exp(-2.2 * dt);
    }
  }

  draw(ctx, layer) {
    for (const p of this.parts) {
      if ((p.layer || 0) !== (layer || 0)) continue;
      const k = p.t / p.max;
      const size = U.lerp(p.size, p.size2, k);
      const a = p.alpha * (p.fadeIn ? Math.min(1, p.t / p.fadeIn) : 1) * (1 - Math.pow(k, 2.2));
      if (a <= 0.01 || size <= 0.05) continue;
      ctx.globalAlpha = a;
      if (p.add) ctx.globalCompositeOperation = 'lighter';
      switch (p.shape) {
        case 'circle':
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, TAU); ctx.fill();
          break;
        case 'glow': {
          const g = Art.glow(p.color);
          ctx.drawImage(g, p.x - size, p.y - size, size * 2, size * 2);
          break;
        }
        case 'spark': {
          const sp = Math.hypot(p.vx, p.vy) || 1;
          const len = Math.min(26, sp * 0.045 + 3);
          ctx.strokeStyle = p.color; ctx.lineWidth = size; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len); ctx.stroke();
          break;
        }
        case 'star': {
          ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const r = i % 2 === 0 ? size : size * 0.32;
            const an = (i / 8) * TAU;
            ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
          }
          ctx.closePath(); ctx.fill(); ctx.restore();
          break;
        }
        case 'square':
          ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.t * 9 + p.vr));
          ctx.fillRect(-size, -size * 0.6, size * 2, size * 1.2); ctx.restore();
          break;
        case 'smoke': {
          const g = Art.glow(p.color);
          ctx.drawImage(g, p.x - size, p.y - size, size * 2, size * 2);
          break;
        }
        case 'ring':
          ctx.strokeStyle = p.color; ctx.lineWidth = (p.width || 4) * (1 - k);
          ctx.beginPath(); ctx.ellipse(p.x, p.y, size, size * (p.flat || 1), 0, 0, TAU); ctx.stroke();
          break;
        case 'heart': {
          ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(size / 10, size / 10);
          ctx.beginPath(); ctx.moveTo(0, 4);
          ctx.bezierCurveTo(-10, -4, -5, -12, 0, -6); ctx.bezierCurveTo(5, -12, 10, -4, 0, 4);
          ctx.fill(); ctx.restore();
          break;
        }
        case 'leaf':
          ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.beginPath(); ctx.ellipse(0, 0, size, size * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore();
          break;
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  drawTexts(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = t.t / t.life;
      const pop = t.pop ? (t.t < 0.18 ? U.ease.outBack(t.t / 0.18) : 1) : 1;
      const a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(pop, pop);
      ctx.font = `900 ${t.size}px ${t.font || FONT_HEAD}`;
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, t.size / 5);
      ctx.strokeStyle = t.stroke;
      ctx.strokeText(t.str, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  clear() { this.parts.length = 0; this.texts.length = 0; }
}
