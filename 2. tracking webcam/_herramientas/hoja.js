// Hoja de contacto de un analisis: junta las fotos (camara | tiesme, una cada 0,5 s) de cada clip en una imagen.
// Uso:  node hoja.js <carpeta analisis_vN> [columnas]     (necesita ffmpeg instalado)
// Deja <clip>_hoja.jpg en la misma carpeta.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const dir = process.argv[2], cols = +(process.argv[3] || 5);
if (!dir) { console.log('Uso: node hoja.js <carpeta analisis_vN> [columnas]'); process.exit(1); }
const clips = [...new Set(fs.readdirSync(dir).filter(f => /_f\d{4}\.jpg$/.test(f)).map(f => f.replace(/_f\d{4}\.jpg$/, '')))];
for (const c of clips) {
  const n = fs.readdirSync(dir).filter(f => f.startsWith(c + '_f')).length, rows = Math.ceil(n / cols);
  const out = path.join(dir, c + '_hoja.jpg');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(dir, c + '_f%04d.jpg'),
    '-vf', `tile=${cols}x${rows}:padding=4:color=white`, '-frames:v', '1', '-q:v', '3', out]);
  console.log(out, `(${n} fotos)`);
}
