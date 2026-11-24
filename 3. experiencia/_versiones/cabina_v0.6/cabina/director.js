// DIRECTOR de la cabina v0.5 (cartón): "EL NÚMERO DE TIESME". Recorre las escenas de EXPLORACION_CONCEPTO.md
// (sección 12) con los textos y tiempos de guion.js. Lo carga el motor (motor_v12/app.js, bloque ">>> CABINA") y lo
// llama en cada cuadro (cuadro), por cada hueso (hueso) y para la cara (cara). Las versiones viejas están en
// _versiones/ (la v0.2.1 tiene botones, críptico, función y selfie; la v0.3, el juego de los hilos).
// v0.5: el final es la escena 7 "¡Cambio!" (se alternan "te copia" y "copiala", cada vez más rápido; el águila entre
// los tres); la v0.4 (sin juego final) y la v0.3 (los hilos) están en _versiones/.
//
// Teclas de quien atiende: 0 reiniciar · 1 a 7 saltar a una escena · → escena siguiente · Espacio pausa · D panel ·
// M marcar "acá algo anduvo mal" (queda en el registro de la partida con el segundo).
// Del tracking siguen andando: F pantalla completa · H panel del tracking · V cámara · C calibrar postura · G gestos ·
// O girar la imagen (9/11: la cámara va montada en vertical; por defecto 90°, O pasa a 180/270/0 y queda guardado).

import guion from '../guion.js';
import { crearAudio } from './audio.js';
import { crearPantalla } from './pantalla.js';
import { crearEscenario } from './escenario.js';
import { crearHilos } from './hilos.js';
import { crearSenales, UMBRAL } from './senales.js';
import { crearCuerpo, PARTES } from './cuerpo.js';
import { crearSombra } from './sombra.js';

export const VERSION_CABINA = guion.version || 'cabina v0.4';
const CANCELADO = Symbol('cancelado');
const ORDEN = ['espera', '1', '2', '3', '4', '5', '6', '7', 'fin'];
const NOMBRE = {
  espera: 'Espera (telón cerrado)', 1: 'Presentación', 2: 'Calentamiento (Richie dice)', 3: 'Ensayo (estatuas)',
  4: 'Revelación', 5: 'Discusión', 6: 'Registran que estás', 7: '¡Cambio! (¿quién copia a quién?)', fin: 'Fin',
};
const ANTES = new Set(['1', '2', '3']); // antes de la revelación: habla solo Richie
const ACTIVOS = new Set(['1', '2', '3', '4', '5', '6', '7']);
const mezclar = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

export function crearDirector(api) {
  const audio = crearAudio(guion);
  const pantalla = crearPantalla(api, guion);
  const esc = crearEscenario(api);
  const hilos = crearHilos(api, pantalla.hilosCanvas, pantalla.dpr);
  const sen = crearSenales(api), S = sen.S;
  const cuerpo = crearCuerpo(api), R = cuerpo.REPOSO;
  const sombra = crearSombra(api, cuerpo, guion);
  const lado = guion.puerta === 'derecha' ? 1 : -1;
  const { camera, renderer, THREE } = api;

  document.title = 'tiesme · ' + VERSION_CABINA;
  api.panel.classList.add('oculto');
  api.camBox.classList.add('oculto');

  // ================================================================ reloj y pasos
  // El reloj del director se frena con la pausa y mientras la persona está fuera de cuadro (se conserva el avance).
  // tPant (pantalla y voces) se frena solo con la pausa: con él hablan los comentarios de ausencia.
  let reloj = 0, pausado = false, frenado = false, corrida = 0, paso = null, pasoT0 = 0, dtUlt = 0, ausente = 0, tPant = 0;
  const esperas = new Set(), esperasP = new Set();
  // (marca: un objeto donde guardar la espera, para poder acortarla después; lo usa la frase cortada por una ausencia)
  const esperar = (seg, marca) => { const id = corrida; return new Promise((res, rej) => { const e = { hasta: reloj + Math.max(0, seg), res, rej, id }; esperas.add(e); if (marca) marca.espera = e; }); };
  const hasta = (cond, maxSeg = Infinity) => { const id = corrida; return new Promise((res, rej) => esperas.add({ hasta: reloj + maxSeg, cond, res, rej, id })); };
  const esperarP = seg => new Promise((res, rej) => esperasP.add({ hasta: tPant + Math.max(0, seg), res, rej }));
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
        paso = p; pasoT0 = reloj; aus.avisado = false;
        anotar(`— ${p} ${NOMBRE[p]}`);
        console.log('[cabina] escena', p, NOMBRE[p]);
        const sig = await PASOS[p]();
        if (id !== corrida) return;
        p = sig || ORDEN[ORDEN.indexOf(p) + 1] || 'espera';
      }
    } catch (e) { if (e !== CANCELADO) { console.error(e); api.flash('Error en la cabina: ' + e.message); } }
  }
  function ir(p) {
    audio.callar(); pantalla.limpiar(); cuerpo.limpiar(); audio.zumbar(false); hilos.reset(); soltarCamara(0);
    caraForzada = null; sombra.brillar(0);
    aus.token++; aus.avisado = false; aus.volviendo = false; aus.cortada = null; // corta un comentario de ausencia que estuviera sonando
    correr(p);
  }

  // ================================================================ hablar (voz + viñeta)
  const ultimaVariante = {}, registro = [];
  let hablando = { quien: null, hasta: 0 }, escena = 'espera';
  // v0.2.1: la última frase de la escena (no los comentarios de ausencia), para repetirla si la persona se fue en el
  // medio y no la llegó a ver
  let ultimaDicha = null;
  function elegir(codigo, n) {
    if (n <= 1) return 0;
    let i; do i = Math.random() * n | 0; while (i === ultimaVariante[codigo]);
    return (ultimaVariante[codigo] = i);
  }
  function decir(codigo, { i, roto = false, susurro = false, caso = false } = {}) {
    const lista = guion.frases[codigo];
    if (!lista?.length) { console.warn('[cabina] falta la frase', codigo); return 0; }
    i = Math.min(i ?? elegir(codigo, lista.length), lista.length - 1);
    const texto = lista[i], quien = codigo[0] === 'T' ? 'tiesme' : 'richie';
    const dur = audio.decir(quien, `${codigo}-${i + 1}`, texto, { susurro });
    pantalla.vineta(quien, texto, dur, { roto, oscura: escena === 'trabajo' });
    hablando = { quien, hasta: tPant + dur };
    if (!caso) ultimaDicha = { codigo, i, roto, susurro, desde: tPant, hasta: tPant + dur };
    anotar(`${codigo}-${i + 1}: ${texto}`);
    return dur;
  }
  async function hablar(codigo, { esperarFin = true, pausa = 0.25, ...o } = {}) {
    const dur = decir(codigo, o);
    if (esperarFin) await esperar(dur + pausa, dur && ultimaDicha?.codigo === codigo ? Object.assign(ultimaDicha, { pausa }) : null);
    return dur;
  }
  // varias frases seguidas: hablar en fila ('R2-disc-1', 'T2-disc-1', …)
  async function charla(...codigos) { for (const c of codigos) await hablar(c); }

  // ================================================================ registro de la partida (para revisar después)
  const partida = { eventos: [], muestras: [], marcas: 0, inicio: null, nombre: null, t0: 0 };
  // segundos desde que empezó la partida (= el segundo del video .webm); antes contaba desde que se abrió la página
  const tPartida = () => +(tPant - partida.t0).toFixed(2);
  function anotar(s) {
    registro.push(s); if (registro.length > 9) registro.shift();
    if (partida.inicio) partida.eventos.push({ t: tPartida(), escena: paso, s });
  }
  function marcar() {
    partida.marcas++;
    anotar(`★ MARCA ${partida.marcas} (algo anduvo mal)`);
    api.flash(`Marca ${partida.marcas} guardada en el segundo ${partida.inicio ? tPartida().toFixed(1) + ' de la partida' : tPant.toFixed(1)}`);
  }
  let grabador = null, subida = Promise.resolve();
  const guardar = (ruta, cuerpoHttp, modo = 'w') => fetch(`/__guardar?ruta=${encodeURIComponent(ruta)}&modo=${modo}`, { method: 'POST', body: cuerpoHttp }).catch(() => null);
  function empezarPartida() {
    if (partida.inicio) return;
    const d = new Date(), z = n => String(n).padStart(2, '0');
    partida.nombre = `cabina/partida_${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
    Object.assign(partida, { inicio: d.toISOString(), eventos: [], muestras: [], marcas: 0, t0: tPant });
    // video de la cámara (solo con la cámara de verdad), subido de a pedazos
    const stream = document.querySelector('video')?.srcObject;
    if (stream && window.MediaRecorder) {
      try {
        grabador = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 2.5e6 });
        let primero = true;
        grabador.ondataavailable = e => { if (!e.data.size) return; const modo = primero ? 'w' : 'a'; primero = false; subida = subida.then(() => guardar(partida.nombre + '.webm', e.data, modo)); };
        grabador.start(4000);
      } catch (e) { console.warn('[cabina] no se pudo grabar', e); grabador = null; }
    }
    anotar('partida empezada: ' + partida.nombre);
  }
  function terminarPartida() {
    if (!partida.inicio) return;
    if (grabador) { try { grabador.stop(); } catch { /* ya estaba */ } grabador = null; }
    const json = JSON.stringify({ version: VERSION_CABINA, inicio: partida.inicio, marcas: partida.marcas, datos, eventos: partida.eventos, muestras: partida.muestras }, null, 1);
    subida = subida.then(() => guardar(partida.nombre + '.json', json));
    console.log('[cabina] partida guardada en _pruebas/' + partida.nombre);
    partida.inicio = null;
  }

  // ================================================================ escenas (fondo, luz, música)
  function ponerEscena(nombre, seg = 1.2) {
    escena = nombre;
    esc.negro(0, seg); esc.glitch(0);
    esc.oscuro(nombre === 'trabajo' ? 1 : 0, seg);
    esc.ensayo(nombre === 'ensayo' ? 1 : 0, seg);
    audio.zumbar(false);
    audio.ponerMusica(nombre === 'espera' ? 'menu' : nombre === 'trabajo' ? 'oscura' : 'juego');
  }
  const LIMPIO = { propio: 0, retraso: 0, impreciso: 0, contrario: 0 };
  // te copia todo (acto alegre)
  function copiarTodo(seg = 0.6) { cuerpo.dial('todo', LIMPIO, seg); caraForzada = null; }
  // todo es de ella
  function todoDeElla(seg = 0.6) { cuerpo.dial('todo', { propio: 1, retraso: 0, impreciso: 0, contrario: 0 }, seg); }

  // ================================================================ cámara que se acerca a una parte (del espejo al cine)
  // Además, con la sombra en la pared el plano se abre y baja (guion.sombra.plano y bajar): tiesme más chica y más
  // abajo, y arriba de ella la pared con la sombra. Es el zoom y el encuadre de la lente, no la posición de la cámara:
  // el tracking no cambia.
  const camz = { k: 0, obj: 0, vel: 2, x: 0.5, y: 0.5, zoom: 1.4, abre: 1, baja: 0 };
  function empujarCamara(parte, { zoom = 1.45, seg = 0.5 } = {}) {
    const p = cuerpo.enPantalla(parte) || { x: 0.5, y: 0.45 };
    Object.assign(camz, { x: p.x, y: p.y, zoom, obj: 1, vel: 1 / Math.max(0.05, seg) });
  }
  function soltarCamara(seg = 0.7) { camz.obj = 0; camz.vel = seg > 0 ? 1 / seg : Infinity; if (!(seg > 0)) camz.k = 0; }
  function cuadroCamara(dt) {
    const s = guion.sombra, conSombra = sombra.visible();
    const suave = (a, b) => (Math.abs(b - a) < 0.002 ? b : a + (b - a) * Math.min(1, dt * 2.5));
    camz.abre = suave(camz.abre, conSombra ? (s.plano ?? 1) : 1);
    camz.baja = suave(camz.baja, conSombra ? (s.bajar ?? 0) : 0);
    if (camera.zoom !== camz.abre) { camera.zoom = camz.abre; camera.updateProjectionMatrix(); }
    const d = camz.obj - camz.k, pasoK = camz.vel * dt;
    camz.k = Math.abs(d) <= pasoK ? camz.obj : camz.k + Math.sign(d) * pasoK;
    const k = camz.k * camz.k * (3 - 2 * camz.k);
    if (k < 0.001 && camz.baja === 0) { if (camera.view?.enabled) camera.clearViewOffset(); return; }
    const sz = renderer.getSize(new THREE.Vector2()), W = sz.x || 1, H = sz.y || 1, z = 1 + (camz.zoom - 1) * k;
    const w = W / z, h = H / z;
    const x0 = clamp(camz.x * W - w / 2, 0, W - w), y0 = clamp(camz.y * H - h / 2, 0, H - h);
    camera.setViewOffset(W, H, x0 * k, y0 * k - camz.baja * H, w, h);
  }

  // ================================================================ la cara de tiesme
  let caraForzada = null;
  async function escapar(i, seg) {
    caraForzada = guion.escapes[i % guion.escapes.length];
    cuerpo.dial('cara', { propio: 1 }, 0.05);
    anotar(`a tiesme se le escapa la cara (${caraForzada.ojos})`);
    if (i >= 1) { pantalla.foco(cuerpo.enPantalla('cara'), 0.16, 0.35); }
    await esperar(seg);
    pantalla.foco(null);
    if (ANTES.has(paso)) { caraForzada = null; cuerpo.dial('cara', LIMPIO, 0.1); }
  }

  // ================================================================ movimientos por programa (provisorios)
  async function saludar(b, veces = 3) {
    await esperar(cuerpo.posar({ [b]: { brazo: [0.6, 0.3, 0.35], ante: [0.05, 1, 0.15] } }, 0.6, 'sale'));
    for (let i = 0; i < veces; i++) {
      await esperar(cuerpo.posar({ [b]: { ante: [0.5, 0.85, 0.15] } }, 0.22));
      await esperar(cuerpo.posar({ [b]: { ante: [-0.3, 0.95, 0.15] } }, 0.22));
    }
    await esperar(cuerpo.posar({ [b]: R[b] }, 0.7));
  }
  async function golpearVidrio(b, veces = 2) {
    // golpea mirando para adelante pero con la cabeza girándose de costado (idea de Agustín, creepy)
    cuerpo.seguir(0);
    cuerpo.posar({ cabeza: { yaw: 22, roll: 16, pitch: -4 } }, 1.6);
    await esperar(cuerpo.posar({ [b]: { brazo: [0.12, 0.05, 1], ante: [-0.1, 0.6, 0.8] } }, 0.7, 'anticipa'));
    for (let i = 0; i < veces; i++) {
      await esperar(cuerpo.posar({ [b]: { ante: [-0.15, 0.3, 1] } }, 0.09, 'golpe'));
      audio.fx('toc'); pantalla.temblor(0.12, 9);
      await esperar(cuerpo.posar({ [b]: { ante: [-0.1, 0.65, 0.75] } }, 0.22));
    }
    await esperar(0.3);
  }
  // pollito inglés: la pose avanza (se acerca al vidrio) solo mientras no la mirás
  const POLLITO = [
    { p: 0, torso: { pitch: 4, roll: 0, yaw: 0 }, cabeza: { pitch: -2, roll: 4, yaw: 0 }, raiz: { x: 0, y: 0, z: 0, giro: 0 }, brazoDer: R.brazoDer, brazoIzq: R.brazoIzq },
    { p: 0.35, torso: { pitch: 10, roll: -6, yaw: 0 }, cabeza: { pitch: 6, roll: 14, yaw: 0 }, raiz: { x: 0, y: -0.02, z: 0.1, giro: 0 } },
    { p: 0.7, torso: { pitch: 12, roll: -4, yaw: 0 }, cabeza: { pitch: 8, roll: 18, yaw: 0 }, raiz: { x: 0, y: -0.04, z: 0.2, giro: 0 },
      brazoDer: { brazo: [0.15, -0.2, 1], ante: [0.05, 0.3, 1] } },
    { p: 1, torso: { pitch: 16, roll: 0, yaw: 0 }, cabeza: { pitch: -10, roll: 8, yaw: 0 }, raiz: { x: 0, y: -0.05, z: 0.3, giro: 0 },
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

  // ================================================================ datos de la persona
  const nuevosDatos = () => ({ consignas: [], trampa: null, estatuas: [], copias: [], aguila: null });
  let datos = nuevosDatos();

  // una consigna con el círculo sobre la parte del cuerpo: hay que sostener el gesto (y empezarlo después del cartel)
  async function consigna(c, { trampa = false, i } = {}) {
    const a = guion.calentamiento;
    pantalla.indicador({ encabezado: trampa ? '' : 'Richie dice', icono: c.icono, texto: c.texto });
    let acc = 0, limpio = !sen.ahora(c.detecta), tHecho = null;
    const dur = decir(trampa ? 'R1-trampa' : 'R1-consigna-' + c.id, { i });
    const finFrase = reloj + dur;
    const ok = await hasta(() => {
      const si = sen.ahora(c.detecta);
      if (!si) limpio = true;
      acc = si && limpio ? acc + dtUlt : Math.max(0, acc - dtUlt * 1.5);
      const p = cuerpo.enPantalla(c.donde || 'cabeza');
      if (p) pantalla.anillo({ x: p.x, y: clamp(p.y - (c.donde === 'cabeza' ? 0.1 : 0)), icono: c.icono, k: acc / a.sostener });
      if (acc >= a.sostener && tHecho === null) tHecho = reloj;
      return tHecho !== null;
    }, dur + (trampa ? a.plazoTrampa : a.plazo));
    if (ok) { const p = cuerpo.enPantalla(c.donde || 'cabeza'); if (p) pantalla.anillo({ x: p.x, y: clamp(p.y - (c.donde === 'cabeza' ? 0.1 : 0)), icono: c.icono, k: 1 }); }
    if (reloj < finFrase) await esperar(finFrase - reloj + 0.1);
    await esperar(0.35);
    pantalla.anillo(null);
    return { ok, t: ok ? Math.max(0, tHecho - finFrase) : null };
  }
  // un intento de la figura: mide el encaje y devuelve el mejor
  // v0.5.1: soloBrazos = el medidor muestra solo lo tuyo (los brazos). En el ensayo llegás al 100 % y la figura igual no
  // sale: falta lo de ella (el giro). Antes mostraba el total, que sin el giro no pasaba del 60 %.
  const medir = (e, soloBrazos) => soloBrazos ? pantalla.medidor(e.brazos, `brazos ${Math.round(e.brazos * 100)}%`) : pantalla.medidor(e.total, `encaje ${Math.round(e.total * 100)}%`);
  async function intentoFigura(seg, { hastaSalir = false, soloBrazos = false } = {}) {
    let mejor = 0, sostenido = 0;
    const salio = await hasta(() => {
      const e = sombra.encaje();
      mejor = Math.max(mejor, e.total);
      sostenido = e.total >= guion.ensayo.encajeOk ? sostenido + dtUlt : 0;
      medir(e, soloBrazos);
      return hastaSalir && sostenido > 0.8;
    }, seg);
    return { mejor, salio: salio && hastaSalir };
  }
  function medidorEnVivo(cond) { lanzar(async () => { await hasta(() => { if (!cond()) return true; const e = sombra.encaje(); pantalla.medidor(e.total, `encaje ${Math.round(e.total * 100)}%`); return false; }); }); }
  // la cuenta de la estatua (devuelve cuánto se movió)
  async function cuentaEstatua(seg, { alSegundo, soloBrazos = false } = {}) {
    let movido = 0;
    for (let k = Math.ceil(seg); k > 0; k--) {
      pantalla.estatua('¡ESTATUA!', k); audio.fx('tic');
      if (alSegundo) alSegundo(Math.ceil(seg) - k);
      await hasta(() => { if (!S.quieto) movido += dtUlt; medir(sombra.encaje(), soloBrazos); return false; }, 1);
    }
    pantalla.estatua(null, null);
    return movido;
  }

  // ================================================================ las escenas
  const PASOS = {
    // ---------------- ESPERA: telón cerrado, cartel del teatro, tiesme no está
    async espera() {
      terminarPartida();
      datos = nuevosDatos(); vino = false;
      ponerEscena('espera', 0.8);
      pantalla.limpiar(); pantalla.titulo(true); pantalla.telon(false, 0.01); pantalla.negro(0, 0.8); pantalla.sonidoAviso(!audio.listo());
      pantalla.cartel(guion.cartel); sombra.mostrar(false); soltarCamara(0);
      hilos.reset(); cuerpo.limpiar(); caraForzada = null;
      cuerpo.mostrar(false); todoDeElla(0);
      cuerpo.reposo(0); cuerpo.fijar({ raiz: { x: 0, y: 0, z: 0, giro: 0 } }); cuerpo.seguir(0); cuerpo.vida(1);
      let armada = false;
      await hasta(() => { if (S.vistoHace > 1.5) armada = true; return S.presente || (armada && S.entrando); });
      return '1';
    },

    // ---------------- 1 PRESENTACIÓN: asomada por el telón, se abre, sube, "hoy vas a ser tiesme", te copia
    async 1() {
      empezarPartida();
      const a = guion.presentacion;
      pantalla.sonidoAviso(false);
      if (!S.presente) { // todavía está entrando: se asoma tímida por la rendija del telón
        cuerpo.mostrar(true); todoDeElla(0);
        cuerpo.fijar({ raiz: { x: 0, y: 0, z: 0, giro: 0 }, torso: { roll: lado * 10, yaw: 0, pitch: 4 }, cabeza: { yaw: -lado * 20, roll: lado * 14, pitch: 8 } });
        pantalla.telon('rendija', 0.5); audio.fx('asomada');
        await esperar(a.asomada * 0.7);
        pantalla.telon(false, 0.4);
        await esperar(0.5);
        await hasta(() => S.presente, 20);
        if (!S.presente) return 'espera';
      }
      pantalla.titulo(false); audio.pararMusica(0.4);
      cuerpo.mostrar(true); todoDeElla(0); cuerpo.reposo(0); cuerpo.fijar({ raiz: { x: 0, y: -2.4, z: 0, giro: 0 } });
      audio.fx('telon'); pantalla.telon(true, a.telon);
      await esperar(a.telon * 0.6);
      ponerEscena('funcion', 0.8);
      audio.fx('fiuuu');
      await esperar(cuerpo.posar({ raiz: { y: 0 } }, a.entrada, 'sale'));
      audio.fx('inicio');
      copiarTodo(0.8);
      await esperar(0.6);
      await charla('R0-presenta', 'R0-roles');
      await hasta(() => S.mov > UMBRAL.quieto * 1.5, 3);
      await hablar('R0-espejo');
      await esperar(Math.max(0, a.espejo - (reloj - pasoT0) * 0)); // un rato para jugar con el espejo
    },

    // ---------------- 2 CALENTAMIENTO = Richie dice (con el círculo) · a tiesme se le escapa la cara
    async 2() {
      if (escena !== 'funcion') ponerEscena('funcion', 0.5);
      pantalla.telon(true, 0.01); cuerpo.mostrar(true); copiarTodo(0.4); cuerpo.posar({ raiz: R.raiz }, 0.4);
      const a = guion.calentamiento;
      await hablar('R1-calienta');
      const iT = Math.random() * guion.trampas.length | 0, trampa = guion.trampas[iT];
      const pool = mezclar(guion.consignas.filter(c => c.detecta !== trampa.detecta));
      let nEscape = 0;
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
        } else if (cosa === 'escape') {
          // Richie se agranda y a ella se le escapa la cara (cada vez un poco más)
          const dur = decir('R1-agranda');
          await esperar(dur * 0.8);
          await escapar(nEscape, a.escape * (1 + nEscape * 0.6));
          nEscape++;
        }
        await esperar(a.pausa);
      }
    },

    // ---------------- 3 ENSAYO: estatuas + sombra en la pared. Con la teoría de Richie la figura casi sale.
    async 3() {
      pantalla.telon(true, 0.01); cuerpo.mostrar(true); copiarTodo(0.4); cuerpo.posar({ raiz: R.raiz }, 0.4);
      ponerEscena('ensayo', 1.2);
      audio.cortarMusica();
      sombra.hornear(guion.figura); sombra.mostrar(true); sombra.brillar(0);
      const e = guion.ensayo, f = guion.figura;
      await hablar('R2-ensayo');
      await hablar('R2-teoria');
      for (let n = 0; n < e.intentos; n++) {
        pantalla.indicador({ encabezado: `Ensayo ${n + 1}`, icono: '🦅', texto: f.instruccion });
        await hablar('R2-pose');
        audio.seguirMusica();
        await intentoFigura(e.musicaAntes, { soloBrazos: true });
        audio.cortarMusica(); audio.fx('estatua');
        decir('R2-estatua');
        const movido = await cuentaEstatua(e.estatua, { soloBrazos: true });
        const enc = sombra.encaje();
        datos.estatuas.push({ quieto: movido < 0.5, encaje: +enc.total.toFixed(2), brazos: +enc.brazos.toFixed(2) });
        anotar(`estatua ${n + 1}: ${movido < 0.5 ? 'quieto' : 'se movió'} · encaje ${Math.round(enc.total * 100)}% (brazos ${Math.round(enc.brazos * 100)}%)`);
        pantalla.indicador(null);
        audio.fx('mal', { vol: 0.5 });
        const dur = decir('R2-casi');
        await esperar(dur * 0.6);
        await escapar(n + 1, 1.0 + n * 0.8); // la molestia ya se le ve
        if (n < e.intentos - 1) await hablar('R2-otra');
      }
      // desde acá la cara ya es de ella
      caraForzada = guion.escapes[0]; cuerpo.dial('cara', { propio: 1 }, 0.1);
    },

    // ---------------- 4 REVELACIÓN: tercera estatua; vos quieto; ella gira sola y la figura sale
    async 4() {
      pantalla.telon(true, 0.01); cuerpo.mostrar(true);
      if (escena !== 'ensayo') { ponerEscena('ensayo', 0.5); sombra.hornear(guion.figura); }
      sombra.mostrar(true);
      copiarTodo(0.3); caraForzada = guion.escapes[0]; cuerpo.dial('cara', { propio: 1 }, 0.1);
      const e = guion.ensayo, f = guion.figura;
      pantalla.indicador({ encabezado: 'Ensayo 3', icono: '🦅', texto: f.instruccion });
      await hablar('R2-pose');
      audio.seguirMusica();
      await intentoFigura(e.musicaAntes, { soloBrazos: true }); // (en la cuenta de la estatua ya muestra el total: ella gira y sube)
      audio.cortarMusica(); audio.fx('estatua');
      decir('R2-estatua');
      pantalla.indicador(null);
      let girada = false;
      const movido = await cuentaEstatua(e.estatua3, {
        alSegundo: s => {
          if (s !== 1 || girada) return;
          girada = true;
          // ella se mueve sola: gira el cuerpo (lo de ella) con tus brazos (lo de Richie)
          anotar('REVELACIÓN: tiesme gira sola');
          cuerpo.dial(['torso', 'cabeza'], { propio: 1 }, 0.4);
          audio.fx('foco'); pantalla.foco(cuerpo.enPantalla('torso'), 0.32, 0.6); pantalla.pixelar(0.25);
          cuerpo.deformar('torso', { escala: 1.12, temblor: 0.25, seg: 1.1 });
          empujarCamara('torso', { zoom: 1.25, seg: 0.8 });
          cuerpo.posar({ raiz: { giro: f.giro } }, 1.6, 'suave');
        },
      });
      const enc = sombra.encaje();
      anotar(`revelación: encaje ${Math.round(enc.total * 100)}% (brazos ${Math.round(enc.brazos * 100)}%, giro ${Math.round(enc.giro * 100)}%) · movido ${movido.toFixed(1)} s`);
      if (enc.total < e.encajeOk) { // si te moviste o los brazos no estaban, ella los acomoda: la figura tiene que salir
        cuerpo.dial(['brazoIzq', 'brazoDer'], { propio: 1 }, 0.6); cuerpo.posar(f.pose, 0.6); await esperar(0.7);
      }
      sombra.brillar(1); audio.fx('bien'); pantalla.medidor(1, '¡salió!');
      pantalla.foco(null);
      await esperar(1.0);
      soltarCamara(0.8);
      await hablar('R2-quien', { pausa: 0.9 });
      todoDeElla(0.3); caraForzada = { ojos: 'sospecha', cejas: 'down' };
      cuerpo.posar({ cabeza: { pitch: -14, yaw: 0, roll: 0 } }, 0.6); // mira para arriba, a Richie
      await hablar('T2-yo', { pausa: 0.8 });
    },

    // ---------------- 5 DISCUSIÓN: se corta el ensayo (luz de trabajo); discuten. Le queda tu hilo en la mano derecha.
    async 5() {
      pantalla.telon(true, 0.01); cuerpo.mostrar(true); pantalla.medidor(null); pantalla.indicador(null);
      audio.fx('apagar'); ponerEscena('trabajo', 1.4); sombra.mostrar(false); sombra.brillar(0);
      todoDeElla(0.4);
      cuerpo.dial(['brazoDer', 'manoDer'], LIMPIO, 0.4); // su último hilo: tu brazo derecho todavía la mueve
      caraForzada = { ojos: 'sospecha', cejas: 'down' };
      cuerpo.posar({ raiz: { giro: 0, x: 0, y: 0, z: 0 }, cabeza: { pitch: -12, yaw: 0, roll: 4 }, torso: { pitch: 2, yaw: 0, roll: 0 } }, 1.2);
      await esperar(1.0);
      const gesto = async (parte, pose, s = 0.5) => { cuerpo.posar({ [parte]: pose }, s, 'sale'); };
      await hablar('R2-disc-1');
      gesto('brazoIzq', { brazo: [0.5, -0.3, 0.6], ante: [0.3, 0.6, 0.7] });
      await hablar('T2-disc-1');
      await hablar('R2-disc-2');
      caraForzada = { ojos: 'nocompro' };
      await hablar('T2-disc-2');
      await hablar('R2-disc-3');
      gesto('brazoIzq', { brazo: [0.7, 0.1, 0.5], ante: [0.6, 0.7, 0.3] }, 0.3);
      await hablar('T2-disc-3');
      cuerpo.posar({ brazoIzq: R.brazoIzq }, 0.8);
      await hablar('R2-disc-4');
      caraForzada = { ojos: 'sospecha', cejas: 'down' };
      await hablar('T2-disc-4');
    },

    // ---------------- 6 REGISTRAN QUE ESTÁS: tu movimiento le mueve la mano; vergüenza; pollito; golpe al vidrio
    async 6() {
      pantalla.telon(true, 0.01); cuerpo.mostrar(true);
      if (escena !== 'trabajo') ponerEscena('trabajo', 0.6);
      todoDeElla(0.3); cuerpo.dial(['brazoDer', 'manoDer'], LIMPIO, 0.3);
      const g = guion.registro;
      // esperar a que la persona se mueva (su mano derecha la mueve a ella); si no, se mueve sola un poco
      const seMovio = await hasta(() => S.mov > UMBRAL.quieto * 1.6, g.esperaMovimiento);
      if (!seMovio) { cuerpo.dial(['brazoDer'], { propio: 1 }, 0.1); cuerpo.posar({ brazoDer: { brazo: [0.5, 0.2, 0.5], ante: [0.2, 0.9, 0.3] } }, 0.35, 'sale'); }
      anotar(`la mano se movió ${seMovio ? 'por la persona' : 'sola (no se movía)'}`);
      audio.fx('hilo'); pantalla.foco(cuerpo.enPantalla('manoDer'), 0.15, 0.55); cuerpo.deformar('manoDer', { escala: 1.4, temblor: 0.2, seg: 1.2 });
      empujarCamara('manoDer', { zoom: 1.35, seg: 0.4 });
      await esperar(0.9);
      pantalla.foco(null); soltarCamara(0.6);
      await hablar('R2-yeso', { pausa: 0.9 });
      // se dan vuelta hacia vos
      cuerpo.dial(['brazoDer', 'manoDer'], { propio: 1 }, 0.3); cuerpo.posar({ brazoDer: R.brazoDer }, 0.6);
      caraForzada = { ojos: 'sorpresa', cejas: 'up' };
      cuerpo.posar({ cabeza: { pitch: -2, yaw: 0, roll: 0 } }, 0.5);
      await esperar(0.5);
      await hablar('T2-escucha', { pausa: 0.7 });
      caraForzada = { ojos: 'preocupacion' };
      // pollito inglés (por vergüenza): se acerca al vidrio solo cuando no la mirás
      if (guion.pollito?.activo) {
        await hablar('R2-nomires');
        let prog = 0;
        await hasta(() => {
          cuerpo.vida(S.mira ? 0 : 1);
          if (!S.mira || !S.cara.ok) prog = Math.min(1, prog + dtUlt / guion.pollito.aVidrio);
          cuerpo.fijar(posePollito(prog));
          return prog >= 1;
        }, guion.pollito.dur);
        anotar(`pollito: avanzó ${Math.round(prog * 100)}%`);
        cuerpo.vida(1);
        if (prog < 1) await esperar(cuerpo.posar(posePollito(1), 1.0));
      }
      caraForzada = { ojos: 'base' };
      await golpearVidrio('brazoIzq', 2);
      await hablar('T2-hola', { pausa: 0.6 });
      caraForzada = { ojos: 'preocupacion' };
      cuerpo.seguir(0.6);
      await charla('T2-perdon', 'R2-siempre');
      await esperar(cuerpo.posar({ raiz: R.raiz, torso: R.torso, cabeza: R.cabeza, brazoIzq: R.brazoIzq, brazoDer: R.brazoDer }, 1.0));
    },

    // ---------------- 7 ¡CAMBIO! (v0.5): se alternan "te copia" (ella te copia, jugá libre) y "copiala" (ella hace una
    // pose y vos la copiás, con el círculo que se llena), cada vez más rápido; termina con el águila entre los tres.
    async 7() {
      pantalla.telon(true, 0.01); cuerpo.mostrar(true); sombra.mostrar(false); pantalla.medidor(null);
      const c = guion.cambio, f = guion.figura;
      todoDeElla(0.3); cuerpo.seguir(0.6); caraForzada = { ojos: 'base' };
      cuerpo.posar({ raiz: R.raiz, torso: R.torso, cabeza: R.cabeza, brazoIzq: R.brazoIzq, brazoDer: R.brazoDer }, 0.6);
      await hablar('R5-funcion');
      ponerEscena('funcion', 1.0); audio.fx('inicio');
      await hablar('T5-juego');
      await hablar('R5-regla');
      const poses = mezclar(c.poses);
      let primera = true;
      for (const [modo, seg] of c.tramos) {
        if (modo === 'copia') {
          // ella te copia (como en el acto 1)
          copiarTodo(0.4); cuerpo.seguir(0);
          pantalla.indicador({ encabezado: 'TE COPIA', icono: '🪞', texto: 'movete como quieras' });
          if (primera) { decir('R5-tecopia'); primera = false; }
          await esperar(seg);
        } else {
          // ella hace una pose y vos la copiás: el círculo sobre su cuerpo se llena mientras sostenés la pose
          const p = poses.shift() || c.poses[0];
          todoDeElla(0.3); cuerpo.seguir(0);
          caraForzada = p.cara || { ojos: 'base' };
          cuerpo.posar({ torso: R.torso, cabeza: R.cabeza, brazoIzq: R.brazoIzq, brazoDer: R.brazoDer, ...p.pose }, 0.5, 'sale');
          pantalla.indicador({ encabezado: 'COPIALA', icono: p.icono, texto: p.texto });
          decir('T5-copiala');
          let acc = 0, tHecho = null;
          const ok = await hasta(() => {
            const si = sen.ahora(p.detecta);
            acc = si ? acc + dtUlt : Math.max(0, acc - dtUlt * 1.5);
            const q = cuerpo.enPantalla(p.donde || 'cabeza');
            if (q) pantalla.anillo({ x: q.x, y: clamp(q.y - (p.donde === 'cabeza' ? 0.1 : 0)), icono: p.icono, k: acc / c.sostener });
            if (acc >= c.sostener && tHecho === null) tHecho = reloj;
            return tHecho !== null;
          }, seg);
          datos.copias.push({ id: p.id, ok, t: ok ? +(reloj - pasoT0).toFixed(1) : null });
          anotar(`copiala ${p.id}: ${ok ? '✔' : '✘'}`);
          if (ok) {
            const q = cuerpo.enPantalla(p.donde || 'cabeza');
            if (q) pantalla.anillo({ x: q.x, y: clamp(q.y - (p.donde === 'cabeza' ? 0.1 : 0)), icono: p.icono, k: 1 });
            audio.fx('bien'); pantalla.marca('✔');
            caraForzada = { ojos: 'feliz' }; cuerpo.posar({ cabeza: { pitch: 10, yaw: 0, roll: 0 } }, 0.25, 'sale'); // asiente
            await hablar(Math.random() < 0.6 ? 'T5-bien' : 'R5-bien', { pausa: 0.1 });
          } else { audio.fx('mal', { vol: 0.5 }); pantalla.marca('✘'); await hablar('R5-tarde', { pausa: 0.1 }); }
          pantalla.anillo(null);
        }
        // ¡cambio!
        audio.fx('estatua', { vol: 0.7 }); pantalla.temblor(0.1, 6); pantalla.indicador(null);
        decir('R5-cambio');
        await esperar(0.5);
      }
      // final: el águila entre los tres (tus brazos, su giro)
      await hablar('R5-ultimo', { pausa: 0.2 });
      ponerEscena('ensayo', 0.8); audio.cortarMusica();
      sombra.hornear(f); sombra.mostrar(true); sombra.brillar(0);
      todoDeElla(0.3); caraForzada = { ojos: 'base' };
      await hablar('T5-aguila', { pausa: 0.2 });
      cuerpo.dial(['brazoIzq', 'brazoDer', 'manoIzq', 'manoDer'], LIMPIO, 0.5);
      cuerpo.dial(['cabeza', 'torso', 'cara'], { propio: 1 }, 0.5);
      cuerpo.posar({ raiz: { giro: f.giro }, torso: R.torso, cabeza: R.cabeza }, 1.2);
      pantalla.indicador({ encabezado: 'los tres', icono: '🦅', texto: f.instruccion });
      audio.seguirMusica();
      let r = await intentoFigura(c.final, { hastaSalir: true });
      if (!r.salio) { // le damos una mano: los brazos van solos a la figura
        anotar('águila: no salía, ella ayuda con los brazos');
        cuerpo.dial(['brazoIzq', 'brazoDer'], { propio: 1 }, 1.0); cuerpo.posar(f.pose, 1.0);
        r = await intentoFigura(4, { hastaSalir: true });
      }
      datos.aguila = { solos: r.salio && !datos.aguila, mejor: +r.mejor.toFixed(2) };
      anotar(`águila: encaje máximo ${Math.round(r.mejor * 100)}%`);
      audio.cortarMusica(); pantalla.indicador(null);
      sombra.brillar(1); audio.fx('aplausos'); pantalla.medidor(1, '¡salió!');
      caraForzada = { ojos: 'feliz', boca: 'feliz' };
      await charla('R5-salio', 'T5-salio');
      // reverencia
      todoDeElla(0.4);
      await hablar('R5-reverencia', { esperarFin: false });
      await esperar(cuerpo.posar({ raiz: { giro: 0 }, torso: { pitch: 38, yaw: 0, roll: 0 }, cabeza: { pitch: 18, yaw: 0, roll: 0 }, brazoIzq: R.brazoIzq, brazoDer: R.brazoDer }, 1.0));
      audio.fx('aplausos');
      await esperar(1.4);
      await esperar(cuerpo.posar({ torso: R.torso, cabeza: R.cabeza }, 0.9));
      pantalla.medidor(null);
    },

    // ---------------- FIN: se cierra el telón; cuando la persona se va, vuelve la Espera
    async fin() {
      pantalla.limpiar(); audio.fx('telon'); pantalla.telon(false, 1.6); audio.pararMusica(1.5);
      await esperar(1.8);
      cuerpo.mostrar(false); sombra.mostrar(false);
      await hasta(() => ausente > 2.5, 10);
      return 'espera';
    },
  };

  // ================================================================ ausencias (la persona sale de cuadro)
  // Se pausa la escena y se conserva el avance. Antes de la revelación comenta solo Richie; después, los dos.
  // Al volver se interrumpe el comentario, le dicen algo y recién después se retoma (volviendo: la escena sigue
  // frenada mientras tanto; antes la escena seguía enseguida y las frases se pisaban).
  let vino = false; // vino = la persona ya llegó a su lugar en esta partida
  // v0.2.1: si se fue mientras sonaba una frase de la escena, al volver (después del comentario de la vuelta) se repite
  // entera; antes se cortaba y la escena seguía con la siguiente (Agustín no llegó a leer la viñeta).
  const aus = { avisado: false, variante: 0, token: 0, volviendo: false, cortada: null };
  function vigilarCasos() {
    if (!ACTIVOS.has(paso) || pausado || !vino) return;
    const c = guion.casos, antes = ANTES.has(paso);
    if (!S.presente && !aus.avisado && ausente > (antes ? c.volveA : c.seFueA)) {
      aus.avisado = true; aus.volviendo = false; const tk = ++aus.token;
      // ¿estaba sonando una frase cuando se fue? (se fue hace "ausente" segundos)
      const salio = tPant - ausente;
      aus.cortada = ultimaDicha && ultimaDicha.hasta > salio + 0.3 ? ultimaDicha : null;
      audio.callar(); pantalla.sinVineta();
      anotar('se fue de cuadro: comentario' + (aus.cortada ? ` (cortó ${aus.cortada.codigo})` : ''));
      aus.variante = 1 - aus.variante;
      lanzar(async () => {
        const fila = antes ? ['R-ausente-antes'] : aus.variante ? ['R-ausente-1', 'T-ausente-1'] : ['T-ausente-2', 'R-ausente-2', 'T-ausente-2b'];
        for (const cod of fila) { if (tk !== aus.token || S.presente) return; await esperarP(decir(cod, { caso: true }) + 0.3); }
      });
    }
    if (S.presente && aus.avisado) {
      aus.avisado = false; aus.volviendo = true; const tk = ++aus.token;
      const rep = aus.cortada; aus.cortada = null;
      audio.callar(); pantalla.sinVineta();
      anotar('volvió');
      lanzar(async () => {
        const fila = antes ? ['R-vuelve-antes'] : aus.variante ? ['T-vuelve-1', 'R-vuelve-1', 'T-vuelve-1b'] : ['T-vuelve-2', 'R-vuelve-2'];
        try {
          for (const cod of fila) { if (tk !== aus.token) return; await esperarP(decir(cod, { caso: true }) + 0.3); }
          if (rep && tk === aus.token) {
            anotar(`repite la frase cortada (${rep.codigo})`);
            const d = decir(rep.codigo, { i: rep.i, roto: rep.roto, susurro: rep.susurro });
            if (ultimaDicha) Object.assign(ultimaDicha, { espera: rep.espera, pausa: rep.pausa });
            await esperarP(d + 0.15);
            // la escena esperaba lo que faltaba de la frase original: ya se dijo entera, sigue enseguida
            if (tk === aus.token && rep.espera && esperas.has(rep.espera)) rep.espera.hasta = Math.min(rep.espera.hasta, reloj + (rep.pausa ?? 0.25));
          }
        } finally { if (tk === aus.token) aus.volviendo = false; }
      });
    }
    if (ausente > c.reinicioA) { anotar('se fue: reinicio'); ir('fin'); }
  }

  // ================================================================ cara de tiesme (lo llama el motor)
  const faceHist = [];
  const muestra = (h, t) => { for (let i = h.length - 1; i >= 0; i--) if (h[i][0] <= t) return h[i][1]; return h[0]?.[1]; };
  const deCats = cats => (cats ? { faceBlendshapes: [{ categories: cats }] } : undefined);
  function sintetica(c, jaw = null) {
    if (!c.boca && !c.ojos && !c.cejas && jaw === null) return undefined;
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
    if (faceNow) { faceHist.push([t, caraIn]); while (faceHist.length > 2 && t - faceHist[0][0] > 2.5) faceHist.shift(); }
    const P = cuerpo.P.cara;
    const hablaElla = hablando.quien === 'tiesme' && tPant < hablando.hasta;
    let entrada, usar = true;
    if (P.propio >= 0.5 || hablaElla) {
      let jaw = null;
      if (hablaElla) { const n = audio.listo() ? audio.nivel() : 0.5 + 0.5 * Math.sin(t * 22); jaw = n > 0.04 ? 0.3 + Math.min(1, n * 3) * 0.5 : 0; }
      entrada = sintetica(cuerpo.pose.cara, jaw) || sintetica({}, 0);
    } else if (P.retraso > 0.01) entrada = muestra(faceHist, t - P.retraso);
    else { entrada = caraIn; usar = faceNow; }
    // la cara "suya": ojos y cejas elegidos (la boca la mueve la voz)
    caraObj.forzar?.(P.propio >= 0.5 && caraForzada ? { ojos: caraForzada.ojos, cejas: caraForzada.cejas || 'base', boca: hablaElla ? null : caraForzada.boca } : null);
    if (usar) caraObj.procesar(entrada, now);
  }

  // ================================================================ teclas de quien atiende
  function tecla(e) {
    audio.iniciar(); pantalla.sonidoAviso(false);
    if (e.target?.tagName === 'SELECT' || e.target?.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    const propias = {
      '0': () => ir('fin'), home: () => ir('fin'),
      arrowright: () => ir(ORDEN[ORDEN.indexOf(paso) + 1] || 'espera'),
      ' ': () => { pausado = !pausado; pantalla.verPausa(pausado); },
      d: () => pantalla.panel(),
      m: () => marcar(),
    };
    for (let n = 1; n <= 7; n++) propias[String(n)] = () => ir(String(n));
    if (propias[k]) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) propias[k](); return; }
    if (!['f', 'h', 'v', 'c', 'g', 'o'].includes(k)) e.stopImmediatePropagation(); // (9/11: O gira la imagen, para la cámara en vertical)
  }
  addEventListener('keydown', tecla, true);
  addEventListener('pointerdown', () => { audio.iniciar(); pantalla.sonidoAviso(false); }, true);

  // ================================================================ panel de quien atiende (D)
  let panelT = 0, muestraT = 0;
  const sn = (b, s = b ? 'sí' : 'no') => `<span class="${b ? 'si' : 'no'}">${s}</span>`;
  const f2 = x => (x ?? 0).toFixed(2), g0 = x => Math.round(x ?? 0);
  function actualizarPanel() {
    const c = S.cara, cb = S.cabeza, en = sombra.visible() ? sombra.encaje() : null;
    const det = Object.keys(sen.DETECTA).filter(n => sen.ahora(n));
    const partes = PARTES.map(p => { const v = cuerpo.P[p]; return `${p.padEnd(8)} ${f2(v.propio)} ${f2(v.retraso)} ${f2(v.impreciso)} ${f2(v.contrario)}`; }).join('\n');
    const cs = datos.consignas.map(x => `${x.ok ? '✔' : '✘'}${x.id}${x.ok ? ' ' + x.t.toFixed(1) + 's' : ''}`).join(' · ') || '—';
    pantalla.panelHTML(
      `<b>${VERSION_CABINA}</b> <span class="dim">· motor tracking ${api.VERSION}</span>\n` +
      `<b>ESCENA ${paso} ${NOMBRE[paso] || ''}</b>  ${(reloj - pasoT0).toFixed(1)} s${pausado ? '  <span class="no">PAUSA</span>' : ''}${frenado ? '  <span class="no">(esperando que vuelva)</span>' : ''}\n` +
      `sonido: ${audio.listo() ? sn(true, 'activo') : sn(false, 'tocá una tecla')}  ·  audio grabado: ${Object.keys(audio.archivos).length}\n` +
      `partida: ${partida.inicio ? sn(true, 'grabando') + (grabador ? ' (con video)' : ' (sin video)') + ` · marcas ${partida.marcas}` : '<span class="dim">—</span>'}\n\n` +
      `<b>Persona</b> ${S.presente ? sn(true, 'en su lugar') : S.entrando ? '<span class="si">entrando</span>' : sn(false, 'no hay')}  x ${f2(S.x)}  fuera ${ausente.toFixed(1)} s\n` +
      `cabeza ${cb.ok ? '' : '<span class="dim">(no se ve)</span>'} giro ${g0(cb.yaw)}° cabeceo ${g0(cb.pitch)}° incl ${g0(cb.roll)}°  mira ${sn(S.mira)}\n` +
      `manos: su izq ${S.manos.izq ? '↑' : '·'} su der ${S.manos.der ? '↑' : '·'}  saludo ${sn(S.saludo)}  puntero ${S.mano.ok ? `${f2(S.mano.x)}, ${f2(S.mano.y)}` : '—'}\n` +
      `cara ${c.ok ? '' : '<span class="dim">(no se ve)</span>'} boca ${f2(c.jaw)}/${UMBRAL.boca} sonrisa ${f2(c.smile)}/${UMBRAL.sonrisa} ojos ${f2(c.blink)}/${UMBRAL.ojos}\n` +
      `movimiento ${f2(S.mov)}/${UMBRAL.quieto}  quieto ${S.quietoSeg.toFixed(1)} s\n` +
      `detecta: ${det.join(', ') || '—'}\n` +
      (en ? `encaje figura ${g0(en.total * 100)}% (brazos ${g0(en.brazos * 100)}%, giro ${g0(en.giro * 100)}% · giro ${g0(cuerpo.giro())}°)\n` : '') + '\n' +
      `<b>Partes</b> <span class="dim">propio retraso impreciso contrario</span>\n${partes}\n\n` +
      `<b>Datos</b>\nconsignas: ${cs}\ntrampa: ${datos.trampa === null ? '—' : datos.trampa ? 'cayó' : 'no cayó'} · ` +
      `estatuas: ${datos.estatuas.map(x => `${x.quieto ? '✔' : '✘'}${Math.round(x.encaje * 100)}%`).join(' ') || '—'}\n` +
      `¡cambio!: ${datos.copias.map(x => `${x.ok ? '✔' : '✘'}${x.id}`).join(' · ') || '—'} · águila: ${datos.aguila ? `${Math.round(datos.aguila.mejor * 100)}%${datos.aguila.solos ? ' solos' : ' con ayuda'}` : '—'}\n` +
      '\n' +
      `<b>Últimas cosas</b>\n${registro.map(s => '<span class="dim">' + s.replace(/</g, '&lt;') + '</span>').join('\n')}\n\n` +
      `<span class="dim">0 reiniciar · 1–7 escena · → siguiente · Espacio pausa · D panel · M marcar error\nF pantalla completa · H panel del tracking · V cámara · C calibrar postura · O girar la imagen</span>`,
    );
  }

  // ================================================================ lo que llama el motor
  let errores = 0;
  function cuadro(dt, now, fd, engaged) {
    try {
      sen.actualizar(dt, fd, engaged);
      ausente = S.presente ? 0 : ausente + dt;
      if (S.presente && ACTIVOS.has(paso)) vino = true;
      frenado = ACTIVOS.has(paso) && vino && (ausente > 0.5 || aus.volviendo);
      dtUlt = pausado || frenado ? 0 : dt;
      if (!pausado && !frenado) { reloj += dt; resolverEsperas(); }
      if (!pausado) { tPant += dt; for (const e of [...esperasP]) if (tPant >= e.hasta) { esperasP.delete(e); e.res(true); } }
      vigilarCasos();
      if (S.presente) cuerpo.mirarA(S.x, dt);
      cuerpo.cuadro(dt, pausado);      esc.cuadro(dt);
      hilos.cuadro(dt);
      sombra.cuadro(dt);
      cuadroCamara(dt);
      pantalla.cuadro(tPant * 1000);
      pantalla.ojoX(S.x);
      if (partida.inicio && (muestraT += dt) > 0.2) {
        muestraT = 0;
        const en = sombra.visible() ? sombra.encaje().total : null;
        partida.muestras.push([tPartida(), paso, S.presente ? 1 : 0, +S.mov.toFixed(2), S.mano.ok ? +S.mano.x.toFixed(2) : null, S.mano.ok ? +S.mano.y.toFixed(2) : null, en === null ? null : +en.toFixed(2)]);
      }
      if ((panelT += dt) > 0.25) { panelT = 0; actualizarPanel(); }
    } catch (e) { if (errores++ < 5) console.error('[cabina] cuadro', e); }
  }
  function hueso(r, t, dt, maxRate) {
    try { return cuerpo.hueso(r, t, dt, maxRate); } catch (e) { if (errores++ < 5) console.error('[cabina] hueso', e); return [t, maxRate]; }
  }

  // acceso para probar desde la consola: __cabina.ir('4'), __cabina.S, __cabina.sombra.encaje()…
  window.__cabina = { ir, S, sen, cuerpo, audio, pantalla, esc, hilos, sombra, datos: () => datos, paso: () => paso, guion, UMBRAL, marcar };
  correr('espera');
  return { cuadro, hueso, cara };
}
