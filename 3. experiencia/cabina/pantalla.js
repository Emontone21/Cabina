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
};
const dibujoIcono = s => ICONOS[s] || ICONOS[(s || '').replace(/️/g, '')] || (s ? String(s).replace(/</g, '&lt;') : '');

// v0.6: el espejo. Marco (delante de tiesme; las grietas se ven con #cab.espejoRoto, desde la revelación) y la sábana
// que lo tapa (el telón). Dibujados en el cuadro 9:16 (360 × 640).
const rayos = (cx, cy, pts, op = 0.6) => pts.map(p => `<polyline points="${cx},${cy} ${p}" fill="none" stroke="#e8eef5" stroke-opacity="${op}" stroke-width="1"/>`).join('');
const MARCO = `<svg class="capa" viewBox="0 0 360 640" preserveAspectRatio="none">
  <defs><linearGradient id="cabMarcoPlata" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f949a"/><stop offset=".3" stop-color="#383b40"/><stop offset=".55" stop-color="#a3a8ad"/><stop offset="1" stop-color="#26282c"/></linearGradient></defs>
  <path fill-rule="evenodd" fill="#060607" d="M0 0 H360 V640 H0 Z M4 640 L4 146 Q4 4 180 4 Q356 4 356 146 L356 640 Z"/>
  <path fill-rule="evenodd" fill="url(#cabMarcoPlata)" d="M4 640 L4 146 Q4 4 180 4 Q356 4 356 146 L356 640 Z M18 640 L18 152 Q18 20 180 20 Q342 20 342 152 L342 640 Z"/>
  <path fill="none" stroke="#000" stroke-opacity=".6" stroke-width="1.5" d="M18 640 L18 152 Q18 20 180 20 Q342 20 342 152 L342 640"/>
  <path fill="none" stroke="#c8ccd2" stroke-opacity=".35" stroke-width=".8" d="M10 640 L10 148 Q10 11 180 11 Q350 11 350 148 L350 640"/>
  <path d="M162 7 Q180 -3 198 7 Q189 16 180 13 Q171 16 162 7 Z" fill="#b9bec4"/>
  <path d="M18 330 L150 20 L190 20 L18 420 Z" fill="#fff" opacity=".03"/>
  <g class="grietas">
    ${rayos(236, 300, ['330,180', '342,300', '320,420', '270,560', '196,470', '120,400', '150,290', '206,190', '250,40'])}
    ${rayos(330, 180, ['342,140', '300,120'], 0.45)}${rayos(120, 400, ['18,380', '60,470'], 0.45)}
    <ellipse cx="236" cy="300" rx="9" ry="9" fill="none" stroke="#e8eef5" stroke-opacity=".5"/>
  </g></svg>`;
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
    foco(null); medidor(null); anillo(null); botones(null); criptico(null); selfie(null); puntero(0, 0, false);
  }

  return {
    titulo, indicador, marca, estatua, puntaje, vineta, sinVineta, negro, ojo, ojoX, temblor, glitch, panel, panelHTML, verPausa, sonidoAviso, cuadro, limpiar, hilosCanvas: el.hilos, dpr, romper,
    telon, cartel, foco, medidor, anillo, botones, botonEn, cargaBoton, tomarClic, puntero, criptico, selfie, pixelar,
    pixelando: () => performance.now() < pixHasta,
  };
}
