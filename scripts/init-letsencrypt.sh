#!/usr/bin/env sh
set -eu

env_file="${1:-.env.production}"
compose_file="docker-compose.production.yml"

set -a
. "${env_file}"
set +a

: "${DOMAIN:?DOMAIN must be set in ${env_file}}"
: "${CERTBOT_EMAIL:?CERTBOT_EMAIL must be set in ${env_file}}"

docker compose --env-file "${env_file}" -f "${compose_file}" up -d db app nginx
docker compose --env-file "${env_file}" -f "${compose_file}" run --rm --entrypoint certbot certbot \
	certonly --webroot --webroot-path /var/www/certbot --email "${CERTBOT_EMAIL}" \
	--agree-tos --no-eff-email --non-interactive -d "${DOMAIN}"

sed "s|__DOMAIN__|${DOMAIN}|g" deploy/nginx/tls.conf.template > deploy/nginx/conf.d/tls.conf
docker compose --env-file "${env_file}" -f "${compose_file}" restart nginx
docker compose --env-file "${env_file}" -f "${compose_file}" up -d certbot nginx_reloader
