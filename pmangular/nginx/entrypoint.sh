#!/bin/sh
# Si hay un fallo, el script corta la ejecución
set -eu

# Rutas del certificado y fichero de nginx de http
# DOMAIN viene del .env
certificate="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
template="/etc/nginx/templates/http.conf.template"

# Comprobar si existe el certificado
if [ -f "$certificate" ]; then
  template="/etc/nginx/templates/https.conf.template"
fi

# Guardar en /etc/nginx/conf.d/default.conf la configuración que se va a usar
envsubst '${DOMAIN}' < "$template" > /etc/nginx/conf.d/default.conf
# Lanzar nginx en segundo plano pero no como servicio
nginx -g 'daemon off;' &
# Guardar el pid de nginx
nginx_pid=$!

# Si docker finaliza la ejecución se propaga también a nginx
trap 'kill -TERM "$nginx_pid"; wait "$nginx_pid"; exit 0' INT TERM

# Mientra siga existiendo el proceso de nginx
# Cada 12 horas se recarga nginx para comprobar si certbot ha renovado el certificado
while kill -0 "$nginx_pid" 2>/dev/null; do
  sleep 12h &
  wait $!
  nginx -s reload
done

# Cuando termina nginx, se espera a que acabe su proceso antes de salir del script
wait "$nginx_pid"