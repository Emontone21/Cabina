// v14: ¿cuánto de TU movimiento llega a tiesme, y con qué retraso? Para registros en vivo (tecla K) o de análisis.
// Por brazo: la velocidad de tu muñeca (en la imagen, en anchos de hombro por segundo) contra la velocidad de la mano de
// tiesme (en anchos de hombro de ella por segundo).
// - llega = cuánto movimiento de ella hay por cada unidad de movimiento tuyo (1,0 = el mismo; 0,5 = la mitad se pierde)
// - retraso = cuánto tarda ella en seguirte (el corrimiento que mejor alinea las dos velocidades)
// - detecciones/s y % de cuadros con cuerpo / con cada mano (en vivo: cuántas veces por segundo se detectó)
// Uso: node movimiento.js <archivo.jsonl | carpeta analisis_vN> [<otro>] [--linea]
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), linea = args.includes('--linea');
const rutas = args.filter(a => !a.startsWith('--'));
const med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const f2 = x => (Number.isFinite(x) ? x.toFixed(2) : '—'), f0 = x => (Number.isFinite(x) ? x.toFixed(0) : '—');
const archivos = r => (r.endsWith('.jsonl') ? [r] : fs.readdirSync(r).filter(f => f.endsWith('.jsonl')).map(f => path.join(r, f)));

function medir(file) {
  const L = fs.readFileSync(file, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const cab = L[0], espejo = cab.espejo !== false, asp = (cab.ancho || 16) / (cab.alto || 9);
  const Q = L.slice(1).filter(o => o.t3 && o.pose);
  const dts = []; for (let i = 1; i < Q.length; i++) dts.push(Q[i].t - Q[i - 1].t);
  const total = L.length - 1, conCuerpo = L.slice(1).filter(o => o.pose).length;
  const manos = { izq: L.slice(1).filter(o => o.manos?.left).length, der: L.slice(1).filter(o => o.manos?.right).length };
  // tu muñeca 15 (izquierda) y 16 (derecha); en espejo el brazo izquierdo de tiesme sigue tu brazo derecho
  const pares = espejo ? [['left', 16], ['right', 15]] : [['left', 15], ['right', 16]];
  const out = { file, dur: Q.length ? Q[Q.length - 1].t - Q[0].t : 0, detPorSeg: dts.length ? 1 / med(dts) : NaN, total, conCuerpo, manos, brazos: {} };
  for (const [lado, wi] of pares) {
    const vt = [], vy = [], ts = [];
    for (let i = 1; i < Q.length; i++) {
      const a = Q[i - 1], b = Q[i], dt = b.t - a.t; if (!(dt > 0.001)) continue;
      const pa = a.pose, pb = b.pose; if (pa[wi][3] < 0.5 || pb[wi][3] < 0.5) continue;
      const sw = Math.hypot(pb[11][0] - pb[12][0], (pb[11][1] - pb[12][1]) / asp) || 1e-6; // en anchos de imagen
      const tu = Math.hypot(pb[wi][0] - pa[wi][0], (pb[wi][1] - pa[wi][1]) / asp) / sw / dt;
      const Sa = a.t3[lado][2], Sb = b.t3[lado][2], tsw = Math.hypot(...[0, 1, 2].map(k => b.t3.left[0][k] - b.t3.right[0][k])) || 1e-6;
      const ella = Math.hypot(...[0, 1, 2].map(k => Sb[k] - Sa[k])) / tsw / dt;
      vt.push(tu); vy.push(ella); ts.push(b.t);
    }
    if (vt.length < 10) { out.brazos[lado] = null; continue; }
    const sumT = vt.reduce((s, x) => s + x, 0), sumE = vy.reduce((s, x) => s + x, 0);
    // retraso: corrimiento (en cuadros) que maximiza la correlación entre las dos velocidades, hasta 1 s
    const dtM = med(dts), maxK = Math.max(1, Math.round(1 / dtM));
    const corr = k => { let s = 0, n = 0; for (let i = 0; i + k < vt.length; i++) { s += vt[i] * vy[i + k]; n++; } return n ? s / n : 0; };
    let mejorK = 0, mejor = -Infinity; for (let k = 0; k <= maxK; k++) { const c = corr(k); if (c > mejor) { mejor = c; mejorK = k; } }
    out.brazos[lado] = { llega: sumE / sumT, retraso: mejorK * dtM, n: vt.length, tuMediana: med(vt), ellaMediana: med(vy), serie: linea ? ts.map((t, i) => [t, vt[i], vy[i]]) : null };
  }
  return out;
}

for (const r of rutas) {
  console.log(`\n== ${r}`);
  for (const f of archivos(r)) {
    const m = medir(f);
    console.log(`${path.basename(f)}: ${m.dur.toFixed(1)} s · ${f0(m.detPorSeg)} detecciones/s · cuerpo ${f0(100 * m.conCuerpo / m.total)}% · manos izq ${f0(100 * m.manos.izq / m.total)}% der ${f0(100 * m.manos.der / m.total)}%`);
    for (const lado of ['left', 'right']) {
      const b = m.brazos[lado];
      if (!b) { console.log(`  brazo ${lado} de tiesme: sin datos`); continue; }
      console.log(`  brazo ${lado} de tiesme: llega ${f2(b.llega)} de tu movimiento · retraso ${f0(b.retraso * 1000)} ms · (vos ${f2(b.tuMediana)} / ella ${f2(b.ellaMediana)} anchos de hombro por s, mediana)`);
      if (linea) for (const [t, a, c] of b.serie) if (Math.abs(t * 2 - Math.round(t * 2)) < 0.03) console.log(`    ${t.toFixed(1).padStart(5)} s  vos ${f2(a)}  ella ${f2(c)}`);
    }
  }
}
