// v0.2 SOMBRA en la pared del teatrito y FIGURA del número.
// - La sombra es tiesme dibujada de negro desde una cámara aparte (la "luz"), en cada cuadro, en una textura que se
//   muestra en un plano detrás de ella. Si gira o mueve los brazos, la sombra cambia de verdad.
// - La figura es la misma silueta pero de tiesme puesta en la pose de la figura (se "hornea" una vez al empezar el
//   ensayo): así la figura siempre es una sombra posible y, si la pose encaja, se tapan exacto.
// - El encaje compara la dirección de brazos y antebrazos (en ejes de ella) y el giro del cuerpo con los de la figura.
// Dónde y de qué tamaño se ve la sombra, y la figura, están en guion.js (sombra, figura).

export function crearSombra(api, cuerpo, guion) {
  const { THREE, scene, renderer, holder, rig } = api;
  const V3 = THREE.Vector3, DEG = Math.PI / 180;
  const CAPA = 5, W = 704, H = 768; // ancho: que entren los brazos en V (con 512 se cortaban)
  // samples: bordes suavizados (sin eso el contorno de la sombra se veía en escalera)
  const rtS = new THREE.WebGLRenderTarget(W, H, { samples: 4 }), rtF = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
  for (const rt of [rtS, rtF]) rt.texture.colorSpace = THREE.SRGBColorSpace;
  holder.traverse(o => { if (o.isMesh) o.layers.enable(CAPA); });

  // la "luz": cámara ortogonal de frente, encuadrando de la cadera hasta arriba de la cabeza (con brazos arriba)
  const pos = n => rig[n]?.bone.getWorldPosition(new V3());
  holder.updateMatrixWorld(true);
  const cabeza = pos('head') || new V3(0, 1.6, 0), cadera = pos('hips') || pos('spine') || new V3(0, 1, 0);
  const torso = Math.max(0.2, cabeza.y - cadera.y);
  const alto = torso * 2.1, ancho = alto * W / H;
  const centro = new V3(cabeza.x, cadera.y + alto * 0.4, cabeza.z);
  // la profundidad tiene que abarcar todo el cuerpo girado con los brazos estirados (el modelo mide ~1600 unidades):
  // antes la cámara estaba a 20 unidades y cortaba el cuerpo (sombra hueca, figura girada sin brazos)
  const cam = new THREE.OrthographicCamera(-ancho / 2, ancho / 2, alto / 2, -alto / 2, torso * 0.1, torso * 12);
  cam.position.set(centro.x, centro.y, centro.z + torso * 6); cam.lookAt(centro); cam.layers.set(CAPA);
  // de los dos lados, como los materiales de ella (todos son DoubleSide)
  const negro = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }), blanco = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

  // los dos planos en la pared (detrás de ella): primero la sombra y, encima, la figura (contorno dorado + relleno
  // suave, para que se lea aunque la sombra la tape; cuando "sale", el relleno se enciende)
  const cfg = guion.sombra;
  const plano = (material, orden) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), material);
    m.renderOrder = orden; m.visible = false; scene.add(m);
    return m;
  };
  // abajo se desvanece (el cuadro de la luz corta a la altura de la cadera)
  const fundido = document.createElement('canvas'); fundido.width = 4; fundido.height = 64;
  { const g = fundido.getContext('2d'), gr = g.createLinearGradient(0, 64, 0, 0); gr.addColorStop(0, '#000'); gr.addColorStop(0.16, '#fff'); gr.addColorStop(1, '#fff'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); }
  const pSom = plano(new THREE.MeshBasicMaterial({ map: rtS.texture, alphaMap: new THREE.CanvasTexture(fundido), color: new THREE.Color(cfg.colorSombra), transparent: true, opacity: cfg.opSombra, depthWrite: false }), -2);
  const matFig = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { map: { value: rtF.texture }, color: { value: new THREE.Color(cfg.colorFigura) }, relleno: { value: cfg.opFigura }, px: { value: new THREE.Vector2(1 / W, 1 / H) }, grosor: { value: cfg.borde ?? 4 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform float relleno; uniform vec2 px; uniform float grosor; varying vec2 vUv;
      void main() {
        float a = texture2D(map, vUv).a, m = 0.0;
        for (int i = 0; i < 12; i++) { float ang = float(i) * 0.5236; m = max(m, texture2D(map, vUv + vec2(cos(ang), sin(ang)) * px * grosor).a); }
        float borde = clamp(m - a, 0.0, 1.0);
        gl_FragColor = vec4(color * (1.0 + 0.25 * borde), max(borde, a * relleno) * smoothstep(0.0, 0.16, vUv.y));
        #include <colorspace_fragment>
      }`,
  });
  const pFig = plano(matFig, -1);
  // dónde está en la pared (se puede volver a llamar después de cambiar guion.sombra, para probar valores)
  function ubicar() {
    for (const [m, dz] of [[pSom, 0], [pFig, 0.002]]) {
      m.position.set(centro.x + cfg.x * torso, centro.y + cfg.y * torso, centro.z - cfg.atras * torso + dz);
      m.scale.setScalar(cfg.escala);
    }
    pSom.material.opacity = cfg.opSombra;
    matFig.uniforms.grosor.value = cfg.borde ?? 4;
  }
  ubicar();

  function pasada(rt, mat) {
    const prevRT = renderer.getRenderTarget(), col = renderer.getClearColor(new THREE.Color()), a = renderer.getClearAlpha();
    const bg = scene.background, ov = scene.overrideMaterial;
    scene.background = null; scene.overrideMaterial = mat;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.render(scene, cam);
    renderer.setRenderTarget(prevRT); renderer.setClearColor(col, a);
    scene.background = bg; scene.overrideMaterial = ov;
  }

  // ---------------------------------------------------------------- la figura
  // se hornea siempre con ella en su lugar (si la escena arranca mientras sube desde abajo, la figura salía corrida)
  let fig = guion.figura, horneada = false;
  const lugar = holder.position.clone();
  function hornear(f = guion.figura) {
    fig = f;
    const restaurar = cuerpo.aplicarPose(f.pose);
    const ry = holder.rotation.y, p0 = holder.position.clone();
    holder.rotation.y = ry + ((f.giro || 0) - cuerpo.giro()) * DEG;
    holder.position.copy(lugar);
    holder.updateMatrixWorld(true);
    pasada(rtF, blanco);
    holder.rotation.y = ry; holder.position.copy(p0);
    restaurar();
    horneada = true;
  }

  // ---------------------------------------------------------------- cuánto encaja (0 a 1)
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const COS = Math.cos(45 * DEG);
  function encaje() {
    const d = cuerpo.dirBrazos();
    let suma = 0, n = 0;
    for (const lado of ['brazoIzq', 'brazoDer']) for (const s of ['brazo', 'ante']) {
      const a = d[lado]?.[s], b = fig.pose[lado]?.[s];
      if (!a || !b) continue;
      const cos = new V3(...a).normalize().dot(new V3(...b).normalize());
      suma += clamp((cos - COS) / (1 - COS)); n++;
    }
    const brazos = n ? suma / n : 0;
    const giro = clamp(1 - Math.abs(cuerpo.giro() - (fig.giro || 0)) / 40);
    return { brazos, giro, total: brazos * 0.6 + giro * 0.4 };
  }

  // ---------------------------------------------------------------- cada cuadro
  let visible = false, brillo = 0, brilloObj = 0;
  function cuadro(dt) {
    if (!visible) return;
    pasada(rtS, negro);
    brillo += (brilloObj - brillo) * Math.min(1, dt * 6);
    matFig.uniforms.relleno.value = cfg.opFigura + (1 - cfg.opFigura) * brillo;
  }
  function mostrar(on, { figura = true } = {}) {
    visible = on; pSom.visible = on; pFig.visible = on && figura && horneada;
  }

  return {
    hornear, encaje, cuadro, mostrar, ubicar,
    figura: on => { pFig.visible = on && visible && horneada; },
    brillar: k => { brilloObj = k; },
    visible: () => visible,
    _prueba: { rtS, rtF, cam, renderer, pasada }, // para revisar desde la consola
  };
}
