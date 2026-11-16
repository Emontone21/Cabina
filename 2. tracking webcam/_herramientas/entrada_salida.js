// Mide la entrada y la salida de tiesme en un analisis (ENT-1/2/3, v11).
// Uso:  node entrada_salida.js <carpeta analisis_vN> [<otra carpeta>]
// Por clip: cuando empieza a seguirte, el mayor salto de cabeza y de brazos en los 2 s siguientes (grados por
// cuadro), cuando llega a tu pose, y (si salis de cuadro) cuando dejaste el encuadre vertical, cuando te solto y
// cuando volvio a reposo.
const fs = require('fs'), path = require('path');
const HALF = 9 / 16 * 720 / 1280 / 2;      // media franja 9:16 en ancho de imagen (camara 16:9)
const ang = (a, b) => (a && b ? 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]))) * 180 / Math.PI : 0);
function medir(file) {
  const L = fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse), H = L[0].huesos, fr = L.slice(1);
  const ix = n => H.indexOf(n), cab = ['neck', 'head'].map(ix), bra = ['leftarm', 'rightarm', 'leftforearm', 'rightforearm'].map(ix);
  const cuerpo = ['spine', 'spine1', 'spine2', 'neck', 'head', 'leftarm', 'rightarm', 'leftforearm', 'rightforearm'].map(ix);
  const reposo = fr[0].huesos;
  const iOn = fr.findIndex(o => o.sigue);
  const r = { on: iOn >= 0 ? fr[iOn].t : null };
  if (iOn >= 0) {
    let sc = 0, sb = 0, tc = 0, tb = 0;
    for (let i = iOn + 1; i < fr.length && fr[i].t < fr[iOn].t + 2; i++) {
      const c = Math.max(...cab.map(j => ang(fr[i].huesos[j], fr[i - 1].huesos[j])));
      const b = Math.max(...bra.map(j => ang(fr[i].huesos[j], fr[i - 1].huesos[j])));
      if (c > sc) { sc = c; tc = fr[i].t; }
      if (b > sb) { sb = b; tb = fr[i].t; }
    }
    Object.assign(r, { saltoCab: sc, tCab: tc, saltoBra: sb, tBra: tb });
    // llega a tu pose: el cuerpo deja de moverse mas de 1,5°/cuadro de promedio (primera vez despues de 0,3 s)
    for (let i = iOn + 10; i < fr.length; i++) {
      const v = cuerpo.reduce((s, j) => s + ang(fr[i].huesos[j], fr[i - 1].huesos[j]), 0) / cuerpo.length;
      if (v < 1.5 && ang(fr[i].huesos[cab[1]], reposo[cab[1]]) + ang(fr[i].huesos[bra[0]], reposo[bra[0]]) > 3) { r.llega = fr[i].t; break; }
    }
  }
  // salida: ultimo cuadro con los hombros dentro de la franja, cuando deja de seguirte y cuando vuelve a reposo
  const iOff = fr.findIndex((o, i) => i > iOn && iOn >= 0 && !o.sigue);
  if (iOff > 0) {
    let iSal = -1;
    for (let i = iOff; i > iOn; i--) {
      const p = fr[i].pose;
      if (p && Math.abs((p[11][0] + p[12][0]) / 2 - 0.5) < HALF) { iSal = i; break; }
    }
    r.salio = iSal >= 0 ? fr[iSal].t : null;
    r.off = fr[iOff].t;
    const iRep = fr.findIndex((o, i) => i >= iOff && cuerpo.every(j => ang(o.huesos[j], reposo[j]) < 5));
    r.reposo = iRep >= 0 ? fr[iRep].t : null;
  }
  return r;
}
const f1 = v => (v === null || v === undefined ? '  -  ' : v.toFixed(1).padStart(5));
for (const dir of process.argv.slice(2)) {
  console.log('\n== ' + dir);
  console.log('clip                 sigue  salto cab (s)   salto brazos (s)  llega | salió  suelta  reposo');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).sort()) {
    const r = medir(path.join(dir, f));
    console.log(f.replace('.jsonl', '').padEnd(20), f1(r.on), `${f1(r.saltoCab)}° (${f1(r.tCab)})`, `${f1(r.saltoBra)}° (${f1(r.tBra)})`, f1(r.llega), '|', f1(r.salio), f1(r.off), f1(r.reposo));
  }
}
