// Video comparado de un analisis hecho con ?comparado: une las fotos por cuadro (camara con los puntos | tiesme) en
// un mp4 a 30 cuadros/s, en tiempo real y sincronizado. Despues borra esas fotos (las de cada 0,5 s quedan).
// Uso:  node video.js <carpeta analisis_vN...>     (necesita ffmpeg instalado)
// Deja <clip>_comparado.mp4 en la misma carpeta.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const dir = process.argv[2];
if (!dir) { console.log('Uso: node video.js <carpeta analisis_vN>'); process.exit(1); }
const clips = [...new Set(fs.readdirSync(dir).filter(f => /_c\d{4}\.jpg$/.test(f)).map(f => f.replace(/_c\d{4}\.jpg$/, '')))];
if (!clips.length) console.log('No hay fotos por cuadro: analizá con ?comparado');
for (const c of clips) {
  const fotos = fs.readdirSync(dir).filter(f => f.startsWith(c + '_c') && /_c\d{4}\.jpg$/.test(f));
  const out = path.join(dir, c + '_comparado.mp4');
  // (el ancho y alto tienen que ser pares para h264)
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '30', '-i', path.join(dir, c + '_c%04d.jpg'),
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', out]);
  for (const f of fotos) fs.unlinkSync(path.join(dir, f));
  console.log(out, `(${fotos.length} cuadros, ${(fotos.length / 30).toFixed(1)} s)`);
}
