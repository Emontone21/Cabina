// Hilos de titiritero (2.3–2.4): salen de las articulaciones de tiesme hacia arriba. Tiemblan, titilan y se cortan de a
// uno: cada corte es una parte que pasa a ser de ella. Se dibujan en un canvas 2D encima de la imagen.

export function crearHilos(api, canvas, dpr) {
  const { THREE, camera, B } = api;
  const ctx = canvas.getContext('2d');
  const cabezaH = B('headtopend') ? 'headtopend' : 'head';
  // parte -> huesos de donde sale un hilo
  const ANCLAS = { cabeza: [cabezaH], torso: ['leftarm', 'rightarm'], brazoIzq: ['leftforearm', 'lefthand'], brazoDer: ['rightforearm', 'righthand'] };
  const hilos = [];
  for (const [parte, huesos] of Object.entries(ANCLAS)) for (const h of huesos) if (B(h)) hilos.push({ parte, h, fase: Math.random() * 6.3, corte: null, dx: (Math.random() - 0.5) * 0.06 });
  let alfa = 0, alfaObj = 0, tension = 0, t = 0;
  const v = new THREE.Vector3();

  const mostrar = (on, seg = 1) => { alfaObj = on ? 1 : 0; velA = seg > 0 ? 1 / seg : Infinity; };
  let velA = 1;
  const tensar = k => { tension = k; };
  function cortar(parte) {
    let alguno = false;
    for (const s of hilos) if (s.parte === parte && !s.corte) { s.corte = { t0: t + Math.random() * 0.15, y: 0.18 + Math.random() * 0.35 }; alguno = true; }
    return alguno;
  }
  function reset() { alfa = alfaObj = 0; tension = 0; for (const s of hilos) s.corte = null; }
  const quedan = () => [...new Set(hilos.filter(s => !s.corte).map(s => s.parte))];
  const visibles = () => alfaObj > 0 || alfa > 0.01;

  function cuadro(dt) {
    t += dt;
    const d = alfaObj - alfa; alfa += Math.sign(d) * Math.min(Math.abs(d), velA * dt);
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (alfa <= 0.001) return;
    ctx.lineCap = 'round';
    for (const s of hilos) {
      B(s.h).getWorldPosition(v); v.project(camera);
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      const xTop = x + s.dx * W;
      const vib = (0.6 + tension * 3) * dpr * Math.sin(t * (18 + tension * 30) + s.fase);
      let a = alfa * (0.55 + 0.35 * Math.sin(t * 2 + s.fase));
      if (tension > 0.3 && Math.random() < tension * 0.08) a *= 0.2; // titila
      const trazar = (dibujo, k = 1) => {
        ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(40,25,10,${(a * k * 0.45).toFixed(3)})`; ctx.lineWidth = 3.2 * dpr; dibujo();
        ctx.shadowColor = 'rgba(255,240,200,.8)'; ctx.shadowBlur = 6 * dpr;
        ctx.strokeStyle = `rgba(255,248,225,${(a * k).toFixed(3)})`; ctx.lineWidth = 1.6 * dpr; dibujo();
      };
      if (!s.corte || t < s.corte.t0) {
        trazar(() => { ctx.beginPath(); ctx.moveTo(xTop, -5); ctx.quadraticCurveTo((x + xTop) / 2 + vib, y * 0.5, x, y); ctx.stroke(); });
        continue;
      }
      // cortado: la parte de arriba sube y se va; la de abajo cae colgando de la articulacion y se apaga
      const tc = t - s.corte.t0, yc = s.corte.y * H, fade = Math.max(0, 1 - tc / 0.9);
      if (fade <= 0) continue;
      const yArriba = yc - tc * H * 1.4;
      if (yArriba > 0) trazar(() => { ctx.beginPath(); ctx.moveTo(xTop, -5); ctx.lineTo(xTop + (x - xTop) * (yArriba / y), yArriba); ctx.stroke(); }, fade);
      const largo = Math.max(0, y - yc), cae = Math.min(1, tc * 2.2);
      const xf = x + Math.sin(tc * 7 + s.fase) * largo * 0.25 * (1 - cae), yf = y - largo * (1 - cae) * (1 - cae) + largo * 0.15 * cae;
      trazar(() => { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (xf - x) * 0.5 + 8 * dpr, (y + yf) / 2, xf, yf); ctx.stroke(); }, fade);
    }
    ctx.shadowBlur = 0;
  }
  return { mostrar, tensar, cortar, reset, quedan, visibles, cuadro };
}
