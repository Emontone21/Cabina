// =====================================================================================================================
// GUION de la cabina v0.2 (cartón): "EL NÚMERO DE TIESME". Acá se cambian TEXTOS y TIEMPOS sin tocar el programa.
// Después de cambiar algo: guardar y recargar la página (F5).
//
// La idea (EXPLORACION_CONCEPTO.md, sección 12): están ensayando el número de danza con sombras de tiesme. Richie se
// nombró director. Un solo problema atraviesa todo: la FIGURA de sombra que no sale. Personajes y tono:
// TIESME_RICHIE_PERSONAJES_Y_DIALOGOS_v1.md (antes de la revelación habla solo Richie; tiesme muestra molestia con
// la cara; después discuten, registran que estás, te hablan, decidís, el críptico es el título, función y selfie).
//
// - Los tiempos están en segundos.
// - Cada frase tiene un CÓDIGO. Si un código tiene varias frases, se elige una al azar (sin repetir la anterior).
//   R… = habla Richie · T… = habla tiesme.
// - VOCES GRABADAS (o voces borrador del celular): el archivo se llama como el código + el número de la frase, en la
//   carpeta "audio": "R0-presenta" tiene 2 frases → audio/R0-presenta-1.wav y audio/R0-presenta-2.wav (.wav, .mp3 u
//   .ogg). Si el archivo está, suena la voz y la viñeta dura lo que la voz; si no, el sonidito.
// - TODOS LOS TEXTOS SON PROVISORIOS. Vienen del documento de personajes: posición óptima del brazo, "ya sé lo que
//   vas a decir", "dejá que lo resuelva", "igual algo te ayudé", la selfie y las ausencias. El resto los
//   escribió Claude para que se pueda probar.
// =====================================================================================================================

export default {
  version: 'cabina v0.2.1 (cartón · el número de tiesme)',

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

  // ---------------------------------------------------------------- 7 DECIDÍS + 8 CRÍPTICO + 9 FUNCIÓN + 10 SELFIE
  decision: { dwell: 1.3, intento: 5 },  // segundos con la mano sobre un botón para elegirlo · segundos de cada intento
  criptico: {
    pista: 'Creer en alguien (7)',
    piezas: ['CON', 'FIAR', 'SIN', 'MIRAR', 'PAR', 'TRA'],
    respuesta: ['CON', 'FIAR'],
    ayudas: [14, 26, 38],  // a los cuántos segundos sin acertar ayuda Richie (si no estás eligiendo en ese momento)
    max: 50,               // si no sale, lo revelan y siguen (sin "perdiste")
    dwell: 1.1,
  },
  funcion: { dur: 12 },
  selfie: { dwell: 1.3, espera: 22, arroba: '@al.paciello' },

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
    // --- 7 decidís
    'T3-pregunta': ['¿Vos qué pensás? ¿Cómo lo hacemos?'],
    'R3-pregunta': ['A lo Richie, obviamente. Pero decidí vos, que es democracia.'],
    'R3-arichie': ['Bien. De frente, brazos en V, como dice el manual. Que es mío.'],
    'T3-atiesme': ['Dale. Quedate quieto, yo me encargo.'],
    'R3-falta-richie': ['Los brazos, perfectos. La figura… no. Detalle técnico.'],
    'T3-falta-tiesme': ['El giro está. Pero sola los brazos no me salen.'],
    'T3-otra': ['Probemos la otra.'],
    'R3-otra': ['Probemos la otra. Por las dudas. Para que veas.'],
    'T3-juntos': ['Vos los brazos, yo el giro.'],
    'R3-juntos': ['Era lo que yo iba a decir.'],
    'R3-salio': ['¡Ahí está! ¡El águila!'],
    'R3-ayude': ['Igual algo te ayudé.'],
    'T3-ayude': ['Sí. Cuando te callaste lo vi clarísimo.'],
    // --- 8 el nombre del número = el críptico
    'R3-titulo': ['Falta el nombre del número. Yo propongo: "Richie y su águila majestuosa".'],
    'T3-titulo': ['No. Te doy una pista y lo armás vos.'],
    'R3-ayuda-1': ['Se arma con dos partes.'],
    'T3-dejalo': ['Dejá que lo resuelva por su cuenta, boludo.'],
    'R3-dejalo': ['Pero si no dije nada.'],
    'T3-desde': ['Desde que entró que estás diciendo.'],
    'R3-ayuda-2': ['"En compañía de" también se dice con una palabra muy corta.'],
    'R3-ayuda-3': ['Empieza con CON. Y "vender a crédito"… pensalo.'],
    'R3-revela': ['Bueno, era CONFIAR. Te lo regalo, pero ojo que es tuyo igual.'],
    'T3-bien': ['Eso.', 'Ahí está.'],
    'R3-bien': ['Lindo nombre. Lo pensé yo, en el fondo.'],
    // --- 9 función
    'R3-funcion': ['¡Damas y caballeros! El número de tiesme.'],
    'T3-funcion': ['Y tuyo.'],
    'R3-reverencia': ['¡Reverencia! Agachen la cabeza. Bueno, yo no puedo.'],
    // --- 10 selfie (doc)
    'R3-selfie': ['Bueno, ¿una foto con el elenco?'],
    'T3-selfie': ['Dale. Tocá ahí y date vuelta.'],
    'R3-foto': ['Dale, avisá cuando saques, eh.', 'Whiskyyy.'],
    'T3-quieto': ['Quedate quieto vos.'],
    'R3-gorro': ['Soy un gorro.'],
    'T3-etiqueta': ['Si la subís, etiquetá a al.paciello.'],
    'R3-cuenta': ['A mí todavía no me hizo cuenta.'],
    'T3-paso': ['Bueno, gracias por venir.'],
    'R3-paso': ['Te perdés una foto conmigo, pero ta.'],
    'T3-chau': ['Chau. Gracias.'],
    'R3-chau': ['Que pase el que sigue. Tenemos función.'],

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
