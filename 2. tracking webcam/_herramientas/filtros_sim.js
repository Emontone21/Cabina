// v15: ¿cuánto retraso y cuánto temblor dan los FILTROS con cada ajuste? Se pasa TU movimiento grabado (los puntos del
// cuerpo de un registro .jsonl, de análisis o en vivo) por una copia de los filtros de app.js, con distintos valores, sin
// abrir el navegador. Sirve para elegir valores; lo que queda se confirma después con la cámara.
// Qué imita: el codo y la muñeca respecto del hombro (metros) pasan por la 1ª etapa (VecFilter, a la velocidad de la
// detección); de ahí sale la dirección del brazo y del antebrazo, que pasa por la 2ª etapa (QuatFilter, 60 veces por
// segundo, con su tope de velocidad). No imita el resto del cuerpo (IK, choques, contactos): eso no cambia el retraso.
// - retraso  = cuánto hay que atrasar tu movimiento para que coincida con el de ella, mientras te movés
// - temblor  = cuánto gira el brazo de ella mientras vos estás quieto (grados por segundo)
// Uso: node filtros_sim.js <registro.jsonl ...> [--cada=2]   (--cada=2 usa una detección sí y una no: imita 15 por segundo)
const fs = require('fs');
const args = process.argv.slice(2), rutas = args.filter(a => !a.startsWith('--'));
const CADA = +(args.find(a => a.startsWith('--cada='))?.slice(7) || 1);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lpA = (dt, fc) => 1 / (1 + 1 / (2 * Math.PI * fc * dt));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = v => Math.hypot(...v), nrm = v => { const l = len(v) || 1; return v.map(c => c / l); };
const ang = (a, b) => Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
const med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

// los ajustes a comparar: corte de la velocidad (Hz), 2ª etapa (x), suavizado y reacción del panel
const AJUSTES = [
  { n: 'v14 (antes)', dcut: 1, s2: 2, smooth: 0.7, react: 0.5 },
  { n: 'solo corteVel 4', dcut: 4, s2: 2, smooth: 0.7, react: 0.5 },
  { n: 'solo suav 0,6 reac 0,8', dcut: 1, s2: 2, smooth: 0.6, react: 0.8 },
  { n: 'corteVel 2 + 0,6/0,8', dcut: 2, s2: 3, smooth: 0.6, react: 0.8 },
  { n: 'corteVel 3 + 0,6/0,8', dcut: 3, s2: 3, smooth: 0.6, react: 0.8 },
  { n: 'v15: corteVel 4 + 0,6/0,8', dcut: 4, s2: 3, smooth: 0.6, react: 0.8 },
  { n: 'corteVel 8 + 0,6/0,8', dcut: 8, s2: 3, smooth: 0.6, react: 0.8 },
  { n: 'cambio 17 (0,4/0,8)', dcut: 1, s2: 2, smooth: 0.4, react: 0.8 },
];

function simular(det, A) {
  // 1ª etapa, en cada detección
  const mk = () => ({ x: null, d: [0, 0, 0], spikes: 0 });
  const vf = (F, v, dt, mc, beta, maxSpeed) => {
    if (!F.x) { F.x = v.slice(); return v.slice(); }
    if (maxSpeed && F.spikes < 2 && len(sub(v, F.x)) > maxSpeed * Math.max(dt, 1 / 30)) { F.spikes++; return F.x.slice(); }
    F.spikes = 0;
    const ad = lpA(dt, A.dcut), raw = sub(v, F.x).map(c => c / dt);
    F.d = F.d.map((c, i) => c + (raw[i] - c) * ad);
    const a = lpA(dt, mc + beta * len(F.d));
    F.x = F.x.map((c, i) => c + (v[i] - c) * a);
    return F.x.slice();
  };
  const FE = mk(), FW = mk(), obj = [];
  for (let i = 0; i < det.length; i++) {
    const o = det[i], dt = i ? clamp(o.t - det[i - 1].t, 1 / 120, 0.2) : 1 / 30, k = clamp(0.9 / (o.d || 1), 0.5, 1);
    const mc = (0.15 + 4 * (1 - A.smooth) ** 2) * k, bPos = (1 + A.react * 6) * k;
    const E = vf(FE, o.E, dt, mc, bPos, 8), W = vf(FW, o.W, dt, mc, bPos, 6);
    obj.push({ t: o.t, dirs: [nrm(E), nrm(sub(W, E))], mc });
  }
  // 2ª etapa, 60 veces por segundo: el objetivo es la última detección que ya llegó
  const HZ = 60, dt = 1 / HZ, bDir = 0.5 + A.react * 5, out = [];
  const S = [0, 1].map(() => ({ q: null, d: [0, 0, 0] }));
  let j = 0;
  for (let t = det[0].t; t <= det[det.length - 1].t; t += dt) {
    while (j + 1 < obj.length && obj[j + 1].t <= t) j++;
    const fila = [t];
    for (const s of [0, 1]) {
      const x = obj[j].dirs[s], F = S[s];
      if (!F.q) { F.q = x.slice(); fila.push(x.slice()); continue; }
      const ad = lpA(dt, A.dcut), raw = sub(x, F.q).map(c => c / dt);
      F.d = F.d.map((c, i) => c + (raw[i] - c) * ad);
      const a = lpA(dt, obj[j].mc * A.s2 + bDir * len(F.d) * 0.5); // (un cuaternión se mueve la mitad que la dirección)
      let q = nrm(F.q.map((c, i) => c + (x[i] - c) * a));
      const g = ang(F.q, q), lim = 14 * dt;
      if (g > lim) q = nrm(F.q.map((c, i) => c + (q[i] - c) * lim / g));
      F.q = q; fila.push(q.slice());
    }
    out.push(fila);
  }
  return out;
}

function medir(det, A) {
  const out = simular(det, A), HZ = 60, res = [];
  // tu movimiento "de verdad": la dirección sin filtrar, interpolada entre detecciones
  const ref = (s, t) => {
    let lo = 0, hi = det.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (det[m].t <= t) lo = m; else hi = m; }
    const a = det[lo], b = det[hi], k = b.t > a.t ? clamp((t - a.t) / (b.t - a.t), 0, 1) : 0;
    return nrm(a.dirs[s].map((c, i) => c + (b.dirs[s][i] - c) * k));
  };
  for (const s of [0, 1]) {
    // velocidad tuya (suavizada 0,2 s) en cada instante, para separar "te movés" de "estás quieto"
    const vel = out.map(f => ang(ref(s, f[0] - 0.1), ref(s, f[0] + 0.1)) / 0.2);
    const mov = out.map((_, i) => i).filter(i => vel[i] > 1.0 && out[i][0] > det[0].t + 0.8);
    const quieto = out.map((_, i) => i).filter(i => i > 0 && vel[i] < 0.15);
    let mejor = NaN, err = Infinity;
    if (mov.length > 30) for (let tau = 0; tau <= 0.6; tau += 1 / 240) {
      let e = 0; for (const i of mov) e += ang(out[i][1 + s], ref(s, out[i][0] - tau)) ** 2;
      if (e < err) { err = e; mejor = tau; }
    }
    const temblor = quieto.length > 30 ? Math.sqrt(quieto.reduce((a, i) => a + (ang(out[i][1 + s], out[i - 1][1 + s]) * HZ) ** 2, 0) / quieto.length) * 180 / Math.PI : NaN;
    res.push({ retraso: mejor, temblor, nMov: mov.length });
  }
  return res;
}

const todos = AJUSTES.map(() => ({ r: [], t: [] }));
for (const file of rutas) {
  const L = fs.readFileSync(file, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const espejo = L[0].espejo !== false;
  let brazos = 0;
  for (const [si, ei, wi] of [[11, 13, 15], [12, 14, 16]]) {
    let det = L.slice(1).filter(o => o.poseW && o.pose && o.pose[ei][3] > 0.5 && o.pose[wi][3] > 0.3)
      .map(o => ({ t: o.t, d: o.sig?.d, E: sub(o.poseW[ei], o.poseW[si]), W: sub(o.poseW[wi], o.poseW[si]) }));
    det = det.filter((_, i) => i % CADA === 0);
    if (det.length < 40) continue;
    for (const o of det) o.dirs = [nrm(o.E), nrm(sub(o.W, o.E))];
    brazos++;
    AJUSTES.forEach((A, k) => { for (const m of medir(det, A)) { if (Number.isFinite(m.retraso)) todos[k].r.push(m.retraso); if (Number.isFinite(m.temblor)) todos[k].t.push(m.temblor); } });
  }
  void espejo; void brazos;
}
const dps = (() => { const L = fs.readFileSync(rutas[0], 'utf8').trim().split('\n').slice(1).map(l => JSON.parse(l)).filter(o => o.pose); const d = []; for (let i = 1; i < L.length; i++) d.push(L[i].t - L[i - 1].t); return 1 / med(d) / CADA; })();
console.log(`${rutas.length} registro(s) · ~${dps.toFixed(0)} detecciones por segundo${CADA > 1 ? ` (una de cada ${CADA})` : ''} · ${todos[0].r.length} tramos de brazo con movimiento`);
console.log('ajuste                     retraso (mediana · peor)   temblor quieto');
AJUSTES.forEach((A, k) => {
  const r = todos[k].r, t = todos[k].t;
  console.log(`${A.n.padEnd(26)} ${(med(r) * 1000).toFixed(0).padStart(4)} ms · ${(Math.max(...r) * 1000).toFixed(0).padStart(4)} ms          ${med(t).toFixed(1).padStart(5)} °/s`);
});
