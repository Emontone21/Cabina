# Tracking webcam — tiesme (SPOT CABINA) · v5

Test de tracking de tren superior con webcam que mueve al personaje **tiesme** en tiempo real.
Corre en el navegador (Chrome recomendado), con MediaPipe para detectar y three.js para mostrar el FBX.

> **La versión actual es siempre la de esta carpeta** (`ABRIR_TEST.bat`, la dirección termina en
> `/2.%20tracking%20webcam/index.html`). Lo que está en `_versiones` son copias viejas: al abrirlas aparece un
> cartel rojo **VERSIÓN VIEJA** y en el panel dicen **VIEJA**. No usar sus `ABRIR_vN.bat` salvo para comparar.

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
   Si el servidor ya estaba abierto, alcanza con recargar la página (F5).
2. La primera vez Chrome pide permiso para la cámara: **Permitir**.
3. Esperar ~10 s a que diga `MediaPipe: listo (GPU)`.
4. Mirando de frente a la cámara, apretar **C** (postura y posición neutra).
5. Una vez por persona/lugar: **G** para calibrar los gestos de cara (~30 s, seguir las indicaciones).

Para cerrar: cerrar la pestaña y la ventana negra.
Sin cámara, para ver el rig moviéndose: `http://localhost:8090/2.%20tracking%20webcam/index.html?demo`

## Qué trackea
| Parte | De dónde sale |
|---|---|
| Cabeza (giro, cabeceo, inclinación) | malla de la cara |
| Pecho (giro y lateral) | línea de hombros (+ cadera solo si entra bien en cuadro) |
| Hombro, codo, muñeca | IK en perspectiva: hombro + posición real de la mano + largo de brazos |
| Acercarse / alejarse / moverse al costado | distancia y posición de la cara en cámara |
| Mano hacia la cámara | tamaño de la mano en la imagen (más grande = más cerca) |
| Dedos (5 por mano) | 21 puntos de cada mano, falanges como bisagra |
| Gestos de cara (boca A/E/O/feliz, ojos, cejas, mirada) | blendshapes de MediaPipe → estados de `1. tiesme modelo/estados_cara` |
| Boca con la voz (opcional) | micrófono |

## Controles
| Tecla | Acción |
|---|---|
| **T** | formato tele vertical 9:16 on/off (on por defecto) |
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
- **Desplazamiento** (1.0): cuánto se mueve el personaje cuando te acercás o te corrés (0 = fijo).
- **Umbral voz**: sensibilidad del micrófono para la boca.

Si nadie está frente a la cámara por 3 s, la posición de referencia se resetea y la próxima persona se calibra sola.

## Tips
- Buena luz de frente, fondo sin mucho ruido.
- Si estás sentado muy cerca, la cadera queda fuera de cuadro: está bien, el pecho usa solo los hombros.
- Dedos: palma o dorso hacia la cámara. Con la mano de canto los dedos se confunden.

## Archivos
- `index.html` + `app.js`: página, tracking y retargeting a los huesos `mixamorig`.
- `cara.js`: estados de cara (portado de `6. julio/claude/instalacion interactiva 01/test_3d_v1.html`).
- `servidor.js` + `ABRIR_TEST.bat`: servidor local en el puerto 8090.
- `_versiones/v1`, `_versiones/v2`: versiones anteriores. Cada una se abre con su propio `ABRIR_v1.bat` / `ABRIR_v2.bat`
  (no abrir su `index.html` con doble click). Si ya hay otro servidor abierto, el .bat solo abre la página.
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
- Necesita internet al abrir (three.js y MediaPipe vienen de CDN). Para la muestra: bajar todo local.
- La calibración de gestos de julio no se trae sola (se guarda por dirección web): hay que hacer **G** una vez.
- TouchDesigner: esta página puede mandar los datos por WebSocket/OSC.
