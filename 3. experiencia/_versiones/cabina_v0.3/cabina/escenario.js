// Fondo (2D, cartón) y luces. v0.2: un TEATRITO (pared del fondo, piso de tablas, cortinas a los costados, bambalina
// con lamparitas). El fondo es un canvas que three.js usa como fondo de la escena. Modos de luz:
// - función: luces cálidas de colores (acto alegre) · ensayo: más tenue, con un círculo de luz en la pared (la sombra)
// - trabajo: "luz de trabajo" (el ensayo se cortó): todo oscuro con una lamparita colgando, luz dura y fría.
// La pared se puede ir a negro y "romper" (glitch). Reemplazar por el fondo 3D de Agustín cuando esté.

export function crearEscenario(api) {
  const { THREE, scene, luces } = api;
  const cv = document.createElement('canvas'); cv.width = 360; cv.height = 640;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;

  // valores actuales y objetivos (cambian de a poco). oscuro = luz de trabajo; ensayo = luz del ensayo
  const v = { negro: 0, glitch: 0, oscuro: 0, ensayo: 0 }, obj = { ...v }, vel = { negro: 1, glitch: 4, oscuro: 1, ensayo: 1 };
  const ir = (k, valor, seg) => { obj[k] = valor; vel[k] = seg > 0 ? Math.abs(valor - v[k]) / seg || 1 : Infinity; };

  const L = luces, normal = { hemi: L.hemi?.intensity ?? 2.4, key: L.key.intensity, pos: L.key.position.clone(), col: L.key.color.clone() };
  const oscura = { hemi: 0.16, key: 3.6, pos: new THREE.Vector3(0.9, 2.4, 0.7), col: new THREE.Color(0xdde6ff) };
  const calida = new THREE.Color(0xffe2b8);

  let t = 0, extra = null;
  const mezcla = (a, b, k) => a.map((x, i) => Math.round(x + (b[i] - x) * k));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  function dibujar() {
    const W = cv.width, H = cv.height, k = v.oscuro, e = v.ensayo;
    // pared del fondo
    const top = mezcla(mezcla([120, 52, 40], [62, 30, 28], e), [10, 10, 14], k), bot = mezcla(mezcla([196, 112, 70], [110, 60, 44], e), [18, 18, 22], k);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, rgb(top)); gr.addColorStop(0.8, rgb(bot)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // listones de la pared
    g.fillStyle = `rgba(0,0,0,${0.08 + 0.1 * k})`; for (let x = 0; x < W; x += 30) g.fillRect(x, 0, 2, H * 0.86);
    // círculo de luz en la pared (ensayo): donde cae la sombra
    if (e > 0.01 && k < 0.99) {
      const rg = g.createRadialGradient(W * 0.5, H * 0.38, 10, W * 0.5, H * 0.38, W * 0.62);
      rg.addColorStop(0, `rgba(255,236,190,${0.55 * e * (1 - k)})`); rg.addColorStop(1, 'rgba(255,236,190,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    // luces de colores de la función (se apagan en el ensayo y en la luz de trabajo)
    const fun = (1 - e) * (1 - k);
    if (fun > 0.01) for (const [x, c] of [[0.2, '255,90,120'], [0.5, '255,200,90'], [0.8, '90,190,255']]) {
      const rg = g.createRadialGradient(W * x, H * 0.12, 5, W * x, H * 0.12, W * 0.5);
      rg.addColorStop(0, `rgba(${c},${0.35 * fun * (0.85 + 0.15 * Math.sin(t * 2 + x * 9))})`); rg.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    // piso de tablas
    const py = H * 0.86;
    g.fillStyle = rgb(mezcla([120, 72, 38], [16, 14, 14], k)); g.fillRect(0, py, W, H - py);
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = py; y < H; y += 14) g.fillRect(0, y, W, 2);
    // cortinas a los costados
    for (const [x0, s] of [[0, 1], [W, -1]]) {
      const cg = g.createLinearGradient(x0, 0, x0 + s * 46, 0);
      cg.addColorStop(0, rgb(mezcla([90, 10, 22], [20, 4, 8], k))); cg.addColorStop(1, rgb(mezcla([170, 24, 44], [40, 8, 14], k)));
      g.fillStyle = cg; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + s * 50, 0); g.quadraticCurveTo(x0 + s * 30, H * 0.5, x0 + s * 40, H); g.lineTo(x0, H); g.fill();
    }
    // bambalina con lamparitas
    g.fillStyle = rgb(mezcla([140, 18, 36], [30, 6, 12], k)); g.fillRect(0, 0, W, 34);
    for (let x = 12; x < W; x += 24) {
      const on = (1 - k) * (0.6 + 0.4 * (Math.sin(t * 3 + x) > 0 ? 1 : 0.4));
      g.fillStyle = `rgba(255,226,150,${0.25 + 0.75 * on})`; g.beginPath(); g.arc(x, 38, 4, 0, 6.283); g.fill();
    }
    // luz de trabajo: una lamparita colgando
    if (k > 0.01) {
      const bx = W * 0.62, by = H * 0.2;
      g.strokeStyle = `rgba(90,90,90,${k})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx, 0); g.lineTo(bx, by - 8); g.stroke();
      const rg = g.createRadialGradient(bx, by, 2, bx, by, W * 0.7);
      rg.addColorStop(0, `rgba(235,240,255,${0.9 * k})`); rg.addColorStop(0.08, `rgba(200,210,235,${0.35 * k})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
      g.fillStyle = `rgba(255,255,255,${k})`; g.beginPath(); g.arc(bx, by, 6, 0, 6.283); g.fill();
    }
    // v0.3: lo que dibuja el juego de los hilos (utilería, la torre del teatro): detrás de ella, como el resto del fondo
    if (extra) extra(g, W, H, t);
    if (v.glitch > 0.01) {
      const n = Math.round(v.glitch * 8);
      for (let i = 0; i < n; i++) {
        const y = Math.random() * H, h = 4 + Math.random() * 40, dx = (Math.random() - 0.5) * 80 * v.glitch;
        g.drawImage(cv, 0, y, W, h, dx, y, W, h);
      }
    }
    if (v.negro > 0.001) { g.fillStyle = `rgba(0,0,0,${v.negro})`; g.fillRect(0, 0, W, H); }
    tex.needsUpdate = true;
  }

  function cuadro(dt) {
    t += dt;
    for (const k of Object.keys(v)) {
      const d = obj[k] - v[k], paso = vel[k] * dt;
      v[k] = Math.abs(d) <= paso ? obj[k] : v[k] + Math.sign(d) * paso;
    }
    const k = v.oscuro;
    if (L.hemi) L.hemi.intensity = (normal.hemi * (1 - 0.35 * v.ensayo)) * (1 - k) + oscura.hemi * k;
    L.key.intensity = normal.key + (oscura.key - normal.key) * k;
    L.key.position.lerpVectors(normal.pos, oscura.pos, k);
    L.key.color.copy(normal.col).lerp(calida, 0.35 * (1 - k)).lerp(oscura.col, k);
    dibujar();
  }

  return {
    cuadro,
    negro: (valor, seg = 1.5) => ir('negro', valor, seg),
    glitch: (valor, seg = 0.3) => ir('glitch', valor, seg),
    oscuro: (valor, seg = 1.5) => ir('oscuro', valor, seg),
    ensayo: (valor, seg = 1.2) => ir('ensayo', valor, seg),
    estado: () => ({ ...v }),
    // v0.3: fn(g, W, H, t) dibuja encima del teatrito y debajo del glitch y el negro; null lo saca
    extra: fn => { extra = fn; },
  };
}
