# Cabina — v0.3 (cartón): "el número de tiesme · los hilos"

## Estado v0.3 (28/10) — LISTA PARA PROBAR con la cámara (probada de punta a punta con el demo y una mano simulada)
Agustín pidió (28/10) sacar los juegos de botones, críptico y selfie ("no siento que estén buenos", "es demasiado
largo") y sumar **un solo juego nuevo** que siga la historia y deje con ganas de más. Eligió **los hilos**. La v0.2.1
quedó archivada en `_versiones/cabina_v0.2.1/` (ahí están las escenas que se sacaron). **Lo que sigue abajo de esta
sección describe la v0.2 / v0.2.1.**
- **Recorrido**: Espera → 1 Presentación → 2 Richie dice → 3 Ensayo (estatuas) → 4 Revelación → 5 Discusión →
  6 Registran que estás (pollito + vidrio) → **7 Los hilos** → **8 Soltame** → Fin. Teclas `1`–`8` saltan a cada escena.
- **La idea**: en el acto 1 la manejabas sin que ella pudiera elegir; ahora es libre y **te da los hilos porque
  quiere**. Arriba aparece la **cruceta** (la cruz del titiritero), que sigue tu mano (el puntero de `senales.js`), y
  ella cuelga de los hilos con un poco de resorte (se balancea).
  - **7 · Agarrá**: "El número tiene un salto que nunca me salió" / "Porque sola no llego" → vuelve la luz de la
    función y baja la cruceta: "Agarrá. Si me soltás, me caigo." Con la mano a la altura del hombro la despegás del
    piso; con la mano arriba de la cabeza, bien arriba. Si bajás la mano, apoya los pies y los hilos se aflojan.
    Richie: "Más arriba." / "No, mucho." / "Ahí. Perfecto. Gracias a mí."
  - **7 · Utilería**: pasan por el escenario baúl, banquito, el atril de Richie y la escalera; hay que levantarla a
    tiempo. Si choca: "¡Auch!", la cosa se cae, sigue (sin castigo). Richie se equivoca ("¡Ahora! No, todavía no") y
    **acierta una sola vez**: grita "¡AHORA!" justo antes de la escalera; si pasó, "¿Viste? Una cada tanto la emboco."
  - **8 · La torre**: "Más alto." Suben por la torre del teatro (cuerdas, varas que pasan, contrapesos que caen cerca
    de ella: esquivalos moviendo la mano de costado). Richie: "Vivo arriba de una cabeza, pero tengo vértigo."
  - **8 · Soltame**: arriba, la parrilla con luz. "Acá arriba se atan todos los hilos." / "Ahora soltame." → **bajás
    la mano** (el puntero se pierde con la mano baja: eso es soltar). Si no la soltás: a los 6 s "Creo que tenés que
    soltarla", a los 10 s "Bueno. Me suelto yo." Cae (los hilos quedan colgando de la cruceta) y **aterriza parada en
    la figura del águila**: sale la sombra, foco, aplausos, "¡El salto de tiesme!" / "Y tuyo.", reverencia.
  - **Fin**: se cierra el telón y, en negro, **baja una cruceta sola con los hilos sueltos**, balanceándose (¿otra
    vez?). En el cartel queda **@al.paciello**.
- **Archivos**: `cabina/titere.js` (nuevo: el juego), `cabina/hilos.js` (la cruceta, hilos flojos y sueltos),
  `cabina/escenario.js` (dibuja la utilería y la torre detrás de ella), `cabina/director.js` (escenas 7, 8 y fin;
  salen 7–10 viejas), `guion.js` (sección `hilos` y frases `R4`/`T4`). Nada de `2. tracking webcam/` ni del motor.
- **Cómo se ubica en la pantalla**: todo se calcula en la pantalla y se pasa a la raíz midiendo en cada cuadro dónde
  se ve su cadera, la punta de la cabeza y la punta del pie. Medido el 28/10: con el plano normal mide 2,3 pantallas
  de la cabeza al pie; con `hilos.plano` 0,19 entra entera (~0,45 de la pantalla) y se la puede subir ~0,25 pantallas.
- **Verificado (demo + mano simulada, 28/10)**: sin errores en la consola. Mano atenta: la levantó en 1,2 s, pasó las
  4 cosas, el "¡ahora!" sirvió, la soltó; mano floja (a la altura del hombro): no la levanta (sigue igual a los 14 s),
  choca las 4, no la suelta → se suelta sola. Salir de cuadro en la utilería: todo queda quieto, comentan, al volver
  sigue (sin choques mientras no estaba). Fotos en `2. tracking webcam/_pruebas/cabina/pruebas_claude_20261028/`
  (04 y 06–07 son de antes de dos arreglos: el piso bajó a 0,9 y el ícono de la utilería se veía transparente).
- **Duración (demo)**: escena 7 ~36 s, escena 8 ~36 s. Con las escenas 1–6 (~3:00 medidas el 20/10) la partida
  queda en **~4:10** (antes 6:15–6:30). Calculé 3:50: el diálogo de los hilos dura más de lo que estimé.
- **Tracking (28/10)**: se pasó a `motor_v12/app.js` el **cambio 7 del tracking v13** (brazos cruzados: un brazo
  quedaba estirado atravesando el cuerpo; error de la v12; tracking B2-04 84% → 0%). Son dos líneas marcadas "cambio 7
  del tracking v13"; `?sin=7` lo apaga. Probado con el clip B2-04 en la cabina: a los 8–9 s, donde antes el brazo
  izquierdo quedaba en 5°, ahora los codos se doblan 82–116°. El resto del motor sigue siendo el v12.
- **Falta / para mirar en la prueba**:
  1. **Probala con la cámara**: si la mano a la altura del hombro se siente bien como "agarrar", y si se cansa el brazo
     (el juego pide ~45 s de mano arriba). Los números para tocar están en `guion.js` → `hilos`.
  2. **Soltar = bajar la mano**: si la persona baja la mano sin querer arriba de todo, la suelta antes de tiempo; y en
     la torre perder la mano no la hace caer (la cruceta se queda donde estaba).
  3. **Al aterrizar el plano pasa de 0,19 (entera) a 0,5 (la sombra)**: se lee como que la cámara se acerca. Ver si
     gusta o si mejor aterriza en el plano abierto.
  4. Todo cartón: la cruceta, la utilería (cajas con emoji), la torre y las poses (colgada, cae) son por programa;
     las piernas cuelgan rígidas. Las animaciones y el arte serían tuyos. Textos provisorios (los escribí yo).
  5. Lo pendiente de la v0.2.1 que sigue igual: sonreír/abrir la boca, manos arriba con codos, lag, video comparado
     en vez de la tecla M (el giro sobre su eje y repetir la frase cortada ya estaban hechos).

## Estado v0.2 (20/10) — LISTA PARA PROBAR con la cámara (corre de punta a punta con el demo y con clips)
Armada la columna vertebral de `EXPLORACION_CONCEPTO.md` (sección 12), que Agustín pidió hacer completa para verla y
después corregir. La v0.1 quedó archivada en `_versiones/cabina_v0.1/` (copia, no abre desde ahí). **Lo que sigue
abajo de esta sección describe la v0.1** (teclas y escenas viejas); lo nuevo es esto:
- **Se abre igual** (`ABRIR_3ACTOS_TEST.bat` / `.command`). Teclas: `0` reiniciar (cierra el telón) · `1`–`9` saltar
  a una escena (la 10 con `→` desde la 9) · `→` siguiente · `Espacio` pausa · `D` panel · **`M` marcar "acá algo
  anduvo mal"** (queda con el segundo en el registro). F, H, V, C, G como antes.
- **Escenas**: Espera (telón cerrado, cartel) → 1 Presentación (asomada por la rendija, telón, "hoy vas a ser tiesme")
  → 2 Calentamiento (Richie dice con **círculo sobre el cuerpo**, gesto sostenido 1 s y que empiece después del
  cartel; a tiesme **se le escapa la cara** cuando Richie se agranda) → 3 Ensayo (estatuas + **sombra en la pared con
  la figura** "el águila" y **medidor de encaje**; con los brazos en V de frente da ~60 %) → 4 Revelación (tercera
  estatua: **ella gira sola** 55°, foco, pixelado, deformación, cámara que se acerca; "¿Quién te dijo que te
  muevas?" / "Yo.") → 5 Discusión (luz de trabajo) → 6 Registran que estás (tu movimiento le mueve la mano derecha →
  "¿Y eso?" / "nos está escuchando"; pollito por vergüenza; golpe al vidrio girando la cabeza) → 7 Decidís (**botones
  con la mano**: a lo Richie / a lo tiesme; ninguna sola alcanza; juntos sale) → 8 Críptico = nombre del número
  (piezas con la mano, ayudas de Richie, tiesme lo frena; el título va al cartel) → 9 Función a dúo + reverencia →
  10 Selfie (sí / paso, pose quieta, @al.paciello) → Fin (telón).
- **Ausencias**: la escena se pausa y conserva el avance; antes de la revelación comenta Richie, después los dos; al
  volver se interrumpe y retoma. En la selfie darse vuelta no cuenta.
- **Registro de la partida**: desde la escena 1 se guarda en `2. tracking webcam/_pruebas/cabina/partida_<fecha>.json`
  (escenas, frases, marcas M, datos, una muestra cada 0,2 s) y, con la cámara real, el video `.webm` de la cámara.
- **Archivos nuevos o cambiados**: `guion.js` (todo nuevo), `cabina/director.js` (escenas nuevas), `cabina/sombra.js`
  (nuevo), `cabina/escenario.js` (teatrito), `cabina/pantalla.js` + `cabina.css` (telón, cartel, foco, medidor,
  anillo, botones, puntero, críptico, selfie, pixelado), `cabina/cuerpo.js` (pose instantánea, dirección de brazos,
  posición en pantalla, deformar), `cabina/senales.js` (puntero de mano), `cabina/audio.js` (sonidito más lento,
  aplausos/telón/foco), `motor_v12/cara.js` (`forzar`, marcado `>>> CABINA`).
- **Verificado (demo, 20/10)**: carga sin errores; las 11 escenas arrancan con las teclas sin errores; en la
  revelación el encaje llega a 99,7 % (el medidor y la pose de la figura coinciden).
- **Arreglos del 20/10 (segundo chat), medidos con fotos a 432×768, el demo y los clips B2**:
  - **Sombra**: salía hueca y a la figura girada le faltaban los brazos. Causa: la "cámara de la luz" estaba a 20
    unidades de ella con 100 de profundidad, y el modelo mide ~1600: cortaba el cuerpo por la mitad. Ahora abarca todo
    el cuerpo (`cabina/sombra.js`), el cuadro es más ancho (entran los brazos en V) y la figura se hornea siempre con
    ella en su lugar (si la escena arrancaba mientras subía desde abajo, salía corrida).
  - **Composición**: la sombra va **arriba de su cabeza**, entera; detrás de ella quedaba tapada. Mientras se ve la
    sombra el plano se abre a la mitad y baja (`guion.sombra`: `plano 0,5`, `bajar 0,24`, `y 1,55`, `escala 0,7`):
    tiesme entra entera con los brazos en V y arriba se ven la sombra (negra) y la figura (contorno dorado + relleno
    suave, delante de la sombra; al "salir" se enciende entera). Es zoom y encuadre de la lente: no toca el tracking.
    Para probar otros valores: cambiar `__cabina.guion.sombra` en la consola y llamar `__cabina.sombra.ubicar()`.
  - **Arriba se pisaban** el cartel del teatro, la tarjeta de consigna y la barra de encaje: ahora, mientras está la
    tarjeta, el cartel se esconde, y la barra va debajo de la tarjeta (`pantalla.js`, `cabina.css`).
  - **Cámara que se acerca**: vuelve sola. En la revelación se acerca al girar ella (s 5,5–6,3 de la escena), queda
    cerca durante la estatua y el "¡salió!" y a los 11,8 s está otra vez en el plano normal. La foto "muy cerca" era
    el plano normal del tracking (pecho para arriba) al lado del plano abierto del ensayo.
  - **Ausencias**: al volver, la escena seguía enseguida y se pisaba con el comentario de bienvenida ("Bien ahí que
    volviste…" → la escena → "No estábamos hablando bien."). Ahora la escena espera a que terminen.
  - **Botones con la mano**: el puntero podía elegir un botón mientras la persona entraba (en el clip, al volver, la
    mano pasó por "PASO" y lo eligió sola, sin verse el puntero). Ahora elige solo con la persona en su lugar hace 1 s.
  - **Registro de partida**: los segundos contaban desde que se abrió la página; ahora desde el inicio de la partida,
    o sea **el mismo segundo del video `.webm`** (también el aviso de la tecla M).
  - **Críptico**: si lo resolvés en el medio de una ayuda de Richie, la ayuda se corta (antes hablaban encima del
    festejo).
- **Corridas (20/10)**: con el demo, 3 partidas enteras sin ningún error (~6:15–6:30); con el clip B2 08 (manos
  arriba) 1 entera sin errores (5:16, con los botones y el críptico elegidos con el mouse); con el clip 01 (entrar y
  salir) las ausencias antes y después de la revelación, la vuelta y el reinicio a los 12 s. Tiempos por escena
  (demo): presentación 19,5 s · calentamiento 57 s · ensayo 34 s · revelación 15,5 s · discusión 21,5 s ·
  registran 30 s · decidís 65–87 s · críptico ~19–64 s · función 19,5 s · selfie 30 s.
  **Lectura**: Richie va a 12,2 letras por segundo de mediana (la v0.1, a 15; subtítulos para chicos ~13), tiesme a
  9; de 75 frases de Richie, 19 pasan las 13 y 2 las 15.
- **Partidas reales de Agustín (20/10, 01:27–01:45, con la cámara)**: quedaron en `_pruebas/cabina/` con su video.
  En la de 01:27 eligió con la mano en 13 s, resolvió el críptico en 18 s sin ayudas, sacó la selfie (~5:55); en la
  de 01:38 probó ausencias (salió y volvió en las escenas 2, 3 y 5: comentaron y retomaron). Ojo: esas pruebas
  cargaron la cabina mientras yo la estaba cambiando (la de 01:27 tenía la sombra a medio arreglar). Mis partidas de
  prueba (demo y clips, sin video) están aparte, en `_pruebas/cabina/pruebas_claude_20261020/`.
- **Falta / problemas conocidos**:
  1. **Probala vos y alguien de afuera** con la cámara (3 preguntas al salir; tecla M para marcar errores).
  2. **Elegir con la mano sin querer**: con la mano a la altura del pecho 1,3 s se elige lo que esté debajo. Si en la
     prueba pasa, se puede pedir la mano levantada o alargar el tiempo (`guion.decision.dwell`, `criptico.dwell`,
     `selfie.dwell`).
  3. Decidís dura 65–87 s (la persona no elige, intento a lo Richie, a lo tiesme, juntos): es la escena más larga.
  4. En el críptico la tarjeta de la pista tapa la cabeza de la figura (no molesta para jugar). En las partidas de
     Agustín, "saludá" e "inclinar la cabeza" salieron ✘ más de una vez: mirar el video de esas consignas.
  5. Si la persona se va en el medio de una frase, esa frase no se repite al volver (sigue con la siguiente).
  6. El pixelado es de toda la imagen (el de solo su cuerpo, para después). Sin voces borrador todavía.
  7. Prueba de ida y vuelta del FBX: espera un archivo de Agustín.

## Prueba 2 con la cámara (20/10): devolución de Agustín sobre la v0.2
Probó con la cámara (partidas de 01:27 a 01:45 en `_pruebas/cabina/`). Ojo: mientras probaba, el chat que arreglaba la
v0.2 corría simulaciones pesadas y después una pestaña con el demo en tiempo real (con sonido): puede haber sumado lag,
y la música con diálogos que escuchó en la Espera era esa pestaña (ya cerrada). **Al probar en el panel de navegador
de Claude, cerrar la pestaña al terminar.**
| # | Qué dijo | Qué encontré (causa probable) | Propuesta (esperando OK) |
|---|---|---|---|
| 1 | La tecla M no sirve: la apretó creyendo que empezaba a grabar. Pide dar devolución con lo grabado, como en el tracking. | La partida ya se graba sola (video de la cámara + registro); falta lo que se ve en la tele. | Grabar también la pantalla de la cabina y armar al final un **video comparado** cámara \| tiesme con el segundo, la escena y la frase escritas; él anota por segundo. Sacar la M. |
| 2 | Lag en toda la experiencia. | Pesan: la sombra se dibuja aparte en cada cuadro (con suavizado ×4 y más ancha desde el 20/10), el fondo se redibuja y se sube entero en cada cuadro, el pixelado cambia la resolución de la tele. Más lo de arriba (otra cabina corriendo al mismo tiempo). | Medir primero (cuadros por segundo, panel H, sin nada más abierto); después: sombra a media resolución y día por medio, fondo solo cuando cambia, otro pixelado. |
| 3 | Salió y, al volver, no llegó a leer la viñeta. | Al irse se corta la frase y al volver sigue con la siguiente: la cortada no se repite. | Al volver, después del "volviste", repetir la frase cortada. |
| 4 | "Sonreí": abrió la boca y se lo dio por bueno. | "Sonreír" solo mira la sonrisa; con la boca muy abierta la sonrisa también sube. | Sonreír = sonrisa alta **y** boca poco abierta; abrir la boca = mandíbula abierta y sonrisa baja. Medir con su video. |
| 5 | "Manos arriba" no lo detecta. | Cuenta si las dos muñecas se ven por arriba de la nariz; si la muñeca se sale de la imagen de la cámara (parado cerca), no cuenta. | Contar también con los codos arriba de los hombros; mirar su video en ese segundo. |
| 6 | Sombra y silueta descentradas; en la escena 7 tampoco anda bien. | Ella gira alrededor de un punto que está ~15 cm detrás de su cuerpo: al girar 55° se corre de costado, y la figura (horneada girada) queda corrida respecto de la sombra de frente. | Girarla sobre su propio eje (y centrar la figura). Revisar después la escena 7. |
| 7 | El momento negro y tenso no se entiende: se va a un costado sin razón. | Lo mismo: después de la revelación vuelve del giro corriéndose de costado. | Igual que 6; el sentido de la escena, charlarlo. |
| 8 | El golpe al vidrio es muy duro. | — | Lo anima él. |
| 9 | Diálogos ingeniosos. La entrada al críptico, forzada; el críptico, muy básico. | La pista es una definición directa ("Creer en alguien (7)") con 6 piezas. | Más difícil: pista de crucigrama críptico, más piezas y señuelos que también forman palabras; la entrada la escribe él. |
| 10 | En el final se balancea o baila al azar; al final cierra los ojos. | La función es un vaivén de ±55° (con el giro corrido de arriba) y la cara de la función y la selfie es `feliz_v2` (ojos cerrados). | Una coreografía corta con la figura (tus brazos, su giro, a tiempo con la música) y una cara feliz con ojos abiertos. |

## Plan v0.2.1 (aprobado por Agustín el 20/10: "todo lo de la tabla")
Antes de empezar: copiar la v0.2 a `_versiones/cabina_v0.2/` (como la v0.1) y poner `version: 'cabina v0.2.1 …'` en
`guion.js`. Medir cada cambio por separado (antes/después) y decir cuál ayudó. No tocar `2. tracking webcam/`.
1. **Giro sobre su eje** (puntos 6, 7 y parte del 10). `cuerpo.js` gira el `holder` (`holder.rotation.y = giro0 +
   giro`), pero su cadera está ~146 unidades detrás del origen del holder (medido: cadera x≈3, z≈−146): al girar 55°
   se corre ~120 de costado. Compensar la posición para que gire alrededor de su cadera/columna, también en
   `sombra.hornear` (que pone el giro a mano). Medir: imagen de la sombra contra la de la figura a 55° (centradas),
   fotos 432×768 de las escenas 3, 4, 5, 7 y 9; encaje en la revelación y en la escena 7.
2. **Repetir la frase cortada al volver** (punto 3). Hoy, al irse, la frase se corta (`vigilarCasos`: `audio.callar`,
   `sinVineta`) y al volver sigue la siguiente. Después del comentario de la vuelta, decir otra vez la frase cortada
   entera y esperar lo que dura. Medir con el clip B2 01 (entrar y salir).
3. **Sonreír / abrir la boca** (punto 4). `senales.js` → `DETECTA.sonreir` solo mira la sonrisa. Sonreír = sonrisa alta
   y boca poco abierta; abrir la boca = mandíbula abierta y sonrisa baja. Medir los valores con sus videos de partida
   (`_pruebas/cabina/*.webm`; el registro dice en qué segundo fue cada consigna).
4. **Manos arriba** (punto 5). Hoy cuenta si las dos muñecas se ven por arriba de la nariz; si se salen de la imagen
   (parado cerca de la cámara) no cuenta. Sumar codos arriba de los hombros. Medir con B2 08 y sus videos.
5. **Lag** (punto 2). Medir primero cuánto tarda cada parte del cuadro (sombra, fondo, pixelado) y pedirle a Agustín
   los cuadros por segundo del panel H antes/después. Candidatos: sombra a menor resolución, sin el suavizado ×4 y cada
   dos cuadros; fondo (`escenario.js`) redibujado solo cuando cambia; pixelado sin cambiar la resolución de la tele.
6. **Video comparado en vez de la tecla M** (punto 1). Grabar también la pantalla de la cabina (el canvas de three.js)
   junto con la cámara, y una herramienta en `3. experiencia/_herramientas/` que arme con ffmpeg el video cámara |
   tiesme con el segundo, la escena y la frase escritos (del `.json`; las viñetas y botones son HTML y no salen en el
   canvas). Sacar la tecla M. Referencia (solo leer): `?comparado` y `video.js` del tracking.
7. **Final** (punto 10). La función: una coreografía corta con la figura (tus brazos, el giro de ella, a tiempo con la
   música) en vez del vaivén de ±55°. La cara de la función y la selfie es `feliz_v2`, que tiene los ojos cerrados:
   usar una con los ojos abiertos (imágenes en `1. tiesme modelo/estados_cara/ojos/`, solo lectura).
Quedan para charlar (diseño): el sentido del momento negro (7), el críptico más difícil y su entrada (9), el golpe al
vidrio (8, lo anima él).

Armada el 19/10/2026. Es la **estructura funcional** de la experiencia (Espera → acto 1 → acto 2 → acto 3 → Reinicio)
con material provisorio: texto en viñetas, un sonidito por personaje, música y efectos hechos por programa, íconos
emoji y movimientos de tiesme hechos por programa. Sirve para probar con la cámara y decidir qué queda. La idea de
cada momento está en `BIBLIA_EXPERIENCIA.md`.

## Cómo se abre
- Doble clic en **`ABRIR_3ACTOS_TEST.bat`** (en esta carpeta). Abre el mismo servidor que el tracking y la página
  `3actos.html` en Chrome. Si `ABRIR_TEST.bat` ya estaba abierto, igual funciona (es el mismo servidor). Mejor cerrar
  la pestaña del tracking: las dos juntas usan la cámara y MediaPipe dos veces.
- **Tocá una tecla o hacé clic una vez** para que haya sonido (Chrome no deja sonar nada antes). Abajo lo avisa.
- `F` = pantalla completa (en la tele vertical ocupa todo; en el monitor quedan bandas negras a los costados).
- `ABRIR_TEST.bat` sigue siendo para calibrar el tracking. La cabina tiene **su propia copia del motor**
  (`motor_v12/`), así que lo que se cambie en el tracking no la toca (ver "Pasar una versión nueva del tracking").

### En la Mac
Los `.bat` son solo de Windows. Cada uno tiene un gemelo **`.command`** al lado, que hace lo mismo en la Mac:
`ABRIR_3ACTOS_TEST.command` (en esta carpeta) y `2. tracking webcam/ABRIR_TEST.command`. En la PC se sigue usando el
`.bat`; en la Mac, el `.command`.
- **Doble clic** en el `.command`: se abre la Terminal con el servidor y a los 2 s la página en Chrome (si no hay
  Chrome, en el navegador que esté). No cerrar la Terminal mientras se usa: cerrarla apaga el servidor.
- **La primera vez** la Mac puede bloquearlo ("desarrollador no identificado"): clic derecho → **Abrir** → Abrir. Queda
  habilitado para las siguientes.
- **Plan B** (si el doble clic no anda): abrir la Terminal (Cmd+Espacio, escribir "Terminal"), escribir `bash ` (con un
  espacio al final), **arrastrar el `.command` a la ventana** (pega la ruta sola) y Enter. Hace exactamente lo mismo.
- Si dice "No encuentro Node": instalar Node desde nodejs.org y volver a abrir.
- Antes del primer uso en la Mac: instalar Chrome y Node (y ffmpeg para las herramientas del tracking), darle permiso
  de cámara a Chrome (Ajustes del Sistema → Privacidad y seguridad → Cámara) y configurar la C920 en G HUB para Mac.
- Probados el 19/10 en la PC con un simulacro (sin Mac): arrancan bien desde cualquier lugar y abren la página
  correcta. **Falta probarlos en una Mac de verdad.**

## Teclas de quien atiende
| Tecla | Qué hace |
|---|---|
| `0` | reiniciar (vuelve a la pantalla de título) |
| `1` `2` `3` | saltar al acto 1 (entrada), 2 (estatuas) o 3 (te hablan) |
| `→` | saltar al paso siguiente |
| `Espacio` | pausa / sigue |
| `D` | panel de quien atiende: paso, segundos, lo que mide la cámara en vivo, los datos de la persona y las últimas frases |
| `F` | pantalla completa |
| `H` / `V` | panel del tracking / ventanita de la cámara (para revisar) |
| `C` / `G` | calibrar postura / gestos de cara (los del tracking) |

Las demás teclas del tracking (B batería, K grabar, O giro, etc.) no hacen nada en la cabina.

## Qué tendría que pasar (para probar)
**Espera**: título "tiesme" con burbujas de colores y musiquita de menú. tiesme no está.
**Acto 1** (~55 s)
- 1.1: al entrar (antes de llegar a tu lugar) tiesme **se asoma tímida desde la izquierda** y se esconde (~2 s).
- 1.2: al llegar a tu lugar **sube desde abajo** con un "fiuuu" y te empieza a copiar.
- 1.3: te copia. A los 1,5 s Richie: "¡Tiesme! ¿Estás despierta?". Si no te movés 3 s, Richie te pincha.
- 1.4: "Richie dice": 3 consignas al azar (cartel arriba con emoji), la **trampa** (sin "Richie dice"), chamuyo y
  **"tu mejor gesto"** (se graba 4 s sin avisar). ✔ / ✘ según lo que hiciste. Si salís de cuadro: "¡Eh, volvé!" y todo
  espera a que vuelvas.

**Acto 2** (~75 s)
- 2.1 Estatuas: pose 1 (brazos en cruz) y pose 2 (manos arriba): música → se corta → "¡ESTATUA!" + timer de 3 →
  "¡bien!" o "te moviste".
- 2.2 Pose 3 "mirá a lo lejos": al "¡estatua!" **la cabeza de tiesme se suelta y gira despacio hasta mirarte** (4 s).
  Plan B: si te quedás quieto se mueve sola; si te movés, la cabeza no te sigue.
- 2.3 El timer llega a 0 y se traba, titila y va para atrás; la pantalla falla (colores, cortes, "ERROR");
  Richie, con el texto roto: "Eh… ¿tiesme?"; aparecen los **hilos** que salen de sus articulaciones hacia arriba;
  zumbido.
- 2.4 La **degradación** (20 s, horario en `guion.js`): los brazos con retraso → corridos y a medias → se corta el hilo
  de la cabeza → **su brazo izquierdo (el de la derecha de la tele) hace lo contrario** → se corta el hilo del brazo
  derecho y **se mira la mano** → se corta la cara (sonrisa) → se cortan el otro brazo y el torso. Richie susurra.
- 2.4b **Pollito inglés** (12 s, se apaga en `guion.js`): ya no te copia nada; se acerca al vidrio **solo mientras no
  la mirás** (si mirás para otro lado o cerrás los ojos avanza; si la mirás, se congela).
- 2.5 Quiebre: fondo a negro, luz dura, música oscura; se acerca, te mira, sonríe, **saluda y golpea el vidrio**
  (toc toc y la imagen tiembla).

**Acto 3** (~60 s): Richie y tiesme te hablan (viñeta oscura; ella mueve la boca), dos burlas elegidas según lo que
hiciste + **tiesme repite tu gesto exagerado** mientras se ríen + Richie confiesa; "copiá vos" (3 poses, puntaje
humillante); "chau", gesto de "andá", se apaga la luz y se va por la puerta. Si no te vas en 8 s: negro con un ojo
que te sigue y Richie se ofende. Al irte: **Reinicio** → título alegre otra vez.

**Si te vas en el medio**: a los 2,5 s "¿Y? ¿Se fue?"; si no volvés en 10 s, Reinicio.

## Cambiar textos y tiempos: `guion.js`
Todo lo que se dice y cuánto dura cada cosa está en `guion.js`, con comentarios. Se cambia el texto entre comillas o el
número, se guarda y se recarga la página (F5). Ahí también: de qué lado está la puerta, la lista de consignas, las
poses, el horario de la degradación, qué hace cada parte al cortarse su hilo, el pollito inglés (prendido/apagado) y el
puntaje humillante. **Todos los textos son provisorios** (los escribí con los ejemplos de la biblia).

## Voces y sonidos grabados
Van en la carpeta `audio/` con el **código de la frase + número de variante**: `R1-saludo` tiene 3 frases →
`audio/R1-saludo-1.wav`, `-2`, `-3` (sirve .wav, .mp3 u .ogg). Si el archivo está, suena la voz (y la viñeta dura lo
que dura la voz); si no, el sonidito. Efectos y música igual: `fx-toc`, `fx-glitch`, `musica-juego`, etc. (lista al
final de `guion.js`). El panel D dice cuántos archivos grabados encontró.

## Afinar lo que mide la cámara
Los umbrales (cuánto girar la cabeza, abrir la boca, sonreír, cejas, ojos cerrados, "quieto") están juntos al principio
de `cabina/senales.js` (`UMBRAL`). En el panel D se ven los valores en vivo al lado de su umbral
(ej. `sonrisa 0.62/0.5`). Medido con tu batería B2 (clips 01, 02 y 08):
| Qué | Valor |
|---|---|
| Quieto de frente | movimiento 0,06–0,3 (umbral "quieto" 0,5) |
| Aplaudir arriba | 0,6–1,2 · caminar 1,4–2,7 |
| Girar la cabeza | 36°–79° (umbral 25°); al pasar ~45° se pierde la malla de la cara, se sigue midiendo con el cuerpo |
| Inclinar la cabeza | 18°–22° (umbral 14°) |
| Manos arriba | detectado todo el tiempo que están arriba |
| Entrar / salir | se te ve "entrando" 2 s antes de llegar a tu lugar; al salir del encuadre te suelta en ~0,5 s |

Sin probar todavía (ningún clip lo tiene): sonreír, abrir la boca, cejas, ojos cerrados, saludar, brazos en cruz y "una
mano arriba". Ojo: mirar para arriba sube las cejas (cuenta como "cejas") y aplaudir arriba cuenta como "saludar".

## Cómo está armado
| Archivo | Qué es |
|---|---|
| `ABRIR_3ACTOS_TEST.bat` | abre la cabina |
| `3actos.html` | la página (las capas de la cabina + el panel del tracking escondido) |
| `guion.js` | textos, tiempos, consignas, poses (lo que se edita) |
| `motor_v12/` | **copia** del motor del tracking v12 (`app.js`, `cara.js`); lo distinto está marcado `>>> CABINA` |
| `cabina/director.js` | los actos paso por paso, los casos, las teclas, la cara y el panel D |
| `cabina/cuerpo.js` | dial por parte (te copia ↔ es de ella), degradación, poses propias con "vida", grabador del gesto, posición |
| `cabina/senales.js` | lo que mide la cámara (y los umbrales) |
| `cabina/pantalla.js` + `cabina.css` | título, indicadores, ESTATUA/timer, viñeta, puntaje, negro, glitch |
| `cabina/escenario.js` | fondo (burbujas → negro, glitch) y luces (pareja → dura) |
| `cabina/hilos.js` | hilos de titiritero |
| `cabina/audio.js` | sonidito, música y efectos generados; usa los archivos de `audio/` si están |

## Pasar una versión nueva del tracking
Cuando el tracking tenga una versión que quieras en la cabina: copiar el `app.js` nuevo de `2. tracking webcam` a
`motor_v12/` (o a `motor_v13/` y cambiar la ruta en `3actos.html`) y volver a poner todo lo marcado
`>>> CABINA` (la ruta de `lib`, la variable `CAB`, una línea en `set()`, el loop partido en `unCuadro`, la llamada al
director y la cara en el loop, y el bloque del final). Para verlos: buscar `>>> CABINA` en `motor_v12/app.js`. Si `index.html` del tracking suma controles nuevos, copiarlos al panel de `3actos.html`.

## Probar sin cámara (para Claude o para revisar)
- `3actos.html?demo=libre`: persona sintética. `3actos.html?video=../2.%20tracking%20webcam/_pruebas/...mp4`: un clip.
- Consola: `__cabina.ir('2.4')` salta a un paso; `__tiesme.simular(5)` corre 5 s seguidos (con la pestaña en segundo
  plano Chrome la frena a 2 cuadros por segundo).
- v0.2 (20/10): con la ventana oculta el navegador no dibuja solo, congela la página entre una orden y otra y no
  avanza las animaciones de CSS (el telón sale cerrado en las fotos): correr en tramos con `__tiesme.simular`. Con un
  clip, mover el video a mano junto con el reloj (`video.currentTime += 0,1` y `simular(0.1, 10)` por cuadro) para que
  la entrada y la partida vayan parejas. Para revisar la sombra: `__cabina.sombra._prueba` (las imágenes de la sombra y
  de la figura).
- Más trucos (20/10): los `.webm` de las partidas se traban a los ~108 s en el panel oculto: pasarlos antes a `.mp4`
  con ffmpeg. Al recargar, la orden siguiente puede correr todavía en la página vieja: esperar a la nueva. El tamaño
  emulado (432×768) a veces se pierde: revisar `innerWidth` antes de cada foto. Para leer lo último que pasó:
  `__cabina.pantalla.panel()` y el texto "Últimas cosas" del panel D.
- **Si el panel de navegador queda a la vista, la cabina corre en tiempo real y suena** (a Agustín le sonó desde Claude
  el 20/10). Cerrar la pestaña con `tabs_close` apenas termina cada prueba y apagar el servidor de prueba.

## Lo que es cartón (provisorio) y lo que falta
- Voces, música, fondo, íconos y movimientos: todo provisorio. Las animaciones de Blender reemplazarían los
  movimientos por programa (asomarse, saludar, golpear el vidrio, reírse, poses de "copiá vos", "andá", irse).
- No hay: boca de la visera ni ojo de Richie (esperan el material), sonido espacial, ojo de Richie siguiéndote en el
  2.4 (en el final hay un ojo dibujado).
- Duración medida con el demo: acto 1 ~55 s, acto 2 ~75 s, acto 3 ~60 s + salida ≈ **3:10** (la biblia pide 2:40–3:00):
  hay que recortar al probar.

## Prueba 1 con la cámara (19/10): veredicto de Agustín
La probó él y se la hizo probar a su mamá, que no conocía el juego (buen parámetro de cómo se comunica).
| Área | Qué dijo |
|---|---|
| Estructura | Muy bien resuelta. |
| Duración | Ni larga ni corta: lo que pasa todavía no está pulido para que funcione el impacto (recortar no es lo urgente). |
| Sonido | Los sonidos, muy bien de base. La música de tensión, ok por ahora. |
| Acto 1 | Codos y algunos movimientos, peor que en el tracking. A veces da por buenos gestos que hizo mal: afinar. |
| Acto 1 (mamá) | No entendió bien la consigna. Pedido: más indicadores y diálogos más lentos (por ahora) para que se lean. |
| Acto 2 | El momento de tensión después de las estatuas, muy bien. La transición "hacker": la estructura está bien, la estética no ("no se siente bien aún"). Los movimientos de tiesme por liberarse y liberada (después de las estatuas), toscos. El saludo del quiebre sale fuera de cuadro. |
| Acto 2 (mamá) | No entendió cuándo se revela; le pareció raro. Seguir puliendo. |
| Pantalla (UI) | Falta estética. |
| Acto 3 | Sin comentarios todavía. |

Lo que encontré en el código para la ronda de preguntas (sin cambiar nada todavía):
- **Codos**: en el acto 1 la cabina usa exactamente lo que calcula el tracking v12 (la copia es igual al `app.js` del
  tracking, con las mismas opciones, y el enganche no cambia nada mientras te copia). La diferencia tiene que venir de
  otro lado: cuadros por segundo (la cabina dibuja más cosas; con la pestaña del tracking abierta, la cámara y
  MediaPipe corren dos veces), la luz o el encuadre, o contra qué se compara. Hay que medirlo: fps del panel H en las
  dos páginas y el mismo clip pasado por las dos.
- **Gestos mal dados por buenos**: alcanza con pasar el umbral 0,25 s en cualquier momento de la frase + 6 s de plazo;
  no mira que hagas "solo eso" ni que lo empieces después del cartel (si ya lo estabas haciendo, cuenta). Los umbrales
  de cara nunca se probaron con gente. Confusiones conocidas: mirar arriba = cejas, aplaudir arriba = saludar.
- **Lectura**: con el sonidito, Richie va a ~15 letras por segundo (mediana; 63 de 88 frases pasan las 13 y 11 pasan
  las 17); la explicación de las estatuas, a 20. Como referencia, los subtítulos para adultos van hasta ~17 letras
  por segundo y los de chicos ~13, y acá además la persona se está moviendo. El texto aparece de a poco, así que
  entero se ve menos de medio segundo. Con la voz grabada en los auriculares no haría falta leer.
- **Saludo fuera de cuadro**: en el 2.5 se acerca al vidrio y saluda con la mano por arriba de la cabeza.

Respuestas de Agustín a la ronda (19/10). Las ideas que salieron están desarrolladas en **`EXPLORACION_CONCEPTO.md`**
(en discusión, antes de la v0.2):
- **Codos**: "se volvían locos"; ABRIR_TEST **no** estaba abierto al mismo tiempo. Sin datos todavía de qué
  movimientos: hace falta grabar la partida.
- **Gestos mal dados por buenos**: no recuerda cuáles; se los dio haciéndolos **a medias**. Pide una forma de
  documentar los errores con el segundo, y un ícono sobre la mano con un círculo que se llena hasta confirmar el gesto.
- **Lectura**: su mamá no llegaba a leer; notó que tiesme no le respondía, pero se perdía. El final ("te estaba
  cargando") se siente forzado, sin clima: hay que profundizar el desenlace.
- **Revelación**: la cabeza que gira se nota pero falta pulir. Quiere más deformación del cuerpo, cambios de escala,
  pixelado que va y vuelve, marcar con luz o cámara la parte que toma. La "hacker" parece que alguien de afuera la
  hackeó. Estética: (a) consola que se cuelga y (d) referencias a buscar.
- **Animaciones**: armar juntos la lista de qué anima él y qué va por programa. Saludo antes de acercarse; después
  golpea el vidrio girando la cabeza (creepy), quizás lo anima él.
- **Pantalla**: va a diseñar él una propuesta primero; puede cambiar la disposición según cambien las consignas.
  tiesme siempre de frente: podría tener momentos preanimados que interactúen con el espacio. Fondo 3D modelado.
- **Acto 3**: su mamá no entendió que le hablaban; él, mirando de afuera, tampoco lo vio claro.
- **Más juego**: que dure más y tenga desarrollo; crípticos, puzzles tipo Resident Evil, la mano como puntero, otra
  dinámica de tracking además de las estatuas.
- **20/10**: Agustín definió personajes, relación y tono en `TIESME_RICHIE_PERSONAJES_Y_DIALOGOS_v1.md`. El plan de
  prototipo por etapas (A sin código → B v0.2 piezas → C v0.3 estructura nueva en cartón → D material final → E
  cabina real) está en `EXPLORACION_CONCEPTO.md`, sección 11. Esperando su OK.

## Notas técnicas para el próximo chat (cómo se probó la v0.1)
- Servidor de prueba aparte para no chocar con el de Agustín: `node "2. tracking webcam/servidor.js" --port 8091 --no-open`.
- En el navegador del panel, si el panel está escondido la página corre a ~2 cuadros/s y el tamaño puede dar 0
  (aspecto NaN). Para fotos: poner el tamaño de ventana (432×768) y volver a "desktop", y disparar `resize`.
- `await __tiesme.simular(seg)` corre cuadros seguidos y deja correr las esperas del director entre cuadro y cuadro.
- Clips cuadro por cuadro: `3actos.html?video=../2.%20tracking%20webcam/_pruebas/...mp4`, pausar el video y por cada
  cuadro `video.currentTime = t` → esperar `seeked` → `simular(1/30)`; leer `__cabina.S` (señales) y `__cabina.paso()`.
  12 s de clip tardan ~37 s.
- `node --check archivo.js` **no** detecta errores de módulo: copiar a `.mjs` y chequear eso (así se encontró una llave
  tapada por un comentario).
- Al saltar con teclas, cada paso tiene que dejar listo lo suyo (escena, dial de las partes, hilos, raíz). Los cortes
  de hilos "de limpieza" van sin comportamiento (`cortar(parte, false)`), si no pisan la coreografía del paso.
