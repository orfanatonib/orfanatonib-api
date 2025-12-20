#!/bin/bash

# Script para verificar status do certificado SSL e atualizar stack quando validado
# Uso: ./check-certificate.sh

set -e

AWS_PROFILE=${AWS_PROFILE:-clubinho-aws}
CERT_ARN="arn:aws:acm:us-east-1:697760557838:certificate/ed5a8ceb-7c5d-4337-990c-e090782abaf1"

echo "🔍 Verificando status do certificado SSL..."
echo ""

while true; do
    STATUS=$(aws acm describe-certificate \
        --certificate-arn "$CERT_ARN" \
        --profile "$AWS_PROFILE" \
        --query 'Certificate.Status' \
        --output text 2>/dev/null || echo "ERROR")
    
    if [ "$STATUS" = "ISSUED" ]; then
        echo "✅ Certificado validado com sucesso!"
        echo ""
        echo "🚀 Atualizando stack para habilitar HTTPS..."
        cd "$(dirname "$0")"
        ./deploy-stack.sh staging
        echo ""
        echo "✅ HTTPS configurado! Teste com:"
        echo "   curl -X POST https://staging-api.orfanatonib.com/auth/login ..."
        break
    elif [ "$STATUS" = "PENDING_VALIDATION" ]; then
        echo "⏳ Certificado ainda pendente de validação... (aguardando 30s)"
        sleep 30
    elif [ "$STATUS" = "ERROR" ]; then
        echo "❌ Erro ao verificar certificado"
        break
    else
        echo "⚠️  Status desconhecido: $STATUS"
        sleep 30
    fi
done

