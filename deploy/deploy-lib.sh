#!/usr/bin/env bash
# Shared helpers for deploy.sh and deploy-rollback.sh

APP_DIR="${APP_DIR:-$HOME/contract-auditor}"
WEB_ROOT="/var/www/contract-auditor"
BACKUP_ROOT="${APP_DIR}/.deploy-backup/last"
JAR_NAME="contract-auditor-backend-1.0.0.jar"
JAR_PATH="${APP_DIR}/contract-auditor-backend/target/${JAR_NAME}"
HEALTH_URL="http://127.0.0.1:8081/api/health"
HEALTH_WAIT_SECONDS="${HEALTH_WAIT_SECONDS:-30}"

has_backup() {
    if [[ ! -f "${BACKUP_ROOT}/meta.env" ]]; then
        return 1
    fi

    # shellcheck disable=SC1090
    source "${BACKUP_ROOT}/meta.env"

    if [[ "${HAS_JAR:-false}" == true && ! -f "${BACKUP_ROOT}/${JAR_NAME}" ]]; then
        return 1
    fi
    if [[ "${HAS_FRONTEND:-false}" == true && ! -f "${BACKUP_ROOT}/frontend/index.html" ]]; then
        return 1
    fi

    [[ "${HAS_JAR:-false}" == true || "${HAS_FRONTEND:-false}" == true ]]
}

backup_current_deployment() {
    local has_jar=false
    local has_frontend=false

    if [[ -f "${JAR_PATH}" ]]; then
        has_jar=true
    fi
    if [[ -f "${WEB_ROOT}/index.html" ]]; then
        has_frontend=true
    fi

    if [[ "${has_jar}" == false && "${has_frontend}" == false ]]; then
        echo "==> No previous deployment found; skipping backup (first deploy)."
        return 0
    fi

    echo "==> Backing up current deployment to ${BACKUP_ROOT}..."
    # Previous frontend backups are root-owned (copied from www-data); use sudo to clear.
    sudo rm -rf "${BACKUP_ROOT}"
    mkdir -p "${BACKUP_ROOT}/frontend"

    if [[ "${has_jar}" == true ]]; then
        cp "${JAR_PATH}" "${BACKUP_ROOT}/${JAR_NAME}"
    else
        echo "WARNING: Backend JAR not found at ${JAR_PATH}; backup will not include backend."
    fi

    if [[ "${has_frontend}" == true ]]; then
        sudo cp -a "${WEB_ROOT}/." "${BACKUP_ROOT}/frontend/"
        sudo chown -R "$(whoami):$(whoami)" "${BACKUP_ROOT}"
    else
        echo "WARNING: Frontend not found at ${WEB_ROOT}; backup will not include frontend."
    fi

    local git_commit=""
    if git -C "${APP_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        git_commit="$(git -C "${APP_DIR}" rev-parse HEAD 2>/dev/null || true)"
    fi

    cat > "${BACKUP_ROOT}/meta.env" <<EOF
BACKUP_TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
GIT_COMMIT="${git_commit}"
JAR_NAME="${JAR_NAME}"
HAS_JAR=${has_jar}
HAS_FRONTEND=${has_frontend}
EOF

    echo "==> Backup complete (commit: ${git_commit:-unknown})."
}

restore_from_backup() {
    if ! has_backup; then
        echo "ERROR: No deployment backup found at ${BACKUP_ROOT}"
        echo "       Run deploy/deploy.sh at least once successfully before rolling back."
        exit 1
    fi

    # shellcheck disable=SC1090
    source "${BACKUP_ROOT}/meta.env"

    echo "==> Restoring deployment from backup (${BACKUP_TIMESTAMP:-unknown})..."

    if [[ "${HAS_JAR:-false}" == true ]]; then
        mkdir -p "$(dirname "${JAR_PATH}")"
        cp "${BACKUP_ROOT}/${JAR_NAME}" "${JAR_PATH}"
        echo "    Restored backend JAR"
    else
        echo "ERROR: Backup does not include a backend JAR."
        exit 1
    fi

    if [[ "${HAS_FRONTEND:-false}" == true ]]; then
        sudo rm -rf "${WEB_ROOT:?}"/*
        sudo cp -a "${BACKUP_ROOT}/frontend/." "${WEB_ROOT}/"
        sudo chown -R www-data:www-data "${WEB_ROOT}"
        echo "    Restored frontend"
    else
        echo "WARNING: Backup does not include frontend files."
    fi

    echo "==> Restarting backend..."
    sudo systemctl restart contract-auditor
    sleep "${HEALTH_WAIT_SECONDS}"

    if wait_for_health; then
        echo "==> Rollback health check: OK"
    else
        echo "ERROR: Rollback completed but health check failed."
        echo "       Check logs: sudo journalctl -u contract-auditor -n 50"
        exit 1
    fi
}

wait_for_health() {
    curl -sf "${HEALTH_URL}" > /dev/null
}

print_deploy_url() {
    local public_ip
    public_ip="$(curl -4 -s --max-time 5 ifconfig.me 2>/dev/null || echo 'your-server-ip')"
    local public_host="${PUBLIC_DOMAIN:-${public_ip}}"
    echo ""
    echo "Visit: https://${public_host}/"
}
