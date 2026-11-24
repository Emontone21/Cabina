// Fondo y luces. v0.6 "EL ESPEJO" (22/11): lo que se ve detrás de tiesme es el cuarto reflejado en el espejo (paredes,
// piso de tablas, una puerta al fondo y una lamparita colgando). El marco del espejo y la sábana van delante de ella
// (pantalla.js + cabina.css). El fondo es un canvas que three.js usa como fondo de la escena. Modos de luz:
// - función: la lamparita prendida, luz tibia de costado sobre ella
// - ensayo: además, un círculo de luz tibia en la pared del fondo, donde cae la sombra (estatuas)
// - trabajo (revelación en adelante): el espejo "se rompe": puerta entreabierta, lamparita casi apagada, todo frío, y el
//   vidrio rajado (las grietas están delante de ella: #cab.espejoRoto, en cabina.css)
// La pared se puede ir a negro y "romper" (glitch). Reemplazar por el fondo 3D de Agustín cuando esté.
// (Antes, hasta la v0.5.2: un teatrito de circo. Copia en _versiones/cabina_v0.5.2.)

const repetir = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');

// el cuarto del espejo, en el cuadro 9:16 (360 × 640). roto = la versión de la revelación
const cuarto = r => `
  <defs>
    <radialGradient id="g1" gradientUnits="userSpaceOnUse" cx="276" cy="118" r="340"><stop offset="0" stop-color="#fff0d2" stop-opacity="${r ? 0.1 : 0.5}"/><stop offset=".3" stop-color="#ffe6b8" stop-opacity="${r ? 0.03 : 0.14}"/><stop offset="1" stop-color="#ffe6b8" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="50%" cy="45%" r="75%"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
  </defs>
  <rect width="360" height="640" fill="#0b0e13"/>
  <polygon points="0,0 360,0 292,70 68,70" fill="#07090c"/>
  <polygon points="0,0 68,70 68,500 0,640" fill="#0c1016"/>
  <polygon points="360,0 292,70 292,500 360,640" fill="#0a0d12"/>
  <rect x="68" y="70" width="224" height="430" fill="#10151c"/>
  <polygon points="0,640 68,500 292,500 360,640" fill="#0e1116"/>
  <g stroke="#161b22">${repetir(9, i => `<line x1="${68 + i * 28}" y1="500" x2="${i * 45}" y2="640"/>`)}</g>
  <g stroke="#1d232c" fill="none"><polyline points="0,0 68,70 68,500 0,640"/><polyline points="360,0 292,70 292,500 360,640"/><line x1="68" y1="500" x2="292" y2="500"/><line x1="68" y1="70" x2="292" y2="70"/></g>
  ${r
    ? '<rect x="92" y="250" width="62" height="250" fill="#000"/><polygon points="92,250 118,262 118,488 92,500" fill="#0d1218" stroke="#1a2029"/>'
    : '<rect x="92" y="250" width="62" height="250" fill="#0c1117" stroke="#1a2029"/><ellipse cx="146" cy="380" rx="2.5" ry="2.5" fill="#3a3f46"/>'}
  <polygon points="304,190 340,172 340,262 304,270" fill="#0b0f14" stroke="#1d232c"/>
  <line x1="276" y1="0" x2="276" y2="106" stroke="#2c2c2c" stroke-width="1.2"/>
  <rect width="360" height="640" fill="url(#g1)"/>
  <ellipse cx="276" cy="116" rx="7" ry="9" fill="${r ? '#8d939b' : '#fff4dc'}"/>
  ${r ? '<rect width="360" height="640" fill="#0b1a2e" opacity=".35"/>' : ''}
  <rect width="360" height="640" fill="url(#g2)"/>`;

export function crearEscenario(api) {
  const { THREE, scene, luces: L } = api;
  const W = 720, H = 1280;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;

  // valores actuales y objetivos (cambian de a poco). oscuro = luz de trabajo (espejo roto); ensayo = luz del ensayo
  const v = { negro: 0, glitch: 0, oscuro: 0, ensayo: 0 }, obj = { ...v }, vel = { negro: 1, glitch: 4, oscuro: 1, ensayo: 1 };
  const ir = (k, valor, seg) => { obj[k] = valor; vel[k] = seg > 0 ? Math.abs(valor - v[k]) / seg || 1 : Infinity; };

  // el cuarto se pasa a imagen una sola vez (normal y roto); hasta que esté, el fondo es negro
  const img = {};
  let sucio = true;
  const aImagen = (clave, cuerpo) => {
    const im = new Image();
    im.onload = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(im, 0, 0, W, H); img[clave] = c; sucio = true; };
    im.onerror = e => console.warn('[cabina] no se pudo dibujar el fondo', e);
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 360 640">${cuerpo}</svg>`);
  };
  aImagen('normal', cuarto(false)); aImagen('roto', cuarto(true));

  // luz sobre tiesme: tibia, de costado y de arriba (la lamparita); rota: fría y apagada
  const NORMAL = { hemi: 0.95, hcol: new THREE.Color(0xc8d2e6), key: 2.6, col: new THREE.Color(0xffe4bc) };
  const ROTA = { hemi: 0.22, hcol: new THREE.Color(0x8090b0), key: 3.0, col: new THREE.Color(0xc8d6ff) };
  L.key.position.set(1.3, 2.0, 1.3);

  const cab = document.getElementById('cab');
  let rotoAntes = null, antes = '';
  function dibujar() {
    g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (img.normal) g.drawImage(img.normal, 0, 0);
    if (img.roto && v.oscuro > 0.001) { g.globalAlpha = v.oscuro; g.drawImage(img.roto, 0, 0); g.globalAlpha = 1; }
    // círculo de luz en la pared del fondo (ensayo): donde cae la sombra
    if (v.ensayo > 0.01 && v.oscuro < 0.99) {
      const rg = g.createRadialGradient(W / 2, H * 0.36, 10, W / 2, H * 0.36, W * 0.62);
      rg.addColorStop(0, `rgba(255,226,180,${0.28 * v.ensayo * (1 - v.oscuro)})`); rg.addColorStop(1, 'rgba(255,226,180,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    if (v.glitch > 0.01) {
      const n = Math.round(v.glitch * 8);
      for (let i = 0; i < n; i++) { const y = Math.random() * H, h = 8 + Math.random() * 80, dx = (Math.random() - 0.5) * 160 * v.glitch; g.drawImage(cv, 0, y, W, h, dx, y, W, h); }
    }
    if (v.negro > 0.001) { g.fillStyle = `rgba(0,0,0,${v.negro})`; g.fillRect(0, 0, W, H); }
    tex.needsUpdate = true;
  }

  function cuadro(dt) {
    for (const k of Object.keys(v)) {
      const d = obj[k] - v[k], paso = vel[k] * dt;
      v[k] = Math.abs(d) <= paso ? obj[k] : v[k] + Math.sign(d) * paso;
    }
    const k = v.oscuro, roto = k > 0.5;
    if (roto !== rotoAntes) { cab?.classList.toggle('espejoRoto', roto); rotoAntes = roto; }
    if (L.hemi) { L.hemi.intensity = (NORMAL.hemi + (ROTA.hemi - NORMAL.hemi) * k) * (1 - 0.3 * v.ensayo); L.hemi.color.copy(NORMAL.hcol).lerp(ROTA.hcol, k); }
    L.key.intensity = NORMAL.key + (ROTA.key - NORMAL.key) * k;
    L.key.color.copy(NORMAL.col).lerp(ROTA.col, k);
    // el fondo se vuelve a subir a la placa solo si cambió algo
    const firma = `${v.negro.toFixed(3)}|${k.toFixed(3)}|${v.ensayo.toFixed(3)}`;
    if (sucio || v.glitch > 0.01 || firma !== antes) { dibujar(); antes = firma; sucio = false; }
  }

  return {
    cuadro,
    negro: (valor, seg = 1.5) => ir('negro', valor, seg),
    glitch: (valor, seg = 0.3) => ir('glitch', valor, seg),
    oscuro: (valor, seg = 1.5) => ir('oscuro', valor, seg),
    ensayo: (valor, seg = 1.2) => ir('ensayo', valor, seg),
    estado: () => ({ ...v }),
  };
}
