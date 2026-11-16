// Tracking tiesme: webcam -> MediaPipe (cuerpo, manos, cara) -> huesos Mixamo del FBX en three.js.
// Retargeting por direcciones: cada hueso apunta hacia donde indican los puntos detectados,
// partiendo de la pose de reposo del rig, asi funciona sea T-pose o A-pose.

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

const opt = { mirror: true, head: true, chest: true, arms: true, fingers: true, smooth: 0.6 };

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const video = $('video'), overlay = $('overlay'), camBox = $('cam'), panel = $('panel');
const status = { modelo: '…', camara: DEMO ? 'demo' : '…', mediapipe: DEMO ? 'demo' : '…', detecta: '' };
function setStatus(k, v) { status[k] = v; renderStatus(); }
function renderStatus() {
  $('estado').innerHTML =
    `Modelo: ${status.modelo}\nCámara: ${status.camara}\nMediaPipe: ${status.mediapipe}` +
    (status.detecta ? `\n${status.detecta}` : '');
}
const ok = s => `<span class="ok">${s}</span>`;
const bad = s => `<span class="bad">${s}</span>`;

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
  return m;
}

const bones = {};
const B = name => bones[name.toLowerCase()];
const wpos = name => B(name).getWorldPosition(new THREE.Vector3());
const holder = new THREE.Group();
scene.add(holder);

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
  if (wpos('head').y < wpos('hips').y) console.warn('El modelo parece estar de cabeza: revisar ejes del FBX');

  setupRig();
  frameView();
  window.__tiesme = { fbx, bones, rig, opt };
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
    W0: bone.getWorldQuaternion(new THREE.Quaternion()),
    P0inv: bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert(),
  };
  if (childName && B(childName)) r.dir0 = wpos(childName).sub(wpos(name)).normalize();
  return (rig[name] = r);
}

function frameQuat(xv, yv) {
  const X = xv.clone().normalize();
  const Y = yv.clone().addScaledVector(X, -yv.dot(X)).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}

function setupRig() {
  ['spine', 'spine1', 'spine2', 'neck', 'head'].forEach(n => rec(n));
  for (const S of ['left', 'right']) {
    rec(S + 'arm', S + 'forearm');
    rec(S + 'forearm', S + 'hand');
    const h = rec(S + 'hand');
    if (h && B(S + 'handmiddle1') && B(S + 'handindex1') && B(S + 'handpinky1')) {
      const fwd = wpos(S + 'handmiddle1').sub(wpos(S + 'hand'));
      const side = wpos(S + 'handindex1').sub(wpos(S + 'handpinky1'));
      h.F0inv = frameQuat(fwd, side).invert();
    }
    for (const f of Object.keys(FINGERS)) for (let i = 1; i <= 3; i++) rec(`${S}hand${f}${i}`, `${S}hand${f}${i + 1}`);
  }
}

const parentW = r => r.bone.parent.getWorldQuaternion(new THREE.Quaternion());

// Lleva el hueso hacia una orientacion de mundo, suavizado.
function driveWorld(r, Wt, a) {
  if (!r) return;
  r.bone.quaternion.slerp(parentW(r).invert().multiply(Wt), a);
}
// Orientacion de mundo que apunta el hueso hacia d con el minimo giro respecto de su padre.
function aimTarget(r, d) {
  const dp = parentW(r).multiply(r.P0inv);
  const inherited = r.dir0.clone().applyQuaternion(dp);
  return new THREE.Quaternion().setFromUnitVectors(inherited, d).multiply(dp).multiply(r.W0);
}
function relax(r, a) { if (r) r.bone.quaternion.slerp(r.L0, a); }
function twistAbout(q, axis) {
  const p = axis.x * q.x + axis.y * q.y + axis.z * q.z;
  const t = new THREE.Quaternion(axis.x * p, axis.y * p, axis.z * p, q.w);
  return t.length() < 1e-6 ? new THREE.Quaternion() : t.normalize();
}

let chestNeutralInv = new THREE.Quaternion(), headNeutralInv = new THREE.Quaternion();
let lastChestRaw = null, lastHeadRaw = null;

const vis = (arr, i) => (arr && arr[i]) ? (arr[i].visibility ?? 1) : 0;

function updateRig(fd, dt) {
  const a = 1 - Math.pow(opt.smooth, dt * 60);
  const sx = opt.mirror ? -1 : 1;
  // MediaPipe: x derecha, y abajo, z lejos de camara  ->  three: x derecha, y arriba, z hacia camara
  const W = lm => new THREE.Vector3(sx * lm.x, -lm.y, -lm.z);
  const pw = fd?.poseW, pn = fd?.poseN;

  // Pecho: eje hombro-hombro + vertical (o cadera si se ve).
  let Dc = new THREE.Quaternion();
  lastChestRaw = null;
  if (opt.chest && pw && vis(pn, 11) > 0.5 && vis(pn, 12) > 0.5) {
    const left = W(pw[11]).sub(W(pw[12]));
    if (left.x < 0) left.negate();
    const up = new THREE.Vector3(0, 1, 0);
    if (vis(pn, 23) > 0.5 && vis(pn, 24) > 0.5) {
      const midS = W(pw[11]).add(W(pw[12])).multiplyScalar(0.5);
      const midH = W(pw[23]).add(W(pw[24])).multiplyScalar(0.5);
      up.lerp(midS.sub(midH).normalize(), 0.5);
    }
    lastChestRaw = frameQuat(left, up);
    Dc = lastChestRaw.clone().multiply(chestNeutralInv);
  }
  ['spine', 'spine1', 'spine2'].forEach((n, i) => {
    const r = rig[n];
    if (r) driveWorld(r, new THREE.Quaternion().slerp(Dc, (i + 1) / 3).multiply(r.W0), a);
  });

  // Cabeza: mejillas (234/454), frente (10) y menton (152) de la malla de la cara.
  let Dh = Dc.clone();
  lastHeadRaw = null;
  if (opt.head && fd?.face) {
    const f = fd.face;
    const F = i => new THREE.Vector3(sx * (f[i].x - 0.5) * fd.vw, -(f[i].y - 0.5) * fd.vh, -f[i].z * fd.vw);
    const left = F(454).sub(F(234));
    if (left.x < 0) left.negate();
    lastHeadRaw = frameQuat(left, F(10).sub(F(152)));
    Dh = lastHeadRaw.clone().multiply(headNeutralInv);
  }
  if (rig.neck) driveWorld(rig.neck, Dc.clone().slerp(Dh, 0.5).multiply(rig.neck.W0), a);
  if (rig.head) driveWorld(rig.head, Dh.clone().multiply(rig.head.W0), a);

  // Brazos, manos y dedos. En espejo, el brazo izquierdo del personaje sigue tu brazo derecho.
  const ARM = { left: [11, 13, 15], right: [12, 14, 16] };
  for (const S of ['left', 'right']) {
    const U = opt.mirror ? (S === 'left' ? 'right' : 'left') : S;
    const [s, e, w] = ARM[U];
    const sign = S === 'left' ? 1 : -1;
    const up = rig[S + 'arm'], fo = rig[S + 'forearm'], ha = rig[S + 'hand'];
    if (!up || !fo) continue;

    let d1, d2;
    if (opt.arms && pw && vis(pn, s) > 0.5 && vis(pn, e) > 0.45) {
      d1 = W(pw[e]).sub(W(pw[s])).normalize();
      d2 = vis(pn, w) > 0.45 ? W(pw[w]).sub(W(pw[e])).normalize() : d1.clone();
    } else {
      // Sin brazo visible: brazos relajados abajo.
      d1 = new THREE.Vector3(sign * 0.22, -1, 0.05).normalize();
      d2 = new THREE.Vector3(sign * 0.08, -1, 0.3).normalize();
    }
    driveWorld(up, aimTarget(up, d1), a);

    const hw = opt.fingers ? fd?.handsUser?.[U] : null;
    const P = hw ? hw.map(W) : null;
    let Wf = aimTarget(fo, d2), Wh = null;
    if (P && ha?.F0inv) {
      const Ft = frameQuat(P[9].clone().sub(P[0]), P[5].clone().sub(P[17]));
      Wh = Ft.multiply(ha.F0inv).multiply(ha.W0);
      // Repartir el giro de muneca con el antebrazo para que no se "retuerza" la malla.
      const corr = Wh.clone().multiply(Wf.clone().multiply(ha.L0).invert());
      Wf = new THREE.Quaternion().slerp(twistAbout(corr, d2), 0.5).multiply(Wf);
    }
    driveWorld(fo, Wf, a);
    if (Wh) driveWorld(ha, Wh, a); else relax(ha, a * 0.5);

    for (const [fname, idx] of Object.entries(FINGERS)) {
      for (let i = 0; i < 3; i++) {
        const r = rig[`${S}hand${fname}${i + 1}`];
        if (!r || !r.dir0) continue;
        if (P) driveWorld(r, aimTarget(r, P[idx[i + 1]].clone().sub(P[idx[i]]).normalize()), a);
        else relax(r, a * 0.5);
      }
    }
  }
}

function calibrate() {
  chestNeutralInv = lastChestRaw ? lastChestRaw.clone().invert() : new THREE.Quaternion();
  headNeutralInv = lastHeadRaw ? lastHeadRaw.clone().invert() : new THREE.Quaternion();
  flash(lastChestRaw || lastHeadRaw ? 'Postura neutra calibrada' : 'Calibración reseteada (no se detecta cuerpo/cara)');
}

function frameView() {
  const hips = wpos('hips');
  const top = B('headtopend') ? wpos('headtopend') : wpos('head');
  const h = top.y - hips.y;
  const target = new THREE.Vector3(hips.x, hips.y + h * 0.55, hips.z);
  const dist = (h * 1.7) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  camera.position.set(target.x, target.y, target.z + dist);
  camera.near = h / 200; camera.far = h * 200;
  camera.updateProjectionMatrix();
  controls.target.copy(target);
  controls.update();
}

// ---------- MediaPipe ----------
let poseLm = null, handLm = null, faceLm = null, mpResult = null, lastVideoTime = -1;
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
    make(FaceLandmarker, MP_MODELS.face, { numFaces: 1 }),
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
  const cands = res.worldLandmarks.map((wl, i) => {
    const wrist = res.landmarks[i][0];
    if (poseN) {
      const dl = dist2(wrist, poseN[15]), dr = dist2(wrist, poseN[16]);
      return { wl, side: dl < dr ? 'left' : 'right', d: Math.min(dl, dr) };
    }
    // MediaPipe etiqueta las manos asumiendo imagen espejada.
    const label = res.handedness?.[i]?.[0]?.categoryName;
    return { wl, side: label === 'Left' ? 'right' : 'left', d: 0 };
  }).sort((p, q) => p.d - q.d);
  for (const c of cands) {
    const other = c.side === 'left' ? 'right' : 'left';
    if (!out[c.side]) out[c.side] = c.wl; else if (!out[other]) out[other] = c.wl;
  }
  return out;
}

function detect() {
  if (!poseLm || video.readyState < 2 || video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;
  const ts = performance.now();
  const pose = poseLm.detectForVideo(video, ts);
  const hands = handLm.detectForVideo(video, ts);
  const face = faceLm.detectForVideo(video, ts);
  const poseN = pose.landmarks?.[0] || null;
  mpResult = {
    poseW: pose.worldLandmarks?.[0] || null,
    poseN,
    face: face.faceLandmarks?.[0] || null,
    vw: video.videoWidth, vh: video.videoHeight,
    handsUser: assignHands(hands, poseN),
    handsN: hands.landmarks || [],
  };
  detCount++;
  drawOverlay(mpResult);
  status.detecta = `Detecta: cuerpo ${poseN ? ok('sí') : bad('no')} · manos ${mpResult.handsN.length} · cara ${mpResult.face ? ok('sí') : bad('no')}`;
}

function drawOverlay(r) {
  if (camBox.classList.contains('oculto')) return;
  const c = overlay, ctx = c.getContext('2d');
  if (c.width !== r.vw) { c.width = r.vw; c.height = r.vh; }
  ctx.clearRect(0, 0, c.width, c.height);
  const pt = p => [p.x * c.width, p.y * c.height];
  const line = (p, q, col) => { ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(...pt(p)); ctx.lineTo(...pt(q)); ctx.stroke(); };
  const dot = (p, col, rad) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(...pt(p), rad, 0, 7); ctx.fill(); };
  if (r.poseN) {
    for (const [i, j] of [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]]) line(r.poseN[i], r.poseN[j], '#4fc3f7');
  }
  for (const h of r.handsN) for (const p of h) dot(p, '#ffd54f', 4);
  if (r.face) for (const i of [10, 152, 234, 454, 1]) dot(r.face[i], '#ef5350', 6);
}

// ---------- Demo sin camara (para probar el rig) ----------
function demoFrame(t) {
  const poseW = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
  const poseN = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  const put = (i, v) => { poseW[i] = { x: v[0], y: v[1], z: v[2], visibility: 1 }; }; // coords MediaPipe
  const tw = 0.35 * Math.sin(t * 0.7);
  const rot = (x, z) => [x * Math.cos(tw) + z * Math.sin(tw), -x * Math.sin(tw) + z * Math.cos(tw)];
  const [lx, lz] = rot(0.17, 0), [rx, rz] = rot(-0.17, 0);
  put(11, [lx, -0.5, lz]); put(12, [rx, -0.5, rz]); put(23, [0.1, 0, 0]); put(24, [-0.1, 0, 0]);
  // Brazo izquierdo del usuario: sube por el costado y flexiona el codo.
  const th = (Math.sin(t * 1.3) * 0.5 + 0.5) * Math.PI * 0.9, th2 = th + 0.7 * (Math.sin(t * 2.1) * 0.5 + 0.5);
  const e = [lx + 0.28 * Math.sin(th), -0.5 + 0.28 * Math.cos(th), lz];
  const w = [e[0] + 0.25 * Math.sin(th2), e[1] + 0.25 * Math.cos(th2), e[2]];
  put(13, e); put(15, w);
  // Brazo derecho del usuario: se estira hacia la camara.
  const ph = (Math.sin(t * 0.9) * 0.5 + 0.5) * Math.PI * 0.5;
  const e2 = [rx - 0.05, -0.5 + 0.28 * Math.cos(ph), rz - 0.28 * Math.sin(ph)];
  put(14, e2); put(16, [e2[0], e2[1] + 0.25 * Math.cos(ph + 0.8), e2[2] - 0.25 * Math.sin(ph + 0.8)]);

  // Cara: puntos en espacio three (x der, y arriba, z hacia camara) -> normalizados MediaPipe.
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25 * Math.sin(t * 1.1), 0.5 * Math.sin(t * 0.8), 0.2 * Math.sin(t * 0.6), 'YXZ'));
  const face = [];
  const fp = (i, x, y) => { const v = new THREE.Vector3(x, y, 0).applyQuaternion(q); face[i] = { x: 0.5 + v.x / 1000, y: 0.35 - v.y / 1000, z: -v.z / 1000 }; };
  fp(234, -80, 0); fp(454, 80, 0); fp(10, 0, 110); fp(152, 0, -110);

  // Mano izquierda del usuario: palma a camara, dedos que se cierran; orientada con el antebrazo.
  const curl = (Math.sin(t * 1.7) * 0.5 + 0.5) * 1.4;
  const local = [];
  local[0] = new THREE.Vector3(0, 0, 0);
  [[1, 0.02, 0.02, 0.01], [2, 0.045, 0.045, 0.02], [3, 0.06, 0.07, 0.03], [4, 0.07, 0.09, 0.035]].forEach(([i, x, y, z]) => (local[i] = new THREE.Vector3(x, y, z)));
  [[5, 0.025], [9, 0.008], [13, -0.01], [17, -0.027]].forEach(([i0, x]) => {
    let p = new THREE.Vector3(x, 0.08, 0);
    local[i0] = p.clone();
    [0.035, 0.025, 0.02].forEach((len, k) => {
      const ang = curl * (k + 1) / 1.5;
      p = p.clone().add(new THREE.Vector3(0, Math.cos(Math.min(ang, 1.5)) * len, Math.sin(Math.min(ang, 1.5)) * len));
      local[i0 + k + 1] = p;
    });
  });
  const fdir = new THREE.Vector3(w[0] - e[0], -(w[1] - e[1]), -(w[2] - e[2])).normalize();
  const hq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), fdir);
  const handL = local.map(v => { const g = v.clone().applyQuaternion(hq); return { x: g.x, y: -g.y, z: -g.z }; });

  return { poseW, poseN, face, vw: 1000, vh: 1000, handsUser: { left: handL, right: null }, handsN: [] };
}

// ---------- UI ----------
function flash(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, { position: 'fixed', left: '50%', top: '16px', transform: 'translateX(-50%)', background: '#2d3240', padding: '6px 14px', borderRadius: '6px' });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}
function bindCheck(id, key, after) {
  const el = $(id);
  el.checked = opt[key];
  el.addEventListener('change', () => { opt[key] = el.checked; after?.(); });
}
const applyMirror = () => camBox.classList.toggle('espejo', opt.mirror);
bindCheck('o-mirror', 'mirror', applyMirror);
bindCheck('o-head', 'head'); bindCheck('o-chest', 'chest'); bindCheck('o-arms', 'arms'); bindCheck('o-fingers', 'fingers');
$('o-smooth').addEventListener('input', e => { opt.smooth = +e.target.value; $('v-smooth').textContent = opt.smooth.toFixed(2); });
$('b-calib').onclick = calibrate;
$('b-view').onclick = () => B('hips') && frameView();
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'c') calibrate();
  else if (k === 'r' && B('hips')) frameView();
  else if (k === 'm') { opt.mirror = !opt.mirror; $('o-mirror').checked = opt.mirror; applyMirror(); }
  else if (k === 'h') panel.classList.toggle('oculto');
  else if (k === 'v') camBox.classList.toggle('oculto');
  else if (k === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});

// ---------- Loop ----------
let last = performance.now(), frames = 0, fpsT = last, rigReady = false;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  let fd = null;
  if (DEMO) fd = demoFrame(now / 1000);
  else { detect(); fd = mpResult; }
  if (rigReady) updateRig(fd, dt);
  controls.update();
  renderer.render(scene, camera);
  frames++;
  if (now - fpsT > 1000) {
    detFps = detCount; detCount = 0;
    $('fps').textContent = DEMO ? `${frames} fps` : `${frames} fps · tracking ${detFps}`;
    frames = 0; fpsT = now;
    renderStatus();
  }
}

// ---------- Inicio ----------
renderStatus();
requestAnimationFrame(loop);
if (DEMO) { $('demo').style.display = 'block'; camBox.classList.add('oculto'); }

loadModel()
  .then(() => { rigReady = true; setStatus('modelo', ok('ok')); })
  .catch(err => { console.error(err); setStatus('modelo', bad('error: ' + err.message)); });

if (!DEMO) {
  startCamera().catch(err => { console.error(err); setStatus('camara', bad('sin acceso (' + err.name + ')')); });
  initVision().catch(err => { console.error(err); setStatus('mediapipe', bad('error: ' + err.message)); });
}
