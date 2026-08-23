#!/bin/sh
# Antes de la primera ejecución hay que ejecutar este script
# Como todavía no hay certificado
set -eu

# Verificar que existe el fichero .env
if [ ! -f .env ]; then
  echo "Crea el fichero .env a partir de .env.example antes de continuar."
  exit 1
fi

# Carga las constantes del .env en variables del sistema
set -a
. ./.env
# Desactivar la exportación de variables
set +a

# Inicia MySQL, Django y Nginx (como es el primer arranque nginx usará http)
docker compose up -d db backend nginx

# Ejecutar certbot para solicitar el primer certificado
docker compose run --rm --entrypoint certbot certbot certonly --webroot --webroot-path /var/www/certbot --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email -d "$DOMAIN" -d "www.$DOMAIN"

# Lanza certbot en segundo plano
docker compose up -d certbot

# Reinicia nginx pero ahora con https
docker compose restart nginx
