# Análisis del video `2026-10-14 19-32-21.mp4` (v2) → correcciones v3

Video OBS de 69 s a 60 fps. Revisado a 2 fps completo, a 10 fps en los tramos problemáticos y con una
medición cuadro a cuadro a 30 fps (cuánto cambia el personaje vs cuánto cambia la cámara) para encontrar
los movimientos involuntarios.

## Medidas del personaje (por qué fallaba)
| | tiesme | persona promedio |
|---|---|---|
| Antebrazo / brazo | 289 / 168 = **1,7** | ≈ 0,9 |
| Ancho de cabeza / ancho de hombros | 264 / 251 = **1,05** | ≈ 0,4 |

La v2 copiaba los ángulos de tus brazos. Con un antebrazo tan largo y una cabeza tan grande, los mismos
ángulos llevan la mano de tiesme a otro lugar: se pasa del centro (brazos cruzados) y llega a la cara
cuando vos tenés la mano en el mentón.

## Fallas encontradas
| Tiempo | Vos | tiesme (v2) | Causa |
|---|---|---|---|
| 4–8 s | girás la cabeza con brazos en cruz | todo el cuerpo se desliza al costado; giro de cabeza que salta de perfil | posición del cuerpo tomada de los ojos; giro calculado con 4 puntos |
| 10–11, 13,5–15,5, 32, 40–41 s | manos a los costados de la cabeza, palmas al frente | manos delante de la cara / atravesándola | ángulos copiados + cabeza enorme, sin colisión |
| 16–19,5 s | manos frente a la cara, a la altura de los ojos | manos sobre la cara, un brazo cruzado | ídem |
| 21–23,5, 24–31,5 s | te tapás la cara | brazos cruzados en X, manos en el pecho/mentón; torso girado solo | ángulos copiados; hombros tapados por los brazos → giro de pecho falso |
| 25–29,8 s | quieto con la cara tapada | brazos y torso se mueven solos (picos en la medición) | landmarks de cara/hombros degradados sin control |
| 36–37,5 s | manos juntas sobre la panza | manos cruzadas a la altura del pecho | ángulos copiados |
| 41,5–43 s | manos en las mejillas | manos en el cuello | ídem |
| 43–50 s | manos sobre la cabeza | cabeza tumbada 45–90° sobre el hombro, manos adentro de la cabeza, cuerpo corriéndose | la frente tapada deforma el cálculo de la cabeza; sin límites anatómicos |
| 50,5–52,5 s | manos en las mejillas | brazos cruzados frente al pecho | ángulos copiados |
| 53–54,5 s | manos en rezo frente a la boca | brazos colgando con las manos dentro del torso | mano de canto → distancia mal medida (detrás del cuerpo) |
| 56–59,5 s | rezo frente al pecho | brazos cruzados, cada mano en el hombro contrario | ángulos copiados |
| 60–66,5 s | frotarte las manos / manos entrelazadas bajo el mentón | manos en la cara y brazos en X | ídem |
| general | — | 23 fps (la v1 iba a 30) | la cara con gestos se detectaba en todos los cuadros |

## Correcciones v3
- **Manos a la medida de tiesme**: la muñeca va a una *posición* equivalente, no a un ángulo. Por tramos:
  dentro de los hombros escala por ancho de hombros, más allá por largo de brazo, hacia arriba hasta la
  cabeza por la altura de la cabeza. Cerca de tu cabeza la **palma** se ubica relativa a la cabeza de tiesme
  (en tamaños de cabeza): taparte la cara, tocarte las mejillas o la cabeza cae en el mismo lugar de la suya.
  Después un IK con los largos reales de tiesme.
- **Colisión**: la palma no entra en la cabeza ni en el torso (elipsoides medidos de la malla, que giran
  con la cabeza y el pecho); el codo busca otro plano si el antebrazo atraviesa el torso.
- **Cabeza**: rotación con la matriz de MediaPipe (calculada sobre toda la malla), límites anatómicos
  (giro ±70°, cabeceo −35/+40°, inclinación ±35°, relativos al pecho) y **congelada** mientras las manos
  tapan la cara (también la distancia y los gestos).
- **Pecho**: límites (giro ±35°, inclinaciones ±20°).
- **Cuerpo**: se mueve con los hombros, no con la cabeza.
- **Asignación de manos**: por cercanía a la muñeca del cuerpo + continuidad con el cuadro anterior; la
  etiqueta izquierda/derecha de MediaPipe pesa poco (con las manos juntas la invierte seguido).
- **Mano de canto**: nunca se ubica detrás del cuerpo.
- **Rendimiento**: la cara se detecta un cuadro sí y uno no.

## Verificación (modo demo con escenas sintéticas)
Distancia normalizada de la palma a la cabeza de tiesme (menos de 1 = adentro):

| Escena | v2 | v3 |
|---|---|---|
| manos al costado de la cabeza | 0,31 (adentro) | 1,21 |
| tapar la cara | 0,13 (adentro) | 1,27 (delante de la cara) |
| manos arriba de la cabeza | 0,73 + cruzadas | 1,31, sin cruzar |
| rezo | cruzadas, a la altura del mentón | juntas en el centro, a la altura del pecho |
| manos en la panza | cruzadas | juntas |

Además: con el orden y la etiqueta de las manos mezclados al azar, 0 cuadros cruzados; inclinación de cabeza
de 70° limitada a 35°; con la cara tapada la cabeza no se mueve aunque la detección diga cualquier cosa;
mover solo la cabeza desplaza el cuerpo 0%; temblor igual o menor que la v2.
Falta probarlo con la cámara real.
