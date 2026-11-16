# Tracking webcam — tiesme (SPOT CABINA) · manual de uso · v12

Tracking de tren superior con webcam que mueve al personaje **tiesme** en tiempo real, en una tele vertical 9:16.
Corre en Chrome, con MediaPipe para detectar y three.js para mostrar el FBX. **No necesita internet** (todo en `lib`).

> **La versión actual es siempre la de esta carpeta** (`ABRIR_TEST.bat`; la dirección termina en
> `/2.%20tracking%20webcam/index.html`; el panel dice la versión). Lo que está en `_versiones` son copias viejas: al
> abrirlas aparece un cartel rojo **VERSIÓN VIEJA**. Historial de cambios: `HISTORIAL.md`.

## Abrir
1. **Antes**: si G HUB está abierto en la página de la C920, salir de esa página (la vista previa ocupa la cámara).
2. Doble click en **`ABRIR_TEST.bat`**. Se abre una ventana negra (el servidor) y el navegador. Si el servidor ya
   estaba abierto, alcanza con recargar (F5). Si se actualizó `servidor.js`, cerrar la ventana negra y volver a abrir.
3. La primera vez Chrome pide permiso para la cámara: **Permitir**.
4. Esperar ~10 s a `MediaPipe: listo (GPU, recortes)`. El panel tiene que decir **v12** y la cámara **1920×1080**.
5. La postura neutra se toma sola al entrar, mirando de frente. **C** la vuelve a tomar.
6. Una vez por persona/lugar: **G** para calibrar los gestos de cara (~30 s).

Para cerrar: cerrar la pestaña y la ventana negra. Sin cámara: `index.html?demo`.

## Controles
| Tecla | Acción |
|---|---|
| **T** | formato tele vertical 9:16 on/off (on por defecto) |
| **K** | grabar la cámara + registro por cuadro / parar |
| **B** | batería de 11 clips de prueba: 10 guiados + 1 libre de 30 s (B otra vez cancela) |
| **C** | calibrar postura neutra |
| **G** | calibrar gestos de cara (~30 s) |
| **M** | espejo on/off |
| **R** | recentrar la vista |
| **H** / **V** | ocultar panel / ventanita de la cámara |
| **F** | pantalla completa |
| **O** | girar la imagen (solo si la cámara se monta en vertical). *Aprobado sacarla en la próxima versión.* |

Panel: **Suavizado** (0.70, más alto = más quieto), **Reacción** (0.50, más alto = sigue más rápido los movimientos
bruscos), **Desplazamiento** (solo fuera del modo tele), **Umbral voz** (boca con micrófono).
Si nadie está frente a la cámara por 3 s, la próxima persona se calibra sola.

## Grabar pruebas
- **K**: graba la imagen de la cámara tal cual (resolución completa) + un registro por cuadro (`.jsonl`) con lo que
  detectó MediaPipe y lo que hizo tiesme → `_pruebas/grabaciones/v12_grabacion01.mp4` (02, 03…).
- **B** (batería): 10 clips cortos, siempre los mismos, con instrucción en pantalla y cuenta regresiva (entrar y salir,
  cabeza, manos en la cara, brazos cruzados, codos, formas con los dedos, dedos rápido, manos arriba, girar, acercarse),
  y desde el 19/10 un **clip 11 libre de 30 s** (movete como quieras: cosas al azar, gestos, combinaciones).
  ~3,5 min → `_pruebas/grabaciones/v12_bateria01/` (el número sigue entre versiones: la próxima sería `v12_bateria02`).
  Desde el 17/10 hace falta el servidor v3: si dice "cerrá la ventana negra", cerrala y abrí ABRIR_TEST.bat.
- No hace falta OBS: la página graba sola. Cuando termines, avisá y Claude busca la carpeta.

## Cámara C920 (configurada el 17/10 en G HUB)
Medido con ffmpeg a 1920×1080 MJPEG (como la usa Chrome), escena quieta y persona parada a ~1,3 m.

| Ajuste | Antes | Ahora | Por qué / qué se midió |
|---|---|---|---|
| Prioridad | Exposición | **Frecuencia de cuadro** | Con la luz de techo, "Exposición" bajaba la cámara a **16 cuadros/s** (~1/16 s de exposición → manos borrosas). Ahora **30 cuadros/s**. Imagen más oscura (brillo 64 contra 117) y con más grano; con más luz mejora. |
| Enfoque | manual en 0 (infinito) | **manual fijo ~4%** (driver: 10) | Nitidez de la cara a ~1,3 m (más bajo = mejor): 0 → 5,19 · **4% → 4,80** · 10% → 7,27 · 23% → 17,7 · autofoco → 5,07 (y puede "buscar"). Cubre ~1 a 2,5 m. |
| Exposición | automática | automática | La manual corta borronea menos pero oscurece: probar con la batería. |
| Antiparpadeo | 60 Hz | 50 Hz en G HUB | Con esta luz no cambia nada medible. El driver vuelve a mostrar 60 Hz al reabrir la cámara: no confirmado. Revisar con la luz de la cabina. |

- Si G HUB dice "Cámara no disponible" sin que nada la use: salir de la página de la C920 y volver a entrar.
- Los ajustes quedan guardados en la cámara. Si se desconecta o se usa otra PC, revisarlos en G HUB.

## Qué trackea
| Parte | De dónde sale |
|---|---|
| Cabeza | malla de la cara; si se pierde, orejas, ojos y boca del cuerpo |
| Cadera | caderas del cuerpo, solo si entran en cuadro |
| Pecho y columna | línea de hombros (+ cadera si entra en cuadro) |
| Hombros | altura y profundidad de cada hombro respecto de las orejas |
| Brazos (hombro, codo, muñeca) | posición equivalente de tu mano en tiesme (sus proporciones) + IK con sus largos + escorzo |
| Inclinarse | la cadera si se ve; si no, tu posición respecto del centro de la cámara (el modelo no se traslada) |
| Mano hacia la cámara | tamaño de la mano en la imagen (solo cerca) |
| Dedos | 21 puntos de cada mano, falanges como bisagra |
| Gestos de cara | blendshapes de MediaPipe → estados de `1. tiesme modelo/estados_cara` |

## Tips
- Buena luz de frente, fondo sin mucho ruido, codos visibles, mangas arremangadas.
- Para que la cintura acompañe tiene que verse la cadera (con la cámara a la altura del pecho: a más de 1,6 m).
- Dedos: palma o dorso hacia la cámara; de canto se confunden.

## Archivos de esta carpeta
| Archivo | Qué es |
|---|---|
| `index.html`, `app.js`, `cara.js` | la página, el tracking y el rig; los estados de cara |
| `servidor.js`, `ABRIR_TEST.bat` | servidor local (puerto 8090); también guarda las grabaciones en `_pruebas` |
| `lib/` | three.js, MediaPipe y modelos, locales (**no borrar**; origen en `lib/ORIGEN.txt`) |
| `TRASPASO_CHAT.md` | **estado actual y qué sigue** (lo primero que lee un chat nuevo) |
| `FICHA_PROBLEMAS.md` | lista de problemas por parte del cuerpo, con estado |
| `TECNICO.md` | cómo funciona por dentro, cómo probar y medir, herramientas |
| `HISTORIAL.md` | qué cambió en cada versión (v1–v12) |
| `investigacion_tracking.md` | investigación de alternativas y mejoras (con fuentes) |
| `analisis_video_*.md` | análisis de videos de prueba |
| `_herramientas/` | métricas, hojas de contacto, archivar versión, medición de la cámara |
| `_pruebas/` | clips de prueba, grabaciones y análisis |
| `_versiones/v1 … v9` | copias viejas (cartel VIEJA; v1–v7 usan internet) |
