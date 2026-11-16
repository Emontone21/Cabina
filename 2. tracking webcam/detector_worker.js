// Deteccion de MediaPipe en OTRO HILO (v13 cambio 13; v14 cambio 15: varios hilos en paralelo, 9/11).
// El hilo principal manda cada cuadro de la camara (ImageBitmap) y este hilo devuelve los puntos. Asi la deteccion
// (el 90% del tiempo de cada cuadro) no frena el dibujo: tiesme se dibuja a la velocidad de la pantalla.
// ROLES (mensaje init.rol):
// - 'todo':  un solo hilo hace cuerpo + cara + manos (la cara un cuadro si y uno no), como detect() de app.js.
// - 'pose':  solo el cuerpo.  'manos' / 'cara': solo eso, sobre el mismo cuadro, usando el cuerpo (pn) que le manda el
//   principal. Con tres hilos, el cuerpo del cuadro N+1 se detecta mientras las manos y la cara del cuadro N todavia se
//   calculan: el tiempo por cuadro lo marca el hilo mas lento (~35 ms) en vez de la suma (~100 ms).
// Es la MISMA logica que detect() de app.js (el cuerpo ubica la cara y cada mano; se recorta esa zona, se amplia y se
// le pasa a los detectores; los puntos vuelven a coordenadas de la imagen entera). Si se cambia una, cambiar la otra.
// Mensajes: {tipo:'init', rol, wasm, modelos, sin, focal1280} -> {tipo:'listo', rol, delegate}
//           {tipo:'cuadro', id, bitmap, vw, vh, f, ts, pn?}   -> {tipo:'resultado', id, rol, parte, tiempos}
//           {tipo:'reset'}
// - 'holistic' (v14, ?det=holistic): UN solo modelo de MediaPipe (Holistic) hace cuerpo + manos + cara sobre la imagen
//   entera; el recorte de cada mano lo hace MediaPipe adentro, siguiendo la mano de un cuadro al otro (como el plugin de
//   TouchDesigner). Nuestro codigo recibe lo mismo de siempre (mapHolistic).
import { FilesetResolver, PoseLandmarker, HandLandmarker, FaceLandmarker, HolisticLandmarker } from './lib/mediapipe/vision_bundle.mjs';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ROI_PX = 256;
const HAND_PTS = { left: [15, 17, 19, 21], right: [16, 18, 20, 22] }; // muñeca, meñique, indice, pulgar del cuerpo
let rol = 'todo', poseLm = null, faceLm = null, holisticLm = null, sin = [], focal1280 = 1;
const handLmS = { left: null, right: null };
const CAMBIO = n => !sin.includes(n);
const roiCanvas = {}, roiState = {};
let detN = 0, lastFace = null, lastFaceRoi = null, poseCanvas = null, lastHands = null;
const tiempos = { pose: 0, cara: 0, manos: 0, add(k, ms) { this[k] += (ms - this[k]) * 0.1; } };

function smoothRoi(key, cx, cy, size, vw, vh) {
  const s = roiState[key];
  // cambio 16 ("a lo TouchDesigner"): el recorte se queda QUIETO mientras la mano/cara siga adentro, asi el seguidor interno
  // de MediaPipe la sigue entre cuadros; solo se mueve cuando se acerca al borde
  if (CAMBIO(16) && s && Math.abs(cx - s.cx) < 0.3 * s.size && Math.abs(cy - s.cy) < 0.3 * s.size && size > 0.7 * s.size && size < 1.4 * s.size) {
    // (sin cambios)
  } else if (s && Math.hypot(cx - s.cx, cy - s.cy) < s.size * 0.6) {
    s.cx += (cx - s.cx) * 0.6; s.cy += (cy - s.cy) * 0.6; s.size += (size - s.size) * 0.3;
  } else roiState[key] = { cx, cy, size };
  const r = roiState[key], sz = clamp(r.size, 64, Math.min(vw, vh));
  return { x0: clamp(r.cx - sz / 2, 0, vw - sz), y0: clamp(r.cy - sz / 2, 0, vh - sz), s: sz };
}
function runOnRoi(src, lm, key, roi, ts) {
  if (!roiCanvas[key]) { const c = new OffscreenCanvas(ROI_PX, ROI_PX); roiCanvas[key] = { c, ctx: c.getContext('2d') }; }
  const { c, ctx } = roiCanvas[key];
  ctx.drawImage(src, roi.x0, roi.y0, roi.s, roi.s, 0, 0, ROI_PX, ROI_PX);
  return lm.detectForVideo(c, ts);
}
const mapN = (p, roi, vw, vh) => ({ x: (roi.x0 + p.x * roi.s) / vw, y: (roi.y0 + p.y * roi.s) / vh, z: p.z * roi.s / vw, visibility: p.visibility });
const puntos = (pn, vw, vh) => i => ({ x: pn[i].x * vw, y: pn[i].y * vh, v: pn[i].visibility ?? 1 });

// --- cuerpo (cambio 11: sobre una copia chica; el modelo trabaja a 256x256 igual)
function detectarPose(src, vw, vh, ts) {
  const t0 = performance.now();
  let poseSrc = src;
  if (CAMBIO(11) && vw > 700) {
    const pw = 640, ph = Math.round(640 * vh / vw);
    if (!poseCanvas || poseCanvas.width !== pw || poseCanvas.height !== ph) poseCanvas = new OffscreenCanvas(pw, ph);
    poseCanvas.getContext('2d').drawImage(src, 0, 0, pw, ph);
    poseSrc = poseCanvas;
  }
  const pose = poseLm.detectForVideo(poseSrc, ts);
  tiempos.add('pose', performance.now() - t0);
  return pose;
}
// --- cara: recorte alrededor de la nariz, del tamaño de la cabeza
function detectarCara(src, pn, vw, vh, f, ts) {
  const P = puntos(pn, vw, vh), kpx = f / focal1280;
  if (!pn || P(0).v <= 0.4) { delete roiState.face; return { face: null, faceRoi: null }; }
  const eL = P(7), eR = P(8), sL = P(11), sR = P(12), n = P(0);
  const ear = Math.hypot(eL.x - eR.x, eL.y - eR.y), sw = Math.hypot(sL.x - sR.x, sL.y - sR.y);
  const size = Math.max(ear * 2.6, sw * 0.9, 96 * kpx);
  const roi = smoothRoi('face', n.x, n.y - size * 0.06, size, vw, vh);
  const t0 = performance.now();
  const r = runOnRoi(src, faceLm, 'face', roi, ts);
  tiempos.add('cara', performance.now() - t0);
  if (r.faceLandmarks?.length) r.faceLandmarks = r.faceLandmarks.map(fl => fl.map(p => mapN(p, roi, vw, vh)));
  return { face: r, faceRoi: roi };
}
// --- manos: un recorte por muñeca del cuerpo
function detectarManos(src, pn, vw, vh, f, ts) {
  const hands = { left: null, right: null }, rois = {};
  if (!pn) return { hands, rois };
  const P = puntos(pn, vw, vh), kpx = f / focal1280;
  const sw = Math.hypot(P(11).x - P(12).x, P(11).y - P(12).y);
  let ms = 0;
  for (const U of ['left', 'right']) {
    const [wi, ...ki] = HAND_PTS[U], w = P(wi);
    if (w.v < 0.2 || w.x < -0.05 * vw || w.x > 1.05 * vw || w.y < -0.05 * vh || w.y > 1.05 * vh) { delete roiState[U]; continue; }
    const k = ki.map(P), m = { x: (k[0].x + k[1].x + k[2].x) / 3, y: (k[0].y + k[1].y + k[2].y) / 3 };
    const ext = Math.hypot(m.x - w.x, m.y - w.y);
    const roi = smoothRoi(U, w.x + (m.x - w.x) * 1.2, w.y + (m.y - w.y) * 1.2, Math.max(ext * 5, sw * 0.75, 80 * kpx), vw, vh);
    rois[U] = roi;
    const t0 = performance.now();
    const r = runOnRoi(src, handLmS[U], 'hand' + U, roi, ts);
    ms += performance.now() - t0;
    // en el recorte puede haber dos manos (manos juntas): va la de muñeca mas cerca de la muñeca del cuerpo
    let best = null, bd = Infinity;
    (r.landmarks || []).forEach((L, i) => {
      const N = L.map(p => mapN(p, roi, vw, vh));
      const d = Math.hypot(N[0].x * vw - w.x, N[0].y * vh - w.y);
      if (d < bd) { bd = d; best = { N, W: r.worldLandmarks[i] }; }
    });
    if (best && bd < roi.s * 0.6) hands[U] = best;
  }
  // la misma mano tomada por los dos lados: queda del lado cuya muñeca del cuerpo esta mas cerca
  if (hands.left && hands.right) {
    const a = hands.left.N[0], b = hands.right.N[0];
    if (Math.hypot((a.x - b.x) * vw, (a.y - b.y) * vh) < 0.15 * sw) {
      const dl = Math.hypot(a.x * vw - P(15).x, a.y * vh - P(15).y), dr = Math.hypot(b.x * vw - P(16).x, b.y * vh - P(16).y);
      if (dl <= dr) hands.right = null; else hands.left = null;
    }
  }
  tiempos.add('manos', ms);
  return { hands, rois };
}
// --- un solo hilo para todo (como detect() de app.js, con el cambio 10 si esta prendido)
function detectarTodo(src, vw, vh, f, ts) {
  const pose = detectarPose(src, vw, vh, ts), pn = pose.landmarks?.[0];
  const out = { pose, vw, vh, f, rois: {} };
  const faceNow = (detN++ % 2 === 0) || !lastFace;
  if (faceNow) ({ face: lastFace, faceRoi: lastFaceRoi } = detectarCara(src, pn, vw, vh, f, ts));
  const handsNow = !CAMBIO(10) || !faceNow || !lastHands;
  if (pn && handsNow) { const m = detectarManos(src, pn, vw, vh, f, ts); lastHands = m; }
  const m = pn ? (lastHands || { hands: { left: null, right: null }, rois: {} }) : { hands: { left: null, right: null }, rois: {} };
  if (!pn) lastHands = null;
  out.handsBySide = m.hands; out.rois = m.rois;
  out.handsN = ['left', 'right'].filter(s => m.hands[s]).map(s => m.hands[s].N);
  out.face = lastFace; out.faceNow = faceNow; out.faceRoi = lastFaceRoi;
  return out;
}

// --- Holistic: un solo modelo para todo. Devuelve lo mismo que detectarTodo. (Misma funcion en app.js: si cambia una, cambiar la otra.)
// Holistic no da la matriz de la cara: se arma una con los puntos (sien a sien = X, menton a frente = Y) para que el giro de
// la cabeza y la compensacion de la boca sigan andando.
function matrizCara(fl, vw, vh) {
  const P = i => [(fl[i].x - 0.5) * vw, -(fl[i].y - 0.5) * vh, -fl[i].z * vw];
  const nrm = v => { const l = Math.hypot(...v) || 1; return v.map(c => c / l); };
  const a = P(454), b = P(234), c = P(10), d = P(152);
  const X = nrm([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
  let Y = nrm([c[0] - d[0], c[1] - d[1], c[2] - d[2]]);
  const Z = nrm([X[1] * Y[2] - X[2] * Y[1], X[2] * Y[0] - X[0] * Y[2], X[0] * Y[1] - X[1] * Y[0]]);
  Y = [Z[1] * X[2] - Z[2] * X[1], Z[2] * X[0] - Z[0] * X[2], Z[0] * X[1] - Z[1] * X[0]];
  return [X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, 0, 0, 0, 1];
}
function mapHolistic(r, vw, vh, f) {
  const pn = r.poseLandmarks?.[0] || null, pw = r.poseWorldLandmarks?.[0] || null;
  const mano = (N, W) => (N?.length ? { N, W: W?.length ? W : N } : null);
  const hands = { left: mano(r.leftHandLandmarks?.[0], r.leftHandWorldLandmarks?.[0]), right: mano(r.rightHandLandmarks?.[0], r.rightHandWorldLandmarks?.[0]) };
  const fl = r.faceLandmarks?.[0] || null;
  const face = fl ? { faceLandmarks: [fl], faceBlendshapes: [], facialTransformationMatrixes: [{ data: matrizCara(fl, vw, vh), rows: 4, columns: 4 }] } : null;
  const out = { pose: { landmarks: pn ? [pn] : [], worldLandmarks: pw ? [pw] : [] }, vw, vh, f, rois: {}, handsBySide: hands, face, faceNow: !!fl, faceRoi: null };
  out.handsN = ['left', 'right'].filter(s => hands[s]).map(s => hands[s].N);
  return out;
}
function detectarHolistic(src, vw, vh, f, ts) {
  const t0 = performance.now();
  const r = holisticLm.detectForVideo(src, ts);
  tiempos.add('pose', performance.now() - t0); tiempos.manos = 0; tiempos.cara = 0;
  return mapHolistic(r, vw, vh, f);
}

async function init(m) {
  rol = m.rol || 'todo'; sin = m.sin || []; focal1280 = m.focal1280 || 1;
  const fileset = await FilesetResolver.forVisionTasks(m.wasm);
  // En un worker de tipo modulo importScripts existe pero tira error al llamarlo, y MediaPipe lo usa para cargar su
  // wasm. Se carga ese archivo a mano (es nuestro, de lib/: define ModuleFactory) y se deja un importScripts vacio.
  const codigo = await (await fetch(fileset.wasmLoaderPath)).text();
  (0, eval)(codigo);
  self.importScripts = () => {};
  let used = 'GPU';
  const make = async (Cls, url, extra) => {
    for (const delegate of ['GPU', 'CPU']) {
      try { return await Cls.createFromOptions(fileset, { baseOptions: { modelAssetPath: url, delegate }, runningMode: 'VIDEO', ...extra }); }
      catch (err) { console.warn('MediaPipe (worker ' + rol + ')', delegate, err); used = 'CPU'; }
    }
    throw new Error('no se pudo iniciar un detector');
  };
  const tareas = [];
  // (sin blendshapes: ese grafico no corre en la GPU de WebGL, "No support of const"; los gestos de cara los da el hilo 'cara')
  if (rol === 'holistic') tareas.push(make(HolisticLandmarker, m.modelos.holistic, { outputFaceBlendshapes: false }).then(x => { holisticLm = x; }));
  if (rol === 'todo' || rol === 'pose') tareas.push(make(PoseLandmarker, m.modelos.pose, { numPoses: 1 }).then(x => { poseLm = x; }));
  if (rol === 'todo' || rol === 'manos') tareas.push(make(HandLandmarker, m.modelos.hand, { numHands: 2 }).then(x => { handLmS.left = x; }), make(HandLandmarker, m.modelos.hand, { numHands: 2 }).then(x => { handLmS.right = x; }));
  if (rol === 'todo' || rol === 'cara') tareas.push(make(FaceLandmarker, m.modelos.face, { numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true }).then(x => { faceLm = x; }));
  await Promise.all(tareas);
  return used;
}
function reset() {
  for (const k of Object.keys(roiState)) delete roiState[k];
  lastFace = lastFaceRoi = null; lastHands = null;
}

self.onmessage = async e => {
  const m = e.data;
  try {
    if (m.tipo === 'init') self.postMessage({ tipo: 'listo', rol, delegate: await init(m) });
    else if (m.tipo === 'reset') reset();
    else if (m.tipo === 'cuadro') {
      let parte = null;
      try {
        if (rol === 'holistic') parte = holisticLm ? detectarHolistic(m.bitmap, m.vw, m.vh, m.f, m.ts) : null;
        else if (rol === 'todo') parte = poseLm ? detectarTodo(m.bitmap, m.vw, m.vh, m.f, m.ts) : null;
        else if (rol === 'pose') parte = poseLm ? { pose: detectarPose(m.bitmap, m.vw, m.vh, m.ts) } : null;
        else if (rol === 'cara') parte = faceLm ? detectarCara(m.bitmap, m.pn, m.vw, m.vh, m.f, m.ts) : null;
        else if (rol === 'manos') parte = handLmS.left ? detectarManos(m.bitmap, m.pn, m.vw, m.vh, m.f, m.ts) : null;
      } finally { m.bitmap.close(); }
      self.postMessage({ tipo: 'resultado', id: m.id, rol, parte, tiempos: { pose: tiempos.pose, manos: tiempos.manos, cara: tiempos.cara } });
    }
  } catch (err) {
    console.error('[detector_worker ' + rol + ']', err);
    self.postMessage({ tipo: 'error', rol, mensaje: String(err?.message || err), enInit: m.tipo === 'init' });
    if (m.tipo === 'cuadro') self.postMessage({ tipo: 'resultado', id: m.id, rol, parte: null, tiempos: { pose: 0, manos: 0, cara: 0 } });
  }
};
