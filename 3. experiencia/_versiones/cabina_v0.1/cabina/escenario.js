// Fondo (2D, cartón) y luces. El fondo es un canvas que three.js usa como fondo de la escena: cielo claro con burbujas
// de colores (tipo menú de Wii) que se puede ir a negro y "romper" (glitch). Las luces van de pareja (acto 1) a dura de
// arriba y de costado (acto 3).

export function crearEscenario(api) {
  const { THREE, scene, luces } = api;
  const cv = document.createElement('canvas'); cv.width = 360; cv.height = 640;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;

  const HUES = [350, 30, 190, 140, 265, 320];
  const burbujas = Array.from({ length: 16 }, (_, i) => ({
    x: Math.random(), y: Math.random(), r: 0.05 + Math.random() * 0.12, h: HUES[i % HUES.length],
    vy: 0.012 + Math.random() * 0.02, fase: Math.random() * 6.3,
  }));
  // valores actuales y objetivos (cambian de a poco)
  const v = { negro: 0, glitch: 0, oscuro: 0 }, obj = { negro: 0, glitch: 0, oscuro: 0 }, vel = { negro: 1, glitch: 4, oscuro: 1 };
  const ir = (k, valor, seg) => { obj[k] = valor; vel[k] = seg > 0 ? Math.abs(valor - v[k]) / seg || 1 : Infinity; };

  // luces del motor: normal (como el tracking) y oscura (dura, de arriba y de costado)
  const L = luces, normal = {
    hemi: L.hemi?.intensity ?? 2.4, key: L.key.intensity, pos: L.key.position.clone(), col: L.key.color.clone(),
  };
  const oscura = { hemi: 0.16, key: 3.6, pos: new THREE.Vector3(0.9, 2.4, 0.7), col: new THREE.Color(0xdde6ff) };

  let t = 0, quietoNegro = false;
  function dibujar() {
    const W = cv.width, H = cv.height;
    if (v.negro >= 0.999 && v.glitch < 0.01) {
      if (!quietoNegro) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); tex.needsUpdate = true; quietoNegro = true; }
      return;
    }
    quietoNegro = false;
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#9fd8ff'); gr.addColorStop(0.55, '#e4f5ff'); gr.addColorStop(1, '#ffffff');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (const b of burbujas) {
      b.y -= b.vy / 60; if (b.y < -0.2) { b.y = 1.2; b.x = Math.random(); }
      const x = (b.x + Math.sin(t * 0.6 + b.fase) * 0.03) * W, y = b.y * H, r = b.r * W;
      const rg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      rg.addColorStop(0, `hsla(${b.h},90%,92%,.75)`); rg.addColorStop(1, `hsla(${b.h},80%,72%,.18)`);
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    // piso suave
    g.fillStyle = 'rgba(160,200,230,.25)'; g.fillRect(0, H * 0.93, W, H * 0.07);
    if (v.glitch > 0.01) {
      const n = Math.round(v.glitch * 8);
      for (let i = 0; i < n; i++) {
        const y = Math.random() * H, h = 4 + Math.random() * 40, dx = (Math.random() - 0.5) * 80 * v.glitch;
        g.drawImage(cv, 0, y, W, h, dx, y, W, h);
        if (Math.random() < 0.4) { g.fillStyle = ['#ff0050', '#00ffd5', '#5000ff', '#000'][Math.random() * 4 | 0]; g.globalAlpha = 0.35 * v.glitch; g.fillRect(0, y, W, h * 0.4); g.globalAlpha = 1; }
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
    if (L.hemi) L.hemi.intensity = normal.hemi + (oscura.hemi - normal.hemi) * k;
    L.key.intensity = normal.key + (oscura.key - normal.key) * k;
    L.key.position.lerpVectors(normal.pos, oscura.pos, k);
    L.key.color.lerpColors(normal.col, oscura.col, k);
    dibujar();
  }

  return {
    cuadro,
    negro: (valor, seg = 1.5) => ir('negro', valor, seg),
    glitch: (valor, seg = 0.3) => ir('glitch', valor, seg),
    oscuro: (valor, seg = 1.5) => ir('oscuro', valor, seg),
    estado: () => ({ ...v }),
  };
}
