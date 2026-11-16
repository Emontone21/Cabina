// =====================================================================================================================
// GUION de la cabina v0.3 (cartón): "EL NÚMERO DE TIESME". Acá se cambian TEXTOS y TIEMPOS sin tocar el programa.
// Después de cambiar algo: guardar y recargar la página (F5).
//
// La idea (EXPLORACION_CONCEPTO.md, sección 12): están ensayando el número de danza con sombras de tiesme. Richie se
// nombró director. Un solo problema atraviesa todo: la FIGURA de sombra que no sale. Personajes y tono:
// TIESME_RICHIE_PERSONAJES_Y_DIALOGOS_v1.md (antes de la revelación habla solo Richie; tiesme muestra molestia con
// la cara; después discuten y registran que estás). v0.3: el final es el juego de LOS HILOS: ella te da los hilos
// porque quiere, la subís por el teatro y al final te pide que la sueltes (sale la figura). Sin botones, críptico ni
// selfie (quedaron en _versiones/cabina_v0.2.1).
//
// - Los tiempos están en segundos.
// - Cada frase tiene un CÓDIGO. Si un código tiene varias frases, se elige una al azar (sin repetir la anterior).
//   R… = habla Richie · T… = habla tiesme.
// - VOCES GRABADAS (o voces borrador del celular): el archivo se llama como el código + el número de la frase, en la
//   carpeta "audio": "R0-presenta" tiene 2 frases → audio/R0-presenta-1.wav y audio/R0-presenta-2.wav (.wav, .mp3 u
//   .ogg). Si el archivo está, suena la voz y la viñeta dura lo que la voz; si no, el sonidito.
// - TODOS LOS TEXTOS SON PROVISORIOS. Vienen del documento de personajes: posición óptima del brazo, "ya sé lo que
//   vas a decir" y las ausencias. El resto (los hilos incluidos) los escribió Claude para que se pueda probar.
// =====================================================================================================================

export default {
  version: 'cabina v0.3 (cartón · el número de tiesme · los hilos)',

  // De qué lado de la TELE está la puerta de la cabina (por ahí se asoma tiesme al llegar).
  puerta: 'izquierda', // 'izquierda' o 'derecha'

  // ---------------------------------------------------------------- ESPERA (no hay nadie): telón cerrado
  titulo: {
    logo: 'tiesme',
    sub: 'el número de tiesme',
    pasa: 'pasá y parate frente a la cámara',
  },
  cartel: 'El número de tiesme',   // lo que dice el cartel del teatro hasta que el número tenga nombre

  // ---------------------------------------------------------------- 1 PRESENTACIÓN + 2 CALENTAMIENTO (Richie dice)
  presentacion: {
    asomada: 2.4,          // al entrar: se asoma tímida por el telón y se esconde
    telon: 1.6,            // lo que tarda en abrirse el telón
    entrada: 1.4,          // sube desde abajo
    espejo: 6,             // segundos para descubrir que te copia antes del calentamiento
  },
  calentamiento: {
    orden: ['consigna', 'escape', 'consigna', 'trampa', 'escape', 'consigna'],
    plazo: 7,              // segundos para cumplir una consigna
    plazoTrampa: 4,        // segundos en los que se mira si cae en la trampa
    sostener: 1.0,         // segundos que hay que sostener el gesto (se llena el círculo); antes era 0,25
    escape: 0.7,           // cuánto le dura a tiesme la cara "suya" cuando se le escapa (va creciendo)
    pausa: 0.6,
  },
  // Consignas. donde = sobre qué parte de ella aparece el círculo. detecta = qué mide la cámara (cabina/senales.js).
  consignas: [
    { id: 'manosArriba',    icono: '🙌', texto: '¡manos arriba!',         detecta: 'manosArriba',    donde: 'cabeza' },
    { id: 'saludar',        icono: '👋', texto: '¡saludá!',               detecta: 'saludar',        donde: 'manoDer' },
    { id: 'girarCabeza',    icono: '↔️', texto: '¡mirá para un costado!', detecta: 'girarCabeza',    donde: 'cabeza' },
    { id: 'inclinarCabeza', icono: '🙃', texto: '¡cabeza de costado!',    detecta: 'inclinarCabeza', donde: 'cabeza' },
    { id: 'boca',           icono: '😮', texto: '¡abrí bien la boca!',    detecta: 'abrirBoca',      donde: 'cara' },
    { id: 'sonreir',        icono: '😁', texto: '¡sonreí!',               detecta: 'sonreir',        donde: 'cara' },
  ],
  trampas: [
    { icono: '🙌', texto: '¡manos arriba!', detecta: 'manosArriba', donde: 'cabeza' },
    { icono: '👋', texto: '¡saludá!',       detecta: 'saludar',     donde: 'manoDer' },
  ],
  // las caras que "se le escapan" a tiesme antes de hablar (estados que ya existen en estados_cara)
  escapes: [
    { ojos: 'sospecha', cejas: 'down' },
    { ojos: 'nocompro' },
    { ojos: 'sospecha', boca: 'base', cejas: 'down' },
  ],

  // ---------------------------------------------------------------- 3 ENSAYO (estatuas) + 4 REVELACIÓN
  ensayo: {
    musicaAntes: 2.5,      // música antes de cada "¡estatua!"
    estatua: 3,            // segundos de estatua (intentos 1 y 2)
    estatua3: 5,           // la tercera (la revelación)
    intentos: 2,           // intentos que fallan antes de la revelación
    encajeOk: 0.85,        // cuánto tiene que encajar la sombra para que la figura "salga"
  },
  // La FIGURA del número: la pose (como en cuerpo.js: dirección [afuera, arriba, adelante] de brazo y antebrazo) y el
  // giro del cuerpo en grados. Los brazos los pone la persona (lo de Richie); el giro lo pone tiesme (lo de ella).
  figura: {
    nombre: 'el águila',
    instruccion: 'brazos arriba, abiertos en V',
    pose: {
      brazoIzq: { brazo: [0.78, 0.58, 0.12], ante: [0.6, 0.79, 0.08] },
      brazoDer: { brazo: [0.78, 0.58, 0.12], ante: [0.6, 0.79, 0.08] },
    },
    giro: 55,
  },
  // Dónde se ve la sombra en la pared (en "torsos" de ella): x a la derecha, y arriba, atrás = qué tan lejos detrás,
  // escala = tamaño. Va ARRIBA de su cabeza (detrás de ella quedaba tapada). Mientras se ve la sombra, el plano se abre
  // (plano: 0,5 = la mitad de cerca) y baja (bajar: 0,24 de la pantalla) para que entren tiesme y la pared.
  // borde = grosor del contorno dorado de la figura.
  sombra: { x: 0, y: 1.55, atras: 1.2, escala: 0.7, plano: 0.5, bajar: 0.24, borde: 4,
    colorSombra: '#14060a', opSombra: 0.82, colorFigura: '#ffd27a', opFigura: 0.42 },

  // ---------------------------------------------------------------- 5 DISCUSIÓN + 6 REGISTRAN QUE ESTÁS
  registro: {
    manoSola: 1.2,         // cuánto se mueve la mano de ella por tu culpa (su último hilo)
    esperaMovimiento: 6,   // si no te movés en estos segundos, igual se dan cuenta
  },
  pollito: { activo: true, dur: 12, aVidrio: 5 }, // se acerca al vidrio SOLO cuando no la mirás (por vergüenza)

  // ---------------------------------------------------------------- 7 LOS HILOS + 8 SOLTAME (v0.3)
  // Ella te da los hilos: arriba aparece la CRUCETA (la cruz del titiritero), que sigue tu mano, y ella cuelga de los
  // hilos. Lugares en la pantalla de 0 a 1 (y: 0 = arriba). Tiempos en segundos.
  hilos: {
    // el plano se abre (0,5 = la mitad de cerca) para que entre entera y haya lugar para subirla. Medido el 28/10: con
    // el plano normal (1) mide 2,3 pantallas de la cabeza a la punta del pie; con 0,19 ocupa ~0,44 de la pantalla.
    plano: 0.19,
    piso: 0.9,             // dónde apoya los pies en la pantalla (las tablas del piso empiezan en 0,86)
    largo: 0.1,            // largo de los hilos en la pantalla: de la cruceta a su cabeza
    // con tu mano arriba de todo / abajo de todo, a qué altura va la cruceta. Con la mano a la altura del hombro
    // empieza a despegarla del piso; con la mano arriba de la cabeza, bien arriba.
    cruceta: { arriba: 0.09, abajo: 0.52 },
    ayuda: 3.5,            // segundos que se ve la tarjeta de arriba ("levantá la mano"…): tapa la cruceta
    gracia: 0.6,           // si se pierde tu mano menos que esto, la sostiene igual; después la cruceta baja sola
    agarra: { max: 14, subir: 0.45, sostener: 1.2 }, // tramo 1: hay que levantarla (subir: de 0 a 1) un ratito
    // tramo 2: la utilería pasa por el escenario. alto = cuánto hay que levantarla (de 0 a 1 de lo que da la cruceta).
    // "richie" = la cosa en la que Richie acierta: grita "¡ahora!" justo a tiempo.
    utileria: {
      velocidad: 0.3,      // pantallas por segundo
      cosas: [
        { nombre: 'baúl', icono: '🧳', alto: 0.3, ancho: 0.17, en: 0.5 },
        { nombre: 'banquito', icono: '🪑', alto: 0.45, ancho: 0.13, en: 3.3, frase: 'R4-mal' },
        { nombre: 'el atril de Richie', icono: '🎼', alto: 0.6, ancho: 0.12, en: 6.1, frase: 'R4-atril' },
        { nombre: 'la escalera', icono: '🪜', alto: 0.82, ancho: 0.15, en: 9.2, richie: true },
      ],
    },
    // tramo 3: suben por la torre del teatro (donde cuelgan las cuerdas). Tu mano la mueve; esquivá los contrapesos.
    vuelo: { dur: 15, velocidad: 0.28, contrapesos: 1.5, radio: 0.055 },
    // el final: "ahora soltame" (bajás la mano) · si no la soltás, Richie avisa y después se suelta ella sola
    soltar: { aviso: 6, sola: 10, bajar: 0.4 },
    arroba: '@al.paciello',
  },

  // ---------------------------------------------------------------- AUSENCIAS
  casos: {
    volveA: 1.0,           // antes de la revelación: a los cuántos segundos fuera Richie comenta
    seFueA: 3.0,           // después de la revelación: comentan entre los dos
    reinicioA: 12,         // si no vuelve en estos segundos, vuelve a la Espera
  },

  // ---------------------------------------------------------------- FRASES (provisorias)
  frases: {
    // --- 1 presentación (habla solo Richie: tiesme todavía es marioneta)
    'R0-presenta': ['¡Bienvenido, bienvenida! Hoy vas a ser tiesme.', 'Pasá, pasá. Hoy vas a ser tiesme.'],
    'R0-roles': ['Ella pone la cara, yo pongo el cerebro, y vos ponés el cuerpo.'],
    'R0-espejo': ['Mové algo. ¿Ves? Sos ella. Bueno, ella es vos. Es complicado.', 'Movete un poco. Eso. Ahora sos tiesme.'],
    // --- 2 calentamiento (Richie dice)
    'R1-calienta': ['Antes del número, calentamos. Regla de oro: solo vale si digo "Richie dice".'],
    'R1-consigna-manosArriba': ['Richie dice: ¡manos arriba!'],
    'R1-consigna-saludar': ['Richie dice: ¡saludá!'],
    'R1-consigna-girarCabeza': ['Richie dice: ¡mirá para un costado!'],
    'R1-consigna-inclinarCabeza': ['Richie dice: ¡cabeza de costado!'],
    'R1-consigna-boca': ['Richie dice: ¡abrí bien la boca!'],
    'R1-consigna-sonreir': ['Richie dice: ¡sonreí!'],
    'R1-trampa': ['¡Manos arriba!', '¡Ahora saludá!'],
    'R1-trampa-si': ['¡Ja! No dije "Richie dice". Clásico.', 'Cayó. Igual que ella el primer día.'],
    'R1-trampa-no': ['Uh, no cayó. Viene atenta la cosa.', 'Bien. Eso no te lo enseñé yo, pero bien.'],
    'R1-bien': ['¡Eso!', '¡Bien!', 'Impecable. Gracias a mi método.', 'Perfecto. Te lo dije.'],
    'R1-tarde': ['Bueno, nada. Otra.', 'Casi. Siguiente.'],
    // cuando Richie se agranda, a tiesme se le escapa la cara
    'R1-agranda': ['Lo que pasa es que yo veo todo desde arriba. Literal.', 'Sin mí esto sería un desfile de brazos.', 'Años de experiencia. En una cabeza, pero experiencia.'],

    // --- 3 ensayo
    'R2-ensayo': ['Ahora el número. Cuando se corta la música: ¡estatua! Y la sombra tiene que formar el águila.'],
    'R2-teoria': ['Primero hay que determinar la posición óptima del brazo.', 'Brazos arriba, en V. Es pura geometría. Confiá en el gorro.'],
    'R2-pose': ['Brazos arriba, abiertos en V.'],
    'R2-estatua': ['¡Estatua!'],
    'R2-casi': ['Casi. Le falta… algo. Más V.', 'Mmm. Eso es un águila cansada.', 'Está bien hecho. Algo raro tiene la pared.'],
    'R2-otra': ['Otra vez. Igual que antes, pero mejor.', 'De nuevo. Confiá en el método.'],
    // --- 4 revelación (tiesme habla por primera vez)
    'R2-quien': ['…¿Quién te dijo que te muevas?'],
    'T2-yo': ['Yo.'],
    // --- 5 discusión (Rick–Morty: teoría enorme contra observación concreta). Varias del documento de personajes.
    'R2-disc-1': ['Eso no estaba en el ensayo.'],
    'T2-disc-1': ['Por eso salió.'],
    'R2-disc-2': ['Ya sé lo que vas a decir.'],
    'T2-disc-2': ['Entonces dejame decirlo.'],
    'R2-disc-3': ['Que tenés otra idea.'],
    'T2-disc-3': ['Tenía. Ahora tengo una puteada.'],
    'R2-disc-4': ['El brazo estaba perfecto. El brazo lo hice yo.'],
    'T2-disc-4': ['El brazo sí. Lo demás lo hice yo.'],
    // --- 6 registran que estás
    'R2-yeso': ['…¿Y eso?'],
    'T2-escucha': ['…nos está escuchando.'],
    'R2-nomires': ['Dale, no la mires que se pone nerviosa.'],
    'T2-hola': ['¿Hola?'],
    'T2-perdon': ['Perdón. No es siempre así.'],
    'R2-siempre': ['Es siempre así.'],
    // --- 7 los hilos: ella te los da porque quiere
    'T4-salto': ['El número tiene un salto que nunca me salió.'],
    'R4-salto': ['Porque no me hacés caso.'],
    'T4-sola': ['Porque sola no llego.'],
    'T4-agarra': ['Agarrá. Si me soltás, me caigo.'],
    'T4-mano': ['Levantá la mano. Ahí están los hilos.'],
    'R4-arriba': ['Más arriba.'],
    'R4-mucho': ['No, mucho.'],
    'R4-ahi': ['Ahí. Perfecto. Gracias a mí.'],
    'R4-ensayo': ['Bueno, ensayamos el salto. Cuidado con la utilería.'],
    'R4-atril': ['¡Mi atril!'],
    'R4-mal': ['¡Ahora! No, todavía no.', '¡Abajo! Digo, arriba.', '¡Saltá! Bueno, vos no. Ella.'],
    'R4-ahora': ['¡AHORA!'],
    'T4-auch': ['¡Auch!', 'Ay. Bien, bien.', 'Eso estaba ahí antes.'],
    'T4-bien': ['¡Eso!', '¡Ahí va!'],
    'R4-acerte': ['¿Viste? Una cada tanto la emboco.'],
    // --- 8 soltame: suben por la torre del teatro y al final ella te pide que la sueltes
    'T4-masalto': ['Más alto. Vamos más alto.'],
    'R4-adonde': ['¿Adónde vamos? Esa zona no es para gorros.'],
    'R4-vertigo': ['Vivo arriba de una cabeza, pero tengo vértigo.'],
    'R4-contrapeso': ['¡Contrapeso!', '¡Bolsa de arena!', '¡Ojo arriba!'],
    'T4-llegamos': ['Acá arriba se atan todos los hilos.'],
    'T4-soltame': ['Ahora soltame.'],
    'R4-soltala': ['Creo que tenés que soltarla.'],
    'T4-mesuelto': ['Bueno. Me suelto yo.'],
    'R4-final': ['¡Damas y caballeros! ¡El salto de tiesme!'],
    'T4-final': ['Y tuyo.'],
    'R4-reverencia': ['¡Reverencia! Agachen la cabeza. Bueno, yo no puedo.'],

    // --- ausencias (doc). Antes de la revelación habla solo Richie.
    'R-ausente-antes': ['¿Hola? Se me fue tiesme.', 'Fa, y yo explicando como un campeón.'],
    'R-vuelve-antes': ['Ah, bien. Era una pausa dramática.'],
    'R-ausente-1': ['Fa, nos dejó re colgados.'],
    'T-ausente-1': ['Capaz fue a buscar a alguien que explique menos.'],
    'T-vuelve-1': ['Ah… hola. Estábamos…'],
    'R-vuelve-1': ['Bien ahí que volviste. Estábamos hablando bien de vos.'],
    'T-vuelve-1b': ['No estábamos hablando bien.'],
    'T-ausente-2': ['¿Se fue?'],
    'R-ausente-2': ['Sí. En mi mejor parte, aparte.'],
    'T-ausente-2b': ['Hace rato estás en tu mejor parte.'],
    'T-vuelve-2': ['Ah, volviste.'],
    'R-vuelve-2': ['Más te vale. Me dejaste una frase abierta.'],
  },
};
