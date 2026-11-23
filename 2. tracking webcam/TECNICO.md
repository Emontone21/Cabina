# Técnico — tracking de tiesme (para trabajar en el código y medir)

Leer cuando haga falta tocar código o medir. Estado actual y próximos pasos: `TRASPASO_CHAT.md`.

## Tecnología
- Chrome + **three.js 0.160** (FBXLoader) + **MediaPipe Tasks Vision 0.10.14** (Pose *full*, Hand ×2, Face con
  blendshapes y matriz). Todo local en `lib/` (sin internet). Webcam **Logitech C920** a 1920×1080 MJPEG 30 cps.
  GPU RTX 3060. Node para `servidor.js`. ffmpeg instalado (winget).
- Modelo `../1. tiesme modelo/tiesme_test01.fbx`: rig Mixamo, 65 huesos, en centímetros. Cara y gorra son texturas
  de video. **Proporciones raras**: cabeza tan ancha como los hombros, antebrazo 1,7× el brazo → retargeting propio
  por posiciones (copiar ángulos cruzaba los brazos y metía las manos en la cara).

## Cómo funciona (app.js, ~1800 líneas)
- **Detección con recortes (estilo Holistic)**: Pose en la imagen entera; con sus puntos se recortan y amplían
  (256 px) la cara y cada mano, y ahí corren Face y Hand. Los puntos vuelven a coordenadas de imagen entera.
  Umbrales en píxeles normalizados a 1280×720 (`fd.px`). Focal con el ancho original del sensor (`res.f`).
- **Presencia**: entra con cara + hombros dentro de la franja 9:16 central durante 0,6 s; sigue mientras se vean los
  hombros. Afuera → reposo. Postura neutra automática al entrar; entrada suave.
- **Modelo anclado** (nunca se traslada). Cadera (hueso Hips) gira/inclina si se ve; si no, inclinación por posición
  respecto del centro. Pecho por hombros; columna repartida; claviculas suben/bajan/adelante.
- **Cabeza** por la matriz de la cara; sin cara, por orejas/ojos/boca del cuerpo (offset aprendido). Límites.
- **Brazos**: muñeca → posición equivalente en tiesme (`mapToChar`, por tramos; relativa a la cabeza cerca de la
  cara) → IK de dos huesos con los largos de tiesme (`charIK`, busca el plano del codo si choca). Profundidad por
  escorzo + tamaño de mano + z de MediaPipe filtrada. Codo detectado: desde la v12 pesa entero si se ve bien (antes máx. 55%).
  Choques con elipsoides de cara, gorra y torso (`keepOutside`: empuje hacia adelante + contacto), antebrazos
  cruzados, codo que no atraviesa el torso. v10: `aimStable` (sin giros sobre el eje con el codo doblado) y muñeca
  máx. 70° (`WRIST_MAX`). v12: contactos con la cabeza (`contactHead`: la parte de tu mano
  sobre tu cara va a la superficie de su cara; mano al costado de la cabeza con el codo arriba → detrás de su
  cabeza), manos juntas (aplaudir), orden de los brazos cruzados por la profundidad del cuerpo de codo y muñeca, mano
  nueva confirmada en 2 cuadros, brazo que se pierde bajando vuelve a reposo sin retenerse.
- **Manos y dedos**: orientación por la mano detectada, giro de muñeca continuo y limitado (±100°), falanges con
  bisagra. "Mano a la cámara" solo con la mano grande.
- **Suavizado**: One Euro en metros sobre las señales + límite de velocidad + filtro por hueso + mantener 0,8 s /
  volver despacio / entrar suave (varias capas: probable causa de dedos lentos).
- **Cara**: estados del test de julio (`cara.js`) con blendshapes.

## Parámetros de la dirección (index.html?...)
| Parámetro | Qué hace |
|---|---|
| `demo` / `demo=<escena>` | persona sintética (escenas en `ESCENAS`) |
| `video=_pruebas/x.mp4` | usa un video en vez de la cámara |
| `video=...&analizar` | análisis cuadro a cuadro → `.../analisis_vN/x.jsonl` + una foto cada 0,5 s |
| `lote=grabaciones/<carpeta>` | analiza todos los videos de esa carpeta, uno por uno |
| `variante=nombre` | separa la carpeta del análisis (`analisis_vN_nombre`) para comparar ajustes |
| `comparado` | además guarda una foto grande por cuadro (`_c0001.jpg`…) para `video.js`. Lento: ~6 min por clip con el panel en segundo plano |
| `brazo=viejo`, `muneca=180` | apagan las correcciones de la v10 (para comparar) |
| `sin=1,3` | v12: apaga cambios de la v12 para medirlos por separado (1 codo entero · 2 mano retenida · 3 brazos cruzados · 4 aplaudir · 5 contactos cara/nuca) |
| `con=6` | v13: prende cambios que quedaron apagados por defecto (6 mano escondida al cruzar los brazos: descartado, empeoró B1-04) |
| `sin=7` | v13: apaga el cambio 7 (límite de velocidad de la mano sin acumular el corrimiento de los brazos cruzados) |
| `sin=8` / `con=9` | v13: 8 = mano escondida en el cruce va al brazo contrario (apagarlo con `sin=8`); 9 = mano visible atraída al brazo contrario, apagado (descartado) |
| `sin=10,11,12` | v13 (9/11, cuadros por segundo): 10 manos un cuadro sí y uno no, alternando con la cara · 11 cuerpo detectado sobre una copia de 640 de ancho · 12 el mp4 de la cara se pausa cuando la dibuja el canvas |
| `pose=full` | v13 (9/11): vuelve al modelo de cuerpo completo. **Por defecto va el liviano** (`pose_landmarker_lite.task`): cuerpo 23 → 15–16 ms por cuadro (−32 %), detecta el cuerpo en el 100 % de los cuadros del clip 1/11; la precisión en codos/manos no está medida. Los análisis anteriores al 9/11 se hicieron con full. |
| `sin=13` | v13 (9/11): apaga el **worker**: en vivo la detección vuelve al hilo principal (como antes). En el análisis (`analizar`/`lote`) y en el demo siempre va en el principal. |
| `workers=1` | v14 (9/11): un solo hilo para todo en vez de **tres en paralelo** (cuerpo, manos, cara). Medido con B2-08 en el panel de Claude: 14,6 → **30,4 detecciones/s** (el tope es el video, 30), cara fresca en 59 → 179 de los cuadros. |
| `con=10` | v14: vuelve a prender el cambio 10 (manos un cuadro sí y uno no), apagado desde la v14 porque bajaba a la mitad las actualizaciones de las manos. |
| `pose=lite` | v14: modelo de cuerpo liviano (desde la v14 el de siempre vuelve a ser el completo: el liviano perdía precisión). |
| `sin=16` / `con=17` | v14 "a lo TouchDesigner": 16 = el recorte de mano/cara se queda quieto (prendido, neutro en las mediciones); 17 = filtros y topes crudos (suavizado 0,4, reacción 0,8, tope 6 largos/s, retención 0,5 s): apagado, sin mejora medida y con más saltos. |

**Detección en otro hilo (cambio 13, `detector_worker.js`)**: en vivo, el loop manda cada cuadro de la cámara al worker
(`createImageBitmap` → `postMessage`) y usa el último resultado que haya llegado; mientras tanto sigue dibujando. Así los
fps del dibujo no dependen de MediaPipe (el panel H muestra `N fps · tracking M`: ahora pueden ser distintos). El worker
tiene la misma lógica que `detect()` (recortes guiados por el cuerpo): **si se cambia una, cambiar la otra**. Detalle: en un
worker de tipo módulo MediaPipe no puede cargar su wasm con `importScripts`; el worker lo carga a mano (`fetch` + `eval` del
archivo de `lib/`) y deja un `importScripts` vacío. El panel dice "MediaPipe: listo (otro hilo, GPU…)". Medido en el panel de
Claude: ida y vuelta mediana 55 ms, GPU.

**Dónde se va el tiempo** (9/11): el panel H muestra al lado de los fps los ms de cada parte (`cuerpo`, `manos`, `cara`, `rig`,
`caraTex`, `dibujo`; también `__tiesme.tiempos`). Medido en el panel de Claude con la RTX 4050 y el clip `v13_grabacion01`:
cuerpo ~22 ms, manos ~25 (las dos), cara ~34 (cada 2 cuadros), rig 1, dibujo 15 → **la detección es el 90 %**, y como corre en
el mismo hilo que el dibujo, tiesme se mueve a la velocidad de la detección. Con los cambios 10–12: 43,5 → 34,7 ms por
cuadro (−20 %). En vivo en la notebook de Agustín daba ~8 cuadros/s (120 ms por cuadro, 3× más lento que acá): revisar qué
GPU usa Chrome (`chrome://gpu` → GL_RENDERER; Windows → Configuración de gráficos → Chrome → Alto rendimiento) y que el
panel diga "MediaPipe: listo (otro hilo, GPU…)". Hecho el mismo día: **MediaPipe en un Web Worker** (cambio 13, arriba).

**Retraso: de dónde sale y cómo se mide** (v15, 22/11). Entre que te movés y que tiesme se mueve hay cuatro tramos:
1. **La cámara** (exposición, USB, decodificado): suele ser 60–130 ms y no depende del programa. El panel H lo muestra como
   `retraso: cámara N` (lo da Chrome por cada cuadro; con un video de prueba no aparece).
2. **La detección** (desde que se toma el cuadro hasta que el resultado llega al muñeco): `detección N ms` en el panel H.
   Con el cambio 18 es lo que tarda el hilo más lento, no la suma. Depende de la placa de video.
3. **Cada cuánto se detecta**: entre una detección y la siguiente tiesme sigue con lo último (a 12 por segundo son ~40 ms
   de atraso promedio; a 30, ~17).
4. **Los filtros** (suavizado). Se mide sin navegador con `filtros_sim.js` (abajo).

**Qué placa usa Chrome** (comprobado el 22/11 en la notebook de Agustín, RTX 4050 + Intel): con Chrome abierto,
`nvidia-smi` no listaba ningún `chrome.exe` y no había preferencia guardada en Windows → Chrome corría todo en la placa
Intel integrada (por eso cuerpo 39 ms y cara 29 ms; el panel de Claude, que sí usa la NVIDIA, da cuerpo ~22). Se cambia en
Windows: Configuración → Sistema → Pantalla → Gráficos → agregar Chrome → Opciones → **Alto rendimiento**, y reiniciar
Chrome. Para comprobarlo: `nvidia-smi` tiene que listar `chrome.exe`, y en el panel H tienen que bajar los ms de `cuerpo`.

| `res=720` | cámara a 1280×720 (por defecto 1080) |
| `sin=18,19` | v15 (22/11, retraso): 18 = cuerpo, manos y cara se detectan **a la vez** sobre el mismo cuadro (manos y cara se ubican con el cuerpo del cuadro anterior), el cuerpo se usa apenas llega y el cuadro siguiente se pide sin esperar al dibujo · 19 = los filtros reaccionan antes al arrancar un movimiento (corte de la velocidad 1 → 4 Hz en brazos y manos y 1 → 2 Hz en cabeza y torso; segunda etapa ×2 → ×3; suavizado 0,7 → 0,6; reacción 0,5 → 0,8). |
| `f=4,3,0.6,0.8,2` | v15: prueba valores del cambio 19 sin tocar el código: corte de la velocidad de brazos y manos (Hz), multiplicador de la segunda etapa, suavizado, reacción, corte de la velocidad de cabeza y torso (Hz). Lo que se omite queda por defecto. |
| `cada=2`, `hasta=8` | v15, solo en el análisis: `cada=2` detecta un cuadro sí y uno no (imita 15 detecciones por segundo en vivo; `cada=3`, 10); `hasta=8` analiza solo los primeros 8 s del clip. |
| `giro=90` | fuerza el giro de la imagen sin guardarlo. **Desde el 9/11 el giro por defecto es 90°** (cámara montada en vertical; la zona útil es toda la imagen); `giro=0` vuelve a la horizontal. Lo guardado con la tecla O manda sobre el defecto. |

## Herramientas (`_herramientas/`, se corren con node o bash)
| Archivo | Uso |
|---|---|
| `metricas.js` | `node metricas.js <carpeta analisis_vN> [<otra>]`: detección, movimiento por cuadro, saltos, involuntarios, dedos y cabeza (correlación, retardo), manos en la cara, atraviesa. Compara versiones. |
| `entrada_salida.js` | `node entrada_salida.js <analisis_vN> [<otro>]`: entrada y salida (ENT-1/2/3): cuándo engancha, mayor salto de cabeza y brazos en los 2 s siguientes, y al salir de cuadro cuándo dejaste la franja, cuándo te suelta y cuándo vuelve a reposo. |
| `brazos.js` | v12: `node brazos.js <analisis_vN> [<otro>]`: codo alto y giro de codo (tuyo vs tiesme), segundos con el brazo de tiesme "quedado arriba", saltos de mano, aplauso (distancia entre palmas) y nuca (palma detrás de la cabeza). `--linea <clip>`: línea de tiempo cada 0,5 s. Necesita registros v12 (campo `t3`). |
| `cruzados.js` | v13: `node cruzados.js <analisis_vN | x.jsonl> [<otro>] [--todos] [--linea]`: en los cuadros con TUS brazos cruzados, altura de antebrazos y codos (tuya y de tiesme), % de cuadros con un brazo de tiesme estirado (< 30°), doblez del codo y distancia entre sus brazos. Los registros v13 traen además `etapas` (por lado: alcance que pide la muñeca después de mapeo, cerca de la cámara, choque, cabeza, velocidad y cruce; 1,0 = brazo estirado del todo). |
| `movimiento.js` | v14: `node movimiento.js <x.jsonl | analisis_vN> [--linea]`: detecciones/s, % de cuadros con cuerpo y con cada mano, y por brazo cuánto de tu movimiento llega a tiesme (velocidad de su mano / velocidad de tu muñeca, en anchos de hombro) y con qué retraso. Sirve para registros en vivo (K) y de análisis. |
| `filtros_sim.js` | v15: `node filtros_sim.js <x.jsonl ...> [--cada=2]`: pasa TU movimiento grabado (los puntos del cuerpo de un registro, de análisis o en vivo) por una copia de los filtros con varios ajustes y dice, para cada uno, el **retraso** mientras te movés y el **temblor** mientras estás quieto. No abre el navegador: sirve para elegir valores en segundos. Los ajustes a comparar están arriba en el archivo (`AJUSTES`). |
| `retraso.js` | v15: `node retraso.js <x.jsonl | analisis_vN>`: retraso y arranque por tramo de brazo comparando el ángulo tuyo con el de tiesme. **Poco confiable** en clips con brazos arriba de la cabeza o cruzados (el mapeo cambia el ángulo y la medición se confunde): para elegir filtros usar `filtros_sim.js`. |
| `cruce_b1.js`, `cara_b1.js` | v12, solo batería 1: orden de los antebrazos en B1-04 (verdad mirada en el video) y distancia de las palmas a la cara por tramo en B1-03. |
| `hoja.js` | `node hoja.js <carpeta analisis_vN> [columnas]`: hoja de contacto con las fotos del análisis (ffmpeg). |
| `video.js` | `node video.js <carpeta analisis_vN_comparado>`: une las fotos por cuadro en `<clip>_comparado.mp4` (cámara con puntos \| tiesme, 30 cuadros/s, sincronizado) y borra esas fotos. Correrlo **cuando el lote terminó** (si no, corta el clip que está a medias). Es lo que el usuario usa para opinar (en vez de OBS). |
| `archivar_version.js` | `node archivar_version.js "<carpeta 2. tracking webcam>" vN`: copia a `_versiones/vN` con rutas absolutas (modelo y `lib`), cartel VIEJA y `ABRIR_vN.bat`. |
| `camara_medir.sh` | `bash camara_medir.sh <nombre> [seg]`: cuadros/s reales, brillo, parpadeo, ruido y nitidez de la C920 (escena quieta). |
| `camara_nitidez.sh` | `bash camara_nitidez.sh <nombre>`: nitidez lejos (pared) y cerca (cara); ajustar los recortes a la escena. |
| `camara_movimiento.sh` | `bash camara_movimiento.sh <nombre>`: con la persona moviendo las manos: borroneo y hoja de 12 cuadros. |
| `camara_traer_dialogo.ps1` | trae al frente la ventana de propiedades del driver (`ffmpeg -f dshow -show_video_device_dialog true ...`). |

Los scripts de cámara necesitan la cámara libre (cerrar el tracking y salir de la página de la C920 en G HUB).

## Método de trabajo con mediciones
1. Grabación real (batería o K) → `?lote=` o `?video=...&analizar` con la versión actual y con la variante.
2. `metricas.js` sobre las dos carpetas + `hoja.js` para mirar los momentos clave.
3. Margen de la medición: desde la v12 el análisis es **repetible** (MediaPipe recibe el tiempo del video, 33 ms por
   cuadro, y la "cara tapada" se cuenta con ese reloj): el mismo clip da lo mismo en cada corrida, aunque haya varias
   pestañas analizando a la vez. Antes daba ±10%. Una versión = un área; adentro, cada cambio medido por separado (`sin=`).
4. Antes de cambiar: archivar con `archivar_version.js`, subir `VERSION` en `app.js` y el título en `index.html`.

## Pruebas desde la consola del navegador (`window.__tiesme`)
`stepLoop(raw, dt)` (loop real con presencia), `demoResults(t, escena)`, `pause(true)`, `detect()`, `detStats`,
`dbgIK`, `charAnc`, `ellDist`, `render(yaw, zoom)`, `setGiro(g, guardar)`, `registroCuadro`, `VERSION`, `contactW`
(peso de los contactos cara/nuca por lado), `lastFaceBox`.
Ruido realista para el demo: z×0,4 + ruido, 2 px en imagen, mano 15% más chica. Ojo: el demo solo sirve para ver
que no se rompió nada; las mejoras se miden con grabaciones reales.

## Servidor (`servidor.js`)
Puerto 8090 (`--port N` para otro, `--no-open` para no abrir Chrome). Sirve toda la carpeta SPOT CABINA. Endpoints:
`/__servidor` (versión), `POST /__guardar?ruta=...&modo=a|w` (solo dentro de `_pruebas`, tipos permitidos),
`/__lista?ruta=...` (videos de una carpeta de `_pruebas`).

## Trampas conocidas
- FBXLoader duplica huesos: usar el primero de cada nombre. El modelo está en cm: nunca filtrar en unidades del modelo.
- La variable `rec` ya es una función del rig (el grabador se llama `grab`).
- Con el panel del navegador oculto el loop corre a ~1 fps; el análisis por eso salta cuadro a cuadro (seek).
- La vista previa de G HUB ocupa la cámara. OBS también puede ocuparla si tiene la cámara en una escena.
- El usuario abrió dos veces copias de `_versiones` creyendo que eran la actual: verificar dirección y versión.
