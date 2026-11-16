# Investigación: tracking con webcam para mover a tiesme (17/10/2026)

Búsqueda a fondo de cómo resuelven esto otros (comunidad VTuber, investigación, proyectos abiertos) y qué se puede
sumar o cambiar. Cada punto dice qué aplica a qué parte del cuerpo (ver `FICHA_PROBLEMAS.md`).

## 0. Conclusión corta
1. **La comunidad VTuber usa casi toda MediaPipe, igual que nosotros** (XR Animator, Warudo, BlendArMocap). Para
   dedos finos con webcam no hay magia: los VTubers que quieren dedos buenos usan Leap Motion (hasta 1,1 m) o guantes.
2. **Nuestro problema más difícil no es común en VTubers**: sus avatares (VRM) tienen proporciones humanas. El de
   tiesme (cabeza del ancho de los hombros, antebrazo 1,7×) es un problema de **retargeting a otra morfología con
   contactos**, que está estudiado en investigación (ver 4) y tiene una solución con nombre.
3. **Un proyecto abierto (MikanTrack) documenta lecciones que nos tocan de lleno**: no usar la profundidad 3D del
   modelo de pose cuadro a cuadro, sacar el codo de "rayo de la cámara + largo del antebrazo", tratar la mano como
   una palma rígida + ángulos de dedos, y que la mitad del temblor viene de luz y ajustes de cámara.
4. **Hay detectores mejores que el de pose de MediaPipe** (RTMPose / RTMW) y ya corren en el navegador, pero hay que
   medir si llegan a la velocidad necesaria.
5. **Antes de seguir programando a ciegas, conviene una prueba de diagnóstico** con dos programas hechos (gratis o
   con prueba gratis) y tu misma cámara: si mueven manos y codos mucho mejor que nosotros, el problema es nuestro
   código; si fallan igual, el límite es la cámara/MediaPipe.

## 1. Qué usa la comunidad VTuber
- **XR Animator** (gratis, código abierto, navegador/app): MediaPipe; cara + cuerpo + manos sobre avatares VRM/MMD;
  manda datos por VMC; ~30 fps de detección en una PC común; tiene una versión con varias cámaras que triangula los
  puntos en 3D (calibración de 30 s caminando). [GitHub](https://github.com/ButzYung/SystemAnimatorOnline)
- **Warudo** (gratis, Unity): MediaPipe para cara y manos. Lo que documentan: descartar la mano si la muñeca está
  cerca del borde de la imagen (**ya lo hacemos**, v5), poner el campo de visión real de la cámara para estimar la
  profundidad de las manos (**ya lo hacemos**), calibrar la mano (mano relajada, palma a la cámara), y tener las manos
  siempre enteras en cuadro. [Docs MediaPipe](https://docs.warudo.app/docs/mocap/mediapipe) ·
  [Personalizar el tracking](https://docs.warudo.app/docs/mocap/body-tracking)
- **Webcam Motion Capture** (pago, prueba gratis de todas las funciones de tracking): tren superior, manos y dedos,
  cara; manda VMC; avatares VRM. Sus consejos de uso: cuarto luminoso y despejado, **cámara a la altura de la
  cabeza** y de frente, cara y pecho visibles sin estar muy cerca, **codos visibles**, **mangas arremangadas** para
  que se vean antebrazos y manos, y 640×360 alcanza para tren superior. [Sitio](https://webcammotioncapture.info/)
- **MocapForStreamer**: tren superior + manos + cara con **dos webcams iguales** (estéreo) para tener profundidad
  real. [80.lv](https://80.lv/articles/an-app-to-capture-upper-body-motion-data-with-2-webcams)
- **VSeeFace / VTube Studio**: cara con webcam; las manos con Leap Motion.
- **Kalidokit** (lo que no usamos en la v3): calcula rotaciones simples desde los puntos de MediaPipe; su propio
  README dice que está discontinuado. [README](https://cdn.jsdelivr.net/gh/yeemachine/kalidokit@main/README.md)

## 2. Lecciones de MikanTrack (proyecto abierto de tracking de manos y brazos)
[GitHub](https://github.com/brendanwalker/MikanTrack)
- Para el **cuerpo no usa la pose de MediaPipe sino RTMPose-m**; MediaPipe solo para las manos.
- Dice que la **profundidad 3D que da el modelo de pose es "inservible cuadro a cuadro"**: todo lo que está por
  encima de la muñeca lo resuelve con rayos de la cámara y largos conocidos. → *Nosotros usamos esa profundidad (z
  de los puntos del cuerpo, filtrada) para codos y muñecas.*
- **Codo**: el rayo de la cámara que pasa por el codo detectado se cruza con una esfera del largo del antebrazo
  alrededor de la muñeca. Después, en el avatar, un IK de dos huesos usa ese codo medido como guía. → *Nosotros
  hacemos el IK pero el codo detectado pesa como máximo 55%.*
- **Mano**: una palma rígida de 6 grados de libertad (posición + orientación, resuelta con solvePnP contra una mano
  métrica) + un ángulo de flexión por dedo. Dice que la flexión de los dedos es "la salida más confiable" de la red.
- **Largo de brazo**: se mide como múltiplo del ancho de hombros (medirlo directo da 20% corto si el brazo no está
  recto y de frente).
- Mano perdida: mantiene la última pose 250 ms (nosotros 800 ms).
- Avisos: los puntos de MediaPipe **dependen del punto de vista** (dos cámaras pueden discrepar decenas de grados);
  la "confianza" de presencia queda cerca de 1 aun en vistas malas (de canto); **el temblor muchas veces viene de la
  luz o de los ajustes de la cámara**.

## 3. Detectores: qué hay mejor que lo que usamos
- **MediaPipe Holistic Landmarker** (existe para web en la misma librería): cara + manos + cuerpo en una sola tarea.
  Nosotros armamos algo parecido a mano (recortes de cara y manos desde el cuerpo). Se puede comparar.
  [Guía](https://developers.google.com/edge/mediapipe/solutions/vision/holistic_landmarker/web_js)
- **Modelo de pose "heavy"** de MediaPipe: más preciso que el "full" que usamos, más lento. Prueba barata.
- **RTMPose / RTMW** (MMPose, licencia libre Apache 2.0): RTMW-l es el primer modelo abierto que supera 70 mAP en el
  benchmark de cuerpo entero con manos y cara (133 puntos). Hay versión 3D (RTMW3D).
  [Paper RTMW](https://arxiv.org/abs/2407.08634v1) · [MMPose](https://github.com/open-mmlab/mmpose/tree/main/projects/rtmpose)
  - **En el navegador**: `rtmlib-ts` corre RTMW3D (133 puntos 3D) con ONNX Runtime Web (WebGPU/WebGL/wasm), sin
    servidor; su README habla de ~200 ms por cuadro en wasm. Con WebGPU (tu RTX 3060) hay que medirlo.
    [rtmlib-ts](https://github.com/GOH23/rtmlib-ts) · [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html)
  - En Python (con la GPU) es más rápido y probado ([rtmlib](https://github.com/Tau-J/rtmlib)); habría que mandar
    los datos a la página (el servidor Node puede hacer de puente).
- **Cuerpo 3D completo con manos (malla)**: PEAR (2026, ~10 ms por imagen, cara + cuerpo + manos) da rotaciones de
  articulaciones, no puntos sueltos. Usa SMPL-X/MANO: licencia de uso no comercial, revisar para la muestra.
  [PEAR](https://arxiv.org/abs/2601.22693)

## 4. Proporciones distintas y contactos con el cuerpo (lo central para tiesme)
- **Mapeo egocéntrico de restricciones de superficie del cuerpo** (Molla, Debarba, Boulic, IEEE TVCG 2018): la
  posición de la mano se expresa **relativa a la superficie de cada parte del cuerpo**, normalizada por el tamaño de
  esa parte, y se reconstruye sobre el personaje. Así, si te tocás la mejilla, el personaje se toca *su* mejilla
  aunque su cabeza sea enorme; si cruzás los brazos con las manos sobre los brazos, las manos quedan sobre *sus*
  brazos. Funciona en vivo con IK analítico. [EPFL](https://infoscience.epfl.ch/record/229912)
- **Retargeting de autocontactos en tiempo real hasta los dedos** (Delahaye, Herbelin, Boulic, EGVE 2023): lo
  extiende a los dedos; en el estudio con usuarios se prefirió claramente frente a copiar el movimiento tal cual.
  Dicen que copiar la pose directo en un avatar de otras proporciones produce **interpenetraciones o huecos**, y que
  hay que corregir cuadro a cuadro. [EG](https://diglib.eg.org/handle/10.2312/egve20231311)
- **ReConForM** (2025): retargeting en tiempo real a morfologías diversas preservando contactos, con vértices clave
  de la malla. Muestra un compromiso: **suavizar más reduce el ruido pero aumenta la interpenetración**.
  [arXiv](https://arxiv.org/abs/2502.21207)
- **EchoAvatar** (2026): para que la mano no atraviese el cuerpo sin "saltos de empuje", define un cilindro suave
  alrededor de la columna y empuja la mano hacia afuera en el plano horizontal.
  [arXiv](https://arxiv.org/pdf/2605.28272)
- Industria (MotionBuilder, iClone): con proporciones distintas "casi siempre" hay que ajustar el alcance de mano,
  codo y pecho, y los problemas aparecen en las extremidades. [OSU](https://www.asc.ohio-state.edu/berezina-blackburn.1/classes/mocap/HumanProcessingMobu.html)
- → *Lo nuestro (desde la v3) es una versión muy simplificada de esto: solo relativo a la cabeza, con elipsoides.
  Por eso las manos no llegan a la cara, los brazos cruzados quedan mal y las manos atraviesan el pecho.*

## 5. Suavizado
- El **filtro One Euro** es el estándar (MediaPipe lo usa por dentro). Se ajusta bajando el corte mínimo (menos
  temblor) y subiendo beta hasta que los movimientos rápidos no tengan retardo; los valores dependen de los fps.
  [1€ (npm)](https://www.npmjs.org/package/1eurofilter) · [hilo](https://github.com/asus4/tf-lite-unity-sample/discussions/287)
- → *Nosotros apilamos tres capas (One Euro en la señal + límite de velocidad + filtro en cada hueso + mantener /
  volver / entrar suave). Es la causa más probable de los dedos lentos.*

## 6. Hardware
- **Leap Motion Controller 2**: dedos muy buenos, pero alcance de **10 a 110 cm**: no sirve a 2,5 m (sí si hubiera
  una zona de manos cerca). [Datasheet](https://www.ultraleap.com/datasheets/leap-motion-controller-2-datasheet_issue13.pdf)
- **Cámara de profundidad** (Orbbec Femto Bolt, sucesora de la Kinect): esqueleto 3D robusto de cuerpo, sin dedos;
  hay reportes de que pierde las manos delante del cuerpo. [Femto Bolt](https://www.orbbec.com/?p=21233) ·
  [foro](https://3dclub.orbbec3d.com/t/body-tracking-accurancy/1198)
- **Dos webcams iguales (estéreo)**: profundidad real para codos, brazos cruzados y manos cerca del cuerpo
  (MocapForStreamer, versión multicámara de XR Animator). Requiere calibración.
- **Más píxeles y luz**: 1080p (ya en la v9), luz frontal difusa; Webcam Motion Capture insiste en codos visibles y
  mangas arremangadas.

## 7. Qué propongo hacer con esto (para charlar)
1. **Diagnóstico (30–60 min tuyos, sin código)**: probar Webcam Motion Capture (prueba gratis) y XR Animator con tu
   C920, mismo lugar y luz, haciendo 4 o 5 gestos de la batería. Mirar: dedos, codos, manos en la cara, cabeza abajo.
   Responde la pregunta que define todo lo demás: ¿el límite es la cámara/MediaPipe o es nuestro código?
2. **Grabar la batería con la v10** para tener la evidencia de cada parte del cuerpo en la ficha.
3. Según lo que salga, por parte del cuerpo (ver ficha): codos con "rayo + largo" (MikanTrack), manos y contactos
   con el mapeo egocéntrico (Molla/Boulic), una sola capa de suavizado bien ajustada, y probar RTMW/heavy para el
   cuerpo si el diagnóstico dice que el detector es el límite.

---

# Segunda pasada (17/10) — profundizar lo encontrado, variantes y la webcam
Decisión del usuario: por ahora **no se suma otra cámara**; hay que sacarle todo a la C920.
No pude leer el texto completo de algunos papers (los sitios bloquean la descarga); donde uso solo el resumen, lo digo.

## A. Lo nuevo, ordenado por lo que nos puede servir

### A1. El paper oficial de MediaPipe (BlazePose GHUM Holistic, 2022), medido a 2–4 m como nosotros
[ar5iv](https://ar5iv.labs.arxiv.org/html/2206.11678)

| Modelo de pose | Precisión 2D (mAP) | Error 3D | GPU de escritorio |
|---|---|---|---|
| Lite | 45,0 | 45 mm | 7 ms |
| **Full (el que usamos)** | 62,6 | 39 mm | 8 ms |
| **Heavy** | **68,1** | **36 mm** | **10 ms** |

- **Heavy cuesta ~2 ms más por cuadro** en una GPU de escritorio y acierta bastante más. Prueba barata (cambiar el
  archivo del modelo).
- **Manos**: el Holistic oficial toma la zona de la mano desde el cuerpo y después hace un **segundo recorte más
  preciso a mayor resolución** antes de detectar los dedos. Ese re-recorte **bajó el error de la mano de 27 a 18 mm**.
  Nosotros (desde la v7) recortamos desde la muñeca del cuerpo **sin ese segundo paso**: candidato concreto para
  manos y dedos. También se puede probar el `HolisticLandmarker` oficial, que ya lo trae.
- Profundidad: el paper reconoce que la profundidad desde una imagen es ambigua por naturaleza.

### A2. Cómo funciona el mapeo egocéntrico (y sus variantes)
- **Molla, Debarba, Boulic (TVCG 2017/2018)** (resumen y abstract, el texto completo está bloqueado): (1) una
  calibración extra de la **superficie del cuerpo** de quien actúa (se muestrean puntos del cuerpo); (2) en vivo, la
  posición de cada extremidad se expresa en **coordenadas relativas a esa superficie** ("bodycentric"); (3) en el
  personaje, que tiene su propia superficie calibrada, esas coordenadas se convierten en objetivos y un **IK
  analítico** arma la pose. Su ejemplo de por qué copiar ángulos falla: con las manos en la panza, un personaje con
  más panza las metería adentro. [DOI](https://doi.org/10.1109/tvcg.2017.2708083) · [EPFL](https://infoscience.epfl.ch/record/229912)
- **Interaction mesh** (Ho, Komura, Tai, SIGGRAPH 2010): una malla que une las articulaciones; al adaptar el
  movimiento se minimiza cuánto se deforma esa malla, lo que **preserva las relaciones entre partes y reduce
  interpenetraciones**; funciona en tiempo real. [Northumbria](https://researchportal.northumbria.ac.uk/en/publications/spatial-relationship-preserving-character-motion-adaptation/)
- **ReConForM** (2025): usa **vértices clave de la malla** transferidos automáticamente al personaje y da más peso a
  los rasgos relevantes cerca de los contactos. [arXiv](https://arxiv.org/abs/2502.21207)
- Para tiesme ya tenemos media base: las superficies de su cabeza, gorra y torso medidas en la malla (v3–v6). Faltaría
  la superficie de tu cuerpo (aproximada desde los puntos de MediaPipe y tus medidas) y la de sus brazos.

### A3. Codos
- **Ángulo de giro del codo ("swivel")**: se proyecta el codo detectado sobre el plano perpendicular al eje
  hombro–muñeca y se mide el ángulo alrededor de ese eje, **en un marco del cuerpo** (que gira con el torso), con
  suavizado. Es la forma estándar de pasar "dónde está tu codo" a un IK de dos huesos. Un polo lejos del codo es más
  estable. [mittens IK](https://docs.rs/crate/mittens-engine/0.7.0/source/docs/spec/ik-system.md) · [Maya](https://forums.autodesk.com/t5/maya-animation-and-rigging/polevector-hates-me/m-p/12460319)
- La ambigüedad adelante/atrás de un brazo visto en 2D es inherente (VNect). [VNect](https://arxiv.org/pdf/1705.01583)
- VRChat agregó prevención automática de **codos que atraviesan el torso** y escala el avatar por la envergadura de
  los brazos. [VRChat 2022.2.1](https://docs.vrchat.com/docs/vrchat-202221)

### A4. Dedos
- El método más usado para pasar dedos de MediaPipe a otra mano (en robótica, que tiene el mismo problema de
  proporciones): **copiar las direcciones de cada falange** (no las posiciones), con **límites articulares** y una
  pérdida robusta que ignora puntos raros; mantener la última pose válida si falla; usar solo la articulación local de
  la mano. [ORCA](https://arxiv.org/pdf/2606.14561) · [Wuji/NVIDIA](https://nvidia.github.io/IsaacTeleop/main/references/retargeting/wuji.html)
- Un estudio de 2026 reporta que MediaPipe tiene **"enredo de dedos"** y que WiLoR tuvo bastante menos error (no es
  con webcam a distancia: es solo indicativo). [WristPP](https://arxiv.org/pdf/2603.00606)

### A5. Suavizado contra retardo
- Todo filtro tiene el compromiso **temblor ↔ retardo**. La predicción (Kalman, alfa-beta, doble exponencial) reduce
  el retardo pero amplifica el ruido; el One Euro balancea solo pero no predice. Hay una variante con predicción:
  N-euro (Snap, 2023). [N-euro](https://cave.cs.columbia.edu/Statics/publications/pdfs/Shao_Mob23.pdf) ·
  [explicación](https://roadtovr.com/?p=166213)
- Nosotros apilamos capas: es probable que sumen retardo sin bajar más el temblor. Una sola capa bien ajustada (y
  quizás una predicción leve en las manos) es lo que indica la bibliografía.

### A6. 3D desde 2D mirando varios cuadros
- Los modelos que mejoran la profundidad mirando una secuencia (estilo VideoPose3D) usan cuadros **futuros**: en vivo
  agregan retardo. Por eso algunos trabajos en vivo usan un solo cuadro. Por ahora no conviene.
  [SnapPose3D](https://iris.unimo.it/retrieve/afd30983-368c-42d7-af29-ac02400d2182/SnapPose_icpr.pdf)

## B. La webcam (Logitech C920): configuración

### Medido en esta PC (ffmpeg)

| Tamaño | Sin comprimir | Comprimido (MJPEG / H.264) |
|---|---|---|
| 1920×1080 | 5 fps | 30 fps |
| 1280×720 | 10 fps | 30 fps |
| 640×360 | 30 fps | 30 fps |

- A 1080p y a 720p, para tener 30 fps Chrome recibe la imagen **comprimida** (MJPEG): la compresión puede ensuciar
  detalles finos como los dedos. Vale comparar 1080p contra 720p con los mismos clips.

### Lo que dice la experiencia de otros
- **Poca luz → menos cuadros y borroneo**: con exposición automática, en luz baja la C920 alarga la exposición y baja
  a 24 fps o menos; la ganancia alta lo empeora. En tu video 00-12-10 se ven las manos borrosas en los movimientos
  rápidos (0:20–0:22). Recomendado: **más luz, exposición manual corta, ganancia baja y RightLight apagado**
  (la exposición mínima de la C920 es 300 µs, en pasos de 100 µs).
  [CyberLink](https://forum.cyberlink.com/forum/posts/list/52368.page) · [OBS](https://obsproject.com/forum/threads/c920-drops-frames.83742) ·
  [Kinovea](https://www.kinovea.org/en/forum/viewtopic.php?pid=3346) · [MathWorks](https://www.mathworks.com/matlabcentral/answers/329833-enforce-fixed-frame-rate-with-webcam)
- **Antiparpadeo**: en Argentina la red es de **50 Hz**, así que la cámara va en 50 Hz. Algunas luces LED parpadean
  igual (PWM): en ese caso hay que cambiar la luz o usar 25 fps.
  [OBS](https://obsproject.com/forum/threads/heavy-flickering-on-50hz-60hz.133440/) · [OctoPrint](https://community.octoprint.org/t/logitech-webcam-c922-change-hz/12033)
- **Autofoco**: si "busca" el foco, borronea. Mejor foco fijo a la distancia de la persona.
- **Balance de blancos**: fijo, para que el color no cambie durante la muestra.
- Consejos de Webcam Motion Capture: cámara a la altura de la cabeza, codos visibles, **mangas arremangadas**, cuarto
  luminoso y despejado.

### Lo que se puede hacer desde nuestra página (sin el programa de Logitech)
- Chrome puede **leer y fijar** exposición, foco, balance de blancos y zoom de la cámara (`getCapabilities` /
  `applyConstraints`). En Windows depende del driver: hay que ver qué acepta la C920. Así la cabina arrancaría siempre
  con la misma configuración. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Constraints) ·
  [estado por plataforma](https://github.com/w3c/mediacapture-image/blob/main/implementation-status.md) · [webrtcHacks](https://webrtchacks.com/?p=3807)
- Medir en el panel los **cuadros por segundo reales** de la cámara. Intenté medirlo desde el video de OBS y no se
  puede: la compresión de OBS lo tapa.

## C. Propuestas actualizadas (de más barata a más cara)
1. **Configurar bien la cámara**: luz, exposición manual corta, ganancia baja, 50 Hz, foco fijo, y mostrar en el
   panel los cuadros por segundo reales y la configuración. Afecta a todas las partes del cuerpo.
2. **Re-recorte de la mano** (como el Holistic oficial: error de la mano de 27 a 18 mm) o probar el
   `HolisticLandmarker`.
3. **Pose heavy** (+5,5 de precisión, ~2 ms más por cuadro).
4. **Una sola capa de suavizado** (dedos lentos), quizás con predicción leve en las manos.
5. **Codo por ángulo de giro (swivel)** medido en el marco del cuerpo, y/o "rayo + largo del antebrazo".
6. **Dedos por direcciones de falanges con límites articulares**.
7. **Mapeo egocéntrico** para los contactos con el cuerpo (cara, pecho, brazos cruzados) y los choques.
8. RTMW en el navegador (medir la velocidad antes de decidir).

---

# Tercera pasada (17/10) — comunidad de código abierto (GitHub), X y foros
Reddit **no se pudo**: el sitio bloquea el acceso de mis herramientas (no permite a Anthropic) y no lo esquivé. Si
querés sumar Reddit, podés buscar vos y pegarme los hilos. Busqué en cambio en foros técnicos (three.js, Unity,
TouchDesigner, VRChat) y en X.

## D1. XR Animator por dentro (leí su código: es el proyecto abierto más completo, ~1.900 estrellas, actualizado sept. 2026)
[GitHub](https://github.com/ButzYung/SystemAnimatorOnline) · archivos `js/mocap_lib_module.js` y `MMD.js/MMD_SA.js`
- **Modelos**: pose "heavy" si se elige calidad "Best" (si no, "full"), o el `HolisticLandmarker`; manos con el
  detector de manos sobre **recortes tomados desde el cuerpo**, que se **amplían cuando la mano es chica**.
- **Suavizado del cuerpo: filtra solo la profundidad (z)**, con One Euro (30 Hz, corte mínimo 1, beta 1, corte de
  derivada 2). Las posiciones en la imagen (x, y) las deja **crudas**: el filtro de x, y está desactivado en el
  código. → *Nosotros suavizamos todo, también lo que ya es confiable.*
- **Suavizado de los dedos: relativo a la palma.** Resta la posición de la muñeca, filtra la forma de la mano (One
  Euro, corte 1 Hz, beta casi 0) y vuelve a sumar la muñeca. Así **mover la mano rápido no la atrasa**; solo se
  suaviza la forma de los dedos. → *Candidato directo para DED-2 (dedos lentos) sin sumar temblor.*
- **Profundidad de las manos al 50%** (opción `depth_scale_percent`, por defecto 50): achica a la mitad lo que la mano
  se acerca o se aleja según la profundidad estimada, porque es lo más ruidoso.
- **Choques de las manos con el cuerpo** ("body colliders"): **varias formas simples por zona**: esferas en la cabeza
  (radio = el mayor entre ancho de hombros/3 y el alto del cuello), **dos esferas en el pecho** (radio = ancho de
  hombros/4) y cápsulas en la cintura; reacción **"z_push"** (empujar hacia adelante, como nuestro choque desde la
  v6) e **"imán"** (atraer la mano a la superficie, como nuestro contacto de la v7); **tamaño ajustable por zona** en
  el panel. → *Confirma la dirección de nuestros choques, pero con más formas por zona y tamaños ajustables en vez de
  un solo elipsoide fijo por parte.*
- Incluye **fingerpose**, un clasificador de gestos de mano por curvatura y dirección de cada dedo
  ([fingerpose](https://github.com/andypotato/fingerpose)) → base posible para "formas de mano reconocidas".
- Corre MediaPipe en un **Web Worker** (otro hilo) para que el render no se frene: dicen 60 fps de render y 30 de
  detección en una PC común. → *Nosotros corremos todo en el mismo hilo (20 fps con OBS).*

## D2. Otros proyectos abiertos
- **VRM Studio** (app VTuber en el navegador): Holistic en Web Worker, IK de dos huesos que usa **el codo detectado al
  100%** como guía, suavizado fijo, filtro de Kalman con un deslizador. Más simple que lo nuestro.
  [GitHub](https://github.com/vucinatim/vrm-studio)
- **three-mediapipe-rig** (módulo three.js): rotaciones por ángulos, mapa de huesos configurable; avisa que correr
  cara + cuerpo + manos baja los fps. [GitHub](https://github.com/bandinopla/three-mediapipe-rig)
- **SysMocap** (MediaPipe + Kalidokit, medio cuerpo con manos, carga FBX) [GitHub](https://github.com/xianfei/SysMocap) ·
  **MesekaiUnity** (brazos, dedos y cabeza en Unity) [GitHub](https://github.com/Neleac/MesekaiUnity) ·
  **MediaPipeUnityPlugin** (base de varios proyectos Unity) [GitHub](https://github.com/homuler/MediaPipeUnityPlugin) ·
  **VRM Motion Capture** (Holistic + Kalidokit, experimento 2023) [GitHub](https://github.com/makoto357/VRM-Motion-Capture-with-MediaPipe) ·
  **finger-motion-replay** (solo dedos, three.js) [GitHub](https://github.com/DanielYuJie/finger-motion-replay)
- **Foro de three.js**: copiar las direcciones de los puntos a los huesos da manos deformadas y giros inestables; los
  que lo lograron hicieron un IK a mano, filtraron mucho e interpolaron; hay que pasar al espacio local de cada hueso
  y resolver en orden (cadera → columna → hombros → codos). Varios dicen que Kalidokit no es preciso.
  [hilo 1](https://discourse.threejs.org/t/how-can-i-animate-a-character-arm-hand-rig-from-recorded-mediapipe-landmark-data/92216) ·
  [hilo 2](https://discourse.threejs.org/t/avatar-manipulate-by-coordinates/60825)

## D3. Lo que dice la comunidad (X y documentación de apps)
- La desarrolladora de **VSeeFace**: el tracking de manos con Leap Motion era "muchísimo mejor" que lo posible con
  webcam. [X](https://twitter.com/emiliana_vt/status/1458137122435706881?lang=en)
- **VTube Studio** (manos con MediaPipe): "experimental", "lejos de perfecto"; los dedos rápidos los sigue, pero **las
  manos rápidas se pierden enseguida**; usa **gestos detectados** para disparar expresiones.
  [wiki](https://github.com/DenchiSoft/VTubeStudio/wiki/Hand-Tracking)
- **VBridger**: mezcla MediaPipe con visemas cuando detecta que hablás (otro ejemplo de híbrido).
  [X](https://x.com/V_Bridger_/status/1739759145082118530)
- El reconocedor de gestos de MediaPipe por defecto reconoce bien la mano de frente; para otras rotaciones hay que
  reentrenarlo. [X](https://x.com/kotsoft/status/1820641405368508599)
- TouchDesigner/Max: con poca luz la webcam baja de 30 fps y eso limita el tracking; conviene verificar que la cámara
  realmente entregue 30. [Cycling '74](https://cycling74.com/forums/n4m-facemesh-handpose-google-mediapipe)

## D4. Síntesis de las tres pasadas
1. **Con webcam nadie tiene dedos finos perfectos.** Los mejores resultados combinan tracking con **gestos
   reconocidos** (VTube Studio, VBridger, fingerpose en XR Animator).
2. **Cosas que hacen los proyectos maduros y nosotros no**: filtrar solo la profundidad del cuerpo; suavizar la forma
   de la mano relativa a la muñeca; achicar la profundidad de las manos; segundo recorte de la mano (Holistic
   oficial); pose heavy; MediaPipe en otro hilo; choques con varias formas por zona y tamaños ajustables.
3. **Cosas que ya hacemos parecido**: recortes de manos desde el cuerpo, choque con empuje hacia adelante y contacto
   tipo imán, descartar la mano en el borde, campo de visión real de la cámara.
4. **Lo que es propio de tiesme** (nadie lo resuelve hecho): las proporciones (cabeza enorme, antebrazo largo). Ahí la
   referencia es la investigación (mapeo egocéntrico) más los choques estilo XR Animator.
