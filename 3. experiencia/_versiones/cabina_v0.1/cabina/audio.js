// Audio de la cabina (cartón): todo se genera por programa (Web Audio) y cada cosa se puede reemplazar por un archivo
// en "3. experiencia/audio/" con el mismo nombre (.wav, .mp3 u .ogg):
// - voces: <codigo>-<n>  (ej. R1-saludo-2.wav). Sin archivo: "sonidito" (un bla por sílaba, agudo y rápido para
//   Richie, grave y lento para tiesme) con la duración del texto.
// - efectos: fx-<nombre> · música: musica-<nombre> (en loop).
// El navegador no deja sonar nada hasta que alguien toca una tecla o hace clic: iniciar() se llama con eso.

const EXT = ['wav', 'mp3', 'ogg'];
const DIR = new URL('../audio/', import.meta.url).href;
const FX = ['asomada', 'fiuuu', 'inicio', 'bien', 'mal', 'estatua', 'tic', 'glitch', 'zumbido', 'hilo', 'toc', 'risa', 'apagar'];
const MUSICAS = ['menu', 'juego', 'oscura'];

export function crearAudio(guion) {
  let ctx = null, master = null, analyser = null, buf = null;
  const bus = {};
  const archivos = {};           // nombre -> AudioBuffer (solo los que existen)
  const voces = new Set();       // fuentes de voz sonando (para callar al saltar de paso)
  let musica = null;             // { nombre, gain, stop() }
  let zumbido = null;

  // ---------------------------------------------------------------- arranque
  function iniciar() {
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    ctx = new AudioContext();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    for (const [k, v] of Object.entries({ musica: 0.32, voz: 0.9, fx: 0.7 })) { bus[k] = ctx.createGain(); bus[k].gain.value = v; bus[k].connect(master); }
    analyser = ctx.createAnalyser(); analyser.fftSize = 512; buf = new Uint8Array(analyser.fftSize);
    bus.voz.connect(analyser);
    precargar();
    if (pendiente) { const p = pendiente; pendiente = null; ponerMusica(p); }
  }
  const listo = () => !!ctx && ctx.state === 'running';

  // Busca en audio/ los archivos que existan (en segundo plano; los que no estan dan 404 y se usa lo generado).
  async function precargar() {
    const nombres = [];
    for (const [cod, lista] of Object.entries(guion.frases)) lista.forEach((_, i) => nombres.push(`${cod}-${i + 1}`));
    FX.forEach(n => nombres.push('fx-' + n)); MUSICAS.forEach(n => nombres.push('musica-' + n));
    for (const n of nombres) {
      for (const e of EXT) {
        try {
          const r = await fetch(DIR + encodeURIComponent(n) + '.' + e);
          if (!r.ok) continue;
          archivos[n] = await ctx.decodeAudioData(await r.arrayBuffer());
          break;
        } catch { /* no esta o no se pudo leer: se usa el generado */ }
      }
    }
    const n = Object.keys(archivos).length;
    if (n) console.log(`[cabina] audio grabado encontrado: ${n} archivos`, Object.keys(archivos));
  }

  function tocarArchivo(nombre, destino, { loop = false, vol = 1 } = {}) {
    const s = ctx.createBufferSource(); s.buffer = archivos[nombre]; s.loop = loop;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(g).connect(destino); s.start();
    return { s, g, dur: s.buffer.duration };
  }

  // ---------------------------------------------------------------- piezas de sintesis
  const ahora = () => ctx.currentTime;
  function osc(tipo, f, t0, dur, vol, destino, { f1, ataque = 0.005, filtro } = {}) {
    const o = ctx.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let n = o;
    if (filtro) { const fl = ctx.createBiquadFilter(); fl.type = filtro.tipo; fl.frequency.value = filtro.f; fl.Q.value = filtro.q ?? 1; o.connect(fl); n = fl; }
    n.connect(g).connect(destino); o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  }
  let ruidoBuf = null;
  function ruido(t0, dur, vol, destino, { tipo = 'bandpass', f = 1000, q = 1, f1 } = {}) {
    if (!ruidoBuf) {
      ruidoBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = ruidoBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(); s.buffer = ruidoBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = tipo; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl).connect(g).connect(destino); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  }
  const midi = n => 440 * 2 ** ((n - 69) / 12);

  // ---------------------------------------------------------------- voces
  // Duracion del sonidito segun el texto: silabas aproximadas (grupos de vocales) y pausas en la puntuacion.
  function planSilabas(quien, texto) {
    const lento = quien === 'tiesme';
    const sil = lento ? 0.15 : 0.085, entrePal = lento ? 0.07 : 0.04;
    const plan = []; let t = 0.04;
    for (const tok of texto.split(/(\s+)/)) {
      if (!tok.trim()) { t += entrePal; continue; }
      const limpia = tok.replace(/[^a-záéíóúüñ]/gi, '');
      const n = Math.max(limpia ? 1 : 0, (limpia.match(/[aeiouáéíóúü]+/gi) || []).length);
      for (let k = 0; k < n; k++) { plan.push(t); t += sil; }
      if (/[.!?]$/.test(tok)) t += lento ? 0.35 : 0.22;
      else if (/[,;:]$/.test(tok)) t += 0.14;
      else if (/…$/.test(tok)) t += 0.4;
      if (/^\(.*\)$/.test(tok)) t += 0.3;
    }
    return { plan, dur: Math.max(0.5, t + 0.1), pregunta: /\?\s*$/.test(texto) };
  }
  function sonidito(quien, texto, { susurro = false } = {}) {
    const { plan, dur, pregunta } = planSilabas(quien, texto);
    if (!listo()) return dur;
    const t0 = ahora() + 0.02, d = bus.voz;
    plan.forEach((ts, k) => {
      const t = t0 + ts, fin = k / Math.max(1, plan.length - 1);
      if (quien === 'tiesme') {
        const f = 205 * (0.92 + Math.random() * 0.14) * (pregunta ? 1 + 0.15 * fin : 1 - 0.08 * fin);
        if (susurro) ruido(t, 0.16, 0.18, d, { f: 900, q: 1.5 });
        else { osc('triangle', f, t, 0.15, 0.32, d, { f1: f * 0.92, ataque: 0.02, filtro: { tipo: 'lowpass', f: 1400 } }); ruido(t, 0.12, 0.04, d, { f: 2500, q: 0.7 }); }
      } else {
        const f = 470 * (0.82 + Math.random() * 0.4) * (pregunta ? 1 + 0.35 * fin * fin : 1);
        if (susurro) ruido(t, 0.08, 0.2, d, { f: 1800 + Math.random() * 800, q: 3 });
        else osc('square', f, t, 0.075, 0.13, d, { f1: f * 1.05, filtro: { tipo: 'bandpass', f: 1300, q: 1.2 } });
      }
    });
    return dur;
  }
  // Dice una frase: archivo grabado si existe, si no el sonidito. Devuelve la duracion (para la viñeta y los tiempos).
  function decir(quien, nombre, texto, opciones = {}) {
    if (listo() && archivos[nombre]) {
      const v = tocarArchivo(nombre, bus.voz);
      voces.add(v.s); v.s.onended = () => voces.delete(v.s);
      return v.dur;
    }
    return sonidito(quien, texto, opciones);
  }
  function callar() { for (const s of voces) try { s.stop(); } catch { /* ya paro */ } voces.clear(); }
  // nivel de la voz que suena (0 a 1), para mover la boca
  function nivel() {
    if (!analyser) return 0;
    analyser.getByteTimeDomainData(buf);
    let s = 0; for (const v of buf) s += (v - 128) ** 2;
    return Math.min(1, Math.sqrt(s / buf.length) / 40);
  }

  // ---------------------------------------------------------------- efectos
  function fx(nombre, { vol = 1 } = {}) {
    if (!listo()) return;
    if (archivos['fx-' + nombre]) return void tocarArchivo('fx-' + nombre, bus.fx, { vol });
    const t = ahora() + 0.01, d = bus.fx;
    switch (nombre) {
      case 'asomada': osc('sine', 700, t, 0.12, 0.25 * vol, d, { f1: 1100 }); osc('sine', 900, t + 0.14, 0.14, 0.2 * vol, d, { f1: 1500 }); break;
      case 'fiuuu': osc('sine', 220, t, 0.7, 0.35 * vol, d, { f1: 1600, ataque: 0.05 }); ruido(t, 0.7, 0.25 * vol, d, { f: 400, f1: 4000, q: 2 }); break;
      case 'inicio': [72, 76, 79, 84].forEach((n, i) => osc('triangle', midi(n), t + i * 0.09, 0.3, 0.25 * vol, d)); break;
      case 'bien': osc('sine', midi(88), t, 0.25, 0.3 * vol, d); osc('sine', midi(93), t + 0.1, 0.5, 0.3 * vol, d); break;
      case 'mal': osc('square', 330, t, 0.35, 0.12 * vol, d, { f1: 140, filtro: { tipo: 'lowpass', f: 1200 } }); break;
      case 'estatua': ruido(t, 0.05, 0.5 * vol, d, { tipo: 'highpass', f: 2000 }); osc('sine', 110, t, 1.2, 0.45 * vol, d); osc('sine', 165, t, 0.9, 0.2 * vol, d); break;
      case 'tic': osc('square', 1500, t, 0.03, 0.12 * vol, d); break;
      case 'glitch':
        for (let i = 0; i < 7; i++) {
          const ti = t + i * (0.03 + Math.random() * 0.05);
          if (Math.random() < 0.5) osc('square', 80 + Math.random() * 2000, ti, 0.04 + Math.random() * 0.06, 0.12 * vol, d);
          else ruido(ti, 0.05, 0.3 * vol, d, { f: 300 + Math.random() * 5000, q: 8 });
        }
        break;
      case 'hilo': ruido(t, 0.03, 0.5 * vol, d, { tipo: 'highpass', f: 3000 }); osc('triangle', 1200, t, 0.45, 0.2 * vol, d, { f1: 260 }); break;
      case 'toc': ruido(t, 0.06, 0.9 * vol, d, { tipo: 'lowpass', f: 900, q: 0.8 }); osc('sine', 130, t, 0.14, 0.8 * vol, d, { f1: 70 }); break;
      case 'risa': [0, 0.17, 0.34, 0.5].forEach((dt, i) => osc('square', 520 - i * 50, t + dt, 0.12, 0.12 * vol, d, { f1: 430 - i * 50, filtro: { tipo: 'bandpass', f: 1300, q: 1.2 } })); break;
      case 'apagar': osc('sine', 420, t, 0.9, 0.3 * vol, d, { f1: 35 }); ruido(t, 0.9, 0.15 * vol, d, { tipo: 'lowpass', f: 3000, f1: 100 }); break;
    }
  }
  function zumbar(on) {
    if (!listo()) return;
    if (on && !zumbido) {
      if (archivos['fx-zumbido']) { const v = tocarArchivo('fx-zumbido', bus.fx, { loop: true, vol: 0.5 }); zumbido = { stop: () => v.s.stop() }; return; }
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ahora()); g.gain.exponentialRampToValueAtTime(0.09, ahora() + 0.6);
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 400;
      const os = [60, 120.5, 180.3].map((f, i) => { const o = ctx.createOscillator(); o.type = i ? 'sawtooth' : 'sine'; o.frequency.value = f; o.connect(fl); o.start(); return o; });
      fl.connect(g).connect(bus.fx);
      zumbido = { stop: () => { g.gain.setTargetAtTime(0.0001, ahora(), 0.15); os.forEach(o => o.stop(ahora() + 0.8)); } };
    } else if (!on && zumbido) { zumbido.stop(); zumbido = null; }
  }

  // ---------------------------------------------------------------- musica (loops generados por pasos)
  const TEMAS = {
    // menu: arpegios suaves, tipo canal de juegos
    menu: { bpm: 96, pasos: 32, vol: 0.55, nota(i) {
      const acordes = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]], a = acordes[Math.floor(i / 8) % 4];
      const out = [];
      if (i % 2 === 0) out.push(['sine', a[(i / 2) % 4] + 12, 0.35, 0.18]);
      if (i % 8 === 0) out.push(['triangle', a[0] - 12, 0.6, 0.22]);
      return out;
    } },
    // juego: alegre, tipo Wii (marimba + bajo + shaker)
    juego: { bpm: 124, pasos: 32, vol: 0.6, nota(i) {
      const mel = [72, null, 76, 79, 81, null, 79, 76, 74, null, 76, 74, 72, null, 69, null, 72, null, 76, 79, 84, null, 81, 79, 76, 79, 81, null, 79, null, null, null];
      const baj = [48, null, 55, null, 45, null, 52, null, 41, null, 48, null, 43, null, 50, null];
      const out = [];
      if (mel[i]) out.push(['sine', mel[i], 0.22, 0.2], ['sine', mel[i] + 24, 0.08, 0.04]);
      if (i % 2 === 0 && baj[(i / 2) % 16]) out.push(['triangle', baj[(i / 2) % 16], 0.25, 0.25]);
      if (i % 2 === 1) out.push(['ruido', 7000, 0.04, 0.05]);
      return out;
    } },
    // oscura: dron grave y alguna campana disonante (se arma aparte en ponerMusica)
    oscura: { bpm: 60, pasos: 16, vol: 0.9, nota(i) {
      const out = [];
      if (i % 8 === 0) out.push(['sine', 33, 2.5, 0.35]);
      if (i === 5 || i === 13) out.push(['sine', [78, 84][i === 5 ? 0 : 1], 2.0, 0.05]);
      return out;
    } },
  };
  let pendiente = null;
  function ponerMusica(nombre) {
    if (!ctx) { pendiente = nombre; return; }
    if (musica?.nombre === nombre && !musica.cortada) return;
    pararMusica(0.6);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ahora()); g.gain.exponentialRampToValueAtTime(1, ahora() + 0.8);
    g.connect(bus.musica);
    const m = { nombre, gain: g, cortada: false, paso: 0, prox: ahora() + 0.1, timer: null, extra: [] };
    if (archivos['musica-' + nombre]) {
      const v = tocarArchivo('musica-' + nombre, g, { loop: true });
      m.extra.push(v.s);
    } else {
      const tema = TEMAS[nombre];
      if (nombre === 'oscura') { // dron
        const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 220; fl.connect(g);
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 120; lfo.connect(lg).connect(fl.frequency); lfo.start();
        for (const f of [55, 55.4, 82.6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const og = ctx.createGain(); og.gain.value = 0.12; o.connect(og).connect(fl); o.start(); m.extra.push(o); }
        m.extra.push(lfo);
      }
      const dur16 = 60 / tema.bpm / 4;
      m.timer = setInterval(() => {
        if (m.cortada) return;
        while (m.prox < ahora() + 0.15) {
          for (const [tipo, n, d, v] of tema.nota(m.paso % tema.pasos)) {
            if (tipo === 'ruido') ruido(m.prox, d, v * tema.vol, g, { tipo: 'highpass', f: n });
            else osc(tipo, midi(n), m.prox, d + 0.05, v * tema.vol, g, { ataque: tipo === 'sine' && d > 1 ? 0.3 : 0.005 });
          }
          m.paso++; m.prox += dur16;
        }
      }, 40);
    }
    musica = m;
  }
  function pararMusica(fade = 0.8) {
    if (!musica || !ctx) { pendiente = null; return; }
    const m = musica; musica = null;
    m.gain.gain.cancelScheduledValues(ahora());
    m.gain.gain.setTargetAtTime(0.0001, ahora(), fade / 4);
    setTimeout(() => { clearInterval(m.timer); m.extra.forEach(s => { try { s.stop(); } catch { /* */ } }); m.gain.disconnect(); }, fade * 1000 + 300);
  }
  // estatuas: la musica se corta de golpe y despues sigue donde estaba
  function cortarMusica() {
    if (!musica) return;
    musica.cortada = true;
    musica.gain.gain.cancelScheduledValues(ahora()); musica.gain.gain.setTargetAtTime(0.0001, ahora(), 0.01);
  }
  function seguirMusica() {
    if (!musica) return;
    musica.cortada = false; musica.prox = ahora() + 0.05;
    musica.gain.gain.cancelScheduledValues(ahora()); musica.gain.gain.setTargetAtTime(1, ahora(), 0.05);
  }

  return { iniciar, listo, decir, callar, nivel, fx, zumbar, ponerMusica, pararMusica, cortarMusica, seguirMusica, planSilabas, archivos };
}
