# Supabase

Aqui viven las migraciones SQL y las funciones necesarias para el backend.

Proyecto conectado: **Examenes** (organizacion `Anzi`, ref `sdkacefvpppvufkfzolb`, region `eu-west-1`). La URL y la clave publica ya estan en `.env.local` (no versionado); para volver a vincular la CLI usa `supabase link --project-ref sdkacefvpppvufkfzolb` con un access token de cuenta (`supabase login` o `SUPABASE_ACCESS_TOKEN`).

## Migraciones

1. `0001_initial_schema.sql` - categorias, perfiles (con `username` para el login), tests, preguntas, intentos y respuestas.
2. `0002_row_level_security.sql` - RLS en todas las tablas; `questions` solo es consultable directamente por administradores.
3. `0003_ranking_views.sql` - vistas `test_rankings`, `category_rankings` y `general_rankings`.
4. `0004_test_taking_functions.sql` - `get_test_questions()` (preguntas sin `correct_options`) y `submit_attempt()` (corrige y guarda el intento en el servidor).
5. `0005_self_registration.sql` - columnas `first_name`/`last_name`/`birth_date` en `profiles`; permite que un participante cree su propia fila en `profiles` (nunca con `is_admin = true`) y que `age_categories` se lea sin sesion (para el desplegable de categorias en el registro).
6. `0006_exam_difficulty.sql` - columna `difficulty` (`facil`/`medio`/`dificil`) en `profiles` y `tests`; `get_test_questions()`, `submit_attempt()` y la RLS de `tests` ahora tambien filtran por nivel; `test_rankings`/`category_rankings`/`general_rankings` lo incorporan en el agrupamiento.
7. `0007_auto_difficulty.sql` - trigger `profiles_set_difficulty`: calcula `profiles.difficulty` a partir de `age_categories.min_age` segun el mapeo fijo del profesor (ver "Decisiones tomadas"), ignorando cualquier valor que mande el cliente. Corrige tambien las filas existentes.
8. `0008_attempt_review.sql` - `get_attempt_review(p_attempt_id)`: devuelve, para un intento propio ya entregado, cada pregunta con la opcion elegida, la opcion correcta y si acerto. Permite mostrar al participante por que fallo una pregunta (antes no habia forma de verlo).
9. `0009_fix_general_rankings.sql` - corrige `general_rankings`, que la migracion `0006` habia particionado por `difficulty` por error: un participante de nivel "medio" nunca veia a los de "facil" ni "dificil" en el ranking general. Ahora el ranking es global de verdad; `category_rankings` no se toco (su particion por categoria+nivel ya era correcta, pues el nivel es funcion directa de la categoria).
10. `0010_rankable_tests.sql` - vista `rankable_tests` (id, title, category_id, category_name, difficulty de cada test publicado, de **todas** las clases). La tabla `tests` sigue restringida por RLS a la propia clase (eso protege el acceso a responder el examen), pero las clasificaciones no son sensibles y antes el selector "Por test" de `RankingsPage` consultaba `tests` directamente, por lo que RLS lo limitaba en silencio a la clase del usuario.

Aplicar en orden con `supabase db push` o pegando el contenido en el SQL editor del proyecto.

## Contenido (seed)

`seed/` guarda el SQL generado por `scripts/import-questions.mjs` a partir de un CSV con el formato de `content/plantilla_preguntas.csv` (categorias que falten + `tests` + `questions`). Se aplica despues de todas las migraciones. Ver la seccion "De la plantilla al SQL" del README principal para el comando exacto.

- `ejemplo_1_samuel_1.sql` - "1 Samuel - Capitolul 1", categorias `2-3` y `8-9`, 13 preguntas, sin nivel (nivel por defecto `facil`).
- `samuel_capitolul_1_2.sql` - "1 Samuel - Capitolul 1-2", las 7 categorias de edad, 25 preguntas cada una (175 en total), cada una con el nivel que le corresponde por el mapeo fijo.

## Decisiones tomadas

- Los participantes inician sesion con **usuario**, no con email. `profiles.username` guarda el nombre visible para el login y Supabase Auth almacena un email sintetico `<username>@participants.local`.
- Desde la migracion `0005`, el alta de usuarios es **autoregistro**: cualquiera crea su propia cuenta desde `/registro` (nombre, apellido, fecha de nacimiento, categoria, usuario, contrasena). La politica RLS de insert/update en `profiles` permite `id = auth.uid()` pero nunca deja que el propio usuario se ponga `is_admin = true`; solo un admin existente puede crear perfiles admin.
- Requisito de configuracion en el proyecto Supabase (no esta en las migraciones SQL, es config de Auth): `mailer_autoconfirm` debe estar en `true` (Authentication > Providers > Email > "Confirm email" desactivado), porque el dominio sintetico `@participants.local` no puede recibir correos de confirmacion. Sin esto, `auth.signUp()` no devuelve sesion activa y el registro se queda a medias.
- Las edades no se validan contra la categoria elegida salvo en las categorias que son edades reales (`18-35`, `+35`): el resto (`2-3` .. `10-11`) son clases/niveles del profesor, no edades, asi que el aviso de discrepancia no aplica ahi (`categoryIsRealAge()` en `src/lib/age.ts` decide esto por `min_age >= 18`).
- El nivel del examen (`facil`/`medio`/`dificil`) **no lo elige el participante**: lo determina la categoria de edad segun un mapeo fijo del profesor (`2-3`/`4-5` -> facil, `6-7`/`8-9` -> medio, `10-11`/`18-35`/`+35` -> dificil). Se calcula tanto en el cliente (`src/lib/age.ts`, funcion `difficultyForMinAge`) como, de forma autoritativa, en el servidor mediante el trigger de la migracion `0007` — asi un valor incorrecto enviado directamente a la API REST se corrige igualmente. Cada categoria de edad solo tiene **un** test publicado por titulo de examen (el del nivel que le corresponde), no las 3 variantes.
- Un participante solo puede enviar **un intento por test** (`unique (test_id, user_id)` en `test_attempts`). Si el profesor quiere permitir reintentos, hay que revisar esta restriccion y la funcion `submit_attempt`.
- Las clasificaciones (`*_rankings`) son vistas propiedad del rol de migracion, por lo que no aplican las politicas RLS de "solo mis propios intentos": muestran datos agregados de todos los participantes a proposito. Muestran `profiles.display_name` (nombre y apellido reales desde el registro), nunca `username`. `general_rankings` es siempre global (todas las categorias y niveles); `category_rankings` esta acotado a la categoria (y, por extension, al nivel) del participante.

## Pendiente

- Decidir si se ocultan las clasificaciones mientras un test sigue abierto (`tests.ends_at`).
- El autoregistro abierto permite que una misma persona cree varias cuentas con distinto usuario para repetir un test que solo permite un intento; no hay control contra esto todavia (p. ej. deduplicar por nombre+apellido+fecha de nacimiento).
- Cargar mas contenido real de preguntas por categoria (hoy esta 1 Samuel 1 y 1 Samuel 1-2).
