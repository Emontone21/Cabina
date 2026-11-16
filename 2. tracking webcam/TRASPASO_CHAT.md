# Traspaso — estado actual (SPOT CABINA · tracking de tiesme)
Actualizado: 19/10/2026 (v12). Lo primero que lee un chat nuevo (junto con `FICHA_PROBLEMAS.md`).

## Dónde estamos
- **9/11: v14 "más detecciones por segundo"** (Agustín: "pierdo movimientos… repensá el tracking"). Decidido NO rehacer
  de cero (13 versiones medidas, 4 semanas) sino subir la cantidad de detecciones por segundo: cambio 10 apagado, modelo
  completo otra vez, y **cambio 15: cuerpo, manos y cara en tres hilos en paralelo** (14,6 → 30,4 detecciones/s en el
  panel de Claude; HISTORIAL v14). v13 archivada en `_versiones/v13`. **Esperando que Agustín pruebe** y pase la línea
  del panel H (`N fps · tracking M`) y qué GPU usa Chrome. Pendientes de esta línea: interpolar con tiempo entre
  detecciones (cambio 14, no hecho: con 30 detecciones/s hace menos falta), probar Holistic (un solo modelo). Todo
  pasado a la cabina. **Después**: Agustín "sigue perdiendo movimientos; imitá el MediaPipe de TouchDesigner" → cambios
  16 (recorte quieto, queda) y 17 (filtros crudos, apagado: medido sin mejora y con más saltos; HISTORIAL v14). Falta
  SU prueba en vivo con la v14 (3 hilos): es lo que debería cambiar lo que siente.
- **28/10: v13 "brazos cruzados y codos" — en prueba, esperando que Agustín la mire** (pedida: "si me cruzo de brazos
  los codos no se traquean bien y se deforma el modelo"). v12 archivada en `_versiones/v12`. **Cambio 7** (el límite de
  velocidad de la mano no acumula el corrimiento del antebrazo de adelante al cruzar; era un error de la v12): un brazo
  estirado atravesando el cuerpo B2-04 84% → 0%, B1-04 57% → 0%. Cambio 6 descartado y apagado. Detalle: FICHA
  **COD-3**. Fotos antes/después: `_pruebas/grabaciones/antes_despues_v13/` (esta compu no tiene ffmpeg: no hay videos
  comparados; las fotos por cuadro quedaron en `analisis_v13_comparado/` de B1_brazos y v12_bateria01, para unirlas con
  `video.js` en la PC de la cabina). Aplaudir (B2-08): el cambio 7 se acotó al cruce porque aplicado también al aplauso
  separaba las palmas (0,43 → 0,52); acotado al cruce, B2-08 da 17 cuadros con las palmas juntas a 0,48 (v12: 18 a
  0,43): queda una diferencia chica porque al juntar las manos los antebrazos también se tocan. **El cambio 7 ya está
  pasado a la cabina** (`3. experiencia/motor_v12/app.js`, 28/10, pedido por Agustín).
  **1/11**: Agustín probó en vivo con las manos ESCONDIDAS debajo de los brazos ("siguen quedando mal") y grabó
  `v13_grabacion01.mp4`. **Cambio 8** (en prueba): la mano escondida va al brazo contrario con los dedos relajados;
  palma al brazo 1,03 → 0,47 en su clip; pendiente que los brazos quedan altos (codos 0,32 vs 0,66). Cambios 6 y 9
  descartados y apagados. Detalle y fotos: FICHA COD-3. El cambio 8 también está pasado a la cabina (1/11).
  **9/11, cuadros por segundo** (en la notebook de Agustín iba a ~8): cambios 10–12 (manos alternadas con la cara, cuerpo
  sobre copia chica, mp4 de la cara pausado): detección −20 %. El panel H ahora muestra los ms de cada parte. Pendiente:
  que Agustín revise qué GPU usa su Chrome (TECNICO, "Dónde se va el tiempo"). Agustín seguía en 10 fps en la cabina →
  **hecho el mismo día**: modelo liviano por defecto (`?pose=full` vuelve) y **cambio 13: MediaPipe en otro hilo**
  (`detector_worker.js`; `?sin=13` lo apaga), en el tracking y en la cabina. Esperando que Agustín pruebe y diga los fps
  del panel H (`N fps · tracking M`). Pendiente: medir la precisión del modelo liviano (codos, manos) con las baterías.
  **9/11, cámara en vertical**: Agustín la monta físicamente en vertical (no puede girar la imagen en el driver) → el
  giro por defecto pasó a **90°** en el tracking y en la cabina (lo guardado con la tecla O manda; la cabina ahora deja
  pasar la O); con la imagen girada la zona útil ya era toda la imagen. Probado: al worker llega la imagen de 720×1280.
  Si la ve al revés: O hasta 270°.
  Esta copia del proyecto está en `Downloads` de otra compu (sin C920; tiene C525, cámara de la notebook y cámaras
  virtuales NDI: si Chrome da "AbortError", elegir la C525 en el ícono de cámara de la barra de direcciones).
- **Versión anterior: v12 "brazos y manos"** (carpeta `2. tracking webcam`, `ABRIR_TEST.bat`; v11 archivada en
  `_versiones/v11`). **En prueba, esperando la ronda del usuario** con los videos comparados
  `_pruebas/grabaciones/B1_comparado_v12/analisis_v12_comparado/` (03, 04, 05, 08), para comparar con los de v10
  (`bateria_2026-10-17_172643/analisis_v10_comparado/`). Qué cambió y números: HISTORIAL "Cambios v12"; estado por
  código: FICHA (COD-1, MAN-1/2/4/5/6 "En prueba v12"). Cada cambio se apaga con `?sin=1..5`.
  - Pendiente de la v12: taparse la cara (casi igual), codos en la nuca todavía más bajos que los tuyos, brazos
    cruzados mal 8,5–9,5 s de B1-04 (cambio de brazo), manos apoyadas sobre el otro brazo (no hecho), aplauso que
    acerca pero no aplasta; costo: B1-05 involuntarios 6 → 10 y palma adentro de la cabeza 13% de los cuadros.
  - **Batería 2 (B2, v12, de noche)** grabada por el usuario: `_pruebas/grabaciones/v12_bateria01/analisis_v12_comparado/`
    (10 videos comparados + hojas). Hallazgos míos en la FICHA (MAN-7 nueva; MAN-1/2/6, COD-1 con B2; corrección ENT-1).
    Aplaudir arriba: decidido y hecho el 19/10 (se juntan arriba del gorro), ver HISTORIAL.
  - El análisis ahora es **repetible** (MediaPipe con el tiempo del video): ya no hay "±10%" entre corridas.
- Versiones anteriores:
  - v8: funciona sin internet. v9: cámara 1080p, grabar (K), batería de 10 clips (B), análisis cuadro a cuadro y
    métricas. v10: sin giros involuntarios de antebrazo/mano — **en prueba** (el usuario no los mencionó en la ronda 1).
  - **v11 (17/10): entrada y salida** (ENT-1/2/3), medido en B1 con `entrada_salida.js`: salto de cabeza al calibrar
    4,5° → 1,7°/cuadro; entra todo junto en ~1,2 s (antes ~2,6); al salir del encuadre vertical suelta en 0,6 s
    (antes 1,5) y vuelve a reposo en 1,5 s (antes 2,6). **En prueba**: videos comparados v11 de B1-01/02/05/08 en
    `_pruebas/grabaciones/bateria_2026-10-17_172643_entrada/analisis_v11_comparado/` para que el usuario compare con
    los de v10 (`bateria_2026-10-17_172643/analisis_v10_comparado/`).
- **Cámara C920 configurada** en G HUB (17/10): prioridad "Frecuencia de cuadro" (antes bajaba a 16 cps con poca
  luz) y foco fijo ~4% (antes al infinito). Detalle en LEEME.
- **Investigación hecha** (3 pasadas: MediaPipe, comunidad VTuber, código de XR Animator, papers de retargeting con
  contactos, configuración de webcam): `investigacion_tracking.md` (leer primero la sección 0 y la D4).
- **Problemas**: `FICHA_PROBLEMAS.md`, por parte del cuerpo. Codos, manos en la cara, brazos cruzados, dedos, cabeza
  abajo/de espaldas y choques siguen abiertos.
- **Respuestas pendientes del usuario**: fecha de la muestra, gestos imprescindibles, si sirve el diseño híbrido
  (formas de mano reconocidas → poses animadas por él), presupuesto. La luz actual es de techo (mala); la de la cabina
  será mejor. Descartado por ahora sumar otra cámara.

## Batería 1 (17/10 17:26, v10) — `_pruebas/grabaciones/bateria_2026-10-17_172643/analisis_v10`
- Grabada y analizada (métricas + hojas de contacto). Luz de día, **con auriculares**, cadera fuera de cuadro otra vez.
- Peor: 05_codos (28 de 50 saltos, 5 de 6 involuntarios; manos en la nuca → tiesme con manos en las mejillas y codos
  abajo). Manos en la cara llega 9%. Brazos cruzados bajos (panza). Cabeza abajo no baja. De perfil el torso no gira.
- Bien: giro de cabeza 0,97; acercarse sin bamboleo; manos arriba de la cabeza; de espaldas no se dio vuelta.
- Grabando en vivo la página baja de ~55 a ~30 cuadros/s con las manos a la vista.
- El usuario **no puede responder la ronda sin ver cámara + tiesme sincronizados** (como con OBS): las hojas de
  contacto (1 foto cada 0,5 s) no alcanzan. **Hecho**: videos comparados (cámara | tiesme sincronizados) en
  `analisis_v10_comparado/<clip>_comparado.mp4` (`?comparado` + `_herramientas/video.js`, ver TECNICO).
- Permisos: la app trata `app.js` como "archivo sensible" y pregunta aunque esté "Aceptar ediciones"; avisar al
  usuario y no escribirle mientras esperan los permisos (si escribe, se cancelan).

## La experiencia de 3 actos (cabina v0.1 "cartón", 19/10) — va aparte del tracking
- Planificada en `3. experiencia/BIBLIA_EXPERIENCIA.md` (qué pasa en pantalla; ahí van los detalles, no acá) y armada
  como **cartón**: los 3 actos andando de punta a punta con material provisorio (texto, sonidito, movimientos por
  programa). Se abre con `3. experiencia/ABRIR_3ACTOS_TEST.bat`; uso, teclas, qué tendría que pasar y lo medido:
  `3. experiencia/LEEME_CABINA.md`. Numeración propia: "cabina v0.1".
- Usa una **copia** del motor v12 (`3. experiencia/motor_v12/`, enganche marcado `>>> CABINA`), por pedido de Agustín
  (ABRIR_TEST queda para calibrar el tracking). **Este `app.js` no se tocó.** Cuando una versión nueva del tracking
  convenga para la cabina, se pasa a mano (pasos en el LEEME_CABINA).
- Estado: esperando que Agustín la pruebe con la cámara; después, ronda de preguntas por acto.

## PARA RETOMAR (lista acordada el 17/10)
1. **Hecho (17/10)**: nombres de grabación `v10_bateria01/`, `v10_grabacion01.mp4`, numeración seguida entre
   versiones (servidor v3: hay que cerrar la ventana negra y abrir ABRIR_TEST.bat). La batería 1 quedó con el nombre
   viejo, así que la próxima saldría `v10_bateria01` (se puede renombrar la vieja). **Pendiente**: sacar la tecla O y
   el menú de giro (el usuario dijo "después lo vemos").
2. **Hecho**: batería 1 grabada y analizada (ver arriba).
3. **Prueba de exposición**: postergada (el usuario no sabe cómo cambiarla a mano; ver más adelante).
4. **Ronda 1 hecha (17/10)** con los videos comparados: todo anotado en la ficha (filas con "tus videos", códigos
   nuevos CAB-4, MAN-4/5/6, ENT-1/2/3). Hallazgo comprobado: el salto ~1 s después de entrar es la **pose neutra
   automática** (no los ojos). **Corregido después**: la neutra NO absorbía la cabeza agachada (mirar derecho mide
   15–22° en esta instalación); CAB-1 es pérdida de la malla con la cabeza baja. El usuario considera poco útiles
   los giros completos y acercarse con todo el cuerpo; sí le interesa inclinar cabeza/torso hacia la cámara.
   **v11 hecha (entrada/salida), esperando la opinión del usuario con los videos.** **v12 hecha (19/10, brazos y
   manos), esperando la ronda con los videos comparados v12.** Próxima: v13 cabeza (CAB-1, CAB-4). Falta confirmar MUN-1/MUN-2 y
   los arreglos v5–v6.
   **Acordado el 18/10 (regla nueva, ver CLAUDE.md)**: una versión = un área grande completa, midiendo cada cambio
   por separado adentro. **v12 = "brazos y manos"**: COD-1 (codos: B1-04 1 s, B1-05 3/4/7 s, B1-07 2 s, B1-08 2 y
   6 s), MAN-1 (manos en cara/nuca/cintura: B1-03 1–3/6/10 s, B1-05 1 y 4 s), MAN-2 (brazos cruzados, queda al
   revés: B1-04 0 y 5 s), MAN-4/MAN-5 (mano que queda arriba / se va sola: B1-03 8 y 11 s, B1-04 3 s, B1-05 7 s; y
   el "retener" un objetivo de un solo cuadro), MAN-6 (aplaudir: B1-08 3–4 s). Codo y mano van juntos porque se
   calculan en la misma cadena. Después: v13 cabeza (CAB-1, CAB-4), luego dedos y choques. Antes de diseñar la v12,
   leer `investigacion_tracking.md` (codo por swivel / rayo + largo de antebrazo, mapeo egocéntrico).
   Workflow de prueba: batería guiada (B) → videos comparados → análisis del usuario por video.
5. **Usuario**: elegir prioridades por área en la ficha; decidir si prueba XR Animator / Webcam Motion Capture.
6. **Mejoras investigadas para elegir juntos** (de más barata a más cara): filtrar solo la profundidad del cuerpo ·
   suavizar dedos relativo a la palma · profundidad de manos al 50% · re-recorte de la mano · pose heavy · codo por
   ángulo de giro (swivel) · choques con varias formas y tamaños ajustables · MediaPipe en otro hilo · mapeo
   egocéntrico (contactos) · formas de mano reconocidas (fingerpose) + poses animadas.
7. **En la cabina**: re-medir la cámara con su luz (exposición, antiparpadeo), probar sin internet, encuadre con cadera.

## Documentos (leer solo lo que haga falta)
| Archivo | Cuándo |
|---|---|
| `FICHA_PROBLEMAS.md` | siempre: problemas, causas, estado |
| `LEEME.md` | cómo se usa (abrir, teclas, grabar, cámara) |
| `TECNICO.md` | antes de tocar código o medir |
| `investigacion_tracking.md` | antes de proponer una mejora |
| `HISTORIAL.md` | solo si hace falta saber por qué se hizo algo en una versión vieja |
| `analisis_video_00-12-10_y_como_seguir.md` | autocrítica y opciones (17/10) |

## Rutas externas
- Biblioteca del personaje (**solo lectura**): `D:\AL PACIELLO\1. work materials - library\1. CHARACTERS\01. HUMANS\02. ADULTS\6. tita y richie\1. blender\tiesme.blend`
- Videos de prueba OBS: `F:\00. Materiales\1. Videos OBS\` (último: 2026-10-17 00-12-10, v8).
- Test de cara de julio (origen de `cara.js`): `D:\AL PACIELLO\2. projects\1. 2026\6. julio\claude\instalacion interactiva 01\`
