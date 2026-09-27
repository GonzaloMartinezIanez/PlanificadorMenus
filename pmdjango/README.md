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
pip install -r requirements.txt
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

Para formatear Python con Black, instálalo en el entorno virtual:

```powershell
pip install black
black --check .
black .
```

## Aplicaciones

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
