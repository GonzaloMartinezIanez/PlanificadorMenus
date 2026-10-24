# Frontend Angular

Cliente web de Planificador de menús, desarrollado con Angular 21 y Angular Material.

Para una descripción general del proyecto y el despliegue, consulta el [README principal](../README.md).

## Requisitos

- Node.js 22.
- npm 11 o compatible.

## Instalación y ejecución

```powershell
npm install
ng serve
```

La aplicación de desarrollo se inicia en `http://localhost:4200` y usa la API configurada en `src/environments/environment.development.ts`.

## Comandos

```powershell
# Ejecutar tests una vez
npm test -- --watch=false

# Generar el build de producción
npm run build

# Comprobar TypeScript y plantillas con ESLint
npm run lint

# Aplicar las correcciones automáticas de ESLint y revisar el resultado
npm run lint:fix

# Comprobar formato del repositorio sin modificar archivos
npm run format:check

# Aplicar formato
npm run format
```

Prettier está fijado a una versión concreta y usa `.prettierrc` y la configuración
de la raíz para los archivos fuera de Angular. Los comandos de formato abarcan
todo el repositorio; `.prettierignore` excluye dependencias, builds, secretos y
datos de carga. Python se formatea con Black desde `pmdjango/`.

ESLint se configura en `eslint.config.mjs` y comprueba TypeScript y plantillas
Angular. El formato queda a cargo de Prettier.

## Estructura

```text
src/app/
|- components/     # Pantallas y componentes reutilizables
|- core/           # Login, layout, header, footer y diálogos
|- guards/         # Protección de rutas autenticadas y de grupos
|- interceptors/   # Adjunta y renueva el JWT
|- models/         # Interfaces TypeScript
|- services/       # Comunicación con la API
```

## Configuración

`src/environments/environment.ts` contiene la configuración de producción y `environment.development.ts` la de desarrollo. Ambas definen la URL de la API y el Client ID público de Google OAuth.

No incluyas tokens de acceso ni secretos en estos ficheros.
