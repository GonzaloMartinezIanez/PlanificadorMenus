# Usar una versión ligera de linux con node 22
FROM node:22-alpine AS build

# Usar /app como carpeta raíz
WORKDIR /app

# Copiar estos ficheros e instalar las dependencias
COPY package.json package-lock.json ./
RUN npm ci

# Copiar el resto del proyecto
COPY . .

# Compilar la aplicación y generar los ficheros que habrá que pegar en nginx
RUN npm run build

# Usar una versión de linux con nginx
FROM nginx:1.27-alpine

# Copiar los ficheros generados anteriormente a la carpeta que usa nginx
COPY --from=build /app/dist/pmangular/browser /usr/share/nginx/html

# Configuración para el primer arranque antes de tener el cerfiticado
COPY nginx/http.conf.template /etc/nginx/templates/http.conf.template

# Versión cuando ya hay certificado 
COPY nginx/https.conf.template /etc/nginx/templates/https.conf.template

# Copia el script con que configuración usar con permiso de ejecución
COPY --chmod=755 nginx/entrypoint.sh /entrypoint.sh

# Puertos que escucha este contenedor
EXPOSE 80
EXPOSE 443

# Docker tiene que ejecutar este script antes de lanzar el servidor
ENTRYPOINT ["/entrypoint.sh"]
