// El juego de LOS HILOS (v0.3, escenas 7 y 8): ella te da los hilos porque quiere. La CRUCETA sigue tu mano (el
// puntero de senales.js) y ella cuelga de los hilos, con un poco de resorte para que se balancee.
// Todo se calcula en la pantalla (x, y de 0 a 1; y: 0 = arriba) y se pasa a la raíz del modelo midiendo dónde se ve
// su cadera en cada cuadro: así no depende del plano de la cámara.
// Tramos (modo):
// - 'agarra': la levantás y la bajás. Si la cruceta queda baja, apoya los pies en el piso y los hilos se aflojan.
// - 'utileria': pasan cosas por el escenario (de derecha a izquierda) y hay que levantarla a tiempo.
// - 'vuelo': suben por la torre del teatro; tu mano la lleva para los costados; caen contrapesos.
// - 'arriba': llegaron; queda colgada esperando que la sueltes · 'cae': la soltaste y cae hasta salir de cuadro.
// Lo que pasa (choques, pasadas, el "¡ahora!" de Richie) se avisa con alPasar(evento, cosa); lo dice el director.

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;

export function crearTitere(api, { cuerpo, hilos, esc, guion, S, alPasar }) {
  const g = guion.hilos, camera = api.camera;
  // resorte de los hilos (con poco freno: se balancea) y gravedad al soltarla, en pantallas por segundo²
  const RESORTE = 55, FRENO = 7, GRAVEDAD = 4.5;
  let st = null, med = null;
  const cosas = [], bolsas = [];
  const BRAZOS_COLGADA = { brazoIzq: { brazo: [0.8, -0.3, 0.1], ante: [0.55, 0.35, 0.15] }, brazoDer: { brazo: [0.8, -0.3, 0.1], ante: [0.55, 0.35, 0.15] } };
  const REPOSO_B = cuerpo.REPOSO;

  // cuánto de la pantalla (de alto) es una unidad de la raíz (cuerpo.js: y en mitades del encuadre)
  const unidad = () => 0.5 * (camera.zoom || 1);
  // dónde se ve un hueso cualquiera (cuerpo.enPantalla solo conoce los del tracking, no las piernas)
  const v3 = new api.THREE.Vector3();
  const enPant = n => { const b = api.B(n); if (!b) return null; b.getWorldPosition(v3).project(camera); return { x: (v3.x + 1) / 2, y: (1 - v3.y) / 2 }; };
  // medidas de su cuerpo en unidades de la raíz (no cambian con el plano): de la cadera al tope de la cabeza y a los pies
  function medir(u) {
    const c = enPant('hips'), h = enPant('headtopend') || enPant('head'), p = enPant('lefttoebase') || enPant('leftfoot');
    if (!c || !h) return null;
    const cabeza = (c.y - h.y) / u * 1.08;
    return { cabeza, pies: p ? (p.y - c.y) / u : cabeza * 1.2, conPies: !!p };
  }

  function empezar({ agarrada = false } = {}) {
    st = {
      modo: 'agarra', t: 0, enLugar: agarrada ? 9 : 0, perdida: 9, mano: false,
      cx: 0.5, cy: agarrada ? lerp(g.cruceta.arriba, g.cruceta.abajo, 0.4) : -0.12, cxAnt: 0.5, giro: 0,
      x: null, y: null, vx: 0, vy: 0, flojo: 1, alto: 0, enAire: false, liftMax: 0.2, piso: g.piso, aPies: 0.3,
      utileriaFin: false, vuelo: { t: 0, s: 0, prox: 0.8, fin: false }, cayo: false,
    };
    med = null; cosas.length = 0; bolsas.length = 0;
    hilos.reset(); hilos.mostrar(true, 0.8);
    hilos.cruceta({ x: st.cx, y: st.cy, modo: 'atado', flojo: 1 });
    esc.extra(dibujar);
  }
  function terminar() {
    if (!st) return;
    st = null; esc.extra(null); hilos.cruceta(null); hilos.mostrar(false, 0.3);
  }

  // tramos
  function utileria() { if (!st) return; st.modo = 'utileria'; st.t = 0; cosas.length = 0; st.utileriaFin = false; }
  function vuelo() { if (!st) return; st.modo = 'vuelo'; Object.assign(st.vuelo, { t: 0, s: 0, prox: 0.8, fin: false }); cosas.length = 0; bolsas.length = 0; }
  function arriba() { if (st) st.modo = 'arriba'; }
  function soltar() { if (!st) return; st.modo = 'cae'; st.vy = Math.min(st.vy, 0) - 0.2; hilos.cruceta({ modo: 'suelto' }); }

  function cuadro(dt) {
    if (!st) return;
    const u = unidad(), c = enPant('hips');
    if (!c) return;
    if (!med) { med = medir(u); if (!med) return; }
    const R = cuerpo.pose.raiz;
    // dónde estaría la cadera con la raíz en 0 (para pasar de la pantalla a la raíz)
    const x0 = c.x - (R.x || 0) * u, y0 = c.y + (R.y || 0) * u;
    if (st.x === null) { st.x = c.x; st.y = c.y; }
    if (!(dt > 0)) return; // pausa o la persona fuera de cuadro: todo queda quieto
    // las medidas se siguen de a poco: el tracking le inclina un poco la cadera y cambia lo que se ve de las piernas
    const m = medir(u);
    if (m && st.modo !== 'cae') { const k = Math.min(1, dt * 3); med.cabeza = lerp(med.cabeza, m.cabeza, k); med.pies = lerp(med.pies, m.pies, k); }

    // 1. tu mano → la cruceta. La mano vale con la persona en su lugar hace un ratito (al entrar pasa por cualquier lado)
    st.enLugar = S.presente ? st.enLugar + dt : 0;
    st.mano = S.mano.ok && st.enLugar > 0.6;
    st.perdida = st.mano ? 0 : st.perdida + dt;
    const fija = st.modo === 'arriba' || st.modo === 'cae';
    let tx = st.cx, ty = st.cy;
    if (!fija) {
      if (st.mano) { tx = S.mano.x; ty = lerp(g.cruceta.arriba, g.cruceta.abajo, S.mano.y); }
      else if (st.perdida > g.gracia && st.modo !== 'vuelo') { tx = lerp(st.cx, 0.5, 0.02); ty = g.cruceta.abajo + 0.05; } // la cruceta baja sola y ella apoya
    }
    const sobre = med.cabeza * u, aPies = med.pies * u;
    st.aPies = aPies;
    const enTorre = st.modo === 'vuelo' || st.modo === 'arriba' || st.modo === 'cae';
    const piso = enTorre ? 2 : g.piso - aPies;                // la cadera con los pies en el piso
    // la cruceta no baja más que su cabeza parada (si no, le queda delante de la cara): lo que bajás de más, afloja
    const tope = piso - sobre - g.largo * 0.35;
    const flojoMano = clamp((ty - tope) / 0.12);
    if (!enTorre) ty = Math.min(ty, tope);
    const kc = Math.min(1, dt / 0.08);
    st.cxAnt = st.cx; st.cx += (tx - st.cx) * kc; st.cy += (ty - st.cy) * Math.min(1, dt / (st.cy < -0.05 ? 0.5 : 0.08));
    st.giro = lerp(st.giro, clamp((st.cx - st.cxAnt) / dt * 0.35, -0.45, 0.45), Math.min(1, dt * 8));

    // 2. ella cuelga de la cruceta (resorte), apoya en el piso; en la torre no hay piso
    const colgada = st.cy + g.largo + sobre;                 // la cadera con los hilos tensos
    const minimo = g.cruceta.arriba + g.largo + sobre;       // lo más alto que se puede subir
    st.liftMax = Math.max(0.05, g.piso - aPies - minimo);
    if (st.modo === 'cae') {
      st.vy += GRAVEDAD * dt; st.vx *= 1 - Math.min(1, dt * 2);
    } else {
      const objY = Math.min(colgada, piso);
      st.flojo = Math.max(clamp((colgada - piso) / 0.12), enTorre ? 0 : flojoMano);
      st.vy += (RESORTE * (objY - st.y) - FRENO * st.vy) * dt;
      st.vx += (RESORTE * (1 - 0.75 * st.flojo) * (st.cx - st.x) - FRENO * st.vx) * dt;
    }
    st.x += st.vx * dt; st.y += st.vy * dt;
    if (st.y > piso) { st.y = piso; st.vy = Math.min(0, st.vy); }
    if (enTorre && st.modo !== 'cae') st.y = Math.min(st.y, 0.97 - aPies); // que no se vayan los pies de la pantalla
    st.x = clamp(st.x, 0.1, 0.9);
    st.enAire = st.y < piso - 0.006;
    st.alto = enTorre ? 1 : clamp((g.piso - aPies - st.y) / st.liftMax);
    if (st.modo === 'cae' && st.y - sobre > 1.15) st.cayo = true;

    // 3. a la raíz y a la pose (colgada: brazos un poco arriba, el torso se inclina con el balanceo)
    const aire = st.modo === 'cae' ? 1 : st.enAire ? clamp(st.alto * 3) : 0;
    cuerpo.fijar({
      raiz: { x: (st.x - x0) / u, y: (y0 - st.y) / u, z: 0, giro: 0 },
      torso: { roll: clamp(-st.vx * 60, -18, 18), pitch: st.modo === 'cae' ? -8 : 2, yaw: 0 },
      brazoIzq: mezclarBrazo(REPOSO_B.brazoIzq, BRAZOS_COLGADA.brazoIzq, aire),
      brazoDer: mezclarBrazo(REPOSO_B.brazoDer, BRAZOS_COLGADA.brazoDer, aire),
    });
    hilos.cruceta({ x: st.cx, y: st.cy, giro: st.giro, flojo: st.flojo });

    // 4. los tramos
    if (st.modo === 'utileria') cuadroUtileria(dt);
    if (st.modo === 'vuelo' || st.modo === 'arriba' || st.modo === 'cae') cuadroVuelo(dt, sobre);
  }
  const mezclarBrazo = (a, b, k) => ({ brazo: a.brazo.map((x, i) => lerp(x, b.brazo[i], k)), ante: a.ante.map((x, i) => lerp(x, b.ante[i], k)) });

  // ---------------------------------------------------------------- tramo 2: la utilería
  const ANCHO_ELLA = 0.05;
  function cuadroUtileria(dt) {
    const U = g.utileria;
    st.t += dt;
    for (const def of U.cosas) if (st.t >= def.en && !cosas.some(c => c.def === def)) cosas.push({ def, x: 1.1 + def.ancho / 2, estado: 'viene', cerca: false, ahora: false, caida: 0 });
    const piesY = st.y + st.aPies;
    for (const c of cosas) {
      c.x -= U.velocidad * dt;
      if (c.estado === 'golpe') c.caida = Math.min(1, c.caida + dt * 3);
      if (c.estado !== 'viene') continue;
      const borde = c.x - c.def.ancho / 2, falta = (borde - (st.x + ANCHO_ELLA)) / U.velocidad; // segundos hasta tocarla
      if (!c.cerca && falta < 1.6) { c.cerca = true; alPasar('cerca', c.def); }
      if (c.def.richie && !c.ahora && falta < 0.75) { c.ahora = true; alPasar('ahora', c.def); }
      const tope = g.piso - c.def.alto * st.liftMax;
      if (Math.abs(c.x - st.x) < c.def.ancho / 2 + ANCHO_ELLA && piesY > tope + 0.008) {
        c.estado = 'golpe'; st.vy -= 0.9; st.vx -= 0.6; alPasar('golpe', c.def);
      } else if (c.x + c.def.ancho / 2 < st.x - ANCHO_ELLA) { c.estado = 'paso'; alPasar('paso', c.def); }
    }
    const ultima = U.cosas[U.cosas.length - 1];
    if (st.t > ultima.en && cosas.length === U.cosas.length && cosas.every(c => c.x < -0.2)) st.utileriaFin = true;
  }

  // ---------------------------------------------------------------- tramo 3: el vuelo por la torre
  function cuadroVuelo(dt, sobre) {
    const V = g.vuelo, vu = st.vuelo;
    if (st.modo === 'cae') { vu.s -= dt * 2.4; return; } // al caer, la torre pasa para arriba
    if (st.modo === 'arriba') return;
    vu.t += dt;
    const frena = clamp((V.dur - vu.t) / 2.5); // llegando arriba se frena
    const vel = V.velocidad * frena;
    vu.s += vel * dt;
    if (vu.t >= V.dur) vu.fin = true;
    if (vu.t > vu.prox && vu.t < V.dur - 3) {
      vu.prox = vu.t + V.contrapesos * (0.8 + Math.random() * 0.4);
      // cae cerca de donde está ella (si no, nunca hay que esquivar)
      bolsas.push({ x: clamp(st.x + (Math.random() - 0.5) * 0.35, 0.15, 0.85), y: -0.08, vx: 0, golpe: false });
    }
    const pecho = st.y - sobre * 0.45;
    for (const b of bolsas) {
      b.y += (vel + 0.12) * dt; b.x += b.vx * dt;
      if (b.golpe) continue;
      const d = Math.min(Math.hypot(b.x - st.x, b.y - st.y), Math.hypot(b.x - st.x, b.y - pecho));
      if (d < V.radio + 0.035) {
        b.golpe = true; const lado = Math.sign(st.x - b.x) || 1;
        b.vx = -lado * 0.5; st.vx += lado * 0.9; st.vy += 0.3;
        alPasar('contrapeso');
      }
    }
    for (let i = bolsas.length - 1; i >= 0; i--) if (bolsas[i].y > 1.2) bolsas.splice(i, 1);
  }

  // ---------------------------------------------------------------- dibujo (en el fondo: detrás de ella)
  function dibujar(gx, W, H, t) {
    if (!st) return;
    if (st.modo === 'agarra' || st.modo === 'utileria') { for (const c of cosas) dibujarCosa(gx, W, H, c); return; }
    // la torre del teatro: madera oscura, cuerdas, varas que pasan y, llegando arriba, la parrilla con luz
    const vu = st.vuelo, p = clamp(vu.t / g.vuelo.dur);
    const gr = gx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, `rgb(${60 + 120 * p | 0},${40 + 90 * p | 0},${30 + 50 * p | 0})`); gr.addColorStop(1, '#0b0806');
    gx.fillStyle = gr; gx.fillRect(0, 0, W, H);
    gx.strokeStyle = 'rgba(190,150,100,.45)'; gx.lineWidth = 1.5;
    for (const x of [0.07, 0.19, 0.81, 0.93]) { gx.beginPath(); gx.moveTo(x * W, 0); gx.lineTo(x * W, H); gx.stroke(); }
    for (let i = 0; i < 6; i++) { // varas
      const y = (((i * 0.21 + vu.s) % 1.26) + 1.26) % 1.26 - 0.08;
      gx.fillStyle = 'rgba(70,45,25,.9)'; gx.fillRect(0, y * H, W, 5);
      gx.fillStyle = 'rgba(255,220,150,.25)'; gx.fillRect(0, y * H, W, 1);
    }
    if (p > 0.6) { // la parrilla: donde se atan todos los hilos
      const k = clamp((p - 0.6) / 0.4);
      const rg = gx.createRadialGradient(W / 2, 0, 5, W / 2, 0, H * 0.6);
      rg.addColorStop(0, `rgba(255,236,190,${0.7 * k})`); rg.addColorStop(1, 'rgba(255,236,190,0)');
      gx.fillStyle = rg; gx.fillRect(0, 0, W, H);
      gx.strokeStyle = `rgba(40,25,12,${0.9 * k})`; gx.lineWidth = 3;
      for (let x = 0; x <= W; x += W / 9) { gx.beginPath(); gx.moveTo(x, 0); gx.lineTo(x, H * 0.1 * k); gx.stroke(); }
      for (let y = 0; y <= H * 0.1 * k; y += H * 0.025) { gx.beginPath(); gx.moveTo(0, y); gx.lineTo(W, y); gx.stroke(); }
    }
    for (const b of bolsas) { // contrapesos: bolsas de arena colgando de una cuerda
      const x = b.x * W, y = b.y * H, r = g.vuelo.radio * W;
      gx.strokeStyle = 'rgba(200,170,120,.7)'; gx.lineWidth = 1.5; gx.beginPath(); gx.moveTo(x - b.vx * 40, 0); gx.lineTo(x, y - r); gx.stroke();
      gx.fillStyle = b.golpe ? '#6b4a2b' : '#8a6238'; gx.beginPath(); gx.ellipse(x, y, r * 0.85, r, 0, 0, 6.283); gx.fill();
      gx.fillStyle = 'rgba(0,0,0,.35)'; gx.font = `bold ${r * 0.7 | 0}px sans-serif`; gx.textAlign = 'center'; gx.textBaseline = 'middle'; gx.fillText('kg', x, y + r * 0.15);
    }
  }
  function dibujarCosa(gx, W, H, c) {
    const d = c.def, w = d.ancho * W, h = Math.max(8, d.alto * st.liftMax * H), x = c.x * W, y = g.piso * H;
    gx.save(); gx.translate(x + w / 2, y); gx.rotate(c.caida * 0.9); gx.translate(-w, 0); // si la golpea, se cae para atrás
    gx.fillStyle = '#3a2412'; gx.fillRect(-2, -h - 2, w + 4, h + 2);
    gx.fillStyle = c.estado === 'paso' ? '#a8784a' : '#c08a52'; gx.fillRect(0, -h, w, h);
    gx.fillStyle = 'rgba(0,0,0,.18)'; for (let yy = -h + 6; yy < 0; yy += 9) gx.fillRect(0, yy, w, 1.5);
    gx.font = `${Math.min(w, h) * 0.6 | 0}px sans-serif`; gx.textAlign = 'center'; gx.textBaseline = 'middle';
    gx.fillStyle = '#000'; gx.fillText(d.icono, w / 2, -h / 2); // (el emoji toma la transparencia del color)
    gx.restore();
  }

  const estado = () => (st ? {
    modo: st.modo, mano: st.mano, alto: st.alto, enAire: st.enAire, flojo: st.flojo, liftMax: st.liftMax,
    utileriaFin: st.utileriaFin, vueloFin: st.vuelo.fin, cayo: st.cayo, medidas: med,
  } : null);
  return { empezar, terminar, utileria, vuelo, arriba, soltar, cuadro, estado, activo: () => !!st, plano: () => (st ? g.plano : null) };
}
