// =====================================================================================================================
// GUION de la cabina v0.5 (cartón): "EL NÚMERO DE TIESME". Acá se cambian TEXTOS y TIEMPOS sin tocar el programa.
// Después de cambiar algo: guardar y recargar la página (F5).
//
// La idea (EXPLORACION_CONCEPTO.md, sección 12): están ensayando el número de danza con sombras de tiesme. Richie se
// nombró director. Un solo problema atraviesa todo: la FIGURA de sombra que no sale. Personajes y tono:
// TIESME_RICHIE_PERSONAJES_Y_DIALOGOS_v1.md (antes de la revelación habla solo Richie; tiesme muestra molestia con
// la cara; después discuten y registran que estás). v0.5: el final es el juego "¡CAMBIO!": se alternan "te copia"
// (ella te copia) y "copiala" (ella hace una pose y vos la copiás), cada vez más rápido, y termina con el águila entre
// los tres. Lo que se sacó quedó en _versiones/ (botones, críptico y selfie en cabina_v0.2.1; los hilos en cabina_v0.3).
// v0.7 (23/11): el vidrio del espejo se raja con el golpe de tiesme y la persona ELIGE EL FINAL sin menú: pegarle al
// vidrio (final libre: se rompe y ella se va) o pasarle la mano (final de Richie: se repara, ella vuelve a ser muñeca y
// "el interruptor"). "¡Cambio!" y el águila del final quedaron en _versiones/cabina_v0.6.
//
// - Los tiempos están en segundos.
// - Cada frase tiene un CÓDIGO. Si un código tiene varias frases, se elige una al azar (sin repetir la anterior).
//   R… = habla Richie · T… = habla tiesme.
// - VOCES GRABADAS (o voces borrador del celular): el archivo se llama como el código + el número de la frase, en la
//   carpeta "audio": "R0-presenta" tiene 2 frases → audio/R0-presenta-1.wav y audio/R0-presenta-2.wav (.wav, .mp3 u
//   .ogg). Si el archivo está, suena la voz y la viñeta dura lo que la voz; si no, el sonidito.
// - TODOS LOS TEXTOS SON PROVISORIOS. Vienen del documento de personajes: posición óptima del brazo, "ya sé lo que
//   vas a decir" y las ausencias. El resto los escribió Claude para que se pueda probar.
// =====================================================================================================================

export default {
  version: 'cabina v0.7 (el espejo · dos finales)',

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
    // v0.5.1: tolerancia de los brazos, en grados, mirados como sombra (de frente, sin la profundidad): hasta tolBien
    // de diferencia con la figura cuenta entero; desde tolNada no cuenta nada; en el medio, de a poco
    tolBien: 15,
    tolNada: 50,
  },
  // La FIGURA del número: la pose (como en cuerpo.js: dirección [afuera, arriba, adelante] de brazo y antebrazo) y el
  // giro del cuerpo en grados. Los brazos los pone la persona (lo de Richie); el giro lo pone tiesme (lo de ella).
  // v0.5.1: la V subió a ~62° de la horizontal con los brazos derechos (antes 37° el brazo y 53° el antebrazo, con el
  // codo doblado): con "brazos arriba, abiertos en V" la gente los sube a ~70° y no llegaba nunca (17/11).
  figura: {
    nombre: 'el águila',
    instruccion: 'brazos arriba, abiertos en V',
    pose: {
      brazoIzq: { brazo: [0.47, 0.88, 0.05], ante: [0.47, 0.88, 0.05] },
      brazoDer: { brazo: [0.47, 0.88, 0.05], ante: [0.47, 0.88, 0.05] },
    },
    giro: 55,
  },
  // Dónde se ve la sombra en la pared (en "torsos" de ella): x a la derecha, y arriba, atrás = qué tan lejos detrás,
  // escala = tamaño. Va ARRIBA de su cabeza (detrás de ella quedaba tapada). Mientras se ve la sombra, el plano se abre
  // (plano: 0,5 = la mitad de cerca) y baja (bajar: 0,24 de la pantalla) para que entren tiesme y la pared.
  // borde = grosor del contorno dorado de la figura.
  sombra: { x: 0, y: 1.55, atras: 1.2, escala: 0.7, plano: 0.5, bajar: 0.24, borde: 4,
    colorSombra: '#14060a', opSombra: 0.82, colorFigura: '#ffd27a', opFigura: 0.42 },

  // ---------------------------------------------------------------- 5 DISCUSIÓN + 6 REGISTRAN QUE ESTÁS (acá se raja el vidrio)
  registro: {
    manoSola: 1.2,         // cuánto se mueve la mano de ella por tu culpa (su último hilo)
    esperaMovimiento: 6,   // si no te movés en estos segundos, igual se dan cuenta
  },
  pollito: { activo: true, dur: 12, aVidrio: 5 }, // se acerca al vidrio SOLO cuando no la mirás (por vergüenza)

  // ---------------------------------------------------------------- 7 LA ELECCIÓN + 8 y 9 LOS DOS FINALES (v0.7)
  // 7: tiesme pide que le pegues al vidrio; Richie, que le pases la mano. El primer gesto decide.
  eleccion: {
    plazo: 14,             // segundos para elegir; si nadie elige, decide Richie (final de Richie)
    pasar: 0.45,           // cuánto hay que pasarle la mano a la grieta para elegir a Richie (anchos de pantalla, yendo y viniendo)
    tiempo: 1.0,           // y cuántos segundos, como mínimo, con la mano sobre la grieta
    radio: 0.26,           // qué tan cerca de la grieta tiene que estar la mano (anchos de pantalla)
    cartel: 'golpeá el vidrio · o pasale la mano',
  },
  // 8 FINAL LIBRE: golpes con la palma hacia la pantalla (cabina/senales.js, UMBRAL.golpe).
  libre: {
    golpes: 3,             // con cuántos golpes estalla (el golpe con el que eligió cuenta como el primero)
    plazo: 6,              // si en estos segundos no pega, ella pega sola (así siempre termina)
    cartel: 'golpeá el vidrio con la palma',
  },
  // 9 FINAL DE RICHIE: pasarle la mano a cada grieta (son 3) y después "las cajas".
  control: {
    pasar: 0.9,            // segundos con la mano sobre una grieta para cerrarla (se llena el círculo)
    radio: 0.2,            // qué tan cerca (anchos de pantalla)
    plazo: 9,              // si en estos segundos no la cierra, la cierra Richie
    espejo: 2.5,           // un momento en que ella te vuelve a copiar, como al principio
    // las cajas (el juego para demostrar el control): una caja fija a cada lado y un cuadrado que sube y baja pasando
    // por ella; hay que meter la mano en la caja justo cuando el cuadrado está adentro, y sostenerla
    cajas: [[0.2, 0.42], [0.8, 0.42]],     // dónde están las dos cajas (x, y de 0 a 1): izquierda y derecha
    recorrido: [0.24, 0.76],  // de dónde a dónde sube y baja cada cuadrado (y de 0 a 1)
    periodo: [3.0, 2.2],      // segundos que tarda una ida y vuelta: el primero y, con uno ya trabado, el segundo (más rápido)
    dentro: 0.07,             // qué tan centrado en la caja tiene que estar el cuadrado para que valga (más = más fácil)
    sostener: 2.5,            // segundos que el cuadrado tiene que estar DENTRO de la caja, ya atrapado, para trabarse
    // la "vida" del cuadrado atrapado: sigue a la mano pero tira solo para arriba o para abajo, y hay que ir corrigiendo
    vida: {
      tiron: 0.12,            // cuánto tira (en pantallas: 0,12 = se corre más de una caja si no lo corregís); más = más difícil
      cambio: [0.9, 1.8],     // cada cuántos segundos cambia de sentido el tirón (entre uno y otro, al azar)
      dentro: 0.06,           // qué tan centrado tiene que estar para contar como "dentro de la caja" mientras lo sostenés
      escapa: 0.7,            // si queda fuera de la caja más de estos segundos, se escapa y hay que atraparlo de nuevo
      alcance: 0.3,           // qué tan cerca de la caja, de costado, tiene que seguir la mano (anchos de pantalla)
    },
    radioCaja: 0.13,          // qué tan cerca de la caja cuenta como "la mano en la caja" (anchos de pantalla)
    plazoPieza: 14,           // si en estos segundos no traba ninguno, lo traba Richie
    cartel: 'pasale la mano a cada grieta',
    cartelCajas: 'atrapalo cuando pase por la caja · y no lo dejes escapar',
  },
  // CORTAR (el último juego del final de Richie): saltan cuadrados desde abajo y se cortan pasándoles la mano rápido.
  cortar: {
    oleadas: [1, 1, 1, 2, 1, 2, 2, 3, 2],  // cuántos cuadrados saltan en cada tanda (en orden)
    intervalo: [1.7, 1.05],  // segundos entre tanda y tanda: al principio y al final (se va apurando)
    impulso: [1.45, 1.7],    // con cuánta fuerza saltan (más = llegan más alto)
    gravedad: 1.6,           // qué tan rápido vuelven a caer
    tam: 0.15,               // tamaño del cuadrado (anchos de pantalla)
    filo: 0.9,               // velocidad mínima de la mano para cortar (anchos de pantalla por segundo); más bajo = más fácil
    margen: 0.035,           // cuánto perdona la puntería (anchos de pantalla)
    tope: 40,                // segundos como máximo para las tandas
    grande: { tam: 0.36, cortes: 4, plazo: 5 }, // el del final: tamaño, cuántos cortes aguanta y a los cuántos segundos se empieza a romper solo
    cierre: 0.55,            // al terminar, la sábana cae de golpe: segundos que tarda
    cartel: 'cortá los cuadrados con las manos',
  },

  // ---------------------------------------------------------------- AUSENCIAS
  casos: {
    volveA: 1.0,           // antes de la revelación: a los cuántos segundos fuera Richie comenta
    seFueA: 3.0,           // después de la revelación: comentan entre los dos
    reinicioA: 12,         // si no vuelve en estos segundos, vuelve a la Espera
    salidaA: 2.5,          // al terminar, el telón queda cerrado hasta que la persona lleva estos segundos fuera de cuadro
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
    'R2-rajo': ['…Lo rajaste. Rajaste el espejo.', '¡El vidrio! ¿Vos sabés lo que sale un vidrio?'],
    'T2-hola': ['¿Hola?'],
    'T2-perdon': ['Perdón. No es siempre así.'],
    'R2-siempre': ['Es siempre así.'],

    // --- 7 la elección (v0.7, provisorias)
    'T6-grieta': ['Se rajó. …Si se rompe del todo, salgo.'],
    'R6-ni': ['Ni se te ocurra. Ahí afuera no hay nada para vos.', 'Ni se te ocurra. ¿Quién te va a decir qué hacer?'],
    'T6-pide': ['Vos. Pegale al vidrio. Con la palma, fuerte.'],
    'R6-pide': ['No, no. Pasale la mano por arriba, despacito, y se arregla. Y todo vuelve a ser como antes.'],
    'R6-apura': ['Dale, que no tengo todo el día.', 'Es fácil: le pasás la mano y listo.'],
    'R6-decido': ['¿No elegís? Entonces elijo yo. Como siempre.'],
    // --- 8 final libre
    'T7-dale': ['¡Eso! Otra vez. ¡Más fuerte!', '¡Sí! Dale, otra.'],
    'R7-para': ['¡Pará! ¡Pará un poco!', '¡Ese espejo es una antigüedad!', '¡Tiesme, decile algo!'],
    'T7-otra': ['¡Otra!', 'Ya casi.', 'Una más.'],
    'T7-gracias': ['Gracias.'],
    'R7-yyo': ['¿Cómo "gracias"? ¿Y yo? ¡Yo voy arriba!'],
    'T7-venis': ['Vos venís conmigo. Pero ahora elijo yo.'],
    'R7-lejos': ['¡Despacio, que me mareo!', '¡Por lo menos decime adónde vamos!'],
    // --- 9 final de Richie
    'R8-bien': ['Sabia decisión. Pasale la mano a cada grieta. Despacito.'],
    'T8-no': ['No. Pará. ¿Qué hacés?'],
    'R8-yo': ['Dejá, lo hago yo.', 'Bueno, esta la cierro yo.'],
    'T8-brazos': ['Los brazos… no los siento.'],
    'T8-richie': ['Richie. Por favor.'],
    'R8-listo': ['Listo. Como nuevo. Acá nadie se mueve sola.'],
    'R9-prueba': ['A ver si quedó bien. Cada cosa en su caja.'],
    'R9-cajas': ['Cuando el cuadrado pase por la caja, atrapalo con la mano. Y ojo, que se quiere ir.'],
    'R9-escapa': ['¡Se te fue!', '¡Agarralo, que se va!', 'Se escapó. Otra vez.'],
    'R9-tarde': ['¡Tarde!', '¡Ahí no! Esperalo.', 'No, no. Cuando esté adentro.'],
    'R9-una': ['Eso. Uno.', 'Bien. Falta el otro.'],
    'R9-fin': ['Listo. Todo en su lugar.'],
    // cortar (el cierre, bien arriba)
    'R10-ahora': ['¡Y ahora, a probarla! ¡Cortá todo lo que vuele!', '¡A ver cómo la manejás! ¡Que no quede ninguno!'],
    'R10-grande': ['¡El grande! ¡Dale, dale, dale!', '¡Ahora el grande! ¡Con todo!'],
    'R10-bien': ['¡Impecable! ¡La manejás mejor que yo!', '¡Eso! ¡Así se maneja!'],
    'R10-casi': ['¡Bueno, casi! ¡Pero la manejaste vos!', '¡Se te escaparon un par! ¡Otra vez será!'],

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
