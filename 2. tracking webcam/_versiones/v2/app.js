// Tracking tiesme v2: webcam -> MediaPipe (cuerpo, manos, cara) -> huesos Mixamo del FBX en three.js.
// v2: filtro One Euro (sin temblor), profundidad real (acercarse a camara / manos hacia adelante),
// brazos por IK en perspectiva, dedos con bisagra y estados de cara de "instalacion interactiva 01".

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { crearCara } from './cara.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion;

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
const SHOULDER_W = 0.36;       // ancho de hombros real aproximado (m)
const HEAD_TO_SHOULDER = 0.06; // los hombros quedan unos cm detras de la cara
const focal = vw => (vw / 2) / Math.tan(THREE.MathUtils.degToRad(HFOV / 2));

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
  mirror: true, head: true, chest: true, arms: true, fingers: true, move: true, face: true, voice: false,
  smooth: 0.7, react: 0.5, moveGain: 1.0, voiceThr: 6,
};

// ---------- Utilidades ----------
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const soft = v => clamp((v - 0.25) / 0.45, 0, 1);          // visibilidad -> peso suave (sin saltos on/off)
const vis = (arr, i) => (arr && arr[i]) ? (arr[i].visibility ?? 1) : 0;
const other = s => (s === 'left' ? 'right' : 'left');

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
class QuatFilter {
  constructor() { this.q = null; this.d = [0, 0, 0, 0]; }
  filter(t, dt, minCutoff, beta) {
    if (!this.q) return (this.q = t.clone());
    const s = (this.q.x * t.x + this.q.y * t.y + this.q.z * t.z + this.q.w * t.w) < 0 ? -1 : 1;
    const x = [t.x * s, t.y * s, t.z * s, t.w * s], c = [this.q.x, this.q.y, this.q.z, this.q.w];
    const ad = lpA(dt, 1);
    for (let i = 0; i < 4; i++) this.d[i] += ad * ((x[i] - c[i]) / dt - this.d[i]);
    const a = lpA(dt, minCutoff + beta * Math.hypot(...this.d));
    return this.q.set(c[0] + a * (x[0] - c[0]), c[1] + a * (x[1] - c[1]), c[2] + a * (x[2] - c[2]), c[3] + a * (x[3] - c[3])).normalize();
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
let modelScale = 1;

async function loadModel() {
  const manager = new THREE.LoadingManager();
  // El FBX apunta a texturas con rutas absolutas de la biblioteca: las ignoramos y asignamos las copiadas.
  const BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  manager.setURLModifier(url => /\.(png|jpe?g|tga|bmp|tiff?|psd|mp4|mov)$/i.test(url) ? BLANK : url);
  const fbx = await new FBXLoader(manager).loadAsync(MODEL_URL);
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
  modelScale = wpos('leftarm').distanceTo(wpos('rightarm')) / SHOULDER_W;

  const hips = wpos('hips');
  const top = B('headtopend') ? wpos('headtopend') : wpos('head');
  view.h = top.y - hips.y;
  view.target.set(hips.x, hips.y + view.h * 0.55, hips.z);
  view.dist = (view.h * 1.7) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

  setupRig();
  frameView();
  // acceso para depurar desde la consola (y para las pruebas automaticas)
  window.__tiesme = {
    fbx, bones, rig, opt, holder, wpos, demoResults,
    cara: () => cara,
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

let chestNeutralInv = new Q(), headNeutralInv = new Q();
let lastChestRaw = null, lastHeadRaw = null;

// ---------- Profundidad y posicion ----------
const fDepthHead = new OneEuro(0.6, 0.8);
const fDepthHand = { left: new OneEuro(1.0, 1.5), right: new OneEuro(1.0, 1.5) };
const armLen = { left: [0.29, 0.26], right: [0.29, 0.26] };
let refHead = null, faceFrames = 0, lostT = 0, lastDepth = 1.0;

// Punto de la imagen (normalizado) a una profundidad d -> espacio camara en metros (x der, y arriba, z hacia camara).
const camPoint = (fd, n, d) => new V3((n.x - 0.5) * fd.vw / fd.f * d, -(n.y - 0.5) * fd.vh / fd.f * d, -d);

function estimateDepths(fd, dt) {
  let d = null, headN = null;
  if (fd.face) {
    // distancia por el tamaño entre los ojos (en 3D, asi no cambia al girar la cabeza)
    const P = i => new V3(fd.face[i].x * fd.vw, fd.face[i].y * fd.vh, fd.face[i].z * fd.vw);
    const wpx = P(33).distanceTo(P(263));
    if (wpx > 4) d = fd.f * EYE_W / wpx;
    headN = { x: (fd.face[33].x + fd.face[263].x) / 2, y: (fd.face[33].y + fd.face[263].y) / 2 };
  } else if (fd.poseN && fd.poseW && vis(fd.poseN, 11) > 0.5 && vis(fd.poseN, 12) > 0.5) {
    // sin cara: por el ancho de hombros (metrico de MediaPipe vs pixeles)
    const a = fd.poseN[11], b = fd.poseN[12], wa = fd.poseW[11], wb = fd.poseW[12];
    const px = Math.hypot((a.x - b.x) * fd.vw, (a.y - b.y) * fd.vh), m = Math.hypot(wa.x - wb.x, wa.y - wb.y);
    if (px > 4) d = fd.f * m / px - HEAD_TO_SHOULDER;
    headN = fd.poseN[0];
  }
  if (d !== null) lastDepth = fDepthHead.filter(clamp(d, 0.25, 4), dt);
  fd.dHead = lastDepth;
  fd.dBody = lastDepth + HEAD_TO_SHOULDER;
  fd.headCam = d !== null && headN ? F3('head', camPoint(fd, headN, fd.dHead), dt, 0.4, 1.5) : null;

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
  // largo de brazos del usuario (para el IK), promediado lento
  if (fd.poseW) for (const U of ['left', 'right']) {
    const [s, e, w] = ARM[U], pw = fd.poseW;
    if (vis(fd.poseN, e) > 0.6) armLen[U][0] += 0.02 * (clamp(dist3(pw[s], pw[e]), 0.2, 0.4) - armLen[U][0]);
    if (vis(fd.poseN, w) > 0.6) armLen[U][1] += 0.02 * (clamp(dist3(pw[e], pw[w]), 0.18, 0.36) - armLen[U][1]);
  }
}
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function updateRoot(fd, dt) {
  const target = new V3();
  if (fd?.headCam) {
    faceFrames++; lostT = 0;
    if (!refHead && faceFrames > 20) { refHead = fd.headCam.clone(); }
    if (refHead && opt.move) {
      const off = fd.headCam.clone().sub(refHead);
      const k = modelScale * opt.moveGain, sx = opt.mirror ? -1 : 1;
      target.set(
        clamp(sx * off.x * k, -view.h * 1.5, view.h * 1.5),
        clamp(off.y * k, -view.h * 0.6, view.h * 0.6),
        clamp(off.z * k * 2, -view.h * 1.2, view.h * 1.8), // acercarse se exagera x2 para que se note
      );
    }
  } else {
    faceFrames = 0; lostT += dt;
    if (lostT > 3) refHead = null; // se fue la persona: el proximo se calibra solo
  }
  // headCam ya viene filtrado en metros; aca solo se suaviza el paso entre frames de deteccion.
  holder.position.lerp(target, lpA(dt, 3));
}

// ---------- Brazos (IK en perspectiva) ----------
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

// Direcciones de brazo y antebrazo del lado U del usuario, en espacio camara, con su confianza.
function armSolve(fd, U, dt, P) {
  const pn = fd.poseN, pw = fd.poseW, [si, ei, wi] = ARM[U];
  const cS = soft(vis(pn, si)), cE = soft(vis(pn, ei)), cW = soft(vis(pn, wi));
  const hand = fd.hands[U];
  const zMid = (pw[11].z + pw[12].z) / 2;
  const dS = fd.dBody + (pw[si].z - zMid);
  // puntos filtrados en metros ANTES del IK (el IK amplifica el ruido)
  const S = F3('S' + U, camPoint(fd, pn[si], dS), dt, P.mc, P.bPos);
  const E0 = F3('E' + U, camPoint(fd, pn[ei], dS + (pw[ei].z - pw[si].z)), dt, P.mc, P.bPos);
  const [L1, L2] = armLen[U];
  let T, cT;
  if (hand && hand.depth) {
    // la mano manda: posicion en la imagen + distancia medida por su tamaño
    T = camPoint(fd, hand.N[0], clamp(hand.depth, dS - (L1 + L2) * 1.05, dS + 0.3));
    cT = 1;
  } else {
    T = camPoint(fd, pn[wi], dS + (pw[wi].z - pw[si].z));
    cT = cW;
  }
  T = F3('T' + U, T, dt, P.mc, P.bPos);
  const w = cS * Math.max(cT, cE * 0.7);
  if (w < 0.01) return null;
  if (cT < 0.3) { const d1 = E0.sub(S).normalize(); return { d1, d2: d1.clone(), w }; }
  const { E, Wr } = solveIK(S, T, E0, L1, L2, U === 'left' ? 1 : -1);
  return { d1: E.clone().sub(S).normalize(), d2: Wr.sub(E).normalize(), w };
}

// ---------- Señales filtradas (a la velocidad de la deteccion, en espacio camara sin espejo) ----------
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

  // Cabeza: mejillas (234/454), frente (10) y menton (152).
  fd.headV = null;
  if (fd.face) {
    const f = fd.face;
    const F = i => new V3((f[i].x - 0.5) * fd.vw, -(f[i].y - 0.5) * fd.vh, -f[i].z * fd.vw);
    fd.headV = {
      left: F3('hdL', F(454).sub(F(234)).normalize(), dt, P.mc, P.bDir),
      up: F3('hdU', F(10).sub(F(152)).normalize(), dt, P.mc, P.bDir),
    };
  }

  // Brazos (IK) y puntos de las manos.
  fd.arm = {}; fd.handP = {};
  for (const U of ['left', 'right']) {
    fd.arm[U] = pw && pn ? armSolve(fd, U, dt, P) : null;
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
  const set = (r, local, fm = 1) => { if (r) r.bone.quaternion.copy(r.f.filter(constrain(r, local), dt, mc * 2 * fm, bDir)); };
  const drive = (r, Wt, fm) => r && set(r, parentW(r).invert().multiply(Wt), fm);

  let Dc = new Q();
  lastChestRaw = null;
  if (opt.chest && fd?.chest) {
    const left = M(fd.chest.left);
    if (left.x < 0) left.negate();
    lastChestRaw = frameQuat(left, M(fd.chest.up));
    Dc = new Q().slerp(lastChestRaw.clone().multiply(chestNeutralInv), fd.chest.w);
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
    Dh = lastHeadRaw.clone().multiply(headNeutralInv);
  }
  if (rig.neck) drive(rig.neck, Dc.clone().slerp(Dh, 0.5).multiply(rig.neck.W0));
  if (rig.head) drive(rig.head, Dh.clone().multiply(rig.head.W0));

  // Brazos, manos y dedos. En espejo, el brazo izquierdo del personaje sigue tu brazo derecho.
  for (const S of ['left', 'right']) {
    const U = opt.mirror ? other(S) : S;
    const up = rig[S + 'arm'], fo = rig[S + 'forearm'], ha = rig[S + 'hand'];
    if (!up || !fo) continue;
    const sign = S === 'left' ? 1 : -1;
    const rest1 = new V3(sign * 0.22, -1, 0.05).normalize(), rest2 = new V3(sign * 0.08, -1, 0.3).normalize();
    let d1 = rest1, d2 = rest2;
    const a = opt.arms ? fd?.arm?.[U] : null;
    if (a) { d1 = slerpDir(rest1, M(a.d1), a.w); d2 = slerpDir(rest2, M(a.d2), a.w); }
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
  refHead = mpFrame?.headCam ? mpFrame.headCam.clone() : null;
  flash(lastChestRaw || lastHeadRaw ? 'Postura y posición calibradas' : 'Calibración reseteada (no se detecta cuerpo/cara)');
}

// ---------- MediaPipe ----------
let poseLm = null, handLm = null, faceLm = null, mpFrame = null, lastVideoTime = -1, lastDetT = 0;
let detCount = 0, detFps = 0;

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

const dist2 = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
// Asigna cada mano detectada al brazo mas cercano del cuerpo (mas robusto que la etiqueta izquierda/derecha).
function assignHands(res, poseN) {
  const out = { left: null, right: null };
  if (!res?.worldLandmarks?.length) return out;
  const cands = res.worldLandmarks.map((W, i) => {
    const N = res.landmarks[i];
    if (poseN) {
      const dl = dist2(N[0], poseN[15]), dr = dist2(N[0], poseN[16]);
      return { h: { N, W }, side: dl < dr ? 'left' : 'right', d: Math.min(dl, dr) };
    }
    // MediaPipe etiqueta las manos asumiendo imagen espejada.
    const label = res.handedness?.[i]?.[0]?.categoryName;
    return { h: { N, W }, side: label === 'Left' ? 'right' : 'left', d: 0 };
  }).sort((p, q) => p.d - q.d);
  for (const c of cands) {
    if (!out[c.side]) out[c.side] = c.h; else if (!out[other(c.side)]) out[other(c.side)] = c.h;
  }
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
  estimateDepths(fd, dt);
  computeSignals(fd, dt);
  return fd;
}

function detect() {
  if (!poseLm || video.readyState < 2 || video.currentTime === lastVideoTime) return null;
  lastVideoTime = video.currentTime;
  const ts = performance.now();
  return {
    pose: poseLm.detectForVideo(video, ts),
    hands: handLm.detectForVideo(video, ts),
    face: faceLm.detectForVideo(video, ts),
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
  for (const h of fd.handsN) for (const p of h) dot(p, '#ffd54f', 4);
  if (fd.face) for (const i of [10, 152, 234, 454, 33, 263]) dot(fd.face[i], '#ef5350', 6);
}

// ---------- Demo sin camara: una persona sintetica en 3D, proyectada como si fuera la webcam ----------
function demoResults(t) {
  const vw = 1280, vh = 720, f = focal(vw);
  const proj = (P, z = 0) => ({ x: 0.5 + f * P.x / (-P.z) / vw, y: 0.5 - f * P.y / (-P.z) / vh, z, visibility: 1 });
  const rotY = (v, a) => new V3(v.x * Math.cos(a) + v.z * Math.sin(a), v.y, -v.x * Math.sin(a) + v.z * Math.cos(a));
  const D = 0.9 + 0.3 * Math.sin(t * 0.45);  // se acerca y se aleja de la camara
  const X = 0.12 * Math.sin(t * 0.31);
  const head = new V3(X, 0.12, -D);
  const chest = new V3(X, -0.13, -D - 0.06);
  const tw = 0.3 * Math.sin(t * 0.7);
  const SL = chest.clone().add(rotY(new V3(0.18, 0, 0), tw)), SR = chest.clone().add(rotY(new V3(-0.18, 0, 0), tw));
  const HL = new V3(X + 0.1, -0.63, -D - 0.06), HR = new V3(X - 0.1, -0.63, -D - 0.06);
  // brazo izquierdo del usuario: sube por el costado
  const th = (Math.sin(t * 1.3) * 0.5 + 0.5) * Math.PI * 0.85, th2 = th + 0.7 * (Math.sin(t * 2.1) * 0.5 + 0.5);
  const EL = SL.clone().add(new V3(Math.sin(th), -Math.cos(th), 0.1).normalize().multiplyScalar(0.28));
  const fdL = new V3(Math.sin(th2), -Math.cos(th2), 0.15).normalize();
  const WL = EL.clone().addScaledVector(fdL, 0.25);
  // brazo derecho del usuario: se estira hacia la camara
  const ph = Math.sin(t * 0.9) * 0.5 + 0.5;
  const ER = SR.clone().add(new V3(-0.12, -1 + ph * 0.9, ph * 0.8).normalize().multiplyScalar(0.28));
  const fdR = new V3(-0.05, -0.6 + ph * 0.9, 0.3 + ph).normalize();
  const WR = ER.clone().addScaledVector(fdR, 0.25);

  const hip = HL.clone().add(HR).multiplyScalar(0.5);
  const pts = Array(33).fill(chest);
  Object.assign(pts, { 0: head.clone().add(new V3(0, -0.02, 0.08)), 11: SL, 12: SR, 13: EL, 14: ER, 15: WL, 16: WR, 23: HL, 24: HR });
  const poseN = pts.map(P => proj(P)), poseW = pts.map(P => ({ x: P.x - hip.x, y: -(P.y - hip.y), z: -(P.z - hip.z), visibility: 1 }));

  const curl = (Math.sin(t * 1.7) * 0.5 + 0.5) * 1.4;
  const demoHand = (wrist, dir, thumb) => {
    const L = [new V3()];
    [[1, 0.02, 0.02, 0.01], [2, 0.045, 0.045, 0.02], [3, 0.06, 0.07, 0.03], [4, 0.07, 0.09, 0.035]].forEach(([i, x, y, z]) => (L[i] = new V3(x * thumb, y, z)));
    [[5, 0.025], [9, 0.008], [13, -0.01], [17, -0.027]].forEach(([i0, x]) => {
      let p = new V3(x * thumb, 0.08, 0);
      L[i0] = p.clone();
      [0.035, 0.025, 0.02].forEach((len, k) => {
        const a = Math.min(1.5, curl * (k + 1) / 1.5);
        p = p.clone().add(new V3(0, Math.cos(a) * len, Math.sin(a) * len));
        L[i0 + k + 1] = p;
      });
    });
    const q = new Q().setFromUnitVectors(new V3(0, 1, 0), dir);
    const P = L.map(v => v.clone().applyQuaternion(q).add(wrist));
    const c = P.reduce((s, p) => s.add(p), new V3()).divideScalar(P.length);
    return { N: P.map(p => proj(p)), W: P.map(p => ({ x: p.x - c.x, y: -(p.y - c.y), z: -(p.z - c.z) })) };
  };
  const hL = demoHand(WL, fdL, 1), hR = demoHand(WR, fdR, -1);

  const qh = new Q().setFromEuler(new THREE.Euler(0.2 * Math.sin(t * 1.1), 0.45 * Math.sin(t * 0.8), 0.15 * Math.sin(t * 0.6), 'YXZ'));
  const FL = { 33: [-0.046, 0.03, 0.02], 263: [0.046, 0.03, 0.02], 234: [-0.075, 0, -0.03], 454: [0.075, 0, -0.03], 10: [0, 0.09, 0.01], 152: [0, -0.11, 0], 1: [0, -0.01, 0.06] };
  const faceLmk = [];
  for (const [i, v] of Object.entries(FL)) {
    const P = new V3(...v).applyQuaternion(qh).add(head);
    faceLmk[i] = proj(P, -(P.z - head.z) * f / D / vw);
  }
  const cat = (n, s) => ({ categoryName: n, score: s });
  const jaw = Math.max(0, Math.sin(t * 1.6)) * 0.5, blink = (t % 3.2) < 0.2 ? 0.9 : 0.05;
  const smile = Math.max(0, Math.sin(t * 0.5 + 2)) * 0.8, brow = Math.max(0, Math.sin(t * 0.37 + 1)) * 0.9;
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
['head', 'chest', 'arms', 'fingers', 'move'].forEach(k => bindCheck('o-' + k, k));
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
  const raw = DEMO ? demoResults(now / 1000) : detect();
  if (raw) {
    const ddt = clamp((now - lastDetT) / 1000, 1 / 120, 0.2);
    lastDetT = now;
    mpFrame = buildFrame(raw, ddt);
    detCount++;
    drawOverlay(mpFrame);
    status.detecta = `Detecta: cuerpo ${mpFrame.poseN ? ok('sí') : bad('no')} · manos ${mpFrame.handsN.length} · cara ${mpFrame.face ? ok('sí') : bad('no')}`;
  }
  if (rigReady) { updateRoot(mpFrame, dt); updateRig(mpFrame, dt); }
  if (cara && opt.face) {
    if (raw) cara.procesar(mpFrame?.faceRes, now);
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
