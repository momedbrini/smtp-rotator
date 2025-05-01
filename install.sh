#!/bin/bash

set -e

APP_DIR="/opt/smtp-rotator"
REPO_URL="https://github.com/momedbrini/smtp-rotator.git"
NODE_VERSION="lts/*"

echo "🔧 Updating system packages..."
sudo apt update && sudo apt install -y curl git unzip openssl

echo "🟢 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v

echo "🚀 Installing pm2..."
sudo npm install -g pm2

echo "📁 Cloning SMTP Rotator repo..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR
cd $APP_DIR

if [ ! -d ".git" ]; then
  git clone $REPO_URL .
else
  echo "✅ Repo already cloned. Pulling latest..."
  git pull origin main
fi

echo "📦 Installing Node.js dependencies..."
npm install

echo "📂 Verifying required files..."
REQUIRED_FILES=("server.js" ".env" "smtp_accounts.json" "certs/key.pem" "certs/cert.pem")
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Missing required file: $file"
    exit 1
  fi
done

echo "🚀 Starting SMTP rotator with pm2..."
pm2 start server.js --name smtp-rotator
pm2 save
pm2 startup | sudo bash

echo "✅ Installation complete!"
echo "🟢 SMTP server is running on port defined in .env (default: 2525)"
