# Tracking webcam — tiesme (SPOT CABINA) · v9

Test de tracking de tren superior con webcam que mueve al personaje **tiesme** en tiempo real.
Corre en el navegador (Chrome recomendado), con MediaPipe para detectar y three.js para mostrar el FBX.
**No necesita internet** (desde la v8 todo está en la carpeta `lib`).

> **La versión actual es siempre la de esta carpeta** (`ABRIR_TEST.bat`, la dirección termina en
> `/2.%20tracking%20webcam/index.html`). Lo que está en `_versiones` son copias viejas: al abrirlas aparece un
> cartel rojo **VERSIÓN VIEJA** y en el panel dicen **VIEJA**. No usar sus `ABRIR_vN.bat` salvo para comparar.

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

## Abrir
1. Doble click en **`ABRIR_TEST.bat`**. Se abre una ventana negra (el servidor) y el navegador.
   Si el servidor ya estaba abierto, alcanza con recargar la página (F5). No hace falta internet.
2. La primera vez Chrome pide permiso para la cámara: **Permitir**.
3. Esperar ~10 s a que diga `MediaPipe: listo (GPU, recortes)`. El panel tiene que decir **v9**.
4. Si la cámara está montada en vertical: **O** hasta que en la ventanita te veas derecho (queda guardado).
5. La postura neutra se toma sola al entrar, mirando de frente. **C** la vuelve a tomar.
6. Una vez por persona/lugar: **G** para calibrar los gestos de cara (~30 s, seguir las indicaciones).

Para cerrar: cerrar la pestaña y la ventana negra.
Sin cámara, para ver el rig moviéndose: `http://localhost:8090/2.%20tracking%20webcam/index.html?demo`

## Qué trackea
| Parte | De dónde sale |
|---|---|
| Cabeza (giro, cabeceo, inclinación) | malla de la cara; si se pierde, orejas, ojos y boca del cuerpo |
| Cadera (giro e inclinación) | caderas del cuerpo, solo si entran en cuadro |
| Pecho (giro y lateral) | línea de hombros (+ cadera si entra en cuadro) |
| Hombros (subir, bajar, adelante) | altura y profundidad de cada hombro respecto de las orejas |
| Hombro, codo, muñeca | posición equivalente de tu mano en tiesme (sus proporciones) + IK con sus largos + escorzo |
| Inclinarse | la cadera si se ve; si no, tu posición respecto del centro de la cámara (el modelo no se traslada) |
| Mano hacia la cámara | tamaño de la mano en la imagen (solo con la mano grande, cerca) |
| Dedos (5 por mano) | 21 puntos de cada mano, falanges como bisagra |
| Gestos de cara (boca A/E/O/feliz, ojos, cejas, mirada) | blendshapes de MediaPipe → estados de `1. tiesme modelo/estados_cara` |
| Boca con la voz (opcional) | micrófono |

## Controles
| Tecla | Acción |
|---|---|
| **T** | formato tele vertical 9:16 on/off (on por defecto) |
| **O** | girar la imagen de la cámara: 0° → 90° horario → 180° → 90° antihorario (queda guardado) |
| **K** | grabar la cámara + registro por cuadro / parar (en `_pruebas/grabaciones`) |
| **B** | batería de 10 clips de prueba (B otra vez cancela) |
| **C** | calibrar postura neutra y posición de referencia |
| **G** | calibrar gestos de cara (~30 s) |
| **M** | espejo on/off |
| **R** | recentrar la vista |
| **H** | ocultar panel |
| **V** | ocultar ventanita de la cámara |
| **F** | pantalla completa |

Panel:
- **Suavizado** (0.70): más alto = más quieto cuando no te movés.
- **Reacción** (0.50): más alto = sigue más rápido los movimientos bruscos (y tiembla un poco más).
- **Desplazamiento** (1.0): cuánto se mueve el personaje cuando te acercás o te corrés (0 = fijo). Solo fuera del
  modo tele: en la tele el modelo queda anclado.
- **Umbral voz**: sensibilidad del micrófono para la boca.

Si nadie está frente a la cámara por 3 s, la posición de referencia se resetea y la próxima persona se calibra sola.

## Tips
- Buena luz de frente, fondo sin mucho ruido.
- Encuadre: para que la cintura acompañe tiene que verse la cadera. Con la cámara a la altura del pecho, en
  horizontal hace falta estar a más de 1,6 m; en vertical alcanza con 0,9 m. Si no se ve, el pecho usa solo los hombros.
- Dedos: palma o dorso hacia la cámara. Con la mano de canto los dedos se confunden.

## Archivos
- `index.html` + `app.js`: página, tracking y retargeting a los huesos `mixamorig`.
- `cara.js`: estados de cara (portado de `6. julio/claude/instalacion interactiva 01/test_3d_v1.html`).
- `servidor.js` + `ABRIR_TEST.bat`: servidor local en el puerto 8090.
- `lib/`: three.js, MediaPipe y los modelos de detección, locales (ver `lib/ORIGEN.txt`). **No borrar**: sin esta
  carpeta la página no carga.
- `_versiones/v1` … `v7`: versiones anteriores. Cada una se abre con su propio `ABRIR_vN.bat` (no abrir su
  `index.html` con doble click). Si ya hay otro servidor abierto, el .bat solo abre la página. Las v1–v7 necesitan
  internet (bajaban three.js y MediaPipe del CDN).
- `_pruebas/`: `clip_cabeza_manos.mp4` (recorte de un video OBS) y `clip_girado_antihorario.mp4` (el mismo girado
  90°, para probar el giro: `index.html?video=_pruebas/clip_girado_antihorario.mp4&giro=90`).
- Modelo y texturas: `..\1. tiesme modelo\` (los estados de cara están en `estados_cara\`, exportados del test de julio).

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

## Pendiente
- Probar con la cámara real (la v7 y la v8 solo se probaron con el demo y con clips).
- Una vez en la PC de la cabina: abrir con el cable de red desenchufado para confirmar que anda sin internet.
- La calibración de gestos de julio no se trae sola (se guarda por dirección web): hay que hacer **G** una vez.
  Lo mismo el giro de la cámara (**O**).
- Formas finas con los dedos, brazos cruzados con las manos sobre los brazos, codos del video 22-24-46.
- Opcional: pedirle a la C920 1920×1080 (1,5 veces más píxeles en cara y manos de lejos; más trabajo por cuadro).
- TouchDesigner: esta página puede mandar los datos por WebSocket/OSC.
