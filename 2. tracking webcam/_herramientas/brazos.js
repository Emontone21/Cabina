// v12: metricas de brazos y manos (necesita registros v12 en adelante: campo t3 con los brazos de tiesme).
//   node brazos.js <analisis_vN> [<otro>...]        resumen por clip, comparando carpetas
//   node brazos.js <analisis_vN> --linea 05_codos     linea de tiempo cada 0,5 s de un clip
// Columnas:
//   codo alto   elevacion del brazo (hombro->codo, grados sobre la horizontal): correlacion con lo tuyo y error medio
//   giro codo   angulo de giro del codo alrededor del eje hombro-muñeca (+ = codo hacia afuera): correlacion y error
//   queda arriba  segundos en que el brazo de tiesme queda arriba del hombro y el tuyo no (MAN-4)
//   aplauso     cuadros con tus manos juntas: distancia mediana entre las palmas de tiesme (en largos de mano; ~0,5 = tocan)
//   saltos mano cuadros en que una palma de tiesme se mueve mas de 0,5 largos de mano (~15 por segundo): MAN-5
//   nuca        cuadros con tu muñeca a la altura de la cabeza y al costado de la cara: % con la palma de tiesme detras de su cabeza
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const iL = args.indexOf('--linea');
const linea = iL >= 0 ? args[iL + 1] : null;
const carpetas = args.filter((a, i) => iL < 0 || (i !== iL && i !== iL + 1));

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(...a), nrm = a => { const l = len(a) || 1; return a.map(v => v / l); };
const sc = (a, k) => a.map(v => v * k);
const perp = (v, ax) => sub(v, sc(ax, dot(v, ax)));
const DEG = 180 / Math.PI;
const other = S => (S === 'left' ? 'right' : 'left');

// Brazo en un marco del cuerpo: out (hacia afuera de ese lado), up, fwd. Devuelve elevacion y giro del codo.
function brazo(S, E, W, Sotro, up, fwd) {
  const out = nrm(perp(sub(S, Sotro), up));
  const u = nrm(sub(E, S));
  const elev = Math.asin(Math.max(-1, Math.min(1, dot(u, up)))) * DEG;
  const ax = nrm(sub(W, S));
  if (len(sub(W, S)) < 1e-6) return { elev, giro: null };
  const ref = nrm(perp(sc(up, -1), ax));          // "codo abajo"
  let b = perp(perp(out, ax), ref);                // "codo afuera", perpendicular a eje y ref
  if (len(b) < 1e-3) b = cross(ax, ref);
  b = nrm(b);
  const e = perp(sub(E, S), ax);
  if (len(e) < 1e-3 * len(sub(W, S))) return { elev, giro: null }; // brazo estirado: giro indefinido
  return { elev, giro: Math.atan2(dot(e, b), dot(e, ref)) * DEG };
}
const ARM = { left: [11, 13, 15], right: [12, 14, 16] };
function usuario(q, U) {
  const w = q.poseW, p = q.pose;
  if (!w || !p) return null;
  const [si, ei, wi] = ARM[U], oi = ARM[other(U)][0];
  if (p[si][3] < 0.8 || p[ei][3] < 0.8 || p[oi][3] < 0.8) return null;
  const C = i => [w[i][0], -w[i][1], -w[i][2]];     // a espacio camara: y arriba, z hacia la camara
  const mano = q.manos?.[U];
  const W = C(wi);
  return { ...brazo(C(si), C(ei), W, C(oi), [0, 1, 0], [0, 0, 1]), W, S: C(si), visW: mano ? 1 : p[wi][3] };
}
function tiesme(q, S) {
  const t = q.t3?.[S], o = q.t3?.[other(S)];
  if (!t || !o) return null;
  return { ...brazo(t[0], t[1], t[2], o[0], [0, 1, 0], [0, 0, 1]), S: t[0], E: t[1], W: t[2], P: t[3] };
}
function corr(xs, ys) {
  const n = xs.length; if (n < 10) return null;
  const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}
const mediana = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const media = a => (a.length ? a.reduce((x, y) => x + y) / a.length : null);
const angDif = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

function analizar(file) {
  const L = fs.readFileSync(file, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const meta = L[0].tipo === 'meta' ? L[0] : {};
  const espejo = meta.espejo !== false;
  const Q = L.filter(o => o.t !== undefined);
  if (!Q.some(q => q.t3)) return null;
  const ev = { u: [], t: [], gu: [], gt: [] };
  let arriba = 0, aplausos = [], nuca = 0, nucaDetras = 0, saltos = 0;
  const prevP = {};
  const filas = [];
  let ultPose = null;
  for (const q of Q) {
    if (q.pose) ultPose = q; else if (ultPose) { q.pose = ultPose.pose; q.poseW = ultPose.poseW; q.manos = ultPose.manos; q.cara = ultPose.cara; }
    const fila = { t: q.t };
    for (const U of ['left', 'right']) {
      const S = espejo ? other(U) : U;
      const u = q.sigue ? usuario(q, U) : null, ti = q.sigue ? tiesme(q, S) : null;
      fila[U] = { u, ti };
      if (ti && prevP[S] && len(sub(ti.P, prevP[S])) > 0.5) { saltos++; fila[U].salto = true; }
      prevP[S] = ti ? ti.P : null;
      if (u && ti) {
        ev.u.push(u.elev); ev.t.push(ti.elev);
        if (u.giro !== null && ti.giro !== null) { ev.gu.push(u.giro); ev.gt.push(ti.giro); }
      }
      // queda arriba: tiesme con la muñeca sobre el hombro y vos no (o tu muñeca no se ve)
      // (tiesme: muñeca a menos de 1 largo de mano debajo del hombro; vos: sin mano a la vista y la muñeca
      // perdida o mas de 0,6 anchos de hombros debajo del hombro)
      if (q.sigue && ti && ti.W[1] - ti.S[1] > -1) {
        const p = q.pose, [si, , wi] = ARM[U];
        const bajada = !q.manos?.[U] && p && (p[wi][3] < 0.5 || p[wi][1] > p[si][1] + 0.6 * Math.abs(p[11][0] - p[12][0]));
        if (bajada) { arriba++; fila[U].arriba = true; }
      }
      // nuca: tu muñeca (imagen) a la altura de las orejas y al costado de la cara, con el codo arriba
      if (q.sigue && ti && q.pose && q.cara) {
        const p = q.pose, [si, ei, wi] = ARM[U];
        const caraAncho = Math.abs(q.cara[454][0] - q.cara[234][0]), cx = (q.cara[454][0] + q.cara[234][0]) / 2;
        const yOreja = (p[7][1] + p[8][1]) / 2;
        if (p[wi][3] > 0.3 && p[ei][1] < p[si][1] && Math.abs(p[wi][1] - yOreja) < caraAncho * 0.9 && Math.abs(p[wi][0] - cx) > caraAncho * 0.45) {
          nuca++; fila[U].nuca = true;
          if (ti.P[2] < q.t3.cab[2]) { nucaDetras++; fila[U].detras = true; }
        }
      }
    }
    // aplauso: tus dos manos detectadas y juntas (centros de palma a menos de 1,3 tamaños de mano)
    if (q.sigue && q.manos?.left && q.manos?.right && q.t3) {
      const ctr = h => [0, 5, 9, 13, 17].reduce((a, i) => [a[0] + h.N[i][0] / 5, a[1] + h.N[i][1] / 5], [0, 0]);
      const a = ctr(q.manos.left), b = ctr(q.manos.right);
      const tam = h => Math.hypot(h.N[0][0] - h.N[9][0], (h.N[0][1] - h.N[9][1]) * 9 / 16);
      const d = Math.hypot(a[0] - b[0], (a[1] - b[1]) * 9 / 16) / ((tam(q.manos.left) + tam(q.manos.right)) / 2);
      const enCara = c => q.cara && Math.abs(c[0] - (q.cara[454][0] + q.cara[234][0]) / 2) < Math.abs(q.cara[454][0] - q.cara[234][0]) && c[1] > q.cara[10][1] - 0.05 && c[1] < q.cara[152][1] + 0.03;
      if (d < 1.3 && !enCara(a) && !enCara(b)) { const dt = len(sub(q.t3.left[3], q.t3.right[3])); aplausos.push(dt); fila.aplauso = dt; }
    }
    filas.push(fila);
  }
  const errE = media(ev.u.map((v, i) => Math.abs(v - ev.t[i]))), errG = media(ev.gu.map((v, i) => angDif(v, ev.gt[i])));
  return {
    elev: { r: corr(ev.u, ev.t), err: errE, n: ev.u.length },
    giro: { r: corr(ev.gu, ev.gt), err: errG, n: ev.gu.length },
    arriba: arriba / 30, saltos, aplauso: { n: aplausos.length, d: mediana(aplausos) },
    nuca: { n: nuca, pct: nuca ? Math.round(100 * nucaDetras / nuca) : null }, filas,
  };
}
const f2 = (v, d = 2) => (v === null || v === undefined ? '-' : v.toFixed(d));

if (linea) {
  for (const c of carpetas) {
    const file = path.join(c, linea.replace(/\.jsonl$/, '') + '.jsonl');
    const m = analizar(file);
    if (!m) { console.log(file, ': sin datos t3 (registro anterior a v12)'); continue; }
    console.log(`\n== ${file}`);
    console.log('  t   | TU izq: elev giro | TIESME (der en espejo): elev giro | TU der: elev giro | TIESME: elev giro | marcas');
    let prox = 0;
    for (const f of m.filas) {
      if (f.t < prox - 1e-6) continue; prox += 0.5;
      const s = U => { const { u, ti } = f[U]; return `${f2(u?.elev, 0).padStart(4)} ${f2(u?.giro, 0).padStart(5)} | ${f2(ti?.elev, 0).padStart(4)} ${f2(ti?.giro, 0).padStart(5)}`; };
      const marcas = ['left', 'right'].map(U => (f[U].arriba ? `${U[0]}:queda arriba ` : '') + (f[U].salto ? `${U[0]}:SALTO ` : '') + (f[U].nuca ? `${U[0]}:nuca${f[U].detras ? '(detras)' : '(adelante)'} ` : '')).join('') + (f.aplauso !== undefined ? `aplauso ${f2(f.aplauso)}` : '');
      console.log(`${f.t.toFixed(1).padStart(5)} | ${s('left')} | ${s('right')} | ${marcas}`);
    }
  }
} else {
  console.log('clip'.padEnd(20), 'carpeta'.padEnd(26), 'codo alto r/err', ' giro codo r/err', 'queda arriba', 'saltos mano', ' aplauso n/dist', ' nuca detras');
  const clips = [...new Set(carpetas.flatMap(c => fs.readdirSync(c).filter(f => f.endsWith('.jsonl'))))].sort();
  for (const clip of clips) for (const c of carpetas) {
    const file = path.join(c, clip);
    if (!fs.existsSync(file)) continue;
    const m = analizar(file);
    if (!m) { console.log(clip.replace('.jsonl', '').padEnd(20), path.basename(c).padEnd(26), 'sin datos t3'); continue; }
    console.log(clip.replace('.jsonl', '').padEnd(20), path.basename(c).padEnd(26),
      `${f2(m.elev.r)} / ${f2(m.elev.err, 0)}°`.padStart(15), `${f2(m.giro.r)} / ${f2(m.giro.err, 0)}°`.padStart(16),
      `${f2(m.arriba, 1)} s`.padStart(12), String(m.saltos).padStart(11), `${m.aplauso.n} / ${f2(m.aplauso.d)}`.padStart(15),
      (m.nuca.n ? `${m.nuca.pct}% de ${m.nuca.n}` : '-').padStart(12));
  }
}
