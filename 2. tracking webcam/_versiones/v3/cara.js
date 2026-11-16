// Estados de cara de tiesme. Portado de "6. julio/claude/instalacion interactiva 01/test_3d_v1.html".
// Arma la textura UV de la cara en un canvas (base + ojos + cejas + boca) segun los gestos
// que detecta MediaPipe (blendshapes), con la misma calibracion, umbrales y clips de ojos.

const BASE = '/1. tiesme modelo/estados_cara/';
const FEAT = ['jaw', 'pucker', 'smile', 'blink', 'browUp', 'browDown'];
const FPS_CLIP = 30;
const GIRO = 12; // grados de giro de cabeza para cambiar la mirada
const espera = ms => new Promise(r => setTimeout(r, ms));

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('no carga ' + src));
    i.src = src;
  });
}
const bs = (sh, n) => { const c = sh.find(c => c.categoryName === n); return c ? c.score : 0; };
const mid = (a, b) => a + (b - a) * 0.5;

export async function crearCara() {
  const man = await (await fetch(BASE + 'estados.json')).json();
  const S = man.S;
  const load = async (folder, names, ext) =>
    Object.fromEntries(await Promise.all(names.map(async n => [n, await loadImg(`${BASE}${folder}/${encodeURIComponent(n)}.${ext}`)])));
  const [FULL, EYES, MOUTH, BROWS, CLIPS] = await Promise.all([
    load('full', man.full, 'jpg'), load('ojos', man.ojos, 'png'), load('boca', man.boca, 'png'), load('cejas', man.cejas, 'png'),
    Promise.all(man.clips.map(async c => ({
      from: c.from, to: c.to,
      frames: await Promise.all(Array.from({ length: c.n }, (_, k) => loadImg(`${BASE}${c.dir}/${k}.png`))),
    }))),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const uctx = canvas.getContext('2d');

  let eyeState = 'base', mouthState = 'base', browState = 'base';
  let clipActivo = null, clipIdx = 0, clipRev = false, ultFrame = 0;
  let camMouth = 'base', emaBlink = 0, ojosCerrados = false, tCierre = 0;
  let ultimaCara = 0, proxIdle = 0;
  let rawFeat = { jaw: 0, pucker: 0, smile: 0, blink: 0, browUp: 0, browDown: 0 };
  let cal = null;
  try { cal = JSON.parse(localStorage.getItem('tiesmeCal')) || null; } catch { /* sin storage */ }

  // ---- voz (opcional)
  let nivel = 0, ultimaVoz = 0, visTimer = 0, analyser = null, buf = null, umbralVoz = 6;

  function playClip(c, rev) { clipActivo = c; clipRev = !!rev; clipIdx = rev ? c.frames.length - 1 : 0; ultFrame = performance.now(); }
  function clipsDesde(s) { return CLIPS.filter(c => c.from === s).map(c => [c, false]).concat(CLIPS.filter(c => c.to === s).map(c => [c, true])); }
  function goEye(t) {
    if (eyeState === t || clipActivo) return;
    let c = CLIPS.find(c => c.from === eyeState && c.to === t); if (c) return playClip(c, false);
    c = CLIPS.find(c => c.to === eyeState && c.from === t); if (c) return playClip(c, true);
    eyeState = t;
  }

  function umbrales() {
    if (!cal) return null;
    for (const k of ['reposo', 'A', 'E', 'O', 'feliz', 'cerrados', 'cejasUp', 'cejasDown']) if (!cal.s[k]) return null;
    const r = cal.s.reposo, A = cal.s.A, E = cal.s.E, O = cal.s.O, F = cal.s.feliz, C = cal.s.cerrados, CU = cal.s.cejasUp, CD = cal.s.cejasDown;
    return {
      jawA: mid(r.jaw, A.jaw),
      pucker: mid(r.pucker, O.pucker),
      jawEF: mid(F.jaw, E.jaw),
      jawE: mid(r.jaw, E.jaw),
      blinkOn: mid(r.blink, C.blink), blinkOff: r.blink + 0.25 * (C.blink - r.blink),
      blinkSmilePen: Math.max(0, ((E.blink + F.blink) / 2) - r.blink),
      blinkDownPen: Math.max(0, CD.blink - r.blink),
      smileNorm: s => Math.max(0, Math.min(1, (s - r.smile) / Math.max(0.05, F.smile - r.smile))),
      browUp0: r.browUp, browUpR: Math.max(0.05, CU.browUp - r.browUp),
      browDnR: Math.max(0.05, r.browUp - CD.browUp),
    };
  }

  // Recibe el resultado del FaceLandmarker (con blendshapes y matriz) de este frame.
  function procesar(r, ahora) {
    const sh = r?.faceBlendshapes?.[0]?.categories;
    if (sh) {
      ultimaCara = ahora;
      rawFeat = {
        jaw: bs(sh, 'jawOpen'), pucker: bs(sh, 'mouthPucker'),
        smile: (bs(sh, 'mouthSmileLeft') + bs(sh, 'mouthSmileRight')) / 2,
        blink: (bs(sh, 'eyeBlinkLeft') + bs(sh, 'eyeBlinkRight')) / 2,
        browUp: bs(sh, 'browInnerUp'),
        browDown: (bs(sh, 'browDownLeft') + bs(sh, 'browDownRight')) / 2,
      };
      const U = umbrales();
      let yaw = 0, pitch = 0;
      const m = r.facialTransformationMatrixes?.[0]?.data;
      if (m) {
        yaw = Math.atan2(m[8], m[10]) * 180 / Math.PI;
        pitch = Math.asin(Math.max(-1, Math.min(1, -m[9]))) * 180 / Math.PI;
      }
      // jawOpen se infla con la cabeza inclinada/girada: compensar
      const poseN = Math.min(1, Math.abs(pitch) / 22 + Math.abs(yaw) / 30);
      const jawC = Math.max(0, rawFeat.jaw * (1 - 0.45 * poseN) - 0.04 * poseN);
      if (U) {
        const sm = U.smileNorm(rawFeat.smile);
        camMouth = jawC > U.jawA ? 'A'
          : rawFeat.pucker > U.pucker ? 'O'
          : sm > 0.5 ? (jawC > U.jawEF ? 'E' : 'feliz')
          : jawC > U.jawE ? 'E' : 'base';
      } else {
        camMouth = jawC > 0.22 ? 'A' : jawC > 0.1 ? 'E'
          : rawFeat.pucker > 0.35 ? 'O' : (rawFeat.smile > 0.55 && jawC < 0.07) ? 'feliz' : 'base';
      }
      // parpadeo suavizado + histeresis
      let blinkAdj = rawFeat.blink;
      if (U) {
        const smN = U.smileNorm(rawFeat.smile);
        const dnN = Math.max(0, Math.min(1, (U.browUp0 - rawFeat.browUp) / U.browDnR));
        blinkAdj -= U.blinkSmilePen * smN + U.blinkDownPen * dnN;
      }
      emaBlink = blinkAdj > emaBlink ? emaBlink * 0.5 + blinkAdj * 0.5 : emaBlink * 0.3 + blinkAdj * 0.7;
      const on = U ? U.blinkOn : 0.35, off = U ? U.blinkOff : 0.25;
      if (!ojosCerrados && emaBlink > on) { ojosCerrados = true; tCierre = ahora; }
      else if (ojosCerrados && (emaBlink < off || (ahora - tCierre > 350 && emaBlink < on))) ojosCerrados = false;
      // cejas
      let up = 0, down = 0;
      const rS = cal && cal.s.reposo, sS = cal && cal.s.sorpresa;
      if (rS && sS) {
        let num = 0, den = 0;
        for (const f of FEAT) {
          const d = sS[f] - rS[f];
          if (Math.abs(d) < 0.08) continue;
          num += Math.abs(d) * Math.max(0, Math.min(1, (rawFeat[f] - rS[f]) / d));
          den += Math.abs(d);
        }
        up = den ? num / den : 0;
      } else if (U) up = (rawFeat.browUp - U.browUp0) / U.browUpR;
      else up = (rawFeat.browUp - 0.2) / 0.5;
      if (U) { const smN = U.smileNorm(rawFeat.smile); down = Math.max(0, (U.browUp0 - rawFeat.browUp) / U.browDnR) * (1 - smN); }
      else down = Math.max(0, (rawFeat.browDown - 0.2) / 0.5);
      up = Math.max(0, Math.min(1, up)); down = Math.max(0, Math.min(1, down));
      if (browState !== 'up' && up > 0.52) browState = 'up';
      else if (browState !== 'down' && down > 0.6 && up < 0.2) browState = 'down';
      else if (browState !== 'base' && up < 0.45 && down < 0.35) browState = 'base';
      // mirada por giro de cabeza
      if (ojosCerrados) { if (!clipActivo) eyeState = 'ojoscerrados'; }
      else if (browState === 'up') goEye('sorpresa');
      else if (yaw < -GIRO) goEye('sospecha');
      else if (yaw > GIRO) goEye('preocupacion');
      else if (pitch > GIRO * 0.8) goEye('sorpresa');
      else goEye('base');
    }
    // boca: si hay voz manda la voz, si no la camara
    if (analyser && nivel > umbralVoz) {
      ultimaVoz = ahora;
      if (ahora - visTimer > 90 + Math.random() * 50) {
        mouthState = nivel > umbralVoz * 2.5 ? 'A' : (Math.random() < 0.5 ? 'E' : 'O');
        visTimer = ahora;
      }
    } else if (ahora - ultimaVoz > 150) {
      mouthState = ahora - ultimaCara < 500 ? camMouth : 'base';
    }
    if (ahora - ultimaCara > 500) browState = 'base';
  }

  // Dibuja la textura del frame. Sin cara detectada, los ojos se mueven solos ("ojos vivos").
  function render(t) {
    if (analyser) {
      analyser.getByteTimeDomainData(buf);
      let sum = 0; for (const v of buf) sum += (v - 128) ** 2;
      nivel = Math.sqrt(sum / buf.length);
    }
    if (t - ultimaCara > 1500 && !clipActivo && t > proxIdle) {
      proxIdle = t + 1400 * (0.5 + Math.random());
      const ops = clipsDesde(eyeState);
      if (ops.length) { const [c, rev] = ops[Math.random() * ops.length | 0]; playClip(c, rev); }
      else eyeState = 'base';
    }
    uctx.drawImage(FULL.base, 0, 0, S, S);
    let eimg = EYES[eyeState];
    if (clipActivo) {
      if (t - ultFrame >= 1000 / FPS_CLIP) {
        clipIdx += clipRev ? -1 : 1; ultFrame = t;
        if (clipIdx < 0 || clipIdx >= clipActivo.frames.length) { eyeState = clipRev ? clipActivo.from : clipActivo.to; clipActivo = null; }
      }
      if (clipActivo) eimg = clipActivo.frames[Math.max(0, Math.min(clipIdx, clipActivo.frames.length - 1))];
    }
    if (eimg) uctx.drawImage(eimg, man.E_POS[0], man.E_POS[1]);
    let bimg = null;
    if (!clipActivo) {
      if (browState === 'up' && eyeState !== 'sorpresa') bimg = BROWS.up;
      else if (browState === 'down' && eyeState !== 'preocupacion') bimg = BROWS.down;
    }
    if (bimg) uctx.drawImage(bimg, man.B_POS[0], man.B_POS[1]);
    const mimg = MOUTH[mouthState];
    if (mimg) uctx.drawImage(mimg, man.M_POS[0], man.M_POS[1]);
  }

  // Calibracion de gestos (igual que en julio): 9 pasos con cuenta regresiva.
  async function calibrar(ui) {
    const pasos = [['reposo', 'Cara en reposo, ojos abiertos'], ['A', 'Boca bien abierta — A'],
      ['E', 'Boca entreabierta — E'], ['O', 'Labios fruncidos — O'], ['feliz', 'Sonreí grande'],
      ['cerrados', 'Cerrá los ojos'], ['cejasUp', 'Cejas bien arriba'], ['cejasDown', 'Ceño fruncido, cejas abajo'],
      ['sorpresa', 'Cara de SORPRESA: cejas arriba + boca abierta']];
    const nuevo = { s: {} };
    ui.mostrar(true);
    for (const [id, label] of pasos) {
      ui.paso(label);
      for (let c = 3; c > 0; c--) { ui.cuenta(c); await espera(700); }
      ui.cuenta('●');
      const acc = Object.fromEntries(FEAT.map(f => [f, 0])), N = 20;
      for (let i = 0; i < N; i++) { for (const f of FEAT) acc[f] += rawFeat[f]; await espera(90); }
      nuevo.s[id] = Object.fromEntries(FEAT.map(f => [f, +(acc[f] / N).toFixed(3)]));
    }
    ui.mostrar(false);
    cal = nuevo;
    try { localStorage.setItem('tiesmeCal', JSON.stringify(cal)); } catch { /* sin storage */ }
  }

  async function setVoz(on) {
    if (!on) { analyser = null; nivel = 0; return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const ac = new AudioContext();
    analyser = ac.createAnalyser();
    ac.createMediaStreamSource(stream).connect(analyser);
    buf = new Uint8Array(analyser.fftSize);
  }

  return {
    canvas, render, procesar, calibrar, setVoz,
    setUmbralVoz: v => { umbralVoz = v; },
    calibrada: () => !!umbrales(),
    estado: () => `ojos ${clipActivo ? 'clip' : eyeState} · boca ${mouthState} · cejas ${browState}` + (analyser ? ` · voz ${nivel.toFixed(0)}` : ''),
  };
}
