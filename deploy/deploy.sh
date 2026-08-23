#!/usr/bin/env bash
# Build and deploy Contract Auditor (run on the server after setup).
# Usage: bash deploy/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/contract-auditor}"
WEB_ROOT="/var/www/contract-auditor"
ENV_FILE="/etc/contract-auditor.env"

cd "${APP_DIR}"
git pull --ff-only 2>/dev/null || true

echo "==> Building backend..."
cd contract-auditor-backend
mvn clean package -DskipTests -q
cd ..

echo "==> Building frontend..."
cd contract-auditor-frontend
npm ci --silent
npm run build
cd ..

FRONTEND_DIST="contract-auditor-frontend/dist/contract-auditor-frontend/browser"
if [[ ! -d "${FRONTEND_DIST}" ]]; then
    echo "ERROR: Frontend build output not found at ${FRONTEND_DIST}"
    exit 1
fi

echo "==> Publishing frontend to ${WEB_ROOT}..."
sudo rm -rf "${WEB_ROOT:?}"/*
sudo cp -r "${FRONTEND_DIST}"/* "${WEB_ROOT}/"
sudo chown -R www-data:www-data "${WEB_ROOT}"

echo "==> Restarting services..."
sudo systemctl restart contract-auditor
sudo nginx -t && sudo systemctl reload nginx

sleep 5
if curl -sf http://127.0.0.1:8081/api/health > /dev/null; then
    echo "==> Backend health check: OK"
else
    echo "WARNING: Backend health check failed. Check: sudo journalctl -u contract-auditor -n 50"
    exit 1
fi

PUBLIC_IP="$(curl -4 -s --max-time 5 ifconfig.me 2>/dev/null || echo 'your-server-ip')"
echo ""
echo "Deploy complete. Visit: http://${PUBLIC_IP}/"
