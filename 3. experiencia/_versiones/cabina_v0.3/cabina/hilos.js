// Hilos de titiritero (2.3–2.4): salen de las articulaciones de tiesme hacia arriba. Tiemblan, titilan y se cortan de a
// uno: cada corte es una parte que pasa a ser de ella. Se dibujan en un canvas 2D encima de la imagen.
// v0.3 (los hilos): con cruceta(…) los hilos ya no van al techo sino a la CRUCETA (la cruz del titiritero), que sigue
// la mano de la persona. modo 'atado' = los hilos llegan a ella (flojo: 0 tensos … 1 bien flojos, cuando apoya en el
// piso) · modo 'suelto' = cuelgan de la cruceta sin nadie abajo (cuando la soltás y al final, con el telón cerrado).

export function crearHilos(api, canvas, dpr) {
  const { THREE, camera, B } = api;
  const ctx = canvas.getContext('2d');
  const cabezaH = B('headtopend') ? 'headtopend' : 'head';
  // parte -> huesos de donde sale un hilo
  const ANCLAS = { cabeza: [cabezaH], torso: ['leftarm', 'rightarm'], brazoIzq: ['leftforearm', 'lefthand'], brazoDer: ['rightforearm', 'righthand'] };
  // en la cruceta: a qué distancia del centro se ata cada hilo (en largos de la cruceta; el lado lo da la pantalla)
  const EN_CRUZ = { [cabezaH]: 0, leftarm: 0.16, rightarm: 0.16, leftforearm: 0.4, rightforearm: 0.4, lefthand: 0.5, righthand: 0.5 };
  const hilos = [];
  for (const [parte, huesos] of Object.entries(ANCLAS)) for (const h of huesos) if (B(h)) hilos.push({ parte, h, fase: Math.random() * 6.3, corte: null, dx: (Math.random() - 0.5) * 0.06 });
  let alfa = 0, alfaObj = 0, tension = 0, t = 0;
  const v = new THREE.Vector3();
  let cruz = null;

  const mostrar = (on, seg = 1) => { alfaObj = on ? 1 : 0; velA = seg > 0 ? 1 / seg : Infinity; };
  let velA = 1;
  const tensar = k => { tension = k; };
  function cortar(parte) {
    let alguno = false;
    for (const s of hilos) if (s.parte === parte && !s.corte) { s.corte = { t0: t + Math.random() * 0.15, y: 0.18 + Math.random() * 0.35 }; alguno = true; }
    return alguno;
  }
  function reset() { alfa = alfaObj = 0; tension = 0; cruz = null; delante(false); for (const s of hilos) s.corte = null; }
  const quedan = () => [...new Set(hilos.filter(s => !s.corte).map(s => s.parte))];
  const visibles = () => alfaObj > 0 || alfa > 0.01;
  // { x, y (0 a 1), giro (radianes), modo: 'atado' | 'suelto', flojo (0 a 1), largo (de la cruceta, 0 a 1 del ancho) } o null
  const cruceta = o => { cruz = o ? { giro: 0, modo: 'atado', flojo: 0, largo: 0.24, ...cruz, ...o } : null; };
  // por delante del telón (el final, con el telón cerrado)
  const delante = on => { canvas.style.zIndex = on ? 4 : ''; };

  // la cruz de madera: el palo largo (de costado) y uno corto (de frente se ve como un punto más grueso)
  function dibujarCruceta(cx, cy, s, giro) {
    const g = s * 0.075;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(giro);
    // halo: es tu mano
    const rg = ctx.createRadialGradient(0, 0, s * 0.05, 0, 0, s * 0.75);
    rg.addColorStop(0, `rgba(255,240,200,${0.35 * alfa})`); rg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = rg; ctx.fillRect(-s, -s, 2 * s, 2 * s);
    ctx.globalAlpha = alfa;
    const palo = (x, y, w, h) => {
      ctx.fillStyle = '#3a2412'; ctx.fillRect(x - dpr, y - dpr, w + 2 * dpr, h + 2 * dpr);
      const lg = ctx.createLinearGradient(0, y, 0, y + h); lg.addColorStop(0, '#d9a066'); lg.addColorStop(1, '#8a5a2b');
      ctx.fillStyle = lg; ctx.fillRect(x, y, w, h);
    };
    palo(-s / 2, -g / 2, s, g);                 // palo largo
    palo(-g * 0.8, -s * 0.18, g * 1.6, s * 0.36); // palo corto (cruzado)
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function cuadro(dt) {
    t += dt;
    const d = alfaObj - alfa; alfa += Math.sign(d) * Math.min(Math.abs(d), velA * dt);
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (alfa <= 0.001) return;
    ctx.lineCap = 'round';
    const trazar = (dibujo, a, k = 1) => {
      ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(40,25,10,${(a * k * 0.45).toFixed(3)})`; ctx.lineWidth = 3.2 * dpr; dibujo();
      ctx.shadowColor = 'rgba(255,240,200,.8)'; ctx.shadowBlur = 6 * dpr;
      ctx.strokeStyle = `rgba(255,248,225,${(a * k).toFixed(3)})`; ctx.lineWidth = 1.6 * dpr; dibujo();
    };
    if (cruz) { cuadroCruceta(W, H, trazar); ctx.shadowBlur = 0; return; }
    for (const s of hilos) {
      B(s.h).getWorldPosition(v); v.project(camera);
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      const xTop = x + s.dx * W;
      const vib = (0.6 + tension * 3) * dpr * Math.sin(t * (18 + tension * 30) + s.fase);
      let a = alfa * (0.55 + 0.35 * Math.sin(t * 2 + s.fase));
      if (tension > 0.3 && Math.random() < tension * 0.08) a *= 0.2; // titila
      if (!s.corte || t < s.corte.t0) {
        trazar(() => { ctx.beginPath(); ctx.moveTo(xTop, -5); ctx.quadraticCurveTo((x + xTop) / 2 + vib, y * 0.5, x, y); ctx.stroke(); }, a);
        continue;
      }
      // cortado: la parte de arriba sube y se va; la de abajo cae colgando de la articulacion y se apaga
      const tc = t - s.corte.t0, yc = s.corte.y * H, fade = Math.max(0, 1 - tc / 0.9);
      if (fade <= 0) continue;
      const yArriba = yc - tc * H * 1.4;
      if (yArriba > 0) trazar(() => { ctx.beginPath(); ctx.moveTo(xTop, -5); ctx.lineTo(xTop + (x - xTop) * (yArriba / y), yArriba); ctx.stroke(); }, a, fade);
      const largo = Math.max(0, y - yc), cae = Math.min(1, tc * 2.2);
      const xf = x + Math.sin(tc * 7 + s.fase) * largo * 0.25 * (1 - cae), yf = y - largo * (1 - cae) * (1 - cae) + largo * 0.15 * cae;
      trazar(() => { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (xf - x) * 0.5 + 8 * dpr, (y + yf) / 2, xf, yf); ctx.stroke(); }, a, fade);
    }
    ctx.shadowBlur = 0;
  }

  function cuadroCruceta(W, H, trazar) {
    const cx = cruz.x * W, cy = cruz.y * H, s = cruz.largo * W, a = alfa * 0.9;
    const cs = Math.cos(cruz.giro), sn = Math.sin(cruz.giro);
    const punta = off => [cx + off * s * cs, cy + off * s * sn];
    // centro de ella en la pantalla (para saber de qué lado va cada hilo)
    let xc = cx;
    if (cruz.modo === 'atado') { B(cabezaH).getWorldPosition(v); v.project(camera); xc = (v.x * 0.5 + 0.5) * W; }
    for (const s0 of hilos) {
      const dist = EN_CRUZ[s0.h] ?? 0.3;
      if (cruz.modo === 'suelto') {
        // cuelgan de la cruceta y se balancean (nadie abajo)
        const lado = /^left/.test(s0.h) ? 1 : /^right/.test(s0.h) ? -1 : 0;
        const [x0, y0] = punta(lado * dist), largo = H * (0.1 + dist * 0.12);
        const bal = Math.sin(t * 2.1 + s0.fase) * largo * 0.18;
        trazar(() => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + bal * 0.4, y0 + largo * 0.5, x0 + bal, y0 + largo); ctx.stroke(); }, a * 0.8);
        continue;
      }
      B(s0.h).getWorldPosition(v); v.project(camera);
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      const lado = Math.abs(x - xc) < 2 ? 0 : Math.sign(x - xc);
      const [x0, y0] = punta(lado * dist);
      // flojo: el hilo hace panza hacia abajo
      const panza = cruz.flojo * Math.hypot(x - x0, y - y0) * 0.45 + Math.sin(t * 3 + s0.fase) * dpr * 0.8;
      trazar(() => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x + x0) / 2, (y + y0) / 2 + panza, x, y); ctx.stroke(); }, a);
    }
    ctx.shadowBlur = 0;
    dibujarCruceta(cx, cy, s, cruz.giro);
  }
  return { mostrar, tensar, cortar, reset, quedan, visibles, cuadro, cruceta, delante };
}
