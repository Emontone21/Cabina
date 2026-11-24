// Lo que se dibuja encima de tiesme (HTML): título de la Espera, indicadores (consigna, ESTATUA, timer, puntaje),
// viñeta de diálogo (solo mientras alguien habla), negro, glitch de pantalla, temblor y el panel de quien atiende.
// Todo va dentro de #cab, que se acomoda exactamente sobre la imagen 9:16 (tele vertical o monitor con bandas).

const SIMBOLOS = '#$%&@█▓▒░<>/\\|=+*¿?!0123456789';

// v0.6: íconos de línea finos en lugar de los emojis del guion (el guion sigue diciendo el emoji: acá se traduce).
// Un emoji que no esté en la lista se muestra tal cual.
const TRAZO = d => `<svg class="ic" viewBox="0 0 24 24">${d}</svg>`;
const OJOS = '<circle cx="9" cy="10" r=".7" fill="currentColor"/><circle cx="15" cy="10" r=".7" fill="currentColor"/>';
const ICONOS = {
  '🙌': TRAZO('<circle cx="12" cy="9.5" r="2.4"/><path d="M12 12v5.5M12 13.5 7.5 4M12 13.5 16.5 4M9.5 21.5l2.5-4 2.5 4"/>'),
  '🙋': TRAZO('<circle cx="11" cy="9.5" r="2.4"/><path d="M11 12v5.5M11 13.5l-3.5 3M11 13.5 16 3.5M8.5 21.5l2.5-4 2.5 4"/>'),
  '👋': TRAZO('<circle cx="10" cy="8" r="2.4"/><path d="M10 10.5v6.5M10 12l-3.5 3M10 12l5-4.5M17 4c.9.5 1.4 1.2 1.6 2.2M18.5 2.5c1.2.7 1.9 1.7 2.2 3M7.5 21.5l2.5-4.5 2.5 4.5"/>'),
  '↔️': TRAZO('<circle cx="12" cy="12" r="4"/><path d="M2.5 12h4.5M17 12h4.5M4.5 10 2.5 12l2 2M19.5 10l2 2-2 2"/>'),
  '🙃': TRAZO('<ellipse cx="12" cy="10.5" rx="4.2" ry="5.2" transform="rotate(-28 12 10.5)"/><path d="M12.5 15.5 13 21M8 21h9"/>'),
  '😮': TRAZO(`<circle cx="12" cy="12" r="8.5"/>${OJOS}<ellipse cx="12" cy="15.5" rx="2" ry="2.6"/>`),
  '😁': TRAZO(`<circle cx="12" cy="12" r="8.5"/>${OJOS}<path d="M8 13.5c1.2 2.8 6.8 2.8 8 0"/>`),
  '🦅': TRAZO('<circle cx="12" cy="10" r="2"/><path d="M12 12v6M12 13.5 4.5 6M12 13.5 19.5 6M10 21.5l2-3.5 2 3.5"/>'),
  '🪞': TRAZO('<path d="M6 21.5V9a6 6 0 0 1 12 0v12.5z"/><path d="M9 12.5l3.5-3.5M10 17l5.5-5.5"/>'),
  '🙆': TRAZO('<circle cx="12" cy="8" r="2.4"/><path d="M12 10.5v7M3 12h18M9.5 21.5l2.5-4 2.5 4"/>'),
  // v0.7 (los dos finales): golpear el vidrio · pasarle la mano · elegir entre las dos · mano arriba / abajo
  '✋': TRAZO('<circle cx="12" cy="12" r="3.4"/><path d="M12 2.5v3.5M12 18v3.5M2.5 12H6M18 12h3.5M5.3 5.3l2.5 2.5M16.2 16.2l2.5 2.5M5.3 18.7l2.5-2.5M16.2 7.8l2.5-2.5"/>'),
  '🤚': TRAZO('<path d="M3 8.5c3-3 6 3 9 0s6-3 9 0M3 15.5c3-3 6 3 9 0s6-3 9 0"/>'),
  '⚖': TRAZO('<circle cx="6.5" cy="12" r="2"/><path d="M6.5 6v2M6.5 16v2M1.5 12h1.6M9.9 12h1.2M3 8.5l1.2 1.2M8.8 14.3 10 15.5M3 15.5l1.2-1.2M8.8 9.7 10 8.5M14 9.5c1.4-1.5 2.8 1.5 4.2 0s2.8-1.5 4.2 0M14 14.5c1.4-1.5 2.8 1.5 4.2 0s2.8-1.5 4.2 0"/>'),
  '↕': TRAZO('<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>'),
  '⟋': TRAZO('<rect x="6" y="6" width="12" height="12" transform="rotate(12 12 12)"/><path d="M2.5 20.5 21.5 3.5" stroke-width="2"/>'), // cortar el cuadrado
  '▢': TRAZO('<rect x="3" y="3" width="11" height="11" stroke-dasharray="2.2 2"/><rect x="13" y="13" width="8" height="8" fill="currentColor" stroke="none"/><path d="M16.5 11.5 11 6M11 9.5V6h3.5"/>'), // llevar el cuadrado a la caja
};
const dibujoIcono = s => ICONOS[s] || ICONOS[(s || '').replace(/️/g, '')] || (s ? String(s).replace(/</g, '&lt;') : '');

// v0.6: el espejo. Marco (delante de tiesme) y la sábana que lo tapa (el telón). Dibujados en el cuadro 9:16 (360 × 640).
// v0.7: las grietas van por IMPACTOS (antes un solo dibujo que aparecía en la discusión). El impacto 1 es el golpe de
// tiesme (escena 6) y tiene 3 ramas, que en el final de Richie se reparan de a una; los impactos 2 y 3 son los golpes
// de la persona en el final libre; después el vidrio estalla y quedan las astillas pegadas al marco.
function azar(semilla) { let s = semilla; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// una rama: varias líneas quebradas que salen del centro (0,0) dentro de un sector (ángulos en grados, 0 = derecha, 90 = abajo)
function rama(r, a0, a1, largo, n = 3) {
  let d = '', sx = 0, sy = 0, k = 0;
  for (let i = 0; i < n; i++) {
    let a = (a0 + (a1 - a0) * (i + 0.5 + (r() - 0.5) * 0.5) / n) * Math.PI / 180, x = 0, y = 0;
    const L = largo * (0.65 + r() * 0.6), tramos = 3 + (r() * 3 | 0), pts = ['0,0'];
    for (let j = 0; j < tramos; j++) {
      a += (r() - 0.5) * 0.55; const l = L / tramos * (0.7 + r() * 0.6);
      x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push(`${x.toFixed(0)},${y.toFixed(0)}`);
      if (j === 1) { sx += x; sy += y; k++; }
      if (j >= 1 && r() < 0.45) { const b = a + (r() < 0.5 ? 1 : -1) * (0.5 + r() * 0.5), m = 14 + r() * 30; d += `<polyline class="fina" points="${x.toFixed(0)},${y.toFixed(0)} ${(x + Math.cos(b) * m).toFixed(0)},${(y + Math.sin(b) * m).toFixed(0)}"/>`; }
    }
    d += `<polyline points="${pts.join(' ')}"/>`;
  }
  return { d, x: sx / k, y: sy / k };
}
const R1 = azar(7), R2 = azar(23), R3 = azar(41);
const RAMAS = [rama(R1, -115, -5, 230), rama(R1, 130, 245, 210), rama(R1, 20, 115, 250)]; // arriba a la derecha · izquierda · abajo
const IMPACTO = [
  { x: 236, y: 300, d: RAMAS.map((m, i) => `<g class="rama r${i + 1}">${m.d}</g>`).join('') + '<ellipse class="centro" cx="0" cy="0" rx="8" ry="8"/>' },
  { x: 112, y: 214, d: rama(R2, 0, 360, 190, 8).d + '<ellipse cx="0" cy="0" rx="7" ry="7"/>' },
  { x: 168, y: 452, d: rama(R3, 0, 360, 220, 9).d + '<ellipse cx="0" cy="0" rx="10" ry="10"/>' },
];
// astillas que quedan en el marco cuando el vidrio estalla (triángulos hacia adentro, por todo el borde del arco)
const ASTILLAS = (() => {
  const r = azar(97), borde = [];
  for (let y = 640; y > 150; y -= 18 + r() * 26) borde.push([18, y, 1, 0]);
  for (let t = 0.04; t < 0.97; t += 0.035 + r() * 0.04) { const u = 1 - t, x = u * u * 18 + 2 * u * t * 18 + t * t * 180, y = u * u * 152 + 2 * u * t * 20 + t * t * 20; borde.push([x, y, 0.6, 0.8]); }
  for (let t = 0.03; t < 0.96; t += 0.035 + r() * 0.04) { const u = 1 - t, x = u * u * 180 + 2 * u * t * 342 + t * t * 342, y = u * u * 20 + 2 * u * t * 20 + t * t * 152; borde.push([x, y, -0.6, 0.8]); }
  for (let y = 150; y < 640; y += 18 + r() * 26) borde.push([342, y, -1, 0]);
  return borde.map(([x, y, nx, ny]) => { const l = 10 + r() * 34, w = 6 + r() * 10, tx = -ny, ty = nx, c = (r() - 0.5) * 14;
    return `<polygon points="${(x - tx * w).toFixed(0)},${(y - ty * w).toFixed(0)} ${(x + tx * w).toFixed(0)},${(y + ty * w).toFixed(0)} ${(x + nx * l + tx * c).toFixed(0)},${(y + ny * l + ty * c).toFixed(0)}"/>`; }).join('');
})();
const MARCO = `<svg class="capa" viewBox="0 0 360 640" preserveAspectRatio="none">
  <defs><linearGradient id="cabMarcoPlata" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f949a"/><stop offset=".3" stop-color="#383b40"/><stop offset=".55" stop-color="#a3a8ad"/><stop offset="1" stop-color="#26282c"/></linearGradient>
  <clipPath id="cabVidrio"><path d="M18 640 L18 152 Q18 20 180 20 Q342 20 342 152 L342 640 Z"/></clipPath></defs>
  <g class="vidrio" clip-path="url(#cabVidrio)">
    <path class="reflejo" d="M18 330 L150 20 L190 20 L18 420 Z" fill="#fff" opacity=".03"/>
    <g class="grietas">${IMPACTO.map((m, i) => `<g class="impacto i${i + 1}" transform="translate(${m.x} ${m.y})">${m.d}</g>`).join('')}</g>
    <g class="astillas">${ASTILLAS}</g>
  </g>
  <path fill-rule="evenodd" fill="#060607" d="M0 0 H360 V640 H0 Z M4 640 L4 146 Q4 4 180 4 Q356 4 356 146 L356 640 Z"/>
  <path fill-rule="evenodd" fill="url(#cabMarcoPlata)" d="M4 640 L4 146 Q4 4 180 4 Q356 4 356 146 L356 640 Z M18 640 L18 152 Q18 20 180 20 Q342 20 342 152 L342 640 Z"/>
  <path fill="none" stroke="#000" stroke-opacity=".6" stroke-width="1.5" d="M18 640 L18 152 Q18 20 180 20 Q342 20 342 152 L342 640"/>
  <path fill="none" stroke="#c8ccd2" stroke-opacity=".35" stroke-width=".8" d="M10 640 L10 148 Q10 11 180 11 Q350 11 350 148 L350 640"/>
  <path d="M162 7 Q180 -3 198 7 Q189 16 180 13 Q171 16 162 7 Z" fill="#b9bec4"/></svg>`;
// v0.7 (23/11, "que tiesme salga del propio espejo"): el mismo marco ya estallado (sin grietas, con las astillas) como
// dibujo suelto. Cuando ella sale, el escenario lo pinta en el FONDO y esta capa se esconde: así el marco queda detrás
// de ella y se la ve cruzarlo (esta capa va siempre delante de la imagen 3D).
const MARCO_ATRAS = MARCO.replace('<svg class="capa"', '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"')
  .replace(/<path class="reflejo"[^>]*\/>/, '')
  .replace(/<g class="grietas">[\s\S]*?<g class="astillas">/, '<g fill="rgba(205,220,235,.16)" stroke="#e8eef5" stroke-opacity=".55" stroke-width=".7">');
const SABANA = `<svg class="capa" viewBox="0 0 360 640" preserveAspectRatio="none">
  <defs>
    <linearGradient id="cabSabana" x1="0" x2="1"><stop offset="0" stop-color="#6c6963"/><stop offset=".12" stop-color="#94918a"/><stop offset=".22" stop-color="#75726c"/><stop offset=".38" stop-color="#9c9890"/><stop offset=".5" stop-color="#7b7871"/><stop offset=".64" stop-color="#99958d"/><stop offset=".78" stop-color="#726f69"/><stop offset=".9" stop-color="#908c84"/><stop offset="1" stop-color="#64615c"/></linearGradient>
    <linearGradient id="cabSabanaSombra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
  </defs>
  <g class="tela">
    <path d="M2 6 Q180 36 358 6 L360 300 L360 660 L0 660 L0 300 Z" fill="url(#cabSabana)"/>
    <path d="M2 6 Q180 36 358 6 L360 300 L360 660 L0 660 L0 300 Z" fill="url(#cabSabanaSombra)"/>
    <g fill="none" stroke="#3f3d39" stroke-opacity=".45" stroke-width="2.4">
      <path d="M70 26 Q84 300 66 660"/><path d="M180 36 Q168 330 188 660"/><path d="M292 26 Q280 300 298 660"/>
      <path d="M2 6 Q100 110 180 36"/><path d="M180 36 Q262 110 358 6"/>
    </g>
    <ellipse cx="6" cy="8" rx="3" ry="3" fill="#888"/><ellipse cx="354" cy="8" rx="3" ry="3" fill="#888"/>
  </g></svg>`;
const romper = (s, k) => [...s].map(c => (c !== ' ' && Math.random() < k ? SIMBOLOS[Math.random() * SIMBOLOS.length | 0] : c)).join('');

export function crearPantalla(api, guion) {
  const $ = id => document.getElementById(id);
  const vista = api.renderer.domElement, cab = $('cab');
  const q = (el, sel) => el.querySelector(sel);
  const el = {
    titulo: $('cabTitulo'), ind: $('cabIndicador'), est: $('cabEstatua'), pun: $('cabPuntaje'), vin: $('cabVineta'),
    negro: $('cabNegro'), ojo: $('cabOjo'), sonido: $('cabSonido'), panel: $('cabPanel'), ruido: $('cabRuido'), hilos: $('cabHilos'),
  };
  const pausa = Object.assign(document.createElement('div'), { id: 'cabPausa', textContent: '⏸ PAUSA (Espacio sigue)' });
  document.body.appendChild(pausa);
  const dpr = Math.min(devicePixelRatio, 2);
  let rect = { l: -1, t: -1, w: 0, h: 0 };

  // ---------------------------------------------------------------- encima de la imagen 9:16
  function acomodar() {
    const l = parseFloat(vista.style.left) || 0, t = parseFloat(vista.style.top) || 0, w = vista.clientWidth, h = vista.clientHeight;
    if (l === rect.l && t === rect.t && w === rect.w && h === rect.h) return;
    rect = { l, t, w, h };
    Object.assign(cab.style, { left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px' });
    cab.style.setProperty('--u', (h / 100) + 'px');
    for (const c of [el.ruido, el.hilos]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  }

  // ---------------------------------------------------------------- título (Espera)
  // v0.6: letra fina de un solo color (antes, cada letra de un color y saltando)
  q(el.titulo, '.logo').textContent = guion.titulo.logo;
  q(el.titulo, '.sub').textContent = guion.titulo.sub;
  q(el.titulo, '.pasa').textContent = guion.titulo.pasa;
  const titulo = on => el.titulo.classList.toggle('visible', on);

  // ---------------------------------------------------------------- indicadores (aparte del diálogo)
  function indicador(o) {
    cab.classList.toggle('conIndicador', !!o); // el cartel del teatro está en el mismo lugar: se corre mientras tanto
    if (!o) { el.ind.classList.remove('visible'); return; }
    q(el.ind, '.icono').innerHTML = dibujoIcono(o.icono);
    q(el.ind, '.texto').innerHTML = (o.encabezado ? `<small>${o.encabezado}</small>` : '') + (o.texto || '') + (o.ayuda ? `<em>${o.ayuda}</em>` : '');
    marca('');
    el.ind.classList.remove('visible'); void el.ind.offsetWidth; el.ind.classList.add('visible');
  }
  function marca(m) {
    const mk = q(el.ind, '.marca');
    mk.textContent = m; mk.className = 'marca' + (m === '✔' ? ' ok' : m ? ' no' : '');
  }
  let estTimerGlitch = false;
  function estatua(cartel, timer, { roto = false } = {}) {
    if (cartel === null && timer === null) { el.est.classList.remove('visible'); return; }
    if (cartel !== undefined) {
      const c = q(el.est, '.cartel');
      if (c.textContent !== (cartel || '')) { c.textContent = cartel || ''; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
    }
    if (timer !== undefined) q(el.est, '.timer').textContent = timer === null ? '' : String(timer);
    q(el.est, '.timer').classList.toggle('vacio', timer === null || timer === '');
    estTimerGlitch = roto;
    el.est.classList.toggle('roto', roto);
    el.est.classList.add('visible');
  }
  function puntaje(num, txt) {
    if (num === null) { el.pun.classList.remove('visible'); return; }
    q(el.pun, '.num').textContent = num; q(el.pun, '.txt').textContent = txt || '';
    el.pun.classList.remove('visible'); void el.pun.offsetWidth; el.pun.classList.add('visible');
  }

  // ---------------------------------------------------------------- viñeta de diálogo (solo mientras alguien habla)
  // (la viñeta usa el reloj de la cabina, que se frena con la pausa: lo pasa el director en cada cuadro)
  let ahora = 0;
  const vin = { texto: '', t0: 0, dur: 0, hasta: 0, roto: false };
  function vineta(quien, texto, dur, { roto = false, oscura = false } = {}) {
    el.vin.className = `visible ${quien}${oscura ? ' oscura' : ''}`;
    q(el.vin, '.quien').textContent = quien === 'tiesme' ? 'tiesme' : 'RICHIE';
    Object.assign(vin, { texto, t0: ahora, dur: dur * 1000, hasta: ahora + dur * 1000 + 450, roto });
    q(el.vin, '.texto').textContent = '';
  }
  const sinVineta = () => { vin.hasta = 0; el.vin.classList.remove('visible'); };

  // ---------------------------------------------------------------- negro, ojo, temblor, glitch
  function negro(op, seg = 1) { el.negro.style.transition = `opacity ${seg}s ease`; el.negro.style.opacity = op; }
  const ojo = on => el.ojo.classList.toggle('visible', on);
  const ojoX = x => { q(el.ojo, '.iris').style.transform = `translate(${(x * 32).toFixed(1)}%, 0)`; };
  let temblorHasta = 0, temblorPx = 0;
  const temblor = (seg = 0.15, px = 10) => { temblorHasta = performance.now() + seg * 1000; temblorPx = px; };
  let glitchK = 0, prBase = 0, pixHasta = 0;
  const glitch = k => { glitchK = k; };
  const rc = el.ruido.getContext('2d');
  function dibujarRuido() {
    rc.clearRect(0, 0, el.ruido.width, el.ruido.height);
    if (glitchK <= 0.01) return;
    const W = el.ruido.width, H = el.ruido.height;
    const n = Math.round(glitchK * 10 * Math.random());
    for (let i = 0; i < n; i++) {
      const y = Math.random() * H, h = (2 + Math.random() * 28) * dpr;
      rc.fillStyle = ['rgba(255,0,80,.35)', 'rgba(0,255,220,.3)', 'rgba(255,255,255,.25)', 'rgba(0,0,0,.6)', 'rgba(80,0,255,.3)'][Math.random() * 5 | 0];
      rc.fillRect(Math.random() < 0.6 ? 0 : Math.random() * W * 0.6, y, W * (0.3 + Math.random() * 0.7), h);
    }
    if (Math.random() < glitchK * 0.25) {
      rc.font = `${Math.round(H * 0.035)}px ui-monospace, monospace`; rc.fillStyle = 'rgba(120,255,120,.85)';
      rc.fillText(romper('ERROR 0x' + (Math.random() * 1e8 | 0).toString(16) + ' control_perdido', 0.3), W * 0.05 * Math.random(), H * Math.random());
    }
    rc.fillStyle = `rgba(0,0,0,${0.12 * glitchK})`;
    for (let y = 0; y < H; y += 4 * dpr) rc.fillRect(0, y, W, dpr);
  }

  // ---------------------------------------------------------------- panel de quien atiende
  let panelOn = false;
  const panel = on => { panelOn = on ?? !panelOn; el.panel.classList.toggle('visible', panelOn); return panelOn; };
  const panelHTML = html => { if (panelOn) el.panel.innerHTML = html; };
  const verPausa = on => pausa.classList.toggle('visible', on);
  const sonidoAviso = on => el.sonido.classList.toggle('visible', on);

  // ---------------------------------------------------------------- cada cuadro
  function cuadro(tMs) {
    ahora = tMs;
    acomodar();
    // viñeta: el texto se escribe al ritmo de la voz
    if (vin.hasta) {
      const now = ahora;
      if (now > vin.hasta) sinVineta();
      else {
        const k = Math.min(1, (now - vin.t0) / Math.max(1, vin.dur * 0.92));
        let s = vin.texto.slice(0, Math.ceil(vin.texto.length * k));
        if (vin.roto) s = romper(s, 0.18 + 0.2 * Math.random()) + (Math.random() < 0.3 ? SIMBOLOS[Math.random() * 10 | 0] : '');
        q(el.vin, '.texto').textContent = s;
      }
    }
    if (estTimerGlitch && Math.random() < 0.3) q(el.est, '.timer').style.opacity = Math.random() < 0.5 ? 0.15 : 1;
    // glitch y temblor: se mueven juntos la imagen y las capas
    let tx = 0, ty = 0, sk = 0, filtro = '';
    if (glitchK > 0.01 && Math.random() < glitchK * 0.45) {
      tx = (Math.random() - 0.5) * 40 * glitchK; sk = (Math.random() - 0.5) * 8 * glitchK;
      filtro = `hue-rotate(${(Math.random() * 360) | 0}deg) saturate(${1 + Math.random() * 3 * glitchK}) contrast(${1 + Math.random() * glitchK})`;
      if (Math.random() < 0.2 * glitchK) filtro += ' invert(1)';
    }
    if (performance.now() < temblorHasta) { tx += (Math.random() - 0.5) * temblorPx * 2; ty += (Math.random() - 0.5) * temblorPx * 2; }
    const tr = tx || ty || sk ? `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) skewX(${sk.toFixed(2)}deg)` : '';
    vista.style.transform = tr; cab.style.transform = tr; vista.style.filter = filtro;
    // pixelado: se dibuja con muy pocos píxeles y se agranda sin suavizar
    const pix = performance.now() < pixHasta, R = api.renderer;
    if (pix && !prBase) { prBase = R.getPixelRatio(); R.setPixelRatio(prBase * 0.07); vista.style.imageRendering = 'pixelated'; }
    else if (!pix && prBase) { R.setPixelRatio(prBase); prBase = 0; vista.style.imageRendering = ''; }
    dibujarRuido();
  }

  // ================================================================ v0.2: teatrito, puntero, botones, anillos, críptico
  const mk = (id, html = '') => { const d = document.createElement('div'); d.id = id; d.innerHTML = html; cab.appendChild(d); return d; };
  const ANILLO = '<svg viewBox="0 0 100 100"><circle class="fondo" cx="50" cy="50" r="44"/><circle class="carga" cx="50" cy="50" r="44"/></svg>';
  const v2 = {
    marco: mk('cabMarco', MARCO),
    foco: mk('cabFoco'),
    telon: mk('cabTelon', SABANA),
    cartel: mk('cabCartel', '<div class="txt"></div>'),
    medidor: mk('cabMedidor', '<div class="txt"></div><div class="barra"><i></i></div>'),
    anillo: mk('cabAnillo', ANILLO + '<div class="icono"></div>'),
    botones: mk('cabBotones'),
    cript: mk('cabCriptico', '<div class="pista"></div><div class="huecos"></div>'),
    selfie: mk('cabSelfie', '<div class="txt"></div><div class="arroba"></div>'),
    puntero: mk('cabPuntero'),
  };
  // el marco y el telón van delante de tiesme pero detrás de los carteles (orden: marco, foco, telón)
  cab.insertBefore(v2.telon, el.titulo); cab.insertBefore(v2.foco, v2.telon); cab.insertBefore(v2.marco, v2.foco);
  // telon(true) abierto · telon(false) cerrado · telon('rendija') apenas abierto (para asomarse).
  // v0.6 el telón es la sábana del espejo: cerrada lo tapa, rendija se levanta desde abajo, abierta cae al piso y al
  // cerrarse sube sola (cabina.css)
  const telon = (estado, seg = 1.6) => { v2.telon.style.setProperty('--seg', seg + 's'); v2.telon.classList.toggle('abierto', estado === true); v2.telon.classList.toggle('rendija', estado === 'rendija'); };
  // ---------------------------------------------------------------- v0.7: el vidrio del espejo
  // grietas(0) sano · grietas(1, {x, y}) el golpe de tiesme (x, y de 0 a 1: dónde pegó) · grietas(2) y grietas(3) los
  // golpes de la persona · estallar() el vidrio se va (quedan las astillas) · reparar(i) cierra la rama i (0 a 2) del
  // golpe de tiesme, en dorado · puntosGrieta() dónde está cada rama en la pantalla (0 a 1), para pasarle la mano
  const destello = mk('cabDestello');
  const vid = { nivel: 0, x: IMPACTO[0].x, y: IMPACTO[0].y, reparadas: new Set() };
  const imp = [1, 2, 3].map(n => q(v2.marco, '.i' + n));
  function grietas(nivel, en) {
    if (en) { vid.x = Math.max(70, Math.min(290, en.x * 360)); vid.y = Math.max(150, Math.min(470, en.y * 640)); }
    if (nivel === 0 || en) imp[0].setAttribute('transform', `translate(${nivel === 0 ? IMPACTO[0].x : vid.x.toFixed(0)} ${nivel === 0 ? IMPACTO[0].y : vid.y.toFixed(0)})`);
    if (nivel === 0) { vid.x = IMPACTO[0].x; vid.y = IMPACTO[0].y; }
    if (nivel === 0 || nivel > vid.nivel) { vid.reparadas.clear(); imp[0].classList.remove('cerrado'); for (const g of v2.marco.querySelectorAll('.rama')) g.classList.remove('reparada'); }
    vid.nivel = nivel;
    imp.forEach((g, i) => g.classList.toggle('on', nivel > i));
    v2.marco.classList.remove('estallado'); v2.marco.classList.toggle('sano', nivel === 0);
  }
  function reparar(i) {
    vid.reparadas.add(i); q(v2.marco, '.r' + (i + 1))?.classList.add('reparada');
    if (vid.reparadas.size >= RAMAS.length) q(v2.marco, '.i1 .centro')?.parentNode.classList.add('cerrado');
  }
  function estallar() {
    v2.marco.classList.add('estallado'); vid.nivel = 4;
    destello.classList.remove('on'); void destello.offsetWidth; destello.classList.add('on');
  }
  // ---------------------------------------------------------------- v0.7: las cajas (el juego del final de Richie)
  // cajas({ riel: [y0, y1], cajas: [{ x, y, k, llena, dentro, falla }], piezas: [{ x, y, agarrada, encajada }] }) las
  // dibuja (x, y de 0 a 1); cajas(null) las saca. Dos cajas fijas y dos cuadrados que suben y bajan por un riel. En
  // cada caja: dentro = el cuadrado está pasando por ella (se ilumina) · falla = la mano entró a destiempo (rojo) ·
  // k = cuánto va de sostener la mano, de 0 a 1 (se llena desde abajo) · llena = ya está trabado.
  const cj = mk('cabCajas', '<div class="riel"></div><div class="riel"></div><div class="caja"></div><div class="caja"></div><div class="pieza"></div><div class="pieza"></div>');
  const pct = v => (v * 100).toFixed(1) + '%';
  function cajas(o) {
    cj.classList.toggle('visible', !!o);
    if (!o) return;
    const cs = cj.querySelectorAll('.caja'), ps = cj.querySelectorAll('.pieza'), rs = cj.querySelectorAll('.riel');
    o.cajas.forEach((c, i) => {
      if (!cs[i]) return;
      cs[i].style.left = pct(c.x); cs[i].style.top = pct(c.y); cs[i].style.setProperty('--k', (c.k || 0).toFixed(3));
      cs[i].classList.toggle('llena', !!c.llena); cs[i].classList.toggle('dentro', !!c.dentro && !c.llena); cs[i].classList.toggle('falla', c.falla > 0);
      if (rs[i]) { rs[i].style.display = o.riel ? '' : 'none'; if (o.riel) { rs[i].style.left = pct(c.x); rs[i].style.top = pct(o.riel[0]); rs[i].style.height = pct(o.riel[1] - o.riel[0]); } }
    });
    o.piezas.forEach((p, i) => {
      if (!ps[i]) return;
      ps[i].style.left = pct(p.x); ps[i].style.top = pct(p.y); ps[i].style.setProperty('--k', (p.k || 0).toFixed(2));
      ps[i].classList.toggle('agarrada', !!p.agarrada); ps[i].classList.toggle('encajada', !!p.encajada);
    });
  }
  // ---------------------------------------------------------------- v0.7: cortar (el último juego del final de Richie)
  // volando([{ x, y, tam, rot, estado, op, golpe }]) dibuja los cuadrados que vuelan (x, y de 0 a 1; tam en anchos de
  // pantalla; rot en grados; estado: '' entero · 'mitad' una mitad ya cortada · 'grande' el del final; op = opacidad;
  // golpe = de 0 a 1, el sacudón del grande cuando lo cortan). Van dentro del espejo: detrás del marco.
  const vol = mk('cabVolando'); cab.insertBefore(vol, v2.marco);
  function volando(lista) {
    while (vol.children.length < lista.length) vol.appendChild(document.createElement('i'));
    for (let i = 0; i < vol.children.length; i++) {
      const el = vol.children[i], o = lista[i];
      if (!o) { el.style.display = 'none'; continue; }
      el.style.display = ''; el.style.left = pct(o.x); el.style.top = pct(o.y); el.style.width = pct(o.tam); el.className = o.estado || '';
      el.style.opacity = o.op ?? 1; el.style.setProperty('--r', (o.rot || 0).toFixed(0) + 'deg'); el.style.setProperty('--g', (o.golpe || 0).toFixed(2));
    }
  }
  // estela([rastroMano0, rastroMano1]): la línea que deja cada mano al cortar (rastro = [{ x, y, v }], v = velocidad)
  const est = mk('cabEstela', '<svg class="capa" viewBox="0 0 100 177.78" preserveAspectRatio="none"><polyline/><polyline/></svg>');
  cab.insertBefore(est, v2.marco);
  function estela(rastros) {
    est.querySelectorAll('polyline').forEach((pl, i) => {
      const r = rastros?.[i] || [];
      pl.setAttribute('points', r.map(p => `${(p.x * 100).toFixed(1)},${(p.y * 177.78).toFixed(1)}`).join(' '));
      pl.style.opacity = r.length > 1 ? Math.min(1, r[r.length - 1].v / 1.1).toFixed(2) : 0;
    });
  }
  // festejo(): estalla una lluvia de cuadraditos dorados desde el centro (va detrás de la sábana: cae sobre el festejo)
  const fest = mk('cabFestejo'); cab.insertBefore(fest, v2.telon);
  let festT = 0;
  function festejo(n = 54) {
    fest.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i'), a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 52;
      for (const [k, v] of Object.entries({ '--dx': (Math.cos(a) * r * 0.62).toFixed(1), '--dy': (Math.sin(a) * r - 8 + Math.random() * 30).toFixed(1), '--s': (1.2 + Math.random() * 2.6).toFixed(1),
        '--r': Math.round((Math.random() * 2 - 1) * 540) + 'deg', '--t': (1.1 + Math.random() * 1.1).toFixed(2) + 's', '--c': ['#e6bd6a', '#c9a25a', '#f1ece2', '#d6e4ff'][i % 4] })) el.style.setProperty(k, v);
      fest.appendChild(el);
    }
    clearTimeout(festT); festT = setTimeout(() => { fest.innerHTML = ''; }, 2600);
  }
  // marcoAtras(true): esconde el marco de adelante y devuelve su dibujo, para que el escenario lo pinte en el fondo
  // (ella sale del espejo y lo cruza); marcoAtras(false) lo vuelve a poner adelante
  const marcoAtras = on => { v2.marco.style.visibility = on ? 'hidden' : ''; return on ? MARCO_ATRAS : null; };
  const puntosGrieta = () => RAMAS.map((m, i) => ({ i, x: Math.max(0.16, Math.min(0.84, (vid.x + m.x) / 360)), y: Math.max(0.2, Math.min(0.8, (vid.y + m.y) / 640)), reparada: vid.reparadas.has(i) }));
  function cartel(texto, { brilla = false } = {}) {
    if (texto === null) { v2.cartel.classList.remove('visible'); return; }
    q(v2.cartel, '.txt').textContent = texto; v2.cartel.classList.add('visible'); v2.cartel.classList.toggle('brilla', brilla);
  }
  // foco: se oscurece todo menos un círculo (x, y de 0 a 1); null lo saca
  function foco(p, radio = 0.18, oscuro = 0.72) {
    if (!p) { v2.foco.style.opacity = 0; return; }
    v2.foco.style.background = `radial-gradient(circle at ${(p.x * 100).toFixed(1)}% ${(p.y * 100).toFixed(1)}%, transparent ${radio * 100}%, rgba(0,0,0,${oscuro}) ${(radio + 0.12) * 100}%)`;
    v2.foco.style.opacity = 1;
  }
  function medidor(k, texto = '') {
    if (k === null) { v2.medidor.classList.remove('visible'); return; }
    v2.medidor.classList.add('visible'); v2.medidor.classList.toggle('lleno', k >= 0.999);
    q(v2.medidor, 'i').style.width = (Math.max(0, Math.min(1, k)) * 100).toFixed(0) + '%';
    q(v2.medidor, '.txt').textContent = texto;
  }
  const cargar = (svgPadre, k) => { const c = q(svgPadre, '.carga'); c.style.strokeDashoffset = (276.5 * (1 - Math.max(0, Math.min(1, k)))).toFixed(1); };
  // anillo sobre el cuerpo (consignas): { x, y, icono, k } o null
  function anillo(o) {
    if (!o) { v2.anillo.classList.remove('visible', 'ok'); return; }
    v2.anillo.classList.add('visible'); v2.anillo.classList.toggle('ok', o.k >= 1);
    Object.assign(v2.anillo.style, { left: (o.x * 100).toFixed(1) + '%', top: (o.y * 100).toFixed(1) + '%' });
    const ic = q(v2.anillo, '.icono'); if (ic.dataset.de !== (o.icono || '')) { ic.innerHTML = dibujoIcono(o.icono); ic.dataset.de = o.icono || ''; }
    cargar(v2.anillo, o.k);
  }
  // botones que se eligen con la mano (o con el mouse para probar): [{ id, texto, icono }]
  let clic = null;
  function botones(lista, { donde = 'abajo' } = {}) {
    v2.botones.innerHTML = ''; v2.botones.className = lista ? 'visible ' + donde : ''; clic = null;
    for (const b of lista || []) {
      const d = document.createElement('div'); d.className = 'boton'; d.dataset.id = b.id;
      d.innerHTML = ANILLO + `<div class="icono">${dibujoIcono(b.icono)}</div><div class="txt">${b.texto}</div>`;
      d.addEventListener('pointerdown', e => { e.stopPropagation(); clic = b.id; });
      v2.botones.appendChild(d);
    }
  }
  // qué botón está debajo del puntero (x, y de 0 a 1) y llenar su anillo
  function botonEn(x, y) {
    const r = cab.getBoundingClientRect(), px = r.left + x * r.width, py = r.top + y * r.height;
    for (const d of v2.botones.querySelectorAll('.boton')) {
      const b = d.getBoundingClientRect();
      if (px >= b.left && px <= b.right && py >= b.top && py <= b.bottom) return d.dataset.id;
    }
    return null;
  }
  function cargaBoton(id, k) {
    for (const d of v2.botones.querySelectorAll('.boton')) {
      const es = d.dataset.id === id;
      d.classList.toggle('sobre', es && k > 0); cargar(d, es ? k : 0);
    }
  }
  const tomarClic = () => { const c = clic; clic = null; return c; };
  const puntero = (x, y, ok) => { v2.puntero.classList.toggle('visible', !!ok); if (ok) Object.assign(v2.puntero.style, { left: (x * 100).toFixed(1) + '%', top: (y * 100).toFixed(1) + '%' }); };
  // críptico: { pista, ayuda, huecos: n } y después las piezas puestas
  function criptico(o) {
    if (!o) { v2.cript.classList.remove('visible'); return; }
    v2.cript.classList.add('visible');
    q(v2.cript, '.pista').innerHTML = o.pista + (o.ayuda ? `<em>${o.ayuda}</em>` : '');
    q(v2.cript, '.huecos').innerHTML = (o.puestas || []).concat(Array(Math.max(0, o.huecos - (o.puestas || []).length)).fill('')).map(p => `<span class="${p ? 'lleno' : ''}">${p || '?'}</span>`).join('');
  }
  function selfie(o) {
    if (!o) { v2.selfie.classList.remove('visible'); return; }
    v2.selfie.classList.add('visible');
    q(v2.selfie, '.txt').textContent = o.texto || ''; q(v2.selfie, '.arroba').textContent = o.arroba || '';
  }
  // pixelado rápido de toda la imagen (cartón: el de solo su cuerpo queda para después)
  const pixelar = (seg = 0.35) => { pixHasta = performance.now() + seg * 1000; };

  // estado limpio (al saltar de paso)
  function limpiar() {
    indicador(null); estatua(null, null); puntaje(null); sinVineta(); glitch(0); ojo(false); titulo(false);
    foco(null); medidor(null); anillo(null); botones(null); criptico(null); selfie(null); puntero(0, 0, false); cajas(null); volando([]); estela(null);
  }

  return {
    titulo, indicador, marca, estatua, puntaje, vineta, sinVineta, negro, ojo, ojoX, temblor, glitch, panel, panelHTML, verPausa, sonidoAviso, cuadro, limpiar, hilosCanvas: el.hilos, dpr, romper,
    telon, cartel, foco, medidor, anillo, botones, botonEn, cargaBoton, tomarClic, puntero, criptico, selfie, pixelar,
    grietas, reparar, estallar, puntosGrieta, marcoAtras, cajas, volando, estela, festejo, vidrio: () => vid.nivel,
    pixelando: () => performance.now() < pixHasta,
  };
}
