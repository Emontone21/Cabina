// Metricas de un analisis (registros .jsonl que deja ?video=...&analizar o ?lote=...).
// Uso:   node metricas.js <carpeta analisis_vN> [<otra carpeta analisis_vM para comparar>]
// Ej.:   node metricas.js "..\_pruebas\grabaciones\bateria_X\analisis_v9" "..\_pruebas\grabaciones\bateria_X\analisis_v10"
//
// Que mide (por clip):
//  det      % de cuadros con cuerpo / mano izq. / mano der. / cara, y % siguiendo
//  mov      movimiento tipico por cuadro (mediana, grados) de cabeza, manos y dedos: mas alto quieto = temblor
//  saltos   cuadros donde un hueso grande gira mas de 20° de un cuadro al otro (tiron)
//  invol.   veces que la mano de tiesme gira mas de 60° en 0,2 s mientras tu mano esta quieta
//  dedos    cuanto se parecen los dedos de tiesme a los tuyos (correlacion 0..1) y con cuanto retardo (ms)
//  cabeza   idem para girar (izq/der) y cabecear (arriba/abajo), y que proporcion de tu movimiento copia
//  cara     cuadros con tu mano sobre la cara: % en que la palma de tiesme llega a su cara
//  atraviesa % de cuadros con la palma de tiesme adentro de su cara o su torso

const fs = require('fs'), path = require('path');

function leer(file) {
  const lineas = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  return { meta: lineas[0].tipo === 'meta' ? lineas[0] : {}, cuadros: lineas.filter(l => l.t !== undefined) };
}
const median = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const qAng = (a, b) => { const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const ang3 = (u, v) => { const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2], n = Math.hypot(...u) * Math.hypot(...v); return n ? Math.acos(Math.max(-1, Math.min(1, d / n))) * 180 / Math.PI : NaN; };
const qMul = ([ax, ay, az, aw], [bx, by, bz, bw]) => [
  aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
  aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz];
// rotacion relativa como vector (eje * angulo): asi no importa como estan orientados los ejes del hueso
function rotVec(q, ref) {
  const [x1, y1, z1, w1] = ref, [x2, y2, z2, w2] = q;
  // r = ref^-1 * q
  let x = w1 * x2 - x1 * w2 - y1 * z2 + z1 * y2, y = w1 * y2 + x1 * z2 - y1 * w2 - z1 * x2,
    z = w1 * z2 - x1 * y2 + y1 * x2 - z1 * w2, w = w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2;
  if (w < 0) { x = -x; y = -y; z = -z; w = -w; }
  const s = Math.hypot(x, y, z), a = 2 * Math.atan2(s, w);
  return s < 1e-9 ? [0, 0, 0] : [x / s * a, y / s * a, z / s * a];
}
function pearson(a, b) {
  const n = a.length; if (n < 10) return NaN;
  const ma = mean(a), mb = mean(b); let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : NaN;
}
// mejor correlacion entre tu señal u y la de tiesme v retrasada 0..maxLag cuadros (null = sin dato)
function retardo(u, v, maxLag = 15) {
  let best = { r: -2, lag: 0 };
  for (let L = 0; L <= maxLag; L++) {
    const A = [], Bv = [];
    for (let i = 0; i + L < u.length; i++) if (u[i] !== null && v[i + L] !== null) { A.push(u[i]); Bv.push(v[i + L]); }
    const r = pearson(A, Bv);
    if (r > best.r) best = { r, lag: L };
  }
  return best.r > -2 ? best : null;
}

const DEDOS = { index: [5, 6, 7], middle: [9, 10, 11], ring: [13, 14, 15], pinky: [17, 18, 19] };
function metricas(file) {
  const { meta, cuadros } = leer(file);
  const H = meta.huesos || [], hi = n => H.indexOf(n);
  const espejo = meta.espejo !== false, other = s => (s === 'left' ? 'right' : 'left');
  const N = cuadros.length, dt = N > 1 ? (cuadros[N - 1].t - cuadros[0].t) / (N - 1) : 1 / 30;
  const det = { cuerpo: 0, izq: 0, der: 0, cara: 0, sigue: 0 };
  for (const c of cuadros) {
    if (c.pose) det.cuerpo++; if (c.manos?.left) det.izq++; if (c.manos?.right) det.der++; if (c.cara) det.cara++; if (c.sigue) det.sigue++;
  }
  for (const k in det) det[k] = Math.round(100 * det[k] / N);

  // movimiento por cuadro y saltos
  const grupos = { cabeza: ['head'], manos: ['lefthand', 'righthand'],
    dedos: H.filter(n => /hand(thumb|index|middle|ring|pinky)\d/.test(n)) };
  const mov = {}, GRANDES = ['head', 'spine2', 'leftarm', 'rightarm', 'leftforearm', 'rightforearm', 'lefthand', 'righthand'];
  for (const [g, names] of Object.entries(grupos)) {
    const v = [];
    for (let i = 1; i < N; i++) for (const n of names) { const a = cuadros[i - 1].huesos?.[hi(n)], b = cuadros[i].huesos?.[hi(n)]; if (a && b) v.push(qAng(a, b)); }
    mov[g] = +median(v).toFixed(2);
  }
  let saltos = 0;
  for (let i = 1; i < N; i++) if (GRANDES.some(n => { const a = cuadros[i - 1].huesos?.[hi(n)], b = cuadros[i].huesos?.[hi(n)]; return a && b && qAng(a, b) > 20; })) saltos++;

  // involuntarios: ventanas de 0,2 s en que la mano de tiesme (con todo el brazo encima) gira mas de 60° mientras tu
  // muñeca casi no se mueve (menos de 6% del ancho de tus hombros) y tu mano casi no cambia de orientacion (< 20°)
  const ar0 = (meta.ancho || 16) / (meta.alto || 9);
  const manoMundo = (q, S) => {
    const ids = ['hips', 'spine', 'spine1', 'spine2', S + 'shoulder', S + 'arm', S + 'forearm', S + 'hand'].map(hi);
    return q.huesos && ids.every(i => i >= 0 && q.huesos[i]) ? ids.reduce((acc, i) => qMul(acc, q.huesos[i]), [0, 0, 0, 1]) : null;
  };
  const orientUsuario = W => { const f = sub(W[9], W[0]), s = sub(W[5], W[17]); return [f, [f[1] * s[2] - f[2] * s[1], f[2] * s[0] - f[0] * s[2], f[0] * s[1] - f[1] * s[0]]]; };
  let involuntarios = 0;
  const win = Math.max(2, Math.round(0.2 / dt));
  for (const [U, wi] of [['left', 15], ['right', 16]]) {
    const S = espejo ? other(U) : U, paso = [];
    for (let i = 1; i < N; i++) {
      const a = cuadros[i - 1], b = cuadros[i], qa = manoMundo(a, S), qb = manoMundo(b, S);
      if (!a.sigue || !b.sigue || !a.pose || !b.pose || !qa || !qb) { paso.push(null); continue; }
      const sw = Math.hypot((b.pose[11][0] - b.pose[12][0]) * ar0, b.pose[11][1] - b.pose[12][1]) || 1;
      const mu = Math.hypot((b.pose[wi][0] - a.pose[wi][0]) * ar0, b.pose[wi][1] - a.pose[wi][1]) / sw;
      const Wa = a.manos?.[U]?.W, Wb = b.manos?.[U]?.W;
      const ou = Wa && Wb ? Math.max(ang3(orientUsuario(Wa)[0], orientUsuario(Wb)[0]), ang3(orientUsuario(Wa)[1], orientUsuario(Wb)[1])) : 0;
      paso.push({ t: qAng(qa, qb), mu, ou });
    }
    let ultimo = -1e9;
    for (let i = 0; i + win <= paso.length; i++) {
      const w = paso.slice(i, i + win); if (w.some(p => !p)) continue;
      const T = w.reduce((s, p) => s + p.t, 0), M = w.reduce((s, p) => s + p.mu, 0), O = w.reduce((s, p) => s + p.ou, 0);
      if (T > 60 && M < 0.06 && O < 20 && i - ultimo > win) { involuntarios++; ultimo = i; }
    }
  }

  // dedos: tu flexion (angulo en la segunda falange, puntos 3D de la mano) contra la de tiesme (giro de su falange 2)
  const dedos = [];
  for (const U of ['left', 'right']) {
    const S = espejo ? other(U) : U;
    for (const [f, [a, b, c]] of Object.entries(DEDOS)) {
      const n = hi(`${S}hand${f}2`); if (n < 0) continue;
      // (solo los cuadros en que tiesme te esta siguiendo)
      const u = cuadros.map(q => { const W = q.sigue && q.manos?.[U]?.W; return W ? ang3(sub(W[b], W[a]), sub(W[c], W[b])) : null; });
      const okI = u.map((x, i) => (x !== null ? i : -1)).filter(i => i >= 0);
      if (okI.length < 30) continue;
      const ref = cuadros[okI.reduce((m, i) => (u[i] < u[m] ? i : m), okI[0])].huesos[n]; // tu mano mas abierta
      const v = cuadros.map(q => (q.huesos?.[n] ? qAng(q.huesos[n], ref) : null));
      const r = retardo(u, v);
      const us = okI.map(i => u[i]).sort((x, y) => x - y);
      if (r) dedos.push({ ...r, rango: us[Math.floor(us.length * 0.9)] - us[Math.floor(us.length * 0.1)] });
    }
  }
  const dedosR = dedos.length ? +median(dedos.map(d => d.r)).toFixed(2) : NaN;
  const dedosMs = dedos.length ? Math.round(median(dedos.map(d => d.lag)) * dt * 1000) : NaN;
  const dedosRango = dedos.length ? Math.round(median(dedos.map(d => d.rango))) : NaN; // cuanto doblaste los dedos (°)

  // cabeza: tu giro/cabeceo (matriz de la cara) contra el giro del hueso de tiesme (la componente que mejor coincide)
  const yaw = cuadros.map(q => (q.sigue && q.caraMatriz ? Math.atan2(q.caraMatriz[8], q.caraMatriz[10]) * 180 / Math.PI : null));
  const pitch = cuadros.map(q => (q.sigue && q.caraMatriz ? Math.asin(-Math.max(-1, Math.min(1, q.caraMatriz[9]))) * 180 / Math.PI : null));
  // la cabeza de tiesme respecto del modelo = cadera * columna * cuello * cabeza (el cuello lleva la mitad del giro)
  const CADENA = ['hips', 'spine', 'spine1', 'spine2', 'neck', 'head'].map(hi);
  const cabezaQ = q => (q.huesos && CADENA.every(i => i >= 0 && q.huesos[i]) ? CADENA.reduce((acc, i) => qMul(acc, q.huesos[i]), [0, 0, 0, 1]) : null);
  const hq = cuadros.map(cabezaQ), refs = hq.filter(Boolean);
  const cabeza = {};
  if (refs.length > 30) {
    const ref = refs[refs.length >> 1];
    const comps = [0, 1, 2].map(k => hq.map(q => (q ? rotVec(q, ref)[k] * 180 / Math.PI : null)));
    for (const [nom, u] of [['giro', yaw], ['cabeceo', pitch]]) {
      let best = null;
      for (const v of comps) for (const sg of [1, -1]) {
        const r = retardo(u, v.map(x => (x === null ? null : sg * x)));
        if (r && (!best || r.r > best.r)) best = { ...r, v: v.map(x => (x === null ? null : sg * x)) };
      }
      if (!best) continue;
      const us = u.filter(x => x !== null), vs = best.v.filter(x => x !== null);
      const sd = a => Math.sqrt(mean(a.map(x => (x - mean(a)) ** 2)));
      cabeza[nom] = { r: +best.r.toFixed(2), ms: Math.round(best.lag * dt * 1000), copia: +(sd(vs) / (sd(us) || 1)).toFixed(2), rango: Math.round(Math.max(...us) - Math.min(...us)) };
    }
  }

  // mano sobre la cara: tu palma (imagen) a menos de 0,6 anchos de cara del centro de la cara
  let enCara = 0, llega = 0, atraviesa = 0, ultCara = null;
  const ar = (meta.ancho || 16) / (meta.alto || 9);
  for (const q of cuadros) {
    if (q.cara) ultCara = q.cara;
    if (q.palma && (Math.min(q.palma.left.cara, q.palma.right.cara) < 0.97 || Math.min(q.palma.left.torso, q.palma.right.torso) < 0.97)) atraviesa++;
    if (!ultCara || !q.manos) continue;
    const cx = (ultCara[234][0] + ultCara[454][0]) / 2, cy = (ultCara[234][1] + ultCara[454][1]) / 2;
    const fw = Math.hypot((ultCara[454][0] - ultCara[234][0]) * ar, ultCara[454][1] - ultCara[234][1]);
    for (const U of ['left', 'right']) {
      const Nn = q.manos[U]?.N; if (!Nn) continue;
      const px = [0, 5, 9, 13, 17].reduce((s, i) => s + Nn[i][0], 0) / 5, py = [0, 5, 9, 13, 17].reduce((s, i) => s + Nn[i][1], 0) / 5;
      if (Math.hypot((px - cx) * ar, py - cy) < 0.6 * fw) {
        enCara++;
        if (q.palma[espejo ? other(U) : U].cara <= 1.25) llega++;
      }
    }
  }
  return {
    clip: path.basename(file, '.jsonl'), cuadros: N, det, mov, saltos, involuntarios,
    dedos: { r: dedosR, ms: dedosMs, n: dedos.length, rango: dedosRango }, cabeza,
    cara: { cuadros: enCara, llega: enCara ? Math.round(100 * llega / enCara) : null },
    atraviesa: Math.round(100 * atraviesa / N),
  };
}

const fila = m => [
  m.clip.padEnd(20), String(m.cuadros).padStart(5),
  `${m.det.cuerpo}/${m.det.izq}/${m.det.der}/${m.det.cara}/${m.det.sigue}`.padStart(17),
  `${m.mov.cabeza}/${m.mov.manos}/${m.mov.dedos}`.padStart(15), String(m.saltos).padStart(6), String(m.involuntarios).padStart(6),
  (isNaN(m.dedos.r) ? '-' : `${m.dedos.r} ${m.dedos.ms}ms ${m.dedos.rango}°`).padStart(16),
  (m.cabeza.giro ? `${m.cabeza.giro.r} ${m.cabeza.giro.ms}ms x${m.cabeza.giro.copia}` : '-').padStart(17),
  (m.cabeza.cabeceo ? `${m.cabeza.cabeceo.r} ${m.cabeza.cabeceo.ms}ms x${m.cabeza.cabeceo.copia}` : '-').padStart(17),
  (m.cara.cuadros ? `${m.cara.llega}% de ${m.cara.cuadros}` : '-').padStart(12), `${m.atraviesa}%`.padStart(9),
].join(' ');
const CAB = ['clip'.padEnd(20), 'cuad.', 'det c/mi/md/ca/sig', 'mov cab/man/ded', 'saltos', 'invol.', '  dedos r/ret/rango', 'cabeza giro', 'cabeceo', 'llega a cara', 'atraviesa'].join(' ');

const carpetas = process.argv.slice(2);
if (!carpetas.length) { console.log('Uso: node metricas.js <carpeta analisis_vN> [<otra carpeta>]'); process.exit(1); }
for (const dir of carpetas) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).sort();
  console.log(`\n== ${dir} (${files.length} clips)`);
  console.log(CAB);
  for (const f of files) console.log(fila(metricas(path.join(dir, f))));
}
console.log('\nmov: grados por cuadro (mediana). dedos/cabeza: correlacion con lo tuyo (1 = igual) y retardo; x = proporcion de tu movimiento que copia.');
