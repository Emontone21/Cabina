#!/bin/bash
# Mide la C920 con la escena quieta: graba N segundos a 1080p MJPEG (como la usa Chrome) y calcula
# cuadros/s reales, brillo, parpadeo (cuanto sube y baja el brillo entre cuadros), ruido y nitidez.
# Uso: bash camara_medir.sh <nombre> [segundos]
cd "$(dirname "$0")" && mkdir -p mediciones_camara && cd mediciones_camara
N="$1"; S="${2:-8}"
timeout $((S + 15)) ffmpeg -hide_banner -loglevel error -y -f dshow -rtbufsize 300M -video_size 1920x1080 -framerate 30 \
  -vcodec mjpeg -i video="HD Pro Webcam C920" -t "$S" -c copy "$N.mkv" || { echo "NO SE PUDO ABRIR LA CAMARA"; exit 1; }
# intervalos entre cuadros (cuadros/s reales)
ffprobe -v error -select_streams v:0 -show_entries packet=pts_time -of csv=p=0 "$N.mkv" > "$N.pts.txt"
# brillo y diferencia entre cuadros (ruido, la escena esta quieta) en toda la imagen
ffmpeg -v error -i "$N.mkv" -vf "format=gray,crop=1920:480:0:0,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$N.yavg.txt" -f null -
ffmpeg -v error -i "$N.mkv" -vf "crop=1920:480:0:0,format=gray,signalstats,metadata=print:key=lavfi.signalstats.YDIF:file=$N.ydif.txt" -f null -
# nitidez del cuadro de la pared (zona con bordes): blurdetect, menor = mas nitido
ffmpeg -v error -i "$N.mkv" -vf "crop=480:360:720:0,blurdetect=block_width=32:block_height=32,metadata=print:key=lavfi.blur:file=$N.blur.txt" -f null -
node -e "
const fs=require('fs'), n=process.argv[1];
const num=f=>fs.readFileSync(f,'utf8').split('\n').map(l=>{const m=/=([\d.]+)\s*$/.exec(l);return m?+m[1]:null}).filter(v=>v!==null);
const pts=fs.readFileSync(n+'.pts.txt','utf8').trim().split('\n').map(Number);
const dt=pts.slice(1).map((v,i)=>v-pts[i]).sort((a,b)=>a-b);
const y=num(n+'.yavg.txt'), d=num(n+'.ydif.txt').slice(1), b=num(n+'.blur.txt');
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length, sd=a=>Math.sqrt(mean(a.map(v=>(v-mean(a))**2))), med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1]};
const fps=(pts.length-1)/(pts[pts.length-1]-pts[0]);
console.log(JSON.stringify({medida:n, cuadros:pts.length, cps:+fps.toFixed(2), intervalo_ms:[+(dt[0]*1000).toFixed(1), +(med(dt)*1000).toFixed(1), +(dt[dt.length-1]*1000).toFixed(1)],
  brillo:+mean(y).toFixed(1), parpadeo_pct:+(100*sd(y)/mean(y)).toFixed(2), ruido:+med(d).toFixed(3), borroneo:+med(b).toFixed(3)}));
" "$N"
