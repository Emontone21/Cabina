// DIRECTOR de la cabina v0.2 (cartón): "EL NÚMERO DE TIESME". Recorre las escenas de EXPLORACION_CONCEPTO.md
// (sección 12) con los textos y tiempos de guion.js. Lo carga el motor (motor_v12/app.js, bloque ">>> CABINA") y lo
// llama en cada cuadro (cuadro), por cada hueso (hueso) y para la cara (cara). La v0.1 está en _versiones/cabina_v0.1.
//
// Teclas de quien atiende: 0 reiniciar · 1 a 9 saltar a una escena · → escena siguiente · Espacio pausa · D panel ·
// M marcar "acá algo anduvo mal" (queda en el registro de la partida con el segundo).
// Del tracking siguen andando: F pantalla completa · H panel del tracking · V cámara · C calibrar postura · G gestos.

import guion from '../guion.js';
import { crearAudio } from './audio.js';
import { crearPantalla } from './pantalla.js';
import { crearEscenario } from './escenario.js';
import { crearHilos } from './hilos.js';
import { crearSenales, UMBRAL } from './senales.js';
import { crearCuerpo, PARTES } from './cuerpo.js';
import { crearSombra } from './sombra.js';

export const VERSION_CABINA = guion.version || 'cabina v0.2';
const CANCELADO = Symbol('cancelado');
const ORDEN = ['espera', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'fin'];
const NOMBRE = {
  espera: 'Espera (telón cerrado)', 1: 'Presentación', 2: 'Calentamiento (Richie dice)', 3: 'Ensayo (estatuas)',
  4: 'Revelación', 5: 'Discusión', 6: 'Registran que estás', 7: 'Decidís', 8: 'El nombre (críptico)', 9: 'La función',
  10: 'Selfie', fin: 'Fin',
};
const ANTES = new Set(['1', '2', '3']); // antes de la revelación: habla solo Richie
const ACTIVOS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
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
  const esperar = seg => { const id = corrida; return new Promise((res, rej) => esperas.add({ hasta: reloj + Math.max(0, seg), res, rej, id })); };
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
    aus.token++; aus.avisado = false; aus.volviendo = false; // corta un comentario de ausencia que estuviera sonando
    correr(p);
  }

  // ================================================================ hablar (voz + viñeta)
  const ultimaVariante = {}, registro = [];
  let hablando = { quien: null, hasta: 0 }, escena = 'espera';
  function elegir(codigo, n) {
    if (n <= 1) return 0;
    let i; do i = Math.random() * n | 0; while (i === ultimaVariante[codigo]);
    return (ultimaVariante[codigo] = i);
  }
  function decir(codigo, { i, roto = false, susurro = false } = {}) {
    const lista = guion.frases[codigo];
    if (!lista?.length) { console.warn('[cabina] falta la frase', codigo); return 0; }
    i = Math.min(i ?? elegir(codigo, lista.length), lista.length - 1);
    const texto = lista[i], quien = codigo[0] === 'T' ? 'tiesme' : 'richie';
    const dur = audio.decir(quien, `${codigo}-${i + 1}`, texto, { susurro });
    pantalla.vineta(quien, texto, dur, { roto, oscura: escena === 'trabajo' });
    hablando = { quien, hasta: tPant + dur };
    anotar(`${codigo}-${i + 1}: ${texto}`);
    return dur;
  }
  async function hablar(codigo, { esperarFin = true, pausa = 0.25, ...o } = {}) {
    const dur = decir(codigo, o);
    if (esperarFin) await esperar(dur + pausa);
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
  const BRAZO_ARRIBA = { brazo: [0.3, 1, 0.05], ante: [0.05, 1, 0.05] };
  const BRAZOS_TIESME_SOLA = { brazoIzq: { brazo: [0.95, 0.1, 0.2], ante: [0.45, 0.2, 0.9] }, brazoDer: { brazo: [0.35, 0.9, 0.1], ante: [-0.2, 0.95, 0.2] } };
  // te copia todo (acto alegre)
  function copiarTodo(seg = 0.6) { cuerpo.dial('todo', LIMPIO, seg); caraForzada = null; }
  // todo es de ella
  function todoDeElla(seg = 0.6) { cuerpo.dial('todo', { propio: 1, retraso: 0, impreciso: 0, contrario: 0 }, seg); }
  // los brazos y manos son tuyos, lo demás de ella (el número a dúo)
  function brazosTuyos(seg = 0.6) {
    cuerpo.dial(['brazoIzq', 'brazoDer', 'manoIzq', 'manoDer'], LIMPIO, seg);
    cuerpo.dial(['cabeza', 'torso', 'cara'], { propio: 1 }, seg);
  }

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
  const nuevosDatos = () => ({ consignas: [], trampa: null, estatuas: [], primero: null, intentos: {}, criptico: null, selfie: null });
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
  // elegir con la mano (o el mouse): devuelve el id del botón
  async function elegirBoton(lista, { dwell = guion.decision.dwell, donde = 'abajo', max = Infinity } = {}) {
    pantalla.botones(lista, { donde });
    let sobre = null, carga = 0, elegido = null, enSuLugar = 0;
    const ok = await hasta(() => {
      const c = pantalla.tomarClic();
      if (c) { elegido = c; return true; }
      // la mano elige solo con la persona en su lugar hace 1 s: antes, al volver a entrar, la mano pasaba por un
      // botón y lo elegía sola (y sin verse el puntero)
      enSuLugar = S.presente ? enSuLugar + dtUlt : 0;
      const apunta = S.mano.ok && enSuLugar > 1;
      pantalla.puntero(S.mano.x, S.mano.y, apunta);
      const b = apunta ? pantalla.botonEn(S.mano.x, S.mano.y) : null;
      if (b !== sobre) { sobre = b; carga = 0; }
      if (b) { carga += dtUlt / dwell; ultimaExploracion = reloj; }
      pantalla.cargaBoton(sobre, carga);
      if (carga >= 1) { elegido = b; return true; }
      return false;
    }, max);
    pantalla.cargaBoton(null, 0); pantalla.puntero(0, 0, false);
    if (ok && elegido) { audio.fx('bien', { vol: 0.6 }); anotar(`eligió: ${elegido}`); }
    return ok ? elegido : null;
  }
  let ultimaExploracion = -99;
  // un intento de la figura: mide el encaje y devuelve el mejor
  async function intentoFigura(seg, { hastaSalir = false } = {}) {
    let mejor = 0, sostenido = 0;
    const salio = await hasta(() => {
      const e = sombra.encaje();
      mejor = Math.max(mejor, e.total);
      sostenido = e.total >= guion.ensayo.encajeOk ? sostenido + dtUlt : 0;
      pantalla.medidor(e.total, `encaje ${Math.round(e.total * 100)}%`);
      return hastaSalir && sostenido > 0.8;
    }, seg);
    return { mejor, salio: salio && hastaSalir };
  }
  function medidorEnVivo(cond) { lanzar(async () => { await hasta(() => { if (!cond()) return true; const e = sombra.encaje(); pantalla.medidor(e.total, `encaje ${Math.round(e.total * 100)}%`); return false; }); }); }
  // la cuenta de la estatua (devuelve cuánto se movió)
  async function cuentaEstatua(seg, { alSegundo } = {}) {
    let movido = 0;
    for (let k = Math.ceil(seg); k > 0; k--) {
      pantalla.estatua('¡ESTATUA!', k); audio.fx('tic');
      if (alSegundo) alSegundo(Math.ceil(seg) - k);
      await hasta(() => { if (!S.quieto) movido += dtUlt; const e = sombra.encaje(); pantalla.medidor(e.total, `encaje ${Math.round(e.total * 100)}%`); return false; }, 1);
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
        await intentoFigura(e.musicaAntes);
        audio.cortarMusica(); audio.fx('estatua');
        decir('R2-estatua');
        const movido = await cuentaEstatua(e.estatua);
        const enc = sombra.encaje();
        datos.estatuas.push({ quieto: movido < 0.5, encaje: +enc.total.toFixed(2) });
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
      await intentoFigura(e.musicaAntes);
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

    // ---------------- 7 DECIDÍS: "¿a lo Richie o a lo tiesme?" Ninguna sola alcanza; juntos sale.
    async 7() {
      pantalla.telon(true, 0.01); cuerpo.mostrar(true);
      ponerEscena('ensayo', 1.0); audio.cortarMusica();
      sombra.hornear(guion.figura); sombra.mostrar(true); sombra.brillar(0);
      todoDeElla(0.4); caraForzada = { ojos: 'base' }; cuerpo.posar({ raiz: R.raiz }, 0.6);
      const f = guion.figura, d = guion.decision;
      await charla('T3-pregunta', 'R3-pregunta');
      const primero = (await elegirBoton([{ id: 'richie', texto: 'A LO RICHIE', icono: '🧢' }, { id: 'tiesme', texto: 'A LO TIESME', icono: '💃' }], { dwell: d.dwell, max: 25 })) || 'richie';
      datos.primero = primero;
      const probar = async quien => {
        if (quien === 'richie') {
          // de frente, tus brazos: los brazos encajan, el giro no
          cuerpo.dial(['brazoIzq', 'brazoDer', 'manoIzq', 'manoDer'], LIMPIO, 0.5); cuerpo.posar({ raiz: { giro: 0 } }, 0.8);
          pantalla.indicador({ encabezado: 'a lo Richie', icono: '🧢', texto: f.instruccion });
          await hablar('R3-arichie');
        } else {
          // ella sola: gira, pero sus brazos no salen
          todoDeElla(0.5); cuerpo.posar({ raiz: { giro: f.giro }, ...BRAZOS_TIESME_SOLA }, 1.2);
          pantalla.indicador({ encabezado: 'a lo tiesme', icono: '💃', texto: 'quedate quieto' });
          await hablar('T3-atiesme');
        }
        audio.seguirMusica();
        const r = await intentoFigura(d.intento);
        audio.cortarMusica();
        datos.intentos[quien] = +r.mejor.toFixed(2);
        anotar(`a lo ${quien}: encaje máximo ${Math.round(r.mejor * 100)}%`);
        pantalla.indicador(null); audio.fx('mal', { vol: 0.5 });
        await hablar(quien === 'richie' ? 'R3-falta-richie' : 'T3-falta-tiesme');
      };
      await probar(primero);
      await hablar(primero === 'richie' ? 'T3-otra' : 'R3-otra');
      await probar(primero === 'richie' ? 'tiesme' : 'richie');
      // juntos: tus brazos + su giro
      await charla('T3-juntos', 'R3-juntos');
      brazosTuyos(0.5); cuerpo.posar({ raiz: { giro: f.giro }, torso: R.torso, cabeza: R.cabeza }, 1.2);
      pantalla.indicador({ encabezado: 'los tres', icono: '🦅', texto: f.instruccion });
      audio.seguirMusica();
      let r = await intentoFigura(12, { hastaSalir: true });
      if (!r.salio) { // le damos una mano: los brazos van solos a la figura
        anotar('juntos: no salía, ella ayuda con los brazos');
        cuerpo.dial(['brazoIzq', 'brazoDer'], { propio: 1 }, 1.0); cuerpo.posar(f.pose, 1.0);
        r = await intentoFigura(4, { hastaSalir: true });
      }
      audio.cortarMusica(); pantalla.indicador(null);
      datos.intentos.juntos = +r.mejor.toFixed(2);
      sombra.brillar(1); audio.fx('aplausos', { vol: 0.5 }); pantalla.medidor(1, '¡salió!');
      await hablar('R3-salio');
      await charla('R3-ayude', 'T3-ayude');
      pantalla.medidor(null);
    },

    // ---------------- 8 EL NOMBRE DEL NÚMERO = el críptico (piezas con la mano; Richie ayuda, tiesme lo frena)
    async 8() {
      pantalla.telon(true, 0.01); cuerpo.mostrar(true); if (escena !== 'ensayo') ponerEscena('ensayo', 0.6);
      sombra.mostrar(true); todoDeElla(0.4); caraForzada = { ojos: 'base' };
      const c = guion.criptico;
      await charla('R3-titulo', 'T3-titulo');
      const puestas = [], t0 = reloj; let ayudas = 0, resuelto = false;
      pantalla.criptico({ pista: c.pista, huecos: c.respuesta.length, puestas });
      const piezas = mezclar(c.piezas).map(p => ({ id: p, texto: p, icono: '' }));
      // ayudas: solo si no está eligiendo en ese momento; la primera viene con la protección de tiesme.
      // Si lo resuelve en el medio de una ayuda, la ayuda se corta (antes seguían hablando encima del festejo).
      const ayudar = async (...cods) => { for (const cod of cods) { if (resuelto) return; await hablar(cod); } };
      lanzar(async () => {
        for (const tAyuda of c.ayudas) {
          await hasta(() => resuelto || (reloj - t0 > tAyuda && reloj - ultimaExploracion > 2));
          if (resuelto) return;
          ayudas++;
          if (ayudas === 1) await ayudar('R3-ayuda-1', 'T3-dejalo', 'R3-dejalo', 'T3-desde');
          else if (ayudas === 2) await ayudar('R3-ayuda-2');
          else { await ayudar('R3-ayuda-3'); if (!resuelto && !puestas.length) { puestas.push(c.respuesta[0]); pantalla.criptico({ pista: c.pista, huecos: c.respuesta.length, puestas }); } }
        }
      });
      while (!resuelto && reloj - t0 < c.max) {
        const p = await elegirBoton(piezas, { dwell: c.dwell, donde: 'piezas', max: c.max - (reloj - t0) });
        if (!p) break;
        puestas.push(p);
        pantalla.criptico({ pista: c.pista, huecos: c.respuesta.length, puestas });
        if (puestas.length >= c.respuesta.length) {
          if (puestas.join('') === c.respuesta.join('')) resuelto = true;
          else { audio.fx('mal', { vol: 0.5 }); await esperar(0.9); puestas.length = 0; pantalla.criptico({ pista: c.pista, huecos: c.respuesta.length, puestas }); }
        }
      }
      pantalla.botones(null);
      const respuesta = c.respuesta.join('');
      datos.criptico = { resuelto, segundos: +(reloj - t0).toFixed(1), ayudas };
      anotar(`críptico: ${resuelto ? 'resuelto' : 'revelado'} en ${(reloj - t0).toFixed(0)} s con ${ayudas} ayudas`);
      if (!resuelto) { await hablar('R3-revela'); pantalla.criptico({ pista: c.pista, huecos: c.respuesta.length, puestas: c.respuesta }); }
      else { audio.fx('bien'); await charla('T3-bien', 'R3-bien'); }
      await esperar(0.6);
      pantalla.criptico(null);
      pantalla.cartel(respuesta, { brilla: true }); audio.fx('inicio');
      await esperar(1.2);
    },

    // ---------------- 9 LA FUNCIÓN: a dúo en un solo cuerpo (tus brazos, su giro) y la reverencia
    async 9() {
      pantalla.telon(true, 0.01); cuerpo.mostrar(true);
      ponerEscena('funcion', 0.8); sombra.mostrar(true); sombra.brillar(0.4);
      caraForzada = { ojos: 'feliz_v2' };
      await charla('R3-funcion', 'T3-funcion');
      brazosTuyos(0.5);
      audio.ponerMusica('juego');
      const t0 = reloj, f = guion.figura;
      await hasta(() => {
        const t = reloj - t0;
        cuerpo.fijar({ raiz: { giro: f.giro * Math.sin(t * 1.4) }, torso: { roll: 6 * Math.sin(t * 2.8), pitch: 3, yaw: 0 }, cabeza: { roll: 8 * Math.sin(t * 2.8 + 1), yaw: 0, pitch: 0 } });
        return false;
      }, guion.funcion.dur);
      // reverencia
      todoDeElla(0.4);
      await hablar('R3-reverencia', { esperarFin: false });
      await esperar(cuerpo.posar({ raiz: { giro: 0 }, torso: { pitch: 38, yaw: 0, roll: 0 }, cabeza: { pitch: 18, yaw: 0, roll: 0 }, brazoIzq: R.brazoIzq, brazoDer: R.brazoDer }, 1.0));
      audio.fx('aplausos');
      await esperar(1.4);
      await esperar(cuerpo.posar({ torso: R.torso, cabeza: R.cabeza }, 0.9));
    },

    // ---------------- 10 SELFIE: sí / paso con la mano; pose quieta; @al.paciello
    async 10() {
      pantalla.telon(true, 0.01); cuerpo.mostrar(true); if (escena !== 'funcion') ponerEscena('funcion', 0.6);
      todoDeElla(0.3); caraForzada = { ojos: 'feliz_v2' }; sombra.mostrar(false);
      const s = guion.selfie;
      await charla('R3-selfie', 'T3-selfie');
      const r = await elegirBoton([{ id: 'si', texto: 'SÍ, SELFIE', icono: '📸' }, { id: 'paso', texto: 'PASO', icono: '👋' }], { dwell: s.dwell, max: 15 });
      datos.selfie = r === 'si';
      if (r === 'si') {
        modoSelfie = true;
        pantalla.selfie({ texto: 'Sacá tu celular, date vuelta y sacate la foto con nosotros', arroba: s.arroba });
        cuerpo.posar({ brazoDer: BRAZO_ARRIBA, cabeza: { roll: 10, yaw: 0, pitch: 0 }, torso: { roll: -4, yaw: 0, pitch: 0 } }, 0.8);
        await esperar(2.5);
        await hablar('R3-foto');
        await charla('T3-quieto', 'R3-gorro');
        cuerpo.vida(0); // quieta para la foto
        await esperar(s.espera);
        cuerpo.vida(1);
        await charla('T3-etiqueta', 'R3-cuenta');
        pantalla.selfie(null); modoSelfie = false;
      } else {
        await charla('T3-paso', 'R3-paso');
      }
      cuerpo.posar({ brazoDer: R.brazoDer, cabeza: R.cabeza, torso: R.torso }, 0.8);
      await charla('T3-chau', 'R3-chau');
    },

    // ---------------- FIN: se cierra el telón; cuando la persona se va, vuelve la Espera
    async fin() {
      pantalla.limpiar(); audio.fx('telon'); pantalla.telon(false, 1.6); audio.pararMusica(1.5);
      await esperar(1.8);
      cuerpo.mostrar(false); sombra.mostrar(false); modoSelfie = false;
      await hasta(() => ausente > 2.5, 10);
      return 'espera';
    },
  };

  // ================================================================ ausencias (la persona sale de cuadro)
  // Se pausa la escena y se conserva el avance. Antes de la revelación comenta solo Richie; después, los dos.
  // Al volver se interrumpe el comentario, le dicen algo y recién después se retoma (volviendo: la escena sigue
  // frenada mientras tanto; antes la escena seguía enseguida y las frases se pisaban). En el modo selfie darse vuelta
  // no cuenta.
  let modoSelfie = false, vino = false; // vino = la persona ya llegó a su lugar en esta partida
  const aus = { avisado: false, variante: 0, token: 0, volviendo: false };
  function vigilarCasos() {
    if (!ACTIVOS.has(paso) || pausado || modoSelfie || !vino) return;
    const c = guion.casos, antes = ANTES.has(paso);
    if (!S.presente && !aus.avisado && ausente > (antes ? c.volveA : c.seFueA)) {
      aus.avisado = true; aus.volviendo = false; const tk = ++aus.token;
      audio.callar(); pantalla.sinVineta();
      anotar('se fue de cuadro: comentario');
      aus.variante = 1 - aus.variante;
      lanzar(async () => {
        const fila = antes ? ['R-ausente-antes'] : aus.variante ? ['R-ausente-1', 'T-ausente-1'] : ['T-ausente-2', 'R-ausente-2', 'T-ausente-2b'];
        for (const cod of fila) { if (tk !== aus.token || S.presente) return; await esperarP(decir(cod) + 0.3); }
      });
    }
    if (S.presente && aus.avisado) {
      aus.avisado = false; aus.volviendo = true; const tk = ++aus.token;
      audio.callar(); pantalla.sinVineta();
      anotar('volvió');
      lanzar(async () => {
        const fila = antes ? ['R-vuelve-antes'] : aus.variante ? ['T-vuelve-1', 'R-vuelve-1', 'T-vuelve-1b'] : ['T-vuelve-2', 'R-vuelve-2'];
        try { for (const cod of fila) { if (tk !== aus.token) return; await esperarP(decir(cod) + 0.3); } }
        finally { if (tk === aus.token) aus.volviendo = false; }
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
    for (let n = 1; n <= 9; n++) propias[String(n)] = () => ir(String(n));
    if (propias[k]) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) propias[k](); return; }
    if (!['f', 'h', 'v', 'c', 'g'].includes(k)) e.stopImmediatePropagation();
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
      `primero: ${datos.primero || '—'} · intentos: ${Object.entries(datos.intentos).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ') || '—'}\n` +
      `críptico: ${datos.criptico ? `${datos.criptico.resuelto ? 'resuelto' : 'revelado'} ${datos.criptico.segundos} s, ${datos.criptico.ayudas} ayudas` : '—'} · selfie: ${datos.selfie === null ? '—' : datos.selfie ? 'sí' : 'no'}\n\n` +
      `<b>Últimas cosas</b>\n${registro.map(s => '<span class="dim">' + s.replace(/</g, '&lt;') + '</span>').join('\n')}\n\n` +
      `<span class="dim">0 reiniciar · 1–9 escena · → siguiente · Espacio pausa · D panel · M marcar error\nF pantalla completa · H panel del tracking · V cámara · C calibrar postura</span>`,
    );
  }

  // ================================================================ lo que llama el motor
  let errores = 0;
  function cuadro(dt, now, fd, engaged) {
    try {
      sen.actualizar(dt, fd, engaged);
      ausente = S.presente ? 0 : ausente + dt;
      if (S.presente && ACTIVOS.has(paso)) vino = true;
      frenado = ACTIVOS.has(paso) && vino && !modoSelfie && (ausente > 0.5 || aus.volviendo);
      dtUlt = pausado || frenado ? 0 : dt;
      if (!pausado && !frenado) { reloj += dt; resolverEsperas(); }
      if (!pausado) { tPant += dt; for (const e of [...esperasP]) if (tPant >= e.hasta) { esperasP.delete(e); e.res(true); } }
      vigilarCasos();
      if (S.presente) cuerpo.mirarA(S.x, dt);
      cuerpo.cuadro(dt, pausado);
      esc.cuadro(dt);
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
