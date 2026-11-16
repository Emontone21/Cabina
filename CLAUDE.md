# SPOT CABINA — instrucciones para Claude

Instalación para una muestra (5/12/2026): cabina con una **tele vertical 9:16**; la persona se para frente a una
**webcam Logitech C920** y el personaje 3D **tiesme** copia sus movimientos de la cintura para arriba (cabeza,
pecho, cadera, hombros, brazos, manos, dedos y gestos de cara). App en el navegador: MediaPipe + three.js, todo local.

Usuario: **Agustín**, artista 3D (Blender), habla español rioplatense. Hablarle en ese idioma, claro y sin jerga.

## Al empezar un chat
1. Leer `2. tracking webcam/TRASPASO_CHAT.md` (estado actual y lista "PARA RETOMAR").
2. Leer `2. tracking webcam/FICHA_PROBLEMAS.md` (problemas por parte del cuerpo, con estado).
3. Lo demás solo cuando haga falta (el TRASPASO dice qué hay en cada documento). No releer todo por las dudas.
4. Chats de la experiencia de 3 actos: leer además `3. experiencia/LEEME_CABINA.md` (estado, uso y lo medido); la
   biblia y las notas de esa carpeta, cuando haga falta.

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
   parte del cuerpo por clip) → Claude analiza y arma los **videos comparados** cámara | tiesme sincronizados
   (`?comparado` + `video.js`) → el usuario los mira y escribe su análisis por video con segundos → Claude lo pasa a
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
10. **Tope de contexto: 50%** (acordado el 19/10; vale para todos los chats de desarrollo, tracking y 3 actos). Medirlo
    con la herramienta de uso de la sesión (`get_usage`) al cerrar cada bloque de trabajo y antes de arrancar uno
    grande. Al llegar al 50%, **sin esperar a que el usuario lo pida**: dejar los documentos al día (tracking:
    `TRASPASO_CHAT.md` y `FICHA_PROBLEMAS.md`; 3 actos: `3. experiencia/LEEME_CABINA.md`, biblia y notas), abrir un
    **chat nuevo en esta misma carpeta** (así queda en el grupo SPOT CABINA de la barra lateral) con un traspaso que
    diga qué leer, en qué quedó y qué sigue, y avisarle al usuario con el link. El chat viejo no sigue trabajando.
    Objetivo: no gastar tokens de más ni perder contexto.

## Datos fijos del proyecto (antes estaban en la memoria de la PC; acá viajan con el disco)
- **tiesme es ella** ("es piba, no pibe", 18/10): en chats, documentos y frases, "ella", "la muñeca", "despierta",
  nunca "él". Richie (el gorro charlatán) sí es él. Si un documento viejo dice "él" para tiesme, corregirlo de paso.
- **La experiencia de 3 actos** (planificada el 18/10): el tracking es solo la base. **TITIRITERO** (tiesme te copia;
  Richie le habla con consignas tipo "Simón dice") → **ESTATUA / REVELACIÓN** (estatuas; en la tercera pose tiesme se
  libera, la pantalla falla, el control se degrada hasta que se mueve sola) → **CONTRA-TITIRITERO** (te hablan, se
  burlan con lo que hiciste, te echan). Richie sabía todo y se hace el boludo; tiesme es muñeca sin personalidad en el
  acto 1 y habla recién al romper la cuarta pared. Cabina cerrada, una persona adulta, alguien atendiendo, auriculares;
  voces grabadas por Agustín (las frases las escribe él con otra IA a partir de la biblia); tono chiste + inquietante
  (Wii → negro). Ojo de Richie: él pasa un mp4 y se cortan cuadros según dónde mira. Altura de cámara: pendiente.
  Para el tracking: en el acto 1 tiene que copiar limpio; en el acto 2 las fallas juegan a favor.
- **Biblia aparte del traspaso**: la idea de la experiencia va en `3. experiencia/BIBLIA_EXPERIENCIA.md` (el "génesis",
  va mutando; Agustín se la pasa a otra IA para escribir frases, así que tiene que leerse sola, sin códigos de la ficha
  ni jerga); cómo armarla, en `3. experiencia/NOTAS_PARA_ARMARLO.md`. El `TRASPASO_CHAT.md` es solo del tracking: no
  anotar ahí la charla de la experiencia.
- **Cabina con motor aparte** (19/10): los 3 actos se abren con `3. experiencia/ABRIR_3ACTOS_TEST.bat` → `3actos.html`,
  con una **copia** del motor (`3. experiencia/motor_v12/`, enganche marcado `>>> CABINA`). El trabajo de la
  experiencia no edita `2. tracking webcam/`; `ABRIR_TEST` es el banco para calibrar el tracking. Las mejoras del
  tracking se pasan a la cabina a mano, cuando Agustín quiera (cómo: `3. experiencia/LEEME_CABINA.md`).
- **Decir el alcance antes de arrancar** (18/10): cuando Agustín da una lista larga de observaciones, espera que la
  versión siguiente ataque mucho de esa lista. Antes de empezar, mostrarle en una tabla qué entra (con segundo y
  código) y qué queda para después y por qué; al terminar, repetir la tabla con corregido / pendiente. (Salió de la
  v11, que cubrió 3 de ~40 observaciones sin avisarle.)
- **Dónde anotar lo que hay que recordar**: en este `CLAUDE.md` o en los documentos de la carpeta, no en la memoria de
  Claude, que queda en cada máquina (ver "Datos útiles").

## Datos útiles
- El proyecto vive en el disco **Kingston** (USB, exFAT; en la PC es `D:`) para poder trabajarlo también desde una
  **Mac**. Los chats, la barra lateral y la memoria de Claude quedan en cada máquina y en la otra no aparecen: por eso
  todo lo necesario va en los documentos. Los `.bat` son solo de Windows: cada uno tiene al lado un gemelo `.command`
  para la Mac (uso y plan B en `3. experiencia/LEEME_CABINA.md`, "En la Mac"; sin probar todavía en una Mac). En la
  Mac hay que instalar Node, ffmpeg y Chrome y configurar la C920 en G HUB. Expulsar el disco antes de desenchufarlo.
- Abrir: `2. tracking webcam/ABRIR_TEST.bat` (servidor Node en el puerto 8090). La página dice la versión en el panel.
- La cámara C920 está configurada en G HUB (prioridad cuadros, foco fijo); la vista previa de G HUB ocupa la cámara.
- PC con Windows, GPU RTX 3060, Chrome, Node y ffmpeg instalados. TouchDesigner no está instalado.
