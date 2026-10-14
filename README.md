# Web Examenes Rafa

Aplicacion web para examenes teologicos de una iglesia, organizada por categorias de edad.

## Estado actual

Hay una aplicacion funcional, ya conectada a un proyecto Supabase real (`Examenes`, org `Anzi`) con las migraciones y el contenido de ejemplo de 1 Samuel 1 cargados:

- Login con usuario/contrasena (mapeado a Supabase Auth con un email sintetico).
- Autoregistro: cualquiera crea su propia cuenta (nombre, apellido, fecha de nacimiento, categoria, usuario y contrasena) sin intervencion de un admin.
- Panel principal con las categorias de edad y los tests de la categoria del participante.
- Flujo de examen: preguntas V/F, respuesta unica y respuesta multiple, entrega y correccion en el servidor (`submit_attempt`), un intento por test.
- Tras entregar (o al volver a abrir un test ya completado), el participante ve una revision pregunta a pregunta: su respuesta, la respuesta correcta y si acerto o fallo (`get_attempt_review`).
- En el registro cada participante elige su categoria de edad; el nivel del examen (facil, medio o dificil) se calcula automaticamente a partir de la categoria (nunca lo elige el usuario) segun un mapeo fijo. El aviso de edad solo se muestra para las categorias que son edades reales (`18-35`, `+35`); las demas son clases/niveles del profesor, no edades.
- Clasificaciones: por test, acumulada por categoria y general (esta ultima muestra a todos los participantes de todas las categorias, sin filtrar por nivel), cada una accesible desde el menu principal. Las pestañas "Por test" y "Acumulada por categoria" permiten elegir cualquier clase, no solo la propia (la vista `rankable_tests` expone esto sin afectar el acceso a hacer el examen, que sigue restringido por RLS a la propia clase).
- En el panel principal, un examen ya completado tiene un enlace ("ver respuestas") para volver a revisar el resultado y cada pregunta, incluidos examenes pasados.
- Esquema SQL completo con RLS y funciones de correccion server-side en `supabase/migrations`.

Falta: alta de usuarios/categorias/tests reales del profesor (solo hay 2 usuarios y 1 test de prueba) y despliegue verificado en GitHub Pages.

## Stack previsto

- Frontend: React + TypeScript + Vite.
- Publicacion: GitHub Pages mediante GitHub Actions.
- Backend: Supabase (Auth + Postgres + Row Level Security).
- Contenido: preguntas estructuradas en base de datos; los conversores del proyecto anterior pueden adaptarse para importar material inicial.

## Plan de accion

### Fase 1: Definir reglas

- Confirmar nombres y rangos de las categorias de edad.
- ~~Decidir si cada usuario puede realizar un intento, varios contando la mejor nota, o varios contando el ultimo.~~ Por defecto, un intento por test (`unique (test_id, user_id)`); revisar si el profesor quiere reintentos.
- Definir desempates: puntuacion, tiempo y fecha de entrega. Implementado en `test_rankings`: puntuacion desc, tiempo asc, fecha de entrega asc.
- Confirmar quien puede administrar preguntas, usuarios y resultados. De momento solo existe el flag `profiles.is_admin`, sin panel de administracion.

### Fase 2: Backend y seguridad

- [x] Crear proyecto Supabase separado del repositorio y aplicar las migraciones de `supabase/migrations`.
- [x] Login con usuario y contrasena (usuario -> email sintetico `<usuario>@participants.local`).
- [x] Perfiles ligados a una categoria de edad (`profiles.category_id`).
- [x] Politicas RLS: cada participante ve solo su categoria, sus propios intentos y nunca `correct_options`.
- [x] Vistas `test_rankings`, `category_rankings`, `general_rankings`.

### Fase 3: Modelo de contenido

- [x] Modelar preguntas de tipo verdadero/falso, respuesta unica y respuesta multiple.
- [x] `scripts/import-questions.mjs` convierte la plantilla CSV en el SQL de `tests`/`questions` (ver "De la plantilla al SQL" mas arriba); falta la carga inicial real de contenido de cada categoria.
- Adaptar los conversores DOCX/Excel existentes para producir el CSV de la plantilla (hoy la conversion PDF -> CSV se hizo a mano para `content/ejemplo_1_samuel_1.csv`).
- Validar que una pregunta multiple acepte exactamente las respuestas configuradas (el script ya valida letras de `correctas`, falta prueba end-to-end contra `submit_attempt`).

### Fase 4: Flujo del participante

- [x] Pantalla de login.
- [x] Pantalla de registro (`/registro`): nombre, apellido, fecha de nacimiento, categoria, usuario y contrasena; aviso no bloqueante si la edad no corresponde a la categoria elegida.
- [x] Menu principal segun la categoria del usuario.
- [x] Presentacion del test con progreso (respuestas en memoria mientras se responde; no hay guardado parcial en el servidor).
- [x] Correccion en servidor (`submit_attempt`, `security definer`) y guardado de un intento inmutable.
- [x] Pantalla de resultado tras entregar.

### Fase 5: Clasificaciones

- [x] Ranking por test (pestana "Por test" en Clasificaciones).
- [x] Ranking acumulado dentro de cada categoria.
- [x] Ranking general entre todas las categorias.
- [x] Mostrar nombre y apellido reales en vez del usuario (los rankings ya leen `profiles.display_name`, que ahora se rellena como "Nombre Apellido" al registrarse).
- [ ] Estados vacios cubiertos; empates resueltos por la vista; falta decidir la ocultacion de resultados mientras un examen siga abierto.

### Fase 6: Administracion y publicacion

- Panel minimo para crear o activar tests.
- Importacion de preguntas y previsualizacion antes de publicar.
- GitHub Actions para compilar y desplegar en GitHub Pages.
- Pruebas con 40 usuarios concurrentes y copia de seguridad de datos.

## Modelo inicial de datos

Tablas previstas: `profiles`, `age_categories`, `tests`, `questions`, `test_attempts` y `attempt_answers`.

Cada pregunta tendra un `type` (`true_false`, `single_choice` o `multiple_choice`), un enunciado, una lista de opciones y una lista de respuestas correctas. Las respuestas correctas no se expondran al navegador antes de corregir el intento.

## Formato para recibir los examenes del profesor

Pedirle al profesor una **hoja de calculo** (Excel o Google Sheets, exportada como CSV), no un Word libre: es lo que se puede validar e importar de forma fiable. Plantilla en [content/plantilla_preguntas.csv](content/plantilla_preguntas.csv), una fila por pregunta:

| Columna | Contenido |
| --- | --- |
| `categoria` | Nombre exacto de la categoria de edad (debe coincidir con `age_categories.name`) |
| `test` | Titulo del test; igual en todas las filas de ese test |
| `nivel` | Opcional: `facil`, `medio` o `dificil`. Si se omite, el importador usa `facil`. El nivel real que ve cada participante lo decide la categoria de edad (ver mapeo fijo mas abajo), no esta columna por si sola. |
| `orden` | Posicion de la pregunta dentro del test (1, 2, 3...) |
| `tipo` | `verdadero_falso`, `unica` o `multiple` |
| `pregunta` | Enunciado |
| `opcion_a` ... `opcion_f` | Texto de cada opcion (dejar vacias las que no se usen; V/F solo usa `opcion_a`/`opcion_b`) |
| `correctas` | Letra(s) de la(s) opcion(es) correcta(s), separadas por comas (`a` o `a,c`) |

Ventajas de este formato: Google Sheets permite que el profesor y sus ayudantes editen a la vez, se puede validar con formulas (por ejemplo que `correctas` solo use letras con opcion rellenada), y de ahi se escribe facilmente un script que genere las filas de `tests`/`questions` para las migraciones o para un importador via Supabase. Si el profesor prefiere escribir en Word, puede hacerlo como borrador, pero alguien tendra que pasarlo a esta plantilla antes de cargarlo.

El nivel del examen (`facil`, `medio` o `dificil`) lo asigna la app automaticamente segun la categoria de edad elegida al registrarse; el participante **no** elige el nivel. El mapeo fijo es: `2-3`/`4-5` -> facil, `6-7`/`8-9` -> medio, `10-11`/`18-35`/`+35` -> dificil (implementado en `src/lib/age.ts` y reforzado en el servidor por el trigger de la migracion `0007_auto_difficulty.sql`, que recalcula `profiles.difficulty` a partir de `age_categories.min_age` y asi protege contra llamadas directas a la API). La categoria de edad conserva el aviso no bloqueante si no coincide con la edad declarada.

Nota: a pesar de llamarse "categorias de edad" (tabla `age_categories`), solo `18-35` y `+35` son edades reales. `2-3`, `4-5`, `6-7`, `8-9` y `10-11` son clases/niveles del profesor que casualmente usan el mismo formato de rango numerico; por eso la interfaz no les añade la palabra "años" (ver `categoryIsRealAge()` en `src/lib/age.ts`, que decide esto por `min_age >= 18`).

Ejemplo real: [content/ejemplo_1_samuel_1.csv](content/ejemplo_1_samuel_1.csv) muestra como quedarian las preguntas de `Intrebari 1 Samuel 1.pdf` (categorias "2-3" y "8-9", preguntas de una sola respuesta) ya pasadas a la plantilla.

Leyenda pensada para el profesor (que columnas rellenar, valores permitidos de `tipo`, errores comunes): [content/leyenda_plantilla.md](content/leyenda_plantilla.md).

### De la plantilla al SQL

`scripts/import-questions.mjs` convierte un CSV con el formato de la plantilla en el SQL de insercion (categorias que falten + `tests` + `questions`), listo para pegar en el SQL editor de Supabase o ejecutar con `psql`:

```bash
npm run import:questions -- content/ejemplo_1_samuel_1.csv
# genera supabase/seed/ejemplo_1_samuel_1.sql (tests publicados, is_published = true)

npm run import:questions -- content/ejemplo_1_samuel_1.csv --draft
# igual, pero con is_published = false para revisar antes de publicar
```

El script valida el CSV (tipos reconocidos, letras de `correctas` que existen como opcion, niveles reconocidos y posiciones sin repetir dentro de cada test/categoria/nivel) y falla con un mensaje claro si algo no cuadra. Debe ejecutarse despues de aplicar las migraciones de `supabase/migrations`.

El CSV original del profesor (categorias `usor`/`mediu`/`avansat`, sin mapear a edades) se conserva como referencia en [content/ejemplo_1_samuel_1 - ejemplo_1_samuel_1.csv](content/ejemplo_1_samuel_1%20-%20ejemplo_1_samuel_1.csv); no se importa directamente. La version ya mapeada a categorias de edad y filtrada al mapeo fijo (una sola variante de nivel por categoria, 7 tests x 25 preguntas = 175) es [content/samuel_capitolul_1_2.csv](content/samuel_capitolul_1_2.csv). El SQL resultante esta en [supabase/seed/samuel_capitolul_1_2.sql](supabase/seed/samuel_capitolul_1_2.sql).

Para publicarlo en Supabase, aplica primero las migraciones pendientes (incluidas `0006_exam_difficulty.sql` y `0007_auto_difficulty.sql`) y despues ejecuta el seed anterior en el SQL editor. Las migraciones agregan el nivel al perfil y al examen, lo calculan automaticamente por categoria (nunca lo elige el participante), conservan el aviso por discrepancia de edad y separan las clasificaciones por nivel.

## Desarrollo local

```bash
npm install
npm run dev
```

Para una compilacion de produccion:

```bash
npm run build
```

## Variables futuras

Copiar `.env.example` a `.env.local` cuando se conecte Supabase. Nunca subir claves privadas ni el `service_role` al frontend.
