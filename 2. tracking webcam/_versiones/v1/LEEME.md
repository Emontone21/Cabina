# Tracking webcam — tiesme (SPOT CABINA)

Test de tracking de tren superior con webcam que mueve al personaje **tiesme** en tiempo real.
Corre en el navegador (Chrome recomendado), con MediaPipe para detectar y three.js para mostrar el FBX.

## Abrir
1. Doble click en **`ABRIR_TEST.bat`**. Se abre una ventana negra (el servidor) y el navegador.
2. La primera vez Chrome pide permiso para la cámara: **Permitir**.
3. Esperar ~10 s a que diga `MediaPipe: listo (GPU)`.
4. Pararse frente a la cámara, mirando de frente, y apretar **C** para calibrar la postura neutra.

Para cerrar: cerrar la pestaña y la ventana negra.
Si querés ver el rig moviéndose sin cámara: `http://localhost:8090/2.%20tracking%20webcam/index.html?demo`

## Qué trackea
| Parte | De dónde sale |
|---|---|
| Cabeza (giro, cabeceo, inclinación) | malla de la cara (frente, mentón, mejillas) |
| Pecho (giro y lateral, repartido en Spine/Spine1/Spine2) | línea de hombros (+ cadera si entra en cuadro) |
| Hombro, codo | puntos del cuerpo |
| Muñeca y giro de antebrazo | orientación de la mano |
| Dedos (5 por mano, 3 falanges) | 21 puntos de cada mano |

Las piernas quedan quietas. Si un brazo sale de cuadro, baja a una pose relajada.

## Controles
| Tecla | Acción |
|---|---|
| **C** | calibrar postura neutra (cabeza y pecho) |
| **M** | espejo on/off (on = se mueve como un espejo) |
| **R** | recentrar la vista |
| **H** | ocultar panel |
| **V** | ocultar ventanita de la cámara |
| **F** | pantalla completa |
| Mouse | girar / zoom / mover la vista |

Panel: activar/desactivar cabeza, pecho, brazos y manos+dedos, y **Suavizado** (más alto = más suave pero con más retardo; 0.6 por defecto).

## Tips para que ande bien
- Buena luz de frente, fondo sin mucho ruido.
- Encuadre de cintura para arriba con los codos dentro de cuadro.
- Dedos: mano a 1–1,5 m de la cámara, palma o dorso hacia la cámara. Con la mano de canto los dedos se confunden.

## Archivos
- `index.html` + `app.js`: la página (tracking + retargeting a los huesos `mixamorig`).
- `servidor.js`: servidor local (Node, puerto 8090). Hace falta porque la webcam solo anda en localhost/https.
- `ABRIR_TEST.bat`: arranca todo.
- Modelo y texturas: `..\1. tiesme modelo\` (copiados de la biblioteca; la cara y la gorra son texturas de video MP4).

## Limitaciones conocidas / próximos pasos
- Necesita internet al abrir (three.js, MediaPipe y sus modelos vienen de CDN). Para la muestra: bajar todo local.
- Gestos de cara (boca, ojos, cejas): MediaPipe ya da 52 blendshapes; se pueden mapear a las caras `tiesme_cara_*` / `tiesme_vocal_*` de la biblioteca.
- TouchDesigner: esta página puede mandar los datos por WebSocket/OSC a TD, o pasar al plugin MediaPipe de TD.
