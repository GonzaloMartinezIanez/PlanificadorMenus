# Frontend Angular

Cliente web de Planificador de menús, desarrollado con Angular 21 y Angular Material.

Para una descripción general del proyecto y el despliegue, consulta el [README principal](../README.md).

## Requisitos

- Node.js 22.
- npm 11.21.1, declarado en `packageManager` y usado también en Docker y CI.

## Instalación y ejecución

```powershell
npm ci
ng serve
```

La aplicación de desarrollo se inicia en `http://localhost:4200` y usa la API configurada en `src/environments/environment.development.ts`.

Si tu npm local es anterior, puedes instalar desde el lockfile sin cambiar la
instalación global con `npm exec --yes --package=npm@11.21.1 -- npm ci`.
Usa `npm ci` para reproducir las versiones verificadas. La auditoría y las
actualizaciones están descritas en [DEPENDENCIES.md](../DEPENDENCIES.md).

Para probar el conjunto con Docker, sigue la sección de Docker local del
[README principal](../README.md). El argumento de build `BUILD_CONFIGURATION`
del Dockerfile vale `production` por defecto. El Compose local usa
`production,docker-local`: conserva la optimización de producción y sustituye
solo el entorno por `environment.docker-local.ts`, con frontend, API y WebSockets
en el mismo origen que la ventana (`localhost:4200` o `127.0.0.1:4200`). El cliente
OAuth de Google debe autorizar el origen exacto usado. Nginx conserva el puerto original en el encabezado `Host`
para que los enlaces absolutos de la API apunten también al servidor local.

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

La papelera de cada producto elimina su fila completa de la lista del grupo y
actualiza los productos y el total desde el servidor. Está disponible también
para productos comprados. No elimina el ingrediente del catálogo ni las recetas
del calendario; planificar de nuevo una receta puede volver a añadirlo a la lista.

Los servicios de ingredientes, búsquedas de recetas y comentarios usan
`PaginatedResponse<T>` (`count`, `next`, `previous`, `results`). Las pantallas
añaden resultados con «Cargar más» y vuelven a la primera página al cambiar los
filtros. Una respuesta anterior no puede sustituir los resultados de la búsqueda
actual; los fallos permiten reintentar sin descartar las páginas ya cargadas.
Las recetas populares siguen siendo un listado de hasta diez elementos.
El calendario consulta el intervalo de la semana visible mediante `from` y `to`.
Permite navegar también a semanas anteriores. Los días pasados muestran las
recetas y sus enlaces en modo de consulta, sin añadir ni eliminar; el backend
mantiene las mismas restricciones de escritura. Si cambia la semana a medianoche,
la vista actual avanza, pero una semana histórica seleccionada se conserva.
La cuadrícula del calendario comparte las filas de fecha, desayuno, comida y cena
mediante CSS `subgrid`, también entre componentes. Las filas de comidas crecen
según sus recetas y permanecen alineadas entre días. El calendario ocupa al menos
la altura disponible del layout, con desplazamiento horizontal en móvil.
Cada receta del calendario tiene una papelera compacta junto al nombre. El botón
«+» usa el color primario y ocupa el espacio libre del turno; ambos controles
conservan etiquetas accesibles y solo aparecen en días editables.

Los comentarios permiten combinar el orden por fecha (recientes o antiguos)
con varias puntuaciones. Cada cambio vuelve a la primera página; «Cargar más»
conserva ambos filtros. La valoración propia queda separada de la lista filtrada.
Las fechas de publicación se presentan mediante `Intl.DateTimeFormat` en
`Europe/Madrid`, con día, mes, año, hora y minutos, sin segundos.
Al actualizar los filtros se mantiene la lista anterior hasta recibir la respuesta
y se reutilizan los elementos por usuario. El mensaje de carga reserva espacio
con `app-loading-status` para evitar parpadeos y saltos de altura durante la petición.

## Selección de productos y cantidades

`components/ingredients/product-picker-dialog/` es el diálogo compartido por la
lista y el formulario de recetas. Conserva el buscador, las categorías y el scroll
al añadir; en escritorio muestra resultados y cantidad a los lados y en móvil el
detalle aparece debajo. «Terminar» cierra el diálogo.
En móvil, «Ocultar» pliega el detalle y «Mostrar» lo recupera conservando producto
y cantidad. Elegir otro producto despliega su detalle; en escritorio siempre se muestra.
Las categorías muestran solo el icono y el nombre de la seleccionada, tanto en el
selector como en la lista; conservan etiquetas accesibles y tooltips. Si no hay
icono, se muestra el nombre. En el selector se busca por nombre o por categoría:
escribir reinicia las categorías y elegir una categoría limpia el texto.
Las consultas anteriores no sustituyen a
las nuevas y sus resultados permanecen visibles durante la actualización.

`ProductQuantity` reutiliza el campo manual y los botones + y − de envase en los tres
contextos: selector, edición de lista e ingredientes de la receta. El backend
devuelve `package_amount`, expresado en la unidad fija del producto. La cantidad
inicial es ese contenido; los botones (también arriba/abajo del teclado) lo suman
o restan desde el valor actual. Se admiten coma decimal y cantidades de hasta tres
decimales; restar nunca deja cero o un número negativo. Si falta un tamaño fiable,
la cantidad inicial queda vacía y solo se permite entrada manual.

Una receta permite revisar la cantidad de un ingrediente ya incluido sin duplicar
la fila. En la compra, añadir uno existente suma la nueva cantidad. El diálogo
espera la respuesta, bloquea envíos repetidos y conserva la selección si falla.

Los favoritos son personales y se guardan en el servidor. `core/favorite-button/`
comparte el corazón rojo (relleno al marcar, centro blanco al desmarcar), bloquea
peticiones repetidas y conserva el estado si falla el guardado. En productos solo
aparece en los resultados del diálogo; en recetas, en las tarjetas y el detalle.
En productos, «Favoritos» aparece como una categoría con un corazón rojo; al
seleccionarla se limpian el texto, la categoría y la subcategoría. Escribir o elegir
otra categoría desactiva favoritos. El nombre solo aparece cuando está seleccionada.
En recetas, «Favoritas» está integrada en las categorías y se comporta igual:
seleccionarla limpia texto y categorías; escribir o elegir otra categoría la desactiva.
El corazón y el nombre permanecen visibles y se añade el tick al seleccionarla.
Texto y categorías también son alternativos, manteniendo la selección múltiple de
categorías de recetas. Ambos filtros de favoritos actúan antes de paginar.
Quitar un favorito con el filtro activo actualiza el listado.

La lista permite mostrar solo pendientes y marcar productos mediante casillas
accesibles. Una edición conserva el borrador si falla; ante cambios remotos exige
revisar el valor actual. El PATCH envía `expected_amount` para detectar también
conflictos que lleguen antes del WebSocket.

Eliminar una fila ofrece «Deshacer» durante ocho segundos. El backend guarda un
ticket personal de un solo uso, válido treinta segundos, y nunca sobrescribe un
producto que haya vuelto a añadir otro miembro. Esta función requiere la migración
`lists/0003_removedlistitem`; el arranque de Docker la aplica automáticamente.

## Actualizaciones en tiempo real

`RealtimeService` mantiene una conexión por pestaña a `/ws/events/`, derivada de
la URL de la API (WSS con HTTPS). Autentica con el JWT en el primer mensaje, sin
incluirlo en la URL. Comparte avisos mediante RxJS y expone el estado de conexión
con signals. La suscripción de grupo sigue la ruta activa; una invitación pendiente
usa solamente el canal personal. No hay Redux ni dependencias nuevas de frontend.

`CalendarState` y `ShoppingListState`, limitados a la vida de cada pantalla, son
los propietarios de los datos y los exponen como signals de solo lectura. Las
pantallas mantienen filtros, fechas y formularios locales. Las respuestas antiguas
no sustituyen consultas más recientes. Los eventos se agrupan durante 100 ms y
solo actualizan la semana visible o el grupo correspondiente. Las filas de la
lista conservan su identidad y su edición al recibir nuevos datos.

El servicio reconecta con espera progresiva y variación aleatoria, renueva los JWT
caducados y vuelve a consultar los datos después de conectar, confirmar una
suscripción o recuperar la visibilidad de la pestaña. No se presupone que todos los
avisos se hayan recibido. El cierre de sesión cancela conexión y temporizadores;
también se propaga el cierre realizado en otra pestaña del mismo navegador.

Las solicitudes se actualizan en gestión y en las pantallas de espera. Una
aceptación solo navega automáticamente cuando la pantalla está esperando a ese
grupo. Una expulsión o eliminación actualiza el selector y abre otro grupo
disponible, o el onboarding. Los formularios del grupo con cambios sin guardar
no se sobrescriben al actualizar sus datos remotos.

Si se pierde la conexión, `core/realtime-status/` muestra un aviso discreto y
permite actualizar los datos por HTTP y reintentar la conexión, sin recargar la
página. La API sigue siendo el origen de los datos y las acciones continúan por HTTP.

La gestión de grupos se carga bajo demanda para mantener ligero el arranque,
incluyendo el generador de QR únicamente cuando se visita esa pantalla.

## Inicio de sesión compartido

La ruta `/login` comprueba la sesión con `loginGuard` antes de mostrar la pantalla.
Si hay una sesión guardada, consulta los grupos y redirige al calendario sin
dibujar el login. `GroupService.getInitialRoute()` comparte esta selección con
el inicio de sesión de Google: usa el último grupo si sigue disponible, el primero
como alternativa o el onboarding cuando no hay grupos. El interceptor conserva
la renovación de los tokens caducados; si falla, se permite acceder al login.
Durante la primera navegación, `App` muestra el logo y un indicador de carga
hasta que se activa la pantalla de destino. Se mantiene durante las redirecciones
y las comprobaciones de sesión y grupo; las navegaciones posteriores conservan
la pantalla actual hasta abrir la siguiente.

`core/google-login/` contiene el botón reutilizable de Google y el intercambio de
la credencial mediante `AuthService`. Emite `authenticated`, `loadingChange` y
`loginError`, de modo que cada pantalla mantiene su navegación y mensajes.

`services/google-identity.service.ts` comparte la descarga del SDK, limita el
tiempo de espera y permite volver a cargarlo después de un fallo. Inicializa la
API una sola vez y desconecta el callback de la pantalla al destruir el botón.
Las pantallas de login e invitación a grupos usan este mismo componente.

## Estilos compartidos

La raíz reserva el espacio de la barra vertical mediante la regla
`scrollbar-gutter: stable`, para que cambiar categorías o semanas no desplace
horizontalmente el contenido.

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
