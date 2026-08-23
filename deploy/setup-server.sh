#!/usr/bin/env bash
# One-time server bootstrap for Ubuntu on Oracle Cloud Always Free.
# Run as ubuntu user: bash deploy/setup-server.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/radhekumar068/contract-auditor.git}"
APP_DIR="${APP_DIR:-$HOME/contract-auditor}"
ENV_FILE="/etc/contract-auditor.env"
WEB_ROOT="/var/www/contract-auditor"

echo "==> Installing system packages..."
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    openjdk-21-jdk \
    maven \
    mysql-server \
    nginx \
    git \
    curl \
    netfilter-persistent \
    iptables-persistent

if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
    echo "==> Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
fi

echo "==> Opening OS firewall for HTTP/HTTPS..."
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || \
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || \
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

echo "==> Configuring MySQL..."
DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS contract_auditor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'contract_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON contract_auditor.* TO 'contract_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

PUBLIC_IP="$(curl -4 -s --max-time 5 ifconfig.me || curl -4 -s --max-time 5 icanhazip.com || echo 'localhost')"
CORS_ORIGIN="http://${PUBLIC_IP}"

echo "==> Writing ${ENV_FILE}..."
sudo tee "${ENV_FILE}" > /dev/null <<EOF
DB_URL=jdbc:mysql://localhost:3306/contract_auditor?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
DB_USERNAME=contract_user
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
SERVER_PORT=8081
CORS_ALLOWED_ORIGINS=${CORS_ORIGIN}
EOF
sudo chmod 600 "${ENV_FILE}"

echo "==> Cloning repository..."
if [[ -d "${APP_DIR}/.git" ]]; then
    cd "${APP_DIR}"
    git pull --ff-only
else
    git clone "${REPO_URL}" "${APP_DIR}"
    cd "${APP_DIR}"
fi

echo "==> Configuring Nginx..."
sudo mkdir -p "${WEB_ROOT}"
sudo cp deploy/nginx/contract-auditor.conf /etc/nginx/sites-available/contract-auditor
sudo ln -sf /etc/nginx/sites-available/contract-auditor /etc/nginx/sites-enabled/contract-auditor
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

echo "==> Configuring systemd service..."
sudo cp deploy/contract-auditor.service /etc/systemd/system/contract-auditor.service
sudo systemctl daemon-reload
sudo systemctl enable contract-auditor

echo "==> Running application deploy..."
bash deploy/deploy.sh

echo ""
echo "============================================"
echo "  Setup complete!"
echo "  App URL:  http://${PUBLIC_IP}/"
echo "  Health:   http://${PUBLIC_IP}/api/health"
echo "  Env file: ${ENV_FILE}"
echo "============================================"
