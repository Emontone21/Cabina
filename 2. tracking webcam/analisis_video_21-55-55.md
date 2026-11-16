# Análisis del video `2026-10-16 21-55-55.mp4` (v5, primera prueba real)

114 s, grabado en vertical (1080×1920). Versión correcta (panel "v5", dirección principal).
Revisado a 1 cuadro por segundo completo, a 10 cuadros/s en los tramos marcados y con medición cuadro a cuadro
(cuánto cambia tiesme contra cuánto cambia tu cámara).

## Lo que ya funciona
- **Anclado**: tiesme no se traslada en ningún momento; queda en el centro.
- **Presencia al entrar**: sentado al costado (0–1 s) tiesme queda en reposo.
- **Brazos en jarra** (1:11–1:14): codos afuera, se ve bien.
- **Mano tapando la cara** (1:20–1:23): la mano queda delante de la cara, no adentro.

## Fallas encontradas (por prioridad)

| # | Tiempo | Qué se ve | Causa |
|---|---|---|---|
| 1 | 1:23–1:28, 1:30–1:33 | Te tapás la cara con la mano y tiesme **baja los brazos**; al destaparte **vuelven de golpe** (los saltos más grandes del video: 1:28,5 y 1:33) | La "presencia" exige ver la cara: al taparla te da por ausente y vuelve a entrar. |
| 2 | 1,7 s y 1:28,5 | Al empezar a seguirte hay un **tirón**: cabeza, brazos y cara cambian de golpe | La entrada no tiene rampa: pasa de reposo a seguirte en 1–2 cuadros. |
| 3 | casi todo el video | Tiesme tiene la **cabeza agachada** y la cara con la **boca de brackets encima de los ojos** | La cámara está más abajo que tu cara; sin apretar C, eso se lee como "mirar abajo" y dispara el estado de ojos "sorpresa" (giro > 10°). |
| 4 | 0:25–0:34, 0:49, 1:21–1:31 | El brazo que tenés colgado, o la mano en la panza, queda **delante de la entrepierna** | a) La pose de reposo tiene el antebrazo hacia adelante y al centro. b) Al tocar el torso, la mano se empuja hacia afuera desde el centro del cuerpo y termina abajo. |
| 5 | 1:00–1:10 | **Brazos cruzados**: los antebrazos se atraviesan entre sí y quedan a la altura de la panza | No hay choque entre los dos brazos; además, la altura tiende a la de la panza. |
| 6 | 0:28, 0:32, 0:51 | Mano por encima de la cabeza **atraviesa la gorra** | La zona de choque de la cabeza es la cara, no incluye la gorra. |
| 7 | 0:02–0:16 | Manos levantadas a la altura de tu cabeza → las de tiesme quedan **más bajas** (hombro / mentón) | Se combina el empuje para que no entren en la cabeza (gigante) con la escala vertical. |
| 8 | general | **24 fps** (antes ~30) | La búsqueda del plano del codo agregada en la v5 y OBS grabando a la vez. |

## Estado
Las 8 correcciones están hechas en la v6 (16/10). Verificado en el demo, falta la cámara real:
cara tapada 4 s → no se suelta (mano 1,6%); cabeza con la cámara 20° más baja → 0°; reposo → manos al lado del
short; mano en la panza → sobre el abdomen y delante; brazos cruzados → a la altura del pecho, sin atravesarse;
mano sobre la cabeza → fuera de la gorra; manos al costado de la cabeza → a la altura de la cara; temblor igual o
menor que la v5.

## Plan de corrección propuesto
1. Presencia: para entrar hace falta la cara; para seguir alcanzan los hombros (tapar la cara no te saca).
2. Rampa de entrada de ~0,8 s (mezcla suave de reposo → seguimiento).
3. Postura neutra automática al entrar (no depende de apretar C) que se adapta lenta; los ojos "sorpresa" solo
   por cejas, no por cabeceo.
4. Reposo con brazos a los costados (manos al lado de la cadera) y choque de mano con el torso "hacia adelante"
   (la mano queda apoyada delante de la panza, no se va abajo).
5. Choque entre brazos (brazos cruzados uno delante del otro, a la altura del pecho).
6. Gorra dentro de la zona de choque de la cabeza.
7. Revisar la altura de las manos al lado de la cabeza.
8. Optimizar el cálculo del codo (menos intentos cuando no hay choque).
