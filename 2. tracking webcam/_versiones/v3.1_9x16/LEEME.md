# Tracking webcam — tiesme (SPOT CABINA) · v3

Test de tracking de tren superior con webcam que mueve al personaje **tiesme** en tiempo real.
Corre en el navegador (Chrome recomendado), con MediaPipe para detectar y three.js para mostrar el FBX.

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
