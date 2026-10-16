# Cómo rellenar la plantilla de preguntas

Cada **fila** de la hoja es **una pregunta**. Estas son las columnas y qué se puede poner en cada una.

| Columna | ¿Qué se escribe? | Ejemplo |
|---|---|---|
| `categoria` | El nombre del grupo de edad. Tiene que escribirse **exactamente igual** en todas las preguntas de ese grupo (mayúsculas/espacios incluidos). | `2-3`, `8-9` |
| `test` | El título del examen. Todas las preguntas de un mismo examen llevan el **mismo texto**, tal cual. | `1 Samuel - Capitolul 1` |
| `nivel` | Opcional: dificultad de esas preguntas (`facil`, `medio` o `dificil`). Si se omite, el importador usa `facil`. Importante: el participante **no elige** el nivel al registrarse, lo determina su categoria de edad (ver aviso abajo), asi que cada categoria solo debe tener filas del nivel que le corresponde. | `medio` |
| `orden` | El número de la pregunta dentro de ese examen: 1, 2, 3... en orden, sin saltos ni repetidos. | `1`, `2`, `3` |
| `tipo` | Solo puede ser una de estas tres palabras (ver leyenda de tipos abajo). | `unica` |
| `pregunta` | El enunciado de la pregunta, tal cual se lee en voz alta. | `¿Cómo se llamaba la esposa de Elcana que no tenía hijos?` |
| `opcion_a` a `opcion_f` | El texto de cada opción de respuesta. Se dejan **vacías** las que no hagan falta. | ver más abajo |
| `correctas` | La(s) letra(s) de la(s) opción(es) correcta(s), en minúscula, separadas por coma si hay más de una. | `a` o `a,c` |

## Leyenda de `tipo`

| Valor de `tipo` | Qué significa | Cuántas opciones se rellenan | Cuántas letras van en `correctas` |
|---|---|---|---|
| `verdadero_falso` | Pregunta de Verdadero o Falso | Solo `opcion_a` (escribir `Verdadero`) y `opcion_b` (escribir `Falso`). El resto se deja vacío. | Una sola letra: `a` si es verdadero, `b` si es falso |
| `unica` | Se elige **una sola** respuesta correcta entre varias | Las que hagan falta, de `opcion_a` en adelante (normalmente 3 o 4) | Una sola letra: `a`, `b`, `c`... |
| `multiple` | Se pueden elegir **una, dos o todas** las respuestas correctas | Las que hagan falta | Todas las letras correctas separadas por coma: `a,b`, `a,b,c`... |

## Ejemplos ya rellenados

- [plantilla_preguntas.csv](plantilla_preguntas.csv): un ejemplo corto con los tres tipos de pregunta (sin respuestas reales de ningun alumno, es solo para ver el formato).

Los examenes reales ya cargados (p. ej. "1 Samuel") no se guardan en este repositorio porque es publico y la columna `correctas` expondria las respuestas: se quedan solo en local y en Supabase. Ver la seccion de seguridad del README principal.

## Errores comunes a evitar

- Escribir el nombre de la `categoria` o del `test` de forma distinta en dos filas (por ejemplo `2-3` en una y `2 - 3` en otra) crea sin querer una categoría o un examen nuevo.
- Dejar huecos o repetir números en `orden` dentro del mismo test.
- Poner en `correctas` una letra que no tiene texto en su `opcion_x`.
- Si el texto de una pregunta u opción lleva comas, hay que escribirlo entre comillas dobles: `"Sem, Cam y Jafet"`.
- Poner en una misma categoria de edad preguntas de dos niveles distintos (p. ej. filas `6-7`/`facil` y `6-7`/`medio` para el mismo examen): solo debe existir **una** combinacion categoria+nivel por examen, la que le corresponde segun el mapeo fijo del profesor.
