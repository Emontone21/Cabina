# Video `2026-10-17 00-12-10.mp4` (v8) — análisis, autocrítica y cómo seguir

2:24 grabado en vertical (1080×1920, 60 fps). Panel "v8", dirección principal, cámara sin girar (horizontal).
Revisado con hojas de contacto cada 2 s (ventanita de cámara + tiesme + línea de estado), medición cuadro a cuadro
de cuánto se mueve tiesme contra cuánto te movés vos, y detalle a 5 cuadros/s en los saltos.
Estabas a ~1,1–1,3 m (la cara ocupa ~130 px en la imagen de la cámara): más cerca que en los videos anteriores
(~2,5 m). La imagen corta en la cintura: la cadera no entra.

## 1. Qué muestra el video

**Lo que anda**
- Te sigue todo el video sin soltarte ("Persona: siguiendo" siempre), aun con la cara tapada.
- Manos delante del pecho con las palmas hacia adelante (0:12–0:18, 1:36–1:40): lugar parecido.
- Mano hacia la cámara (1:50): la de tiesme se acerca y se agranda.
- Girar el cuerpo de 3/4 con la mano en la cintura (0:58–1:12): el torso acompaña.

**Lo que falla** (lo que marcaste, ubicado en el tiempo)

| Falla | Dónde | Qué se ve |
|---|---|---|
| Manos que no llegan a la cara | 0:04, 0:24–0:28, **1:54–2:18** | Te tocás las mejillas o tapás la cara y las manos de tiesme quedan delante del cuello o del pecho, nunca sobre la cara. Pasa en todos los videos desde la v3. |
| Brazos cruzados | 1:24–1:32 | Antebrazos cruzados a la altura de la panza, manos colgando. Tus manos quedan tapadas debajo de los brazos ("manos 0") y la muñeca sale del cuerpo, más baja. |
| Dirección de la cabeza | 0:50, 2:22, 1:14–1:18 | Mirando abajo, tiesme no baja la cabeza (en 2:22 la gira de costado). De espaldas, la cabeza gira de más y se ve la gorra de frente. |
| Movimientos involuntarios | **0:54,4–0:54,6** y **1:19,4** (los dos saltos medidos) | Te acercás a la cámara (los hombros salen de cuadro) y tiesme se bambolea; al darte vuelta, salta. Entre 1:10 y 1:20 tiesme se mueve el doble que vos. |
| Codos | general | Los codos de tiesme son "genéricos": casi siempre abajo y afuera. Es a propósito (desde la v4 el codo detectado pesa como máximo 55% para evitar saltos), pero el costo es que no copia tus codos. |
| Atravesar el cuerpo | 0:06–0:08, 1:28–1:32 | Solo hay choques de la palma con la cara, la gorra y el torso, y entre antebrazos. Dedos, brazos contra la cabeza o mano contra el otro brazo no chocan. |
| Dedos (velocidad y forma) | 0:20–0:22, 1:40–1:52 | No lo puedo juzgar bien: en la grabación la ventanita de la cámara mide 300 px de ancho (la imagen real de 1280 achicada 4 veces) y tus dedos miden 1–3 px. |

También: 20 fps de tracking con OBS grabando.

## 2. Autocrítica: por qué no avanzamos

Tenés razón: de la v4 a la v8 casi todo lo que cambié fueron casos de borde (presencia, entradas, pérdidas,
choques), no la fidelidad de fondo (dónde van las manos respecto de la cara, dedos, codos, cabeza).
Las causas, en orden de importancia:

1. **Medí contra un demo que armé yo.** Los "antes y después" eran sobre una persona sintética con puntos
   perfectos más ruido inventado. Los errores reales de MediaPipe no son ruido: son sistemáticos (la profundidad
   aplastada, la muñeca inventada cuando la mano está tapada, izquierda y derecha cambiadas de espaldas, la cara que
   se pierde al mirar abajo). Por eso los números mejoraban y tu prueba no.
2. **Nunca comparamos dos versiones con el mismo movimiento.** Cada prueba tuya es una actuación distinta: no se
   puede saber si algo mejoró o empeoró. Tu sensación de retroceso no la puedo confirmar ni descartar, y eso ya es
   un problema de método.
3. **Diagnostiqué mirando una ventanita de 300 px.** No veo lo que vio MediaPipe ni en qué etapa falla cada cosa.
   Ejemplo: en "las manos no llegan a la cara" no sé si MediaPipe da mal la muñeca, si mi mapeo la baja o si el
   choque con la cabeza (gigante) la empuja hacia abajo. Arreglé por deducción.
4. **Muchos cambios por versión** (8 en la v6, 9 en la v7). Se tocan entre sí y un arreglo puede romper otra cosa
   sin que nadie lo note.
5. **El programa creció a ~1800 líneas de reglas a mano** con ~60 umbrales, y tres capas de suavizado en serie
   (filtro de la señal → límite de velocidad → filtro del hueso, más mantener/volver/entrar suave). Eso explica bien
   "dedos lentos": los dedos pasan por todas las capas. No lo medí nunca con datos reales.
6. **La entrada tiene un techo.** A 2,5 m (videos anteriores) un dedo medía ~6 px en la imagen de la cámara; en este
   video, a ~1,2 m, ~13 px. Que se toquen las yemas con dedos de 6–13 px, tapándose entre sí, está al límite de lo
   que puede ver una webcam a 720p, con cualquier programa.
7. **Las proporciones de tiesme** (cabeza del ancho de los hombros, antebrazo 1,7×) hacen que copiar posiciones
   choque siempre con su cabeza. Lo resolví con reglas; es lo más difícil de todo y donde más se nota.

## 3. Qué encontré afuera

- **Nadie publica comparaciones serias de dedos por webcam.** Lo que hay son listas de productos. La mayoría de las
  herramientas de webcam (XR Animator, Warudo, VSeeFace, BlendArMocap) usan **MediaPipe por dentro, igual que
  nosotros**: el límite de detección sería el mismo; cambia cómo procesan y pasan al personaje.
- **Webcam Motion Capture** (programa pago, con prueba gratis) promete tracking de manos y dedos de buena calidad,
  tren superior y cara, y manda los datos por VMC (el formato estándar de VTubers) a Unity, Blender, etc.
- **XR Animator** (gratis, código abierto, navegador): MediaPipe, cuerpo + manos + cara sobre modelos VRM, puede
  procesar un video grabado, y ~30 fps de detección en una PC común.
- **Warudo** (gratis, Unity): MediaPipe para cara y manos/dedos, pensado para shows en vivo, acepta personajes
  propios. Pide calibrar las manos y que estén siempre enteras en cuadro.
- **MocapForStreamer**: tren superior con **dos webcams** (estéreo), justamente para ganar profundidad (codos,
  brazos cruzados, manos cerca de la cara: lo que más nos cuesta).
- **Mejores modelos que MediaPipe**:
  - **RTMW** (MMPose, licencia Apache 2.0): cuerpo + manos + cara, 133 puntos, el modelo abierto más preciso en el
    benchmark de cuerpo entero (70 mAP). Corre en Python con GPU; habría que mandarle los datos a la página.
  - **PEAR** (enero 2026): reconstruye el cuerpo 3D entero con manos y cara en ~10 ms por imagen. Da rotaciones de
    articulaciones (no puntos sueltos), lo que evitaría codos inventados. Ojo: usa SMPL-X/MANO, con licencia de uso
    no comercial; para una muestra habría que revisarlo.
  - **WiLoR** (CVPR 2025): manos 3D muy estables desde una sola cámara, sin filtros temporales.
- **Cámara con profundidad** (Orbbec Femto Bolt, sucesora de la Kinect): esqueleto 3D robusto de cuerpo (32
  articulaciones) pero **sin dedos**, y hay reportes de que pierde las manos delante del cuerpo. Sirve para cuerpo y
  codos, no para lo fino.
- **MediaPipe Gesture Recognizer**: se le puede enseñar gestos propios (con fotos por categoría) y reconoce en vivo
  qué forma hace la mano.
- **Modelo de pose "heavy"** de MediaPipe: más preciso que el "full" que usamos, más lento (pesa 35 MB contra 14).

## 4. Opciones para avanzar

| Opción | Qué resuelve | Costo | Riesgo |
|---|---|---|---|
| **A. Medir bien** — un botón en la página que grabe la cámara a resolución completa + un registro por cuadro de lo que detecta MediaPipe y lo que hace tiesme. Grabás una vez 10 clips cortos de prueba (una acción por clip). Cada versión se prueba contra esos mismos clips: hojas lado a lado y números reales. | Comparar versiones de verdad; saber en qué etapa falla cada cosa; dejar de arreglar a ciegas. | Chico (código) + ~15 min tuyos | Ninguno |
| **B. Mejor entrada** — pedirle 1920×1080 a la C920, más luz de frente (menos borroneo en dedos rápidos), cámara vertical para ver la cadera. Opcional: webcam 4K. | +50% de píxeles en cara y manos gratis; menos manos perdidas. | Chico | Bajo (puede bajar los fps) |
| **C. Prueba de diagnóstico** — pasar los mismos clips por XR Animator y probar Webcam Motion Capture con tu cámara. | Responde la pregunta clave: ¿el límite es la webcam/MediaPipe o es nuestro código? | Chico (1–2 h tuyas) | Ninguno |
| **D. Diseño híbrido** — el tracking mueve lo grande (cabeza, tronco, brazos, dónde van las manos) y las **formas de mano** se reconocen (puño, abierta, señalar, OK, paz, yemas juntas…) y disparan **poses de mano animadas por vos en Blender**. Igual para 3–4 poses difíciles (manos en las mejillas, brazos cruzados, tapar la cara): se reconocen y tiesme hace su versión animada. | Dedos siempre limpios y nunca rotos; las poses difíciles quedan como las diseñes, con sus proporciones. Usa tu oficio. | Mediano | Si no reconoce el gesto, queda la pose aproximada |
| **E. Simplificar nuestro programa** con los datos de A: sacar capas de suavizado, revisar mapeo de cara y codos uno por uno. | Dedos más rápidos, menos reglas que se pisan. | Mediano | Bajo si se mide con A |
| **F. Cambiar de detector** (RTMW o PEAR en Python con la GPU, mandando datos a la página). | Mejor cuerpo, codos y manos que MediaPipe. | Grande | Alto (otra tecnología, licencias, poco tiempo) |
| **G. Cámara de profundidad** o segunda webcam. | Profundidad: codos, brazos cruzados, de espaldas. | Grande + compra | Alto; no arregla dedos |

## 5. Mi recomendación

1. **A + B ya** (base para todo lo demás, barato). Sin esto cualquier cambio es a ciegas.
2. **C** en paralelo: si una herramienta hecha con la misma cámara anda mucho mejor, el problema es nuestro código
   (y conviene E o pasarse a esa herramienta); si también falla en dedos y manos en la cara, el límite es la
   entrada y la salida es D.
3. **D** para la muestra: es lo que más se va a notar en la cabina y lo que menos depende de la webcam.
4. **E** de a un cambio por vez, medido con los clips.
5. **F/G** solo si después de esto hace falta y hay tiempo.

Y dejo de hacer: versiones con 8 arreglos a la vez probadas en el demo sintético.

## 6. Lo que necesito que decidas

1. ¿Cuándo es la muestra? (define si F/G tienen sentido).
2. ¿Qué tiene que hacer tiesme sí o sí? Una lista corta (ej.: mirar donde mirás, saludar, manos en la cara, brazos
   cruzados, señalar…). ¿Las formas finas de dedos son imprescindibles o un plus?
3. ¿Te sirve el diseño híbrido (D), con poses de mano y algunas poses de cuerpo animadas por vos?
4. ¿Hay presupuesto para luz, una webcam 4K o una cámara de profundidad?
5. ¿Grabás la batería de 10 clips cuando esté el botón de grabar (A)?

## Fuentes
- [Webcam Motion Capture vs XR Animator (2026)](https://www.itechguides.com/compare/xr-animator-vs-webcam-motion-capture/) · [Webcam Motion Capture en Steam](https://store.steampowered.com/app/1759730/) · [Best AI Motion Capture Tools 2026](https://uthana.com/resources/best-ai-motion-capture-tools)
- [XR Animator (GitHub)](https://github.com/ButzYung/SystemAnimatorOnline) · [Warudo: MediaPipe](https://docs.warudo.app/docs/mocap/mediapipe)
- [App de tren superior con 2 webcams (80.lv)](https://80.lv/articles/an-app-to-capture-upper-body-motion-data-with-2-webcams)
- [RTMW (arXiv 2407.08634)](https://arxiv.org/abs/2407.08634v1) · [PEAR (arXiv 2601.22693)](https://arxiv.org/abs/2601.22693) · [WiLoR (CVPR 2025)](https://openaccess.thecvf.com/content/CVPR2025/papers/Potamias_WiLoR_End-to-end_3D_Hand_Localization_and_Reconstruction_in-the-wild_CVPR_2025_paper.pdf) · [Multi-HMR](https://mlanthology.org/eccv/2024/baradel2024eccv-multihmr)
- [MediaPipe Hands (paper)](https://ar5iv.labs.arxiv.org/html/2006.10214) · [Validación clínica de MediaPipe Hand por distancia](https://arxiv.org/pdf/2308.01088) · [Gestos a 2/3/4,5 m](https://ejournals.itda.ac.id/index.php/avitec/article/download/3132/pdf)
- [MediaPipe Gesture Recognizer: gestos propios](https://ai.google.dev/mediapipe/solutions/customization/gesture_recognizer) · [BlazePose lite/full/heavy](https://blog.tensorflow.org/2021/05/high-fidelity-pose-tracking-with-mediapipe-blazepose-and-tfjs.html)
- [Orbbec Femto Bolt](https://www.orbbec.com/?p=21233) · [Foro Orbbec: precisión del body tracking](https://3dclub.orbbec3d.com/t/body-tracking-accurancy/1198)
