#!/bin/bash

# ============================================================================
# SCRIPT DE LIMPEZA COMPLETA E DEPLOY
# ============================================================================
# Este script faz limpeza TOTAL antes do deploy para evitar conflitos:
# 1. Deleta stacks ACM e EC2 antigas
# 2. Deleta certificados ACM para o domínio
# 3. Remove registros DNS de validação do Route53
# 4. Aguarda propagação
# 5. Roda o deploy limpo
# ============================================================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
AWS_PROFILE="clubinho-aws"
DOMAIN="orfanatonib.com"
ACM_STACK_NAME="orfanato-nib-acm"
EC2_STACK_NAME="orfanato-nib-ec2"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🧹 LIMPEZA COMPLETA + DEPLOY                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# PASSO 1: DESCOBRIR HOSTED ZONE ID
# ============================================================================
echo -e "${CYAN}🔍 Descobrindo Hosted Zone ID...${NC}"
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
    --profile "$AWS_PROFILE" \
    --query "HostedZones[?Name=='${DOMAIN}.'].Id" \
    --output text 2>/dev/null | cut -d'/' -f3 || echo "")

if [ -z "$HOSTED_ZONE_ID" ]; then
    echo -e "${RED}❌ Erro: Não foi possível encontrar Hosted Zone para ${DOMAIN}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Hosted Zone: ${HOSTED_ZONE_ID}${NC}"
echo ""

# ============================================================================
# PASSO 2: DELETAR STACKS CLOUDFORMATION
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🗑️  PASSO 1: Deletar Stacks CloudFormation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

delete_stack() {
    local stack_name=$1
    local status=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --profile "$AWS_PROFILE" \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "NOT_FOUND")

    if [ "$status" = "NOT_FOUND" ]; then
        echo -e "${GREEN}✅ Stack $stack_name não existe (OK)${NC}"
        return 0
    fi

    echo -e "${YELLOW}🗑️  Deletando stack $stack_name (status: $status)...${NC}"

    if aws cloudformation delete-stack --stack-name "$stack_name" --profile "$AWS_PROFILE" 2>&1; then
        echo -e "${CYAN}   Aguardando deleção completa...${NC}"

        # Aguardar até 5 minutos
        local elapsed=0
        local max_wait=300

        while [ $elapsed -lt $max_wait ]; do
            status=$(aws cloudformation describe-stacks \
                --stack-name "$stack_name" \
                --profile "$AWS_PROFILE" \
                --query 'Stacks[0].StackStatus' \
                --output text 2>/dev/null || echo "NOT_FOUND")

            if [ "$status" = "NOT_FOUND" ] || [ "$status" = "DELETE_COMPLETE" ]; then
                echo -e "${GREEN}✅ Stack $stack_name deletada${NC}"
                return 0
            fi

            echo -ne "\r${CYAN}   Status: $status... (${elapsed}s)${NC}   "
            sleep 5
            elapsed=$((elapsed + 5))
        done

        echo -e "\n${RED}❌ Timeout aguardando deleção de $stack_name${NC}"
        return 1
    else
        echo -e "${RED}❌ Erro ao deletar stack $stack_name${NC}"
        return 1
    fi
}

# Deletar stacks na ordem correta (EC2 primeiro, depois ACM)
delete_stack "$EC2_STACK_NAME" || echo -e "${YELLOW}⚠️  Continuando mesmo assim...${NC}"
delete_stack "$ACM_STACK_NAME" || echo -e "${YELLOW}⚠️  Continuando mesmo assim...${NC}"

echo ""

# ============================================================================
# PASSO 3: DELETAR CERTIFICADOS ACM
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🗑️  PASSO 2: Deletar Certificados ACM${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}🔍 Buscando certificados ACM para ${DOMAIN}...${NC}"

ALL_CERTS=$(aws acm list-certificates \
    --profile "$AWS_PROFILE" \
    --query 'CertificateSummaryList[].CertificateArn' \
    --output text 2>/dev/null || echo "")

CERTS_DELETED=0

if [ -n "$ALL_CERTS" ]; then
    for ARN in $ALL_CERTS; do
        # Verificar SANs deste certificado
        CERT_SANS=$(aws acm describe-certificate \
            --certificate-arn "$ARN" \
            --profile "$AWS_PROFILE" \
            --query "Certificate.SubjectAlternativeNames" \
            --output text 2>/dev/null || echo "")

        # Verificar se contém o domínio
        if echo "$CERT_SANS" | grep -q "$DOMAIN"; then
            echo -e "${YELLOW}🗑️  Deletando certificado: $ARN${NC}"

            if aws acm delete-certificate --certificate-arn "$ARN" --profile "$AWS_PROFILE" 2>/dev/null; then
                echo -e "${GREEN}   ✅ Certificado deletado${NC}"
                CERTS_DELETED=$((CERTS_DELETED + 1))
            else
                echo -e "${YELLOW}   ⚠️  Erro ao deletar (pode estar em uso), continuando...${NC}"
            fi
        fi
    done
fi

if [ $CERTS_DELETED -eq 0 ]; then
    echo -e "${GREEN}✅ Nenhum certificado encontrado para deletar${NC}"
else
    echo -e "${GREEN}✅ $CERTS_DELETED certificado(s) deletado(s)${NC}"
fi

echo ""

# ============================================================================
# PASSO 4: DELETAR REGISTROS DNS DE VALIDAÇÃO
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🗑️  PASSO 3: Deletar Registros DNS de Validação${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}🔍 Buscando registros CNAME de validação ACM...${NC}"

# Buscar registros CNAME que contenham "acm-validations.aws"
VALIDATION_RECORDS=$(aws route53 list-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --profile "$AWS_PROFILE" \
    --output json 2>/dev/null | \
    python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    records = data.get('ResourceRecordSets', [])

    # Filtrar apenas registros CNAME de validação ACM
    validation_records = []
    for record in records:
        if record.get('Type') == 'CNAME':
            rr = record.get('ResourceRecords', [])
            if rr and any('acm-validations.aws' in r.get('Value', '') for r in rr):
                validation_records.append(record)

    if validation_records:
        print(json.dumps(validation_records))
    else:
        print('[]')
except:
    print('[]')
" 2>/dev/null || echo "[]")

RECORDS_COUNT=$(echo "$VALIDATION_RECORDS" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

if [ "$RECORDS_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}🗑️  Encontrados $RECORDS_COUNT registro(s) de validação, deletando...${NC}"

    # Criar arquivo JSON para deleção em batch
    CHANGES_JSON=$(echo "$VALIDATION_RECORDS" | python3 -c "
import json, sys
records = json.load(sys.stdin)
changes = []
for record in records:
    changes.append({
        'Action': 'DELETE',
        'ResourceRecordSet': record
    })
print(json.dumps({'Changes': changes}, indent=2))
" 2>/dev/null)

    if [ -n "$CHANGES_JSON" ] && [ "$CHANGES_JSON" != "null" ]; then
        echo "$CHANGES_JSON" > /tmp/delete-validation-records.json

        if aws route53 change-resource-record-sets \
            --hosted-zone-id "$HOSTED_ZONE_ID" \
            --change-batch file:///tmp/delete-validation-records.json \
            --profile "$AWS_PROFILE" 2>/dev/null; then
            echo -e "${GREEN}✅ Registros DNS deletados${NC}"
        else
            echo -e "${YELLOW}⚠️  Erro ao deletar registros DNS, continuando...${NC}"
        fi

        rm -f /tmp/delete-validation-records.json
    fi
else
    echo -e "${GREEN}✅ Nenhum registro de validação encontrado${NC}"
fi

echo ""

# ============================================================================
# PASSO 5: AGUARDAR PROPAGAÇÃO DNS
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⏳ PASSO 4: Aguardar Propagação DNS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}⏳ Aguardando 60 segundos para propagação DNS completa...${NC}"
for i in {60..1}; do
    echo -ne "\r${CYAN}   Aguardando... ${i}s restantes   ${NC}"
    sleep 1
done
echo ""
echo -e "${GREEN}✅ Propagação concluída${NC}"
echo ""

# ============================================================================
# PASSO 6: RODAR DEPLOY LIMPO
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 PASSO 5: Deploy da Infraestrutura${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}✅ Limpeza completa! Iniciando deploy...${NC}"
echo ""

# Executar o script de deploy
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/deploy-infrastructure.sh"
