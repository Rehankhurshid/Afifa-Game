'use strict';
/* UI helpers: medieval buttons, panels, text, sliders, bars. */

const UI = {
  button(x, y, w, h, label, onClick, opts) {
    return Object.assign({ x, y, w, h, label, onClick, hover: 0, press: 0, style: 'wood', size: 24, enabled: true }, opts);
  },

  roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  text(ctx, str, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = `${o.weight || 700} ${o.size || 24}px ${o.font || FONT_HEAD}`;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.shadow) {
      ctx.shadowColor = o.shadow;
      ctx.shadowBlur = o.shadowBlur == null ? 8 : o.shadowBlur;
      ctx.shadowOffsetY = o.shadowY == null ? 3 : o.shadowY;
    }
    if (o.stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.strokeWidth || 4;
      ctx.strokeStyle = o.stroke;
      ctx.strokeText(str, x, y);
      ctx.shadowColor = 'transparent';
    }
    ctx.fillStyle = o.color || '#f6e7c1';
    ctx.fillText(str, x, y);
    ctx.restore();
  },

  wrap(ctx, str, maxW, font) {
    if (font) ctx.font = font;
    const words = str.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  },

  paragraph(ctx, str, x, y, maxW, o) {
    o = o || {};
    const font = `${o.weight || 500} ${o.italic ? 'italic ' : ''}${o.size || 20}px ${o.font || FONT_BODY}`;
    ctx.save();
    ctx.font = o.italic ? `italic ${o.weight || 500} ${o.size || 20}px ${o.font || FONT_BODY}` : font;
    const lines = this.wrap(ctx, str, maxW);
    const lh = o.lineHeight || (o.size || 20) * 1.35;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = o.color || '#3a2412';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    ctx.restore();
    return lines.length * lh;
  },

  drawButton(ctx, b) {
    if (b.hidden) return;
    const s = 1 + b.hover * 0.06 - b.press * 0.05;
    const dis = b.enabled === false;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(s, s);
    const w = b.w, h = b.h, x = -w / 2, y = -h / 2;
    if (dis) ctx.globalAlpha = 0.45;
    // glow when hovered
    if (b.hover > 0.02) {
      ctx.save();
      ctx.globalAlpha = b.hover * 0.7 * (dis ? 0.3 : 1);
      ctx.shadowColor = b.style === 'red' ? '#ff5a3a' : '#ffd36a';
      ctx.shadowBlur = 24;
      this.roundRect(ctx, x, y, w, h, 12);
      ctx.fillStyle = 'rgba(255,210,110,0.4)';
      ctx.fill();
      ctx.restore();
    }
    // drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this.roundRect(ctx, x + 2, y + 6, w, h, 12); ctx.fill();
    // body
    const palette = {
      wood: ['#8a4f24', '#5a2f12', '#3a1c08'],
      gold: ['#e6b64a', '#b07a20', '#6a4410'],
      red: ['#b0322a', '#7a1a14', '#4a0c08'],
      dark: ['#3a3040', '#241c2a', '#140e18'],
      green: ['#4e8a34', '#2f5e1e', '#1a3a10'],
    }[b.style] || ['#8a4f24', '#5a2f12', '#3a1c08'];
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, palette[0]); gr.addColorStop(0.55, palette[1]); gr.addColorStop(1, palette[2]);
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.fillStyle = gr; ctx.fill();
    // wood grain
    if (b.style === 'wood' || b.style === 'dark') {
      ctx.save(); this.roundRect(ctx, x, y, w, h, 12); ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 1.5;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(x, y + (h * i) / 5 + Math.sin(i) * 2);
        ctx.bezierCurveTo(x + w * 0.3, y + (h * i) / 5 - 3, x + w * 0.6, y + (h * i) / 5 + 3, x + w, y + (h * i) / 5);
        ctx.stroke();
      }
      ctx.restore();
    }
    // highlight
    ctx.save(); this.roundRect(ctx, x, y, w, h, 12); ctx.clip();
    const hl = ctx.createLinearGradient(0, y, 0, y + h * 0.5);
    hl.addColorStop(0, 'rgba(255,255,255,0.28)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.fillRect(x, y, w, h * 0.5);
    ctx.restore();
    // gold rim
    const rim = ctx.createLinearGradient(0, y, 0, y + h);
    rim.addColorStop(0, '#fff0b0'); rim.addColorStop(0.5, '#d8a23a'); rim.addColorStop(1, '#8a5a18');
    ctx.strokeStyle = rim; ctx.lineWidth = 3;
    this.roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 11); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5;
    this.roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 8); ctx.stroke();
    // rivets
    ctx.fillStyle = '#f0cf70';
    [[x + 10, y + h / 2], [x + w - 10, y + h / 2]].forEach(([rx, ry]) => { ctx.beginPath(); ctx.arc(rx, ry, 3, 0, TAU); ctx.fill(); });
    // label
    let lx = 0;
    if (b.icon) {
      ctx.font = `${b.size}px ${FONT_HEAD}`;
      const tw = ctx.measureText(b.label).width;
      lx = 14;
      this.icon(ctx, b.icon, -tw / 2 - 6, 1, b.size * 0.8, b.style === 'gold' ? '#3a1c08' : '#f6e7c1');
    }
    this.text(ctx, b.label, lx, 2, {
      size: b.size, weight: 900, color: b.style === 'gold' ? '#3a1c08' : '#fbeccb',
      stroke: b.style === 'gold' ? 'rgba(255,240,190,0.6)' : 'rgba(30,10,0,0.9)', strokeWidth: 4,
    });
    ctx.restore();
  },

  drawButtons(ctx, list) { for (const b of list) this.drawButton(ctx, b); },

  icon(ctx, name, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = s * 0.14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const h = s / 2;
    switch (name) {
      case 'play':
        ctx.beginPath(); ctx.moveTo(-h * 0.6, -h); ctx.lineTo(h, 0); ctx.lineTo(-h * 0.6, h); ctx.closePath(); ctx.fill(); break;
      case 'pause':
        ctx.fillRect(-h * 0.7, -h, h * 0.5, h * 2); ctx.fillRect(h * 0.2, -h, h * 0.5, h * 2); break;
      case 'back':
        ctx.beginPath(); ctx.moveTo(h * 0.6, -h); ctx.lineTo(-h * 0.6, 0); ctx.lineTo(h * 0.6, h); ctx.stroke(); break;
      case 'next':
        ctx.beginPath(); ctx.moveTo(-h * 0.6, -h); ctx.lineTo(h * 0.6, 0); ctx.lineTo(-h * 0.6, h); ctx.stroke(); break;
      case 'skip':
        ctx.beginPath(); ctx.moveTo(-h, -h * 0.8); ctx.lineTo(0, 0); ctx.lineTo(-h, h * 0.8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -h * 0.8); ctx.lineTo(h, 0); ctx.lineTo(0, h * 0.8); ctx.closePath(); ctx.fill(); break;
      case 'retry':
        ctx.beginPath(); ctx.arc(0, 0, h * 0.8, -Math.PI * 0.3, Math.PI * 1.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(h * 0.9, -h * 0.9); ctx.lineTo(h * 0.75, -h * 0.1); ctx.lineTo(h * 0.05, -h * 0.45); ctx.closePath(); ctx.fill(); break;
      case 'home':
        ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(0, -h); ctx.lineTo(h, 0); ctx.stroke();
        ctx.fillRect(-h * 0.65, 0, h * 1.3, h * 0.9); break;
      case 'sword':
        ctx.beginPath(); ctx.moveTo(-h, h); ctx.lineTo(h * 0.8, -h * 0.8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-h * 0.8, h * 0.2); ctx.lineTo(-h * 0.2, h * 0.8); ctx.stroke(); break;
      case 'sound':
        ctx.beginPath(); ctx.moveTo(-h, -h * 0.35); ctx.lineTo(-h * 0.4, -h * 0.35); ctx.lineTo(h * 0.2, -h); ctx.lineTo(h * 0.2, h); ctx.lineTo(-h * 0.4, h * 0.35); ctx.lineTo(-h, h * 0.35); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(h * 0.3, 0, h * 0.6, -0.9, 0.9); ctx.stroke(); break;
      case 'full':
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
          ctx.beginPath(); ctx.moveTo(sx * h, sy * h * 0.3); ctx.lineTo(sx * h, sy * h); ctx.lineTo(sx * h * 0.3, sy * h); ctx.stroke();
        }); break;
    }
    ctx.restore();
  },

  /* Ornate parchment or dark panel. */
  panel(ctx, x, y, w, h, style) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.roundRect(ctx, x + 4, y + 10, w, h, 18); ctx.fill();
    if (style === 'dark') {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, 'rgba(40,26,20,0.96)'); g.addColorStop(1, 'rgba(18,10,8,0.96)');
      ctx.fillStyle = g;
    } else {
      const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 20, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, '#f8ecc8'); g.addColorStop(0.7, '#ecd6a0'); g.addColorStop(1, '#c9a468');
      ctx.fillStyle = g;
    }
    this.roundRect(ctx, x, y, w, h, 18); ctx.fill();
    ctx.strokeStyle = '#6a3e14'; ctx.lineWidth = 6;
    this.roundRect(ctx, x, y, w, h, 18); ctx.stroke();
    ctx.strokeStyle = '#e2b24a'; ctx.lineWidth = 2.5;
    this.roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 12); ctx.stroke();
    // corner ornaments
    ctx.fillStyle = '#e2b24a';
    [[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + h - 8], [x + w - 8, y + h - 8]].forEach(([cx, cy]) => {
      ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 9, cy); ctx.lineTo(cx, cy + 9); ctx.lineTo(cx - 9, cy); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  },

  /* Ribbon title banner. */
  ribbon(ctx, str, x, y, w, size, color) {
    ctx.save();
    const h = size * 1.9;
    ctx.fillStyle = '#5a0e0a';
    [-1, 1].forEach((d) => {
      ctx.beginPath();
      ctx.moveTo(x + d * (w / 2 - 20), y - h / 2 + 10);
      ctx.lineTo(x + d * (w / 2 + 30), y - h / 2 + 10);
      ctx.lineTo(x + d * (w / 2 + 14), y + 10);
      ctx.lineTo(x + d * (w / 2 + 30), y + h / 2 + 10);
      ctx.lineTo(x + d * (w / 2 - 20), y + h / 2 + 10);
      ctx.closePath(); ctx.fill();
    });
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, color || '#c8322a'); g.addColorStop(1, '#7a1410');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - h / 2); ctx.quadraticCurveTo(x, y - h / 2 - 8, x + w / 2, y - h / 2);
    ctx.lineTo(x + w / 2, y + h / 2); ctx.quadraticCurveTo(x, y + h / 2 - 8, x - w / 2, y + h / 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f0c050'; ctx.lineWidth = 3; ctx.stroke();
    this.text(ctx, str, x, y - 2, { size, weight: 900, color: '#fff3d0', stroke: '#3a0604', strokeWidth: 5 });
    ctx.restore();
  },

  /* Gold framed medallion ring. */
  ring(ctx, x, y, r, width, glow) {
    ctx.save();
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 18; }
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, '#fff2b8'); g.addColorStop(0.45, '#d9a23a'); g.addColorStop(1, '#7a4a12');
    ctx.strokeStyle = g; ctx.lineWidth = width || 5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(40,20,0,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r + (width || 5) / 2, 0, TAU); ctx.stroke();
    ctx.restore();
  },

  bar(ctx, x, y, w, h, frac, c1, c2, ghost) {
    ctx.save();
    ctx.fillStyle = 'rgba(20,8,4,0.85)';
    this.roundRect(ctx, x - 3, y - 3, w + 6, h + 6, (h + 6) / 2); ctx.fill();
    ctx.fillStyle = '#2a1410';
    this.roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    if (ghost != null && ghost > frac) {
      ctx.fillStyle = 'rgba(255,240,200,0.75)';
      this.roundRect(ctx, x, y, Math.max(h, w * ghost), h, h / 2); ctx.fill();
    }
    if (frac > 0) {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g;
      this.roundRect(ctx, x, y, Math.max(h, w * frac), h, h / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      this.roundRect(ctx, x + 3, y + 2, Math.max(0, w * frac - 6), h * 0.3, h * 0.15); ctx.fill();
    }
    ctx.restore();
  },

  slider(x, y, w, get, set, label) {
    return { x, y, w, get, set, label, drag: false };
  },

  drawSlider(ctx, s, t) {
    const v = s.get();
    this.text(ctx, s.label, s.x - 30, s.y, { size: 22, align: 'right', color: '#4a2a10', weight: 900 });
    ctx.fillStyle = '#5a3a1a';
    this.roundRect(ctx, s.x, s.y - 7, s.w, 14, 7); ctx.fill();
    const g = ctx.createLinearGradient(s.x, 0, s.x + s.w, 0);
    g.addColorStop(0, '#d8a23a'); g.addColorStop(1, '#f6d57a');
    ctx.fillStyle = g;
    this.roundRect(ctx, s.x, s.y - 7, Math.max(14, s.w * v), 14, 7); ctx.fill();
    const kx = s.x + s.w * v;
    ctx.fillStyle = '#3a1c08';
    ctx.beginPath(); ctx.arc(kx, s.y + 2, 15, 0, TAU); ctx.fill();
    const kg = ctx.createRadialGradient(kx - 4, s.y - 5, 2, kx, s.y, 15);
    kg.addColorStop(0, '#fff3c0'); kg.addColorStop(1, '#c8902a');
    ctx.fillStyle = kg;
    ctx.beginPath(); ctx.arc(kx, s.y, 14, 0, TAU); ctx.fill();
    this.text(ctx, Math.round(v * 100) + '%', s.x + s.w + 46, s.y, { size: 20, color: '#4a2a10', weight: 900 });
  },

  sliderHit(s, x, y) { return x >= s.x - 16 && x <= s.x + s.w + 16 && Math.abs(y - s.y) < 22; },
};
