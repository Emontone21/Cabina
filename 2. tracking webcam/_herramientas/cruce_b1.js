// Solo para la bateria 1 (B1-04 brazos cruzados): verdad mirada en el video. Uso: node cruce_b1.js <analisis>/04_brazos_cruzados.jsonl [...]
// B1-04: % de cuadros con el antebrazo correcto adelante. Verdad (mirando el video): tu brazo derecho arriba 1,5-7,0 s
// (= tiesme izquierdo adelante, en espejo), tu izquierdo arriba 8,5-10,3 s (= tiesme derecho adelante).
const fs=require('fs');
for(const f of process.argv.slice(2)){
 const L=fs.readFileSync(f,'utf8').trim().split('\n').map(JSON.parse).filter(o=>o.t!==undefined&&o.t3);
 let ok=0,n=0,mal=[];
 for(const o of L){ const want=o.t>=1.5&&o.t<=7?'left':o.t>=8.5?'right':null; if(!want) continue;
  const zf=S=>(o.t3[S][1][2]+o.t3[S][2][2])/2; const front=zf('left')>=zf('right')?'left':'right';
  n++; if(front===want) ok++; else mal.push(o.t.toFixed(1)); }
 const tramos=[...new Set(mal.map(t=>Math.floor(+t*2)/2))].join(' ');
 console.log(f.split(/[\/]/).slice(-2).join('/'), `correcto ${Math.round(100*ok/n)}% de ${n}`, '| mal en:', tramos);
}
