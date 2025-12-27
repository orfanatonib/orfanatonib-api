#!/bin/bash

# Script para atualizar credenciais antigas para usar a configuração centralizada
# Atualiza todos os arquivos de automação para usar config.js

echo "🔄 Atualizando credenciais em todas as automações..."

# Encontrar todos os arquivos .js que contêm as credenciais antigas
files=$(grep -r "password.*Abc@123" ../.. --include="*.js" | grep -v node_modules | grep -v shared | cut -d: -f1 | sort -u)

count=0
for file in $files; do
  echo "📝 Atualizando: $file"

  # Criar backup
  cp "$file" "$file.bak"

  # Substituir as credenciais antigas pela importação do config
  # Padrão 1: const BASE_URL = 'http://localhost:3000';
  sed -i "s|const BASE_URL = 'http://localhost:3000';|const config = require('../shared/config');\nconst BASE_URL = config.BASE_URL;|g" "$file"

  # Padrão 2: Credenciais inline
  sed -i "/const ADMIN_CREDENTIALS = {/,/};/c\const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;" "$file"

  # Remover linhas duplicadas de importação
  awk '!seen[$0]++' "$file" > "$file.tmp" && mv "$file.tmp" "$file"

  count=$((count + 1))
done

echo ""
echo "✅ Atualização concluída!"
echo "📊 Total de arquivos atualizados: $count"
echo ""
echo "⚠️  Backups criados com extensão .bak"
echo "🧪 Teste as automações e, se tudo estiver ok, delete os backups com:"
echo "   find ../.. -name '*.bak' -delete"
