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

const HFOV = 70;               // campo de vision horizontal de la C920 (grados)
const EYE_W = 0.092;           // distancia real entre comisuras externas de los ojos (m)
const HEAD_TO_SHOULDER = 0.06; // los hombros quedan unos cm detras de la cara
const OCC_FACE = 0.15;         // fraccion de puntos de mano sobre la cara para considerarla tapada
const focal = vw => (vw / 2) / Math.tan(THREE.MathUtils.degToRad(HFOV / 2));
// Limites de giro (Euler YXZ, x+ = mirar abajo). La cabeza es relativa al pecho.
const HEAD_LIM = { x: [-35 * DEG, 40 * DEG], y: [-70 * DEG, 70 * DEG], z: [-35 * DEG, 35 * DEG] };
const CHEST_LIM = { x: [-20 * DEG, 20 * DEG], y: [-35 * DEG, 35 * DEG], z: [-20 * DEG, 20 * DEG] };

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

const opt = {
  mirror: true, head: true, chest: true, arms: true, fingers: true, move: true, face: true, voice: false, mapPos: true,
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
  constructor() { this.x = null; this.d = new V3(); }
  filter(v, dt, minCutoff, beta) {
    if (!this.x) { this.x = v.clone(); return v.clone(); }
    this.d.lerp(v.clone().sub(this.x).divideScalar(dt), lpA(dt, 1));
    return this.x.lerp(v, lpA(dt, minCutoff + beta * this.d.length())).clone();
  }
}
const vecFilters = {};
const F3 = (key, v, dt, mc, beta) => (vecFilters[key] ??= new VecFilter()).filter(v, dt, mc, beta);
const dropF3 = prefix => { for (const k of Object.keys(vecFilters)) if (k.startsWith(prefix)) delete vecFilters[k]; };

// Suavizado: corte minimo (Hz) cuando estas quieto. Reaccion: cuanto se abre el filtro al moverte rapido.
const filtParams = () => ({
  mc: 0.15 + 4 * (1 - opt.smooth) ** 2,
  bDir: 0.5 + opt.react * 5,      // direcciones (1/s)
  bPos: 1 + opt.react * 6,        // posiciones del cuerpo (m/s)
  bHand: 4 + opt.react * 16,      // puntos de la mano (m/s, se mueven poco)
});

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
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
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
    fbx, bones, rig, opt, holder, wpos, demoResults, charAnc, ESCENAS,
    ellDist: (p, which, margin = 0) => ellDist(p, which === 'head' ? charAnc.headEll : charAnc.torsoEll, margin),
    cara: () => cara,
    // para las pruebas con capturas: render manual y vista girada (grados alrededor del personaje)
    render: (yawDeg = 0, zoom = 1) => {
      const t = view.target.clone().add(holder.position), r = view.dist / zoom, a = yawDeg * DEG;
      camera.position.set(t.x + Math.sin(a) * r, t.y, t.z + Math.cos(a) * r);
      camera.lookAt(t); renderer.render(scene, camera);
    },
    pause: v => (paused = v),
    step: (raw, dt) => { mpFrame = buildFrame(raw, dt); updateRoot(mpFrame, dt); updateRig(mpFrame, dt); },
  };
}

function frameView() {
  camera.position.set(view.target.x, view.target.y, view.target.z + view.dist);
  camera.near = view.h / 200; camera.far = view.h * 200;
  camera.updateProjectionMatrix();
  controls.target.copy(view.target);
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

  // Torso: buzo + abdomen sin las mangas, pegado a Spine2.
  const torso = meshBox(['tiesme_uv_torso_01', 'tiesme_torso_abdomen'], v => Math.abs(v.x - m.x) < charAnc.hc * 0.8);
  const sb = B('spine2');
  sb.updateWorldMatrix(true, false);
  const tc = torso ? torso.center : wpos('spine2');
  const th = torso ? torso.half : new V3(charAnc.hc, charAnc.hc * 1.6, charAnc.hc);
  charAnc.torsoEll = { bone: sb, centerLocal: sb.worldToLocal(tc.clone()), R: new V3(charAnc.hc * 1.05, th.y, th.z), W0inv: rig.spine2.W0.clone().invert() };
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

// IK de tiesme con sus largos; si el antebrazo atraviesa el torso o el codo la cabeza, prueba otros planos de codo.
function charIK(S, T, pole, L1, L2, sideSign) {
  const axis = T.clone().sub(S).normalize();
  let best = null;
  for (const ang of [0, 0.5, -0.5, 1.0, -1.0, 1.6]) {
    const p = pole.clone().applyAxisAngle(axis, ang * sideSign);
    const r = solveIK(S, T, S.clone().add(p), L1, L2, sideSign);
    const fm = r.E.clone().lerp(r.Wr, 0.5);
    const pen = Math.max(0, 0.9 - ellDist(fm, charAnc.torsoEll)) + Math.max(0, 1 - ellDist(r.E, charAnc.headEll));
    if (pen === 0) return r;
    if (!best || pen < best.pen) best = { ...r, pen };
  }
  return best;
}

let chestNeutralInv = new Q(), headNeutralInv = new Q();
let lastChestRaw = null, lastHeadRaw = null;

// ---------- Profundidad y posicion ----------
const fDepthHead = new OneEuro(0.6, 0.8);
const fDepthHand = { left: new OneEuro(1.0, 1.5), right: new OneEuro(1.0, 1.5) };
const armLen = { left: [0.29, 0.26], right: [0.29, 0.26] };
let refBody = null, bodyFrames = 0, lostT = 0, lastDepth = 1.0;

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
    if (sp > 4) h.depth = fDepthHand[U].filter(clamp(fd.f * sw / sp, 0.15, 4), dt);
  }
  // largo de brazos del usuario, promediado lento
  if (fd.poseW) for (const U of ['left', 'right']) {
    const [s, e, w] = ARM[U], pw = fd.poseW;
    if (vis(fd.poseN, e) > 0.6) armLen[U][0] += 0.02 * (clamp(dist3(pw[s], pw[e]), 0.2, 0.4) - armLen[U][0]);
    if (vis(fd.poseN, w) > 0.6) armLen[U][1] += 0.02 * (clamp(dist3(pw[e], pw[w]), 0.18, 0.36) - armLen[U][1]);
  }
}
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// El cuerpo se mueve con los HOMBROS (no con la cabeza: girar o inclinar la cabeza no lo desliza).
function updateRoot(fd, dt) {
  const target = new V3();
  if (fd?.bodyCam) {
    bodyFrames++; lostT = 0;
    if (!refBody && bodyFrames > 20) refBody = fd.bodyCam.clone();
    if (refBody && opt.move) {
      const off = fd.bodyCam.clone().sub(refBody);
      const k = modelScale * opt.moveGain, sx = opt.mirror ? -1 : 1;
      target.set(
        clamp(sx * off.x * k, -view.h * 1.5, view.h * 1.5),
        clamp(off.y * k, -view.h * 0.6, view.h * 0.6),
        clamp(off.z * k * 2, -view.h * 1.2, view.h * 1.8), // acercarse se exagera x2 para que se note
      );
    }
  } else {
    bodyFrames = 0; lostT += dt;
    if (lostT > 3) refBody = null; // se fue la persona: el proximo se calibra solo
  }
  holder.position.lerp(target, lpA(dt, 3));
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
  const E0 = F3('E' + U, camPoint(fd, pn[ei], dS + (pw[ei].z - pw[si].z)), dt, P.mc, P.bPos);
  const [L1, L2] = armLen[U];
  let T, Pm = null, cT;
  if (hand && hand.depth) {
    // la mano manda: posicion en la imagen + distancia medida por su tamaño (nunca detras del cuerpo)
    const d = clamp(hand.depth, dS - (L1 + L2) * 1.05, dS + 0.08);
    T = camPoint(fd, hand.N[0], d);
    const pc = [0, 5, 9, 13, 17].reduce((a, i) => ({ x: a.x + hand.N[i].x / 5, y: a.y + hand.N[i].y / 5 }), { x: 0, y: 0 });
    Pm = F3('P' + U, camPoint(fd, pc, d), dt, P.mc, P.bPos);
    cT = 1;
  } else {
    T = camPoint(fd, pn[wi], Math.min(dS + (pw[wi].z - pw[si].z), dS + 0.08));
    dropF3('P' + U);
    cT = cW;
  }
  T = F3('T' + U, T, dt, P.mc, P.bPos);
  const w = cS * Math.max(cT, cE * 0.7);
  if (w < 0.01) return null;
  return { S, E0, T, Pm: Pm || T, w, elbowOnly: cT < 0.3 };
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
    fd.chest = { left: F3('chL', left, dt, P.mc, P.bDir), up: F3('chU', up, dt, P.mc, P.bDir), w: wSh };
  }

  // Cabeza. Con la cara tapada por las manos se congela (rotacion, posicion y tamaño).
  if (fd.face && fd.occ < OCC_FACE) {
    const lm = headFromLandmarks(fd.face, fd);
    const hv = headFromMatrix(fd, lm) || lm;
    held.headV = { left: F3('hdL', hv.left, dt, P.mc, P.bDir), up: F3('hdU', hv.up, dt, P.mc, P.bDir) };
    const P3 = i => camPoint3(fd, fd.face[i], fd.dHead);
    const a = P3(454), b = P3(234);
    held.Hu = F3('Hu', mid(a, b), dt, P.mc, P.bPos);
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
      S[U] = F3('S' + U, camPoint(fd, pn[si], dS[U]), dt, P.mc, P.bPos);
    }
    const Mu = mid(S.left, S.right);
    fd.bodyCam = F3('body', Mu, dt, 0.4, 1.5);
    fd.anc = {
      Mu, hu: Math.max(0.1, S.left.distanceTo(S.right) / 2),
      Hu: held.Hu || Mu.clone().add(new V3(0, 0.23, 0.02)),
      Ru: held.Ru || new V3(0.075, 0.1, 0.105),
    };
    for (const U of ['left', 'right']) fd.arm[U] = armSolve(fd, U, S[U], dS[U], dt, P);
  }
  for (const U of ['left', 'right']) {
    const h = fd.hands[U];
    if (h) fd.handP[U] = h.W.map((p, i) => F3(`m${U}${i}`, C(p), dt, P.mc * 1.5, P.bHand));
    else { dropF3('m' + U); fd.handP[U] = null; }
  }
}

// ---------- Actualizacion del rig ----------
function updateRig(fd, dt) {
  const { mc, bDir } = filtParams();
  const sx = opt.mirror ? -1 : 1;
  const M = v => new V3(sx * v.x, v.y, v.z); // espacio camara -> personaje (espejo)
  // segunda etapa, mas liviana: las señales ya vienen filtradas
  const set = (r, local, fm = 1, maxRate) => { if (r) r.bone.quaternion.copy(r.f.filter(constrain(r, local), dt, mc * 2 * fm, bDir, maxRate)); };
  const drive = (r, Wt, fm, maxRate) => r && set(r, parentW(r).invert().multiply(Wt), fm, maxRate);

  let Dc = new Q();
  lastChestRaw = null;
  if (opt.chest && fd?.chest) {
    const left = M(fd.chest.left);
    if (left.x < 0) left.negate();
    lastChestRaw = frameQuat(left, M(fd.chest.up));
    Dc = clampRot(new Q().slerp(lastChestRaw.clone().multiply(chestNeutralInv), fd.chest.w), CHEST_LIM);
  }
  ['spine', 'spine1', 'spine2'].forEach((n, i) => {
    const r = rig[n];
    if (r) drive(r, new Q().slerp(Dc, (i + 1) / 3).multiply(r.W0));
  });

  let Dh = Dc.clone();
  lastHeadRaw = null;
  if (opt.head && fd?.headV) {
    const left = M(fd.headV.left);
    if (left.x < 0) left.negate();
    lastHeadRaw = frameQuat(left, M(fd.headV.up));
    // limites anatomicos de la cabeza respecto del pecho
    Dh = Dc.clone().multiply(clampRot(Dc.clone().invert().multiply(lastHeadRaw.clone().multiply(headNeutralInv)), HEAD_LIM));
  }
  if (rig.neck) drive(rig.neck, Dc.clone().slerp(Dh, 0.5).multiply(rig.neck.W0), 1, 6);
  if (rig.head) drive(rig.head, Dh.clone().multiply(rig.head.W0), 1, 8);

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
    let d1 = rest1, d2 = rest2;
    const a = opt.arms ? fd?.arm?.[U] : null;
    const hAll = fd?.handP?.[U];
    const hd = hAll ? M(hAll[9]).sub(M(hAll[0])).normalize() : null; // direccion muñeca -> nudillos
    if (a) {
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
        const Sc = wpos(S + 'arm');
        const r = charIK(Sc, T, M(a.E0.clone().sub(a.S)), L1, L2, sign);
        t1 = r.E.clone().sub(Sc).normalize(); t2 = r.Wr.clone().sub(r.E).normalize();
      } else {
        const r = solveIK(a.S, a.T, a.E0, armLen[U][0], armLen[U][1], U === 'left' ? 1 : -1);
        t1 = M(r.E.clone().sub(a.S)).normalize(); t2 = M(r.Wr.clone().sub(r.E)).normalize();
      }
      d1 = slerpDir(rest1, t1, a.w); d2 = slerpDir(rest2, t2, a.w);
    }
    drive(up, aimTarget(up, d1));

    const hp = opt.fingers ? fd?.handP?.[U] : null;
    const P = hp ? hp.map(M) : null;
    let Wf = aimTarget(fo, d2), Wh = null;
    if (P && ha?.F0inv) {
      const Ft = frameQuat(P[9].clone().sub(P[0]), P[5].clone().sub(P[17]));
      Wh = Ft.multiply(ha.F0inv).multiply(ha.W0);
      // Repartir el giro de muñeca con el antebrazo para que no se "retuerza" la malla.
      const corr = Wh.clone().multiply(Wf.clone().multiply(ha.L0).invert());
      Wf = new Q().slerp(twistAbout(corr, d2), 0.5).multiply(Wf);
    }
    drive(fo, Wf);
    if (Wh) drive(ha, Wh); else set(ha, ha ? ha.L0 : null, 0.5);

    for (const [fname, idx] of Object.entries(FINGERS)) {
      for (let i = 0; i < 3; i++) {
        const r = rig[`${S}hand${fname}${i + 1}`];
        if (!r || !r.dir0) continue;
        if (P) drive(r, aimTarget(r, P[idx[i + 1]].clone().sub(P[idx[i]]).normalize()), 1.5);
        else set(r, r.L0, 0.5);
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

function buildFrame(res, dt) {
  const fd = { vw: res.vw, vh: res.vh, f: focal(res.vw) };
  fd.poseN = res.pose?.landmarks?.[0] || null;
  fd.poseW = res.pose?.worldLandmarks?.[0] || null;
  fd.face = res.face?.faceLandmarks?.[0] || null;
  fd.faceRes = res.face;
  fd.hands = assignHands(res.hands, fd.poseN);
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
  if (fd.poseN) for (const [i, j] of [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]]) line(fd.poseN[i], fd.poseN[j], '#4fc3f7');
  for (const s of ['left', 'right']) if (fd.hands[s]) for (const p of fd.hands[s].N) dot(p, s === 'left' ? '#ffd54f' : '#ff8a65', 4);
  if (fd.face) for (const i of [10, 152, 234, 454, 33, 263]) dot(fd.face[i], fd.occ >= OCC_FACE ? '#9e9e9e' : '#ef5350', 6);
}

// ---------- Demo sin camara: persona sintetica en 3D, proyectada como si fuera la webcam ----------
// Escenas fijas para probar contacto con la cara, manos juntas, etc. "libre" es el movimiento continuo.
const ESCENAS = ['libre', 'brazos_abajo', 'T', 'costado_cabeza', 'tapar_cara', 'mejillas', 'cabeza_arriba', 'rezo', 'manos_panza'];

function demoResults(t, escena = 'libre') {
  const vw = 1280, vh = 720, f = focal(vw);
  const proj = (P, z = 0) => ({ x: 0.5 + f * P.x / (-P.z) / vw, y: 0.5 - f * P.y / (-P.z) / vh, z, visibility: 1 });
  const rotY = (v, a) => new V3(v.x * Math.cos(a) + v.z * Math.sin(a), v.y, -v.x * Math.sin(a) + v.z * Math.cos(a));
  const libre = escena === 'libre';
  const D = libre ? 0.9 + 0.3 * Math.sin(t * 0.45) : 0.85;  // se acerca y se aleja de la camara
  const X = libre ? 0.12 * Math.sin(t * 0.31) : 0;
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
  const pts = Array(33).fill(chest);
  Object.assign(pts, { 0: head.clone().add(new V3(0, -0.02, 0.08)), 11: SL, 12: SR, 13: EL, 14: ER, 15: WL, 16: WR, 23: HL, 24: HR });
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
    const P = L.map(v => v.clone().applyQuaternion(q).add(wrist));
    const c = P.reduce((s, p) => s.add(p), new V3()).divideScalar(P.length);
    return { N: P.map(p => proj(p)), W: P.map(p => ({ x: p.x - c.x, y: -(p.y - c.y), z: -(p.z - c.z) })) };
  };
  const hL = demoHand(WL, dirL, nL, 1), hR = demoHand(WR, dirR, nR, -1);

  const qh = libre ? new Q().setFromEuler(new THREE.Euler(0.2 * Math.sin(t * 1.1), 0.45 * Math.sin(t * 0.8), 0.15 * Math.sin(t * 0.6), 'YXZ')) : new Q();
  const FL = { 33: [-0.046, 0.03, 0.02], 263: [0.046, 0.03, 0.02], 234: [-0.075, 0, -0.03], 454: [0.075, 0, -0.03], 10: [0, 0.09, 0.01], 152: [0, -0.11, 0], 1: [0, -0.01, 0.06] };
  const faceLmk = [];
  for (const [i, v] of Object.entries(FL)) {
    const P = new V3(...v).applyQuaternion(qh).add(head);
    faceLmk[i] = proj(P, -(P.z - head.z) * f / D / vw);
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
bindCheck('o-mirror', 'mirror', applyMirror);
applyMirror();
['head', 'chest', 'arms', 'fingers', 'move', 'mapPos'].forEach(k => bindCheck('o-' + k, k));
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
  else if (k === 'h') panel.classList.toggle('oculto');
  else if (k === 'v') camBox.classList.toggle('oculto');
  else if (k === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});

// ---------- Loop ----------
let last = performance.now(), frames = 0, fpsT = last, rigReady = false, paused = false;
function loop(now) {
  requestAnimationFrame(loop);
  if (paused) return;
  const dt = clamp((now - last) / 1000, 1 / 240, 0.1);
  last = now;
  let raw = null;
  if (DEMO) {
    const t = now / 1000, esc = ESCENAS[Math.floor(t / 4) % ESCENAS.length];
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
    status.detecta = `Detecta: cuerpo ${mpFrame.poseN ? ok('sí') : bad('no')} · manos ${mpFrame.handsN.length} · cara ${mpFrame.face ? (mpFrame.occ >= OCC_FACE ? 'tapada' : ok('sí')) : bad('no')}`;
  }
  if (rigReady) { updateRoot(mpFrame, dt); updateRig(mpFrame, dt); }
  if (cara && opt.face) {
    // con la cara tapada los gestos no son confiables: vuelve a reposo
    if (raw?.faceNow) cara.procesar(mpFrame.occ < OCC_FACE ? mpFrame.faceRes : undefined, now);
    cara.render(now);
    canvasFaceTex.needsUpdate = true;
  }
  controls.update();
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
