// DIRECTOR de la cabina de 3 actos (cabina v0.1, cartón). Recorre Espera → acto 1 → acto 2 → acto 3 → Reinicio según
// BIBLIA_EXPERIENCIA.md (v3), con los textos y tiempos de guion.js. Lo carga el motor (motor_v12/app.js, bloque
// ">>> CABINA") y lo llama en cada cuadro (cuadro), por cada hueso (hueso) y para la cara (cara).
//
// Teclas de quien atiende: 0 reiniciar · 1 2 3 saltar a un acto · → paso siguiente · Espacio pausa · D panel.
// Del tracking siguen andando: F pantalla completa · H panel del tracking · V cámara · C calibrar postura · G gestos.

import guion from '../guion.js';
import { crearAudio } from './audio.js';
import { crearPantalla } from './pantalla.js';
import { crearEscenario } from './escenario.js';
import { crearHilos } from './hilos.js';
import { crearSenales, UMBRAL } from './senales.js';
import { crearCuerpo, PARTES } from './cuerpo.js';

export const VERSION_CABINA = 'cabina v0.1 (cartón)';
const CANCELADO = Symbol('cancelado');
const ORDEN = ['espera', '1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4', '2.4b', '2.5', '3.1', '3.2', '3.3', '3.4', 'reinicio'];
const NOMBRE = {
  espera: 'Espera', '1.1': 'Asomada', '1.2': 'Entrada', '1.3': 'Descubre', '1.4': 'Richie dice', '2.1': 'Estatuas',
  '2.2': 'Tercera pose', '2.3': 'Algo anda mal', '2.4': 'Se degrada', '2.4b': 'Pollito inglés', '2.5': 'Quiebre',
  '3.1': 'Te hablan', '3.2': 'Burla', '3.3': 'Copiá vos', '3.4': 'Te echan', reinicio: 'Reinicio',
};
const mezclar = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };
const prom = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

export function crearDirector(api) {
  const audio = crearAudio(guion);
  const pantalla = crearPantalla(api, guion);
  const esc = crearEscenario(api);
  const hilos = crearHilos(api, pantalla.hilosCanvas, pantalla.dpr);
  const sen = crearSenales(api), S = sen.S;
  const cuerpo = crearCuerpo(api), R = cuerpo.REPOSO;
  const lado = guion.puerta === 'derecha' ? 1 : -1; // de que lado de la tele esta la puerta (raiz.x)

  document.title = 'tiesme · 3 actos · ' + VERSION_CABINA;
  api.panel.classList.add('oculto');
  api.camBox.classList.add('oculto');

  // ================================================================ reloj y pasos
  // El reloj del director se frena con la pausa y, en el acto 1, mientras la persona está fuera de cuadro.
  let reloj = 0, pausado = false, frenado = false, corrida = 0, paso = null, pasoT0 = 0, dtUlt = 0, ausente = 0;
  let tPant = 0; // reloj de la pantalla y las voces: se frena solo con la pausa
  const esperas = new Set();
  const esperar = seg => { const id = corrida; return new Promise((res, rej) => esperas.add({ hasta: reloj + Math.max(0, seg), res, rej, id })); };
  // espera a que se cumpla algo (cond se mira en cada cuadro); devuelve true si se cumplió, false si se acabó el tiempo
  const hasta = (cond, maxSeg = Infinity) => { const id = corrida; return new Promise((res, rej) => esperas.add({ hasta: reloj + maxSeg, cond, res, rej, id })); };
  function resolverEsperas() {
    for (const e of [...esperas]) {
      if (e.id !== corrida) { esperas.delete(e); e.rej(CANCELADO); continue; }
      let ok = false;
      if (e.cond) try { ok = !!e.cond(); } catch (err) { console.error(err); }
      if (ok) { esperas.delete(e); e.res(true); } else if (reloj >= e.hasta) { esperas.delete(e); e.res(!e.cond); }
    }
  }
  const cancelarEsperas = () => { for (const e of esperas) e.rej(CANCELADO); esperas.clear(); };
  const lanzar = fn => { Promise.resolve().then(fn).catch(e => { if (e !== CANCELADO) console.error(e); }); };

  async function correr(desde) {
    const id = ++corrida;
    cancelarEsperas();
    let p = desde;
    try {
      while (p && id === corrida) {
        paso = p; pasoT0 = reloj; avisados.clear();
        anotar(`— ${p} ${NOMBRE[p]}`);
        console.log('[cabina] paso', p, NOMBRE[p]);
        const sig = await PASOS[p]();
        if (id !== corrida) return;
        p = sig || ORDEN[ORDEN.indexOf(p) + 1] || 'espera';
      }
    } catch (e) { if (e !== CANCELADO) { console.error(e); api.flash('Error en la cabina: ' + e.message); } }
  }
  // saltar a un paso (teclas, o la persona se fue): corta lo que estaba pasando y deja la pantalla limpia
  function ir(p) {
    audio.callar(); pantalla.limpiar(); cuerpo.limpiar(); audio.zumbar(false); hilos.reset();
    correr(p);
  }

  // ================================================================ hablar (voz + viñeta)
  const ultimaVariante = {}, registro = [];
  const anotar = s => { registro.push(s); if (registro.length > 8) registro.shift(); };
  let hablando = { quien: null, hasta: 0 }, escena = 'espera';
  function elegir(codigo, n) {
    if (n <= 1) return 0;
    let i; do i = Math.random() * n | 0; while (i === ultimaVariante[codigo]);
    return (ultimaVariante[codigo] = i);
  }
  async function hablar(codigo, { i, roto = false, susurro = false, esperarFin = true, pausa = 0.15 } = {}) {
    const lista = guion.frases[codigo];
    if (!lista?.length) { console.warn('[cabina] falta la frase', codigo); return 0; }
    i = Math.min(i ?? elegir(codigo, lista.length), lista.length - 1);
    const texto = lista[i], quien = codigo[0] === 'T' ? 'tiesme' : 'richie';
    const dur = audio.decir(quien, `${codigo}-${i + 1}`, texto, { susurro });
    pantalla.vineta(quien, texto, dur, { roto, oscura: escena === 'oscura' });
    hablando = { quien, hasta: tPant + dur };
    anotar(`${codigo}-${i + 1}: ${texto}`);
    if (esperarFin) await esperar(dur + pausa);
    return dur;
  }

  // ================================================================ escenas (fondo, luz, música)
  function ponerEscena(nombre, seg = 1.2) {
    escena = nombre;
    const oscura = nombre === 'oscura';
    esc.negro(oscura ? 1 : 0, seg); esc.oscuro(oscura ? 1 : 0, seg); esc.glitch(0);
    audio.zumbar(false);
    audio.ponerMusica(nombre === 'espera' ? 'menu' : nombre === 'juego' ? 'juego' : 'oscura');
  }
  const LIMPIO = { propio: 0, retraso: 0, impreciso: 0, contrario: 0 };
  // acto 1 y comienzo del 2: te copia limpio, fondo alegre
  function prepararJuego() {
    if (escena !== 'juego') ponerEscena('juego');
    pantalla.titulo(false); pantalla.glitch(0); pantalla.negro(0, 0.5);
    hilos.reset(); cuerpo.mostrar(true); cuerpo.seguir(0); cuerpo.vida(1);
    cuerpo.dial('todo', LIMPIO, 0.6);
    cuerpo.posar({ raiz: R.raiz }, 0.6);
  }
  // acto 3: negro, luz dura, todo es de ella
  function prepararOscura() {
    if (escena !== 'oscura') ponerEscena('oscura', 1);
    pantalla.titulo(false); pantalla.glitch(0); pantalla.negro(0, 0.5);
    hilos.reset(); cuerpo.mostrar(true); cuerpo.vida(1); cuerpo.seguir(0.7);
    cuerpo.dial('todo', { propio: 1, retraso: 0, impreciso: 0, contrario: 0 }, 0.8);
    cuerpo.posar({ raiz: { x: 0, y: 0, z: 0.12, giro: 0 }, torso: { yaw: 0, pitch: 5, roll: 0 }, cabeza: { yaw: 0, pitch: -5, roll: 0 },
      brazoIzq: R.brazoIzq, brazoDer: R.brazoDer, cara: { boca: null, ojos: 'fijo', cejas: null } }, 1);
  }
  // 2.3 y 2.4 (también si se entra con las teclas): la cabeza ya es de ella; lo demás todavía te copia
  function asegurarCabezaPropia() {
    if (cuerpo.P.cabeza.propio < 0.99) { cuerpo.fijar({ cabeza: { yaw: 0, pitch: -2, roll: 0 } }); cuerpo.dial('cabeza', { propio: 1 }, 1); }
    cuerpo.dial(PARTES.filter(p => p !== 'cabeza'), LIMPIO, 0.5);
    cuerpo.mostrar(true); cuerpo.seguir(0.6); pantalla.titulo(false); pantalla.negro(0, 0.3);
    if (Math.abs(cuerpo.actual.raiz.x) + Math.abs(cuerpo.actual.raiz.y) + Math.abs(cuerpo.actual.raiz.z) > 0.01) cuerpo.posar({ raiz: R.raiz }, 0.6);
    if (escena !== 'juego') { ponerEscena('juego', 0.5); audio.cortarMusica(); }
  }

  // ================================================================ movimientos por programa (provisorios)
  const BRAZO_ARRIBA = { brazo: [0.3, 1, 0.05], ante: [0.05, 1, 0.05] };
  const POSES_COPIA = {
    cruz: { brazoIzq: { brazo: [1, 0.05, 0.05], ante: [1, 0.1, 0.05] }, brazoDer: { brazo: [1, 0.05, 0.05], ante: [1, 0.1, 0.05] } },
    arriba: { brazoIzq: BRAZO_ARRIBA, brazoDer: BRAZO_ARRIBA },
    unaArriba: { brazoDer: BRAZO_ARRIBA, brazoIzq: R.brazoIzq },
  };
  async function saludar(b, veces = 3) {
    await esperar(cuerpo.posar({ [b]: { brazo: [0.6, 0.3, 0.35], ante: [0.05, 1, 0.15] } }, 0.6, 'sale'));
    for (let i = 0; i < veces; i++) {
      await esperar(cuerpo.posar({ [b]: { ante: [0.5, 0.85, 0.15] } }, 0.22));
      await esperar(cuerpo.posar({ [b]: { ante: [-0.3, 0.95, 0.15] } }, 0.22));
    }
    await esperar(cuerpo.posar({ [b]: R[b] }, 0.7));
  }
  async function golpearVidrio(b, veces = 2) {
    await esperar(cuerpo.posar({ [b]: { brazo: [0.12, 0.05, 1], ante: [-0.1, 0.6, 0.8] } }, 0.7, 'anticipa'));
    for (let i = 0; i < veces; i++) {
      await esperar(cuerpo.posar({ [b]: { ante: [-0.15, 0.3, 1] } }, 0.09, 'golpe'));
      audio.fx('toc'); pantalla.temblor(0.12, 9);
      await esperar(cuerpo.posar({ [b]: { ante: [-0.1, 0.65, 0.75] } }, 0.22));
    }
    await esperar(0.3);
  }
  async function gestoAnda(b, veces = 3) {
    await esperar(cuerpo.posar({ [b]: { brazo: [0.4, -0.35, 0.6], ante: [0.6, 0.45, 0.55] } }, 0.4));
    for (let i = 0; i < veces; i++) {
      await esperar(cuerpo.posar({ [b]: { ante: [0.95, -0.05, 0.25] } }, 0.16, 'golpe'));
      await esperar(cuerpo.posar({ [b]: { ante: [0.6, 0.45, 0.55] } }, 0.25));
    }
    await esperar(cuerpo.posar({ [b]: R[b] }, 0.6));
  }
  // qué hace cada parte cuando se le corta el hilo (2.4)
  const AL_CORTAR = {
    mirarte: () => { cuerpo.posar({ cabeza: { yaw: 0, pitch: -2, roll: 4 } }, 1); cuerpo.seguir(0.8); },
    mirarseLaMano: parte => lanzar(async () => {
      const b = parte;
      cuerpo.seguir(0);
      cuerpo.posar({ cabeza: { yaw: b === 'brazoDer' ? -24 : 24, pitch: 20, roll: b === 'brazoDer' ? 8 : -8 } }, 1.2);
      await esperar(cuerpo.posar({ [b]: { brazo: [0.22, -0.85, 0.45], ante: [-0.12, 0.5, 1] } }, 1.4, 'anticipa'));
      await esperar(2.2);
      cuerpo.posar({ cabeza: { yaw: 0, pitch: -2, roll: 6 } }, 0.9); cuerpo.seguir(0.8);
      await esperar(cuerpo.posar({ [b]: { brazo: [0.35, -0.85, 0.3], ante: [0.1, -0.3, 1] } }, 1.2));
    }),
    colgar: parte => { cuerpo.posar({ [parte]: R[parte] }, 1.1, 'sale'); },
    sonrisa: () => { cuerpo.fijar({ cara: { boca: 'feliz', ojos: 'fijo' } }); },
    respirar: () => { cuerpo.posar({ torso: { pitch: 4, yaw: 0, roll: 0 } }, 1.5); },
  };
  // corta el hilo de una parte: esa parte pasa a ser de ella (y hace lo suyo, salvo en los cortes de limpieza)
  function cortar(parte, conComportamiento = true) {
    if (hilos.cortar(parte)) audio.fx('hilo');
    const partes = parte === 'brazoIzq' ? ['brazoIzq', 'manoIzq'] : parte === 'brazoDer' ? ['brazoDer', 'manoDer'] : [parte];
    cuerpo.dial(partes, { propio: 1 }, 0.9);
    anotar(`✂ hilo: ${parte}`);
    const comp = guion.degradacion.alCortar?.[parte];
    if (conComportamiento && AL_CORTAR[comp]) AL_CORTAR[comp](parte);
  }
  // pollito inglés: la pose avanza solo mientras no la mirás
  const POLLITO = [
    { p: 0, torso: { pitch: 4, roll: 0, yaw: 0 }, cabeza: { pitch: -2, roll: 4, yaw: 0 }, raiz: { x: 0, y: 0, z: 0, giro: 0 }, brazoDer: R.brazoDer, brazoIzq: R.brazoIzq },
    { p: 0.35, torso: { pitch: 10, roll: -6, yaw: 0 }, cabeza: { pitch: -6, roll: 14, yaw: 0 }, raiz: { x: 0, y: -0.02, z: 0.1, giro: 0 } },
    { p: 0.7, torso: { pitch: 12, roll: -4, yaw: 0 }, cabeza: { pitch: -9, roll: 18, yaw: 0 }, raiz: { x: 0, y: -0.04, z: 0.2, giro: 0 },
      brazoDer: { brazo: [0.15, -0.2, 1], ante: [0.05, 0.3, 1] } },
    { p: 1, torso: { pitch: 16, roll: 0, yaw: 0 }, cabeza: { pitch: -12, roll: 8, yaw: 0 }, raiz: { x: 0, y: -0.05, z: 0.3, giro: 0 },
      brazoDer: { brazo: [0.12, 0, 1], ante: [0, 0.5, 1] } },
  ];
  function posePollito(p) {
    const out = {};
    for (const parte of ['torso', 'cabeza', 'raiz', 'brazoDer', 'brazoIzq']) {
      const ks = POLLITO.filter(k => k[parte]);
      let a = ks[0], b = ks[ks.length - 1];
      for (let i = 0; i < ks.length - 1; i++) if (p >= ks[i].p && p <= ks[i + 1].p) { a = ks[i]; b = ks[i + 1]; break; }
      const k = b.p > a.p ? (p - a.p) / (b.p - a.p) : 1, s = k * k * (3 - 2 * k);
      out[parte] = {};
      for (const key of Object.keys(b[parte])) {
        const va = a[parte][key], vb = b[parte][key];
        out[parte][key] = Array.isArray(vb) ? vb.map((x, j) => va[j] + (x - va[j]) * s) : va + (vb - va) * s;
      }
    }
    return out;
  }

  // ================================================================ datos de la persona (para la burla del acto 3)
  const nuevosDatos = () => ({ consignas: [], trampa: null, risaSeg: 0, estatuas: [], gesto: false, copia: null });
  let datos = nuevosDatos(), consignaActiva = null;

  // una consigna: indicador + frase + mirar si la cumple (vale si la hace mientras Richie habla)
  async function consigna(c, { trampa = false, i } = {}) {
    pantalla.indicador({ encabezado: trampa ? '' : 'Richie dice', icono: c.icono, texto: c.texto });
    consignaActiva = c.detecta;
    let tHecho = null;
    const dur = await hablar(trampa ? 'R1-trampa' : 'R1-consigna-' + c.id, { i, esperarFin: false });
    const finFrase = reloj + dur;
    const ok = await hasta(() => { if (tHecho === null && sen.cumple(c.detecta)) tHecho = reloj; return tHecho !== null; },
      dur + (trampa ? guion.acto1.plazoTrampa : guion.acto1.plazo));
    consignaActiva = null;
    if (reloj < finFrase) await esperar(finFrase - reloj + 0.1);
    return { ok, t: ok ? Math.max(0, tHecho - finFrase) : null };
  }
  // juego de las estatuas (poses 1 y 2): devuelve si aguantó quieto
  async function estatua(n) {
    const p = guion.poses[n], dur = guion.acto2.estatua;
    audio.seguirMusica();
    pantalla.indicador({ encabezado: 'Pose ' + (n + 1), icono: p.icono, texto: p.texto, ayuda: p.ayuda });
    await hablar('R2-pose-' + (n + 1));
    await esperar(guion.acto2.musicaAntes);
    audio.cortarMusica(); audio.fx('estatua');
    lanzar(() => hablar('R2-estatua', { esperarFin: false }));
    let movido = 0;
    for (let k = Math.ceil(dur); k > 0; k--) {
      pantalla.estatua('¡ESTATUA!', k); audio.fx('tic');
      await hasta(() => { if (!S.quieto) movido += dtUlt; return false; }, 1);
    }
    pantalla.estatua(null, null); pantalla.indicador(null);
    const ok = movido < 0.5;
    anotar(`estatua ${n + 1}: ${ok ? 'aguantó' : 'se movió'} (${movido.toFixed(1)} s moviéndose)`);
    audio.fx(ok ? 'bien' : 'mal');
    await hablar(ok ? 'R2-estatua-bien' : 'R2-estatua-mal');
    return ok;
  }

  // ================================================================ los pasos
  const PASOS = {
    // ---------------- ESPERA: pantalla de título alegre, tiesme no está
    async espera() {
      datos = nuevosDatos();
      ponerEscena('espera', 0.8);
      pantalla.limpiar(); pantalla.titulo(true); pantalla.negro(0, 0.8); pantalla.sonidoAviso(!audio.listo());
      hilos.reset(); cuerpo.limpiar();
      cuerpo.mostrar(false); cuerpo.dial('todo', { propio: 1, retraso: 0, impreciso: 0, contrario: 0 }, 0);
      cuerpo.reposo(0); cuerpo.fijar({ raiz: { x: lado * 1.9, y: 0, z: 0, giro: 0 } }); cuerpo.seguir(0); cuerpo.vida(1);
      // la asomada se arma recién cuando no se ve a nadie 1,5 s (si no, la persona que se va dispararía otra)
      let armada = false;
      await hasta(() => { if (S.vistoHace > 1.5) armada = true; return S.presente || (armada && S.entrando); });
      return S.presente ? '1.2' : '1.1';
    },

    // ---------------- ACTO 1: TITIRITERO
    // 1.1 la cámara te ve entrando: tiesme se asoma tímida desde la puerta y se esconde (única pista de que está viva)
    async '1.1'() {
      const d = guion.acto1.asomada;
      cuerpo.mostrar(true); cuerpo.dial('todo', { propio: 1 }, 0);
      cuerpo.fijar({ raiz: { x: lado * 1.9, y: 0.02 }, torso: R.torso, cabeza: R.cabeza });
      audio.fx('asomada');
      cuerpo.posar({ raiz: { x: lado * 1.05 }, torso: { roll: lado * 16, yaw: -lado * 12, pitch: 3 }, cabeza: { yaw: -lado * 24, roll: lado * 12, pitch: 6 } }, d * 0.3, 'sale');
      await esperar(d * 0.62);
      cuerpo.posar({ raiz: { x: lado * 1.9 }, torso: R.torso, cabeza: R.cabeza }, d * 0.28, 'anticipa');
      await esperar(d * 0.38);
      cuerpo.mostrar(false);
      return (await hasta(() => S.presente, 20)) ? '1.2' : 'espera';
    },
    // 1.2 llegaste a tu lugar: sube desde abajo con un barrido y pasa a copiarte
    async '1.2'() {
      pantalla.titulo(false); pantalla.sonidoAviso(false); audio.pararMusica(0.5);
      cuerpo.mostrar(true); cuerpo.dial('todo', { propio: 1, retraso: 0, impreciso: 0, contrario: 0 }, 0);
      cuerpo.reposo(0); cuerpo.fijar({ raiz: { x: 0, y: -2.4, z: 0, giro: 0 } });
      audio.fx('fiuuu');
      await esperar(cuerpo.posar({ raiz: { y: 0 } }, guion.acto1.entrada, 'sale'));
      audio.fx('inicio');
      cuerpo.dial('todo', { propio: 0 }, 0.8);
      await esperar(0.8);
    },
    // 1.3 te copia todo; Richie la despierta; si no te movés, arranca la primera consigna
    async '1.3'() {
      prepararJuego();
      const a = guion.acto1;
      await esperar(a.saludoA);
      await hablar('R1-saludo');
      const quieto = await hasta(() => S.quietoSeg >= a.quietoSeg, Math.max(0, a.descubre - (reloj - pasoT0)));
      if (quieto) await hablar('R1-quieto');
    },
    // 1.4 Richie dice: consignas, chamuyo, la trampa y "tu mejor gesto" (se graba para el acto 3)
    async '1.4'() {
      prepararJuego();
      const a = guion.acto1;
      const iT = Math.random() * guion.trampas.length | 0, trampa = guion.trampas[iT];
      const pool = mezclar(guion.consignas.filter(c => c.detecta !== trampa.detecta));
      for (const cosa of a.orden) {
        if (cosa === 'consigna') {
          const c = pool.shift() || guion.consignas[0];
          const r = await consigna(c);
          datos.consignas.push({ id: c.id, ok: r.ok, t: r.t });
          anotar(`consigna ${c.id}: ${r.ok ? `✔ ${r.t.toFixed(1)} s` : '✘'}`);
          audio.fx(r.ok ? 'bien' : 'mal'); pantalla.marca(r.ok ? '✔' : '✘');
          await hablar(r.ok ? 'R1-bien' : 'R1-tarde');
          pantalla.indicador(null);
        } else if (cosa === 'trampa') {
          const r = await consigna(trampa, { trampa: true, i: iT });
          datos.trampa = r.ok;
          anotar(`trampa: ${r.ok ? 'CAYÓ' : 'no cayó'}`);
          if (r.ok) { audio.fx('risa'); pantalla.marca('✘'); } else pantalla.marca('✔');
          await hablar(r.ok ? 'R1-trampa-si' : 'R1-trampa-no');
          pantalla.indicador(null);
        } else if (cosa === 'chamuyo') {
          await hablar('R1-chamuyo');
        } else if (cosa === 'gesto') {
          pantalla.indicador({ icono: '🤪', texto: '¡tu mejor gesto!' });
          await hablar('R1-gesto', { pausa: 0 });
          cuerpo.grabar(a.gestoSeg);
          await esperar(a.gestoSeg + 0.15);
          datos.gesto = !!cuerpo.grabacion();
          anotar(`gesto grabado: ${datos.gesto ? 'sí' : 'no'}`);
          audio.fx('bien'); pantalla.marca('✔');
          await hablar('R1-bien');
          pantalla.indicador(null);
        }
        await esperar(a.pausa);
      }
    },

    // ---------------- ACTO 2: ESTATUA / REVELACIÓN
    // 2.1 juego de las estatuas, poses 1 y 2 (todavía todo normal)
    async '2.1'() {
      prepararJuego();
      await hablar('R2-estatuas');
      for (const n of [0, 1]) datos.estatuas.push(await estatua(n));
    },
    // 2.2 tercera pose: "¡estatua!" y ACÁ SE LIBERA: la cabeza es de ella y gira despacio hasta mirarte.
    // Plan B: si te quedás quieto, se mueve sola; si te movés, la cabeza no te sigue.
    async '2.2'() {
      prepararJuego();
      const a = guion.acto2, p = guion.poses[2];
      audio.seguirMusica();
      pantalla.indicador({ encabezado: 'Pose 3', icono: p.icono, texto: p.texto, ayuda: p.ayuda });
      await hablar('R2-pose-3');
      await esperar(a.musicaAntes);
      audio.cortarMusica(); audio.fx('estatua');
      lanzar(() => hablar('R2-estatua', { esperarFin: false }));
      cuerpo.fijar({ cabeza: { yaw: 0, pitch: -2, roll: 0 } });
      cuerpo.dial('cabeza', { propio: 1 }, a.giroCabeza);
      anotar('la cabeza se libera');
      lanzar(async () => { await esperar(1.6); audio.fx('glitch', { vol: 0.35 }); });
      for (let k = Math.ceil(a.estatua3); k > 0; k--) { pantalla.estatua('¡ESTATUA!', k); audio.fx('tic'); await esperar(1); }
      pantalla.estatua(undefined, 0);
      cuerpo.seguir(0.5);
    },
    // 2.3 el timer llega a 0 y no aparece "¡ganaste!": se traba, titila y va para atrás; la pantalla falla;
    // aparecen los hilos; Richie actúa la sorpresa (él sabía)
    async '2.3'() {
      asegurarCabezaPropia();
      audio.cortarMusica(); pantalla.indicador(null);
      pantalla.estatua('¡ESTATUA!', 0, { roto: true });
      audio.fx('glitch'); pantalla.glitch(0.35); esc.glitch(0.4); audio.zumbar(true);
      hilos.mostrar(true, 1.2); hilos.tensar(0.15);
      lanzar(async () => {
        for (const s of ['0', '0', '1', '3', '2', '-1', '?', '¿?', '-7']) {
          pantalla.estatua(pantalla.romper('¡ESTATUA!', 0.25), s, { roto: true }); await esperar(0.42);
        }
        pantalla.estatua(null, null);
      });
      await esperar(1.0);
      await hablar('R2-glitch', { roto: true });
      await esperar(guion.acto2.algoAndaMal - (reloj - pasoT0));
      pantalla.estatua(null, null); pantalla.glitch(0.12);
    },
    // 2.4 la degradación: cada parte a su ritmo (guion.degradacion): retraso → impreciso → lo contrario → se corta
    async '2.4'() {
      asegurarCabezaPropia();
      audio.cortarMusica(); audio.zumbar(true); pantalla.estatua(null, null); pantalla.indicador(null);
      hilos.mostrar(true, 0.6); esc.glitch(0.25); pantalla.glitch(0.12);
      const g = guion.degradacion, t0 = reloj;
      const eventos = [...g.pasos.map(e => ({ ...e, tipo: 'paso' })), ...(g.frases || []).map(e => ({ ...e, tipo: 'frase' }))].sort((a, b) => a.t - b.t);
      lanzar(async () => { // ráfagas de glitch y los hilos cada vez más tensos
        while (reloj - t0 < g.dur) {
          await esperar(1.4 + Math.random() * 2.4);
          audio.fx('glitch', { vol: 0.4 }); pantalla.glitch(0.6); hilos.tensar(Math.min(1, (reloj - t0) / g.dur));
          await esperar(0.22); pantalla.glitch(0.12);
        }
      });
      for (const ev of eventos) {
        await esperar(t0 + ev.t - reloj);
        if (ev.tipo === 'frase') { lanzar(() => hablar(ev.codigo, { susurro: ev.codigo === 'R2-susurro', esperarFin: false })); continue; }
        if (ev.cortar) { cortar(ev.cortar); continue; }
        const vals = {};
        for (const k of ['retraso', 'impreciso', 'contrario']) if (ev[k] !== undefined) vals[k] = ev[k];
        cuerpo.dial(ev.partes, vals, 1.2);
        anotar(`${ev.partes.join(', ')}: ${Object.entries(vals).map(([k, v]) => k + ' ' + v).join(', ')}`);
      }
      await esperar(t0 + g.dur - reloj);
    },
    // 2.4b pollito inglés (a probar): tiesme se acerca SOLO cuando no la mirás; si la mirás, se congela
    async '2.4b'() {
      if (!guion.pollito?.activo) return;
      if (hilos.visibles()) for (const parte of hilos.quedan()) cortar(parte, false);
      cuerpo.dial('todo', { propio: 1 }, 0.8); hilos.mostrar(false, 0.8);
      pantalla.glitch(0); esc.glitch(0.08); cuerpo.seguir(0.3);
      lanzar(() => hablar('R2-susurro', { i: 2, susurro: true, esperarFin: false }));
      let prog = 0;
      const llego = await hasta(() => {
        cuerpo.vida(S.mira ? 0 : 1);
        if (!S.mira) prog = Math.min(1, prog + dtUlt / 5); // 5 s sin mirarla para llegar al vidrio
        cuerpo.fijar(posePollito(prog));
        return prog >= 1;
      }, guion.pollito.dur);
      anotar(`pollito: ${llego ? 'llegó al vidrio' : `avanzó ${Math.round(prog * 100)}%`}`);
      cuerpo.vida(1);
    },
    // 2.5 el quiebre: negro, luz dura, música oscura; se inclina, te mira de cerca, saluda, sonríe, golpea el vidrio
    async '2.5'() {
      if (hilos.visibles()) for (const parte of hilos.quedan()) cortar(parte, false);
      cuerpo.dial('todo', { propio: 1 }, 0.6); hilos.mostrar(false, 0.6);
      pantalla.glitch(0); pantalla.indicador(null); pantalla.estatua(null, null);
      audio.zumbar(false); ponerEscena('oscura', 1.6);
      cuerpo.mostrar(true); cuerpo.seguir(0.6); cuerpo.vida(1);
      await esperar(cuerpo.posar({ raiz: { x: 0, y: -0.05, z: 0.32, giro: 0 }, torso: { pitch: 16, roll: 0, yaw: 0 }, cabeza: { pitch: -14, yaw: 0, roll: 6 },
        brazoIzq: R.brazoIzq, brazoDer: R.brazoDer }, 1.6));
      cuerpo.dial('cara', { propio: 1 }, 0.2); cuerpo.fijar({ cara: { boca: 'feliz', ojos: 'fijo', cejas: null } });
      await esperar(0.6);
      await saludar('brazoDer', 3);
      await golpearVidrio('brazoIzq', 2);
      lanzar(() => hablar('T2-sonido', { i: 1, esperarFin: false }));
      await esperar(Math.max(0.8, guion.acto2.quiebre - (reloj - pasoT0)));
    },

    // ---------------- ACTO 3: CONTRA-TITIRITERO
    // 3.1 primera vez que alguien te habla (y primera vez que habla tiesme)
    async '3.1'() {
      prepararOscura();
      await esperar(0.6);
      await hablar('R3-hola');
      await hablar('T3-hola');
      const nR = guion.frases['R3-charla'].length, nT = guion.frases['T3-charla'].length;
      for (let i = 0; i < Math.max(nR, nT); i++) {
        if (i < nR) await hablar('R3-charla', { i });
        if (i < nT) await hablar('T3-charla', { i });
      }
    },
    // 3.2 la burla con lo tuyo: 2 datos de lo que hiciste + tiesme repite tu gesto exagerado; Richie confiesa
    async '3.2'() {
      prepararOscura();
      const ok = datos.consignas.filter(x => x.ok), op = [];
      if (datos.trampa !== null) op.push(datos.trampa ? 'R3-dato-trampa-si' : 'R3-dato-trampa-no');
      op.push(datos.risaSeg > 1 ? 'R3-dato-risa-si' : 'R3-dato-risa-no');
      if (datos.estatuas.length) op.push(datos.estatuas.every(Boolean) ? 'R3-dato-estatuas-si' : 'R3-dato-estatuas-no');
      if (ok.length) { const t = prom(ok.map(x => x.t)); if (t < 1.2) op.push('R3-dato-rapido'); else if (t > 2.5) op.push('R3-dato-lento'); }
      for (const cod of mezclar(op).slice(0, 2)) await hablar(cod, { pausa: 0.4 });
      if (cuerpo.grabacion()) {
        await hablar('R3-dato-gesto');
        cuerpo.seguir(0);
        const dur = cuerpo.reproducir(undefined, { vel: 0.85, exag: 1.35, veces: 2 });
        lanzar(async () => { await esperar(0.5); audio.fx('risa'); await esperar(dur * 0.5); audio.fx('risa'); });
        await esperar(dur + 0.2);
        cuerpo.pararRepro(); cuerpo.seguir(0.7);
        await hablar('T3-dato-gesto');
      }
      await hablar('R3-confiesa');
    },
    // 3.3 copiá vos: tiesme hace poses, vos la copiás, puntaje humillante
    async '3.3'() {
      prepararOscura();
      const a = guion.acto3;
      await hablar('R3-copia');
      await hablar('T3-copia');
      let suma = 0;
      for (const p of guion.copiaPoses) {
        pantalla.indicador({ encabezado: '¡Copiala!', icono: p.icono, texto: p.texto });
        await esperar(cuerpo.posar(POSES_COPIA[p.id] || {}, 0.8, 'sale'));
        let si = 0, total = 0;
        await hasta(() => { total += dtUlt; if (sen.ahora(p.detecta)) si += dtUlt; return false; }, a.copiaPose);
        suma += total ? si / total : 0;
        pantalla.indicador(null);
      }
      cuerpo.posar({ brazoIzq: R.brazoIzq, brazoDer: R.brazoDer }, 0.8);
      const real = 100 * suma / Math.max(1, guion.copiaPoses.length);
      const num = Math.min(a.puntajeMax, Math.round(real * a.puntajeFactor));
      datos.copia = { real: Math.round(real), num };
      anotar(`copiá vos: real ${Math.round(real)}% → muestra ${num}%`);
      audio.fx(num > 30 ? 'bien' : 'mal');
      pantalla.puntaje(num + '%', 'de parecido');
      await hablar(num > 30 ? 'R3-copia-bien' : num > 15 ? 'R3-copia-mal' : 'R3-copia-horrible');
      await esperar(0.8); pantalla.puntaje(null);
    },
    // 3.4 te echan: chau, "andá", risas, se apaga la luz, tiesme se va. Si no te vas: escalada.
    async '3.4'() {
      prepararOscura();
      await hablar('R3-chau');
      lanzar(() => gestoAnda('brazoDer', 3));
      await hablar('T3-chau');
      audio.fx('risa');
      await esperar(1.4);
      audio.fx('apagar'); audio.pararMusica(2); pantalla.negro(0.85, 1.5);
      cuerpo.seguir(0);
      await esperar(cuerpo.posar({ raiz: { x: lado * 1.9, z: 0 }, torso: { yaw: lado * 25, pitch: 0 }, cabeza: { yaw: lado * 15, pitch: 0 } }, 2.4));
      cuerpo.mostrar(false);
      const salida = () => ausente >= guion.casos.salidaFinal;
      if (await hasta(salida, guion.acto3.chauEspera)) return 'reinicio';
      // no se va: Richie se ofende; todo negro con el ojo mirándote
      pantalla.negro(1, 0.8); pantalla.ojo(true);
      await hablar('R3-noseva', { i: 0 });
      if (await hasta(salida, 10)) return 'reinicio';
      await hablar('R3-noseva', { i: 1 });
      await hasta(salida);
      return 'reinicio';
    },

    // ---------------- REINICIO: vuelve la pantalla alegre como si nada
    async reinicio() {
      pantalla.ojo(false); pantalla.negro(1, 0.6); audio.pararMusica(0.6); audio.zumbar(false);
      await esperar(1.0);
      pantalla.limpiar(); hilos.reset(); cuerpo.mostrar(false);
      return 'espera';
    },
  };

  // ================================================================ casos: la persona se va en el medio
  const ACTIVOS = new Set(['1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4', '2.4b', '2.5', '3.1', '3.2', '3.3']);
  const avisados = new Set();
  function vigilarCasos() {
    if (!ACTIVOS.has(paso) || pausado) return;
    if (S.presente) { avisados.delete('volve'); avisados.delete('sefue'); return; }
    const c = guion.casos;
    if ((paso === '1.3' || paso === '1.4') && ausente > c.volveA && !avisados.has('volve')) { avisados.add('volve'); lanzar(() => hablar('R1-volve', { esperarFin: false })); }
    if (ausente > c.seFueA && !avisados.has('sefue')) { avisados.add('sefue'); lanzar(() => hablar('R-sefue', { esperarFin: false })); }
    if (ausente > c.reinicioA) { anotar('se fue: reinicio'); ir('reinicio'); }
  }

  // ================================================================ cara de tiesme (lo llama el motor)
  const faceHist = [];
  const muestra = (h, t) => { for (let i = h.length - 1; i >= 0; i--) if (h[i][0] <= t) return h[i][1]; return h[0]?.[1]; };
  const copiarCats = r => r?.faceBlendshapes?.[0]?.categories?.map(c => ({ categoryName: c.categoryName, score: c.score })) || null;
  const deCats = cats => (cats ? { faceBlendshapes: [{ categories: cats }] } : undefined);
  function sintetica(c, jaw = null) {
    if (!c.boca && !c.ojos && !c.cejas && jaw === null) return undefined; // sin nada: ojos "vivos" (se mueven solos)
    const v = {
      jawOpen: jaw ?? (c.boca === 'A' ? 0.7 : c.boca === 'E' ? 0.16 : 0), mouthPucker: c.boca === 'O' ? 0.8 : 0,
      mouthSmileLeft: c.boca === 'feliz' ? 0.95 : 0, mouthSmileRight: c.boca === 'feliz' ? 0.95 : 0,
      eyeBlinkLeft: c.ojos === 'cerrados' ? 0.95 : 0, eyeBlinkRight: c.ojos === 'cerrados' ? 0.95 : 0,
      browInnerUp: c.cejas === 'up' ? 0.95 : 0, browDownLeft: c.cejas === 'down' ? 0.9 : 0, browDownRight: c.cejas === 'down' ? 0.9 : 0,
    };
    return deCats(Object.entries(v).map(([categoryName, score]) => ({ categoryName, score })));
  }
  function cara(caraObj, faceNow, caraIn, now) {
    const t = performance.now() / 1000;
    if (faceNow) {
      faceHist.push([t, caraIn]); while (faceHist.length > 2 && t - faceHist[0][0] > 2.5) faceHist.shift();
      if (cuerpo.grabando()) { const g = cuerpo.cuadroGrab(); if (g) g.cara = copiarCats(caraIn); }
    }
    const P = cuerpo.P.cara, rep = cuerpo.cuadroRep();
    const hablaElla = hablando.quien === 'tiesme' && tPant < hablando.hasta;
    let entrada, usar = true;
    if (rep) entrada = deCats(rep.cara?.map(c => ({ ...c, score: Math.min(1, c.score * 1.3) })));
    else if (P.propio >= 0.5 || hablaElla) {
      let jaw = null;
      // boca al ritmo de la voz (el nivel medido del sonidito va de 0,02 a 0,22)
      if (hablaElla) { const n = audio.listo() ? audio.nivel() : 0.5 + 0.5 * Math.sin(t * 22); jaw = n > 0.04 ? 0.3 + Math.min(1, n * 3) * 0.5 : 0; }
      entrada = sintetica(cuerpo.pose.cara, jaw);
    } else if (P.retraso > 0.01) entrada = muestra(faceHist, t - P.retraso);
    else { entrada = caraIn; usar = faceNow; }
    if (usar) caraObj.procesar(entrada, now);
  }

  // ================================================================ teclas de quien atiende
  function tecla(e) {
    audio.iniciar(); pantalla.sonidoAviso(false);
    if (e.target?.tagName === 'SELECT' || e.target?.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    const propias = {
      '0': () => ir('reinicio'), home: () => ir('reinicio'),
      '1': () => ir('1.2'), '2': () => ir('2.1'), '3': () => ir('3.1'),
      arrowright: () => ir(ORDEN[ORDEN.indexOf(paso) + 1] || 'espera'),
      ' ': () => { pausado = !pausado; pantalla.verPausa(pausado); },
      d: () => pantalla.panel(),
    };
    if (propias[k]) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) propias[k](); return; }
    // del tracking solo quedan: pantalla completa, panel, cámara y calibrar
    if (!['f', 'h', 'v', 'c', 'g'].includes(k)) e.stopImmediatePropagation();
  }
  addEventListener('keydown', tecla, true);
  addEventListener('pointerdown', () => { audio.iniciar(); pantalla.sonidoAviso(false); }, true);

  // ================================================================ panel de quien atiende (D)
  let panelT = 0;
  const sn = (b, s = b ? 'sí' : 'no') => `<span class="${b ? 'si' : 'no'}">${s}</span>`;
  const f2 = x => (x ?? 0).toFixed(2), g0 = x => Math.round(x ?? 0);
  function actualizarPanel() {
    const c = S.cara, cb = S.cabeza;
    const det = Object.keys(sen.DETECTA).filter(n => sen.ahora(n));
    const partes = PARTES.map(p => { const v = cuerpo.P[p]; return `${p.padEnd(8)} ${f2(v.propio)} ${f2(v.retraso)} ${f2(v.impreciso)} ${f2(v.contrario)}`; }).join('\n');
    const cs = datos.consignas.map(x => `${x.ok ? '✔' : '✘'}${x.id}${x.ok ? ' ' + x.t.toFixed(1) + 's' : ''}`).join(' · ') || '—';
    pantalla.panelHTML(
      `<b>${VERSION_CABINA}</b> <span class="dim">· motor tracking ${api.VERSION}</span>\n` +
      `<b>PASO ${paso} ${NOMBRE[paso] || ''}</b>  ${(reloj - pasoT0).toFixed(1)} s${pausado ? '  <span class="no">PAUSA</span>' : ''}${frenado ? '  <span class="no">(esperando que vuelva)</span>' : ''}\n` +
      `sonido: ${audio.listo() ? sn(true, 'activo') : sn(false, 'tocá una tecla')}  ·  audio grabado: ${Object.keys(audio.archivos).length}\n\n` +
      `<b>Persona</b> ${S.presente ? sn(true, 'en su lugar') : S.entrando ? '<span class="si">entrando</span>' : sn(false, 'no hay')}  x ${f2(S.x)}  fuera ${ausente.toFixed(1)} s\n` +
      `cabeza ${cb.ok ? '' : '<span class="dim">(no se ve)</span>'} giro ${g0(cb.yaw)}° cabeceo ${g0(cb.pitch)}° incl ${g0(cb.roll)}°  mira ${sn(S.mira)}\n` +
      `manos: su izq ${S.manos.izq ? '↑' : '·'} su der ${S.manos.der ? '↑' : '·'}  saludo ${sn(S.saludo)}  cruz ${sn(S.cruz)}\n` +
      `cara ${c.ok ? '' : '<span class="dim">(no se ve)</span>'} boca ${f2(c.jaw)}/${UMBRAL.boca} sonrisa ${f2(c.smile)}/${UMBRAL.sonrisa} ojos ${f2(c.blink)}/${UMBRAL.ojos}\n` +
      `cejas ${f2(c.brow)} (normal ${f2(c.browBase)} +${UMBRAL.cejas})\n` +
      `movimiento ${f2(S.mov)}/${UMBRAL.quieto}  quieto ${S.quietoSeg.toFixed(1)} s\n` +
      `detecta: ${det.join(', ') || '—'}\n\n` +
      `<b>Partes</b> <span class="dim">propio retraso impreciso contrario</span>\n${partes}\n\n` +
      `<b>Datos</b>\nconsignas: ${cs}\ntrampa: ${datos.trampa === null ? '—' : datos.trampa ? 'cayó' : 'no cayó'} · risa ${datos.risaSeg.toFixed(1)} s · ` +
      `estatuas: ${datos.estatuas.map(x => (x ? '✔' : '✘')).join('') || '—'} · gesto: ${datos.gesto ? 'sí' : '—'}` +
      `${datos.copia ? ` · copia ${datos.copia.real}%→${datos.copia.num}%` : ''}\n\n` +
      `<b>Últimas cosas</b>\n${registro.map(s => '<span class="dim">' + s.replace(/</g, '&lt;') + '</span>').join('\n')}\n\n` +
      `<span class="dim">0 reiniciar · 1 2 3 actos · → siguiente paso · Espacio pausa · D este panel\nF pantalla completa · H panel del tracking · V cámara · C calibrar postura</span>`,
    );
  }

  // ================================================================ lo que llama el motor
  let errores = 0;
  function cuadro(dt, now, fd, engaged) {
    try {
      sen.actualizar(dt, fd, engaged);
      ausente = S.presente ? 0 : ausente + dt;
      frenado = (paso === '1.3' || paso === '1.4') && ausente > 0.5;
      dtUlt = pausado || frenado ? 0 : dt;
      if (!pausado && !frenado) { reloj += dt; resolverEsperas(); }
      vigilarCasos();
      if ((paso === '1.3' || paso === '1.4') && S.cara.ok && S.cara.smile > UMBRAL.sonrisa && consignaActiva !== 'sonreir') datos.risaSeg += dt;
      if (S.presente) cuerpo.mirarA(S.x, dt);
      cuerpo.cuadro(dt, pausado);
      esc.cuadro(dt);
      hilos.cuadro(dt);
      if (!pausado) tPant += dt;
      pantalla.cuadro(tPant * 1000);
      pantalla.ojoX(S.x);
      if ((panelT += dt) > 0.25) { panelT = 0; actualizarPanel(); }
    } catch (e) { if (errores++ < 5) console.error('[cabina] cuadro', e); }
  }
  function hueso(r, t, dt, maxRate) {
    try { return cuerpo.hueso(r, t, dt, maxRate); } catch (e) { if (errores++ < 5) console.error('[cabina] hueso', e); return [t, maxRate]; }
  }

  // acceso para probar desde la consola: __cabina.ir('2.4'), __cabina.S, __cabina.cuerpo…
  window.__cabina = { ir, S, sen, cuerpo, audio, pantalla, esc, hilos, datos: () => datos, paso: () => paso, guion, UMBRAL };
  correr('espera');
  return { cuadro, hueso, cara };
}
