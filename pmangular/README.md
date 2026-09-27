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
ng test -- --watch=false

# Generar el build de producción
ng build

# Comprobar formato sin modificar archivos
npx prettier --check "src/**/*.{ts,html,css,scss,json}"

# Aplicar formato
npx prettier --write "src/**/*.{ts,html,css,scss,json}"
```

La configuración de Prettier se encuentra en `.prettierrc`.

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
