// v15: ¿cuánto TARDA tiesme en seguirte? Más fino que movimiento.js (que mide de a un cuadro entero).
// Por brazo y por tramo (hombro-codo y codo-muñeca): el ÁNGULO del tramo visto de frente, el tuyo en la imagen y el de
// tiesme en su cuerpo, y de ahí la velocidad de giro con signo (radianes por segundo). Las dos series se llevan a una
// grilla de 60 por segundo. (Con signo se alinean mucho mejor que comparando "cuánto se mueve" a secas.)
// - retraso  = el corrimiento que mejor alinea las dos velocidades (con décimas de cuadro)
// - arranque = en cada movimiento que empieza desde quieto, cuánto después que vos llega ella al 30 % de su velocidad
//              máxima (mediana de los arranques). Es lo que se siente como "tarda en reaccionar".
// - temblor  = cuánto gira el tramo de ella cuando vos estás quieto (grados por segundo, mediana)
// OJO: mide solo lo que agrega el PROGRAMA después de detectar (filtros y cada cuánto se detecta). La cámara y lo que
// tarda la detección no están acá: eso lo muestra el panel H en vivo ("retraso N ms").
// Sirve para registros de análisis (también con ?cada=2, que imita 15 detecciones por segundo) y en vivo (tecla K).
// Uso: node retraso.js <archivo.jsonl | carpeta analisis_vN> [<otra>]
const fs = require('fs'), path = require('path');
const rutas = process.argv.slice(2).filter(a => !a.startsWith('--'));
const med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const f0 = x => (Number.isFinite(x) ? x.toFixed(0) : '—'), f1 = x => (Number.isFinite(x) ? x.toFixed(1) : '—');
const archivos = r => (r.endsWith('.jsonl') ? [r] : fs.readdirSync(r).filter(f => f.endsWith('.jsonl')).map(f => path.join(r, f)));
const HZ = 60, PASO = 1 / HZ, N = s => Math.round(s * HZ);

// serie [t, ángulo] -> velocidad de giro con signo en la grilla: se desenrolla, se interpola y se deriva
function velocidad(pts, t0, t1) {
  const u = [pts[0].slice()];
  for (let i = 1; i < pts.length; i++) { let d = pts[i][1] - pts[i - 1][1]; d = Math.atan2(Math.sin(d), Math.cos(d)); u.push([pts[i][0], u[i - 1][1] + d]); }
  const n = Math.floor((t1 - t0) * HZ), pos = [];
  let j = 0;
  for (let i = 0; i <= n; i++) {
    const t = t0 + i * PASO;
    while (j + 1 < u.length - 1 && u[j + 1][0] < t) j++;
    const a = u[j], b = u[Math.min(j + 1, u.length - 1)], k = b[0] > a[0] ? Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0]))) : 0;
    pos.push(a[1] + (b[1] - a[1]) * k);
  }
  const v = [];
  for (let i = 1; i < pos.length; i++) v.push((pos[i] - pos[i - 1]) * HZ);
  // suavizado corto (5 muestras, ~80 ms) igual para las dos series: no corre el retraso relativo
  return v.map((_, i) => { let s = 0, c = 0; for (let k = -2; k <= 2; k++) if (v[i + k] !== undefined) { s += v[i + k]; c++; } return s / c; });
}

function comparar(tu, ella) {
  if (tu.length < 20 || ella.length < 20) return null;
  const t0 = Math.max(tu[0][0], ella[0][0]), t1 = Math.min(tu[tu.length - 1][0], ella[ella.length - 1][0]);
  const vt = velocidad(tu, t0, t1), ve = velocidad(ella, t0, t1), n = Math.min(vt.length, ve.length);
  // retraso: correlación de las dos velocidades, corrimiento de 0 a 0,8 s, con ajuste fino por parábola
  const corr = k => { let s = 0, c = 0; for (let i = 0; i + k < n; i++) { s += vt[i] * ve[i + k]; c++; } return c ? s / c : 0; };
  const K = N(0.8), cs = []; for (let k = 0; k <= K; k++) cs.push(corr(k));
  let bk = 0; for (let k = 1; k <= K; k++) if (cs[k] > cs[bk]) bk = k;
  let fino = bk;
  if (bk > 0 && bk < K) { const a = cs[bk - 1], b = cs[bk], c = cs[bk + 1], d = a - 2 * b + c; if (d < 0) fino = bk + 0.5 * (a - c) / d; }
  const movido = Math.sqrt(vt.reduce((s, x) => s + x * x, 0) / n); // cuánto te moviste (si es poco, el retraso no vale)
  // arranques: quieto (< 0,3 rad/s) al menos 0,25 s y después un giro que pasa de 1,5 rad/s
  const arr = [];
  for (let i = N(0.25); i < n - N(1.0); i++) {
    if (!(Math.abs(vt[i]) >= 0.3 && Math.abs(vt[i - 1]) < 0.3)) continue;
    let quieto = true; for (let k = 1; k <= N(0.25); k++) if (Math.abs(vt[i - k]) >= 0.3) { quieto = false; break; }
    if (!quieto) continue;
    const fin = i + N(0.5);
    let pt = 0; for (let k = i; k < fin; k++) if (Math.abs(vt[k]) > Math.abs(pt)) pt = vt[k];
    if (Math.abs(pt) < 1.5) continue;
    const sg = Math.sign(pt);
    let pe = 0; for (let k = i; k < fin + N(0.3); k++) pe = Math.max(pe, sg * ve[k]);
    if (pe < 0.3) continue;
    const cruce = (v, p, hasta) => { for (let k = i - N(0.1); k < hasta; k++) if (sg * v[k] >= 0.3 * p) return k - (sg * v[k] - 0.3 * p) / Math.max(1e-6, sg * (v[k] - v[k - 1])); return NaN; };
    const a = cruce(vt, Math.abs(pt), fin), b = cruce(ve, pe, fin + N(0.3));
    if (Number.isFinite(a) && Number.isFinite(b)) arr.push((b - a) * PASO);
    i = fin;
  }
  const quietos = ve.filter((_, i) => Math.abs(vt[i]) < 0.1).map(Math.abs);
  return { retraso: fino * PASO, arr, temblor: med(quietos) * 180 / Math.PI, movido };
}

function medir(file) {
  const L = fs.readFileSync(file, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const cab = L[0], espejo = cab.espejo !== false, asp = (cab.ancho || 16) / (cab.alto || 9), girada = cab.giro === 90 || cab.giro === 270;
  const ay = girada ? asp : 1 / asp, sx = espejo ? -1 : 1; // alto de la imagen en anchos de imagen; el espejo da vuelta la x
  const C = L.slice(1);
  const det = C.filter(o => o.pose), dts = []; for (let i = 1; i < det.length; i++) dts.push(det[i].t - det[i - 1].t);
  const out = { file, detPorSeg: dts.length ? 1 / med(dts) : NaN, tramos: [] };
  // tus puntos (hombro, codo, muñeca): en espejo, el brazo izquierdo de tiesme sigue tu brazo derecho
  const pares = espejo ? [['left', [12, 14, 16]], ['right', [11, 13, 15]]] : [['left', [11, 13, 15]], ['right', [12, 14, 16]]];
  for (const [lado, idx] of pares) for (const tr of [0, 1]) {
    const tu = [], ella = [], a = idx[tr], b = idx[tr + 1];
    for (const o of C) {
      if (o.pose && o.pose[a][3] >= 0.5 && o.pose[b][3] >= 0.5) tu.push([o.t, Math.atan2(-(o.pose[b][1] - o.pose[a][1]) * ay, sx * (o.pose[b][0] - o.pose[a][0]))]);
      if (o.t3 && o.sigue) { const A = o.t3[lado]; ella.push([o.t, Math.atan2(A[tr + 1][1] - A[tr][1], A[tr + 1][0] - A[tr][0])]); }
    }
    const r = comparar(tu, ella);
    if (r) out.tramos.push({ nombre: `${lado === 'left' ? 'izq' : 'der'} ${tr ? 'antebrazo' : 'brazo'}`, ...r });
  }
  return out;
}

for (const r of rutas) {
  console.log(`\n== ${r}`);
  const todos = { retraso: [], arr: [], temblor: [] };
  for (const f of archivos(r)) {
    const m = medir(f);
    console.log(`${path.basename(f)} · ${f0(m.detPorSeg)} detecciones/s`);
    for (const t of m.tramos) {
      const vale = t.movido >= 0.4;
      if (vale) todos.retraso.push(t.retraso);
      todos.arr.push(...t.arr); todos.temblor.push(t.temblor);
      console.log(`   ${t.nombre.padEnd(14)} retraso ${vale ? f0(t.retraso * 1000).padStart(4) + ' ms' : '   (poco movimiento)'} · arranque ${f0(med(t.arr) * 1000).padStart(4)} ms (${t.arr.length}) · temblor ${f1(t.temblor)} °/s`);
    }
  }
  console.log(`   >>> MEDIANA: retraso ${f0(med(todos.retraso) * 1000)} ms · arranque ${f0(med(todos.arr) * 1000)} ms (${todos.arr.length} arranques) · temblor ${f1(med(todos.temblor))} °/s`);
}
