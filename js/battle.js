'use strict';
/* The battle: three lanes between the Earthling Fort (left) and Brute Cave (right). */

let UNIT_ID = 0;

class Unit {
  constructor(scene, key, lane, x) {
    const d = UNITS[key];
    const diff = DIFFICULTY[Game.settings.difficulty];
    this.scene = scene;
    this.key = key;
    this.d = d;
    this.side = d.side;
    this.lane = lane;
    this.id = ++UNIT_ID;
    this.maxHp = d.hp * (d.side === 'beast' ? scene.L.hpMult * diff.enemyHp : 1);
    this.hp = this.maxHp;
    this.x = x;
    this.y = BATTLE.lanes[lane] + U.rand(-9, 9);
    this.dir = d.side === 'human' ? 1 : -1;
    this.state = 'walk';
    this.atkCd = U.rand(0.1, 0.35);
    this.atkAnim = 0;
    this.pending = false;
    this.lockTarget = null;
    this.flash = 0;
    this.walkT = U.rand(0, 10);
    this.spawnT = 0;
    this.deadT = 0;
    this.knock = 0;
    this.shots = 0;
    this.revived = false;
    this.reviving = 0;
    this.enraged = false;
    this.dodgeT = 0;
    this.hpShow = 0;
    this.dead = false;
    this.removed = false;
    this.stepT = 0;
  }

  roared() { return this.side === 'beast' && this.scene.roarT > 0; }

  speed() {
    let s = this.d.speed;
    if (this.enraged) s *= 1.35;
    if (this.roared()) s *= 1.3;
    return s;
  }

  interval() {
    let a = this.d.atk;
    if (this.enraged) a *= 0.65;
    if (this.roared()) a *= 0.8;
    return a;
  }

  damage() {
    let dmg = this.d.dmg;
    if (this.enraged) dmg *= 1.2;
    if (this.d.nightBonus && this.scene.L.night) dmg *= this.d.nightBonus;
    return dmg * U.rand(0.9, 1.1);
  }

  update(dt) {
    const s = this.scene;
    this.spawnT += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.dodgeT = Math.max(0, this.dodgeT - dt);
    this.hpShow -= dt;
    this.knock = U.damp(this.knock, 0, 10, dt);
    if (this.dead) {
      this.deadT += dt;
      if (this.deadT > 1.2) this.removed = true;
      return;
    }
    if (this.reviving > 0) {
      this.reviving -= dt;
      if (Math.random() < dt * 30) s.fx.add({ shape: 'glow', x: this.x + U.rand(-20, 20), y: this.y - U.rand(0, 40), vy: U.rand(-40, -90), life: 0.8, size: U.rand(4, 9), size2: 1, color: 'rgba(90,255,150,1)', add: true });
      if (this.reviving <= 0) {
        this.hp = this.maxHp * 0.5;
        this.flash = 1;
        this.hpShow = 2;
        s.fx.text(this.x, this.y - this.d.h - 16, 'RISEN!', { color: '#7dffb0', size: 22 });
        s.fx.ring(this.x, this.y - 40, 10, 90, 0.5, 'rgba(120,255,170,0.9)', 6);
      }
      return;
    }
    if (this.spawnT < 0.3) return;

    this.atkCd -= dt;
    if (this.atkAnim > 0) {
      const dur = Math.min(0.36, this.interval() * 0.8);
      this.atkAnim += dt / dur;
      if (this.pending && this.atkAnim >= 0.5) { this.pending = false; this.strike(); }
      if (this.atkAnim >= 1) this.atkAnim = 0;
    }

    const tgt = s.findTarget(this);
    if (tgt) {
      this.state = 'fight';
      if (this.atkCd <= 0 && this.atkAnim === 0) {
        this.atkAnim = 0.001;
        this.pending = true;
        this.lockTarget = tgt;
        this.atkCd = this.interval();
      }
    } else if (this.atkAnim === 0) {
      this.state = 'walk';
      this.x += this.dir * this.speed() * dt;
      this.walkT += dt;
      this.stepT += dt;
      const heavy = this.key === 'hadog' || this.key === 'destroyer';
      if (this.stepT > (heavy ? 0.55 : 0.3)) {
        this.stepT = 0;
        s.fx.add({ shape: 'smoke', x: this.x - this.dir * 12, y: this.y - 2, vx: -this.dir * U.rand(10, 30), vy: U.rand(-12, -4), life: 0.5, size: heavy ? 12 : 6, size2: heavy ? 26 : 14, color: s.L.night ? 'rgba(120,90,90,0.35)' : 'rgba(170,150,100,0.35)', layer: 0 });
        if (this.key === 'destroyer') { Sound.play('step'); Game.shake(2.5, 0.15); }
      }
    }

    if (this.side === 'human' && this.x >= BATTLE.caveX) s.breach(this);
    else if (this.side === 'beast' && this.x <= BATTLE.fortX) s.breach(this);
  }

  strike() {
    const s = this.scene, t = this.lockTarget;
    if (!t || t.dead) return;
    const dmg = this.damage();
    if (this.d.melee) {
      if (Math.abs(t.x - this.x) - (t.d.r + this.d.r) > this.d.range + 24) return;
      s.meleeHit(this, t, dmg);
    } else {
      s.fire(this, t, dmg);
    }
  }
}

/* ------------------------------------------------------------------ */
const BattleScene = {
  enter(p) {
    this.levelNum = p.level || 1;
    this.L = LEVELS[this.levelNum - 1];
    this.diff = DIFFICULTY[Game.settings.difficulty];
    this.bg = Art.get(this.L.bg);
    this.units = [];
    this.projs = [];
    this.slashes = [];
    this.volley = [];
    this.orbs = [];
    this.banners = [];
    this.fx = new FX();
    this.playerHP = BATTLE.baseHP;
    this.enemyHP = BATTLE.baseHP;
    this.ghostP = BATTLE.baseHP;
    this.ghostE = BATTLE.baseHP;
    this.barShakeP = 0;
    this.barShakeE = 0;
    this.time = BATTLE.duration;
    this.energy = 5;
    this.selected = null;
    this.cd = { falco: 0, mortt: 0, thea: 0, june: 0 };
    this.cardShake = { falco: 0, mortt: 0, thea: 0, june: 0 };
    this.ability = { charge: 0.5, targeting: false, readyPlayed: false };
    this.state = 'intro';
    this.stateT = 0;
    this.timeScale = 1;
    this.roarT = 0;
    this.roarsDone = [];
    this.bossSpawned = false;
    this.boss = null;
    this.redFlash = 0;
    this.whiteFlash = 0;
    this.gateFlash = [0, 0, 0];
    this.caveFlash = [0, 0, 0];
    this.lastTick = 99;
    this.heartT = 0;
    this.hint = null;
    this.result = null;
    this.stats = { kills: 0, deployed: 0, lost: 0, breaches: 0, time: 0 };
    this.ai = { energy: this.L.aiStart, next: null, delay: 1.8, surgeT: this.L.surgeEvery };
    this.eyes = BATTLE.lanes.map(() => ({ open: 1, t: U.rand(1, 4) }));
    this.paused = false;
    this.pauseBtn = UI.button(640, 134, 42, 32, '', () => this.pause(), { size: 16, style: 'dark' });
    this.pauseBtns = [
      UI.button(640, 300, 280, 60, 'Resume', () => this.resume(), { style: 'gold', size: 24, icon: 'play' }),
      UI.button(640, 375, 280, 56, 'Restart', () => Game.go('battle', { level: this.levelNum }), { size: 22, icon: 'retry' }),
      UI.button(560, 450, 130, 50, '', () => this.toggleVol('music'), { size: 18 }),
      UI.button(720, 450, 130, 50, '', () => this.toggleVol('sfx'), { size: 18 }),
      UI.button(640, 525, 280, 56, 'Main Menu', () => Game.go('menu'), { size: 22, icon: 'home', style: 'red' }),
    ];
    this.refreshVolBtns();
    this.cursor = 'default';
    Sound.music(this.L.music);
  },

  activeButtons() { return this.paused ? this.pauseBtns : this.state === 'play' ? [this.pauseBtn] : []; },

  pause() {
    if (this.state === 'end' || this.paused) return;
    this.paused = true;
    Sound.play('back');
  },
  resume() { this.paused = false; },
  onBlur() { if (this.state === 'play') this.pause(); },
  toggleVol(kind) {
    const s = Game.settings;
    const key = kind + 'Prev';
    if (s[kind] > 0) { this[key] = s[kind]; s[kind] = 0; } else s[kind] = this[key] || 0.7;
    Sound.applyVolumes(); Game.saveSettings(); this.refreshVolBtns();
  },
  refreshVolBtns() {
    const s = Game.settings;
    this.pauseBtns[2].label = s.music > 0 ? 'Music ✓' : 'Music ✗';
    this.pauseBtns[3].label = s.sfx > 0 ? 'SFX ✓' : 'SFX ✗';
    this.pauseBtns[2].style = s.music > 0 ? 'green' : 'dark';
    this.pauseBtns[3].style = s.sfx > 0 ? 'green' : 'dark';
  },

  /* ------------------------------ helpers ------------------------------ */
  banner(title, sub, color, dur) {
    this.banners.push({ title, sub, color: color || '#ffd36a', t: 0, dur: dur || 2.4 });
  },

  laneAt(x, y) {
    if (x < 150 || x > 1140 || y < 150) return -1;
    let best = -1, bd = 999;
    BATTLE.lanes.forEach((ly, i) => { const d = Math.abs(y - (ly - 40)); if (d < bd) { bd = d; best = i; } });
    return bd < 100 ? best : -1;
  },

  cardPos(i) { return { x: 172 + i * 86, y: 80 }; },

  findTarget(u) {
    let best = null, bestD = Infinity;
    for (const o of this.units) {
      if (o.side === u.side || o.dead || o.lane !== u.lane || o.spawnT < 0.25) continue;
      const dx = (o.x - u.x) * u.dir;
      if (dx < -(u.d.r + o.d.r)) continue;
      const inRange = u.d.melee ? Math.abs(o.x - u.x) - (u.d.r + o.d.r) <= u.d.range : dx <= u.d.range;
      if (inRange && dx < bestD) { best = o; bestD = dx; }
    }
    return best;
  },

  spawn(key, lane) {
    const d = UNITS[key];
    const x = d.side === 'human' ? BATTLE.fortX + 14 : BATTLE.caveX + 26;
    const u = new Unit(this, key, lane, x);
    this.units.push(u);
    const y = BATTLE.lanes[lane];
    if (d.side === 'human') {
      this.gateFlash[lane] = 1;
      Sound.play('deploy');
      this.fx.ring(x, y - 4, 8, 70, 0.45, 'rgba(255,220,120,0.9)', 5);
      this.fx.burst(x, y - 40, 14, { shape: 'star', color: ['#fff6c0', '#ffd36a'], speed: 160, life: 0.6, size: 5, size2: 1, drag: 3, spin: 6 });
    } else {
      this.caveFlash[lane] = 0.8;
      Sound.play(d.boss ? 'roar' : 'brute_spawn');
      this.fx.burst(x, y - 30, 16, { shape: 'smoke', color: this.L.night ? 'rgba(60,20,30,0.6)' : 'rgba(90,60,40,0.5)', speed: 90, life: 0.8, size: 14, size2: 32, drag: 2 });
    }
    return u;
  },

  deploy(key, lane) {
    const d = UNITS[key];
    if (this.cd[key] > 0) {
      Sound.play('error'); this.cardShake[key] = 0.4;
      this.fx.text(this.cardPos(HUMAN_ROSTER.indexOf(key)).x, 150, 'Recharging…', { color: '#ffd0a0', size: 16, vy: -20, life: 0.8 });
      return;
    }
    if (this.energy < d.cost) {
      Sound.play('error'); this.cardShake[key] = 0.4;
      this.fx.text(300, 150, 'Not enough courage!', { color: '#ff9a7a', size: 18, vy: -20, life: 1 });
      return;
    }
    this.energy -= d.cost;
    this.cd[key] = d.cd;
    this.stats.deployed++;
    this.spawn(key, lane);
  },

  gainEnergy(n, x, y) {
    this.orbs.push({ x, y, sx: x, sy: y, t: 0, n });
  },

  /* ------------------------------- combat ------------------------------- */
  meleeHit(u, t, dmg) {
    const w = u.d.weapon;
    Sound.play(w === 'hammer' ? 'hammer' : w === 'axe' ? 'axe' : w === 'club' ? 'club' : w === 'dagger' ? 'dagger' : 'sword');
    const hx = t.x - u.dir * t.d.r * 0.4, hy = t.y - t.d.h * 0.45;
    this.slashes.push({ x: hx, y: hy, dir: u.dir, t: 0, life: 0.2, r: u.d.splash ? 46 : w === 'dagger' ? 22 : 32, color: u.side === 'human' ? '#fff6d0' : '#ffb08a' });
    if (u.d.splash) {
      Game.shake(u.key === 'destroyer' ? 9 : 6, 0.25);
      this.fx.ring(t.x, t.y, 10, u.d.splash + 20, 0.4, 'rgba(255,220,160,0.8)', 6);
      this.fx.burst(t.x, t.y - 6, 16, { shape: 'smoke', color: 'rgba(150,120,80,0.5)', speed: 160, life: 0.6, size: 10, size2: 24, drag: 3 });
      this.fx.burst(t.x, t.y - 4, 10, { shape: 'circle', color: ['#6a5030', '#8a6a40'], speed: 220, life: 0.6, size: 3, g: 600, angle: -Math.PI / 2, spread: 1.2, floor: t.y + 4 });
      for (const o of this.units) {
        if (o.side !== u.side && !o.dead && o.lane === u.lane && Math.abs(o.x - t.x) <= u.d.splash) this.damage(o, o === t ? dmg : dmg * 0.6, u);
      }
    } else {
      this.damage(t, dmg, u);
    }
  },

  fire(u, t, dmg) {
    const w = u.d.weapon;
    Sound.play(w === 'spear' ? 'spear' : 'arrow');
    const sx = u.x + u.dir * 22, sy = u.y - u.d.h * 0.55;
    const make = (delay, mul, off) => {
      this.projs.push({ kind: w === 'spear' ? 'spear' : 'arrow', side: u.side, src: u, target: t, sx, sy: sy + off, x: sx, y: sy, t: -delay, dmg: dmg * mul, lane: u.lane, pierce: !!u.d.pierce, tx: t.x, ty: t.y - t.d.h * 0.5, ang: 0 });
    };
    if (u.d.volleyEvery) {
      u.shots++;
      if (u.shots % u.d.volleyEvery === 0) {
        make(0, 0.75, -6); make(0.07, 0.75, 0); make(0.14, 0.75, 6);
        this.fx.text(u.x, u.y - u.d.h - 14, 'VOLLEY!', { color: '#ffe07a', size: 16, vy: -50, life: 0.8 });
        setTimeout(() => Sound.play('arrow'), 70); setTimeout(() => Sound.play('arrow'), 140);
        return;
      }
    }
    make(0, 1, 0);
  },

  damage(t, amt, src, o) {
    o = o || {};
    if (t.dead || t.reviving > 0) return false;
    const hx = t.x, hy = t.y - t.d.h * 0.55;
    if (t.d.onlyHurtBy && (!src || src.d.weapon !== t.d.onlyHurtBy)) {
      this.fx.text(hx + U.rand(-16, 16), hy - 34, 'IMMUNE', { color: '#d0d0d8', size: 17, vy: -50, life: 0.8 });
      this.fx.burst(hx, hy, 5, { shape: 'spark', color: '#c0c8d0', speed: 200, life: 0.25, size: 2, drag: 3 });
      Sound.play('immune');
      if (!this.immuneHinted) {
        this.immuneHinted = true;
        this.banner('HE IS IMMUNE!', 'Only Warrior June\'s magic dagger can wound the Destroyer', '#ff9a6a', 3.2);
      }
      return false;
    }
    if (t.d.dodge && !o.sure && Math.random() < t.d.dodge) {
      t.dodgeT = 0.35;
      this.fx.text(hx, hy - 34, t.key === 'keljeon' ? 'SHADOW!' : 'DODGE!', { color: t.key === 'keljeon' ? '#c9a0ff' : '#9ad8ff', size: 17, vy: -60, life: 0.7 });
      Sound.play('dodge');
      return false;
    }
    const crit = !o.noCrit && Math.random() < 0.12;
    if (crit) amt *= 1.75;
    if (t.d.armor) amt *= 1 - t.d.armor;
    const magic = src && src.d.weapon === 'dagger' && t.d.onlyHurtBy === 'dagger';
    if (magic) amt *= 3;
    amt = Math.max(1, Math.round(amt));
    t.hp -= amt;
    t.flash = 1;
    t.hpShow = 2.5;
    t.knock = -t.dir * (crit ? 9 : 4) * (t.d.boss ? 0.3 : 1);
    const col = t.side === 'human' ? '#ff7a6a' : crit ? '#ffd84a' : magic ? '#b8ffea' : '#ffffff';
    this.fx.text(hx + U.rand(-12, 12), hy - 22, crit ? `${amt}!` : String(amt), { color: col, size: crit ? 30 : magic ? 24 : 19, vy: -90, life: 0.9 });
    this.fx.burst(hx, hy, crit ? 14 : 6, { shape: 'spark', color: t.side === 'human' ? ['#ffe0b0', '#ffffff'] : ['#ffd36a', '#ffffff', '#ff9a5a'], speed: crit ? 360 : 240, life: 0.3, size: crit ? 3 : 2, drag: 3, add: true });
    if (crit) { Sound.play('crit'); this.fx.text(hx, hy - 58, 'CRITICAL', { color: '#ffb84a', size: 13, vy: -70, life: 0.7 }); }
    if (magic) { this.fx.burst(hx, hy, 10, { shape: 'star', color: ['#b8ffea', '#ffffff'], speed: 200, life: 0.5, size: 6, size2: 1, drag: 3, spin: 8 }); }
    Sound.play('thud');
    if (t.d.enrage && !t.enraged && t.hp > 0 && t.hp < t.maxHp * t.d.enrage) {
      t.enraged = true;
      Sound.play('enrage');
      this.fx.text(t.x, t.y - t.d.h - 20, 'ENRAGED!', { color: '#ff4a2a', size: 22, vy: -40, life: 1.2 });
      this.fx.ring(t.x, t.y - 50, 10, 80, 0.5, 'rgba(255,60,30,0.9)', 6);
    }
    if (t.hp <= 0) this.kill(t, src);
    return true;
  },

  kill(t) {
    if (t.d.revive && !t.revived) {
      t.revived = true;
      t.hp = 0;
      t.reviving = 1.2;
      t.atkAnim = 0;
      t.pending = false;
      this.fx.text(t.x, t.y - t.d.h - 14, 'RESURRECTING…', { color: '#7dffb0', size: 17, vy: -30, life: 1.3 });
      Sound.play('resurrect');
      return;
    }
    t.dead = true;
    t.deadT = 0;
    t.hp = 0;
    Sound.play(t.side === 'human' ? 'death_human' : 'death_beast');
    this.fx.burst(t.x, t.y - t.d.h * 0.4, 10, { shape: 'smoke', color: 'rgba(200,190,170,0.55)', speed: 70, life: 0.9, size: 12, size2: 30, drag: 2 });
    this.fx.burst(t.x, t.y - t.d.h * 0.8, 6, { shape: 'star', color: ['#fff6c0', '#ffd36a'], speed: 120, life: 0.8, size: 6, size2: 1, drag: 2, spin: 6, g: -40 });
    if (t.side === 'beast') {
      this.stats.kills++;
      const bounty = t.d.boss ? 5 : Math.max(1, Math.round(t.d.cost / 3));
      this.gainEnergy(bounty, t.x, t.y - t.d.h * 0.6);
      if (t.d.boss) this.bossDefeated(t);
    } else this.stats.lost++;
  },

  breach(u) {
    if (u.dead || this.state !== 'play') return;
    u.dead = true;
    u.removed = true;
    const dmg = u.d.breach;
    const y = BATTLE.lanes[u.lane];
    let gx;
    if (u.side === 'human') {
      this.enemyHP = Math.max(0, this.enemyHP - dmg);
      this.stats.breaches++;
      this.caveFlash[u.lane] = 1;
      this.barShakeE = 0.5;
      gx = 1180;
      this.fx.text(gx - 40, y - 110, `-${dmg}`, { color: '#ffd84a', size: 40, vy: -40, life: 1.4 });
      this.fx.text(940, 60, `-${dmg}`, { color: '#ffd84a', size: 28, vy: -30, life: 1.1 });
    } else {
      this.playerHP = Math.max(0, this.playerHP - dmg);
      this.gateFlash[u.lane] = 1;
      this.barShakeP = 0.5;
      this.redFlash = 0.6;
      gx = 140;
      this.fx.text(gx + 40, y - 110, `-${dmg}`, { color: '#ff5a4a', size: 40, vy: -40, life: 1.4 });
      this.fx.text(340, 60, `-${dmg}`, { color: '#ff5a4a', size: 28, vy: -30, life: 1.1 });
      if (u.d.boss) this.boss = null;
    }
    Sound.play('breach');
    Game.shake(u.d.boss ? 18 : 10, 0.45);
    this.fx.burst(gx, y - 40, 30, { shape: 'spark', color: ['#ffd36a', '#ff8a3a', '#ffffff'], speed: 420, life: 0.6, size: 3, drag: 2.5, add: true });
    this.fx.burst(gx, y - 30, 14, { shape: 'smoke', color: 'rgba(120,100,80,0.6)', speed: 120, life: 1, size: 20, size2: 50, drag: 2 });
    this.fx.ring(gx, y - 40, 20, 140, 0.5, 'rgba(255,200,120,0.9)', 8);
    this.fx.add({ shape: 'glow', x: gx, y: y - 40, size: 150, size2: 60, life: 0.35, color: 'rgba(255,190,90,1)', add: true });
  },

  castVolley(lane) {
    this.ability.charge = 0;
    this.ability.targeting = false;
    this.ability.readyPlayed = false;
    Sound.play('volley');
    this.banner('ROYAL VOLLEY!', 'Lord Godwin rains fire upon the lane', '#ffd36a', 1.6);
    for (let i = 0; i < 16; i++) {
      this.volley.push({ x: 230 + (i / 15) * 860 + U.rand(-25, 25), lane, t: -i * 0.05 - U.rand(0, 0.06), dur: 0.45 });
    }
    this.fx.burst(62, 64, 20, { shape: 'star', color: ['#fff6c0', '#ffd36a'], speed: 200, life: 0.7, size: 6, size2: 1, drag: 2, layer: 2, spin: 6 });
  },

  spawnBoss() {
    this.bossSpawned = true;
    let lane = 1;
    let most = -1;
    [1, 2].forEach((l) => {
      const n = this.units.filter((u) => u.side === 'human' && !u.dead && u.lane === l).length;
      if (n > most) { most = n; lane = l; }
    });
    this.boss = this.spawn('destroyer', lane);
    this.banner('THE DESTROYER AWAKENS!', 'Only Warrior June\'s magic dagger can wound him!', '#ff5a3a', 4);
    this.whiteFlash = 0.8;
    Game.shake(16, 1.4);
    Sound.music('boss');
    this.fx.ring(BATTLE.caveX, BATTLE.lanes[lane] - 60, 20, 300, 0.9, 'rgba(255,80,30,0.9)', 12);
  },

  bossDefeated(t) {
    this.boss = null;
    Sound.play('boom');
    Game.shake(20, 1.2);
    this.whiteFlash = 1;
    this.timeScale = 0.3;
    this.slowT = 1.2;
    this.enemyHP = Math.max(0, this.enemyHP - 30);
    this.barShakeE = 0.8;
    this.banner('THE DESTROYER FALLS!', 'The brutes tremble in fear  ·  Enemy health -30', '#7dffb0', 3.5);
    this.fx.burst(t.x, t.y - 80, 60, { shape: 'spark', color: ['#ffd36a', '#ff5a3a', '#ffffff'], speed: 600, life: 1.1, size: 4, drag: 2, add: true });
    this.fx.burst(t.x, t.y - 60, 24, { shape: 'smoke', color: 'rgba(90,40,30,0.6)', speed: 200, life: 1.4, size: 24, size2: 70, drag: 2 });
    Sound.music('battle');
  },

  /* ------------------------------- enemy AI ------------------------------ */
  aiUpdate(dt) {
    const ai = this.ai, L = this.L;
    ai.energy = Math.min(16, ai.energy + L.aiRegen * this.diff.ai * dt);
    ai.delay -= dt;
    ai.surgeT -= dt;
    if (ai.surgeT <= 0) {
      ai.surgeT = L.surgeEvery;
      ai.energy += L.surge * this.diff.ai;
      this.banner('A WAVE OF BRUTES APPROACHES!', 'Hold the gates!', '#ff9a6a', 2.2);
      Sound.play('roar');
    }
    if (!ai.next) {
      const entries = Object.entries(L.weights);
      const total = entries.reduce((a, [, w]) => a + w, 0);
      let r = Math.random() * total;
      for (const [k, w] of entries) { r -= w; if (r <= 0) { ai.next = k; break; } }
      ai.next = ai.next || 'keljeon';
    }
    if (ai.delay <= 0 && ai.energy >= UNITS[ai.next].cost) {
      ai.energy -= UNITS[ai.next].cost;
      this.spawn(ai.next, this.aiLane());
      ai.next = null;
      ai.delay = U.rand(0.5, 1.6);
    }
  },

  aiLane() {
    const score = [0, 1, 2].map((l) => {
      let h = 0, b = 0;
      for (const u of this.units) {
        if (u.dead || u.lane !== l) continue;
        const p = u.hp * (u.d.dmg / u.d.atk) / 100;
        if (u.side === 'human') h += p * (1 + (u.x - BATTLE.fortX) / 700); else b += p;
      }
      return { l, h, b };
    });
    const r = Math.random();
    if (r < 0.5) return score.reduce((a, c) => (c.h - c.b > a.h - a.b ? c : a)).l;
    if (r < 0.75) return score.reduce((a, c) => (c.h < a.h ? c : a)).l;
    return U.randInt(0, 2);
  },

  /* -------------------------------- update ------------------------------- */
  update(dt) {
    if (this.paused) return;
    this.stateT += dt;
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0 && this.state !== 'end') this.timeScale = 1; }
    const gdt = dt * this.timeScale;
    this.fx.update(gdt);
    this.redFlash = Math.max(0, this.redFlash - dt * 1.5);
    this.whiteFlash = Math.max(0, this.whiteFlash - dt * 2);
    this.barShakeP = Math.max(0, this.barShakeP - dt);
    this.barShakeE = Math.max(0, this.barShakeE - dt);
    for (let i = 0; i < 3; i++) { this.gateFlash[i] = Math.max(0, this.gateFlash[i] - dt * 2); this.caveFlash[i] = Math.max(0, this.caveFlash[i] - dt * 2); }
    for (const k in this.cardShake) this.cardShake[k] = Math.max(0, this.cardShake[k] - dt);
    this.ghostP = U.approach(this.ghostP, this.playerHP, dt * 25);
    this.ghostE = U.approach(this.ghostE, this.enemyHP, dt * 25);
    this.banners.forEach((b) => { b.t += dt; });
    this.banners = this.banners.filter((b) => b.t < b.dur);
    for (const e of this.eyes) { e.t -= dt; if (e.t <= 0) { e.open = e.open ? 0 : 1; e.t = e.open ? U.rand(1.5, 4) : 0.15; } }

    this.ambient(gdt);

    if (this.state === 'intro') {
      const marks = [1.0, 1.6, 2.2];
      marks.forEach((m) => { if (this.stateT - dt < m && this.stateT >= m) Sound.play('count'); });
      if (this.stateT >= 2.8) {
        this.state = 'play';
        this.stateT = 0;
        Sound.play('horn');
        Game.shake(8, 0.4);
      }
      return;
    }

    if (this.state === 'play') {
      this.time = Math.max(0, this.time - gdt);
      this.stats.time = BATTLE.duration - this.time;
      this.energy = Math.min(BATTLE.maxEnergy, this.energy + BATTLE.energyRate * this.diff.player * gdt);
      for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - gdt);
      const wasReady = this.ability.charge >= 1;
      this.ability.charge = Math.min(1, this.ability.charge + gdt / BATTLE.abilityCharge);
      if (!wasReady && this.ability.charge >= 1) { Sound.play('ready'); this.fx.ring(62, 64, 44, 90, 0.6, 'rgba(255,220,120,0.9)', 6, 2); }
      this.aiUpdate(gdt);
      // scripted events
      for (const at of this.L.roars) {
        if (!this.roarsDone.includes(at) && this.time <= at) {
          this.roarsDone.push(at);
          this.roarT = 6;
          this.redFlash = 0.5;
          Sound.play('roar');
          Game.shake(10, 0.8);
          this.banner('THE DESTROYER ROARS!', 'The brutes are enraged for 6 seconds', '#ff5a3a', 2.4);
        }
      }
      if (this.L.boss && !this.bossSpawned && this.time <= this.L.boss.at) this.spawnBoss();
      this.roarT = Math.max(0, this.roarT - gdt);
      // countdown ticks
      const sec = Math.ceil(this.time);
      if (sec <= 10 && sec < this.lastTick && sec > 0) { this.lastTick = sec; Sound.play(sec % 2 ? 'tick' : 'tock'); }
      // low health heartbeat
      if (this.playerHP <= 30 && this.playerHP > 0) {
        this.heartT -= gdt;
        if (this.heartT <= 0) { this.heartT = 1.3; Sound.play('heartbeat'); }
      }
    }

    // simulation
    for (const u of this.units) u.update(gdt);
    this.units = this.units.filter((u) => !u.removed);
    this.updateProjectiles(gdt);
    this.updateVolley(gdt);
    this.slashes.forEach((s) => { s.t += gdt; });
    this.slashes = this.slashes.filter((s) => s.t < s.life);
    this.updateOrbs(dt);

    if (this.state === 'play') this.checkEnd();
    if (this.state === 'end' && this.stateT > 2.8 && !this.left) {
      this.left = true;
      Game.go('result', this.result);
    }
  },

  updateProjectiles(dt) {
    for (const p of this.projs) {
      p.t += dt;
      if (p.t < 0) continue;
      if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.y - p.target.d.h * 0.5; }
      const dist = Math.abs(p.tx - p.sx) + 1;
      const dur = U.clamp(dist / (p.kind === 'spear' ? 640 : 720), 0.18, 0.7);
      const k = Math.min(1, p.t / dur);
      const arc = dist * (p.kind === 'spear' ? 0.08 : 0.16);
      const nx = U.lerp(p.sx, p.tx, k);
      const ny = U.lerp(p.sy, p.ty, k) - arc * 4 * k * (1 - k);
      p.ang = Math.atan2(ny - p.y, nx - p.x) || p.ang;
      p.x = nx; p.y = ny;
      if (Math.random() < 0.6) {
        this.fx.add({ shape: 'circle', x: p.x, y: p.y, life: 0.2, size: p.kind === 'spear' ? 2.5 : 1.8, size2: 0.3, color: p.side === 'beast' ? 'rgba(140,255,160,0.7)' : 'rgba(255,240,200,0.7)' });
      }
      if (k >= 1) {
        p.done = true;
        const t = p.target;
        if (t && !t.dead) {
          const hit = this.damage(t, p.dmg, p.src);
          if (hit && p.kind === 'spear') {
            this.fx.burst(p.x, p.y, 8, { shape: 'spark', color: ['#ffffff', '#d0e0ff'], speed: 260, life: 0.3, size: 2.5, drag: 3, add: true });
          }
          if (p.pierce) {
            let next = null, nd = 1e9;
            for (const o of this.units) {
              if (o === t || o.dead || o.side === p.side || o.lane !== p.lane) continue;
              const dx = (o.x - t.x) * (p.side === 'human' ? 1 : -1);
              if (dx > 0 && dx < 110 && dx < nd) { nd = dx; next = o; }
            }
            if (next) {
              this.damage(next, p.dmg * 0.6, p.src);
              this.fx.text(next.x, next.y - next.d.h - 30, 'PIERCE!', { color: '#a8d8ff', size: 14, vy: -50, life: 0.7 });
            }
          }
        } else {
          this.fx.add({ shape: 'circle', x: p.x, y: p.y + 30, life: 0.6, size: 2, color: 'rgba(90,60,30,0.6)' });
        }
      }
    }
    this.projs = this.projs.filter((p) => !p.done);
  },

  updateVolley(dt) {
    for (const v of this.volley) {
      v.t += dt;
      if (v.t >= v.dur && !v.done) {
        v.done = true;
        const y = BATTLE.lanes[v.lane];
        Sound.play('burn');
        this.fx.burst(v.x, y - 6, 12, { shape: 'spark', color: ['#ffd36a', '#ff7a2a', '#ffffff'], speed: 260, life: 0.45, size: 2.5, drag: 3, add: true, angle: -Math.PI / 2, spread: 1.3 });
        this.fx.add({ shape: 'glow', x: v.x, y: y - 10, size: 70, size2: 20, life: 0.35, color: 'rgba(255,150,50,1)', add: true });
        this.fx.burst(v.x, y - 10, 4, { shape: 'smoke', color: 'rgba(80,60,50,0.5)', speed: 50, life: 0.8, size: 10, size2: 24, drag: 2, g: -40 });
        for (const o of this.units) {
          if (o.side === 'beast' && !o.dead && o.lane === v.lane && Math.abs(o.x - v.x) < 58) this.damage(o, 26, null, { noCrit: true, sure: true });
        }
      }
    }
    this.volley = this.volley.filter((v) => v.t < v.dur + 0.05);
  },

  updateOrbs(dt) {
    const tx = 300, ty = 126;
    for (const o of this.orbs) {
      o.t += dt / 0.8;
      const k = U.ease.inOut(Math.min(1, o.t));
      const cx = (o.sx + tx) / 2, cy = Math.min(o.sy, ty) - 160;
      o.x = (1 - k) * (1 - k) * o.sx + 2 * (1 - k) * k * cx + k * k * tx;
      o.y = (1 - k) * (1 - k) * o.sy + 2 * (1 - k) * k * cy + k * k * ty;
      if (Math.random() < 0.8) this.fx.add({ shape: 'glow', x: o.x, y: o.y, life: 0.35, size: 10, size2: 2, color: 'rgba(255,210,90,1)', add: true, layer: 2 });
      if (o.t >= 1 && !o.done) {
        o.done = true;
        this.energy = Math.min(BATTLE.maxEnergy, this.energy + o.n);
        Sound.play('coin');
        this.fx.text(tx + 170, ty - 6, `+${o.n}`, { color: '#ffe07a', size: 20, vy: -40, life: 0.9 });
        this.fx.burst(tx, ty, 8, { shape: 'star', color: '#ffe07a', speed: 120, life: 0.5, size: 5, size2: 1, layer: 2 });
      }
    }
    this.orbs = this.orbs.filter((o) => !o.done);
  },

  ambient(dt) {
    const fx = this.fx;
    if (this.L.night) {
      if (Math.random() < dt * 14) fx.add({ shape: 'glow', x: U.rand(150, 1130), y: H + 5, vx: U.rand(-10, 10), vy: U.rand(-40, -80), life: U.rand(3, 6), size: U.rand(2, 5), size2: 1, color: 'rgba(255,120,40,1)', add: true, layer: 1, fadeIn: 0.5 });
    } else {
      if (Math.random() < dt * 3) fx.add({ shape: 'glow', x: U.rand(200, 1100), y: U.rand(160, 700), vx: U.rand(-10, 10), vy: U.rand(-10, 5), life: U.rand(3, 5), size: U.rand(2, 3.5), size2: 1, color: 'rgba(255,255,200,1)', add: true, layer: 1, fadeIn: 1 });
      if (Math.random() < dt * 0.6) fx.add({ shape: 'leaf', x: -10, y: U.rand(160, 600), vx: U.rand(40, 90), vy: U.rand(-10, 20), life: 14, size: 5, color: U.pick(['#9ac850', '#c8b040', '#6a9a30']), vr: U.rand(-3, 3), layer: 1 });
    }
  },

  checkEnd() {
    let win = null, reason = '';
    if (this.enemyHP <= 0) { win = true; reason = 'The Brute Cave has been overrun!'; }
    else if (this.playerHP <= 0) { win = false; reason = 'The beasts have broken through the gates…'; }
    else if (this.time <= 0) {
      win = this.playerHP > this.enemyHP;
      const score = `(${Math.ceil(this.playerHP)} vs ${Math.ceil(this.enemyHP)})`;
      if (win) reason = `Time's up — your forces held stronger ${score}`;
      else if (this.playerHP === this.enemyHP) reason = `Time's up — a stalemate ${score}. Breach the Brute Cave to win!`;
      else reason = `Time's up — the brutes held stronger ${score}`;
    }
    if (win === null) return;
    this.state = 'end';
    this.stateT = 0;
    this.timeScale = 0.35;
    this.slowT = 0;
    this.selected = null;
    this.ability.targeting = false;
    const stars = win ? (this.playerHP >= 75 ? 3 : this.playerHP >= 40 ? 2 : 1) : 0;
    if (win) {
      const P = Game.progress;
      P.unlocked = Math.max(P.unlocked, this.levelNum + 1);
      P.stars[this.levelNum] = Math.max(P.stars[this.levelNum] || 0, stars);
      Game.saveProgress();
      this.whiteFlash = 0.6;
      Sound.play('boom');
    } else {
      this.redFlash = 1;
      Sound.play('breach');
    }
    Sound.music(null);
    Game.shake(14, 0.8);
    this.result = { win, level: this.levelNum, stars, stats: Object.assign({}, this.stats), reason };
  },

  /* -------------------------------- input -------------------------------- */
  onPointerMove(x, y) {
    const overCard = HUMAN_ROSTER.some((k, i) => { const c = this.cardPos(i); return Math.hypot(x - c.x, y - c.y) < 34; });
    const overMed = Math.hypot(x - 62, y - 64) < 48;
    const lane = this.laneAt(x, y);
    this.cursor = overCard || overMed || (lane >= 0 && (this.selected || this.ability.targeting)) ? 'pointer' : 'default';
  },

  onPointerDown(x, y) {
    if (this.paused || this.state === 'end') return;
    if (Math.hypot(x - 62, y - 64) < 50) { this.toggleAbility(); return; }
    for (let i = 0; i < HUMAN_ROSTER.length; i++) {
      const c = this.cardPos(i);
      if (Math.hypot(x - c.x, y - c.y) < 36) { this.select(HUMAN_ROSTER[i]); return; }
    }
    const lane = this.laneAt(x, y);
    if (lane < 0) return;
    if (this.state !== 'play') return;
    if (this.ability.targeting) { this.castVolley(lane); return; }
    if (this.selected) this.deploy(this.selected, lane);
    else {
      Sound.play('error');
      this.fx.text(x, y - 20, 'Pick a warrior first!', { color: '#ffe0a0', size: 18, vy: -30, life: 1 });
      HUMAN_ROSTER.forEach((k) => { this.cardShake[k] = 0.4; });
    }
  },

  select(key) {
    this.ability.targeting = false;
    this.selected = this.selected === key ? null : key;
    if (this.selected) Sound.play('select'); else Sound.play('back');
  },

  toggleAbility() {
    if (this.state !== 'play') return;
    if (this.ability.charge < 1) {
      Sound.play('error');
      this.fx.text(62, 140, `Charging ${Math.floor(this.ability.charge * 100)}%`, { color: '#ffe0a0', size: 15, vy: -20, life: 0.9 });
      return;
    }
    this.ability.targeting = !this.ability.targeting;
    Sound.play(this.ability.targeting ? 'select' : 'back');
  },

  onKey(k) {
    if (this.state === 'end') return;
    if (k === 'Escape' || k === 'p' || k === 'P') { if (this.paused) this.resume(); else if (this.ability.targeting) this.ability.targeting = false; else this.pause(); return true; }
    if (this.paused) return;
    const idx = ['1', '2', '3', '4'].indexOf(k);
    if (idx >= 0) { this.select(HUMAN_ROSTER[idx]); return true; }
    if (k === ' ') { this.toggleAbility(); return true; }
  },

  /* --------------------------------- draw -------------------------------- */
  draw(ctx) {
    const t = Game.time;
    ctx.drawImage(this.bg, 0, 0);
    this.drawProps(ctx, t);
    this.drawLaneHighlight(ctx, t);
    this.fx.draw(ctx, 0);
    // shadows
    for (const u of this.units) {
      const a = u.dead ? Math.max(0, 1 - u.deadT) : Math.min(1, u.spawnT * 4);
      ctx.fillStyle = `rgba(0,0,0,${0.28 * a})`;
      ctx.beginPath(); ctx.ellipse(u.x, u.y + 2, u.d.r * 1.4, u.d.r * 0.38, 0, 0, TAU); ctx.fill();
    }
    const sorted = this.units.slice().sort((a, b) => a.y - b.y);
    for (const u of sorted) this.drawUnit(ctx, u);
    this.drawGhost(ctx);
    for (const p of this.projs) if (p.t >= 0) this.drawProjectile(ctx, p);
    this.drawSlashes(ctx);
    this.drawVolley(ctx);
    this.fx.draw(ctx, 1);
    this.fx.drawTexts(ctx);
    if (this.L.night) Art.vignette(ctx, 0.35);
    if (this.redFlash > 0 || (this.playerHP <= 30 && this.state === 'play')) {
      const pulse = this.playerHP <= 30 ? 0.25 + Math.sin(t * 5) * 0.12 : 0;
      Art.vignette(ctx, 0, `rgba(200,0,0,${Math.max(this.redFlash * 0.7, pulse)})`);
    }
    if (this.roarT > 0) Art.vignette(ctx, 0, `rgba(255,60,20,${Math.min(0.35, this.roarT * 0.1)})`);
    this.drawHUD(ctx, t);
    this.fx.draw(ctx, 2);
    this.drawBanners(ctx);
    if (this.state === 'intro') this.drawIntro(ctx);
    if (this.whiteFlash > 0) { ctx.fillStyle = `rgba(255,250,235,${this.whiteFlash * 0.6})`; ctx.fillRect(0, 0, W, H); }
    if (this.state === 'end') this.drawEnd(ctx);
    if (this.paused) this.drawPause(ctx);
  },

  drawProps(ctx, t) {
    const lanes = BATTLE.lanes;
    if (!this.L.night) {
      [351, 529, 712].forEach((ty, i) => Art.flag(ctx, 30, ty - 70, t + i * 0.7, '#d8262b', '#ffffff'));
      [(lanes[0] + lanes[1]) / 2 + 40, (lanes[1] + lanes[2]) / 2 + 40].forEach((y, i) => Art.banner(ctx, 1128, y, t + i, '#b3382a'));
    } else {
      // lava cracks glow
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      (Art.lavaCracks || []).forEach((pts, i) => {
        const a = 0.45 + Math.sin(t * 2 + i) * 0.25;
        ctx.strokeStyle = `rgba(255,90,20,${a * 0.5})`; ctx.lineWidth = 9;
        ctx.beginPath(); pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.strokeStyle = `rgba(255,190,80,${a})`; ctx.lineWidth = 3;
        ctx.stroke();
      });
      ctx.restore();
      [300, 520, 760, 980].forEach((x) => Art.torch(ctx, x, 150, t, 0.9));
      // glowing eyes in tunnels
      this.eyes.forEach((e, i) => {
        if (!e.open) return;
        const cx = 1196, cy = lanes[i] - 44;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(Art.glow('rgba(255,40,20,1)'), cx - 30, cy - 18, 60, 36);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#ffdd88';
        ctx.beginPath(); ctx.ellipse(cx - 10, cy, 4, 2.5, 0.2, 0, TAU); ctx.ellipse(cx + 10, cy, 4, 2.5, -0.2, 0, TAU); ctx.fill();
      });
      [(lanes[0] + lanes[1]) / 2 + 40, (lanes[1] + lanes[2]) / 2 + 40].forEach((y, i) => Art.banner(ctx, 1128, y, t + i, '#6a1a2a'));
    }
    // gate & cave flashes
    for (let i = 0; i < 3; i++) {
      const y = lanes[i] - 40;
      if (this.gateFlash[i] > 0) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = this.gateFlash[i];
        ctx.drawImage(Art.glow('rgba(255,210,120,1)'), 80, y - 80, 160, 160);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      if (this.caveFlash[i] > 0) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = this.caveFlash[i];
        ctx.drawImage(Art.glow('rgba(255,120,60,1)'), 1110, y - 80, 160, 160);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
  },

  drawLaneHighlight(ctx, t) {
    if (!(this.selected || this.ability.targeting) || this.state === 'end' || this.paused) return;
    const lane = this.laneAt(Game.mouse.x, Game.mouse.y);
    const volley = this.ability.targeting;
    BATTLE.lanes.forEach((ly, i) => {
      const on = i === lane;
      const a = on ? 0.3 : 0.08;
      ctx.fillStyle = volley ? `rgba(255,140,40,${a})` : `rgba(255,230,140,${a})`;
      UI.roundRect(ctx, 180, ly - 78, 930, 96, 20); ctx.fill();
      if (on) {
        ctx.strokeStyle = volley ? 'rgba(255,160,60,0.9)' : 'rgba(255,230,140,0.8)';
        ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 40;
        UI.roundRect(ctx, 180, ly - 78, 930, 96, 20); ctx.stroke();
        ctx.setLineDash([]);
        // chevrons
        ctx.fillStyle = volley ? 'rgba(255,200,120,0.6)' : 'rgba(255,245,200,0.55)';
        for (let k = 0; k < 7; k++) {
          const x = 240 + ((k * 130 + t * 160) % 910);
          ctx.beginPath(); ctx.moveTo(x, ly - 44); ctx.lineTo(x + 16, ly - 30); ctx.lineTo(x, ly - 16); ctx.lineTo(x + 6, ly - 30); ctx.closePath(); ctx.fill();
        }
      }
    });
  },

  drawGhost(ctx) {
    if (!this.selected || this.state !== 'play' || this.paused) return;
    const lane = this.laneAt(Game.mouse.x, Game.mouse.y);
    if (lane < 0) return;
    const d = UNITS[this.selected];
    const ok = this.energy >= d.cost && this.cd[this.selected] <= 0;
    Art.drawSprite(ctx, this.selected, BATTLE.fortX + 24, BATTLE.lanes[lane], d.h, { alpha: 0.45 + Math.sin(Game.time * 6) * 0.1, tint: ok ? null : '#ff2020', tintAlpha: ok ? 0 : 0.5 });
  },

  drawUnit(ctx, u) {
    const d = u.d;
    let x = u.x + u.knock, y = u.y, rot = 0, sx = 1, sy = 1, alpha = 1;
    if (u.spawnT < 0.35) {
      const k = U.ease.outBack(Math.min(1, u.spawnT / 0.35));
      sx = sy = Math.max(0.05, k);
      alpha = Math.min(1, u.spawnT * 6);
    }
    if (u.state === 'walk' && !u.dead && u.reviving <= 0) {
      const ph = u.walkT * (5 + d.speed * 0.06);
      y -= Math.abs(Math.sin(ph)) * (d.h > 120 ? 3 : 5);
      rot = Math.sin(ph) * 0.05;
    } else {
      sy *= 1 + Math.sin(Game.time * 3 + u.id) * 0.012;
    }
    if (u.atkAnim > 0) {
      const k = u.atkAnim;
      const lunge = k < 0.5 ? U.ease.outCubic(k / 0.5) : 1 - U.ease.inCubic((k - 0.5) / 0.5);
      if (d.melee) {
        const wind = k < 0.25 ? -Math.sin((k / 0.25) * Math.PI) * 0.12 : 0;
        x += u.dir * lunge * (d.splash ? 10 : 16);
        rot += u.dir * (lunge * (d.splash ? 0.22 : 0.15) + wind);
        if (d.splash) sy *= 1 + lunge * 0.06;
      } else {
        x -= u.dir * lunge * 5;
        sx *= 1 - lunge * 0.06;
      }
    }
    if (u.dodgeT > 0) {
      const k = u.dodgeT / 0.35;
      y -= Math.sin(k * Math.PI) * 18;
      x -= u.dir * Math.sin(k * Math.PI) * 14;
      alpha *= u.key === 'keljeon' ? 0.35 : 0.75;
    }
    if (u.dead) {
      const k = Math.min(1, u.deadT / 0.5);
      rot = -u.dir * U.ease.outBounce(k) * 1.4;
      alpha = 1 - Math.max(0, (u.deadT - 0.5) / 0.7);
      y += k * 4;
    }
    if (u.reviving > 0) {
      const k = Math.min(1, (1.2 - u.reviving) / 0.3);
      const up = Math.max(0, 1 - u.reviving / 0.4);
      rot = -u.dir * 1.3 * k * (1 - up);
    }
    const o = { flip: u.side === 'beast', rot, sx, sy, alpha, flash: u.flash * 0.85 };
    if (u.enraged) { o.tint = '#ff1a0a'; o.tintAlpha = 0.22 + Math.sin(Game.time * 10) * 0.1; }
    if (u.key === 'destroyer') { o.glowColor = '#ff4a1a'; o.glowAlpha = 0.45 + Math.sin(Game.time * 4) * 0.2; o.glowSize = 4; }
    else if (u.reviving > 0) { o.glowColor = '#5dff9a'; o.glowAlpha = 0.8; }
    else if (u.roared()) { o.glowColor = '#ff3a1a'; o.glowAlpha = 0.55; }
    else if (u.key === 'keljeon' && this.L.night) { o.glowColor = '#9a5aff'; o.glowAlpha = 0.45; }
    Art.drawSprite(ctx, u.key, x, y, d.h, o);
    // health bar
    if (!u.dead && u.reviving <= 0 && (u.hpShow > 0 || d.boss)) {
      const w = d.boss ? 120 : 46, bx = u.x - w / 2, by = u.y - d.h - (d.boss ? 18 : 10);
      const a = d.boss ? 1 : Math.min(1, u.hpShow);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      UI.roundRect(ctx, bx - 2, by - 2, w + 4, (d.boss ? 10 : 7) + 4, 4); ctx.fill();
      ctx.fillStyle = u.side === 'human' ? '#5ad86a' : d.boss ? '#ff5a2a' : '#ff4a4a';
      UI.roundRect(ctx, bx, by, Math.max(2, w * (u.hp / u.maxHp)), d.boss ? 10 : 7, 3); ctx.fill();
      ctx.globalAlpha = 1;
      if (d.boss) UI.text(ctx, 'INSINUATED DESTROYER', u.x, by - 12, { size: 12, color: '#ffd0b0', stroke: '#000', strokeWidth: 3, weight: 900 });
    }
  },

  drawProjectile(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    if (p.kind === 'spear') {
      ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(-38, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.strokeStyle = '#b8302a'; ctx.lineWidth = 2;
      ctx.beginPath(); for (let i = -34; i < 4; i += 6) ctx.lineTo(i, Math.sin(i * 0.6) * 2.5); ctx.stroke();
      ctx.fillStyle = '#e8eef4';
      ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(20, 0); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill();
    } else {
      ctx.strokeStyle = '#7a5430'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = '#d8dde4';
      ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(13, 0); ctx.lineTo(6, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = p.side === 'beast' ? '#5ac85a' : '#f0c040';
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-24, -4); ctx.lineTo(-14, 0); ctx.lineTo(-24, 4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  drawSlashes(ctx) {
    for (const s of this.slashes) {
      const k = s.t / s.life;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(s.dir, 1);
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.lineCap = 'round';
      const a0 = -1.2 + k * 0.6, a1 = a0 + 1.6 * U.ease.outCubic(Math.min(1, k * 2.5));
      ctx.beginPath(); ctx.arc(-s.r * 0.4, 0, s.r, a0, a1); ctx.stroke();
      ctx.globalAlpha = (1 - k) * 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-s.r * 0.4, 0, s.r * 0.75, a0 + 0.2, a1); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  drawVolley(ctx) {
    for (const v of this.volley) {
      if (v.t < 0 || v.done) continue;
      const k = Math.min(1, v.t / v.dur);
      const ty = BATTLE.lanes[v.lane] - 10;
      const x = v.x - (1 - k) * 140, y = U.lerp(-40, ty, U.ease.inCubic(k));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(ty + 40, 140));
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(Art.glow('rgba(255,140,40,1)'), -40, -14, 50, 28);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = '#ffd36a';
      ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(16, 0); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  },

  /* ---------------------------------- HUD --------------------------------- */
  drawHUD(ctx, t) {
    // trays
    ctx.fillStyle = 'rgba(40,14,8,0.72)';
    UI.roundRect(ctx, 126, 44, 348, 94, 14); ctx.fill();
    UI.roundRect(ctx, 806, 44, 348, 94, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(226,178,74,0.6)'; ctx.lineWidth = 2;
    UI.roundRect(ctx, 126, 44, 348, 94, 14); ctx.stroke();
    UI.roundRect(ctx, 806, 44, 348, 94, 14); ctx.stroke();

    // health bars
    const shP = this.barShakeP > 0 ? U.rand(-4, 4) : 0;
    const shE = this.barShakeE > 0 ? U.rand(-4, 4) : 0;
    this.healthBar(ctx, 122 + shP, 12, 440, this.playerHP, this.ghostP, 'LORD GODWIN', false);
    this.healthBar(ctx, 718 + shE, 12, 440, this.enemyHP, this.ghostE, 'INSINUATED DESTROYER', true);

    // leader medallions
    const ab = this.ability;
    const ready = ab.charge >= 1;
    if (ready) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.3;
      ctx.drawImage(Art.glow('rgba(255,210,90,1)'), 62 - 80, 64 - 80, 160, 160);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    Art.portrait(ctx, 'godwin', 62, 64, 44);
    UI.ring(ctx, 62, 64, 44, 6, ab.targeting ? '#ff8a3a' : null);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(62, 64, 53, 0, TAU); ctx.stroke();
    ctx.strokeStyle = ready ? '#ffe07a' : '#e0a040'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(62, 64, 53, -Math.PI / 2, -Math.PI / 2 + TAU * ab.charge); ctx.stroke();
    ctx.lineCap = 'butt';
    const lbl = ab.targeting ? 'PICK LANE' : ready ? 'VOLLEY!' : `${Math.floor(ab.charge * 100)}%`;
    ctx.fillStyle = ab.targeting ? '#b0321a' : ready ? '#7a1a14' : 'rgba(30,12,6,0.85)';
    UI.roundRect(ctx, 14, 112, 96, 22, 11); ctx.fill();
    ctx.strokeStyle = '#e2b24a'; ctx.lineWidth = 1.5; UI.roundRect(ctx, 14, 112, 96, 22, 11); ctx.stroke();
    UI.text(ctx, lbl, 62, 124, { size: 12, weight: 900, color: ready ? '#fff0c0' : '#e0c090' });

    Art.portrait(ctx, 'destroyer', 1218, 64, 44, { flip: true, bg1: '#f0a080', bg2: '#6a1a10' });
    UI.ring(ctx, 1218, 64, 44, 6, this.roarT > 0 ? '#ff3a1a' : null);
    ctx.fillStyle = 'rgba(30,12,6,0.85)';
    UI.roundRect(ctx, 1170, 112, 96, 22, 11); ctx.fill();
    ctx.strokeStyle = '#e2b24a'; ctx.lineWidth = 1.5; UI.roundRect(ctx, 1170, 112, 96, 22, 11); ctx.stroke();
    UI.text(ctx, this.roarT > 0 ? 'ENRAGED' : 'BRUTES', 1218, 124, { size: 12, weight: 900, color: this.roarT > 0 ? '#ff8a6a' : '#e0c090' });

    // cards
    HUMAN_ROSTER.forEach((k, i) => this.drawCard(ctx, k, i, t));

    // courage meter
    const mx = 140, my = 122, mw = 290, seg = BATTLE.maxEnergy;
    for (let i = 0; i < seg; i++) {
      const sx = mx + i * (mw / seg);
      const fill = U.clamp(this.energy - i, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      UI.roundRect(ctx, sx, my - 5, mw / seg - 3, 10, 4); ctx.fill();
      if (fill > 0) {
        const g = ctx.createLinearGradient(0, my - 5, 0, my + 5);
        g.addColorStop(0, fill >= 1 ? '#fff0a0' : '#c8a040'); g.addColorStop(1, fill >= 1 ? '#e8a020' : '#8a6020');
        ctx.fillStyle = g;
        UI.roundRect(ctx, sx, my - 5, (mw / seg - 3) * fill, 10, 4); ctx.fill();
      }
    }
    UI.text(ctx, `⚡${Math.floor(this.energy)}`, 452, my, { size: 17, weight: 900, color: '#ffe07a', stroke: '#2a0a02', strokeWidth: 3 });

    // timer
    const tl = this.time;
    const low = tl <= 15;
    const pulse = low && this.state === 'play' ? 1 + Math.max(0, Math.sin(t * 8)) * 0.06 : 1;
    ctx.save();
    ctx.translate(640, 62);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(2, 5, 50, 0, TAU); ctx.fill();
    const disc = ctx.createRadialGradient(-10, -14, 4, 0, 0, 50);
    disc.addColorStop(0, '#f2eee4'); disc.addColorStop(1, '#bdb6a6');
    ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(0, 0, 48, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 41, 0, TAU); ctx.stroke();
    ctx.strokeStyle = low ? '#e0322a' : '#4ec8d0'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, 41, -Math.PI / 2, -Math.PI / 2 + TAU * (tl / BATTLE.duration)); ctx.stroke();
    ctx.lineCap = 'butt';
    UI.text(ctx, 'TIME LEFT', 0, -16, { size: 10, weight: 900, color: '#5a5048' });
    UI.text(ctx, String(Math.ceil(tl)), 0, 10, { size: 30, weight: 900, color: low ? '#c8201a' : '#3a3028' });
    ctx.restore();

    // pause button
    if (this.state === 'play') {
      const b = this.pauseBtn;
      UI.drawButton(ctx, b);
      UI.icon(ctx, 'pause', b.x, b.y + 1, 14, '#f6e7c1');
    }

    // enemy info tray
    const ai = this.ai;
    UI.text(ctx, 'NEXT BRUTE', 862, 58, { size: 11, weight: 900, color: '#e0c090' });
    if (ai.next) {
      const prog = U.clamp(ai.energy / UNITS[ai.next].cost, 0, 1);
      Art.portrait(ctx, ai.next, 862, 96, 26, { flip: true, bg1: '#f0a080', bg2: '#6a1a10' });
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(862, 96, 30, 0, TAU); ctx.stroke();
      ctx.strokeStyle = prog >= 1 ? '#ff5a3a' : '#e07a4a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(862, 96, 30, -Math.PI / 2, -Math.PI / 2 + TAU * prog); ctx.stroke();
    }
    const nm = ai.next ? UNITS[ai.next].name : '…';
    UI.text(ctx, nm, 902, 84, { size: 14, weight: 900, color: '#ffd0b0', align: 'left' });
    UI.text(ctx, ai.next ? UNITS[ai.next].blurb : '', 902, 102, { size: 11, color: '#d8b898', align: 'left', font: FONT_BODY, weight: 700 });
    const wv = this.L.surgeEvery;
    UI.text(ctx, `Wave in ${Math.ceil(ai.surgeT)}s`, 902, 124, { size: 12, weight: 900, color: '#ff9a7a', align: 'left' });
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; UI.roundRect(ctx, 1000, 119, 140, 8, 4); ctx.fill();
    ctx.fillStyle = '#ff7a4a'; UI.roundRect(ctx, 1000, 119, 140 * (1 - ai.surgeT / wv), 8, 4); ctx.fill();

    // tooltip for hovered / selected card
    const hov = HUMAN_ROSTER.find((k, i) => { const c = this.cardPos(i); return Math.hypot(Game.mouse.x - c.x, Game.mouse.y - c.y) < 34; });
    const tipKey = hov || (this.state === 'play' && this.selected && !this.laneHover() ? this.selected : null);
    if (tipKey && !this.paused && this.state !== 'end') {
      const d = UNITS[tipKey];
      const i = HUMAN_ROSTER.indexOf(tipKey);
      const x = Math.max(130, this.cardPos(i).x - 150), y = 146;
      ctx.fillStyle = 'rgba(25,10,5,0.92)';
      UI.roundRect(ctx, x, y, 300, 62, 10); ctx.fill();
      ctx.strokeStyle = '#e2b24a'; ctx.lineWidth = 1.5; UI.roundRect(ctx, x, y, 300, 62, 10); ctx.stroke();
      UI.text(ctx, `${d.name} · ${d.role}`, x + 12, y + 17, { size: 15, weight: 900, color: '#ffe7a8', align: 'left' });
      UI.text(ctx, `⚡${d.cost}`, x + 288, y + 17, { size: 15, weight: 900, color: '#ffd36a', align: 'right' });
      UI.text(ctx, d.blurb, x + 12, y + 42, { size: 13, color: '#e8d0b0', align: 'left', font: FONT_BODY, weight: 700 });
    }
    if (this.state === 'play' && !this.selected && !this.ability.targeting && this.stats.deployed === 0 && this.stateT < 12) {
      const a = 0.6 + Math.sin(t * 4) * 0.4;
      UI.text(ctx, '▲ Tap a warrior, then tap a lane to send them into battle!', 330, 166, { size: 17, weight: 900, color: '#fff3c0', alpha: a, stroke: '#1a0802', strokeWidth: 4 });
    }
    if (this.ability.targeting) {
      UI.text(ctx, 'Choose a lane for the Royal Volley!', 640, 170, { size: 22, weight: 900, color: '#ffb84a', stroke: '#1a0802', strokeWidth: 5 });
    }
  },

  laneHover() { return this.laneAt(Game.mouse.x, Game.mouse.y) >= 0; },

  healthBar(ctx, x, y, w, hp, ghost, name, enemy) {
    const f = hp / BATTLE.baseHP, g = ghost / BATTLE.baseHP;
    ctx.save();
    if (enemy) { ctx.translate(x * 2 + w, 0); ctx.scale(-1, 1); }
    UI.bar(ctx, x, y, w, 22, f, enemy ? '#ff6a4a' : '#ff4a4a', enemy ? '#a0180e' : '#9a1a14', g);
    ctx.restore();
    UI.text(ctx, name, enemy ? x + w - 12 : x + 12, y + 12, { size: 13, weight: 900, color: '#fff3e0', align: enemy ? 'right' : 'left', stroke: 'rgba(0,0,0,0.7)', strokeWidth: 3 });
    UI.text(ctx, String(Math.ceil(hp)), enemy ? x + 14 : x + w - 14, y + 12, { size: 15, weight: 900, color: '#fff3e0', align: enemy ? 'left' : 'right', stroke: 'rgba(0,0,0,0.7)', strokeWidth: 3 });
  },

  drawCard(ctx, key, i, t) {
    const d = UNITS[key];
    const c = this.cardPos(i);
    const sel = this.selected === key;
    const cd = this.cd[key];
    const afford = this.energy >= d.cost;
    const ok = afford && cd <= 0;
    const hov = Math.hypot(Game.mouse.x - c.x, Game.mouse.y - c.y) < 34;
    const shake = this.cardShake[key] > 0 ? Math.sin(this.cardShake[key] * 60) * 4 : 0;
    const x = c.x + shake, y = c.y - (sel ? 6 : 0) - (hov ? 2 : 0);
    const r = sel ? 34 : 31;
    if (sel) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6 + Math.sin(t * 6) * 0.3;
      ctx.drawImage(Art.glow('rgba(255,220,110,1)'), x - 60, y - 60, 120, 120);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    Art.portrait(ctx, key, x, y, r, { gray: !ok });
    if (cd > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * (cd / d.cd)); ctx.closePath(); ctx.fill();
    }
    UI.ring(ctx, x, y, r, sel ? 5 : 4, sel ? '#ffd36a' : null);
    if (ok && !sel) {
      ctx.strokeStyle = `rgba(120,255,140,${0.5 + Math.sin(t * 4 + i) * 0.3})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r + 5, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = afford ? '#b0322a' : '#4a3a3a';
    ctx.beginPath(); ctx.arc(x + 23, y + 22, 12, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#f0c050'; ctx.lineWidth = 2; ctx.stroke();
    UI.text(ctx, String(d.cost), x + 23, y + 23, { size: 14, weight: 900, color: '#fff' });
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.arc(x - 24, y - 22, 9, 0, TAU); ctx.fill();
    UI.text(ctx, String(i + 1), x - 24, y - 21, { size: 11, weight: 900, color: '#e0c090' });
  },

  drawBanners(ctx) {
    this.banners.forEach((b, i) => {
      const ain = U.clamp(b.t / 0.25, 0, 1), aout = U.clamp((b.dur - b.t) / 0.35, 0, 1);
      const a = Math.min(ain, aout);
      const y = 250 + i * 86;
      const s = 0.8 + U.ease.outBack(ain) * 0.2;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(640, y);
      ctx.scale(s, s);
      const g = ctx.createLinearGradient(-420, 0, 420, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.2, 'rgba(0,0,0,0.75)'); g.addColorStop(0.8, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(-420, -36, 840, 72);
      UI.text(ctx, b.title, 0, -8, { size: 32, weight: 900, color: b.color, stroke: '#1a0602', strokeWidth: 6 });
      if (b.sub) UI.text(ctx, b.sub, 0, 22, { size: 16, color: '#f0dcc0', font: FONT_BODY, weight: 700 });
      ctx.restore();
    });
  },

  drawIntro(ctx) {
    const t = this.stateT;
    ctx.fillStyle = `rgba(0,0,0,${0.35 * U.clamp(2.8 - t, 0, 1)})`;
    ctx.fillRect(0, 140, W, H - 140);
    if (t < 1.0) {
      const k = U.ease.outBack(U.clamp(t / 0.4, 0, 1));
      const a = U.clamp((1.0 - t) * 4, 0, 1);
      ctx.save(); ctx.translate(640, 380); ctx.scale(k, k); ctx.globalAlpha = a;
      UI.text(ctx, `LEVEL ${this.levelNum}`, 0, -30, { size: 64, weight: 900, font: FONT_HEAD, color: '#ffd84a', stroke: '#2a0a02', strokeWidth: 10 });
      UI.text(ctx, this.L.title, 0, 30, { size: 28, weight: 900, color: '#fff0d0', stroke: '#1a0602', strokeWidth: 5 });
      ctx.restore();
      return;
    }
    const n = t < 1.6 ? '3' : t < 2.2 ? '2' : t < 2.8 ? '1' : '';
    if (!n) return;
    const local = (t - 1.0) % 0.6;
    const k = 1 + (1 - U.ease.outCubic(U.clamp(local / 0.3, 0, 1))) * 1.2;
    ctx.save(); ctx.translate(640, 400); ctx.scale(k, k); ctx.globalAlpha = U.clamp(1 - local / 0.6 + 0.3, 0, 1);
    UI.text(ctx, n, 0, 0, { size: 150, weight: 900, font: FONT_HEAD, color: '#fff3c0', stroke: '#2a0a02', strokeWidth: 14, shadow: 'rgba(255,180,60,0.8)', shadowBlur: 30 });
    ctx.restore();
  },

  drawEnd(ctx) {
    const r = this.result;
    const t = this.stateT;
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.55, t * 0.5)})`;
    ctx.fillRect(0, 0, W, H);
    const k = U.ease.outElastic(U.clamp(t / 0.9, 0, 1));
    ctx.save(); ctx.translate(640, 360); ctx.scale(k, k);
    UI.text(ctx, r.win ? 'VICTORY!' : 'DEFEAT', 0, 0, { size: 110, weight: 900, font: FONT_TITLE, color: r.win ? '#ffd84a' : '#e0322a', stroke: '#1a0602', strokeWidth: 14, shadow: r.win ? 'rgba(255,200,80,0.9)' : 'rgba(0,0,0,0.9)', shadowBlur: 30 });
    ctx.restore();
    if (t > 0.6) UI.text(ctx, r.reason, 640, 450, { size: 22, weight: 900, color: '#fff0d0', stroke: '#1a0602', strokeWidth: 5, alpha: U.clamp((t - 0.6) * 3, 0, 1) });
    if (r.win && Math.random() < 0.3) this.fx.burst(U.rand(300, 980), U.rand(200, 500), 20, { shape: 'spark', color: U.pick(['#ffd36a', '#ff6a4a', '#6ab0ff', '#a0ff8a']), speed: 240, life: 0.9, size: 2.5, g: 120, drag: 1.4, layer: 2, add: true });
  },

  drawPause(ctx) {
    ctx.fillStyle = 'rgba(5,2,2,0.7)';
    ctx.fillRect(0, 0, W, H);
    UI.panel(ctx, 440, 170, 400, 420, 'dark');
    UI.text(ctx, 'PAUSED', 640, 222, { size: 42, weight: 900, font: FONT_TITLE, color: '#ffd84a', stroke: '#1a0602', strokeWidth: 6 });
    UI.drawButtons(ctx, this.pauseBtns);
  },
};
