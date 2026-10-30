# Backend Django

API REST de Planificador de menús, desarrollada con Django y Django REST Framework.

Para una descripción general del proyecto y el despliegue, consulta el [README principal](../README.md).

## Requisitos

- Python 3.13.
- Entorno virtual de Python.
- SQLite para desarrollo local. MySQL 8.4 se usa mediante Docker en producción.

## Instalación local

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver
```

La API se inicia en `http://localhost:8000/api/`.

Completa las variables de `.env` antes de iniciar el servidor.

Para probar MySQL, Redis, Nginx y tres procesos de Uvicorn juntos sin certificados,
consulta el [Docker local del README principal](../README.md). Usa el Compose
independiente `docker-compose.local.yml` y `.env.docker.local` en la raíz. Ese modo
ejecuta Django con `DEBUG=False`, la base MySQL del contenedor y Redis compartido;
no utiliza `pmdjango/.env` ni la base SQLite de desarrollo. Las imágenes se
construyen con el código local y las migraciones se aplican a la base del proyecto
Docker `planificador-menus-local`.

## Comandos

```powershell
# Ejecutar todos los tests
python manage.py test

# Crear y aplicar migraciones
python manage.py makemigrations
python manage.py migrate

# Ejecutar el backend
python manage.py runserver
```

Black es el formateador de Python y se instala con las dependencias de desarrollo.
Su versión está fijada en `requirements-dev.txt` y su configuración en
`pyproject.toml`. Prettier se encarga de los formatos compatibles del repositorio,
pero no de Python.

```powershell
python -m black --check .
python -m black .

# Comprobaciones de configuración y migraciones pendientes
python manage.py check
python manage.py makemigrations --check --dry-run
```

Si el entorno restringe el acceso a la caché de usuario de Black, puedes comprobar
el formato con `python -m black --check --no-cache --workers 1 .`.

`requirements.txt` fija las versiones de las dependencias directas de ejecución;
`requirements-dev.txt` añade Black sin instalarlo en producción. Las versiones
transitivas no están bloqueadas. Actualiza las versiones de forma deliberada y
ejecuta las pruebas después. Las versiones fijadas corresponden al entorno local
existente, salvo Uvicorn 0.54.0, que no estaba instalado localmente.

## Aplicaciones

Los favoritos pertenecen al usuario autenticado, mediante relaciones independientes
en productos y recetas. Las migraciones `ingredients/0003_ingredient_favorite_users`
y `recipes/0005_recipe_favorite_users` crean las tablas de relación, sin modificar
los productos o recetas existentes; inicialmente nadie tiene favoritos.

`PUT /ingredients/{id}/favorite/` y `PUT /recipes/{id}/favorite/` marcan como
favorito; `DELETE` en esas mismas rutas lo quita. Son operaciones idempotentes y
solo afectan a `request.user`. Devuelven `{ "is_favorite": true/false }`.
Exigen autenticación y devuelven 404 si el recurso no existe o la receta no es
visible. Marcar una receta no concede permisos sobre ella: si se pierde acceso
a su grupo, tampoco aparece entre favoritas.

Los listados y búsquedas de ingredientes y recetas (incluidas las categorías)
aceptan `favorites=true`, combinado con sus filtros existentes antes de paginar.
Este filtro exige autenticación; un valor inválido devuelve 400. Los resultados
incluyen `is_favorite`, relativo al usuario de la petición (false para invitados).
La búsqueda de ingredientes admite `favorites=true` sin nombre ni categoría.
Las consultas usan `Exists` para resolver el indicador sin una consulta adicional
por favorito; las relaciones de usuarios no se exponen ni se pueden editar desde
los serializers de catálogo.

`DELETE /lists/{codigo}/{id_ingrediente}/` elimina toda la fila de ese producto
de la lista del grupo, con independencia de su cantidad o estado comprado.
Requiere pertenencia aceptada al grupo y devuelve 404 si la fila no existe.
No borra el ingrediente del catálogo, los menús ni las relaciones con recetas.

Las recetas guardan `creation_date` como fecha sin hora, con el día local de
`Europe/Madrid`. El servidor la asigna al crear la receta y no admite cambios
desde la API. La migración `recipes/0003_recipe_creation_date` asigna a todas las
recetas existentes el día en que se ejecute la migración, sin fijar una fecha en
el código. La web la muestra únicamente en el detalle completo de la receta.

Los comentarios guardan `created_at` como instante con zona horaria, asignado por
el servidor y conservado al editar. La migración `0004_recipecomment_created_at`
rellena todos los comentarios existentes con el mismo momento de ejecución.
La web muestra fecha y hora de Madrid sin segundos; se conserva la precisión del
instante almacenado para ordenar correctamente.

`GET /comments/{id}/` admite `order=newest` (predeterminado) u `order=oldest`,
y `scores=5,4` para seleccionar una o varias puntuaciones entre 0 y 5. Sin
`scores` se incluyen todas. Las puntuaciones seleccionadas se combinan entre sí
con OR y con el orden elegido. Se filtra antes de paginar y se ordena por
`created_at` e ID como desempate. Valores inválidos devuelven 400, conservando
los permisos sobre la receta. El comentario propio sigue en su bloque separado.

Los GET de `/ingredients/`, `/ingredient_by_name/`,
`/ingredient_categories/{id}/ingredients/`, `/recipes/`, `/recipes/search/`,
`/recipe_category/{id}/recipes/` y `/comments/{id}/` devuelven
`{count, next, previous, results}`. Admiten `page` y `page_size` (máximo 100).
Por defecto se devuelven 30 ingredientes, 24 recetas o 20 comentarios por página.
Los filtros y permisos se aplican antes de paginar. Las recetas se ordenan por ID,
los ingredientes por nombre e ID y los comentarios por fecha e ID descendentes.

`/recipes/top/` sigue devolviendo un array de hasta diez recetas. Categorías,
grupos y listas de la compra conservan sus respuestas completas. Los POST y los
endpoints de detalle no cambian de formato.

`GET /menus/{codigo}/?from=YYYY-MM-DD&to=YYYY-MM-DD` devuelve todos los menús
del intervalo, de hasta 31 días inclusivos, incluyendo fechas pasadas.
Sin parámetros devuelve la semana actual completa, de lunes a domingo, según
`Europe/Madrid`. Los POST y DELETE siguen rechazando fechas anteriores a hoy.
Fechas inválidas,
intervalos invertidos o demasiado largos devuelven 400. La web envía las fechas
de la semana visible y consulta de nuevo al navegar entre semanas.

Este cambio requiere actualizar el frontend junto al backend: los consumidores
de los listados paginados deben leer `results` y recorrer las páginas necesarias.

- `users`: usuarios de Google, login y JWT.
- `groups`: grupos, miembros, roles e invitaciones.
- `ingredients`: categorías e ingredientes.
- `recipes`: recetas, categorías, valoraciones y comentarios.
- `menus`: calendario semanal de recetas por grupo.
- `lists`: lista de la compra del grupo.

## Scripts de carga

La carpeta `scripts/` contiene los datos y scripts para cargar ingredientes, categorías y recetas de prueba.

Antes de ejecutar `loadIngredients.js` o `loadRecipes.js`, configura en el propio script una URL de API válida y un access token vigente. Por ejemplo:

```powershell
node .\scripts\loadRecipes.js
```

## Producción

En producción el contenedor ejecuta las migraciones y levanta la API ASGI mediante Uvicorn. La configuración de MySQL, hosts permitidos, CORS, OAuth y secretos se recibe mediante variables de entorno definidas en el `.env` de Docker Compose.

## Productos: búsqueda, envases y recuperación

`GET /ingredient_by_name/` conserva `name` y admite además `category`. Ambos filtros
se combinan antes de paginar; una categoría principal incluye sus subcategorías.
Sin nombre ni categoría mantiene el error anterior. Las respuestas de ingredientes,
ingredientes de recetas y filas de compra incorporan `package_amount`, calculado
con `Decimal` en `ingredients/quantities.py`, sin cambiar la unidad de referencia.

El tamaño del catálogo sirve directamente para kg, litros (incluyendo `L`) y
metros; docenas y formatos por 100 g/100 ml se expresan en su unidad de referencia
como ya hace la lista. Para piezas y lavados no se interpreta el peso como número
de unidades: solo se infiere un conteo cuando la relación de precios es un entero
exacto. Los datos incompletos o ambiguos devuelven `null` y el cliente pide cantidad
manual. Las cantidades de entrada son positivas, con tres decimales como máximo.

El PATCH de una fila acepta `expected_amount` opcional: si difiere de la cantidad
guardada devuelve 409 sin modificarla. Las escrituras de listas y menús bloquean
la fila del grupo dentro de una transacción, para serializar sus acumulaciones
en MySQL. SQLite mantiene sus propias restricciones de escritura concurrente.

DELETE de un producto conserva el mensaje anterior y añade `undo_id`. La migración
`lists/0003_removedlistitem` crea tickets personales en `RemovedListItem`, con
cantidad, unidad, estado comprado y caducidad de treinta segundos. El nuevo
`POST /lists/{codigo}/{ingrediente}/restore/` recibe `{"undo_id":"<UUID>"}` y exige
que el usuario conserve pertenencia aceptada al grupo y sea quien lo eliminó.
Restaura una sola vez; devuelve 404 para tickets caducados, ajenos o consumidos y
409 si el producto ya existe o su unidad ha cambiado. Nunca suma ni sobrescribe
cantidades al deshacer. Limpiar la lista invalida sus tickets; las eliminaciones
posteriores purgan los tickets caducados. Estas operaciones generan los mismos
avisos de lista por WebSocket después del commit.

## Actualizaciones en tiempo real

`config/realtime/` contiene el consumidor de Django Channels y los avisos de
calendario, lista de la compra y pertenencia a grupos. Las escrituras siguen
pasando por REST. Las señales publican avisos con `transaction.on_commit()`;
un rollback no publica y un fallo de Redis se registra sin deshacer la escritura.
Tras un fallo, el publicador espera cinco segundos antes de reintentar, evitando
un timeout por cada producto de una operación masiva. Estos avisos no se reenvían.
Los mensajes no contienen recetas, productos ni datos personales de otros miembros.

El endpoint `/ws/events/` valida el origen contra `CORS_ALLOWED_ORIGINS`. El
primer mensaje es `{"type":"authenticate","token":"<access JWT>"}`; hay cinco
segundos para autenticarse. El servidor responde `ready` después de suscribir
al canal personal. `{"type":"subscribe","group_code":"CODIGO01"}` sustituye
la suscripción del grupo; `null` la elimina. Solo se admite pertenencia aceptada
y el servidor responde `subscribed` o `subscription.denied`. Cada aviso de grupo
vuelve a comprobar el permiso. Los JWT caducados cierran la conexión con 4401.
Se limita cada mensaje a 2048 bytes y a 30 mensajes por conexión en diez segundos.
El cliente envía `ping` cada 25 segundos; `pong` también comprueba el acceso actual.

Los avisos son `menu.changed` (incluye `date`), `shopping_list.changed`,
`membership.requested`, `membership.changed`, `membership.decided` (estado
`accepted` o `rejected`), `membership.revoked`, `group.updated` y `group.deleted`.
Todos incluyen `group_code`. Las decisiones y las revocaciones llegan al canal
personal del afectado; los solicitantes no pueden suscribirse al grupo privado.
Eliminar un grupo avisa también a quienes estaban pendientes.

`GET /api/groups/{codigo}/membership/` requiere autenticación y devuelve solamente
el estado del usuario que consulta: `accepted`, `pending` o `none`. No permite
consultar a terceros. Un rechazo elimina la solicitud según las reglas anteriores;
tras una desconexión `none` indica ausencia de solicitud, sin inventar un historial.

En desarrollo, sin `REDIS_URL`, se usa memoria y **un único proceso**. Para probar
WebSockets, usa Uvicorn en lugar del servidor HTTP de Django:

```powershell
.\venv\Scripts\python.exe -m uvicorn config.asgi:application --host 127.0.0.1 --port 8000 --ws websockets-sansio --ws-max-size 2048
```

En producción `REDIS_URL` es obligatorio. Compose configura Redis interno sin
publicar puertos, con 128 MiB de memoria interna, límite de contenedor de 256 MiB,
colas de 100 mensajes y caducidad de mensajes de 30 segundos. No se guardan copias
persistentes de los avisos; la base de datos conserva los datos reales. Los tres
procesos de Uvicorn comparten Redis. No sustituirlo por memoria con varios procesos.

Las pruebas de `config.realtime` usan SQLite de pruebas y la capa en memoria.
Cubren permisos, transacciones, rechazo, eliminación, reconexión de permisos y una
conexión WebSocket real con Uvicorn que recibe cambios hechos por HTTP. La prueba
de red abre únicamente un puerto efímero en `127.0.0.1`. Antes del despliegue,
comprobar también Redis, Nginx y los tres procesos juntos y medir la RAM bajo carga;
el límite de Redis no limita la memoria del backend ni de sus conexiones.
