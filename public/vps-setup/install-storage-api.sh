#!/bin/bash
# =============================================================
# Script de instalação da Storage API na VPS
# Execute como root: bash /var/www/marketflow/vps-setup/install-storage-api.sh
# =============================================================

set -e

STORAGE_API_DIR="/var/www/marketflow/storage-api"
STORAGE_DATA_DIR="/var/www/marketflow/storage"

echo "📦 Instalando Storage API..."

# 1. Criar diretórios
mkdir -p "$STORAGE_API_DIR"
mkdir -p "$STORAGE_DATA_DIR"

# 2. Copiar arquivos
cp /var/www/marketflow/vps-setup/storage-api/server.js "$STORAGE_API_DIR/"
cp /var/www/marketflow/vps-setup/storage-api/package.json "$STORAGE_API_DIR/"

# 3. Instalar dependências
cd "$STORAGE_API_DIR"
npm install --production

# 4. Configurar PM2
pm2 delete storage-api 2>/dev/null || true
pm2 start server.js --name storage-api --cwd "$STORAGE_API_DIR"
pm2 save

echo ""
echo "✅ Storage API instalada e rodando na porta 3500"
echo "📂 Arquivos serão salvos em: $STORAGE_DATA_DIR/{empresa}/"
echo ""
echo "⚠️  Certifique-se de que o Nginx está fazendo proxy_pass:"
echo "    location /api/storage/ {"
echo "        proxy_pass http://127.0.0.1:3500;"
echo "        proxy_set_header Host \$host;"
echo "        proxy_set_header X-Real-IP \$remote_addr;"
echo "        client_max_body_size 1G;"
echo "    }"
echo ""
