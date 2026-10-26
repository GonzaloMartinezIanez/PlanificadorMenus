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

Las recetas guardan `creation_date` como fecha sin hora, con el día local de
`Europe/Madrid`. El servidor la asigna al crear la receta y no admite cambios
desde la API. La migración `recipes/0003_recipe_creation_date` asigna a todas las
recetas existentes el día en que se ejecute la migración, sin fijar una fecha en
el código. La web la muestra únicamente en el detalle completo de la receta.

Los GET de `/ingredients/`, `/ingredient_by_name/`,
`/ingredient_categories/{id}/ingredients/`, `/recipes/`, `/recipes/search/`,
`/recipe_category/{id}/recipes/` y `/comments/{id}/` devuelven
`{count, next, previous, results}`. Admiten `page` y `page_size` (máximo 100).
Por defecto se devuelven 30 ingredientes, 24 recetas o 20 comentarios por página.
Los filtros y permisos se aplican antes de paginar. Las recetas se ordenan por ID,
los ingredientes por nombre e ID y los comentarios por ID descendente.

`/recipes/top/` sigue devolviendo un array de hasta diez recetas. Categorías,
grupos y listas de la compra conservan sus respuestas completas. Los POST y los
endpoints de detalle no cambian de formato.

`GET /menus/{codigo}/?from=YYYY-MM-DD&to=YYYY-MM-DD` devuelve todos los menús
del intervalo, de hasta 31 días inclusivos, manteniendo el filtro de fechas desde
hoy. Sin parámetros devuelve desde hoy hasta seis días después. Fechas inválidas,
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
