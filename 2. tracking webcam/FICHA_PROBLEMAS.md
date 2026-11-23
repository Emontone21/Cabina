# Ficha de problemas — tracking de tiesme (por parte del cuerpo)

Lista única y permanente. Cada problema tiene un código fijo (no cambia entre versiones ni entre chats).
Investigación de soluciones: `investigacion_tracking.md`.

## Reglas
- **Estados**: `Abierta` → `Propuesta` (explicada, esperando tu OK) → `En prueba vN` (hecha y medida, esperando tu
  opinión) → `Confirmada` (**solo cuando vos lo decís**). Que no comentes un arreglo **no** lo confirma.
- **Ronda de revisión** después de cada versión: por cada área tocada te pregunto si mejoró, quedó igual o empeoró, y
  vos me das ejemplos (segundo del video). Si algo vuelve a fallar, se reabre con lo que pasó.
- **Una versión = un área grande completa** (desde el 18/10), con todas tus observaciones de esa área; adentro se
  mide cada cambio por separado. Al terminar: lista de qué se corrigió y qué quedó pendiente.
- En cada problema: qué se ve, dónde se vio, por qué pasa (y si está **comprobado** con datos o es **hipótesis**),
  soluciones posibles con su costo, y estado.

---

## 1. Cadera (CAD)
| Código | Qué se ve | Dónde | Por qué pasa | Soluciones posibles | Estado |
|---|---|---|---|---|---|
| CAD-1 | La cadera de tiesme no acompaña la tuya | todos los videos; B1 (batería 1) también | Comprobado: en tus grabaciones la imagen corta en la cintura y la cadera no se detecta. El código existe desde la v7 pero nunca se vio andar. | Encuadre con la cadera a la vista (más lejos, cámara más alta o en vertical). | Abierta (sin verificar) |

## 2. Columna y pecho (PEC)
| Código | Qué se ve | Dónde | Por qué pasa | Soluciones posibles | Estado |
|---|---|---|---|---|---|
| PEC-1 | Inclinarse y girar el torso; **de perfil el cuerpo de tiesme queda de frente** (gira solo la cabeza) | B1-09 2–3,5 s; tus videos: B1-09 0–1 s (la cintura sigue al frente), 3 s (al mover los hombros se vuelve loco) | Hecho en v4–v7 (inclinación desde la cintura, giro por hombros). Hipótesis: de perfil los hombros se superponen en la imagen y el giro por hombros no se lee. | Medir el giro de hombros en B1-09. | Abierta. **Decisión tuya (17/10)**: no sabés si conviene que la cintura gire; los giros completos casi no van a pasar en la muestra → prioridad baja, solo evitar saltos. |

## 3. Hombros (HOM)
| Código | Qué se ve | Dónde | Por qué pasa | Soluciones posibles | Estado |
|---|---|---|---|---|---|
| HOM-1 | Subir/bajar y adelantar los hombros | — | Hecho en v7, nunca revisado con vos. | — | Falta tu opinión |

## 4. Cabeza y cuello: dirección y posición (CAB)
| Código | Qué se ve | Dónde | Por qué pasa | Soluciones posibles | Estado |
|---|---|---|---|---|---|
| CAB-1 | Mirás abajo y tiesme no baja la cabeza (a veces la gira de costado) | 00-12-10 0:50, 2:22; **B1-02 10,5–11 s** (cabeceo copia 86%); tus videos: B1-05 4 s (tiesme mira arriba, vos abajo), B1-06 0 s, B1-08 0–1 s, B1-02 9 s (más baja de lo que debería) | **Corrección (17/10)**: dije que la pose neutra automática "absorbía" la cabeza agachada; los datos dicen que **no**: mirando derecho a la cámara tu cara mide 15–22° en esta instalación en todos los clips (cámara más baja que los ojos), así que esos 18° de B1-05 eran tu "derecho" y la neutra los corrige bien. En B1-02 10,1–10,3 s al mirar abajo la cara sube solo a 21° y enseguida MediaPipe la pierde ("sin cara"); de ahí la cabeza se calcula con el cuerpo. Causa probable: pérdida de la malla con la cabeza baja (lo de abajo). Con la cabeza baja la malla de la cara se deforma o se pierde y la cabeza pasa a calcularse por orejas/ojos del cuerpo; además límites y la postura neutra tomada con la cámara más baja que la cara. | Medir con el clip 02 de la batería; revisar el paso cara→cuerpo y los límites. | Abierta |
| CAB-2 | De espaldas la cabeza gira de más (se ve la gorra de frente) | 00-12-10 1:14–1:18; **no apareció en B1-09** (9,5–10,5 s quedó de frente) | Hipótesis fuerte: de espaldas MediaPipe confunde izquierda y derecha y nosotros lo seguimos. | Detectar "de espaldas" (sin cara + hombros invertidos) y limitar o congelar la cabeza. | Abierta |
| CAB-3 | Posición de la cabeza | — | Lo mencionaste; falta que me digas qué ves (¿adelantada, corrida, hundida?). | — | Abierta (falta descripción) |
| CAB-4 | Girar la cabeza de perfil: tiesme gira poco, mira abajo y "se tranca" | B1-02 4 s (mira abajo), 5–6 s (se tranca) | **Comprobado (B1-02)**: pasando ~45° MediaPipe pierde la malla de la cara ("sin cara" desde 4,0 s) y la cabeza pasa a calcularse con el cuerpo: tu cabeza a ~90° y tiesme a 14–20°, con 6° abajo y 9° de costado. | Seguir el giro con orejas/hombros cuando se pierde la cara, empalmando sin salto; límite de giro más amplio. | Abierta |

## 5. Cara y gestos (CAR)
| Código | Qué se ve | Dónde | Por qué pasa | Soluciones posibles | Estado |
|---|---|---|---|---|---|
| CAR-1 | Gestos de cara sin calibrar con una persona real | — | Los estados vienen del test de julio; la calibración (G) no se hizo. | Calibrar con G y revisar juntos. | Abierta |

## 6. Brazos y codos (COD)
| Código | Qué se ve | Dónde | Por qué pasa | Soluciones posibles | Estado |
|---|---|---|---|---|---|
| COD-1 | Los codos de tiesme no copian los tuyos (quedan "genéricos": abajo y afuera) | 22-24-46 seg 14 y 40–63; 00-12-10; **B1-05** (manos en la nuca 4–10 s: codos abajo y manos en las mejillas; 28 de los 50 saltos de B1); tus videos: B1-04 1 s (MediaPipe ve bien el codo, tiesme no), B1-05 3–4 s y 7 s, B1-07 2 s, B1-08 2 s (codos pegados a la cabeza, atraviesan el gorro) y 6 s (moviste solo antebrazos y tiesme levantó los brazos enteros). Mejor: B1-05 1 s, B1-06 7 s (algo contraídos); **B2-05 (v12)**: nuca 6–8 s con las manos detrás de la cabeza (100%), pero codos de tiesme ~0° y los tuyos +41 a +60°; aletear 8,5–10 s sigue en parte | **Comprobado**: regla mía de la v4, el codo detectado pesa como máximo 55% (para que no salte cuando MediaPipe lo inventa). Además el antebrazo de tiesme es 1,7× y la profundidad del modelo de pose es poco confiable. | (a) Codo por "rayo de la cámara + largo del antebrazo" (MikanTrack). (b) Pesar más el codo cuando se ve bien. (c) Detector de cuerpo mejor (pose heavy o RTMW). | **En prueba v12**: el codo bien visto pesa entero (antes 55%). Solo eso cambia poco: con su antebrazo largo y la mano al costado de la cara el codo no puede subir. Con la mano detrás de la cabeza (MAN-1) en B1-05 los codos quedan a la altura del hombro (correlación −0,26 → 0,17, error 54° → 45°): **mejor pero todavía más bajos que los tuyos**. B1-03 correlación −0,29 → 0,83. Descartado el "ángulo de giro" (saltaba). Video: `B1_comparado_v12/analisis_v12_comparado/05_codos_comparado.mp4` |
| COD-2 | Codos fuera de cuadro inventados | 20-32-45 | MediaPipe inventa puntos fuera de la imagen; desde la v4–v5 pesan menos. | Igual que COD-1. | Abierta |
| COD-3 | **Brazos cruzados: el codo no copia y el modelo se deforma** (dicho por vos el 28/10, sin video todavía) | **B2-04 2,0 s (visto por mí en la hoja)**: vos cruzás a la altura del pecho con los codos adelante y afuera; tiesme cruza más abajo y **un brazo le queda derecho**, atravesando el cuerpo y el otro brazo | **Comprobado (28/10, `cruzados.js`)**: con los brazos cruzados **un brazo de tiesme queda estirado** (doblez < 30°) el **84%** del tiempo en B2-04 (de 2 a 5,5 s y de 8 a 10 s, su brazo izquierdo) y el **57%** en B1-04. **No** es el codo doblado de más (máx. 133°; el "acordeón" que creí ver eran las rayas del buzo) y **no** es una mano escondida (tus dos manos se ven, muñecas con visibilidad 0,97–0,99). Es que **el punto adonde tiene que ir su muñeca queda a más del 100% del alcance de su brazo**. **Causa comprobada (campo `etapas` del registro)**: error mío de la v12 (cambio 3). Al cruzar, el antebrazo de adelante se corre un poco hacia adelante; ese objetivo ya corrido se guardaba para el límite de velocidad de la mano, que no lo dejaba volver, y al cuadro siguiente se corría otra vez: se acumulaba hasta pedir 1,9 veces el alcance (B2-04 10 s). En todos los cuadros con el brazo estirado (212 en B2-04, 169 en B1-04) el salto aparece en el límite de velocidad o en el corrimiento. | Hecho: cambio 7. Pendiente de mirar: los brazos ahora quedan más juntos (distancia mediana 0,33 → 0,10–0,15 anchos de hombro); en las fotos no se ve uno metido en el otro. | **En prueba v13 (28/10)**: **cambio 7**, el límite de velocidad recuerda el objetivo de antes del corrimiento. Brazo estirado: B2-04 **84% → 0%**, B1-04 **57% → 0%**; codos 0,35 → 0,50 debajo del hombro (los tuyos 0,69–0,86). Fotos antes/después: `_pruebas/grabaciones/antes_despues_v13/`. Descartado: cambio 6 "mano escondida" (B1-04 57% → 93%), apagado (`?con=6`). **Tu prueba en vivo (1/11, C525, manos ESCONDIDAS debajo de los brazos)**: "siguen quedando mal". En la foto: sin brazo estirado, pero las manos abiertas con los dedos estirados y cruzadas en el centro a la altura de las muñecas, no apoyadas sobre el otro brazo; brazos un poco más bajos. Los clips B1-04/B2-04 tienen las manos A LA VISTA: este caso no está grabado. Grabación `v13_grabacion01.mp4` (1/11, C525, 12 s): en el análisis tus manos se ven el 86% de los cuadros cruzados (en vivo en esa notebook, 39%/18%: iba a 8 cuadros/s). **Cambio 8 (en prueba v13, 1/11)**: mano escondida en el cruce → la muñeca de tiesme va junto al codo contrario (sobre SU cuerpo, no mapeando tu muñeca), hacia adentro y apenas delante; la mano apunta a la axila con la palma contra el brazo y los dedos medio cerrados; entra tras 0,25 s sin ver la mano, en 0,3 s. Medido en tu clip: palma al brazo contrario **1,03 → 0,47**, brazo estirado 0–1%; a los 10 s el cruce se ve como el tuyo (fotos `antes_despues_v13/clip_1-11_c8b_zoom.jpg`). **Pendiente**: los brazos quedan altos (codos 0,51 → 0,32 debajo del hombro; los tuyos 0,66); probado más abajo y adelante: peor (0,25 / 0,60). Y la mano VISIBLE apoyada encima sigue abierta con los dedos separados (copia la tuya). **Cambio 9** (mano visible atraída al brazo contrario): descartado y apagado (`?con=9`): tiraba las manos hacia afuera pasando los codos y subía los brazos (B2-04 4 s). Cambio 6 re-medido con el 7 corregido: palma 1,03 → 0,80 pero en las fotos igual o peor; sigue apagado. |

## 7. Antebrazo y muñeca (MUN)
| Código | Qué se ve | Dónde | Por qué pasa | Soluciones posibles | Estado |
|---|---|---|---|---|---|
| MUN-1 | Antebrazo y mano pegan vueltas sobre su eje con tu mano quieta | clip de prueba; 00-12-10; B1: 6 involuntarios en total (5 en B1-05) | **Comprobado** con el registro: con el codo de tiesme doblado del todo el cálculo de "girar lo mínimo" no está definido. | Hecho en v10: seguir la orientación anterior en esa zona. En el clip de prueba: involuntarios 33 → 4, saltos 108 → 2. | En prueba v10 |
| MUN-2 | Mano doblada hacia atrás respecto del antebrazo | 00-12-10 (0:30, 1:50) | Comprobado: la mano copia tu orientación y el antebrazo sale de las proporciones de tiesme; nada limitaba la muñeca. | Hecho en v10: muñeca máx. 70°. | En prueba v10 |

## 8. Manos: posición y contacto con el cuerpo (MAN)
| Código | Qué se ve | Dónde | Por qué pasa | Soluciones posibles | Estado |
|---|---|---|---|---|---|
| MAN-1 | Te tocás las mejillas o te tapás la cara y las manos de tiesme quedan delante del cuello o del pecho | 00-12-10 1:54–2:18; desde la v3; **B1-03**: llega a la cara 9% (mejillas 1,5–2,5 s: manos delante del cuello/pecho); tus videos: B1-03 1–3 s, 6 s (forma bien, posición baja), 10 s (taparse la cara no lo logra); **B2-03 (v12, visto por mí)**: mejillas 1,5–7 s bien; al taparte los ojos (7,5–9,5 s) las manos de tiesme quedan altas, a la altura de la vincha | Hipótesis: nuestro mapeo cerca de la cara es relativo solo a la cabeza (elipsoide) y el choque con su cabeza gigante empuja la palma hacia afuera/abajo. Sin medir. | Medir con el clip 03 (métrica "llega a la cara"). Solución de fondo: **mapeo egocéntrico** (posición de la mano relativa a la superficie de cada parte del cuerpo, Molla/Boulic). | **En prueba v12**: la parte de tu mano sobre tu cara va a la superficie de su cara; mano al costado de la cabeza con el codo arriba → detrás de su cabeza. B1-03 distancia palma–cara (1,0 = apoyada): mejillas 1,7 → 1,1, rascarse 1,6 → 1,2, **taparse la cara casi igual (1,6 → 1,4)**. B1-05 nuca: palma detrás 15% → 76%. Costo: palma adentro de la cabeza 1% → 13% en B1-05 (transición). Cintura no se tocó (ya andaba). **Causa comprobada**: se usaba el centro de tu palma, que al taparte las mejillas queda en la mandíbula. |
| MAN-2 | Brazos cruzados: las manos no quedan sobre los brazos y los antebrazos quedan bajos | 22-24-46 3:53; 00-12-10 1:24–1:32; **B1-04** (cruza bajo, a la altura de la panza); tus videos: B1-04 0 s (brazos como estirados), 1 s (avance: mano derecha bajo el brazo izquierdo), 5 s (al cambiar de brazo queda **al revés**: el que va arriba queda abajo); **B2-04 (v12, visto por mí)**: cruza estable pero bajo, a la altura de la panza (vos, a la altura del pecho) | Probable: tus manos quedan tapadas, la cámara no las ve y la muñeca sale del cuerpo (más baja); no existe "contacto mano-brazo". | Mapeo egocéntrico con los brazos como superficie; o reconocer la pose y usar una pose animada. | **En prueba v12**: el de adelante se elige por la profundidad del cuerpo de codo y muñeca y se mantiene. B1-04 orden correcto (mirado en el video) 61% → 83%; **sigue mal 8,5–9,5 s** al cambiar de brazo. Manos apoyadas sobre el otro brazo: **no hecho**. |
| MAN-3 | Manos a la altura de tu cabeza quedan más bajas (hombro/mentón) | 00-12-10 0:04, 0:24–0:28; en B1-08 (manos arriba) **anduvo bien**, pero falló en B1-05 (nuca) | Hipótesis: escala vertical del mapeo + empuje de la cabeza enorme. | Medir; mapeo egocéntrico. | Abierta |
| MAN-4 | Bajás un brazo y el de tiesme se queda arriba | B1-03 8 s (sacándote los lentes: la izquierda queda arriba) | Hipótesis: cuando MediaPipe pierde la mano se "retiene" la última posición (arreglo viejo para que no se caiga la mano). **Visto al medir v11**: si la mano se detecta UN solo cuadro y se pierde, se "retiene" ese objetivo sin tope de velocidad y la mano gira 27°/cuadro durante ~0,2 s (aparece en distintos segundos según la corrida, también en v10). | Medir en B1-03; soltar más rápido cuando el brazo baja. | **En prueba v12**: mano nueva confirmada en 2 cuadros, retener con tope de velocidad, brazo que se pierde bajando vuelve a reposo enseguida. B1-03 brazo arriba con el tuyo abajo 1,4 → 0,7 s; B1-04 saltos 9 → 2. **Causa comprobada** (B1-03 8 s): bajaste las manos en 0,2 s, salieron por abajo de la imagen y se retenía la última pose 0,8 s. |
| MAN-5 | Manos que se van solas hacia adelante / "se vuelven locas" | B1-04 3 s (al mover el tronco), B1-05 7 s, B1-03 11 s | Hipótesis: la profundidad de las manos (lo que tienen de adelante/atrás) es poco confiable y salta. | Medir; profundidad de manos al 50% (investigado). | **En prueba v12 (indirecto)**: no era ruido de profundidad (descartada la profundidad al 50%). B1-04 3 s = empuje de los brazos cruzados (cambio de MAN-2); B1-05 7 s = choque con la cabeza que saltaba adelante/atrás (ahora la nuca decide detrás con el codo). B1-03 11 s sin revisar aparte: verlo en el video. |
| MAN-6 | Aplaudir: las manos no se tocan y quedan quietas | B1-08 3–4 s; **B2-08 3,5–5,5 s (v12, visto por mí)**: aplaudís ARRIBA de la cabeza y tiesme junta las manos DELANTE DE SU CARA. Causa comprobada: sus brazos (3,2 largos de mano) no llegan arriba de su cabeza + gorra (~3,7); juntas en el centro caen donde llegan, delante de la cara. Aplaudir delante del pecho: 0,39 (se tocan) | Probable: no hay contacto mano-mano; las manos se mapean cada una por su lado. | Atracción entre manos cuando las tuyas se tocan (contacto). | **En prueba v12**: si tus palmas se tocan, las de tiesme se juntan (B1-08 0,92 → 0,44 largos de mano). **Aplaudir arriba** (decisión tuya del 19/10): se juntan arriba del gorro sin taparle la cara (B2-08 palmas 0,83 → 1,67 de alto, delante de la cara → sobre el gorro). Corrección: mi cálculo de "no le alcanzan los brazos" estaba mal (en B1 llegaba); en B2 la causa era una sola mano detectada + profundidad. Video: `v12_bateria01/analisis_v12_aplauso/08_manos_arriba_comparado.mp4` |
| MAN-7 | Mano apoyada en la cintura que tiembla (gira sola de golpe) | **B2-05 2–5 s** (visto por mí: mano derecha de tiesme 27°/cuadro, muchas veces) | **Comprobado (imagen)**: B2 se grabó de noche; tu mano derecha está de dorso, en sombra y contra la cadera: los puntos de los dedos salen amontonados y MediaPipe cambia la orientación de la mano de un cuadro a otro. | Bajar la confianza de la orientación de la mano cuando los dedos salen amontonados (mano "rara") y moverla despacio; mejor luz en la cabina. | Abierta |

## 9. Dedos (DED)
| Código | Qué se ve | Dónde | Por qué pasa | Soluciones posibles | Estado |
|---|---|---|---|---|---|
| DED-1 | Formas finas: que se toquen las yemas | todos; B1-06 5 s (**mejor**: junta las yemas), final (al señalar a cámara el índice se rompe) | Probable: cada dedo mide 6–13 px en la imagen y se tapan entre sí (límite de la webcam); los dedos de tiesme doblan solo como bisagra. | Más píxeles y luz; usar solo la flexión de cada dedo (MikanTrack); **reconocer formas de mano y usar poses animadas por vos**. | Abierta |
| DED-2 | Dedos lentos | 00-12-10; B1-07: retardo 167 ms; tus videos: B1-07 2 s (abrir/cerrar tosco, también al girar muñecas), 4 s (teclear lento), B1-03 6 s (no rasca) | Hipótesis: tres capas de suavizado en serie. | Medir con el clip 07; una sola capa One Euro bien ajustada. | Abierta |
| DED-3 | Posición rara de los dedos | 00-12-10; B1-06: triángulo bien, pulgar arriba/señalar/puño raros (6,5–10 s) | En parte por MUN-2 (muñeca); el resto sin analizar. | Revisar después de v10. | Abierta |

## 10. Atravesar el cuerpo (CHO) — afecta a varias partes
| Código | Qué se ve | Dónde | Por qué pasa | Soluciones posibles | Estado |
|---|---|---|---|---|---|
| CHO-1 | Movés la mano y atraviesa el pecho | tu ejemplo; 00-12-10 0:06–0:08; B1-03 11 s (mano derecha atraviesa el pecho) | Hipótesis: el torso es un elipsoide aproximado; el empuje corrige la palma pero no el recorrido; con el antebrazo largo el brazo entra igual. | Superficies más fieles a la malla (cápsulas); empuje suave tipo cilindro (EchoAvatar); mapeo egocéntrico. | Abierta |
| CHO-2 | Dedos, brazo contra la cabeza y mano contra el otro brazo se atraviesan | 00-12-10 1:28–1:32; B1-08 2 s (codos atraviesan el gorro) | Comprobado: no hay choque para esas partes. | Agregar esas superficies al mismo sistema que CHO-1. | Abierta |

## 11. General (GEN)
| Código | Qué se ve | Dónde | Por qué pasa | Soluciones posibles | Estado |
|---|---|---|---|---|---|
| GEN-1 | Bamboleo al acercarte a la cámara | 00-12-10 0:54; **no apareció en B1-10**. **Decisión tuya (17/10)**: nadie se va a acercar con todo el cuerpo; sí interesa **inclinar cabeza y torso hacia la cámara** con la cintura quieta (pendiente de probar) | Hipótesis: los hombros salen de cuadro y la pose se recalcula. | Medir con el clip 10. | Abierta |
| GEN-2 | Salto al darte vuelta | 00-12-10 1:19 | Igual que CAB-2. | — | Abierta |
| GEN-3 | ~20 fps con OBS grabando; grabando con la página baja de ~55 a ~30 cuadros/s con manos a la vista | 00-12-10; B1 | MediaPipe + render + OBS. | Grabar con la página (K/B) en vez de OBS; medir. | Abierta |
| GEN-4 | Funcionar sin internet | — | Hecho en v8. | Probar una vez con el cable de red desenchufado en la PC de la cabina. | En prueba v8 |
| GEN-5 | Configuración de la cámara (afecta todo: dedos borrosos, menos cuadros) | todos los videos | **Comprobado** (17/10, ffmpeg): con "Prioridad: Exposición" y la luz de techo la C920 bajaba a **16 cuadros/s**; el foco estaba fijo al infinito. | Aplicado en G HUB: prioridad "Frecuencia de cuadro" (30 cuadros/s) y foco fijo ~4% (cara más nítida). Pendiente: exposición manual corta (medir con la batería) y re-medir con la luz de la cabina. Detalle en LEEME, "Cámara C920". | En prueba (falta ver el efecto en el tracking) |
| GEN-6 | Antiparpadeo 50 Hz | — | G HUB muestra 50 Hz pero el driver vuelve a 60 Hz cada vez que se abre la cámara; con la luz actual no cambia nada medible. | Revisar con la luz de la cabina; si hay bandas o titileo, buscar cómo fijarlo (consultando antes). | Abierta |
| GEN-7 | **Retraso**: tiesme tarda en reaccionar cuando te movés ("demasiado lagueado") | cabina, 22/11 (partidas `partida_20261122_*`) | Se suma en cuatro tramos: cámara, detección (cuerpo y cara iban en fila), cada cuánto se detecta (12–20 por segundo en la notebook, con Chrome en la placa Intel) y filtros (~180 ms en su grabación en vivo). **Además (medido el 22/11 en los videos de las partidas): la cámara de 1080p entrega 20 imágenes por segundo de día y 15 de noche, parejas (no son cuadros perdidos): es GEN-5 otra vez, en la notebook la C920 no tiene el ajuste de G HUB.** La partida a 720p de ese día sí va a 30. | v15: cambio 18 (detección en paralelo, 48 → 19–26 ms) y cambio 19 (filtros, 179 → 108 ms a 12 detecciones/s). Falta: Chrome en la placa NVIDIA (lo hace Agustín en Windows). Si no alcanza: predicción entre detecciones, cámara a 720p. | En prueba v15 |

## 12. Entrada y salida (ENT)
| Código | Qué se ve | Dónde | Por qué pasa | Soluciones posibles | Estado |
|---|---|---|---|---|---|
| ENT-1 | Al empezar a seguirte, tiesme tarda y mueve los brazos solo (pose T, brazos bruscos) | B1-02 0 s, B1-03 1 s, B1-06 0 s, B1-07 0 s, B1-08 0–1 s | **Comprobado**: engancha a los 0,6 s y después entra suave durante 2 s (velocidad limitada a propósito, arreglo del "tirón al entrar"). En la batería pasa en cada clip porque el análisis empieza de cero; en la cabina es lo que ve cada visitante al entrar. | Entrada más corta y sin pasar por poses intermedias raras (mezclar desde la pose de reposo, no rotar cada hueso por su cuenta). | En prueba v11: engancha a 0,4 s y entra todo junto en 0,8 s (copia completa ~1,2 s, antes ~2,6 s). **Corrección (19/10)**: el "máx. 9,5°/cuadro" se midió con el análisis no repetible; con el análisis arreglado la v11 da **15,3°/cuadro** en B1-04/05/08 (y en B2), no es efecto de la v12. |
| ENT-2 | Salto de cabeza/pecho (y rebote de brazos) un rato después de entrar | B1-01 3–4 s (cara al frente de golpe; brazos rebotan en 4 s), B1-05 1,3 s, B1-02 (se acomoda desde el pecho) | **Comprobado (B1-05)**: no son los ojos. A 1,2→1,3 s tu cara cambió 1° y la cabeza de tiesme saltó 10° en una décima: es la **pose neutra automática** (se toma una vez, 0,6 s después de engancharte y con el cuerpo quieto) que cambia de golpe. B1-01: engancha a 2,4 s → calibra ~3,4 s. | Que la neutra entre de a poco (no de golpe) y no absorba la cabeza agachada (ver CAB-1); o una neutra fija medida para la cámara de la cabina. | En prueba v11: neutra promediada y aplicada de a poco; salto de cabeza 4,5° → 1,7°/cuadro |
| ENT-3 | Salís del encuadre vertical y tiesme te sigue copiando | B1-01 9 s (siguió hasta 10,8 s) | **Comprobado (código)**: deja de seguirte recién cuando los hombros salen de la imagen **entera** de la cámara (16:9) o se alejan 1,3× de la zona, y después espera 1,2 s más; luego vuelve a reposo despacio. | Usar el encuadre vertical (lo que se ve en la tele) como límite, menos espera y volver a reposo más decidido. | En prueba v11: B1-01 te suelta a 0,6 s de salir (antes 1,5) y reposo a 1,5 s (antes 2,6) |

### Arreglados antes (v5–v6) que no volviste a marcar — ¿los confirmás?
Taparse la cara te "sacaba" · tirón al entrar · cabeza agachada por la cámara baja · mano en la entrepierna ·
mano atravesando la gorra · tiesme agrandado por el mouse · seguir a gente fuera de la zona.

---

## Patrones de mis errores (para no repetirlos)
1. **Validé con un demo que armé yo**: los errores que no modelé no aparecían (v4–v8).
2. **Diagnostiqué desde una ventanita de 300 px**: deducía causas sin ver lo que vio la cámara.
3. **Arreglé síntomas en la última capa** (choques, límites, retenciones) en vez de la causa (ej.: el codo con peso
   55% es la causa de los codos genéricos y nunca la toqué).
4. **Muchos cambios por versión**: no se sabía qué ayudó y qué rompió.
5. **Di cosas por resueltas sin tu confirmación**.
6. **Métricas sin revisar contra imágenes**: la cabeza "35%" que en realidad era 90% (error mío en la medición).
7. **Decidí qué arreglar sin consultarte** (v10).

## Batería 1 (B1)
`_pruebas/grabaciones/bateria_2026-10-17_172643` (17/10, v10, luz de día, con auriculares). Clips: B1-01 entrar/salir ·
B1-02 cabeza · B1-03 manos en la cara · B1-04 brazos cruzados · B1-05 codos · B1-06 formas de dedos · B1-07 dedos rápido ·
B1-08 manos arriba · B1-09 girar · B1-10 acercarse. Ronda de preguntas pendiente: el usuario necesita ver cámara + tiesme
sincronizados para opinar.

## Batería 2 (B2)
`_pruebas/grabaciones/v12_bateria01` (18/10 02:04, v12, **de noche: menos luz que B1**, con auriculares). Videos comparados de los 10 clips
y hojas de contacto: `v12_bateria01/analisis_v12_comparado/`. En vivo (registro de la grabación) con la v12: codos B2-05 correlación 0,59 /
error 31° (B1 con v11: −0,26 / 54°), nuca detrás 92%. Ojo: B2 es otra toma (otros movimientos), no se compara 1 a 1 con B1.
Desde el 19/10 la batería tiene un clip 11 libre de 30 s.

## Historial de rondas de revisión
| Fecha | Versión | Área | Tu opinión | Qué hago |
|---|---|---|---|---|
| 18-19/10 | v12 (B1) | brazos y manos | (pendiente: videos `B1_comparado_v12/analisis_v12_comparado/` 03, 04, 05 y 08; comparar con `bateria_2026-10-17_172643/analisis_v10_comparado/`) | Ronda por área: codos, manos en la cara, nuca, brazos cruzados, bajar los brazos, aplaudir. |
| 17/10 | v10 (B1) | todas (videos comparados) | Ver filas con "tus videos". Bien: B1-06 fluidez "muuucho mejor", 5 s yemas, 10 s brazos y manos; B1-08 5 s manos atrás de la cabeza; B1-04 1 s avance; B1-05 1 s codos mejor. Giros (B1-09) y acercarse (B1-10): poco útiles para la muestra. No mencionó antebrazos girando solos (MUN-1/MUN-2: falta confirmar). | Propuesta: v11 = entrada/salida (ENT-1/2/3 + parte de CAB-1); v12 = codos. Esperando OK. |
