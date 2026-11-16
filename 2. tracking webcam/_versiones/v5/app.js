// Tracking tiesme v3: webcam -> MediaPipe (cuerpo, manos, cara) -> huesos Mixamo del FBX en three.js.
// v2: filtro One Euro, profundidad real, IK en perspectiva, dedos con bisagra, estados de cara.
// v3 (analisis del video 19-32-21): las manos van a una POSICION adaptada a las proporciones de tiesme
// (cabeza enorme, antebrazo muy largo) en vez de copiar angulos; colision con cabeza y torso;
// cabeza por la matriz de MediaPipe con limites y congelada si las manos tapan la cara;
// posicion del cuerpo por los hombros; asignacion de manos estable.

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { crearCara } from './cara.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion;
const DEG = Math.PI / 180;

// ---------- Configuracion ----------
const MODEL_URL = '/1. tiesme modelo/tiesme_test01.fbx';
const TEX_DIR = '/1. tiesme modelo/texturas/';
const MP_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MP_MODELS = {
  pose: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  hand: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  face: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
};
const DEMO = new URLSearchParams(location.search).has('demo');
const DEMO_ESC = new URLSearchParams(location.search).get('demo'); // ?demo=inclinar_lado fija una escena

const HFOV = 70;               // campo de vision horizontal de la C920 (grados)
const EYE_W = 0.092;           // distancia real entre comisuras externas de los ojos (m)
const HEAD_TO_SHOULDER = 0.06; // los hombros quedan unos cm detras de la cara
const OCC_FACE = 0.15;         // fraccion de puntos de mano sobre la cara para considerarla tapada
const focal = vw => (vw / 2) / Math.tan(THREE.MathUtils.degToRad(HFOV / 2));
// Limites de giro (Euler YXZ, x+ = mirar abajo). La cabeza es relativa al pecho.
const HEAD_LIM = { x: [-35 * DEG, 40 * DEG], y: [-70 * DEG, 70 * DEG], z: [-35 * DEG, 35 * DEG] };
const CHEST_LIM = { x: [-20 * DEG, 20 * DEG], y: [-35 * DEG, 35 * DEG], z: [-20 * DEG, 20 * DEG] };
// Inclinarse desde la cintura (sin trasladar el modelo): pivote ~45 cm debajo de los hombros (sentado).
const LEAN_TORSO = 0.45;
const LEAN_LIM = { x: [-8 * DEG, 12 * DEG], y: [0, 0], z: [-10 * DEG, 10 * DEG] };
// Zona util de la camara horizontal = una franja vertical 9:16 centrada (lo mismo que muestra la tele).
// Se dibuja en la ventanita de la camara. Afuera de la zona tiesme no te sigue.
const ZONE_W = 9 / 16;      // ancho de la franja en "alturas de imagen" (en 1280x720: 405 px de ancho)
// Perdida de deteccion: se mantiene la ultima pose buena un rato y despues vuelve a reposo despacio.
const HOLD_T = 0.8;       // s que se mantiene la ultima pose buena
const FADE_RATE = 1.2;    // rad/s maximos al volver a reposo
const REENTRY_RATE = 5;   // rad/s maximos al reaparecer (entra suave, sin salto)

// Material del FBX -> textura copiada en "1. tiesme modelo/texturas"
const MAT_TEX = {
  'botacat_uvtexture': 'botacat_uvtexture.png',
  'piernas provisorio': 'tiesme_uvtext_legsv2.png',
  'richiev1_uvtext_test02': 'richiev1_uvtextv1_ojosospecha_test1.mp4',
  'richiev1_uvtext_test03': 'richiev1_uvtext_test04.png',
  'richiev1_uvtext_viceraabajo': 'richiev1_uvtext_test03.png',
  'tiesme_hand': 'tiesme_uv_handsv2.png',
  'tiesme_hand_glove': 'tiesme_uv_handsv2.png',
  'tiesme_torso_abdomen': 'tiesme_torso_abdomen.png',
  'tiesme_uv_face': 'tiesme_uv_face_animate_test01.mp4',
  'tiesme_uv_face_hair': 'tiesme_uv_face_hair.png',
  'tiesme_uv_short': 'tiesme_uv_shortv3.png',
  'tiesme_uv_torso_01': 'tiesme_uv_buso.png',
};
const MAT_COLOR = { 'tiesme_uv_piernas': [0.024, 0.023, 0.133] }; // color lineal del .blend

// Encuadre de la tele vertical (medido en la captura de referencia del 16/10): tope de la gorra al 8,7%
// de la altura y ruedo del buzo al 94,5%, centrado.
const TV_FRAME = { capTop: 0.087, hem: 0.945 };

const opt = {
  vertical: true, lean: true, nearCam: true,
  mirror: true, head: true, chest: true, arms: true, fingers: true, move: false, face: true, voice: false, mapPos: true,
  smooth: 0.7, react: 0.5, moveGain: 1.0, voiceThr: 6,
};

// ---------- Utilidades ----------
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const soft = v => clamp((v - 0.25) / 0.45, 0, 1);          // visibilidad -> peso suave (sin saltos on/off)
const vis = (arr, i) => (arr && arr[i]) ? (arr[i].visibility ?? 1) : 0;
const other = s => (s === 'left' ? 'right' : 'left');
const mid = (a, b) => a.clone().add(b).multiplyScalar(0.5);

// Filtro One Euro: suaviza fuerte cuando estas quieto y casi nada cuando te moves rapido.
const lpA = (dt, fc) => 1 / (1 + 1 / (2 * Math.PI * fc * dt));
class OneEuro {
  constructor(minCutoff, beta) { this.mc = minCutoff; this.b = beta; this.reset(); }
  reset() { this.x = null; this.dx = 0; }
  filter(x, dt) {
    if (this.x === null) return (this.x = x);
    this.dx += lpA(dt, 1) * ((x - this.x) / dt - this.dx);
    this.x += lpA(dt, this.mc + this.b * Math.abs(this.dx)) * (x - this.x);
    return this.x;
  }
}
// Rotaciones: One Euro + velocidad maxima (corta los "latigazos" de un frame mal detectado).
class QuatFilter {
  constructor() { this.q = null; this.d = [0, 0, 0, 0]; }
  filter(t, dt, minCutoff, beta, maxRate = 14) {
    if (!this.q) return (this.q = t.clone());
    const s = (this.q.x * t.x + this.q.y * t.y + this.q.z * t.z + this.q.w * t.w) < 0 ? -1 : 1;
    const x = [t.x * s, t.y * s, t.z * s, t.w * s], c = [this.q.x, this.q.y, this.q.z, this.q.w];
    const ad = lpA(dt, 1);
    for (let i = 0; i < 4; i++) this.d[i] += ad * ((x[i] - c[i]) / dt - this.d[i]);
    const a = lpA(dt, minCutoff + beta * Math.hypot(...this.d));
    const prev = this.q.clone();
    this.q.set(c[0] + a * (x[0] - c[0]), c[1] + a * (x[1] - c[1]), c[2] + a * (x[2] - c[2]), c[3] + a * (x[3] - c[3])).normalize();
    const ang = prev.angleTo(this.q), lim = maxRate * dt;
    if (ang > lim) this.q.copy(prev.slerp(this.q, lim / ang));
    return this.q;
  }
}
// Version vectorial (posiciones en metros o direcciones): usa la velocidad del vector entero.
class VecFilter {
  constructor() { this.x = null; this.d = new V3(); this.spikes = 0; }
  filter(v, dt, minCutoff, beta, maxSpeed) {
    if (!this.x) { this.x = v.clone(); return v.clone(); }
    // un salto imposible (mas rapido que maxSpeed) se ignora hasta 2 detecciones seguidas: es un error de deteccion
    if (maxSpeed && this.spikes < 2 && v.distanceTo(this.x) > maxSpeed * Math.max(dt, 1 / 30)) { this.spikes++; return this.x.clone(); }
    this.spikes = 0;
    this.d.lerp(v.clone().sub(this.x).divideScalar(dt), lpA(dt, 1));
    return this.x.lerp(v, lpA(dt, minCutoff + beta * this.d.length())).clone();
  }
}
const vecFilters = {};
const F3 = (key, v, dt, mc, beta, maxSpeed) => (vecFilters[key] ??= new VecFilter()).filter(v, dt, mc, beta, maxSpeed);
const dropF3 = prefix => { for (const k of Object.keys(vecFilters)) if (k.startsWith(prefix)) delete vecFilters[k]; };

// Suavizado: corte minimo (Hz) cuando estas quieto. Reaccion: cuanto se abre el filtro al moverte rapido.
// Lejos de la camara el mismo error en pixeles es mas error en metros: se suaviza mas (hasta x3 a 2,5 m o mas).
const farFactor = () => clamp(0.9 / lastDepth, 0.35, 1);
const filtParams = () => {
  const k = farFactor();
  return {
    mc: (0.15 + 4 * (1 - opt.smooth) ** 2) * k,
    bDir: 0.5 + opt.react * 5,          // direcciones (1/s)
    bPos: (1 + opt.react * 6) * k,      // posiciones del cuerpo (m/s)
    bHand: 4 + opt.react * 16,          // puntos de la mano (m/s, se mueven poco)
  };
};

function frameQuat(xv, yv) {
  const X = xv.clone().normalize();
  const Y = yv.clone().addScaledVector(X, -yv.dot(X)).normalize();
  const Z = new V3().crossVectors(X, Y);
  return new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}
function twistAbout(q, axis) {
  const p = axis.x * q.x + axis.y * q.y + axis.z * q.z;
  const t = new Q(axis.x * p, axis.y * p, axis.z * p, q.w);
  return t.length() < 1e-6 ? new Q() : t.normalize();
}
function slerpDir(a, b, t) {
  if (t >= 0.999) return b.clone();
  if (t <= 0.001) return a.clone();
  return a.clone().applyQuaternion(new Q().slerp(new Q().setFromUnitVectors(a, b), t));
}
function clampRot(q, lim) {
  const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  e.set(clamp(e.x, ...lim.x), clamp(e.y, ...lim.y), clamp(e.z, ...lim.z), 'YXZ');
  return new Q().setFromEuler(e);
}
// Espejo de una rotacion (reflejo en X): mismo cabeceo, giro e inclinacion invertidos.
const mirrorQ = q => new Q(q.x, -q.y, -q.z, q.w);

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const video = $('video'), overlay = $('overlay'), camBox = $('cam'), panel = $('panel');
const status = { modelo: '…', camara: DEMO ? 'demo' : '…', mediapipe: DEMO ? 'demo' : '…', cara: '…', detecta: '', gesto: '' };
const ok = s => `<span class="ok">${s}</span>`;
const bad = s => `<span class="bad">${s}</span>`;
function setStatus(k, v) { status[k] = v; renderStatus(); }
function renderStatus() {
  $('estado').innerHTML = `Modelo: ${status.modelo}\nCámara: ${status.camara}\nMediaPipe: ${status.mediapipe}\nCaras: ${status.cara}` +
    (status.detecta ? `\n${status.detecta}` : '') + (status.gesto ? `\n${status.gesto}` : '');
}
function flash(msg) {
  const el = $('aviso');
  el.textContent = msg; el.style.display = 'block';
  clearTimeout(flash.t); flash.t = setTimeout(() => (el.style.display = 'none'), 1800);
}

// ---------- Escena ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('vista'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x20232a);
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x9098a8, 2.4));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
keyLight.position.set(0.6, 1, 1.4);
scene.add(keyLight);
// En formato tele el canvas es 9:16 centrado (en un monitor horizontal quedan bandas negras a los costados;
// en la tele girada a vertical y en pantalla completa ocupa todo).
function resize() {
  let w = innerWidth, h = innerHeight;
  if (opt.vertical) { if (w / h > 9 / 16) w = Math.round(h * 9 / 16); else h = Math.round(w * 16 / 9); }
  renderer.setSize(w, h);
  renderer.domElement.style.left = Math.round((innerWidth - w) / 2) + 'px';
  renderer.domElement.style.top = Math.round((innerHeight - h) / 2) + 'px';
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------- Modelo ----------
const texCache = {};
const faceMats = [];
let videoFaceTex = null, canvasFaceTex = null;
function getTex(file) {
  if (texCache[file]) return texCache[file];
  let t;
  if (file.endsWith('.mp4')) {
    const v = document.createElement('video');
    Object.assign(v, { src: TEX_DIR + file, loop: true, muted: true, playsInline: true, crossOrigin: 'anonymous' });
    v.play().catch(() => addEventListener('pointerdown', () => v.play(), { once: true }));
    t = new THREE.VideoTexture(v);
  } else {
    t = new THREE.TextureLoader().load(TEX_DIR + file);
  }
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (texCache[file] = t);
}
function makeMaterial(old) {
  const base = old.name.replace(/\.\d+$/, '');
  const file = MAT_TEX[old.name] ?? MAT_TEX[base];
  const m = new THREE.MeshStandardMaterial({ name: old.name, roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
  if (file) {
    m.map = getTex(file);
    if (!file.endsWith('.mp4')) m.alphaTest = 0.5; // en Blender el alpha sale de la textura
  } else if (MAT_COLOR[base]) {
    m.color.setRGB(...MAT_COLOR[base]);
  } else {
    m.color.set(0xff00ff);
    console.warn('Material sin textura asignada:', old.name);
  }
  if (base === 'tiesme_uv_face') { faceMats.push(m); videoFaceTex = m.map; }
  return m;
}
function applyFaceTex() {
  const t = opt.face && canvasFaceTex ? canvasFaceTex : videoFaceTex;
  for (const m of faceMats) if (m.map !== t) { m.map = t; m.needsUpdate = true; }
}

const bones = {};
const B = name => bones[name.toLowerCase()];
const wpos = name => B(name).getWorldPosition(new V3());
const holder = new THREE.Group();
scene.add(holder);
const view = { target: new V3(), dist: 1, h: 1 };
let model = null, modelScale = 1;

async function loadModel() {
  const manager = new THREE.LoadingManager();
  // El FBX apunta a texturas con rutas absolutas de la biblioteca: las ignoramos y asignamos las copiadas.
  const BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  manager.setURLModifier(url => /\.(png|jpe?g|tga|bmp|tiff?|psd|mp4|mov)$/i.test(url) ? BLANK : url);
  const fbx = await new FBXLoader(manager).loadAsync(MODEL_URL);
  model = fbx;
  fbx.traverse(o => {
    if (o.isMesh) {
      o.frustumCulled = false;
      o.material = Array.isArray(o.material) ? o.material.map(makeMaterial) : makeMaterial(o.material);
    }
    if (o.isBone) {
      // FBXLoader duplica los huesos compartidos por varias mallas y cuelga las copias del original:
      // nos quedamos con el primero (el de la jerarquia real), asi mueve todas las mallas.
      const key = o.name.replace(/[^a-z0-9]/gi, '').toLowerCase().replace(/^mixamorig\d*/, '');
      if (!bones[key]) bones[key] = o;
    }
  });
  holder.add(fbx);
  holder.updateMatrixWorld(true);

  // Girar el modelo para que mire a camara (+Z): su izquierda tiene que quedar en +X.
  const lr = wpos('leftarm').sub(wpos('rightarm'));
  holder.rotation.y = Math.atan2(lr.z, lr.x);
  holder.updateMatrixWorld(true);

  const hips = wpos('hips');
  const top = B('headtopend') ? wpos('headtopend') : wpos('head');
  view.h = top.y - hips.y;
  view.target.set(hips.x, hips.y + view.h * 0.55, hips.z);
  view.dist = (view.h * 1.7) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

  setupRig();
  setupAnchors();
  frameView();
  // acceso para depurar desde la consola (y para las pruebas automaticas)
  window.__tiesme = {
    fbx, bones, rig, opt, holder, wpos, demoResults, charAnc, ESCENAS, camera, view,
    ellDist: (p, which, margin = 0) => ellDist(p, which === 'head' ? charAnc.headEll : charAnc.torsoEll, margin),
    cara: () => cara,
    // para las pruebas con capturas: render manual y vista girada (grados alrededor del personaje)
    render: (yawDeg = 0, zoom = 1) => {
      const v = opt.vertical && view.tv ? view.tv : view;
      const t = v.target.clone().add(holder.position), r = v.dist / zoom, a = yawDeg * DEG;
      camera.position.set(t.x + Math.sin(a) * r, t.y, t.z + Math.cos(a) * r);
      camera.lookAt(t); renderer.render(scene, camera);
    },
    pause: v => (paused = v),
    step: (raw, dt) => { mpFrame = buildFrame(raw, dt); updateRoot(mpFrame, dt); updateRig(mpFrame, dt); frameGuard(dt); },
    leanQ: () => leanQ,
    frame: () => mpFrame, ikAng, calibrate,
  };
}

function frameView() {
  const v = opt.vertical && view.tv ? view.tv : view;
  camera.position.set(v.target.x, v.target.y, v.target.z + v.dist);
  camera.lookAt(v.target);
  camera.near = view.h / 200; camera.far = view.h * 200;
  camera.updateProjectionMatrix();
  controls.target.copy(v.target);
  // en modo tele la camara es fija: el mouse (rueda, arrastre) no puede acercarla ni girarla
  controls.enabled = !opt.vertical;
  controls.update();
}

// ---------- Rig ----------
const rig = {};
const FINGERS = { thumb: [1, 2, 3, 4], index: [5, 6, 7, 8], middle: [9, 10, 11, 12], ring: [13, 14, 15, 16], pinky: [17, 18, 19, 20] };

function rec(name, childName) {
  const bone = B(name);
  if (!bone) { console.warn('Falta el hueso', name); return null; }
  const r = {
    bone,
    L0: bone.quaternion.clone(),
    W0: bone.getWorldQuaternion(new Q()),
    P0inv: bone.parent.getWorldQuaternion(new Q()).invert(),
    f: new QuatFilter(),
    S0: bone.scale.clone(),
  };
  if (childName && B(childName)) r.dir0 = wpos(childName).sub(wpos(name)).normalize();
  return (rig[name] = r);
}

function setupRig() {
  ['spine', 'spine1', 'spine2', 'neck', 'head'].forEach(n => rec(n));
  for (const S of ['left', 'right']) {
    rec(S + 'arm', S + 'forearm');
    rec(S + 'forearm', S + 'hand');
    const h = rec(S + 'hand');
    for (const f of Object.keys(FINGERS)) for (let i = 1; i <= 3; i++) rec(`${S}hand${f}${i}`, `${S}hand${f}${i + 1}`);
    if (!h || !B(S + 'handmiddle1') || !B(S + 'handindex1') || !B(S + 'handpinky1')) continue;
    const fwd = wpos(S + 'handmiddle1').sub(wpos(S + 'hand'));
    const side = wpos(S + 'handindex1').sub(wpos(S + 'handpinky1'));
    h.F0inv = frameQuat(fwd, side).invert();
    // Dedos: sin giro sobre su eje; falanges 2 y 3 solo doblan como bisagra (menos ruido, sin dedos "rotos").
    const palmN = new V3().crossVectors(fwd, side).normalize();
    for (const f of Object.keys(FINGERS)) for (let i = 1; i <= 3; i++) {
      const r = rig[`${S}hand${f}${i}`];
      if (!r?.dir0) continue;
      const W0inv = r.W0.clone().invert();
      r.axisL = r.dir0.clone().applyQuaternion(W0inv).normalize();
      if (f !== 'thumb' && i > 1) r.hingeL = new V3().crossVectors(r.dir0, palmN).normalize().applyQuaternion(W0inv);
    }
  }
}

function constrain(r, local) {
  if (!r.axisL) return local;
  const rel = r.L0.clone().invert().multiply(local);
  const c = r.hingeL ? twistAbout(rel, r.hingeL) : rel.clone().multiply(twistAbout(rel, r.axisL).invert());
  return r.L0.clone().multiply(c);
}

const parentW = r => r.bone.parent.getWorldQuaternion(new Q());
// Orientacion de mundo que apunta el hueso hacia d con el minimo giro respecto de su padre.
function aimTarget(r, d) {
  const dp = parentW(r).multiply(r.P0inv);
  const inherited = r.dir0.clone().applyQuaternion(dp);
  return new Q().setFromUnitVectors(inherited, d).multiply(dp).multiply(r.W0);
}

// ---------- Anclas del personaje: proporciones reales medidas en la malla ----------
const charAnc = {};
function meshBox(matNames, filter) {
  const min = new V3(Infinity, Infinity, Infinity), max = new V3(-Infinity, -Infinity, -Infinity), v = new V3();
  let n = 0;
  model.traverse(o => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const pos = o.geometry.attributes.position, idx = o.geometry.index;
    const groups = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: idx ? idx.count : pos.count, materialIndex: 0 }];
    for (const g of groups) {
      if (!matNames.includes(mats[g.materialIndex].name.replace(/\.\d+$/, ''))) continue;
      for (let i = g.start; i < g.start + g.count; i++) {
        v.fromBufferAttribute(pos, idx ? idx.getX(i) : i);
        o.localToWorld(v);
        if (filter && !filter(v)) continue;
        min.min(v); max.max(v); n++;
      }
    }
  });
  return n ? { center: min.clone().add(max).multiplyScalar(0.5), half: max.clone().sub(min).multiplyScalar(0.5) } : null;
}

function setupAnchors() {
  const sL = wpos('leftarm'), sR = wpos('rightarm'), m = mid(sL, sR);
  charAnc.hc = sL.distanceTo(sR) / 2;
  modelScale = (charAnc.hc * 2) / 0.36;
  charAnc.L = {};
  for (const S of ['left', 'right']) charAnc.L[S] = [wpos(S + 'arm').distanceTo(wpos(S + 'forearm')), wpos(S + 'forearm').distanceTo(wpos(S + 'hand'))];
  charAnc.handLen = B('lefthandmiddle4') ? wpos('lefthand').distanceTo(wpos('lefthandmiddle4')) : charAnc.hc * 0.5;
  // centro de la palma: promedio de muñeca y nudillos (igual que en la mano detectada)
  const knuckles = ['lefthand', 'lefthandindex1', 'lefthandmiddle1', 'lefthandring1', 'lefthandpinky1'].filter(B);
  charAnc.palmOff = knuckles.reduce((s, n) => s.add(wpos(n)), new V3()).divideScalar(knuckles.length).distanceTo(wpos('lefthand'));

  // Cabeza: caja de la piel de la cara/cabeza, pegada al hueso Head.
  const face = meshBox(['tiesme_uv_face']) || { center: wpos('head').add(new V3(0, charAnc.hc * 0.6, 0)), half: new V3(1, 1.1, 1.2).multiplyScalar(charAnc.hc) };
  const hb = B('head');
  hb.updateWorldMatrix(true, false);
  charAnc.headEll = { bone: hb, centerLocal: hb.worldToLocal(face.center.clone()), R: face.half.clone(), W0inv: rig.head.W0.clone().invert() };
  charAnc.headUp = face.center.y - m.y;
  charAnc.headRestX = face.center.x;

  // Torso: buzo + abdomen sin las mangas, pegado a Spine2.
  const torso = meshBox(['tiesme_uv_torso_01', 'tiesme_torso_abdomen'], v => Math.abs(v.x - m.x) < charAnc.hc * 0.8);
  const sb = B('spine2');
  sb.updateWorldMatrix(true, false);
  const tc = torso ? torso.center : wpos('spine2');
  const th = torso ? torso.half : new V3(charAnc.hc, charAnc.hc * 1.6, charAnc.hc);
  charAnc.torsoEll = { bone: sb, centerLocal: sb.worldToLocal(tc.clone()), R: new V3(charAnc.hc * 1.05, th.y, th.z), W0inv: rig.spine2.W0.clone().invert() };

  // Encuadre de la tele vertical: de la gorra al ruedo del buzo, con los margenes de la referencia.
  const cap = meshBox(['richiev1_uvtext_test02']), buzo = meshBox(['tiesme_uv_torso_01']);
  if (cap && buzo) {
    const top = cap.center.y + cap.half.y, hem = buzo.center.y - buzo.half.y;
    const H = (top - hem) / (TV_FRAME.hem - TV_FRAME.capTop);
    const cy = top + TV_FRAME.capTop * H - H / 2;
    view.tv = {
      target: new V3(m.x, cy, face.center.z), // plano de encuadre: el centro de la cabeza
      dist: (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)),
    };
  }
}

function ellFrame(ell) {
  ell.bone.updateWorldMatrix(true, false);
  const c = ell.bone.localToWorld(ell.centerLocal.clone());
  const q = ell.bone.getWorldQuaternion(new Q()).multiply(ell.W0inv);
  return { c, q, qi: q.clone().invert() };
}
function ellLocal(p, ell, fr, margin = 0) {
  const l = p.clone().sub(fr.c).applyQuaternion(fr.qi);
  return new V3(l.x / (ell.R.x + margin), l.y / (ell.R.y + margin), l.z / (ell.R.z + margin));
}
const ellDist = (p, ell, margin = 0) => ellLocal(p, ell, ellFrame(ell), margin).length();
// Si el punto cae adentro del elipsoide (inflado por margin), lo saca hasta la superficie.
function pushOut(p, ell, margin) {
  const fr = ellFrame(ell);
  const n = ellLocal(p, ell, fr, margin);
  const len = n.length();
  if (len >= 1) return p;
  if (len < 1e-6) n.set(0, 0, 1); else n.divideScalar(len);
  return new V3(n.x * (ell.R.x + margin), n.y * (ell.R.y + margin), n.z * (ell.R.z + margin)).applyQuaternion(fr.q).add(fr.c);
}

// Posicion de tu muñeca -> posicion de la muñeca de tiesme.
// Lejos de la cabeza: por tramos (dentro de los hombros escala por ancho de hombros, mas alla por largo de brazo,
// hacia arriba hasta la cabeza por la altura de la cabeza). Cerca de la cabeza: la PALMA va al mismo lugar
// relativo de la cabeza de tiesme (en "tamaños de cabeza") y la muñeca sale de ahi; asi tapar la cara o
// tocarse las mejillas cae en su cara y no adentro ni en el menton.
function mapToChar(p, pm, hd, A) {
  const rel = p.clone().sub(A.Mu);
  const ax = Math.abs(rel.x);
  const x = ax <= A.hu ? rel.x * (charAnc.hc / A.hu) : Math.sign(rel.x) * (charAnc.hc + (ax - A.hu) * A.sArm);
  const y = rel.y < 0 ? rel.y * A.sArm
    : rel.y <= A.upU ? rel.y * (charAnc.headUp / A.upU) : charAnc.headUp + (rel.y - A.upU) * A.sArm;
  const Tb = A.Mc.clone().add(new V3(x, y, rel.z * A.sArm));
  const toHead = v => v.clone().sub(A.Hu).applyQuaternion(A.QuInv).divide(A.Ru);
  const nP = toHead(pm);
  const w0 = clamp((2.4 - nP.length()) / 0.8, 0, 1), w = w0 * w0 * (3 - 2 * w0);
  if (w <= 0) return Tb;
  const R = charAnc.headEll.R, toChar = n => new V3(n.x * R.x, n.y * R.y, n.z * R.z).applyQuaternion(A.Qc).add(A.Hc);
  const Th = hd ? toChar(nP).addScaledVector(hd, -charAnc.palmOff) : toChar(toHead(p));
  return Tb.lerp(Th, w);
}

// Mano cerca de la camara: tu mano se ve en tu camara en cierto lugar respecto de tus hombros y cierto
// tamaño (mas cerca = mas grande). Se busca el mismo lugar respecto de los hombros de tiesme en la pantalla y
// la misma proporcion de distancia a la camara virtual. Si el brazo de tiesme no llega, la mano queda lo mas
// cerca posible sobre esa misma linea de vista (se ve en el mismo lugar) y se agranda para verse del mismo tamaño.
function nearCamTarget(Tu, fd, S, reach) {
  const proj = v => ({ x: 0.5 + v.x * fd.f / (-v.z) / fd.vw, y: 0.5 - v.y * fd.f / (-v.z) / fd.vh });
  const mx = x => (opt.mirror ? 1 - x : x);
  const a = proj(fd.anc.SL), b = proj(fd.anc.SR), w = proj(Tu);
  const swu = Math.hypot((a.x - b.x) * fd.vw, (a.y - b.y) * fd.vh);
  const Wc = renderer.domElement.width, Hc = renderer.domElement.height;
  const cl = wpos('leftarm').project(camera), cr = wpos('rightarm').project(camera);
  const swc = Math.hypot((cl.x - cr.x) * Wc / 2, (cl.y - cr.y) * Hc / 2);
  if (swu < 1 || swc < 1) return null;
  const k = swc / swu;
  const nx = ((cl.x + cr.x) / 2 * Wc / 2 + (mx(w.x) - mx((a.x + b.x) / 2)) * fd.vw * k) / (Wc / 2);
  const ny = ((cl.y + cr.y) / 2 * Hc / 2 - (w.y - (a.y + b.y) / 2) * fd.vh * k) / (Hc / 2);
  const O = camera.position.clone();
  const dir = new V3(nx, ny, 0.5).unproject(camera).sub(O).normalize();
  // referencia: la cara (se mide con precision y es lo que se mira): si tu mano se ve el doble que tu cara,
  // la de tiesme tambien
  const tStar = ((-Tu.z) / fd.dHead) * O.distanceTo(ellFrame(charAnc.headEll).c);
  const oc = O.clone().sub(wpos(S + 'arm')), bq = dir.dot(oc), R = reach * 0.97;
  const disc = bq * bq - (oc.lengthSq() - R * R);
  const t = disc >= 0 ? clamp(tStar, Math.max(0, -bq - Math.sqrt(disc)), -bq + Math.sqrt(disc)) : -bq;
  return { p: O.addScaledVector(dir, t), s: clamp(t / tStar, 1, 3.5) };
}

// IK de tiesme con sus largos. Si el antebrazo atraviesa el torso o el codo la cabeza, gira el plano del codo.
// El giro elegido prefiere el anterior y se mueve de a poco: elegir "el mejor" de golpe cada cuadro hacia
// saltar el codo entre dos soluciones cuando la deteccion tenia un poco de ruido.
const ikAng = {};
function charIK(S, T, pole, L1, L2, sideSign, key, dt) {
  const axis = T.clone().sub(S).normalize();
  const solve = ang => solveIK(S, T, S.clone().add(pole.clone().applyAxisAngle(axis, ang * sideSign)), L1, L2, sideSign);
  const tf = ellFrame(charAnc.torsoEll), hf = ellFrame(charAnc.headEll);
  // penalizacion: antebrazo, codo o brazo dentro del torso; codo o antebrazo dentro de la cabeza
  const inT = (p, k) => Math.max(0, k - ellLocal(p, charAnc.torsoEll, tf).length());
  const inH = p => Math.max(0, 1 - ellLocal(p, charAnc.headEll, hf).length());
  const pen = r => {
    const fm = r.E.clone().lerp(r.Wr, 0.5), um = S.clone().lerp(r.E, 0.5);
    return inT(fm, 0.9) + inT(r.E, 0.85) + inT(um, 0.75) + inH(r.E) + inH(fm);
  };
  const prev = ikAng[key] ?? 0;
  let bestAng = prev, bestCost = Infinity;
  for (let ang = -1.5; ang <= 1.6; ang += 0.25) {
    const cost = pen(solve(ang)) * 10 + 0.15 * Math.abs(ang) + 0.4 * Math.abs(ang - prev);
    if (cost < bestCost) { bestCost = cost; bestAng = ang; }
  }
  ikAng[key] = prev + (bestAng - prev) * lpA(dt, 3);
  return solve(ikAng[key]);
}

let chestNeutralInv = new Q(), headNeutralInv = new Q();
let lastChestRaw = null, lastHeadRaw = null;

// ---------- Profundidad y posicion ----------
const fDepthHead = new OneEuro(0.6, 0.8);
// distancia por tamaño de la mano: muy ruidosa (2 px de ruido en una mano de 16 px = ±26 cm a 2 m): filtro firme
const fDepthHand = { left: new OneEuro(0.6, 0.3), right: new OneEuro(0.6, 0.3) };
const armLen = { left: [0.29, 0.26], right: [0.29, 0.26] };   // largos usados (escala camara)
const armSeen = { left: [0, 0], right: [0, 0] };               // mayor largo proyectado visto
const fFS = {};                                                 // filtro de la distancia por escorzo
const handScale = { left: 1, right: 1 };                        // tamaño de la mano de tiesme (mano cerca de la camara)
const lastTc = {}, wristAng = {};                               // ultima muñeca objetivo y giro de muñeca por lado
let refBody = null, lostT = 0, lastDepth = 1.0;

// Punto de la imagen (normalizado) a una profundidad d -> espacio camara en metros (x der, y arriba, z hacia camara).
const camPoint = (fd, n, d) => new V3((n.x - 0.5) * fd.vw / fd.f * d, -(n.y - 0.5) * fd.vh / fd.f * d, -d);
// Igual pero usando la z relativa de la malla de la cara (misma escala que x).
const camPoint3 = (fd, n, d) => { const k = fd.vw / fd.f * d; return new V3((n.x - 0.5) * k, -(n.y - 0.5) * fd.vh / fd.f * d, -(d + n.z * k)); };

// Cuanto tapan las manos la cara (0..1): con la cara tapada la malla y los gestos no son confiables.
function faceOcclusion(fd) {
  if (!fd.face || !fd.handsN.length) return 0;
  let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
  for (const i of [10, 152, 234, 454, 33, 263, 1]) {
    const p = fd.face[i];
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  const px = (x1 - x0) * 0.1, py = (y1 - y0) * 0.1;
  let inside = 0, total = 0;
  for (const h of fd.handsN) for (const p of h) {
    total++;
    if (p.x > x0 - px && p.x < x1 + px && p.y > y0 - py && p.y < y1 + py) inside++;
  }
  return inside / Math.max(1, total);
}

function estimateDepths(fd, dt) {
  let d = null;
  if (fd.face && fd.occ < OCC_FACE) {
    // distancia por el tamaño entre los ojos (en 3D, asi no cambia al girar la cabeza)
    const P = i => new V3(fd.face[i].x * fd.vw, fd.face[i].y * fd.vh, fd.face[i].z * fd.vw);
    const wpx = P(33).distanceTo(P(263));
    if (wpx > 4) d = fd.f * EYE_W / wpx;
  } else if (!fd.face && fd.poseN && fd.poseW && vis(fd.poseN, 11) > 0.5 && vis(fd.poseN, 12) > 0.5) {
    // sin cara: por el ancho de hombros (metrico de MediaPipe vs pixeles)
    const a = fd.poseN[11], b = fd.poseN[12], wa = fd.poseW[11], wb = fd.poseW[12];
    const px = Math.hypot((a.x - b.x) * fd.vw, (a.y - b.y) * fd.vh), m = Math.hypot(wa.x - wb.x, wa.y - wb.y);
    if (px > 4) d = fd.f * m / px - HEAD_TO_SHOULDER;
  }
  // con la cara tapada se mantiene la ultima distancia buena
  if (d !== null) lastDepth = fDepthHead.filter(clamp(d, 0.25, 4), dt);
  fd.dHead = lastDepth;
  fd.dBody = lastDepth + HEAD_TO_SHOULDER;

  for (const U of ['left', 'right']) {
    const h = fd.hands[U];
    if (!h) { fDepthHand[U].reset(); continue; }
    // distancia de la mano: tamaño real (metrico) vs tamaño en pixeles, en proyeccion
    let cw = [0, 0], cn = [0, 0];
    for (let i = 0; i < 21; i++) { cw[0] += h.W[i].x; cw[1] += h.W[i].y; cn[0] += h.N[i].x; cn[1] += h.N[i].y; }
    cw = cw.map(v => v / 21); cn = cn.map(v => v / 21);
    let sw = 0, sp = 0;
    for (let i = 0; i < 21; i++) {
      sw += Math.hypot(h.W[i].x - cw[0], h.W[i].y - cw[1]);
      sp += Math.hypot((h.N[i].x - cn[0]) * fd.vw, (h.N[i].y - cn[1]) * fd.vh);
    }
    h.sizePx = sp / 21; // radio medio de la mano en pixeles: chico = lejos = distancia poco confiable
    if (sp > 4) h.depth = fDepthHand[U].filter(clamp(fd.f * sw / sp, 0.15, 4), dt);
  }
  // (el largo de tus brazos se estima en armSolve, en la escala de la camara)
}
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// Posicion del cuerpo por los HOMBROS. En modo tele el modelo NO se traslada: si te inclinas,
// tiesme se inclina desde la cintura (leanQ). La referencia se toma con el cuerpo quieto y despues
// se adapta sola en ~10 s, asi una referencia mala o una persona que cambia de lugar se corrige.
let leanQ = new Q(), stableT = 0, lastBody = null;
const rootOff = new V3();
let guardX = 0;
// Modo tele: el modelo queda ANCLADO en el centro y solo se inclina desde la cadera. La referencia lateral
// es el CENTRO de tu camara (no donde estabas al arrancar): parado en el medio = tiesme derecho; en el borde
// de la zona 9:16 = inclinacion maxima. La referencia de distancia se toma al entrar y se adapta en ~10 s.
let refZ = null;
const leanTarget = new Q();
function updateRoot(fd, dt) {
  const target = new V3();
  if (fd?.bodyCam) {
    lostT = 0;
    const speed = lastBody ? fd.bodyCam.distanceTo(lastBody) / dt : 0;
    lastBody = fd.bodyCam.clone();
    stableT = speed < 0.15 ? stableT + dt : 0;
    if (!refBody && stableT > 1) refBody = fd.bodyCam.clone();
    refZ = refZ === null ? fd.bodyCam.z : refZ + (fd.bodyCam.z - refZ) * (1 - Math.exp(-dt / 10));
    const sx = opt.mirror ? -1 : 1;
    if (opt.lean) {
      const zoneHalf = (ZONE_W * fd.vh / 2) / fd.f * (-fd.bodyCam.z); // media zona 9:16 en metros, a tu distancia
      const side = clamp(sx * fd.bodyCam.x / zoneHalf, -1, 1) * LEAN_LIM.z[1];
      const fwd = clamp((fd.bodyCam.z - refZ) / 0.25, -0.5, 1) * LEAN_LIM.x[1];
      leanTarget.setFromEuler(new THREE.Euler(fwd, 0, -side, 'YXZ'));
    } else leanTarget.identity();
    leanQ.slerp(leanTarget, lpA(dt, 1.2)); // lento y sin temblor
    if (refBody) {
      refBody.lerp(fd.bodyCam, 1 - Math.exp(-dt / 10));
      const off = fd.bodyCam.clone().sub(refBody);
      if (opt.move && !opt.vertical) {
        const k = modelScale * opt.moveGain;
        target.set(
          clamp(sx * off.x * k, -view.h * 1.5, view.h * 1.5),
          clamp(off.y * k, -view.h * 0.6, view.h * 0.6),
          clamp(off.z * k * 2, -view.h * 1.2, view.h * 1.8), // acercarse se exagera x2 para que se note
        );
      }
    }
  } else {
    lostT += dt; lastBody = null; stableT = 0;
    if (lostT > HOLD_T) leanQ.slerp(new Q(), lpA(dt, 0.8)); // la columna vuelve derecha despacio
    if (lostT > 3) { refBody = null; refZ = null; }          // se fue la persona: el proximo se calibra solo
  }
  rootOff.lerp(target, lpA(dt, 3));
  holder.position.set(rootOff.x + guardX, rootOff.y, rootOff.z);
}

// (16/10 noche) El modelo queda anclado: ya no se compensa corriendo la cadera. Se deja la funcion para que
// vuelva suave a 0 si venia corrido.
function frameGuard(dt) {
  guardX += (0 - guardX) * lpA(dt, 4);
  holder.position.x = rootOff.x + guardX;
}

// ---------- Brazos (IK en perspectiva, espacio del usuario) ----------
const ARM = { left: [11, 13, 15], right: [12, 14, 16] };

// Codo a partir de hombro, muñeca, largos y un "polo" (hacia donde apunta el codo).
function solveIK(S, T, pole, L1, L2, sideSign) {
  const D = T.clone().sub(S);
  const len = D.length();
  const n = len > 1e-6 ? D.divideScalar(len) : new V3(0, -1, 0);
  const dd = clamp(len, Math.abs(L1 - L2) + 1e-3, (L1 + L2) * 0.999);
  const a = (L1 * L1 - L2 * L2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  let p = pole.clone().sub(S);
  p.addScaledVector(n, -p.dot(n));
  if (p.lengthSq() < 1e-8) { p.set(sideSign * 0.3, -1, -0.2); p.addScaledVector(n, -p.dot(n)); }
  p.normalize();
  const E = S.clone().addScaledVector(n, a).addScaledVector(p, h);
  const Wr = S.clone().addScaledVector(n, dd);
  return { E, Wr };
}

// Puntos del brazo del lado U del usuario (espacio camara, filtrados) y su confianza.
function armSolve(fd, U, S, dS, dt, P) {
  const pn = fd.poseN, pw = fd.poseW, [si, ei, wi] = ARM[U];
  const cS = soft(vis(pn, si)), cE = soft(vis(pn, ei)), cW = soft(vis(pn, wi));
  const hand = fd.hands[U];
  const side = U === 'left' ? 1 : -1;
  const E0 = F3('E' + U, camPoint(fd, pn[ei], dS + (pw[ei].z - pw[si].z)), dt, P.mc, P.bPos, 8);
  const wrist2D = hand ? hand.N[0] : pn[wi];
  const dWrist = dS + (pw[wi].z - pw[si].z); // distancia de la muñeca segun el cuerpo (MediaPipe la aplasta)

  // Largo de tus brazos en la escala de la camara: el mayor largo proyectado visto (cuando el brazo queda de
  // costado se ve entero), con un minimo por proporcion del ancho de hombros. Se olvida muy lento.
  const Wsh = fd.anc.hu * 2, seen = armSeen[U];
  const flat = n => camPoint(fd, n, dS);
  const p1f = Math.hypot(flat(pn[ei]).x - S.x, flat(pn[ei]).y - S.y);
  const p2f = Math.hypot(flat(wrist2D).x - flat(pn[ei]).x, flat(wrist2D).y - flat(pn[ei]).y);
  // sube despacio (un pico de ruido no infla el largo) y se olvida muy lento
  const decay = Math.exp(-dt / 60), grow = (s, p) => (p > s ? s + (p - s) * 0.05 : s * decay);
  if (cE > 0.8) seen[0] = grow(seen[0], p1f);
  if (cE > 0.8 && (hand || cW > 0.8)) seen[1] = grow(seen[1], p2f);
  const L1 = Math.max(0.8 * Wsh, Math.min(seen[0], 1.1 * Wsh)), L2 = Math.max(0.68 * Wsh, Math.min(seen[1], 0.95 * Wsh));
  armLen[U][0] = L1; armLen[U][1] = L2;

  // Distancia de la muñeca por ESCORZO: un brazo que apunta a la camara se ve mas corto. Funciona aunque
  // estes lejos (donde el tamaño de la mano no sirve). MediaPipe sabe bien si va hacia adelante o hacia atras.
  // Con el brazo casi de costado a la camara (p cerca de L) la raiz de L²-p² es casi vertical: un pixel de
  // ruido cambia varios cm. Ahi el escorzo se lleva suave a 0 (el brazo de costado no va hacia adelante).
  const dz = (p, L) => { const r = p / L; return L * Math.sqrt(Math.max(0, 1 - r * r)) * clamp((0.97 - r) / 0.12, 0, 1); };
  const dE = dS - (pw[ei].z - pw[si].z < 0.02 ? 1 : -1) * dz(p1f, L1);
  const E3 = camPoint(fd, pn[ei], dE), W3 = camPoint(fd, wrist2D, dE);
  const dFSraw = dE - (pw[wi].z - pw[ei].z < 0.02 ? 1 : -1) * dz(Math.hypot(W3.x - E3.x, W3.y - E3.y), L2);
  const dFS = (fFS[U] ??= new OneEuro(0.6, 0.3)).filter(dFSraw, dt);
  // pesa todo cuando el brazo apunta a la camara (lo que importa) y poco cuando esta de costado
  const fwdAmt = Math.abs(dS - dFS) / (L1 + L2);
  const wFS = cE * (hand ? 1 : cW) * clamp((fwdAmt - 0.1) / 0.35, 0.05, 1) * (opt.fsWeight ?? 1);

  // Fusion: escorzo + tamaño de la mano (solo cuando la mano se ve grande: cerca) + la z de MediaPipe (poco).
  let num = 0.12 * dWrist, den = 0.12;
  num += wFS * dFS; den += wFS;
  if (hand && hand.depth) { const wd = clamp((hand.sizePx - 20) / 30, 0, 1) ** 2 * 1.5; num += wd * hand.depth; den += wd; }
  const d = clamp(num / den, dS - (L1 + L2) * 1.05, dS + 0.08); // nunca detras del cuerpo
  let T, Pm = null, cT;
  if (hand && hand.depth) {
    T = camPoint(fd, hand.N[0], d);
    const pc = [0, 5, 9, 13, 17].reduce((a, i) => ({ x: a.x + hand.N[i].x / 5, y: a.y + hand.N[i].y / 5 }), { x: 0, y: 0 });
    Pm = F3('P' + U, camPoint(fd, pc, d), dt, P.mc, P.bPos, 6);
    cT = 1;
  } else {
    T = camPoint(fd, pn[wi], d);
    dropF3('P' + U);
    cT = cW;
  }
  T = F3('T' + U, T, dt, P.mc, P.bPos, 6);
  // Polo del codo: el codo detectado mezclado con uno natural (afuera, abajo, atras) segun su confianza.
  // Fuera de cuadro MediaPipe inventa el codo; un codo hacia adentro casi nunca es real.
  const pm = E0.clone().sub(S), pl = pm.length();
  // con el antebrazo largo de tiesme unos grados de polo mueven mucho el codo: solo cuenta un codo bien visible
  let wm = pl > 1e-4 ? clamp((vis(pn, ei) - 0.5) / 0.35, 0, 1) * 0.55 : 0;
  if (pl > 1e-4 && pm.x * side < -0.25 * pl) wm *= 0.3;
  // codo hacia arriba con la mano abajo del hombro: pose rara, casi siempre error de deteccion
  if (pl > 1e-4 && pm.y > 0.3 * pl && T.y < S.y) wm *= 0.3;
  const nat = new V3(side * 0.8, -1, -0.35).normalize();
  // el polo no necesita reaccionar rapido: filtro lento, asi el codo cambia de lado suave
  const pole = F3('pole' + U, nat.lerp(pm.divideScalar(Math.max(pl, 1e-4)), wm).normalize(), dt, P.mc * 0.5, P.bDir * 0.4).normalize();
  const w = cS * Math.max(cT, cE * 0.7);
  if (w < 0.01) return null;
  return { S, E0, T, Pm: Pm || T, pole, w, elbowOnly: cT < 0.3 };
}

// ---------- Señales filtradas (a la velocidad de la deteccion, en espacio camara sin espejo) ----------
const held = { headV: null, Hu: null, Ru: null, matFlip: false, votes: 0, disagree: 0 };

function headFromLandmarks(f, fd) {
  const F = i => new V3((f[i].x - 0.5) * fd.vw, -(f[i].y - 0.5) * fd.vh, -f[i].z * fd.vw);
  return { left: F(454).sub(F(234)).normalize(), up: F(10).sub(F(152)).normalize() };
}
// Rotacion de la cabeza con la matriz que calcula MediaPipe sobre toda la malla (mucho mas estable que 4 puntos).
function headFromMatrix(fd, lm) {
  const m = fd.faceRes?.facialTransformationMatrixes?.[0]?.data;
  if (!m) return null;
  let q = new Q().setFromRotationMatrix(new THREE.Matrix4().extractRotation(new THREE.Matrix4().fromArray(m)));
  // control de convencion: el giro tiene que coincidir en signo con el de los puntos
  if (Math.abs(lm.left.z) > 0.25) {
    const mz = new V3(1, 0, 0).applyQuaternion(q).z;
    held.votes++;
    if (Math.sign(mz) !== Math.sign(lm.left.z) && !held.matFlip) held.disagree++;
    if (held.votes >= 20) {
      if (held.disagree / held.votes > 0.7) { held.matFlip = true; console.info('Matriz de cara: convencion espejada, corrigiendo'); }
      held.votes = held.disagree = 0;
    }
  }
  if (held.matFlip) q = mirrorQ(q);
  return { left: new V3(1, 0, 0).applyQuaternion(q), up: new V3(0, 1, 0).applyQuaternion(q) };
}

function computeSignals(fd, dt) {
  const P = filtParams();
  const pw = fd.poseW, pn = fd.poseN;
  const C = lm => new V3(lm.x, -lm.y, -lm.z); // mundo MediaPipe -> espacio camara

  // Pecho: eje hombro-hombro + vertical (la cadera suma solo si se ve bien).
  fd.chest = null;
  const wSh = pw ? soft(Math.min(vis(pn, 11), vis(pn, 12))) : 0;
  if (wSh > 0) {
    const left = C(pw[11]).sub(C(pw[12])).normalize();
    const up = new V3(0, 1, 0);
    const wHip = soft(Math.min(vis(pn, 23), vis(pn, 24)));
    if (wHip > 0) {
      const midS = C(pw[11]).add(C(pw[12])).multiplyScalar(0.5);
      const midH = C(pw[23]).add(C(pw[24])).multiplyScalar(0.5);
      up.lerp(midS.sub(midH).normalize(), 0.5 * wHip).normalize();
    }
    fd.chest = { left: F3('chL', left, dt, P.mc, P.bDir, 10), up: F3('chU', up, dt, P.mc, P.bDir, 10), w: wSh };
  }

  // Cabeza. Con la cara tapada por las manos se congela (rotacion, posicion y tamaño).
  if (fd.face && fd.occ < OCC_FACE) {
    const lm = headFromLandmarks(fd.face, fd);
    const hv = headFromMatrix(fd, lm) || lm;
    held.headV = { left: F3('hdL', hv.left, dt, P.mc, P.bDir, 15), up: F3('hdU', hv.up, dt, P.mc, P.bDir, 15) };
    const P3 = i => camPoint3(fd, fd.face[i], fd.dHead);
    const a = P3(454), b = P3(234);
    held.Hu = F3('Hu', mid(a, b), dt, P.mc, P.bPos, 3);
    const rx = a.distanceTo(b) / 2;
    // profundidad: el frente de la cara queda ~1.4 radios delante de las mejillas (234/454)
    held.Ru = F3('Ru', new V3(rx, P3(10).distanceTo(P3(152)) / 2, rx * 1.4), dt, 0.3, 0);
  } else if (!fd.face) {
    held.headV = null; // sin cara la cabeza sigue al pecho
  }
  fd.headV = held.headV;

  // Hombros, posicion del cuerpo y brazos.
  fd.arm = {}; fd.handP = {}; fd.anc = null; fd.bodyCam = null;
  if (pw && pn) {
    const zMid = (pw[11].z + pw[12].z) / 2, S = {}, dS = {};
    for (const U of ['left', 'right']) {
      const si = ARM[U][0];
      dS[U] = fd.dBody + (pw[si].z - zMid);
      S[U] = F3('S' + U, camPoint(fd, pn[si], dS[U]), dt, P.mc, P.bPos, 3);
    }
    const Mu = mid(S.left, S.right);
    fd.bodyCam = F3('body', Mu, dt, 0.4, 1.5, 3);
    fd.anc = {
      Mu, SL: S.left, SR: S.right, hu: Math.max(0.1, S.left.distanceTo(S.right) / 2),
      Hu: held.Hu || Mu.clone().add(new V3(0, 0.23, 0.02)),
      Ru: held.Ru || new V3(0.075, 0.1, 0.105),
    };
    for (const U of ['left', 'right']) fd.arm[U] = armSolve(fd, U, S[U], dS[U], dt, P);
  }
  for (const U of ['left', 'right']) {
    const h = fd.hands[U];
    if (h) fd.handP[U] = h.W.map((p, i) => F3(`m${U}${i}`, C(p), dt, P.mc * 1.5, P.bHand, 3));
    else { dropF3('m' + U); fd.handP[U] = null; }
  }
}

// ---------- Actualizacion del rig ----------
// Si una parte deja de detectarse se mantiene su ultima pose buena HOLD_T s y despues vuelve a reposo
// despacio; al reaparecer entra suave. Asi una falla de deteccion no se ve como un tiron.
const groups = {};
function groupState(name, ok, dt) {
  const g = groups[name] ??= { lost: 99, since: 0 };
  if (ok) { g.since = g.lost > 0 ? 0 : g.since + dt; g.lost = 0; } else g.lost += dt;
  const hold = !ok && g.lost < HOLD_T, fade = !ok && !hold;
  return { ok, hold, fade, rate: fade ? FADE_RATE : (ok && g.since < 0.5) ? REENTRY_RATE : undefined };
}
const heldPose = {};
const minRate = (a, b) => (a === undefined ? b : b === undefined ? a : Math.min(a, b));

function updateRig(fd, dt) {
  const { mc, bDir } = filtParams();
  const sx = opt.mirror ? -1 : 1;
  const M = v => new V3(sx * v.x, v.y, v.z); // espacio camara -> personaje (espejo)
  // segunda etapa, mas liviana: las señales ya vienen filtradas. Devuelve el objetivo local (para poder mantenerlo).
  const set = (r, local, fm = 1, maxRate) => {
    if (!r) return null;
    const t = constrain(r, local);
    r.bone.quaternion.copy(r.f.filter(t, dt, mc * 2 * fm, bDir, maxRate));
    return t;
  };
  const drive = (r, Wt, fm, maxRate) => (r ? set(r, parentW(r).invert().multiply(Wt), fm, maxRate) : null);

  // Pecho: el giro sale de la linea de hombros; con "inclinarse" la inclinacion la da la cintura (leanQ).
  const gC = groupState('chest', !!(opt.chest && fd?.chest), dt);
  let Dc = new Q();
  lastChestRaw = null;
  if (gC.ok) {
    const left = M(fd.chest.left);
    if (left.x < 0) left.negate();
    lastChestRaw = frameQuat(left, M(fd.chest.up));
    Dc = clampRot(new Q().slerp(lastChestRaw.clone().multiply(chestNeutralInv), fd.chest.w), CHEST_LIM);
    if (opt.lean) {
      const e = new THREE.Euler().setFromQuaternion(Dc, 'YXZ');
      e.x *= 0.3; e.z *= 0.35;
      Dc = new Q().setFromEuler(e);
    }
    heldPose.Dc = Dc.clone();
  } else if (gC.hold && heldPose.Dc) Dc = heldPose.Dc.clone();
  // la inclinacion se concentra abajo (cintura) y el giro se reparte en las tres vertebras
  const wl = [0.5, 0.8, 1], wt = [1 / 3, 2 / 3, 1];
  ['spine', 'spine1', 'spine2'].forEach((n, i) => {
    const r = rig[n];
    if (r) drive(r, new Q().slerp(leanQ, wl[i]).multiply(new Q().slerp(Dc, wt[i])).multiply(r.W0), 1, gC.rate);
  });
  const Db = leanQ.clone().multiply(Dc); // orientacion final del pecho

  // Cabeza, con limites anatomicos respecto del pecho.
  const gHd = groupState('head', !!(opt.head && fd?.headV), dt);
  let Dh = Db.clone();
  lastHeadRaw = null;
  if (gHd.ok) {
    const left = M(fd.headV.left);
    if (left.x < 0) left.negate();
    lastHeadRaw = frameQuat(left, M(fd.headV.up));
    const rel = clampRot(Db.clone().invert().multiply(lastHeadRaw.clone().multiply(headNeutralInv)), HEAD_LIM);
    heldPose.headRel = rel.clone();
    Dh = Db.clone().multiply(rel);
  } else if (gHd.hold && heldPose.headRel) Dh = Db.clone().multiply(heldPose.headRel);
  if (rig.neck) drive(rig.neck, Db.clone().slerp(Dh, 0.5).multiply(rig.neck.W0), 1, minRate(6, gHd.rate));
  if (rig.head) drive(rig.head, Dh.clone().multiply(rig.head.W0), 1, minRate(8, gHd.rate));

  // Anclas de este frame (despues de mover pecho y cabeza).
  let A = null;
  if (opt.mapPos && fd?.anc && charAnc.headEll) {
    const hf = ellFrame(charAnc.headEll);
    const Mu = M(fd.anc.Mu), Hu = M(fd.anc.Hu);
    A = {
      Mu, hu: fd.anc.hu, upU: Math.max(0.08, Hu.y - Mu.y),
      Mc: mid(wpos('leftarm'), wpos('rightarm')),
      Hu, Ru: fd.anc.Ru, QuInv: (lastHeadRaw ? lastHeadRaw.clone() : new Q()).invert(),
      Hc: hf.c, Qc: hf.q,
    };
  }

  // Brazos, manos y dedos. En espejo, el brazo izquierdo del personaje sigue tu brazo derecho.
  for (const S of ['left', 'right']) {
    const U = opt.mirror ? other(S) : S;
    const up = rig[S + 'arm'], fo = rig[S + 'forearm'], ha = rig[S + 'hand'];
    if (!up || !fo) continue;
    const sign = S === 'left' ? 1 : -1;
    const rest1 = new V3(sign * 0.22, -1, 0.05).normalize(), rest2 = new V3(sign * 0.08, -1, 0.3).normalize();
    const a = opt.arms ? fd?.arm?.[U] : null;
    const gA = groupState('arm' + S, !!(a && a.w > 0.3), dt);
    const hAll = fd?.handP?.[U];
    const hd = hAll ? M(hAll[9]).sub(M(hAll[0])).normalize() : null; // direccion muñeca -> nudillos
    let d1 = rest1, d2 = rest2;
    let sTarget = gA.hold ? handScale[S] : 1;
    if (gA.ok) {
      let t1, t2;
      if (a.elbowOnly) {
        t1 = M(a.E0.clone().sub(a.S)).normalize(); t2 = t1.clone();
      } else if (A) {
        // muñeca a la posicion equivalente en tiesme, e IK con sus largos
        const [L1, L2] = charAnc.L[S];
        A.sArm = (L1 + L2) / (armLen[U][0] + armLen[U][1]);
        let T = mapToChar(M(a.T), M(a.Pm), hd, A);
        // que la palma no entre en la cabeza ni en el torso (se mueve la mano entera)
        const thick = charAnc.handLen * 0.12;
        for (const ell of [charAnc.headEll, charAnc.torsoEll]) {
          if (hd) { const pc = T.clone().addScaledVector(hd, charAnc.palmOff); T.add(pushOut(pc, ell, thick).sub(pc)); }
          T = pushOut(T, ell, thick);
        }
        // mano cerca de la camara (mas cerca que ~80% de tu distancia): mismo lugar y tamaño que en tu camara
        const kN = (-a.T.z) / fd.dHead;
        const wN0 = opt.nearCam ? clamp((0.8 - kN) / 0.35, 0, 1) : 0, wN = wN0 * wN0 * (3 - 2 * wN0);
        if (wN > 0) {
          const nc = nearCamTarget(a.T, fd, S, L1 + L2);
          if (nc) { T.lerp(nc.p, wN); sTarget = 1 + (nc.s - 1) * wN; }
        }
        // velocidad maxima de la mano (~2,5 largos de brazo por segundo): nunca un tiron violento
        const prevT = lastTc[S], maxStep = (L1 + L2) * 2.5 * dt;
        if (prevT && T.distanceTo(prevT) > maxStep) T = prevT.clone().addScaledVector(T.clone().sub(prevT).normalize(), maxStep);
        lastTc[S] = T.clone();
        const Sc = wpos(S + 'arm');
        const r = charIK(Sc, T, M(a.pole), L1, L2, sign, S, dt);
        t1 = r.E.clone().sub(Sc).normalize(); t2 = r.Wr.clone().sub(r.E).normalize();
      } else {
        const r = solveIK(a.S, a.T, a.S.clone().add(a.pole), armLen[U][0], armLen[U][1], U === 'left' ? 1 : -1);
        t1 = M(r.E.clone().sub(a.S)).normalize(); t2 = M(r.Wr.clone().sub(r.E)).normalize();
      }
      d1 = slerpDir(rest1, t1, a.w); d2 = slerpDir(rest2, t2, a.w);
      heldPose['arm' + S] = { d1, d2 };
    } else if (gA.hold && heldPose['arm' + S]) ({ d1, d2 } = heldPose['arm' + S]);
    drive(up, aimTarget(up, d1), 1, minRate(7, gA.rate)); // brazo: giro maximo 7 rad/s
    handScale[S] += (sTarget - handScale[S]) * lpA(dt, 3);
    if (ha) ha.bone.scale.copy(ha.S0).multiplyScalar(handScale[S]);

    const hp = opt.fingers ? fd?.handP?.[U] : null;
    const P = hp ? hp.map(M) : null;
    const gHn = groupState('hand' + S, !!P, dt);
    let Wf = aimTarget(fo, d2), Wh = null;
    if (P && ha?.F0inv) {
      const Ft = frameQuat(P[9].clone().sub(P[0]), P[5].clone().sub(P[17]));
      Wh = Ft.multiply(ha.F0inv).multiply(ha.W0);
      // Giro de muñeca: se separa del resto, se sigue en forma continua (sin saltar al pasar 180°) y se
      // limita a lo anatomico (±100°); se reparte mitad en el antebrazo para que la malla no se retuerza.
      const inh = Wf.clone().multiply(ha.L0);
      const corr = Wh.clone().multiply(inh.clone().invert());
      const tw = twistAbout(corr, d2);
      let ang = 2 * Math.atan2(tw.x * d2.x + tw.y * d2.y + tw.z * d2.z, tw.w);
      const prevA = wristAng[S] ?? 0;
      ang = prevA + Math.atan2(Math.sin(ang - prevA), Math.cos(ang - prevA));
      ang = clamp(ang, -100 * DEG, 100 * DEG);
      wristAng[S] = ang;
      const twC = new Q().setFromAxisAngle(d2, ang);
      Wh = corr.multiply(tw.invert()).multiply(twC).multiply(inh);
      Wf = new Q().setFromAxisAngle(d2, ang * 0.5).multiply(Wf);
    }
    drive(fo, Wf, 1, minRate(8, gA.rate));
    // mano y dedos: si se pierde la mano se mantiene su ultima forma y despues se relaja despacio
    if (Wh) ha.last = drive(ha, Wh, 1, gHn.rate);
    else if (gHn.hold && ha?.last) set(ha, ha.last);
    else set(ha, ha ? ha.L0 : null, 0.5, FADE_RATE);

    for (const [fname, idx] of Object.entries(FINGERS)) {
      for (let i = 0; i < 3; i++) {
        const r = rig[`${S}hand${fname}${i + 1}`];
        if (!r || !r.dir0) continue;
        if (P) r.last = drive(r, aimTarget(r, P[idx[i + 1]].clone().sub(P[idx[i]]).normalize()), 1.5, gHn.rate);
        else if (gHn.hold && r.last) set(r, r.last, 1.5);
        else set(r, r.L0, 0.5, FADE_RATE);
      }
    }
  }
}

function calibrate() {
  chestNeutralInv = lastChestRaw ? lastChestRaw.clone().invert() : new Q();
  headNeutralInv = lastHeadRaw ? lastHeadRaw.clone().invert() : new Q();
  refBody = mpFrame?.bodyCam ? mpFrame.bodyCam.clone() : null;
  flash(lastChestRaw || lastHeadRaw ? 'Postura y posición calibradas' : 'Calibración reseteada (no se detecta cuerpo/cara)');
}

// ---------- MediaPipe ----------
let poseLm = null, handLm = null, faceLm = null, mpFrame = null, lastVideoTime = -1, lastDetT = 0;
let detCount = 0, detFps = 0, detN = 0, lastFace = null;

async function initVision() {
  const { FilesetResolver, PoseLandmarker, HandLandmarker, FaceLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(MP_WASM);
  let used = 'GPU';
  const make = async (Cls, url, extra) => {
    for (const delegate of ['GPU', 'CPU']) {
      try {
        return await Cls.createFromOptions(fileset, { baseOptions: { modelAssetPath: url, delegate }, runningMode: 'VIDEO', ...extra });
      } catch (err) { console.warn('MediaPipe', delegate, err); used = 'CPU'; }
    }
    throw new Error('no se pudo iniciar un detector');
  };
  setStatus('mediapipe', 'cargando detectores…');
  [poseLm, handLm, faceLm] = await Promise.all([
    make(PoseLandmarker, MP_MODELS.pose, { numPoses: 1 }),
    make(HandLandmarker, MP_MODELS.hand, { numHands: 2 }),
    make(FaceLandmarker, MP_MODELS.face, { numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true }),
  ]);
  setStatus('mediapipe', ok('listo (' + used + ')'));
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: false,
  });
  video.srcObject = stream;
  await video.play();
  setStatus('camara', ok(`${video.videoWidth}×${video.videoHeight}`));
}

// Asigna cada mano detectada a tu brazo izquierdo o derecho: cercania a la muñeca del cuerpo,
// continuidad con el frame anterior y la etiqueta de MediaPipe, probando las dos combinaciones.
const prevWrist = { left: null, right: null };
const dist2 = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
function assignHands(res, poseN) {
  const out = { left: null, right: null };
  const hands = (res?.worldLandmarks || []).map((W, i) => ({
    N: res.landmarks[i], W,
    label: res.handedness?.[i]?.[0]?.categoryName === 'Left' ? 'right' : 'left', // MediaPipe asume imagen espejada
  }));
  const cost = (h, side) => {
    let c = 0;
    if (poseN) c += dist2(h.N[0], poseN[ARM[side][2]]);
    if (prevWrist[side]) c += dist2(h.N[0], prevWrist[side]);
    // la etiqueta pesa poco: con las manos juntas MediaPipe la invierte seguido
    if (h.label !== side) c += 0.003;
    return c;
  };
  if (hands.length === 1) {
    const h = hands[0];
    out[cost(h, 'left') <= cost(h, 'right') ? 'left' : 'right'] = h;
  } else if (hands.length >= 2) {
    const [h0, h1] = hands;
    if (cost(h0, 'left') + cost(h1, 'right') <= cost(h0, 'right') + cost(h1, 'left')) { out.left = h0; out.right = h1; }
    else { out.left = h1; out.right = h0; }
  }
  for (const s of ['left', 'right']) prevWrist[s] = out[s] ? out[s].N[0] : null;
  return out;
}

// La profundidad (z) que da MediaPipe para el cuerpo salta varios cm por cuadro: se filtra una vez, firme,
// para hombros, codos, muñecas y cadera (los demas usos la toman ya filtrada).
const fZ = {};
const Z_IDX = [11, 12, 13, 14, 15, 16, 23, 24];
// Cerca del borde de la imagen (o afuera) MediaPipe inventa puntos: codos y muñecas pierden confianza de a poco
// y una mano que toca el borde se descarta (tiesme mantiene su ultima pose buena en vez de seguir basura).
const edgeK = p => clamp(Math.min(p.x, 1 - p.x, p.y, 1 - p.y) / 0.04, 0, 1);
const handAtEdge = N => [0, 5, 9, 13, 17].some(i => edgeK(N[i]) < 0.5);
function buildFrame(res, dt) {
  const fd = { vw: res.vw, vh: res.vh, f: focal(res.vw) };
  const pn = res.pose?.landmarks?.[0] || null;
  fd.poseN = pn ? pn.map((p, i) => (i >= 13 && i <= 16 ? { ...p, visibility: (p.visibility ?? 1) * edgeK(p) } : p)) : null;
  const pw = res.pose?.worldLandmarks?.[0] || null;
  if (pw) {
    const k = farFactor();
    fd.poseW = pw.map((p, i) => (Z_IDX.includes(i) ? { ...p, z: (fZ[i] ??= new OneEuro(0.5, 0.2)).filter(p.z, dt) } : p));
    for (const i of Z_IDX) fZ[i].mc = 0.5 * k;
  } else fd.poseW = null;
  fd.face = res.face?.faceLandmarks?.[0] || null;
  fd.faceRes = res.face;
  fd.hands = assignHands(res.hands, fd.poseN);
  for (const s of ['left', 'right']) if (fd.hands[s] && handAtEdge(fd.hands[s].N)) fd.hands[s] = null;
  fd.handsN = res.hands?.landmarks || [];
  fd.occ = faceOcclusion(fd);
  estimateDepths(fd, dt);
  computeSignals(fd, dt);
  return fd;
}

function detect() {
  if (!poseLm || video.readyState < 2 || video.currentTime === lastVideoTime) return null;
  lastVideoTime = video.currentTime;
  const ts = performance.now();
  // la cara (con gestos) se detecta un frame si y uno no: es lo mas pesado y cambia mas lento
  const faceNow = (detN++ % 2 === 0) || !lastFace;
  if (faceNow) lastFace = faceLm.detectForVideo(video, ts);
  return {
    pose: poseLm.detectForVideo(video, ts),
    hands: handLm.detectForVideo(video, ts),
    face: lastFace, faceNow,
    vw: video.videoWidth, vh: video.videoHeight,
  };
}

function drawOverlay(fd) {
  if (camBox.classList.contains('oculto')) return;
  const c = overlay, ctx = c.getContext('2d');
  if (c.width !== fd.vw) { c.width = fd.vw; c.height = fd.vh; }
  ctx.clearRect(0, 0, c.width, c.height);
  const pt = p => [p.x * c.width, p.y * c.height];
  const line = (p, q, col) => { ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(...pt(p)); ctx.lineTo(...pt(q)); ctx.stroke(); };
  const dot = (p, col, rad) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(...pt(p), rad, 0, 7); ctx.fill(); };
  // zona util 9:16 (lo que ve la tele): verde = te sigue, gris = afuera / entrando
  const zw = ZONE_W * c.height;
  ctx.strokeStyle = presence.engaged ? '#7bd88f' : '#9aa0ad'; ctx.lineWidth = 6; ctx.setLineDash([24, 14]);
  ctx.strokeRect((c.width - zw) / 2, 3, zw, c.height - 6); ctx.setLineDash([]);
  if (fd.poseN) for (const [i, j] of [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]]) line(fd.poseN[i], fd.poseN[j], '#4fc3f7');
  for (const s of ['left', 'right']) if (fd.hands[s]) for (const p of fd.hands[s].N) dot(p, s === 'left' ? '#ffd54f' : '#ff8a65', 4);
  if (fd.face) for (const i of [10, 152, 234, 454, 33, 263]) dot(fd.face[i], fd.occ >= OCC_FACE ? '#9e9e9e' : '#ef5350', 6);
}

// ---------- Demo sin camara: persona sintetica en 3D, proyectada como si fuera la webcam ----------
// Escenas fijas para probar contacto con la cara, manos juntas, etc. "libre" es el movimiento continuo.
const ESCENAS = ['libre', 'brazos_abajo', 'T', 'costado_cabeza', 'tapar_cara', 'mejillas', 'cabeza_arriba', 'rezo', 'manos_panza',
  'arco', 'inclinar_lado', 'inclinar_adelante', 'lejos_libre', 'lejos_brazo_adelante', 'cerca_mano_camara'];

function demoResults(t, escena = 'libre') {
  const vw = 1280, vh = 720, f = focal(vw);
  const proj = (P, z = 0) => ({ x: 0.5 + f * P.x / (-P.z) / vw, y: 0.5 - f * P.y / (-P.z) / vh, z, visibility: 1 });
  const rotY = (v, a) => new V3(v.x * Math.cos(a) + v.z * Math.sin(a), v.y, -v.x * Math.sin(a) + v.z * Math.cos(a));
  const libre = escena === 'libre' || escena === 'lejos_libre';
  // distancia a la camara: libre se acerca y se aleja; las escenas "lejos" son como tu video (2,2 m)
  const D = { lejos_libre: 2.2, lejos_brazo_adelante: 2.2, cerca_mano_camara: 1.0 }[escena] ?? (libre ? 0.9 + 0.3 * Math.sin(t * 0.45) : 0.85);
  const X = escena === 'libre' ? 0.12 * Math.sin(t * 0.31) : 0;
  const head = new V3(X, 0.12, -D);
  const chest = new V3(X, -0.13, -D - 0.06);
  const tw = libre ? 0.3 * Math.sin(t * 0.7) : 0;
  const SL = chest.clone().add(rotY(new V3(0.18, 0, 0), tw)), SR = chest.clone().add(rotY(new V3(-0.18, 0, 0), tw));
  const HL = new V3(X + 0.1, -0.63, -D - 0.06), HR = new V3(X - 0.1, -0.63, -D - 0.06);
  const curl = libre ? (Math.sin(t * 1.7) * 0.5 + 0.5) * 1.4 : 0.15;

  // muñeca, direccion de los dedos y normal de la palma de cada mano (izquierda del usuario = +x)
  let WL, WR, dirL, dirR, nL, nR;
  const sym = (w, d, n) => { WL = w; dirL = d.normalize(); nL = n.normalize(); WR = new V3(2 * X - w.x, w.y, w.z); dirR = new V3(-d.x, d.y, d.z); nR = new V3(-n.x, n.y, n.z); };
  const H = (x, y, z) => head.clone().add(new V3(x, y, z));
  switch (escena) {
    case 'brazos_abajo': sym(SL.clone().add(new V3(0.04, -0.53, 0.04)), new V3(0, -1, 0), new V3(-1, 0, 0)); break;
    case 'T': sym(SL.clone().add(new V3(0.55, 0, 0)), new V3(1, 0, 0), new V3(0, -1, 0)); break;
    case 'costado_cabeza': sym(H(0.2, -0.08, 0.08), new V3(0, 1, 0), new V3(0, 0, 1)); break;
    case 'tapar_cara': sym(H(0.035, -0.13, 0.1), new V3(-0.15, 1, 0), new V3(0, 0, -1)); break;
    case 'mejillas': sym(H(0.1, -0.12, 0.03), new V3(-0.1, 1, 0), new V3(-1, 0, 0)); break;
    case 'cabeza_arriba': sym(H(0.12, 0.1, -0.02), new V3(-0.6, 0.6, 0), new V3(0, -1, 0)); break;
    case 'rezo': sym(new V3(X + 0.012, -0.22, -D + 0.25), new V3(0, 1, 0.15), new V3(-1, 0, 0)); break;
    case 'manos_panza': sym(new V3(X + 0.04, -0.45, -D + 0.17), new V3(-0.7, 0, 0.5), new V3(0, 0.2, -1)); break;
    case 'arco': sym(SL.clone().add(new V3(0.3, 0.24, 0.03)), new V3(0, 1, 0), new V3(0, 0, 1)); break; // codos afuera, manos arriba
    case 'inclinar_lado': case 'inclinar_adelante': sym(SL.clone().add(new V3(0.04, -0.53, 0.04)), new V3(0, -1, 0), new V3(-1, 0, 0)); break;
    case 'lejos_brazo_adelante': case 'cerca_mano_camara': {
      // tu brazo izquierdo estirado hacia la camara (en "cerca" ademas te inclinas: la mano queda a ~35 cm de la camara)
      sym(SL.clone().add(new V3(0.04, -0.53, 0.04)), new V3(0, -1, 0), new V3(-1, 0, 0));
      WL = SL.clone().add(new V3(-0.04, escena === 'cerca_mano_camara' ? 0.05 : -0.04, 0.54));
      dirL = escena === 'cerca_mano_camara' ? new V3(0, 1, 0.2).normalize() : new V3(0, 0, 1);
      nL = escena === 'cerca_mano_camara' ? new V3(0, 0, 1) : new V3(0, -1, 0);
      break;
    }
    default: {
      // libre: brazo izquierdo sube por el costado, el derecho se estira hacia la camara
      const th = (Math.sin(t * 1.3) * 0.5 + 0.5) * Math.PI * 0.85, th2 = th + 0.7 * (Math.sin(t * 2.1) * 0.5 + 0.5);
      const EL = SL.clone().add(new V3(Math.sin(th), -Math.cos(th), 0.1).normalize().multiplyScalar(0.28));
      dirL = new V3(Math.sin(th2), -Math.cos(th2), 0.15).normalize();
      WL = EL.clone().addScaledVector(dirL, 0.25);
      const ph = Math.sin(t * 0.9) * 0.5 + 0.5;
      const ER = SR.clone().add(new V3(-0.12, -1 + ph * 0.9, ph * 0.8).normalize().multiplyScalar(0.28));
      dirR = new V3(-0.05, -0.6 + ph * 0.9, 0.3 + ph).normalize();
      WR = ER.clone().addScaledVector(dirR, 0.25);
      nL = new V3(0, 0, 1); nR = new V3(0, 0, 1);
    }
  }
  // codos por IK del usuario (codo hacia afuera y abajo)
  const EL = solveIK(SL, WL, SL.clone().add(new V3(0.5, -1, -0.2)), 0.29, 0.26, 1).E;
  const ER = solveIK(SR, WR, SR.clone().add(new V3(-0.5, -1, -0.2)), 0.29, 0.26, -1).E;

  const hip = HL.clone().add(HR).multiplyScalar(0.5);
  // inclinarse desde la cintura (sentado): todo el tren superior gira alrededor de la cadera
  const [lf, ls] = { inclinar_lado: [0, 0.25], inclinar_adelante: [0.3, 0], cerca_mano_camara: [0.35, 0] }[escena] || [0, 0];
  const qLean = new Q().setFromEuler(new THREE.Euler(lf, 0, -ls, 'YXZ'));
  const LN = P => P.clone().sub(hip).applyQuaternion(qLean).add(hip);
  const pts = Array(33).fill(chest);
  Object.assign(pts, { 0: head.clone().add(new V3(0, -0.02, 0.08)), 11: SL, 12: SR, 13: EL, 14: ER, 15: WL, 16: WR });
  for (let i = 0; i < 33; i++) pts[i] = LN(pts[i]);
  pts[23] = HL; pts[24] = HR;
  const poseN = pts.map(P => proj(P)), poseW = pts.map(P => ({ x: P.x - hip.x, y: -(P.y - hip.y), z: -(P.z - hip.z), visibility: 1 }));

  // mano: modelo local (dedos +Y, palma hacia +Z, pulgar hacia +X en la izquierda) orientado con dir y normal
  const demoHand = (wrist, dir, n, thumb) => {
    const L = [new V3()];
    [[1, 0.02, 0.02, 0.01], [2, 0.045, 0.045, 0.02], [3, 0.06, 0.07, 0.03], [4, 0.07, 0.09, 0.035]].forEach(([i, x, y, z]) => (L[i] = new V3(x * thumb, y, z)));
    [[5, 0.025], [9, 0.008], [13, -0.01], [17, -0.027]].forEach(([i0, x]) => {
      let p = new V3(x * thumb, 0.08, 0);
      L[i0] = p.clone();
      [0.035, 0.025, 0.02].forEach((len, k) => {
        const ang = Math.min(1.5, curl * (k + 1) / 1.5);
        p = p.clone().add(new V3(0, Math.cos(ang) * len, Math.sin(ang) * len));
        L[i0 + k + 1] = p;
      });
    });
    const Y = dir.clone().normalize(), Z = n.clone().addScaledVector(Y, -n.dot(Y)).normalize();
    const q = new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3().crossVectors(Y, Z), Y, Z));
    const P = L.map(v => LN(v.clone().applyQuaternion(q).add(wrist)));
    const c = P.reduce((s, p) => s.add(p), new V3()).divideScalar(P.length);
    return { N: P.map(p => proj(p)), W: P.map(p => ({ x: p.x - c.x, y: -(p.y - c.y), z: -(p.z - c.z) })) };
  };
  const hL = demoHand(WL, dirL, nL, 1), hR = demoHand(WR, dirR, nR, -1);

  const qh = (libre ? new Q().setFromEuler(new THREE.Euler(0.2 * Math.sin(t * 1.1), 0.45 * Math.sin(t * 0.8), 0.15 * Math.sin(t * 0.6), 'YXZ')) : new Q()).premultiply(qLean);
  const FL = { 33: [-0.046, 0.03, 0.02], 263: [0.046, 0.03, 0.02], 234: [-0.075, 0, -0.03], 454: [0.075, 0, -0.03], 10: [0, 0.09, 0.01], 152: [0, -0.11, 0], 1: [0, -0.01, 0.06] };
  const faceLmk = [], headL = LN(head);
  for (const [i, v] of Object.entries(FL)) {
    const P = new V3(...v).applyQuaternion(qh).add(headL);
    faceLmk[i] = proj(P, -(P.z - headL.z) * f / D / vw);
  }
  const cat = (n, s) => ({ categoryName: n, score: s });
  const jaw = libre ? Math.max(0, Math.sin(t * 1.6)) * 0.5 : 0, blink = libre && (t % 3.2) < 0.2 ? 0.9 : 0.05;
  const smile = libre ? Math.max(0, Math.sin(t * 0.5 + 2)) * 0.8 : 0, brow = libre ? Math.max(0, Math.sin(t * 0.37 + 1)) * 0.9 : 0;
  return {
    vw, vh,
    pose: { landmarks: [poseN], worldLandmarks: [poseW] },
    hands: { landmarks: [hL.N, hR.N], worldLandmarks: [hL.W, hR.W], handedness: [[cat('Right', 1)], [cat('Left', 1)]] },
    face: {
      faceLandmarks: [faceLmk],
      faceBlendshapes: [{ categories: [cat('jawOpen', jaw), cat('mouthPucker', 0), cat('mouthSmileLeft', smile), cat('mouthSmileRight', smile),
        cat('eyeBlinkLeft', blink), cat('eyeBlinkRight', blink), cat('browInnerUp', brow), cat('browDownLeft', 0), cat('browDownRight', 0)] }],
      facialTransformationMatrixes: [{ data: Array.from(new THREE.Matrix4().makeRotationFromQuaternion(qh).elements) }],
    },
  };
}

// ---------- Estados de cara ----------
let cara = null;
const calUI = {
  mostrar: on => ($('calOverlay').style.display = on ? 'flex' : 'none'),
  paso: s => ($('calPaso').textContent = s),
  cuenta: s => ($('calCuenta').textContent = s),
};
async function calibrarGestos() {
  if (!cara) return flash('Los estados de cara todavía no cargaron');
  if (!mpFrame?.face) return flash('No se detecta la cara: ponete frente a la cámara');
  await cara.calibrar(calUI);
  flash('Gestos calibrados');
}

// ---------- UI ----------
function bindCheck(id, key, after) {
  const el = $(id);
  el.checked = opt[key];
  el.addEventListener('change', () => { opt[key] = el.checked; after?.(); });
}
function bindSlider(id, key, digits, after) {
  const el = $(id), out = $('v-' + key);
  el.value = opt[key]; out.textContent = (+opt[key]).toFixed(digits);
  el.addEventListener('input', () => { opt[key] = +el.value; out.textContent = opt[key].toFixed(digits); after?.(); });
}
const applyMirror = () => camBox.classList.toggle('espejo', opt.mirror);
const applyVertical = () => { resize(); frameView(); };
bindCheck('o-vertical', 'vertical', applyVertical);
bindCheck('o-mirror', 'mirror', applyMirror);
applyMirror();
['head', 'chest', 'arms', 'fingers', 'move', 'mapPos', 'lean', 'nearCam'].forEach(k => bindCheck('o-' + k, k));
bindCheck('o-face', 'face', applyFaceTex);
bindCheck('o-voice', 'voice', async () => {
  if (!cara) return;
  try { await cara.setVoz(opt.voice); } catch (err) { opt.voice = false; $('o-voice').checked = false; flash('Sin micrófono: ' + err.name); }
});
bindSlider('o-smooth', 'smooth', 2);
bindSlider('o-react', 'react', 2);
bindSlider('o-moveGain', 'moveGain', 1);
bindSlider('o-voiceThr', 'voiceThr', 0, () => cara?.setUmbralVoz(opt.voiceThr));
$('b-calib').onclick = calibrate;
$('b-gestos').onclick = calibrarGestos;
$('b-view').onclick = frameView;
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'c') calibrate();
  else if (k === 'g') calibrarGestos();
  else if (k === 'r') frameView();
  else if (k === 'm') { opt.mirror = !opt.mirror; $('o-mirror').checked = opt.mirror; applyMirror(); }
  else if (k === 't') { opt.vertical = !opt.vertical; $('o-vertical').checked = opt.vertical; applyVertical(); }
  else if (k === 'h') panel.classList.toggle('oculto');
  else if (k === 'v') camBox.classList.toggle('oculto');
  else if (k === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});

// ---------- Presencia ----------
// Tiesme solo te sigue si estas bien ubicado: cara visible, los dos hombros dentro de la imagen y la cara
// dentro de la franja 9:16 del centro, durante 0,6 s seguidos. Si no (sentado al costado, con la cara fuera
// de cuadro, pasando por atras), se queda en reposo en el centro. Se suelta despues de 1,2 s fuera.
const presence = { engaged: false, inT: 0, outT: 0, ok: false };
function updatePresence(fd, dt) {
  let ok = false;
  if (fd?.face && fd.poseN && vis(fd.poseN, 11) > 0.6 && vis(fd.poseN, 12) > 0.6) {
    const half = ZONE_W * fd.vh / fd.vw / 2;
    const fx = (fd.face[33].x + fd.face[263].x) / 2;
    const inImg = p => p.x > 0.01 && p.x < 0.99 && p.y > 0.01 && p.y < 0.99;
    ok = Math.abs(fx - 0.5) < half * 1.1 && inImg(fd.poseN[11]) && inImg(fd.poseN[12]) && fd.dHead > 0.3 && fd.dHead < 3.5;
  }
  presence.ok = ok;
  if (ok) { presence.inT += dt; presence.outT = 0; if (presence.inT > 0.6) presence.engaged = true; }
  else { presence.outT += dt; presence.inT = 0; if (presence.outT > 1.2) presence.engaged = false; }
  return presence.engaged;
}

// ---------- Loop ----------
let last = performance.now(), frames = 0, fpsT = last, rigReady = false, paused = false;
function loop(now) {
  requestAnimationFrame(loop);
  if (paused) return;
  const dt = clamp((now - last) / 1000, 1 / 240, 0.1);
  last = now;
  let raw = null;
  if (DEMO) {
    const t = now / 1000, esc = ESCENAS.includes(DEMO_ESC) ? DEMO_ESC : ESCENAS[Math.floor(t / 4) % ESCENAS.length];
    $('demo').textContent = 'MODO DEMO · ' + esc.replace('_', ' ');
    raw = demoResults(t, esc);
    raw.faceNow = true;
  } else raw = detect();
  if (raw) {
    const ddt = clamp((now - lastDetT) / 1000, 1 / 120, 0.2);
    lastDetT = now;
    mpFrame = buildFrame(raw, ddt);
    detCount++;
    drawOverlay(mpFrame);
    status.detecta = `Detecta: cuerpo ${mpFrame.poseN ? ok('sí') : bad('no')} · manos ${mpFrame.handsN.length} · cara ${mpFrame.face ? (mpFrame.occ >= OCC_FACE ? 'tapada' : ok('sí')) : bad('no')}` +
      `\nPersona: ${presence.engaged ? ok('siguiendo') : presence.ok ? 'entrando…' : bad('fuera de la zona (tiesme en reposo)')}`;
  }
  // fuera de zona / mal ubicado: como si no hubiera nadie (mantiene un momento y vuelve a reposo despacio)
  const engaged = updatePresence(mpFrame, dt);
  const use = engaged ? mpFrame : null;
  if (rigReady) { updateRoot(use, dt); updateRig(use, dt); frameGuard(dt); }
  if (cara && opt.face) {
    // con la cara tapada los gestos no son confiables: vuelve a reposo
    if (raw?.faceNow) cara.procesar(engaged && mpFrame.occ < OCC_FACE ? mpFrame.faceRes : undefined, now);
    cara.render(now);
    canvasFaceTex.needsUpdate = true;
  }
  if (controls.enabled) controls.update();
  renderer.render(scene, camera);
  frames++;
  if (now - fpsT > 1000) {
    detFps = detCount; detCount = 0;
    $('fps').textContent = `${frames} fps · tracking ${detFps}`;
    frames = 0; fpsT = now;
    if (cara) status.gesto = (cara.calibrada() ? 'Gestos (calibrados): ' : 'Gestos: ') + cara.estado();
    renderStatus();
  }
}

// ---------- Inicio ----------
renderStatus();
requestAnimationFrame(loop);
if (DEMO) $('demo').style.display = 'block';

loadModel()
  .then(() => { rigReady = true; setStatus('modelo', ok('ok')); })
  .catch(err => { console.error(err); setStatus('modelo', bad('error: ' + err.message)); });

crearCara()
  .then(c => {
    cara = c;
    cara.setUmbralVoz(opt.voiceThr);
    canvasFaceTex = new THREE.CanvasTexture(c.canvas);
    canvasFaceTex.colorSpace = THREE.SRGBColorSpace;
    applyFaceTex();
    setStatus('cara', ok('ok'));
  })
  .catch(err => { console.error(err); setStatus('cara', bad('error: ' + err.message)); });

if (!DEMO) {
  startCamera().catch(err => { console.error(err); setStatus('camara', bad('sin acceso (' + err.name + ')')); });
  initVision().catch(err => { console.error(err); setStatus('mediapipe', bad('error: ' + err.message)); });
}
