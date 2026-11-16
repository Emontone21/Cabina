// El cuerpo de tiesme en la cabina. El motor del tracking calcula, en cada cuadro y para cada hueso, "lo que haría si
// te copia". Acá, justo antes de mover el hueso, se decide cuánto de eso usa y cuánto de un movimiento propio de ella:
//
// - DIAL por parte (cabeza, torso, brazoIzq, brazoDer, manoIzq, manoDer, cara): propio 0 = te copia · 1 = es de ella.
// - ESCALONES de la degradación (biblia, paso 2.4), por parte: retraso (s) → impreciso (0–1: corrida y a medias)
//   → contrario (0–1: deja de ser espejo) → cortar (propio = 1).
// - POSES propias (movimientos por programa), con "vida" (respiración, peso, micro movimientos) para que no quede dura.
// - GRABADOR del gesto (1.4) y su repetición exagerada (3.2).
// - RAÍZ: dónde está el modelo (entrar desde abajo, asomarse por la puerta, acercarse al vidrio, irse).
//
// Izquierdo/derecho = de ELLA: su brazo izquierdo se ve a la DERECHA de la tele (en espejo copia tu brazo derecho).
// Poses: cabeza y torso en grados (yaw + = mira a la derecha de la tele, pitch + = mira abajo, roll + = se inclina hacia
// la izquierda de la tele). Brazos: dirección del brazo y del antebrazo [afuera, arriba, adelante] (adelante = hacia
// la cámara). Raíz: x e y en mitades del encuadre (x 1 = su centro en el borde derecho; y -2 = abajo, fuera de cuadro),
// z en alturas de su cuerpo (+ = hacia la cámara), giro en grados.

export const PARTES = ['cabeza', 'torso', 'brazoIzq', 'brazoDer', 'manoIzq', 'manoDer', 'cara'];
const REPOSO = {
  cabeza: { yaw: 0, pitch: 0, roll: 0 },
  torso: { yaw: 0, pitch: 0, roll: 0 },
  brazoIzq: { brazo: [0.32, -1, -0.03], ante: [0.3, -1, 0.1] },
  brazoDer: { brazo: [0.32, -1, -0.03], ante: [0.3, -1, 0.1] },
  manoIzq: {}, manoDer: {},
  raiz: { x: 0, y: 0, z: 0, giro: 0 },
  cara: { boca: null, ojos: null, cejas: null },
};
const clonar = o => JSON.parse(JSON.stringify(o));
const CURVAS = {
  lineal: k => k,
  suave: k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  sale: k => { const c = 1.7; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },            // pasa un poco y vuelve
  anticipa: k => { const c = 1.7 * 1.525; return k < 0.5 ? ((2 * k) ** 2 * ((c + 1) * 2 * k - c)) / 2 : ((2 * k - 2) ** 2 * ((c + 1) * (k * 2 - 2) + c) + 2) / 2; },
  golpe: k => k * k,
};
// ruido suave (suma de senos) para la "vida" y el corrimiento
const ruido = (t, s) => Math.sin(t * 1.3 + s) * 0.5 + Math.sin(t * 0.71 + s * 2.1) * 0.35 + Math.sin(t * 2.3 + s * 0.7) * 0.15;

export function crearCuerpo(api) {
  const { THREE, rig, holder, view, camera, mirrorQ } = api;
  const Q = THREE.Quaternion, V3 = THREE.Vector3, DEG = Math.PI / 180;

  // ---------------------------------------------------------------- dial y escalones por parte
  const P = {}, OBJ = {}, VEL = {};
  for (const p of PARTES) { P[p] = { propio: 1, retraso: 0, impreciso: 0, contrario: 0 }; OBJ[p] = { ...P[p] }; VEL[p] = {}; }
  const lista = partes => (partes === 'todo' ? PARTES : Array.isArray(partes) ? partes : [partes]);
  // cambia de a poco (en seg) los valores de una o varias partes: dial('todo', { propio: 0 }, 0.8)
  function dial(partes, valores, seg = 1) {
    for (const p of lista(partes)) for (const [k, v] of Object.entries(valores)) {
      OBJ[p][k] = v; VEL[p][k] = seg > 0 ? Math.abs(v - P[p][k]) / seg : Infinity;
      if (!(seg > 0)) P[p][k] = v;
    }
  }

  // ---------------------------------------------------------------- datos por hueso
  const INFO = new Map();
  const tipoDe = n => n === 'neck' || n === 'head' ? 'cabeza'
    : ['hips', 'spine', 'spine1', 'spine2'].includes(n) ? 'torso'
    : /shoulder$/.test(n) ? 'clavicula' : /forearm$/.test(n) ? 'ante' : /arm$/.test(n) ? 'brazo' : /hand$/.test(n) ? 'mano' : 'dedo';
  const FRAC = { neck: 0.35, head: 0.65, hips: 0, spine: 0.35, spine1: 0.35, spine2: 0.3 };
  for (const [nombre, r] of Object.entries(rig)) {
    if (!r) continue;
    const lado = nombre.startsWith('left') ? 'Izq' : nombre.startsWith('right') ? 'Der' : '';
    const tipo = tipoDe(nombre.replace(/^(left|right)/, ''));
    const parte = tipo === 'cabeza' || tipo === 'torso' ? tipo : (tipo === 'mano' || tipo === 'dedo' ? 'mano' : 'brazo') + lado;
    const parNombre = lado ? nombre.replace(/^(left|right)/, m => (m === 'left' ? 'right' : 'left')) : null;
    INFO.set(r, {
      nombre, parte, lado, tipo, parNombre, frac: FRAC[nombre] ?? 0,
      raiz: ['leftarm', 'rightarm', 'lefthand', 'righthand', 'head', 'spine1'].includes(nombre),
      P0: r.P0inv.clone().invert(), W0inv: r.W0.clone().invert(), hist: [], Wt: null, semilla: Math.random() * 100,
    });
  }
  for (const c of INFO.values()) c.par = c.parNombre ? INFO.get(rig[c.parNombre]) : null;
  const spine2 = rig.spine2;

  // ---------------------------------------------------------------- poses propias (con transiciones)
  const actual = clonar(REPOSO), tweens = {};
  let reloj = 0, tReal = 0, vida = 0, vidaObj = 1;
  const mirada = { k: 0, kObj: 0, yaw: 0, pitch: 0 }; // seguir a la persona con la cabeza (se suma a la pose)
  const pose = clonar(REPOSO); // la de este cuadro (actual + vida)

  function interp(a, b, k) {
    if (Array.isArray(a) && Array.isArray(b)) return dirInterp(a, b, k);
    if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * k;
    return k > 0 ? b : a;
  }
  function dirInterp(a, b, k) {
    const va = new V3(...a).normalize(), vb = new V3(...b).normalize();
    const q = new Q().setFromUnitVectors(va, vb);
    const ang = 2 * Math.acos(Math.min(1, Math.abs(q.w)));
    if (ang < 1e-5) return [vb.x, vb.y, vb.z];
    const ax = new V3(q.x, q.y, q.z).normalize().multiplyScalar(Math.sign(q.w) || 1);
    const v = va.applyQuaternion(new Q().setFromAxisAngle(ax, ang * k));
    return [v.x, v.y, v.z];
  }
  // posar({ cabeza: { yaw: 10 }, brazoDer: { brazo: [...] } }, segundos, curva) → devuelve los segundos (para esperar)
  function posar(cambios, seg = 1, curva = 'suave') {
    for (const [parte, vals] of Object.entries(cambios)) {
      if (!actual[parte]) continue;
      const desde = clonar(actual[parte]); // donde esta ahora (sin la "vida")
      const hasta = { ...actual[parte], ...clonar(vals) };
      if (!(seg > 0)) { actual[parte] = hasta; delete tweens[parte]; continue; }
      tweens[parte] = { desde, hasta, t0: reloj, dur: seg, curva: CURVAS[curva] || CURVAS.suave };
      actual[parte] = desde;
    }
    return seg;
  }
  const reposo = (seg = 1, partes = 'todo') => posar(Object.fromEntries(lista(partes).concat(partes === 'todo' ? ['raiz'] : []).map(p => [p, clonar(REPOSO[p])])), seg);
  const fijar = cambios => posar(cambios, 0);

  function avanzarPoses(dt) {
    reloj += dt;
    for (const [parte, tw] of Object.entries(tweens)) {
      const k0 = Math.min(1, (reloj - tw.t0) / tw.dur), k = tw.curva(k0);
      const o = {};
      for (const key of Object.keys(tw.hasta)) o[key] = interp(tw.desde[key] ?? tw.hasta[key], tw.hasta[key], k);
      actual[parte] = o;
      if (k0 >= 1) { actual[parte] = tw.hasta; delete tweens[parte]; }
    }
    // vida: respiracion, peso y micro movimientos (se apaga para "congelarse")
    vida += (vidaObj - vida) * Math.min(1, dt * 4);
    const t = tReal, v = vida;
    Object.assign(pose, clonar(actual));
    pose.torso.pitch += v * (1.6 * Math.sin(t * 2 * Math.PI * 0.22) + 0.8 * ruido(t * 0.4, 1));
    pose.torso.roll += v * 1.3 * ruido(t * 0.3, 2);
    pose.torso.yaw += v * 1.5 * ruido(t * 0.25, 3);
    mirada.k += (mirada.kObj - mirada.k) * Math.min(1, dt * 2);
    pose.cabeza.yaw += mirada.k * mirada.yaw; pose.cabeza.pitch += mirada.k * mirada.pitch;
    pose.cabeza.yaw += v * 2.2 * ruido(t * 0.45, 4);
    pose.cabeza.pitch += v * 1.5 * ruido(t * 0.5, 5);
    pose.cabeza.roll += v * 1.8 * ruido(t * 0.35, 6);
    for (const [b, s] of [['brazoIzq', 7], ['brazoDer', 9]]) {
      const a = pose[b];
      a.brazo = [a.brazo[0] + v * 0.03 * ruido(t * 0.4, s), a.brazo[1], a.brazo[2] + v * 0.04 * ruido(t * 0.33, s + 1)];
      a.ante = [a.ante[0] + v * 0.04 * ruido(t * 0.5, s + 2), a.ante[1], a.ante[2] + v * 0.05 * ruido(t * 0.42, s + 3)];
    }
  }

  // ---------------------------------------------------------------- de pose a rotacion de cada hueso
  // giro en "ejes del personaje" (X su izquierda, Y arriba, Z hacia la camara) aplicado sobre la pose de bind
  function rotChar(info, r, g, k = 1) {
    const R = new Q().setFromEuler(new THREE.Euler(g.pitch * DEG * k, g.yaw * DEG * k, g.roll * DEG * k, 'YXZ'));
    return info.P0.clone().invert().multiply(R).multiply(info.P0).multiply(r.L0);
  }
  // el hueso apuntando a una direccion [afuera, arriba, adelante], siguiendo al pecho
  function apuntar(info, r, dir) {
    const s = info.lado === 'Izq' ? 1 : -1;
    const d = new V3(s * dir[0], dir[1], dir[2]).normalize();
    if (spine2) d.applyQuaternion(spine2.bone.getWorldQuaternion(new Q()).multiply(spine2.W0.clone().invert()));
    const pW = r.bone.parent.getWorldQuaternion(new Q());
    const dp = pW.clone().multiply(r.P0inv);
    const inherited = r.dir0.clone().applyQuaternion(dp);
    const W = new Q().setFromUnitVectors(inherited, d).multiply(dp).multiply(r.W0);
    return pW.invert().multiply(W);
  }
  function local(info, r, g) {
    switch (info.tipo) {
      case 'cabeza': return rotChar(info, r, g.cabeza, info.frac);
      case 'torso': return rotChar(info, r, g.torso, info.frac);
      case 'brazo': return r.dir0 ? apuntar(info, r, g['brazo' + info.lado].brazo) : r.L0.clone();
      case 'ante': return r.dir0 ? apuntar(info, r, g['brazo' + info.lado].ante) : r.L0.clone();
      default: return r.L0.clone();
    }
  }
  // q elevado a k respecto de base (k > 1 exagera)
  function exagerar(base, q, k) {
    const d = base.clone().invert().multiply(q);
    if (d.w < 0) d.set(-d.x, -d.y, -d.z, -d.w);
    const ang = 2 * Math.acos(Math.min(1, d.w));
    if (ang < 1e-5) return q.clone();
    const ax = new V3(d.x, d.y, d.z).normalize();
    return base.clone().multiply(new Q().setFromAxisAngle(ax, Math.min(Math.PI * 0.95, ang * k)));
  }

  // ---------------------------------------------------------------- grabador del gesto
  const grab = { on: false, t0: 0, dur: 0, cuadros: [], actual: null };
  let ultimaGrabacion = null;
  function grabar(seg) { Object.assign(grab, { on: true, t0: tReal, dur: seg, cuadros: [], actual: null }); }
  let repro = null;
  function reproducir(g = ultimaGrabacion, { vel = 0.9, exag = 1.35, veces = 2 } = {}) {
    if (!g || g.cuadros.length < 5) return 0;
    repro = { g, t0: tReal, vel, exag, veces, dur: g.dur / vel };
    return repro.dur * veces;
  }
  const pararRepro = () => { repro = null; };
  function cuadroRepro() {
    if (!repro) return null;
    const e = (tReal - repro.t0) * repro.vel;
    if (e > repro.g.dur * repro.veces) { repro = null; return null; }
    const te = e % repro.g.dur, cs = repro.g.cuadros;
    let i = cs.length - 1; while (i > 0 && cs[i].t > te) i--;
    return cs[i];
  }

  // ---------------------------------------------------------------- por hueso (lo llama el motor)
  const muestra = (h, t) => { for (let i = h.length - 1; i >= 0; i--) if (h[i][0] <= t) return h[i][1]; return h[0]?.[1]; };
  let cuadroRep = null;
  function hueso(r, t, dt, maxRate) {
    const c = INFO.get(r);
    if (!c) return [t, maxRate];
    const p = P[c.parte];
    c.hist.push([tReal, t.clone()]);
    while (c.hist.length > 2 && tReal - c.hist[0][0] > 2.5) c.hist.shift();
    if (grab.on && grab.actual) grab.actual.q[c.nombre] = t.clone();

    let x = t;
    if (p.retraso > 0.005) x = muestra(c.hist, tReal - p.retraso).clone();
    const necesitaMundo = p.contrario > 0.005 || (c.par && P[c.par.parte].contrario > 0.005);
    let pW = null;
    if (necesitaMundo) { pW = r.bone.parent.getWorldQuaternion(new Q()); c.Wt = pW.clone().multiply(x); }
    if (p.contrario > 0.005) {
      // lo contrario: deja de ser espejo. Los brazos y manos toman el movimiento del otro lado reflejado;
      // cabeza y torso, su propio giro reflejado.
      let W = null;
      if (c.par) { if (c.par.Wt) W = mirrorQ(c.par.Wt.clone().multiply(c.par.W0inv)).multiply(r.W0); }
      else W = mirrorQ(c.Wt.clone().multiply(c.W0inv)).multiply(r.W0);
      if (W) x = x.clone().slerp(pW.clone().invert().multiply(W), p.contrario);
    }
    if (p.impreciso > 0.005) {
      const base = local(c, r, REPOSO);
      x = base.slerp(x, 1 - 0.55 * p.impreciso);
      if (c.raiz) {
        const s = c.semilla, k = p.impreciso * 0.65;
        x.multiply(new Q().setFromEuler(new THREE.Euler(ruido(tReal * 0.5, s) * k, ruido(tReal * 0.4, s + 3) * k, ruido(tReal * 0.45, s + 6) * k * 0.6)));
      }
    }
    if (p.propio > 0.001) {
      let own;
      if (cuadroRep?.q[c.nombre]) own = exagerar(local(c, r, REPOSO), cuadroRep.q[c.nombre], repro?.exag ?? 1);
      else own = local(c, r, pose);
      x = p.propio >= 0.999 ? own : x.clone().slerp(own, p.propio);
      maxRate = Math.max(maxRate ?? 14, 12);
    }
    return [x, maxRate];
  }

  // ---------------------------------------------------------------- cada cuadro (lo llama el director)
  const giro0 = holder.rotation.y;
  let visible = true;
  function cuadro(dt, pausado) {
    tReal += dt;
    if (!pausado) avanzarPoses(dt);
    for (const p of PARTES) for (const k of Object.keys(VEL[p])) {
      const d = OBJ[p][k] - P[p][k], paso = VEL[p][k] * dt;
      P[p][k] = Math.abs(d) <= paso ? OBJ[p][k] : P[p][k] + Math.sign(d) * paso;
    }
    // grabador: un cuadro nuevo por cuadro (los huesos lo llenan en el proximo pase del motor)
    if (grab.on) {
      if (tReal - grab.t0 > grab.dur) { grab.on = false; grab.actual = null; ultimaGrabacion = { dur: grab.dur, cuadros: grab.cuadros.filter(c => Object.keys(c.q).length) }; }
      else { grab.actual = { t: tReal - grab.t0, q: {}, cara: null }; grab.cuadros.push(grab.actual); }
    }
    cuadroRep = cuadroRepro();
    // raiz: posicion del modelo (el motor la pone en su lugar cada cuadro; aca se le suma el desplazamiento)
    const R = pose.raiz;
    const asp = camera.aspect > 0 ? camera.aspect : 9 / 16; // (con la ventana en 0 el aspecto da NaN)
    const hh = (view.tv ? view.tv.dist : view.dist) * Math.tan(camera.fov / 2 * DEG), hw = hh * asp;
    holder.position.x += R.x * hw; holder.position.y += R.y * hh; holder.position.z += R.z * view.h;
    holder.rotation.y = giro0 + R.giro * DEG;
    holder.visible = visible;
  }

  return {
    P, OBJ, dial, posar, fijar, reposo, pose, actual, REPOSO,
    vida: v => { vidaObj = v; },
    // seguir a la persona con la mirada: k = cuanto (0 a 1); x = donde esta en la tele (-1 a 1)
    seguir: k => { mirada.kObj = k; },
    mirarA: (x, dt) => { mirada.yaw += (Math.max(-1.3, Math.min(1.3, x)) * 16 - mirada.yaw) * Math.min(1, dt * 3); },
    mostrar: on => { visible = on; },
    grabar, grabando: () => grab.on, grabacion: () => ultimaGrabacion, cuadroGrab: () => grab.actual,
    reproducir, pararRepro, reproduciendo: () => !!repro, cuadroRep: () => cuadroRep,
    hueso, cuadro,
    limpiar() { tweens && Object.keys(tweens).forEach(k => delete tweens[k]); repro = null; grab.on = false; },
  };
}
