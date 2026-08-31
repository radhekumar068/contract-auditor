#!/usr/bin/env bash
# Build and deploy Contract Auditor (run on the server after setup).
# Backs up the previous deployment before publishing; auto-rolls back if health check fails.
#
# Usage: bash deploy/deploy.sh
# Rollback manually: bash deploy/deploy-rollback.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy-lib.sh
source "${SCRIPT_DIR}/deploy-lib.sh"

cd "${APP_DIR}"

backup_current_deployment

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

echo "==> Updating Nginx (security headers, rate limits, HTTPS)..."
bash "${SCRIPT_DIR}/install-nginx.sh"

echo "==> Restarting backend..."
sudo systemctl restart contract-auditor

sleep "${HEALTH_WAIT_SECONDS}"
if wait_for_health; then
    echo "==> Backend health check: OK"
    echo ""
    echo "Deploy complete."
    if has_backup; then
        # shellcheck disable=SC1090
        source "${BACKUP_ROOT}/meta.env"
        echo "Previous deployment backed up (${BACKUP_TIMESTAMP:-unknown}, commit: ${GIT_COMMIT:-unknown})."
        echo "To revert: bash deploy/deploy-rollback.sh"
    fi
    print_deploy_url
else
    echo "ERROR: Deploy health check failed."
    if has_backup; then
        echo "==> Auto-rolling back to previous deployment..."
        restore_from_backup
        echo ""
        echo "Rollback complete. The server is running the previous deployment."
        print_deploy_url
    else
        echo "WARNING: No backup available to roll back. Check: sudo journalctl -u contract-auditor -n 50"
    fi
    exit 1
fi
