// Solo bateria 1 (B1-03 manos en la cara): distancia mediana de cada palma de tiesme a su cara (1,0 = apoyada en la
// superficie; mas = en el aire) por tramo, mirados en el video. Uso: node cara_b1.js <analisis> [...]
const fs = require('fs'), path = require('path');
const TRAMOS = [['mejillas', 1.3, 3.2], ['tapar 1', 3.6, 5.2], ['rascar', 5.7, 7.2], ['tapar 2', 9.8, 11.8]];
const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
console.log('carpeta'.padEnd(22), TRAMOS.map(t => `${t[0]} (${t[1]}-${t[2]} s)`.padStart(22)).join(''), '  adentro');
for (const c of process.argv.slice(2)) {
  const L = fs.readFileSync(path.join(c, '03_manos_cara.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(o => o.t !== undefined && o.palma);
  const cols = TRAMOS.map(([, a, b]) => {
    const q = L.filter(o => o.t >= a && o.t <= b);
    return `izq ${med(q.map(o => o.palma.left.cara)).toFixed(2)} der ${med(q.map(o => o.palma.right.cara)).toFixed(2)}`.padStart(22);
  }).join('');
  const dentro = L.filter(o => Math.min(o.palma.left.cara, o.palma.right.cara) < 0.97).length;
  console.log(path.basename(c).padEnd(22), cols, `  ${dentro} cuadros`);
}
