# SPOT CABINA — instrucciones para Codex

Instalación para una muestra de octubre 2026: cabina con una **tele vertical 9:16**; la persona se para frente a una
**webcam Logitech C920** y el personaje 3D **tiesme** copia sus movimientos de la cintura para arriba (cabeza,
pecho, cadera, hombros, brazos, manos, dedos y gestos de cara). App en el navegador: MediaPipe + three.js, todo local.

Usuario: **Agustín**, artista 3D (Blender), habla español rioplatense. Hablarle en ese idioma, claro y sin jerga.

## Al empezar un chat
1. Leer `2. tracking webcam/TRASPASO_CHAT.md` (estado actual y lista "PARA RETOMAR").
2. Leer `2. tracking webcam/FICHA_PROBLEMAS.md` (problemas por parte del cuerpo, con estado).
3. Lo demás solo cuando haga falta (el TRASPASO dice qué hay en cada documento). No releer todo por las dudas.

## Reglas de trabajo (acordadas con el usuario)
1. **Analizar lo que dice el usuario y decir qué pienso, con fundamento**, antes de actuar. Explicar en profundidad y
   **esperar su OK** antes de cambios de código o de configuración. No decidir solo qué arreglar.
2. **Una versión = un área grande completa** (acordado el 18/10): todas las observaciones del usuario de esa área
   (ej. "brazos y manos"), para que entre versión y versión haya un salto significativo. Para no mezclar efectos,
   **dentro de la versión medir cada cambio por separado** (antes/después de cada uno) y decir cuál ayudó y cuál
   empeoró. Antes de decir "listo", contrastar con la lista del usuario: qué se corrigió y qué quedó pendiente, con
   segundo y código. Antes de empezar: archivar la versión con `_herramientas/archivar_version.js`, subir `VERSION`
   en `app.js` y el número en `index.html`.
3. **Medir con grabaciones reales** (batería, registro por cuadro, análisis `?lote=`, `metricas.js`, hojas de contacto)
   y dar números antes/después. El demo sintético solo sirve para ver que no se rompió nada.
   **Workflow que le sirve al usuario** (18/10): él graba la batería (tecla B, clips guiados de ~12 s moviendo una
   parte del cuerpo por clip) → Codex analiza y arma los **videos comparados** cámara | tiesme sincronizados
   (`?comparado` + `video.js`) → el usuario los mira y escribe su análisis por video con segundos → Codex lo pasa a
   la ficha y arma la versión siguiente.
4. **Nada se da por resuelto sin que el usuario lo confirme.** Después de cada versión, ronda de preguntas por área.
5. Cuando el usuario manda un video OBS (`F:\00. Materiales\1. Videos OBS\`), analizarlo completo y buscar fallas
   además de las que marca; anotarlas en la ficha con código fijo.
6. **Investigar antes de inventar** (comunidad, papers, código abierto); ver `investigacion_tracking.md`.
7. Al cerrar cada bloque de trabajo: actualizar `TRASPASO_CHAT.md` y `FICHA_PROBLEMAS.md` (y `HISTORIAL.md` /
   `LEEME.md` si hubo versión nueva). Así se puede cambiar de chat en cualquier momento.
8. No buscar ni tocar archivos fuera de esta carpeta sin preguntar. La biblioteca del personaje es **solo lectura**.
   Nunca pisar archivos `.blend` ni versiones anteriores: guardar versiones nuevas.
9. Si el usuario está probando una versión con la cámara, no tocar la carpeta principal: preparar la siguiente aparte.
10. Avisarle al usuario cuando el chat esté largo (más o menos a la mitad del contexto) para pasar a uno nuevo en un
    punto de corte, con el TRASPASO al día.

## Datos útiles
- Abrir: `2. tracking webcam/ABRIR_TEST.bat` (servidor Node en el puerto 8090). La página dice la versión en el panel.
- La cámara C920 está configurada en G HUB (prioridad cuadros, foco fijo); la vista previa de G HUB ocupa la cámara.
- PC con Windows, GPU RTX 3060, Chrome, Node y ffmpeg instalados. TouchDesigner no está instalado.
