# Notas para armar la experiencia (técnico)

Complemento de `BIBLIA_EXPERIENCIA.md` (qué pasa). Esto es **cómo** armarlo. Escrito el 18/10/2026 como propuesta.

## Hecho: cabina v0.1 (cartón), 19/10/2026
Está la estructura funcional de los 3 actos: cómo se usa, teclas, qué tendría que pasar y lo medido en
**`LEEME_CABINA.md`**. Cambios respecto de la propuesta de abajo:
- **No es "un solo motor"**: Agustín pidió no tocar `ABRIR_TEST` (queda para calibrar el tracking) y armar los 3 actos
  aparte (`ABRIR_3ACTOS_TEST.bat` → `3actos.html`). La cabina usa una **copia** del motor v12 (`motor_v12/app.js`) con el
  enganche marcado `>>> CABINA`; `2. tracking webcam` no se tocó. Las mejoras del tracking se pasan a mano cuando se
  quiera (copiar el app.js nuevo y reponer los bloques marcados).
- El enganche quedó así: en `set()` cada hueso pasa por `CAB.hueso(r, t)` (el tracking ya calculado), y ahí
  `cabina/cuerpo.js` aplica retraso (historial de 2,5 s por hueso), lo contrario (refleja el giro del hueso del otro
  lado respecto de su pose de bind: verificado, la mano en la panza pasa al otro lado reflejada), impreciso (hacia el
  reposo + giro lento) y el dial a la pose propia. La pose propia se escribe en grados (cabeza, torso) y direcciones
  (brazo, antebrazo), con "vida" (respiración y micro movimientos). La cara propia se arma con blendshapes inventados
  que se le pasan a `cara.js` (no se tocó).
- Señales (`cabina/senales.js`): salen de los puntos del cuerpo, los blendshapes y el giro de cabeza que ya calcula el
  motor. El "movimiento" suma el giro de la cabeza (mover solo la cabeza no es estar quieto).
- Fondo: canvas 2D como fondo de la escena de three.js (sin 3D). Hilos y glitch: canvas 2D encima.
- Audio: todo generado (Web Audio); cada código busca su archivo en `audio/` y si está lo usa.
- Pollito inglés quedó como paso propio (2.4b) entre la degradación y el quiebre, con prendido/apagado en el guion.

## Estructura propuesta (18/10, antes de armarlo)
- **Un solo motor**: la app de tracking (`2. tracking webcam/app.js`) sigue siendo la misma. La experiencia es una capa
  encima, en esta carpeta (`3. experiencia/`): director, guion, viñeta, audio, imágenes. Se abre con un .bat propio
  (ej. `ABRIR_CABINA.bat`) o con `?cabina`. Así cada mejora del tracking llega sola a la cabina.
- **Enganche chico en `app.js`** (un bloque marcado, unas decenas de líneas):
  1. **Dial por parte del cuerpo** (cabeza, pecho, cada brazo, cada mano, dedos, cara) que mezcla tracking ↔ movimiento
     propio. Ya existe algo igual: en `updateRig`, la función `set()` mezcla cada hueso con la pose de reposo según
     `entryE` (entrada de la v11). El dial sería lo mismo por parte, contra una pose que pone el director.
  2. **Degradación del acto 2** (escalones en la biblia, paso 2.4): por parte, un retraso (búfer de objetivos de 0 a
     ~1 s), imprecisión (offset que crece y amplitud que baja), **lo contrario** (invertir el objetivo de esa parte
     respecto del espejo: izquierda ↔ derecha, también cabeza) y el corte (0% tracking, pose propia). Cada parte con
     su propio horario en el guion. Mismo lugar que el dial.
  3. **Señales** para el director: hacia dónde mira la persona (para el "pollito inglés"), altura de las manos, boca,
     sonrisa (`cara.js` ya mide `smile`, `jaw`, `blink`, cejas), cuánto se mueve cada parte, dónde está (para el ojo de
     Richie), presencia (`updatePresence`).
  4. **Grabador** de los objetivos por hueso (para que tiesme repita el gesto de la persona en el acto 3).
  5. Acceso a **fondo, luces, posición del modelo** (entrar desde abajo, asomarse) y a las texturas de tiesme y Richie.
- **Guion en un archivo** de datos: cada paso con duración, textos, código de audio, condiciones para avanzar y qué
  hace tiesme. Cambiar tiempos y textos sin tocar código.
- **Audio** cargado al arrancar (Web Audio). Cada frase tiene el código de la biblia (ej. `R1-saludo-2`): la voz
  grabada reemplaza al sonidito de prueba con el mismo código. Boca de la visera / de tiesme movida por el volumen
  del audio (como hoy la "boca con voz" con el micrófono).
- **Ojo de Richie**: del mp4 que pase Agustín se sacan cuadros y se ordenan por la posición del ojo (como
  `1. tiesme modelo/estados_cara/`); el gorro se dibuja en un canvas como la cara de tiesme (`cara.js`).
- **Teclas para quien atiende**: reiniciar, saltar a un acto, pausar.
- **Versión propia**: "cabina v0.1 (cartón)". El tracking sigue con su numeración (v12, v13…).

## Alcance propuesto de la cabina v0.1 (cartón)
| Entra | Queda para después |
|---|---|
| Director con los 3 actos, Espera y Reinicio; guion editable | Voces grabadas (van sonidito + texto) |
| Pantalla de título, viñeta de diálogo (solo mientras alguien habla), indicadores e íconos simples, juego de las estatuas con timer | Animaciones de Blender (van movimientos por programa) |
| Asomada y entrada desde abajo (desplazamiento simple) | Arte final del fondo y música final |
| Richie dice con consignas detectadas, trampa y gesto grabado | Boca de la visera y ojo de Richie (esperan el material) |
| Acto 2: tercera pose que libera, timer roto y glitch de pantalla, degradación por partes (retraso, imprecisión, lo contrario, corte), **hilos de titiritero** que se cortan, **pollito inglés**, quiebre (negro, luz) | Golpe en el vidrio y saludo actuados (van aproximados) |
| Acto 3: textos a la persona, burla elegida por datos, repetición del gesto, copiá vos simple, te echan | Sonido cercano / espacial |
| Plan B, persona que se va, teclas de quien atiende | |

(18/10: Agustín decidió que pollito inglés e hilos entran para probar; antes estaban "para después".)

## A tener en cuenta
- ~~Coordinar `app.js`~~: ya no hace falta (la cabina tiene su copia del motor).
- El acto 1 necesita tracking limpio para que la degradación del acto 2 se lea. Las consignas usan solo lo que el
  tracking copia bien (giro de cabeza ~0,97 en la batería 1; manos arriba y saludar bien). Mirar a la izquierda pasando
  ~45° pierde la malla de la cara (CAB-4), pero en la tercera pose tiesme ya no copia la cabeza: no molesta. Para
  saber hacia dónde mira la persona alcanza la estimación por el cuerpo.
- Render: hoy MediaPipe y el render comparten el hilo; un fondo 3D pesado puede bajar los cuadros. Empezar con 2D.
