#!/bin/bash
# Movimiento: graba 6 s a 1080p MJPEG con la persona moviendo las manos. Calcula cuadros/s, brillo, ruido (franja de
# arriba, quieta) y borroneo de la zona del pecho y las manos; arma una hoja con 12 cuadros de esa zona.
# Uso: bash camara_movimiento.sh <nombre>
cd "$(dirname "$0")" && mkdir -p mediciones_camara && cd mediciones_camara
N="$1"
timeout 25 ffmpeg -hide_banner -loglevel error -y -f dshow -rtbufsize 300M -video_size 1920x1080 -framerate 30 \
  -vcodec mjpeg -i video="HD Pro Webcam C920" -t 6 -c copy "$N.mkv" || { echo "NO SE PUDO ABRIR LA CAMARA"; exit 1; }
ffprobe -v error -select_streams v:0 -show_entries packet=pts_time -of csv=p=0 "$N.mkv" > "$N.pts.txt"
ffmpeg -v error -i "$N.mkv" -vf "format=gray,crop=1920:480:0:0,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$N.yavg.txt" -f null -
ffmpeg -v error -i "$N.mkv" -vf "format=gray,crop=1920:480:0:0,signalstats,metadata=print:key=lavfi.signalstats.YDIF:file=$N.ydif.txt" -f null -
ffmpeg -v error -i "$N.mkv" -vf "crop=900:540:510:540,blurdetect=block_width=32:block_height=32,metadata=print:key=lavfi.blur:file=$N.blur.txt" -f null -
ffmpeg -v error -y -i "$N.mkv" -vf "fps=2,crop=900:540:510:540,scale=450:-1,tile=4x3:padding=4:color=white" -frames:v 1 "$N.hoja.jpg"
node -e "
const fs=require('fs'), n=process.argv[1];
const num=f=>fs.readFileSync(f,'utf8').split('\n').map(l=>{const m=/=([\d.]+)\s*$/.exec(l);return m?+m[1]:null}).filter(v=>v!==null);
const pts=fs.readFileSync(n+'.pts.txt','utf8').trim().split('\n').map(Number);
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length, med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1]}, p90=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length*0.9)]};
const b=num(n+'.blur.txt');
console.log(JSON.stringify({medida:n, cps:+((pts.length-1)/(pts[pts.length-1]-pts[0])).toFixed(2), brillo:+mean(num(n+'.yavg.txt')).toFixed(1),
  ruido:+med(num(n+'.ydif.txt').slice(1)).toFixed(3), borroneo_manos_mediana:+med(b).toFixed(2), borroneo_manos_p90:+p90(b).toFixed(2)}));
" "$N"
