'use strict';
/* Art: sprite loading/drawing plus procedurally painted backgrounds and animated props. */

const Art = {
  img: {},
  cache: {},
  glows: {},
  silhouettes: {},

  load(onProgress) {
    const names = Object.keys(SPRITES);
    let done = 0;
    const jobs = names.map((n) => new Promise((resolve) => {
      const im = new Image();
      im.onload = () => { this.img[n] = im; done++; onProgress && onProgress(done / names.length); resolve(); };
      im.onerror = () => { this.img[n] = this.placeholder(n); done++; onProgress && onProgress(done / names.length); resolve(); };
      im.src = `assets/sprites/${n}.png`;
    }));
    return Promise.all(jobs);
  },

  placeholder(name) {
    const c = this.canvas(200, 300), g = c.getContext('2d');
    g.fillStyle = UNITS[name] && UNITS[name].side === 'beast' ? '#8a3b2a' : '#3b5f8a';
    g.beginPath(); g.ellipse(100, 200, 70, 95, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(100, 80, 55, 0, TAU); g.fill();
    return c;
  },

  canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  },

  glow(color) {
    let g = this.glows[color];
    if (g) return g;
    g = this.canvas(64, 64);
    const x = g.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    this.glows[color] = g;
    return g;
  },

  silhouette(name, color) {
    const key = name + color;
    if (this.silhouettes[key]) return this.silhouettes[key];
    const img = this.img[name];
    const c = this.canvas(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    this.silhouettes[key] = c;
    return c;
  },

  /* Draw a character with its feet at (x, y). */
  drawSprite(ctx, name, x, y, h, o) {
    o = o || {};
    const img = this.img[name];
    if (!img) return;
    const info = SPRITES[name];
    const s = h / img.height;
    const w = img.width * s;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
    const a = o.alpha == null ? 1 : o.alpha;
    ctx.globalAlpha = a;
    const dx = -info.ax * w, dy = -h + 6 * s;
    if (o.glowColor) {
      ctx.globalAlpha = a * (o.glowAlpha || 0.6);
      const sil = this.silhouette(name, o.glowColor);
      const k = o.glowSize || 3;
      for (const [ox, oy] of [[-k, 0], [k, 0], [0, -k], [0, k]]) ctx.drawImage(sil, dx + ox, dy + oy, w, h);
      ctx.globalAlpha = a;
    }
    ctx.drawImage(img, dx, dy, w, h);
    if (o.tint && o.tintAlpha > 0) {
      ctx.globalAlpha = a * o.tintAlpha;
      ctx.drawImage(this.silhouette(name, o.tint), dx, dy, w, h);
    }
    if (o.flash > 0) {
      ctx.globalAlpha = a * Math.min(1, o.flash);
      ctx.drawImage(this.silhouette(name, o.flashColor || '#ffffff'), dx, dy, w, h);
    }
    ctx.restore();
  },

  /* Circular portrait cropped around the character's face. */
  portrait(ctx, name, cx, cy, r, o) {
    o = o || {};
    const img = this.img[name];
    if (!img) return;
    const [fx, fy, fr] = SPRITES[name].face;
    const s = r / (fr * img.height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();
    const bg = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
    bg.addColorStop(0, o.bg1 || '#f6e3b0');
    bg.addColorStop(1, o.bg2 || '#b27a3a');
    ctx.fillStyle = bg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (o.flip) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
    if (o.gray) ctx.filter = 'grayscale(1) brightness(0.7)';
    ctx.drawImage(img, cx - fx * img.width * s, cy - fy * img.height * s, img.width * s, img.height * s);
    ctx.filter = 'none';
    ctx.restore();
  },

  /* ------------------------------ helpers ------------------------------ */
  blob(g, x, y, rx, ry, rnd, n, jag) {
    n = n || 12; jag = jag == null ? 0.25 : jag;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const k = 1 - jag / 2 + rnd() * jag;
      pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
    }
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % n];
      const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
      if (i === 0) g.moveTo(mx, my);
      else g.quadraticCurveTo(p0[0], p0[1], mx, my);
    }
    const p0 = pts[0], p1 = pts[1];
    g.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
    g.closePath();
  },

  vignette(g, strength, color) {
    const gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, color || `rgba(0,0,0,${strength})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  },

  grassTuft(g, x, y, s, rnd, dark, light) {
    const n = 5 + Math.floor(rnd() * 5);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (rnd() - 0.5) * 1.2;
      const len = s * (0.6 + rnd() * 0.6);
      const bx = x + (rnd() - 0.5) * s * 0.5;
      g.strokeStyle = i % 2 ? dark : light;
      g.lineWidth = 2 + rnd() * 1.5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(bx, y);
      g.quadraticCurveTo(bx + Math.cos(a) * len * 0.3, y + Math.sin(a) * len * 0.6, bx + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
  },

  mud(g, x, y, r, rnd) {
    g.fillStyle = 'rgba(40,28,10,0.25)';
    this.blob(g, x + 3, y + 4, r * 1.05, r * 0.42, rnd, 14, 0.4); g.fill();
    g.fillStyle = '#4b3517';
    this.blob(g, x, y, r, r * 0.38, rnd, 14, 0.45); g.fill();
    g.fillStyle = '#3a2810';
    this.blob(g, x + r * 0.1, y + r * 0.04, r * 0.7, r * 0.24, rnd, 12, 0.4); g.fill();
    g.strokeStyle = 'rgba(160,130,80,0.35)';
    g.lineWidth = 2;
    g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.12, r * 0.35, r * 0.08, -0.1, Math.PI * 1.1, Math.PI * 1.8); g.stroke();
  },

  rock(g, x, y, r, rnd, base, dark, light) {
    g.fillStyle = dark;
    this.blob(g, x, y + r * 0.1, r, r * 0.8, rnd, 9, 0.3); g.fill();
    g.fillStyle = base;
    this.blob(g, x - r * 0.06, y - r * 0.02, r * 0.9, r * 0.68, rnd, 9, 0.3); g.fill();
    g.fillStyle = light;
    this.blob(g, x - r * 0.25, y - r * 0.25, r * 0.4, r * 0.25, rnd, 7, 0.3); g.fill();
  },

  bricks(g, x, y, w, h, bw, bh, base, line, rnd, jitter) {
    g.fillStyle = base;
    g.fillRect(x, y, w, h);
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    for (let row = 0, yy = y; yy < y + h; row++, yy += bh) {
      const off = row % 2 ? bw / 2 : 0;
      for (let xx = x - off; xx < x + w; xx += bw) {
        const v = (rnd() - 0.5) * (jitter || 16);
        g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 100})`;
        g.fillRect(xx + 1, yy + 1, bw - 2, bh - 2);
      }
      g.fillStyle = line;
      g.fillRect(x, yy, w, 1.5);
      for (let xx = x - off; xx < x + w; xx += bw) g.fillRect(xx, yy, 1.5, bh);
    }
    g.restore();
  },

  /* ---------------------------- backgrounds ---------------------------- */
  get(name) {
    if (!this.cache[name]) {
      const c = this.canvas(W, H);
      this['build_' + name](c.getContext('2d'));
      this.cache[name] = c;
    }
    return this.cache[name];
  },

  build_field(g) {
    const rnd = U.seeded(7);
    // grass base
    const base = g.createLinearGradient(0, 120, 0, H);
    base.addColorStop(0, '#56752f');
    base.addColorStop(1, '#5e7e33');
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 170; i++) {
      const dark = rnd() < 0.6;
      g.fillStyle = dark ? 'rgba(62,90,32,0.45)' : 'rgba(112,140,60,0.35)';
      this.blob(g, rnd() * W, 130 + rnd() * (H - 130), 20 + rnd() * 60, 8 + rnd() * 22, rnd, 10, 0.5);
      g.fill();
    }
    // trampled lanes
    for (const ly of BATTLE.lanes) {
      for (let x = 170; x < 1120; x += 14) {
        g.fillStyle = 'rgba(128,112,62,0.075)';
        g.beginPath(); g.ellipse(x, ly - 8 + (rnd() - 0.5) * 10, 34 + rnd() * 14, 26 + rnd() * 8, 0, 0, TAU); g.fill();
      }
      for (let i = 0; i < 26; i++) {
        g.fillStyle = rnd() < 0.5 ? 'rgba(90,80,50,0.5)' : 'rgba(170,160,120,0.4)';
        g.beginPath(); g.ellipse(200 + rnd() * 900, ly - 30 + rnd() * 50, 2 + rnd() * 3, 1.5 + rnd() * 2, 0, 0, TAU); g.fill();
      }
    }
    // specks & flowers
    for (let i = 0; i < 260; i++) {
      const x = rnd() * W, y = 140 + rnd() * (H - 140);
      g.fillStyle = U.pick(['#8fae55', '#3f5e22', '#9bbf5a']);
      g.fillRect(x, y, 2, 2);
    }
    for (let i = 0; i < 45; i++) {
      const x = 200 + rnd() * 880, y = 150 + rnd() * 560;
      const c = ['#f4e26b', '#ffffff', '#f2a0c0', '#c7a6ff'][Math.floor(rnd() * 4)];
      for (let k = 0; k < 5; k++) {
        g.fillStyle = c;
        g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 2.5, y + Math.sin(k * 1.26) * 2.5, 1.8, 0, TAU); g.fill();
      }
      g.fillStyle = '#e8b33a';
      g.beginPath(); g.arc(x, y, 1.4, 0, TAU); g.fill();
    }
    // mud puddles
    [[330, 370, 70], [260, 545, 62], [205, 700, 70], [760, 710, 50], [640, 360, 34], [900, 548, 40]].forEach(([x, y, r]) => this.mud(g, x, y, r, rnd));
    // cattails / reeds near the cave side
    const reeds = (x, y) => {
      this.mud(g, x, y + 10, 70, rnd);
      for (let i = 0; i < 9; i++) {
        const bx = x - 50 + rnd() * 100, by = y + 8 - rnd() * 6, hh = 40 + rnd() * 50;
        g.strokeStyle = '#3c5a1d'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + 4, by - hh / 2, bx + (rnd() - 0.5) * 12, by - hh); g.stroke();
        if (rnd() < 0.45) {
          g.fillStyle = '#6b3f1f';
          g.beginPath(); g.ellipse(bx + (rnd() - 0.5) * 6, by - hh, 3.5, 9, 0, 0, TAU); g.fill();
        }
      }
      this.grassTuft(g, x - 60, y + 14, 34, rnd, '#355319', '#6f9a36');
      this.grassTuft(g, x + 60, y + 14, 34, rnd, '#355319', '#6f9a36');
    };
    reeds(1030, 360); reeds(1010, 540); reeds(1040, 710);
    for (let i = 0; i < 40; i++) this.grassTuft(g, 190 + rnd() * 920, 150 + rnd() * 560, 14 + rnd() * 14, rnd, '#3e5f20', '#78a23c');

    this.drawTopWall(g, rnd);
    this.drawFort(g, rnd);
    this.drawCave(g, rnd);
  },

  drawTopWall(g, rnd) {
    // distant garden & water beyond the balustrade
    const sky = g.createLinearGradient(0, 0, 0, 70);
    sky.addColorStop(0, '#7fb4c9'); sky.addColorStop(1, '#bfe0d8');
    g.fillStyle = sky; g.fillRect(0, 0, W, 80);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = rnd() < 0.5 ? '#3f6e2a' : '#2f5a22';
      this.blob(g, rnd() * W, 28 + rnd() * 30, 30 + rnd() * 40, 18 + rnd() * 16, rnd, 10, 0.35); g.fill();
    }
    // shadow on grass
    const sh = g.createLinearGradient(0, 120, 0, 150);
    sh.addColorStop(0, 'rgba(20,30,10,0.45)'); sh.addColorStop(1, 'rgba(20,30,10,0)');
    g.fillStyle = sh; g.fillRect(0, 120, W, 30);
    // balustrade base
    const stone = g.createLinearGradient(0, 56, 0, 128);
    stone.addColorStop(0, '#f1ead6'); stone.addColorStop(1, '#cfc6ab');
    g.fillStyle = stone;
    g.fillRect(0, 58, W, 14);
    g.fillRect(0, 108, W, 16);
    g.fillStyle = '#a79d82';
    g.fillRect(0, 70, W, 3); g.fillRect(0, 122, W, 3);
    // ironwork swirls
    g.strokeStyle = '#8b8574'; g.lineWidth = 3;
    for (let x = 0; x < W; x += 34) {
      g.beginPath(); g.arc(x + 9, 84, 8, Math.PI * 0.5, Math.PI * 2.2); g.stroke();
      g.beginPath(); g.arc(x + 25, 97, 8, Math.PI * 1.5, Math.PI * 3.2); g.stroke();
      g.beginPath(); g.moveTo(x, 74); g.lineTo(x, 108); g.stroke();
    }
    g.strokeStyle = '#d8d0b8'; g.lineWidth = 1.2;
    for (let x = 0; x < W; x += 34) {
      g.beginPath(); g.arc(x + 9, 84, 8, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
    }
    // pillars
    [300, 640, 980].forEach((px) => {
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(px - 26, 40, 60, 92);
      const pg = g.createLinearGradient(px - 28, 0, px + 28, 0);
      pg.addColorStop(0, '#d9d0b6'); pg.addColorStop(0.4, '#f5efdd'); pg.addColorStop(1, '#bdb296');
      g.fillStyle = pg; g.fillRect(px - 26, 34, 52, 94);
      g.fillStyle = '#f7f1e1'; g.fillRect(px - 32, 28, 64, 12);
      g.fillStyle = '#a89e84'; g.fillRect(px - 32, 38, 64, 3); g.fillRect(px - 26, 122, 52, 4);
    });
  },

  drawFort(g, rnd) {
    const lanes = BATTLE.lanes;
    // wall walk / roofs
    const roof = g.createLinearGradient(0, 0, 130, 0);
    roof.addColorStop(0, '#2c2f36'); roof.addColorStop(1, '#474c56');
    g.fillStyle = roof;
    g.fillRect(0, 60, 118, H);
    for (let y = 70; y < H; y += 22) {
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, y, 118, 2);
    }
    // front face with bricks
    this.bricks(g, 104, 110, 62, H - 110, 26, 14, '#9097a1', 'rgba(40,44,52,0.55)', rnd, 18);
    const faceShade = g.createLinearGradient(104, 0, 166, 0);
    faceShade.addColorStop(0, 'rgba(0,0,0,0.25)'); faceShade.addColorStop(1, 'rgba(255,255,255,0.08)');
    g.fillStyle = faceShade; g.fillRect(104, 110, 62, H - 110);
    g.fillStyle = '#23262c'; g.fillRect(162, 110, 5, H - 110);
    // crenellations on the wall edge
    for (let y = 112; y < H; y += 30) {
      g.fillStyle = '#5c616b'; g.fillRect(98, y, 18, 18);
      g.fillStyle = '#7a808b'; g.fillRect(98, y, 18, 4);
    }
    // wooden beams sticking out
    for (let y = 130; y < H; y += 44) {
      if (lanes.some((ly) => Math.abs(y - (ly - 40)) < 64)) continue;
      g.fillStyle = '#5a3514'; g.fillRect(160, y + 2, 26, 10);
      g.fillStyle = '#c47a3a'; g.fillRect(160, y, 24, 9);
      g.fillStyle = '#e8a060'; g.fillRect(180, y, 6, 9);
    }
    // towers between lanes
    const towers = [150, (lanes[0] + lanes[1]) / 2 - 10, (lanes[1] + lanes[2]) / 2 - 10, 712];
    towers.forEach((ty) => {
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(14, ty - 40, 150, 84);
      this.bricks(g, 10, ty - 44, 146, 80, 24, 13, '#a3a9b3', 'rgba(40,44,52,0.5)', rnd, 16);
      g.fillStyle = '#383c44'; g.fillRect(16, ty - 70, 134, 34);
      for (let x = 12; x < 150; x += 24) {
        g.fillStyle = '#6d737e'; g.fillRect(x, ty - 80, 16, 16);
        g.fillStyle = '#8e95a0'; g.fillRect(x, ty - 80, 16, 4);
      }
      g.fillStyle = '#1d1f24';
      g.fillRect(52, ty - 26, 10, 22); g.fillRect(100, ty - 26, 10, 22);
      g.fillStyle = 'rgba(255,200,90,0.5)';
      g.fillRect(54, ty - 22, 6, 6); g.fillRect(102, ty - 22, 6, 6);
    });
    // gates
    lanes.forEach((ly) => {
      const gx = 110, gw = 58, top = ly - 92, bot = ly + 8;
      g.fillStyle = '#6a707a';
      g.beginPath(); g.moveTo(gx - 8, bot); g.lineTo(gx - 8, top + 30); g.arc(gx + gw / 2, top + 30, gw / 2 + 8, Math.PI, 0); g.lineTo(gx + gw + 8, bot); g.closePath(); g.fill();
      g.fillStyle = '#2a1a0e';
      g.beginPath(); g.moveTo(gx, bot); g.lineTo(gx, top + 30); g.arc(gx + gw / 2, top + 30, gw / 2, Math.PI, 0); g.lineTo(gx + gw, bot); g.closePath(); g.fill();
      const wood = g.createLinearGradient(gx, 0, gx + gw, 0);
      wood.addColorStop(0, '#6b3e1c'); wood.addColorStop(0.5, '#8b5528'); wood.addColorStop(1, '#5a3316');
      g.fillStyle = wood;
      g.beginPath(); g.moveTo(gx + 4, bot); g.lineTo(gx + 4, top + 32); g.arc(gx + gw / 2, top + 32, gw / 2 - 4, Math.PI, 0); g.lineTo(gx + gw - 4, bot); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(40,20,5,0.6)'; g.lineWidth = 2;
      for (let x = gx + 12; x < gx + gw - 4; x += 9) { g.beginPath(); g.moveTo(x, top + 8); g.lineTo(x, bot); g.stroke(); }
      g.fillStyle = '#2b2b30';
      g.fillRect(gx + 4, top + 44, gw - 8, 6); g.fillRect(gx + 4, bot - 26, gw - 8, 6);
      g.fillStyle = '#c9a43a';
      g.beginPath(); g.arc(gx + gw / 2 + 10, ly - 30, 3.5, 0, TAU); g.fill();
      // arch stones
      g.strokeStyle = '#4b5059'; g.lineWidth = 2;
      for (let i = 0; i <= 6; i++) {
        const a = Math.PI + (i / 6) * Math.PI;
        g.beginPath();
        g.moveTo(gx + gw / 2 + Math.cos(a) * (gw / 2), top + 30 + Math.sin(a) * (gw / 2));
        g.lineTo(gx + gw / 2 + Math.cos(a) * (gw / 2 + 8), top + 30 + Math.sin(a) * (gw / 2 + 8));
        g.stroke();
      }
    });
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(167, 110, 12, H);
  },

  drawCave(g, rnd) {
    const lanes = BATTLE.lanes;
    // sandy aprons
    lanes.forEach((ly) => {
      g.fillStyle = '#c9a877';
      this.blob(g, 1150, ly - 4, 90, 44, rnd, 14, 0.35); g.fill();
      g.fillStyle = '#dcc093';
      this.blob(g, 1160, ly - 10, 60, 26, rnd, 12, 0.35); g.fill();
      for (let i = 0; i < 14; i++) {
        g.fillStyle = 'rgba(110,80,50,0.5)';
        g.beginPath(); g.arc(1080 + rnd() * 120, ly - 30 + rnd() * 50, 1.5 + rnd() * 2, 0, TAU); g.fill();
      }
    });
    // cliff mass
    g.fillStyle = '#7a4f2a';
    g.beginPath();
    g.moveTo(W, 110);
    for (let y = 110; y <= H + 20; y += 30) g.lineTo(1170 + Math.sin(y * 0.05) * 18 + rnd() * 16, y);
    g.lineTo(W, H + 20);
    g.closePath(); g.fill();
    // boulders
    for (let y = 100; y < H + 40; y += 26) {
      for (let k = 0; k < 3; k++) {
        const x = 1180 + k * 38 + rnd() * 24, r = 26 + rnd() * 20;
        this.rock(g, x, y + rnd() * 10, r, rnd, '#b07c4a', '#6e4524', '#d09a62');
      }
    }
    // bushes on top ledges
    for (let i = 0; i < 18; i++) {
      const y = 110 + rnd() * (H - 110), x = 1190 + rnd() * 90;
      g.fillStyle = '#2f5a20'; this.blob(g, x, y, 18 + rnd() * 10, 10 + rnd() * 6, rnd, 9, 0.5); g.fill();
      g.fillStyle = '#4f8a2e'; this.blob(g, x - 3, y - 3, 12, 6, rnd, 8, 0.5); g.fill();
    }
    // cave mouths
    lanes.forEach((ly) => {
      const cx = 1188, cy = ly - 38;
      g.fillStyle = '#5a3a1c';
      this.blob(g, cx, cy, 64, 66, rnd, 14, 0.18); g.fill();
      const mouth = g.createRadialGradient(cx + 12, cy + 6, 4, cx, cy, 58);
      mouth.addColorStop(0, '#000000'); mouth.addColorStop(0.7, '#150a04'); mouth.addColorStop(1, '#3a2410');
      g.fillStyle = mouth;
      this.blob(g, cx + 4, cy + 4, 50, 54, rnd, 14, 0.15); g.fill();
      // rim rocks
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 0.55 + (i / 8) * Math.PI * 1.4;
        this.rock(g, cx + Math.cos(a) * 58, cy + Math.sin(a) * 58, 12 + rnd() * 8, rnd, '#c08a55', '#6e4524', '#dfae76');
      }
    });
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(1100, 110, 10, H);
  },

  build_lair(g) {
    const rnd = U.seeded(21);
    const base = g.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, '#2a1d24'); base.addColorStop(0.4, '#3b2a2c'); base.addColorStop(1, '#2d2023');
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 180; i++) {
      g.fillStyle = rnd() < 0.55 ? 'rgba(20,12,16,0.45)' : 'rgba(90,64,62,0.3)';
      this.blob(g, rnd() * W, 130 + rnd() * (H - 130), 20 + rnd() * 60, 8 + rnd() * 20, rnd, 10, 0.5); g.fill();
    }
    for (const ly of BATTLE.lanes) {
      for (let x = 170; x < 1120; x += 14) {
        g.fillStyle = 'rgba(120,90,70,0.07)';
        g.beginPath(); g.ellipse(x, ly - 8, 36 + rnd() * 12, 26 + rnd() * 6, 0, 0, TAU); g.fill();
      }
    }
    for (let i = 0; i < 70; i++) this.rock(g, 190 + rnd() * 920, 150 + rnd() * 560, 4 + rnd() * 9, rnd, '#5a4648', '#2a1e22', '#7a6264');
    // bones
    for (let i = 0; i < 22; i++) {
      const x = 200 + rnd() * 880, y = 160 + rnd() * 550, a = rnd() * Math.PI;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = '#d8ccb0';
      g.fillRect(-9, -1.5, 18, 3);
      g.beginPath(); g.arc(-9, -2, 2.5, 0, TAU); g.arc(-9, 2, 2.5, 0, TAU); g.arc(9, -2, 2.5, 0, TAU); g.arc(9, 2, 2.5, 0, TAU); g.fill();
      g.restore();
    }
    // ceiling with stalactites
    const ceil = g.createLinearGradient(0, 0, 0, 140);
    ceil.addColorStop(0, '#0d0709'); ceil.addColorStop(1, '#24171b');
    g.fillStyle = ceil;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 118);
    for (let x = W; x >= 0; x -= 20) g.lineTo(x, 118 + rnd() * 18);
    g.closePath(); g.fill();
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, len = 20 + rnd() * 50, w = 8 + rnd() * 14;
      const sg = g.createLinearGradient(x - w, 0, x + w, 0);
      sg.addColorStop(0, '#1d1216'); sg.addColorStop(0.5, '#3a2a2e'); sg.addColorStop(1, '#170e11');
      g.fillStyle = sg;
      g.beginPath(); g.moveTo(x - w, 116); g.lineTo(x + w, 116); g.lineTo(x + (rnd() - 0.5) * 4, 116 + len); g.closePath(); g.fill();
    }
    // lava cracks are drawn live; store their paths
    this.lavaCracks = [];
    for (let i = 0; i < 9; i++) {
      let x = 220 + rnd() * 840, y = 170 + rnd() * 520;
      const pts = [[x, y]];
      const dir = rnd() * TAU;
      for (let k = 0; k < 8; k++) {
        x += Math.cos(dir + (rnd() - 0.5) * 1.6) * (14 + rnd() * 18);
        y += Math.sin(dir + (rnd() - 0.5) * 1.6) * (10 + rnd() * 12);
        pts.push([x, y]);
      }
      this.lavaCracks.push(pts);
    }
    g.strokeStyle = '#140a08'; g.lineWidth = 7; g.lineJoin = 'round';
    this.lavaCracks.forEach((pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); });

    this.drawPalisade(g, rnd);
    this.drawLairCaves(g, rnd);
    this.vignette(g, 0.55);
  },

  drawPalisade(g, rnd) {
    const lanes = BATTLE.lanes;
    // camp ground
    g.fillStyle = '#2b2226'; g.fillRect(0, 110, 120, H);
    // tents
    [180, 400, 560, 700].forEach((y, i) => {
      g.fillStyle = i % 2 ? '#3b5a8a' : '#8a2f2f';
      g.beginPath(); g.moveTo(8, y + 20); g.lineTo(52, y - 40); g.lineTo(96, y + 20); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); g.moveTo(52, y - 40); g.lineTo(96, y + 20); g.lineTo(62, y + 20); g.closePath(); g.fill();
      g.fillStyle = '#e0b84a'; g.fillRect(50, y - 50, 4, 12);
    });
    // log palisade
    for (let y = 108; y < H + 10; y += 17) {
      if (lanes.some((ly) => y > ly - 96 && y < ly + 6)) continue;
      const lg = g.createLinearGradient(0, y, 0, y + 16);
      lg.addColorStop(0, '#9a6a3a'); lg.addColorStop(0.5, '#7a4e26'); lg.addColorStop(1, '#4e2f14');
      g.fillStyle = lg;
      g.beginPath(); g.moveTo(112, y); g.lineTo(162, y); g.lineTo(180, y + 8); g.lineTo(162, y + 16); g.lineTo(112, y + 16); g.closePath(); g.fill();
      g.fillStyle = '#c89a62';
      g.beginPath(); g.ellipse(112, y + 8, 4, 8, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(30,15,5,0.5)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(120, y + 8); g.lineTo(158, y + 8); g.stroke();
    }
    // gates
    lanes.forEach((ly) => {
      const top = ly - 96, bot = ly + 6;
      g.fillStyle = '#3a220f'; g.fillRect(108, top, 64, bot - top);
      for (let x = 112; x < 168; x += 11) {
        const lg = g.createLinearGradient(x, 0, x + 10, 0);
        lg.addColorStop(0, '#8a5a2c'); lg.addColorStop(1, '#5a3616');
        g.fillStyle = lg; g.fillRect(x, top + 4, 10, bot - top - 4);
        g.fillStyle = '#9a6a3a';
        g.beginPath(); g.moveTo(x, top + 4); g.lineTo(x + 5, top - 6); g.lineTo(x + 10, top + 4); g.fill();
      }
      g.fillStyle = '#2b2b30'; g.fillRect(108, top + 22, 64, 7); g.fillRect(108, bot - 24, 64, 7);
      g.fillStyle = '#3456a8';
      g.beginPath(); g.moveTo(124, top + 34); g.lineTo(156, top + 34); g.lineTo(156, top + 70); g.lineTo(140, top + 62); g.lineTo(124, top + 70); g.closePath(); g.fill();
      g.fillStyle = '#e8c04a';
      g.beginPath(); g.moveTo(130, top + 50); g.lineTo(133, top + 40); g.lineTo(137, top + 47); g.lineTo(140, top + 38); g.lineTo(143, top + 47); g.lineTo(147, top + 40); g.lineTo(150, top + 50); g.closePath(); g.fill();
    });
  },

  drawLairCaves(g, rnd) {
    const lanes = BATTLE.lanes;
    g.fillStyle = '#1b1114';
    g.beginPath(); g.moveTo(W, 100);
    for (let y = 100; y <= H + 20; y += 24) g.lineTo(1150 + Math.sin(y * 0.04) * 22 + rnd() * 14, y);
    g.lineTo(W, H + 20); g.closePath(); g.fill();
    for (let y = 100; y < H + 40; y += 24) {
      for (let k = 0; k < 3; k++) this.rock(g, 1170 + k * 40 + rnd() * 20, y + rnd() * 10, 24 + rnd() * 18, rnd, '#4a3438', '#23171a', '#6a4e50');
    }
    lanes.forEach((ly) => {
      const cx = 1186, cy = ly - 40;
      g.fillStyle = '#2a1a1c'; this.blob(g, cx, cy, 66, 70, rnd, 14, 0.2); g.fill();
      const mouth = g.createRadialGradient(cx + 10, cy + 8, 4, cx, cy, 60);
      mouth.addColorStop(0, '#000'); mouth.addColorStop(0.75, '#0b0405'); mouth.addColorStop(1, '#3b1a14');
      g.fillStyle = mouth; this.blob(g, cx + 4, cy + 6, 52, 58, rnd, 14, 0.15); g.fill();
      // spikes & skulls
      for (let i = 0; i < 5; i++) {
        const sx = 1120 + i * 14, sy = ly + 18 + (i % 2) * 6;
        g.fillStyle = '#6b5a52';
        g.beginPath(); g.moveTo(sx - 5, sy); g.lineTo(sx + 5, sy); g.lineTo(sx + 1, sy - 26 - rnd() * 10); g.closePath(); g.fill();
      }
      this.skull(g, 1128, ly - 70, 9);
      this.skull(g, 1140, ly + 30, 7);
    });
  },

  skull(g, x, y, s) {
    g.fillStyle = '#e2d6bd';
    g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    g.fillRect(x - s * 0.6, y + s * 0.4, s * 1.2, s * 0.8);
    g.fillStyle = '#1a0f0c';
    g.beginPath(); g.arc(x - s * 0.38, y, s * 0.28, 0, TAU); g.arc(x + s * 0.38, y, s * 0.28, 0, TAU); g.fill();
    g.fillRect(x - s * 0.1, y + s * 0.3, s * 0.2, s * 0.3);
  },

  build_menu(g) {
    const rnd = U.seeded(3);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#120a24'); sky.addColorStop(0.35, '#3a1b45'); sky.addColorStop(0.62, '#a8424a'); sky.addColorStop(0.78, '#f09a4a'); sky.addColorStop(1, '#f4c070');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(255,240,220,${0.2 + rnd() * 0.6})`;
      g.fillRect(rnd() * W, rnd() * 300, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
    }
    // sun
    const sun = g.createRadialGradient(640, 520, 10, 640, 520, 300);
    sun.addColorStop(0, 'rgba(255,230,160,0.95)'); sun.addColorStop(0.18, 'rgba(255,190,110,0.7)'); sun.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = sun; g.fillRect(0, 200, W, 520);
    g.fillStyle = '#ffe3a4'; g.beginPath(); g.arc(640, 520, 60, 0, TAU); g.fill();
    // mountains
    const ridge = (y0, amp, col, seed) => {
      const r2 = U.seeded(seed);
      g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) g.lineTo(x, y0 - Math.abs(Math.sin(x * 0.006 + seed)) * amp - r2() * amp * 0.25);
      g.lineTo(W, H); g.closePath(); g.fill();
    };
    ridge(470, 110, '#6a3350', 1);
    ridge(520, 80, '#4a2340', 2);
    // sea
    const sea = g.createLinearGradient(0, 540, 0, H);
    sea.addColorStop(0, '#d9774a'); sea.addColorStop(1, '#3a1d3a');
    g.fillStyle = sea; g.fillRect(0, 548, W, H - 548);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(255,220,160,${0.2 + rnd() * 0.3})`;
      g.fillRect(560 + (rnd() - 0.5) * 240, 552 + rnd() * 60, 20 + rnd() * 60, 2);
    }
    // left: fort on a hill
    g.fillStyle = '#1e1628';
    g.beginPath(); g.moveTo(0, 470); g.quadraticCurveTo(220, 420, 420, 560); g.lineTo(420, H); g.lineTo(0, H); g.closePath(); g.fill();
    const tower = (x, y, w, h) => {
      g.fillStyle = '#231b30'; g.fillRect(x, y - h, w, h);
      for (let k = 0; k < w; k += 10) g.fillRect(x + k, y - h - 8, 6, 8);
      g.fillStyle = 'rgba(255,200,110,0.85)';
      for (let k = 0; k < Math.floor(h / 30); k++) g.fillRect(x + w / 2 - 3, y - h + 16 + k * 28, 5, 8);
    };
    tower(40, 470, 46, 150); tower(110, 455, 70, 110); tower(200, 465, 40, 130); tower(260, 480, 60, 80);
    g.fillStyle = '#231b30'; g.fillRect(20, 400, 320, 80);
    // right: brute mountain with glowing caves
    g.fillStyle = '#1a1016';
    g.beginPath(); g.moveTo(W, 300); g.lineTo(1170, 330); g.lineTo(1110, 380); g.lineTo(1060, 370); g.lineTo(990, 450); g.lineTo(900, 520); g.lineTo(880, H); g.lineTo(W, H); g.closePath(); g.fill();
    [[1100, 450, 34], [1180, 400, 26], [1010, 520, 24]].forEach(([x, y, r]) => {
      const gl = g.createRadialGradient(x, y, 2, x, y, r * 3);
      gl.addColorStop(0, 'rgba(255,90,30,0.7)'); gl.addColorStop(1, 'rgba(255,60,20,0)');
      g.fillStyle = gl; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
      g.fillStyle = '#ff7a2a'; g.beginPath(); g.ellipse(x, y, r * 0.7, r, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#2a0c06'; g.beginPath(); g.ellipse(x, y + 4, r * 0.5, r * 0.8, 0, Math.PI, 0); g.fill();
    });
    // village silhouettes
    for (let i = 0; i < 12; i++) {
      const x = 430 + i * 38 + rnd() * 10, y = 548, h2 = 18 + rnd() * 16;
      g.fillStyle = '#2a1830';
      g.fillRect(x, y - h2, 26, h2);
      g.beginPath(); g.moveTo(x - 4, y - h2); g.lineTo(x + 13, y - h2 - 14); g.lineTo(x + 30, y - h2); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,210,120,0.8)'; g.fillRect(x + 9, y - h2 + 6, 5, 5);
    }
    // foreground hill
    const fg = g.createLinearGradient(0, 600, 0, H);
    fg.addColorStop(0, '#1b2416'); fg.addColorStop(1, '#0c110a');
    g.fillStyle = fg;
    g.beginPath(); g.moveTo(0, 640); g.quadraticCurveTo(320, 590, 640, 628); g.quadraticCurveTo(960, 660, W, 610); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    for (let i = 0; i < 50; i++) this.grassTuft(g, rnd() * W, 640 + rnd() * 70, 16 + rnd() * 14, rnd, '#0d1509', '#243318');
    this.vignette(g, 0.6);
  },

  /* -------------------------- cinematic sets -------------------------- */
  build_lab(g) {
    const rnd = U.seeded(11);
    this.bricks(g, 0, 0, W, H, 64, 32, '#1f2433', 'rgba(0,0,0,0.5)', rnd, 12);
    const lg = g.createRadialGradient(640, 360, 50, 640, 360, 700);
    lg.addColorStop(0, 'rgba(60,90,120,0.2)'); lg.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    // window
    g.fillStyle = '#0d1020'; g.beginPath(); g.arc(1000, 230, 110, 0, TAU); g.fill();
    g.strokeStyle = '#4a3a2a'; g.lineWidth = 14; g.beginPath(); g.arc(1000, 230, 110, 0, TAU); g.stroke();
    g.lineWidth = 8; g.beginPath(); g.moveTo(890, 230); g.lineTo(1110, 230); g.moveTo(1000, 120); g.lineTo(1000, 340); g.stroke();
    // shelves with flasks
    [[80, 200], [80, 330]].forEach(([x, y]) => {
      g.fillStyle = '#4a2f1a'; g.fillRect(x, y, 320, 12);
      for (let i = 0; i < 6; i++) {
        const fx = x + 20 + i * 50, col = ['#5dff9a', '#ff5dcf', '#6ad2ff', '#ffd45d'][i % 4];
        g.fillStyle = 'rgba(200,230,255,0.25)';
        g.beginPath(); g.arc(fx, y - 16, 14, 0, TAU); g.fill(); g.fillRect(fx - 4, y - 44, 8, 20);
        g.fillStyle = col; g.globalAlpha = 0.8;
        g.beginPath(); g.arc(fx, y - 14, 11, 0, Math.PI); g.fill(); g.globalAlpha = 1;
      }
    });
    // table
    g.fillStyle = '#3a2412'; g.fillRect(0, 560, W, 30);
    g.fillStyle = '#24160b'; g.fillRect(0, 590, W, H - 590);
    this.vignette(g, 0.7);
  },

  build_island(g) { this.drawIsland(g, false); },
  build_rift(g) { this.drawIsland(g, true); },

  drawIsland(g, angry) {
    const rnd = U.seeded(5);
    const sky = g.createLinearGradient(0, 0, 0, 420);
    if (angry) { sky.addColorStop(0, '#1a0508'); sky.addColorStop(0.6, '#6a1414'); sky.addColorStop(1, '#c2401e'); }
    else { sky.addColorStop(0, '#5fb0e8'); sky.addColorStop(1, '#cdeaf5'); }
    g.fillStyle = sky; g.fillRect(0, 0, W, 430);
    // sun / moon
    g.fillStyle = angry ? '#ff5a2a' : '#fff4c0';
    g.beginPath(); g.arc(1040, 120, 54, 0, TAU); g.fill();
    const sg = g.createRadialGradient(1040, 120, 40, 1040, 120, 180);
    sg.addColorStop(0, angry ? 'rgba(255,80,40,0.5)' : 'rgba(255,255,220,0.6)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg; g.fillRect(860, 0, 360, 320);
    // sea
    const sea = g.createLinearGradient(0, 420, 0, H);
    if (angry) { sea.addColorStop(0, '#4a1414'); sea.addColorStop(1, '#12040a'); }
    else { sea.addColorStop(0, '#2f8fcf'); sea.addColorStop(1, '#155a8f'); }
    g.fillStyle = sea; g.fillRect(0, 420, W, H - 420);
    // island
    g.fillStyle = angry ? '#6a4a2a' : '#e6cf8f';
    g.beginPath(); g.ellipse(640, 520, 520, 110, 0, Math.PI, 0); g.fill();
    g.fillStyle = angry ? '#2e3a1a' : '#5aa040';
    g.beginPath(); g.ellipse(640, 510, 470, 150, 0, Math.PI, 0); g.fill();
    g.fillStyle = angry ? '#243014' : '#4a8a34';
    g.beginPath(); g.ellipse(560, 480, 260, 150, 0, Math.PI, 0); g.fill();
    // trees
    for (let i = 0; i < 16; i++) {
      const x = 200 + rnd() * 880, y = 420 + rnd() * 70;
      g.fillStyle = angry ? '#2a1a10' : '#6b4424'; g.fillRect(x - 3, y - 30, 6, 30);
      g.fillStyle = angry ? '#1b2410' : (rnd() < 0.5 ? '#2f7a2a' : '#3f9a38');
      g.beginPath(); g.arc(x, y - 38, 18 + rnd() * 8, 0, TAU); g.fill();
    }
    // huts
    for (let i = 0; i < 9; i++) {
      const x = 300 + i * 80 + rnd() * 20, y = 470 + (i % 3) * 12;
      g.fillStyle = angry ? '#4a3a30' : '#f0e0c0'; g.fillRect(x - 18, y - 26, 36, 26);
      g.fillStyle = angry ? '#3a1a10' : '#b8452a';
      g.beginPath(); g.moveTo(x - 24, y - 24); g.lineTo(x, y - 46); g.lineTo(x + 24, y - 24); g.closePath(); g.fill();
      g.fillStyle = angry ? '#ff6a2a' : '#6b4424'; g.fillRect(x - 5, y - 14, 10, 14);
    }
    if (angry) {
      // fiery crack splitting the island
      g.strokeStyle = '#ff7a2a'; g.lineWidth = 5; g.shadowColor = '#ff4a1a'; g.shadowBlur = 20;
      g.beginPath(); g.moveTo(640, 370);
      for (let y = 370; y < 540; y += 16) g.lineTo(640 + (rnd() - 0.5) * 30, y);
      g.stroke(); g.shadowBlur = 0;
    }
    this.vignette(g, angry ? 0.7 : 0.35);
  },

  build_cave(g) {
    const rnd = U.seeded(13);
    const bg = g.createRadialGradient(640, 330, 60, 640, 360, 760);
    bg.addColorStop(0, '#5a2a1a'); bg.addColorStop(0.5, '#2a1410'); bg.addColorStop(1, '#0a0506');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? '10,5,5' : '90,50,35'},0.35)`;
      this.blob(g, rnd() * W, rnd() * H * 0.8, 40 + rnd() * 90, 30 + rnd() * 60, rnd, 10, 0.5); g.fill();
    }
    // stalactites
    for (let i = 0; i < 30; i++) {
      const x = rnd() * W, len = 40 + rnd() * 110, w = 14 + rnd() * 26;
      g.fillStyle = rnd() < 0.5 ? '#1a0c0a' : '#2a1612';
      g.beginPath(); g.moveTo(x - w, -5); g.lineTo(x + w, -5); g.lineTo(x, len); g.closePath(); g.fill();
    }
    // floor
    const fl = g.createLinearGradient(0, 520, 0, H);
    fl.addColorStop(0, '#3a1e14'); fl.addColorStop(1, '#140806');
    g.fillStyle = fl;
    g.beginPath(); g.moveTo(0, 560); g.quadraticCurveTo(640, 500, W, 560); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    // podium rock
    this.rock(g, 640, 560, 150, rnd, '#5a3a2a', '#2a1812', '#7a5440');
    g.fillStyle = '#4a2e20'; g.fillRect(520, 540, 240, 40);
    // bones
    for (let i = 0; i < 6; i++) this.skull(g, 120 + rnd() * 1040, 620 + rnd() * 70, 10 + rnd() * 6);
    // hiding rock at left (for Falco)
    this.rock(g, 150, 640, 120, rnd, '#4a2e22', '#1e100a', '#6a4432');
    this.vignette(g, 0.65);
  },

  build_throne(g) {
    const rnd = U.seeded(17);
    this.bricks(g, 0, 0, W, 560, 80, 40, '#7a6a5a', 'rgba(40,30,20,0.55)', rnd, 14);
    const wall = g.createLinearGradient(0, 0, 0, 560);
    wall.addColorStop(0, 'rgba(20,10,5,0.6)'); wall.addColorStop(1, 'rgba(20,10,5,0.1)');
    g.fillStyle = wall; g.fillRect(0, 0, W, 560);
    // windows with light
    [220, 640, 1060].forEach((x) => {
      g.fillStyle = '#ffe9b0';
      g.beginPath(); g.moveTo(x - 36, 320); g.lineTo(x - 36, 150); g.arc(x, 150, 36, Math.PI, 0); g.lineTo(x + 36, 320); g.closePath(); g.fill();
      g.strokeStyle = '#3a2a1a'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x, 114); g.lineTo(x, 320); g.moveTo(x - 36, 220); g.lineTo(x + 36, 220); g.stroke();
      const beam = g.createLinearGradient(x, 150, x + 120, 620);
      beam.addColorStop(0, 'rgba(255,235,180,0.35)'); beam.addColorStop(1, 'rgba(255,235,180,0)');
      g.fillStyle = beam;
      g.beginPath(); g.moveTo(x - 36, 200); g.lineTo(x + 36, 200); g.lineTo(x + 220, 640); g.lineTo(x + 60, 640); g.closePath(); g.fill();
    });
    // banners
    [430, 850].forEach((x) => {
      g.fillStyle = '#9a1c1c';
      g.beginPath(); g.moveTo(x - 40, 60); g.lineTo(x + 40, 60); g.lineTo(x + 40, 300); g.lineTo(x, 270); g.lineTo(x - 40, 300); g.closePath(); g.fill();
      g.fillStyle = '#e8c04a';
      g.beginPath(); g.moveTo(x - 22, 160); g.lineTo(x - 16, 130); g.lineTo(x - 6, 148); g.lineTo(x, 122); g.lineTo(x + 6, 148); g.lineTo(x + 16, 130); g.lineTo(x + 22, 160); g.closePath(); g.fill();
      g.fillRect(x - 44, 54, 88, 8);
    });
    // floor
    const fl = g.createLinearGradient(0, 560, 0, H);
    fl.addColorStop(0, '#5a4636'); fl.addColorStop(1, '#2a1e16');
    g.fillStyle = fl; g.fillRect(0, 560, W, H - 560);
    for (let x = -200; x < W + 200; x += 80) {
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(640 + (x - 640) * 0.6, 560); g.lineTo(x, H); g.stroke();
    }
    // carpet
    g.fillStyle = '#8a1414';
    g.beginPath(); g.moveTo(560, 560); g.lineTo(1100, 560); g.lineTo(1280, H); g.lineTo(380, H); g.closePath(); g.fill();
    g.strokeStyle = '#e0b040'; g.lineWidth = 4; g.stroke();
    // throne
    const tx = 1010;
    g.fillStyle = '#6a4a1a'; g.fillRect(tx - 120, 540, 240, 30); g.fillRect(tx - 150, 566, 300, 24);
    g.fillStyle = '#c89a3a';
    g.beginPath(); g.moveTo(tx - 80, 560); g.lineTo(tx - 80, 300); g.quadraticCurveTo(tx, 220, tx + 80, 300); g.lineTo(tx + 80, 560); g.closePath(); g.fill();
    g.fillStyle = '#9a1c2a';
    g.beginPath(); g.moveTo(tx - 58, 540); g.lineTo(tx - 58, 320); g.quadraticCurveTo(tx, 260, tx + 58, 320); g.lineTo(tx + 58, 540); g.closePath(); g.fill();
    g.fillStyle = '#f0c850';
    [[tx - 80, 300], [tx + 80, 300], [tx, 250]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fill(); });
    this.vignette(g, 0.55);
  },

  /* ------------------------ animated props ------------------------ */
  flag(ctx, x, y, t, c1, c2, w, h) {
    w = w || 36; h = h || 24;
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 56); ctx.stroke();
    ctx.fillStyle = '#e8c04a'; ctx.beginPath(); ctx.arc(x, y - 58, 3, 0, TAU); ctx.fill();
    const n = 8, top = y - 54;
    const wave = (i) => Math.sin(t * 6 - i * 0.7) * 3.2 * (i / n);
    ctx.fillStyle = c1;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) ctx.lineTo(x + (i / n) * w, top + wave(i));
    for (let i = n; i >= 0; i--) ctx.lineTo(x + (i / n) * w, top + h + wave(i));
    ctx.closePath(); ctx.fill();
    // emblem diamond
    const cx = x + w * 0.55, cy = top + h / 2 + wave(n * 0.55);
    ctx.fillStyle = c2;
    ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx, cy - 7); ctx.lineTo(cx + 8, cy); ctx.lineTo(cx, cy + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    for (let i = 0; i <= n; i++) ctx.lineTo(x + (i / n) * w, top + h * 0.65 + wave(i));
    for (let i = n; i >= 0; i--) ctx.lineTo(x + (i / n) * w, top + h + wave(i));
    ctx.closePath(); ctx.fill();
  },

  banner(ctx, x, y, t, color) {
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 110); ctx.stroke();
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 30, y - 104, 60, 6);
    ctx.fillStyle = '#8a8a8a';
    ctx.beginPath(); ctx.moveTo(x - 5, y - 110); ctx.lineTo(x, y - 128); ctx.lineTo(x + 5, y - 110); ctx.fill();
    const sway = Math.sin(t * 2.2 + x) * 5;
    ctx.fillStyle = color || '#b3382a';
    ctx.beginPath();
    ctx.moveTo(x - 26, y - 98); ctx.lineTo(x + 26, y - 98);
    ctx.lineTo(x + 26 + sway, y - 30);
    ctx.lineTo(x + 14 + sway, y - 38); ctx.lineTo(x + 4 + sway, y - 24); ctx.lineTo(x - 8 + sway, y - 38); ctx.lineTo(x - 18 + sway, y - 26);
    ctx.lineTo(x - 26 + sway, y - 34);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    // horned emblem
    const ex = x + sway * 0.5, ey = y - 66;
    ctx.strokeStyle = '#3a0c08'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ex, ey, 11, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex - 11, ey + 2); ctx.quadraticCurveTo(ex - 18, ey - 12, ex - 8, ey - 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + 11, ey + 2); ctx.quadraticCurveTo(ex + 18, ey - 12, ex + 8, ey - 18); ctx.stroke();
    ctx.fillStyle = '#3a0c08'; ctx.beginPath(); ctx.arc(ex, ey + 2, 5, 0, TAU); ctx.fill();
  },

  torch(ctx, x, y, t, scale) {
    const s = scale || 1;
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 3 * s, y, 6 * s, 26 * s);
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x - 7 * s, y - 2 * s, 14 * s, 6 * s);
    const f = 1 + Math.sin(t * 17 + x) * 0.08 + Math.sin(t * 29 + x * 2) * 0.06;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55;
    ctx.drawImage(this.glow('rgba(255,140,40,0.9)'), x - 60 * s * f, y - 70 * s * f, 120 * s * f, 120 * s * f);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const flame = (hh, ww, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x - ww * s, y - 2 * s);
      ctx.quadraticCurveTo(x - ww * s * 1.1, y - hh * s * 0.5 * f, x + Math.sin(t * 9 + x) * 3 * s, y - hh * s * f);
      ctx.quadraticCurveTo(x + ww * s * 1.1, y - hh * s * 0.5 * f, x + ww * s, y - 2 * s);
      ctx.closePath(); ctx.fill();
    };
    flame(34, 10, '#ff5a1a'); flame(26, 7, '#ffb02a'); flame(15, 4, '#fff2b0');
  },
};
