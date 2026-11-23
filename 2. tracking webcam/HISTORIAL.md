# Historial de versiones — tracking de tiesme

Qué cambió en cada versión y por qué (texto original, movido acá desde el LEEME y el TRASPASO el 17/10).
**No hace falta leerlo para trabajar**: el estado actual está en TRASPASO_CHAT.md y los problemas en FICHA_PROBLEMAS.md.

## Resumen
| Versión | Qué cambió | Video que la motivó |
|---|---|---|
| v1 (14/10) | Primer test: MediaPipe + three.js + FBX con texturas | — |
| v2 | Filtro anti-temblor, acercarse a cámara, dedos con bisagra, estados de cara de julio | 19-08-05 |
| v3 | Mapeo por posiciones (proporciones de tiesme), choques con cara/torso | 19-32-21 |
| v3.1 | Tele vertical 9:16 con encuadre de referencia | (captura del usuario) |
| v4 | Inclinarse desde la cintura, codos estables, pérdidas sin tirones, escorzo | 20-32-45, 20-55-33 |
| v5 | Cámara fija, presencia por franja 9:16, anclado, bordes de imagen, velocidad máx. | 21-24-55 |
| v6 | Cara tapada no suelta, entrada suave, neutro auto, reposo a los costados, brazos cruzados, gorra | 21-55-55 |
| v7 | Recortes cara/manos, cabeza por cuerpo, cadera, hombros, contacto, espalda, menos retardo | 22-24-46 |
| v8 | Sin internet (lib local) y girar la imagen para la C920 vertical | (pedido para la muestra) |
| v9 | Cámara 1080p, grabar cámara + registro por cuadro, batería de 10 clips, análisis cuadro a cuadro y métricas (`_herramientas`) | 00-12-10 |
| v10 | Sin giros involuntarios de antebrazo y mano (codo doblado del todo, muñeca máx. 70°): involuntarios 33 → 4, saltos 108 → 2 en el clip de prueba | (medido con el registro) |
| v11 | Entrada y salida: sin salto de cabeza al calibrar (4,5° → 1,7°/cuadro), entra en ~1,2 s todo junto, suelta al salir del encuadre vertical en 0,6 s (antes 1,4) | ronda 1 de la batería 1 |
| **v12 (actual)** | **Brazos y manos: manos en mejillas y nuca (contacto con la superficie de la cabeza), brazos cruzados en el orden correcto 61 → 83%, brazo que no queda arriba al bajarlo (1,4 → 0,7 s), aplaudir (palmas 0,92 → 0,66 largos de mano), codo detectado con peso entero; análisis repetible** | ronda 1 de la batería 1 (acuerdo del 18/10) |

## Cambios v15 (22/11 — "los movimientos van demasiado lagueados, tarda en reaccionar")
Diagnóstico (detalle en TECNICO, "Retraso: de dónde sale y cómo se mide"): el retraso se suma en cuatro tramos (cámara,
detección, cada cuánto se detecta, filtros). En la grabación en vivo de Agustín del 10/11 (`v14_grabacion02`, 12
detecciones/s) los filtros solos atrasaban ~180 ms; la detección, cuerpo + cara en fila (39 + 29 ms en su panel). Y
**Chrome no estaba usando la placa NVIDIA** de la notebook (corría todo en la Intel integrada): eso lo cambia él en Windows.
v14 archivada en `_versiones/v14`.
- **Cambio 18** (`?sin=18`): cuerpo, manos y cara se detectan **a la vez** sobre el mismo cuadro; manos y cara ubican su
  recorte con el cuerpo del cuadro anterior (antes esperaban al cuerpo de ese cuadro). El cuerpo se usa apenas llega; si
  las manos o la cara tardan más, entran en el cuadro siguiente. El cuadro siguiente se pide apenas termina el cuerpo y
  apenas la cámara entrega uno nuevo, sin esperar al dibujo. No se tocó `detector_worker.js` (las versiones archivadas
  lo comparten). **Medido** en el panel de Claude con `v14_grabacion02.mp4` en la cabina: de tomar el cuadro a tener el
  resultado, mediana 48 → 19–26 ms (el peor 10 %: 80 → 28–47 ms); manos detectadas 90/90 % → 92–95 %; cara nueva ~30
  veces por segundo. En el análisis (mismo criterio imitado en `detect()`): manos B2-05 55/75 % → 54/75 %, B2-07 84/84 % →
  82/83 %; cara igual.
- **Cambio 19** (`?sin=19`): los filtros se enteran antes de que arrancó un movimiento. El filtro (One Euro) se abre
  según la velocidad, y esa velocidad se suavizaba con un corte de 1 Hz: tardaba 150–300 ms en "darse cuenta". Ahora 4 Hz
  en brazos, manos y dedos y 2 Hz en cabeza, pecho y cadera; segunda etapa ×2 → ×3; suavizado 0,7 → 0,6; reacción 0,5 →
  0,8 (los dos últimos se siguen moviendo en el panel). **Medido** con `filtros_sim.js` (retraso de los brazos mientras
  te movés): grabación en vivo a 12 detecciones/s 179 → 108 ms; clips de la batería 2 a 30/s 75 → 50 ms y a 15/s 104 → 75
  ms; temblor con la persona quieta 11,0 → 12,1 °/s en vivo, igual en los clips a 30/s (8,0 → 7,9) y 7,9 → 9,7 a 15/s.
  En el análisis real: retardo de los dedos B2-05 167 → 33 ms, B2-07 67 → 33 ms; giro de cabeza B2-02 67 → 33 ms, cabeceo
  67 → 33 ms; cabeza quieta sin temblor nuevo (B2-07: 0,04 → 0,05° por cuadro). **Costo**: en la pose más difícil (B2-05,
  manos en la nuca) los saltos de más de 20° por cuadro suben de 19 a 28–29 (con reacción 0,65 daba 28: no es eso, es el
  filtro más abierto dejando pasar detecciones malas); B2-07 0 → 2; B2-02 0 → 0.
  El cambio 17 (parecido, del 9/11) había quedado apagado: además de los filtros subía el tope de velocidad de la mano y
  acortaba la retención, y eso era lo que traía los saltos (12 → 28 en B2-07; ahora 0 → 2).
- **Medidor en el panel H**: al final de la línea, `retraso: cámara N + detección N ms` (cámara = desde que la cámara
  capturó el cuadro hasta que el programa lo toma; detección = desde ahí hasta que llega al muñeco).
- Herramientas nuevas: `filtros_sim.js` (retraso y temblor de los filtros con varios ajustes, sin navegador),
  `retraso.js` (poco confiable, ver TECNICO); en el análisis, `?cada=2` (imita 15 detecciones/s) y `?hasta=8`.
- Probado: análisis de B2-02/05/07/08 antes y después (`v12_bateria01/analisis_v15_base` y `analisis_v15`, solo los
  registros) y la cabina con `v14_grabacion02.mp4` (sigue a la persona, sin errores). **Falta la prueba de Agustín con
  la cámara.** Pasado a la cabina (v0.5.2).
- Lo que queda si sigue sintiendo retraso después de pasar Chrome a la NVIDIA: adelantar el movimiento entre una detección
  y la siguiente con la velocidad (predicción; puede pasarse de largo al frenar: hay que probarlo en vivo) y cámara a
  720p (`?res=720`: menos trabajo por cuadro, a cambio de menos detalle en los dedos).

## Cambios v14 (9/11 — "pierdo movimientos": más detecciones por segundo)
Diagnóstico: todo el tracking está pensado para 30 detecciones/s; en la notebook de Agustín iba a 8–10 y las manos se
veían el 39 %/18 % de los cuadros (clip 1/11). Un gesto rápido cae en 2–3 detecciones y las reglas (mano nueva al 2º
cuadro, manos alternadas) se lo comen.
- **Cambio 10 apagado** (manos un cuadro sí y uno no): bajaba a la mitad las actualizaciones de las manos. `?con=10`.
- **Modelo de cuerpo completo otra vez por defecto** (el liviano, del mismo día, perdía precisión). `?pose=lite`.
- **Cambio 15: tres hilos en paralelo** (`detector_worker.js` con roles `pose`/`manos`/`cara`): el cuerpo del cuadro
  N+1 se detecta mientras manos y cara del N se calculan sobre su copia del cuadro; si un hilo está ocupado, ese cuadro
  usa su último resultado. B2-08 en el panel de Claude: 14,6 → 30,4 detecciones/s (tope del video), cara fresca 59 → 179.
  `?workers=1` vuelve al hilo único.
- Herramienta `movimiento.js` (detecciones/s, % manos, cuánto movimiento llega y retraso). Pasado a la cabina.
- **"A lo TouchDesigner"** (Agustín: "el MediaPipe de TD no pierde movimientos; imitá la lógica"). TD le da a MediaPipe
  la imagen entera y fija y entrega los puntos crudos. **Cambio 16**: el recorte de mano/cara se queda quieto mientras
  siga adentro (antes se re-centraba en cada cuadro). **Cambio 17**: suavizado 0,7 → 0,4, reacción 0,5 → 0,8, tope de
  velocidad de la mano 2,5 → 6 largos de brazo/s, retención 0,8 → 0,5 s. **Medido** con B2-06 y B2-07 (30 det/s): manos
  detectadas igual (64/66 % → 64/63 %; 84/82 % → 83/86 %), retraso igual, saltos de mano 1 → 4 y 12 → 28. Conclusión: a
  30 detecciones/s el recorte no hacía perder manos; lo que se pierde son manos tapadas o fuera de cuadro. **16 queda
  (neutro), 17 apagado** (`?con=17`). Lo que sí explica lo de TD: la cantidad de detecciones por segundo (cambio 15) y la
  cámara (C525 vs C920, luz).

## Cambios v13 (28/10 — brazos cruzados: COD-3, MAN-2)
- **Cambio 7** (`?sin=7` lo apaga): el límite de velocidad de la mano se mide sobre el objetivo de antes de correr hacia
  adelante el antebrazo de adelante al cruzar. Antes guardaba el ya corrido y el corrimiento se acumulaba cuadro a cuadro
  (error de la v12, cambio 3): la mano se iba hasta estirar el brazo del todo y atravesaba el cuerpo. Un brazo estirado
  con los brazos cruzados: B2-04 84% → 0%, B1-04 57% → 0%. Solo en el cruce: aplicado también al aplauso separaba las
  palmas (B2-08 0,43 → 0,52); acotado, B2-08 queda 17 cuadros / 0,48 (v12: 18 / 0,43), porque al aplaudir los
  antebrazos también se tocan. Pasado a la cabina el mismo día.
- **Cambio 6** descartado y apagado (`?con=6`): muñeca debajo del otro codo si tu mano no se ve. No era la causa (tus
  dos manos se ven) y empeoró B1-04 (57% → 93%).
- **Cambio 8** (1/11, `?sin=8` lo apaga): con los brazos cruzados y una mano escondida (no se ve hace 0,25 s), la
  muñeca de tiesme va junto a su codo contrario (hacia adentro, apenas delante), la mano apunta a la axila con la
  palma contra el brazo y los dedos medio cerrados. Clip `v13_grabacion01` (Agustín, 1/11): palma al brazo contrario
  1,03 → 0,47; brazos más altos que los suyos (codos 0,32 vs 0,66), pendiente. Aplauso B2-08 sin cambios.
- **Cambio 9** descartado y apagado (`?con=9`): mano visible en el cruce atraída al brazo contrario; tiraba las manos
  hacia afuera y subía los brazos.
- **Cambios 10–12** (9/11, cuadros por segundo; Agustín: "tengo muy pocos FPS… se me tranca"): 10 manos un cuadro sí y
  uno no, alternando con la cara (entre medio vale la última detección) · 11 cuerpo sobre una copia de 640 de ancho ·
  12 el mp4 de la textura de la cara se pausa (seguía decodificándose sin usarse). Medido con el clip 1/11 en el panel
  de Claude: detección 43,5 → 34,7 ms por cuadro. Medición nueva en el panel H (ms por parte). Pasados a la cabina.
- **Modelo liviano por defecto** (9/11): `pose_landmarker_lite.task` bajado (lib/ORIGEN.txt); cuerpo 23 → 15 ms por
  cuadro. `?pose=full` vuelve al completo. Precisión en codos/manos sin medir todavía.
- **Cambio 13: detección en otro hilo** (9/11, `detector_worker.js`, `?sin=13` lo apaga): en vivo el loop no espera a
  MediaPipe; dibuja con el último resultado y pide el cuadro siguiente cuando el worker está libre. Misma lógica de
  recortes que `detect()`. Probado en el panel de Claude con el clip 1/11: GPU, 36/40 cuadros con cuerpo, ida y vuelta
  55 ms; en la cabina 148 detecciones en 9 s sin errores. El análisis cuadro a cuadro sigue en el hilo principal
  (probado con B2-08). Pasado a la cabina el mismo día.
- Herramienta nueva `cruzados.js` y campo `etapas` en el registro (alcance que pide la muñeca después de cada paso).
- `archivar_version.js` acepta el título de `index.html` sin espacio antes del `<span>` (la v12 fallaba al archivar).

## Cambios v12 (18-19/10 — brazos y manos: COD-1, MAN-1, MAN-2, MAN-4/5, MAN-6)
Regla nueva: una versión = un área completa, cada cambio medido por separado (`?sin=1,2,...` apaga cambios). Medido sobre
los clips 03–08 de B1 (copia en `_pruebas/grabaciones/B1_brazos`) con `brazos.js`, `metricas.js`, `cruce_b1.js`, `cara_b1.js`.
"base" = v12 con todo apagado (igual a la v11).
- **Arreglos de medición (antes que nada)**: (1) MediaPipe recibía el reloj real; en el análisis cuadro a cuadro eso
  cambiaba su suavizado entre corridas (el "±10%"): ahora recibe el tiempo del video y el mismo clip da **idéntico**
  (diferencia 0 en 375 cuadros, con 5 pestañas en paralelo). (2) "Cara tapada" se contaba con el reloj real (en el
  análisis duraba ~1,5 s de video en vez de 6). Ninguno cambia el vivo. Mediciones anteriores: `B1_brazos/_mediciones_con_reloj_real`.
- **Cambio 1 · codo con peso entero (COD-1)**: el codo bien visto pesaba como mucho 55% mezclado con uno natural
  abajo-afuera; ahora pesa entero (siguen las reglas para codos inventados). Solo: giro del codo copia mejor en dedos
  (B1-06 0,38 → 0,57, B1-07 0,16 → 0,31), poco en el resto. **Descartado antes**: pasar el "ángulo de giro" (swivel) del
  codo: con el brazo casi vertical la referencia del ángulo cambia y el codo saltaba (saltos de mano 3 → 41 en B1-05).
  **Hallazgo**: con el antebrazo de tiesme (2,0 largos de mano, brazo 1,2) y la mano al costado de la cara, su codo NO
  puede quedar arriba del hombro: los codos en la nuca dependen del cambio 5 (mano detrás de la cabeza).
- **Cambio 2 · mano retenida (MAN-4)**: (a) una mano nueva cuenta al 2.º cuadro seguido (la de un solo cuadro se
  retenía 0,8 s girando hasta 27°/cuadro); (b) retener también con tope de velocidad; (c) el brazo que se pierde
  bajando (muñeca saliendo por abajo o bajando rápido debajo del pecho) vuelve a reposo enseguida (3 rad/s) en vez de
  quedar 0,8 s arriba. B1-03 (8 s): brazo de tiesme arriba con el tuyo abajo **1,4 → 0,7 s**; B1-04 saltos 9 → 2.
  **Descartado**: profundidad de manos al 50% (MAN-5): en tus segundos la mano no se iba por ruido de profundidad
  (B1-04 3 s = empuje de los brazos cruzados; B1-05 7 s = choque con la cabeza que saltaba adelante/atrás).
- **Cambio 3 · brazos cruzados (MAN-2)**: adelante va el antebrazo que MediaPipe ve más cerca (profundidad del cuerpo de
  codo + muñeca, +un poco a la mano que se sigue viendo), y se mantiene (cambia si el otro queda adelante 0,2 s; umbral
  simulado sobre B1-04). Antes: profundidad de la muñeca mezclada con el tamaño de la mano. B1-04 orden correcto
  (verdad mirada en el video) **61% → 80%** (todos: 83%); sigue mal de 8,5 a 9,5 s al cambiar de brazo.
- **Cambio 4 · aplaudir (MAN-6)**: si tus palmas se tocan en la imagen (no sobre la cara), las de tiesme se juntan en el
  punto medio y no corre la regla de antebrazos cruzados. B1-08 (3–4 s): distancia entre palmas **0,92 → 0,62** largos
  de mano (todos: 0,66).
- **Cambio 5 · contactos con la cabeza (MAN-1, MAN-5 en la nuca)**: cara = la parte de tu mano que está sobre tu cara va
  al mismo lugar de la superficie de su cara (antes contaba el centro de tu palma, que al taparte las mejillas queda en
  la mandíbula → tiesme ponía la palma bajo el mentón); nuca = mano al costado de la cabeza con el codo arriba → detrás
  de su cabeza (el choque la mandaba adelante, a las mejillas). El codo separa los dos casos (mejillas: codos abajo).
  B1-03 distancia palma–cara (1,0 = apoyada): mejillas **1,7 → 1,1**, rascarse **1,6 → 1,2**, taparse 1,6 → 1,4
  (mejora poco), segundo taparse 1,5 → 1,45. B1-05: palma detrás de la cabeza **15% → 76%**; altura del codo
  correlación −0,26 → 0,17, error 54° → 45° (con todo). **Costos**: B1-05 involuntarios 6 → 10 y palma adentro de la
  cabeza o el torso 1% → 13% de los cuadros (en la transición adelante/atrás); B1-03 palma adentro 2% → 4%.
- Con todo junto, B1-03 altura del codo correlación −0,29 → 0,83. Sin cambios en B1-06/07 (dedos) fuera de lo dicho.
- No entró (por decisión): cintura (B1-05 1,5 s ya andaba), choques en general (CHO), dedos, cabeza.
- Batería (19/10, pedido del usuario): clip 11 **libre de 30 s** al final (movimientos al azar); la batería dura ~3,5 min.
- **Aplaudir arriba de la cabeza (19/10, decisión del usuario: "que junte las manos arriba, delante del gorro, sin taparse la
  cara")**: en B2-08 (3,5–5,5 s) tiesme juntaba las manos delante de su cara: MediaPipe veía una sola de tus manos y la
  profundidad estimada las mandaba adelante. Ahora una mano arriba de tu frente (> 1,85 medias caras sobre el centro de
  tu cara) y cerca del medio va **arriba del gorro** (sin mano detectada se usan los dedos del cuerpo, no la muñeca); las
  manos apoyadas sobre la cabeza (1,0–1,8) no cambian. B2-08: palmas a 0,83 → **1,67** sobre el centro de la cara, de
  2,06 → −0,11 adelante (ya no tapan la cara), separadas 0,75. B1-08 se juntan arriba (0,66 → 0,44). Otros clips de B1
  iguales (B1-04 83% → 82%). Probado antes y descartado: apuntar al FRENTE del gorro (el brazo no llega y la mano quedaba
  delante de la cara). Video: `v12_bateria01/analisis_v12_aplauso/08_manos_arriba_comparado.mp4`.

## Cambios v11 (17/10 — entrada y salida: ENT-1, ENT-2, ENT-3)
Motivo: ronda 1 con los videos comparados de la batería 1 (B1). Medido con `_herramientas/entrada_salida.js` sobre B1.
- **ENT-2 (salto ~1 s después de entrar)**: la pose neutra automática se tomaba de UN cuadro y se aplicaba de golpe
  (la cabeza saltaba ~10° en una décima). Ahora es el promedio de 0,4 s de postura de frente y quieta y se aplica de a
  poco (~0,4 s). Salto de cabeza al calibrar: **4,2–4,5° → 1,6–1,8° por cuadro** (B1-04/05/07/08).
- **ENT-1 (entrada lenta y con brazos raros)**: antes cada hueso entraba por su cuenta con velocidad limitada durante
  2 s (pasaba por poses intermedias raras) y empezaba a los 0,6 s. Ahora engancha a los **0,4 s** y todo el cuerpo
  se mezcla junto desde la pose de reposo en **0,8 s** (copia completa ~1,2 s; antes ~2,6 s), con un tope de 5 rad/s
  que se suelta de a poco (si se suelta de golpe, lo atrasado se recupera en un cuadro: medido 15–27°/cuadro en los
  intentos 2 y 3, por eso quedó la rampa). Máximo en la entrada: 9,5°/cuadro, sin picos.
- **ENT-3 (seguía copiando al salir)**: el límite ahora es el encuadre vertical (la franja 9:16), no la imagen entera;
  se entra con la cara en el 90% central y se sale al pasar el borde; espera 0,5 s (antes 1,2) y vuelve a reposo
  con todo el cuerpo junto en 1 s. B1-01: saliste a los 9,3 s → **te suelta a los 9,9 s (antes 10,8) y queda en
  reposo a los 10,8 s (antes 11,9)**.
- La corrección de la ficha: la neutra **no** absorbía la cabeza agachada (en esta instalación mirar derecho mide
  15–22°); CAB-1 sigue abierto por otra causa (se pierde la malla de la cara con la cabeza baja).
- Sin cambios en el resto de las métricas de B1 (dentro del margen de ±10% entre corridas).
- Intentos guardados para comparar: `analisis_v11_intento1..3` en la carpeta de B1.

## Cambios v10 (17/10 — movimientos involuntarios de manos y antebrazos)
Primer cambio hecho con el método nuevo: encontrado y medido con el registro cuadro a cuadro del clip de prueba, no
con el demo. Todo comparado sobre el mismo clip (`_pruebas/clip_cabeza_manos.mp4`, 900 cuadros).
- **Qué pasaba**: tus manos detectadas casi no pegaban vueltas, pero las de tiesme sí. En ~30 momentos del clip su
  antebrazo giraba 100–180° en 0,2 s con tu muñeca quieta. Era el antebrazo **girando sobre su propio eje**: con el
  codo de tiesme doblado del todo (manos cerca de la cara + su antebrazo larguísimo) el cálculo de "girar lo mínimo"
  deja de estar definido. Con el codo a 160–180° giraba 8,4° por cuadro (a 120–140°: 2,3°).
- **Corrección 1**: cerca de esa zona brazo y antebrazo siguen la orientación del cuadro anterior y vuelven de a poco
  al cálculo normal cuando el ángulo se normaliza.
- **Corrección 2**: la mano no se dobla más de 70° respecto del antebrazo (antes podía quedar doblada hacia atrás,
  y ahí el giro de muñeca también se volvía inestable).
- **Números** (antes → solo corrección 2 → las dos):

  | Medida | antes | solo muñeca | v10 |
  |---|---|---|---|
  | Movimientos involuntarios (mano gira >60° en 0,2 s con tu mano quieta) | 33 | 32 | **4** |
  | Saltos (hueso grande >20° en un cuadro) | 108 | 86 | **2** |
  | Movimiento de las manos por cuadro (mediana) | 1,44° | 1,34° | **1,04°** |
  | Movimiento de los dedos por cuadro (mediana) | 0,75° | 0,76° | **0,59°** |
  | Cabeza: copia de tu giro / cabeceo | 99% / 84% | igual | 97% / 82% |

  Margen de la medición: repetir el mismo análisis da ±10%. En el demo (poses limpias) la v10 da lo mismo que la v9
  (0,1°): las correcciones solo actúan en las situaciones problemáticas.
- Para comparar: `?brazo=viejo` apaga la corrección 1, `?muneca=180` la 2, `?variante=nombre` separa la carpeta del
  análisis. El análisis ahora salta cuadro a cuadro y funciona aunque la página no esté a la vista.
- Copia anterior: `_versiones/v9`.

## Cambios v9 (17/10 — medir con movimientos reales y cámara a 1080p)
Después del video 00-12-10 (ver `analisis_video_00-12-10_y_como_seguir.md`): hasta ahora cada cambio se medía contra
un demo sintético y cada prueba real era un movimiento distinto, así que no se podía comparar una versión con otra.
La v9 no cambia el tracking: agrega con qué medirlo.

**Importante la primera vez**: cerrar la ventana negra y abrir de nuevo `ABRIR_TEST.bat` (el servidor nuevo es el
que guarda las grabaciones). Si no, al grabar aparece "cerrá la ventana negra y abrí de nuevo ABRIR_TEST.bat".

- **Cámara a 1920×1080** (antes 1280×720): mismo encuadre, 1,5 veces más píxeles en cara y manos. El panel muestra
  el tamaño real que entrega la cámara. `?res=720` vuelve a lo anterior. Los umbrales que estaban en píxeles (tamaño
  de la mano, recortes mínimos) se miden "en 720p", así que a 1080p tiesme hace lo mismo con la misma escena
  (demo a 1080p contra 720p: 0° de diferencia en 7 escenas).
- **Grabar la cámara** (tecla **K** o el botón; K otra vez para parar): guarda la imagen de la cámara tal cual
  (resolución completa, sin el panel ni la ventanita) y un **registro por cuadro** (`.jsonl`) con lo que detectó
  MediaPipe y lo que hizo tiesme. Queda en `_pruebas/grabaciones/libre_<fecha>.mp4` + `.jsonl`.
- **Batería de pruebas** (tecla **B** o el botón; B otra vez cancela): 10 clips cortos, siempre los mismos, con la
  instrucción en pantalla y una cuenta regresiva: entrar y salir, cabeza, manos en la cara, brazos cruzados, codos,
  formas con los dedos, dedos rápido, manos arriba, girar el cuerpo, acercarse. ~3 min en total. Queda en
  `_pruebas/grabaciones/bateria_<fecha>/01_entrar_salir.mp4` … `10_acercarse.mp4`, cada uno con su `.jsonl`.
- **Análisis cuadro a cuadro** (lo uso yo para comparar versiones): `index.html?video=_pruebas/<clip>.mp4&analizar`
  procesa el clip cuadro por cuadro, sin saltear ninguno aunque la PC sea lenta, y deja en `analisis_v9/` el
  registro y una foto cada 0,5 s (cámara con los puntos | tiesme). `index.html?lote=grabaciones/bateria_<fecha>`
  analiza toda la batería sola, clip por clip. El giro de la cámara se toma del registro del clip.
- **Herramientas** (`_herramientas/`): `metricas.js` (detección, temblor, saltos, cuánto siguen los dedos y la
  cabeza a los tuyos y con cuánto retardo, si las manos llegan a la cara, si atraviesan el cuerpo; puede comparar dos
  versiones), `hoja.js` (hoja de contacto con las fotos del análisis) y `archivar_version.js` (copia a `_versiones`).
- Primeras mediciones con el clip de prueba (mismo tracking que la v8): cabeza bien (copia el 90% de tu giro y el
  75% del cabeceo, ~67 ms de retardo); las manos llegan seguido al **tope de velocidad de giro** (27° por cuadro), o
  sea que la orientación de la mano detectada pega vueltas: primera pista de los movimientos involuntarios. Los dedos
  no se pueden juzgar con ese clip (casi no se doblan): hace falta la batería.
- Copia anterior: `_versiones/v8`.

## Cambios v8 (16/10 noche — sin internet y cámara vertical)
**Sin internet**: three.js 0.160, MediaPipe 0.10.14 (con su wasm) y los tres modelos (cuerpo, manos, cara) están
en la carpeta `lib` (~40 MB; versiones y origen en `lib/ORIGEN.txt`). Son los mismos archivos que antes se bajaban
del CDN al abrir; los paquetes se verificaron con la firma sha512 del registro npm. Probado: al abrir la página
los 164 pedidos van a `localhost`, ninguno a internet, y MediaPipe arranca en GPU.

**Girar la imagen** (para montar la C920 en vertical): tecla **O** o el menú *Cámara → Girar imagen*
(0°, 90° horario, 180°, 90° antihorario). Se guarda en el navegador: se elige una vez y queda.
La imagen se endereza **antes** de MediaPipe: los detectores te ven parado, la ventanita muestra la imagen
vertical (720×1280) y el resto del programa trabaja igual. Elegir la opción con la que en la ventanita te veas derecho.
- La distancia focal se sigue calculando con el ancho real del sensor. Si no, todas las distancias saldrían
  1,8 veces más cortas (en el demo: 0,47 m en vez de 0,83 m).
- Con la cámara vertical la zona 9:16 es **toda la imagen** (la línea punteada queda en el borde de la ventanita).
- **Qué se gana**: la cámara vertical ve más alto. A 2,5 m ve 3,5 m de alto (horizontal: 2 m). La cadera
  (60 cm debajo de la cámara) entra desde 0,9 m de distancia en vez de 1,6 m. En el demo "libre" (0,6 a 1,2 m) la
  cadera se vio el 53% del tiempo contra 0%.
- **Qué se pierde**: ve más angosto. A 2,5 m ve 2 m de ancho (horizontal: 3,5 m). Con los brazos en cruz cerca de
  la cámara las manos se salen de cuadro.
- Girar no agrega píxeles por persona: a la misma distancia te ves del mismo tamaño. La ventaja es ver la cadera
  sin alejarte (o poder acercarte y verte más grande).
- Verificado con el clip girado (`_pruebas/clip_girado_antihorario.mp4` con `?giro=90`): misma detección que el
  clip normal (cuerpo 120/120, manos 113+118 contra 113+117, cara 26 contra 24 de 60) y los puntos a 3 px de
  promedio. El giro no suma tiempo medible. En el demo, con los brazos dentro de la imagen, tiesme queda igual con
  y sin giro (0 a 0,4°).
- Para probar: `index.html?demo&giro=90` simula la cámara vertical; `?giro=...` en la dirección fuerza el giro sin guardarlo.
- Copia anterior: `_versiones/v7`.

## Cambios v7 (16/10 noche — video 22-24-46)
**Causa principal encontrada**: a ~2,5 m tu cara y tus manos se ven chicas en la imagen entera y MediaPipe las
perdía (el panel marcaba "cara no" justo al girar la cabeza, y "manos 0/1"). Por eso la cabeza volvía al frente
sola, los dedos no se movían, las manos no llegaban a la cara y había entradas bruscas.
- **Recortes estilo Holistic**: el cuerpo (que se detecta bien de lejos) ubica la cara y cada mano, se recorta
  esa zona ampliada y ahí buscan los detectores. En la ventanita se ven los recortes (rojo cara, amarillo/naranja
  manos). Con un clip tuyo: cara encontrada casi el doble de veces (31 vs 17 de 73 cuadros), manos 143 vs 135.
- **Cabeza sin cara**: si igual se pierde la cara (perfil, mano tapando), la cabeza sigue con orejas/ojos/boca del
  cuerpo. En el clip la cabeza tuvo dato el 100% del tiempo (antes ~40% se iba al frente).
- **Cadera**: el hueso de la cadera gira e inclina con la tuya (±25° / ±12°) y la columna reparte entre cadera y
  pecho. **Necesita que la cámara vea tu cadera**: en tus videos la imagen corta en el cinturón y no se detecta.
- **Hombros**: subir/bajar (hasta 28°) y adelante/atrás (con zona muerta, la profundidad de MediaPipe es ruidosa).
- **Manos deformadas**: venían de "mano a la cámara" agrandándolas por error de lejos. Ahora solo actúa con la mano
  realmente grande en la imagen (máx. 2,2×).
- **Contacto**: si la palma queda apenas delante de la cara o el pecho, se apoya (rascarse, tocarse el pecho).
- **Brazos atrás de la espalda**: si la muñeca no se ve y está detrás de la cadera, la mano va detrás de la cintura.
- **Re-entrada más suave** de una mano que vuelve a cuadro, y una mano a medias en el borde ya no se descarta.
- **Menos retardo de lejos** (menos suavizado a distancia; un poco más de temblor a cambio).
- Probar con un video grabado en vez de la cámara: `index.html?video=_pruebas/clip_cabeza_manos.mp4`.
- Copia anterior: `_versiones/v6`.
**Pendiente**: formas finas con los dedos (que se toquen las yemas), brazos cruzados con las manos sobre los brazos,
y los codos puntuales del seg 14 y 40–63 (no los aislé uno por uno).

## Cambios v6 (16/10 noche — video 21-55-55; detalle en `analisis_video_21-55-55.md`)
1. **Taparse la cara ya no te "saca"**: para entrar hace falta la cara; para seguir alcanzan los hombros en la
   franja. Con la mano tapando la cara se mantienen cabeza, distancia y gestos (antes tiesme bajaba los brazos
   y los subía de golpe).
2. **Entrada suave**: al empezar a seguirte, todo el cuerpo se acomoda despacio (de 1 a 5 rad/s en 2 s).
3. **Postura neutra automática** a los 0,6 s de entrar (mirando de frente): la cámara más baja que la cara ya no
   deja la cabeza agachada. En `cara.js` el giro y cabeceo se miden contra tu postura habitual y los ojos
   "sorpresa" salen solo por las cejas (se quedaban clavados).
4. **Reposo con los brazos a los costados** (manos al lado de la cadera) y la mano que toca el torso o la cara
   queda **apoyada delante**, a la misma altura (antes se iba a la entrepierna).
5. **Brazos cruzados**: los antebrazos ya no se atraviesan; va adelante el de la mano más cerca de la cámara.
6. **Gorra** con su propia zona de choque (la mano por arriba de la cabeza no la atraviesa).
7. **Mano a la cámara** usa la misma posición en pantalla que el mapeo normal (antes, con manos al costado de la
   cabeza, las bajaba al mentón) y se activa recién con la mano bastante más cerca que la cara.
8. **Codo**: sin choque no recalcula los 13 planos. El cálculo del rig tarda 0,25 ms por cuadro, así que los fps
   bajos (24) vienen de MediaPipe + el render + OBS grabando, no del rig.
Escenas nuevas del demo: `cruzar_brazos`, `manos_arriba`, `mano_panza`. Copia anterior: `_versiones/v5`.

## Cambios v5 (16/10 noche — video 21-24-55, primera prueba real de la v4)
- **Tiesme se veía agrandado desde el segundo 0**: la rueda del mouse acercaba la vista. En modo tele la cámara
  ahora es **fija** (el mouse no la mueve). Si alguna vez se ve raro: tecla **R**.
- **Presencia**: tiesme solo te sigue si se ve tu cara, tus dos hombros están dentro de la imagen y tu cara está
  dentro de la **franja 9:16 del centro** (dibujada punteada en la ventanita de la cámara: verde = te sigue,
  gris = afuera) durante 0,6 s. Sentado al costado, con la cara fuera de cuadro o pasando por atrás: queda en reposo.
- **Anclado**: el modelo nunca se traslada. Solo se inclina desde la cadera según dónde estés respecto del
  **centro de la cámara** (en el centro = derecho; en el borde de la franja = inclinación máxima, ±10°), suave.
- **Bordes de la imagen**: un codo o muñeca cerca del borde pierde confianza y una mano que toca el borde se
  descarta → tiesme mantiene su pose en vez de seguir puntos inventados (lo de la mano "violenta" del seg 30).
- **Velocidad máxima** de la mano y del giro de los brazos: un error de detección ya no da un tirón.
- **Giro de muñeca** continuo (sin saltar al pasar media vuelta) y limitado a ±100°.
- **Codos**: no pueden quedar dentro del torso ni atravesarlo (codo, brazo y antebrazo), ni el antebrazo cruzar la
  cabeza; el codo detectado pesa menos y si apunta hacia arriba con la mano abajo se ignora.
- Copia anterior: `_versiones/v4`.

## Cambios v4 (16/10, 2ª tanda — video 20-55-33)
Ese video estaba hecho con la copia VIEJA v3.1 (por eso tiesme quedaba gigante y fuera de cuadro: esa versión
todavía se desplazaba con el cuerpo). Lo que sí aplicaba también a la v4 y se corrigió:
- **Manos hacia la cámara de lejos** (estabas a ~2,2 m): ahí el tamaño de la mano no sirve para saber su distancia.
  Ahora se usa el **escorzo del brazo** (un brazo que apunta a la cámara se ve más corto). En la simulación realista
  a 2,2 m el alcance hacia adelante pasó de 65% a 90%.
- **Mano cerca de la cámara**: tiesme reproduce dónde y de qué tamaño se ve tu mano respecto de tu cara. Si su brazo
  no llega, la mano se acerca lo más posible sobre la misma línea de vista y **se agranda** para verse igual
  (antes 1,33× → ahora ~1,7–1,9×, igual que tu cámara con un 7–10% de diferencia). Opción **Mano a la cámara**.
- **Temblor**: la profundidad del cuerpo que da MediaPipe saltaba varios cm por cuadro y entraba casi sin filtrar;
  ahora se filtra en la entrada. Lejos de la cámara se suaviza más (el mismo ruido en píxeles es más error en
  metros). Manos al costado de la cabeza 0,32 → 0,07 % por cuadro; cabeza 0,034 → 0,009; lejos (2,2 m) 0,32 → 0,13.
- Escenas nuevas del demo: `lejos_libre`, `lejos_brazo_adelante`, `cerca_mano_camara` (ej. `index.html?demo=cerca_mano_camara`).

## Cambios v4 (16/10, análisis del video 20-32-45)
Fallas encontradas y qué se hizo:
- **Tiesme salía de cuadro / se movía entero al inclinarte**: el cuerpo se trasladaba con tus hombros, y la
  referencia se había tomado mientras te sentabas (quedó corrido todo el video y saltó en 0,5 y 1,5 s).
  → En modo tele el modelo ya no se traslada: **te inclinás y tiesme se inclina desde la cintura** (costado ±15°,
  adelante hasta 20°). La cadera compensa para que la cabeza siempre quede en cuadro. La referencia se toma con el
  cuerpo quieto 1 s y se readapta sola en ~10 s.
- **Codos locos** (12,5–13,5 s y 25,5–26 s): con los codos fuera de cuadro MediaPipe inventa su posición y el
  codo de tiesme la seguía; además, al esquivar cabeza/torso el IK saltaba entre dos soluciones.
  → El codo detectado solo cuenta si se ve bien (si no, codo natural: afuera, abajo y atrás) y el plano del
  codo cambia de a poco.
- **Movimientos involuntarios cuando falla la detección**: al perder una mano o un brazo iba a reposo de golpe y
  volvía de golpe. → Se mantiene la última pose buena 0,8 s, después vuelve a reposo despacio, y al reaparecer
  entra suave. Un punto que salta imposible (error de un cuadro) se ignora.
- **Lejos de la cámara** la distancia de la mano (por su tamaño) es ruidosa → se usa más la del cuerpo.
- **"Se ve de las rodillas para arriba"**: estabas abriendo `_versiones/v3` (sin el encuadre). Las copias viejas
  ahora dicen VIEJA en el panel.

Verificado en el demo: inclinarse de costado mueve el modelo 0% (la cabeza queda en cuadro); con codos basura
el codo queda estable; con la mano perdida 0,4 s no se mueve nada; con 3 s vuelve a reposo a ≤1,2 rad/s; un
cuadro con la mano en un lugar imposible no mueve nada.
Panel: **Inclinarse (cintura)** on; **Desplazarse** off (solo funciona fuera del modo tele).
Demo con una escena fija: `index.html?demo=inclinar_lado` (también `inclinar_adelante`, `arco`, etc.).
`_versiones/v3.1_9x16`: la versión anterior a estos cambios.

## Tele vertical (16/10)
- La imagen sale en **9:16** centrada (en un monitor horizontal quedan bandas negras a los costados).
- Encuadre fijo medido de la captura de referencia: tope de la gorra al 8,7% de la altura y ruedo del buzo
  al 94,5% (se calcula solo a partir de la malla, constantes `TV_FRAME` en `app.js`). **R** vuelve a este encuadre.
- En la tele: girar la pantalla de Windows a vertical, abrir la página, **F** (pantalla completa), **H** y **V** (ocultar panel y cámara).
- `_versiones/v3`: la versión anterior a este cambio.

## Cambios v3 (14/10, análisis del video 19-32-21)
Detalle completo en `analisis_video_19-32-21.md`.
- Las manos van a una posición adaptada a las proporciones de tiesme (cabeza enorme, antebrazo muy largo):
  ya no se cruzan los brazos al juntar las manos ni atraviesan la cara; tapar la cara, mejillas y cabeza caen en su lugar.
- Colisión de la palma con cabeza y torso.
- Cabeza con la matriz de MediaPipe, límites anatómicos y congelada mientras las manos tapan la cara.
- El cuerpo se mueve con los hombros (girar la cabeza ya no lo desliza).
- Manos asignadas por posición y continuidad (no se intercambian).
- Panel: **Manos a su medida** (apagado = comportamiento de la v2, para comparar).
- Demo (`?demo`): recorre escenas fijas (brazos abajo, cruz, costado de la cabeza, tapar la cara, mejillas, arriba de la cabeza, rezo, panza).
- `_versiones/v2`: la versión anterior.

## Cambios v2 (14/10)
- Temblor: filtro One Euro sobre las señales en metros (antes del IK) + filtro de rotación. Medido en el modo demo con ruido sintético, contra la misma cadena sin filtro: manos ~4× más quietas, cabeza ~8×.
- Visibilidad suave: codos o cadera al borde del cuadro ya no hacen saltar el pecho ni los brazos.
- Profundidad: el personaje se acerca, se aleja y se mueve al costado con vos; las manos van hacia adelante cuando las acercás a la cámara.
- Dedos: sin giro sobre su eje y con falanges en bisagra.
- Estados de cara del test de julio, con su calibración, clips de ojos y boca por voz.

## Pendientes de esa época (LEEME al 17/10)
- Probar con la cámara real (la v7 y la v8 solo se probaron con el demo y con clips).
- Una vez en la PC de la cabina: abrir con el cable de red desenchufado para confirmar que anda sin internet.
- La calibración de gestos de julio no se trae sola (se guarda por dirección web): hay que hacer **G** una vez.
  Lo mismo el giro de la cámara (**O**).
- Formas finas con los dedos, brazos cruzados con las manos sobre los brazos, codos del video 22-24-46.
- Opcional: pedirle a la C920 1920×1080 (1,5 veces más píxeles en cara y manos de lejos; más trabajo por cuadro).
- TouchDesigner: esta página puede mandar los datos por WebSocket/OSC.

## Notas del traspaso anterior (17/10)
**17/10: primera prueba real de la v8 (video 00-12-10) → leer `analisis_video_00-12-10_y_como_seguir.md`**:
autocrítica del método (medíamos contra el demo sintético, sin comparar versiones con el mismo movimiento) y
opciones A–G. Recomendado: A (grabar la cámara cruda + registro por cuadro + 10 clips de prueba), B (1080p, luz),
C (comparar con XR Animator / Webcam Motion Capture) y D (gestos reconocidos → poses animadas en Blender).
Hecho A y B en la v9 (ver LEEME, Cambios v9). v10: primer arreglo con el método nuevo (giros involuntarios de antebrazo/mano, ver LEEME). Próximo: el usuario graba la batería (tecla B) → analizar con `?lote=grabaciones/bateria_<fecha>` y `_herramientas/metricas.js`. Faltan sus respuestas: fecha de la muestra, lista de gestos imprescindibles, diseño híbrido (D), presupuesto.

1. **Probar con la cámara real**: hecho el 17/10 con la v8 (ver arriba).
2. **Encuadre de la cámara de la cabina**: tiene que verse la **cadera** (en los videos la imagen corta en el cinturón).
   Opción: C920 **vertical** + tecla O. Ojo: girar no agrega píxeles por persona (misma focal); lo que gana es alto de
   encuadre (cadera a la vista desde 0,9 m en vez de 1,6 m, con la cámara a la altura del pecho) y pierde ancho
   (2 m en vez de 3,5 m a 2,5 m de distancia).
3. Formas finas con los dedos (que se toquen las yemas), brazos cruzados con las manos sobre los brazos (3:53 del
   video 22-24-46), codos puntuales (seg 14 y 40–63 del mismo video) — no resueltos específicamente.
4. Rendimiento: ~24–27 fps con OBS grabando; hay dos detectores de manos. Opcional: 1920×1080 (1,5× píxeles en cara
   y manos de lejos, más trabajo por cuadro).
5. Sin internet: **hecho en la v8**. Falta confirmarlo una vez en la PC de la cabina con el cable de red desenchufado.
6. Si MediaPipe no alcanza: cámara con profundidad (Orbbec Femto Bolt/Mega, ZED 2i) — funcionan con TouchDesigner.
7. Gestos de cara: falta calibrar (G) con el usuario real; los estados vienen del test de julio.
8. Con la cámara vertical la zona de presencia es toda la imagen (a 2,5 m: 2 m de ancho). Si en la cabina se cuela
   gente por los costados, se puede achicar.
