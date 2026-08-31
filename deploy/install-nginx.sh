#!/usr/bin/env bash
# Install or update Nginx config with Phase 2 security (HTTPS redirect, headers, rate limits).
# Auto-detects SSL certificates and picks HTTP-only or HTTPS mode.
#
# Usage:
#   bash deploy/install-nginx.sh
#   PUBLIC_DOMAIN=your-domain.com bash deploy/install-nginx.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$HOME/contract-auditor}"
NGINX_DIR="${SCRIPT_DIR}/nginx"
ENV_FILE="/etc/contract-auditor.env"
SITE_AVAILABLE="/etc/nginx/sites-available/contract-auditor"
WEB_ROOT="/var/www/contract-auditor"
CERTBOT_WEBROOT="/var/www/certbot"

read_env_value() {
    local key="$1"
    if [[ -f "${ENV_FILE}" ]]; then
        grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 | cut -d= -f2- || true
    fi
}

detect_public_host() {
    if [[ -n "${PUBLIC_DOMAIN:-}" ]]; then
        echo "${PUBLIC_DOMAIN}"
        return
    fi

    local cors_origin
    cors_origin="$(read_env_value "CORS_ALLOWED_ORIGINS")"
    if [[ "${cors_origin}" =~ ^https?://([^/]+) ]]; then
        echo "${BASH_REMATCH[1]}"
        return
    fi

    curl -4 -s --max-time 5 ifconfig.me 2>/dev/null \
        || curl -4 -s --max-time 5 icanhazip.com 2>/dev/null \
        || echo "_"
}

resolve_server_name() {
    local host="$1"
    if [[ "${host}" == "_" ]] || [[ "${host}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "_"
    else
        echo "${host}"
    fi
}

PUBLIC_HOST="$(detect_public_host)"
SERVER_NAME="$(resolve_server_name "${PUBLIC_HOST}")"
CERT_DIR="/etc/letsencrypt/live/${PUBLIC_HOST}"
SSL_CERT="${CERT_DIR}/fullchain.pem"
SSL_KEY="${CERT_DIR}/privkey.pem"

echo "==> Installing Nginx snippets and rate-limit config..."
sudo mkdir -p /etc/nginx/snippets "${CERTBOT_WEBROOT}" "${WEB_ROOT}"
sudo cp "${NGINX_DIR}/snippets/"*.conf /etc/nginx/snippets/
sudo cp "${NGINX_DIR}/conf.d/contract-auditor-rate-limit.conf" /etc/nginx/conf.d/contract-auditor-rate-limit.conf

render_template() {
    local template="$1"
    local output="$2"

    sed \
        -e "s|__SERVER_NAME__|${SERVER_NAME}|g" \
        -e "s|__SSL_CERT__|${SSL_CERT}|g" \
        -e "s|__SSL_KEY__|${SSL_KEY}|g" \
        "${template}" | sudo tee "${output}" > /dev/null
}

write_ssl_params_snippet() {
    local tmp
    tmp="$(mktemp)"
    if [[ -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then
        {
            echo "include /etc/letsencrypt/options-ssl-nginx.conf;"
            if [[ -f /etc/letsencrypt/ssl-dhparams.pem ]]; then
                echo "ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
            fi
        } > "${tmp}"
    else
        echo "# certbot SSL options not installed yet" > "${tmp}"
    fi
    sudo cp "${tmp}" /etc/nginx/snippets/contract-auditor-ssl-params.conf
    rm -f "${tmp}"
}

if [[ -f "${SSL_CERT}" && -f "${SSL_KEY}" ]]; then
    echo "==> SSL certificates found for ${PUBLIC_HOST}; installing HTTPS config..."
    write_ssl_params_snippet
    render_template "${NGINX_DIR}/contract-auditor-https.conf.template" "${SITE_AVAILABLE}"
else
    echo "==> SSL certificates not found at ${CERT_DIR}; installing HTTP-only config."
    echo "    After certbot, re-run: bash deploy/install-nginx.sh"
    render_template "${NGINX_DIR}/contract-auditor-http.conf.template" "${SITE_AVAILABLE}"
fi

sudo ln -sf "${SITE_AVAILABLE}" /etc/nginx/sites-enabled/contract-auditor
sudo rm -f /etc/nginx/sites-enabled/default

echo "==> Validating Nginx configuration..."
sudo nginx -t
sudo systemctl reload nginx

echo "==> Nginx installed (server_name=${SERVER_NAME})."
