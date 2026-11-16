// v13: brazos cruzados y codos (COD-3, MAN-2). Mide, en los cuadros en que TUS brazos están cruzados (tus muñecas en
// orden inverso al de tus hombros), qué hace tiesme:
// - altura de los antebrazos y de los codos debajo de los hombros (en anchos de hombro: 0 = a la altura del hombro),
//   la tuya y la de tiesme;
// - doblez del codo de tiesme (0° = brazo estirado, 180° = doblado del todo) y % de cuadros con más de 140° (ahí la
//   manga se aplasta "en acordeón");
// - distancia entre sus brazos (antebrazo contra el otro antebrazo y contra el otro brazo, en anchos de hombro): muy
//   chica = un brazo metido en el otro.
// Uso: node cruzados.js <carpeta analisis_vN | archivo.jsonl> [<otra>] [--todos] [--linea]
//   (por defecto solo los clips "cruzados"; --todos mide todos los clips de la carpeta; --linea: cada 0,5 s)
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), linea = args.includes('--linea'), todos = args.includes('--todos');
const rutas = args.filter(a => !a.startsWith('--'));

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = v => Math.hypot(v[0], v[1], v[2]);
const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (len(a) * len(b) || 1)))) * 180 / Math.PI;
// distancia entre dos segmentos 3D
function segDist(p1, q1, p2, q2) {
  const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2);
  const a = d1[0] ** 2 + d1[1] ** 2 + d1[2] ** 2, e = d2[0] ** 2 + d2[1] ** 2 + d2[2] ** 2, f = d2[0] * r[0] + d2[1] * r[1] + d2[2] * r[2];
  const c = d1[0] * r[0] + d1[1] * r[1] + d1[2] * r[2], b = d1[0] * d2[0] + d1[1] * d2[1] + d1[2] * d2[2], den = a * e - b * b;
  let s = den > 1e-9 ? Math.max(0, Math.min(1, (b * f - c * e) / den)) : 0;
  let t = (b * s + f) / (e || 1);
  if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / (a || 1))); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / (a || 1))); }
  const c1 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s], c2 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
  return len(sub(c1, c2));
}
const med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pct = (a, q) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
const f2 = x => (Number.isFinite(x) ? x.toFixed(2) : '—'), f0 = x => (Number.isFinite(x) ? x.toFixed(0) : '—');

function archivos(r) {
  if (r.endsWith('.jsonl')) return [r];
  return fs.readdirSync(r).filter(f => f.endsWith('.jsonl') && (todos || /cruz/i.test(f))).map(f => path.join(r, f));
}

function medir(file) {
  const L = fs.readFileSync(file, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const cab = L[0], asp = (cab.ancho || 16) / (cab.alto || 9);
  const out = { cuadros: 0, tuAnte: [], tuCodo: [], tiAnte: [], tiCodo: [], flex: [], dist: [], lin: [], estirado: 0, apoyo: [], manosVistas: 0 };
  for (const o of L.slice(1)) {
    if (!o.pose || !o.t3) continue;
    const P = i => o.pose[i], vis = i => P(i)[3];
    if (vis(11) < 0.5 || vis(12) < 0.5) continue;
    const sw = Math.abs(P(11)[0] - P(12)[0]) * asp, shY = (P(11)[1] + P(12)[1]) / 2;
    const cruzado = (P(15)[0] - P(16)[0]) * (P(11)[0] - P(12)[0]) < 0 && vis(15) > 0.3 && vis(16) > 0.3 && P(15)[1] > shY - 0.2 * sw;
    const T = o.t3, S = [T.left[0], T.right[0]], E = [T.left[1], T.right[1]], W = [T.left[2], T.right[2]];
    const tsw = len(sub(S[0], S[1])), tshY = (S[0][1] + S[1][1]) / 2;
    // (y de la imagen hacia abajo, en altos de imagen; sw es el ancho de hombros pasado a altos de imagen)
    const tuA = ((P(13)[1] + P(14)[1] + P(15)[1] + P(16)[1]) / 4 - shY) / sw, tuC = ((P(13)[1] + P(14)[1]) / 2 - shY) / sw;
    const tiA = (tshY - (E[0][1] + E[1][1] + W[0][1] + W[1][1]) / 4) / tsw, tiC = (tshY - (E[0][1] + E[1][1]) / 2) / tsw;
    const fl = [0, 1].map(k => ang(sub(E[k], S[k]), sub(W[k], E[k])));
    const d = Math.min(segDist(E[0], W[0], E[1], W[1]), segDist(E[0], W[0], S[1], E[1]), segDist(E[1], W[1], S[0], E[0])) / tsw;
    // la palma de cada mano respecto del BRAZO contrario (hombro-codo): 0 = apoyada sobre él (como al cruzarse de verdad)
    const Pm = [T.left[3] || W[0], T.right[3] || W[1]];
    const ap = Math.max(segDist(Pm[0], Pm[0], S[1], E[1]), segDist(Pm[1], Pm[1], S[0], E[0])) / tsw;
    if (linea && Math.abs(o.t * 2 - Math.round(o.t * 2)) < 0.017) out.lin.push(`${o.t.toFixed(1).padStart(5)} s ${cruzado ? 'CRUZ' : '    '}  vos ${f2(tuA)}  tiesme ${f2(tiA)}  codo vos ${f2(tuC)} tiesme ${f2(tiC)}  doblez ${f0(fl[0])}°/${f0(fl[1])}°  dist ${f2(d)}`);
    if (!cruzado) continue;
    out.cuadros++;
    if (Math.min(...fl) < 30) out.estirado++; // un brazo derecho con los brazos cruzados: atraviesa el cuerpo
    out.apoyo.push(ap); if (o.manos?.left || o.manos?.right) out.manosVistas++;
    out.tuAnte.push(tuA); out.tuCodo.push(tuC); out.tiAnte.push(tiA); out.tiCodo.push(tiC); out.flex.push(...fl); out.dist.push(d);
  }
  return out;
}

for (const r of rutas) {
  console.log(`\n== ${r}`);
  for (const f of archivos(r)) {
    const m = medir(f);
    console.log(`${path.basename(f)}: ${m.cuadros} cuadros cruzados`);
    if (m.cuadros) {
      console.log(`  antebrazos debajo del hombro (anchos de hombro, mediana): vos ${f2(med(m.tuAnte))} · tiesme ${f2(med(m.tiAnte))}`);
      console.log(`  codos debajo del hombro (mediana):                       vos ${f2(med(m.tuCodo))} · tiesme ${f2(med(m.tiCodo))}`);
      console.log(`  un brazo de tiesme estirado (doblez < 30°): ${f0(100 * m.estirado / m.cuadros)}% de los cuadros cruzados`);
      console.log(`  doblez del codo de tiesme: mediana ${f0(med(m.flex))}° · p90 ${f0(pct(m.flex, 0.9))}° · máx ${f0(Math.max(...m.flex))}° · >140°: ${f0(100 * m.flex.filter(x => x > 140).length / m.flex.length)}%`);
      console.log(`  distancia entre sus brazos (anchos de hombro): p10 ${f2(pct(m.dist, 0.1))} · mediana ${f2(med(m.dist))} · mín ${f2(Math.min(...m.dist))}`);
      console.log(`  palma más lejos del brazo contrario (0 = apoyada): mediana ${f2(med(m.apoyo))} · p90 ${f2(pct(m.apoyo, 0.9))} · tus manos vistas en el ${f0(100 * m.manosVistas / m.cuadros)}% de los cuadros cruzados`);
    }
    if (linea) console.log(m.lin.join('\n'));
  }
}
