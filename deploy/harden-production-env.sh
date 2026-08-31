#!/usr/bin/env bash
# Apply Phase 1 production security settings to an existing server env file.
# Run on the server: bash deploy/harden-production-env.sh
#
# Optional: PUBLIC_DOMAIN=your-domain.com bash deploy/harden-production-env.sh
set -euo pipefail

ENV_FILE="/etc/contract-auditor.env"
MYSQL_CNF="/etc/mysql/mysql.conf.d/mysqld.cnf"

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "ERROR: ${ENV_FILE} not found. Run setup-server.sh first."
    exit 1
fi

upsert_env() {
    local key="$1"
    local value="$2"
    if sudo grep -q "^${key}=" "${ENV_FILE}"; then
        sudo sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
    else
        echo "${key}=${value}" | sudo tee -a "${ENV_FILE}" > /dev/null
    fi
}

echo "==> Binding MySQL to localhost..."
if [[ -f "${MYSQL_CNF}" ]]; then
    if grep -q "^bind-address" "${MYSQL_CNF}"; then
        sudo sed -i 's/^bind-address.*/bind-address = 127.0.0.1/' "${MYSQL_CNF}"
    else
        echo "bind-address = 127.0.0.1" | sudo tee -a "${MYSQL_CNF}" > /dev/null
    fi
    sudo systemctl restart mysql
fi

PUBLIC_IP="$(curl -4 -s --max-time 5 ifconfig.me || curl -4 -s --max-time 5 icanhazip.com || echo '')"
PUBLIC_HOST="${PUBLIC_DOMAIN:-${PUBLIC_IP}}"
if [[ -z "${PUBLIC_HOST}" ]]; then
    echo "ERROR: Could not detect public IP. Set PUBLIC_DOMAIN=your-domain.com and retry."
    exit 1
fi
PUBLIC_BASE_URL="https://${PUBLIC_HOST}"

echo "==> Updating ${ENV_FILE} for production security..."
upsert_env "SERVER_ADDRESS" "127.0.0.1"
upsert_env "SWAGGER_ENABLED" "false"
upsert_env "CORS_ALLOWED_ORIGINS" "${PUBLIC_BASE_URL}"
upsert_env "FRONTEND_BASE_URL" "${PUBLIC_BASE_URL}"

if ! sudo grep -q "^GOOGLE_OAUTH_REDIRECT_URI=" "${ENV_FILE}"; then
    upsert_env "GOOGLE_OAUTH_REDIRECT_URI" "${PUBLIC_BASE_URL}/oauth/google/callback"
else
    current_redirect="$(sudo grep "^GOOGLE_OAUTH_REDIRECT_URI=" "${ENV_FILE}" | tail -n 1 | cut -d= -f2-)"
    if [[ "${current_redirect}" == http://* ]]; then
        upsert_env "GOOGLE_OAUTH_REDIRECT_URI" "${PUBLIC_BASE_URL}/oauth/google/callback"
    fi
fi

# Only when missing or empty — never regenerated on deploy/deploy.sh restarts.
if ! sudo grep -q "^EMAIL_TOKEN_ENCRYPTION_KEY=" "${ENV_FILE}" \
    || sudo grep -q "^EMAIL_TOKEN_ENCRYPTION_KEY=$" "${ENV_FILE}"; then
    EMAIL_TOKEN_ENCRYPTION_KEY="$(openssl rand -base64 32 | tr -d '\n')"
    upsert_env "EMAIL_TOKEN_ENCRYPTION_KEY" "${EMAIL_TOKEN_ENCRYPTION_KEY}"
    echo "    Generated new EMAIL_TOKEN_ENCRYPTION_KEY (saved in ${ENV_FILE})"
    echo "    View later: sudo grep EMAIL_TOKEN_ENCRYPTION_KEY ${ENV_FILE}"
fi

if ! sudo grep -q "^EMAIL_DISCOVERY_ENABLED=" "${ENV_FILE}"; then
    upsert_env "EMAIL_DISCOVERY_ENABLED" "false"
fi

sudo chmod 600 "${ENV_FILE}"

echo "==> Updating Nginx (Phase 1 + installs snippets for Phase 2)..."
APP_DIR="${APP_DIR:-$HOME/contract-auditor}"
if [[ -f "${APP_DIR}/deploy/install-nginx.sh" ]]; then
    cd "${APP_DIR}"
    PUBLIC_DOMAIN="${PUBLIC_DOMAIN:-}" bash deploy/install-nginx.sh
else
    echo "WARNING: install-nginx.sh not found; skipping Nginx update."
fi

echo "==> Restarting backend..."
sudo systemctl restart contract-auditor
sleep 15

if curl -sf http://127.0.0.1:8081/api/health > /dev/null; then
    echo "==> Backend health check: OK"
else
    echo "WARNING: Backend health check failed. Check: sudo journalctl -u contract-auditor -n 50"
    exit 1
fi

echo ""
echo "Phase 1 hardening applied."
echo "  Public URL: ${PUBLIC_BASE_URL}"
echo "  Backend:    127.0.0.1:8081 only"
echo "  Swagger:    disabled"
echo ""
echo "Verify from your PC:"
echo "  curl -I ${PUBLIC_BASE_URL}/api/health"
echo "  curl -I ${PUBLIC_BASE_URL}/swagger-ui.html   # should NOT return 200"
