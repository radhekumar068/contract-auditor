#!/usr/bin/env bash
# Restore the last successfully backed-up deployment (from deploy/deploy.sh).
#
# Usage: bash deploy/deploy-rollback.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy-lib.sh
source "${SCRIPT_DIR}/deploy-lib.sh"

if ! has_backup; then
    echo "ERROR: No deployment backup found at ${BACKUP_ROOT}"
    echo "       deploy.sh creates a backup before each deploy."
    echo "       Run deploy/deploy.sh at least once when a previous version is live."
    exit 1
fi

# shellcheck disable=SC1090
source "${BACKUP_ROOT}/meta.env"

echo "============================================"
echo "  Contract Auditor — deployment rollback"
echo "  Backup from: ${BACKUP_TIMESTAMP:-unknown}"
echo "  Git commit:  ${GIT_COMMIT:-unknown}"
echo "============================================"
echo ""

restore_from_backup

echo ""
echo "Rollback complete."
echo "To deploy again: bash deploy/deploy.sh"
print_deploy_url
