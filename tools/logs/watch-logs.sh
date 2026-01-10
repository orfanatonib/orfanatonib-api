#!/bin/bash
# Script para visualizar logs da API em tempo real
# Uso: ./watch-logs.sh [staging|prod]

set -e

PROFILE="orfanato-aws"
REGION="us-east-1"
ENV=${1:-staging}

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Determinar instance ID
if [ "$ENV" = "staging" ]; then
    INSTANCE_ID="i-0d2a735aac0707d31"
    echo -e "${BLUE}📡 Conectando aos logs de STAGING...${NC}" >&2
elif [ "$ENV" = "prod" ]; then
    # Buscar instance ID de produção
    INSTANCE_ID=$(aws ec2 describe-instances \
        --profile "$PROFILE" \
        --region "$REGION" \
        --filters "Name=tag:Name,Values=prod-orfanato-nib-api" \
                  "Name=instance-state-name,Values=running" \
        --query 'Reservations[0].Instances[0].InstanceId' \
        --output text 2>/dev/null)
    
    if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
        echo -e "${RED}❌ Instância de produção não encontrada${NC}" >&2
        exit 1
    fi
    echo -e "${BLUE}📡 Conectando aos logs de PRODUCTION...${NC}" >&2
else
    echo -e "${RED}Uso: $0 [staging|prod]${NC}" >&2
    exit 1
fi

echo -e "${GREEN}✅ Instance ID: $INSTANCE_ID${NC}" >&2
echo -e "${YELLOW}⏳ Buscando logs (últimas 100 linhas)...${NC}" >&2
echo "" >&2

# Enviar comando para buscar logs
COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["docker logs --tail 100 orfanato-nib-api 2>&1"]' \
    --output text --query 'Command.CommandId' 2>/dev/null)

# Aguardar execução
sleep 3

# Buscar resultado
OUTPUT=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --query 'StandardOutputContent' \
    --output text 2>/dev/null)

# Exibir logs (stdout apenas)
echo "$OUTPUT"
