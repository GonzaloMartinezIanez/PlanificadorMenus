# Seguridad de dependencias

Revisión realizada el 30/10/2026 sobre los manifiestos y el lockfile del proyecto.

## Actualizaciones

| Componente             | Versión anterior | Versión verificada |
| ---------------------- | ---------------- | ------------------ |
| Angular y compilador   | 21.2.17          | 21.2.25            |
| Angular CLI y build    | 21.2.18          | 21.2.29            |
| Vitest                 | 4.1.10           | 4.1.12             |
| Django                 | 6.0.6            | 6.0.8              |
| Django REST Framework  | 3.17.1           | 3.18.2             |
| Black                  | 26.5.1           | 26.10.1            |
| npm para instalaciones | 11.4.2           | 11.21.1            |
| Imagen de Nginx        | 1.27-alpine      | 1.30.6-alpine      |

El nuevo lockfile actualiza también dependencias transitivas como Vite, Undici y
Piscina. Angular sigue en la versión principal 21 y Django en la rama 6.0. No se
han usado `--force` ni `--legacy-peer-deps` para resolver incompatibilidades.

Npm 11.4.2 fallaba con `edgesOut` al resolver el árbol actualizado. El lockfile se
resolvió con npm 11.21.1 y se comprobó con una instalación limpia mediante `npm ci`.
Docker y CI usan esa misma versión de npm; no hace falta cambiar globalmente npm
en el equipo para ejecutar la instalación indicada abajo.

## Resultado y alcance

- `npm audit`: de 31 paquetes afectados (3 críticos, 18 altos, 9 moderados y 1 bajo)
  a cero vulnerabilidades conocidas. Incluye las dependencias de desarrollo.
- `pip-audit -r requirements-dev.txt`: de avisos en Django, DRF y Black a cero
  vulnerabilidades conocidas, incluyendo las dependencias transitivas resueltas.
- La imagen oficial `nginx:1.30.6-alpine` existe y la versión 1.30.6 corrige los
  problemas publicados en los [avisos oficiales de Nginx](https://nginx.org/en/security_advisories.html).
- Los builds de imágenes en CI usan `pull: true` para actualizar las bases flotantes
  de Node.js 22 y Python 3.13 al reconstruir.

Con las nuevas versiones pasan las 239 pruebas de Angular y las 126 de Django,
los builds de producción y Docker local, ESLint, Prettier y Black. También pasan
`pip check`, la comprobación de Django y la detección de migraciones pendientes
de generar; esta actualización no modifica los modelos de datos.

La auditoría de paquetes no analiza el sistema operativo del VPS ni los paquetes
del sistema dentro de las imágenes. No se ha podido ejecutar la comprobación
completa de Docker porque el motor no está disponible en el entorno de revisión.
Los tags de MySQL 8.4, Redis 7.4, Node 22 y Python 3.13 conservan sus ramas actuales;
sus imágenes necesitan descargarse de nuevo para recibir las revisiones publicadas.
No se ha publicado ni desplegado ninguna imagen.

## Repetir las comprobaciones

Frontend, desde `pmangular/`:

```powershell
npm exec --yes --package=npm@11.21.1 -- npm ci
npm audit
npm test -- --watch=false
npm run lint
npm run build
npm run build -- --configuration=production,docker-local
npm run format:check
```

Backend, desde `pmdjango/`, con su entorno virtual activado y configuración local:

```powershell
python -m pip install -r requirements-dev.txt
python -m pip install pip-audit==2.10.1
python -m pip_audit -r requirements-dev.txt
python -m pip check
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
python -m black --check --no-cache --workers 1 .
```

`pip-audit` es una herramienta de revisión local; no se añade al contenedor de
producción. Las auditorías consultan servicios externos y reflejan los avisos
conocidos en el momento de ejecutarlas. Las pruebas del backend deben usar una
base de pruebas local, nunca la base de producción.

Para comprobar las imágenes y la integración completa, sigue el despliegue local
del [README](README.md#prueba-completa-con-docker-en-local). Reconstruye el frontend
y el backend y actualiza las imágenes base antes de esa prueba. Los cambios de
dependencias no añaden migraciones nuevas.
