'use strict';
/* Opening cinematic: the story of Mynstral Village and the war council, told with animated scenes. */

const SPEAKERS = {
  narrator: { name: '', voice: null },
  destroyer: { name: 'Insinuated Destroyer', portrait: 'destroyer', side: 'right', voice: 95, color: '#ff7a5a' },
  brutes: { name: 'The Brutes', portrait: 'giant', side: 'right', voice: 120, color: '#ff9a6a' },
  falco: { name: 'Commando Falco', portrait: 'falco', side: 'left', voice: 250, color: '#ffe07a' },
  godwin: { name: 'Lord Godwin', portrait: 'godwin', side: 'right', voice: 165, color: '#ffd36a' },
  all: { name: 'Everyone', voice: null },
};

const SHOTS = [
  {
    set: 'lab', music: 'cinematic', caption: 'The 15th Century',
    lines: [
      { who: 'narrator', text: 'A long, long time ago, somewhere in the 15th century, a scientist named Victor Consuela created superhumans.' },
      { who: 'narrator', text: 'A hybrid species appeared on Earth — with the IQ of humans and the strength of predatory beasts.' },
      { who: 'narrator', text: 'Victor wanted to test whether his creations could co-exist with people.' },
    ],
  },
  {
    set: 'island', music: 'village', caption: 'Mynstral Village', narrTop: true,
    lines: [
      { who: 'narrator', text: 'To conduct his experiment, he put a bunch of ordinary skilled humans along with his hybrids on the secluded island village of Mynstral.' },
      { who: 'narrator', text: 'In thirty years, Mynstral Village came to be known as the happiest place on Earth.' },
      { who: 'narrator', text: 'Humans and superhumans lived in peace and harmony — meeting at social gatherings and market towns…' },
    ],
  },
  {
    set: 'rift', music: 'cinematic', caption: 'The Rift', narrTop: true,
    lines: [
      { who: 'narrator', text: '…until the superhumans gradually began to gather a sense of superiority. Their ever-evolving intelligence gave them a sense of greatness.' },
      { who: 'narrator', text: 'Victor\'s hybrids no longer looked upon fellow-men as equals. They wanted to unleash their super powers and command respect from humans.', thunder: true },
      { who: 'narrator', text: 'It started with little tiffs. At first, the hybrids stopped associating with the humans. Then they started to deliberately hurt them.' },
      { who: 'narrator', text: 'When the hatred reached its peak, the hybrids swore they would declare war — and be the rightful leader of all races.', thunder: true },
    ],
  },
  {
    set: 'cave', music: 'boss', caption: 'Brute Cave',
    lines: [
      { who: 'narrator', text: 'Commando Falco, who happens to pass by Brute Cave, overhears a speech…' },
      { who: 'destroyer', text: 'Hail, hybrids of Brute Cave! We are gathered here today to address the current situation.' },
      { who: 'destroyer', text: 'We are Super Humans. We have the intelligence of humans and the strength of beasts. Why must we be seen as equals of puny men? It\'s an insult. It\'s a mockery of our race!' },
      { who: 'destroyer', text: 'We must show these humans what we are capable of, and make them understand who is the true king of Mynstral Village!' },
      { who: 'brutes', text: 'YES! YES! YES! We must fight. We will fight. Down with humans!', chant: true },
      { who: 'narrator', text: 'Falco slips away and races back to the Earthling Fort…' },
    ],
  },
  {
    set: 'throne', music: 'cinematic', caption: 'The Earthling Fort',
    lines: [
      { who: 'falco', text: 'Emperor!! Empero..or!! Terrible news… the.. the.. (sighs)' },
      { who: 'godwin', text: 'What happened, Falco? Why do you seem scared?' },
      { who: 'falco', text: 'Terrible news, My Lord. They are planning a war.' },
      { who: 'godwin', text: 'Who are they? Speak clearly.' },
      { who: 'falco', text: 'I was crossing the Brute Cave when I heard him dictating his clan that they must invade the Earthling Fort. That.. that.. Insinuated Destroyer — he wants to take over our land! Our home!' },
      { who: 'godwin', text: 'Hmmm… I see. I feared this day might come soon. He wants to take over our fort and emerge as the ultimate ruler of Mynstral Village, from where he would gradually move towards other nations…' },
      { who: 'godwin', text: 'No, we must stop him. He cannot succeed.' },
      { who: 'narrator', text: '(after much thought)', think: true },
      { who: 'godwin', text: 'Prepare for war, Falco. We must at any cost protect our fellow humans and our civilisation. Go, prepare for war!', rally: true },
    ],
  },
  {
    set: 'field', music: 'battle', caption: 'The Arena', narrTop: true,
    lines: [
      { who: 'narrator', text: 'Lord Godwin\'s Army Chiefs reach the arena and shout…' },
      { who: 'all', text: 'ATTACK!', big: true },
    ],
  },
];

const CinematicScene = {
  enter() {
    this.fx = new FX();
    this.shot = -1;
    this.t = 0;
    this.flash = 0;
    this.fadeIn = 1;
    this.ending = false;
    this.buttons = [UI.button(1170, 36, 170, 46, 'Skip', () => this.finish(), { icon: 'skip', size: 20, style: 'dark' })];
    this.startShot(0);
  },

  startShot(i) {
    this.shot = i;
    this.shotT = 0;
    this.line = -1;
    this.fadeIn = 1;
    this.fx.clear();
    const S = SHOTS[i];
    Sound.music(S.music);
    this.bubbles = [];
    if (S.set === 'island') Sound.play('waves');
    this.nextLine();
  },

  nextLine() {
    const S = SHOTS[this.shot];
    this.line++;
    if (this.line >= S.lines.length) {
      if (this.shot + 1 < SHOTS.length) { this.transition = { t: 0, to: this.shot + 1 }; Sound.play('whoosh'); }
      else this.finish();
      return;
    }
    this.lineT = 0;
    this.chars = 0;
    this.blip = 0;
    const L = S.lines[this.line];
    if (L.thunder) { this.flash = 1; Sound.play('thunder'); Game.shake(6, 0.5); }
    if (L.chant) { Sound.play('chant'); Game.shake(10, 1.2); }
    if (L.who === 'destroyer' && this.line === 1) Sound.play('roar');
    if (L.big) {
      this.chars = L.text.length;
      Sound.play('horn');
      setTimeout(() => { if (Game.scene === this) { Game.shake(16, 0.6); Sound.play('slam'); } }, 450);
      this.fx.burst(640, 360, 70, { shape: 'spark', color: ['#ffd36a', '#ff8a3a', '#fff'], speed: 700, life: 1, size: 4, drag: 2, layer: 2, add: true });
      this.fx.ring(640, 360, 60, 700, 0.8, 'rgba(255,220,140,0.9)', 10, 2);
    }
    if (L.rally) {
      Sound.play('ready');
      this.fx.burst(1010, 380, 40, { shape: 'star', color: ['#fff6c0', '#ffcf3a'], speed: 260, life: 1.4, size: 6, size2: 1, drag: 1.5, layer: 2, spin: 4 });
    }
    if (L.think) Sound.play('heartbeat');
  },

  finish() {
    if (this.ending) return;
    this.ending = true;
    Game.settings.seenIntro = true;
    Game.saveSettings();
    if (Game.progress.unlocked > 1) Game.go('levelselect');
    else Game.go('levelintro', { level: 1 });
  },

  advance() {
    if (this.transition || this.ending) return;
    const L = SHOTS[this.shot].lines[this.line];
    if (!L) return;
    if (this.chars < L.text.length) { this.chars = L.text.length; return; }
    if (L.big && this.lineT < 0.8) return;
    Sound.play('type');
    this.nextLine();
  },

  update(dt) {
    this.shotT += dt;
    this.lineT += dt;
    this.fx.update(dt);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.fadeIn = Math.max(0, this.fadeIn - dt * 2.2);
    if (this.transition) {
      this.transition.t += dt;
      if (this.transition.t >= 0.45) { const to = this.transition.to; this.transition = null; this.startShot(to); }
      return;
    }
    const S = SHOTS[this.shot];
    const L = S.lines[this.line];
    if (L && this.chars < L.text.length) {
      const speed = L.who === 'narrator' ? 42 : 48;
      const before = Math.floor(this.chars);
      this.chars = Math.min(L.text.length, this.chars + dt * speed);
      if (Math.floor(this.chars) !== before) {
        const ch = L.text[Math.floor(this.chars) - 1];
        if (ch && ch !== ' ' && Math.floor(this.chars) % 2 === 0) {
          const sp = SPEAKERS[L.who];
          if (sp.voice) Sound.play('voice', sp.voice); else Sound.play('type');
        }
      }
    }
    if (L && L.big && this.lineT > 2.8) this.nextLine();
    this.updateShot(S, dt);
  },

  updateShot(S, dt) {
    const fx = this.fx;
    if (S.set === 'lab') {
      if (Math.random() < dt * 12) fx.add({ shape: 'circle', x: 640 + U.rand(-50, 50), y: 540, vx: U.rand(-5, 5), vy: U.rand(-60, -120), life: 3, size: U.rand(2, 6), color: 'rgba(180,255,200,0.6)', layer: 1 });
      if (Math.random() < dt * 0.35) { this.flash = 0.7; Sound.play('thunder'); }
      if (Math.random() < dt * 3) Sound.play('bubble');
    } else if (S.set === 'island') {
      if (Math.random() < dt * 3) fx.add({ shape: 'heart', x: U.rand(260, 1000), y: 600, vx: U.rand(-10, 10), vy: U.rand(-30, -60), life: 3, size: U.rand(8, 14), color: '#ff6a8a', layer: 2, fadeIn: 0.4 });
    } else if (S.set === 'rift') {
      Common.embers(fx, 30, dt, 'rgba(255,90,40,1)');
    } else if (S.set === 'cave') {
      Common.embers(fx, 18, dt, 'rgba(255,120,40,1)');
    } else if (S.set === 'throne') {
      if (Math.random() < dt * 6) fx.add({ shape: 'glow', x: U.rand(100, 1200), y: U.rand(150, 600), vx: U.rand(-5, 5), vy: U.rand(-8, 8), life: 4, size: U.rand(2, 4), color: 'rgba(255,240,200,1)', layer: 2, add: true, fadeIn: 1 });
    } else if (S.set === 'field') {
      Common.embers(fx, 6, dt, 'rgba(255,220,120,1)');
    }
  },

  draw(ctx) {
    const S = SHOTS[this.shot];
    const t = this.shotT;
    ctx.drawImage(Art.get(S.set), 0, 0);
    this['draw_' + S.set](ctx, t, S);
    this.fx.draw(ctx, 1);
    this.fx.draw(ctx, 2);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,245,255,${this.flash * 0.55})`; ctx.fillRect(0, 0, W, H); }
    // letterbox
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, 64);
    ctx.fillRect(0, H - 22, W, 22);
    // caption
    const ca = U.clamp(t * 2, 0, 1) * U.clamp(3.5 - t, 0, 1);
    if (ca > 0 && S.caption) UI.text(ctx, S.caption.toUpperCase(), 40, 34, { size: 20, align: 'left', color: '#e8c890', alpha: ca, weight: 900 });
    UI.text(ctx, `${this.shot + 1} / ${SHOTS.length}`, 1060, 34, { size: 14, color: '#8a7a6a', align: 'right' });
    this.drawDialog(ctx);
    UI.drawButtons(ctx, this.buttons);
    const fade = Math.max(this.fadeIn, this.transition ? this.transition.t / 0.45 : 0);
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
  },

  drawDialog(ctx) {
    const S = SHOTS[this.shot];
    const L = S.lines[this.line];
    if (!L) return;
    const sp = SPEAKERS[L.who];
    const shown = L.text.slice(0, Math.floor(this.chars));
    const done = this.chars >= L.text.length;
    if (L.big) {
      const k = U.clamp((this.lineT - 0.4) / 0.35, 0, 1);
      if (k <= 0) return;
      const s = 1 + (1 - U.ease.outBack(k)) * 3;
      ctx.save();
      ctx.translate(640, 330);
      ctx.scale(s, s);
      ctx.rotate(-0.05);
      UI.text(ctx, L.text, 0, 0, { size: 150, weight: 900, font: FONT_TITLE, color: '#ffd84a', stroke: '#3a0a02', strokeWidth: 16, shadow: 'rgba(255,120,40,0.9)', shadowBlur: 40 });
      ctx.restore();
      return;
    }
    const top = L.who === 'narrator' && S.narrTop;
    if (L.who === 'narrator') {
      const a = U.clamp(this.lineT * 4, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.78;
      const g = top ? ctx.createLinearGradient(0, 64, 0, 250) : ctx.createLinearGradient(0, 520, 0, H);
      const stops = [[0, 'rgba(0,0,0,0)'], [0.3, 'rgba(0,0,0,0.85)'], [1, 'rgba(0,0,0,0.95)']];
      (top ? stops.slice().reverse().map(([p, c]) => [1 - p, c]) : stops).forEach(([p, c]) => g.addColorStop(p, c));
      ctx.fillStyle = g;
      if (top) ctx.fillRect(0, 64, W, 186); else ctx.fillRect(0, 500, W, H - 500);
      ctx.restore();
      UI.paragraph(ctx, shown, 640, top ? 92 : 585, 980, { size: L.think ? 30 : 26, italic: true, color: '#f6e7c1', align: 'center', lineHeight: 34, alpha: a, shadow: 'rgba(0,0,0,0.9)' });
    } else {
      const left = sp.side === 'left';
      const bx = 70, by = 566, bw = 1140, bh = 128;
      const slide = U.ease.outCubic(U.clamp(this.lineT * 5, 0, 1));
      ctx.save();
      ctx.globalAlpha = slide;
      ctx.translate(0, (1 - slide) * 30);
      UI.panel(ctx, bx, by, bw, bh, 'dark');
      const px = left ? bx + 80 : bx + bw - 80;
      const talking = !done ? Math.abs(Math.sin(this.lineT * 16)) * 3 : 0;
      const beast = UNITS[sp.portrait] && UNITS[sp.portrait].side === 'beast';
      Art.portrait(ctx, sp.portrait, px, by + 42 - talking, 70, { flip: !left, bg1: beast ? '#f0a080' : '#f6e3b0', bg2: beast ? '#6a1a10' : '#b27a3a' });
      UI.ring(ctx, px, by + 42 - talking, 70, 6);
      const tx = left ? bx + 175 : bx + 40;
      const nameW = 300;
      ctx.fillStyle = '#7a1a14';
      UI.roundRect(ctx, tx - 6, by - 18, nameW, 36, 8); ctx.fill();
      ctx.strokeStyle = '#e2b24a'; ctx.lineWidth = 2; UI.roundRect(ctx, tx - 6, by - 18, nameW, 36, 8); ctx.stroke();
      UI.text(ctx, sp.name, tx + nameW / 2 - 6, by, { size: 20, weight: 900, color: sp.color || '#fff' });
      const size = L.chant ? 30 : 23;
      UI.paragraph(ctx, shown, tx + 6, by + 34, 900, { size, color: L.chant ? '#ffb08a' : '#f6e7c1', lineHeight: size * 1.3, weight: L.chant ? 700 : 500, font: L.chant ? FONT_HEAD : FONT_BODY });
      ctx.restore();
    }
    if (done) {
      const b = Math.sin(this.lineT * 6) * 4;
      const iy = top ? 200 : 668;
      ctx.fillStyle = '#ffd36a';
      ctx.beginPath(); ctx.moveTo(1170, iy + b); ctx.lineTo(1190, iy + b); ctx.lineTo(1180, iy + 12 + b); ctx.closePath(); ctx.fill();
      UI.text(ctx, 'click', 1140, iy + 6, { size: 13, color: '#bca070', font: FONT_BODY, alpha: 0.8 });
    }
  },

  /* --------------------------- per-set drawing --------------------------- */
  draw_lab(ctx, t) {
    // lightning in window
    ctx.save();
    ctx.beginPath(); ctx.arc(1000, 230, 104, 0, TAU); ctx.clip();
    ctx.fillStyle = `rgba(160,170,255,${0.1 + this.flash * 0.8})`; ctx.fillRect(890, 120, 220, 220);
    ctx.restore();
    // glowing tank with a hybrid inside
    const tx = 640, ty = 150;
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(tx - 110, ty - 20, 220, 28); ctx.fillRect(tx - 120, 540, 240, 36);
    const liquid = ctx.createLinearGradient(0, ty, 0, 540);
    liquid.addColorStop(0, 'rgba(90,255,160,0.25)'); liquid.addColorStop(1, 'rgba(40,200,120,0.55)');
    ctx.fillStyle = liquid; ctx.fillRect(tx - 96, ty + 8, 192, 532 - ty);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.15;
    ctx.drawImage(Art.glow('rgba(80,255,150,1)'), tx - 260, ty - 40, 520, 560);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    Art.drawSprite(ctx, 'giant', tx, 500 + Math.sin(t * 1.5) * 8, 260, { flip: true, tint: '#0a3a20', tintAlpha: 0.72, alpha: 0.95 });
    ctx.strokeStyle = 'rgba(220,255,240,0.5)'; ctx.lineWidth = 3;
    ctx.strokeRect(tx - 96, ty + 8, 192, 532 - ty);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(tx - 80, ty + 20, 16, 500 - ty);
    // Victor, the scientist
    const sx = 300, sy = 560;
    ctx.fillStyle = '#0c0e14';
    ctx.beginPath();
    ctx.moveTo(sx - 60, sy); ctx.lineTo(sx - 46, sy - 170); ctx.quadraticCurveTo(sx, sy - 200, sx + 46, sy - 170); ctx.lineTo(sx + 64, sy); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy - 214, 34, 0, TAU); ctx.fill();
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(sx - 30 + i * 10, sy - 244 + Math.sin(i * 2) * 6, 12, 0, TAU); ctx.fill(); }
    const arm = Math.sin(t * 2) * 0.2;
    ctx.save(); ctx.translate(sx + 40, sy - 150); ctx.rotate(-0.8 + arm);
    ctx.fillRect(0, -10, 110, 20);
    ctx.fillStyle = '#5dff9a'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(118, 0, 12, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(200,230,255,0.9)';
    ctx.beginPath(); ctx.arc(sx + 12, sy - 216, 5, 0, TAU); ctx.arc(sx + 28, sy - 216, 5, 0, TAU); ctx.fill();
  },

  draw_island(ctx, t) {
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + (i % 2) * 0.15})`; ctx.lineWidth = 3;
      ctx.beginPath();
      const y = 560 + i * 26;
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.02 + t * 2 + i) * 4);
      ctx.stroke();
    }
    // seagulls
    for (let i = 0; i < 4; i++) {
      const x = ((t * 40 + i * 330) % (W + 200)) - 100, y = 120 + i * 30 + Math.sin(t * 2 + i) * 10;
      const f = Math.sin(t * 8 + i) * 6;
      ctx.strokeStyle = '#2a3a4a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 14, y - f); ctx.quadraticCurveTo(x - 6, y - 6, x, y); ctx.quadraticCurveTo(x + 6, y - 6, x + 14, y - f); ctx.stroke();
    }
    const pairs = [['june', 250, false], ['keljeon', 350, true], ['thea', 540, false], ['ilydan', 640, true], ['falco', 830, false], ['giant', 950, true]];
    pairs.forEach(([n, x, flip], i) => {
      const k = U.ease.outBack(U.clamp((t - 0.3 - i * 0.12) / 0.5, 0, 1));
      const hop = Math.abs(Math.sin(t * 3 + Math.floor(i / 2))) * 8;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x, 688, 40, 9, 0, 0, TAU); ctx.fill();
      Art.drawSprite(ctx, n, x, 688 - hop, 130 * k, { flip });
    });
  },

  draw_rift(ctx, t) {
    const grow = 1 + U.clamp(t / 10, 0, 0.35);
    const humans = [['june', 150], ['thea', 280], ['falco', 420]];
    const beasts = [['keljeon', 860], ['giant', 1000], ['hadog', 1150]];
    humans.forEach(([n, x], i) => {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, 690, 40, 8, 0, 0, TAU); ctx.fill();
      Art.drawSprite(ctx, n, x - U.clamp(t * 6, 0, 30), 690, 125, { flip: true, tint: '#200808', tintAlpha: 0.35, sy: 1 + Math.sin(t * 8 + i) * 0.01 });
    });
    beasts.forEach(([n, x], i) => {
      const shake = Math.sin(t * 30 + i) * (grow - 1) * 6;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, 692, 50 * grow, 10, 0, 0, TAU); ctx.fill();
      Art.drawSprite(ctx, n, x + shake, 692, (n === 'hadog' ? 160 : 130) * grow, { flip: true, glowColor: '#ff2a0a', glowAlpha: 0.3 + Math.sin(t * 4 + i) * 0.2, glowSize: 4 });
    });
  },

  draw_cave(ctx, t) {
    Art.torch(ctx, 360, 300, t, 1.4);
    Art.torch(ctx, 920, 300, t, 1.4);
    const L = SHOTS[this.shot].lines[this.line] || {};
    const talking = L.who === 'destroyer' && this.chars < (L.text || '').length;
    const chant = L.chant;
    const jump = (i) => (chant ? Math.abs(Math.sin(this.lineT * 7 + i)) * 26 : 0);
    // audience
    const crowd = [['ilydan', 250, 552, 130, false], ['giant', 380, 560, 160, false], ['keljeon', 1100, 552, 140, true], ['hadog', 930, 560, 185, true]];
    crowd.forEach(([n, x, y, h, flip], i) => {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.25, 10, 0, 0, TAU); ctx.fill();
      Art.drawSprite(ctx, n, x, y - jump(i), h, { flip, rot: chant ? Math.sin(this.lineT * 7 + i) * 0.06 : 0 });
    });
    // the Destroyer on the podium
    const breathe = 1 + Math.sin(t * 2) * 0.015 + (talking ? Math.abs(Math.sin(this.lineT * 12)) * 0.02 : 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.1;
    ctx.drawImage(Art.glow('rgba(255,80,30,1)'), 440, 150, 400, 400);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    Art.drawSprite(ctx, 'destroyer', 640, 470, 300, { flip: true, sy: breathe, sx: 1 / breathe, rot: talking ? Math.sin(this.lineT * 5) * 0.03 : 0 });
    // Falco hiding behind a rock
    const peek = this.line === 0 ? U.clamp(this.lineT * 1.2, 0, 1) : this.line === 5 ? 1 - U.clamp(this.lineT, 0, 1) : 0.85;
    const fx = this.line === 5 ? 90 - U.clamp(this.lineT - 0.5, 0, 2) * 200 : 90;
    Art.drawSprite(ctx, 'falco', fx, 660 - peek * 84, 140, {});
    const r = U.seeded(99);
    Art.rock(ctx, 84, 616, 112, r, '#4a2e22', '#1e100a', '#6a4432');
    if (this.line === 0 || this.line === 4) {
      const b = Math.abs(Math.sin(this.lineT * 6)) * 8;
      UI.text(ctx, this.line === 0 ? '!' : '!!', fx + 10, 420 - b, { size: 56, weight: 900, color: '#ffd84a', stroke: '#2a0a02', strokeWidth: 6 });
    }
  },

  draw_throne(ctx, t) {
    const L = SHOTS[this.shot].lines[this.line] || {};
    // Falco runs in
    const run = U.clamp(t / 1.4, 0, 1);
    const fx = U.lerp(-120, 560, U.ease.outCubic(run));
    const runBob = run < 1 ? Math.abs(Math.sin(t * 14)) * 12 : 0;
    const falcoTalk = L.who === 'falco' && this.chars < L.text.length;
    const godTalk = L.who === 'godwin' && this.chars < L.text.length;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(fx, 566, 60, 12, 0, 0, TAU); ctx.fill();
    const shiver = this.line === 0 ? Math.sin(t * 40) * 2 : 0;
    Art.drawSprite(ctx, 'falco', fx + shiver, 566 - runBob, 200, { rot: run < 1 ? 0.12 : falcoTalk ? Math.sin(this.lineT * 10) * 0.03 : 0 });
    if (run < 1 && Math.random() < 0.4) this.fx.add({ shape: 'smoke', x: fx - 30, y: 560, vx: -40, vy: -10, life: 0.6, size: 12, size2: 30, color: 'rgba(160,140,120,0.5)', layer: 1 });
    // Godwin on throne
    const rise = L.rally ? U.ease.outBack(U.clamp(this.lineT / 0.6, 0, 1)) : 0;
    if (L.rally) {
      ctx.save();
      ctx.translate(1010, 420);
      ctx.rotate(t * 0.3);
      ctx.globalAlpha = 0.25 * rise;
      ctx.fillStyle = '#ffd36a';
      for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -500); ctx.lineTo(30, -500); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    const gb = 1 + Math.sin(t * 2) * 0.012 + (godTalk ? Math.abs(Math.sin(this.lineT * 11)) * 0.02 : 0);
    Art.drawSprite(ctx, 'godwin', 1010, 560 - rise * 30, 230 * (1 + rise * 0.1), { flip: true, sy: gb });
    if (L.think) {
      const n = Math.floor(this.lineT * 2.5) % 4;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.ellipse(1100, 260, 70, 42, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(1060, 320, 12, 0, TAU); ctx.arc(1045, 345, 7, 0, TAU); ctx.fill();
      UI.text(ctx, '.'.repeat(n), 1100, 252, { size: 50, weight: 900, color: '#3a2412' });
    }
  },

  draw_field(ctx, t) {
    const lanes = BATTLE.lanes;
    [351, 529, 712].forEach((ty, i) => Art.flag(ctx, 30, ty - 70, t + i, '#d8262b', '#fff'));
    const heroes = [['june', 0, 0], ['thea', 1, 1], ['mortt', 2, 2], ['falco', 1, 3], ['godwin', 1, 4]];
    heroes.forEach(([n, lane, i]) => {
      const k = U.clamp((t - i * 0.25) / 1.4, 0, 1);
      if (k <= 0) return;
      const x = U.lerp(170, 420 + i * 120 - (n === 'godwin' ? 60 : 0), U.ease.outCubic(k));
      const y = n === 'godwin' ? 560 : lanes[lane] + (n === 'falco' ? 90 : 0);
      const bob = k < 1 ? Math.abs(Math.sin(t * 14 + i)) * 10 : Math.sin(t * 3 + i) * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, 34, 8, 0, 0, TAU); ctx.fill();
      Art.drawSprite(ctx, n, x, y - Math.max(0, bob), n === 'godwin' ? 170 : 120, { rot: k < 1 ? 0.1 : 0 });
    });
    [1015, 1015, 1015].forEach((x, i) => Art.banner(ctx, 1120, lanes[i] + 70, t + i, '#b3382a'));
  },

  onPointerDown() { this.advance(); },
  onKey(k) {
    if (k === ' ' || k === 'Enter' || k === 'ArrowRight') { this.advance(); return true; }
    if (k === 'Escape' || k === 's' || k === 'S') { this.finish(); return true; }
  },
};
