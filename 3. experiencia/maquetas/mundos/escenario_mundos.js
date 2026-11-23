// MAQUETA DE MUNDOS (22/11) — no es la cabina. Reemplaza a cabina/escenario.js SOLO en mundos_3actos.html (lo hace el
// importmap de esa página); la cabina de siempre (3actos.html) no cambia.
// Cuatro mundos sin circo: espejo tapado, caja de música, transmisión de madrugada y vidriera. Cada uno tiene:
// - FONDO: detrás de tiesme (es el fondo de three.js). Una versión normal y una "rota" (la revelación).
// - FRENTE: delante de ella (marco del espejo, borde de la caja, rayas de la tele, vidrio de la vidriera).
// - TELÓN: dentro de #cabTelon; usa los mismos estados que la cabina (cerrado, rendija, abierto).
// - ROTO: se enciende cuando el director pone la "luz de trabajo" (revelación en adelante).
// Elegir: ?mundo=espejo|caja|tele|vidriera, o la tecla W durante la experiencia (pasa al siguiente).
// Misma interfaz que escenario.js: cuadro, negro, glitch, oscuro, ensayo, estado.

const ORDEN = ['espejo', 'caja', 'tele', 'vidriera'];
const NOMBRE = { espejo: 'El espejo tapado', caja: 'La caja de música', tele: 'Transmisión de madrugada', vidriera: 'La vidriera' };

// ------------------------------------------------------------------ luz sobre tiesme (3D) en cada mundo
const LUZ = {
  espejo: { hemi: 0.95, hcol: 0xc8d2e6, key: 2.6, col: 0xffe4bc, pos: [1.3, 2.0, 1.3] },
  caja: { hemi: 1.3, hcol: 0xffe0c8, key: 2.2, col: 0xffd6a0, pos: [0.2, 3.0, 1.4] },
  tele: { hemi: 0.75, hcol: 0xd0d8e8, key: 3.2, col: 0xf4f7ff, pos: [-1.8, 1.4, 1.5] },
  vidriera: { hemi: 1.1, hcol: 0xd8f0e0, key: 2.4, col: 0xe8fff0, pos: [0, 3.0, 0.9] },
};
const ROTA = { hemi: 0.22, hcol: 0x8090b0, key: 3.0, col: 0xc8d6ff };

// ------------------------------------------------------------------ dibujos (viewBox 360 × 640, el cuadro 9:16)
const rayos = (cx, cy, pts, op = 0.6) => pts.map(p => `<polyline points="${cx},${cy} ${p}" fill="none" stroke="#e8eef5" stroke-opacity="${op}" stroke-width="1"/>`).join('');
const repetir = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');

const ARTE = {
  // ================================================================ EL ESPEJO TAPADO
  espejo: {
    fondo: r => `
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
        ? `<rect x="92" y="250" width="62" height="250" fill="#000"/><polygon points="92,250 118,262 118,488 92,500" fill="#0d1218" stroke="#1a2029"/>`
        : `<rect x="92" y="250" width="62" height="250" fill="#0c1117" stroke="#1a2029"/><ellipse cx="146" cy="380" rx="2.5" ry="2.5" fill="#3a3f46"/>`}
      <polygon points="304,190 340,172 340,262 304,270" fill="#0b0f14" stroke="#1d232c"/>
      <line x1="276" y1="0" x2="276" y2="106" stroke="#2c2c2c" stroke-width="1.2"/>
      <rect width="360" height="640" fill="url(#g1)"/>
      <ellipse cx="276" cy="116" rx="7" ry="9" fill="${r ? '#8d939b' : '#fff4dc'}"/>
      ${r ? '<rect width="360" height="640" fill="#0b1a2e" opacity=".35"/>' : ''}
      <rect width="360" height="640" fill="url(#g2)"/>`,
    frente: `
      <defs><linearGradient id="em_marco" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f949a"/><stop offset=".3" stop-color="#383b40"/><stop offset=".55" stop-color="#a3a8ad"/><stop offset="1" stop-color="#26282c"/></linearGradient></defs>
      <path fill-rule="evenodd" fill="#060607" d="M0 0 H360 V640 H0 Z M4 640 L4 146 Q4 4 180 4 Q356 4 356 146 L356 640 Z"/>
      <path fill-rule="evenodd" fill="url(#em_marco)" d="M4 640 L4 146 Q4 4 180 4 Q356 4 356 146 L356 640 Z M18 640 L18 152 Q18 20 180 20 Q342 20 342 152 L342 640 Z"/>
      <path fill="none" stroke="#000" stroke-opacity=".6" stroke-width="1.5" d="M18 640 L18 152 Q18 20 180 20 Q342 20 342 152 L342 640"/>
      <path fill="none" stroke="#c8ccd2" stroke-opacity=".35" stroke-width=".8" d="M10 640 L10 148 Q10 11 180 11 Q350 11 350 148 L350 640"/>
      <path d="M162 7 Q180 -3 198 7 Q189 16 180 13 Q171 16 162 7 Z" fill="#b9bec4"/>
      <path d="M18 330 L150 20 L190 20 L18 420 Z" fill="#fff" opacity=".03"/>
      <g class="roto">
        ${rayos(236, 300, ['330,180', '342,300', '320,420', '270,560', '196,470', '120,400', '150,290', '206,190', '250,40'])}
        ${rayos(330, 180, ['342,140', '300,120'], 0.45)}${rayos(120, 400, ['18,380', '60,470'], 0.45)}
        <ellipse cx="236" cy="300" rx="9" ry="9" fill="none" stroke="#e8eef5" stroke-opacity=".5"/>
      </g>`,
    telon: `
      <defs>
        <linearGradient id="et_sab" x1="0" x2="1"><stop offset="0" stop-color="#6c6963"/><stop offset=".12" stop-color="#94918a"/><stop offset=".22" stop-color="#75726c"/><stop offset=".38" stop-color="#9c9890"/><stop offset=".5" stop-color="#7b7871"/><stop offset=".64" stop-color="#99958d"/><stop offset=".78" stop-color="#726f69"/><stop offset=".9" stop-color="#908c84"/><stop offset="1" stop-color="#64615c"/></linearGradient>
        <linearGradient id="et_somb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
      </defs>
      <g class="tela">
        <path d="M2 6 Q180 36 358 6 L360 300 L360 660 L0 660 L0 300 Z" fill="url(#et_sab)"/>
        <path d="M2 6 Q180 36 358 6 L360 300 L360 660 L0 660 L0 300 Z" fill="url(#et_somb)"/>
        <g fill="none" stroke="#3f3d39" stroke-opacity=".45" stroke-width="2.4">
          <path d="M70 26 Q84 300 66 660"/><path d="M180 36 Q168 330 188 660"/><path d="M292 26 Q280 300 298 660"/>
          <path d="M2 6 Q100 110 180 36"/><path d="M180 36 Q262 110 358 6"/>
        </g>
        <ellipse cx="6" cy="8" rx="3" ry="3" fill="#888"/><ellipse cx="354" cy="8" rx="3" ry="3" fill="#888"/>
      </g>`,
  },

  // ================================================================ LA CAJA DE MÚSICA
  caja: {
    fondo: r => `
      <defs>
        <radialGradient id="g1" gradientUnits="userSpaceOnUse" cx="180" cy="300" r="430"><stop offset="0" stop-color="#5c1727"/><stop offset=".55" stop-color="#2a0a12"/><stop offset="1" stop-color="#0b0305"/></radialGradient>
        <pattern id="g2" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M0 18 L18 0 L36 18 L18 36 Z" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1.6"/><g fill="#c89a55" fill-opacity=".45"><circle cx="18" cy="0" r="1.7"/><circle cx="0" cy="18" r="1.7"/><circle cx="36" cy="18" r="1.7"/><circle cx="18" cy="36" r="1.7"/></g></pattern>
        <radialGradient id="g3" gradientUnits="userSpaceOnUse" cx="180" cy="30" r="460"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".3"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="360" height="640" fill="url(#g1)"/>
      <rect width="360" height="640" fill="url(#g2)"/>
      ${r ? '' : '<rect width="360" height="640" fill="url(#g3)"/>'}
      <rect x="22" y="22" width="316" height="588" rx="4" fill="none" stroke="#d8b46a" stroke-opacity=".5" stroke-width="1.4"/>
      ${r ? `
        <path d="M58 70 L84 150 L64 230 L98 320 L76 410 L92 480" fill="none" stroke="#000" stroke-width="10" stroke-linejoin="bevel"/>
        <path d="M61 70 L87 150 L67 230 L101 320 L79 410 L95 480" fill="none" stroke="#a0505c" stroke-width="1" opacity=".7"/>
        <path d="M300 120 L286 190 L306 250" fill="none" stroke="#000" stroke-width="7"/>
        <rect width="360" height="640" fill="#081428" opacity=".4"/><rect width="360" height="640" fill="#000" opacity=".25"/>` : ''}`,
    frente: `
      <defs>
        <linearGradient id="cm_laca" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#25170f"/><stop offset=".5" stop-color="#130b07"/><stop offset="1" stop-color="#080403"/></linearGradient>
        <linearGradient id="cm_oro" x1="0" x2="1"><stop offset="0" stop-color="#6e5226"/><stop offset=".5" stop-color="#d8b46a"/><stop offset="1" stop-color="#6e5226"/></linearGradient>
      </defs>
      <path fill-rule="evenodd" fill="url(#cm_laca)" d="M0 0 H360 V640 H0 Z M12 12 H348 V612 H12 Z"/>
      <rect x="12" y="12" width="336" height="600" fill="none" stroke="url(#cm_oro)" stroke-width="1.6"/>
      <rect x="40" y="618" width="280" height="16" rx="3" fill="#2a2520" stroke="#6d5a3a"/>
      <g stroke="#8d806c" stroke-width="2">${repetir(34, i => `<line x1="${46 + i * 8}" y1="620" x2="${46 + i * 8}" y2="632"/>`)}</g>
      <g class="llave"><path d="M352 318 Q344 308 352 304 Q358 308 358 318 Q358 328 352 332 Q344 328 352 318 Z" fill="#b08440" stroke="#5a4320"/></g>
      <g class="roto" stroke="#8d806c" stroke-width="2"><line x1="150" y1="620" x2="158" y2="630"/><line x1="166" y1="621" x2="176" y2="627"/><line x1="230" y1="620" x2="222" y2="632"/></g>`,
    telon: `
      <defs>
        <linearGradient id="ct_laca" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#25170f"/><stop offset=".5" stop-color="#130b07"/><stop offset="1" stop-color="#080403"/></linearGradient>
        <linearGradient id="ct_oro" x1="0" x2="1"><stop offset="0" stop-color="#6e5226"/><stop offset=".5" stop-color="#d8b46a"/><stop offset="1" stop-color="#6e5226"/></linearGradient>
      </defs>
      <g class="tapa">
        <rect width="360" height="640" fill="url(#ct_laca)"/>
        <path d="M0 0 L360 0 L360 90 L0 300 Z" fill="#fff" opacity=".025"/>
        <rect x="16" y="16" width="328" height="608" rx="6" fill="none" stroke="url(#ct_oro)" stroke-width="2"/>
        <rect x="26" y="26" width="308" height="588" rx="4" fill="none" stroke="url(#ct_oro)" stroke-width=".8" opacity=".55"/>
        <g fill="none" stroke="#c89a55" stroke-width="1.2" opacity=".7">
          <path d="M34 70 Q34 34 70 34 M42 70 Q42 42 70 42 Q56 48 52 62"/><path d="M326 70 Q326 34 290 34 M318 70 Q318 42 290 42 Q304 48 308 62"/>
          <path d="M34 570 Q34 606 70 606 M42 570 Q42 598 70 598 Q56 592 52 578"/><path d="M326 570 Q326 606 290 606 M318 570 Q318 598 290 598 Q304 592 308 578"/>
        </g>
        <ellipse cx="180" cy="300" rx="76" ry="98" fill="none" stroke="url(#ct_oro)" stroke-width="1.6"/>
        <ellipse cx="180" cy="300" rx="68" ry="90" fill="none" stroke="#c89a55" stroke-width=".6" opacity=".6"/>
        <path d="M150 300 Q180 270 210 300 Q180 330 150 300 Z" fill="none" stroke="#c89a55" stroke-width=".9" opacity=".7"/>
        <ellipse cx="180" cy="548" rx="7" ry="7" fill="#000" stroke="url(#ct_oro)" stroke-width="1.6"/>
        <path d="M176.5 552 L174 568 L186 568 L183.5 552 Z" fill="#000" stroke="url(#ct_oro)" stroke-width="1.2"/>
      </g>`,
  },

  // ================================================================ TRANSMISIÓN DE MADRUGADA
  tele: {
    fondo: r => `
      <defs>
        <radialGradient id="g1" gradientUnits="userSpaceOnUse" cx="180" cy="420" r="470"><stop offset="0" stop-color="#1d2126"/><stop offset="1" stop-color="#040405"/></radialGradient>
        <radialGradient id="g2" gradientUnits="userSpaceOnUse" cx="180" cy="660" r="230"><stop offset="0" stop-color="#3a3f46" stop-opacity=".9"/><stop offset="1" stop-color="#3a3f46" stop-opacity="0"/></radialGradient>
        <linearGradient id="g3" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".13"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <filter id="g4"><feGaussianBlur stdDeviation="2.2"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="360" height="640" fill="url(#g1)"/>
      <ellipse cx="180" cy="660" rx="300" ry="140" fill="url(#g2)"/>
      <g stroke="#2a2d31" stroke-width="3" fill="none"><line x1="30" y1="640" x2="30" y2="250"/><line x1="30" y1="560" x2="6" y2="640"/><line x1="30" y1="560" x2="56" y2="640"/></g>
      <g transform="rotate(24 34 240)"><rect x="12" y="224" width="46" height="32" rx="4" fill="#1e2125" stroke="#3b3f44"/><rect x="57" y="228" width="6" height="24" fill="${r ? '#444' : '#e8e8e8'}"/></g>
      ${r ? '' : '<polygon points="62,246 360,150 360,540" fill="url(#g3)"/>'}
      <g stroke="#1b1d20" stroke-width="2.5" fill="none"><line x1="334" y1="640" x2="334" y2="420"/><line x1="334" y1="600" x2="318" y2="640"/><line x1="334" y1="600" x2="350" y2="640"/></g>
      <rect x="318" y="398" width="32" height="24" rx="3" fill="#16181b" stroke="#2a2d31" transform="rotate(-18 334 410)"/>
      <path d="M20 640 Q90 610 80 580 Q70 548 130 552" fill="none" stroke="#0d0e10" stroke-width="5"/>
      <rect x="250" y="14" width="94" height="28" rx="3" fill="#2a0707" stroke="#5c1111"/>
      ${r
        ? '<text x="297" y="33" text-anchor="middle" font-family="Consolas, monospace" font-size="12" letter-spacing="1" fill="#8a8a8a">SIN SEÑAL</text>'
        : '<text x="297" y="34" text-anchor="middle" font-family="Consolas, monospace" font-size="14" letter-spacing="2" fill="#ff4d4d" filter="url(#g4)">AL AIRE</text>'}
      ${r ? '<rect width="360" height="640" fill="#000" opacity=".35"/>' : ''}`,
    frente: `
      <defs>
        <pattern id="ft_scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.4" fill="#000" opacity=".32"/></pattern>
        <radialGradient id="ft_vig" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient>
      </defs>
      <rect width="360" height="640" fill="url(#ft_scan)"/>
      <rect width="360" height="640" fill="url(#ft_vig)"/>
      <g class="roto"><g class="franjas" fill="#d0d0d0"><rect y="118" width="360" height="10" opacity=".22"/><rect y="250" width="360" height="26" opacity=".12"/><rect y="404" width="360" height="6" opacity=".3"/><rect y="470" width="360" height="40" opacity=".08"/></g>
        <rect x="0" y="330" width="360" height="18" fill="#000" opacity=".55" class="franjas"/></g>
      <path fill-rule="evenodd" fill="#000" d="M0 0 H360 V640 H0 Z M34 6 H326 Q354 6 354 34 V606 Q354 634 326 634 H34 Q6 634 6 606 V34 Q6 6 34 6 Z"/>`,
    telon: (() => {
      const grises = ['#d6d6d6', '#b4b4b4', '#929292', '#727272', '#545454', '#383838', '#202020'];
      return `
      <defs>
        <clipPath id="tt_sup"><rect width="360" height="320"/></clipPath>
        <clipPath id="tt_inf"><rect y="320" width="360" height="320"/></clipPath>
        <g id="tt_carta">
          <rect width="360" height="640" fill="#161616"/>
          <g stroke="#2c2c2c">${repetir(9, i => `<line x1="${20 + i * 40}" y1="0" x2="${20 + i * 40}" y2="640"/>`)}${repetir(16, i => `<line x1="0" y1="${i * 40}" x2="360" y2="${i * 40}"/>`)}</g>
          <ellipse cx="180" cy="300" rx="132" ry="132" fill="#1f1f1f" stroke="#8a8a8a" stroke-width="2"/>
          <text x="180" y="214" text-anchor="middle" font-family="Consolas, monospace" font-size="17" letter-spacing="3" fill="#d8d8d8">CANAL 0</text>
          ${grises.map((c, i) => `<rect x="${78 + i * 29.2}" y="236" width="29.4" height="94" fill="${c}"/>`).join('')}
          <rect x="78" y="330" width="204" height="22" fill="#0c0c0c"/><rect x="129" y="330" width="51" height="22" fill="#e0e0e0"/><rect x="231" y="330" width="51" height="22" fill="#6a6a6a"/>
          <line x1="180" y1="168" x2="180" y2="432" stroke="#8a8a8a"/><line x1="48" y1="300" x2="312" y2="300" stroke="#8a8a8a" opacity=".5"/>
          <text x="180" y="390" text-anchor="middle" font-family="Consolas, monospace" font-size="13" letter-spacing="4" fill="#bdbdbd">AGUARDE</text>
          <text x="180" y="478" text-anchor="middle" font-family="Consolas, monospace" font-size="22" letter-spacing="2" fill="#9a9a9a">03:47</text>
        </g>
      </defs>
      <g class="mitades"><g class="arriba"><use href="#tt_carta" clip-path="url(#tt_sup)"/></g><g class="abajo"><use href="#tt_carta" clip-path="url(#tt_inf)"/></g></g>
      <g class="apagado">
        <rect class="tapaA" width="360" height="321" fill="#000"/><rect class="tapaB" y="319" width="360" height="321" fill="#000"/>
        <rect class="raya" x="0" y="318" width="360" height="4" fill="#fff"/>
      </g>`;
    })(),
  },

  // ================================================================ LA VIDRIERA
  vidriera: {
    fondo: r => `
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#131a16"/><stop offset="1" stop-color="#060807"/></linearGradient>
        <radialGradient id="g2" gradientUnits="userSpaceOnUse" cx="180" cy="24" r="540"><stop offset="0" stop-color="#d6f0dc" stop-opacity="${r ? 0.06 : 0.32}"/><stop offset=".5" stop-color="#d6f0dc" stop-opacity="${r ? 0.01 : 0.07}"/><stop offset="1" stop-color="#d6f0dc" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="360" height="640" fill="url(#g1)"/>
      <g stroke="#000" stroke-opacity=".35">${repetir(10, i => `<line x1="${18 + i * 36}" y1="0" x2="${18 + i * 36}" y2="590"/>`)}</g>
      <rect y="590" width="360" height="50" fill="#141a16"/><line x1="0" y1="590" x2="360" y2="590" stroke="#232b26"/>
      <g stroke="#2a312d" stroke-width="3"><line x1="12" y1="330" x2="92" y2="330"/><line x1="268" y1="330" x2="348" y2="330"/><line x1="12" y1="470" x2="92" y2="470"/><line x1="268" y1="470" x2="348" y2="470"/></g>
      <line x1="52" y1="330" x2="52" y2="262" stroke="#2a312d" stroke-width="2"/>
      <path d="M30 262 Q52 254 74 262 Q60 266 52 266 Q44 266 30 262 Z M38 260 Q38 236 52 232 Q66 236 66 260 Z" fill="#1c2220"/>
      <line x1="308" y1="330" x2="308" y2="290" stroke="#2a312d" stroke-width="2"/>
      <path d="M298 290 Q296 262 300 248 Q304 244 305 256 L306 240 Q309 234 311 242 L312 252 L314 240 Q317 236 318 246 L318 262 Q324 254 326 262 Q322 280 318 290 Z" fill="#8f9a93" opacity=".45"/>
      <rect x="22" y="452" width="56" height="18" fill="#1a201d"/><rect x="282" y="456" width="50" height="14" fill="#191f1c"/>
      <rect x="60" y="30" width="240" height="6" rx="3" fill="${r ? '#3d4a42' : '#f0fff4'}"/>
      <rect width="360" height="640" fill="url(#g2)"/>
      ${r ? '<rect width="360" height="640" fill="#000" opacity=".3"/>' : ''}`,
    frente: `
      <defs>
        <radialGradient id="fv_farol" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".14"/><stop offset="1" stop-color="#ffcf8a" stop-opacity="0"/></radialGradient>
        <radialGradient id="fv_vaho" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#e4ece6" stop-opacity=".22"/><stop offset="1" stop-color="#e4ece6" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="300" cy="150" rx="70" ry="70" fill="url(#fv_farol)"/>
      <path d="M12 300 L140 28 L168 28 L12 360 Z" fill="#fff" opacity=".03"/>
      <path d="M230 628 L348 380 L348 410 L246 628 Z" fill="#fff" opacity=".025"/>
      <text x="180" y="64" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="26" fill="#c9a25a" opacity=".85">tiesme</text>
      <text x="180" y="78" text-anchor="middle" font-family="Georgia, serif" font-size="7" letter-spacing="4" fill="#c9a25a" opacity=".65">MUÑECAS</text>
      <g class="roto">
        <ellipse cx="180" cy="250" rx="110" ry="60" fill="url(#fv_vaho)"/>
        <g fill="#e8efe9" opacity=".2">
          <g transform="translate(116 340) rotate(-12)"><ellipse rx="14" ry="17"/><ellipse cx="-11" cy="-24" rx="3.2" ry="9"/><ellipse cx="-3" cy="-28" rx="3.2" ry="10"/><ellipse cx="5" cy="-27" rx="3.2" ry="10"/><ellipse cx="12" cy="-22" rx="3" ry="8"/><ellipse cx="17" cy="2" rx="3" ry="8" transform="rotate(50 17 2)"/></g>
          <g transform="translate(248 366) rotate(10)"><ellipse rx="14" ry="17"/><ellipse cx="-11" cy="-22" rx="3" ry="8"/><ellipse cx="-4" cy="-27" rx="3.2" ry="10"/><ellipse cx="4" cy="-28" rx="3.2" ry="10"/><ellipse cx="11" cy="-24" rx="3.2" ry="9"/><ellipse cx="-17" cy="2" rx="3" ry="8" transform="rotate(-50 -17 2)"/></g>
        </g>
        ${rayos(330, 44, ['262,32', '280,96', '310,150', '348,128', '348,70'], 0.5)}
      </g>
      <path fill-rule="evenodd" fill="#111213" d="M0 0 H360 V640 H0 Z M12 28 H348 V628 H12 Z"/>
      <rect x="12" y="28" width="336" height="600" fill="none" stroke="#2a2c2e" stroke-width="1.5"/>
      <rect width="360" height="26" fill="#17181a"/><line x1="0" y1="26" x2="360" y2="26" stroke="#2b2c2e"/>`,
    telon: `
      <defs>
        <linearGradient id="tv_chapa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2f32"/><stop offset=".45" stop-color="#4d5155"/><stop offset="1" stop-color="#1e2022"/></linearGradient>
        <pattern id="tv_pers" width="360" height="18" patternUnits="userSpaceOnUse"><rect width="360" height="18" fill="url(#tv_chapa)"/><line x1="0" y1="17" x2="360" y2="17" stroke="#0c0c0d" stroke-width="2"/></pattern>
      </defs>
      <g class="pers">
        <rect y="26" width="360" height="614" fill="url(#tv_pers)"/>
        <rect y="620" width="360" height="20" fill="#26282b" stroke="#111"/>
        <rect x="60" y="626" width="26" height="6" rx="3" fill="#0e0f10"/><rect x="274" y="626" width="26" height="6" rx="3" fill="#0e0f10"/>
        <path d="M174 628 Q174 616 180 616 Q186 616 186 628" fill="none" stroke="#8f8f8f" stroke-width="2.4"/>
        <rect x="171" y="626" width="18" height="13" rx="2" fill="#a98a3c"/>
        <path d="M0 26 L360 26 L360 140 L0 380 Z" fill="#fff" opacity=".02"/>
      </g>`,
  },
};

// ------------------------------------------------------------------ el escenario
export function crearEscenario(api) {
  const { THREE, scene, luces: L } = api;
  const W = 720, H = 1280;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;

  const v = { negro: 0, glitch: 0, oscuro: 0, ensayo: 0 }, obj = { ...v }, vel = { negro: 1, glitch: 4, oscuro: 1, ensayo: 1 };
  const ir = (k, valor, seg) => { obj[k] = valor; vel[k] = seg > 0 ? Math.abs(valor - v[k]) / seg || 1 : Infinity; };

  const pedido = new URLSearchParams(location.search).get('mundo');
  let mundo = ORDEN.includes(pedido) ? pedido : 'espejo';

  // fondos: cada uno se pasa a imagen una sola vez (normal y roto)
  const img = {};
  let sucio = true;
  const aImagen = cuerpo => new Promise(res => {
    const im = new Image();
    im.onload = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(im, 0, 0, W, H); res(c); };
    im.onerror = e => { console.warn('[mundos] no se pudo dibujar un fondo', e); res(null); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 360 640">${cuerpo}</svg>`);
  });
  for (const m of ORDEN) Promise.all([aImagen(ARTE[m].fondo(false)), aImagen(ARTE[m].fondo(true))]).then(([a, b]) => { img[m] = { normal: a, roto: b }; sucio = true; });

  // capas delante de ella y telones (en las capas de la cabina)
  const cab = document.getElementById('cab'), telon = document.getElementById('cabTelon');
  cab.dataset.mundo = mundo;
  const frente = document.createElement('div'); frente.id = 'mundoFrente';
  frente.innerHTML = ORDEN.map(m => `<svg class="mundoSvg m-${m}" viewBox="0 0 360 640" preserveAspectRatio="none">${ARTE[m].frente}</svg>`).join('') + '<div class="mundoRuido"></div>';
  cab.insertBefore(frente, telon.previousElementSibling || telon);
  telon.insertAdjacentHTML('beforeend', ORDEN.map(m => `<svg class="mundoSvg m-${m}" viewBox="0 0 360 640" preserveAspectRatio="none">${ARTE[m].telon}</svg>`).join(''));
  // nieve de la tele (una imagen chica de ruido que se corre)
  { const n = document.createElement('canvas'); n.width = n.height = 128; const c = n.getContext('2d'), d = c.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const x = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = x; d.data[i + 3] = 255; }
    c.putImageData(d, 0, 0); frente.querySelector('.mundoRuido').style.backgroundImage = `url(${n.toDataURL()})`; }

  // la tele se apaga en un punto cuando el telón se cierra despacio después de haber estado abierto (el final)
  let estabaAbierto = false;
  new MutationObserver(() => {
    const abierto = telon.classList.contains('abierto'), seg = parseFloat(telon.style.getPropertyValue('--seg')) || 1.6;
    if (estabaAbierto && !abierto && !telon.classList.contains('rendija') && seg > 0.5) cab.classList.add('mundoApagando');
    if (abierto || seg <= 0.05) cab.classList.remove('mundoApagando');
    estabaAbierto = abierto;
  }).observe(telon, { attributes: true, attributeFilter: ['class', 'style'] });

  // W: mundo siguiente (se registra antes que las teclas del director, que se tragan casi todas)
  addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'w' || e.target?.tagName === 'INPUT') return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.repeat) return;
    mundo = ORDEN[(ORDEN.indexOf(mundo) + 1) % ORDEN.length];
    cab.dataset.mundo = mundo; sucio = true;
    api.flash?.(`Mundo: ${NOMBRE[mundo]} (W para cambiar)`);
    const u = new URL(location.href); u.searchParams.set('mundo', mundo); history.replaceState(null, '', u);
  }, true);
  setTimeout(() => api.flash?.(`Mundo: ${NOMBRE[mundo]} (W para cambiar)`), 1500);

  const cHemi = new THREE.Color(), cKey = new THREE.Color(), cRota = new THREE.Color(ROTA.col), cRotaH = new THREE.Color(ROTA.hcol);
  let t = 0, antes = '', rotoAntes = null;
  // el tubo de la vidriera, roto: prendido / apagado a los saltos
  const tubo = () => { const s = Math.floor(t * 9); const h = Math.sin(s * 12.9898) * 43758.5453; return (h - Math.floor(h)) < 0.3 ? 0.12 : 1; };

  function dibujar(fl) {
    const im = img[mundo];
    g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (im?.normal) g.drawImage(im.normal, 0, 0);
    if (im?.roto && v.oscuro > 0.001) { g.globalAlpha = v.oscuro; g.drawImage(im.roto, 0, 0); g.globalAlpha = 1; }
    // la luz de la estatua (detrás de la sombra)
    if (v.ensayo > 0.01 && v.oscuro < 0.99) {
      const col = mundo === 'tele' ? '225,232,245' : mundo === 'vidriera' ? '220,245,228' : '255,226,180';
      const rg = g.createRadialGradient(W / 2, H * 0.36, 10, W / 2, H * 0.36, W * 0.62);
      rg.addColorStop(0, `rgba(${col},${0.28 * v.ensayo * (1 - v.oscuro)})`); rg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    if (fl < 1) { g.fillStyle = `rgba(0,0,0,${0.6 * (1 - fl)})`; g.fillRect(0, 0, W, H); }
    if (v.glitch > 0.01) {
      const n = Math.round(v.glitch * 8);
      for (let i = 0; i < n; i++) { const y = Math.random() * H, h = 8 + Math.random() * 80, dx = (Math.random() - 0.5) * 160 * v.glitch; g.drawImage(cv, 0, y, W, h, dx, y, W, h); }
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
    const k = v.oscuro, roto = k > 0.5;
    if (roto !== rotoAntes) { cab.classList.toggle('mundoRoto', roto); rotoAntes = roto; }
    const fl = mundo === 'vidriera' && roto ? tubo() : 1;
    // luz sobre tiesme
    const M = LUZ[mundo], lerp = (a, b) => a + (b - a) * k;
    if (L.hemi) { L.hemi.intensity = lerp(M.hemi, ROTA.hemi) * (1 - 0.3 * v.ensayo) * (0.4 + 0.6 * fl); L.hemi.color.copy(cHemi.setHex(M.hcol)).lerp(cRotaH, k); }
    L.key.intensity = lerp(M.key, ROTA.key) * fl;
    L.key.color.copy(cKey.setHex(M.col)).lerp(cRota, k);
    L.key.position.set(...M.pos);
    // el fondo se vuelve a subir solo si cambió algo
    const firma = `${mundo}|${v.negro.toFixed(3)}|${v.oscuro.toFixed(3)}|${v.ensayo.toFixed(3)}|${fl}`;
    if (sucio || v.glitch > 0.01 || firma !== antes) { dibujar(fl); antes = firma; sucio = false; }
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
