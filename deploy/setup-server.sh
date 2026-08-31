#!/usr/bin/env bash
# One-time server bootstrap for Ubuntu on Oracle Cloud Always Free.
# Run as ubuntu user: bash deploy/setup-server.sh
#
# Optional: set PUBLIC_DOMAIN=your-domain.com before running to use HTTPS URLs with your domain.
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
    fail2ban \
    netfilter-persistent \
    iptables-persistent

if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
    echo "==> Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
fi

echo "==> Opening OS firewall for HTTP/HTTPS..."
# Oracle Ubuntu images have a REJECT rule that must come AFTER allow rules.
sudo iptables -D INPUT -j REJECT --reject-with icmp-host-prohibited 2>/dev/null || true
sudo iptables -C INPUT -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || \
    sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -C INPUT -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || \
    sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -C INPUT -j REJECT --reject-with icmp-host-prohibited 2>/dev/null || \
    sudo iptables -A INPUT -j REJECT --reject-with icmp-host-prohibited
sudo netfilter-persistent save

echo "==> Enabling fail2ban for SSH brute-force protection..."
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

echo "==> Configuring MySQL (localhost only)..."
MYSQL_CNF="/etc/mysql/mysql.conf.d/mysqld.cnf"
if [[ -f "${MYSQL_CNF}" ]]; then
    if grep -q "^bind-address" "${MYSQL_CNF}"; then
        sudo sed -i 's/^bind-address.*/bind-address = 127.0.0.1/' "${MYSQL_CNF}"
    else
        echo "bind-address = 127.0.0.1" | sudo tee -a "${MYSQL_CNF}" > /dev/null
    fi
    sudo systemctl restart mysql
fi

echo "==> Configuring MySQL database and user..."
DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
EMAIL_TOKEN_ENCRYPTION_KEY="$(openssl rand -base64 32 | tr -d '\n')"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS contract_auditor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'contract_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON contract_auditor.* TO 'contract_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

PUBLIC_IP="$(curl -4 -s --max-time 5 ifconfig.me || curl -4 -s --max-time 5 icanhazip.com || echo 'localhost')"
PUBLIC_HOST="${PUBLIC_DOMAIN:-${PUBLIC_IP}}"
PUBLIC_BASE_URL="https://${PUBLIC_HOST}"

echo "==> Writing ${ENV_FILE}..."
sudo tee "${ENV_FILE}" > /dev/null <<EOF
DB_URL=jdbc:mysql://localhost:3306/contract_auditor?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
DB_USERNAME=contract_user
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION_MS=86400000
SERVER_PORT=8081
SERVER_ADDRESS=127.0.0.1
SWAGGER_ENABLED=false
CORS_ALLOWED_ORIGINS=${PUBLIC_BASE_URL}
FRONTEND_BASE_URL=${PUBLIC_BASE_URL}
PASSWORD_RESET_EXPIRY_MINUTES=60
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=
MAIL_SMTP_AUTH=true
MAIL_SMTP_STARTTLS=true
LOGGING_LEVEL_CONTRACT_AUDITOR=INFO
LOGGING_LEVEL_SERVICE_IMPL=INFO
NOTIFICATION_CRON=0 0 8 * * *
EMAIL_DISCOVERY_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=${PUBLIC_BASE_URL}/oauth/google/callback
EMAIL_TOKEN_ENCRYPTION_KEY=${EMAIL_TOKEN_ENCRYPTION_KEY}
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
sudo mkdir -p "${WEB_ROOT}" /var/www/certbot
bash deploy/install-nginx.sh

echo "==> Configuring systemd service..."
sudo cp deploy/contract-auditor.service /etc/systemd/system/contract-auditor.service
sudo systemctl daemon-reload
sudo systemctl enable contract-auditor

echo "==> Running application deploy..."
bash deploy/deploy.sh

echo ""
echo "============================================"
echo "  Setup complete!"
echo "  App URL:  ${PUBLIC_BASE_URL}/"
echo "  Health:   ${PUBLIC_BASE_URL}/api/health"
echo "  Env file: ${ENV_FILE}"
echo ""
echo "  Next: configure HTTPS with certbot if not done yet:"
echo "    sudo certbot --nginx -d ${PUBLIC_HOST}"
echo "============================================"
