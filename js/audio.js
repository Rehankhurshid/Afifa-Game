'use strict';
/* Procedural audio: every sound effect and music track is synthesized with the Web Audio API. */

const Sound = (() => {
  let ac = null, master, sfxBus, musicBus, noiseBuf, comp, reverb, reverbSend;
  const lastPlayed = {};

  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  function nf(n) {
    if (typeof n === 'number') return n;
    const m = /^([A-G][#b]?)(-?\d)$/.exec(n);
    if (!m) return 0;
    const midi = (parseInt(m[2], 10) + 1) * 12 + NOTE[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function makeImpulse(seconds, decay) {
    const len = Math.floor(ac.sampleRate * seconds);
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ac = new AC(); } catch (e) { return; }
      master = ac.createGain();
      master.gain.value = 0.9;
      comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4;
      comp.attack.value = 0.004; comp.release.value = 0.2;
      master.connect(comp); comp.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.connect(master);
      musicBus = ac.createGain(); musicBus.connect(master);
      reverb = ac.createConvolver(); reverb.buffer = makeImpulse(2.2, 3);
      reverbSend = ac.createGain(); reverbSend.gain.value = 0.22;
      reverbSend.connect(reverb); reverb.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applyVolumes();
      Music.start();
    }
    if (ac.state === 'suspended') ac.resume();
  }

  function applyVolumes() {
    if (!ac) return;
    const s = Game.settings;
    sfxBus.gain.setTargetAtTime(s.sfx, ac.currentTime, 0.05);
    musicBus.gain.setTargetAtTime(s.music * 0.4, ac.currentTime, 0.05);
  }

  function env(g, t0, vol, attack, dur, curve) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    if (curve === 'lin') g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    else g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  // Oscillator voice with pitch sweep and optional filter.
  function tone(o) {
    const t0 = o.t || ac.currentTime;
    const dur = o.dur || 0.2;
    const osc = ac.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(nf(o.f), t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, nf(o.f2)), t0 + (o.sweep || dur));
    if (o.detune) osc.detune.value = o.detune;
    if (o.vib) {
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = o.vib; lg.gain.value = o.vibDepth || 6;
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    const g = ac.createGain();
    env(g, t0, o.vol || 0.2, o.attack || 0.005, dur, o.curve);
    let node = osc;
    if (o.filter) {
      const f = ac.createBiquadFilter();
      f.type = o.filter; f.frequency.setValueAtTime(o.ff || 1200, t0);
      if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, t0 + dur);
      f.Q.value = o.q || 1;
      osc.connect(f); node = f;
    }
    node.connect(g);
    g.connect(o.dest || sfxBus);
    if (o.verb) { const s = ac.createGain(); s.gain.value = o.verb; g.connect(s); s.connect(reverbSend); }
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  // Filtered noise burst.
  function noise(o) {
    const t0 = o.t || ac.currentTime;
    const dur = o.dur || 0.2;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + (o.sweep || dur));
    f.Q.value = o.q || 1;
    const g = ac.createGain();
    env(g, t0, o.vol || 0.2, o.attack || 0.003, dur, o.curve);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
    if (o.verb) { const s = ac.createGain(); s.gain.value = o.verb; g.connect(s); s.connect(reverbSend); }
    src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.05);
  }

  const R = (a, b) => a + Math.random() * (b - a);

  const SFX = {
    hover: () => tone({ type: 'sine', f: 1400, f2: 1800, dur: 0.05, vol: 0.05 }),
    click: () => { tone({ type: 'square', f: 520, f2: 880, dur: 0.07, vol: 0.08, filter: 'lowpass', ff: 2400 }); noise({ f: 3000, dur: 0.03, vol: 0.08 }); },
    back: () => tone({ type: 'square', f: 700, f2: 380, dur: 0.09, vol: 0.07, filter: 'lowpass', ff: 2000 }),
    whoosh: () => noise({ filter: 'bandpass', f: 300, f2: 2400, dur: 0.45, vol: 0.28, attack: 0.15, q: 1.2 }),
    select: () => { tone({ type: 'triangle', f: 660, dur: 0.08, vol: 0.12 }); tone({ type: 'triangle', f: 990, dur: 0.12, vol: 0.1, t: ac.currentTime + 0.05 }); },
    error: () => { tone({ type: 'square', f: 160, dur: 0.12, vol: 0.1, filter: 'lowpass', ff: 900 }); tone({ type: 'square', f: 120, dur: 0.16, vol: 0.1, filter: 'lowpass', ff: 900, t: ac.currentTime + 0.09 }); },
    deploy: () => {
      const t = ac.currentTime;
      noise({ filter: 'bandpass', f: 500, f2: 2600, dur: 0.3, vol: 0.2, attack: 0.05 });
      tone({ type: 'triangle', f: 'A5', dur: 0.18, vol: 0.12, t: t + 0.05 });
      tone({ type: 'triangle', f: 'E6', dur: 0.3, vol: 0.1, t: t + 0.12, verb: 0.6 });
    },
    brute_spawn: () => {
      tone({ type: 'sawtooth', f: R(85, 110), f2: 60, dur: 0.45, vol: 0.12, filter: 'lowpass', ff: 500, vib: 18, vibDepth: 8 });
      noise({ filter: 'lowpass', f: 400, dur: 0.35, vol: 0.12 });
    },
    sword: () => {
      const t = ac.currentTime, b = R(0.9, 1.1);
      noise({ filter: 'highpass', f: 3000, dur: 0.07, vol: 0.22 });
      [1830, 2710, 4020].forEach((f, i) => tone({ type: i ? 'triangle' : 'square', f: f * b, dur: 0.22 - i * 0.04, vol: 0.05, t, filter: 'bandpass', ff: f * b, q: 6, verb: 0.3 }));
    },
    dagger: () => {
      const b = R(0.95, 1.15);
      noise({ filter: 'highpass', f: 4500, dur: 0.05, vol: 0.18 });
      tone({ type: 'triangle', f: 3200 * b, dur: 0.1, vol: 0.05, filter: 'bandpass', ff: 3200 * b, q: 8 });
      noise({ filter: 'bandpass', f: 2000, f2: 5000, dur: 0.08, vol: 0.08 });
    },
    club: () => {
      tone({ type: 'sine', f: 150, f2: 55, dur: 0.18, vol: 0.35 });
      noise({ filter: 'lowpass', f: 900, dur: 0.12, vol: 0.2 });
    },
    hammer: () => {
      tone({ type: 'sine', f: 110, f2: 32, dur: 0.45, vol: 0.55 });
      noise({ filter: 'lowpass', f: 700, f2: 120, dur: 0.4, vol: 0.35, verb: 0.4 });
      tone({ type: 'square', f: 70, f2: 40, dur: 0.2, vol: 0.08, filter: 'lowpass', ff: 300 });
    },
    axe: () => {
      noise({ filter: 'bandpass', f: 800, f2: 200, dur: 0.25, vol: 0.3, q: 0.8 });
      tone({ type: 'sine', f: 90, f2: 30, dur: 0.5, vol: 0.5 });
      tone({ type: 'square', f: 1400, dur: 0.18, vol: 0.04, filter: 'bandpass', ff: 1400, q: 5, verb: 0.4 });
    },
    arrow: () => {
      noise({ filter: 'bandpass', f: 4200, f2: 900, dur: 0.16, vol: 0.18, q: 2 });
      tone({ type: 'triangle', f: R(300, 360), f2: 180, dur: 0.06, vol: 0.08 });
    },
    spear: () => {
      noise({ filter: 'bandpass', f: 1600, f2: 300, dur: 0.3, vol: 0.24, q: 1.4, attack: 0.03 });
      tone({ type: 'sine', f: 220, f2: 110, dur: 0.12, vol: 0.1 });
    },
    thud: () => { tone({ type: 'sine', f: R(160, 200), f2: 60, dur: 0.12, vol: 0.28 }); noise({ filter: 'lowpass', f: 1200, dur: 0.08, vol: 0.14 }); },
    crit: () => { tone({ type: 'square', f: 1200, f2: 2400, dur: 0.12, vol: 0.06, filter: 'lowpass', ff: 3500 }); noise({ filter: 'highpass', f: 5000, dur: 0.1, vol: 0.12 }); },
    dodge: () => noise({ filter: 'bandpass', f: 1200, f2: 5000, dur: 0.14, vol: 0.14, q: 3 }),
    immune: () => { tone({ type: 'square', f: 240, dur: 0.1, vol: 0.06, filter: 'lowpass', ff: 800 }); tone({ type: 'triangle', f: 1900, dur: 0.12, vol: 0.05 }); },
    death_human: () => {
      tone({ type: 'triangle', f: 520, f2: 180, dur: 0.45, vol: 0.14, vib: 7, vibDepth: 12 });
      noise({ filter: 'lowpass', f: 600, dur: 0.3, vol: 0.12 });
    },
    death_beast: () => {
      tone({ type: 'sawtooth', f: R(170, 210), f2: 50, dur: 0.6, vol: 0.14, filter: 'lowpass', ff: 700, vib: 22, vibDepth: 14 });
      noise({ filter: 'lowpass', f: 500, dur: 0.4, vol: 0.16 });
    },
    roar: () => {
      const t = ac.currentTime;
      tone({ type: 'sawtooth', f: 95, f2: 70, dur: 1.2, vol: 0.2, filter: 'lowpass', ff: 900, ff2: 300, vib: 26, vibDepth: 10, attack: 0.08, verb: 0.5 });
      tone({ type: 'sawtooth', f: 142, f2: 90, dur: 1.1, vol: 0.12, filter: 'lowpass', ff: 1200, ff2: 300, vib: 31, vibDepth: 14, attack: 0.1, t });
      noise({ filter: 'bandpass', f: 700, f2: 250, dur: 1.1, vol: 0.25, attack: 0.08, q: 0.9, verb: 0.5 });
    },
    enrage: () => {
      tone({ type: 'sawtooth', f: 130, f2: 220, dur: 0.5, vol: 0.12, filter: 'lowpass', ff: 1200, vib: 30, vibDepth: 20 });
      noise({ filter: 'bandpass', f: 900, dur: 0.4, vol: 0.14 });
    },
    resurrect: () => {
      const t = ac.currentTime;
      ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => tone({ type: 'sine', f: n, dur: 0.5, vol: 0.08, t: t + i * 0.07, verb: 0.8 }));
      noise({ filter: 'highpass', f: 6000, dur: 0.6, vol: 0.05, attack: 0.2 });
    },
    breach: () => {
      tone({ type: 'sine', f: 80, f2: 28, dur: 0.9, vol: 0.6 });
      noise({ filter: 'lowpass', f: 1400, f2: 90, dur: 0.9, vol: 0.45, verb: 0.5 });
      tone({ type: 'square', f: 55, f2: 35, dur: 0.4, vol: 0.1, filter: 'lowpass', ff: 200 });
    },
    boom: () => {
      tone({ type: 'sine', f: 70, f2: 25, dur: 1.4, vol: 0.7 });
      noise({ filter: 'lowpass', f: 2000, f2: 60, dur: 1.4, vol: 0.5, verb: 0.7 });
    },
    coin: () => {
      const t = ac.currentTime;
      tone({ type: 'square', f: 'B5', dur: 0.07, vol: 0.05, filter: 'lowpass', ff: 4000 });
      tone({ type: 'square', f: 'E6', dur: 0.22, vol: 0.05, t: t + 0.06, filter: 'lowpass', ff: 4000 });
    },
    tick: () => tone({ type: 'sine', f: 1150, dur: 0.06, vol: 0.12 }),
    tock: () => tone({ type: 'sine', f: 850, dur: 0.06, vol: 0.12 }),
    count: () => { tone({ type: 'triangle', f: 'A4', dur: 0.35, vol: 0.2 }); tone({ type: 'sine', f: 'A5', dur: 0.2, vol: 0.06 }); },
    horn: () => {
      const t = ac.currentTime;
      const parts = [['D4', 0, 0.28], ['D4', 0.3, 0.14], ['A4', 0.46, 0.9]];
      parts.forEach(([n, d, len]) => {
        tone({ type: 'sawtooth', f: n, dur: len, vol: 0.13, t: t + d, filter: 'lowpass', ff: 700, ff2: 2200, attack: 0.05, verb: 0.6, curve: 'lin' });
        tone({ type: 'sawtooth', f: n, dur: len, vol: 0.09, t: t + d, detune: 9, filter: 'lowpass', ff: 900, attack: 0.06, curve: 'lin' });
        tone({ type: 'square', f: nf(n) / 2, dur: len, vol: 0.05, t: t + d, filter: 'lowpass', ff: 500, attack: 0.05, curve: 'lin' });
      });
      tone({ type: 'sine', f: 60, f2: 35, dur: 0.6, vol: 0.4, t: t + 0.46 });
    },
    volley: () => {
      const t = ac.currentTime;
      tone({ type: 'sine', f: 300, f2: 1200, dur: 0.5, vol: 0.1, verb: 0.6 });
      for (let i = 0; i < 6; i++) noise({ filter: 'bandpass', f: 4000, f2: 700, dur: 0.2, vol: 0.12, q: 2, t: t + 0.1 + i * 0.07 });
    },
    burn: () => { noise({ filter: 'lowpass', f: 1800, f2: 300, dur: 0.3, vol: 0.2 }); tone({ type: 'sine', f: 130, f2: 50, dur: 0.2, vol: 0.2 }); },
    ready: () => {
      const t = ac.currentTime;
      ['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => tone({ type: 'triangle', f: n, dur: 0.3, vol: 0.08, t: t + i * 0.06, verb: 0.5 }));
    },
    type: () => noise({ filter: 'bandpass', f: R(2500, 3500), dur: 0.018, vol: 0.05, q: 4 }),
    voice: (p) => tone({ type: 'triangle', f: (p || 300) * R(0.9, 1.12), dur: 0.05, vol: 0.05, filter: 'lowpass', ff: 1800 }),
    thunder: () => {
      noise({ filter: 'lowpass', f: 3000, f2: 80, dur: 2.4, vol: 0.5, attack: 0.01, verb: 0.8 });
      tone({ type: 'sine', f: 55, f2: 30, dur: 2, vol: 0.4 });
    },
    chant: () => {
      const t = ac.currentTime;
      for (let i = 0; i < 3; i++) {
        const tt = t + i * 0.42;
        [110, 138, 165, 98].forEach((f, j) => tone({ type: 'sawtooth', f: f * R(0.97, 1.03), f2: f * 0.8, dur: 0.28, vol: 0.06, t: tt + j * 0.01, filter: 'bandpass', ff: 700, q: 1.5, verb: 0.4 }));
        noise({ filter: 'bandpass', f: 900, dur: 0.22, vol: 0.14, t: tt, q: 1.2 });
        tone({ type: 'sine', f: 80, f2: 40, dur: 0.25, vol: 0.35, t: tt });
      }
    },
    gasp: () => noise({ filter: 'bandpass', f: 1500, f2: 2500, dur: 0.35, vol: 0.12, attack: 0.08, q: 2 }),
    heartbeat: () => { tone({ type: 'sine', f: 60, f2: 40, dur: 0.14, vol: 0.4 }); tone({ type: 'sine', f: 55, f2: 38, dur: 0.14, vol: 0.3, t: ac.currentTime + 0.18 }); },
    star: (i) => {
      const n = ['E5', 'G5', 'C6'][i || 0];
      tone({ type: 'triangle', f: n, dur: 0.5, vol: 0.14, verb: 0.7 });
      tone({ type: 'sine', f: nf(n) * 2, dur: 0.4, vol: 0.05 });
      noise({ filter: 'highpass', f: 7000, dur: 0.3, vol: 0.06 });
    },
    victory: () => {
      const t = ac.currentTime;
      const seq = [['C5', 0, 0.14], ['C5', 0.15, 0.14], ['C5', 0.3, 0.14], ['C5', 0.45, 0.4], ['Ab4', 0.9, 0.4], ['Bb4', 1.35, 0.4], ['C5', 1.8, 0.2], ['Bb4', 2.05, 0.12], ['C5', 2.2, 1.2]];
      seq.forEach(([n, d, len]) => {
        tone({ type: 'square', f: n, dur: len + 0.05, vol: 0.07, t: t + d, filter: 'lowpass', ff: 3000, curve: 'lin', verb: 0.4 });
        tone({ type: 'sawtooth', f: nf(n) / 2, dur: len + 0.05, vol: 0.05, t: t + d, filter: 'lowpass', ff: 1200, curve: 'lin' });
      });
      ['C4', 'E4', 'G4', 'C5'].forEach((n) => tone({ type: 'triangle', f: n, dur: 1.4, vol: 0.06, t: t + 2.2, verb: 0.6 }));
      tone({ type: 'sine', f: 65, f2: 40, dur: 0.8, vol: 0.4, t: t + 2.2 });
    },
    defeat: () => {
      const t = ac.currentTime;
      [['A4', 0, 0.5], ['G4', 0.5, 0.5], ['F4', 1.0, 0.5], ['E4', 1.5, 1.6]].forEach(([n, d, len]) => {
        tone({ type: 'triangle', f: n, dur: len, vol: 0.14, t: t + d, verb: 0.7, vib: 5, vibDepth: 4 });
        tone({ type: 'sawtooth', f: nf(n) / 2, dur: len, vol: 0.04, t: t + d, filter: 'lowpass', ff: 600 });
      });
      tone({ type: 'sine', f: 'A2', dur: 3, vol: 0.18, t, curve: 'lin' });
    },
    slam: () => { tone({ type: 'sine', f: 90, f2: 30, dur: 0.6, vol: 0.55 }); noise({ filter: 'lowpass', f: 1200, f2: 100, dur: 0.5, vol: 0.35, verb: 0.5 }); },
    sparkle: () => {
      const t = ac.currentTime;
      for (let i = 0; i < 5; i++) tone({ type: 'sine', f: R(1800, 3400), dur: 0.15, vol: 0.035, t: t + i * 0.04, verb: 0.5 });
    },
    bubble: () => tone({ type: 'sine', f: R(300, 500), f2: R(700, 1000), dur: 0.08, vol: 0.05 }),
    waves: () => noise({ filter: 'lowpass', f: 500, f2: 900, dur: 2.5, vol: 0.12, attack: 1.0, curve: 'lin' }),
    step: () => tone({ type: 'sine', f: 70, f2: 40, dur: 0.12, vol: 0.25 }),
  };

  const minGap = { sword: 0.05, dagger: 0.04, arrow: 0.045, thud: 0.035, club: 0.05, type: 0.03, voice: 0.045, hover: 0.04, death_beast: 0.08, death_human: 0.08, immune: 0.12, dodge: 0.08, coin: 0.06, crit: 0.06, bubble: 0.1, burn: 0.05 };

  function play(name, arg) {
    if (!ac || ac.state !== 'running') return;
    const fn = SFX[name];
    if (!fn) return;
    const now = ac.currentTime;
    const gap = minGap[name] || 0.02;
    if (lastPlayed[name] && now - lastPlayed[name] < gap) return;
    lastPlayed[name] = now;
    try { fn(arg); } catch (e) { console.warn('sound failed:', name, e); }
  }

  /* -------------------------- Music sequencer ------------------------- */
  // Patterns are strings of 16th-note steps separated by spaces; '.' is a rest, '-' holds the previous note.
  const seqParse = (s) => s.trim().split(/\s+/);
  const TRACKS = {
    menu: {
      bpm: 76,
      len: 64,
      pad: [['D3', 'A3', 'D4', 'F4'], ['Bb2', 'F3', 'Bb3', 'D4'], ['C3', 'G3', 'C4', 'E4'], ['A2', 'E3', 'A3', 'C#4']],
      lead: seqParse(`
        D5 . . . A4 . . . D5 . E5 . F5 . . . E5 . D5 . C5 . . . A4 . . . . . . .
        Bb4 . . . D5 . . . F5 . E5 . D5 . . . E5 . . . C#5 . . . A4 . . . . . . .`),
      leadInst: 'lute',
      bass: seqParse(`
        D2 . . . . . . . A2 . . . . . . . Bb1 . . . . . . . F2 . . . . . . .
        C2 . . . . . . . G2 . . . . . . . A1 . . . . . . . E2 . . . . . . .`),
      drums: seqParse(`
        K . . . . . . . h . . . . . . . K . . . . . . . h . . . . . h .
        K . . . . . . . h . . . . . . . K . . . . . . . h . . . h . h .`),
    },
    battle: {
      bpm: 138,
      len: 128,
      pad: [['D3', 'A3', 'F4'], ['D3', 'A3', 'F4'], ['Bb2', 'F3', 'D4'], ['C3', 'G3', 'E4'], ['D3', 'A3', 'F4'], ['F3', 'C4', 'A4'], ['Bb2', 'F3', 'D4'], ['A2', 'E3', 'C#4']],
      lead: seqParse(`
        D5 - - - . . A4 . D5 . E5 . F5 - - - E5 - D5 - C5 - . . A4 - - - . . . .
        Bb4 - - - C5 - D5 - . . F5 - E5 - D5 - C5 - - - D5 - E5 - C#5 - - - . . . .
        . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .`),
      counter: seqParse(`
        . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
        D5 . A4 . F4 . A4 . D5 . A4 . F4 . A4 . F5 . C5 . A4 . C5 . F5 . E5 . D5 . C5 .
        Bb4 . F4 . D4 . F4 . Bb4 . D5 . F5 . D5 . A4 . E4 . C#4 . E4 . A4 . C#5 . E5 . C#5 .`),
      leadInst: 'brass',
      bass: seqParse(`
        D2 . D2 D3 . D2 D2 . D2 . D2 D3 . D2 C3 . D2 . D2 D3 . D2 D2 . D2 . A1 . C2 . C#2 .
        Bb1 . Bb1 Bb2 . Bb1 Bb1 . C2 . C2 C3 . C2 C2 . D2 . D2 D3 . D2 D2 . A1 . A1 A2 . A1 C#2 .
        D2 . D2 D3 . D2 D2 . D2 . D2 D3 . D2 C3 . F2 . F2 F3 . F2 F2 . F2 . F2 E2 . C2 C2 .
        Bb1 . Bb1 Bb2 . Bb1 Bb1 . Bb1 . C2 . D2 . Bb1 . A1 . A1 A2 . A1 A1 . A1 . C#2 . E2 . A1 .`),
      drums: seqParse(`
        K . . h S . K h K . . h S . h h K . . h S . K h K . h h S . S S
        K . . h S . K h K . . h S . h h K . . h S . K h K . h h S S T T
        K . . h S . K h K . . h S . h h K . . h S . K h K . h h S . S S
        K . . h S . K h K . . h S . h h K . . h S . K h T . T . T T S S`),
    },
    boss: {
      bpm: 152,
      len: 64,
      pad: [['D3', 'Ab3', 'D4'], ['D3', 'Ab3', 'D4'], ['Eb3', 'Bb3', 'Eb4'], ['C3', 'G3', 'C4']],
      lead: seqParse(`
        D5 - - - Eb5 - - - D5 - C5 - Ab4 - - - D5 - - - Eb5 - - - F5 - Eb5 - D5 - - -
        Eb5 - - - D5 - - - Bb4 - C5 - D5 - - - C5 - - - Ab4 - - - G4 - - - - - - -`),
      leadInst: 'brass',
      bass: seqParse(`
        D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 Ab1 Ab1 Ab2 Ab1 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 Ab1 Ab1 Ab2 Ab1
        Eb2 Eb2 Eb3 Eb2 Eb2 Eb2 Eb3 Eb2 Eb2 Eb2 Eb3 Eb2 Bb1 Bb1 Bb2 Bb1 C2 C2 C3 C2 C2 C2 C3 C2 G1 G1 G2 G1 G1 G1 G2 G1`),
      drums: seqParse(`
        K . h K S . h . K . h K S . T T K . h K S . h . K K h K S T T T
        K . h K S . h . K . h K S . T T K . h K S . h . K K T T T T S S`),
    },
    cinematic: {
      bpm: 64,
      len: 32,
      pad: [['D2', 'A2', 'D3', 'F3'], ['D2', 'A2', 'D3', 'F3'], ['Bb1', 'F2', 'Bb2', 'D3'], ['A1', 'E2', 'A2', 'C#3']],
      padLen: 8,
      lead: seqParse(`
        A4 . . . . . . . F4 . . . . . . . . . . . E4 . . . . . . . . . . .`),
      leadInst: 'bell',
      bass: seqParse(`
        D1 . . . . . . . . . . . . . . . Bb0 . . . . . . . A0 . . . . . . .`),
      drums: seqParse(`
        T . . . . . . . . . . . . . . . T . . . . . . . T . . . T . T .`),
    },
    village: {
      bpm: 100,
      len: 64,
      pad: [['F3', 'A3', 'C4'], ['C3', 'E3', 'G3'], ['D3', 'F3', 'A3'], ['Bb2', 'D3', 'F3']],
      lead: seqParse(`
        C5 . A4 . C5 . F5 . E5 . C5 . G4 . . . D5 . F5 . A5 . F5 . Bb4 . D5 . F5 . D5 .
        C5 . A4 . C5 . F5 . E5 . G5 . C6 . . . A5 . G5 . F5 . D5 . F5 - - - . . . .`),
      leadInst: 'lute',
      bass: seqParse(`
        F2 . . . C3 . . . C2 . . . G2 . . . D2 . . . A2 . . . Bb1 . . . F2 . . .
        F2 . . . C3 . . . C2 . . . G2 . . . D2 . . . A2 . . . Bb1 . . . C2 . . .`),
      drums: seqParse(`
        K . . h . . h . K . . h . . h . K . . h . . h . K . . h . h h .
        K . . h . . h . K . . h . . h . K . . h . . h . K . h h K h h h`),
    },
  };

  const Music = {
    name: null, track: null, step: 0, nextTime: 0, timer: null, gain: null, wanted: null,
    start() {
      if (this.timer) return;
      this.timer = setInterval(() => this.tick(), 25);
      if (this.wanted) { const w = this.wanted; this.wanted = null; this.play(w); }
    },
    play(name) {
      if (!ac) { this.wanted = name; return; }
      if (this.name === name) return;
      const old = this.gain;
      if (old) {
        old.gain.setTargetAtTime(0.0001, ac.currentTime, 0.25);
        setTimeout(() => { try { old.disconnect(); } catch (e) { /* ignore */ } }, 1800);
      }
      this.name = name;
      this.track = name ? TRACKS[name] : null;
      if (!this.track) { this.gain = null; return; }
      this.gain = ac.createGain();
      this.gain.gain.setValueAtTime(0.0001, ac.currentTime);
      this.gain.gain.setTargetAtTime(1, ac.currentTime + 0.05, 0.3);
      this.gain.connect(musicBus);
      this.step = 0;
      this.nextTime = ac.currentTime + 0.1;
    },
    tick() {
      if (!ac || !this.track || ac.state !== 'running') return;
      const tr = this.track;
      const stepDur = 60 / tr.bpm / 4;
      if (this.nextTime < ac.currentTime - 0.3) this.nextTime = ac.currentTime + 0.05;
      while (this.nextTime < ac.currentTime + 0.12) {
        this.playStep(tr, this.step, this.nextTime, stepDur);
        this.nextTime += stepDur;
        this.step = (this.step + 1) % tr.len;
      }
    },
    holdLen(arr, i) {
      let n = 1;
      while (arr[(i + n) % arr.length] === '-' && n < 32) n++;
      return n;
    },
    playStep(tr, step, t, sd) {
      const dest = this.gain;
      const padLen = (tr.padLen || 16);
      if (step % padLen === 0 && tr.pad) {
        const chord = tr.pad[Math.floor(step / padLen) % tr.pad.length];
        chord.forEach((n, i) => {
          tone({ type: 'sawtooth', f: n, dur: sd * padLen * 1.02, vol: 0.022, t, dest, filter: 'lowpass', ff: 700, attack: sd * 3, curve: 'lin', detune: i % 2 ? 7 : -7 });
          tone({ type: 'triangle', f: n, dur: sd * padLen * 1.02, vol: 0.02, t, dest, attack: sd * 2, curve: 'lin' });
        });
      }
      const inst = (arr, name, vol) => {
        if (!arr) return;
        const n = arr[step % arr.length];
        if (!n || n === '.' || n === '-') return;
        const len = this.holdLen(arr, step % arr.length) * sd;
        if (name === 'lute') {
          tone({ type: 'triangle', f: n, dur: Math.max(0.35, len), vol: vol, t, dest, attack: 0.004 });
          tone({ type: 'sine', f: nf(n) * 2, dur: 0.18, vol: vol * 0.3, t, dest });
        } else if (name === 'brass') {
          tone({ type: 'sawtooth', f: n, dur: len * 0.95, vol: vol * 0.7, t, dest, filter: 'lowpass', ff: 1500, attack: 0.03, curve: 'lin', vib: len > sd * 3 ? 5.5 : 0, vibDepth: 5 });
          tone({ type: 'square', f: n, dur: len * 0.95, vol: vol * 0.3, t, dest, filter: 'lowpass', ff: 1800, attack: 0.02, curve: 'lin', detune: 6 });
        } else if (name === 'bell') {
          tone({ type: 'sine', f: n, dur: 2.2, vol: vol, t, dest, verb: 1 });
          tone({ type: 'sine', f: nf(n) * 2.76, dur: 0.9, vol: vol * 0.25, t, dest, verb: 1 });
        } else if (name === 'bass') {
          tone({ type: 'sawtooth', f: n, dur: Math.min(len, sd * 1.6), vol: vol, t, dest, filter: 'lowpass', ff: 520, q: 3 });
          tone({ type: 'sine', f: n, dur: Math.min(len, sd * 2), vol: vol * 0.9, t, dest });
        } else if (name === 'pluck') {
          tone({ type: 'triangle', f: n, dur: 0.22, vol, t, dest });
        }
      };
      inst(tr.lead, tr.leadInst || 'lute', tr.leadInst === 'bell' ? 0.06 : 0.07);
      inst(tr.counter, 'pluck', 0.05);
      inst(tr.bass, 'bass', 0.09);
      const d = tr.drums && tr.drums[step % tr.drums.length];
      if (d === 'K') { tone({ type: 'sine', f: 120, f2: 42, dur: 0.22, vol: 0.34, t, dest }); }
      else if (d === 'S') { noise({ filter: 'bandpass', f: 1800, dur: 0.14, vol: 0.14, t, dest, q: 0.7 }); tone({ type: 'triangle', f: 200, f2: 140, dur: 0.08, vol: 0.08, t, dest }); }
      else if (d === 'h') { noise({ filter: 'highpass', f: 7000, dur: 0.035, vol: 0.05, t, dest }); }
      else if (d === 'T') { tone({ type: 'sine', f: 95, f2: 60, dur: 0.35, vol: 0.3, t, dest }); noise({ filter: 'lowpass', f: 400, dur: 0.12, vol: 0.08, t, dest }); }
    },
  };

  return {
    unlock,
    play,
    names: Object.keys(SFX),
    music: (name) => Music.play(name),
    currentMusic: () => Music.name,
    applyVolumes,
    get ready() { return !!ac && ac.state === 'running'; },
  };
})();
