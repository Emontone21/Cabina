#!/bin/bash
# Nitidez de dos zonas de la imagen (menor borroneo = mas nitido): el cuadro de la pared (lejos) y la zona de la
# persona (cerca). Graba 3 s a 1080p MJPEG. Uso: bash camara_nitidez.sh <nombre>
cd "$(dirname "$0")" && mkdir -p mediciones_camara && cd mediciones_camara
N="$1"
timeout 20 ffmpeg -hide_banner -loglevel error -y -f dshow -rtbufsize 300M -video_size 1920x1080 -framerate 30 \
  -vcodec mjpeg -i video="HD Pro Webcam C920" -t 3 -c copy "$N.mkv" || { echo "NO SE PUDO ABRIR LA CAMARA"; exit 1; }
ffmpeg -v error -i "$N.mkv" -vf "crop=480:360:720:0,blurdetect=block_width=32:block_height=32,metadata=print:key=lavfi.blur:file=$N.lejos.txt" -f null -
ffmpeg -v error -i "$N.mkv" -vf "crop=320:320:780:260,blurdetect=block_width=32:block_height=32,metadata=print:key=lavfi.blur:file=$N.cerca.txt" -f null -
ffmpeg -v error -y -ss 1.5 -i "$N.mkv" -frames:v 1 -vf "crop=320:320:780:260" "$N.cerca.jpg"
node -e "
const fs=require('fs'), n=process.argv[1];
const num=f=>fs.readFileSync(f,'utf8').split('\n').map(l=>{const m=/=([\d.]+)\s*$/.exec(l);return m?+m[1]:null}).filter(v=>v!==null);
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1]};
console.log(JSON.stringify({medida:n, borroneo_lejos:+med(num(n+'.lejos.txt')).toFixed(3), borroneo_cerca:+med(num(n+'.cerca.txt')).toFixed(3)}));
" "$N"
