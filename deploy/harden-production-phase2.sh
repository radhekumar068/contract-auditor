#!/usr/bin/env bash
# Apply Phase 2 production security: Nginx hardening, rate limits, logging, fail2ban.
# Run on the server after Phase 1:
#   PUBLIC_DOMAIN=your-domain.com bash deploy/harden-production-phase2.sh
set -euo pipefail

ENV_FILE="/etc/contract-auditor.env"
APP_DIR="${APP_DIR:-$HOME/contract-auditor}"

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "ERROR: ${ENV_FILE} not found. Run setup-server.sh or harden-production-env.sh first."
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

echo "==> Installing fail2ban (SSH brute-force protection)..."
if ! dpkg -s fail2ban >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fail2ban
fi
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

echo "==> Setting production logging levels..."
upsert_env "LOGGING_LEVEL_CONTRACT_AUDITOR" "INFO"
upsert_env "LOGGING_LEVEL_SERVICE_IMPL" "INFO"
sudo chmod 600 "${ENV_FILE}"

echo "==> Installing Nginx Phase 2 config..."
cd "${APP_DIR}"
PUBLIC_DOMAIN="${PUBLIC_DOMAIN:-}" bash deploy/install-nginx.sh

echo "==> Restarting backend..."
sudo systemctl restart contract-auditor
sleep 15

if curl -sf http://127.0.0.1:8081/api/health > /dev/null; then
    echo "==> Backend health check: OK"
else
    echo "ERROR: Backend health check failed. Check: sudo journalctl -u contract-auditor -n 50"
    exit 1
fi

PUBLIC_IP="$(curl -4 -s --max-time 5 ifconfig.me 2>/dev/null || echo '')"
PUBLIC_HOST="${PUBLIC_DOMAIN:-${PUBLIC_IP}}"
PUBLIC_BASE_URL="https://${PUBLIC_HOST}"

echo ""
echo "Phase 2 hardening applied."
echo "  Public URL:     ${PUBLIC_BASE_URL}"
echo "  Auth rate limit: 20 req/min per IP (nginx)"
echo "  Security headers: enabled on HTTPS"
echo "  HTTP redirect:    enabled when SSL certs are present"
echo "  fail2ban:         enabled for SSH"
echo ""
echo "Verify from your PC:"
echo "  curl -I ${PUBLIC_BASE_URL}/api/health"
echo "  curl -I http://${PUBLIC_HOST}/   # should redirect to HTTPS"
echo "  curl -I ${PUBLIC_BASE_URL}/       # check security headers"
