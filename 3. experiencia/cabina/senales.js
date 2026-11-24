// Lo que la cámara mide de la persona, para el director: si está, si está entrando, dónde está, la cabeza, las manos,
// el saludo, la cara (boca, sonrisa, ojos, cejas), si mira a la pantalla, cuánto se mueve, y poses simples.
// Sale de lo que ya calcula el motor del tracking (puntos del cuerpo de MediaPipe, blendshapes de la cara y el giro
// de la cabeza). Los UMBRALES están juntos acá abajo para afinarlos mirando el panel D.

export const UMBRAL = {
  giroCabeza: 25,      // grados de giro de la cabeza para "mirá para un costado"
  inclinar: 14,        // grados de inclinación para "inclinate de costado"
  boca: 0.38,          // jawOpen
  sonrisa: 0.5,        // promedio de mouthSmile
  ojos: 0.5,           // promedio de eyeBlink
  cejas: 0.2,          // cuánto suben las cejas por encima de lo normal de esa persona
  quieto: 0.5,         // movimiento (anchos de hombro por segundo, + giro de cabeza) por debajo: "quieto". Medido en B2: quieto 0,06–0,3; aplaudir 0,6–1,2; caminar 1,4–2,7
  mira: { giro: 22, cabeceo: 25 },
  sostener: 0.25,      // segundos que tiene que durar algo para contarlo
  // v0.7 golpe al vidrio: avance = metros que la muñeca pasa por delante del hombro (mínimo); salto = cuánto tiene que
  // subir de golpe respecto de medio segundo antes. Si no toma los golpes, bajar el salto; si cuenta de más, subirlo.
  // SIN PROBAR con un golpe de verdad (no hay grabaciones de ese gesto): afinar con la cámara mirando el panel D.
  // cerca = a cuántos anchos de hombro del hombro, en la imagen, tiene que quedar la mano (más lejos es saludar o levantarla).
  golpe: { avance: 0.3, salto: 0.13, cerca: 1.0 },
};

const bs = (cats, n) => cats.find(c => c.categoryName === n)?.score ?? 0;
const vis = (p, i) => p?.[i]?.visibility ?? 0;

export function crearSenales(api) {
  const { THREE } = api;
  const S = {
    presente: false, entrando: false, vistoHace: 99, x: 0,
    cabeza: { ok: false, hay: false, yaw: 0, pitch: 0, roll: 0 },
    cara: { ok: false, jaw: 0, smile: 0, blink: 0, brow: 0, browBase: null, cejasArriba: false },
    manos: { izq: false, der: false }, manosArriba: false, unaArriba: false, cruz: false, saludo: false,
    mira: false, mov: 0, quieto: true, quietoSeg: 0,
    mano: { ok: false, x: 0.5, y: 0.5, perdida: 0 }, // v0.2: puntero (0 a 1 sobre la imagen)
    // v0.7: golpes con la palma hacia la pantalla (n = cuántos van; avance y salto = lo que se ve en el panel D)
    golpe: { n: 0, avance: 0, salto: 0, hace: 99, manos: [{ av: 0, lento: 0, vista: 0, armada: false }, { av: 0, lento: 0, vista: 0, armada: false }] },
  };
  const prev = {}; let sw = 0.2, tPrev = 0, caraVista = false, prevCab = null;
  const hist = { izq: [], der: [] };
  const sost = {}; // tiempo que lleva cumpliéndose cada detección
  let t = 0, miraT = 0;

  function actualizar(dt, fd, engaged) {
    t += dt;
    S.presente = engaged;
    // cabeza (giro respecto de su postura neutra; en espejo, como tiesme). "hay" = se estima (con la cara o, si se
    // pierde la malla al girar mucho, con orejas/ojos del cuerpo); "ok" = ademas se ve la cara.
    const q = api.cabezaRel();
    S.cabeza.hay = !!q;
    if (q) {
      const e = new THREE.Euler().setFromQuaternion(q, 'YXZ'), D = 180 / Math.PI;
      S.cabeza.pitch = e.x * D; S.cabeza.yaw = e.y * D; S.cabeza.roll = e.z * D;
    }
    if (fd) {
      const pn = fd.poseN;
      const hombros = pn && vis(pn, 11) > 0.5 && vis(pn, 12) > 0.5;
      S.vistoHace = hombros ? 0 : S.vistoHace + dt;
      if (hombros) {
        const px = p => ({ x: p.x * fd.vw, y: p.y * fd.vh });
        const L = px(pn[11]), R = px(pn[12]), N = px(pn[0]);
        sw = Math.max(20, Math.hypot(L.x - R.x, L.y - R.y));
        // donde esta, en la tele (espejo): -1 borde izquierdo de la franja, +1 borde derecho
        const half = (9 / 16) * fd.vh / fd.vw / 2, cx = (pn[11].x + pn[12].x) / 2;
        S.x = Math.max(-1.5, Math.min(1.5, ((api.opt.mirror ? 1 - cx : cx) - 0.5) / half));
        // manos (de la persona: 15 = su muñeca izquierda, 16 = la derecha)
        const sh = (L.y + R.y) / 2;
        const arriba = i => vis(pn, i) > 0.4 && px(pn[i]).y < N.y - 0.15 * sw;
        S.manos.izq = arriba(15); S.manos.der = arriba(16);
        S.manosArriba = S.manos.izq && S.manos.der;
        const abajo = i => vis(pn, i) < 0.4 || px(pn[i]).y > sh + 0.3 * sw;
        S.unaArriba = (S.manos.izq && abajo(16)) || (S.manos.der && abajo(15));
        const wl = px(pn[15]), wr = px(pn[16]);
        S.cruz = vis(pn, 15) > 0.4 && vis(pn, 16) > 0.4 && Math.abs(wl.y - sh) < 0.7 * sw && Math.abs(wr.y - sh) < 0.7 * sw && Math.abs(wl.x - wr.x) > 2.4 * sw;
        // saludo: muñeca arriba del hombro que va y viene de costado
        S.saludo = false;
        for (const [lado, i] of [['izq', 15], ['der', 16]]) {
          const h = hist[lado], w = px(pn[i]);
          if (vis(pn, i) > 0.4 && w.y < sh) h.push([t, w.x / sw]); else h.length = 0;
          while (h.length && t - h[0][0] > 1.6) h.shift();
          let cambios = 0, dir = 0, ext = h[0]?.[1] ?? 0;
          for (const [, x] of h) {
            const d = x - ext;
            if (Math.abs(d) > 0.18) { const nd = Math.sign(d); if (dir && nd !== dir) cambios++; dir = nd; ext = x; }
            else if (dir && Math.sign(d) === dir) ext = x;
          }
          if (cambios >= 2) S.saludo = true;
        }
        // v0.2 PUNTERO: la mano más alta mueve un punto en la pantalla. Zona cómoda alrededor de los hombros (como los
        // juegos de Kinect): de 1,5 anchos de hombro a cada lado y desde 1,7 arriba del hombro hasta 1 abajo.
        {
          const cxh = (L.x + R.x) / 2;
          let mej = null;
          for (const [i, j] of [[15, 19], [16, 20]]) {
            if (vis(pn, i) < 0.4) continue;
            const w = px(pn[i]), f = vis(pn, j) > 0.4 ? px(pn[j]) : w, p = { x: (w.x + f.x) / 2, y: (w.y + f.y) / 2 };
            if (p.y > sh + 1.4 * sw) continue; // mano baja: no apunta
            if (!mej || p.y < mej.y) mej = p;
          }
          const M = S.mano;
          if (mej) {
            let u = (mej.x - cxh) / (3 * sw) + 0.5, v = (mej.y - (sh - 1.7 * sw)) / (2.7 * sw);
            if (api.opt.mirror) u = 1 - u;
            u = Math.max(0, Math.min(1, u)); v = Math.max(0, Math.min(1, v));
            const k = M.ok ? Math.min(1, dt / 0.12) : 1;
            M.x += (u - M.x) * k; M.y += (v - M.y) * k; M.ok = true; M.perdida = 0;
          } else if ((M.perdida += dt) > 0.4) M.ok = false;
        }
        // v0.7 GOLPE: empujar la palma hacia la pantalla. Se mide cuánto pasa la muñeca por delante de su hombro (en
        // metros, de los puntos 3D del cuerpo) y cuenta un golpe cuando ese avance sube rápido y pasa UMBRAL.golpe.
        // Para el siguiente hay que volver a traer la mano (baja de la mitad del umbral).
        // Cada mano se mide aparte. Con los brazos quietos el avance ya da 0,25–0,35 (medido con una partida del 22/11:
        // MediaPipe pone las muñecas adelante), así que lo que cuenta es el SALTO respecto de medio segundo antes. Una
        // mano que recién aparece no cuenta (tiene que llevar un rato a la vista).
        {
          const G = S.golpe, pw = fd.poseW;
          G.hace += dt; G.avance = 0; G.salto = 0;
          for (const [k, h, m] of [[0, 11, 15], [1, 12, 16]]) {
            const M = G.manos[k];
            if (!pw || vis(pn, m) < 0.4) { M.vista = 0; M.armada = false; continue; }
            const av = pw[h].z - pw[m].z;
            if (M.vista === 0) { M.av = av; M.lento = av; }
            M.vista += dt;
            M.av += (av - M.av) * Math.min(1, dt / 0.06);
            M.lento += (M.av - M.lento) * Math.min(1, dt / 0.5);
            const salto = M.av - M.lento;
            // un golpe hacia la pantalla termina con la mano delante del hombro (en la imagen, cerca de él); levantar la
            // mano o saludar la lleva lejos del hombro: eso no cuenta (medido: saludando contaba golpes de más)
            const hp = px(pn[h]), mp = px(pn[m]), cerca = Math.hypot(mp.x - hp.x, mp.y - hp.y) < UMBRAL.golpe.cerca * sw;
            if (M.armada && cerca && M.vista > 0.4 && M.av > UMBRAL.golpe.avance && salto > UMBRAL.golpe.salto && G.hace > 0.45) { G.n++; G.hace = 0; M.armada = false; }
            else if (!M.armada && salto < UMBRAL.golpe.salto * 0.3) M.armada = true;
            if (M.av > G.avance) G.avance = M.av;
            if (salto > G.salto) G.salto = salto;
          }
        }
        // movimiento: velocidad media de nariz, hombros, codos y muñecas (en anchos de hombro por segundo)
        let suma = 0, n = 0;
        for (const i of [0, 11, 12, 13, 14, 15, 16]) {
          if (vis(pn, i) < 0.5) continue;
          const p = px(pn[i]);
          if (prev[i]) { suma += Math.hypot(p.x - prev[i].x, p.y - prev[i].y) / sw; n++; }
          prev[i] = p;
        }
        const ddt = Math.max(t - tPrev, 1 / 60); // tiempo desde la deteccion anterior (no desde el cuadro anterior)
        // + lo que gira la cabeza (45°/s cuenta como 1): mover solo la cabeza no es estar quieto
        const c = S.cabeza, pc = prevCab;
        const cabVel = c.hay && pc ? (Math.abs(c.yaw - pc.yaw) + Math.abs(c.pitch - pc.pitch) + Math.abs(c.roll - pc.roll)) / ddt : 0;
        prevCab = c.hay ? { yaw: c.yaw, pitch: c.pitch, roll: c.roll } : null;
        if (n) S.mov += ((suma / n) / ddt + cabVel / 45 - S.mov) * Math.min(1, ddt / 0.3);
        tPrev = t;
      } else { for (const k of Object.keys(prev)) delete prev[k]; S.mov = 0; prevCab = null; if ((S.mano.perdida += dt) > 0.4) S.mano.ok = false; }
      caraVista = !!fd.face;
      S.entrando = !engaged && S.vistoHace < 0.5;

      // cara
      const cats = fd.face && fd.occ < 0.3 ? fd.faceRes?.faceBlendshapes?.[0]?.categories : null;
      S.cara.ok = !!cats;
      if (cats) {
        const k = Math.min(1, dt / 0.08), c = S.cara;
        c.jaw += (bs(cats, 'jawOpen') - c.jaw) * k;
        c.smile += ((bs(cats, 'mouthSmileLeft') + bs(cats, 'mouthSmileRight')) / 2 - c.smile) * k;
        c.blink += ((bs(cats, 'eyeBlinkLeft') + bs(cats, 'eyeBlinkRight')) / 2 - c.blink) * k;
        const brow = (bs(cats, 'browInnerUp') * 2 + bs(cats, 'browOuterUpLeft') + bs(cats, 'browOuterUpRight')) / 4;
        c.brow += (brow - c.brow) * k;
        // lo "normal" de las cejas de esta persona: sigue de a poco solo cuando están bajas
        if (c.browBase === null) c.browBase = c.brow;
        else if (c.brow < c.browBase + 0.08) c.browBase += (c.brow - c.browBase) * Math.min(1, dt / 4);
        c.cejasArriba = c.brow > c.browBase + UMBRAL.cejas;
      }
    }
    if (!engaged && S.vistoHace > 3) S.cara.browBase = null; // persona nueva

    S.cabeza.ok = S.cabeza.hay && caraVista;
    // ¿mira a la pantalla? (para el pollito ingles): cara vista, de frente y con los ojos abiertos
    const miraAhora = engaged && S.cara.ok && S.cabeza.ok && Math.abs(S.cabeza.yaw) < UMBRAL.mira.giro &&
      Math.abs(S.cabeza.pitch) < UMBRAL.mira.cabeceo && S.cara.blink < UMBRAL.ojos;
    miraT = miraAhora === S.mira ? 0 : miraT + dt;
    if (miraT > 0.12) { S.mira = miraAhora; miraT = 0; }
    S.quieto = engaged && S.mov < UMBRAL.quieto;
    S.quietoSeg = S.quieto ? S.quietoSeg + dt : 0;

    // detecciones sostenidas
    for (const [nombre, f] of Object.entries(DETECTA)) sost[nombre] = f(S) ? (sost[nombre] ?? 0) + dt : 0;
  }

  const DETECTA = {
    manosArriba: s => s.manosArriba,
    unaArriba: s => s.unaArriba,
    cruz: s => s.cruz,
    saludar: s => s.saludo,
    girarCabeza: s => s.presente && s.cabeza.hay && Math.abs(s.cabeza.yaw) > UMBRAL.giroCabeza,
    inclinarCabeza: s => s.presente && s.cabeza.hay && Math.abs(s.cabeza.roll) > UMBRAL.inclinar,
    abrirBoca: s => s.cara.ok && s.cara.jaw > UMBRAL.boca,
    cejas: s => s.cara.ok && s.cara.cejasArriba,
    cerrarOjos: s => s.cara.ok && s.cara.blink > UMBRAL.ojos,
    sonreir: s => s.cara.ok && s.cara.smile > UMBRAL.sonrisa,
  };
  // ¿se está cumpliendo (sostenido un ratito)?
  const cumple = (nombre, seg = UMBRAL.sostener) => (sost[nombre] ?? 0) >= seg;
  const ahora = nombre => !!DETECTA[nombre]?.(S);

  return { S, actualizar, cumple, ahora, DETECTA };
}
