'use strict';
/* Menu-side scenes: splash, main menu, settings, instructions, characters, exit, level select, intro, results. */

const Common = {
  logo(ctx, x, y, size, t, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y);
    // crossed swords behind the title
    ctx.save();
    ctx.globalAlpha *= 0.9;
    [-1, 1].forEach((d) => {
      ctx.save();
      ctx.rotate(d * 0.5);
      const g = ctx.createLinearGradient(0, -size * 1.6, 0, size * 1.6);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#9aa3ad'); g.addColorStop(1, '#5a626b');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-size * 0.09, size * 1.1); ctx.lineTo(-size * 0.09, -size * 1.35); ctx.lineTo(0, -size * 1.6); ctx.lineTo(size * 0.09, -size * 1.35); ctx.lineTo(size * 0.09, size * 1.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c8962a'; ctx.fillRect(-size * 0.35, size * 1.1, size * 0.7, size * 0.12);
      ctx.fillStyle = '#5a2f12'; ctx.fillRect(-size * 0.06, size * 1.22, size * 0.12, size * 0.38);
      ctx.fillStyle = '#e8c04a'; ctx.beginPath(); ctx.arc(0, size * 1.64, size * 0.09, 0, TAU); ctx.fill();
      ctx.restore();
    });
    ctx.restore();
    const drawWord = (word, yy, sz, spacing) => {
      ctx.font = `900 ${sz}px ${FONT_TITLE}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = spacing + 'px';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
      ctx.lineWidth = sz * 0.2; ctx.strokeStyle = '#1e0802'; ctx.strokeText(word, 0, yy);
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = sz * 0.1; ctx.strokeStyle = '#7a2a0a'; ctx.strokeText(word, 0, yy);
      const g = ctx.createLinearGradient(0, yy - sz / 2, 0, yy + sz / 2);
      g.addColorStop(0, '#fff8d8'); g.addColorStop(0.45, '#f6c850'); g.addColorStop(0.55, '#e0962a'); g.addColorStop(1, '#8a3a0a');
      ctx.fillStyle = g; ctx.fillText(word, 0, yy);
      // moving shine
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const sx = ((t * 0.35) % 1.6 - 0.3) * sz * 6 - sz * 3;
      const sg = ctx.createLinearGradient(sx - sz, 0, sx + sz, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillText(word, 0, yy);
      ctx.restore();
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
    };
    drawWord('BRUTE', -size * 0.52, size, 6);
    drawWord('INVASION', size * 0.5, size * 0.78, 4);
    ctx.restore();
  },

  embers(fx, rate, dt, color) {
    if (Math.random() < rate * dt) {
      fx.add({
        shape: 'glow', x: U.rand(0, W), y: H + 10, vx: U.rand(-15, 15), vy: U.rand(-50, -110),
        life: U.rand(3, 6), size: U.rand(3, 7), size2: 1, color: color || 'rgba(255,150,60,1)', add: true, layer: 2, fadeIn: 0.5,
      });
    }
  },

  backButton(onClick) {
    return UI.button(110, 660, 160, 54, 'Back', onClick, { icon: 'back', size: 22 });
  },

  paperBg(ctx, t) {
    ctx.drawImage(Art.get('menu'), 0, 0);
    ctx.fillStyle = 'rgba(10,5,10,0.55)';
    ctx.fillRect(0, 0, W, H);
  },
};

/* ------------------------------------------------------------------ */
const SplashScene = {
  enter() {
    this.t = 0;
    this.progress = 0;
    this.loaded = false;
    this.fx = new FX();
    this.slam = -1;
    this.buttons = [];
    const fonts = document.fonts ? Promise.race([
      Promise.all([
        document.fonts.load(`900 40px "Cinzel Decorative"`),
        document.fonts.load(`900 40px "Cinzel"`),
        document.fonts.load(`700 40px "Cinzel"`),
        document.fonts.load(`500 20px "Alegreya"`),
        document.fonts.load(`italic 500 20px "Alegreya"`),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]).catch(() => {}) : Promise.resolve();
    Promise.all([Art.load((p) => { this.progress = p; }), fonts]).then(() => {
      ['field', 'lair', 'menu'].forEach((n) => Art.get(n));
      this.loaded = true;
      this.slam = 0;
    });
  },
  update(dt) {
    this.t += dt;
    this.fx.update(dt);
    Common.embers(this.fx, 14, dt);
    if (this.slam >= 0) {
      const before = this.slam;
      this.slam += dt;
      if (before < 0.35 && this.slam >= 0.35) {
        Game.shake(12, 0.4);
        Sound.play('slam');
        this.fx.burst(640, 300, 40, { shape: 'spark', color: ['#ffd36a', '#ff8a3a', '#fff'], speed: 520, life: 0.8, size: 3, drag: 2, layer: 2, add: true });
        this.fx.ring(640, 300, 40, 500, 0.7, 'rgba(255,210,120,0.9)', 8, 2);
      }
    }
  },
  draw(ctx) {
    ctx.fillStyle = '#0b0605';
    ctx.fillRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(640, 330, 20, 640, 360, 700);
    bg.addColorStop(0, 'rgba(120,40,16,0.55)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    this.fx.draw(ctx, 2);
    if (!this.loaded) {
      UI.text(ctx, 'Loading Mynstral Village…', 640, 400, { size: 22, color: '#e8c890', font: FONT_HEAD });
      UI.bar(ctx, 440, 430, 400, 14, this.progress, '#f6c850', '#b06a1a');
      return;
    }
    const k = U.clamp(this.slam / 0.35, 0, 1);
    const s = 1 + (1 - U.ease.outCubic(k)) * 2.2;
    ctx.save();
    ctx.translate(640, 300);
    ctx.scale(s, s);
    Common.logo(ctx, 0, 0, 96, this.t, k);
    ctx.restore();
    if (this.slam > 0.8) {
      const a = U.clamp((this.slam - 0.8) * 2, 0, 1);
      UI.text(ctx, 'THE BATTLE FOR MYNSTRAL VILLAGE', 640, 470, { size: 22, color: '#f0d8a8', alpha: a, stroke: '#1a0802', strokeWidth: 4 });
      const pulse = 0.55 + Math.sin(this.t * 4) * 0.45;
      UI.text(ctx, Game.mouse.inside || !('ontouchstart' in window) ? '— Click anywhere to begin —' : '— Tap to begin —', 640, 580, {
        size: 24, color: '#ffe7a8', alpha: a * pulse, font: FONT_BODY, weight: 700,
      });
      UI.text(ctx, 'Sound on for the full experience ♪', 640, 620, { size: 16, color: '#b89868', alpha: a * 0.8, font: FONT_BODY, weight: 500 });
    }
  },
  start() {
    if (!this.loaded || this.slam < 0.8) return;
    Sound.unlock();
    Sound.play('whoosh');
    Game.go('menu');
  },
  onPointerDown() { this.start(); },
  onKey(k) { if (k === 'Enter' || k === ' ') { this.start(); return true; } },
};

/* ------------------------------------------------------------------ */
const MenuScene = {
  enter() {
    this.t = 0;
    this.fx = new FX();
    this.flash = 0;
    this.nextBolt = 4;
    Sound.music('menu');
    const go = (name) => () => Game.go(name);
    this.buttons = [
      UI.button(640, 330, 330, 76, 'PLAY', () => { Sound.play('horn'); Game.go('cinematic'); }, { style: 'gold', size: 36, icon: 'play' }),
      UI.button(640, 425, 290, 58, 'Instructions', go('instructions'), { size: 24 }),
      UI.button(640, 495, 290, 58, 'Characters', go('characters'), { size: 24 }),
      UI.button(640, 565, 290, 58, 'Settings', go('settings'), { size: 24 }),
      UI.button(640, 635, 290, 58, 'Exit', go('exit'), { size: 24, style: 'red' }),
    ];
    this.clouds = Array.from({ length: 7 }, (_, i) => ({ x: U.rand(0, W), y: U.rand(60, 300), s: U.rand(0.6, 1.4), v: U.rand(6, 16) * (i % 2 ? 1 : 0.7) }));
    this.cast = [
      { n: 'mortt', x: 70, y: 690, h: 128, flip: false },
      { n: 'thea', x: 190, y: 694, h: 124, flip: false },
      { n: 'godwin', x: 318, y: 700, h: 170, flip: false },
      { n: 'falco', x: 176, y: 716, h: 138, flip: false },
      { n: 'june', x: 420, y: 714, h: 118, flip: false },
      { n: 'ilydan', x: 1228, y: 684, h: 112, flip: true },
      { n: 'hadog', x: 1060, y: 690, h: 162, flip: true },
      { n: 'keljeon', x: 880, y: 700, h: 118, flip: true },
      { n: 'destroyer', x: 1170, y: 716, h: 196, flip: true },
      { n: 'giant', x: 968, y: 718, h: 136, flip: true },
    ].sort((a, b) => a.y - b.y);
  },
  update(dt) {
    this.t += dt;
    this.fx.update(dt);
    Common.embers(this.fx, 10, dt);
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > W + 200) c.x = -200; }
    this.flash = Math.max(0, this.flash - dt * 3);
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) { this.flash = 1; this.nextBolt = U.rand(6, 12); Sound.play('thunder'); }
  },
  draw(ctx) {
    ctx.drawImage(Art.get('menu'), 0, 0);
    // clouds
    for (const c of this.clouds) {
      ctx.fillStyle = 'rgba(90,40,70,0.45)';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 90 * c.s, 18 * c.s, 0, 0, TAU);
      ctx.ellipse(c.x + 40 * c.s, c.y - 10 * c.s, 50 * c.s, 16 * c.s, 0, 0, TAU);
      ctx.fill();
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,230,255,${this.flash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `rgba(255,255,255,${this.flash})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      let x = 1060, y = 0;
      ctx.moveTo(x, y);
      const r = U.seeded(Math.floor(this.nextBolt * 100));
      while (y < 380) { x += (r() - 0.5) * 60; y += 30 + r() * 30; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // cast bobbing
    for (const c of this.cast) {
      const bob = Math.sin(this.t * 2 + c.x * 0.05) * 3;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.h * 0.28, c.h * 0.06, 0, 0, TAU); ctx.fill();
      Art.drawSprite(ctx, c.n, c.x, c.y + bob * 0.2, c.h, { flip: c.flip, sy: 1 + Math.sin(this.t * 2 + c.x) * 0.012 });
    }
    this.fx.draw(ctx, 2);
    // title
    const tb = Math.sin(this.t * 1.5) * 4;
    Common.logo(ctx, 640, 150 + tb, 78, this.t);
    UI.text(ctx, 'THE BATTLE FOR MYNSTRAL VILLAGE', 640, 256, { size: 18, color: '#f3dcae', stroke: '#1a0802', strokeWidth: 4 });
    UI.drawButtons(ctx, this.buttons);
    const d = DIFFICULTY[Game.settings.difficulty].label;
    UI.text(ctx, `Difficulty: ${d}  ·  Levels unlocked: ${Game.progress.unlocked}/2`, 640, 700, { size: 14, color: 'rgba(240,220,180,0.75)', font: FONT_BODY, weight: 700 });
  },
  onKey(k) {
    if (k === 'Enter') { this.buttons[0].onClick(); return true; }
  },
};

/* ------------------------------------------------------------------ */
const SettingsScene = {
  enter(p) {
    this.t = 0;
    this.from = p.from || 'menu';
    this.fx = new FX();
    const s = Game.settings;
    this.sliders = [
      UI.slider(520, 250, 360, () => s.music, (v) => { s.music = v; Sound.applyVolumes(); }, 'Music'),
      UI.slider(520, 315, 360, () => s.sfx, (v) => { s.sfx = v; Sound.applyVolumes(); }, 'Sound FX'),
    ];
    this.drag = null;
    const diffBtn = (key, x) => UI.button(x, 395, 140, 50, DIFFICULTY[key].label, () => { s.difficulty = key; Game.saveSettings(); this.refresh(); }, { size: 20, key });
    this.diffBtns = [diffBtn('easy', 580), diffBtn('normal', 730), diffBtn('hard', 880)];
    this.shakeBtn = UI.button(600, 470, 150, 50, '', () => { s.shake = !s.shake; Game.saveSettings(); this.refresh(); if (s.shake) Game.shake(8, 0.3); }, { size: 20 });
    this.fullBtn = UI.button(820, 470, 200, 50, 'Fullscreen', () => Game.toggleFullscreen(), { size: 20, icon: 'full' });
    this.resetBtn = UI.button(640, 548, 280, 48, 'Reset Progress', () => {
      if (this.confirmReset) {
        Game.progress = { unlocked: 1, stars: {} }; Game.saveProgress();
        Game.settings.seenIntro = false; Game.saveSettings();
        this.resetBtn.label = 'Progress Reset ✓'; this.confirmReset = false;
      } else { this.confirmReset = true; this.resetBtn.label = 'Tap again to confirm'; }
    }, { size: 18, style: 'red' });
    this.confirmReset = false;
    this.buttons = [...this.diffBtns, this.shakeBtn, this.fullBtn, this.resetBtn, Common.backButton(() => { Game.saveSettings(); Game.go(this.from); })];
    this.refresh();
  },
  refresh() {
    const s = Game.settings;
    this.diffBtns.forEach((b) => { b.style = b.key === s.difficulty ? 'gold' : 'wood'; });
    this.shakeBtn.label = s.shake ? 'On' : 'Off';
    this.shakeBtn.style = s.shake ? 'green' : 'dark';
  },
  update(dt) { this.t += dt; this.fx.update(dt); Common.embers(this.fx, 6, dt); },
  draw(ctx) {
    Common.paperBg(ctx);
    this.fx.draw(ctx, 2);
    UI.panel(ctx, 270, 130, 740, 480);
    UI.ribbon(ctx, 'SETTINGS', 640, 130, 340, 34);
    this.sliders.forEach((s) => UI.drawSlider(ctx, s, this.t));
    UI.text(ctx, 'Difficulty', 490, 395, { size: 22, align: 'right', color: '#4a2a10', weight: 900 });
    UI.text(ctx, 'Screen Shake', 490, 470, { size: 22, align: 'right', color: '#4a2a10', weight: 900 });
    UI.drawButtons(ctx, this.buttons);
  },
  onPointerDown(x, y) {
    for (const s of this.sliders) if (UI.sliderHit(s, x, y)) { this.drag = s; this.onPointerMove(x, y); Sound.play('select'); }
  },
  onPointerMove(x) {
    if (!this.drag) return;
    this.drag.set(U.clamp((x - this.drag.x) / this.drag.w, 0, 1));
    Sound.play('tick');
  },
  onPointerUp() { if (this.drag) { this.drag = null; Game.saveSettings(); } },
  onKey(k) { if (k === 'Escape') { Game.saveSettings(); Game.go(this.from); return true; } },
};

/* ------------------------------------------------------------------ */
const InstructionsScene = {
  enter() {
    this.t = 0;
    this.fx = new FX();
    this.buttons = [Common.backButton(() => Game.go('menu')), UI.button(1150, 660, 190, 54, 'Play', () => { Sound.play('horn'); Game.go('cinematic'); }, { style: 'gold', icon: 'play', size: 24 })];
  },
  update(dt) { this.t += dt; this.fx.update(dt); Common.embers(this.fx, 6, dt); },
  draw(ctx) {
    Common.paperBg(ctx);
    this.fx.draw(ctx, 2);
    UI.panel(ctx, 60, 70, 1160, 550);
    UI.ribbon(ctx, 'HOW TO PLAY', 640, 70, 380, 32);
    const steps = [
      ['1', 'Pick a warrior', 'Tap one of the four hero portraits at the top of the battlefield (or press 1–4). Each costs Courage.'],
      ['2', 'Send them down a lane', 'Tap one of the three lanes. Your warrior charges out of that gate and fights every beast in the way.'],
      ['3', 'Storm the Brute Cave', 'Every warrior who reaches the caves damages the beasts\' health bar. Every beast reaching your gates damages yours.'],
      ['4', 'Win within 90 seconds', 'Zero out the enemy\'s health to win — or have more health than them when the timer runs out.'],
    ];
    steps.forEach(([n, title, body], i) => {
      const y = 140 + i * 112;
      ctx.fillStyle = '#7a1a14';
      ctx.beginPath(); ctx.arc(130, y + 22, 26, 0, TAU); ctx.fill();
      UI.ring(ctx, 130, y + 22, 26, 4);
      UI.text(ctx, n, 130, y + 24, { size: 26, weight: 900, color: '#fff3d0' });
      UI.text(ctx, title, 175, y + 8, { size: 24, align: 'left', color: '#5a1a08', weight: 900 });
      UI.paragraph(ctx, body, 175, y + 26, 470, { size: 18, color: '#3a2412' });
    });
    // right column: roster and tips
    const cx = 700;
    UI.text(ctx, 'Your Army', cx, 132, { size: 22, align: 'left', color: '#5a1a08', weight: 900 });
    HUMAN_ROSTER.forEach((k, i) => {
      const d = UNITS[k], x = cx + 40 + i * 122, y = 196;
      Art.portrait(ctx, k, x, y, 36);
      UI.ring(ctx, x, y, 36, 4);
      ctx.fillStyle = '#7a1a14'; ctx.beginPath(); ctx.arc(x + 26, y + 26, 13, 0, TAU); ctx.fill();
      UI.text(ctx, d.cost, x + 26, y + 27, { size: 15, weight: 900, color: '#fff' });
      UI.text(ctx, d.name.split(' ')[1], x, y + 50, { size: 16, color: '#3a2412', weight: 900 });
      UI.text(ctx, d.role, x, y + 68, { size: 13, color: '#6a4a2a', font: FONT_BODY, weight: 700 });
    });
    const tips = [
      '⚡ Courage refills over time — and defeating beasts earns extra.',
      '👑 When Lord Godwin\'s medallion glows, tap it (or press Space) and pick a lane to rain flaming arrows.',
      '🛡 Put Commando Falco in front to shield archers and spearmen.',
      '⏸ Press P or Esc to pause.',
    ];
    let ty = 300;
    UI.text(ctx, 'Battle Tips', cx, ty, { size: 22, align: 'left', color: '#5a1a08', weight: 900 });
    ty += 22;
    tips.forEach((tp) => { ty += UI.paragraph(ctx, tp, cx, ty, 480, { size: 18, color: '#3a2412' }) + 8; });
    UI.drawButtons(ctx, this.buttons);
  },
  onKey(k) { if (k === 'Escape') { Game.go('menu'); return true; } },
};

/* ------------------------------------------------------------------ */
const CharactersScene = {
  enter() {
    this.t = 0;
    this.fx = new FX();
    this.tab = 'humans';
    this.sel = 0;
    this.selT = 0;
    this.tabBtns = [
      UI.button(185, 160, 170, 46, 'Humans', () => this.setTab('humans'), { size: 20 }),
      UI.button(370, 160, 170, 46, 'Beasts', () => this.setTab('beasts'), { size: 20 }),
    ];
    this.buttons = [...this.tabBtns, Common.backButton(() => Game.go('menu'))];
    this.setTab('humans', true);
  },
  setTab(t, silent) {
    this.tab = t; this.sel = 0; this.selT = 0;
    this.tabBtns[0].style = t === 'humans' ? 'gold' : 'wood';
    this.tabBtns[1].style = t === 'beasts' ? 'red' : 'wood';
    if (!silent) Sound.play(t === 'beasts' ? 'brute_spawn' : 'deploy');
  },
  list() { return PROFILES[this.tab]; },
  update(dt) {
    this.t += dt; this.selT += dt; this.fx.update(dt);
    Common.embers(this.fx, 6, dt, this.tab === 'beasts' ? 'rgba(255,80,40,1)' : 'rgba(255,200,90,1)');
  },
  medalPos(i) { return { x: 150 + (i % 2) * 118, y: 262 + Math.floor(i / 2) * 118 + (i % 2) * 20 }; },
  draw(ctx) {
    Common.paperBg(ctx);
    this.fx.draw(ctx, 2);
    UI.panel(ctx, 40, 70, 1200, 560);
    UI.ribbon(ctx, 'CHARACTERS', 640, 70, 380, 32);
    const list = this.list();
    const p = list[this.sel];
    const flip = this.tab === 'beasts';
    // spotlight + sprite (sized so weapons never cover the portrait list or the text)
    const cx = 560, fy = 590;
    const sp = ctx.createRadialGradient(cx, fy - 170, 20, cx, fy - 150, 260);
    sp.addColorStop(0, flip ? 'rgba(200,60,30,0.45)' : 'rgba(255,220,120,0.55)'); sp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sp; ctx.fillRect(cx - 280, fy - 430, 560, 460);
    ctx.fillStyle = 'rgba(60,30,10,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, fy, 130, 22, 0, 0, TAU); ctx.fill();
    const img = Art.img[p.key], ax = SPRITES[p.key].ax;
    const leftFrac = flip ? 1 - ax : ax;
    const maxW = Math.min(205 / leftFrac, 215 / (1 - leftFrac));
    const baseH = Math.min(p.key === 'destroyer' || p.key === 'hadog' ? 380 : 340, (maxW * img.height) / img.width);
    const k = U.ease.outBack(U.clamp(this.selT / 0.4, 0, 1));
    Art.drawSprite(ctx, p.key, cx, fy, baseH * (0.6 + 0.4 * k), { flip, alpha: U.clamp(this.selT * 4, 0, 1), sy: 1 + Math.sin(this.t * 2.2) * 0.012 });
    list.forEach((q, i) => {
      const { x, y } = this.medalPos(i);
      const on = i === this.sel;
      const hov = Math.hypot(Game.mouse.x - x, Game.mouse.y - y) < 46;
      const r = on ? 48 : hov ? 46 : 44;
      Art.portrait(ctx, q.key, x, y, r, { flip, bg1: flip ? '#f0a080' : '#f6e3b0', bg2: flip ? '#6a1a10' : '#b27a3a' });
      UI.ring(ctx, x, y, r, on ? 6 : 4, on ? '#ffd36a' : null);
      if (i === 0) UI.text(ctx, '★ LEADER', x, y + r + 12, { size: 12, color: '#7a1a14', weight: 900 });
    });
    // info column
    const ix = 790;
    UI.text(ctx, p.name, ix, 130, { size: 34, align: 'left', color: '#5a1a08', weight: 900 });
    UI.text(ctx, p.role, ix, 166, { size: 18, align: 'left', color: '#8a5a2a', font: FONT_BODY, weight: 700 });
    let y = 200;
    Object.entries(p.stats).forEach(([name, v], i) => {
      UI.text(ctx, name, ix, y + i * 30 + 8, { size: 15, align: 'left', color: '#4a2a10', weight: 900 });
      const fr = U.clamp((this.selT - i * 0.08) * 3, 0, 1) * (v / 10);
      UI.bar(ctx, ix + 90, y + i * 30 + 2, 300, 12, fr, this.tab === 'beasts' ? '#ff7a4a' : '#f6d06a', this.tab === 'beasts' ? '#a01a10' : '#b0701a');
    });
    y += 128;
    ctx.fillStyle = 'rgba(122,26,20,0.12)';
    UI.roundRect(ctx, ix - 10, y - 6, 420, 46, 10); ctx.fill();
    UI.paragraph(ctx, '✦ ' + p.special, ix, y, 400, { size: 17, color: '#7a1a14', weight: 700 });
    y += 56;
    UI.paragraph(ctx, p.bio, ix, y, 410, { size: 16, color: '#3a2412', lineHeight: 20.5 });
    UI.drawButtons(ctx, this.buttons);
  },
  onPointerDown(x, y) {
    this.list().forEach((p, i) => {
      const m = this.medalPos(i);
      if (Math.hypot(x - m.x, y - m.y) < 48 && i !== this.sel) { this.sel = i; this.selT = 0; Sound.play('select'); }
    });
  },
  onKey(k) {
    const n = this.list().length;
    if (k === 'ArrowDown' || k === 'ArrowRight') { this.sel = (this.sel + 1) % n; this.selT = 0; Sound.play('select'); return true; }
    if (k === 'ArrowUp' || k === 'ArrowLeft') { this.sel = (this.sel + n - 1) % n; this.selT = 0; Sound.play('select'); return true; }
    if (k === 'Tab') { this.setTab(this.tab === 'humans' ? 'beasts' : 'humans'); return true; }
    if (k === 'Escape') { Game.go('menu'); return true; }
  },
};

/* ------------------------------------------------------------------ */
const ExitScene = {
  enter() {
    this.t = 0;
    this.left = false;
    this.fx = new FX();
    this.buttons = [
      UI.button(530, 430, 200, 60, 'Stay', () => Game.go('menu'), { style: 'green', size: 24 }),
      UI.button(750, 430, 200, 60, 'Leave', () => this.leave(), { style: 'red', size: 24 }),
    ];
  },
  leave() {
    this.left = true; this.t = 0;
    Sound.music(null);
    Sound.play('defeat');
    this.buttons = [UI.button(640, 520, 280, 60, 'Return to Menu', () => Game.go('menu'), { size: 22, icon: 'home' })];
    if (window.opener) { try { window.close(); } catch (e) { /* browsers only close script-opened windows */ } }
  },
  update(dt) { this.t += dt; this.fx.update(dt); Common.embers(this.fx, this.left ? 3 : 8, dt); },
  draw(ctx) {
    ctx.drawImage(Art.get('menu'), 0, 0);
    ctx.fillStyle = `rgba(5,2,4,${this.left ? U.clamp(0.6 + this.t * 0.3, 0, 0.85) : 0.6})`;
    ctx.fillRect(0, 0, W, H);
    this.fx.draw(ctx, 2);
    if (!this.left) {
      UI.panel(ctx, 360, 220, 560, 280, 'dark');
      UI.text(ctx, 'Leave Mynstral Village?', 640, 290, { size: 32, weight: 900, color: '#ffe7a8' });
      UI.text(ctx, 'The beasts of Brute Cave are still out there…', 640, 345, { size: 20, font: FONT_BODY, color: '#d8c0a0' });
    } else {
      Common.logo(ctx, 640, 220, 60, this.t, U.clamp(this.t, 0, 1));
      UI.text(ctx, 'Thanks for playing!', 640, 350, { size: 36, weight: 900, color: '#ffe7a8', alpha: U.clamp(this.t - 0.4, 0, 1) });
      UI.text(ctx, 'The village will await your return, brave one.', 640, 400, { size: 22, font: FONT_BODY, color: '#d8c0a0', alpha: U.clamp(this.t - 0.8, 0, 1) });
      UI.text(ctx, 'You can close this tab now.', 640, 440, { size: 16, font: FONT_BODY, color: '#a08868', alpha: U.clamp(this.t - 1.2, 0, 1) });
    }
    UI.drawButtons(ctx, this.buttons);
  },
  onKey(k) { if (k === 'Escape') { Game.go('menu'); return true; } },
};

/* ------------------------------------------------------------------ */
const LevelSelectScene = {
  enter() {
    this.t = 0;
    this.fx = new FX();
    Sound.music('menu');
    this.nodes = [
      { x: 330, y: 420, level: 1, name: 'Earthling Fort' },
      { x: 700, y: 300, level: 2, name: 'Brute Lair' },
      { x: 1010, y: 440, level: 3, name: 'Coming Soon' },
    ];
    this.buttons = [Common.backButton(() => Game.go('menu'))];
  },
  update(dt) { this.t += dt; this.fx.update(dt); Common.embers(this.fx, 5, dt); },
  unlocked(n) { return n.level === 3 ? Game.progress.unlocked >= 3 : n.level <= Game.progress.unlocked; },
  draw(ctx) {
    Common.paperBg(ctx);
    this.fx.draw(ctx, 2);
    UI.panel(ctx, 80, 80, 1120, 540);
    UI.ribbon(ctx, 'CHOOSE YOUR BATTLE', 640, 80, 460, 30);
    // island outline
    ctx.save();
    ctx.fillStyle = 'rgba(90,130,70,0.25)';
    Art.blob(ctx, 660, 380, 470, 190, U.seeded(9), 18, 0.25); ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,20,0.5)'; ctx.lineWidth = 3; ctx.setLineDash([2, 8]); ctx.stroke();
    ctx.setLineDash([]);
    // path
    ctx.strokeStyle = '#8a3a1a'; ctx.lineWidth = 5; ctx.setLineDash([12, 12]); ctx.lineDashOffset = -this.t * 20;
    ctx.beginPath(); ctx.moveTo(330, 420); ctx.quadraticCurveTo(500, 260, 700, 300); ctx.quadraticCurveTo(900, 340, 1010, 440); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    UI.text(ctx, 'Mynstral Island', 640, 575, { size: 18, color: 'rgba(90,50,20,0.7)', font: FONT_BODY, weight: 700 });
    for (const n of this.nodes) {
      const open = this.unlocked(n) || n.level === 3;
      const hov = Math.hypot(Game.mouse.x - n.x, Game.mouse.y - n.y) < 62;
      const r = 58 + (hov && open ? 4 : 0) + (n.level === Game.progress.unlocked && n.level < 3 ? Math.sin(this.t * 4) * 2 : 0);
      ctx.save();
      if (n.level < 3) {
        Art.portrait(ctx, n.level === 1 ? 'falco' : 'destroyer', n.x, n.y, r, { flip: n.level === 2, gray: !open, bg1: n.level === 2 ? '#f0a080' : '#f6e3b0', bg2: n.level === 2 ? '#6a1a10' : '#b27a3a' });
      } else {
        ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.fill();
        UI.text(ctx, '?', n.x, n.y + 4, { size: 64, weight: 900, color: '#8a6aa8' });
      }
      UI.ring(ctx, n.x, n.y, r, 6, hov && open ? '#ffd36a' : null);
      ctx.restore();
      UI.ribbon(ctx, `Level ${n.level}`, n.x, n.y + r + 24, 140, 18, n.level === 3 ? '#4a2a6a' : undefined);
      UI.text(ctx, n.name, n.x, n.y + r + 62, { size: 18, color: '#4a2a10', weight: 900 });
      if (!open) UI.text(ctx, '🔒 Locked', n.x, n.y, { size: 20, weight: 900, color: '#fff', stroke: '#000', strokeWidth: 4 });
      const stars = Game.progress.stars[n.level] || 0;
      if (n.level < 3 && stars) for (let i = 0; i < 3; i++) drawStar(ctx, n.x - 30 + i * 30, n.y - r - 12, 12, i < stars);
    }
    UI.drawButtons(ctx, this.buttons);
  },
  onPointerDown(x, y) {
    for (const n of this.nodes) {
      if (Math.hypot(x - n.x, y - n.y) < 62) {
        if (n.level === 3) { Sound.play('click'); Game.go('comingsoon'); return; }
        if (!this.unlocked(n)) { Sound.play('error'); return; }
        Sound.play('click');
        Game.go('levelintro', { level: n.level });
      }
    }
  },
  onKey(k) { if (k === 'Escape') { Game.go('menu'); return true; } },
};

function drawStar(ctx, x, y, r, filled, scale) {
  ctx.save();
  ctx.translate(x, y);
  if (scale) ctx.scale(scale, scale);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  if (filled) {
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#fff6c0'); g.addColorStop(0.5, '#ffcf3a'); g.addColorStop(1, '#c8801a');
    ctx.fillStyle = g;
  } else ctx.fillStyle = 'rgba(40,20,10,0.45)';
  ctx.fill();
  ctx.lineWidth = r * 0.14; ctx.strokeStyle = filled ? '#7a4a0a' : 'rgba(40,20,10,0.6)'; ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
const LevelIntroScene = {
  enter(p) {
    this.level = p.level || 1;
    this.L = LEVELS[this.level - 1];
    this.t = 0;
    this.fx = new FX();
    Sound.music('cinematic');
    Sound.play(this.level === 2 ? 'roar' : 'horn');
    this.buttons = [
      Common.backButton(() => Game.go('menu')),
      UI.button(1080, 640, 300, 70, 'BEGIN BATTLE', () => this.begin(), { style: 'gold', size: 26, icon: 'sword' }),
    ];
  },
  begin() { Game.go('battle', { level: this.level }); },
  update(dt) {
    this.t += dt; this.fx.update(dt);
    Common.embers(this.fx, this.level === 2 ? 16 : 8, dt, this.level === 2 ? 'rgba(255,90,40,1)' : undefined);
  },
  draw(ctx) {
    ctx.drawImage(Art.get(this.L.bg), 0, 0);
    ctx.fillStyle = 'rgba(8,4,4,0.72)'; ctx.fillRect(0, 0, W, H);
    this.fx.draw(ctx, 2);
    const k = U.ease.outBack(U.clamp(this.t / 0.6, 0, 1));
    ctx.save();
    ctx.translate(360, 150); ctx.scale(k, k);
    UI.text(ctx, `LEVEL ${this.level}`, 0, 0, { size: 72, weight: 900, font: FONT_HEAD, color: '#ffd36a', stroke: '#2a0a02', strokeWidth: 10, shadow: 'rgba(0,0,0,0.8)' });
    ctx.restore();
    const a = U.clamp((this.t - 0.4) * 2, 0, 1);
    UI.text(ctx, this.L.title, 360, 225, { size: 34, weight: 900, color: '#fff0d0', alpha: a, stroke: '#1a0602', strokeWidth: 5 });
    UI.text(ctx, this.L.place, 360, 262, { size: 18, color: '#d8b888', alpha: a, font: FONT_BODY, weight: 700 });
    ctx.save(); ctx.globalAlpha = U.clamp((this.t - 0.7) * 2, 0, 1);
    UI.panel(ctx, 70, 300, 580, 260, 'dark');
    UI.paragraph(ctx, this.L.text, 100, 330, 520, { size: 21, color: '#f0dcb8', italic: true, lineHeight: 29 });
    UI.paragraph(ctx, this.L.tip, 100, 478, 520, { size: 17, color: '#ffc870', weight: 700 });
    ctx.restore();
    // enemy commanders
    UI.text(ctx, this.level === 2 ? 'THE HORDE AWAITS' : 'THE COMMANDER GENERALS', 950, 110, { size: 22, weight: 900, color: '#ff8a6a', alpha: a, stroke: '#1a0602', strokeWidth: 4 });
    const cast = this.level === 2
      ? [['keljeon', 760, 470, 150], ['ilydan', 1180, 440, 140], ['hadog', 1080, 520, 200], ['destroyer', 950, 560, 250], ['giant', 820, 590, 170]]
      : [['ilydan', 1150, 420, 140], ['keljeon', 790, 440, 150], ['hadog', 1040, 510, 200], ['giant', 900, 540, 170]];
    cast.forEach(([n, x, y, h], i) => {
      const kk = U.ease.outBack(U.clamp((this.t - 0.5 - i * 0.12) / 0.5, 0, 1));
      if (kk <= 0) return;
      const eyes = this.level === 2 && n === 'destroyer';
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(x, y, h * 0.25 * kk, h * 0.05, 0, 0, TAU); ctx.fill();
      Art.drawSprite(ctx, n, x, y, h * kk, { flip: true, sy: 1 + Math.sin(this.t * 2 + i) * 0.015, glowColor: eyes ? '#ff3a1a' : null, glowAlpha: 0.35 + Math.sin(this.t * 3) * 0.15 });
    });
    UI.drawButtons(ctx, this.buttons);
  },
  onKey(k) {
    if (k === 'Enter' || k === ' ') { this.begin(); return true; }
    if (k === 'Escape') { Game.go('menu'); return true; }
  },
};

/* ------------------------------------------------------------------ */
const ResultScene = {
  enter(p) {
    Object.assign(this, { win: p.win, level: p.level, stars: p.stars || 0, stats: p.stats || {}, reason: p.reason || '' });
    this.t = 0;
    this.fx = new FX();
    this.starShown = 0;
    Sound.music(null);
    Sound.play(this.win ? 'victory' : 'defeat');
    const L = this.level;
    if (this.win) {
      this.buttons = [
        UI.button(640, 580, 320, 70, L === 1 ? 'NEXT LEVEL' : 'CONTINUE', () => {
          if (L === 1) Game.go('levelintro', { level: 2 });
          else Game.go('comingsoon');
        }, { style: 'gold', size: 26, icon: 'next' }),
        UI.button(420, 660, 190, 54, 'Replay', () => Game.go('battle', { level: L }), { size: 20, icon: 'retry' }),
        UI.button(860, 660, 190, 54, 'Menu', () => Game.go('menu'), { size: 20, icon: 'home' }),
      ];
    } else {
      this.buttons = [
        UI.button(640, 560, 320, 72, 'TRY AGAIN', () => Game.go('battle', { level: L }), { style: 'gold', size: 28, icon: 'retry' }),
        UI.button(640, 650, 220, 54, 'Main Menu', () => Game.go('menu'), { size: 20, icon: 'home' }),
      ];
    }
  },
  update(dt) {
    this.t += dt;
    this.fx.update(dt);
    if (this.win) {
      if (Math.random() < dt * 40) {
        this.fx.add({ shape: 'square', x: U.rand(0, W), y: -10, vx: U.rand(-40, 40), vy: U.rand(80, 200), life: 5, size: U.rand(4, 7), color: U.pick(['#ffd36a', '#e8453a', '#4aa0ff', '#6ad26a', '#ffffff']), vr: U.rand(-6, 6), rot: U.rand(0, TAU), layer: 2 });
      }
      if (Math.random() < dt * 1.2) this.firework(U.rand(150, 1130), U.rand(100, 320));
      // stars appear one by one
      const want = Math.min(this.stars, Math.floor((this.t - 1.0) / 0.45) + 1);
      if (this.t > 1.0 && want > this.starShown) {
        this.starShown = want;
        const x = 640 + (want - 2) * 110, y = 300;
        Sound.play('star', want - 1);
        this.fx.burst(x, y, 24, { shape: 'star', color: ['#fff6c0', '#ffcf3a'], speed: 300, life: 0.8, size: 7, size2: 1, drag: 3, layer: 2, spin: 6 });
        Game.shake(4, 0.2);
      }
    } else {
      Common.embers(this.fx, 5, dt, 'rgba(160,160,170,1)');
    }
  },
  firework(x, y) {
    const c = U.pick(['#ffd36a', '#ff6a4a', '#6ab0ff', '#a0ff8a', '#ff8ae0']);
    this.fx.burst(x, y, 36, { shape: 'spark', color: c, speed: 260, life: 1.1, size: 2.5, g: 120, drag: 1.4, layer: 2, add: true });
    this.fx.add({ shape: 'glow', x, y, size: 90, size2: 20, life: 0.4, color: c, add: true, layer: 2 });
    Sound.play('crit');
  },
  draw(ctx) {
    ctx.drawImage(Art.get(LEVELS[this.level - 1].bg), 0, 0);
    ctx.fillStyle = this.win ? 'rgba(10,6,2,0.66)' : 'rgba(30,2,2,0.78)';
    ctx.fillRect(0, 0, W, H);
    if (this.win) {
      // rotating god rays
      ctx.save();
      ctx.translate(640, 170);
      ctx.rotate(this.t * 0.2);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#ffd36a';
      for (let i = 0; i < 16; i++) {
        ctx.rotate(TAU / 16);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -700); ctx.lineTo(40, -700); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    this.fx.draw(ctx, 2);
    const k = U.ease.outElastic(U.clamp(this.t / 1.0, 0, 1));
    ctx.save();
    ctx.translate(640, 165);
    ctx.scale(k, k);
    if (!this.win) ctx.rotate(Math.sin(this.t * 1.2) * 0.02);
    UI.text(ctx, this.win ? 'VICTORY!' : 'DEFEATED', 0, 0, {
      size: 104, weight: 900, font: FONT_TITLE, color: this.win ? '#ffd84a' : '#d8342a', stroke: this.win ? '#3a1402' : '#1a0202', strokeWidth: 14,
      shadow: this.win ? 'rgba(255,200,80,0.8)' : 'rgba(0,0,0,0.9)', shadowBlur: 30,
    });
    ctx.restore();
    const a = U.clamp((this.t - 0.6) * 2, 0, 1);
    if (this.win) {
      for (let i = 0; i < 3; i++) {
        const shown = i < this.starShown;
        drawStar(ctx, 640 + (i - 1) * 110, 300, 44, shown, shown ? 1 + Math.sin(this.t * 3 + i) * 0.04 : 1);
      }
      const msg = this.level === 1 ? 'The hybrids flee back to Brute Cave!' : 'The Brute Lair has fallen — once and for all!';
      UI.text(ctx, msg, 640, 390, { size: 28, weight: 900, color: '#fff0d0', alpha: a, stroke: '#1a0602', strokeWidth: 5 });
      if (this.reason) UI.text(ctx, this.reason, 640, 428, { size: 18, color: '#ffc870', alpha: a, font: FONT_BODY, weight: 700 });
      Art.drawSprite(ctx, 'godwin', 160, 700, 230 * U.ease.outBack(U.clamp((this.t - 0.3) / 0.6, 0, 1)), { sy: 1 + Math.sin(this.t * 6) * 0.03 });
      Art.drawSprite(ctx, 'falco', 1120, 700, 190 * U.ease.outBack(U.clamp((this.t - 0.5) / 0.6, 0, 1)), { sy: 1 + Math.sin(this.t * 6 + 1) * 0.03 });
    } else {
      UI.text(ctx, this.reason || 'The beasts have broken through the gates…', 640, 290, { size: 26, weight: 900, color: '#ffd0c0', alpha: a, stroke: '#1a0202', strokeWidth: 5 });
      UI.text(ctx, 'Don\'t lose hope — there is a second chance!', 640, 336, { size: 22, color: '#f0c0a0', alpha: a, font: FONT_BODY, weight: 700 });
      Art.drawSprite(ctx, 'destroyer', 1080, 710, 300, { flip: true, alpha: a, sy: 1 + Math.sin(this.t * 3) * 0.02 });
      Art.drawSprite(ctx, 'godwin', 180, 700, 200, { alpha: a, rot: -0.08, tint: '#223', tintAlpha: 0.25 });
    }
    const s = this.stats;
    if (s && a > 0) {
      const y = this.win ? 470 : 420;
      const items = [['Beasts defeated', s.kills || 0], ['Warriors sent', s.deployed || 0], ['Gate breaches', s.breaches || 0], ['Time', `${Math.round(s.time || 0)}s`]];
      items.forEach(([lbl, v], i) => {
        const x = 640 + (i - 1.5) * 170;
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        UI.roundRect(ctx, x - 76, y - 30, 152, 62, 10); ctx.fill();
        ctx.globalAlpha = 1;
        UI.text(ctx, String(v), x, y - 6, { size: 26, weight: 900, color: '#ffe7a8', alpha: a });
        UI.text(ctx, lbl, x, y + 20, { size: 13, color: '#d8c0a0', alpha: a, font: FONT_BODY, weight: 700 });
      });
    }
    UI.drawButtons(ctx, this.buttons);
  },
  onKey(k) {
    if (k === 'Enter' || k === ' ') { this.buttons[0].onClick(); return true; }
    if (k === 'Escape') { Game.go('menu'); return true; }
  },
};

/* ------------------------------------------------------------------ */
const ComingSoonScene = {
  enter() {
    this.t = 0;
    this.fx = new FX();
    this.flash = 0;
    this.nextBolt = 1.2;
    Sound.music('cinematic');
    if (Game.progress.unlocked < 3) { Game.progress.unlocked = 3; Game.saveProgress(); }
    this.buttons = [
      UI.button(520, 650, 230, 58, 'Main Menu', () => Game.go('menu'), { size: 22, icon: 'home' }),
      UI.button(770, 650, 230, 58, 'Replay L2', () => Game.go('battle', { level: 2 }), { size: 22, icon: 'retry' }),
    ];
  },
  update(dt) {
    this.t += dt; this.fx.update(dt);
    Common.embers(this.fx, 10, dt, 'rgba(170,110,255,1)');
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) { this.flash = 1; this.nextBolt = U.rand(3, 6); Sound.play('thunder'); Game.shake(5, 0.4); }
  },
  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#07040f'); g.addColorStop(0.6, '#1c0f2e'); g.addColorStop(1, '#0a0610');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // colossal silhouette
    ctx.save();
    ctx.translate(640, 800);
    const br = 1 + Math.sin(this.t * 1.3) * 0.015;
    ctx.scale(br, br);
    ctx.fillStyle = `rgba(0,0,0,${0.85})`;
    ctx.beginPath();
    ctx.moveTo(-420, 0); ctx.quadraticCurveTo(-400, -260, -250, -330); ctx.quadraticCurveTo(-200, -470, -120, -500);
    ctx.lineTo(-170, -640); ctx.lineTo(-70, -540); ctx.quadraticCurveTo(0, -570, 70, -540); ctx.lineTo(170, -640); ctx.lineTo(120, -500);
    ctx.quadraticCurveTo(200, -470, 250, -330); ctx.quadraticCurveTo(400, -260, 420, 0); ctx.closePath(); ctx.fill();
    const eg = (x) => {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(Art.glow('rgba(170,80,255,1)'), x - 50, -470, 100, 100);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#e6c8ff';
      ctx.beginPath(); ctx.ellipse(x, -420, 16, 6 * (0.3 + Math.abs(Math.sin(this.t * 0.7)) * 0.7), 0, 0, TAU); ctx.fill();
    };
    eg(-55); eg(55);
    ctx.restore();
    if (this.flash > 0) { ctx.fillStyle = `rgba(220,200,255,${this.flash * 0.4})`; ctx.fillRect(0, 0, W, H); }
    this.fx.draw(ctx, 2);
    UI.text(ctx, 'LEVEL 3', 640, 90, { size: 64, weight: 900, font: FONT_HEAD, color: '#c8a0ff', stroke: '#12061e', strokeWidth: 10, shadow: 'rgba(160,80,255,0.8)', shadowBlur: 30 });
    UI.panel(ctx, 250, 140, 780, 150, 'dark');
    UI.paragraph(ctx, LEVEL3_TEXT, 290, 166, 700, { size: 23, color: '#eadcff', italic: true, lineHeight: 32, align: 'left' });
    const p = 1 + Math.sin(this.t * 4) * 0.06;
    ctx.save(); ctx.translate(640, 480); ctx.scale(p, p); ctx.rotate(-0.04);
    UI.text(ctx, 'COMING SOON!', 0, 0, { size: 58, weight: 900, font: FONT_TITLE, color: '#ffd84a', stroke: '#2a0a02', strokeWidth: 10, shadow: 'rgba(255,200,80,0.6)', shadowBlur: 24 });
    ctx.restore();
    UI.text(ctx, 'Stay tuned for what unfolds in Level 3…', 640, 556, { size: 20, font: FONT_BODY, color: '#bca8d8', weight: 700 });
    UI.drawButtons(ctx, this.buttons);
  },
  onKey(k) { if (k === 'Escape' || k === 'Enter') { Game.go('menu'); return true; } },
};
