#!/bin/bash

# Script para atualizar todas as automações para usar o módulo auth.js centralizado
# e garantir que todas usem as credenciais corretas

echo "🔄 ATUALIZANDO TODAS AS AUTOMAÇÕES"
echo "=================================="
echo ""

# Contador
total=0
updated=0

# Encontrar todos os arquivos de automação
automation_files=$(find test/automations -type f -name "*-automation.js" -o -name "*-complete-*.js" | grep -v "shared")

echo "📋 Arquivos de automação encontrados:"
echo "$automation_files" | nl
echo ""

# Substituir credenciais antigas por novas em todos os arquivos
echo "🔧 Substituindo credenciais antigas..."
for file in $automation_files; do
    ((total++))

    # Verificar se o arquivo contém credenciais antigas
    if grep -q "superuser@orfanatonib.com\|admin@orfanatonib.com" "$file" 2>/dev/null; then
        echo "  📝 Atualizando: $file"

        # Substituir email antigo
        sed -i 's/superuser@orfanatonib.com/superuser@orfanatonib.com/g' "$file"
        sed -i 's/admin@orfanatonib.com/superuser@orfanatonib.com/g' "$file"

        ((updated++))
    fi
done

echo ""
echo "✅ Atualização concluída!"
echo "   Total de arquivos verificados: $total"
echo "   Arquivos atualizados: $updated"
echo ""
echo "🎯 Próximos passos:"
echo "   1. Verificar se todas as automações usam ApiClient"
echo "   2. Testar: node test/run-all-automations.js"
