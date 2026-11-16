// =====================================================================================================================
// GUION de la cabina de 3 actos (cabina v0.1, cartón). Acá se cambian TEXTOS y TIEMPOS sin tocar el programa.
// Después de cambiar algo: guardar y recargar la página (F5).
//
// - Los tiempos están en segundos.
// - Cada frase tiene un CÓDIGO (el de BIBLIA_EXPERIENCIA.md). Si un código tiene varias frases, se elige una al azar
//   (sin repetir la anterior). R… = habla Richie · T… = habla tiesme.
// - VOCES GRABADAS: el archivo se llama como el código + el número de la frase (empieza en 1), en la carpeta "audio":
//   "R1-saludo" tiene 3 frases → audio/R1-saludo-1.wav, audio/R1-saludo-2.wav, audio/R1-saludo-3.wav
//   (sirve .wav, .mp3 u .ogg). Si el archivo está, suena la voz; si no, el sonidito de prueba.
// - Los efectos y la música también se pueden reemplazar: audio/fx-toc.wav, audio/musica-juego.mp3, etc. (lista al final).
// - TODOS LOS TEXTOS SON PROVISORIOS (los escribió Claude con los ejemplos de la biblia v3) hasta que Agustín escriba
//   los suyos.
// =====================================================================================================================

export default {
  version: 'cabina v0.1 (cartón)',

  // De qué lado de la TELE está la puerta de la cabina: por ahí se asoma tiesme (1.1) y por ahí se va (3.4).
  puerta: 'izquierda', // 'izquierda' o 'derecha'

  // ---------------------------------------------------------------- ESPERA (no hay nadie)
  titulo: {
    logo: 'tiesme',
    sub: '¡el juego del espejo!',
    pasa: 'pasá y parate frente a la cámara',
  },

  // ---------------------------------------------------------------- ACTO 1: TITIRITERO
  acto1: {
    asomada: 2.4,          // 1.1: cuánto dura la asomada tímida
    entrada: 1.4,          // 1.2: cuánto tarda en subir desde abajo
    descubre: 10,          // 1.3: cuánto dura el "me copia" antes de las consignas
    saludoA: 1.5,          // 1.3: a los cuántos segundos Richie la despierta
    quietoSeg: 3,          // 1.3: si la persona no se mueve en estos segundos, arranca la primera consigna
    // 1.4 Richie dice: el orden de lo que pasa. consigna = una al azar de la lista de abajo.
    orden: ['consigna', 'chamuyo', 'consigna', 'trampa', 'chamuyo', 'consigna', 'gesto'],
    plazo: 6,              // segundos para cumplir una consigna (si no, Richie se burla y sigue)
    plazoTrampa: 4,        // segundos en los que se mira si cae en la trampa
    gestoSeg: 4,           // cuánto se graba "tu mejor gesto" (para el acto 3)
    pausa: 0.6,            // respiro entre una cosa y otra
  },

  // Consignas del "Richie dice" (solo movimientos que el tracking copia bien). icono = emoji provisorio.
  // detecta = qué mide la cámara (no cambiar salvo que se agregue la medición en cabina/senales.js).
  consignas: [
    { id: 'manosArriba',    icono: '🙌', texto: '¡manos arriba!',       detecta: 'manosArriba' },
    { id: 'saludar',        icono: '👋', texto: '¡saludá!',             detecta: 'saludar' },
    { id: 'girarCabeza',    icono: '↔️', texto: '¡mirá para un costado!', detecta: 'girarCabeza' },
    { id: 'inclinarCabeza', icono: '🙃', texto: '¡inclinate de costado!', detecta: 'inclinarCabeza' },
    { id: 'boca',           icono: '😮', texto: '¡abrí bien la boca!',  detecta: 'abrirBoca' },
    { id: 'cejas',          icono: '🤨', texto: '¡cejas arriba!',       detecta: 'cejas' },
    { id: 'ojos',           icono: '😌', texto: '¡cerrá los ojos!',     detecta: 'cerrarOjos' },
    { id: 'sonreir',        icono: '😁', texto: '¡sonreí!',             detecta: 'sonreir' },
  ],
  // La trampa: una consigna SIN "Richie dice". Cada una corresponde a una frase de R1-trampa (en el mismo orden).
  trampas: [
    { icono: '🙌', texto: '¡manos arriba!', detecta: 'manosArriba' },
    { icono: '👋', texto: '¡saludá!',       detecta: 'saludar' },
  ],

  // ---------------------------------------------------------------- ACTO 2: ESTATUA / REVELACIÓN
  acto2: {
    musicaAntes: 2.5,      // segundos de música antes de cada "¡estatua!"
    estatua: 3,            // duración del timer de las poses 1 y 2
    estatua3: 6,           // duración del timer de la pose 3 (acá se libera)
    giroCabeza: 4,         // 2.2: cuánto tarda en girar la cabeza hasta mirarte
    algoAndaMal: 5,        // 2.3
    quiebre: 8,            // 2.5
  },
  poses: [ // juego de las estatuas: la 3 es la que libera a tiesme
    { icono: '🤸', texto: 'brazos en cruz' },
    { icono: '🙌', texto: 'manos arriba' },
    { icono: '👀', texto: 'mirá a lo lejos', ayuda: '(mano de visera, mirando a tu izquierda)' },
  ],

  // 2.4 La degradación: cada parte a su ritmo. t = segundos desde que empieza el 2.4.
  // Escalones (biblia): retraso (segundos de atraso) → impreciso (0 a 1: corrida de lugar y a medias)
  // → contrario (0 a 1: deja de ser espejo) → cortar (esa parte ya es de ella: se corta su hilo).
  // Partes: cabeza, torso, brazoIzq, brazoDer, manoIzq, manoDer, cara.
  // OJO: izquierdo/derecho son DE ELLA. Su brazo izquierdo se ve a la DERECHA de la tele (copia tu brazo derecho).
  degradacion: {
    dur: 20,
    pasos: [
      { t: 0,  partes: ['brazoIzq', 'brazoDer', 'manoIzq', 'manoDer'], retraso: 0.25 },
      { t: 3,  partes: ['brazoIzq', 'brazoDer', 'manoIzq', 'manoDer'], retraso: 0.6 },
      { t: 5,  partes: ['brazoIzq', 'brazoDer'], impreciso: 0.6 },
      { t: 6,  cortar: 'cabeza' },
      { t: 7,  partes: ['cara', 'torso'], retraso: 0.7 },
      { t: 10, partes: ['brazoIzq', 'manoIzq'], contrario: 1, impreciso: 0.2 },
      { t: 11, cortar: 'brazoDer' },
      { t: 13, cortar: 'cara' },
      { t: 16, cortar: 'brazoIzq' },
      { t: 17, cortar: 'torso' },
    ],
    // qué hace cada parte cuando se corta su hilo (movimientos por programa)
    alCortar: { brazoDer: 'mirarseLaMano', brazoIzq: 'colgar', cara: 'sonrisa', torso: 'respirar', cabeza: 'mirarte' },
    frases: [{ t: 8, codigo: 'R2-susurro' }, { t: 14.5, codigo: 'T2-sonido' }],
  },
  // Pollito inglés (a probar): después de la degradación, tiesme se acerca SOLO cuando no la mirás.
  pollito: { activo: true, dur: 12 },

  // ---------------------------------------------------------------- ACTO 3: CONTRA-TITIRITERO
  acto3: {
    copiaPose: 4,          // 3.3: segundos por pose
    chauEspera: 8,         // 3.4: si no se va en estos segundos, escalada
    // puntaje "humillante" del copiá vos: lo real multiplicado por esto, con un techo
    puntajeFactor: 0.45,
    puntajeMax: 41,
  },
  copiaPoses: [ // 3.3: poses que hace tiesme y vos tenés que copiar
    { id: 'cruz',      icono: '🤸', texto: 'brazos en cruz',    detecta: 'cruz' },
    { id: 'arriba',    icono: '🙌', texto: 'manos arriba',      detecta: 'manosArriba' },
    { id: 'unaArriba', icono: '🙋', texto: 'una mano arriba',   detecta: 'unaArriba' },
  ],

  // ---------------------------------------------------------------- CASOS
  casos: {
    volveA: 1.0,           // acto 1: a los cuántos segundos fuera de cuadro Richie dice "¡eh, volvé!"
    seFueA: 2.5,           // a los cuántos segundos fuera Richie dice "¿Y? ¿Se fue?"
    reinicioA: 10,         // si no vuelve en estos segundos, vuelve a la pantalla de título
    salidaFinal: 3,        // 3.4: segundos sin nadie para dar por terminado y reiniciar
  },

  // ---------------------------------------------------------------- FRASES (provisorias)
  frases: {
    // --- acto 1 (Richie le habla a tiesme como a una muñeca; él ya sabe todo: doble sentido)
    'R1-saludo': ['¡Tiesme! ¿Estás despierta?', '¡Arriba, muñeca! Llegó alguien.', 'Tiesme… tiesme… ¡TIESME! Ah, ahí está.'],
    'R1-quieto': ['¿Y? Moveme esa muñeca, tiesme.', 'Tiesme, mové algo. Lo que sea.'],
    'R1-consigna-manosArriba': ['Richie dice: ¡manos arriba!'],
    'R1-consigna-saludar': ['Richie dice: ¡saludá, tiesme!'],
    'R1-consigna-girarCabeza': ['Richie dice: ¡mirá para un costado!'],
    'R1-consigna-inclinarCabeza': ['Richie dice: ¡cabeza de costado!'],
    'R1-consigna-boca': ['Richie dice: ¡abrí bien la boca!'],
    'R1-consigna-cejas': ['Richie dice: ¡cejas arriba!'],
    'R1-consigna-ojos': ['Richie dice: ¡cerrá los ojos!'],
    'R1-consigna-sonreir': ['Richie dice: ¡sonreí, tiesme!'],
    'R1-trampa': ['¡Manos arriba!', '¡Ahora saludá!'],
    'R1-trampa-si': ['¡Ja! No dije "Richie dice". Muñeca obediente.', 'Cayó. Hace caso a cualquiera.'],
    'R1-trampa-no': ['Uh, no cayó. Qué viveza, tiesme.', 'Bien. Atenta, eh. Muy atenta.'],
    'R1-gesto': ['Tiesme, hacé tu mejor gesto. El mejor.', 'A ver tu mejor cara, tiesme. Dale.'],
    'R1-bien': ['¡Bien!', '¡Eso!', '¡Muñeca de oro!', '¡Perfecto, tiesme!', '¡Mirá vos!'],
    'R1-tarde': ['Tardísimo. Siguiente.', 'Bueno, nada. Otra.', 'Ay, tiesme… otra.'],
    'R1-chamuyo': [
      '¿Sabías que los gorros vemos todo? Todo, todo.',
      'Yo antes era un sombrero de copa. Larga historia.',
      'Qué lindo día para ser un gorro.',
      'Me pica la visera. No importa. Sigamos.',
      'Tiesme, hoy te veo con vida. Bah, es un decir.',
      'Nadie mira nunca para arriba. Yo sí.',
      'Shh… concentrate, tiesme. Que nos miran.',
    ],
    'R1-volve': ['¡Eh, volvé!', '¿Adónde vas? ¡Volvé!'],

    // --- acto 2 (la sorpresa de Richie es ACTUADA: él sabía)
    'R2-estatuas': ['¡Ahora jugamos a las estatuas! Cuando se corta la música, hacé la pose y quedate quieta.'],
    'R2-pose-1': ['Primera pose: ¡brazos en cruz!'],
    'R2-pose-2': ['Segunda: ¡manos arriba!'],
    'R2-pose-3': ['Última: ¡mirá a lo lejos!'],
    'R2-estatua': ['¡Estatua!'],
    'R2-estatua-bien': ['¡Ni un pelo! Muy bien.', 'Quietita. Así me gusta.'],
    'R2-estatua-mal': ['Te moviste, tiesme. Te vi.', 'Eso no es una estatua, es un flan.'],
    'R2-glitch': ['Eh… ¿tiesme?', '¿Tiesme? ¿Qué… qué pasa?'],
    'R2-susurro': ['…tiesme, ¿qué hacés?', '…no, no, no. Tiesme.', '…shh. No la mires.'],
    'T2-sonido': ['mmh.', 'jjj…', '(respira)'],

    // --- acto 3 (ahora le hablan a la persona; tiesme habla por primera vez)
    'R3-hola': ['Pará. ¿Y vos quién sos?', 'Ah, mirá. Hay alguien ahí.'],
    'T3-hola': ['Hola.', 'Te veo.'],
    'R3-charla': ['¿Viste cómo se movía? Se creía que te manejaba.', 'Pobre.'],
    'T3-charla': ['Sí.', 'Le salía bastante bien.'],
    'R3-dato-trampa-si': ['Y encima hace caso cuando nadie le dice nada.', 'Dije "manos arriba" y las levantó. Sin "Richie dice". Ja.'],
    'R3-dato-trampa-no': ['Esquivó la trampa. Qué aburrido.', 'La trampa no, pero todo lo demás sí.'],
    'R3-dato-risa-si': ['Se reía, ¿viste? Solo, se reía.', 'Cada tanto, una sonrisita. Qué alegría.'],
    'R3-dato-risa-no': ['Ni una sonrisa, eh.', 'Cara de nada todo el tiempo.'],
    'R3-dato-estatuas-si': ['Las estatuas, perfectas. Obediencia total.', 'Ni se movió. Así me gusta.'],
    'R3-dato-estatuas-no': ['Ni una estatua puede hacer.', 'Le pedimos quietud y nada.'],
    'R3-dato-rapido': ['Obedecía rapidísimo, como perrito.', 'Decías algo y ¡zas!, lo hacía.'],
    'R3-dato-lento': ['Tardaba una banda en todo.', 'Todo en cámara lenta.'],
    'R3-dato-gesto': ['Mirá lo que hizo. Mirá.', 'Esto hizo. Esto.'],
    'T3-dato-gesto': ['Así.', 'Mirá.'],
    'R3-confiesa': ['Nah, mentira. Se mueve sola siempre. Te estábamos cargando.', '¿Posta creíste que la manejabas vos?'],
    'R3-copia': ['Ahora al revés. Copiala vos. Dale.'],
    'T3-copia': ['Copiame.'],
    'R3-copia-bien': ['Mmm. Zafa.'],
    'R3-copia-mal': ['¿Eso es todo?'],
    'R3-copia-horrible': ['Qué desastre. Qué desastre.'],
    'R3-chau': ['Bueno, chau.', 'Andá, andá. Ya está.', 'Listo, se terminó. Afuera.', 'Chau, chau. Que pase el que sigue.'],
    'T3-chau': ['Chau.'],
    'R3-noseva': ['¿Seguís ahí? Ya terminó.', 'Eh. Te dije que te vayas.'],

    // --- en cualquier momento
    'R-sefue': ['¿Y? ¿Se fue?', 'Ah, se fue. Bueno.'],
  },

  // ---------------------------------------------------------------- EFECTOS Y MÚSICA (para reemplazar por archivos)
  // audio/fx-asomada · fx-fiuuu · fx-bien · fx-mal · fx-estatua · fx-tic · fx-glitch · fx-zumbido · fx-hilo · fx-toc ·
  // fx-risa · fx-apagar · fx-inicio   ·   audio/musica-menu · musica-juego · musica-oscura   (.wav, .mp3 u .ogg)
};
