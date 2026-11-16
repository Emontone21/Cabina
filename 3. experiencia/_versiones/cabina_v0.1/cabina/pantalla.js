// Lo que se dibuja encima de tiesme (HTML): título de la Espera, indicadores (consigna, ESTATUA, timer, puntaje),
// viñeta de diálogo (solo mientras alguien habla), negro, glitch de pantalla, temblor y el panel de quien atiende.
// Todo va dentro de #cab, que se acomoda exactamente sobre la imagen 9:16 (tele vertical o monitor con bandas).

const SIMBOLOS = '#$%&@█▓▒░<>/\\|=+*¿?!0123456789';
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
  const COLORES = ['#ff6b8b', '#ffb347', '#4cc9f0', '#7bd88f', '#b388ff', '#ff8fab'];
  q(el.titulo, '.logo').innerHTML = [...guion.titulo.logo].map((c, i) => `<span style="color:${COLORES[i % COLORES.length]};animation-delay:${i * 0.12}s">${c}</span>`).join('');
  q(el.titulo, '.sub').textContent = guion.titulo.sub;
  q(el.titulo, '.pasa').textContent = guion.titulo.pasa;
  const titulo = on => el.titulo.classList.toggle('visible', on);

  // ---------------------------------------------------------------- indicadores (aparte del diálogo)
  function indicador(o) {
    if (!o) { el.ind.classList.remove('visible'); return; }
    q(el.ind, '.icono').textContent = o.icono || '';
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
  let glitchK = 0;
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
    dibujarRuido();
  }

  // estado limpio (al saltar de paso)
  function limpiar() {
    indicador(null); estatua(null, null); puntaje(null); sinVineta(); glitch(0); ojo(false); titulo(false);
  }

  return { titulo, indicador, marca, estatua, puntaje, vineta, sinVineta, negro, ojo, ojoX, temblor, glitch, panel, panelHTML, verPausa, sonidoAviso, cuadro, limpiar, hilosCanvas: el.hilos, dpr, romper };
}
