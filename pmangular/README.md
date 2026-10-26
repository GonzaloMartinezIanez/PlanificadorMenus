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

## Carga de listados

Los servicios de ingredientes, búsquedas de recetas y comentarios usan
`PaginatedResponse<T>` (`count`, `next`, `previous`, `results`). Las pantallas
añaden resultados con «Cargar más» y vuelven a la primera página al cambiar los
filtros. Una respuesta anterior no puede sustituir los resultados de la búsqueda
actual; los fallos permiten reintentar sin descartar las páginas ya cargadas.
Las recetas populares siguen siendo un listado de hasta diez elementos.
El calendario consulta el intervalo de la semana visible mediante `from` y `to`.

Los comentarios permiten combinar el orden por fecha (recientes o antiguos)
con varias puntuaciones. Cada cambio vuelve a la primera página; «Cargar más»
conserva ambos filtros. La valoración propia queda separada de la lista filtrada.
Las fechas de publicación se presentan mediante `Intl.DateTimeFormat` en
`Europe/Madrid`, con día, mes, año, hora y minutos, sin segundos.

## Inicio de sesión compartido

`core/google-login/` contiene el botón reutilizable de Google y el intercambio de
la credencial mediante `AuthService`. Emite `authenticated`, `loadingChange` y
`loginError`, de modo que cada pantalla mantiene su navegación y mensajes.

`services/google-identity.service.ts` comparte la descarga del SDK, limita el
tiempo de espera y permite volver a cargarlo después de un fallo. Inicializa la
API una sola vez y desconecta el callback de la pantalla al destruir el botón.
Las pantallas de login e invitación a grupos usan este mismo componente.

## Estilos compartidos

La interfaz usa blanco como superficie principal y verde como acento para botones,
enlaces y selecciones. El rojo se reserva para errores y acciones destructivas.
Las estrellas de valoración conservan el amarillo mediante `--app-color-rating`.

El texto secundario busca un contraste de al menos 7:1 sobre las superficies
claras. Los controles usan `--app-color-control-border` (mínimo 3:1 respecto al
fondo); `--app-color-border` queda para separadores y paneles decorativos. Las
estrellas usan un relleno amarillo vivo y un contorno oscuro con contraste superior
a 3:1 sobre blanco, mediante `--app-color-rating-outline`. Comprueba los colores efectivos
del navegador, incluidos estados seleccionados, foco y botones deshabilitados,
al cambiar la paleta. Estas comprobaciones de contraste no sustituyen una
auditoría completa de accesibilidad.

- `src/material-theme.scss`: paleta y personalizaciones de Angular Material
  mediante `mat.theme`, `mat.theme-overrides` y los overrides de cada componente.
- `src/styles/tokens.css`: variables `--app-*` de color, espaciado, radios,
  sombras, tipografía y anchuras. Los colores se derivan del tema Material.
- `src/styles/fonts.css`: las fuentes Roboto y Material Icons se cargan desde
  `public/fonts/`, junto a sus licencias, sin depender de Google Fonts.
- `src/styles/patterns.css`: patrones reutilizables de cabecera de página
  (`app-page-heading`), panel (`app-panel`) y estado vacío (`app-empty-state`).
- `src/styles.css`: reglas base de tipografía, foco, cabeceras, mensajes y
  contenedores de diálogo compartidos.
- CSS de cada componente: distribución y estados particulares de su pantalla.

Antes de introducir un valor nuevo, reutiliza una variable existente. Conserva la
encapsulación, los cortes responsive de 960px/640px y los estilos estáticos fuera
del HTML. Evita selectores internos de Material, `::ng-deep` e `!important`, salvo
las excepciones de accesibilidad de movimiento reducido. Las dimensiones
específicas de imágenes, iconos o columnas pueden permanecer en su componente.

En ventanas de más de 1920 px, el tamaño raíz aumenta gradualmente hasta el 125 %
a 2560 px y se mantiene limitado en pantallas mayores. Los tamaños en `rem`
permiten que texto, espacios, controles y anchuras máximas crezcan juntos. Usa
unidades relativas para estos elementos; conserva los puntos de adaptación de
móvil en píxeles. La escala depende del ancho de la ventana en píxeles CSS, no de
la resolución física ni de la densidad del monitor, y respeta la fuente del navegador.
